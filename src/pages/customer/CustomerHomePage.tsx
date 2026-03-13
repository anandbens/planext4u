import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ChevronRight, ChevronLeft, Star, Heart, Clock, Shield, Sparkles, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { CustomerLayout } from "@/components/customer/CustomerLayout";
import { motion, AnimatePresence } from "framer-motion";
import { api } from "@/lib/api";
import { loadSelectedLocation } from "@/components/customer/LocationModal";

export default function CustomerHomePage() {
  const navigate = useNavigate();
  const { data, isLoading } = useQuery({ queryKey: ["customerHome"], queryFn: api.getCustomerHome });
  const [bannerIdx, setBannerIdx] = useState(0);
  const [productScrollIdx, setProductScrollIdx] = useState(0);
  const [serviceScrollIdx, setServiceScrollIdx] = useState(0);

  useEffect(() => {
    if (!data?.banners.length) return;
    const interval = setInterval(() => setBannerIdx((prev) => (prev + 1) % data.banners.length), 5000);
    return () => clearInterval(interval);
  }, [data?.banners.length]);

  const containerAnim = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.05 } } };
  const itemAnim = { hidden: { opacity: 0, y: 12 }, show: { opacity: 1, y: 0, transition: { duration: 0.3 } } };

  return (
    <CustomerLayout>
      <div className="max-w-7xl mx-auto space-y-0 pb-20 md:pb-6">
        {/* Mobile Location + Points Bar */}
        <div className="flex items-center justify-between px-4 py-3 md:hidden">
          <div className="flex items-center gap-1.5">
            <MapPin className="h-4 w-4 text-primary" />
            <div>
              <p className="text-sm font-semibold leading-tight">JJ Nagar, 15</p>
              <p className="text-[10px] text-muted-foreground">Pattanam, Coimbatore</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1 bg-warning/10 px-2.5 py-1 rounded-full">
              <span className="text-warning text-xs">●</span>
              <span className="text-xs font-semibold">1,260 pts</span>
            </div>
          </div>
        </div>

        {/* Hero Banner Carousel */}
        <div className="px-4 pt-2 md:pt-4">
          {isLoading ? (
            <Skeleton className="h-40 md:h-80 rounded-2xl" />
          ) : data?.banners && data.banners.length > 0 ? (
            <div className="relative overflow-hidden rounded-2xl">
              <AnimatePresence mode="wait">
                <motion.div key={bannerIdx} initial={{ opacity: 0, x: 40 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -40 }} transition={{ duration: 0.4 }}>
                  {data.banners[bannerIdx]?.desktop_image ? (
                    <Link to={data.banners[bannerIdx]?.link || "/app/browse"}>
                      <img src={data.banners[bannerIdx].desktop_image} alt={data.banners[bannerIdx].title}
                        className="w-full h-40 sm:h-56 md:h-72 lg:h-80 object-cover rounded-2xl" />
                    </Link>
                  ) : (
                    <div className={`bg-gradient-to-r ${data.banners[bannerIdx]?.gradient || 'from-primary to-primary/70'} rounded-2xl p-6 md:p-12 h-40 md:h-72 flex items-center`}>
                      <div>
                        <h2 className="text-xl md:text-4xl font-bold text-primary-foreground">{data.banners[bannerIdx]?.title}</h2>
                        <p className="text-xs md:text-base text-primary-foreground/80 mt-1">{data.banners[bannerIdx]?.subtitle}</p>
                        <Button size="sm" variant="secondary" className="mt-3">Shop Now</Button>
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
                    className={`h-2.5 rounded-full transition-all ${i === bannerIdx ? 'w-6 bg-card' : 'w-2.5 bg-card/50'}`} />
                ))}
              </div>
            </div>
          ) : null}
        </div>

        {/* Emergency / Urgent / Help Section with Real Images */}
        <section className="px-4 py-6">
          <div className="bg-card rounded-2xl p-6 border border-border/30 shadow-sm">
            <div className="grid grid-cols-3 gap-4 md:gap-8">
              {[
                { label: "Emergency", image: "/images/services/emergency.jpg", to: "/app/services?type=emergency" },
                { label: "Urgent", image: "/images/services/urgent.jpg", to: "/app/services?type=urgent" },
                { label: "Help", image: "/images/services/help.jpg", to: "/app/services?type=help" },
              ].map((item) => (
                <Link key={item.label} to={item.to} className="flex flex-col items-center gap-3 group">
                  <div className="h-20 w-20 md:h-28 md:w-28 rounded-2xl overflow-hidden bg-card border border-border/50 group-hover:shadow-lg transition-all">
                    <img src={item.image} alt={item.label} className="w-full h-full object-cover" />
                  </div>
                  <span className="px-4 py-1.5 md:px-6 md:py-2 rounded-full text-xs md:text-sm font-semibold bg-primary text-primary-foreground">
                    {item.label}
                  </span>
                </Link>
              ))}
            </div>
          </div>
        </section>

        {/* Best of Products - Teal Carousel */}
        <section className="py-2">
          <div className="bg-primary rounded-2xl mx-4 overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4">
              <h2 className="text-lg md:text-xl font-bold text-primary-foreground">Best of Products</h2>
              <div className="flex gap-2">
                <button onClick={() => {
                  const el = document.getElementById('product-carousel');
                  if (el) el.scrollBy({ left: -200, behavior: 'smooth' });
                }}
                  className="h-8 w-8 rounded-full bg-primary-foreground/20 flex items-center justify-center hover:bg-primary-foreground/30 transition-colors">
                  <ChevronLeft className="h-4 w-4 text-primary-foreground" />
                </button>
                <button onClick={() => {
                  const el = document.getElementById('product-carousel');
                  if (el) el.scrollBy({ left: 200, behavior: 'smooth' });
                }}
                  className="h-8 w-8 rounded-full bg-primary-foreground/20 flex items-center justify-center hover:bg-primary-foreground/30 transition-colors">
                  <ChevronRight className="h-4 w-4 text-primary-foreground" />
                </button>
              </div>
            </div>
            <div id="product-carousel" className="flex gap-4 overflow-x-auto pb-6 px-6 scrollbar-hide scroll-smooth">
              {isLoading ? Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-52 w-40 rounded-xl shrink-0" />) :
                data?.featuredProducts.map((p) => (
                  <Link key={p.id} to={`/app/product/${p.id}`} className="shrink-0">
                    <Card className="w-36 sm:w-44 md:w-48 overflow-hidden hover:shadow-lg transition-all bg-card border-primary/20">
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
                ))}
            </div>
          </div>
        </section>

        {/* Brand Deal Banners */}
        <section className="px-4 py-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[
              { brand: "IPHONE", image: "/images/banners/iphone-deal.jpg", to: "/app/browse?search=iphone" },
              { brand: "REALME", image: "/images/banners/realme-deal.jpg", to: "/app/browse?search=realme" },
              { brand: "XIAOMI", image: "/images/banners/xiaomi-deal.jpg", to: "/app/browse?search=xiaomi" },
            ].map((deal) => (
              <Link key={deal.brand} to={deal.to} className="block rounded-2xl overflow-hidden hover:shadow-lg transition-all">
                <img src={deal.image} alt={deal.brand} className="w-full h-32 md:h-40 object-cover" />
              </Link>
            ))}
          </div>
        </section>

        {/* Pick Up Where You Left Off */}
        <section className="px-4 py-2">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[
              { title: "Pick up where you left off", items: data?.featuredProducts?.slice(0, 4) || [] },
              { title: "Pick up where you left off", items: data?.featuredProducts?.slice(4, 8) || [] },
              { title: "Trending Now", items: data?.featuredProducts?.slice(0, 4) || [] },
            ].map((section, sIdx) => (
              <Card key={sIdx} className="p-4">
                <h3 className="text-sm font-bold mb-3">{section.title}</h3>
                <div className="grid grid-cols-2 gap-3">
                  {section.items.map((p: any) => (
                    <Link key={p.id} to={`/app/product/${p.id}`} className="group">
                      <div className="h-20 bg-secondary/30 rounded-lg overflow-hidden mb-1">
                        {p.image ? (
                          <img src={p.image} alt={p.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
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
        </section>

        {/* Shop by Category */}
        <section className="px-4 py-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg md:text-xl font-bold">Shop by Category</h2>
            <Link to="/app/browse" className="text-sm text-primary flex items-center gap-0.5 hover:underline font-medium">
              View All <ChevronRight className="h-4 w-4" />
            </Link>
          </div>
          <div className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-7 gap-3 md:gap-4">
            {isLoading ? Array.from({ length: 7 }).map((_, i) => <Skeleton key={i} className="h-20 rounded-xl" />) :
              data?.categories.map((c) => (
                <Link key={c.id} to={`/app/browse?category=${c.name}`} className="flex flex-col items-center gap-2 group">
                  <div className="h-16 w-16 md:h-20 md:w-20 rounded-2xl bg-secondary/50 border border-border/50 flex items-center justify-center overflow-hidden group-hover:border-primary/30 group-hover:shadow-md transition-all">
                    {c.image && c.image.startsWith('/') ? (
                      <img src={c.image} alt={c.name} className="w-full h-full object-cover rounded-2xl" />
                    ) : (
                      <span className="text-2xl md:text-3xl">{c.image || '📦'}</span>
                    )}
                  </div>
                  <span className="text-[11px] md:text-xs font-medium text-center leading-tight">{c.name}</span>
                </Link>
              ))}
          </div>
        </section>

        {/* Seller List / Vendor Cards */}
        <section className="px-4 py-2">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg md:text-xl font-bold">Seller List</h2>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" className="h-8 text-xs gap-1">Filters</Button>
              <Button variant="outline" size="sm" className="h-8 text-xs gap-1">Sort by</Button>
            </div>
          </div>
          <motion.div variants={containerAnim} initial="hidden" animate="show" className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-4">
            {isLoading ? Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-60 rounded-xl" />) :
              data?.featuredProducts.slice(0, 8).map((p) => {
                const discountPct = p.discount ? Math.round((p.discount / p.price) * 100) : 0;
                return (
                  <motion.div key={p.id} variants={itemAnim}>
                    <Link to={`/app/vendor/${p.vendor_id}`}>
                      <Card className="overflow-hidden hover:shadow-lg transition-all group">
                        <div className="bg-secondary/20 h-36 sm:h-44 md:h-48 flex items-center justify-center relative overflow-hidden">
                          {discountPct > 0 && (
                            <span className="absolute top-2 left-2 z-10 bg-primary/90 text-primary-foreground text-[9px] md:text-[10px] px-2 py-0.5 rounded-sm font-medium">
                              {discountPct}% Off
                            </span>
                          )}
                          {p.image ? (
                            <img src={p.image} alt={p.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                          ) : (
                            <span className="text-5xl">{p.emoji}</span>
                          )}
                          <button className="absolute top-2 right-2 h-7 w-7 rounded-full bg-card/80 flex items-center justify-center z-10">
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
                            <span className="text-xs font-bold text-primary">₹{(p.price - (p.discount || 0)).toLocaleString()}</span>
                            {p.discount > 0 && <span className="text-[10px] text-muted-foreground line-through">₹{p.price.toLocaleString()}</span>}
                          </div>
                          <div className="flex items-center gap-1 mt-1.5">
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

        {/* Top Servicers Section */}
        <section className="py-6">
          <div className="bg-primary rounded-2xl mx-4 overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4">
              <h2 className="text-lg md:text-xl font-bold text-primary-foreground">Top Servicers</h2>
              <div className="flex gap-2">
                <button onClick={() => setServiceScrollIdx(Math.max(0, serviceScrollIdx - 1))}
                  className="h-8 w-8 rounded-full bg-primary-foreground/20 flex items-center justify-center hover:bg-primary-foreground/30">
                  <ChevronLeft className="h-4 w-4 text-primary-foreground" />
                </button>
                <button onClick={() => setServiceScrollIdx(serviceScrollIdx + 1)}
                  className="h-8 w-8 rounded-full bg-primary-foreground/20 flex items-center justify-center hover:bg-primary-foreground/30">
                  <ChevronRight className="h-4 w-4 text-primary-foreground" />
                </button>
              </div>
            </div>
            <div className="flex gap-4 overflow-x-auto pb-6 px-6 scrollbar-hide">
              {isLoading ? Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-64 w-56 rounded-xl shrink-0" />) :
                data?.featuredServices?.map((s) => (
                  <Link key={s.id} to={`/app/services/${s.id}`} className="shrink-0">
                    <Card className="w-52 sm:w-60 md:w-64 overflow-hidden hover:shadow-lg transition-all">
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
                        <div className="flex items-center gap-1 mt-1">
                          <Clock className="h-2.5 w-2.5 text-muted-foreground" />
                          <span className="text-[10px] text-muted-foreground">{s.duration}</span>
                        </div>
                        <Button size="sm" className="w-full mt-2 h-8 text-xs">Book Consultant @₹49</Button>
                      </div>
                    </Card>
                  </Link>
                ))}
            </div>
          </div>
        </section>

        {/* Most Booked Services */}
        <section className="px-4 py-4">
          <h2 className="text-lg md:text-xl font-bold mb-4">Most Booked Services</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3 md:gap-4">
            {isLoading ? Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-56 rounded-xl" />) :
              data?.featuredServices?.slice(0, 5).map((s) => (
                <Link key={s.id} to={`/app/services/${s.id}`}>
                  <Card className="overflow-hidden hover:shadow-lg transition-all group">
                    <div className="h-32 md:h-40 bg-secondary/20 relative overflow-hidden">
                      {s.image ? (
                        <img src={s.image} alt={s.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center"><span className="text-3xl">{s.emoji}</span></div>
                      )}
                      <div className="absolute top-2 left-2 flex items-center gap-0.5 bg-card/90 px-1.5 py-0.5 rounded">
                        <Star className="h-2.5 w-2.5 fill-warning text-warning" />
                        <span className="text-[10px] font-medium">{s.rating}</span>
                      </div>
                      <button className="absolute top-2 right-2 h-6 w-6 rounded-full bg-card/80 flex items-center justify-center">
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
              ))}
          </div>
        </section>

        {/* Book a Service Section */}
        <section className="px-4 py-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="gradient-primary rounded-2xl p-6 flex flex-col justify-center text-primary-foreground">
              <h2 className="text-xl md:text-2xl font-bold">Book a Service</h2>
              <p className="text-sm opacity-80 mt-2">Professional services at your doorstep</p>
              <Link to="/app/services">
                <Button size="sm" variant="secondary" className="mt-4 w-fit">View All Services</Button>
              </Link>
            </div>
            <div className="md:col-span-2 grid grid-cols-2 sm:grid-cols-4 gap-3">
              {isLoading ? Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-24 rounded-xl" />) :
                data?.serviceCategories.slice(0, 8).map((c) => (
                  <Link to={`/app/services?category=${c.name}`} key={c.id}
                    className="bg-card rounded-xl border border-border/50 p-3 hover:border-primary/30 hover:shadow-md transition-all flex items-center gap-3">
                    <div className="h-12 w-12 rounded-lg bg-secondary/50 flex items-center justify-center overflow-hidden shrink-0">
                      {c.image && c.image.startsWith('/') ? (
                        <img src={c.image} alt={c.name} className="w-full h-full object-cover rounded-lg" />
                      ) : (
                        <span className="text-xl">{c.image}</span>
                      )}
                    </div>
                    <div>
                      <p className="text-xs font-semibold leading-tight">{c.name}</p>
                      <p className="text-[10px] text-muted-foreground">From ₹349</p>
                    </div>
                  </Link>
                ))}
            </div>
          </div>
        </section>

        {/* Trust Bar */}
        <div className="grid grid-cols-3 gap-3 px-4 py-4">
          {[
            { icon: Shield, text: "100% Genuine", sub: "Verified vendors" },
            { icon: Clock, text: "Fast Delivery", sub: "Within 48 hours" },
            { icon: Sparkles, text: "Earn Rewards", sub: "On every order" },
          ].map((b) => (
            <Card key={b.text} className="p-3 md:p-4 text-center">
              <b.icon className="h-5 w-5 md:h-6 md:w-6 mx-auto text-primary mb-1" />
              <p className="text-xs md:text-sm font-semibold">{b.text}</p>
              <p className="text-[10px] md:text-xs text-muted-foreground">{b.sub}</p>
            </Card>
          ))}
        </div>

        {/* Classifieds CTA */}
        <section className="px-4 py-4">
          <div className="gradient-primary rounded-2xl p-6 md:p-8 text-primary-foreground">
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
          </div>
        </section>
      </div>
    </CustomerLayout>
  );
}
