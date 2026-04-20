/**
 * b2-presigned-upload
 *
 * Returns a presigned PUT URL for uploading a file directly to Backblaze B2
 * (S3-compatible). No file content passes through this function — the client
 * uploads directly to B2 with the signed URL.
 *
 * Auth: requires a valid Supabase JWT in the Authorization header.
 *
 * Body: { folder: string; filename: string; contentType: string }
 * Returns: { uploadUrl, publicUrl, key, expiresIn }
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.50.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const B2_KEY_ID = Deno.env.get("B2_APPLICATION_KEY_ID") ?? "";
const B2_APP_KEY = Deno.env.get("B2_APPLICATION_KEY") ?? "";
const B2_BUCKET = Deno.env.get("B2_BUCKET_NAME") ?? "";
const B2_ENDPOINT = Deno.env.get("B2_S3_ENDPOINT") ?? "";
const B2_PUBLIC_BASE = (Deno.env.get("B2_PUBLIC_URL_BASE") ?? "").replace(/\/+$/, "");

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SUPABASE_ANON = Deno.env.get("SUPABASE_ANON_KEY") ?? "";

// Region is the 3rd part of the endpoint hostname: s3.us-west-004.backblazeb2.com → us-west-004
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

function sanitizeFilename(name: string): string {
  return name
    .replace(/\.[^.]+$/, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60) || "file";
}

function getExt(filename: string, contentType: string): string {
  const fromName = filename.match(/\.([a-z0-9]{2,5})$/i)?.[1]?.toLowerCase();
  if (fromName) return fromName;
  const ctMap: Record<string, string> = {
    "image/webp": "webp",
    "image/jpeg": "jpg",
    "image/jpg": "jpg",
    "image/png": "png",
    "image/gif": "gif",
    "video/mp4": "mp4",
    "video/webm": "webm",
    "video/quicktime": "mov",
    "application/pdf": "pdf",
  };
  return ctMap[contentType.toLowerCase()] || "bin";
}

// --- AWS SigV4 helpers (presigned URL, no body signing) ---

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

/**
 * Build a presigned S3 PUT URL using SigV4 query-string auth.
 */
async function presignPutUrl(opts: {
  endpoint: string; // https://s3.us-west-004.backblazeb2.com
  bucket: string;
  key: string;
  contentType: string;
  expiresSeconds: number;
}): Promise<string> {
  const { endpoint, bucket, key, contentType, expiresSeconds } = opts;
  const region = regionFromEndpoint(endpoint);
  const host = endpointHost(endpoint);
  const service = "s3";

  const now = new Date();
  const amzDate = now.toISOString().replace(/[:-]|\.\d{3}/g, ""); // YYYYMMDDTHHMMSSZ
  const dateStamp = amzDate.slice(0, 8);

  const credentialScope = `${dateStamp}/${region}/${service}/aws4_request`;
  const credential = `${B2_KEY_ID}/${credentialScope}`;

  // URI-encode key path segments (preserve "/")
  const encodedKey = key
    .split("/")
    .map((seg) => encodeURIComponent(seg))
    .join("/");
  const canonicalUri = `/${bucket}/${encodedKey}`;

  // Signed headers — only "host" (content-type is sent at upload time but
  // omitted from signed headers here; B2 accepts it like AWS S3 presign).
  const signedHeaders = "host";
  const canonicalHeaders = `host:${host}\n`;

  const queryParams: Record<string, string> = {
    "X-Amz-Algorithm": "AWS4-HMAC-SHA256",
    "X-Amz-Credential": credential,
    "X-Amz-Date": amzDate,
    "X-Amz-Expires": String(expiresSeconds),
    "X-Amz-SignedHeaders": signedHeaders,
  };

  // Canonical query string (sorted, RFC3986-encoded)
  const canonicalQuery = Object.keys(queryParams)
    .sort()
    .map((k) => `${encodeURIComponent(k)}=${encodeURIComponent(queryParams[k])}`)
    .join("&");

  const payloadHash = "UNSIGNED-PAYLOAD";
  const canonicalRequest = [
    "PUT",
    canonicalUri,
    canonicalQuery,
    canonicalHeaders,
    signedHeaders,
    payloadHash,
  ].join("\n");

  const stringToSign = [
    "AWS4-HMAC-SHA256",
    amzDate,
    credentialScope,
    await sha256Hex(canonicalRequest),
  ].join("\n");

  const signingKey = await deriveSigningKey(B2_APP_KEY, dateStamp, region, service);
  const signature = hex(await hmac(signingKey, stringToSign));

  return `https://${host}${canonicalUri}?${canonicalQuery}&X-Amz-Signature=${signature}`;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    if (!B2_KEY_ID || !B2_APP_KEY || !B2_BUCKET || !B2_ENDPOINT || !B2_PUBLIC_BASE) {
      return new Response(
        JSON.stringify({ error: "B2 not configured (missing secrets)" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // --- Auth: require valid Supabase JWT ---
    const authHeader = req.headers.get("Authorization") ?? "";
    const token = authHeader.replace(/^Bearer\s+/i, "");
    if (!token) {
      return new Response(JSON.stringify({ error: "Missing Authorization" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON, {
      global: { headers: { Authorization: `Bearer ${token}` } },
    });
    const { data: userData, error: userErr } = await supabase.auth.getUser(token);
    if (userErr || !userData?.user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const userId = userData.user.id;

    // --- Body ---
    const body = await req.json().catch(() => ({}));
    const folder = String(body.folder ?? "uploads").replace(/^\/+|\/+$/g, "") || "uploads";
    const filename = String(body.filename ?? "file");
    const contentType = String(body.contentType ?? "application/octet-stream");
    const expiresSeconds = Math.min(Math.max(Number(body.expiresSeconds) || 600, 60), 3600);

    if (folder.length > 200 || /\.\./.test(folder)) {
      return new Response(JSON.stringify({ error: "Invalid folder" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const ext = getExt(filename, contentType);
    const safeName = sanitizeFilename(filename);
    const rand = Math.random().toString(36).slice(2, 8);
    const key = `${folder}/${userId}/${Date.now()}-${rand}-${safeName}.${ext}`;

    const uploadUrl = await presignPutUrl({
      endpoint: B2_ENDPOINT,
      bucket: B2_BUCKET,
      key,
      contentType,
      expiresSeconds,
    });

    const publicUrl = `${B2_PUBLIC_BASE}/${key}`;

    return new Response(
      JSON.stringify({ uploadUrl, publicUrl, key, expiresIn: expiresSeconds }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[b2-presigned-upload]", message);
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
