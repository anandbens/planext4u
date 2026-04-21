import { useState, useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Star, ShoppingCart, Zap, ChevronLeft, ChevronRight, SlidersHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Slider } from "@/components/ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger, SheetFooter } from "@/components/ui/sheet";
import { CustomerLayout } from "@/components/customer/CustomerLayout";
import { LoginPromptDialog } from "@/components/customer/LoginPromptDialog";
import { supabase } from "@/integrations/supabase/client";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { useCurrency } from "@/lib/country-context";
import { toast } from "sonner";

type Mode = "deals" | "trending";

const ITEMS_PER_PAGE = 12;

export default function CustomerListingPage({ mode }: { mode: Mode }) {
  const navigate = useNavigate();
  const { customerUser } = useAuth();
  const { format: fmt } = useCurrency();
  const isGuest = !customerUser;
  const [loginPromptOpen, setLoginPromptOpen] = useState(false);
  const [page, setPage] = useState(1);
  const [sortBy, setSortBy] = useState<string>(mode === "trending" ? "rating" : "discount");
  const [priceRange, setPriceRange] = useState<[number, number]>([0, 100000]);
  const [minRating, setMinRating] = useState(0);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [selectedAttrs, setSelectedAttrs] = useState<Record<string, string[]>>({});

  const title = mode === "deals" ? "Deals of the Day" : "Trending Products";
  const subtitle = mode === "deals" ? "Hand-picked deals you can't miss" : "Top-rated favourites loved by customers";

  const { data: products = [], isLoading } = useQuery({
    queryKey: [mode === "deals" ? "deals_all" : "trending_all"],
    queryFn: async () => {
      let q = supabase.from("products").select("*").eq("status", "active");
      if (mode === "deals") q = q.eq("is_deal_of_day", true);
      const { data } = await q;
      const list = (data || []) as any[];
      if (mode === "trending") {
        return list.sort((a, b) =>
          (Number(b.rating) || 0) - (Number(a.rating) || 0) ||
          (Number(b.reviews) || 0) - (Number(a.reviews) || 0)
        );
      }
      return list;
    },
  });

  const maxPrice = useMemo(() => {
    const m = Math.max(0, ...products.map((p: any) => Number(p.price) || 0));
    return Math.max(1000, Math.ceil(m / 100) * 100);
  }, [products]);

  // Aggregate available attributes across all products in the current set
  const availableAttrs = useMemo(() => {
    const map = new Map<string, { name: string; values: Set<string> }>();
    for (const p of products as any[]) {
      const attrs = Array.isArray(p.product_attributes) ? p.product_attributes : [];
      for (const a of attrs) {
        if (!a?.attribute_id || !Array.isArray(a.values)) continue;
        const entry = map.get(a.attribute_id) || { name: a.attribute_name || a.attribute_id, values: new Set<string>() };
        for (const v of a.values) if (v) entry.values.add(String(v));
        map.set(a.attribute_id, entry);
      }
    }
    return Array.from(map.entries()).map(([id, v]) => ({ id, name: v.name, values: Array.from(v.values).sort() }));
  }, [products]);

  const filtered = useMemo(() => {
    const activeAttrIds = Object.keys(selectedAttrs).filter((k) => (selectedAttrs[k] || []).length > 0);
    let list = products.filter((p: any) => {
      const price = Number(p.price) || 0;
      if (price < priceRange[0] || price > priceRange[1]) return false;
      if ((Number(p.rating) || 0) < minRating) return false;
      if (activeAttrIds.length > 0) {
        const productAttrs: any[] = Array.isArray(p.product_attributes) ? p.product_attributes : [];
        for (const aid of activeAttrIds) {
          const wanted = selectedAttrs[aid];
          const found = productAttrs.find((a) => a?.attribute_id === aid);
          const vals: string[] = found?.values || [];
          if (!wanted.some((w) => vals.includes(w))) return false;
        }
      }
      return true;
    });
    if (sortBy === "price_low") list = [...list].sort((a, b) => (a.price || 0) - (b.price || 0));
    else if (sortBy === "price_high") list = [...list].sort((a, b) => (b.price || 0) - (a.price || 0));
    else if (sortBy === "rating") list = [...list].sort((a, b) => (Number(b.rating) || 0) - (Number(a.rating) || 0));
    else if (sortBy === "discount") list = [...list].sort((a, b) => (Number(b.discount) || 0) - (Number(a.discount) || 0));
    return list;
  }, [products, priceRange, minRating, sortBy, selectedAttrs]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / ITEMS_PER_PAGE));
  const paginated = filtered.slice((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE);

  const quickAdd = async (p: any) => {
    if (isGuest) { setLoginPromptOpen(true); return; }
    const result = await api.addToCart(p, 1);
    if (result.blocked) { toast.error(result.message, { duration: 5000 }); return; }
    toast.success(`${p.title} added to cart`);
  };

  const buyNow = async (p: any) => {
    if (isGuest) { setLoginPromptOpen(true); return; }
    const result = await api.addToCart(p, 1);
    if (result.blocked) { toast.error(result.message, { duration: 5000 }); return; }
    navigate("/app/cart");
  };

  const activeAttrCount = Object.values(selectedAttrs).reduce((s, v) => s + (v?.length ? 1 : 0), 0);
  const activeFilters = (priceRange[0] > 0 ? 1 : 0) + (priceRange[1] < maxPrice ? 1 : 0) + (minRating > 0 ? 1 : 0) + activeAttrCount;

  return (
    <CustomerLayout>
      <div className="max-w-7xl mx-auto px-4 py-4 pb-44 md:pb-6">
        <div className="flex items-start justify-between mb-4 gap-3 flex-wrap">
          <div>
            <h1 className="text-xl font-bold">{title}</h1>
            <p className="text-sm text-muted-foreground">{filtered.length} product{filtered.length === 1 ? '' : 's'} · {subtitle}</p>
          </div>
          <div className="flex items-center gap-2">
            <Sheet open={filtersOpen} onOpenChange={setFiltersOpen}>
              <SheetTrigger asChild>
                <Button variant="outline" size="sm" className="h-9 gap-1.5">
                  <SlidersHorizontal className="h-3.5 w-3.5" /> Filters
                  {activeFilters > 0 && <span className="ml-1 h-5 w-5 rounded-full bg-primary text-primary-foreground text-[10px] flex items-center justify-center font-bold">{activeFilters}</span>}
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-full sm:max-w-md overflow-y-auto">
                <SheetHeader><SheetTitle>Filters</SheetTitle></SheetHeader>
                <ProductFilterPanel
                  priceRange={priceRange} setPriceRange={setPriceRange}
                  minRating={minRating} setMinRating={setMinRating}
                  maxPrice={maxPrice}
                  availableAttrs={availableAttrs}
                  selectedAttrs={selectedAttrs} setSelectedAttrs={setSelectedAttrs}
                />
                <SheetFooter className="mt-4 flex-row gap-2">
                  <Button variant="outline" className="flex-1" onClick={() => { setPriceRange([0, maxPrice]); setMinRating(0); setSelectedAttrs({}); setPage(1); }}>Reset</Button>
                  <Button className="flex-1" onClick={() => { setPage(1); setFiltersOpen(false); }}>Apply</Button>
                </SheetFooter>
              </SheetContent>
            </Sheet>
            <Select value={sortBy} onValueChange={(v) => { setSortBy(v); setPage(1); }}>
              <SelectTrigger className="w-36 h-9 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                {mode === "deals" && <SelectItem value="discount">Biggest Discount</SelectItem>}
                <SelectItem value="rating">Highest Rated</SelectItem>
                <SelectItem value="price_low">Price: Low to High</SelectItem>
                <SelectItem value="price_high">Price: High to Low</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-56 rounded-xl" />)}
          </div>
        ) : paginated.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <ShoppingCart className="h-16 w-16 text-muted-foreground/30 mb-4" />
            <h3 className="text-lg font-semibold mb-1">No products found</h3>
            <p className="text-sm text-muted-foreground max-w-xs">Try adjusting your filters to see more results.</p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
              {paginated.map((p: any) => {
                const discountPct = p.discount ? Math.round((p.discount / p.price) * 100) : 0;
                const isOutOfStock = p.stock !== undefined && p.stock !== null && p.stock <= 0;
                return (
                  <Card key={p.id} className="overflow-hidden hover:shadow-md transition-shadow flex flex-col">
                    <Link to={`/app/product/${p.id}`} className="flex-1 flex flex-col">
                      <div className="bg-secondary/30 flex items-center justify-center relative overflow-hidden h-36">
                        {discountPct > 0 && !isOutOfStock && <span className="absolute top-2 left-2 z-10 bg-primary/90 text-primary-foreground text-[9px] px-2 py-0.5 rounded-sm font-medium">{discountPct}% Off</span>}
                        {isOutOfStock && <span className="absolute top-2 left-2 z-10 bg-destructive/90 text-destructive-foreground text-[9px] px-2 py-0.5 rounded-sm font-medium">Out of Stock</span>}
                        {p.image ? (
                          <img src={p.image} alt={p.title} className={`w-full h-full object-cover ${isOutOfStock ? 'opacity-50' : ''}`} loading="lazy" />
                        ) : (
                          <span className="text-4xl">{p.emoji || '📦'}</span>
                        )}
                      </div>
                      <div className="p-2.5 flex-1">
                        <p className="text-[10px] text-muted-foreground truncate">{p.vendor_name}</p>
                        <h3 className="text-sm font-medium mt-0.5 truncate">{p.title}</h3>
                        <div className="flex items-center gap-1 mt-1">
                          <Star className="h-3 w-3 fill-warning text-warning" />
                          <span className="text-xs font-medium">{p.rating || 0}</span>
                          <span className="text-[10px] text-muted-foreground">({p.reviews || 0})</span>
                        </div>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-sm font-bold">{fmt(Number(p.price), { decimals: 0 })}</span>
                          {discountPct > 0 && <span className="text-xs text-muted-foreground line-through">{fmt(Number(p.price) + Number(p.discount), { decimals: 0 })}</span>}
                        </div>
                      </div>
                    </Link>
                    <div className="px-2.5 pb-2.5 flex gap-1.5 mt-auto">
                      <Button size="sm" variant="outline" className="flex-1 h-7 text-xs" onClick={() => quickAdd(p)} disabled={isOutOfStock}>
                        <ShoppingCart className="h-3 w-3 mr-1" /> Cart
                      </Button>
                      <Button size="sm" className="h-7 text-xs px-2" onClick={() => buyNow(p)} disabled={isOutOfStock}>
                        <Zap className="h-3 w-3 mr-1" /> Buy
                      </Button>
                    </div>
                  </Card>
                );
              })}
            </div>

            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-2 mt-6">
                <Button variant="outline" size="icon" className="h-8 w-8" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                  const pageNum = totalPages <= 5 ? i + 1 : page <= 3 ? i + 1 : page >= totalPages - 2 ? totalPages - 4 + i : page - 2 + i;
                  return (
                    <Button key={pageNum} variant={page === pageNum ? "default" : "outline"} size="sm" className="h-8 w-8 text-xs" onClick={() => setPage(pageNum)}>
                      {pageNum}
                    </Button>
                  );
                })}
                <Button variant="outline" size="icon" className="h-8 w-8" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            )}
          </>
        )}
      </div>
      <LoginPromptDialog open={loginPromptOpen} onOpenChange={setLoginPromptOpen} message="Please sign in to add items to your cart." />
    </CustomerLayout>
  );
}

export type AttrOption = { id: string; name: string; values: string[] };

export function ProductFilterPanel({
  priceRange, setPriceRange, minRating, setMinRating, maxPrice,
  availableAttrs = [], selectedAttrs = {}, setSelectedAttrs,
}: {
  priceRange: [number, number];
  setPriceRange: (v: [number, number]) => void;
  minRating: number;
  setMinRating: (v: number) => void;
  maxPrice: number;
  availableAttrs?: AttrOption[];
  selectedAttrs?: Record<string, string[]>;
  setSelectedAttrs?: (v: Record<string, string[]>) => void;
}) {
  const { format: fmt } = useCurrency();
  const toggleVal = (attrId: string, val: string) => {
    if (!setSelectedAttrs) return;
    const cur = selectedAttrs[attrId] || [];
    const next = cur.includes(val) ? cur.filter((v) => v !== val) : [...cur, val];
    setSelectedAttrs({ ...selectedAttrs, [attrId]: next });
  };

  return (
    <div className="space-y-6 mt-4">
      <div>
        <div className="flex items-center justify-between mb-3">
          <label className="text-sm font-semibold">Price range</label>
          <span className="text-xs text-muted-foreground">{fmt(priceRange[0], { decimals: 0 })} – {fmt(priceRange[1], { decimals: 0 })}</span>
        </div>
        <Slider
          min={0}
          max={maxPrice}
          step={Math.max(1, Math.round(maxPrice / 100))}
          value={priceRange}
          onValueChange={(v) => setPriceRange([v[0], v[1]] as [number, number])}
          className="mt-2"
        />
      </div>

      <div>
        <label className="text-sm font-semibold mb-3 block">Customer rating</label>
        <div className="grid grid-cols-2 gap-2">
          {[0, 3, 3.5, 4, 4.5].map((r) => (
            <button
              key={r}
              type="button"
              onClick={() => setMinRating(r)}
              className={`flex items-center justify-center gap-1 py-2 rounded-lg border text-xs font-medium transition-colors
                ${minRating === r ? 'border-primary bg-primary/10 text-primary' : 'border-border bg-card hover:border-primary/30'}`}
            >
              {r === 0 ? "All ratings" : (
                <>
                  <Star className="h-3 w-3 fill-warning text-warning" />
                  {r}+ & up
                </>
              )}
            </button>
          ))}
        </div>
      </div>

      {availableAttrs.length > 0 && setSelectedAttrs && (
        <div className="space-y-5">
          {availableAttrs.map((attr) => {
            const sel = selectedAttrs[attr.id] || [];
            return (
              <div key={attr.id}>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm font-semibold">{attr.name}</label>
                  {sel.length > 0 && (
                    <button type="button" className="text-[10px] text-muted-foreground hover:text-primary" onClick={() => setSelectedAttrs({ ...selectedAttrs, [attr.id]: [] })}>
                      Clear
                    </button>
                  )}
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {attr.values.map((v) => {
                    const active = sel.includes(v);
                    return (
                      <button
                        key={v}
                        type="button"
                        onClick={() => toggleVal(attr.id, v)}
                        className={`px-2.5 py-1 rounded-full border text-xs font-medium transition-colors
                          ${active ? 'border-primary bg-primary text-primary-foreground' : 'border-border bg-card hover:border-primary/40'}`}
                      >
                        {v}
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
