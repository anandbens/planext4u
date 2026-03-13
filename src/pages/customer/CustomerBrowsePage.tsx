import { useState, useEffect, useRef } from "react";
import { Link, useSearchParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Star, Heart, Grid3X3, List, ShoppingCart, ChevronRight, ChevronLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { CustomerLayout } from "@/components/customer/CustomerLayout";
import { api, CartItem } from "@/lib/api";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";

export default function CustomerBrowsePage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [sortBy, setSortBy] = useState("popular");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const categoryFilter = searchParams.get("category") || undefined;
  const searchFilter = searchParams.get("search") || undefined;
  const [cartCount, setCartCount] = useState(0);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const { data: products, isLoading } = useQuery({
    queryKey: ["browseProducts", categoryFilter, sortBy, searchFilter],
    queryFn: () => api.browseProducts({ category: categoryFilter, sort: sortBy, search: searchFilter }),
  });

  const { data: categories } = useQuery({ queryKey: ["categories"], queryFn: api.getCategories });

  useEffect(() => {
    api.getCart().then(items => setCartCount(items.reduce((s, i) => s + i.qty, 0)));
  }, []);

  // Check scroll state for arrow indicators
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
      return () => {
        el.removeEventListener('scroll', checkScroll);
        window.removeEventListener('resize', checkScroll);
      };
    }
  }, [categories]);

  const scrollCategories = (direction: 'left' | 'right') => {
    const el = scrollRef.current;
    if (el) el.scrollBy({ left: direction === 'left' ? -200 : 200, behavior: 'smooth' });
  };

  const quickAdd = async (p: any) => {
    await api.addToCart(p, 1);
    setCartCount(prev => prev + 1);
    toast.success(`${p.title} added to cart`);
  };

  return (
    <CustomerLayout>
      <div className="max-w-7xl mx-auto px-4 py-4 pb-28 md:pb-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-xl font-bold">{categoryFilter || searchFilter || "All Products"}</h1>
            <p className="text-sm text-muted-foreground">{products?.length || 0} products</p>
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

        {/* Category chips with rounded background boxes and scroll arrows */}
        <div className="relative mb-4">
          {/* Left scroll arrow */}
          <AnimatePresence>
            {canScrollLeft && (
              <motion.button
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => scrollCategories('left')}
                className="absolute left-0 top-1/2 -translate-y-1/2 z-10 h-8 w-8 rounded-full bg-card border border-border shadow-md flex items-center justify-center hover:bg-accent transition-colors"
              >
                <ChevronLeft className="h-4 w-4" />
              </motion.button>
            )}
          </AnimatePresence>

          {/* Right scroll arrow */}
          <AnimatePresence>
            {canScrollRight && (
              <motion.button
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => scrollCategories('right')}
                className="absolute right-0 top-1/2 -translate-y-1/2 z-10 h-8 w-8 rounded-full bg-card border border-border shadow-md flex items-center justify-center hover:bg-accent transition-colors"
              >
                <ChevronRight className="h-4 w-4" />
              </motion.button>
            )}
          </AnimatePresence>

          <div ref={scrollRef} className="flex gap-3 overflow-x-auto pb-3 scrollbar-hide px-1 scroll-smooth">
            {/* All category */}
            <Link to="/app/browse" className="shrink-0">
              <div className={`flex flex-col items-center gap-1.5 min-w-[70px] transition-all`}>
                <div className={`h-14 w-14 rounded-2xl flex items-center justify-center border-2 transition-all
                  ${!categoryFilter ? 'bg-primary/10 border-primary shadow-sm' : 'bg-card border-border/50 hover:border-primary/30'}`}>
                  <span className="text-xl">📦</span>
                </div>
                <span className={`text-[11px] font-medium ${!categoryFilter ? 'text-primary font-semibold' : 'text-muted-foreground'}`}>All</span>
                {!categoryFilter && <div className="w-8 h-0.5 rounded-full bg-primary -mt-0.5" />}
              </div>
            </Link>
            {categories?.map((c) => (
              <Link key={c.id} to={`/app/browse?category=${c.name}`} className="shrink-0">
                <div className="flex flex-col items-center gap-1.5 min-w-[70px] transition-all">
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
                  {categoryFilter === c.name && <div className="w-8 h-0.5 rounded-full bg-primary -mt-0.5" />}
                </div>
              </Link>
            ))}
          </div>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-56 rounded-xl" />)}
          </div>
        ) : (
          <div className={viewMode === "grid" ? "grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3" : "flex flex-col gap-3"}>
            {products?.map((p) => {
              const discountPct = p.discount ? Math.round((p.discount / p.price) * 100) : 0;
              return (
                <Card key={p.id} className={`overflow-hidden hover:shadow-md transition-shadow group ${viewMode === "list" ? "flex" : ""}`}>
                  <Link to={`/app/product/${p.id}`} className={viewMode === "list" ? "flex flex-1" : "block"}>
                    <div className={`bg-secondary/30 flex items-center justify-center relative overflow-hidden ${viewMode === "list" ? "w-28 h-28 shrink-0" : "h-36"}`}>
                      {discountPct > 0 && <span className="absolute top-2 left-2 z-10 bg-primary/90 text-primary-foreground text-[9px] px-2 py-0.5 rounded-sm font-medium">{discountPct}% Off</span>}
                      {p.image ? (
                        <img src={p.image} alt={p.title} className="w-full h-full object-cover" />
                      ) : (
                        <span className="text-4xl">{p.emoji}</span>
                      )}
                      <button className="absolute top-2 right-2 h-7 w-7 rounded-full bg-card/80 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={(e) => { e.preventDefault(); }}>
                        <Heart className="h-3.5 w-3.5 text-muted-foreground" />
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
                  <div className="px-2.5 pb-2.5">
                    <Button size="sm" variant="outline" className="w-full h-7 text-xs" onClick={() => quickAdd(p)}>
                      Add to cart
                    </Button>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* Floating View Cart Bar */}
      <AnimatePresence>
        {cartCount > 0 && (
          <motion.div initial={{ y: 60, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 60, opacity: 0 }}
            className="fixed bottom-16 md:bottom-4 left-4 right-4 z-40 max-w-lg mx-auto">
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
    </CustomerLayout>
  );
}
