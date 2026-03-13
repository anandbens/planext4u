import { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { ArrowLeft, Filter, SlidersHorizontal, Star, Heart, Grid3X3, List } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const allProducts = Array.from({ length: 12 }, (_, i) => ({
  id: i + 1,
  title: ["Wireless Headphones", "Cotton T-Shirt", "Ceramic Vase", "Smart Watch", "Novel Collection", "Organic Honey", "LED Bulb Set", "Yoga Mat", "Dog Food Premium", "Running Shoes", "Bluetooth Speaker", "Silk Scarf"][i],
  price: [2499, 899, 1599, 4999, 1299, 599, 799, 1999, 2199, 3499, 1799, 1299][i],
  originalPrice: [3499, 1299, 1999, 6999, 1599, 799, 999, 2499, 2799, 4499, 2499, 1799][i],
  rating: [4.8, 4.5, 4.7, 4.3, 4.9, 4.6, 4.2, 4.4, 4.1, 4.7, 4.5, 4.8][i],
  reviews: [245, 189, 92, 328, 156, 78, 45, 112, 67, 201, 134, 89][i],
  vendor: ["TechMart", "FashionHub", "HomeDecor", "GadgetWorld", "BookStore+", "GreenGrocer", "TechMart", "FitLife", "PetCare", "SportsZone", "TechMart", "FashionHub"][i],
  category: ["Electronics", "Fashion", "Home", "Electronics", "Books", "Food", "Electronics", "Sports", "Pets", "Sports", "Electronics", "Fashion"][i],
  emoji: ["🎧", "👕", "🏺", "⌚", "📖", "🍯", "💡", "🧘", "🐕", "👟", "🔊", "🧣"][i],
  discount: [29, 31, 20, 29, 19, 25, 20, 20, 21, 22, 28, 28][i],
}));

export default function CustomerBrowsePage() {
  const [searchParams] = useSearchParams();
  const [sortBy, setSortBy] = useState("popular");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const categoryFilter = searchParams.get("category");

  const filtered = categoryFilter ? allProducts.filter((p) => p.category === categoryFilter) : allProducts;

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-30 bg-card/95 backdrop-blur-sm border-b border-border/50">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center gap-3">
          <Button variant="ghost" size="icon" asChild><Link to="/app"><ArrowLeft className="h-5 w-5" /></Link></Button>
          <h1 className="font-semibold">{categoryFilter || "All Products"}</h1>
          <span className="text-sm text-muted-foreground">({filtered.length} items)</span>
          <div className="ml-auto flex items-center gap-2">
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
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6">
        <div className={viewMode === "grid" ? "grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4" : "flex flex-col gap-3"}>
          {filtered.map((p) => (
            <Link to={`/app/product/${p.id}`} key={p.id}>
              <Card className={`overflow-hidden hover:shadow-md transition-shadow group ${viewMode === "list" ? "flex" : ""}`}>
                <div className={`bg-secondary/30 flex items-center justify-center text-4xl relative ${viewMode === "list" ? "w-32 h-32 shrink-0" : "h-40"}`}>
                  {p.emoji}
                  <Badge className="absolute top-2 left-2 bg-destructive text-destructive-foreground text-[10px] px-1.5 py-0">{p.discount}% OFF</Badge>
                </div>
                <div className="p-3 flex-1">
                  <p className="text-xs text-muted-foreground">{p.vendor}</p>
                  <h3 className="text-sm font-medium mt-0.5">{p.title}</h3>
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
      </main>
    </div>
  );
}
