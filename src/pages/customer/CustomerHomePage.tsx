import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ChevronRight, Star, Heart, ChevronLeft, Clock, Shield, Sparkles, Search, MapPin, Mic, ShoppingBag, Wrench, Megaphone, CalendarDays } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { CustomerLayout } from "@/components/customer/CustomerLayout";
import { motion } from "framer-motion";
import { api } from "@/lib/api";

export default function CustomerHomePage() {
  const navigate = useNavigate();
  const { data, isLoading } = useQuery({ queryKey: ["customerHome"], queryFn: api.getCustomerHome });
  const [bannerIdx, setBannerIdx] = useState(0);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    if (!data?.banners.length) return;
    const interval = setInterval(() => setBannerIdx((prev) => (prev + 1) % data.banners.length), 5000);
    return () => clearInterval(interval);
  }, [data?.banners.length]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) navigate(`/app/browse?search=${encodeURIComponent(searchQuery.trim())}`);
  };

  const containerAnim = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.05 } } };
  const itemAnim = { hidden: { opacity: 0, y: 12 }, show: { opacity: 1, y: 0, transition: { duration: 0.3 } } };

  return (
    <CustomerLayout>
      <div className="max-w-7xl mx-auto px-4 py-4 space-y-6 pb-20 md:pb-6">
        {/* Location + Points Bar (Mobile) */}
        <div className="flex items-center justify-between md:hidden">
          <div className="flex items-center gap-1.5">
            <MapPin className="h-4 w-4 text-primary" />
            <div>
              <p className="text-sm font-semibold leading-tight">JJ Nagar, 15</p>
              <p className="text-[10px] text-muted-foreground">Pattanam, Coimbatore</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1 bg-warning/10 px-2 py-1 rounded-full">
              <span className="text-warning text-xs">●</span>
              <span className="text-xs font-semibold">1,260</span>
            </div>
          </div>
        </div>

        {/* Search Bar */}
        <form onSubmit={handleSearch} className="relative md:hidden">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder='Search for "Bio-Enzymes"' value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 pr-10 h-12 rounded-xl bg-secondary/50 border-border/60 text-base" />
          <Mic className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        </form>

        {/* Quick Category Pills */}
        <div className="flex gap-3 md:hidden">
          <Link to="/app/browse?category=Food%20%26%20Grocery" className="flex items-center gap-2 bg-primary/10 text-primary px-4 py-2.5 rounded-full border border-primary/20">
            <ShoppingBag className="h-4 w-4" /><span className="text-sm font-semibold">Groceries</span>
          </Link>
          <Link to="/app/services" className="flex items-center gap-2 bg-destructive/10 text-destructive px-4 py-2.5 rounded-full border border-destructive/20">
            <Wrench className="h-4 w-4" /><span className="text-sm font-semibold">Emergency</span>
          </Link>
        </div>

        {/* Hero Banner Carousel */}
        {isLoading ? (
          <Skeleton className="h-36 md:h-64 rounded-2xl" />
        ) : data?.banners && data.banners.length > 0 ? (
          <div className="relative overflow-hidden rounded-2xl">
            <motion.div key={bannerIdx} initial={{ opacity: 0, x: 40 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.4 }}
              className={`bg-gradient-to-r ${data.banners[bannerIdx]?.gradient || 'from-primary to-primary/70'} rounded-2xl p-6 md:p-12 text-primary-foreground relative overflow-hidden`}>
              <div className="absolute inset-0 opacity-10">
                <div className="absolute -right-20 -top-20 w-60 h-60 rounded-full bg-primary-foreground/20" />
              </div>
              <div className="relative z-10">
                <h2 className="text-xl md:text-4xl font-bold">{data.banners[bannerIdx]?.title}</h2>
                <p className="text-xs md:text-base opacity-90 mt-1">{data.banners[bannerIdx]?.subtitle}</p>
                <Button size="sm" variant="secondary" className="mt-3">Shop Now</Button>
              </div>
            </motion.div>
            <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1.5">
              {data.banners.map((_, i) => (
                <button key={i} onClick={() => setBannerIdx(i)}
                  className={`h-2 rounded-full transition-all ${i === bannerIdx ? 'w-5 bg-primary-foreground' : 'w-2 bg-primary-foreground/40'}`} />
              ))}
            </div>
          </div>
        ) : null}

        {/* Seller List / Shop Categories - Like Image 8 */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold">Shop by Category</h2>
            <Link to="/app/browse" className="text-sm text-primary flex items-center gap-0.5 hover:underline">View All <ChevronRight className="h-4 w-4" /></Link>
          </div>
          <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
            {isLoading ? Array.from({ length: 7 }).map((_, i) => <Skeleton key={i} className="h-16 w-16 rounded-xl shrink-0" />) :
              data?.categories.map((c) => (
                <Link key={c.id} to={`/app/browse?category=${c.name}`} className="flex flex-col items-center gap-1.5 shrink-0">
                  <div className="h-16 w-16 rounded-2xl bg-secondary/50 border border-border/50 flex items-center justify-center text-2xl hover:border-primary/30 hover:shadow-md transition-all">
                    {c.image}
                  </div>
                  <span className="text-[11px] font-medium text-center max-w-[64px] leading-tight">{c.name}</span>
                </Link>
              ))}
          </div>
        </section>

        {/* Seller List - Vendor Cards like Image 8 */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-bold">Seller List</h2>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" className="h-7 text-xs gap-1">Filters</Button>
              <Button variant="outline" size="sm" className="h-7 text-xs gap-1">Sort by</Button>
            </div>
          </div>
          <motion.div variants={containerAnim} initial="hidden" animate="show" className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {isLoading ? Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-56 rounded-xl" />) :
              data?.featuredProducts.map((p) => {
                const discountPct = p.discount ? Math.round((p.discount / p.price) * 100) : 0;
                return (
                  <motion.div key={p.id} variants={itemAnim}>
                    <Link to={`/app/product/${p.id}`}>
                      <Card className="overflow-hidden hover:shadow-md transition-all group">
                        <div className="bg-secondary/30 h-32 sm:h-40 flex items-center justify-center text-4xl relative">
                          {discountPct > 0 && (
                            <span className="absolute top-2 left-2 bg-primary/90 text-primary-foreground text-[9px] px-2 py-0.5 rounded-sm font-medium">
                              {discountPct}% Off Every Purchase
                            </span>
                          )}
                          {p.emoji}
                          <button className="absolute top-2 right-2 h-7 w-7 rounded-full bg-card/80 flex items-center justify-center">
                            <Heart className="h-3.5 w-3.5 text-muted-foreground" />
                          </button>
                          <span className="absolute bottom-2 left-2 bg-card/90 text-[9px] px-1.5 py-0.5 rounded text-muted-foreground flex items-center gap-0.5">
                            <MapPin className="h-2.5 w-2.5" /> 1.5 km
                          </span>
                        </div>
                        <div className="p-2.5">
                          <div className="flex items-center justify-between">
                            <h3 className="text-sm font-semibold truncate">{p.vendor_name}</h3>
                            <div className="flex items-center gap-0.5">
                              <Star className="h-3 w-3 fill-warning text-warning" />
                              <span className="text-xs font-medium">{p.rating}</span>
                            </div>
                          </div>
                          <p className="text-[10px] text-muted-foreground">{p.category_name}</p>
                          <div className="flex items-center justify-between mt-1.5">
                            <span className="text-[10px] text-muted-foreground">Min ₹{p.price.toLocaleString()}</span>
                            <span className="text-[10px] text-muted-foreground flex items-center gap-0.5">
                              <Star className="h-2.5 w-2.5" /> {p.max_points_redeemable} pts
                            </span>
                          </div>
                          <div className="flex items-center gap-1 mt-1">
                            <Clock className="h-2.5 w-2.5 text-primary" />
                            <span className="text-[10px] text-primary font-medium">Delivery in 60 Min</span>
                          </div>
                        </div>
                      </Card>
                    </Link>
                  </motion.div>
                );
              })}
          </motion.div>
        </section>

        {/* Services Section */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold">Book a Service</h2>
            <Link to="/app/services" className="text-sm text-primary flex items-center gap-0.5 hover:underline">View All <ChevronRight className="h-4 w-4" /></Link>
          </div>
          <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
            {isLoading ? Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-24 rounded-xl" />) :
              data?.serviceCategories.map((c) => (
                <Link to={`/app/services?category=${c.name}`} key={c.id} className="bg-card rounded-xl border border-border/50 p-4 text-center hover:border-primary/30 hover:shadow-md transition-all">
                  <span className="text-2xl">{c.image}</span>
                  <p className="text-xs font-medium mt-2">{c.name}</p>
                </Link>
              ))}
          </div>
        </section>

        {/* Trust Bar */}
        <div className="grid grid-cols-3 gap-3">
          {[
            { icon: Shield, text: "100% Genuine", sub: "Verified vendors" },
            { icon: Clock, text: "Fast Delivery", sub: "Within 48 hours" },
            { icon: Sparkles, text: "Earn Rewards", sub: "On every order" },
          ].map((b) => (
            <Card key={b.text} className="p-3 text-center">
              <b.icon className="h-5 w-5 mx-auto text-primary mb-1" />
              <p className="text-xs font-semibold">{b.text}</p>
              <p className="text-[10px] text-muted-foreground">{b.sub}</p>
            </Card>
          ))}
        </div>

        {/* Classifieds CTA */}
        <section className="gradient-info rounded-2xl p-6 md:p-8 text-primary-foreground">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-lg md:text-2xl font-bold">Buy & Sell Locally</h2>
              <p className="text-xs sm:text-sm opacity-90 mt-1">Post free classified ads and find great deals near you</p>
            </div>
            <div className="flex gap-2">
              <Link to="/app/classifieds"><Button variant="secondary" size="sm">Browse Ads</Button></Link>
              <Link to="/app/classifieds/post"><Button variant="secondary" size="sm">Post Ad Free</Button></Link>
            </div>
          </div>
        </section>
      </div>
    </CustomerLayout>
  );
}
