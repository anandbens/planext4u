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

  // Decode payload
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

  // Verify via Google Identity Toolkit
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

    // Find existing user
    const { data: existingUsers } = await supabase.auth.admin.listUsers();
    let supabaseUser = existingUsers?.users?.find(
      (u: any) => u.email === phoneEmail || u.phone === normalizedPhone
    );

    let isNewUser = false;

    if (!supabaseUser) {
      isNewUser = true;
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

      // Create customer record with welcome bonus
      const customerId = `CUS-${Date.now()}`;
      await supabase.from("customers").insert({
        id: customerId,
        name: normalizedPhone,
        email: phoneEmail,
        mobile: normalizedPhone,
        referral_code: `REF-${Math.random().toString(36).substring(2, 8).toUpperCase()}`,
        status: "active",
        wallet_points: 200,
      });

      // Add welcome bonus points transaction
      await supabase.from("points_transactions").insert({
        id: `PT-${Date.now()}`,
        user_id: customerId,
        type: "welcome",
        points: 200,
        description: "Welcome bonus on registration",
        user_name: normalizedPhone,
      });

      // Assign customer role
      await supabase.from("user_roles").insert({
        user_id: supabaseUser.id,
        role: "customer",
        customer_id: customerId,
      });
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

    // Check if customer has saved addresses (to determine first-time login)
    let hasAddress = false;
    if (customerData?.customer_id) {
      const { count } = await supabase
        .from("customer_addresses")
        .select("id", { count: "exact", head: true })
        .eq("customer_id", customerData.customer_id);
      hasAddress = (count || 0) > 0;
    }

    console.log("Auth success for", phoneNumber, "isNew:", isNewUser, "hasAddress:", hasAddress);

    return new Response(
      JSON.stringify({
        success: true,
        token_hash: tokenHash,
        email: phoneEmail,
        user_id: supabaseUser!.id,
        customer: customerInfo,
        is_new_user: isNewUser,
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
