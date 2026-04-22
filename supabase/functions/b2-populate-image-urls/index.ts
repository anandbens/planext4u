/**
 * b2-populate-image-urls
 *
 * Scans the public Backblaze B2 bucket for folders matching the structure
 *   <Prefix>/<RecordID>/<filename>
 * and writes the constructed public URL to the corresponding DB column for
 * every record whose image field is currently NULL or empty.
 *
 * Body:
 *   {
 *     scope?: string,        // one of MAPPINGS keys, or "all" (default)
 *     overwrite?: boolean,   // also overwrite non-empty values (default false)
 *     dry_run?: boolean,     // list planned updates only
 *   }
 *
 * Returns: { results: [{ scope, scanned, updated, skipped, errors[] }] }
 *
 * Auth: requires Supabase JWT for an admin / finance / sales user.
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
const B2_PUBLIC_BASE =
  (Deno.env.get("B2_PUBLIC_URL_BASE") ?? "").replace(/\/+$/, "") ||
  `https://f005.backblazeb2.com/file/${B2_BUCKET}`;

// ─── Mapping: B2 folder prefix → DB table + scalar column(s) ───────────────
type Mapping = {
  prefix: string;          // e.g. "Advertisements"  (no trailing slash)
  table: string;           // DB table name
  idColumn: string;        // DB column matching the folder name (default "id")
  columns: string[];       // columns to populate (first one wins; we set every empty one)
};

// Maps actual B2 folder prefixes (verified from bucket browser) to DB tables/columns.
// Folders present in B2 but intentionally skipped (no scalar image column or
// multi-image arrays managed elsewhere):
//   AvailableAreas, AvailableCities, ClassifiedCategories, ClassifiedProducts,
//   ClassifiedServices, ClassifiedVendors, NewsFeed, POSProducts, POSVendors,
//   Posts, ProductRequests, Settlements
const MAPPINGS: Record<string, Mapping> = {
  // Confirmed folders from B2 bucket
  advertisements:        { prefix: "Advertisements", table: "advertisements", idColumn: "id",      columns: ["image_url", "mobile_image_url"] },
  banners:               { prefix: "Banners",        table: "banners",        idColumn: "id",      columns: ["desktop_image", "mobile_image"] },
  categories:            { prefix: "Categories",     table: "categories",     idColumn: "id",      columns: ["image", "icon", "banner_image", "promotion_banner_url"] },
  customers:             { prefix: "Customers",      table: "customers",      idColumn: "id",      columns: ["profile_photo"] },
  popup_banners:         { prefix: "PopupBanners",   table: "popup_banners",  idColumn: "id",      columns: ["image"] },
  products:              { prefix: "Products",       table: "products",       idColumn: "id",      columns: ["image", "thumbnail_image", "banner_image"] },
  services:              { prefix: "Services",       table: "services",       idColumn: "id",      columns: ["image"] },
  vendors:               { prefix: "Vendors",        table: "vendors",        idColumn: "id",      columns: ["shop_photo_url", "background_image"] },
  // Some vendor folders (esp. service vendors) share the same id space — try both tables
  service_vendors:       { prefix: "Vendors",        table: "service_vendors", idColumn: "id",     columns: ["shop_photo_url", "background_image"] },
  // Social avatars are keyed by user_id (UUID) — folder name = SocialProfiles/<uuid>/
  social_profiles:       { prefix: "SocialProfiles", table: "social_profiles", idColumn: "user_id", columns: ["avatar_url"] },

  // The following are only used if matching folders are added later in B2.
  // They scan harmlessly and are skipped if no folders exist.
  restaurants:           { prefix: "Restaurants",        table: "restaurants",        idColumn: "id", columns: ["logo_url", "cover_image", "banner_url"] },
  menu_items:            { prefix: "MenuItems",          table: "menu_items",         idColumn: "id", columns: ["image_url"] },
  menu_combos:           { prefix: "MenuCombos",         table: "menu_combos",        idColumn: "id", columns: ["image_url"] },
  homepage_banners:      { prefix: "HomepageBanners",    table: "homepage_banners",   idColumn: "id", columns: ["media_url", "mobile_media_url"] },
  homepage_section_items:{ prefix: "HomepageSectionItems",table: "homepage_section_items", idColumn: "id", columns: ["image_url"] },
  splash_screens:        { prefix: "SplashScreens",      table: "splash_screens",     idColumn: "id", columns: ["image_url"] },
  onboarding_screens:    { prefix: "OnboardingScreens",  table: "onboarding_screens", idColumn: "id", columns: ["image_url"] },
  vendor_onboarding_screens: { prefix: "VendorOnboardingScreens", table: "vendor_onboarding_screens", idColumn: "id", columns: ["image_url"] },
  property_amenities:    { prefix: "PropertyAmenities",  table: "property_amenities", idColumn: "id", columns: ["icon"] },
};

const IMAGE_RE = /\.(jpe?g|png|webp|gif|avif|bmp|svg)$/i;

// ─── SigV4 helpers (just enough to call S3 ListObjectsV2) ──────────────────
function regionFromEndpoint(endpoint: string): string {
  try {
    const host = new URL(endpoint).hostname;
    return host.match(/s3\.([^.]+)\.backblazeb2\.com/)?.[1] ?? "us-east-005";
  } catch { return "us-east-005"; }
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

async function s3ListObjects(opts: {
  prefix: string;
  delimiter?: string;
  continuationToken?: string;
  maxKeys?: number;
}): Promise<{
  prefixes: string[];      // CommonPrefixes
  keys: string[];          // file keys
  nextToken?: string;
  isTruncated: boolean;
}> {
  const region = regionFromEndpoint(B2_ENDPOINT);
  const host = endpointHost(B2_ENDPOINT);
  const service = "s3";

  const now = new Date();
  const amzDate = now.toISOString().replace(/[:-]|\.\d{3}/g, "");
  const dateStamp = amzDate.slice(0, 8);
  const credentialScope = `${dateStamp}/${region}/${service}/aws4_request`;

  const canonicalUri = `/${B2_BUCKET}`;
  const queryParams: Record<string, string> = {
    "list-type": "2",
    "max-keys": String(opts.maxKeys ?? 1000),
    "prefix": opts.prefix,
  };
  if (opts.delimiter) queryParams["delimiter"] = opts.delimiter;
  if (opts.continuationToken) queryParams["continuation-token"] = opts.continuationToken;

  const canonicalQuery = Object.keys(queryParams).sort()
    .map((k) => `${encodeURIComponent(k)}=${encodeURIComponent(queryParams[k])}`)
    .join("&");

  const payloadHash = await sha256Hex("");
  const canonicalHeaders =
    `host:${host}\nx-amz-content-sha256:${payloadHash}\nx-amz-date:${amzDate}\n`;
  const signedHeaders = "host;x-amz-content-sha256;x-amz-date";

  const canonicalRequest = [
    "GET", canonicalUri, canonicalQuery, canonicalHeaders, signedHeaders, payloadHash,
  ].join("\n");

  const stringToSign = [
    "AWS4-HMAC-SHA256", amzDate, credentialScope, await sha256Hex(canonicalRequest),
  ].join("\n");

  const signingKey = await deriveSigningKey(B2_APP_KEY, dateStamp, region, service);
  const signature = hex(await hmac(signingKey, stringToSign));

  const authHeader =
    `AWS4-HMAC-SHA256 Credential=${B2_KEY_ID}/${credentialScope}, ` +
    `SignedHeaders=${signedHeaders}, Signature=${signature}`;

  const url = `https://${host}${canonicalUri}?${canonicalQuery}`;
  const res = await fetch(url, {
    method: "GET",
    headers: {
      "x-amz-content-sha256": payloadHash,
      "x-amz-date": amzDate,
      "Authorization": authHeader,
    },
  });
  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`B2 list failed ${res.status}: ${txt.slice(0, 400)}`);
  }
  const xml = await res.text();
  // Tiny XML parser for ListBucketResult
  const prefixes: string[] = [];
  const keys: string[] = [];
  const prefixRe = /<CommonPrefixes>\s*<Prefix>([^<]+)<\/Prefix>\s*<\/CommonPrefixes>/g;
  let m: RegExpExecArray | null;
  while ((m = prefixRe.exec(xml)) !== null) prefixes.push(decodeXml(m[1]));
  const keyRe = /<Contents>[\s\S]*?<Key>([^<]+)<\/Key>[\s\S]*?<\/Contents>/g;
  while ((m = keyRe.exec(xml)) !== null) keys.push(decodeXml(m[1]));
  const tokenMatch = xml.match(/<NextContinuationToken>([^<]+)<\/NextContinuationToken>/);
  const truncMatch = xml.match(/<IsTruncated>([^<]+)<\/IsTruncated>/);
  return {
    prefixes,
    keys,
    nextToken: tokenMatch?.[1] ? decodeXml(tokenMatch[1]) : undefined,
    isTruncated: truncMatch?.[1] === "true",
  };
}

function decodeXml(s: string) {
  return s
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}

function publicUrlForKey(key: string): string {
  // Pre-encode each segment so spaces/etc. work in browsers
  const encoded = key.split("/").map(encodeURIComponent).join("/");
  return `${B2_PUBLIC_BASE}/${encoded}`;
}

// ─── Main scope handler ────────────────────────────────────────────────────
async function processScope(
  admin: ReturnType<typeof createClient>,
  scopeKey: string,
  overwrite: boolean,
  dryRun: boolean,
) {
  const map = MAPPINGS[scopeKey];
  if (!map) throw new Error(`Unknown scope: ${scopeKey}`);

  const result = {
    scope: scopeKey,
    prefix: map.prefix,
    table: map.table,
    folders_found: 0,
    updated: 0,
    skipped_no_image: 0,
    skipped_no_record: 0,
    skipped_already_set: 0,
    sample_updates: [] as Array<{ id: string; url: string }>,
    errors: [] as string[],
  };

  // Step 1 — list every <Prefix>/<ID>/ folder
  const folders: string[] = [];
  let token: string | undefined;
  do {
    try {
      const page = await s3ListObjects({
        prefix: `${map.prefix}/`,
        delimiter: "/",
        continuationToken: token,
        maxKeys: 1000,
      });
      for (const p of page.prefixes) folders.push(p);
      token = page.isTruncated ? page.nextToken : undefined;
    } catch (e: any) {
      result.errors.push(`list ${map.prefix}/: ${e.message || e}`);
      break;
    }
  } while (token);

  result.folders_found = folders.length;
  if (folders.length === 0) return result;

  // Step 2 — for each folder, list files and pick the first image
  // Process sequentially-ish but with small concurrency for speed
  const concurrency = 8;
  let cursor = 0;
  async function worker() {
    while (true) {
      const idx = cursor++;
      if (idx >= folders.length) return;
      const folder = folders[idx]; // e.g. "Advertisements/AD-001/"
      const recordId = folder.slice(map.prefix.length + 1, -1); // strip "Advertisements/" + trailing "/"
      if (!recordId) continue;
      try {
        const listing = await s3ListObjects({ prefix: folder, maxKeys: 50 });
        // pick the first image-like file (sorted alphabetically, not subfolder)
        const imageKey = listing.keys
          .filter((k) => !k.endsWith("/") && IMAGE_RE.test(k))
          .sort()[0];
        if (!imageKey) {
          result.skipped_no_image++;
          continue;
        }
        const url = publicUrlForKey(imageKey);

        // Step 3 — fetch the row to know which columns are still empty
        const { data: row, error: selErr } = await admin
          .from(map.table)
          .select(`${map.idColumn}, ${map.columns.join(", ")}`)
          .eq(map.idColumn, recordId)
          .maybeSingle();
        if (selErr) { result.errors.push(`${recordId}: ${selErr.message}`); continue; }
        if (!row) { result.skipped_no_record++; continue; }

        const patch: Record<string, string> = {};
        for (const col of map.columns) {
          const cur = (row as any)[col];
          if (overwrite || cur === null || cur === undefined || cur === "") {
            patch[col] = url;
          }
        }
        if (Object.keys(patch).length === 0) {
          result.skipped_already_set++;
          continue;
        }

        if (!dryRun) {
          const { error: upErr } = await admin
            .from(map.table)
            .update(patch)
            .eq(map.idColumn, recordId);
          if (upErr) { result.errors.push(`${recordId}: ${upErr.message}`); continue; }
        }
        result.updated++;
        if (result.sample_updates.length < 3) {
          result.sample_updates.push({ id: recordId, url });
        }
      } catch (e: any) {
        result.errors.push(`${recordId}: ${e.message || e}`);
      }
    }
  }
  await Promise.all(Array.from({ length: concurrency }, () => worker()));
  return result;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    if (!B2_KEY_ID || !B2_APP_KEY || !B2_BUCKET || !B2_ENDPOINT) {
      return new Response(
        JSON.stringify({ error: "Public B2 bucket not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // --- Auth ---
    const authHeader = req.headers.get("Authorization") ?? "";
    const token = authHeader.replace(/^Bearer\s+/i, "");
    if (!token) {
      return new Response(JSON.stringify({ error: "Missing Authorization" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const userClient = createClient(SUPABASE_URL, SUPABASE_ANON, {
      global: { headers: { Authorization: `Bearer ${token}` } },
    });
    const { data: userData, error: userErr } = await userClient.auth.getUser(token);
    if (userErr || !userData?.user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE);
    const { data: roles } = await admin
      .from("user_roles")
      .select("role")
      .eq("user_id", userData.user.id)
      .in("role", ["admin", "finance", "sales"]);
    if (!roles || roles.length === 0) {
      return new Response(JSON.stringify({ error: "Admin access required" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // --- Body ---
    const body = await req.json().catch(() => ({}));
    const requested = String(body.scope ?? "all").trim();
    const overwrite = body.overwrite === true;
    const dryRun = body.dry_run === true;

    const scopes = requested === "all"
      ? Object.keys(MAPPINGS)
      : requested in MAPPINGS ? [requested] : [];
    if (scopes.length === 0) {
      return new Response(
        JSON.stringify({ error: `Unknown scope. Valid: all, ${Object.keys(MAPPINGS).join(", ")}` }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const results = [];
    for (const s of scopes) {
      try {
        results.push(await processScope(admin, s, overwrite, dryRun));
      } catch (e: any) {
        results.push({ scope: s, error: e.message || String(e) });
      }
    }

    const totals = results.reduce(
      (acc, r: any) => {
        acc.folders_found += r.folders_found ?? 0;
        acc.updated += r.updated ?? 0;
        acc.errors += (r.errors?.length ?? 0) + (r.error ? 1 : 0);
        return acc;
      },
      { folders_found: 0, updated: 0, errors: 0 },
    );

    return new Response(
      JSON.stringify({ ok: true, dry_run: dryRun, totals, results }, null, 2),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[b2-populate-image-urls]", message);
    return new Response(JSON.stringify({ error: message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
