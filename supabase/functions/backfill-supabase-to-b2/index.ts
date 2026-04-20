/**
 * backfill-supabase-to-b2
 *
 * Admin-triggered job that copies existing files from Supabase Storage to
 * Backblaze B2 and updates the corresponding DB rows so URLs point to B2.
 *
 * Auth: requires a Supabase JWT belonging to a user with the `admin` role.
 *
 * Body:
 *   {
 *     scope?: "media_library" | "vendors" | "products" | "kyc_documents" | "social_media",
 *     limit?: number   // max rows to process this run (default 50, max 200)
 *     dry_run?: boolean
 *   }
 *
 * Returns: { processed, migrated, errors[], remaining }
 *
 * Designed to be called repeatedly until `remaining = 0` for each scope.
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.50.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
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

// ─── SigV4 helpers (PUT object) ────────────────────────────────────────────
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

async function putToB2(key: string, body: Uint8Array, contentType: string): Promise<string> {
  const region = regionFromEndpoint(B2_ENDPOINT);
  const host = endpointHost(B2_ENDPOINT);
  const service = "s3";
  const now = new Date();
  const amzDate = now.toISOString().replace(/[:-]|\.\d{3}/g, "");
  const dateStamp = amzDate.slice(0, 8);
  const credentialScope = `${dateStamp}/${region}/${service}/aws4_request`;

  const encodedKey = key.split("/").map(encodeURIComponent).join("/");
  const canonicalUri = `/${B2_BUCKET}/${encodedKey}`;
  const payloadHash = await sha256Hex(body);

  const canonicalHeaders =
    `content-type:${contentType}\nhost:${host}\nx-amz-content-sha256:${payloadHash}\nx-amz-date:${amzDate}\n`;
  const signedHeaders = "content-type;host;x-amz-content-sha256;x-amz-date";

  const canonicalRequest = [
    "PUT",
    canonicalUri,
    "",
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

  const authHeader =
    `AWS4-HMAC-SHA256 Credential=${B2_KEY_ID}/${credentialScope}, ` +
    `SignedHeaders=${signedHeaders}, Signature=${signature}`;

  const res = await fetch(`https://${host}${canonicalUri}`, {
    method: "PUT",
    headers: {
      "Content-Type": contentType,
      "x-amz-content-sha256": payloadHash,
      "x-amz-date": amzDate,
      Authorization: authHeader,
    },
    body,
  });
  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`B2 PUT failed ${res.status}: ${txt.slice(0, 200)}`);
  }
  return `${B2_PUBLIC_BASE}/${key}`;
}

// ─── Helpers ───────────────────────────────────────────────────────────────
function looksLikeSupabaseUrl(url: string): boolean {
  return /\/storage\/v1\/object\/(public|sign)\//.test(url) ||
         /supabase\.co\/storage/.test(url);
}
function looksLikeB2Url(url: string): boolean {
  return url.includes("backblazeb2.com") ||
         (B2_PUBLIC_BASE !== "" && url.startsWith(B2_PUBLIC_BASE));
}
/** Extract bucket + path from a Supabase storage URL */
function parseSupabasePath(url: string): { bucket: string; path: string } | null {
  const m = url.match(/\/storage\/v1\/object\/(?:public|sign)\/([^/]+)\/(.+?)(?:\?|$)/);
  if (!m) return null;
  return { bucket: m[1], path: decodeURIComponent(m[2]) };
}

// ─── Main ──────────────────────────────────────────────────────────────────
Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    if (!B2_KEY_ID || !B2_APP_KEY || !B2_BUCKET || !B2_ENDPOINT || !B2_PUBLIC_BASE) {
      return new Response(JSON.stringify({ error: "B2 not configured" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!SUPABASE_SERVICE_ROLE) {
      return new Response(JSON.stringify({ error: "Service role not configured" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── Auth: require admin role ─────────────────────────────────────────
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
      .from("user_roles")
      .select("role")
      .eq("user_id", u.user.id)
      .in("role", ["admin"])
      .maybeSingle();
    if (!roleRow) {
      return new Response(JSON.stringify({ error: "Admin role required" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json().catch(() => ({}));
    const scope: string = String(body.scope ?? "media_library");
    const limit = Math.min(Math.max(Number(body.limit) || 50, 1), 200);
    const dryRun = Boolean(body.dry_run);

    // Fetch candidate rows for this scope
    let rows: Array<{ id: string; url: string; table: string; column: string }> = [];

    if (scope === "media_library") {
      const { data, error } = await admin
        .from("media_library")
        .select("id, file_url")
        .not("file_url", "is", null)
        .like("file_url", "%/storage/v1/object/%")
        .limit(limit);
      if (error) throw error;
      rows = (data || []).map((r: any) => ({
        id: r.id, url: r.file_url, table: "media_library", column: "file_url",
      }));
    } else if (scope === "vendors") {
      const { data, error } = await admin
        .from("vendors")
        .select("id, store_logo_url, background_image")
        .or("store_logo_url.like.%/storage/v1/object/%,background_image.like.%/storage/v1/object/%")
        .limit(limit);
      if (error) throw error;
      for (const r of (data || []) as any[]) {
        if (r.store_logo_url && looksLikeSupabaseUrl(r.store_logo_url)) {
          rows.push({ id: r.id, url: r.store_logo_url, table: "vendors", column: "store_logo_url" });
        }
        if (r.background_image && looksLikeSupabaseUrl(r.background_image)) {
          rows.push({ id: r.id, url: r.background_image, table: "vendors", column: "background_image" });
        }
      }
    } else if (scope === "products") {
      const { data, error } = await admin
        .from("products")
        .select("id, image, thumbnail_image, banner_image")
        .or("image.like.%/storage/v1/object/%,thumbnail_image.like.%/storage/v1/object/%,banner_image.like.%/storage/v1/object/%")
        .limit(limit);
      if (error) throw error;
      for (const r of (data || []) as any[]) {
        for (const col of ["image", "thumbnail_image", "banner_image"]) {
          if (r[col] && looksLikeSupabaseUrl(r[col])) {
            rows.push({ id: r.id, url: r[col], table: "products", column: col });
          }
        }
      }
    } else if (scope === "kyc_documents") {
      const { data, error } = await admin
        .from("kyc_documents")
        .select("id, front_image_url, back_image_url")
        .or("front_image_url.like.%/storage/v1/object/%,back_image_url.like.%/storage/v1/object/%")
        .limit(limit);
      if (error) throw error;
      for (const r of (data || []) as any[]) {
        for (const col of ["front_image_url", "back_image_url"]) {
          if (r[col] && looksLikeSupabaseUrl(r[col])) {
            rows.push({ id: r.id, url: r[col], table: "kyc_documents", column: col });
          }
        }
      }
    } else if (scope === "social_media") {
      const { data, error } = await admin
        .from("social_media")
        .select("id, icon_url")
        .like("icon_url", "%/storage/v1/object/%")
        .limit(limit);
      if (error) throw error;
      for (const r of (data || []) as any[]) {
        if (r.icon_url && looksLikeSupabaseUrl(r.icon_url)) {
          rows.push({ id: r.id, url: r.icon_url, table: "social_media", column: "icon_url" });
        }
      }
    } else {
      return new Response(JSON.stringify({ error: "Unknown scope" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let migrated = 0;
    const errors: Array<{ id: string; error: string }> = [];

    for (const row of rows) {
      try {
        if (looksLikeB2Url(row.url)) continue;
        const parsed = parseSupabasePath(row.url);
        if (!parsed) {
          errors.push({ id: row.id, error: "could not parse URL" });
          continue;
        }
        // Download from Supabase Storage with service role
        const { data: file, error: dlErr } = await admin.storage.from(parsed.bucket).download(parsed.path);
        if (dlErr || !file) {
          errors.push({ id: row.id, error: `download failed: ${dlErr?.message || "no data"}` });
          continue;
        }
        const bytes = new Uint8Array(await file.arrayBuffer());
        const contentType = file.type || "application/octet-stream";
        // B2 key: mirror old structure under "migrated/<bucket>/<path>"
        const key = `migrated/${parsed.bucket}/${parsed.path}`;

        if (dryRun) {
          migrated++;
          continue;
        }

        const newUrl = await putToB2(key, bytes, contentType);
        const upd: Record<string, string> = {};
        upd[row.column] = newUrl;
        const { error: updErr } = await admin.from(row.table).update(upd).eq("id", row.id);
        if (updErr) {
          errors.push({ id: row.id, error: `db update failed: ${updErr.message}` });
          continue;
        }
        migrated++;
      } catch (err: any) {
        errors.push({ id: row.id, error: err.message || String(err) });
      }
    }

    return new Response(
      JSON.stringify({
        scope,
        processed: rows.length,
        migrated,
        errors,
        dry_run: dryRun,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[backfill-supabase-to-b2]", message);
    return new Response(JSON.stringify({ error: message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
