import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const FIREBASE_PROJECT_ID = "p4u-console";
const FIREBASE_ALT_PROJECT_ID = "planext4u-ba50f";
const GOOGLE_SECURETOKEN_JWKS_URL = "https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com";

// Accept multiple valid audience values (both Firebase projects)
const VALID_AUDIENCES = [
  FIREBASE_PROJECT_ID,
  FIREBASE_ALT_PROJECT_ID,
  "784503032650",
];

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const encoder = new TextEncoder();
let cachedGoogleKeys: { expiresAt: number; keys: JsonWebKey[] } | null = null;

function respond(ok: boolean, payload: Record<string, unknown>): Response {
  return new Response(
    JSON.stringify({ ok, success: ok, ...payload }),
    { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
  );
}

function normalizeBase64Url(value: string): string {
  const padded = value.replace(/-/g, "+").replace(/_/g, "/");
  return padded + "=".repeat((4 - (padded.length % 4)) % 4);
}

function decodeJwtPart<T>(value: string): T {
  return JSON.parse(atob(normalizeBase64Url(value)));
}

function base64UrlToUint8Array(value: string): Uint8Array {
  const binary = atob(normalizeBase64Url(value));
  return Uint8Array.from(binary, (char) => char.charCodeAt(0));
}

async function getGoogleSigningKeys(): Promise<JsonWebKey[]> {
  if (cachedGoogleKeys && cachedGoogleKeys.expiresAt > Date.now()) {
    return cachedGoogleKeys.keys;
  }

  const response = await fetch(GOOGLE_SECURETOKEN_JWKS_URL);
  if (!response.ok) {
    throw new Error("Unable to fetch Firebase signing keys");
  }

  const cacheControl = response.headers.get("cache-control") ?? "";
  const maxAgeMatch = cacheControl.match(/max-age=(\d+)/i);
  const maxAgeSeconds = maxAgeMatch ? Number(maxAgeMatch[1]) : 3600;
  const data = await response.json();
  const keys = Array.isArray(data?.keys) ? data.keys : [];

  cachedGoogleKeys = {
    expiresAt: Date.now() + maxAgeSeconds * 1000,
    keys,
  };

  return keys;
}

async function verifyTokenSignature(idToken: string): Promise<any> {
  const parts = idToken.split(".");
  if (parts.length !== 3) throw new Error("Invalid token format");

  const [headerPart, payloadPart, signaturePart] = parts;
  const header = decodeJwtPart<{ alg?: string; kid?: string }>(headerPart);
  if (header.alg !== "RS256" || !header.kid) {
    throw new Error("Invalid token header");
  }

  const keys = await getGoogleSigningKeys();
  const signingKey = keys.find((key) => key.kid === header.kid);
  if (!signingKey) {
    throw new Error("Unknown token signing key");
  }

  const cryptoKey = await crypto.subtle.importKey(
    "jwk",
    signingKey,
    {
      name: "RSASSA-PKCS1-v1_5",
      hash: "SHA-256",
    },
    false,
    ["verify"],
  );

  const isValid = await crypto.subtle.verify(
    "RSASSA-PKCS1-v1_5",
    cryptoKey,
    base64UrlToUint8Array(signaturePart),
    encoder.encode(`${headerPart}.${payloadPart}`),
  );

  if (!isValid) {
    throw new Error("Invalid token signature");
  }

  return decodeJwtPart<any>(payloadPart);
}

async function verifyFirebaseToken(idToken: string) {
  if (!idToken || typeof idToken !== "string") throw new Error("Missing ID token");

  const payload = await verifyTokenSignature(idToken);

  const now = Math.floor(Date.now() / 1000);
  if (payload.exp < now) throw new Error("Token expired");
  
  console.log("Token aud:", payload.aud, "iss:", payload.iss);
  
  // Accept any known valid audience (project ID or numeric sender ID)
  if (!VALID_AUDIENCES.includes(String(payload.aud))) {
    throw new Error(`Invalid audience: ${payload.aud}`);
  }
  const validIssuers = [
    `https://securetoken.google.com/${FIREBASE_PROJECT_ID}`,
    `https://securetoken.google.com/${FIREBASE_ALT_PROJECT_ID}`,
  ];
  if (!validIssuers.includes(payload.iss)) throw new Error(`Invalid issuer: ${payload.iss}`);
  if (!payload.sub) throw new Error("No sub in token");
  if (payload.firebase?.sign_in_provider !== "phone") {
    throw new Error("Unsupported Firebase sign-in provider");
  }
  if (!payload.phone_number) {
    throw new Error("No phone number in Firebase token");
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
    const role = body?.role || "customer"; // "customer" | "vendor"
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

    // Extract the local phone digits for flexible matching (keeps last 10 digits for Indian numbers)
    const phoneDigits = normalizedPhone.replace(/\D/g, "");
    const rawDigits = phoneDigits.length > 10 ? phoneDigits.slice(-10) : phoneDigits;

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

      // 2.5 Fetch welcome points before creating customer
      let welcomePoints = 300;
      const { data: welcomeVar } = await supabase.from("platform_variables").select("value").eq("key", "welcome_points").maybeSingle();
      if (welcomeVar) welcomePoints = Number(welcomeVar.value) || 300;

      // 3. Create customer record with welcome points already set
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
        wallet_points: welcomePoints,
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

      // 6. Credit welcome bonus transaction record
      const { error: welcomeInsertErr } = await supabase.from("points_transactions").insert({
        id: "PT-W-" + crypto.randomUUID().substring(0, 8).toUpperCase(),
        user_id: customerId,
        user_name: registerData.name,
        type: "welcome",
        points: welcomePoints,
        description: "Welcome bonus for joining P4U!",
        is_expired: false,
        cooling_status: "credited",
        expires_at: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString(),
      });
      if (welcomeInsertErr) {
        console.error("Welcome bonus insert error:", welcomeInsertErr.message);
      } else {
        console.log("Welcome bonus credited:", welcomePoints, "pts to", customerId);
      }

      // 7. Handle referral bonus (creates a referrals row + points transaction)
      if (registerData.referral_code) {
        const refCode = String(registerData.referral_code).trim().toUpperCase();
        const { data: referrer } = await supabase
          .from("customers")
          .select("id, name, wallet_points")
          .eq("referral_code", refCode)
          .eq("status", "active")
          .maybeSingle();

        if (referrer) {
          // Read configurable referral amount and cooling flag
          let referralPoints = 100;
          const { data: refVar } = await supabase.from("platform_variables").select("value").eq("key", "referral_points").maybeSingle();
          if (refVar) referralPoints = Number(refVar.value) || 100;
          const { data: coolingVar } = await supabase.from("platform_variables").select("value").eq("key", "referral_cooling_enabled").maybeSingle();
          const cooling = coolingVar?.value === "1";
          const expiresAt = new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString();

          // Always log a referrals row so it shows up on the referrals admin/customer page
          await supabase.from("referrals").insert({
            id: "REF-" + crypto.randomUUID().substring(0, 8).toUpperCase(),
            referrer_id: referrer.id,
            referrer_name: referrer.name,
            referee_id: customerId,
            referee_name: registerData.name,
            status: cooling ? "pending" : "completed",
            points_awarded: referralPoints,
            cooling_until: cooling ? expiresAt : null,
            first_order_placed: false,
            bonus_credited: !cooling,
          } as any);

          // Insert points transaction (cooling = pending until first order; else credited immediately)
          const { error: refInsertErr } = await supabase.from("points_transactions").insert({
            id: "PT-R-" + crypto.randomUUID().substring(0, 8).toUpperCase(),
            user_id: referrer.id,
            user_name: referrer.name,
            type: "referral",
            points: referralPoints,
            description: `Referral bonus: ${registerData.name} joined using your code`,
            is_expired: false,
            cooling_status: cooling ? "pending" : "credited",
            expires_at: expiresAt,
          } as any);

          if (refInsertErr) {
            console.error("Referral bonus insert error:", refInsertErr.message);
          } else if (!cooling) {
            await supabase.from("customers").update({
              wallet_points: (referrer.wallet_points || 0) + referralPoints,
            }).eq("id", referrer.id);
            console.log("Referral bonus credited:", referralPoints, "pts to referrer", referrer.id);
          } else {
            console.log("Referral bonus pending (cooling) for referrer", referrer.id);
          }
        } else {
          console.log("Referral code not found or inactive:", refCode);
        }
      }

      // 8. Generate session token
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

    // ── VENDOR LOGIN MODE ──────────────────────────────────────────────
    if (role === "vendor") {
      console.log("Vendor login attempt for phone:", normalizedPhone);

      // Look up vendor by phone across both vendor tables
      const vendorPhoneFilter = `mobile.eq.${normalizedPhone},mobile.eq.${rawDigits},mobile.ilike.%${rawDigits}%`;
      const [productVendorResult, serviceVendorResult] = await Promise.all([
        supabase
          .from("vendors")
          .select("id, name, email, mobile, business_name, status")
          .or(vendorPhoneFilter)
          .limit(1)
          .maybeSingle(),
        supabase
          .from("service_vendors")
          .select("id, name, email, mobile, business_name, status")
          .or(vendorPhoneFilter)
          .limit(1)
          .maybeSingle(),
      ]);

      const existingVendor = productVendorResult.data || serviceVendorResult.data;
      const vendorLookupErr = productVendorResult.error || serviceVendorResult.error;

      if (vendorLookupErr) console.error("Vendor lookup error:", vendorLookupErr.message);

      if (!existingVendor) {
        console.log("No registered vendor found for phone:", normalizedPhone);
        return respond(false, {
          error: "No vendor account found with this mobile number. Please register first.",
          code: "NOT_REGISTERED",
        });
      }

      if (existingVendor.status !== "active" && existingVendor.status !== "verified") {
        return respond(false, {
          error: "Your vendor profile is not yet active. Please wait for admin approval.",
          code: "VENDOR_NOT_ACTIVE",
        });
      }

      console.log("Found registered vendor:", existingVendor.id);

      // Find or create Supabase auth user
      const { data: allUsers } = await supabase.auth.admin.listUsers();
      let supabaseUser = allUsers?.users?.find(
        (u: any) => u.email === phoneEmail || u.phone === normalizedPhone
      );

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
      }

      // Ensure vendor user_roles entry exists
      const { data: existingVendorRole } = await supabase
        .from("user_roles")
        .select("id")
        .eq("user_id", supabaseUser.id)
        .eq("role", "vendor")
        .maybeSingle();

      if (!existingVendorRole) {
        await supabase.from("user_roles").insert({
          user_id: supabaseUser.id,
          role: "vendor",
          vendor_id: existingVendor.id,
        });
      }

      // Generate magic link token
      const { data: vendorLinkData, error: vendorLinkError } = await supabase.auth.admin.generateLink({
        type: "magiclink",
        email: phoneEmail,
      });
      if (vendorLinkError) throw vendorLinkError;

      const vendorTokenHash = vendorLinkData?.properties?.hashed_token;
      if (!vendorTokenHash) throw new Error("Failed to generate session token");

      console.log("Vendor auth success for", phoneNumber, "vendor:", existingVendor.id);

      return respond(true, {
        token_hash: vendorTokenHash,
        email: phoneEmail,
        user_id: supabaseUser.id,
        vendor: {
          id: existingVendor.id,
          name: existingVendor.name,
          email: existingVendor.email,
          business_name: existingVendor.business_name,
        },
        is_new_user: false,
      });
    }

    // ── CUSTOMER LOGIN MODE (default) ──────────────────────────────────
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

    const { data: linkData, error: linkError } = await supabase.auth.admin.generateLink({
      type: "magiclink",
      email: phoneEmail,
    });
    if (linkError) throw linkError;

    const tokenHash = linkData?.properties?.hashed_token;
    if (!tokenHash) throw new Error("Failed to generate session token");

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
    console.error("Firebase phone auth error:", err.message, err.stack);
    const rawMsg = err.message || "";
    let userMsg = "Something went wrong. Please try again later.";
    let code = "UNKNOWN_ERROR";
    if (rawMsg.includes("Token expired")) { userMsg = "Your session has expired. Please request a new OTP."; code = "TOKEN_EXPIRED"; }
    else if (rawMsg.includes("Invalid audience")) { userMsg = "Authentication configuration error. Please try again."; code = "INVALID_AUDIENCE"; }
    else if (rawMsg.includes("Invalid issuer")) { userMsg = "Authentication configuration error. Please try again."; code = "INVALID_ISSUER"; }
    else if (rawMsg.includes("duplicate key") || rawMsg.includes("unique")) { userMsg = "An account with these details already exists. Please try logging in."; code = "DUPLICATE"; }
    else if (rawMsg.includes("rate") || rawMsg.includes("limit")) { userMsg = "Too many attempts. Please wait a few minutes and try again."; code = "RATE_LIMIT"; }
    else if (rawMsg.includes("Firebase token verification failed")) { userMsg = "Phone verification failed. Please try again."; code = "FIREBASE_VERIFY_FAILED"; }
    return respond(false, { error: userMsg, code, debug_message: rawMsg });
  }
});
