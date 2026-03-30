import { useState, useEffect } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Search, MapPin, Home, Building2, ChevronRight, Star, Heart, Shield, Filter, SlidersHorizontal, Bed, Bath, Maximize2, ChevronLeft, Wrench, Calculator, TrendingUp, Clock, X, MessageCircle, IndianRupee, Bookmark, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CustomerLayout } from "@/components/customer/CustomerLayout";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Slider } from "@/components/ui/slider";
import { Checkbox } from "@/components/ui/checkbox";

const PROPERTY_TYPE_LABELS: Record<string, string> = {
  apartment: "Apartment", independent_house: "Independent House", villa: "Villa",
  plot: "Plot", pg_hostel: "PG/Hostel", commercial_office: "Office",
  commercial_shop: "Shop", commercial_warehouse: "Warehouse", commercial_showroom: "Showroom",
};

const TRANSACTION_LABELS: Record<string, string> = {
  rent: "Rent", sale: "Buy", lease: "Lease", pg: "PG",
};

function formatPrice(price: number): string {
  if (price >= 10000000) return `₹${(price / 10000000).toFixed(1)} Cr`;
  if (price >= 100000) return `₹${(price / 100000).toFixed(1)} L`;
  if (price >= 1000) return `₹${(price / 1000).toFixed(0)}K`;
  return `₹${price.toLocaleString("en-IN")}`;
}

export default function PropertyHomePage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [transactionType, setTransactionType] = useState(searchParams.get("type") || "rent");
  const [searchCity, setSearchCity] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [budgetRange, setBudgetRange] = useState<number[]>([0, 50000000]);
  const [selectedBhk, setSelectedBhk] = useState<string[]>([]);
  const [selectedPropertyType, setSelectedPropertyType] = useState<string[]>([]);
  const [sortBy, setSortBy] = useState("newest");

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

  const filteredProperties = properties?.filter((p: any) => {
    if (searchCity && !p.city?.toLowerCase().includes(searchCity.toLowerCase()) && !p.locality?.toLowerCase().includes(searchCity.toLowerCase())) return false;
    if (p.price < budgetRange[0] || p.price > budgetRange[1]) return false;
    if (selectedBhk.length > 0 && !selectedBhk.includes(p.bhk)) return false;
    if (selectedPropertyType.length > 0 && !selectedPropertyType.includes(p.property_type)) return false;
    return true;
  }) || [];

  const sortedProperties = [...filteredProperties].sort((a, b) => {
    if (sortBy === "price_low") return a.price - b.price;
    if (sortBy === "price_high") return b.price - a.price;
    return 0;
  });

  const handleSearch = () => {
    if (!searchCity.trim()) return;
    navigate(`/app/find-home?type=${transactionType}&q=${encodeURIComponent(searchCity)}`);
  };

  // Home services links
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
        {/* Hero Section - NoBroker inspired */}
        <div className="bg-gradient-to-b from-warning/10 to-background">
          {/* Transaction Type Tabs */}
          <div className="px-4 pt-4">
            <div className="flex gap-2 justify-center">
              {(["rent", "sale", "pg"] as const).map((type) => (
                <button key={type} onClick={() => setTransactionType(type)}
                  className={`px-6 py-2.5 rounded-full text-sm font-semibold transition-all
                    ${transactionType === type
                      ? "bg-primary text-primary-foreground shadow-md"
                      : "bg-card border border-border/50 text-muted-foreground hover:border-primary/30"}`}>
                  {type === "rent" ? "Rent" : type === "sale" ? "Buy" : "PG"}
                </button>
              ))}
            </div>
          </div>

          {/* Search Section */}
          <div className="px-4 py-6">
            <div className="max-w-2xl mx-auto">
              <h1 className="text-xl md:text-3xl font-bold text-center mb-1">
                {transactionType === "rent" ? "Find Your Perfect Rental" : transactionType === "sale" ? "Find Your Dream Home" : "Find PG / Hostel"}
              </h1>
              <p className="text-sm text-muted-foreground text-center mb-4">100% Owner Properties | Zero Brokerage</p>
              <div className="flex gap-2">
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input placeholder="Search by city, locality, or landmark..." value={searchCity}
                    onChange={(e) => setSearchCity(e.target.value)} onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                    className="pl-10 h-12 rounded-xl text-sm" />
                </div>
                <Button onClick={handleSearch} className="h-12 px-6 rounded-xl">
                  <Search className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>

          {/* Popular Localities */}
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
              <div className="h-10 w-10 rounded-full bg-success/10 flex items-center justify-center"><Calculator className="h-5 w-5 text-success" /></div>
              <span className="text-[10px] font-medium text-center leading-tight">EMI Calculator</span>
            </Link>
            <Link to="/app/find-home?type=pg" className="flex flex-col items-center gap-2 p-3 rounded-xl border border-border/50 bg-card hover:shadow-md transition-all">
              <div className="h-10 w-10 rounded-full bg-warning/10 flex items-center justify-center"><Building2 className="h-5 w-5 text-warning" /></div>
              <span className="text-[10px] font-medium text-center leading-tight">Find PG</span>
            </Link>
            <Link to="/app/find-home/my-properties" className="flex flex-col items-center gap-2 p-3 rounded-xl border border-border/50 bg-card hover:shadow-md transition-all hidden md:flex">
              <div className="h-10 w-10 rounded-full bg-info/10 flex items-center justify-center"><TrendingUp className="h-5 w-5 text-info" /></div>
              <span className="text-[10px] font-medium text-center leading-tight">My Properties</span>
            </Link>
            <Link to="/app/find-home/saved" className="flex flex-col items-center gap-2 p-3 rounded-xl border border-border/50 bg-card hover:shadow-md transition-all hidden md:flex">
              <div className="h-10 w-10 rounded-full bg-destructive/10 flex items-center justify-center"><Heart className="h-5 w-5 text-destructive" /></div>
              <span className="text-[10px] font-medium text-center leading-tight">Saved</span>
            </Link>
            <Link to="/app/services" className="flex flex-col items-center gap-2 p-3 rounded-xl border border-border/50 bg-card hover:shadow-md transition-all hidden md:flex">
              <div className="h-10 w-10 rounded-full bg-accent flex items-center justify-center"><Wrench className="h-5 w-5 text-muted-foreground" /></div>
              <span className="text-[10px] font-medium text-center leading-tight">Home Services</span>
            </Link>
          </div>
        </div>

        {/* Home Services Scrollable */}
        <div className="px-4 py-2">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-base font-bold">Home Services</h2>
            <Link to="/app/services" className="text-xs text-primary font-medium flex items-center gap-0.5">See All <ChevronRight className="h-3 w-3" /></Link>
          </div>
          <div className="flex gap-3 overflow-x-auto scrollbar-hide pb-2">
            {homeServices.map((svc) => (
              <Link key={svc.label} to={svc.to} className="shrink-0 flex flex-col items-center gap-1.5 min-w-[64px]">
                <div className="h-14 w-14 rounded-full bg-card border border-border/50 flex items-center justify-center hover:shadow-md transition-all">
                  <span className="text-xl">{svc.icon}</span>
                </div>
                <span className="text-[10px] font-medium text-muted-foreground">{svc.label}</span>
              </Link>
            ))}
          </div>
        </div>

        {/* Filter Bar + Sort */}
        <div className="px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" className="h-8 text-xs gap-1" onClick={() => setShowFilters(!showFilters)}>
              <SlidersHorizontal className="h-3.5 w-3.5" /> Filters
            </Button>
            <span className="text-sm text-muted-foreground">{sortedProperties.length} properties found</span>
          </div>
          <Select value={sortBy} onValueChange={setSortBy}>
            <SelectTrigger className="w-[140px] h-8 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="newest">Newest First</SelectItem>
              <SelectItem value="oldest">Oldest First</SelectItem>
              <SelectItem value="price_low">Price: Low-High</SelectItem>
              <SelectItem value="price_high">Price: High-Low</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Filter Panel */}
        <AnimatePresence>
          {showFilters && (
            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }}
              className="px-4 overflow-hidden">
              <div className="bg-card rounded-xl border border-border/50 p-4 space-y-4 mb-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold">Filters</h3>
                  <button onClick={() => { setSelectedBhk([]); setSelectedPropertyType([]); setBudgetRange([0, 50000000]); }}
                    className="text-xs text-primary">Clear All</button>
                </div>

                {/* Budget */}
                <div>
                  <p className="text-xs font-medium mb-2">Budget: {formatPrice(budgetRange[0])} - {formatPrice(budgetRange[1])}</p>
                  <Slider value={budgetRange} onValueChange={setBudgetRange} min={0} max={transactionType === "rent" ? 200000 : 50000000}
                    step={transactionType === "rent" ? 1000 : 100000} className="w-full" />
                </div>

                {/* BHK */}
                <div>
                  <p className="text-xs font-medium mb-2">BHK</p>
                  <div className="flex gap-2 flex-wrap">
                    {["studio", "1", "2", "3", "4", "5+"].map((bhk) => (
                      <button key={bhk} onClick={() => setSelectedBhk(prev => prev.includes(bhk) ? prev.filter(b => b !== bhk) : [...prev, bhk])}
                        className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors
                          ${selectedBhk.includes(bhk) ? "bg-primary text-primary-foreground border-primary" : "border-border/50 hover:border-primary/30"}`}>
                        {bhk === "studio" ? "Studio" : `${bhk} BHK`}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Property Type */}
                <div>
                  <p className="text-xs font-medium mb-2">Property Type</p>
                  <div className="flex gap-2 flex-wrap">
                    {Object.entries(PROPERTY_TYPE_LABELS).map(([key, label]) => (
                      <button key={key} onClick={() => setSelectedPropertyType(prev => prev.includes(key) ? prev.filter(t => t !== key) : [...prev, key])}
                        className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors
                          ${selectedPropertyType.includes(key) ? "bg-primary text-primary-foreground border-primary" : "border-border/50 hover:border-primary/30"}`}>
                        {label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Property Listings */}
        <div className="px-4 space-y-3">
          {isLoading ? (
            Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-48 rounded-xl" />)
          ) : sortedProperties.length === 0 ? (
            <div className="text-center py-16">
              <Home className="h-16 w-16 text-muted-foreground/30 mx-auto mb-4" />
              <h3 className="text-lg font-bold">No Properties Found</h3>
              <p className="text-sm text-muted-foreground mt-1">Try adjusting your filters or search for a different location</p>
            </div>
          ) : (
            sortedProperties.map((property: any) => (
              <PropertyCard key={property.id} property={property} />
            ))
          )}
        </div>

        {/* Post Property CTA */}
        <div className="px-4 py-8">
          <div className="bg-gradient-to-r from-primary to-primary/80 rounded-2xl p-6 text-primary-foreground text-center">
            <h3 className="text-lg font-bold">Looking for Tenants / Buyers?</h3>
            <p className="text-sm opacity-80 mt-1">Post your property for FREE and get genuine leads</p>
            <Link to="/app/find-home/post">
              <Button variant="secondary" className="mt-4 rounded-full px-8">Post FREE Property Ad</Button>
            </Link>
          </div>
        </div>
      </div>
    </CustomerLayout>
  );
}

function PropertyCard({ property }: { property: any }) {
  const images = Array.isArray(property.images) ? property.images : [];
  const firstImage = images[0] || "/images/properties/apartment-2bhk.jpg";
  const amenities = Array.isArray(property.amenities) ? property.amenities : [];

  return (
    <Link to={`/app/find-home/${property.id}`}>
      <Card className="overflow-hidden hover:shadow-lg transition-all duration-300 group">
        <div className="flex flex-col sm:flex-row">
          {/* Image */}
          <div className="relative sm:w-64 h-44 sm:h-auto overflow-hidden shrink-0">
            <img src={firstImage} alt={property.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" loading="lazy" />
            <div className="absolute top-2 left-2 flex gap-1.5">
              <Badge className="bg-primary/90 text-primary-foreground text-[10px]">
                {TRANSACTION_LABELS[property.transaction_type] || "Rent"}
              </Badge>
              {property.is_verified && <Badge className="bg-success/90 text-success-foreground text-[10px]"><Shield className="h-2.5 w-2.5 mr-0.5" />Verified</Badge>}
            </div>
            {property.is_featured && <Badge className="absolute top-2 right-2 bg-warning/90 text-warning-foreground text-[10px]">Featured</Badge>}
            <button className="absolute bottom-2 right-2 h-8 w-8 rounded-full bg-card/80 flex items-center justify-center hover:bg-card transition-colors"
              onClick={(e) => { e.preventDefault(); toast.info("Saved to bookmarks"); }}>
              <Heart className="h-4 w-4 text-muted-foreground" />
            </button>
          </div>
          {/* Content */}
          <div className="flex-1 p-4">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-sm font-bold line-clamp-1">{property.title}</h3>
                <div className="flex items-center gap-1 mt-1 text-muted-foreground">
                  <MapPin className="h-3 w-3" />
                  <span className="text-xs">{property.locality}, {property.city}</span>
                </div>
              </div>
              <p className="text-base font-bold text-primary shrink-0 ml-2">{formatPrice(property.price)}
                {property.transaction_type === "rent" && <span className="text-xs font-normal text-muted-foreground">/mo</span>}
              </p>
            </div>

            {/* Key Details */}
            <div className="flex items-center gap-3 mt-3 text-xs text-muted-foreground">
              {property.bhk && (
                <span className="flex items-center gap-1"><Bed className="h-3 w-3" />{property.bhk === "studio" ? "Studio" : `${property.bhk} BHK`}</span>
              )}
              {property.area_sqft > 0 && (
                <span className="flex items-center gap-1"><Maximize2 className="h-3 w-3" />{property.area_sqft} sq.ft</span>
              )}
              <span className="capitalize">{property.furnishing?.replace("_", " ")}</span>
              <span className="capitalize">{PROPERTY_TYPE_LABELS[property.property_type]}</span>
            </div>

            {/* Amenities pills */}
            {amenities.length > 0 && (
              <div className="flex gap-1 mt-2 flex-wrap">
                {amenities.slice(0, 4).map((a: string) => (
                  <span key={a} className="px-2 py-0.5 rounded-full bg-secondary text-[9px] font-medium">{a}</span>
                ))}
                {amenities.length > 4 && <span className="text-[9px] text-muted-foreground">+{amenities.length - 4} more</span>}
              </div>
            )}

            {/* Footer */}
            <div className="flex items-center justify-between mt-3 pt-2 border-t border-border/30">
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <span className="capitalize">{property.posted_by}</span>
                <span>•</span>
                <span>{property.user_name}</span>
              </div>
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <Clock className="h-3 w-3" />
                <span>{new Date(property.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}</span>
              </div>
            </div>
          </div>
        </div>
      </Card>
    </Link>
  );
}
