import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

const SITE_URL = "https://www.planext4u.net";
const SITE_NAME = "Planext4U";
const DEFAULT_IMAGE = "https://www.planext4u.net/favicon.png";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const url = new URL(req.url);
  const type = url.searchParams.get("type"); // product | service | classified
  const id = url.searchParams.get("id");

  if (!type || !id) {
    return new Response("Missing type or id", { status: 400 });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  let title = SITE_NAME;
  let description = "Your one-stop marketplace for products, services, and classified ads.";
  let image = DEFAULT_IMAGE;
  let price = "";
  let appPath = "/app";

  try {
    if (type === "product") {
      const { data } = await supabase.from("products").select("title, description, image, thumbnail_image, price, tax, short_description").eq("id", id).single();
      if (data) {
        title = `${data.title} | ${SITE_NAME}`;
        description = data.short_description || data.description?.slice(0, 160) || description;
        image = data.thumbnail_image || data.image || DEFAULT_IMAGE;
        const total = (data.price || 0) + (data.tax || 0);
        price = `₹${total.toLocaleString("en-IN")}`;
        appPath = `/app/product/${id}`;
      }
    } else if (type === "service") {
      const { data } = await supabase.from("services").select("title, description, image, price").eq("id", id).single();
      if (data) {
        title = `${data.title} | ${SITE_NAME}`;
        description = data.description?.slice(0, 160) || description;
        image = data.image || DEFAULT_IMAGE;
        price = data.price ? `₹${Number(data.price).toLocaleString("en-IN")}` : "";
        appPath = `/app/service/${id}`;
      }
    } else if (type === "classified") {
      const { data } = await supabase.from("classified_ads").select("title, description, images, price, category, city").eq("id", id).single();
      if (data) {
        title = `${data.title} | ${SITE_NAME}`;
        description = data.description?.slice(0, 160) || description;
        const imgs = Array.isArray(data.images) ? data.images : [];
        image = (imgs[0] as string) || DEFAULT_IMAGE;
        price = data.price ? `₹${Number(data.price).toLocaleString("en-IN")}` : "";
        appPath = `/app/classifieds/${id}`;
      }
    }
  } catch (e) {
    console.error("OG share fetch error:", e);
  }

  const redirectUrl = `${SITE_URL}${appPath}`;

  // Check if request is from a social crawler
  const ua = (req.headers.get("user-agent") || "").toLowerCase();
  const isCrawler = /facebookexternalhit|twitterbot|linkedinbot|whatsapp|telegrambot|slackbot|discordbot|pinterestbot|googlebot|bingbot/i.test(ua);

  if (!isCrawler) {
    // Regular user — redirect to app
    return new Response(null, {
      status: 302,
      headers: { ...corsHeaders, Location: redirectUrl },
    });
  }

  // Crawler — serve HTML with OG tags
  const priceTag = price ? `<meta property="product:price:amount" content="${price}" />` : "";
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>${escapeHtml(title)}</title>
  <meta name="description" content="${escapeHtml(description)}" />
  <meta property="og:title" content="${escapeHtml(title)}" />
  <meta property="og:description" content="${escapeHtml(description)}" />
  <meta property="og:image" content="${escapeHtml(image)}" />
  <meta property="og:image:width" content="600" />
  <meta property="og:image:height" content="600" />
  <meta property="og:url" content="${escapeHtml(redirectUrl)}" />
  <meta property="og:type" content="${type === 'product' ? 'product' : 'website'}" />
  <meta property="og:site_name" content="${SITE_NAME}" />
  ${priceTag}
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="${escapeHtml(title)}" />
  <meta name="twitter:description" content="${escapeHtml(description)}" />
  <meta name="twitter:image" content="${escapeHtml(image)}" />
  <meta http-equiv="refresh" content="0;url=${escapeHtml(redirectUrl)}" />
</head>
<body>
  <p>Redirecting to <a href="${escapeHtml(redirectUrl)}">${escapeHtml(title)}</a>...</p>
</body>
</html>`;

  return new Response(html, {
    status: 200,
    headers: { ...corsHeaders, "Content-Type": "text/html; charset=utf-8" },
  });
});

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
