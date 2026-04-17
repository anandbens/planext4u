import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { foodApi, Restaurant } from "@/lib/food-api";
import { CustomerLayout } from "@/components/customer/CustomerLayout";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Search, Star, Clock, MapPin, Leaf } from "lucide-react";
import { loadSelectedCoords } from "@/components/customer/LocationModal";
import { formatDistance } from "@/lib/geo-utils";

export default function FoodHomePage() {
  const navigate = useNavigate();
  const [restaurants, setRestaurants] = useState<(Restaurant & { distance_km?: number | null })[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [vegOnly, setVegOnly] = useState(false);

  const coords = loadSelectedCoords();

  useEffect(() => {
    setLoading(true);
    foodApi.listRestaurants({ lat: coords?.lat, lng: coords?.lng, vegOnly })
      .then(setRestaurants).catch(() => setRestaurants([])).finally(() => setLoading(false));
  }, [vegOnly, coords?.lat, coords?.lng]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return restaurants;
    return restaurants.filter(r => r.name.toLowerCase().includes(q) || r.cuisine.some(c => c.toLowerCase().includes(q)));
  }, [restaurants, search]);

  return (
    <CustomerLayout>
      <div className="px-4 py-3 space-y-4 pb-24">
        <div>
          <h1 className="text-xl font-bold">Food near you</h1>
          <p className="text-xs text-muted-foreground">Order from your favourite restaurants</p>
        </div>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search restaurants or cuisines..." className="pl-9 h-11" />
        </div>

        <div className="flex gap-2 overflow-x-auto pb-1">
          <Button size="sm" variant={vegOnly ? "default" : "outline"} onClick={() => setVegOnly(v => !v)} className="shrink-0">
            <Leaf className="h-3.5 w-3.5 mr-1" /> Pure Veg
          </Button>
          {["Indian", "Chinese", "Italian", "Biryani", "Pizza", "Desserts"].map(c => (
            <Button key={c} size="sm" variant="outline" onClick={() => setSearch(c)} className="shrink-0">{c}</Button>
          ))}
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <div className="h-8 w-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-12 text-sm text-muted-foreground">No restaurants found</div>
        ) : (
          <div className="grid gap-3">
            {filtered.map(r => (
              <button key={r.id} onClick={() => navigate(`/app/food/restaurant/${r.id}`)}
                className="text-left rounded-2xl border border-border/60 overflow-hidden bg-card hover:border-primary/40 transition-colors">
                <div className="aspect-[16/9] bg-muted overflow-hidden">
                  {r.cover_image ? (
                    <img src={r.cover_image} alt={r.name} className="w-full h-full object-cover" loading="lazy" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-3xl font-bold text-muted-foreground">
                      {r.name.charAt(0)}
                    </div>
                  )}
                </div>
                <div className="p-3 space-y-1.5">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <h3 className="font-semibold truncate">{r.name}</h3>
                      <p className="text-xs text-muted-foreground truncate">{r.cuisine.join(" • ")}</p>
                    </div>
                    <Badge className="bg-success text-success-foreground shrink-0">
                      <Star className="h-3 w-3 mr-1 fill-current" /> {r.rating || "New"}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    <span className="inline-flex items-center gap-1"><Clock className="h-3 w-3" /> {r.avg_prep_minutes} min</span>
                    {r.distance_km != null && (
                      <span className="inline-flex items-center gap-1"><MapPin className="h-3 w-3" /> {formatDistance(r.distance_km)}</span>
                    )}
                    {r.veg_only && <Badge variant="outline" className="text-success border-success">Pure Veg</Badge>}
                    {r.status !== 'open' && <Badge variant="destructive">Closed</Badge>}
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </CustomerLayout>
  );
}
