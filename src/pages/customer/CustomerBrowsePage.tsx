import { useState, useEffect, useRef } from "react";
import { Link, useSearchParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Star, Heart, Grid3X3, List, ShoppingCart, ChevronRight, ChevronLeft, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { CustomerLayout } from "@/components/customer/CustomerLayout";
import { LoginPromptDialog } from "@/components/customer/LoginPromptDialog";
import { api, CartItem } from "@/lib/api";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { BannerAd } from "@/components/customer/BannerAd";
import { useAuth } from "@/lib/auth";
import { SubcategoryStrip } from "@/components/customer/SubcategoryStrip";
import { CategoryProductRow } from "@/components/customer/CategoryProductRow";

export default function CustomerBrowsePage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { customerUser } = useAuth();
  const isGuest = !customerUser;
  const [loginPromptOpen, setLoginPromptOpen] = useState(false);
  const [sortBy, setSortBy] = useState("popular");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 12;
  const categoryFilter = searchParams.get("category") || undefined;
  const searchFilter = searchParams.get("search") || undefined;
  const [cartCount, setCartCount] = useState(0);
  const [wishlist, setWishlist] = useState<string[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number }>({ lat: 0, lng: 0 });
  const [radiusInfo, setRadiusInfo] = useState<string>("");

  // Try to get customer's default address first, fallback to GPS
  useEffect(() => {
    const loadLocation = async () => {
      try {
        const { data: { user } } = await (await import("@/integrations/supabase/client")).supabase.auth.getUser();
        if (user) {
          const { data: addr } = await (await import("@/integrations/supabase/client")).supabase
            .from('customer_addresses')
            .select('latitude, longitude')
            .eq('customer_id', user.id)
            .eq('is_default', true)
            .maybeSingle();
          if (addr?.latitude && addr?.longitude) {
            setUserLocation({ lat: addr.latitude, lng: addr.longitude });
            setRadiusInfo("Showing results near your default address");
            return;
          }
        }
      } catch {}
      // Fallback to GPS
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (pos) => {
            setUserLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude });
            setRadiusInfo("Showing results near your location");
          },
          () => {}
        );
      }
    };
    loadLocation();
  }, []);

  const { data: products, isLoading } = useQuery({
    queryKey: ["browseProducts", categoryFilter, sortBy, searchFilter, userLocation.lat],
    queryFn: () => api.browseProducts({ category: categoryFilter, sort: sortBy, search: searchFilter, userLat: userLocation.lat, userLng: userLocation.lng }),
  });

  const { data: categories } = useQuery({ queryKey: ["categories"], queryFn: api.getCategories });

  useEffect(() => {
    api.getCart().then(items => setCartCount(items.reduce((s, i) => s + i.qty, 0)));
    try { setWishlist(JSON.parse(localStorage.getItem('app_db_wishlist') || '[]')); } catch { setWishlist([]); }
  }, []);

  const checkScroll = () => {
    const el = scrollRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 10);
    setCanScrollRight(el.scrollLeft < el.scrollWidth - el.clientWidth - 10);
  };

  useEffect(() => {
    checkScroll();
    const el = scrollRef.current;
    if (el) {
      el.addEventListener('scroll', checkScroll);
      window.addEventListener('resize', checkScroll);
      return () => { el.removeEventListener('scroll', checkScroll); window.removeEventListener('resize', checkScroll); };
    }
  }, [categories]);

  const scrollCategories = (direction: 'left' | 'right') => {
    const el = scrollRef.current;
    if (el) el.scrollBy({ left: direction === 'left' ? -200 : 200, behavior: 'smooth' });
  };

  const quickAdd = async (p: any) => {
    if (isGuest) { setLoginPromptOpen(true); return; }
    const result = await api.addToCart(p, 1);
    if (result.blocked) { toast.error(result.message, { duration: 5000 }); return; }
    setCartCount(prev => prev + 1);
    toast.success(`${p.title} added to cart`);
  };

  const toggleWishlist = (id: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (isGuest) { setLoginPromptOpen(true); return; }
    let wl = [...wishlist];
    if (wl.includes(id)) {
      wl = wl.filter(w => w !== id);
      toast.success("Removed from wishlist");
    } else {
      wl.push(id);
      toast.success("Added to wishlist ❤️");
    }
    setWishlist(wl);
    localStorage.setItem('app_db_wishlist', JSON.stringify(wl));
  };

  const buyNow = async (p: any, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (isGuest) { setLoginPromptOpen(true); return; }
    const result = await api.addToCart(p, 1);
    if (result.blocked) { toast.error(result.message, { duration: 5000 }); return; }
    navigate('/app/cart');
  };

  return (
    <CustomerLayout>
      <div className="max-w-7xl mx-auto px-4 py-4 pb-44 md:pb-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-xl font-bold">{categoryFilter || searchFilter || "All Products"}</h1>
            <p className="text-sm text-muted-foreground">{products?.length || 0} products{radiusInfo && ` · ${radiusInfo}`}</p>
          </div>
          <div className="flex items-center gap-2">
            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className="w-36 h-8 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="popular">Most Popular</SelectItem>
                <SelectItem value="price_low">Price: Low to High</SelectItem>
                <SelectItem value="price_high">Price: High to Low</SelectItem>
                <SelectItem value="rating">Highest Rated</SelectItem>
              </SelectContent>
            </Select>
            <Button variant={viewMode === "grid" ? "secondary" : "ghost"} size="icon" className="h-8 w-8" onClick={() => setViewMode("grid")}><Grid3X3 className="h-4 w-4" /></Button>
            <Button variant={viewMode === "list" ? "secondary" : "ghost"} size="icon" className="h-8 w-8" onClick={() => setViewMode("list")}><List className="h-4 w-4" /></Button>
          </div>
        </div>

        {/* Category chips */}
        <div className="relative mb-4">
          <AnimatePresence>
            {canScrollLeft && (
              <motion.button initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                onClick={() => scrollCategories('left')}
                className="absolute left-0 top-1/2 -translate-y-1/2 z-10 h-8 w-8 rounded-full bg-card border border-border shadow-md flex items-center justify-center hover:bg-accent transition-colors">
                <ChevronLeft className="h-4 w-4" />
              </motion.button>
            )}
          </AnimatePresence>
          <AnimatePresence>
            {canScrollRight && (
              <motion.button initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                onClick={() => scrollCategories('right')}
                className="absolute right-0 top-1/2 -translate-y-1/2 z-10 h-8 w-8 rounded-full bg-card border border-border shadow-md flex items-center justify-center hover:bg-accent transition-colors">
                <ChevronRight className="h-4 w-4" />
              </motion.button>
            )}
          </AnimatePresence>
          <div ref={scrollRef} className="flex gap-3 overflow-x-auto pb-3 scrollbar-hide px-1 scroll-smooth">
            <Link to="/app/browse" className="shrink-0">
              <div className="flex flex-col items-center gap-1.5 min-w-[70px]">
                <div className={`h-14 w-14 rounded-2xl flex items-center justify-center border-2 transition-all
                  ${!categoryFilter ? 'bg-primary/10 border-primary shadow-sm' : 'bg-card border-border/50 hover:border-primary/30'}`}>
                  <span className="text-xl">📦</span>
                </div>
                <span className={`text-[11px] font-medium ${!categoryFilter ? 'text-primary font-semibold' : 'text-muted-foreground'}`}>All</span>
              </div>
            </Link>
            {categories?.map((c) => (
              <Link key={c.id} to={`/app/browse?category=${c.name}`} className="shrink-0">
                <div className="flex flex-col items-center gap-1.5 min-w-[70px]">
                  <div className={`h-14 w-14 rounded-2xl flex items-center justify-center border-2 transition-all overflow-hidden
                    ${categoryFilter === c.name ? 'bg-primary/10 border-primary shadow-sm' : 'bg-card border-border/50 hover:border-primary/30'}`}>
                    {c.image && (c.image.startsWith('/') || c.image.startsWith('http')) ? (
                      <img src={c.image} alt={c.name} className="h-8 w-8 rounded-lg object-cover" />
                    ) : (
                      <span className="text-xl">{c.image || '📦'}</span>
                    )}
                  </div>
                  <span className={`text-[11px] font-medium text-center leading-tight max-w-[70px] truncate
                    ${categoryFilter === c.name ? 'text-primary font-semibold' : 'text-muted-foreground'}`}>{c.name}</span>
                </div>
              </Link>
            ))}
          </div>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-56 rounded-xl" />)}
          </div>
        ) : (() => {
          const totalPages = Math.ceil((products?.length || 0) / ITEMS_PER_PAGE);
          const paginated = products?.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE) || [];
          return (
            <>
              {paginated.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                  <ShoppingCart className="h-16 w-16 text-muted-foreground/30 mb-4" />
                  <h3 className="text-lg font-semibold mb-1">
                    {searchFilter ? "No results found" : "No products available"}
                  </h3>
                  <p className="text-sm text-muted-foreground max-w-xs">
                    {searchFilter
                      ? `We couldn't find any products matching "${searchFilter}". Try a different search term.`
                      : categoryFilter
                        ? "No products are available in this category yet. Check back later!"
                        : "No products are available in your area. Try changing your location."}
                  </p>
                </div>
              ) : (
              <div className={viewMode === "grid" ? "grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3" : "flex flex-col gap-3"}>
                {paginated.map((p) => {
                  const discountPct = p.discount ? Math.round((p.discount / p.price) * 100) : 0;
                  const isWished = wishlist.includes(p.id);
                  const isOutOfStock = (p as any).stock !== undefined && (p as any).stock !== null && (p as any).stock <= 0;
                  return (
                    <Card key={p.id} className={`overflow-hidden hover:shadow-md transition-shadow group flex flex-col ${viewMode === "list" ? "flex-row" : ""}`}>
                      <Link to={`/app/product/${p.id}`} className={`flex-1 flex ${viewMode === "list" ? "flex-row" : "flex-col"}`}>
                        <div className={`bg-secondary/30 flex items-center justify-center relative overflow-hidden ${viewMode === "list" ? "w-28 h-28 shrink-0" : "h-36"}`}>
                          {discountPct > 0 && !isOutOfStock && <span className="absolute top-2 left-2 z-10 bg-primary/90 text-primary-foreground text-[9px] px-2 py-0.5 rounded-sm font-medium">{discountPct}% Off</span>}
                          {isOutOfStock && <span className="absolute top-2 left-2 z-10 bg-destructive/90 text-destructive-foreground text-[9px] px-2 py-0.5 rounded-sm font-medium">Out of Stock</span>}
                          {(() => {
                            const allImages = [p.image, ...((p as any).images || [])].filter(Boolean);
                            if (allImages.length > 1) {
                              return (
                                <div className="relative w-full h-full">
                                  <img src={allImages[0]} alt={p.title} className={`w-full h-full object-cover ${isOutOfStock ? 'opacity-50' : ''}`} />
                                  <div className="absolute bottom-1 right-1 bg-card/80 text-[9px] font-medium px-1.5 py-0.5 rounded-full">{allImages.length} 📷</div>
                                </div>
                              );
                            }
                            return p.image ? (
                              <img src={p.image} alt={p.title} className={`w-full h-full object-cover ${isOutOfStock ? 'opacity-50' : ''}`} />
                            ) : (
                              <span className="text-4xl">{p.emoji}</span>
                            );
                          })()}
                          <button className="absolute top-2 right-2 h-7 w-7 rounded-full bg-card/80 flex items-center justify-center z-10"
                            onClick={(e) => toggleWishlist(p.id, e)}>
                            <Heart className={`h-3.5 w-3.5 ${isWished ? 'fill-destructive text-destructive' : 'text-muted-foreground'}`} />
                          </button>
                        </div>
                        <div className="p-2.5 flex-1">
                          <p className="text-[10px] text-muted-foreground">{p.vendor_name}</p>
                          <h3 className="text-sm font-medium mt-0.5 truncate">{p.title}</h3>
                          <div className="flex items-center gap-1 mt-1">
                            <Star className="h-3 w-3 fill-warning text-warning" />
                            <span className="text-xs font-medium">{p.rating}</span>
                            <span className="text-[10px] text-muted-foreground">({p.reviews})</span>
                          </div>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-sm font-bold">₹{p.price.toLocaleString()}</span>
                            {discountPct > 0 && <span className="text-xs text-muted-foreground line-through">₹{(p.price + p.discount).toLocaleString()}</span>}
                          </div>
                        </div>
                      </Link>
                      <div className="px-2.5 pb-2.5 flex gap-1.5 mt-auto">
                        <Button size="sm" variant="outline" className="flex-1 h-7 text-xs" onClick={() => quickAdd(p)} disabled={isOutOfStock}>
                          <ShoppingCart className="h-3 w-3 mr-1" /> {isOutOfStock ? 'Unavailable' : 'Cart'}
                        </Button>
                        <Button size="sm" className="h-7 text-xs px-2" onClick={(e) => buyNow(p, e as any)} disabled={isOutOfStock}>
                          <Zap className="h-3 w-3 mr-1" /> Buy
                        </Button>
                      </div>
                    </Card>
                  );
                })}
              </div>
              )}
              {totalPages > 1 && (
                <div className="flex items-center justify-center gap-2 mt-6">
                  <Button variant="outline" size="icon" className="h-8 w-8" disabled={currentPage <= 1}
                    onClick={() => setCurrentPage(p => p - 1)}>
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                    const pageNum = totalPages <= 5 ? i + 1 : currentPage <= 3 ? i + 1 : currentPage >= totalPages - 2 ? totalPages - 4 + i : currentPage - 2 + i;
                    return (
                      <Button key={pageNum} variant={currentPage === pageNum ? "default" : "outline"} size="sm"
                        className="h-8 w-8 text-xs" onClick={() => setCurrentPage(pageNum)}>
                        {pageNum}
                      </Button>
                    );
                  })}
                  <Button variant="outline" size="icon" className="h-8 w-8" disabled={currentPage >= totalPages}
                    onClick={() => setCurrentPage(p => p + 1)}>
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </>
          );
        })()}
      </div>

      {/* Floating View Cart Bar - above bottom nav */}
      <AnimatePresence>
        {cartCount > 0 && (
          <motion.div initial={{ y: 60, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 60, opacity: 0 }}
            className="fixed md:bottom-4 left-4 right-4 z-30 max-w-lg mx-auto"
            style={{ bottom: 'calc(env(safe-area-inset-bottom, 0px) + 5rem)' }}>
            <Button className="w-full h-12 rounded-2xl shadow-lg text-base gap-2 justify-between px-5" onClick={() => navigate('/app/cart')}>
              <div className="flex items-center gap-2">
                <ShoppingCart className="h-4 w-4" />
                <span className="font-semibold">View Cart</span>
              </div>
              <div className="flex items-center gap-2">
                <Badge className="bg-primary-foreground/20 text-primary-foreground border-0">{cartCount} Item{cartCount > 1 ? 's' : ''}</Badge>
                <ChevronRight className="h-4 w-4" />
              </div>
            </Button>
          </motion.div>
        )}
      </AnimatePresence>
      <div className="px-4 py-3 pb-44 md:pb-6">
        <BannerAd placement="products" />
      </div>
      <LoginPromptDialog open={loginPromptOpen} onOpenChange={setLoginPromptOpen} message="Please sign in to add items to your cart." />
    </CustomerLayout>
  );
}
