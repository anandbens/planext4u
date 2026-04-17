// Service-role-only push sender. Called from Postgres triggers via pg_net.
// Authentication: requires the SUPABASE_SERVICE_ROLE_KEY as Bearer token.
// Do NOT expose this function to clients — it skips admin role checks.
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface InternalPushPayload {
  device_tokens?: string[];
  user_ids?: string[];
  title: string;
  body: string;
  data?: Record<string, string>;
  image_url?: string;
}

async function getAccessToken(serviceAccount: any): Promise<string> {
  const header = { alg: "RS256", typ: "JWT" };
  const now = Math.floor(Date.now() / 1000);
  const claim = {
    iss: serviceAccount.client_email,
    scope: "https://www.googleapis.com/auth/firebase.messaging",
    aud: "https://oauth2.googleapis.com/token",
    iat: now,
    exp: now + 3600,
  };
  const enc = new TextEncoder();
  const headerB64 = btoa(String.fromCharCode(...enc.encode(JSON.stringify(header)))).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  const claimB64 = btoa(String.fromCharCode(...enc.encode(JSON.stringify(claim)))).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  const signInput = `${headerB64}.${claimB64}`;
  const pemContents = serviceAccount.private_key
    .replace("-----BEGIN PRIVATE KEY-----", "")
    .replace("-----END PRIVATE KEY-----", "")
    .replace(/\s/g, "");
  const binaryKey = Uint8Array.from(atob(pemContents), (c) => c.charCodeAt(0));
  const key = await crypto.subtle.importKey("pkcs8", binaryKey, { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" }, false, ["sign"]);
  const signature = await crypto.subtle.sign("RSASSA-PKCS1-v1_5", key, enc.encode(signInput));
  const sigB64 = btoa(String.fromCharCode(...new Uint8Array(signature))).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  const jwt = `${signInput}.${sigB64}`;
  const resp = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${jwt}`,
  });
  const tokenData = await resp.json();
  if (!tokenData.access_token) throw new Error("FCM token failed: " + JSON.stringify(tokenData));
  return tokenData.access_token;
}

async function sendOne(accessToken: string, projectId: string, token: string, title: string, body: string, data?: Record<string, string>, imageUrl?: string) {
  const message: any = {
    token,
    notification: { title, body },
    data: data || {},
    android: {
      priority: "high",
      notification: { sound: "default", click_action: "FLUTTER_NOTIFICATION_CLICK", ...(imageUrl ? { image: imageUrl } : {}) },
    },
  };
  const resp = await fetch(`https://fcm.googleapis.com/v1/projects/${projectId}/messages:send`, {
    method: "POST",
    headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
    body: JSON.stringify({ message }),
  });
  return { ok: resp.ok };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const auth = req.headers.get("Authorization");
    const expected = `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`;
    if (auth !== expected) {
      return new Response(JSON.stringify({ error: "Forbidden" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const payload: InternalPushPayload = await req.json();
    if (!payload.title || !payload.body) {
      return new Response(JSON.stringify({ error: "title and body required" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    let tokens: string[] = payload.device_tokens || [];
    if (payload.user_ids?.length) {
      // Look up tokens for the given users
      const url = `${Deno.env.get("SUPABASE_URL")}/rest/v1/user_devices?select=push_token&user_id=in.(${payload.user_ids.map(encodeURIComponent).join(",")})&push_token=neq.`;
      const resp = await fetch(url, {
        headers: {
          apikey: Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
          Authorization: `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
        },
      });
      const rows = await resp.json();
      tokens = [...tokens, ...rows.map((r: any) => r.push_token).filter(Boolean)];
    }
    tokens = [...new Set(tokens)].filter(Boolean);
    if (tokens.length === 0) {
      return new Response(JSON.stringify({ ok: true, sent: 0 }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const sa = JSON.parse(Deno.env.get("FIREBASE_SERVICE_ACCOUNT") || "{}");
    if (!sa.client_email) {
      return new Response(JSON.stringify({ error: "Firebase not configured" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const accessToken = await getAccessToken(sa);
    const results = await Promise.allSettled(
      tokens.map((t) => sendOne(accessToken, sa.project_id, t, payload.title, payload.body, payload.data, payload.image_url)),
    );
    const sent = results.filter((r) => r.status === "fulfilled" && (r as any).value?.ok).length;
    return new Response(JSON.stringify({ ok: true, sent, total: tokens.length }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (err: any) {
    console.error("internal push error", err);
    return new Response(JSON.stringify({ error: err.message || "Internal error" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
