/**
 * seed-homepage-media
 *
 * Admin-triggered helper that uses the Lovable AI Gateway to generate
 * photorealistic images for:
 *   • Homepage carousel banners (5 banners, with deep-link metadata)
 *   • Products that have no `image` set
 *   • Services that have no `image` set
 *
 * Generated images are uploaded directly to the public Backblaze B2 bucket
 * via the same SigV4 PUT logic used by `b2-presigned-upload`. The resulting
 * public URLs are then written back to:
 *   • homepage_banners (carousel)
 *   • products.image      (best-of-products)
 *   • services.image      (best-of-services)
 *
 * Body: {
 *   mode?: "all" | "carousel" | "products" | "services"  (default: "all")
 *   limit?: number    (per-mode item cap, default: 8 for products/services)
 * }
 *
 * Returns: { carousel_added, products_updated, services_updated, errors[] }
 *
 * NOTE: This function deliberately uses elevated privileges (service-role key)
 * to insert/update the rows. It validates that the caller is an authenticated
 * admin user before doing any work.
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

const SUPABASE_URL = readSecret("SUPABASE_URL");
const SUPABASE_ANON = readSecret("SUPABASE_ANON_KEY");
const SUPABASE_SERVICE_ROLE = readSecret("SUPABASE_SERVICE_ROLE_KEY");
const LOVABLE_API_KEY = readSecret("LOVABLE_API_KEY");

const B2_KEY_ID = readSecret("B2_APPLICATION_KEY_ID");
const B2_APP_KEY = readSecret("B2_APPLICATION_KEY");
const B2_BUCKET = readSecret("B2_BUCKET_NAME");
const B2_ENDPOINT = readSecret("B2_S3_ENDPOINT");
const B2_PUBLIC_BASE = readSecret("B2_PUBLIC_URL_BASE").replace(/\/+$/, "");
const CDN_PUBLIC_BASE = readSecret("CDN_PUBLIC_URL_BASE").replace(/\/+$/, "");
const PUBLIC_URL_BASE = CDN_PUBLIC_BASE || B2_PUBLIC_BASE;

// ───────────────────── B2 SigV4 PUT (copied from b2-presigned-upload) ─────────────────────

function regionFromEndpoint(endpoint: string): string {
  try {
    const m = new URL(endpoint).hostname.match(/s3\.([^.]+)\.backblazeb2\.com/);
    return m?.[1] ?? "us-west-004";
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
  const cryptoKey = await crypto.subtle.importKey("raw", key, { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  return crypto.subtle.sign("HMAC", cryptoKey, new TextEncoder().encode(data));
}

async function deriveSigningKey(secret: string, dateStamp: string, region: string, service: string): Promise<ArrayBuffer> {
  const kDate = await hmac(new TextEncoder().encode("AWS4" + secret), dateStamp);
  const kRegion = await hmac(kDate, region);
  const kService = await hmac(kRegion, service);
  return hmac(kService, "aws4_request");
}

const hex = (buf: ArrayBuffer) => [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");

async function putToB2(key: string, body: Uint8Array, contentType: string): Promise<string> {
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
  const signingKey = await deriveSigningKey(B2_APP_KEY, dateStamp, region, service);
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
  return `${PUBLIC_URL_BASE}/${encodedKey}`;
}

// ───────────────────── AI image generation (Lovable AI Gateway) ─────────────────────

async function generateImage(prompt: string): Promise<Uint8Array> {
  const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${LOVABLE_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "google/gemini-2.5-flash-image",
      messages: [{ role: "user", content: prompt }],
      modalities: ["image", "text"],
    }),
  });
  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`AI image generation failed ${res.status}: ${txt.slice(0, 200)}`);
  }
  const data = await res.json();
  const dataUrl: string | undefined = data?.choices?.[0]?.message?.images?.[0]?.image_url?.url;
  if (!dataUrl || !dataUrl.startsWith("data:image/")) {
    throw new Error("AI did not return an image");
  }
  const base64 = dataUrl.split(",")[1] || "";
  const bin = atob(base64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes;
}

const slug = (s: string) =>
  s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 60) || "img";

async function generateAndUpload(prompt: string, folder: string, baseName: string): Promise<string> {
  const bytes = await generateImage(prompt);
  const key = `${folder}/${Date.now()}-${slug(baseName)}.png`;
  return await putToB2(key, bytes, "image/png");
}

// ───────────────────── Carousel definitions ─────────────────────

const CAROUSEL_BANNERS: Array<{
  title: string;
  subtitle: string;
  cta_text: string;
  redirect_type: string;
  cta_link: string;
  prompt: string;
  bg: string;
}> = [
  {
    title: "Mega Festive Sale",
    subtitle: "Flat 50% off across electronics & fashion",
    cta_text: "Shop Now",
    redirect_type: "category",
    cta_link: "/app/browse",
    bg: "linear-gradient(135deg,#d97706,#7c2d12)",
    prompt: "Photorealistic horizontal e-commerce hero banner, 16:9. A cheerful Indian shopper holding multiple branded shopping bags overflowing with electronics gadgets and folded clothes, surrounded by floating gift boxes, golden festive bokeh lights, marigold flowers and confetti. Warm amber-and-crimson gradient background, premium high-end commercial photography lighting, sharp focus, ultra-detailed, no text overlay, no watermark.",
  },
  {
    title: "Order Food in Minutes",
    subtitle: "From 1000+ restaurants near you",
    cta_text: "Order Now",
    redirect_type: "external",
    cta_link: "/app/food",
    bg: "linear-gradient(135deg,#dc2626,#9a1c1c)",
    prompt: "Photorealistic horizontal food-delivery hero banner, 16:9. Top-down flat-lay of vibrant Indian and global cuisine — biryani, butter chicken, pizza, sushi, burgers, fresh salads — arranged on a dark slate table with steam rising, fresh herbs, lemon wedges, and a delivery rider's helmet on the corner. Studio lighting with appetizing warm highlights, professional food photography, ultra-sharp, no text, no watermark.",
  },
  {
    title: "Trusted Home Services",
    subtitle: "Plumbers, electricians, cleaning & more",
    cta_text: "Book a Service",
    redirect_type: "external",
    cta_link: "/app/services",
    bg: "linear-gradient(135deg,#0f766e,#134e4a)",
    prompt: "Photorealistic horizontal home-services hero banner, 16:9. A professional Indian uniformed technician (electrician with toolbelt) smiling while fixing a modern light fixture in a bright contemporary living room, with subtle icons of plumbing, cleaning, AC repair faintly visible in soft bokeh on the right. Calm teal gradient background, natural daylight, premium commercial photography, ultra-detailed, no text, no watermark.",
  },
  {
    title: "Buy & Sell Locally",
    subtitle: "Furniture, vehicles, real estate & jobs",
    cta_text: "Browse Classifieds",
    redirect_type: "external",
    cta_link: "/app/classifieds",
    bg: "linear-gradient(135deg,#1d4ed8,#1e3a8a)",
    prompt: "Photorealistic horizontal classifieds hero banner, 16:9. Collage-style composition with a modern sofa, a parked compact car with a 'For Sale' tag, a small house key on a wooden tag, and a smartphone showing a marketplace listing. Crisp blue gradient background, soft directional studio lighting, premium product photography, ultra-detailed, no text, no watermark.",
  },
  {
    title: "Fashion Week Specials",
    subtitle: "Trending styles for him, her & kids",
    cta_text: "Explore Looks",
    redirect_type: "external",
    cta_link: "/app/browse?category=fashion",
    bg: "linear-gradient(135deg,#be185d,#831843)",
    prompt: "Photorealistic horizontal fashion hero banner, 16:9. Three stylish young Indian models — a man in a fitted blazer, a woman in a flowing kurti, and a child in trendy streetwear — posing confidently against a magenta-to-deep-pink gradient backdrop with subtle fabric textures and a hint of golden jewelry. High-fashion editorial lighting, ultra-sharp, vibrant colors, no text, no watermark.",
  },
];

// ───────────────────── Main handler ─────────────────────

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");
    if (!B2_KEY_ID || !B2_APP_KEY || !B2_BUCKET || !B2_ENDPOINT || !PUBLIC_URL_BASE) {
      throw new Error("Backblaze B2 secrets are not fully configured");
    }
    if (!SUPABASE_SERVICE_ROLE) throw new Error("SUPABASE_SERVICE_ROLE_KEY not configured");

    // Authenticate the caller as an admin user
    const authHeader = req.headers.get("Authorization") ?? "";
    const userClient = createClient(SUPABASE_URL, SUPABASE_ANON, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userRes } = await userClient.auth.getUser();
    if (!userRes?.user) {
      return new Response(JSON.stringify({ error: "unauthenticated" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE);
    const { data: roles } = await admin
      .from("user_roles")
      .select("role")
      .eq("user_id", userRes.user.id);
    const isAdmin = (roles || []).some((r: any) => ["admin", "super_admin"].includes(r.role));
    if (!isAdmin) {
      return new Response(JSON.stringify({ error: "forbidden — admin only" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json().catch(() => ({}));
    const mode: "all" | "carousel" | "products" | "services" = body.mode || "all";
    const limit: number = Math.max(1, Math.min(20, Number(body.limit) || 8));

    const errors: string[] = [];
    let carousel_added = 0;
    let products_updated = 0;
    let services_updated = 0;

    // 1) CAROUSEL — only seed if there are no active banners yet (idempotent)
    if (mode === "all" || mode === "carousel") {
      const { count } = await admin
        .from("homepage_banners")
        .select("id", { count: "exact", head: true })
        .eq("is_active", true);
      if ((count || 0) === 0) {
        for (let i = 0; i < CAROUSEL_BANNERS.length; i++) {
          const b = CAROUSEL_BANNERS[i];
          try {
            const url = await generateAndUpload(b.prompt, "homepage-carousel", b.title);
            const { error } = await admin.from("homepage_banners").insert({
              title: b.title,
              subtitle: b.subtitle,
              media_type: "image",
              media_url: url,
              mobile_media_url: url,
              cta_text: b.cta_text,
              cta_link: b.cta_link,
              redirect_type: b.redirect_type,
              background_gradient: b.bg,
              display_order: i,
              is_active: true,
            } as any);
            if (error) errors.push(`carousel ${b.title}: ${error.message}`);
            else carousel_added++;
          } catch (e: any) {
            errors.push(`carousel ${b.title}: ${e.message || e}`);
          }
        }
      }
    }

    // 2) PRODUCTS — fill missing images
    if (mode === "all" || mode === "products") {
      const { data: products } = await admin
        .from("products")
        .select("id, title, category_name")
        .or("image.is.null,image.eq.")
        .eq("status", "active")
        .limit(limit);
      for (const p of products || []) {
        try {
          const prompt = `Photorealistic e-commerce product photo of "${p.title}"${p.category_name ? ` (${p.category_name})` : ""} on a clean white seamless background, soft studio lighting, sharp focus, centered composition, premium commercial product photography, no text, no watermark, square crop.`;
          const url = await generateAndUpload(prompt, "homepage-products", p.title);
          const { error } = await admin.from("products").update({ image: url } as any).eq("id", p.id);
          if (error) errors.push(`product ${p.id}: ${error.message}`);
          else products_updated++;
        } catch (e: any) {
          errors.push(`product ${p.id}: ${e.message || e}`);
        }
      }
    }

    // 3) SERVICES — fill missing images
    if (mode === "all" || mode === "services") {
      const { data: services } = await admin
        .from("services")
        .select("id, title, category_name")
        .or("image.is.null,image.eq.")
        .eq("status", "active")
        .limit(limit);
      for (const s of services || []) {
        try {
          const prompt = `Photorealistic lifestyle photograph of a professional providing "${s.title}"${s.category_name ? ` (${s.category_name})` : ""} service in a real Indian home or workspace setting, the professional in clean uniform, warm natural daylight, friendly customer in the background, premium commercial editorial photography, sharp focus, no text, no watermark, square crop.`;
          const url = await generateAndUpload(prompt, "homepage-services", s.title);
          const { error } = await admin.from("services").update({ image: url } as any).eq("id", s.id);
          if (error) errors.push(`service ${s.id}: ${error.message}`);
          else services_updated++;
        } catch (e: any) {
          errors.push(`service ${s.id}: ${e.message || e}`);
        }
      }
    }

    return new Response(
      JSON.stringify({ carousel_added, products_updated, services_updated, errors }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e: any) {
    console.error("[seed-homepage-media]", e);
    return new Response(JSON.stringify({ error: e.message || String(e) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
