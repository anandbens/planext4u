/**
 * b2-populate-image-urls
 *
 * Modes (controlled by `mode` field in request body — default = "populate"):
 *
 *  • mode="list_folders"
 *      Returns the raw list of folder names under each configured B2 prefix.
 *      Useful for diagnosing "why didn't my records get populated?".
 *      Body: { mode: "list_folders", scope?: "all" | <key> }
 *
 *  • mode="populate" (default)
 *      For each configured scope, lists every <Prefix>/<ID>/ folder in B2,
 *      fetches the candidate image, and writes the URL to the DB column for
 *      records whose value is currently NULL/empty (or all rows when
 *      overwrite=true). Reports folders that had no DB record AND DB records
 *      that had no folder so the operator can see the gap.
 *      Body: { scope?: "all"|<key>, overwrite?: bool, dry_run?: bool }
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

function readSecret(name: string): string {
  return (Deno.env.get(name) ?? "")
    .trim()
    .replace(/^['"]+|['"]+$/g, "")
    .replace(/[\r\n]+/g, "");
}

function redactSecret(value: string): string {
  if (!value) return "missing";
  if (value.length <= 8) return `${value.slice(0, 2)}…${value.slice(-2)}`;
  return `${value.slice(0, 4)}…${value.slice(-4)}`;
}

const SUPABASE_URL = readSecret("SUPABASE_URL");
const SUPABASE_ANON = readSecret("SUPABASE_ANON_KEY");
const SUPABASE_SERVICE_ROLE = readSecret("SUPABASE_SERVICE_ROLE_KEY");

const B2_KEY_ID = readSecret("B2_APPLICATION_KEY_ID");
const B2_APP_KEY = readSecret("B2_APPLICATION_KEY");
const B2_BUCKET = readSecret("B2_BUCKET_NAME");
const B2_ENDPOINT = readSecret("B2_S3_ENDPOINT");
const B2_PUBLIC_BASE =
  readSecret("B2_PUBLIC_URL_BASE").replace(/\/+$/, "") ||
  `https://f005.backblazeb2.com/file/${B2_BUCKET}`;

type Mapping = {
  prefix: string;
  table: string;
  idColumn: string;
  columns: string[];
};

const MAPPINGS: Record<string, Mapping> = {
  advertisements:        { prefix: "Advertisements", table: "advertisements", idColumn: "id",      columns: ["image_url", "mobile_image_url"] },
  banners:               { prefix: "Banners",        table: "banners",        idColumn: "id",      columns: ["desktop_image", "mobile_image"] },
  categories:            { prefix: "Categories",     table: "categories",     idColumn: "id",      columns: ["image", "icon", "banner_image", "promotion_banner_url"] },
  customers:             { prefix: "Customers",      table: "customers",      idColumn: "id",      columns: ["profile_photo"] },
  popup_banners:         { prefix: "PopupBanners",   table: "popup_banners",  idColumn: "id",      columns: ["image"] },
  products:              { prefix: "Products",       table: "products",       idColumn: "id",      columns: ["image", "thumbnail_image", "banner_image"] },
  services:              { prefix: "Services",       table: "services",       idColumn: "id",      columns: ["image"] },
  vendors:               { prefix: "Vendors",        table: "vendors",        idColumn: "id",      columns: ["shop_photo_url", "background_image"] },
  service_vendors:       { prefix: "Vendors",        table: "service_vendors", idColumn: "id",     columns: ["shop_photo_url", "background_image"] },
  social_profiles:       { prefix: "SocialProfiles", table: "social_profiles", idColumn: "user_id", columns: ["avatar_url"] },
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

// ─── SigV4 ───
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
}): Promise<{ prefixes: string[]; keys: string[]; nextToken?: string; isTruncated: boolean }> {
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
    const code = txt.match(/<Code>([^<]+)<\/Code>/)?.[1] ?? "unknown";
    const message = txt.match(/<Message>([^<]+)<\/Message>/)?.[1] ?? txt.slice(0, 200);
    throw new Error(
      `B2 list failed ${res.status} [${code}]: ${message} ` +
      `(endpoint=${host}, region=${region}, bucket=${B2_BUCKET}, key=${redactSecret(B2_KEY_ID)})`,
    );
  }
  const xml = await res.text();
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
  const encoded = key.split("/").map(encodeURIComponent).join("/");
  return `${B2_PUBLIC_BASE}/${encoded}`;
}

function normalizeNumericId(value: string): string {
  const normalized = value.replace(/^0+/, "");
  return normalized || "0";
}

function extractNumericId(value: unknown): string | null {
  const raw = String(value ?? "").trim();
  if (!raw) return null;

  if (/^\d+$/.test(raw)) return normalizeNumericId(raw);

  const directSuffix = raw.match(/^[A-Za-z]+0*(\d+)$/);
  if (directSuffix?.[1]) return normalizeNumericId(directSuffix[1]);

  const delimitedSegment = raw.match(/^[A-Za-z]+[-_]0*(\d+)(?:[-_].*)?$/);
  if (delimitedSegment?.[1]) return normalizeNumericId(delimitedSegment[1]);

  const boundedSegment = raw.match(/(?:^|[-_])0*(\d+)(?=$|[-_])/);
  if (boundedSegment?.[1]) return normalizeNumericId(boundedSegment[1]);

  return null;
}

async function listAllFolders(prefix: string): Promise<string[]> {
  const folders: string[] = [];
  let token: string | undefined;
  do {
    const page = await s3ListObjects({
      prefix: `${prefix}/`,
      delimiter: "/",
      continuationToken: token,
      maxKeys: 1000,
    });
    folders.push(...page.prefixes);
    token = page.isTruncated ? page.nextToken : undefined;
  } while (token);
  return folders;
}

// ─── Mode: list_folders ───
async function listFoldersForScope(scopeKey: string) {
  const map = MAPPINGS[scopeKey];
  if (!map) return { scope: scopeKey, error: "unknown scope" };
  try {
    const folders = await listAllFolders(map.prefix);
    return {
      scope: scopeKey,
      prefix: map.prefix,
      folder_count: folders.length,
      sample_first: folders.slice(0, 10).map((f) => f.slice(map.prefix.length + 1, -1)),
      sample_last: folders.slice(-5).map((f) => f.slice(map.prefix.length + 1, -1)),
    };
  } catch (e: any) {
    return { scope: scopeKey, prefix: map.prefix, error: e.message || String(e) };
  }
}

// ─── Mode: populate (rewritten — bulk fetch + per-folder file pick) ───
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
    db_records_total: 0,
    db_records_missing_image: 0,
    matched_records: 0,
    updated: 0,
    skipped_no_image: 0,
    skipped_no_record: 0,        // folders that have no matching DB row
    skipped_already_set: 0,
    db_rows_without_folder: 0,   // DB rows that have no B2 folder at all
    folders_without_record_sample: [] as string[],
    db_rows_without_folder_sample: [] as string[],
    sample_updates: [] as Array<{ id: string; url: string }>,
    errors: [] as string[],
  };

  // Step 1 — list every <Prefix>/<ID>/ folder (paginated, complete)
  let folders: string[];
  try {
    folders = await listAllFolders(map.prefix);
  } catch (e: any) {
    result.errors.push(`list ${map.prefix}/: ${e.message || e}`);
    return result;
  }
  result.folders_found = folders.length;
  if (folders.length === 0) return result;

  // Build folder->id map
  const folderIds = folders.map((f) => f.slice(map.prefix.length + 1, -1)).filter(Boolean);

  // Step 2 — exact match first, then fallback to numeric ID extraction
  const rowsById = new Map<string, Record<string, any>>();
  const rowsByNumericId = new Map<string, Record<string, any>>();
  const ambiguousNumericIds = new Set<string>();
  const matchedRecordIds = new Set<string>();

  for (let i = 0; i < folderIds.length; i += 500) {
    const batch = folderIds.slice(i, i + 500);
    const { data, error } = await admin
      .from(map.table)
      .select(`${map.idColumn}, ${map.columns.join(", ")}`)
      .in(map.idColumn, batch);
    if (error) { result.errors.push(`select batch: ${error.message}`); continue; }
    for (const r of (data ?? []) as any[]) rowsById.set(String(r[map.idColumn]), r);
  }

  const unmatchedFolderIds = folderIds.filter((folderId) => !rowsById.has(folderId));
  const neededNumericIds = new Set(
    unmatchedFolderIds
      .map((folderId) => extractNumericId(folderId))
      .filter((value): value is string => Boolean(value)),
  );

  if (neededNumericIds.size > 0) {
    const pageSize = 1000;
    for (let from = 0; ; from += pageSize) {
      const { data, error } = await admin
        .from(map.table)
        .select(`${map.idColumn}, ${map.columns.join(", ")}`)
        .range(from, from + pageSize - 1);

      if (error) {
        result.errors.push(`scan rows: ${error.message}`);
        break;
      }

      const rows = (data ?? []) as any[];
      for (const row of rows) {
        const rawId = String(row[map.idColumn] ?? "").trim();
        if (!rawId) continue;

        const numericId = extractNumericId(rawId);
        if (!numericId || !neededNumericIds.has(numericId)) continue;

        const existing = rowsByNumericId.get(numericId);
        if (existing && String(existing[map.idColumn]) !== rawId) {
          rowsByNumericId.delete(numericId);
          ambiguousNumericIds.add(numericId);
          continue;
        }

        if (!ambiguousNumericIds.has(numericId)) {
          rowsByNumericId.set(numericId, row);
        }
      }

      if (rows.length < pageSize) break;
    }
  }

  // Optional total record count for visibility
  const { count } = await admin.from(map.table).select("*", { count: "exact", head: true });
  result.db_records_total = count ?? 0;

  const resolveRowForFolderId = (folderId: string) => {
    const exactRow = rowsById.get(folderId);
    if (exactRow) return exactRow;

    const numericId = extractNumericId(folderId);
    if (!numericId || ambiguousNumericIds.has(numericId)) return null;

    return rowsByNumericId.get(numericId) ?? null;
  };

  // Step 3 — for each folder, list files (concurrent), then update DB
  const concurrency = 12;
  let cursor = 0;
  const orphanFolders: string[] = [];

  async function worker() {
    while (true) {
      const idx = cursor++;
      if (idx >= folders.length) return;
      const folder = folders[idx];
      const recordId = folderIds[idx];
      if (!recordId) continue;

      const numericId = extractNumericId(recordId);
      if (numericId && ambiguousNumericIds.has(numericId)) {
        result.errors.push(`${recordId}: multiple DB rows share numeric id ${numericId}`);
        result.skipped_no_record++;
        if (orphanFolders.length < 10) orphanFolders.push(recordId);
        continue;
      }

      const row = resolveRowForFolderId(recordId);
      if (!row) {
        result.skipped_no_record++;
        if (orphanFolders.length < 10) orphanFolders.push(recordId);
        continue;
      }

      // CRITICAL: use the actual DB row's ID for the UPDATE — not the folder
      // name. When numeric fallback matched (folder "842" → row "PRD-842-idww"),
      // these differ and updating by folder name silently affects 0 rows.
      const dbId = String(row[map.idColumn]);
      matchedRecordIds.add(dbId);
      try {
        const listing = await s3ListObjects({ prefix: folder, maxKeys: 50 });
        const imageKey = listing.keys
          .filter((k) => !k.endsWith("/") && IMAGE_RE.test(k))
          .sort()[0];
        if (!imageKey) { result.skipped_no_image++; continue; }
        const url = publicUrlForKey(imageKey);

        const patch: Record<string, string> = {};
        for (const col of map.columns) {
          const cur = (row as any)[col];
          if (overwrite || cur === null || cur === undefined || cur === "") {
            patch[col] = url;
          }
        }
        if (Object.keys(patch).length === 0) { result.skipped_already_set++; continue; }

        if (!dryRun) {
          const { error: upErr } = await admin
            .from(map.table)
            .update(patch)
            .eq(map.idColumn, dbId);
          if (upErr) { result.errors.push(`${recordId}→${dbId}: ${upErr.message}`); continue; }
        }
        result.updated++;
        if (result.sample_updates.length < 3) {
          result.sample_updates.push({ id: dbId, url });
        }
      } catch (e: any) {
        result.errors.push(`${recordId}→${dbId}: ${e.message || e}`);
      }
    }
  }
  await Promise.all(Array.from({ length: concurrency }, () => worker()));
  result.matched_records = matchedRecordIds.size;
  result.folders_without_record_sample = orphanFolders;

  // Step 4 — find DB rows that have no B2 folder & no image yet (so admin can act)
  try {
    const firstCol = map.columns[0];
    const orFilter = map.columns.map((c) => `${c}.is.null`).join(",");
    const { data: missingRows, count: missingCount } = await admin
      .from(map.table)
      .select(`${map.idColumn}`, { count: "exact" })
      .or(orFilter)
      .limit(20);
    result.db_records_missing_image = missingCount ?? 0;

    const matchedFolderIds = new Set<string>();
    for (const fid of folderIds) {
      matchedFolderIds.add(fid);
      const num = extractNumericId(fid);
      if (num) matchedFolderIds.add(num);
    }
    const noFolderRows: string[] = [];
    for (const r of (missingRows ?? []) as any[]) {
      const rid = String(r[map.idColumn] ?? "");
      const num = extractNumericId(rid);
      const hasFolder = matchedFolderIds.has(rid) || (num && matchedFolderIds.has(num));
      if (!hasFolder) noFolderRows.push(rid);
    }
    result.db_rows_without_folder_sample = noFolderRows.slice(0, 10);
    result.db_rows_without_folder = noFolderRows.length;
    void firstCol;
  } catch (e: any) {
    result.errors.push(`gap report: ${e.message || e}`);
  }
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
    const mode = String(body.mode ?? "populate").trim();
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

    if (mode === "list_folders") {
      const out = [];
      for (const s of scopes) out.push(await listFoldersForScope(s));
      return new Response(
        JSON.stringify({ ok: true, mode, results: out }, null, 2),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const results = [];
    for (const s of scopes) {
      try { results.push(await processScope(admin, s, overwrite, dryRun)); }
      catch (e: any) { results.push({ scope: s, error: e.message || String(e) }); }
    }

    const totals = results.reduce(
      (acc, r: any) => {
        acc.folders_found += r.folders_found ?? 0;
        acc.matched_records += r.matched_records ?? 0;
        acc.updated += r.updated ?? 0;
        acc.skipped_no_image += r.skipped_no_image ?? 0;
        acc.skipped_no_record += r.skipped_no_record ?? 0;
        acc.db_rows_without_folder += r.db_rows_without_folder ?? 0;
        acc.db_records_missing_image += r.db_records_missing_image ?? 0;
        acc.errors += (r.errors?.length ?? 0) + (r.error ? 1 : 0);
        return acc;
      },
      { folders_found: 0, matched_records: 0, updated: 0, skipped_no_image: 0, skipped_no_record: 0, db_rows_without_folder: 0, db_records_missing_image: 0, errors: 0 },
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
