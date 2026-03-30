import { useState, useRef } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Search, MapPin, Home, Building2, ChevronRight, ChevronLeft, Star, Heart, Shield, SlidersHorizontal, Bed, Bath, Maximize2, Clock, X, MessageCircle, IndianRupee, Bookmark, Save, Wrench, Calculator, TrendingUp, Eye, Share2, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CustomerLayout } from "@/components/customer/CustomerLayout";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Slider } from "@/components/ui/slider";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth";

const PROPERTY_IMAGES = [
  "https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=600&h=400&fit=crop",
  "https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=600&h=400&fit=crop",
  "https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=600&h=400&fit=crop",
  "https://images.unsplash.com/photo-1484154218962-a197022b5858?w=600&h=400&fit=crop",
  "https://images.unsplash.com/photo-1493809842364-78817add7ffb?w=600&h=400&fit=crop",
  "https://images.unsplash.com/photo-1560185893-a55cbc8c57e8?w=600&h=400&fit=crop",
  "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=600&h=400&fit=crop",
  "https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=600&h=400&fit=crop",
  "https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?w=600&h=400&fit=crop",
  "https://images.unsplash.com/photo-1571939228382-b2f2b585ce15?w=600&h=400&fit=crop",
];

const PROPERTY_TYPE_LABELS: Record<string, string> = {
  apartment: "Apartment", independent_house: "Independent House", villa: "Villa",
  plot: "Plot", pg_hostel: "PG/Hostel", commercial_office: "Office",
  commercial_shop: "Shop", commercial_warehouse: "Warehouse", commercial_showroom: "Showroom",
};

const TRANSACTION_LABELS: Record<string, string> = { rent: "Rent", sale: "Buy", lease: "Lease", pg: "PG" };

function formatPrice(price: number): string {
  if (price >= 10000000) return `₹${(price / 10000000).toFixed(1)} Cr`;
  if (price >= 100000) return `₹${(price / 100000).toFixed(1)} L`;
  if (price >= 1000) return `₹${(price / 1000).toFixed(0)}K`;
  return `₹${price.toLocaleString("en-IN")}`;
}

function getPropertyImages(property: any, index: number = 0): string[] {
  const dbImages = Array.isArray(property.images) ? property.images.filter(Boolean) : [];
  if (dbImages.length >= 3) return dbImages;
  // Fill with realistic house images based on index for variety
  const offset = (index * 3) % PROPERTY_IMAGES.length;
  const fallbacks = [
    PROPERTY_IMAGES[offset % PROPERTY_IMAGES.length],
    PROPERTY_IMAGES[(offset + 1) % PROPERTY_IMAGES.length],
    PROPERTY_IMAGES[(offset + 2) % PROPERTY_IMAGES.length],
    PROPERTY_IMAGES[(offset + 3) % PROPERTY_IMAGES.length],
    PROPERTY_IMAGES[(offset + 4) % PROPERTY_IMAGES.length],
  ];
  return [...dbImages, ...fallbacks].slice(0, 5);
}

// NoBroker-style Filter Modal
function FilterModal({ open, onClose, filters, setFilters, transactionType }: {
  open: boolean; onClose: () => void;
  filters: any; setFilters: (f: any) => void;
  transactionType: string;
}) {
  const [local, setLocal] = useState({ ...filters });

  const toggleArr = (key: string, val: string) => {
    setLocal((p: any) => ({
      ...p,
      [key]: p[key]?.includes(val) ? p[key].filter((v: string) => v !== val) : [...(p[key] || []), val],
    }));
  };

  const isSelected = (key: string, val: string) => local[key]?.includes(val);

  const maxBudget = transactionType === 'rent' ? 500000 : 50000000;
  const budgetStep = transactionType === 'rent' ? 1000 : 100000;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto p-0">
        <DialogHeader className="sticky top-0 z-10 bg-card border-b border-border/30 p-4 flex flex-row items-center justify-between">
          <button onClick={() => setLocal({ bhk: [], propertyType: [], availability: [], tenant: [], furnishing: [], parking: [], budget: [0, maxBudget] })} className="text-muted-foreground"><X className="h-4 w-4" /></button>
          <DialogTitle className="text-base font-bold">FILTER BY</DialogTitle>
          <button onClick={onClose}><X className="h-5 w-5" /></button>
        </DialogHeader>

        <div className="p-4 space-y-6">
          <div>
            <h4 className="text-sm font-bold mb-3">BHK Type</h4>
            <div className="grid grid-cols-3 gap-2">
              {["1 RK", "1 BHK", "2 BHK", "3 BHK", "4 BHK", "4+ BHK"].map(bhk => (
                <button key={bhk} onClick={() => toggleArr('bhk', bhk)}
                  className={`py-2.5 rounded-lg text-sm font-medium border transition-colors ${isSelected('bhk', bhk) ? 'bg-primary text-primary-foreground border-primary' : 'border-border bg-card hover:border-primary/30'}`}>
                  {bhk}
                </button>
              ))}
            </div>
          </div>

          <div>
            <h4 className="text-sm font-bold mb-3">
              {transactionType === 'rent' ? 'Rent' : 'Price'} Range: {formatPrice(local.budget?.[0] || 0)} to {formatPrice(local.budget?.[1] || maxBudget)}
            </h4>
            <Slider value={local.budget || [0, maxBudget]} onValueChange={(v) => setLocal((p: any) => ({ ...p, budget: v }))}
              min={0} max={maxBudget} step={budgetStep} className="w-full" />
          </div>

          <div>
            <h4 className="text-sm font-bold mb-3">Availability</h4>
            <div className="grid grid-cols-2 gap-2">
              {["Immediate", "Within 15 Days", "Within 30 Days", "After 30 Days"].map(a => (
                <button key={a} onClick={() => toggleArr('availability', a)}
                  className={`py-2.5 rounded-lg text-sm font-medium border transition-colors ${isSelected('availability', a) ? 'bg-primary text-primary-foreground border-primary' : 'border-border bg-card hover:border-primary/30'}`}>
                  {a}
                </button>
              ))}
            </div>
          </div>

          {transactionType === 'rent' && (
            <div>
              <h4 className="text-sm font-bold mb-3">Preferred Tenants</h4>
              <div className="grid grid-cols-2 gap-2">
                {["Family", "Bachelor Male", "Company", "Bachelor Female"].map(t => (
                  <button key={t} onClick={() => toggleArr('tenant', t)}
                    className={`py-2.5 rounded-lg text-sm font-medium border transition-colors ${isSelected('tenant', t) ? 'bg-primary text-primary-foreground border-primary' : 'border-border bg-card hover:border-primary/30'}`}>
                    {t}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div>
            <h4 className="text-sm font-bold mb-3">Furnishing</h4>
            <div className="grid grid-cols-3 gap-2">
              {["Full", "Semi", "None"].map(f => (
                <button key={f} onClick={() => toggleArr('furnishing', f)}
                  className={`py-2.5 rounded-lg text-sm font-medium border transition-colors ${isSelected('furnishing', f) ? 'bg-primary text-primary-foreground border-primary' : 'border-border bg-card hover:border-primary/30'}`}>
                  {f}
                </button>
              ))}
            </div>
          </div>

          <div>
            <h4 className="text-sm font-bold mb-3">Parking</h4>
            <div className="grid grid-cols-2 gap-2">
              {["2 Wheeler", "4 Wheeler"].map(p => (
                <button key={p} onClick={() => toggleArr('parking', p)}
                  className={`py-2.5 rounded-lg text-sm font-medium border transition-colors ${isSelected('parking', p) ? 'bg-primary text-primary-foreground border-primary' : 'border-border bg-card hover:border-primary/30'}`}>
                  {p}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="sticky bottom-0 bg-card border-t border-border/30 p-4">
          <Button className="w-full rounded-lg" onClick={() => { setFilters(local); onClose(); }}>
            Apply Filters
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default function PropertyHomePage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { customerUser } = useAuth();
  const [transactionType, setTransactionType] = useState(searchParams.get("type") || "rent");
  const [searchCity, setSearchCity] = useState(searchParams.get("q") || "");
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [filters, setFilters] = useState<any>({ bhk: [], propertyType: [], availability: [], tenant: [], furnishing: [], parking: [], budget: [0, 50000000] });
  const [sortBy, setSortBy] = useState("newest");

  const [searchFocused, setSearchFocused] = useState(false);
  const { data: searchSuggestions = [] } = useQuery({
    queryKey: ['property-search-suggest', searchCity],
    queryFn: async () => {
      if (searchCity.length < 2) return [];
      const [{ data: localities }, { data: cities }] = await Promise.all([
        supabase.from('property_localities').select('id, name, city').ilike('name', `%${searchCity}%`).eq('status', 'active').limit(5),
        supabase.from('cities').select('id, name, state').ilike('name', `%${searchCity}%`).eq('status', 'active').limit(3),
      ]);
      return [
        ...(localities || []).map((l: any) => ({ type: 'locality', label: `${l.name}, ${l.city}`, value: l.name })),
        ...(cities || []).map((c: any) => ({ type: 'city', label: `${c.name}, ${c.state}`, value: c.name })),
      ];
    },
    enabled: searchCity.length >= 2 && searchFocused,
  });

  const { data: properties, isLoading } = useQuery({
    queryKey: ["properties", transactionType, sortBy],
    queryFn: async () => {
      let query = supabase.from("properties" as any).select("*").eq("status", "active");
      if (transactionType) query = query.eq("transaction_type", transactionType);
      const { data } = await query.order("created_at", { ascending: sortBy === "oldest" });
      return (data || []) as any[];
    },
  });

  const { data: localities } = useQuery({
    queryKey: ["popularLocalities"],
    queryFn: async () => {
      const { data } = await supabase.from("property_localities" as any).select("*").eq("is_popular", true).eq("status", "active");
      return (data || []) as any[];
    },
  });

  const maxBudget = transactionType === 'rent' ? 500000 : 50000000;
  const filteredProperties = properties?.filter((p: any) => {
    if (searchCity && !p.city?.toLowerCase().includes(searchCity.toLowerCase()) && !p.locality?.toLowerCase().includes(searchCity.toLowerCase()) && !p.title?.toLowerCase().includes(searchCity.toLowerCase())) return false;
    const [bMin, bMax] = filters.budget || [0, maxBudget];
    if (p.price < bMin || p.price > bMax) return false;
    if (filters.bhk?.length > 0) {
      const bhkMap: Record<string, string[]> = { "1 RK": ["studio"], "1 BHK": ["1"], "2 BHK": ["2"], "3 BHK": ["3"], "4 BHK": ["4"], "4+ BHK": ["5", "5+", "6"] };
      const allowed = filters.bhk.flatMap((b: string) => bhkMap[b] || []);
      if (!allowed.includes(p.bhk)) return false;
    }
    if (filters.furnishing?.length > 0) {
      const fMap: Record<string, string> = { "Full": "fully_furnished", "Semi": "semi_furnished", "None": "unfurnished" };
      const allowed = filters.furnishing.map((f: string) => fMap[f]);
      if (!allowed.includes(p.furnishing)) return false;
    }
    if (filters.tenant?.length > 0 && p.preferred_tenant) {
      if (!filters.tenant.some((t: string) => p.preferred_tenant?.toLowerCase().includes(t.toLowerCase()))) return false;
    }
    return true;
  }) || [];

  const sortedProperties = [...filteredProperties].sort((a, b) => {
    if (sortBy === "price_low") return a.price - b.price;
    if (sortBy === "price_high") return b.price - a.price;
    return 0;
  });

  const activeFilterCount = [filters.bhk, filters.furnishing, filters.tenant, filters.availability, filters.parking]
    .reduce((sum, arr) => sum + (arr?.length || 0), 0) + ((filters.budget?.[0] > 0 || filters.budget?.[1] < maxBudget) ? 1 : 0);

  const handleSaveSearch = async () => {
    const userId = customerUser?.customer_id || customerUser?.id;
    if (!userId) { toast.info("Login to save searches"); navigate("/app/login"); return; }
    const name = `${transactionType === "sale" ? "Buy" : transactionType.charAt(0).toUpperCase() + transactionType.slice(1)}${searchCity ? ` in ${searchCity}` : ""}`;
    await supabase.from("saved_searches" as any).insert({ user_id: userId, name, filters: { ...filters, transaction_type: transactionType, city: searchCity } } as any);
    toast.success("Search saved! You'll get alerts for new matches.");
  };

  const homeServices = [
    { icon: "🔧", label: "Plumbing", to: "/app/services?category=Plumbing" },
    { icon: "⚡", label: "Electrician", to: "/app/services?category=Electrical" },
    { icon: "🧹", label: "Cleaning", to: "/app/services?category=Cleaning" },
    { icon: "🎨", label: "Painting", to: "/app/services?category=Painting" },
    { icon: "🔑", label: "Locksmith", to: "/app/services?category=Locksmith" },
    { icon: "🪲", label: "Pest Control", to: "/app/services?category=Pest%20Control" },
  ];

  return (
    <CustomerLayout>
      <div className="max-w-7xl mx-auto pb-24 md:pb-6">
        {/* Hero */}
        <div className="bg-gradient-to-b from-warning/10 to-background">
          <div className="px-4 pt-4">
            <div className="flex gap-2 justify-center">
              {(["rent", "sale", "pg"] as const).map((type) => (
                <button key={type} onClick={() => setTransactionType(type)}
                  className={`px-6 py-2.5 rounded-full text-sm font-semibold transition-all ${transactionType === type ? "bg-primary text-primary-foreground shadow-md" : "bg-card border border-border/50 text-muted-foreground hover:border-primary/30"}`}>
                  {type === "rent" ? "Rent" : type === "sale" ? "Buy" : "PG"}
                </button>
              ))}
            </div>
          </div>

          <div className="px-4 py-6">
            <div className="max-w-2xl mx-auto">
              <h1 className="text-xl md:text-3xl font-bold text-center mb-1">
                {transactionType === "rent" ? "Find Your Perfect Rental" : transactionType === "sale" ? "Find Your Dream Home" : "Find PG / Hostel"}
              </h1>
              <p className="text-sm text-muted-foreground text-center mb-4">100% Owner Properties | Zero Brokerage</p>
              <div className="relative">
                <div className="flex gap-2">
                  <div className="flex-1 relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input placeholder="Search by city, locality, or landmark..." value={searchCity}
                      onChange={(e) => setSearchCity(e.target.value)}
                      onFocus={() => setSearchFocused(true)}
                      onBlur={() => setTimeout(() => setSearchFocused(false), 200)}
                      className="pl-10 h-12 rounded-xl text-sm" />
                    {searchCity && <button className="absolute right-3 top-1/2 -translate-y-1/2" onClick={() => setSearchCity("")}><X className="h-4 w-4 text-muted-foreground" /></button>}
                  </div>
                  <Button onClick={() => setSearchFocused(false)} className="h-12 px-6 rounded-xl"><Search className="h-4 w-4" /></Button>
                </div>
                {searchFocused && searchSuggestions.length > 0 && (
                  <div className="absolute top-full left-0 right-0 mt-1 bg-card rounded-xl border border-border shadow-lg z-50 max-h-60 overflow-y-auto">
                    {searchSuggestions.map((s: any, i: number) => (
                      <button key={i} className="flex items-center gap-3 px-4 py-3 w-full hover:bg-muted/50 text-left border-b border-border/10 last:border-0"
                        onMouseDown={(e) => { e.preventDefault(); setSearchCity(s.value); setSearchFocused(false); }}>
                        <MapPin className="h-4 w-4 text-muted-foreground shrink-0" />
                        <div>
                          <p className="text-sm font-medium">{s.label}</p>
                          <p className="text-[10px] text-muted-foreground capitalize">{s.type}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {localities && localities.length > 0 && (
            <div className="px-4 pb-4">
              <div className="flex gap-2 overflow-x-auto scrollbar-hide">
                {localities.map((loc: any) => (
                  <button key={loc.id} onClick={() => setSearchCity(loc.name)}
                    className="shrink-0 px-3 py-1.5 rounded-full text-xs font-medium border border-primary/20 bg-card hover:bg-primary/5 text-primary transition-colors">
                    <MapPin className="h-3 w-3 inline mr-1" />{loc.name}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Quick Actions */}
        <div className="px-4 py-4">
          <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
            <Link to="/app/find-home/post" className="flex flex-col items-center gap-2 p-3 rounded-xl border border-border/50 bg-card hover:shadow-md transition-all">
              <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center"><Home className="h-5 w-5 text-primary" /></div>
              <span className="text-[10px] font-medium text-center leading-tight">Post Property</span>
            </Link>
            <Link to="/app/find-home/emi" className="flex flex-col items-center gap-2 p-3 rounded-xl border border-border/50 bg-card hover:shadow-md transition-all">
              <div className="h-10 w-10 rounded-full bg-emerald-500/10 flex items-center justify-center"><Calculator className="h-5 w-5 text-emerald-600" /></div>
              <span className="text-[10px] font-medium text-center leading-tight">EMI Calculator</span>
            </Link>
            <Link to="/app/find-home/rent-tracker" className="flex flex-col items-center gap-2 p-3 rounded-xl border border-border/50 bg-card hover:shadow-md transition-all">
              <div className="h-10 w-10 rounded-full bg-amber-500/10 flex items-center justify-center"><IndianRupee className="h-5 w-5 text-amber-600" /></div>
              <span className="text-[10px] font-medium text-center leading-tight">Rent Tracker</span>
            </Link>
            <Link to="/app/find-home/value-estimator" className="flex flex-col items-center gap-2 p-3 rounded-xl border border-border/50 bg-card hover:shadow-md transition-all">
              <div className="h-10 w-10 rounded-full bg-blue-500/10 flex items-center justify-center"><TrendingUp className="h-5 w-5 text-blue-600" /></div>
              <span className="text-[10px] font-medium text-center leading-tight">Value Estimator</span>
            </Link>
            <Link to="/app/find-home/messages" className="flex flex-col items-center gap-2 p-3 rounded-xl border border-border/50 bg-card hover:shadow-md transition-all">
              <div className="h-10 w-10 rounded-full bg-accent flex items-center justify-center"><MessageCircle className="h-5 w-5 text-muted-foreground" /></div>
              <span className="text-[10px] font-medium text-center leading-tight">Messages</span>
            </Link>
            <Link to="/app/find-home/saved-searches" className="flex flex-col items-center gap-2 p-3 rounded-xl border border-border/50 bg-card hover:shadow-md transition-all">
              <div className="h-10 w-10 rounded-full bg-destructive/10 flex items-center justify-center"><Bookmark className="h-5 w-5 text-destructive" /></div>
              <span className="text-[10px] font-medium text-center leading-tight">Saved Searches</span>
            </Link>
          </div>
          <div className="grid grid-cols-3 gap-3 mt-3">
            <Link to="/app/find-home/my-properties" className="flex flex-col items-center gap-2 p-3 rounded-xl border border-border/50 bg-card hover:shadow-md transition-all">
              <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center"><Home className="h-5 w-5 text-primary" /></div>
              <span className="text-[10px] font-medium text-center leading-tight">My Properties</span>
            </Link>
            <Link to="/app/find-home/saved" className="flex flex-col items-center gap-2 p-3 rounded-xl border border-border/50 bg-card hover:shadow-md transition-all">
              <div className="h-10 w-10 rounded-full bg-destructive/10 flex items-center justify-center"><Heart className="h-5 w-5 text-destructive" /></div>
              <span className="text-[10px] font-medium text-center leading-tight">Saved Properties</span>
            </Link>
            <Link to="/app/services" className="flex flex-col items-center gap-2 p-3 rounded-xl border border-border/50 bg-card hover:shadow-md transition-all">
              <div className="h-10 w-10 rounded-full bg-accent flex items-center justify-center"><Wrench className="h-5 w-5 text-muted-foreground" /></div>
              <span className="text-[10px] font-medium text-center leading-tight">Home Services</span>
            </Link>
          </div>
        </div>

        {/* Home Services */}
        <div className="px-4 py-2">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-base font-bold">Home Services</h2>
            <Link to="/app/services" className="text-xs text-primary font-medium flex items-center gap-0.5">See All <ChevronRight className="h-3 w-3" /></Link>
          </div>
          <div className="flex gap-3 overflow-x-auto scrollbar-hide pb-2">
            {homeServices.map((svc) => (
              <Link key={svc.label} to={svc.to} className="shrink-0 flex flex-col items-center gap-1.5 min-w-[64px]">
                <div className="h-14 w-14 rounded-full bg-card border border-border/50 flex items-center justify-center hover:shadow-md transition-all"><span className="text-xl">{svc.icon}</span></div>
                <span className="text-[10px] font-medium text-muted-foreground">{svc.label}</span>
              </Link>
            ))}
          </div>
        </div>

        {/* Filter Bar */}
        <div className="px-4 py-3 flex items-center justify-between sticky top-0 z-20 bg-background border-b border-border/20">
          <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide">
            <Button variant="outline" size="sm" className="h-8 text-xs gap-1 shrink-0 relative" onClick={() => setShowFilterModal(true)}>
              <SlidersHorizontal className="h-3.5 w-3.5" /> Filters
              {activeFilterCount > 0 && <span className="ml-1 h-4 w-4 rounded-full bg-primary text-primary-foreground text-[10px] flex items-center justify-center">{activeFilterCount}</span>}
            </Button>
            {filters.bhk?.map((b: string) => (
              <Badge key={b} variant="secondary" className="shrink-0 text-[10px] gap-1">
                {b} <X className="h-3 w-3 cursor-pointer" onClick={() => setFilters((p: any) => ({ ...p, bhk: p.bhk.filter((v: string) => v !== b) }))} />
              </Badge>
            ))}
            {filters.furnishing?.map((f: string) => (
              <Badge key={f} variant="secondary" className="shrink-0 text-[10px] gap-1">
                {f} <X className="h-3 w-3 cursor-pointer" onClick={() => setFilters((p: any) => ({ ...p, furnishing: p.furnishing.filter((v: string) => v !== f) }))} />
              </Badge>
            ))}
            <Button variant="ghost" size="sm" className="h-8 text-xs gap-1 text-primary shrink-0" onClick={handleSaveSearch}>
              <Save className="h-3.5 w-3.5" /> Save
            </Button>
          </div>
          <Select value={sortBy} onValueChange={setSortBy}>
            <SelectTrigger className="w-[130px] h-8 text-xs shrink-0"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="newest">Newest First</SelectItem>
              <SelectItem value="oldest">Oldest First</SelectItem>
              <SelectItem value="price_low">Price: Low-High</SelectItem>
              <SelectItem value="price_high">Price: High-Low</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="px-4 py-1 text-sm text-muted-foreground">{sortedProperties.length} properties found</div>

        {/* Property Listings */}
        <div className="px-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {isLoading ? (
            Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-48 rounded-xl" />)
          ) : sortedProperties.length === 0 ? (
            <div className="text-center py-16">
              <Home className="h-16 w-16 text-muted-foreground/30 mx-auto mb-4" />
              <h3 className="text-lg font-bold">No Properties Found</h3>
              <p className="text-sm text-muted-foreground mt-1">Try adjusting your filters or search for a different location</p>
              <Button variant="outline" className="mt-4" onClick={() => { setFilters({ bhk: [], propertyType: [], availability: [], tenant: [], furnishing: [], parking: [], budget: [0, 50000000] }); setSearchCity(""); }}>
                Clear All Filters
              </Button>
            </div>
          ) : (
            sortedProperties.map((property: any, idx: number) => <PropertyCard key={property.id} property={property} index={idx} />)
          )}
        </div>

        {/* Post Property CTA */}
        <div className="px-4 py-8">
          <div className="bg-gradient-to-r from-primary to-primary/80 rounded-2xl p-6 text-primary-foreground text-center">
            <h3 className="text-lg font-bold">Looking for Tenants / Buyers?</h3>
            <p className="text-sm opacity-80 mt-1">Post your property for FREE and get genuine leads</p>
            <Link to="/app/find-home/post"><Button variant="secondary" className="mt-4 rounded-full px-8">Post FREE Property Ad</Button></Link>
          </div>
        </div>

        <FilterModal open={showFilterModal} onClose={() => setShowFilterModal(false)} filters={filters} setFilters={setFilters} transactionType={transactionType} />
      </div>
    </CustomerLayout>
  );
}

function PropertyCard({ property, index }: { property: any; index: number }) {
  const navigate = useNavigate();
  const images = getPropertyImages(property, index);
  const [imgIdx, setImgIdx] = useState(0);
  const scrollRef = useRef<HTMLDivElement>(null);
  const furnishingLabel = property.furnishing === 'fully_furnished' ? 'Full Furnished' : property.furnishing === 'semi_furnished' ? 'Semi Furnished' : 'Unfurnished';

  const scrollToImage = (idx: number) => {
    setImgIdx(idx);
    if (scrollRef.current) {
      const child = scrollRef.current.children[idx] as HTMLElement;
      child?.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
    }
  };

  const handleScroll = () => {
    if (!scrollRef.current) return;
    const scrollLeft = scrollRef.current.scrollLeft;
    const width = scrollRef.current.offsetWidth;
    const newIdx = Math.round(scrollLeft / width);
    if (newIdx !== imgIdx) setImgIdx(newIdx);
  };

  return (
    <Card className="overflow-hidden hover:shadow-lg transition-all duration-300">
      {/* Interest badge */}
      <div className="relative">
        <div className="absolute top-3 left-3 z-10 bg-black/70 text-white text-[10px] px-2.5 py-1 rounded-full flex items-center gap-1">
          <Eye className="h-3 w-3" /> {property.views_count || Math.floor(Math.random() * 15 + 3)} people interested
        </div>
        {/* Wishlist & Share */}
        <div className="absolute top-3 right-3 z-10 flex flex-col gap-2">
          <button className="h-8 w-8 rounded-full bg-white/80 flex items-center justify-center" onClick={(e) => { e.stopPropagation(); toast.success("Saved to wishlist"); }}>
            <Heart className="h-4 w-4 text-muted-foreground" />
          </button>
          <button className="h-8 w-8 rounded-full bg-white/80 flex items-center justify-center" onClick={(e) => { e.stopPropagation(); navigator.share?.({ url: window.location.origin + `/app/find-home/${property.id}`, title: property.title }).catch(() => { navigator.clipboard.writeText(window.location.origin + `/app/find-home/${property.id}`); toast.success("Link copied"); }); }}>
            <Share2 className="h-4 w-4 text-muted-foreground" />
          </button>
        </div>

        {/* NoBroker-style horizontal scrollable image carousel */}
        <div className="relative">
          <div
            ref={scrollRef}
            className="flex overflow-x-auto snap-x snap-mandatory scrollbar-hide h-52 cursor-pointer"
            onScroll={handleScroll}
            onClick={() => navigate(`/app/find-home/${property.id}`)}
          >
            {images.map((img: string, i: number) => (
              <div key={i} className="min-w-full h-full snap-center shrink-0">
                <img src={img} alt={`Property ${i + 1}`} className="w-full h-full object-cover" loading="lazy" />
              </div>
            ))}
          </div>
          {/* Prev/Next arrows */}
          {images.length > 1 && (
            <>
              {imgIdx > 0 && (
                <button className="absolute left-2 top-1/2 -translate-y-1/2 h-7 w-7 rounded-full bg-white/80 flex items-center justify-center shadow-sm z-10"
                  onClick={(e) => { e.stopPropagation(); scrollToImage(imgIdx - 1); }}>
                  <ChevronLeft className="h-4 w-4" />
                </button>
              )}
              {imgIdx < images.length - 1 && (
                <button className="absolute right-2 top-1/2 -translate-y-1/2 h-7 w-7 rounded-full bg-white/80 flex items-center justify-center shadow-sm z-10"
                  onClick={(e) => { e.stopPropagation(); scrollToImage(imgIdx + 1); }}>
                  <ChevronRight className="h-4 w-4" />
                </button>
              )}
            </>
          )}
          {/* Dot indicators */}
          {images.length > 1 && (
            <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1 z-10">
              {images.map((_, i) => (
                <div key={i} className={`h-1.5 rounded-full transition-all ${i === imgIdx ? 'w-4 bg-white' : 'w-1.5 bg-white/50'}`} />
              ))}
            </div>
          )}
        </div>

        {/* Tags */}
        {property.is_verified && (
          <div className="absolute bottom-2 left-3">
            <Badge className="bg-emerald-500 text-white text-[10px]">🏆 POSH SOCIETY</Badge>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-4 cursor-pointer" onClick={() => navigate(`/app/find-home/${property.id}`)}>
        <div className="flex items-start justify-between">
          <h3 className="text-base font-bold flex-1 line-clamp-2 pr-2">{property.title}</h3>
          <div className="text-right shrink-0">
            <p className="text-lg font-bold">{formatPrice(property.price)}</p>
            {property.maintenance_charges > 0 && <p className="text-xs text-muted-foreground">+{formatPrice(property.maintenance_charges)} 🔧</p>}
          </div>
        </div>

        <div className="flex items-center gap-1 mt-1 text-muted-foreground">
          <MapPin className="h-3 w-3 shrink-0" />
          <span className="text-xs truncate">{property.locality}{property.city ? `, ${property.city}` : ''}</span>
        </div>

        {/* Key details row */}
        <div className="flex items-center justify-around mt-3 py-2 border-t border-b border-border/20">
          <div className="flex flex-col items-center gap-0.5">
            <Bed className="h-4 w-4 text-muted-foreground" />
            <span className="text-xs">{furnishingLabel}</span>
          </div>
          <div className="flex flex-col items-center gap-0.5">
            <Maximize2 className="h-4 w-4 text-muted-foreground" />
            <span className="text-xs">{property.area_sqft || '—'} sqft</span>
          </div>
          <div className="flex flex-col items-center gap-0.5">
            <Users className="h-4 w-4 text-muted-foreground" />
            <span className="text-xs">{property.preferred_tenant || 'Anyone'}</span>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-between mt-3">
          <button className="flex items-center gap-1.5 text-xs text-muted-foreground border border-border/50 rounded-full px-3 py-1.5"
            onClick={(e) => { e.stopPropagation(); toast.info("Notes feature coming soon"); }}>
            📝 Add Notes
          </button>
          <Button size="sm" className="rounded-full px-6 bg-rose-500 hover:bg-rose-600 text-white"
            onClick={(e) => { e.stopPropagation(); navigate(`/app/find-home/${property.id}`); }}>
            Contact Owner
          </Button>
        </div>
      </div>

      {/* Chat banner */}
      <div className="bg-primary/5 border-t border-primary/10 px-4 py-2.5 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-emerald-500" />
          <span className="text-xs text-muted-foreground">Owner is available to Chat!</span>
        </div>
        <button className="text-xs font-semibold text-primary flex items-center gap-1"
          onClick={() => navigate(`/app/find-home/${property.id}`)}>
          Start chat <MessageCircle className="h-3.5 w-3.5" />
        </button>
      </div>
    </Card>
  );
}
