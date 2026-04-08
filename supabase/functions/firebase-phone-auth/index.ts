import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const FIREBASE_PROJECT_ID = "planext4u-ba50f";
const FIREBASE_API_KEY = "AIzaSyBs9GdBSEK8BGjeGypEOjiHF_jkToy-Qlk";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

async function verifyFirebaseToken(idToken: string) {
  if (!idToken || typeof idToken !== "string") throw new Error("Missing ID token");

  const parts = idToken.split(".");
  if (parts.length !== 3) throw new Error("Invalid token format");

  let payload: any;
  try {
    const b64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    const padded = b64 + "=".repeat((4 - (b64.length % 4)) % 4);
    payload = JSON.parse(atob(padded));
  } catch {
    throw new Error("Failed to decode token payload");
  }

  const now = Math.floor(Date.now() / 1000);
  if (payload.exp < now) throw new Error("Token expired");
  if (payload.aud !== FIREBASE_PROJECT_ID) throw new Error("Invalid audience");
  if (payload.iss !== `https://securetoken.google.com/${FIREBASE_PROJECT_ID}`) throw new Error("Invalid issuer");
  if (!payload.sub) throw new Error("No sub in token");

  const verifyRes = await fetch(
    `https://www.googleapis.com/identitytoolkit/v3/relyingparty/getAccountInfo?key=${FIREBASE_API_KEY}`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Referer": "https://planext4u.net",
      },
      body: JSON.stringify({ idToken }),
    }
  );

  if (!verifyRes.ok) {
    const errBody = await verifyRes.text();
    console.error("Google verify failed:", errBody);
    throw new Error("Firebase token verification failed");
  }

  const verifyData = await verifyRes.json();
  if (!verifyData.users || verifyData.users.length === 0) {
    throw new Error("No user found for this token");
  }

  return payload;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const firebase_id_token = body?.firebase_id_token;

    if (!firebase_id_token) {
      return new Response(JSON.stringify({ error: "Missing firebase_id_token" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log("Verifying Firebase token...");
    const firebaseClaims = await verifyFirebaseToken(firebase_id_token);
    const phoneNumber = firebaseClaims.phone_number;

    if (!phoneNumber) {
      return new Response(JSON.stringify({ error: "No phone number in Firebase token" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log("Phone:", phoneNumber);

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const normalizedPhone = phoneNumber.replace(/\s/g, "");
    const phoneEmail = `${normalizedPhone.replace("+", "")}@phone.planext4u.local`;

    // Extract just the digits (without country code) for flexible matching
    const rawDigits = normalizedPhone.replace(/^\+\d{1,3}/, "");

    // SECURITY: Check if a registered customer exists with this phone number
    // Match against multiple formats: full number, raw digits, with spaces
    const { data: existingCustomer } = await supabase
      .from("customers")
      .select("id, name, email, mobile")
      .or(`mobile.eq.${normalizedPhone},mobile.eq.${rawDigits},mobile.ilike.%${rawDigits}%`)
      .limit(1)
      .maybeSingle();

    if (!existingCustomer) {
      console.log("No registered customer found for phone:", normalizedPhone);
      return new Response(
        JSON.stringify({
          success: false,
          error: "No account found with this phone number. Please register first.",
          code: "NOT_REGISTERED",
        }),
        {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    console.log("Found registered customer:", existingCustomer.id);

    // Find existing Supabase auth user
    const { data: existingUsers } = await supabase.auth.admin.listUsers();
    let supabaseUser = existingUsers?.users?.find(
      (u: any) => u.email === phoneEmail || u.phone === normalizedPhone
    );

    // If no Supabase auth user exists but customer is registered, create the auth user
    // and link to existing customer
    if (!supabaseUser) {
      const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
        email: phoneEmail,
        phone: normalizedPhone,
        email_confirm: true,
        phone_confirm: true,
        password: crypto.randomUUID(),
        user_metadata: { phone: normalizedPhone, login_method: "firebase_phone" },
      });
      if (createError) throw createError;
      supabaseUser = newUser.user;

      // Link existing customer to this auth user via user_roles
      const { data: existingRole } = await supabase
        .from("user_roles")
        .select("id")
        .eq("customer_id", existingCustomer.id)
        .eq("role", "customer")
        .maybeSingle();

      if (!existingRole) {
        await supabase.from("user_roles").insert({
          user_id: supabaseUser.id,
          role: "customer",
          customer_id: existingCustomer.id,
        });
      }
    }

    // Generate magic link token
    const { data: linkData, error: linkError } = await supabase.auth.admin.generateLink({
      type: "magiclink",
      email: phoneEmail,
    });
    if (linkError) throw linkError;

    const tokenHash = linkData?.properties?.hashed_token;
    if (!tokenHash) throw new Error("Failed to generate session token");

    // Get customer info
    const { data: customerData } = await supabase
      .from("user_roles")
      .select("customer_id")
      .eq("user_id", supabaseUser!.id)
      .eq("role", "customer")
      .single();

    let customerInfo = null;
    if (customerData?.customer_id) {
      const { data: cust } = await supabase
        .from("customers")
        .select("id, name, email, mobile")
        .eq("id", customerData.customer_id)
        .single();
      customerInfo = cust;
    }

    // Check if customer has saved addresses
    let hasAddress = false;
    if (customerData?.customer_id) {
      const { count } = await supabase
        .from("customer_addresses")
        .select("id", { count: "exact", head: true })
        .eq("customer_id", customerData.customer_id);
      hasAddress = (count || 0) > 0;
    }

    console.log("Auth success for", phoneNumber, "hasAddress:", hasAddress);

    return new Response(
      JSON.stringify({
        success: true,
        token_hash: tokenHash,
        email: phoneEmail,
        user_id: supabaseUser!.id,
        customer: customerInfo,
        is_new_user: false,
        has_address: hasAddress,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (err: any) {
    console.error("Firebase phone auth error:", err);
    return new Response(
      JSON.stringify({ error: err.message || "Authentication failed" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
