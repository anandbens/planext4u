import { useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Plus, Search, MoreVertical, Edit, Trash2, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { api } from "@/lib/api";

const statusStyle: Record<string, string> = {
  active: "bg-success/10 text-success", inactive: "bg-destructive/10 text-destructive", draft: "bg-muted text-muted-foreground",
};

export default function VendorProductsPage() {
  const [search, setSearch] = useState("");
  const { data: products, isLoading } = useQuery({
    queryKey: ["vendorProducts"],
    queryFn: () => api.getVendorProducts("VND-001"),
  });

  const filtered = products?.filter((p) => p.title.toLowerCase().includes(search.toLowerCase())) || [];

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-30 bg-card/95 backdrop-blur-sm border-b border-border/50">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center gap-3">
          <Button variant="ghost" size="icon" asChild><Link to="/vendor"><ArrowLeft className="h-5 w-5" /></Link></Button>
          <h1 className="font-semibold flex-1">My Products ({filtered.length})</h1>
          <Button size="sm"><Plus className="h-4 w-4 mr-1" /> Add Product</Button>
        </div>
      </header>
      <main className="max-w-5xl mx-auto px-4 py-6">
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search products..." className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <div className="space-y-3">
          {isLoading ? Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-20 rounded-xl" />) :
            filtered.map((p) => (
              <Card key={p.id} className="p-4 flex items-center gap-4">
                <div className="h-14 w-14 bg-secondary/30 rounded-xl flex items-center justify-center text-2xl shrink-0">{p.emoji}</div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-medium truncate">{p.title}</h3>
                    <Badge className={`${statusStyle[p.status] || ''} border-0 text-[10px]`}>{p.status}</Badge>
                  </div>
                  <div className="flex items-center gap-4 mt-1 text-xs text-muted-foreground">
                    <span>₹{p.price.toLocaleString()}</span>
                    <span>Stock: {p.stock ?? 0}</span>
                    <span>{p.sales ?? 0} sold</span>
                  </div>
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="h-8 w-8"><MoreVertical className="h-4 w-4" /></Button></DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem><Eye className="h-4 w-4 mr-2" /> View</DropdownMenuItem>
                    <DropdownMenuItem><Edit className="h-4 w-4 mr-2" /> Edit</DropdownMenuItem>
                    <DropdownMenuItem className="text-destructive"><Trash2 className="h-4 w-4 mr-2" /> Delete</DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </Card>
            ))}
        </div>
      </main>
    </div>
  );
}
