import { useState, useEffect } from "react";
import { Link, useSearchParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Star, Heart, Grid3X3, List, ShoppingCart, MapPin, Clock, ChevronRight } from "lucide-react";
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

  const { data: products, isLoading } = useQuery({
    queryKey: ["browseProducts", categoryFilter, sortBy, searchFilter],
    queryFn: () => api.browseProducts({ category: categoryFilter, sort: sortBy, search: searchFilter }),
  });

  const { data: categories } = useQuery({ queryKey: ["categories"], queryFn: api.getCategories });

  useEffect(() => {
    api.getCart().then(items => setCartCount(items.reduce((s, i) => s + i.qty, 0)));
  }, []);

  const quickAdd = async (p: any) => {
    await api.addToCart(p, 1);
    setCartCount(prev => prev + 1);
    toast.success(`${p.title} added to cart`);
  };

  return (
    <CustomerLayout>
      <div className="max-w-7xl mx-auto px-4 py-4 pb-20 md:pb-6">
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

        {/* Category chips */}
        <div className="flex gap-2 overflow-x-auto pb-4 mb-2 scrollbar-hide">
          <Link to="/app/browse"><Badge variant={!categoryFilter ? "default" : "outline"} className="cursor-pointer whitespace-nowrap">All</Badge></Link>
          {categories?.map((c) => (
            <Link key={c.id} to={`/app/browse?category=${c.name}`}>
              <Badge variant={categoryFilter === c.name ? "default" : "outline"} className="cursor-pointer whitespace-nowrap">{c.image} {c.name}</Badge>
            </Link>
          ))}
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
                    <div className={`bg-secondary/30 flex items-center justify-center text-4xl relative ${viewMode === "list" ? "w-28 h-28 shrink-0" : "h-36"}`}>
                      {discountPct > 0 && <span className="absolute top-2 left-2 bg-primary/90 text-primary-foreground text-[9px] px-2 py-0.5 rounded-sm font-medium">{discountPct}% Off</span>}
                      {p.emoji}
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
