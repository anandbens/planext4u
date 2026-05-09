import { useState, useMemo, useEffect } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Star, Clock, MapPin, Heart, SlidersHorizontal, Wrench, ChevronRight } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger, SheetFooter } from "@/components/ui/sheet";
import { Slider } from "@/components/ui/slider";
import { Skeleton } from "@/components/ui/skeleton";
import { CustomerLayout } from "@/components/customer/CustomerLayout";
import { api } from "@/lib/api";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { BannerAd } from "@/components/customer/BannerAd";
import { useAuth } from "@/lib/auth";
import { useCurrency } from "@/lib/country-context";
import { getCustomerAddressOwnerContext } from "@/lib/customer-address-auth";
import { getServiceImage } from "@/lib/service-image";
import { loadSelectedCoords, LOCATION_CHANGED_EVENT } from "@/components/customer/LocationModal";

function useServiceWishlist() {
  const getList = () => { try { return JSON.parse(localStorage.getItem('app_db_service_wishlist') || '[]'); } catch { return []; } };
  const [list, setList] = useState<string[]>(getList);
  const toggle = (id: string) => {
    const current = getList();
    const isIn = current.includes(id);
    const updated = isIn ? current.filter((s: string) => s !== id) : [...current, id];
    localStorage.setItem('app_db_service_wishlist', JSON.stringify(updated));
    setList(updated);
    window.dispatchEvent(new Event('wishlist-changed'));
    toast.success(isIn ? "Removed from wishlist" : "Service saved to wishlist");
  };
  return { list, toggle };
}

export default function CustomerServicesPage() {
  const [searchParams] = useSearchParams();
  const [sortBy, setSortBy] = useState("nearest");
  const categoryFilter = searchParams.get("category") || undefined;
  const { list: wishlist, toggle: toggleWishlist } = useServiceWishlist();
  const { customerUser } = useAuth();
  const { format: fmt } = useCurrency();
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number }>({ lat: 0, lng: 0 });
  const [radiusInfo, setRadiusInfo] = useState<string>("");

  // Filters
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [priceRange, setPriceRange] = useState<[number, number] | null>(null);
  const [minRating, setMinRating] = useState(0);
  const [availableOnly, setAvailableOnly] = useState(false);
  const [priceTouched, setPriceTouched] = useState(false);

  // Resolve user location: header coords → default address → GPS.
  useEffect(() => {
    let cancelled = false;
    const loadLocation = async () => {
      const headerCoords = loadSelectedCoords();
      if (headerCoords) {
        if (!cancelled) {
          setUserLocation({ lat: headerCoords.lat, lng: headerCoords.lng });
          setRadiusInfo("Showing services near your selected location");
        }
        return;
      }
      try {
        const { ownerIds } = await getCustomerAddressOwnerContext(customerUser);
        if (ownerIds.length) {
          const { data: addr } = await supabase
            .from('customer_addresses')
            .select('latitude, longitude')
            .in('customer_id', ownerIds)
            .eq('is_default', true)
            .maybeSingle();
          if (!cancelled && addr?.latitude && addr?.longitude) {
            setUserLocation({ lat: addr.latitude, lng: addr.longitude });
            setRadiusInfo("Showing services near your default address");
            return;
          }
        }
      } catch {}
      if (!cancelled && navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (pos) => !cancelled && setUserLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
          () => {},
        );
      }
    };
    loadLocation();
    const onLocChange = () => loadLocation();
    window.addEventListener(LOCATION_CHANGED_EVENT, onLocChange);
    window.addEventListener("storage", onLocChange);
    return () => {
      cancelled = true;
      window.removeEventListener(LOCATION_CHANGED_EVENT, onLocChange);
      window.removeEventListener("storage", onLocChange);
    };
  }, [customerUser]);

  const { data: services, isLoading } = useQuery({
    queryKey: ["browseServices", categoryFilter, sortBy, userLocation.lat, userLocation.lng],
    queryFn: () => api.browseServices({ category: categoryFilter, sort: sortBy, userLat: userLocation.lat, userLng: userLocation.lng }),
  });

  const { data: categories } = useQuery({
    queryKey: ["categories", "service"],
    queryFn: () => api.getCategories({ categoryType: 'service' }),
  });

  // Detect parent category & subcategories for the strip.
  // Deep-link support: categoryFilter may be a parent OR a subcategory name.
  const activeCategory = categories?.find((c) => c.name.toLowerCase() === (categoryFilter || "").toLowerCase());
  const parentOfActive = activeCategory?.parent_id
    ? (categories || []).find((c) => c.id === activeCategory.parent_id)
    : activeCategory;
  const subcategories = parentOfActive
    ? (categories || []).filter((c) => c.parent_id === parentOfActive.id)
    : [];
  const parentCategories = (categories || []).filter((c) => !c.parent_id);
  const activeParentName = parentOfActive?.name;
  const activeSubName = activeCategory?.parent_id ? activeCategory.name : null;

  // Today's day-of-week vendor availability lookup
  const todayDow = new Date().getDay();
  const vendorIds = useMemo(() => {
    const ids = new Set<string>();
    services?.forEach((s) => { if (s.vendor_id) ids.add(s.vendor_id); });
    return Array.from(ids);
  }, [services]);

  const { data: availabilityMap } = useQuery({
    queryKey: ["vendorAvailabilityToday", vendorIds, todayDow],
    queryFn: async () => {
      if (vendorIds.length === 0) return {};
      const { data } = await supabase
        .from("vendor_availability" as any)
        .select("vendor_id, is_available, time_slots")
        .in("vendor_id", vendorIds)
        .eq("day_of_week", todayDow);
      const map: Record<string, { is_available: boolean; time_slots: any[] }> = {};
      (data || []).forEach((row: any) => {
        map[row.vendor_id] = { is_available: row.is_available, time_slots: row.time_slots || [] };
      });
      return map;
    },
    enabled: vendorIds.length > 0,
  });

  // Local price + rating + availability filters on top of server-fetched list
  const maxPrice = useMemo(() => {
    const m = Math.max(0, ...((services || []).map((s: any) => Number(s.price) || 0)));
    return Math.max(1000, Math.ceil(m / 100) * 100);
  }, [services]);

  useEffect(() => {
    if (!priceTouched) setPriceRange([0, maxPrice]);
  }, [maxPrice, priceTouched]);

  const effectivePriceRange: [number, number] = priceRange ?? [0, maxPrice];

  const filteredServices = useMemo(() => {
    const [lo, hi] = effectivePriceRange;
    return (services || []).filter((s: any) => {
      const price = Number(s.price) || 0;
      if (price < lo || price > hi) return false;
      if ((Number(s.rating) || 0) < minRating) return false;
      if (availableOnly) {
        const avail = availabilityMap?.[s.vendor_id];
        if (avail && !avail.is_available) return false;
      }
      return true;
    });
  }, [services, effectivePriceRange, minRating, availableOnly, availabilityMap]);

  const priceFilterActive = priceTouched && (effectivePriceRange[0] > 0 || effectivePriceRange[1] < maxPrice);
  const activeFilterCount = (priceFilterActive ? 1 : 0) + (minRating > 0 ? 1 : 0) + (availableOnly ? 1 : 0);

  return (
    <CustomerLayout>
      <div className="max-w-7xl mx-auto px-4 py-4 pb-28 md:pb-6">
        {/* Header */}
        <div className="mb-3">
          <div className="flex items-baseline justify-between gap-2 min-w-0">
            <h1 className="text-xl font-bold truncate min-w-0 flex items-center gap-2">
              <Wrench className="h-5 w-5 text-primary" />
              {categoryFilter || "All Services"}
            </h1>
            <p className="text-xs text-muted-foreground shrink-0">
              {filteredServices.length} service{filteredServices.length === 1 ? '' : 's'}
            </p>
          </div>
          {radiusInfo && (
            <p className="text-[11px] text-muted-foreground mt-0.5 truncate">{radiusInfo}</p>
          )}
        </div>

        {/* Toolbar */}
        <div className="flex flex-wrap items-center gap-2 mb-4">
          <Sheet open={filtersOpen} onOpenChange={setFiltersOpen}>
            <SheetTrigger asChild>
              <Button variant="outline" size="sm" className="h-8 gap-1.5 text-xs">
                <SlidersHorizontal className="h-3.5 w-3.5" /> Filters
                {activeFilterCount > 0 && (
                  <span className="ml-0.5 h-4 w-4 rounded-full bg-primary text-primary-foreground text-[10px] flex items-center justify-center font-bold">
                    {activeFilterCount}
                  </span>
                )}
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-full sm:max-w-md overflow-y-auto">
              <SheetHeader><SheetTitle>Filter Services</SheetTitle></SheetHeader>
              <div className="space-y-6 mt-4">
                <div>
                  <h4 className="text-sm font-semibold mb-2">Price range</h4>
                  <Slider
                    min={0} max={maxPrice} step={50}
                    value={effectivePriceRange}
                    onValueChange={(v) => { setPriceTouched(true); setPriceRange([v[0], v[1]] as [number, number]); }}
                  />
                  <div className="flex justify-between mt-2 text-xs text-muted-foreground">
                    <span>{fmt(effectivePriceRange[0], { decimals: 0 })}</span>
                    <span>{fmt(effectivePriceRange[1], { decimals: 0 })}</span>
                  </div>
                </div>

                <div>
                  <h4 className="text-sm font-semibold mb-2">Minimum rating</h4>
                  <div className="flex gap-2">
                    {[0, 3, 4, 4.5].map((r) => (
                      <button key={r} onClick={() => setMinRating(r)}
                        className={`px-3 py-1.5 rounded-full text-xs border transition-colors ${minRating === r ? 'bg-primary text-primary-foreground border-primary' : 'border-border bg-card hover:bg-accent'}`}>
                        {r === 0 ? 'Any' : `${r}+`}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="flex items-center gap-2 text-sm">
                    <input type="checkbox" className="h-4 w-4 accent-primary"
                      checked={availableOnly} onChange={(e) => setAvailableOnly(e.target.checked)} />
                    Show only services available today
                  </label>
                </div>
              </div>
              <SheetFooter className="mt-6 flex-row gap-2">
                <Button variant="outline" className="flex-1" onClick={() => {
                  setPriceTouched(false); setPriceRange([0, maxPrice]); setMinRating(0); setAvailableOnly(false);
                }}>Reset</Button>
                <Button className="flex-1" onClick={() => setFiltersOpen(false)}>Apply</Button>
              </SheetFooter>
            </SheetContent>
          </Sheet>

          <Select value={sortBy} onValueChange={setSortBy}>
            <SelectTrigger className="w-36 h-8 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="nearest">Nearest First</SelectItem>
              <SelectItem value="popular">Most Popular</SelectItem>
              <SelectItem value="price_low">Price: Low to High</SelectItem>
              <SelectItem value="price_high">Price: High to Low</SelectItem>
              <SelectItem value="rating">Highest Rated</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Category chips (parents) */}
        <div className="flex gap-2.5 overflow-x-auto pb-3 mb-3 scrollbar-hide">
          <Link to="/app/services" className="shrink-0">
            <div className={`flex items-center gap-2 px-4 py-2 rounded-full border cursor-pointer whitespace-nowrap transition-colors
              ${!categoryFilter ? 'bg-primary text-primary-foreground border-primary' : 'border-border bg-card hover:bg-accent'}`}>
              <span className="text-sm font-medium">All</span>
            </div>
          </Link>
          {parentCategories.map((c) => (
            <Link key={c.id} to={`/app/services?category=${encodeURIComponent(c.name)}`} className="shrink-0">
              <div className={`flex items-center gap-2 px-4 py-2 rounded-full border cursor-pointer whitespace-nowrap transition-colors
                ${activeParentName === c.name ? 'bg-primary text-primary-foreground border-primary' : 'border-border bg-card hover:bg-accent'}`}>
                {c.image && (c.image.startsWith('/') || c.image.startsWith('http')) ? (
                  <img src={c.image} alt={c.name} className="h-6 w-6 rounded-full object-cover" />
                ) : (
                  <span className="text-base">{c.image || '🛠️'}</span>
                )}
                <span className="text-sm font-medium">{c.name}</span>
              </div>
            </Link>
          ))}
        </div>

        {/* Subcategory strip when a parent or subcategory is selected */}
        {subcategories.length > 0 && parentOfActive && (
          <section className="mb-5">
            <div className="flex items-center justify-between mb-2 px-1">
              <h2 className="text-sm md:text-base font-bold">Browse {parentOfActive.name} services</h2>
              {activeSubName && (
                <Link to={`/app/services?category=${encodeURIComponent(parentOfActive.name)}`} className="text-[11px] text-primary font-medium">
                  Clear
                </Link>
              )}
            </div>
            <div className="flex gap-3 overflow-x-auto scrollbar-hide pb-2">
              {subcategories.map((s) => {
                const isActive = activeSubName === s.name;
                return (
                  <Link key={s.id} to={`/app/services?category=${encodeURIComponent(s.name)}`} className="shrink-0">
                    <div className="flex flex-col items-center gap-1.5 min-w-[72px]">
                      <div className={`h-14 w-14 rounded-2xl flex items-center justify-center border-2 transition-all overflow-hidden ${isActive ? 'border-primary bg-primary/10' : 'border-border/50 bg-card hover:border-primary/40'}`}>
                        {s.image && (s.image.startsWith("/") || s.image.startsWith("http")) ? (
                          <img src={s.image} alt={s.name} className="h-9 w-9 rounded-lg object-cover" />
                        ) : (
                          <span className="text-xl">{s.image || "🛠️"}</span>
                        )}
                      </div>
                      <span className={`text-[11px] text-center leading-tight max-w-[72px] line-clamp-2 ${isActive ? 'text-primary font-semibold' : 'font-medium'}`}>
                        {s.name}
                      </span>
                    </div>
                  </Link>
                );
              })}
            </div>
          </section>
        )}

        {/* Service grid */}
        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-56 rounded-xl" />)}
          </div>
        ) : filteredServices.length === 0 ? (
          <div className="text-center py-16 text-sm text-muted-foreground">
            <Wrench className="h-10 w-10 mx-auto mb-3 opacity-40" />
            No services found in your area. Try adjusting filters or changing your location.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
            {filteredServices.map((s) => {
              const discountPct = s.discount ? Math.round((s.discount / s.price) * 100) : 0;
              const isWished = wishlist.includes(s.id);
              const vendorAvail = availabilityMap?.[s.vendor_id];
              const isAvailableToday = vendorAvail ? vendorAvail.is_available : true;
              return (
                <Card key={s.id} className={`overflow-hidden hover:shadow-md transition-all ${!isAvailableToday ? 'opacity-60' : ''}`}>
                  <Link to={`/app/service/${s.id}`}>
                    <div className="bg-gradient-to-br from-primary/15 to-secondary/30 h-32 flex items-center justify-center relative overflow-hidden">
                      <img
                        src={getServiceImage(s.title, s.image)}
                        alt={s.title}
                        className="w-full h-full object-cover"
                        loading="lazy"
                        onError={(e) => { (e.currentTarget as HTMLImageElement).src = getServiceImage(s.title, null); }}
                      />
                      {discountPct > 0 && <Badge className="absolute top-2 left-2 bg-destructive text-destructive-foreground text-[10px]">{discountPct}% OFF</Badge>}
                      <div className="absolute top-2 right-2 flex items-center gap-0.5 bg-card/90 px-1.5 py-0.5 rounded">
                        <Star className="h-2.5 w-2.5 fill-warning text-warning" />
                        <span className="text-[10px] font-medium">{s.rating || "New"}</span>
                      </div>
                      {!isAvailableToday && (
                        <Badge className="absolute bottom-2 left-2 bg-muted text-muted-foreground border-0 text-[10px]">Unavailable Today</Badge>
                      )}
                    </div>
                  </Link>
                  <div className="p-4 relative">
                    <button
                      onClick={(e) => { e.preventDefault(); e.stopPropagation(); toggleWishlist(s.id); }}
                      className="absolute -top-5 right-3 h-8 w-8 rounded-full bg-card shadow-md flex items-center justify-center hover:shadow-lg transition-shadow z-10 border border-border/50"
                    >
                      <Heart className={`h-4 w-4 ${isWished ? 'fill-destructive text-destructive' : 'text-muted-foreground'}`} />
                    </button>
                    <Link to={`/app/service/${s.id}`}>
                      <div className="flex items-center gap-2">
                        <p className="text-xs text-primary font-medium truncate">{s.vendor_name}</p>
                        {isAvailableToday ? (
                          <Badge variant="outline" className="text-[9px] h-4 px-1 border-success/50 text-success">Available</Badge>
                        ) : (
                          <Badge variant="outline" className="text-[9px] h-4 px-1 border-destructive/50 text-destructive">Unavailable</Badge>
                        )}
                      </div>
                      <h3 className="text-base font-semibold mt-0.5 line-clamp-2">{s.title}</h3>
                      <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{s.description}</p>
                      <div className="flex items-center gap-3 mt-3 text-xs text-muted-foreground flex-wrap">
                        <span className="flex items-center gap-1"><Star className="h-3 w-3 fill-warning text-warning" />{s.rating || 0} ({s.reviews || 0})</span>
                        {s.duration && <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{s.duration}</span>}
                        {s.service_area && <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{s.service_area}</span>}
                      </div>
                      <div className="flex items-center justify-between mt-2">
                        <div className="flex items-center gap-2">
                          <span className="text-lg font-bold">{fmt(s.price, { decimals: 0 })}</span>
                          {discountPct > 0 && <span className="text-sm text-muted-foreground line-through">{fmt(s.price + s.discount, { decimals: 0 })}</span>}
                        </div>
                        <ChevronRight className="h-4 w-4 text-muted-foreground" />
                      </div>
                    </Link>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>
      <div className="px-3 pt-2 pb-24 md:px-4 md:pt-3 md:pb-6">
        <BannerAd placement="services" />
      </div>
    </CustomerLayout>
  );
}
