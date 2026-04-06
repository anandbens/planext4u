import { useState, useEffect, useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ChevronRight, ChevronLeft, Star, Heart, Clock, Shield, Sparkles, MapPin, Phone, Headphones, ShoppingBag, Shirt, UtensilsCrossed, Apple, Home as HomeIcon, Laptop, PhoneCall, AlertTriangle, HelpCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { CustomerLayout } from "@/components/customer/CustomerLayout";
import { SplashScreen } from "@/components/customer/SplashScreen";
import { motion, AnimatePresence } from "framer-motion";
import { api } from "@/lib/api";
import { loadSelectedLocation } from "@/components/customer/LocationModal";
import { useIsMobile } from "@/hooks/use-mobile";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";

function DiscountSubscriptionSection() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const handleSubscribe = async () => {
    if (!email.trim() || !/\S+@\S+\.\S+/.test(email)) {
      toast.error("Please enter a valid email address");
      return;
    }
    setLoading(true);
    try {
      const { error } = await supabase.from("email_subscriptions" as any).insert({ email: email.trim(), source: "discount_banner" } as any);
      if (error) {
        if (error.code === "23505") toast.info("You're already subscribed!");
        else throw error;
      } else {
        setShowConfirm(true);
        setEmail("");
      }
    } catch { toast.error("Failed to subscribe. Please try again."); }
    finally { setLoading(false); }
  };

  return (
    <>
      <motion.section initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.5 }} className="px-4 py-6">
        <div className="relative bg-gradient-to-br from-success/90 to-success/70 rounded-2xl p-8 md:p-12 text-success-foreground overflow-hidden">
          <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg width=\'60\' height=\'60\' viewBox=\'0 0 60 60\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cg fill=\'none\' fill-rule=\'evenodd\'%3E%3Cg fill=\'%23ffffff\' fill-opacity=\'0.4\'%3E%3Cpath d=\'M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z\'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")' }} />
          <div className="relative z-10">
            <h2 className="text-2xl md:text-3xl font-bold">
              Get <span className="text-warning">20% Discount</span> On Your First Purchase
            </h2>
            <p className="text-sm opacity-90 mt-2">Just Sign Up & Register to become a member</p>
            <div className="flex gap-2 mt-4 max-w-sm">
              <input type="email" placeholder="Email Address" value={email} onChange={e => setEmail(e.target.value)}
                className="flex-1 px-4 py-2.5 rounded-lg bg-card/20 border border-card/30 text-card placeholder:text-card/60 text-sm backdrop-blur-sm" />
            </div>
            <Button className="mt-3 bg-foreground text-background hover:bg-foreground/90 rounded-full px-6 font-semibold"
              onClick={handleSubscribe} disabled={loading}>
              {loading ? "Subscribing..." : "SUBSCRIBE NOW"}
            </Button>
          </div>
        </div>
      </motion.section>
      <Dialog open={showConfirm} onOpenChange={setShowConfirm}>
        <DialogContent className="max-w-sm text-center">
          <DialogTitle className="sr-only">Subscription Confirmed</DialogTitle>
          <div className="py-4">
            <div className="h-16 w-16 rounded-full bg-success/10 flex items-center justify-center mx-auto mb-4">
              <span className="text-3xl">🎉</span>
            </div>
            <h3 className="text-lg font-bold">You're Subscribed!</h3>
            <p className="text-sm text-muted-foreground mt-2">Welcome! You'll receive your 20% discount code shortly via email.</p>
            <Button className="mt-4" onClick={() => setShowConfirm(false)}>Got it!</Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

export default function CustomerHomePage() {
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const { data, isLoading } = useQuery({ queryKey: ["customerHome"], queryFn: api.getCustomerHome });
  const [bannerIdx, setBannerIdx] = useState(0);
  const [showSplash, setShowSplash] = useState(() => {
    const shown = sessionStorage.getItem("p4u_splash_shown");
    return !shown;
  });

  useEffect(() => {
    if (!data?.banners.length) return;
    const interval = setInterval(() => setBannerIdx((prev) => (prev + 1) % data.banners.length), 5000);
    return () => clearInterval(interval);
  }, [data?.banners.length]);

  const handleSplashComplete = useCallback(() => {
    setShowSplash(false);
    sessionStorage.setItem("p4u_splash_shown", "1");
  }, []);

  const containerAnim = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.06 } } };
  const itemAnim = { hidden: { opacity: 0, y: 16 }, show: { opacity: 1, y: 0, transition: { duration: 0.35 } } };
  const slideUp = { hidden: { opacity: 0, y: 30 }, visible: { opacity: 1, y: 0, transition: { duration: 0.5 } } };

  // Category icons for horizontal scroll
  const categoryIcons = [
    { icon: "📦", label: "All", to: "/app/browse" },
    { icon: "🎧", label: "Electronics", to: "/app/browse?category=Electronics" },
    { icon: "👕", label: "Fashion", to: "/app/browse?category=Fashion" },
    { icon: "🍽️", label: "Food", to: "/app/browse?category=Food" },
    { icon: "🛒", label: "Groceries", to: "/app/browse?category=Groceries" },
    { icon: "🏠", label: "Home", to: "/app/browse?category=Home & Living" },
    { icon: "📚", label: "Books", to: "/app/browse?category=Books" },
    { icon: "🏋️", label: "Sports", to: "/app/browse?category=Sports & Fitness" },
  ];

  if (showSplash) {
    return <SplashScreen onComplete={handleSplashComplete} />;
  }

  return (
    <CustomerLayout>
      <div className="max-w-7xl mx-auto space-y-0 pb-24 md:pb-6">
        {/* Mobile Category Icons Row - improved with circular avatars */}
        <div className="px-4 pt-5 md:hidden">
          <div className="flex gap-3 overflow-x-auto scrollbar-hide pb-3 pt-1 pl-1">
            {categoryIcons.map((cat, i) => (
              <motion.div
                key={cat.label}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: i * 0.04, duration: 0.25 }}
              >
                <Link to={cat.to} className="flex flex-col items-center gap-1.5 min-w-[56px]">
                  <div className={`h-12 w-12 rounded-full flex items-center justify-center transition-all shadow-sm
                    ${i === 0 ? 'bg-primary text-primary-foreground ring-2 ring-primary ring-offset-2' : 'bg-card border border-border/50 hover:border-primary/30 hover:shadow-md'}`}>
                    <span className="text-lg">{cat.icon}</span>
                  </div>
                  <span className={`text-[10px] font-medium leading-tight text-center
                    ${i === 0 ? 'text-primary font-bold' : 'text-muted-foreground'}`}>{cat.label}</span>
                </Link>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Ride in a Snap - Mobile Only Banner */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.4 }}
          className="px-4 pb-2 md:hidden"
        >
          <div className="bg-secondary rounded-2xl p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-3xl">🛺</span>
              <div>
                <p className="text-sm font-bold">"Ride in a Snap."</p>
              </div>
            </div>
            <Link to="/app/services?category=Transport">
              <Button size="sm" className="h-8 text-xs rounded-full">Book Now</Button>
            </Link>
          </div>
        </motion.div>

        {/* Hero Banner Carousel */}
        <div className="px-4 pt-0 md:pt-4">
          {isLoading ? (
            <Skeleton className="h-40 md:h-80 rounded-2xl" />
          ) : data?.banners && data.banners.length > 0 ? (
            <div className="relative overflow-hidden rounded-2xl shadow-lg">
              <AnimatePresence mode="wait">
                <motion.div
                  key={bannerIdx}
                  initial={{ opacity: 0, x: 60 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -60 }}
                  transition={{ duration: 0.45, ease: "easeInOut" }}
                >
                  {data.banners[bannerIdx]?.desktop_image ? (
                    <Link to={data.banners[bannerIdx]?.link || "/app/browse"}>
                      <img src={data.banners[bannerIdx].desktop_image} alt={data.banners[bannerIdx].title}
                        className="w-full h-44 sm:h-56 md:h-72 lg:h-80 object-cover rounded-2xl" />
                    </Link>
                  ) : (
                    <div className={`bg-gradient-to-r ${data.banners[bannerIdx]?.gradient || 'from-primary to-primary/70'} rounded-2xl p-6 md:p-12 h-44 md:h-72 flex items-center`}>
                      <div>
                        <motion.h2 initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.2 }}
                          className="text-xl md:text-4xl font-bold text-primary-foreground">{data.banners[bannerIdx]?.title}</motion.h2>
                        <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.35 }}
                          className="text-xs md:text-base text-primary-foreground/80 mt-1">{data.banners[bannerIdx]?.subtitle}</motion.p>
                        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}>
                          <Button size="sm" variant="secondary" className="mt-3">Shop Now</Button>
                        </motion.div>
                      </div>
                    </div>
                  )}
                </motion.div>
              </AnimatePresence>
              <button onClick={() => setBannerIdx((prev) => (prev - 1 + data.banners.length) % data.banners.length)}
                className="absolute left-3 top-1/2 -translate-y-1/2 h-9 w-9 rounded-full bg-card/80 backdrop-blur-sm flex items-center justify-center shadow-lg hover:bg-card transition-colors">
                <ChevronLeft className="h-5 w-5" />
              </button>
              <button onClick={() => setBannerIdx((prev) => (prev + 1) % data.banners.length)}
                className="absolute right-3 top-1/2 -translate-y-1/2 h-9 w-9 rounded-full bg-card/80 backdrop-blur-sm flex items-center justify-center shadow-lg hover:bg-card transition-colors">
                <ChevronRight className="h-5 w-5" />
              </button>
              <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-2">
                {data.banners.map((_, i) => (
                  <button key={i} onClick={() => setBannerIdx(i)}
                    className={`h-2 rounded-full transition-all duration-300 ${i === bannerIdx ? 'w-6 bg-card' : 'w-2 bg-card/50'}`} />
                ))}
              </div>
            </div>
          ) : null}
        </div>

        {/* Store Banners - Scrollable 2-row grid (Zepto-style) */}
        {data?.storeBanners && data.storeBanners.length > 0 && (
          <motion.section initial="hidden" whileInView="visible" viewport={{ once: true }} variants={slideUp} className="py-4">
            <div className="overflow-x-auto scrollbar-hide px-4">
              <div className="grid grid-rows-2 grid-flow-col gap-3 auto-cols-[140px] sm:auto-cols-[160px] md:auto-cols-[180px]">
                {data.storeBanners.map((store: any, idx: number) => (
                  <motion.div
                    key={store.id}
                    initial={{ opacity: 0, scale: 0.92 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: idx * 0.04, duration: 0.3 }}
                  >
                    <Link to={store.link || "/app/browse"} className="block group">
                      <div className="rounded-2xl overflow-hidden border border-border/30 bg-card hover:shadow-lg transition-all duration-300 hover:-translate-y-0.5">
                        <div className="h-24 sm:h-28 overflow-hidden">
                          <img
                            src={store.image}
                            alt={store.title}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                          />
                        </div>
                        <div className="px-2 py-2 text-center">
                          <p className="text-[11px] sm:text-xs font-semibold leading-tight truncate">{store.title}</p>
                        </div>
                      </div>
                    </Link>
                  </motion.div>
                ))}
              </div>
            </div>
          </motion.section>
        )}

        {/* Emergency / Urgent / Help Section - Desktop ONLY */}
        <motion.section
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          variants={slideUp}
          className="px-4 py-6 hidden md:block"
        >
          <div className="bg-card rounded-2xl p-6 border border-border/30 shadow-sm">
            <div className="grid grid-cols-3 gap-8">
              {[
                { label: "Emergency", image: data?.assets?.homepage_image_emergency || "/images/services/emergency.jpg", to: "/app/services", color: "bg-destructive" },
                { label: "Urgent", image: data?.assets?.homepage_image_urgent || "/images/services/urgent.jpg", to: "/app/services", color: "bg-warning" },
                { label: "Help", image: data?.assets?.homepage_image_help || "/images/services/help.jpg", to: "/app/services", color: "bg-info" },
              ].map((item) => (
                <Link key={item.label} to={item.to} className="flex flex-col items-center gap-3 group">
                  <motion.div
                    whileHover={{ scale: 1.08, y: -4 }}
                    transition={{ type: "spring", stiffness: 300 }}
                    className="h-28 w-28 rounded-2xl overflow-hidden bg-card border border-border/50 shadow-md"
                  >
                    <img src={item.image} alt={item.label} className="w-full h-full object-cover" />
                  </motion.div>
                  <span className={`px-6 py-2 rounded-full text-sm font-semibold ${item.color} text-primary-foreground`}>
                    {item.label}
                  </span>
                </Link>
              ))}
            </div>
          </div>
        </motion.section>

        {/* Best of Products - Teal Carousel */}
        <motion.section initial="hidden" whileInView="visible" viewport={{ once: true }} variants={slideUp} className="py-2">
          <div className="bg-primary rounded-2xl mx-4 overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4">
              <h2 className="text-lg md:text-xl font-bold text-primary-foreground">Best of Products</h2>
              <div className="flex gap-2">
                <button onClick={() => { const el = document.getElementById('product-carousel'); if (el) el.scrollBy({ left: -220, behavior: 'smooth' }); }}
                  className="h-8 w-8 rounded-full bg-primary-foreground/20 flex items-center justify-center hover:bg-primary-foreground/40 transition-colors">
                  <ChevronLeft className="h-4 w-4 text-primary-foreground" />
                </button>
                <button onClick={() => { const el = document.getElementById('product-carousel'); if (el) el.scrollBy({ left: 220, behavior: 'smooth' }); }}
                  className="h-8 w-8 rounded-full bg-primary-foreground/20 flex items-center justify-center hover:bg-primary-foreground/40 transition-colors">
                  <ChevronRight className="h-4 w-4 text-primary-foreground" />
                </button>
              </div>
            </div>
            <div id="product-carousel" className="flex gap-4 overflow-x-auto pb-6 px-6 scrollbar-hide scroll-smooth">
              {isLoading ? Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-52 w-40 rounded-xl shrink-0" />) :
                data?.featuredProducts.map((p, idx) => (
                  <motion.div key={p.id} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: idx * 0.05, duration: 0.3 }} className="shrink-0">
                    <Link to={`/app/product/${p.id}`}>
                      <Card className="w-36 sm:w-44 md:w-48 overflow-hidden hover:shadow-xl transition-all duration-300 bg-card border-0 hover:-translate-y-1">
                        <div className="h-28 sm:h-36 md:h-40 bg-secondary/20 flex items-center justify-center overflow-hidden">
                          {p.image ? (
                            <img src={p.image} alt={p.title} className="w-full h-full object-cover" />
                          ) : (
                            <span className="text-4xl">{p.emoji}</span>
                          )}
                        </div>
                        <div className="p-3 text-center">
                          <p className="text-xs font-semibold truncate">{p.title}</p>
                          <p className="text-sm font-bold text-primary mt-1">From ₹{(p.price - (p.discount || 0)).toLocaleString()}</p>
                        </div>
                      </Card>
                    </Link>
                  </motion.div>
                ))}
            </div>
          </div>
        </motion.section>

        {/* Brand Deal Banners */}
        <motion.section initial="hidden" whileInView="visible" viewport={{ once: true }} variants={slideUp} className="px-4 py-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[
              { brand: "IPHONE", image: data?.assets?.homepage_image_iphone_deal || "/images/banners/iphone-deal.jpg", to: "/app/browse?search=iphone", label: "UP to 80% OFF" },
              { brand: "REALME", image: data?.assets?.homepage_image_realme_deal || "/images/banners/realme-deal.jpg", to: "/app/browse?search=realme", label: "UP to 80% OFF" },
              { brand: "XIAOMI", image: data?.assets?.homepage_image_xiaomi_deal || "/images/banners/xiaomi-deal.jpg", to: "/app/browse?search=xiaomi", label: "UP to 60% OFF" },
            ].map((deal) => (
              <motion.div key={deal.brand} whileHover={{ scale: 1.02 }} transition={{ type: "spring", stiffness: 300 }}>
                <Link to={deal.to} className="block rounded-2xl overflow-hidden shadow-md hover:shadow-xl transition-shadow">
                  <div className="relative">
                    <img src={deal.image} alt={deal.brand} className="w-full h-32 md:h-40 object-cover" />
                    <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-foreground/60 to-transparent p-3">
                      <p className="text-card text-xs font-bold">{deal.label}</p>
                    </div>
                  </div>
                </Link>
              </motion.div>
            ))}
          </div>
        </motion.section>

        {/* Pick Up Where You Left Off */}
        <motion.section initial="hidden" whileInView="visible" viewport={{ once: true }} variants={slideUp} className="px-4 py-2">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[
              { title: "Pick up where you left off", items: data?.featuredProducts?.slice(0, 4) || [] },
              { title: "Pick up where you left off", items: data?.featuredProducts?.slice(4, 8) || [] },
              { title: "Hair & Skin Care for Monsoon", items: data?.featuredProducts?.slice(0, 4) || [] },
            ].map((section, sIdx) => (
              <Card key={sIdx} className="p-4 hover:shadow-lg transition-shadow duration-300">
                <h3 className="text-sm font-bold mb-3">{section.title}</h3>
                <div className="grid grid-cols-2 gap-3">
                  {section.items.map((p: any) => (
                    <Link key={p.id} to={`/app/product/${p.id}`} className="group">
                      <div className="h-20 bg-secondary/30 rounded-lg overflow-hidden mb-1">
                        {p.image ? (
                          <img src={p.image} alt={p.title} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-2xl">{p.emoji}</div>
                        )}
                      </div>
                      <p className="text-[10px] text-muted-foreground truncate">{p.title}</p>
                    </Link>
                  ))}
                </div>
                <Link to="/app/browse" className="text-xs text-primary font-medium mt-2 block hover:underline">Explore More</Link>
              </Card>
            ))}
          </div>
        </motion.section>

        {/* Shop by Category */}
        <motion.section initial="hidden" whileInView="visible" viewport={{ once: true }} variants={slideUp} className="px-4 py-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg md:text-xl font-bold">Shop by Category</h2>
            <Link to="/app/browse" className="text-sm text-primary flex items-center gap-0.5 hover:underline font-medium">
              View All <ChevronRight className="h-4 w-4" />
            </Link>
          </div>
          <motion.div variants={containerAnim} initial="hidden" whileInView="show" viewport={{ once: true }}
            className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-7 gap-3 md:gap-4">
            {isLoading ? Array.from({ length: 7 }).map((_, i) => <Skeleton key={i} className="h-20 rounded-xl" />) :
              data?.categories.map((c) => (
                <motion.div key={c.id} variants={itemAnim}>
                  <Link to={`/app/browse?category=${c.name}`} className="flex flex-col items-center gap-2 group">
                    <div className="h-14 w-14 md:h-20 md:w-20 rounded-full bg-secondary/50 border-2 border-border/50 flex items-center justify-center overflow-hidden group-hover:border-primary/50 group-hover:shadow-md transition-all duration-300">
                      {c.image && c.image.startsWith('/') ? (
                        <img src={c.image} alt={c.name} className="w-full h-full object-cover rounded-full" />
                      ) : (
                        <span className="text-2xl md:text-3xl">{c.image || '📦'}</span>
                      )}
                    </div>
                    <span className="text-[11px] md:text-xs font-medium text-center leading-tight">{c.name}</span>
                  </Link>
                </motion.div>
              ))}
          </motion.div>
        </motion.section>

        {/* Seller List / Vendor Cards */}
        <motion.section initial="hidden" whileInView="visible" viewport={{ once: true }} variants={slideUp} className="px-4 py-2">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg md:text-xl font-bold">Seller List</h2>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" className="h-8 text-xs gap-1">Filters</Button>
              <Button variant="outline" size="sm" className="h-8 text-xs gap-1">Sort by</Button>
            </div>
          </div>
          <motion.div variants={containerAnim} initial="hidden" whileInView="show" viewport={{ once: true }} className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-4">
            {isLoading ? Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-60 rounded-xl" />) :
              data?.featuredProducts.slice(0, 8).map((p) => {
                const discountPct = p.discount ? Math.round((p.discount / p.price) * 100) : 0;
                return (
                  <motion.div key={p.id} variants={itemAnim}>
                    <Link to={`/app/vendor/${p.vendor_id}`}>
                      <Card className="overflow-hidden hover:shadow-xl transition-all duration-300 group hover:-translate-y-1">
                        <div className="bg-secondary/20 h-36 sm:h-44 md:h-48 flex items-center justify-center relative overflow-hidden">
                          {discountPct > 0 && (
                            <span className="absolute top-2 left-2 z-10 bg-primary/90 text-primary-foreground text-[9px] md:text-[10px] px-2 py-0.5 rounded-sm font-medium">
                              {discountPct}% Off Every Purchase
                            </span>
                          )}
                          {p.image ? (
                            <img src={p.image} alt={p.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                          ) : (
                            <span className="text-5xl">{p.emoji}</span>
                          )}
                          <button className="absolute top-2 right-2 h-7 w-7 rounded-full bg-card/80 flex items-center justify-center z-10 hover:bg-card transition-colors">
                            <Heart className="h-3.5 w-3.5 text-muted-foreground" />
                          </button>
                          <span className="absolute bottom-2 left-2 bg-card/90 text-[9px] px-1.5 py-0.5 rounded text-muted-foreground flex items-center gap-0.5 z-10">
                            <MapPin className="h-2.5 w-2.5" /> 1.5 km
                          </span>
                        </div>
                        <div className="p-3">
                          <div className="flex items-center justify-between">
                            <h3 className="text-sm font-semibold truncate">{p.vendor_name}</h3>
                            <div className="flex items-center gap-0.5">
                              <Star className="h-3 w-3 fill-warning text-warning" />
                              <span className="text-xs font-medium">{p.rating}</span>
                            </div>
                          </div>
                          <p className="text-[10px] text-muted-foreground">{p.category_name}</p>
                          <div className="flex items-center justify-between mt-1.5">
                            <span className="text-[10px] text-muted-foreground">Min ₹{Math.round(p.price * 0.3)}</span>
                            <div className="flex items-center gap-0.5">
                              <Star className="h-2.5 w-2.5 fill-warning text-warning" />
                              <span className="text-[10px] font-medium">150 pts</span>
                            </div>
                          </div>
                          <div className="flex items-center gap-1 mt-1.5">
                            <Clock className="h-2.5 w-2.5 text-muted-foreground" />
                            <span className="text-[10px] text-muted-foreground">Delivery in 60 Min</span>
                          </div>
                        </div>
                      </Card>
                    </Link>
                  </motion.div>
                );
              })}
          </motion.div>
        </motion.section>

        {/* Top Servicers Section */}
        <motion.section initial="hidden" whileInView="visible" viewport={{ once: true }} variants={slideUp} className="py-6">
          <div className="bg-primary rounded-2xl mx-4 overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4">
              <h2 className="text-lg md:text-xl font-bold text-primary-foreground">Top Servicer</h2>
              <div className="flex gap-2">
                <button onClick={() => { const el = document.getElementById('service-carousel'); if (el) el.scrollBy({ left: -220, behavior: 'smooth' }); }}
                  className="h-8 w-8 rounded-full bg-primary-foreground/20 flex items-center justify-center hover:bg-primary-foreground/40 transition-colors">
                  <ChevronLeft className="h-4 w-4 text-primary-foreground" />
                </button>
                <button onClick={() => { const el = document.getElementById('service-carousel'); if (el) el.scrollBy({ left: 220, behavior: 'smooth' }); }}
                  className="h-8 w-8 rounded-full bg-primary-foreground/20 flex items-center justify-center hover:bg-primary-foreground/40 transition-colors">
                  <ChevronRight className="h-4 w-4 text-primary-foreground" />
                </button>
              </div>
            </div>
            <div id="service-carousel" className="flex gap-4 overflow-x-auto pb-6 px-6 scrollbar-hide scroll-smooth">
              {isLoading ? Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-64 w-56 rounded-xl shrink-0" />) :
                data?.featuredServices?.map((s, idx) => (
                  <motion.div key={s.id} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: idx * 0.05, duration: 0.3 }} className="shrink-0">
                    <Link to={`/app/service/${s.id}`}>
                      <Card className="w-52 sm:w-60 md:w-64 overflow-hidden hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
                        <div className="h-36 md:h-44 bg-secondary/20 relative overflow-hidden">
                          {s.image ? (
                            <img src={s.image} alt={s.title} className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/10 to-primary/5">
                              <span className="text-4xl">{s.emoji}</span>
                            </div>
                          )}
                          <Badge className="absolute top-2 left-2 bg-success/90 text-success-foreground text-[9px]">New Arrival</Badge>
                          <span className="absolute bottom-2 left-2 bg-card/90 text-[9px] px-1.5 py-0.5 rounded flex items-center gap-0.5">
                            <MapPin className="h-2.5 w-2.5" /> 1.5 km
                          </span>
                        </div>
                        <div className="p-3">
                          <div className="flex items-center justify-between">
                            <h3 className="text-sm font-semibold truncate flex-1">{s.vendor_name}</h3>
                            <div className="flex items-center gap-0.5">
                              <Star className="h-3 w-3 fill-warning text-warning" />
                              <span className="text-xs font-medium">{s.rating}</span>
                            </div>
                          </div>
                          <p className="text-[10px] text-muted-foreground">{s.category_name}</p>
                          <p className="text-[10px] text-muted-foreground mt-0.5 truncate">{s.description?.slice(0, 40)}...</p>
                          <Button size="sm" className="w-full mt-2 h-8 text-xs rounded-full">Book Consultant @₹49</Button>
                        </div>
                      </Card>
                    </Link>
                  </motion.div>
                ))}
            </div>
          </div>
        </motion.section>

        {/* Healthy & Wellness Banner */}
        <motion.section initial="hidden" whileInView="visible" viewport={{ once: true }} variants={slideUp} className="px-4 py-4">
          <div className="bg-gradient-to-r from-warning/20 to-warning/5 rounded-2xl p-6 md:p-8 flex items-center justify-between overflow-hidden">
            <div>
              <h3 className="text-lg md:text-xl font-bold">Healthy & Wellness</h3>
              <Link to="/app/services?category=Beauty%20%26%20Wellness">
                <Button size="sm" variant="outline" className="mt-2 rounded-full border-primary text-primary hover:bg-primary hover:text-primary-foreground">
                  View <ChevronRight className="h-3 w-3 ml-1" />
                </Button>
              </Link>
            </div>
            <span className="text-6xl md:text-8xl opacity-30">🧘‍♀️</span>
          </div>
        </motion.section>

        {/* Most Booked Services */}
        <motion.section initial="hidden" whileInView="visible" viewport={{ once: true }} variants={slideUp} className="px-4 py-4">
          <h2 className="text-lg md:text-xl font-bold mb-4">Most Booked Services</h2>
          <motion.div variants={containerAnim} initial="hidden" whileInView="show" viewport={{ once: true }}
            className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3 md:gap-4">
            {isLoading ? Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-56 rounded-xl" />) :
              data?.featuredServices?.slice(0, 5).map((s) => (
                <motion.div key={s.id} variants={itemAnim}>
                  <Link to={`/app/service/${s.id}`}>
                    <Card className="overflow-hidden hover:shadow-xl transition-all duration-300 group hover:-translate-y-1">
                      <div className="h-32 md:h-40 bg-secondary/20 relative overflow-hidden">
                        {s.image ? (
                          <img src={s.image} alt={s.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center"><span className="text-3xl">{s.emoji}</span></div>
                        )}
                        <div className="absolute top-2 left-2 flex items-center gap-0.5 bg-card/90 px-1.5 py-0.5 rounded">
                          <Star className="h-2.5 w-2.5 fill-warning text-warning" />
                          <span className="text-[10px] font-medium">{s.rating}</span>
                        </div>
                        <button className="absolute top-2 right-2 h-6 w-6 rounded-full bg-card/80 flex items-center justify-center hover:bg-card transition-colors">
                          <Heart className="h-3 w-3 text-muted-foreground" />
                        </button>
                      </div>
                      <div className="p-3">
                        <h3 className="text-xs font-semibold leading-tight line-clamp-2">{s.title}</h3>
                        <div className="flex items-center gap-1 mt-1.5">
                          <span className="text-sm font-bold">₹{(s.price - (s.discount || 0)).toLocaleString()}</span>
                          {s.discount > 0 && <span className="text-[10px] text-muted-foreground line-through">₹{s.price}</span>}
                        </div>
                        <div className="flex items-center gap-1 mt-1">
                          <Clock className="h-2.5 w-2.5 text-muted-foreground" />
                          <span className="text-[10px] text-muted-foreground">{s.duration}</span>
                        </div>
                      </div>
                    </Card>
                  </Link>
                </motion.div>
              ))}
          </motion.div>
        </motion.section>

        {/* Home Services Grid */}
        <motion.section initial="hidden" whileInView="visible" viewport={{ once: true }} variants={slideUp} className="px-4 py-4">
          <h2 className="text-lg md:text-xl font-bold mb-4">Home Services</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="gradient-primary rounded-2xl p-6 flex flex-col justify-center text-primary-foreground">
              <h2 className="text-xl md:text-2xl font-bold">Book a Service</h2>
              <p className="text-sm opacity-80 mt-2">Professional services at your doorstep</p>
              <Link to="/app/services">
                <Button size="sm" variant="secondary" className="mt-4 w-fit rounded-full">View All Services</Button>
              </Link>
            </div>
            <div className="md:col-span-2 grid grid-cols-2 sm:grid-cols-4 gap-3">
              {isLoading ? Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-24 rounded-xl" />) :
                data?.serviceCategories.slice(0, 8).map((c) => (
                  <motion.div key={c.id} whileHover={{ scale: 1.03 }} transition={{ type: "spring", stiffness: 300 }}>
                    <Link to={`/app/services?category=${c.name}`}
                      className="bg-card rounded-xl border border-border/50 p-3 hover:border-primary/30 hover:shadow-md transition-all flex items-center gap-3">
                      <div className="h-12 w-12 rounded-full bg-secondary/50 flex items-center justify-center overflow-hidden shrink-0">
                        {c.image && c.image.startsWith('/') ? (
                          <img src={c.image} alt={c.name} className="w-full h-full object-cover rounded-full" />
                        ) : (
                          <span className="text-xl">{c.image}</span>
                        )}
                      </div>
                      <div>
                        <p className="text-xs font-semibold leading-tight">{c.name}</p>
                        <p className="text-[10px] text-muted-foreground">From ₹349</p>
                      </div>
                    </Link>
                  </motion.div>
                ))}
            </div>
          </div>
        </motion.section>

        <DiscountSubscriptionSection />

        {/* Trust Bar */}
        <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={slideUp}
          className="grid grid-cols-3 gap-3 px-4 py-4">
          {[
            { icon: Shield, text: "100% Genuine", sub: "Verified vendors" },
            { icon: Clock, text: "Fast Delivery", sub: "Within 48 hours" },
            { icon: Sparkles, text: "Earn Rewards", sub: "On every order" },
          ].map((b) => (
            <Card key={b.text} className="p-3 md:p-4 text-center hover:shadow-md transition-shadow">
              <b.icon className="h-5 w-5 md:h-6 md:w-6 mx-auto text-primary mb-1" />
              <p className="text-xs md:text-sm font-semibold">{b.text}</p>
              <p className="text-[10px] md:text-xs text-muted-foreground">{b.sub}</p>
            </Card>
          ))}
        </motion.div>

        {/* Classifieds CTA */}
        <motion.section initial="hidden" whileInView="visible" viewport={{ once: true }} variants={slideUp} className="px-4 py-4">
          <div className="rounded-2xl overflow-hidden relative">
            <img src={data?.assets?.homepage_image_classifieds_banner || "/images/banners/classifieds-banner.jpg"} alt="Classifieds" className="w-full h-44 md:h-56 object-cover" />
            <div className="absolute inset-0 bg-gradient-to-r from-foreground/70 to-foreground/20 flex items-center">
              <div className="p-6 md:p-8">
                <h2 className="text-lg md:text-2xl font-bold text-card">Buy & Sell Locally</h2>
                <p className="text-xs sm:text-sm text-card/90 mt-1">Post free classified ads and find great deals near you</p>
                <div className="flex gap-2 mt-3">
                  <Link to="/app/classifieds"><Button variant="secondary" size="sm" className="rounded-full">Browse Ads</Button></Link>
                  <Link to="/app/classifieds/post"><Button variant="secondary" size="sm" className="rounded-full">Post Ad Free</Button></Link>
                </div>
              </div>
            </div>
          </div>
        </motion.section>
      </div>
    </CustomerLayout>
  );
}
