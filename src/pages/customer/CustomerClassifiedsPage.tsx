import { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { MapPin, Clock, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { CustomerLayout } from "@/components/customer/CustomerLayout";
import { api } from "@/lib/api";

export default function CustomerClassifiedsPage() {
  const [searchParams] = useSearchParams();
  const [searchQuery, setSearchQuery] = useState("");
  const categoryFilter = searchParams.get("category") || undefined;

  const { data: ads, isLoading } = useQuery({
    queryKey: ["browseClassifieds", categoryFilter, searchQuery],
    queryFn: () => api.getBrowseClassifieds({ category: categoryFilter, search: searchQuery || undefined }),
  });

  const categories = api.getClassifiedCategories().map(c => typeof c === 'string' ? c : c.name);

  return (
    <CustomerLayout>
      <div className="max-w-7xl mx-auto px-4 py-6 pb-20 md:pb-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-xl font-bold">Classifieds</h1>
            <p className="text-sm text-muted-foreground">Buy & sell locally</p>
          </div>
          <Link to="/app/classifieds/post">
            <Button size="sm"><Plus className="h-4 w-4 mr-1" /> Post Ad Free</Button>
          </Link>
        </div>

        <Input
          placeholder="Search classifieds..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="mb-4"
        />

        <div className="flex gap-2 overflow-x-auto pb-4 mb-4 scrollbar-hide">
          <Link to="/app/classifieds">
            <Badge variant={!categoryFilter ? "default" : "outline"} className="cursor-pointer whitespace-nowrap">All</Badge>
          </Link>
          {categories.map((c) => (
            <Link key={c} to={`/app/classifieds?category=${c}`}>
              <Badge variant={categoryFilter === c ? "default" : "outline"} className="cursor-pointer whitespace-nowrap">{c}</Badge>
            </Link>
          ))}
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-40 rounded-xl" />)}
          </div>
        ) : ads?.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-lg font-medium">No ads found</p>
            <p className="text-sm text-muted-foreground mt-1">Try a different category or search term</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {ads?.map((ad) => (
              <Card key={ad.id} className="overflow-hidden hover:shadow-md transition-all">
                <div className="bg-secondary/30 h-32 flex items-center justify-center text-4xl">📦</div>
                <div className="p-4">
                  <div className="flex items-start justify-between">
                    <h3 className="text-sm font-semibold">{ad.title}</h3>
                    <span className="text-base font-bold text-primary">₹{ad.price.toLocaleString()}</span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{ad.description}</p>
                  <div className="flex items-center gap-3 mt-3 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{ad.area}, {ad.city}</span>
                    <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{new Date(ad.created_at).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' })}</span>
                  </div>
                  <Badge variant="outline" className="mt-2 text-[10px]">{ad.category}</Badge>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </CustomerLayout>
  );
}
