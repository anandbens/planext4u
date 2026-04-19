import { useState, useMemo } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Star, Clock, MapPin, Heart } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { CustomerLayout } from "@/components/customer/CustomerLayout";
import { api } from "@/lib/api";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { BannerAd } from "@/components/customer/BannerAd";

function useServiceWishlist() {
  const getList = () => { try { return JSON.parse(localStorage.getItem('app_db_service_wishlist') || '[]'); } catch { return []; } };
  const [list, setList] = useState<string[]>(getList);
  const toggle = (id: string) => {
    const current = getList();
    const isIn = current.includes(id);
    const updated = isIn ? current.filter((s: string) => s !== id) : [...current, id];
    localStorage.setItem('app_db_service_wishlist', JSON.stringify(updated));
    setList(updated);
    toast.success(isIn ? "Removed from wishlist" : "Service saved to wishlist");
  };
  return { list, toggle };
}

export default function CustomerServicesPage() {
  const [searchParams] = useSearchParams();
  const [sortBy, setSortBy] = useState("popular");
  const categoryFilter = searchParams.get("category") || undefined;
  const { list: wishlist, toggle: toggleWishlist } = useServiceWishlist();

  const { data: services, isLoading } = useQuery({
    queryKey: ["browseServices", categoryFilter, sortBy],
    queryFn: () => api.browseServices({ category: categoryFilter, sort: sortBy }),
  });

  const { data: categories } = useQuery({
    queryKey: ["serviceCategories"],
    queryFn: api.getServiceCategories,
  });

  // Fetch vendor availability for today's day of week
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

  return (
    <CustomerLayout>
      <div className="max-w-7xl mx-auto px-4 py-6 pb-28 md:pb-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-xl font-bold">{categoryFilter || "All Services"}</h1>
            <p className="text-sm text-muted-foreground">{services?.length || 0} services available</p>
          </div>
          <Select value={sortBy} onValueChange={setSortBy}>
            <SelectTrigger className="w-40 h-9"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="popular">Most Popular</SelectItem>
              <SelectItem value="price_low">Price: Low to High</SelectItem>
              <SelectItem value="price_high">Price: High to Low</SelectItem>
              <SelectItem value="rating">Highest Rated</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex gap-2.5 overflow-x-auto pb-4 mb-4 scrollbar-hide">
          <Link to="/app/services" className="shrink-0">
            <div className={`flex items-center gap-2 px-4 py-2 rounded-full border cursor-pointer whitespace-nowrap transition-colors
              ${!categoryFilter ? 'bg-primary text-primary-foreground border-primary' : 'border-border bg-card hover:bg-accent'}`}>
              <span className="text-sm font-medium">All</span>
            </div>
          </Link>
          {categories?.map((c) => (
            <Link key={c.id} to={`/app/services?category=${c.name}`} className="shrink-0">
              <div className={`flex items-center gap-2 px-4 py-2 rounded-full border cursor-pointer whitespace-nowrap transition-colors
                ${categoryFilter === c.name ? 'bg-primary text-primary-foreground border-primary' : 'border-border bg-card hover:bg-accent'}`}>
                {c.image && (c.image.startsWith('/') || c.image.startsWith('http')) ? (
                  <img src={c.image} alt={c.name} className="h-6 w-6 rounded-full object-cover" />
                ) : (
                  <span className="text-base">{c.image}</span>
                )}
                <span className="text-sm font-medium">{c.name}</span>
              </div>
            </Link>
          ))}
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-56 rounded-xl" />)}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
            {services?.map((s) => {
              const discountPct = s.discount ? Math.round((s.discount / s.price) * 100) : 0;
              const isWished = wishlist.includes(s.id);
              const vendorAvail = availabilityMap?.[s.vendor_id];
              const isAvailableToday = vendorAvail ? vendorAvail.is_available : true; // default available if no data
              return (
                <Card key={s.id} className={`overflow-hidden hover:shadow-md transition-all ${!isAvailableToday ? 'opacity-60' : ''}`}>
                  <Link to={`/app/service/${s.id}`}>
                    <div className="bg-gradient-to-br from-secondary/50 to-secondary/20 h-32 flex items-center justify-center relative overflow-hidden">
                      {s.image ? (
                        <img src={s.image} alt={s.title} className="w-full h-full object-cover" />
                      ) : (
                        <span className="text-5xl">{s.emoji}</span>
                      )}
                      {discountPct > 0 && <Badge className="absolute top-2 left-2 bg-destructive text-destructive-foreground text-[10px]">{discountPct}% OFF</Badge>}
                      <div className="absolute top-2 left-2 flex items-center gap-0.5 bg-card/90 px-1.5 py-0.5 rounded ml-auto" style={discountPct > 0 ? { left: 'auto', right: '40px' } : { left: '8px' }}>
                        <Star className="h-2.5 w-2.5 fill-warning text-warning" />
                        <span className="text-[10px] font-medium">{s.rating}</span>
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
                        <p className="text-xs text-primary font-medium">{s.vendor_name}</p>
                        {isAvailableToday ? (
                          <Badge variant="outline" className="text-[9px] h-4 px-1 border-green-500/50 text-green-600">Available</Badge>
                        ) : (
                          <Badge variant="outline" className="text-[9px] h-4 px-1 border-destructive/50 text-destructive">Unavailable</Badge>
                        )}
                      </div>
                      <h3 className="text-base font-semibold mt-0.5">{s.title}</h3>
                      <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{s.description}</p>
                      <div className="flex items-center gap-3 mt-3 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1"><Star className="h-3 w-3 fill-warning text-warning" />{s.rating} ({s.reviews})</span>
                        <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{s.duration}</span>
                        <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{s.service_area}</span>
                      </div>
                      <div className="flex items-center gap-2 mt-2">
                        <span className="text-lg font-bold">₹{s.price.toLocaleString()}</span>
                        {discountPct > 0 && <span className="text-sm text-muted-foreground line-through">₹{(s.price + s.discount).toLocaleString()}</span>}
                      </div>
                    </Link>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>
      <div className="px-3 py-1 pb-24 md:px-4 md:py-3 md:pb-6">
        <BannerAd placement="services" />
      </div>
    </CustomerLayout>
  );
}
