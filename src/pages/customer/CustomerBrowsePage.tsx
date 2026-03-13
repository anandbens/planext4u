import { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Star, Heart, Grid3X3, List } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { api } from "@/lib/api";

export default function CustomerBrowsePage() {
  const [searchParams] = useSearchParams();
  const [sortBy, setSortBy] = useState("popular");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const categoryFilter = searchParams.get("category") || undefined;

  const { data: products, isLoading } = useQuery({
    queryKey: ["browseProducts", categoryFilter, sortBy],
    queryFn: () => api.browseProducts({ category: categoryFilter, sort: sortBy }),
  });

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-30 bg-card/95 backdrop-blur-sm border-b border-border/50">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center gap-3">
          <Button variant="ghost" size="icon" asChild><Link to="/app"><ArrowLeft className="h-5 w-5" /></Link></Button>
          <h1 className="font-semibold">{categoryFilter || "All Products"}</h1>
          <span className="text-sm text-muted-foreground">({products?.length || 0} items)</span>
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
        {isLoading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-56 rounded-xl" />)}
          </div>
        ) : (
          <div className={viewMode === "grid" ? "grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4" : "flex flex-col gap-3"}>
            {products?.map((p) => {
              const discountPct = p.discount ? Math.round((p.discount / p.price) * 100) : 0;
              return (
                <Link to={`/app/product/${p.id}`} key={p.id}>
                  <Card className={`overflow-hidden hover:shadow-md transition-shadow group ${viewMode === "list" ? "flex" : ""}`}>
                    <div className={`bg-secondary/30 flex items-center justify-center text-4xl relative ${viewMode === "list" ? "w-32 h-32 shrink-0" : "h-40"}`}>
                      {p.emoji}
                      {discountPct > 0 && <Badge className="absolute top-2 left-2 bg-destructive text-destructive-foreground text-[10px] px-1.5 py-0">{discountPct}% OFF</Badge>}
                    </div>
                    <div className="p-3 flex-1">
                      <p className="text-xs text-muted-foreground">{p.vendor_name}</p>
                      <h3 className="text-sm font-medium mt-0.5">{p.title}</h3>
                      <div className="flex items-center gap-1 mt-1">
                        <Star className="h-3 w-3 fill-warning text-warning" />
                        <span className="text-xs font-medium">{p.rating}</span>
                        <span className="text-[10px] text-muted-foreground">({p.reviews})</span>
                      </div>
                      <div className="flex items-center gap-2 mt-1.5">
                        <span className="text-sm font-bold">₹{p.price.toLocaleString()}</span>
                        {discountPct > 0 && <span className="text-xs text-muted-foreground line-through">₹{(p.price + p.discount).toLocaleString()}</span>}
                      </div>
                    </div>
                  </Card>
                </Link>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
