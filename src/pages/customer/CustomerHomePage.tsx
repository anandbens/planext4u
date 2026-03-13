import { useState } from "react";
import { Link } from "react-router-dom";
import { Search, ShoppingCart, User, MapPin, ChevronRight, Star, Heart, Percent } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const banners = [
  { id: 1, title: "Summer Sale — Up to 50% Off", subtitle: "On electronics, fashion & more", gradient: "from-primary to-primary/70" },
  { id: 2, title: "Free Delivery on First Order", subtitle: "Use code: WELCOME", gradient: "from-success to-success/70" },
];

const categories = [
  { name: "Electronics", icon: "⚡", count: 4520 },
  { name: "Fashion", icon: "👗", count: 3890 },
  { name: "Home", icon: "🏠", count: 2750 },
  { name: "Books", icon: "📚", count: 1820 },
  { name: "Food", icon: "🍕", count: 1450 },
  { name: "Services", icon: "🔧", count: 980 },
];

const featuredProducts = [
  { id: 1, title: "Wireless Headphones", price: 2499, originalPrice: 3499, rating: 4.8, reviews: 245, vendor: "TechMart", image: "🎧", discount: 29 },
  { id: 2, title: "Cotton T-Shirt Pack", price: 899, originalPrice: 1299, rating: 4.5, reviews: 189, vendor: "FashionHub", image: "👕", discount: 31 },
  { id: 3, title: "Ceramic Vase Set", price: 1599, originalPrice: 1999, rating: 4.7, reviews: 92, vendor: "HomeDecor", image: "🏺", discount: 20 },
  { id: 4, title: "Smart Watch Pro", price: 4999, originalPrice: 6999, rating: 4.3, reviews: 328, vendor: "GadgetWorld", image: "⌚", discount: 29 },
  { id: 5, title: "Novel Collection", price: 1299, originalPrice: 1599, rating: 4.9, reviews: 156, vendor: "BookStore+", image: "📖", discount: 19 },
  { id: 6, title: "Organic Honey", price: 599, originalPrice: 799, rating: 4.6, reviews: 78, vendor: "GreenGrocer", image: "🍯", discount: 25 },
];

export default function CustomerHomePage() {
  const [searchQuery, setSearchQuery] = useState("");

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-card/95 backdrop-blur-sm border-b border-border/50">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center gap-4">
          <Link to="/app" className="text-xl font-bold text-primary shrink-0">Marketplace</Link>
          <div className="flex-1 max-w-xl relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search products, vendors..." className="pl-9 bg-secondary/50 border-0" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" asChild><Link to="/app/cart"><ShoppingCart className="h-5 w-5" /></Link></Button>
            <Button variant="ghost" size="icon" asChild><Link to="/app/profile"><User className="h-5 w-5" /></Link></Button>
          </div>
        </div>
        <div className="max-w-7xl mx-auto px-4 pb-2 flex items-center gap-1 text-xs text-muted-foreground">
          <MapPin className="h-3 w-3" /> Mumbai, Andheri West
          <button className="text-primary ml-1 hover:underline">Change</button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6 space-y-8">
        {/* Banners */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {banners.map((b) => (
            <div key={b.id} className={`bg-gradient-to-r ${b.gradient} rounded-2xl p-6 text-primary-foreground`}>
              <h2 className="text-lg font-bold">{b.title}</h2>
              <p className="text-sm opacity-90 mt-1">{b.subtitle}</p>
              <Button size="sm" variant="secondary" className="mt-3">Shop Now</Button>
            </div>
          ))}
        </div>

        {/* Categories */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold">Browse Categories</h2>
            <button className="text-sm text-primary flex items-center gap-0.5 hover:underline">View All <ChevronRight className="h-4 w-4" /></button>
          </div>
          <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
            {categories.map((c) => (
              <Link to={`/app/browse?category=${c.name}`} key={c.name} className="bg-card rounded-xl border border-border/50 p-4 text-center hover:border-primary/30 transition-colors">
                <span className="text-2xl">{c.icon}</span>
                <p className="text-xs font-medium mt-2">{c.name}</p>
                <p className="text-[10px] text-muted-foreground">{c.count} items</p>
              </Link>
            ))}
          </div>
        </section>

        {/* Featured Products */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold">Featured Products</h2>
            <button className="text-sm text-primary flex items-center gap-0.5 hover:underline">View All <ChevronRight className="h-4 w-4" /></button>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            {featuredProducts.map((p) => (
              <Link to={`/app/product/${p.id}`} key={p.id}>
                <Card className="overflow-hidden hover:shadow-md transition-shadow group">
                  <div className="bg-secondary/30 h-36 flex items-center justify-center text-4xl relative">
                    {p.image}
                    <Badge className="absolute top-2 left-2 bg-destructive text-destructive-foreground text-[10px] px-1.5 py-0">{p.discount}% OFF</Badge>
                    <button className="absolute top-2 right-2 h-7 w-7 rounded-full bg-card/80 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                      <Heart className="h-3.5 w-3.5 text-muted-foreground" />
                    </button>
                  </div>
                  <div className="p-3">
                    <p className="text-xs text-muted-foreground">{p.vendor}</p>
                    <h3 className="text-sm font-medium mt-0.5 truncate">{p.title}</h3>
                    <div className="flex items-center gap-1 mt-1">
                      <Star className="h-3 w-3 fill-warning text-warning" />
                      <span className="text-xs font-medium">{p.rating}</span>
                      <span className="text-[10px] text-muted-foreground">({p.reviews})</span>
                    </div>
                    <div className="flex items-center gap-2 mt-1.5">
                      <span className="text-sm font-bold">₹{p.price.toLocaleString()}</span>
                      <span className="text-xs text-muted-foreground line-through">₹{p.originalPrice.toLocaleString()}</span>
                    </div>
                  </div>
                </Card>
              </Link>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}
