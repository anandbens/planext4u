import { useState, useEffect, useCallback, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ChevronRight, ChevronLeft, Star, Heart, Clock, Shield, Sparkles, MapPin, Phone, Headphones, ShoppingBag, Filter, SlidersHorizontal, Search, ShoppingCart, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CustomerLayout } from "@/components/customer/CustomerLayout";
import { SplashScreen } from "@/components/customer/SplashScreen";
import { motion, AnimatePresence } from "framer-motion";
import { api } from "@/lib/api";
import { LocationModal, loadSelectedLocation, LOCATION_CHANGED_EVENT } from "@/components/customer/LocationModal";
import { useIsMobile } from "@/hooks/use-mobile";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { NotificationConsentModal } from "@/components/customer/NotificationConsentModal";
import { getLocation } from "@/lib/device-service";
import { useAuth } from "@/lib/auth";
import { useCurrency } from "@/lib/country-context";
import { RatingPopup } from "@/components/customer/RatingPopup";
import { BannerAd } from "@/components/customer/BannerAd";
import { VideoAdOverlay } from "@/components/customer/VideoAdOverlay";
import { FloatingVideoAd } from "@/components/customer/FloatingVideoAd";
import { getServiceImage } from "@/lib/service-image";
import { SmartImage } from "@/components/SmartImage";
import { useModuleStatus } from "@/hooks/useModuleStatus";

/* ── Helpers ── */
const containerAnim = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.06 } } };
const itemAnim = { hidden: { opacity: 0, y: 16 }, show: { opacity: 1, y: 0, transition: { duration: 0.35 } } };
const slideUp = { hidden: { opacity: 0, y: 30 }, visible: { opacity: 1, y: 0, transition: { duration: 0.5 } } };

/* ── Discount Subscribe ── */
function DiscountSubscriptionSection() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const handleSubscribe = async () => {
    if (!email.trim() || !/\S+@\S+\.\S+/.test(email)) { toast.error("Please enter a valid email address"); return; }
    setLoading(true);
    try {
      const { error } = await supabase.from("email_subscriptions" as any).insert({ email: email.trim(), source: "discount_banner" } as any);
      if (error) { if (error.code === "23505") toast.info("You're already subscribed!"); else throw error; }
      else { setShowConfirm(true); setEmail(""); }
    } catch { toast.error("Failed to subscribe. Please try again."); }
    finally { setLoading(false); }
  };
  return (
    <>
      <motion.section initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.5 }} className="px-4 py-6">
        <div className="relative bg-gradient-to-br from-success/90 to-success/70 rounded-2xl p-8 md:p-12 text-success-foreground overflow-hidden">
          <div className="relative z-10">
            <h2 className="text-2xl md:text-3xl font-bold">Get <span className="text-warning">20% Discount</span> On Your First Purchase</h2>
            <p className="text-sm opacity-90 mt-2">Just Sign Up & Register to become a member</p>
            <div className="flex gap-2 mt-4 max-w-sm">
              <input type="email" placeholder="Email Address" value={email} onChange={e => setEmail(e.target.value)}
                className="flex-1 px-4 py-2.5 rounded-lg bg-card/20 border border-card/30 text-card placeholder:text-card/60 text-sm backdrop-blur-sm" />
            </div>
            <Button className="mt-3 bg-foreground text-background hover:bg-foreground/90 rounded-full px-6 font-semibold" onClick={handleSubscribe} disabled={loading}>
              {loading ? "Subscribing..." : "SUBSCRIBE NOW"}
            </Button>
          </div>
        </div>
      </motion.section>
      <Dialog open={showConfirm} onOpenChange={setShowConfirm}>
        <DialogContent className="max-w-sm text-center">
          <DialogTitle className="sr-only">Subscription Confirmed</DialogTitle>
          <div className="py-4"><div className="h-16 w-16 rounded-full bg-success/10 flex items-center justify-center mx-auto mb-4"><span className="text-3xl">🎉</span></div>
            <h3 className="text-lg font-bold">You're Subscribed!</h3>
            <p className="text-sm text-muted-foreground mt-2">Welcome! You'll receive your 20% discount code shortly via email.</p>
            <Button className="mt-4" onClick={() => setShowConfirm(false)}>Got it!</Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

/* ── Hero Banner Carousel (Zepto-style) ── */
function HeroBannerCarousel({ banners, cmsBanners }: { banners: any[]; cmsBanners: any[] }) {
  const allBanners = [...(cmsBanners || []), ...(banners || [])];
  const [idx, setIdx] = useState(0);
  const [themeColor, setThemeColor] = useState<string | null>(null);
  const touchStart = useRef(0);

  useEffect(() => {
    if (!allBanners.length) return;
    const interval = setInterval(() => setIdx(p => (p + 1) % allBanners.length), 5000);
    return () => clearInterval(interval);
  }, [allBanners.length]);

  useEffect(() => {
    const b = allBanners[idx];
    if (b?.theme_bg_color || b?.background_gradient) {
      setThemeColor(b.background_gradient || b.theme_bg_color);
    } else if (b?.gradient) {
      setThemeColor(null);
    } else {
      setThemeColor(null);
    }
  }, [idx, allBanners]);

  if (!allBanners.length) return null;
  const current = allBanners[idx];
  const isCMS = !!current?.media_url;

  const getLink = () => {
    if (isCMS) {
      if (current.redirect_type === "product") return `/app/product/${current.redirect_id}`;
      if (current.redirect_type === "category") return `/app/browse?category=${current.redirect_id}`;
      if (current.redirect_type === "service") return `/app/service/${current.redirect_id}`;
      return current.cta_link || "/app/browse";
    }
    return current.link || "/app/browse";
  };

  return (
    <div className="group relative overflow-hidden rounded-2xl shadow-lg mx-4 mt-2"
      style={themeColor ? { background: themeColor } : undefined}
      onTouchStart={e => { touchStart.current = e.touches[0].clientX; }}
      onTouchEnd={e => {
        const diff = touchStart.current - e.changedTouches[0].clientX;
        if (Math.abs(diff) > 50) setIdx(p => diff > 0 ? (p + 1) % allBanners.length : (p - 1 + allBanners.length) % allBanners.length);
      }}
    >
      <AnimatePresence mode="wait">
        <motion.div key={idx} initial={{ opacity: 0, x: 60 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -60 }} transition={{ duration: 0.4, ease: "easeInOut" }}>
          {isCMS && current.media_type === "video" ? (
            <Link to={getLink()}>
              <video src={current.media_url} autoPlay muted loop playsInline className="w-full h-44 sm:h-56 md:h-72 lg:h-80 object-cover rounded-2xl" />
            </Link>
          ) : (isCMS && current.media_url) || current.desktop_image ? (
            <Link to={getLink()}>
              <img src={isCMS ? current.media_url : current.desktop_image} alt={current.title}
                className="w-full h-44 sm:h-56 md:h-72 lg:h-80 object-cover rounded-2xl" loading="lazy" />
            </Link>
          ) : (
            <div className={`bg-gradient-to-r ${current.gradient || 'from-primary to-primary/70'} rounded-2xl p-6 md:p-12 h-44 md:h-72 flex items-center`}>
              <div>
                <h2 className="text-xl md:text-4xl font-bold text-primary-foreground">{current.title}</h2>
                <p className="text-xs md:text-base text-primary-foreground/80 mt-1">{current.subtitle}</p>
                <Button size="sm" variant="secondary" className="mt-3 rounded-full">{isCMS && current.cta_text ? current.cta_text : "Shop Now"}</Button>
              </div>
            </div>
          )}
        </motion.div>
      </AnimatePresence>
      {/* Desktop-only chevrons (mobile uses swipe + dots, Zepto/Blinkit style) */}
      <button
        aria-label="Previous banner"
        onClick={() => setIdx(p => (p - 1 + allBanners.length) % allBanners.length)}
        className="hidden md:flex absolute left-2 top-1/2 -translate-y-1/2 h-9 w-9 rounded-full bg-background/40 hover:bg-background/70 backdrop-blur-md text-foreground items-center justify-center shadow-md transition-colors opacity-0 group-hover:opacity-100"
      >
        <ChevronLeft className="h-4 w-4" />
      </button>
      <button
        aria-label="Next banner"
        onClick={() => setIdx(p => (p + 1) % allBanners.length)}
        className="hidden md:flex absolute right-2 top-1/2 -translate-y-1/2 h-9 w-9 rounded-full bg-background/40 hover:bg-background/70 backdrop-blur-md text-foreground items-center justify-center shadow-md transition-colors opacity-0 group-hover:opacity-100"
      >
        <ChevronRight className="h-4 w-4" />
      </button>
      {/* Pill dot indicator */}
      <div className="absolute bottom-2.5 left-1/2 -translate-x-1/2 flex items-center gap-1 px-2 py-1 rounded-full bg-background/30 backdrop-blur-md">
        {allBanners.map((_, i) => (
          <button
            key={i}
            aria-label={`Go to banner ${i + 1}`}
            onClick={() => setIdx(i)}
            className={`h-1.5 rounded-full transition-all duration-300 ${i === idx ? 'w-5 bg-card' : 'w-1.5 bg-card/60'}`}
          />
        ))}
      </div>
    </div>
  );
}

/* ── Horizontal Product Slider (Zepto-style) ── */
function ProductSlider({ title, products, bgClass }: { title: string; products: any[]; bgClass?: string }) {
  const { format: fmt } = useCurrency();
  const scrollRef = useRef<HTMLDivElement>(null);
  if (!products?.length) return null;
  return (
    <motion.section initial="hidden" whileInView="visible" viewport={{ once: true }} variants={slideUp} className="py-2">
      <div className={`${bgClass || 'bg-primary'} rounded-2xl mx-4 overflow-hidden`}>
        <div className="flex items-center justify-between px-5 py-3">
          <h2 className="text-base md:text-lg font-bold text-primary-foreground">{title}</h2>
          <div className="flex gap-1.5">
            <button onClick={() => scrollRef.current?.scrollBy({ left: -200, behavior: 'smooth' })}
              className="h-7 w-7 rounded-full bg-primary-foreground/20 flex items-center justify-center hover:bg-primary-foreground/40"><ChevronLeft className="h-3.5 w-3.5 text-primary-foreground" /></button>
            <button onClick={() => scrollRef.current?.scrollBy({ left: 200, behavior: 'smooth' })}
              className="h-7 w-7 rounded-full bg-primary-foreground/20 flex items-center justify-center hover:bg-primary-foreground/40"><ChevronRight className="h-3.5 w-3.5 text-primary-foreground" /></button>
          </div>
        </div>
        <div ref={scrollRef} className="flex gap-3 overflow-x-auto pb-5 px-5 scrollbar-hide scroll-smooth">
          {products.map((p, i) => (
            <motion.div key={p.id} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.04 }} className="shrink-0">
              <Link to={`/app/product/${p.id}`}>
                <Card className="w-32 sm:w-40 overflow-hidden hover:shadow-xl transition-all duration-300 bg-card border-0 hover:-translate-y-1">
                  <div className="h-28 sm:h-32 bg-secondary/20 flex items-center justify-center overflow-hidden relative">
                    {p.discount > 0 && <span className="absolute top-1.5 left-1.5 bg-destructive text-destructive-foreground text-[9px] px-1.5 py-0.5 rounded-sm font-bold z-10">{Math.round((p.discount / p.price) * 100)}% OFF</span>}
                    {p.image ? <SmartImage src={p.image} alt={p.title} className="w-full h-full object-cover" /> : <span className="text-3xl">{p.emoji}</span>}
                  </div>
                  <div className="p-2.5">
                    <p className="text-[11px] font-semibold truncate leading-tight">{p.title}</p>
                    <p className="text-xs font-bold text-primary mt-1">{fmt(p.price - (p.discount || 0), { decimals: 0 })}</p>
                    {p.discount > 0 && <p className="text-[10px] text-muted-foreground line-through">{fmt(p.price, { decimals: 0 })}</p>}
                  </div>
                </Card>
              </Link>
            </motion.div>
          ))}
        </div>
      </div>
    </motion.section>
  );
}

/* ── Horizontal Service Slider ── */
function ServiceSlider({ title, services }: { title: string; services: any[] }) {
  const { format: fmt } = useCurrency();
  const scrollRef = useRef<HTMLDivElement>(null);
  if (!services?.length) return null;
  return (
    <motion.section initial="hidden" whileInView="visible" viewport={{ once: true }} variants={slideUp} className="py-2">
      <div className="bg-primary rounded-2xl mx-4 overflow-hidden">
        <div className="flex items-center justify-between px-5 py-3">
          <h2 className="text-base md:text-lg font-bold text-primary-foreground">{title}</h2>
          <div className="flex gap-1.5">
            <button onClick={() => scrollRef.current?.scrollBy({ left: -200, behavior: 'smooth' })}
              className="h-7 w-7 rounded-full bg-primary-foreground/20 flex items-center justify-center hover:bg-primary-foreground/40"><ChevronLeft className="h-3.5 w-3.5 text-primary-foreground" /></button>
            <button onClick={() => scrollRef.current?.scrollBy({ left: 200, behavior: 'smooth' })}
              className="h-7 w-7 rounded-full bg-primary-foreground/20 flex items-center justify-center hover:bg-primary-foreground/40"><ChevronRight className="h-3.5 w-3.5 text-primary-foreground" /></button>
          </div>
        </div>
        <div ref={scrollRef} className="flex gap-3 overflow-x-auto pb-5 px-5 scrollbar-hide scroll-smooth">
          {services.map((s, i) => (
            <motion.div key={s.id} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.04 }} className="shrink-0">
              <Link to={`/app/service/${s.id}`}>
                <Card className="w-44 sm:w-52 overflow-hidden hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
                  <div className="h-28 sm:h-36 bg-secondary/20 relative overflow-hidden">
                    <img
                      src={getServiceImage(s.title, s.image)}
                      alt={s.title}
                      className="w-full h-full object-cover"
                      loading="lazy"
                      onError={(e) => {
                        (e.currentTarget as HTMLImageElement).src = getServiceImage(s.title, null);
                      }}
                    />
                    <div className="absolute top-1.5 left-1.5 flex items-center gap-0.5 bg-card/90 px-1.5 py-0.5 rounded text-[10px]">
                      <Star className="h-2.5 w-2.5 fill-warning text-warning" /><span className="font-medium">{s.rating || 0}</span>
                    </div>
                  </div>
                  <div className="p-2.5">
                    <h3 className="text-[11px] font-semibold truncate">{s.title}</h3>
                    <p className="text-[10px] text-muted-foreground truncate">{s.vendor_name}</p>
                    <div className="flex items-center justify-between mt-1.5">
                      <span className="text-xs font-bold">{fmt(s.price - (s.discount || 0), { decimals: 0 })}</span>
                      <span className="text-[10px] text-muted-foreground flex items-center gap-0.5"><Clock className="h-2.5 w-2.5" />{s.duration}</span>
                    </div>
                  </div>
                </Card>
              </Link>
            </motion.div>
          ))}
        </div>
      </div>
    </motion.section>
  );
}

/* ── Main Page ── */
export default function CustomerHomePage() {
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const { modules } = useModuleStatus();
  const { customerUser } = useAuth();
  const { format: fmt } = useCurrency();
  const { data, isLoading } = useQuery({ queryKey: ["customerHome"], queryFn: api.getCustomerHome });
  const [showSplash, setShowSplash] = useState(() => !sessionStorage.getItem("p4u_splash_shown"));
  const [showNotifConsent, setShowNotifConsent] = useState(false);
  const [detectedLocation, setDetectedLocation] = useState<string | null>(loadSelectedLocation() || null);
  const [locationModalOpen, setLocationModalOpen] = useState(false);
  const [videoAd, setVideoAd] = useState<any>(null);
  const [searchFocused, setSearchFocused] = useState(false);

  // Fetch CMS banners
  const { data: cmsBanners = [] } = useQuery({
    queryKey: ["homepage_cms_banners"],
    queryFn: async () => {
      const now = new Date().toISOString();
      const { data } = await supabase.from("homepage_banners" as any).select("*")
        .eq("is_active", true).order("display_order");
      return ((data || []) as any[]).filter((b: any) => {
        if (b.start_date && b.start_date > now) return false;
        if (b.end_date && b.end_date < now) return false;
        return true;
      });
    },
  });

  // Fetch CMS sections
  const { data: cmsSections = [] } = useQuery({
    queryKey: ["homepage_cms_sections"],
    queryFn: async () => {
      const { data } = await supabase.from("homepage_sections" as any).select("*")
        .eq("is_visible", true).order("display_order");
      return (data || []) as any[];
    },
  });

  // Fetch video ads
  const { data: videoAds = [] } = useQuery({
    queryKey: ["homepage_video_ads"],
    queryFn: async () => {
      const now = new Date().toISOString();
      const { data } = await supabase.from("video_ads" as any).select("*").eq("status", "active");
      return ((data || []) as any[]).filter((v: any) => {
        if (v.start_date && v.start_date > now) return false;
        if (v.end_date && v.end_date < now) return false;
        return true;
      });
    },
  });

  // Always show the active video ad on every home-page mount/reload (admin-controlled).
  // The user can dismiss it for the current view via the close button; reloading replays it.
  useEffect(() => {
    if (videoAds.length === 0) return;
    const ad = videoAds[0];
    const delayMs = Math.max(0, (ad.show_delay_seconds ?? 3)) * 1000;
    const timer = setTimeout(() => {
      setVideoAd(ad);
    }, delayMs);
    return () => clearTimeout(timer);
  }, [videoAds]);

  useEffect(() => {
    if (customerUser && !localStorage.getItem("p4u_notif_consent_shown")) {
      const timer = setTimeout(() => setShowNotifConsent(true), 2000);
      return () => clearTimeout(timer);
    }
  }, [customerUser]);

  useEffect(() => {
    const savedLoc = loadSelectedLocation();
    if (savedLoc) { setDetectedLocation(savedLoc); return; }
    // Don't auto-prompt for browser geolocation in the background — it
    // surfaces a confusing prompt unrelated to user action. The
    // LocationModal opens explicitly when the user clicks "Set Location".
    // Only run a silent background detect on native (no permission popup
    // when already granted via the FTUX permission screen).
    if (typeof window === "undefined") return;
    const isNative = !!(window as any).Capacitor?.isNativePlatform?.();
    if (!isNative) return;
    getLocation().then(async (loc) => {
      if (!loc) return;
      try {
        const { data: keyRow } = await supabase.from("platform_variables").select("value").eq("key", "GOOGLE_MAPS_API_KEY").maybeSingle();
        const apiKey = keyRow?.value || "";
        if (!apiKey) return;
        const resp = await fetch(`https://maps.googleapis.com/maps/api/geocode/json?latlng=${loc.lat},${loc.lng}&key=${apiKey}`);
        const json = await resp.json();
        if (json.results?.[0]) {
          const components = json.results[0].address_components || [];
          const city = components.find((c: any) => c.types.includes("locality"))?.long_name;
          const state = components.find((c: any) => c.types.includes("administrative_area_level_1"))?.short_name;
          if (city) setDetectedLocation(`${city}${state ? `, ${state}` : ""}`);
        }
      } catch { /* silent */ }
    }).catch(() => { /* background detect — ignore errors */ });
  }, []);

  // Keep displayed location in sync when changed from header / other tabs
  useEffect(() => {
    const sync = () => setDetectedLocation(loadSelectedLocation() || null);
    window.addEventListener(LOCATION_CHANGED_EVENT, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(LOCATION_CHANGED_EVENT, sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  const handleSplashComplete = useCallback(() => { setShowSplash(false); sessionStorage.setItem("p4u_splash_shown", "1"); }, []);

  const allCategories = (data?.categories || []) as any[];
  // Homepage parent categories: opt-in via show_on_homepage, sorted by display_order
  const homepageParents = allCategories
    .filter((c) => !c.parent_id && c.status === 'active' && c.show_on_homepage !== false)
    .sort((a, b) => (a.display_order ?? 999) - (b.display_order ?? 999) || a.name.localeCompare(b.name));
  // Map: parent_id -> active subcategories that are show_on_homepage, sorted
  const subcatMap: Record<string, any[]> = {};
  allCategories
    .filter((c) => c.parent_id && c.status === 'active' && c.show_on_homepage !== false)
    .sort((a, b) => (a.display_order ?? 999) - (b.display_order ?? 999) || a.name.localeCompare(b.name))
    .forEach((c) => {
      if (!subcatMap[c.parent_id]) subcatMap[c.parent_id] = [];
      subcatMap[c.parent_id].push(c);
    });

  const homepageCatMax = parseInt((data as any)?.platformConfig?.homepage_categories_max || '8', 10);
  const homepageSubMax = parseInt((data as any)?.platformConfig?.homepage_subcategories_per_parent || '7', 10);
  const parentCategories = homepageParents.slice(0, homepageCatMax);


  if (showSplash) return <SplashScreen onComplete={handleSplashComplete} />;

  return (
    <CustomerLayout>
      <div className="max-w-7xl mx-auto space-y-0 pb-32 md:pb-6">

        {/* Location bar only on desktop (mobile header already has it) */}
        <div className="px-4 pt-3 pb-1 hidden md:flex items-center justify-between">
          <button type="button" onClick={() => setLocationModalOpen(true)} className="flex items-center gap-1.5 text-left hover:opacity-80 transition-opacity">
            <MapPin className="h-4 w-4 text-primary" />
            <div>
              <p className="text-[10px] text-muted-foreground leading-none">Deliver to</p>
              <p className="text-sm font-bold leading-tight">{detectedLocation || "Set Location"}</p>
            </div>
          </button>
          <Link to="/app/profile" className="h-9 w-9 rounded-full bg-secondary flex items-center justify-center">
            <span className="text-sm font-bold">{customerUser?.name?.[0] || "👤"}</span>
          </Link>
        </div>

        <LocationModal open={locationModalOpen} onOpenChange={setLocationModalOpen} onSelect={(loc) => setDetectedLocation(loc)} />

        {/* Search is already in CustomerLayout header — no duplicate here */}

        {/* ── Category Pill Row (Zepto-style horizontal scroll) ── */}
        <div className="px-4 pt-1 pb-2">
          <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1">
            <Link to="/app/categories" className="shrink-0">
              <div className="flex flex-col items-center gap-1 min-w-[56px]">
                <div className="h-14 w-14 rounded-2xl bg-primary/10 border-2 border-primary flex items-center justify-center shadow-sm">
                  <ShoppingBag className="h-6 w-6 text-primary" />
                </div>
                <span className="text-[10px] font-bold text-primary">All</span>
              </div>
            </Link>
            {parentCategories.slice(0, 8).map((c: any, i: number) => (
              <motion.div key={c.id} initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: i * 0.03 }}>
                <Link to={`/app/browse?category=${encodeURIComponent(c.name)}`} className="flex flex-col items-center gap-1 min-w-[56px]">
                  <div className="h-14 w-14 rounded-2xl bg-card border border-border/40 flex items-center justify-center overflow-hidden shadow-sm hover:border-primary/30 hover:shadow-md transition-all">
                    {c.image?.startsWith('http') ? <img src={c.image} alt={c.name} className="w-full h-full object-cover rounded-2xl" loading="lazy" /> : <span className="text-xl">{c.image || '📦'}</span>}
                  </div>
                  <span className="text-[10px] font-medium text-center leading-tight max-w-[56px] truncate">{c.name}</span>
                </Link>
              </motion.div>
            ))}
          </div>
        </div>

        {/* ── Hero Banner Carousel ── */}
        {isLoading ? <Skeleton className="h-44 mx-4 rounded-2xl" /> :
          <HeroBannerCarousel banners={data?.banners || []} cmsBanners={cmsBanners} />
        }

        {/* ── Store Banners (2-row grid, Zepto-style) ── */}
        {data?.storeBanners && data.storeBanners.length > 0 && (
          <motion.section initial="hidden" whileInView="visible" viewport={{ once: true }} variants={slideUp} className="py-3">
            <div className="px-4">
              <div
                className={isMobile
                  ? "grid grid-rows-2 grid-flow-col gap-2.5 auto-cols-[120px] sm:auto-cols-[140px] overflow-x-auto scrollbar-hide"
                  : "grid gap-3"}
                style={
                  isMobile
                    ? undefined
                    : { gridTemplateColumns: `repeat(${Math.max(1, Math.ceil(data.storeBanners.length / 2))}, minmax(0, 1fr))` }
                }
              >
                {data.storeBanners.map((store: any, idx: number) => (
                  <motion.div key={store.id} initial={{ opacity: 0, scale: 0.92 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: idx * 0.03 }}>
                    <Link to={store.link || "/app/browse"} className="block group h-full">
                      <div className="h-full rounded-xl overflow-hidden border border-border/20 bg-card hover:shadow-lg transition-all">
                        <div className="h-20 sm:h-24 md:h-28 overflow-hidden"><img src={store.image} alt={store.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" loading="lazy" /></div>
                        <div className="px-2 py-1.5 text-center"><p className="text-[10px] sm:text-xs font-semibold truncate">{store.title}</p></div>
                      </div>
                    </Link>
                  </motion.div>
                ))}
              </div>
            </div>
          </motion.section>
        )}

        {/* ── Quick Actions (Ride, Emergency, Services) ── */}
        <div className="px-4 py-2 md:hidden">
          <div className="grid grid-cols-3 gap-2">
            {[
              { label: "Ride", emoji: "🛺", to: "/app/services?category=Transport", color: "from-amber-500/20 to-amber-500/5" },
              { label: "Emergency", emoji: "🚨", to: "/app/services", color: "from-red-500/20 to-red-500/5" },
              { label: "Help", emoji: "🆘", to: "/app/support", color: "from-blue-500/20 to-blue-500/5" },
            ].map(a => (
              <Link key={a.label} to={a.to}>
                <div className={`bg-gradient-to-br ${a.color} rounded-xl p-3 text-center hover:shadow-md transition-all`}>
                  <span className="text-2xl block">{a.emoji}</span>
                  <p className="text-[10px] font-semibold mt-1">{a.label}</p>
                </div>
              </Link>
            ))}
          </div>
        </div>

        {/* ── Best Products Slider ── */}
        <ProductSlider title="Best of Products" products={data?.featuredProducts?.slice(0, 12) || []} />

        {/* ── CMS Dynamic Sections ── */}
        {cmsSections.map((section: any) => {
          if (section.section_type === "product_slider") {
            return <ProductSlider key={section.id} title={section.title} products={data?.featuredProducts?.slice(0, 8) || []} bgClass="bg-accent" />;
          }
          if (section.section_type === "service_tiles") {
            return <ServiceSlider key={section.id} title={section.title} services={data?.featuredServices?.slice(0, 8) || []} />;
          }
          if (section.section_type === "category_tiles") {
            return (
              <motion.section key={section.id} initial="hidden" whileInView="visible" viewport={{ once: true }} variants={slideUp} className="px-4 py-4">
                <div className="flex items-center justify-between mb-3">
                  <h2 className="text-base font-bold">{section.title}</h2>
                  {section.cta_link && <Link to={section.cta_link} className="text-xs text-primary font-medium flex items-center gap-0.5">View All <ChevronRight className="h-3 w-3" /></Link>}
                </div>
                <div className="grid grid-cols-4 sm:grid-cols-5 gap-3 md:[grid-template-columns:repeat(auto-fit,minmax(96px,1fr))]">
                  {parentCategories.map((c: any) => (
                    <Link key={c.id} to={`/app/browse?category=${encodeURIComponent(c.name)}`} className="flex flex-col items-center gap-1.5 group">
                      <div className="h-14 w-14 rounded-full bg-secondary/50 border border-border/50 flex items-center justify-center overflow-hidden group-hover:border-primary/50 transition-all">
                        {c.image?.startsWith('http') ? <img src={c.image} alt={c.name} className="w-full h-full object-cover rounded-full" loading="lazy" /> : <span className="text-xl">{c.image || '📦'}</span>}
                      </div>
                      <span className="text-[10px] font-medium text-center">{c.name}</span>
                    </Link>
                  ))}
                </div>
              </motion.section>
            );
          }
          if (section.section_type === "promotional_cards") {
            return (
              <motion.section key={section.id} initial="hidden" whileInView="visible" viewport={{ once: true }} variants={slideUp} className="px-4 py-3">
                <div className="rounded-2xl overflow-hidden" style={section.background_gradient ? { background: section.background_gradient } : undefined}>
                  <div className="p-6 flex items-center justify-between">
                    <div>
                      <h3 className="text-lg font-bold">{section.title}</h3>
                      {section.cta_link && <Link to={section.cta_link}><Button size="sm" variant="secondary" className="mt-2 rounded-full">{section.cta_text || "View"} <ChevronRight className="h-3 w-3 ml-1" /></Button></Link>}
                    </div>
                    {section.festival_tag && <Badge variant="outline" className="text-xs">{section.festival_tag}</Badge>}
                  </div>
                </div>
              </motion.section>
            );
          }
          return null;
        })}

        {/* ── Shop by Category ── */}
        <motion.section initial="hidden" whileInView="visible" viewport={{ once: true }} variants={slideUp} className="px-4 py-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-base md:text-lg font-bold">Shop by Category</h2>
            <Link to="/app/categories" className="text-xs text-primary flex items-center gap-0.5 font-medium">View All <ChevronRight className="h-3 w-3" /></Link>
          </div>
          <motion.div variants={containerAnim} initial="hidden" whileInView="show" viewport={{ once: true }}
            className="grid grid-cols-4 sm:grid-cols-5 gap-3 md:[grid-template-columns:repeat(auto-fit,minmax(96px,1fr))]">
            {isLoading ? Array.from({ length: 7 }).map((_, i) => <Skeleton key={i} className="h-20 rounded-xl" />) :
              parentCategories.map((c: any) => (
                <motion.div key={c.id} variants={itemAnim}>
                  <Link to={`/app/browse?category=${encodeURIComponent(c.name)}`} className="flex flex-col items-center gap-1.5 group">
                    <div className="h-14 w-14 md:h-18 md:w-18 rounded-2xl bg-secondary/50 border border-border/50 flex items-center justify-center overflow-hidden group-hover:border-primary/50 group-hover:shadow-md transition-all">
                      {c.image?.startsWith('http') ? (
                        <img src={c.image} alt={c.name} className="w-full h-full object-cover rounded-2xl" loading="lazy" />
                      ) : c.image && c.image.trim() !== '' ? (
                        <span className="text-2xl">{c.image}</span>
                      ) : (
                        <span className="text-base font-bold text-primary">{c.name?.charAt(0).toUpperCase()}</span>
                      )}
                    </div>
                    <span className="text-[10px] md:text-xs font-medium text-center leading-tight">{c.name}</span>
                  </Link>
                </motion.div>
              ))}
          </motion.div>
        </motion.section>

        {/* ── Trending Categories ── */}
        {(() => {
          const trending = parentCategories.filter((c: any) => c.is_trending);
          if (isLoading || trending.length === 0) return null;
          return (
            <motion.section initial="hidden" whileInView="visible" viewport={{ once: true }} variants={slideUp} className="px-4 py-4">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-base md:text-lg font-bold flex items-center gap-1.5">
                  <span className="text-amber-500">🔥</span> Trending Categories
                </h2>
                <Link to="/app/categories?trending=1" className="text-xs text-primary flex items-center gap-0.5 font-medium">
                  View All <ChevronRight className="h-3 w-3" />
                </Link>
              </div>
              <div className="flex gap-3 overflow-x-auto scrollbar-hide pb-1 md:grid md:grid-cols-6 md:gap-4 md:overflow-visible">
                {trending.map((c: any) => (
                  <Link
                    key={c.id}
                    to={`/app/browse?category=${encodeURIComponent(c.name)}`}
                    className="shrink-0 group"
                  >
                    <div className="flex flex-col items-center gap-1.5 min-w-[80px]">
                      <div className="relative h-20 w-20 md:h-24 md:w-24 rounded-2xl bg-gradient-to-br from-primary/15 to-accent/10 border border-primary/30 flex items-center justify-center overflow-hidden group-hover:border-primary group-hover:shadow-lg transition-all">
                        {c.image?.startsWith('http') ? (
                          <img src={c.image} alt={c.name} className="w-full h-full object-cover" loading="lazy" />
                        ) : c.image && c.image.trim() !== '' ? (
                          <span className="text-3xl">{c.image}</span>
                        ) : (
                          <span className="text-lg font-bold text-primary">{c.name?.charAt(0).toUpperCase()}</span>
                        )}
                        <span className="absolute top-1 right-1 text-[9px] bg-amber-500 text-white px-1.5 py-0.5 rounded-full font-bold">HOT</span>
                      </div>
                      <span className="text-[11px] md:text-xs font-semibold text-center leading-tight max-w-[80px] line-clamp-2">{c.name}</span>
                    </div>
                  </Link>
                ))}
              </div>
            </motion.section>
          );
        })()}

        {/* ── Subcategory strips per parent (admin-controlled) ── */}
        {!isLoading && parentCategories.map((parent: any) => {
          const subs = (subcatMap[parent.id] || []).slice(0, homepageSubMax);
          if (!subs.length) return null;
          return (
            <motion.section key={`subs-${parent.id}`} initial="hidden" whileInView="visible" viewport={{ once: true }} variants={slideUp} className="px-4 py-2">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-bold">Shop {parent.name}</h3>
                <Link to={`/app/browse?category=${encodeURIComponent(parent.name)}`} className="text-[11px] text-primary font-medium flex items-center gap-0.5">View All <ChevronRight className="h-3 w-3" /></Link>
              </div>
              <div className="flex gap-3 overflow-x-auto scrollbar-hide pb-2">
                {subs.map((s: any) => (
                  <Link key={s.id} to={`/app/browse?category=${encodeURIComponent(s.name)}`} className="shrink-0">
                    <div className="flex flex-col items-center gap-1 min-w-[64px]">
                      <div className="h-14 w-14 rounded-2xl bg-card border border-border/40 flex items-center justify-center overflow-hidden">
                        {s.image?.startsWith('http') ? <img src={s.image} alt={s.name} className="w-full h-full object-cover" loading="lazy" /> : <span className="text-xl">{s.image || '📦'}</span>}
                      </div>
                      <span className="text-[10px] font-medium text-center leading-tight max-w-[64px] line-clamp-2">{s.name}</span>
                    </div>
                  </Link>
                ))}
              </div>
            </motion.section>
          );
        })}

        {/* ── Top Services ── */}
        <ServiceSlider title="Top Services" services={data?.featuredServices || []} />

        {/* ── Pick Up Where You Left Off (Blinkit grid) ── */}
        <motion.section initial="hidden" whileInView="visible" viewport={{ once: true }} variants={slideUp} className="px-4 py-2">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {[
              { title: "Pick up where you left off", items: data?.featuredProducts?.slice(0, 4) || [], link: "/app/browse" },
              { title: "Trending Now", items: (data?.trendingProducts || []).slice(0, 4), link: "/app/trending" },
              { title: "Deals of the Day", items: (data?.dealProducts || []).slice(0, 4), link: "/app/deals" },
            ].map((section, sIdx) => (
              <Card key={sIdx} className="p-3 hover:shadow-lg transition-shadow">
                <h3 className="text-xs font-bold mb-2">{section.title}</h3>
                <div className="grid grid-cols-2 gap-2">
                  {section.items.map((p: any) => (
                    <Link key={p.id} to={`/app/product/${p.id}`} className="group">
                      <div className="h-16 bg-secondary/30 rounded-lg overflow-hidden mb-1">
                        {p.image ? <SmartImage src={p.image} alt={p.title} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300" /> :
                          <div className="w-full h-full flex items-center justify-center text-xl">{p.emoji}</div>}
                      </div>
                      <p className="text-[10px] text-muted-foreground truncate">{p.title}</p>
                    </Link>
                  ))}
                </div>
                <Link to={section.link} className="text-[10px] text-primary font-medium mt-1.5 block">Explore More →</Link>
              </Card>
            ))}
          </div>
        </motion.section>

        {/* ── Home Services Grid ── */}
        <motion.section initial="hidden" whileInView="visible" viewport={{ once: true }} variants={slideUp} className="px-4 py-3">
          <h2 className="text-base font-bold mb-3">Home Services</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="gradient-primary rounded-2xl p-5 flex flex-col justify-center text-primary-foreground">
              <h2 className="text-lg font-bold">Book a Service</h2>
              <p className="text-xs opacity-80 mt-1">Professional services at your doorstep</p>
              <Link to="/app/services"><Button size="sm" variant="secondary" className="mt-3 w-fit rounded-full">View All Services</Button></Link>
            </div>
            <div className="md:col-span-2 grid grid-cols-2 sm:grid-cols-4 gap-2">
              {isLoading ? Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-20 rounded-xl" />) :
                data?.serviceCategories?.slice(0, 8).map((c: any) => (
                  <Link key={c.id} to={`/app/services?category=${encodeURIComponent(c.name)}`}
                    className="bg-card rounded-xl border border-border/50 p-2.5 hover:border-primary/30 hover:shadow-md transition-all flex items-center gap-2">
                    <div className="h-10 w-10 rounded-full bg-gradient-to-br from-primary/15 to-primary/5 flex items-center justify-center overflow-hidden shrink-0 ring-1 ring-primary/10">
                      {c.image && (c.image.startsWith('http') || c.image.startsWith('/')) ? (
                        <img
                          src={c.image}
                          alt={c.name}
                          className="w-full h-full object-cover rounded-full"
                          loading="lazy"
                          onError={(e) => {
                            const t = e.currentTarget;
                            t.style.display = 'none';
                            const fb = t.nextElementSibling as HTMLElement | null;
                            if (fb) fb.style.display = 'flex';
                          }}
                        />
                      ) : null}
                      <span
                        className="text-sm font-bold text-primary w-full h-full items-center justify-center"
                        style={{ display: c.image && (c.image.startsWith('http') || c.image.startsWith('/')) ? 'none' : 'flex' }}
                      >
                        {c.name?.charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <div><p className="text-[11px] font-semibold leading-tight">{c.name}</p><p className="text-[9px] text-muted-foreground">From {fmt(349, { decimals: 0 })}</p></div>
                  </Link>
                ))}
            </div>
          </div>
        </motion.section>

        <DiscountSubscriptionSection />

        {/* ── Trust Bar ── */}
        <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={slideUp} className="grid grid-cols-3 gap-2 px-4 py-3">
          {[
            { icon: Shield, text: "100% Genuine", sub: "Verified vendors" },
            { icon: Clock, text: "Fast Delivery", sub: "Within 48 hours" },
            { icon: Sparkles, text: "Earn Rewards", sub: "On every order" },
          ].map(b => (
            <Card key={b.text} className="p-2.5 text-center hover:shadow-md transition-shadow">
              <b.icon className="h-4 w-4 mx-auto text-primary mb-1" />
              <p className="text-[11px] font-semibold">{b.text}</p>
              <p className="text-[9px] text-muted-foreground">{b.sub}</p>
            </Card>
          ))}
        </motion.div>

        {/* ── Sponsored Ad ── */}
        <div className="px-3 py-1 md:px-4 md:py-2"><BannerAd placement="home" /></div>

        {/* ── Classifieds CTA ── */}
        <motion.section initial="hidden" whileInView="visible" viewport={{ once: true }} variants={slideUp} className="px-4 py-3">
          <div className="rounded-2xl overflow-hidden relative">
            <img src={data?.assets?.homepage_image_classifieds_banner || "/images/banners/classifieds-banner.jpg"} alt="Classifieds" className="w-full h-36 md:h-48 object-cover" loading="lazy" />
            <div className="absolute inset-0 bg-gradient-to-r from-foreground/70 to-foreground/20 flex items-center">
              <div className="p-5">
                <h2 className="text-base md:text-xl font-bold text-card">Buy & Sell Locally</h2>
                <p className="text-[11px] text-card/90 mt-0.5">Post free classified ads and find great deals near you</p>
                <div className="flex gap-2 mt-2">
                  <Link to="/app/classifieds"><Button variant="secondary" size="sm" className="rounded-full text-xs">Browse Ads</Button></Link>
                  <Link to="/app/classifieds/post"><Button variant="secondary" size="sm" className="rounded-full text-xs">Post Ad Free</Button></Link>
                </div>
              </div>
            </div>
          </div>
        </motion.section>
      </div>

      {/* ── Video Ad: floating PiP (default) or fullscreen takeover ── */}
      {videoAd && (videoAd.display_mode === "fullscreen" ? (
        <VideoAdOverlay
          videoUrl={videoAd.video_url}
          thumbnailUrl={videoAd.thumbnail_url}
          ctaText={videoAd.cta_text}
          ctaLink={videoAd.cta_link}
          adId={videoAd.id}
          onClose={() => setVideoAd(null)}
        />
      ) : (
        <FloatingVideoAd
          videoUrl={videoAd.video_url}
          thumbnailUrl={videoAd.thumbnail_url}
          ctaText={videoAd.cta_text}
          ctaLink={videoAd.cta_link}
          adId={videoAd.id}
          autoOpenFullscreen={!!videoAd.auto_open_fullscreen}
          onClose={() => setVideoAd(null)}
        />
      ))}

      {/* Notification consent */}
      {customerUser && <NotificationConsentModal open={showNotifConsent} onClose={() => setShowNotifConsent(false)} userId={customerUser.supabase_uid || customerUser.id} />}

      {/* Rating popup */}
      {customerUser?.supabase_uid && <RatingPopup customerId={customerUser.id} userId={customerUser.supabase_uid} />}
    </CustomerLayout>
  );
}
