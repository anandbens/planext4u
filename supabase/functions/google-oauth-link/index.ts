import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

/**
 * This edge function is called after Google OAuth sign-in.
 * It checks if the Google user's email exists in the customers table.
 * If yes, it ensures a user_roles record links the OAuth UID to the customer.
 * If no, it returns an error so the frontend can sign them out.
 */
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    // Verify the caller's JWT to get their user ID and email
    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await userClient.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: "Invalid token" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userId = claimsData.claims.sub as string;
    const email = claimsData.claims.email as string;

    if (!email) {
      return new Response(JSON.stringify({ error: "No email in token" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log("Google OAuth link check for:", email, "uid:", userId);

    // Use service role to check customers table
    const adminClient = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // Check if email exists in customers table
    const { data: customer, error: custErr } = await adminClient
      .from("customers")
      .select("id, name, email, mobile")
      .eq("email", email)
      .maybeSingle();

    if (custErr) {
      console.error("Customer lookup error:", custErr);
      throw new Error("Database error");
    }

    if (!customer) {
      console.log("No customer found for email:", email);
      return new Response(
        JSON.stringify({
          success: false,
          registered: false,
          error: "Your Gmail is not registered with Planext4U. Create your account first to do a Google Sign-in.",
        }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Customer exists — ensure user_roles entry links this OAuth UID
    const { data: existingRole } = await adminClient
      .from("user_roles")
      .select("id")
      .eq("user_id", userId)
      .eq("role", "customer")
      .maybeSingle();

    if (!existingRole) {
      // Check if there's an old user_roles entry for this customer_id with a different UID
      // We need to update or insert
      const { data: oldRole } = await adminClient
        .from("user_roles")
        .select("id, user_id")
        .eq("customer_id", customer.id)
        .eq("role", "customer")
        .maybeSingle();

      if (oldRole) {
        // Update the existing role to point to the new OAuth UID
        await adminClient
          .from("user_roles")
          .update({ user_id: userId })
          .eq("id", oldRole.id);
        console.log("Updated user_roles for customer", customer.id, "from", oldRole.user_id, "to", userId);
      } else {
        // Insert new role
        await adminClient.from("user_roles").insert({
          user_id: userId,
          role: "customer",
          customer_id: customer.id,
        });
        console.log("Inserted user_roles for customer", customer.id, "uid", userId);
      }
    }

    // Check if customer has addresses
    const { count } = await adminClient
      .from("customer_addresses")
      .select("id", { count: "exact", head: true })
      .eq("customer_id", customer.id);

    const hasAddress = (count || 0) > 0;

    console.log("Google OAuth link success for", email, "customer:", customer.id);

    return new Response(
      JSON.stringify({
        success: true,
        registered: true,
        customer,
        has_address: hasAddress,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (err: any) {
    console.error("Google OAuth link error:", err);
    return new Response(
      JSON.stringify({ error: err.message || "Internal error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
