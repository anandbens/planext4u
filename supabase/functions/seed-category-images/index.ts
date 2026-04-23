/**
 * seed-category-images
 *
 * Admin-only one-shot job that:
 *  1. Finds parent categories whose `image` column is NULL/empty/non-URL.
 *  2. Generates a clean square category icon image via Lovable AI Gateway
 *     (`google/gemini-2.5-flash-image-preview`).
 *  3. Uploads the PNG to the PUBLIC Backblaze B2 bucket using AWS SigV4.
 *  4. Updates `categories.image` with the public Friendly/CDN URL.
 *
 * Designed to be safe to re-run: it skips categories that already have an
 * http(s) image URL.
 *
 * Body: { limit?: number; categoryIds?: string[] }
 *   - limit: max categories to process (default 30, max 100)
 *   - categoryIds: optional restriction to specific IDs
 *
 * Returns: { processed, updated, skipped, errors: {id,name,error}[] }
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
    .replace(/^["']+|["']+$/g, "")
    .replace(/[\r\n]+/g, "");
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
const LOVABLE_API_KEY = readSecret("LOVABLE_API_KEY");

// --- SigV4 helpers (PUT to B2) ---
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

async function putToB2(opts: {
  key: string;
  contentType: string;
  body: Uint8Array;
}): Promise<void> {
  const { key, contentType, body } = opts;
  const region = regionFromEndpoint(B2_ENDPOINT);
  const host = endpointHost(B2_ENDPOINT);
  const service = "s3";
  const now = new Date();
  const amzDate = now.toISOString().replace(/[:-]|\.\d{3}/g, "");
  const dateStamp = amzDate.slice(0, 8);
  const credentialScope = `${dateStamp}/${region}/${service}/aws4_request`;
  const encodedKey = key.split("/").map((s) => encodeURIComponent(s)).join("/");
  const canonicalUri = `/${B2_BUCKET}/${encodedKey}`;
  const ct = contentType.trim().toLowerCase() || "application/octet-stream";
  const payloadHash = await sha256Hex(body);
  const canonicalHeaders =
    `content-type:${ct}\nhost:${host}\nx-amz-content-sha256:${payloadHash}\nx-amz-date:${amzDate}\n`;
  const signedHeaders = "content-type;host;x-amz-content-sha256;x-amz-date";
  const canonicalRequest = ["PUT", canonicalUri, "", canonicalHeaders, signedHeaders, payloadHash].join("\n");
  const stringToSign = ["AWS4-HMAC-SHA256", amzDate, credentialScope, await sha256Hex(canonicalRequest)].join("\n");
  const signingKey = await deriveKey(B2_APP_KEY, dateStamp, region, service);
  const signature = hex(await hmac(signingKey, stringToSign));
  const authorization =
    `AWS4-HMAC-SHA256 Credential=${B2_KEY_ID}/${credentialScope}, ` +
    `SignedHeaders=${signedHeaders}, Signature=${signature}`;

  const res = await fetch(`https://${host}${canonicalUri}`, {
    method: "PUT",
    headers: {
      "Content-Type": ct,
      "x-amz-content-sha256": payloadHash,
      "x-amz-date": amzDate,
      Authorization: authorization,
    },
    body,
  });
  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`B2 PUT failed ${res.status}: ${txt.slice(0, 200)}`);
  }
}

function slugify(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 50) || "category";
}

function buildPrompt(name: string): string {
  const cleanName = name.trim();
  return [
    `A clean, modern, minimalist category icon illustration representing "${cleanName}".`,
    "Flat illustration style, vibrant teal and amber accent colors on a soft white background.",
    "Centered subject, no text, no watermark, no people, professional e-commerce category thumbnail.",
    "Square 1:1 aspect ratio, high clarity, suitable for a marketplace app.",
  ].join(" ");
}

async function generateCategoryImage(name: string): Promise<Uint8Array> {
  const prompt = buildPrompt(name);
  const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${LOVABLE_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "google/gemini-2.5-flash-image-preview",
      messages: [{ role: "user", content: prompt }],
      modalities: ["image", "text"],
    }),
  });
  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`AI gateway ${res.status}: ${txt.slice(0, 200)}`);
  }
  const data = await res.json();
  const imageUrl: string | undefined = data?.choices?.[0]?.message?.images?.[0]?.image_url?.url;
  if (!imageUrl || !imageUrl.startsWith("data:")) {
    throw new Error("AI gateway returned no image data");
  }
  const base64 = imageUrl.split(",")[1] ?? "";
  if (!base64) throw new Error("Empty image base64");
  return Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    if (!B2_KEY_ID || !B2_APP_KEY || !B2_BUCKET || !B2_ENDPOINT) {
      return new Response(JSON.stringify({ error: "B2 not configured" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!LOVABLE_API_KEY) {
      return new Response(JSON.stringify({ error: "LOVABLE_API_KEY not configured" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // --- Auth: admin only ---
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
    const limit = Math.min(Math.max(Number(body.limit) || 30, 1), 100);
    const ids: string[] = Array.isArray(body.categoryIds) ? body.categoryIds.filter((x: any) => typeof x === "string") : [];

    // Find missing-image categories (parents only by default)
    let q = admin.from("categories").select("id,name,image,parent_id").limit(limit);
    if (ids.length > 0) q = q.in("id", ids);
    const { data: cats, error: catErr } = await q;
    if (catErr) throw catErr;

    const targets = (cats ?? []).filter((c: any) => {
      const img = (c.image ?? "").toString().trim();
      if (!img) return true;
      if (img.startsWith("http://") || img.startsWith("https://")) return false;
      // allow re-fill for emoji / non-URL placeholders too
      return true;
    });

    let updated = 0;
    let skipped = (cats?.length ?? 0) - targets.length;
    const errors: { id: string; name: string; error: string }[] = [];

    for (const cat of targets) {
      try {
        const png = await generateCategoryImage(cat.name);
        const key = `categories/auto/${slugify(cat.name)}-${cat.id}.png`;
        await putToB2({ key, contentType: "image/png", body: png });
        const publicUrl = `${PUBLIC_URL_BASE}/${key}`;

        const { error: updErr } = await admin
          .from("categories")
          .update({ image: publicUrl })
          .eq("id", cat.id);
        if (updErr) throw updErr;

        // Best-effort media library entry (non-fatal)
        await admin.from("media_library").insert({
          file_name: `${slugify(cat.name)}-${cat.id}.png`,
          file_url: publicUrl,
          file_type: "image/png",
          folder: "categories",
          alt_text: cat.name,
          metadata: { storage_provider: "b2", b2_key: key, source: "ai-seed", category_id: cat.id },
        } as any).then(() => {}).catch(() => {});

        updated++;
      } catch (e: any) {
        errors.push({ id: cat.id, name: cat.name, error: e?.message ?? String(e) });
      }
    }

    return new Response(JSON.stringify({
      processed: targets.length,
      updated,
      skipped,
      errors,
    }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[seed-category-images]", message);
    return new Response(JSON.stringify({ error: message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
