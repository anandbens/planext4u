import { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Star, Clock, MapPin } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { CustomerLayout } from "@/components/customer/CustomerLayout";
import { api } from "@/lib/api";

export default function CustomerServicesPage() {
  const [searchParams] = useSearchParams();
  const [sortBy, setSortBy] = useState("popular");
  const categoryFilter = searchParams.get("category") || undefined;

  const { data: services, isLoading } = useQuery({
    queryKey: ["browseServices", categoryFilter, sortBy],
    queryFn: () => api.browseServices({ category: categoryFilter, sort: sortBy }),
  });

  const { data: categories } = useQuery({
    queryKey: ["serviceCategories"],
    queryFn: api.getServiceCategories,
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

        {/* Category chips - scrollable, no overflow */}
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
              return (
                <Link to={`/app/service/${s.id}`} key={s.id}>
                  <Card className="overflow-hidden hover:shadow-md transition-all">
                    <div className="bg-gradient-to-br from-secondary/50 to-secondary/20 h-32 flex items-center justify-center relative overflow-hidden">
                      {s.image ? (
                        <img src={s.image} alt={s.title} className="w-full h-full object-cover" />
                      ) : (
                        <span className="text-5xl">{s.emoji}</span>
                      )}
                      {discountPct > 0 && <Badge className="absolute top-2 left-2 bg-destructive text-destructive-foreground text-[10px]">{discountPct}% OFF</Badge>}
                    </div>
                    <div className="p-4">
                      <p className="text-xs text-primary font-medium">{s.vendor_name}</p>
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
                    </div>
                  </Card>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </CustomerLayout>
  );
}
