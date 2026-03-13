import { useState } from "react";
import { useParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Star, MapPin, Phone, Mail, Clock, Shield, MessageCircle, Navigation, Search, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { CustomerLayout } from "@/components/customer/CustomerLayout";
import { api } from "@/lib/api";
import { MOCK_PRODUCTS, MOCK_VENDORS, MOCK_SERVICE_VENDORS, MOCK_CATEGORIES } from "@/lib/mockData";
import { toast } from "sonner";

export default function CustomerVendorPage() {
  const { id } = useParams();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [filterOpen, setFilterOpen] = useState(false);

  const allVendors = [...MOCK_VENDORS, ...MOCK_SERVICE_VENDORS];
  const vendor = allVendors.find(v => v.id === id) || MOCK_VENDORS[0];
  const vendorProducts = MOCK_PRODUCTS.filter(p => p.vendor_id === vendor.id && p.status === "active");

  const filteredProducts = vendorProducts.filter(p => {
    const matchSearch = !searchQuery || p.title.toLowerCase().includes(searchQuery.toLowerCase());
    const matchCategory = selectedCategory === "all" || p.category_name === selectedCategory;
    return matchSearch && matchCategory;
  });

  const categories = [...new Set(vendorProducts.map(p => p.category_name).filter(Boolean))];

  const addToCart = async (p: any) => {
    await api.addToCart(p, 1);
    toast.success(`${p.title} added to cart`);
  };

  return (
    <CustomerLayout>
      {/* Vendor Banner */}
      <div className="bg-secondary/20 h-40 md:h-56" />

      {/* Vendor Info Card */}
      <div className="max-w-6xl mx-auto px-4 -mt-16 relative z-10">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Vendor Profile */}
          <div className="md:col-span-2">
            <Card className="p-5">
              <div className="flex items-start gap-4">
                <div className="h-20 w-20 rounded-xl bg-primary/10 flex items-center justify-center text-3xl font-bold text-primary shrink-0">
                  {vendor.business_name?.charAt(0)}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h1 className="text-xl md:text-2xl font-bold">{vendor.business_name}</h1>
                    {vendor.status === "verified" && (
                      <Shield className="h-5 w-5 text-primary fill-primary/20" />
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
                    <Clock className="h-3.5 w-3.5" /> Seller Since 2025
                  </p>

                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mt-4 text-sm">
                    <div className="border-r border-border/50 pr-3">
                      <p className="text-xs text-muted-foreground">Owner</p>
                      <p className="font-semibold">{vendor.name}</p>
                    </div>
                    <div className="border-r border-border/50 pr-3">
                      <p className="text-xs text-muted-foreground">Business</p>
                      <p className="font-semibold">Electronics</p>
                    </div>
                    <div className="border-r border-border/50 pr-3">
                      <p className="text-xs text-muted-foreground">Categories Tag</p>
                      <p className="font-semibold text-xs">Mobile, Accessories, Speakers</p>
                    </div>
                    <div className="border-r border-border/50 pr-3">
                      <p className="text-xs text-muted-foreground">Delivery Info</p>
                      <p className="font-semibold text-xs">Delivery/Self-Pickup</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Rating</p>
                      <div className="flex items-center gap-1">
                        <Star className="h-3.5 w-3.5 fill-warning text-warning" />
                        <span className="font-semibold">{vendor.rating}/5</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </Card>
          </div>

          {/* Contact Details */}
          <Card className="p-5">
            <h3 className="font-bold text-sm mb-3">Contact Details</h3>
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-sm">
                <Phone className="h-4 w-4 text-primary" />
                <span>{vendor.mobile}</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Mail className="h-4 w-4 text-primary" />
                <span>{vendor.email}</span>
              </div>
              <div className="flex items-start gap-2 text-sm">
                <MapPin className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                <span>Nagamanaicken Palayam Road, Coimbatore - 641016</span>
              </div>
            </div>
            <div className="flex gap-2 mt-4">
              <Button size="sm" className="flex-1 gap-1 text-xs">
                <MessageCircle className="h-3.5 w-3.5" /> Send Message
              </Button>
              <Button size="sm" variant="outline" className="flex-1 gap-1 text-xs">
                <Navigation className="h-3.5 w-3.5" /> Directions
              </Button>
            </div>
          </Card>
        </div>
      </div>

      {/* Breadcrumb */}
      <div className="max-w-6xl mx-auto px-4 mt-4">
        <div className="flex items-center gap-1 text-xs text-muted-foreground">
          <Link to="/app" className="hover:text-foreground">Home</Link>
          <ChevronRight className="h-3 w-3" />
          <Link to="/app/browse" className="hover:text-foreground">Shop</Link>
          <ChevronRight className="h-3 w-3" />
          <span className="text-foreground font-medium">{vendor.business_name}</span>
        </div>
      </div>

      {/* Products Section */}
      <div className="max-w-6xl mx-auto px-4 py-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {/* Sidebar Filters */}
          <div className="hidden md:block">
            <Card className="p-4 space-y-3">
              {["CATEGORIES", "OFFERS", "RATING", "REVIEW"].map(item => (
                <button key={item} className="w-full text-left px-3 py-2 rounded-lg hover:bg-accent/50 text-sm font-medium flex items-center justify-between">
                  {item} <ChevronRight className="h-4 w-4 text-muted-foreground" />
                </button>
              ))}
            </Card>
          </div>

          {/* Products Grid */}
          <div className="md:col-span-3">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold">Seller Products</h2>
              <div className="relative w-48">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                <Input placeholder="Search..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
                  className="pl-8 h-9 text-sm" />
              </div>
            </div>

            {/* Category Tabs */}
            <div className="flex gap-2 overflow-x-auto pb-3 scrollbar-hide mb-4">
              <button onClick={() => setSelectedCategory("all")}
                className={`px-4 py-2 rounded-lg text-xs font-medium whitespace-nowrap flex items-center gap-1.5 transition-colors
                  ${selectedCategory === "all" ? "bg-primary text-primary-foreground" : "bg-secondary/50 hover:bg-secondary"}`}>
                All Product <span className="opacity-70">{vendorProducts.length} Items</span>
              </button>
              {categories.map(cat => (
                <button key={cat} onClick={() => setSelectedCategory(cat!)}
                  className={`px-4 py-2 rounded-lg text-xs font-medium whitespace-nowrap transition-colors
                    ${selectedCategory === cat ? "bg-primary text-primary-foreground" : "bg-secondary/50 hover:bg-secondary"}`}>
                  {cat} <span className="opacity-70">{vendorProducts.filter(p => p.category_name === cat).length} Items</span>
                </button>
              ))}
            </div>

            {/* Product Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
              {filteredProducts.map(p => {
                const discountPct = p.discount ? Math.round((p.discount / p.price) * 100) : 0;
                return (
                  <Link to={`/app/product/${p.id}`} key={p.id}>
                    <Card className="overflow-hidden hover:shadow-lg transition-all group">
                      <div className="h-36 md:h-44 bg-secondary/20 relative overflow-hidden">
                        {discountPct > 0 && (
                          <Badge className="absolute top-2 left-2 z-10 bg-success text-success-foreground text-[9px]">New Arrival</Badge>
                        )}
                        {p.image ? (
                          <img src={p.image} alt={p.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-4xl">{p.emoji}</div>
                        )}
                      </div>
                      <div className="p-3">
                        <h3 className="text-xs font-semibold truncate">{p.title}</h3>
                        <div className="flex items-center gap-1.5 mt-1">
                          <span className="text-xs text-muted-foreground">{p.category_name}</span>
                          <div className="flex items-center gap-0.5 ml-auto">
                            <Star className="h-3 w-3 fill-warning text-warning" />
                            <span className="text-xs font-medium">{p.rating}({p.reviews})</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 mt-1.5">
                          <span className="text-sm font-bold">₹{(p.price - (p.discount || 0)).toLocaleString()}</span>
                          {p.discount > 0 && <span className="text-[10px] text-muted-foreground line-through">₹{p.price.toLocaleString()}</span>}
                        </div>
                      </div>
                    </Card>
                  </Link>
                );
              })}
            </div>

            {filteredProducts.length === 0 && (
              <div className="text-center py-12 text-muted-foreground">
                <p className="text-sm">No products found</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </CustomerLayout>
  );
}
