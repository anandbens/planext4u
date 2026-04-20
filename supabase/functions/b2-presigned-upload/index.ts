/**
 * b2-presigned-upload
 *
 * Returns a presigned PUT URL for uploading a file directly to Backblaze B2
 * (S3-compatible). No file content passes through this function — the client
 * uploads directly to B2 with the signed URL.
 *
 * Auth: requires a valid Supabase JWT in the Authorization header.
 *
 * Body: {
 *   folder: string;
 *   filename: string;
 *   contentType: string;
 *   private?: boolean;   // when true → upload to the PRIVATE B2 bucket (KYC, etc.)
 * }
 *
 * Returns: { uploadUrl, publicUrl, key, isPrivate, expiresIn }
 *   - For public uploads: publicUrl is the Friendly URL.
 *   - For private uploads: publicUrl is empty; the caller must store `key`
 *     and later request a signed download URL via `b2-presigned-download`.
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.50.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

// Public bucket (existing)
const B2_KEY_ID = Deno.env.get("B2_APPLICATION_KEY_ID") ?? "";
const B2_APP_KEY = Deno.env.get("B2_APPLICATION_KEY") ?? "";
const B2_BUCKET = Deno.env.get("B2_BUCKET_NAME") ?? "";
const B2_ENDPOINT = Deno.env.get("B2_S3_ENDPOINT") ?? "";
const B2_PUBLIC_BASE = (Deno.env.get("B2_PUBLIC_URL_BASE") ?? "").replace(/\/+$/, "");

// Private bucket (KYC documents, etc.)
const B2_PRIVATE_KEY_ID = Deno.env.get("B2_PRIVATE_KEY_ID") ?? "";
const B2_PRIVATE_APP_KEY = Deno.env.get("B2_PRIVATE_APPLICATION_KEY") ?? "";
const B2_PRIVATE_BUCKET = Deno.env.get("B2_PRIVATE_BUCKET_NAME") ?? "";
const B2_PRIVATE_ENDPOINT = Deno.env.get("B2_PRIVATE_S3_ENDPOINT") ?? B2_ENDPOINT;

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SUPABASE_ANON = Deno.env.get("SUPABASE_ANON_KEY") ?? "";

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

// --- AWS SigV4 helpers ---
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

async function presignPutUrl(opts: {
  endpoint: string;
  bucket: string;
  key: string;
  contentType: string;
  expiresSeconds: number;
  keyId: string;
  appKey: string;
}): Promise<string> {
  const { endpoint, bucket, key, contentType, expiresSeconds, keyId, appKey } = opts;
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

  const normalizedContentType = contentType.trim().toLowerCase() || "application/octet-stream";
  const signedHeaders = "content-type;host";
  const canonicalHeaders = `content-type:${normalizedContentType}\nhost:${host}\n`;

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
    "PUT",
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

    const body = await req.json().catch(() => ({}));
    const folder = String(body.folder ?? "uploads").replace(/^\/+|\/+$/g, "") || "uploads";
    const filename = String(body.filename ?? "file");
    const contentType = String(body.contentType ?? "application/octet-stream");
    const isPrivate = body.private === true;
    const expiresSeconds = Math.min(Math.max(Number(body.expiresSeconds) || 600, 60), 3600);

    if (folder.length > 200 || /\.\./.test(folder)) {
      return new Response(JSON.stringify({ error: "Invalid folder" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Pick bucket config based on private flag
    const cfg = isPrivate
      ? {
          keyId: B2_PRIVATE_KEY_ID,
          appKey: B2_PRIVATE_APP_KEY,
          bucket: B2_PRIVATE_BUCKET,
          endpoint: B2_PRIVATE_ENDPOINT,
          publicBase: "",
        }
      : {
          keyId: B2_KEY_ID,
          appKey: B2_APP_KEY,
          bucket: B2_BUCKET,
          endpoint: B2_ENDPOINT,
          publicBase: B2_PUBLIC_BASE,
        };

    if (!cfg.keyId || !cfg.appKey || !cfg.bucket || !cfg.endpoint) {
      return new Response(
        JSON.stringify({ error: `B2 ${isPrivate ? "private " : ""}bucket not configured` }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const ext = getExt(filename, contentType);
    const safeName = sanitizeFilename(filename);
    const rand = Math.random().toString(36).slice(2, 8);
    const key = `${folder}/${userId}/${Date.now()}-${rand}-${safeName}.${ext}`;

    const uploadUrl = await presignPutUrl({
      endpoint: cfg.endpoint,
      bucket: cfg.bucket,
      key,
      contentType,
      expiresSeconds,
      keyId: cfg.keyId,
      appKey: cfg.appKey,
    });

    // Public Friendly URL only for public uploads
    const publicUrl = isPrivate ? "" : `${cfg.publicBase}/${key}`;

    return new Response(
      JSON.stringify({
        uploadUrl,
        publicUrl,
        key,
        isPrivate,
        expiresIn: expiresSeconds,
      }),
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
