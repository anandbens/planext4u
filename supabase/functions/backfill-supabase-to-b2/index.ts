/**
 * backfill-supabase-to-b2
 *
 * Admin-triggered job that copies existing files from Supabase Storage to
 * Backblaze B2 and rewrites the matching DB cells so URLs point to B2.
 *
 * Auth: requires a Supabase JWT belonging to a user with the `admin` role.
 *
 * Body:
 *   {
 *     scope?: string,          // see SCOPES below ('all' rotates through every scope)
 *     limit?: number,          // max items processed this run (default 50, max 200)
 *     dry_run?: boolean,
 *   }
 *
 * Returns: { processed, migrated, errors[], remaining, scope }
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
const B2_PRIVATE_KEY_ID = Deno.env.get("B2_PRIVATE_KEY_ID") ?? "";
const B2_PRIVATE_APP_KEY = Deno.env.get("B2_PRIVATE_APPLICATION_KEY") ?? "";
const B2_PRIVATE_BUCKET = Deno.env.get("B2_PRIVATE_BUCKET_NAME") ?? "";
const B2_PRIVATE_ENDPOINT = Deno.env.get("B2_PRIVATE_S3_ENDPOINT") ?? "";

// ─── Scope catalogue ───────────────────────────────────────────────────────
type ScalarScope = {
  kind: "scalar";
  table: string;
  columns: string[];
  /** When true, files go to the PRIVATE B2 bucket and are stored as `b2-private://<key>`. */
  private?: boolean;
};
type JsonArrayScope = {
  kind: "json_array";
  table: string;
  column: string;
  /** Items in the JSON array may be strings or { url } objects. */
  itemUrlField?: string;
};

type Scope = ScalarScope | JsonArrayScope;

const SCOPES: Record<string, Scope> = {
  // public
  media_library:        { kind: "scalar", table: "media_library", columns: ["file_url"] },
  vendors:              { kind: "scalar", table: "vendors", columns: ["background_image", "shop_photo_url"] },
  vendor_applications:  { kind: "scalar", table: "vendor_applications", columns: ["pan_image_url", "shop_photo_url", "store_logo_url"] },
  service_vendors:      { kind: "scalar", table: "service_vendors", columns: ["background_image", "shop_photo_url"] },
  products:             { kind: "scalar", table: "products", columns: ["image", "thumbnail_image", "banner_image", "socio_shopping_icon"] },
  product_variants:     { kind: "scalar", table: "product_variants", columns: ["image_url"] },
  product_variant_images: { kind: "scalar", table: "product_variant_images", columns: ["image_url"] },
  services:             { kind: "scalar", table: "services", columns: ["image"] },
  categories:           { kind: "scalar", table: "categories", columns: ["image", "icon", "banner_image", "promotion_banner_url"] },
  service_categories:   { kind: "scalar", table: "service_categories", columns: ["image", "icon", "banner_image", "promotion_banner_url"] },
  banners:              { kind: "scalar", table: "banners", columns: ["desktop_image", "mobile_image"] },
  popup_banners:        { kind: "scalar", table: "popup_banners", columns: ["image"] },
  homepage_banners:     { kind: "scalar", table: "homepage_banners", columns: ["media_url", "mobile_media_url"] },
  homepage_section_items:{ kind: "scalar", table: "homepage_section_items", columns: ["image_url"] },
  advertisements:       { kind: "scalar", table: "advertisements", columns: ["image_url", "mobile_image_url"] },
  splash_screens:       { kind: "scalar", table: "splash_screens", columns: ["image_url"] },
  onboarding_screens:   { kind: "scalar", table: "onboarding_screens", columns: ["image_url"] },
  vendor_onboarding_screens: { kind: "scalar", table: "vendor_onboarding_screens", columns: ["image_url"] },
  customers:            { kind: "scalar", table: "customers", columns: ["profile_photo"] },
  profiles:             { kind: "scalar", table: "profiles", columns: ["avatar_url"] },
  social_profiles:      { kind: "scalar", table: "social_profiles", columns: ["avatar_url"] },
  social_stories:       { kind: "scalar", table: "social_stories", columns: ["media_url"] },
  social_messages:      { kind: "scalar", table: "social_messages", columns: ["media_url"] },
  social_audio:         { kind: "scalar", table: "social_audio", columns: ["cover_url"] },
  social_channels:      { kind: "scalar", table: "social_channels", columns: ["cover_url"] },
  social_highlights:    { kind: "scalar", table: "social_highlights", columns: ["cover_url"] },
  social_conversations: { kind: "scalar", table: "social_conversations", columns: ["group_photo"] },
  social_posts_media:   { kind: "json_array", table: "social_posts", column: "media", itemUrlField: "url" },
  classified_ads:       { kind: "json_array", table: "classified_ads", column: "images" },
  properties_images:    { kind: "json_array", table: "properties", column: "images" },
  products_images:      { kind: "json_array", table: "products", column: "images" },
  services_images:      { kind: "json_array", table: "services", column: "images" },
  food_reviews_photos:  { kind: "json_array", table: "food_reviews", column: "photos" },
  complaints_images:    { kind: "json_array", table: "complaints", column: "images" },
  restaurants:          { kind: "scalar", table: "restaurants", columns: ["logo_url", "cover_image", "banner_url"] },
  menu_items:           { kind: "scalar", table: "menu_items", columns: ["image_url"] },
  menu_combos:          { kind: "scalar", table: "menu_combos", columns: ["image_url"] },
  properties_video:     { kind: "scalar", table: "properties", columns: ["video_url"] },
  property_amenities:   { kind: "scalar", table: "property_amenities", columns: ["icon"] },
  delivery_proofs:      { kind: "scalar", table: "delivery_proofs", columns: ["photo_url"] },
  service_bookings:     { kind: "scalar", table: "service_bookings", columns: ["completion_photo_url", "customer_pod_photo_url"] },
  complaint_messages:   { kind: "scalar", table: "complaint_messages", columns: ["attachment_url"] },
  support_ticket_messages: { kind: "scalar", table: "support_ticket_messages", columns: ["attachment_url"] },
  video_ads:            { kind: "scalar", table: "video_ads", columns: ["video_url", "thumbnail_url"] },
  // private — go to B2 private bucket
  kyc_documents:        { kind: "scalar", table: "kyc_documents", columns: ["front_image_url", "back_image_url"], private: true },
  riders:               { kind: "scalar", table: "riders", columns: ["aadhaar_image_url", "license_image_url", "pan_image_url", "profile_photo"], private: true },
};

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

async function putToB2(opts: {
  key: string;
  body: Uint8Array;
  contentType: string;
  isPrivate: boolean;
}): Promise<string> {
  const isPrivate = opts.isPrivate;
  const endpoint = isPrivate ? B2_PRIVATE_ENDPOINT : B2_ENDPOINT;
  const bucket = isPrivate ? B2_PRIVATE_BUCKET : B2_BUCKET;
  const keyId = isPrivate ? B2_PRIVATE_KEY_ID : B2_KEY_ID;
  const appKey = isPrivate ? B2_PRIVATE_APP_KEY : B2_APP_KEY;

  const region = regionFromEndpoint(endpoint);
  const host = endpointHost(endpoint);
  const service = "s3";
  const now = new Date();
  const amzDate = now.toISOString().replace(/[:-]|\.\d{3}/g, "");
  const dateStamp = amzDate.slice(0, 8);
  const credentialScope = `${dateStamp}/${region}/${service}/aws4_request`;

  const encodedKey = opts.key.split("/").map(encodeURIComponent).join("/");
  const canonicalUri = `/${bucket}/${encodedKey}`;
  const payloadHash = await sha256Hex(opts.body);

  const canonicalHeaders =
    `content-type:${opts.contentType}\nhost:${host}\nx-amz-content-sha256:${payloadHash}\nx-amz-date:${amzDate}\n`;
  const signedHeaders = "content-type;host;x-amz-content-sha256;x-amz-date";

  const canonicalRequest = [
    "PUT", canonicalUri, "", canonicalHeaders, signedHeaders, payloadHash,
  ].join("\n");

  const stringToSign = [
    "AWS4-HMAC-SHA256", amzDate, credentialScope,
    await sha256Hex(canonicalRequest),
  ].join("\n");

  const signingKey = await deriveSigningKey(appKey, dateStamp, region, service);
  const signature = hex(await hmac(signingKey, stringToSign));

  const authHeader =
    `AWS4-HMAC-SHA256 Credential=${keyId}/${credentialScope}, ` +
    `SignedHeaders=${signedHeaders}, Signature=${signature}`;

  const res = await fetch(`https://${host}${canonicalUri}`, {
    method: "PUT",
    headers: {
      "Content-Type": opts.contentType,
      "x-amz-content-sha256": payloadHash,
      "x-amz-date": amzDate,
      Authorization: authHeader,
    },
    body: opts.body,
  });
  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`B2 PUT failed ${res.status}: ${txt.slice(0, 200)}`);
  }
  return isPrivate ? `b2-private://${opts.key}` : `${B2_PUBLIC_BASE}/${opts.key}`;
}

// ─── URL helpers ───────────────────────────────────────────────────────────
function looksLikeSupabaseUrl(url: unknown): url is string {
  return typeof url === "string" &&
    (/\/storage\/v1\/object\/(public|sign)\//.test(url) ||
      /supabase\.co\/storage/.test(url));
}
function parseSupabasePath(url: string): { bucket: string; path: string } | null {
  const m = url.match(/\/storage\/v1\/object\/(?:public|sign)\/([^/]+)\/(.+?)(?:\?|$)/);
  if (!m) return null;
  return { bucket: m[1], path: decodeURIComponent(m[2]) };
}

async function migrateSingleUrl(
  admin: ReturnType<typeof createClient>,
  url: string,
  isPrivate: boolean,
): Promise<string | null> {
  const parsed = parseSupabasePath(url);
  if (!parsed) return null;
  const { data: file, error: dlErr } = await admin.storage.from(parsed.bucket).download(parsed.path);
  if (dlErr || !file) throw new Error(`download failed: ${dlErr?.message || "no data"}`);
  const bytes = new Uint8Array(await file.arrayBuffer());
  const contentType = file.type || "application/octet-stream";
  const key = `migrated/${parsed.bucket}/${parsed.path}`;
  return await putToB2({ key, body: bytes, contentType, isPrivate });
}

// Recursively walk a JSON value and rewrite any matching string URL.
async function rewriteJsonUrls(
  admin: ReturnType<typeof createClient>,
  value: unknown,
  isPrivate: boolean,
  itemUrlField: string | undefined,
  counters: { rewritten: number; errors: string[] },
): Promise<unknown> {
  if (value === null || value === undefined) return value;
  if (typeof value === "string") {
    if (looksLikeSupabaseUrl(value)) {
      try {
        const newUrl = await migrateSingleUrl(admin, value, isPrivate);
        if (newUrl) { counters.rewritten++; return newUrl; }
      } catch (e: any) {
        counters.errors.push(e.message || String(e));
      }
    }
    return value;
  }
  if (Array.isArray(value)) {
    const next: unknown[] = [];
    for (const item of value) next.push(await rewriteJsonUrls(admin, item, isPrivate, itemUrlField, counters));
    return next;
  }
  if (typeof value === "object") {
    const obj = value as Record<string, unknown>;
    const next: Record<string, unknown> = { ...obj };
    for (const k of Object.keys(next)) {
      // Prefer a hint when supplied (e.g. "url"), but still walk all string keys.
      next[k] = await rewriteJsonUrls(admin, next[k], isPrivate, itemUrlField, counters);
    }
    return next;
  }
  return value;
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
      .from("user_roles").select("role").eq("user_id", u.user.id)
      .in("role", ["admin"]).maybeSingle();
    if (!roleRow) {
      return new Response(JSON.stringify({ error: "Admin role required" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json().catch(() => ({}));
    const requestedScope: string = String(body.scope ?? "media_library");
    // Smaller default batch (10) to stay well under edge-function CPU/wall-time limits.
    const limit = Math.min(Math.max(Number(body.limit) || 10, 1), 50);
    const dryRun = Boolean(body.dry_run);

    // ── 'all' meta-scope: rotate through SCOPES until we find one with rows
    const scopeKeys = requestedScope === "all"
      ? Object.keys(SCOPES)
      : [requestedScope];

    let processedScope = requestedScope;
    let processed = 0, migrated = 0, remaining = 0;
    const errors: Array<{ id: string; column?: string; error: string }> = [];

    for (const scopeKey of scopeKeys) {
      const scope = SCOPES[scopeKey];
      if (!scope) {
        return new Response(JSON.stringify({ error: `Unknown scope: ${scopeKey}` }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      processedScope = scopeKey;

      if (scope.kind === "scalar") {
        const orFilter = scope.columns.map((c) => `${c}.like.%/storage/v1/object/%`).join(",");
        const { data, error } = await admin
          .from(scope.table)
          .select(`id, ${scope.columns.join(", ")}`)
          .or(orFilter).limit(limit);
        if (error) throw error;
        const rows = (data || []) as any[];
        if (rows.length === 0) continue;

        for (const row of rows) {
          for (const col of scope.columns) {
            const val = row[col];
            if (!looksLikeSupabaseUrl(val)) continue;
            processed++;
            try {
              if (dryRun) { migrated++; continue; }
              const newUrl = await migrateSingleUrl(admin, val, scope.private === true);
              if (!newUrl) { errors.push({ id: row.id, column: col, error: "could not parse URL" }); continue; }
              const upd: Record<string, string> = {}; upd[col] = newUrl;
              const { error: updErr } = await admin.from(scope.table).update(upd).eq("id", row.id);
              if (updErr) { errors.push({ id: row.id, column: col, error: `db update: ${updErr.message}` }); continue; }
              migrated++;
            } catch (e: any) {
              errors.push({ id: row.id, column: col, error: e.message || String(e) });
            }
          }
        }

        // Count remaining for this scope (cheap)
        const { count } = await admin.from(scope.table)
          .select("id", { count: "exact", head: true })
          .or(orFilter);
        remaining = count ?? 0;
        break; // stop at first scope that had rows
      } else {
        // json_array
        const { data, error } = await admin
          .from(scope.table)
          .select(`id, ${scope.column}`)
          .like(`${scope.column}::text` as any, "%supabase.co/storage%")
          .limit(limit);
        // Some Postgrest versions don't allow ::text in like — fall back to filter
        let rows: any[] = data ?? [];
        if (error) {
          const fallback = await admin.from(scope.table).select(`id, ${scope.column}`).limit(limit * 4);
          if (fallback.error) throw fallback.error;
          rows = (fallback.data || []).filter((r: any) =>
            JSON.stringify(r[scope.column] ?? "").includes("supabase.co/storage")
          ).slice(0, limit);
        }
        if (rows.length === 0) continue;

        for (const row of rows) {
          processed++;
          const counters = { rewritten: 0, errors: [] as string[] };
          try {
            const newJson = await rewriteJsonUrls(admin, row[scope.column], false, scope.itemUrlField, counters);
            if (counters.rewritten === 0) {
              if (counters.errors.length) errors.push({ id: row.id, error: counters.errors.join("; ") });
              continue;
            }
            if (dryRun) { migrated++; continue; }
            const upd: Record<string, unknown> = {}; upd[scope.column] = newJson;
            const { error: updErr } = await admin.from(scope.table).update(upd).eq("id", row.id);
            if (updErr) { errors.push({ id: row.id, error: `db update: ${updErr.message}` }); continue; }
            migrated++;
            if (counters.errors.length) errors.push({ id: row.id, error: counters.errors.join("; ") });
          } catch (e: any) {
            errors.push({ id: row.id, error: e.message || String(e) });
          }
        }

        // Approximate remaining via a scan (cap 5000 rows, cheap on indexes + small JSON)
        const { data: rem } = await admin.from(scope.table).select(`id, ${scope.column}`).limit(5000);
        remaining = (rem || []).filter((r: any) =>
          JSON.stringify(r[scope.column] ?? "").includes("supabase.co/storage")
        ).length;
        break;
      }
    }

    return new Response(JSON.stringify({
      scope: processedScope,
      processed, migrated,
      remaining,
      errors: errors.slice(0, 50),
      error_count: errors.length,
      dry_run: dryRun,
    }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[backfill-supabase-to-b2]", message);
    return new Response(JSON.stringify({ error: message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
