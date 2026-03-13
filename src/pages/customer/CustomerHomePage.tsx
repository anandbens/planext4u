import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ChevronRight, Star, Heart, ChevronLeft, Clock, Shield, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { CustomerLayout } from "@/components/customer/CustomerLayout";
import { motion } from "framer-motion";
import { api } from "@/lib/api";

export default function CustomerHomePage() {
  const { data, isLoading } = useQuery({ queryKey: ["customerHome"], queryFn: api.getCustomerHome });
  const [bannerIdx, setBannerIdx] = useState(0);

  // Auto-rotate banners
  useEffect(() => {
    if (!data?.banners.length) return;
    const interval = setInterval(() => {
      setBannerIdx((prev) => (prev + 1) % data.banners.length);
    }, 5000);
    return () => clearInterval(interval);
  }, [data?.banners.length]);

  const containerAnim = {
    hidden: { opacity: 0 },
    show: { opacity: 1, transition: { staggerChildren: 0.05 } },
  };
  const itemAnim = {
    hidden: { opacity: 0, y: 12 },
    show: { opacity: 1, y: 0, transition: { duration: 0.3 } },
  };

  return (
    <CustomerLayout>
      <div className="max-w-7xl mx-auto px-4 py-6 space-y-10 pb-20 md:pb-6">
        {/* Hero Banner Carousel */}
        {isLoading ? (
          <Skeleton className="h-48 md:h-64 rounded-2xl" />
        ) : data?.banners && data.banners.length > 0 ? (
          <div className="relative overflow-hidden rounded-2xl">
            <motion.div
              key={bannerIdx}
              initial={{ opacity: 0, x: 40 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -40 }}
              transition={{ duration: 0.4 }}
              className={`bg-gradient-to-r ${data.banners[bannerIdx]?.gradient || 'from-primary to-primary/70'} rounded-2xl p-8 md:p-12 text-primary-foreground relative overflow-hidden`}
            >
              <div className="absolute inset-0 opacity-10">
                <div className="absolute -right-20 -top-20 w-60 h-60 rounded-full bg-primary-foreground/20" />
                <div className="absolute -left-10 -bottom-10 w-40 h-40 rounded-full bg-primary-foreground/10" />
              </div>
              <div className="relative z-10">
                <h2 className="text-2xl md:text-4xl font-bold">{data.banners[bannerIdx]?.title}</h2>
                <p className="text-sm md:text-base opacity-90 mt-2">{data.banners[bannerIdx]?.subtitle}</p>
                <Button size="sm" variant="secondary" className="mt-4">Shop Now</Button>
              </div>
            </motion.div>
            {/* Dots */}
            <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
              {data.banners.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setBannerIdx(i)}
                  className={`h-2 rounded-full transition-all ${i === bannerIdx ? 'w-6 bg-primary-foreground' : 'w-2 bg-primary-foreground/40'}`}
                />
              ))}
            </div>
            {/* Arrows */}
            <button
              onClick={() => setBannerIdx((prev) => (prev - 1 + data.banners.length) % data.banners.length)}
              className="absolute left-3 top-1/2 -translate-y-1/2 h-8 w-8 rounded-full bg-primary-foreground/20 flex items-center justify-center text-primary-foreground hover:bg-primary-foreground/30 transition-colors"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              onClick={() => setBannerIdx((prev) => (prev + 1) % data.banners.length)}
              className="absolute right-3 top-1/2 -translate-y-1/2 h-8 w-8 rounded-full bg-primary-foreground/20 flex items-center justify-center text-primary-foreground hover:bg-primary-foreground/30 transition-colors"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        ) : null}

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

        {/* Product Categories */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold">Shop by Category</h2>
            <Link to="/app/browse" className="text-sm text-primary flex items-center gap-0.5 hover:underline">View All <ChevronRight className="h-4 w-4" /></Link>
          </div>
          <motion.div variants={containerAnim} initial="hidden" animate="show" className="grid grid-cols-4 sm:grid-cols-7 gap-3">
            {isLoading
              ? Array.from({ length: 7 }).map((_, i) => <Skeleton key={i} className="h-24 rounded-xl" />)
              : data?.categories.map((c) => (
                <motion.div key={c.id} variants={itemAnim}>
                  <Link to={`/app/browse?category=${c.name}`} className="bg-card rounded-xl border border-border/50 p-4 text-center hover:border-primary/30 hover:shadow-md transition-all block">
                    <span className="text-2xl">{c.image}</span>
                    <p className="text-xs font-medium mt-2">{c.name}</p>
                    <p className="text-[10px] text-muted-foreground">{c.count} items</p>
                  </Link>
                </motion.div>
              ))}
          </motion.div>
        </section>

        {/* Services Section */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold">Book a Service</h2>
            <Link to="/app/services" className="text-sm text-primary flex items-center gap-0.5 hover:underline">View All <ChevronRight className="h-4 w-4" /></Link>
          </div>
          <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
            {isLoading
              ? Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-24 rounded-xl" />)
              : data?.serviceCategories.map((c) => (
                <Link to={`/app/services?category=${c.name}`} key={c.id} className="bg-card rounded-xl border border-border/50 p-4 text-center hover:border-primary/30 hover:shadow-md transition-all">
                  <span className="text-2xl">{c.image}</span>
                  <p className="text-xs font-medium mt-2">{c.name}</p>
                </Link>
              ))}
          </div>
        </section>

        {/* Featured Services */}
        {data?.featuredServices && data.featuredServices.length > 0 && (
          <section>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold">Popular Services</h2>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {data.featuredServices.map((s) => (
                <Link to={`/app/service/${s.id}`} key={s.id}>
                  <Card className="overflow-hidden hover:shadow-md transition-shadow">
                    <div className="bg-gradient-to-br from-secondary/50 to-secondary/20 h-28 flex items-center justify-center text-4xl">
                      {s.emoji}
                    </div>
                    <div className="p-3">
                      <p className="text-xs text-muted-foreground">{s.vendor_name}</p>
                      <h3 className="text-sm font-medium mt-0.5">{s.title}</h3>
                      <div className="flex items-center gap-1 mt-1">
                        <Star className="h-3 w-3 fill-warning text-warning" />
                        <span className="text-xs font-medium">{s.rating}</span>
                        <span className="text-[10px] text-muted-foreground">({s.reviews})</span>
                        <span className="text-[10px] text-muted-foreground ml-auto">{s.duration}</span>
                      </div>
                      <div className="flex items-center gap-2 mt-1.5">
                        <span className="text-sm font-bold">₹{s.price.toLocaleString()}</span>
                        {s.discount > 0 && <span className="text-xs text-muted-foreground line-through">₹{(s.price + s.discount).toLocaleString()}</span>}
                      </div>
                    </div>
                  </Card>
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* Featured Products */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold">Featured Products</h2>
            <Link to="/app/browse" className="text-sm text-primary flex items-center gap-0.5 hover:underline">View All <ChevronRight className="h-4 w-4" /></Link>
          </div>
          <motion.div variants={containerAnim} initial="hidden" animate="show" className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {isLoading
              ? Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-56 rounded-xl" />)
              : data?.featuredProducts.map((p) => {
                const discountPct = p.discount ? Math.round((p.discount / p.price) * 100) : 0;
                const originalPrice = p.price + p.discount;
                return (
                  <motion.div key={p.id} variants={itemAnim}>
                    <Link to={`/app/product/${p.id}`}>
                      <Card className="overflow-hidden hover:shadow-md transition-all group">
                        <div className="bg-secondary/30 h-36 flex items-center justify-center text-4xl relative">
                          {p.emoji}
                          {discountPct > 0 && <Badge className="absolute top-2 left-2 bg-destructive text-destructive-foreground text-[10px] px-1.5 py-0">{discountPct}% OFF</Badge>}
                          <button className="absolute top-2 right-2 h-7 w-7 rounded-full bg-card/80 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                            <Heart className="h-3.5 w-3.5 text-muted-foreground" />
                          </button>
                        </div>
                        <div className="p-3">
                          <p className="text-xs text-muted-foreground">{p.vendor_name}</p>
                          <h3 className="text-sm font-medium mt-0.5 truncate">{p.title}</h3>
                          <div className="flex items-center gap-1 mt-1">
                            <Star className="h-3 w-3 fill-warning text-warning" />
                            <span className="text-xs font-medium">{p.rating}</span>
                            <span className="text-[10px] text-muted-foreground">({p.reviews})</span>
                          </div>
                          <div className="flex items-center gap-2 mt-1.5">
                            <span className="text-sm font-bold">₹{p.price.toLocaleString()}</span>
                            {discountPct > 0 && <span className="text-xs text-muted-foreground line-through">₹{originalPrice.toLocaleString()}</span>}
                          </div>
                        </div>
                      </Card>
                    </Link>
                  </motion.div>
                );
              })}
          </motion.div>
        </section>

        {/* Classifieds CTA */}
        <section className="gradient-info rounded-2xl p-6 md:p-8 text-primary-foreground">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl md:text-2xl font-bold">Buy & Sell Locally</h2>
              <p className="text-sm opacity-90 mt-1">Post free classified ads and find great deals near you</p>
            </div>
            <div className="flex gap-2">
              <Link to="/app/classifieds">
                <Button variant="secondary" size="sm">Browse Ads</Button>
              </Link>
              <Link to="/app/classifieds/post">
                <Button variant="secondary" size="sm">Post Ad Free</Button>
              </Link>
            </div>
          </div>
        </section>
      </div>
    </CustomerLayout>
  );
}
