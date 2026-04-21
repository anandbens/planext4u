/**
 * Widget implementations.
 *
 * Each widget is a small self-contained React component that:
 *   • Fetches its own data (or reads from the parent context)
 *   • Renders premium Zepto-style cards using design tokens (no raw colors)
 *
 * Importing this file once anywhere in the app registers every widget.
 */
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Star, Clock, ChevronRight, MapPin, ShoppingBag, Sparkles } from "lucide-react";
import { registerWidget } from "../widget-registry";

/* ──────────────────────────────────────────────────────────
 * Shared helpers
 * ────────────────────────────────────────────────────────── */
function SectionHeader({ title, link, ctaLabel }: { title?: string; link?: string; ctaLabel?: string }) {
  if (!title && !link) return null;
  return (
    <div className="flex items-center justify-between mb-3">
      {title ? <h2 className="text-base md:text-lg font-bold tracking-tight">{title}</h2> : <span />}
      {link && (
        <Link to={link} className="text-xs text-primary font-semibold inline-flex items-center gap-0.5 hover:underline">
          {ctaLabel || "View All"} <ChevronRight className="h-3 w-3" />
        </Link>
      )}
    </div>
  );
}

function HScroll({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex gap-3 overflow-x-auto scrollbar-hide pb-2 -mx-4 px-4 snap-x snap-mandatory">
      {children}
    </div>
  );
}

function ProductCard({ p }: { p: any }) {
  const finalPrice = (Number(p.price) || 0) - (Number(p.discount) || 0);
  const pct = p.discount > 0 && p.price > 0 ? Math.round((p.discount / p.price) * 100) : 0;
  return (
    <Link to={`/app/product/${p.id}`} className="snap-start shrink-0">
      <Card className="w-36 sm:w-40 overflow-hidden border-border/40 hover:-translate-y-1 hover:shadow-lg transition-all duration-300 rounded-2xl">
        <div className="relative h-32 bg-secondary/40 overflow-hidden">
          {pct > 0 && (
            <span className="absolute top-1.5 left-1.5 z-10 px-1.5 py-0.5 rounded-md text-[9px] font-bold text-destructive-foreground gradient-danger shadow-sm">
              {pct}% OFF
            </span>
          )}
          {p.image ? (
            <img src={p.image} alt={p.title} className="w-full h-full object-cover" loading="lazy" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-3xl">{p.emoji || "🛍️"}</div>
          )}
        </div>
        <div className="p-2.5">
          <p className="text-[11px] font-semibold leading-tight truncate">{p.title}</p>
          <div className="mt-1 flex items-baseline gap-1">
            <span className="text-sm font-bold text-foreground">₹{finalPrice.toLocaleString()}</span>
            {pct > 0 && <span className="text-[10px] text-muted-foreground line-through">₹{p.price}</span>}
          </div>
        </div>
      </Card>
    </Link>
  );
}

/* ──────────────────────────────────────────────────────────
 * Promo strip — gradient hero card with CTA (Banners & promos)
 * ────────────────────────────────────────────────────────── */
registerWidget({
  type: "promo_strip",
  label: "Promo strip (gradient)",
  description: "Wide gradient banner with a headline and CTA button.",
  group: "Banners & promos",
  modules: ["ecommerce", "food", "homes", "socio"],
  requiresConfig: true,
  fields: [
    {
      key: "variant", label: "Gradient", type: "select", options: [
        { value: "primary", label: "Brand teal" },
        { value: "aurora", label: "Aurora (teal → indigo)" },
        { value: "sunset", label: "Sunset (amber → coral)" },
        { value: "mint", label: "Mint" },
        { value: "brand", label: "Brand (teal → amber)" },
      ],
    },
    { key: "title", label: "Headline", type: "text" },
    { key: "subtitle", label: "Subtitle", type: "text" },
    { key: "cta_text", label: "Button label", type: "text" },
    { key: "cta_link", label: "Button link", type: "url" },
  ],
  validate: ({ config }) => {
    const title = String(config.title || "").trim();
    if (!title) return "Headline is required.";
    if (title.length > 80) return "Headline must be 80 characters or fewer.";
    const sub = String(config.subtitle || "").trim();
    if (sub.length > 160) return "Subtitle must be 160 characters or fewer.";
    const ctaText = String(config.cta_text || "").trim();
    const ctaLink = String(config.cta_link || "").trim();
    if ((ctaText && !ctaLink) || (ctaLink && !ctaText)) {
      return "Button label and link must both be filled, or both empty.";
    }
    if (ctaLink) {
      const ok = ctaLink.startsWith("/") || /^https?:\/\//i.test(ctaLink);
      if (!ok) return "Button link must start with / or http(s)://.";
    }
    return null;
  },
  render: ({ config }) => {
    const variant = config.variant || "aurora";
    const cls =
      variant === "primary" ? "gradient-primary" :
      variant === "sunset" ? "gradient-sunset" :
      variant === "mint" ? "gradient-mint" :
      variant === "brand" ? "gradient-brand" : "gradient-aurora";
    return (
      <section className="px-4 py-3">
        <div className={`relative overflow-hidden rounded-3xl ${cls} text-primary-foreground p-5 md:p-7 shadow-elevated`}>
          <div className="absolute -right-4 -top-4 h-32 w-32 rounded-full bg-card/10 blur-2xl" />
          <div className="relative flex items-center gap-4">
            <div className="flex-1 min-w-0">
              {config.title && <h3 className="text-lg md:text-2xl font-bold tracking-tight">{config.title}</h3>}
              {config.subtitle && <p className="text-xs md:text-sm opacity-90 mt-1">{config.subtitle}</p>}
              {config.cta_text && config.cta_link && (
                <Link to={config.cta_link}>
                  <Button size="sm" variant="secondary" className="mt-3 rounded-full font-semibold">
                    {config.cta_text} <ChevronRight className="h-3.5 w-3.5 ml-1" />
                  </Button>
                </Link>
              )}
            </div>
            <Sparkles className="h-12 w-12 opacity-40 shrink-0 hidden sm:block" />
          </div>
        </div>
      </section>
    );
  },
});

/* ──────────────────────────────────────────────────────────
 * Hero carousel — uses CMS homepage_banners (and falls back to legacy banners)
 * ────────────────────────────────────────────────────────── */
function HeroCarouselWidget({ title }: { title?: string }) {
  const { data: cms = [] } = useQuery({
    queryKey: ["wb_hero_banners"],
    queryFn: async () => {
      const now = new Date().toISOString();
      const { data } = await supabase.from("homepage_banners" as any).select("*").eq("is_active", true).order("display_order");
      return ((data || []) as any[]).filter((b) => (!b.start_date || b.start_date <= now) && (!b.end_date || b.end_date >= now));
    },
  });

  if (!cms.length) return null;
  const b = cms[0]; // simple first-banner render; the existing CustomerHomePage carousel still runs for full Zepto-style cycling
  const link = b.cta_link || (b.redirect_type === "product" ? `/app/product/${b.redirect_id}` : "/app/browse");
  return (
    <section className="px-4 pt-2">
      <Link to={link} className="block rounded-3xl overflow-hidden shadow-elevated">
        {b.media_type === "video" ? (
          <video src={b.media_url} autoPlay muted loop playsInline className="w-full h-44 sm:h-56 md:h-72 object-cover" />
        ) : (
          <img src={b.media_url} alt={b.title || title || "Banner"} className="w-full h-44 sm:h-56 md:h-72 object-cover" loading="lazy" />
        )}
      </Link>
    </section>
  );
}
registerWidget({
  type: "hero_carousel",
  label: "Hero banner",
  description: "Top-of-page hero banner from CMS Homepage Banners.",
  group: "Banners & promos",
  modules: ["ecommerce"],
  render: ({ title }) => <HeroCarouselWidget title={title} />,
});

/* ──────────────────────────────────────────────────────────
 * Category grid — pulls top categories
 * ────────────────────────────────────────────────────────── */
function CategoryGridWidget({ title, config }: { title?: string; config: Record<string, any> }) {
  const limit = Number(config.limit || 8);
  const { data: cats = [], isLoading } = useQuery({
    queryKey: ["wb_categories", limit],
    queryFn: async () => {
      const { data } = await supabase.from("categories").select("*")
        .eq("status", "active").is("parent_id", null).order("display_order").limit(limit);
      return data || [];
    },
  });
  return (
    <section className="px-4 py-3">
      <SectionHeader title={title} link="/app/categories" />
      <div className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-8 gap-3">
        {isLoading
          ? Array.from({ length: limit }).map((_, i) => <Skeleton key={i} className="h-20 rounded-2xl" />)
          : cats.map((c: any) => (
              <Link key={c.id} to={`/app/browse?category=${encodeURIComponent(c.name)}`} className="group flex flex-col items-center gap-1.5">
                <div className="h-14 w-14 rounded-2xl gradient-teal-soft border border-border/40 flex items-center justify-center overflow-hidden shadow-sm group-hover:shadow-md group-hover:-translate-y-0.5 transition-all">
                  {c.image?.startsWith("http")
                    ? <img src={c.image} alt={c.name} className="w-full h-full object-cover rounded-2xl" loading="lazy" />
                    : <span className="text-xl">{c.image || "🛍️"}</span>}
                </div>
                <span className="text-[10px] font-medium text-center leading-tight max-w-[64px] truncate">{c.name}</span>
              </Link>
            ))}
      </div>
    </section>
  );
}
const limitValidator = (max: number) => ({ config }: { config: Record<string, any> }) => {
  if (config.limit === undefined || config.limit === null || config.limit === "") return null;
  const n = Number(config.limit);
  if (!Number.isFinite(n) || !Number.isInteger(n)) return "Limit must be a whole number.";
  if (n < 1) return "Limit must be at least 1.";
  if (n > max) return `Limit must be ${max} or fewer.`;
  return null;
};

registerWidget({
  type: "category_grid",
  label: "Category grid",
  description: "Premium grid of parent categories.",
  group: "Catalog",
  modules: ["ecommerce"],
  fields: [{ key: "limit", label: "Max categories", type: "number" }],
  validate: limitValidator(24),
  render: (p) => <CategoryGridWidget title={p.title} config={p.config} />,
});

/* ──────────────────────────────────────────────────────────
 * Generic product slider — Deals / Trending / category row
 * ────────────────────────────────────────────────────────── */
function ProductRowWidget({ title, config, viewAllLink }: { title?: string; config: Record<string, any>; viewAllLink: string }) {
  const limit = Number(config.limit || 10);
  const filter: "deal" | "trending" | "category" | "all" = config.filter || "all";
  const categoryName: string | undefined = config.category_name;

  const { data: products = [], isLoading } = useQuery({
    queryKey: ["wb_products_row", filter, categoryName, limit],
    queryFn: async () => {
      let q = supabase.from("products").select("*").eq("status", "active").limit(limit * 4);
      if (filter === "deal") q = q.eq("is_deal_of_day", true);
      if (filter === "category" && categoryName) q = q.ilike("category_name", `%${categoryName}%`);
      const { data } = await q;
      let list = (data || []) as any[];
      if (filter === "trending") list = list.sort((a, b) => (Number(b.rating) || 0) - (Number(a.rating) || 0));
      return list.slice(0, limit);
    },
  });

  if (!isLoading && products.length === 0) return null;
  return (
    <section className="px-4 py-3">
      <SectionHeader title={title} link={viewAllLink} />
      <HScroll>
        {isLoading
          ? Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="w-36 h-52 rounded-2xl shrink-0" />)
          : products.map((p) => <ProductCard key={p.id} p={p} />)}
      </HScroll>
    </section>
  );
}
registerWidget({
  type: "deals_of_day",
  label: "Deals of the Day",
  description: "Horizontal scroll of products flagged as deal of the day.",
  group: "Catalog",
  modules: ["ecommerce"],
  fields: [{ key: "limit", label: "Max items", type: "number" }],
  validate: limitValidator(50),
  render: (p) => <ProductRowWidget title={p.title} config={{ ...p.config, filter: "deal" }} viewAllLink="/app/deals" />,
});
registerWidget({
  type: "trending_products",
  label: "Trending products",
  description: "Top-rated active products.",
  group: "Catalog",
  modules: ["ecommerce"],
  fields: [{ key: "limit", label: "Max items", type: "number" }],
  validate: limitValidator(50),
  render: (p) => <ProductRowWidget title={p.title} config={{ ...p.config, filter: "trending" }} viewAllLink="/app/trending" />,
});
registerWidget({
  type: "category_product_row",
  label: "Category product row",
  description: "Horizontal product row, optionally filtered by category name.",
  group: "Catalog",
  modules: ["ecommerce"],
  requiresConfig: true,
  fields: [
    { key: "limit", label: "Max items", type: "number" },
    { key: "category_name", label: "Category name", type: "text" },
  ],
  validate: ({ config }) => {
    const cat = String(config.category_name || "").trim();
    if (!cat) return "Category name is required for this row.";
    if (cat.length > 80) return "Category name must be 80 characters or fewer.";
    return limitValidator(50)({ config });
  },
  render: (p) => <ProductRowWidget title={p.title} config={p.config} viewAllLink="/app/browse" />,
});

/* ──────────────────────────────────────────────────────────
 * Featured vendors — premium card row
 * ────────────────────────────────────────────────────────── */
function FeaturedVendorsWidget({ title, config }: { title?: string; config: Record<string, any> }) {
  const limit = Number(config.limit || 8);
  const { data: vendors = [] } = useQuery({
    queryKey: ["wb_vendors_featured", limit],
    queryFn: async () => {
      const { data } = await supabase.from("vendors").select("id,business_name,name,shop_photo_url,background_image,rating,total_orders,city")
        .in("status", ["active", "verified"]).order("total_orders", { ascending: false }).limit(limit);
      return data || [];
    },
  });
  if (!vendors.length) return null;
  return (
    <section className="px-4 py-3">
      <SectionHeader title={title} link="/app/browse" />
      <HScroll>
        {vendors.map((v: any) => (
          <Link key={v.id} to={`/app/vendor/${v.id}`} className="snap-start shrink-0">
            <Card className="w-44 overflow-hidden rounded-2xl border-border/40 hover:shadow-lg transition-all">
              <div className="h-20 gradient-aurora relative">
                {v.background_image && <img src={v.background_image} alt="" className="w-full h-full object-cover opacity-90" loading="lazy" />}
              </div>
              <div className="p-3 -mt-7 relative">
                <div className="h-10 w-10 rounded-xl border-2 border-card overflow-hidden bg-card shadow-md">
                  {v.shop_photo_url
                    ? <img src={v.shop_photo_url} alt={v.business_name} className="w-full h-full object-cover" loading="lazy" />
                    : <div className="w-full h-full flex items-center justify-center text-base font-bold text-primary">{(v.business_name || v.name || "?").charAt(0)}</div>}
                </div>
                <p className="mt-2 text-xs font-semibold truncate">{v.business_name || v.name}</p>
                <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground mt-0.5">
                  {v.rating > 0 && (
                    <span className="inline-flex items-center gap-0.5">
                      <Star className="h-2.5 w-2.5 fill-warning text-warning" /> {Number(v.rating).toFixed(1)}
                    </span>
                  )}
                  {v.city && <span className="truncate">{v.city}</span>}
                </div>
              </div>
            </Card>
          </Link>
        ))}
      </HScroll>
    </section>
  );
}
registerWidget({
  type: "featured_vendors",
  label: "Featured vendors",
  description: "Top vendors by total orders.",
  group: "Vendor & social",
  modules: ["ecommerce"],
  fields: [{ key: "limit", label: "Max vendors", type: "number" }],
  validate: limitValidator(30),
  render: (p) => <FeaturedVendorsWidget title={p.title} config={p.config} />,
});

/* ──────────────────────────────────────────────────────────
 * Classifieds strip
 * ────────────────────────────────────────────────────────── */
function ClassifiedsStripWidget({ title, config }: { title?: string; config: Record<string, any> }) {
  const limit = Number(config.limit || 6);
  const { data: ads = [] } = useQuery({
    queryKey: ["wb_classifieds", limit],
    queryFn: async () => {
      const { data } = await supabase.from("classified_ads").select("id,title,price,images,city,area")
        .eq("status", "active").order("created_at", { ascending: false }).limit(limit);
      return data || [];
    },
  });
  if (!ads.length) return null;
  return (
    <section className="px-4 py-3">
      <SectionHeader title={title} link="/app/classifieds" />
      <HScroll>
        {ads.map((a: any) => {
          const img = Array.isArray(a.images) ? (a.images[0]?.url || a.images[0]) : null;
          return (
            <Link key={a.id} to={`/app/classifieds/${a.id}`} className="snap-start shrink-0">
              <Card className="w-40 overflow-hidden rounded-2xl border-border/40 hover:shadow-lg transition-all">
                <div className="h-24 bg-secondary/40">
                  {img ? <img src={img} alt={a.title} className="w-full h-full object-cover" loading="lazy" /> : <div className="w-full h-full flex items-center justify-center text-2xl">📦</div>}
                </div>
                <div className="p-2.5">
                  <p className="text-[11px] font-semibold truncate">{a.title}</p>
                  <p className="text-sm font-bold text-primary mt-0.5">₹{Number(a.price || 0).toLocaleString()}</p>
                  <p className="text-[10px] text-muted-foreground truncate flex items-center gap-0.5"><MapPin className="h-2.5 w-2.5" /> {[a.area, a.city].filter(Boolean).join(", ")}</p>
                </div>
              </Card>
            </Link>
          );
        })}
      </HScroll>
    </section>
  );
}
registerWidget({
  type: "classifieds_strip",
  label: "Classifieds nearby",
  description: "Latest classified ads as scrollable cards.",
  group: "Vendor & social",
  modules: ["ecommerce", "homes"],
  fields: [{ key: "limit", label: "Max ads", type: "number" }],
  render: (p) => <ClassifiedsStripWidget title={p.title} config={p.config} />,
});

/* ──────────────────────────────────────────────────────────
 * Social posts feed (cross-promotion on ecommerce/home)
 * ────────────────────────────────────────────────────────── */
function SocialPostsWidget({ title, config }: { title?: string; config: Record<string, any> }) {
  const limit = Number(config.limit || 6);
  const { data: posts = [] } = useQuery({
    queryKey: ["wb_social_posts", limit],
    queryFn: async () => {
      const { data } = await supabase.from("social_posts").select("id,user_id,caption,media,like_count")
        .eq("status", "active").order("created_at", { ascending: false }).limit(limit);
      return data || [];
    },
  });
  if (!posts.length) return null;
  return (
    <section className="px-4 py-3">
      <SectionHeader title={title} link="/app/social" />
      <HScroll>
        {posts.map((p: any) => {
          const m = Array.isArray(p.media) ? p.media[0] : null;
          const url = m?.url || (typeof m === "string" ? m : null);
          return (
            <Link key={p.id} to={`/app/social/post/${p.id}`} className="snap-start shrink-0">
              <Card className="w-32 h-44 overflow-hidden rounded-2xl border-border/40 relative">
                {url ? <img src={url} alt="" className="w-full h-full object-cover" loading="lazy" /> : <div className="w-full h-full gradient-aurora" />}
                <div className="absolute bottom-0 left-0 right-0 p-2 bg-gradient-to-t from-foreground/80 to-transparent">
                  <p className="text-[10px] text-card line-clamp-2">{p.caption || ""}</p>
                </div>
              </Card>
            </Link>
          );
        })}
      </HScroll>
    </section>
  );
}
registerWidget({
  type: "social_posts_strip",
  label: "Social posts",
  description: "Latest social posts as scrollable thumbnails.",
  group: "Vendor & social",
  modules: ["ecommerce", "socio"],
  fields: [{ key: "limit", label: "Max posts", type: "number" }],
  render: (p) => <SocialPostsWidget title={p.title} config={p.config} />,
});

/* ──────────────────────────────────────────────────────────
 * Content blocks
 * ────────────────────────────────────────────────────────── */
registerWidget({
  type: "rich_text",
  label: "Rich text block",
  description: "A simple text/HTML block (use sparingly).",
  group: "Content",
  modules: ["ecommerce", "food", "homes", "socio"],
  fields: [
    { key: "html", label: "HTML content", type: "text" },
  ],
  render: ({ title, config }) => (
    <section className="px-4 py-3">
      {title && <h2 className="text-base font-bold mb-2">{title}</h2>}
      <div className="rounded-2xl border border-border/40 bg-card p-4 prose prose-sm max-w-none"
        dangerouslySetInnerHTML={{ __html: config.html || "" }} />
    </section>
  ),
});

registerWidget({
  type: "newsletter_signup",
  label: "Newsletter signup",
  description: "Premium gradient newsletter prompt.",
  group: "Content",
  modules: ["ecommerce", "food", "homes", "socio"],
  fields: [
    { key: "headline", label: "Headline", type: "text" },
    { key: "subline", label: "Subline", type: "text" },
  ],
  render: ({ config }) => (
    <section className="px-4 py-3">
      <div className="rounded-3xl gradient-sunset text-primary-foreground p-6 shadow-elevated relative overflow-hidden">
        <div className="absolute -right-6 -bottom-6 h-32 w-32 rounded-full bg-card/10 blur-2xl" />
        <h3 className="text-lg font-bold relative">{config.headline || "Get exclusive offers"}</h3>
        <p className="text-xs opacity-90 mt-1 relative">{config.subline || "Subscribe to never miss a deal."}</p>
        <Link to="/app/profile" className="relative">
          <Button size="sm" variant="secondary" className="mt-3 rounded-full">Subscribe</Button>
        </Link>
      </div>
    </section>
  ),
});

/* ──────────────────────────────────────────────────────────
 * FOOD widgets
 * ────────────────────────────────────────────────────────── */
function FoodTopRestaurantsWidget({ title, config }: { title?: string; config: Record<string, any> }) {
  const limit = Number(config.limit || 10);
  const { data: rests = [] } = useQuery({
    queryKey: ["wb_food_restaurants", limit],
    queryFn: async () => {
      const { data } = await supabase.from("restaurants").select("id,name,cuisine,cover_image,rating,avg_prep_minutes")
        .eq("status", "open").order("rating", { ascending: false }).limit(limit);
      return data || [];
    },
  });
  if (!rests.length) return null;
  return (
    <section className="px-4 py-3">
      <SectionHeader title={title} link="/app/food" />
      <HScroll>
        {rests.map((r: any) => (
          <Link key={r.id} to={`/app/food/restaurant/${r.id}`} className="snap-start shrink-0">
            <Card className="w-48 overflow-hidden rounded-2xl border-border/40 hover:shadow-lg transition-all">
              <div className="h-28 bg-secondary/40">
                {r.cover_image ? <img src={r.cover_image} alt={r.name} className="w-full h-full object-cover" loading="lazy" /> :
                  <div className="w-full h-full flex items-center justify-center text-3xl font-bold text-muted-foreground">{r.name.charAt(0)}</div>}
              </div>
              <div className="p-3">
                <p className="text-sm font-semibold truncate">{r.name}</p>
                <p className="text-[10px] text-muted-foreground truncate">{(r.cuisine || []).slice(0, 3).join(" • ")}</p>
                <div className="flex items-center justify-between mt-1.5">
                  <Badge className="bg-success text-success-foreground text-[10px] h-5">
                    <Star className="h-2.5 w-2.5 mr-0.5 fill-current" /> {r.rating || "New"}
                  </Badge>
                  <span className="text-[10px] inline-flex items-center gap-0.5 text-muted-foreground"><Clock className="h-2.5 w-2.5" /> {r.avg_prep_minutes}m</span>
                </div>
              </div>
            </Card>
          </Link>
        ))}
      </HScroll>
    </section>
  );
}
registerWidget({
  type: "food_top_restaurants",
  label: "Top restaurants",
  description: "Top-rated open restaurants as cards.",
  group: "Module specific",
  modules: ["food"],
  fields: [{ key: "limit", label: "Max restaurants", type: "number" }],
  render: (p) => <FoodTopRestaurantsWidget title={p.title} config={p.config} />,
});

/* Quick-filter cuisine chips for the food module */
registerWidget({
  type: "food_quick_filters",
  label: "Cuisine chips",
  description: "Quick cuisine filter chips.",
  group: "Module specific",
  modules: ["food"],
  render: ({ title }) => (
    <section className="px-4 py-2">
      {title && <h3 className="text-sm font-bold mb-2">{title}</h3>}
      <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1">
        {["Indian", "Chinese", "Italian", "Biryani", "Pizza", "Desserts", "Healthy"].map((c) => (
          <Link key={c} to={`/app/food?q=${encodeURIComponent(c)}`}>
            <Badge variant="outline" className="rounded-full px-3 py-1.5 text-xs hover:gradient-teal-soft cursor-pointer">{c}</Badge>
          </Link>
        ))}
      </div>
    </section>
  ),
});

registerWidget({
  type: "food_offers_strip",
  label: "Today's offers",
  description: "Curated promo strip for food coupons.",
  group: "Module specific",
  modules: ["food"],
  render: ({ title }) => (
    <section className="px-4 py-3">
      <div className="rounded-3xl gradient-warning text-warning-foreground p-5 shadow-elevated relative overflow-hidden">
        <div className="absolute -right-6 -top-6 h-28 w-28 rounded-full bg-card/10 blur-2xl" />
        <p className="text-[11px] uppercase tracking-wider font-semibold opacity-80">Limited time</p>
        <h3 className="text-lg font-bold mt-1">{title || "Today's tastiest offers"}</h3>
        <p className="text-xs opacity-90 mt-1">Up to 50% off + free delivery on select restaurants.</p>
        <Link to="/app/food">
          <Button size="sm" variant="secondary" className="mt-3 rounded-full font-semibold">Browse offers <ChevronRight className="h-3.5 w-3.5 ml-1" /></Button>
        </Link>
      </div>
    </section>
  ),
});

/* ──────────────────────────────────────────────────────────
 * HOMES widgets — featured properties, popular localities
 * ────────────────────────────────────────────────────────── */
function HomesFeaturedWidget({ title, config }: { title?: string; config: Record<string, any> }) {
  const limit = Number(config.limit || 12);
  const { data: props = [] } = useQuery({
    queryKey: ["wb_homes_featured", limit],
    queryFn: async () => {
      const { data } = await supabase.from("properties").select("id,title,price,bhk,city,locality,images,transaction_type")
        .eq("status", "active").order("created_at", { ascending: false }).limit(limit);
      return data || [];
    },
  });
  if (!props.length) return null;
  return (
    <section className="px-4 py-3">
      <SectionHeader title={title} link="/app/property" />
      <HScroll>
        {props.map((p: any) => {
          const img = Array.isArray(p.images) ? p.images[0] : null;
          return (
            <Link key={p.id} to={`/app/property/${p.id}`} className="snap-start shrink-0">
              <Card className="w-56 overflow-hidden rounded-2xl border-border/40 hover:shadow-lg transition-all">
                <div className="h-32 bg-secondary/40">
                  {img ? <img src={img} alt={p.title} className="w-full h-full object-cover" loading="lazy" /> : <div className="w-full h-full flex items-center justify-center text-3xl">🏠</div>}
                </div>
                <div className="p-3">
                  <p className="text-sm font-bold truncate">₹{Number(p.price).toLocaleString("en-IN")}{p.transaction_type === "rent" && "/mo"}</p>
                  <p className="text-[11px] text-muted-foreground truncate">{p.bhk} BHK · {p.locality || p.city}</p>
                </div>
              </Card>
            </Link>
          );
        })}
      </HScroll>
    </section>
  );
}
registerWidget({
  type: "homes_featured",
  label: "Featured properties",
  description: "Latest active properties.",
  group: "Module specific",
  modules: ["homes"],
  fields: [{ key: "limit", label: "Max properties", type: "number" }],
  render: (p) => <HomesFeaturedWidget title={p.title} config={p.config} />,
});

function HomesLocalitiesWidget({ title }: { title?: string }) {
  const { data: locs = [] } = useQuery({
    queryKey: ["wb_homes_localities"],
    queryFn: async () => {
      const { data } = await supabase.from("property_localities" as any).select("id,name,city").eq("is_popular", true).eq("status", "active").limit(12);
      return (data || []) as any[];
    },
  });
  if (!locs.length) return null;
  return (
    <section className="px-4 py-3">
      <SectionHeader title={title || "Popular localities"} />
      <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1">
        {locs.map((l) => (
          <Link key={l.id} to={`/app/property?q=${encodeURIComponent(l.name)}`}>
            <Badge variant="outline" className="rounded-full px-3 py-1.5 text-xs gradient-indigo-soft border-primary/20 cursor-pointer">
              <MapPin className="h-3 w-3 mr-1 inline" />{l.name}
            </Badge>
          </Link>
        ))}
      </div>
    </section>
  );
}
registerWidget({
  type: "homes_popular_localities",
  label: "Popular localities",
  description: "Hot rental/sale localities.",
  group: "Module specific",
  modules: ["homes"],
  render: (p) => <HomesLocalitiesWidget title={p.title} />,
});

registerWidget({
  type: "homes_quick_actions",
  label: "Homes quick actions",
  description: "Buy / Rent / PG / Post property buttons.",
  group: "Module specific",
  modules: ["homes"],
  render: () => (
    <section className="px-4 py-3">
      <div className="grid grid-cols-4 gap-2">
        {[
          { label: "Buy", to: "/app/property?type=sale", grad: "gradient-aurora" },
          { label: "Rent", to: "/app/property?type=rent", grad: "gradient-mint" },
          { label: "PG", to: "/app/property?type=pg", grad: "gradient-warning" },
          { label: "Post Ad", to: "/app/property/post", grad: "gradient-sunset" },
        ].map((a) => (
          <Link key={a.label} to={a.to} className={`${a.grad} rounded-2xl p-3 text-center text-primary-foreground shadow-card hover:shadow-elevated transition-all`}>
            <ShoppingBag className="h-5 w-5 mx-auto opacity-80" />
            <p className="text-[11px] font-semibold mt-1">{a.label}</p>
          </Link>
        ))}
      </div>
    </section>
  ),
});
