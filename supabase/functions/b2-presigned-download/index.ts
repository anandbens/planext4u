/**
 * b2-presigned-download
 *
 * Returns a short-lived presigned GET URL for downloading a file from the
 * PRIVATE Backblaze B2 bucket. Used to view KYC documents and other
 * regulated media that must NOT be world-readable.
 *
 * Auth: requires a valid Supabase JWT and an admin/finance/sales role.
 *
 * Body: { key: string; expiresSeconds?: number (60-3600, default 300) }
 * Returns: { url, expiresIn }
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.50.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function readSecret(name: string): string {
  return (Deno.env.get(name) ?? "")
    .trim()
    .replace(/^["']+|["']+$/g, "")
    .replace(/[\r\n]+/g, "");
}

const B2_PRIVATE_KEY_ID = readSecret("B2_PRIVATE_KEY_ID");
const B2_PRIVATE_APP_KEY = readSecret("B2_PRIVATE_APPLICATION_KEY");
const B2_PRIVATE_BUCKET = readSecret("B2_PRIVATE_BUCKET_NAME");
const B2_PRIVATE_ENDPOINT = readSecret("B2_PRIVATE_S3_ENDPOINT") || readSecret("B2_S3_ENDPOINT");

// Public bucket credentials (used to sign URLs when the bucket has been
// switched to private at the B2 level, so direct https://f00x... links 404).
const B2_PUBLIC_KEY_ID = readSecret("B2_APPLICATION_KEY_ID");
const B2_PUBLIC_APP_KEY = readSecret("B2_APPLICATION_KEY");
const B2_PUBLIC_BUCKET = readSecret("B2_BUCKET_NAME");
const B2_PUBLIC_ENDPOINT = readSecret("B2_S3_ENDPOINT");

const SUPABASE_URL = readSecret("SUPABASE_URL");
const SUPABASE_ANON = readSecret("SUPABASE_ANON_KEY");
const SUPABASE_SERVICE_ROLE = readSecret("SUPABASE_SERVICE_ROLE_KEY");

function regionFromEndpoint(endpoint: string): string {
  try {
    const host = new URL(endpoint).hostname;
    const m = host.match(/s3\.([^.]+)\.backblazeb2\.com/);
    return m?.[1] ?? "us-west-004";
  } catch {
    return "us-west-004";
  }
}

function endpointHost(endpoint: string): string {
  try {
    return new URL(endpoint).hostname;
  } catch {
    return endpoint.replace(/^https?:\/\//, "").replace(/\/.*$/, "");
  }
}

async function sha256Hex(data: string | Uint8Array): Promise<string> {
  const buf = typeof data === "string" ? new TextEncoder().encode(data) : data;
  const hash = await crypto.subtle.digest("SHA-256", buf);
  return [...new Uint8Array(hash)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

async function hmac(key: ArrayBuffer | Uint8Array, data: string): Promise<ArrayBuffer> {
  const cryptoKey = await crypto.subtle.importKey(
    "raw",
    key,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  return crypto.subtle.sign("HMAC", cryptoKey, new TextEncoder().encode(data));
}

async function deriveSigningKey(
  secret: string,
  dateStamp: string,
  region: string,
  service: string,
): Promise<ArrayBuffer> {
  const kDate = await hmac(new TextEncoder().encode("AWS4" + secret), dateStamp);
  const kRegion = await hmac(kDate, region);
  const kService = await hmac(kRegion, service);
  return hmac(kService, "aws4_request");
}

function hex(buf: ArrayBuffer): string {
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

async function presignGetUrl(opts: {
  endpoint: string;
  bucket: string;
  key: string;
  expiresSeconds: number;
  keyId: string;
  appKey: string;
}): Promise<string> {
  const { endpoint, bucket, key, expiresSeconds, keyId, appKey } = opts;
  const region = regionFromEndpoint(endpoint);
  const host = endpointHost(endpoint);
  const service = "s3";

  const now = new Date();
  const amzDate = now.toISOString().replace(/[:-]|\.\d{3}/g, "");
  const dateStamp = amzDate.slice(0, 8);

  const credentialScope = `${dateStamp}/${region}/${service}/aws4_request`;
  const credential = `${keyId}/${credentialScope}`;

  const encodedKey = key.split("/").map((s) => encodeURIComponent(s)).join("/");
  const canonicalUri = `/${bucket}/${encodedKey}`;

  const signedHeaders = "host";
  const canonicalHeaders = `host:${host}\n`;

  const queryParams: Record<string, string> = {
    "X-Amz-Algorithm": "AWS4-HMAC-SHA256",
    "X-Amz-Credential": credential,
    "X-Amz-Date": amzDate,
    "X-Amz-Expires": String(expiresSeconds),
    "X-Amz-SignedHeaders": signedHeaders,
  };

  const canonicalQuery = Object.keys(queryParams)
    .sort()
    .map((k) => `${encodeURIComponent(k)}=${encodeURIComponent(queryParams[k])}`)
    .join("&");

  const canonicalRequest = [
    "GET",
    canonicalUri,
    canonicalQuery,
    canonicalHeaders,
    signedHeaders,
    "UNSIGNED-PAYLOAD",
  ].join("\n");

  const stringToSign = [
    "AWS4-HMAC-SHA256",
    amzDate,
    credentialScope,
    await sha256Hex(canonicalRequest),
  ].join("\n");

  const signingKey = await deriveSigningKey(appKey, dateStamp, region, service);
  const signature = hex(await hmac(signingKey, stringToSign));

  return `https://${host}${canonicalUri}?${canonicalQuery}&X-Amz-Signature=${signature}`;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // --- Body ---
    const body = await req.json().catch(() => ({}));
    let key = String(body.key ?? "").trim();
    const bucketChoice: "public" | "private" =
      body.bucket === "public" ? "public" : "private";

    if (!key) {
      return new Response(JSON.stringify({ error: "Missing key" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    // Strip the b2-private:// scheme if the caller passed the stored value
    if (key.startsWith("b2-private://")) key = key.slice("b2-private://".length);
    // Defensive: don't allow path-traversal or absolute URLs
    if (key.startsWith("http") || /\.\./.test(key) || key.startsWith("/")) {
      return new Response(JSON.stringify({ error: "Invalid key" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // --- Auth: require valid Supabase JWT for both buckets ---
    const authHeader = req.headers.get("Authorization") ?? "";
    const token = authHeader.replace(/^Bearer\s+/i, "");
    if (!token) {
      return new Response(JSON.stringify({ error: "Missing Authorization" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userClient = createClient(SUPABASE_URL, SUPABASE_ANON, {
      global: { headers: { Authorization: `Bearer ${token}` } },
    });
    const { data: userData, error: userErr } = await userClient.auth.getUser(token);
    if (userErr || !userData?.user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Private bucket = strict admin-only access.
    // Public bucket = any authenticated user (these were originally world-readable).
    if (bucketChoice === "private") {
      const adminClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE);
      const { data: roles } = await adminClient
        .from("user_roles")
        .select("role")
        .eq("user_id", userData.user.id)
        .in("role", ["admin", "finance", "sales"]);
      if (!roles || roles.length === 0) {
        return new Response(JSON.stringify({ error: "Admin access required" }), {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    // --- Pick credentials ---
    const cfg = bucketChoice === "private"
      ? { keyId: B2_PRIVATE_KEY_ID, appKey: B2_PRIVATE_APP_KEY, bucket: B2_PRIVATE_BUCKET, endpoint: B2_PRIVATE_ENDPOINT }
      : { keyId: B2_PUBLIC_KEY_ID, appKey: B2_PUBLIC_APP_KEY, bucket: B2_PUBLIC_BUCKET, endpoint: B2_PUBLIC_ENDPOINT };

    if (!cfg.keyId || !cfg.appKey || !cfg.bucket || !cfg.endpoint) {
      return new Response(
        JSON.stringify({ error: `B2 ${bucketChoice} bucket not configured` }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const expiresSeconds = Math.min(Math.max(Number(body.expiresSeconds) || 300, 60), 3600);

    const url = await presignGetUrl({
      endpoint: cfg.endpoint,
      bucket: cfg.bucket,
      key,
      expiresSeconds,
      keyId: cfg.keyId,
      appKey: cfg.appKey,
    });

    return new Response(
      JSON.stringify({ url, expiresIn: expiresSeconds }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[b2-presigned-download]", message);
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
