/**
 * repair-socio-b2-media
 *
 * Many Socio rows (`social_posts.media`, `social_stories.media_url`,
 * `social_messages.media_url`) already point to Backblaze B2 URLs of the
 * shape:
 *
 *   https://f005.backblazeb2.com/file/<bucket>/migrated/<srcBucket>/<path>
 *
 * but the actual files were never copied — they live only in Supabase
 * Storage at `<srcBucket>/<path>`. The result is broken images / videos.
 *
 * This admin-triggered job scans those rows, downloads each missing file
 * from Supabase Storage, and PUTs it to the public B2 bucket at the exact
 * key the URL already references — so the existing DB URLs become valid
 * without any DB rewrites.
 *
 * Body: { limit?: number (default 25, max 100) }
 * Returns: { processed, copied, already_present, missing_in_storage, errors[] }
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.50.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SUPABASE_ANON = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
const SUPABASE_SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

const B2_KEY_ID = Deno.env.get("B2_APPLICATION_KEY_ID") ?? "";
const B2_APP_KEY = Deno.env.get("B2_APPLICATION_KEY") ?? "";
const B2_BUCKET = Deno.env.get("B2_BUCKET_NAME") ?? "";
const B2_ENDPOINT = Deno.env.get("B2_S3_ENDPOINT") ?? "";
const B2_PUBLIC_BASE = (Deno.env.get("B2_PUBLIC_URL_BASE") ?? "").replace(/\/+$/, "");

// ─── SigV4 helpers ─────────────────────────────────────────────────────────
function regionFromEndpoint(endpoint: string): string {
  try {
    const host = new URL(endpoint).hostname;
    return host.match(/s3\.([^.]+)\.backblazeb2\.com/)?.[1] ?? "us-west-004";
  } catch { return "us-west-004"; }
}
function endpointHost(endpoint: string): string {
  try { return new URL(endpoint).hostname; }
  catch { return endpoint.replace(/^https?:\/\//, "").replace(/\/.*$/, ""); }
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
async function deriveSigningKey(secret: string, dateStamp: string, region: string, service: string) {
  const kDate = await hmac(new TextEncoder().encode("AWS4" + secret), dateStamp);
  const kRegion = await hmac(kDate, region);
  const kService = await hmac(kRegion, service);
  return hmac(kService, "aws4_request");
}
function hex(buf: ArrayBuffer): string {
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

async function signedB2Request(opts: {
  method: "PUT" | "HEAD";
  key: string;
  body?: Uint8Array;
  contentType?: string;
}): Promise<Response> {
  const region = regionFromEndpoint(B2_ENDPOINT);
  const host = endpointHost(B2_ENDPOINT);
  const service = "s3";
  const now = new Date();
  const amzDate = now.toISOString().replace(/[:-]|\.\d{3}/g, "");
  const dateStamp = amzDate.slice(0, 8);
  const credentialScope = `${dateStamp}/${region}/${service}/aws4_request`;

  const encodedKey = opts.key.split("/").map(encodeURIComponent).join("/");
  const canonicalUri = `/${B2_BUCKET}/${encodedKey}`;
  const payloadHash = opts.body ? await sha256Hex(opts.body) : await sha256Hex("");

  const headersList: Array<[string, string]> = [
    ["host", host],
    ["x-amz-content-sha256", payloadHash],
    ["x-amz-date", amzDate],
  ];
  if (opts.method === "PUT" && opts.contentType) {
    headersList.unshift(["content-type", opts.contentType]);
  }
  headersList.sort((a, b) => a[0].localeCompare(b[0]));
  const canonicalHeaders = headersList.map(([k, v]) => `${k}:${v}\n`).join("");
  const signedHeaders = headersList.map(([k]) => k).join(";");

  const canonicalRequest = [
    opts.method, canonicalUri, "", canonicalHeaders, signedHeaders, payloadHash,
  ].join("\n");
  const stringToSign = [
    "AWS4-HMAC-SHA256", amzDate, credentialScope, await sha256Hex(canonicalRequest),
  ].join("\n");
  const signingKey = await deriveSigningKey(B2_APP_KEY, dateStamp, region, service);
  const signature = hex(await hmac(signingKey, stringToSign));

  const authHeader =
    `AWS4-HMAC-SHA256 Credential=${B2_KEY_ID}/${credentialScope}, ` +
    `SignedHeaders=${signedHeaders}, Signature=${signature}`;

  const reqHeaders: Record<string, string> = {
    "x-amz-content-sha256": payloadHash,
    "x-amz-date": amzDate,
    Authorization: authHeader,
  };
  if (opts.method === "PUT" && opts.contentType) reqHeaders["Content-Type"] = opts.contentType;

  return await fetch(`https://${host}${canonicalUri}`, {
    method: opts.method,
    headers: reqHeaders,
    body: opts.method === "PUT" ? opts.body : undefined,
  });
}

async function b2Exists(key: string): Promise<boolean> {
  const res = await signedB2Request({ method: "HEAD", key });
  return res.ok;
}

async function b2Put(key: string, body: Uint8Array, contentType: string): Promise<void> {
  const res = await signedB2Request({ method: "PUT", key, body, contentType });
  if (!res.ok) {
    const txt = await res.text().catch(() => "");
    throw new Error(`B2 PUT ${res.status}: ${txt.slice(0, 200)}`);
  }
}

// ─── URL parsing ───────────────────────────────────────────────────────────
/**
 * Parse a "migrated" B2 URL into the source Supabase storage bucket + path.
 * Accepts both:
 *   https://f005.backblazeb2.com/file/<b2bucket>/migrated/<srcBucket>/<path>
 *   https://<custom-cdn>/migrated/<srcBucket>/<path>
 */
function parseMigratedUrl(url: unknown): { srcBucket: string; path: string; key: string } | null {
  if (typeof url !== "string") return null;
  const m = url.match(/\/migrated\/([^/]+)\/(.+?)(?:\?|$)/);
  if (!m) return null;
  const srcBucket = m[1];
  const path = decodeURIComponent(m[2]);
  return { srcBucket, path, key: `migrated/${srcBucket}/${path}` };
}

function contentTypeFor(path: string): string {
  const ext = path.toLowerCase().split(".").pop() || "";
  switch (ext) {
    case "webp": return "image/webp";
    case "jpg":
    case "jpeg": return "image/jpeg";
    case "png": return "image/png";
    case "gif": return "image/gif";
    case "mp4": return "video/mp4";
    case "webm": return "video/webm";
    case "mov": return "video/quicktime";
    default: return "application/octet-stream";
  }
}

// ─── URL collection ────────────────────────────────────────────────────────
type Target = {
  table: "social_posts" | "social_stories" | "social_messages";
  id: string;
  url: string;
};

function collectFromMediaJson(rows: Array<{ id: string; media: unknown }>, table: Target["table"]): Target[] {
  const out: Target[] = [];
  for (const r of rows) {
    const arr = Array.isArray(r.media) ? r.media : [];
    for (const item of arr) {
      if (!item || typeof item !== "object") continue;
      const o = item as Record<string, unknown>;
      for (const field of ["url", "mediumUrl", "thumbnailUrl"] as const) {
        const v = o[field];
        if (typeof v === "string" && v.includes("/migrated/")) {
          out.push({ table, id: r.id, url: v });
        }
      }
    }
  }
  return out;
}

// ─── Main ──────────────────────────────────────────────────────────────────
Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    if (!B2_KEY_ID || !B2_APP_KEY || !B2_BUCKET || !B2_ENDPOINT || !B2_PUBLIC_BASE) {
      return new Response(JSON.stringify({ error: "B2 (public) not configured" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!SUPABASE_SERVICE_ROLE) {
      return new Response(JSON.stringify({ error: "Service role not configured" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── Auth: require admin ──────────────────────────────────────────────
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
    const limit = Math.min(Math.max(Number(body.limit) || 25, 1), 100);

    // ── Collect candidate URLs ───────────────────────────────────────────
    const targets: Target[] = [];

    const { data: postRows } = await admin
      .from("social_posts").select("id, media")
      .filter("media::text", "ilike", "%/migrated/%")
      .limit(200);
    targets.push(...collectFromMediaJson((postRows || []) as any[], "social_posts"));

    const { data: storyRows } = await admin
      .from("social_stories").select("id, media_url")
      .ilike("media_url", "%/migrated/%")
      .limit(200);
    for (const r of (storyRows || []) as Array<{ id: string; media_url: string }>) {
      if (r.media_url) targets.push({ table: "social_stories", id: r.id, url: r.media_url });
    }

    const { data: msgRows } = await admin
      .from("social_messages").select("id, media_url")
      .ilike("media_url", "%/migrated/%")
      .limit(200);
    for (const r of (msgRows || []) as Array<{ id: string; media_url: string }>) {
      if (r.media_url) targets.push({ table: "social_messages", id: r.id, url: r.media_url });
    }

    // De-dupe by destination key (multiple rows can reference the same file)
    const uniqueByKey = new Map<string, Target>();
    for (const t of targets) {
      const parsed = parseMigratedUrl(t.url);
      if (!parsed) continue;
      if (!uniqueByKey.has(parsed.key)) uniqueByKey.set(parsed.key, t);
    }
    const work = [...uniqueByKey.entries()].slice(0, limit);

    let copied = 0, alreadyPresent = 0, missingInStorage = 0;
    const errors: Array<{ key: string; error: string }> = [];

    for (const [key, t] of work) {
      const parsed = parseMigratedUrl(t.url)!;
      try {
        // 1) Already in B2? skip
        if (await b2Exists(key)) { alreadyPresent++; continue; }

        // 2) Pull from Supabase Storage
        const { data: file, error: dlErr } = await admin
          .storage.from(parsed.srcBucket).download(parsed.path);
        if (dlErr || !file) {
          missingInStorage++;
          errors.push({ key, error: `not in storage (${parsed.srcBucket}/${parsed.path}): ${dlErr?.message || "no data"}` });
          continue;
        }
        const bytes = new Uint8Array(await file.arrayBuffer());
        const ct = file.type || contentTypeFor(parsed.path);

        // 3) PUT to B2 at the same `migrated/<bucket>/<path>` key
        await b2Put(key, bytes, ct);
        copied++;
      } catch (e: any) {
        errors.push({ key, error: e?.message || String(e) });
      }
    }

    const remaining = uniqueByKey.size - work.length;

    return new Response(JSON.stringify({
      processed: work.length,
      copied,
      already_present: alreadyPresent,
      missing_in_storage: missingInStorage,
      errors: errors.slice(0, 50),
      error_count: errors.length,
      remaining,
      total_candidates: uniqueByKey.size,
    }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[repair-socio-b2-media]", message);
    return new Response(JSON.stringify({ error: message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
