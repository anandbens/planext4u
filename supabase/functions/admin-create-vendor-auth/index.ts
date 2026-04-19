// Creates an auth user for a vendor that was registered by an admin and links
// the resulting auth UID to the given vendor_id via user_roles. Returns a
// generated temporary password the admin can share with the vendor.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const generateTempPassword = () => {
  // 10-char password mixing upper/lower/digits + a fixed special to satisfy any provider rules.
  const charset = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789";
  let pwd = "";
  for (let i = 0; i < 9; i += 1) pwd += charset[Math.floor(Math.random() * charset.length)];
  return `P4u@${pwd}`;
};

const buildPhoneEmail = (mobile: string) => {
  const digits = (mobile || "").replace(/\D/g, "");
  const local = digits.length > 10 ? digits.slice(-10) : digits;
  return local ? `${local}@phone.planext4u.local` : null;
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization") || "";
    if (!authHeader.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Missing auth" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRole = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    // Verify the caller is an admin/finance/sales user
    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
      auth: { autoRefreshToken: false, persistSession: false },
    });
    const { data: callerData, error: callerErr } = await userClient.auth.getUser();
    if (callerErr || !callerData?.user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const admin = createClient(supabaseUrl, serviceRole, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const { data: roles } = await admin
      .from("user_roles")
      .select("role")
      .eq("user_id", callerData.user.id)
      .in("role", ["admin", "finance", "sales"]);
    if (!roles || roles.length === 0) {
      return new Response(JSON.stringify({ error: "Admin access required" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json().catch(() => ({}));
    const { vendor_id, email, mobile, name } = body as {
      vendor_id?: string; email?: string; mobile?: string; name?: string;
    };
    if (!vendor_id || !email) {
      return new Response(JSON.stringify({ error: "vendor_id and email are required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // If a vendor user_role link already exists for this vendor, do nothing.
    const { data: existingLink } = await admin
      .from("user_roles")
      .select("user_id")
      .eq("vendor_id", vendor_id)
      .eq("role", "vendor")
      .maybeSingle();
    if (existingLink?.user_id) {
      return new Response(JSON.stringify({
        success: true, already_linked: true, user_id: existingLink.user_id,
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const cleanedEmail = email.toLowerCase().trim();

    // Look for an existing auth user with this email (or the synthetic phone email).
    const phoneEmail = mobile ? buildPhoneEmail(mobile) : null;
    const { data: list } = await admin.auth.admin.listUsers();
    let existing = list?.users?.find((u: any) =>
      u.email?.toLowerCase() === cleanedEmail
      || (phoneEmail && u.email?.toLowerCase() === phoneEmail)
    );

    let userId: string;
    let tempPassword: string | null = null;
    let createdNew = false;

    if (existing) {
      userId = existing.id;
    } else {
      tempPassword = generateTempPassword();
      const { data: created, error: createErr } = await admin.auth.admin.createUser({
        email: cleanedEmail,
        password: tempPassword,
        email_confirm: true,
        user_metadata: { name: name || cleanedEmail.split("@")[0] },
      });
      if (createErr || !created?.user) {
        return new Response(JSON.stringify({ error: createErr?.message || "Failed to create auth user" }), {
          status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      userId = created.user.id;
      createdNew = true;
    }

    // Make sure no other vendor link exists for this auth user
    const { data: otherVendorLink } = await admin
      .from("user_roles")
      .select("vendor_id")
      .eq("user_id", userId)
      .eq("role", "vendor")
      .maybeSingle();
    if (otherVendorLink && otherVendorLink.vendor_id && otherVendorLink.vendor_id !== vendor_id) {
      return new Response(JSON.stringify({
        error: `This email is already linked to vendor ${otherVendorLink.vendor_id}. Use a different email.`,
      }), { status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const { error: roleErr } = await admin.from("user_roles").upsert({
      user_id: userId,
      role: "vendor",
      vendor_id: vendor_id,
      password_set: false,
    } as any, { onConflict: "user_id,role" });
    if (roleErr) {
      return new Response(JSON.stringify({ error: roleErr.message }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({
      success: true,
      user_id: userId,
      created: createdNew,
      temp_password: tempPassword, // null when we reused an existing auth account
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return new Response(JSON.stringify({ error: message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
