/**
 * b2-list-objects
 *
 * Admin-only edge function to browse the PUBLIC Backblaze B2 bucket
 * directly via S3 ListObjectsV2 (with delimiter for folder-style listing),
 * and to import selected B2 keys into the `media_library` table.
 *
 * Auth: requires a Supabase JWT belonging to a user with the `admin` role.
 *
 * Body (mode "list"):
 *   { mode: "list", prefix?: string, continuationToken?: string, maxKeys?: number }
 * Returns: { folders: string[], files: {key,size,lastModified,url}[], nextToken?: string, prefix }
 *
 * Body (mode "import"):
 *   { mode: "import", keys: string[], folder?: string }
 * Returns: { imported: number, skipped: number, errors: string[] }
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.50.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function readSecret(name: string): string {
  return (Deno.env.get(name) ?? "").trim().replace(/^["']+|["']+$/g, "").replace(/[\r\n]+/g, "");
}

const B2_KEY_ID = readSecret("B2_APPLICATION_KEY_ID");
const B2_APP_KEY = readSecret("B2_APPLICATION_KEY");
const B2_BUCKET = readSecret("B2_BUCKET_NAME");
const B2_ENDPOINT = readSecret("B2_S3_ENDPOINT");
const B2_PUBLIC_BASE = readSecret("B2_PUBLIC_URL_BASE").replace(/\/+$/, "");
const CDN_PUBLIC_BASE = readSecret("CDN_PUBLIC_URL_BASE").replace(/\/+$/, "");
const PUBLIC_URL_BASE = CDN_PUBLIC_BASE || B2_PUBLIC_BASE;

const SUPABASE_URL = readSecret("SUPABASE_URL");
const SUPABASE_ANON = readSecret("SUPABASE_ANON_KEY");
const SUPABASE_SERVICE_ROLE = readSecret("SUPABASE_SERVICE_ROLE_KEY");

function regionFromEndpoint(e: string): string {
  try { return new URL(e).hostname.match(/s3\.([^.]+)\.backblazeb2\.com/)?.[1] ?? "us-west-004"; }
  catch { return "us-west-004"; }
}
function endpointHost(e: string): string {
  try { return new URL(e).hostname; }
  catch { return e.replace(/^https?:\/\//, "").replace(/\/.*$/, ""); }
}
async function sha256Hex(data: string | Uint8Array): Promise<string> {
  const buf = typeof data === "string" ? new TextEncoder().encode(data) : data;
  const hash = await crypto.subtle.digest("SHA-256", buf);
  return [...new Uint8Array(hash)].map((b) => b.toString(16).padStart(2, "0")).join("");
}
async function hmac(key: ArrayBuffer | Uint8Array, data: string): Promise<ArrayBuffer> {
  const k = await crypto.subtle.importKey("raw", key, { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  return crypto.subtle.sign("HMAC", k, new TextEncoder().encode(data));
}
async function deriveKey(secret: string, dateStamp: string, region: string, service: string) {
  const kDate = await hmac(new TextEncoder().encode("AWS4" + secret), dateStamp);
  const kRegion = await hmac(kDate, region);
  const kService = await hmac(kRegion, service);
  return hmac(kService, "aws4_request");
}
function hex(b: ArrayBuffer): string {
  return [...new Uint8Array(b)].map((x) => x.toString(16).padStart(2, "0")).join("");
}

async function listObjectsV2(opts: {
  prefix: string;
  delimiter: string;
  maxKeys: number;
  continuationToken?: string;
}): Promise<{ folders: string[]; files: { key: string; size: number; lastModified: string }[]; nextToken?: string }> {
  const region = regionFromEndpoint(B2_ENDPOINT);
  const host = endpointHost(B2_ENDPOINT);
  const service = "s3";
  const now = new Date();
  const amzDate = now.toISOString().replace(/[:-]|\.\d{3}/g, "");
  const dateStamp = amzDate.slice(0, 8);
  const credentialScope = `${dateStamp}/${region}/${service}/aws4_request`;

  // Path-style: /<bucket>/?list-type=2&...
  const canonicalUri = `/${B2_BUCKET}/`;
  const params: Record<string, string> = {
    "list-type": "2",
    "max-keys": String(opts.maxKeys),
  };
  if (opts.prefix) params["prefix"] = opts.prefix;
  if (opts.delimiter) params["delimiter"] = opts.delimiter;
  if (opts.continuationToken) params["continuation-token"] = opts.continuationToken;
  const canonicalQuery = Object.keys(params).sort()
    .map((k) => `${encodeURIComponent(k)}=${encodeURIComponent(params[k])}`)
    .join("&");

  const payloadHash = await sha256Hex("");
  const canonicalHeaders = `host:${host}\nx-amz-content-sha256:${payloadHash}\nx-amz-date:${amzDate}\n`;
  const signedHeaders = "host;x-amz-content-sha256;x-amz-date";
  const canonicalRequest = ["GET", canonicalUri, canonicalQuery, canonicalHeaders, signedHeaders, payloadHash].join("\n");
  const stringToSign = ["AWS4-HMAC-SHA256", amzDate, credentialScope, await sha256Hex(canonicalRequest)].join("\n");
  const signingKey = await deriveKey(B2_APP_KEY, dateStamp, region, service);
  const signature = hex(await hmac(signingKey, stringToSign));
  const authHeader =
    `AWS4-HMAC-SHA256 Credential=${B2_KEY_ID}/${credentialScope}, ` +
    `SignedHeaders=${signedHeaders}, Signature=${signature}`;

  const res = await fetch(`https://${host}${canonicalUri}?${canonicalQuery}`, {
    method: "GET",
    headers: {
      Host: host,
      "x-amz-content-sha256": payloadHash,
      "x-amz-date": amzDate,
      Authorization: authHeader,
    },
  });
  const xml = await res.text();
  if (!res.ok) {
    throw new Error(`B2 ListObjectsV2 ${res.status}: ${xml.slice(0, 300)}`);
  }

  // Tiny XML extractor (the response has a fixed structure).
  const folders: string[] = [];
  const files: { key: string; size: number; lastModified: string }[] = [];
  const prefixRegex = /<CommonPrefixes>\s*<Prefix>([^<]+)<\/Prefix>\s*<\/CommonPrefixes>/g;
  let m: RegExpExecArray | null;
  while ((m = prefixRegex.exec(xml))) folders.push(decodeURIComponent(m[1]));

  const contentRegex = /<Contents>([\s\S]*?)<\/Contents>/g;
  while ((m = contentRegex.exec(xml))) {
    const block = m[1];
    const key = block.match(/<Key>([^<]+)<\/Key>/)?.[1] ?? "";
    const size = Number(block.match(/<Size>(\d+)<\/Size>/)?.[1] ?? 0);
    const lastModified = block.match(/<LastModified>([^<]+)<\/LastModified>/)?.[1] ?? "";
    if (key && !key.endsWith("/")) files.push({ key, size, lastModified });
  }
  const truncated = xml.match(/<IsTruncated>(true|false)<\/IsTruncated>/)?.[1] === "true";
  const nextToken = truncated ? xml.match(/<NextContinuationToken>([^<]+)<\/NextContinuationToken>/)?.[1] : undefined;
  return { folders, files, nextToken };
}

function guessMime(key: string): string {
  const ext = key.split(".").pop()?.toLowerCase() || "";
  const map: Record<string, string> = {
    jpg: "image/jpeg", jpeg: "image/jpeg", png: "image/png", gif: "image/gif",
    webp: "image/webp", svg: "image/svg+xml", mp4: "video/mp4", webm: "video/webm",
    mov: "video/quicktime", pdf: "application/pdf",
  };
  return map[ext] || "application/octet-stream";
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    if (!B2_KEY_ID || !B2_APP_KEY || !B2_BUCKET || !B2_ENDPOINT) {
      return new Response(JSON.stringify({ error: "B2 (public) not configured" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Auth
    const token = (req.headers.get("Authorization") ?? "").replace(/^Bearer\s+/i, "");
    if (!token) {
      return new Response(JSON.stringify({ error: "Missing Authorization" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const userClient = createClient(SUPABASE_URL, SUPABASE_ANON, {
      global: { headers: { Authorization: `Bearer ${token}` } },
    });
    const { data: u, error: uErr } = await userClient.auth.getUser(token);
    if (uErr || !u?.user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE);
    const { data: roleRow } = await admin
      .from("user_roles").select("role").eq("user_id", u.user.id)
      .in("role", ["admin"]).maybeSingle();
    if (!roleRow) {
      return new Response(JSON.stringify({ error: "Admin role required" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json().catch(() => ({}));
    const mode = String(body.mode ?? "list");

    if (mode === "list") {
      let prefix = String(body.prefix ?? "").replace(/^\/+/, "");
      // Always end with `/` so delimiter listing works as a folder browser.
      if (prefix && !prefix.endsWith("/")) prefix += "/";
      const maxKeys = Math.min(Math.max(Number(body.maxKeys) || 200, 1), 1000);
      const continuationToken = body.continuationToken ? String(body.continuationToken) : undefined;
      const { folders, files, nextToken } = await listObjectsV2({
        prefix, delimiter: "/", maxKeys, continuationToken,
      });
      const filesWithUrl = files.map((f) => ({ ...f, url: `${PUBLIC_URL_BASE}/${f.key}` }));
      return new Response(JSON.stringify({
        prefix,
        folders: folders.map((f) => f.replace(prefix, "").replace(/\/$/, "")).filter(Boolean),
        files: filesWithUrl,
        nextToken,
      }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    if (mode === "import") {
      const keys: string[] = Array.isArray(body.keys) ? body.keys.filter((k: any) => typeof k === "string") : [];
      const folder = String(body.folder ?? "b2-import").replace(/[^a-z0-9-_]/gi, "-").toLowerCase() || "b2-import";
      if (keys.length === 0) {
        return new Response(JSON.stringify({ error: "No keys provided" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      let imported = 0, skipped = 0;
      const errors: string[] = [];
      for (const key of keys.slice(0, 500)) {
        try {
          const url = `${PUBLIC_URL_BASE}/${key}`;
          // Skip if already in media_library
          const { data: exists } = await admin.from("media_library").select("id").eq("file_url", url).maybeSingle();
          if (exists) { skipped++; continue; }
          const fileName = key.split("/").pop() || key;
          const { error: insErr } = await admin.from("media_library").insert({
            file_name: fileName,
            file_url: url,
            file_type: guessMime(key),
            file_size: null,
            folder,
            alt_text: fileName.replace(/\.[^/.]+$/, "").replace(/[-_]/g, " "),
            metadata: { storage_provider: "b2", b2_key: key, imported_at: new Date().toISOString() },
          } as any);
          if (insErr) { errors.push(`${key}: ${insErr.message}`); continue; }
          imported++;
        } catch (e: any) {
          errors.push(`${key}: ${e?.message || e}`);
        }
      }
      return new Response(JSON.stringify({ imported, skipped, errors }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: `Unknown mode: ${mode}` }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[b2-list-objects]", message);
    return new Response(JSON.stringify({ error: message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
