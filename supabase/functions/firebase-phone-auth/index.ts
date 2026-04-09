import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const FIREBASE_PROJECT_ID = "planext4u-ba50f";
const FIREBASE_API_KEY = "AIzaSyBs9GdBSEK8BGjeGypEOjiHF_jkToy-Qlk";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function respond(ok: boolean, payload: Record<string, unknown>): Response {
  return new Response(
    JSON.stringify({ ok, success: ok, ...payload }),
    { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
  );
}

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
    const mode = body?.mode || "login"; // "login" | "register"
    const registerData = body?.register_data; // { name, email, mobile, occupation?, referral_code? }

    if (!firebase_id_token) {
      return respond(false, { error: "Missing firebase_id_token" });
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

    // Check if a registered customer exists with this phone number
    const { data: existingCustomer, error: custLookupErr } = await supabase
      .from("customers")
      .select("id, name, email, mobile")
      .or(`mobile.eq.${normalizedPhone},mobile.eq.${rawDigits},mobile.ilike.%${rawDigits}%`)
      .limit(1)
      .maybeSingle();

    if (custLookupErr) console.error("Customer lookup error:", custLookupErr.message);

    // ── REGISTRATION MODE ──────────────────────────────────────────────
    if (mode === "register") {
      if (existingCustomer) {
        return respond(false, {
          error: "This mobile number is already registered. Please login instead.",
          code: "ALREADY_REGISTERED",
        });
      }

      if (!registerData?.name || !registerData?.email) {
        return respond(false, { error: "Name and email are required for registration." });
      }

      // Check if email is already used by another customer
      const { data: emailExists } = await supabase
        .from("customers")
        .select("id, mobile")
        .eq("email", registerData.email)
        .maybeSingle();

      if (emailExists) {
        return respond(false, {
          error: "This email address is already registered with another account. Please use a different email.",
          code: "EMAIL_ALREADY_EXISTS",
        });
      }

      // 1. Create or reuse Supabase auth user
      let authUser: any;
      const { data: newAuthUser, error: createErr } = await supabase.auth.admin.createUser({
        email: phoneEmail,
        phone: normalizedPhone,
        email_confirm: true,
        phone_confirm: true,
        password: crypto.randomUUID(),
        user_metadata: { phone: normalizedPhone, login_method: "firebase_phone" },
      });

      if (createErr) {
        // If auth user already exists (orphan from previous failed attempt), reuse it
        if (createErr.message?.includes("already been registered") || (createErr as any).code === "email_exists") {
          console.log("Auth user already exists, reusing for registration");
          const { data: existingUsers } = await supabase.auth.admin.listUsers();
          const found = existingUsers?.users?.find(
            (u: any) => u.email === phoneEmail || u.phone === normalizedPhone
          );
          if (!found) {
            return respond(false, { error: "Unable to create your account. Please try again later." });
          }
          authUser = found;
        } else {
          throw createErr;
        }
      } else {
        authUser = newAuthUser.user;
      }

      // 2. Generate referral code
      const referralCode = "P4U" + Math.random().toString(36).substring(2, 8).toUpperCase();

      // 3. Create customer record
      const customerId = "CUST-" + crypto.randomUUID().substring(0, 8).toUpperCase();
      const { error: custInsertErr } = await supabase.from("customers").insert({
        id: customerId,
        name: registerData.name,
        email: registerData.email,
        mobile: normalizedPhone,
        occupation: registerData.occupation || null,
        referral_code: referralCode,
        referred_by: registerData.referral_code || null,
        status: "active",
        latitude: 0,
        longitude: 0,
        wallet_points: 0,
      });
      if (custInsertErr) {
        console.error("Customer insert error:", custInsertErr.message);
        if (custInsertErr.message?.includes("customers_email_unique")) {
          return respond(false, {
            error: "This email address is already registered with another account. Please use a different email.",
            code: "EMAIL_ALREADY_EXISTS",
          });
        }
        if (custInsertErr.message?.includes("duplicate key")) {
          return respond(false, {
            error: "An account with these details already exists. Please try logging in instead.",
            code: "ALREADY_REGISTERED",
          });
        }
        throw new Error("Unable to create your account. Please try again later.");
      }

      // 4. Create user_roles entry
      await supabase.from("user_roles").insert({
        user_id: authUser.id,
        role: "customer",
        customer_id: customerId,
      });

      // 5. Create social profile
      const username = registerData.name.toLowerCase().replace(/[^a-z0-9]/g, "_").substring(0, 20)
        + "_" + Math.random().toString(36).substring(2, 6);
      await supabase.from("social_profiles").insert({
        user_id: authUser.id,
        username,
        display_name: registerData.name,
        is_verified: false,
        is_private: false,
      });

      // 6. Generate session token
      const { data: linkData, error: linkError } = await supabase.auth.admin.generateLink({
        type: "magiclink",
        email: phoneEmail,
      });
      if (linkError) throw linkError;
      const tokenHash = linkData?.properties?.hashed_token;
      if (!tokenHash) throw new Error("Failed to generate session token");

      console.log("Registration success for", normalizedPhone, "customer:", customerId);

      return respond(true, {
        token_hash: tokenHash,
        email: phoneEmail,
        user_id: authUser.id,
        customer: { id: customerId, name: registerData.name, email: registerData.email, mobile: normalizedPhone },
        is_new_user: true,
        has_address: false,
      });
    }

    // ── LOGIN MODE (default) ──────────────────────────────────────────
    if (!existingCustomer) {
      console.log("No registered customer found for phone:", normalizedPhone);
      return respond(false, {
        error: "No account found with this mobile number. Please create an account first.",
        code: "NOT_REGISTERED",
      });
    }

    console.log("Found registered customer:", existingCustomer.id);
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

    return respond(true, {
      token_hash: tokenHash,
      email: phoneEmail,
      user_id: supabaseUser!.id,
      customer: customerInfo,
      is_new_user: false,
      has_address: hasAddress,
    });
  } catch (err: any) {
    console.error("Firebase phone auth error:", err);
    const rawMsg = err.message || "";
    let userMsg = "Something went wrong. Please try again later.";
    if (rawMsg.includes("Token expired")) userMsg = "Your session has expired. Please request a new OTP.";
    else if (rawMsg.includes("duplicate key") || rawMsg.includes("unique")) userMsg = "An account with these details already exists. Please try logging in.";
    else if (rawMsg.includes("rate") || rawMsg.includes("limit")) userMsg = "Too many attempts. Please wait a few minutes and try again.";
    return respond(false, { error: userMsg });
  }
});
