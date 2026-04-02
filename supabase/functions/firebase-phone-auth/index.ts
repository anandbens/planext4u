import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";
import { corsHeaders } from "https://esm.sh/@supabase/supabase-js@2.95.0/cors";

const FIREBASE_PROJECT_ID = "planext4u-ba50f";

// Verify Firebase ID token using Google's tokeninfo endpoint
async function verifyFirebaseToken(idToken: string) {
  // First decode payload to do basic checks
  const parts = idToken.split(".");
  if (parts.length !== 3) throw new Error("Invalid token format");

  const payload = JSON.parse(atob(parts[1].replace(/-/g, "+").replace(/_/g, "/")));
  const now = Math.floor(Date.now() / 1000);

  if (payload.exp < now) throw new Error("Token expired");
  if (payload.aud !== FIREBASE_PROJECT_ID) throw new Error("Invalid audience");
  if (payload.iss !== `https://securetoken.google.com/${FIREBASE_PROJECT_ID}`) throw new Error("Invalid issuer");
  if (!payload.sub) throw new Error("No sub in token");

  // Verify token signature via Google's API
  const verifyRes = await fetch(
    `https://www.googleapis.com/identitytoolkit/v3/relyingparty/getAccountInfo?key=AIzaSyBs9GdBSEK8BGjeGypEOjiHF_jkToy-Qlk`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ idToken }),
    }
  );

  if (!verifyRes.ok) {
    const errBody = await verifyRes.text();
    throw new Error("Firebase token verification failed: " + errBody);
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
    const { firebase_id_token } = await req.json();
    if (!firebase_id_token) {
      return new Response(JSON.stringify({ error: "Missing firebase_id_token" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Verify Firebase token
    const firebaseClaims = await verifyFirebaseToken(firebase_id_token);
    const phoneNumber = firebaseClaims.phone_number;
    if (!phoneNumber) {
      return new Response(JSON.stringify({ error: "No phone number in Firebase token" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Create Supabase admin client
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // Normalize phone (remove spaces)
    const normalizedPhone = phoneNumber.replace(/\s/g, "");
    const phoneEmail = `${normalizedPhone.replace("+", "")}@phone.planext4u.local`;

    // Check if Supabase user exists by email
    const { data: existingUsers } = await supabase.auth.admin.listUsers();
    let supabaseUser = existingUsers?.users?.find(
      (u) => u.email === phoneEmail || u.phone === normalizedPhone
    );

    if (!supabaseUser) {
      // Create new Supabase user
      const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
        email: phoneEmail,
        phone: normalizedPhone,
        email_confirm: true,
        phone_confirm: true,
        password: crypto.randomUUID(), // Random password, user logs in via OTP flow
        user_metadata: { phone: normalizedPhone, login_method: "firebase_phone" },
      });
      if (createError) throw createError;
      supabaseUser = newUser.user;

      // Create customer record
      const customerId = `CUS-${Date.now()}`;
      await supabase.from("customers").insert({
        id: customerId,
        name: normalizedPhone,
        email: phoneEmail,
        mobile: normalizedPhone,
        referral_code: `REF-${Math.random().toString(36).substring(2, 8).toUpperCase()}`,
        status: "active",
      });

      // Assign customer role
      await supabase.from("user_roles").insert({
        user_id: supabaseUser.id,
        role: "customer",
        customer_id: customerId,
      });
    }

    // Generate a magic link token for session creation
    const { data: linkData, error: linkError } = await supabase.auth.admin.generateLink({
      type: "magiclink",
      email: phoneEmail,
    });
    if (linkError) throw linkError;

    // Extract token hash from the generated link
    const tokenHash = linkData?.properties?.hashed_token;
    if (!tokenHash) throw new Error("Failed to generate session token");

    // Get user's customer info
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

    return new Response(
      JSON.stringify({
        success: true,
        token_hash: tokenHash,
        email: phoneEmail,
        user_id: supabaseUser!.id,
        customer: customerInfo,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (err) {
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
