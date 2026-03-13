import { useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { CustomerLayout } from "@/components/customer/CustomerLayout";
import { api } from "@/lib/api";
import { Search, Calendar, ChevronLeft, ChevronRight } from "lucide-react";

const statusColor: Record<string, string> = {
  placed: "bg-primary/10 text-primary", paid: "bg-info/10 text-info", accepted: "bg-info/10 text-info",
  in_progress: "bg-warning/10 text-warning", delivered: "bg-success/10 text-success",
  completed: "bg-success/10 text-success", cancelled: "bg-destructive/10 text-destructive",
};

const ITEMS_PER_PAGE = 5;

export default function CustomerOrdersPage() {
  const [searchId, setSearchId] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [currentPage, setCurrentPage] = useState(1);

  const { data: orders, isLoading } = useQuery({
    queryKey: ["customerOrders"],
    queryFn: () => api.getCustomerOrders("USR-001"),
  });

  // Apply filters
  const filtered = (orders || []).filter(o => {
    if (searchId && !o.id.toLowerCase().includes(searchId.toLowerCase())) return false;
    if (dateFrom && new Date(o.created_at) < new Date(dateFrom)) return false;
    if (dateTo) {
      const to = new Date(dateTo);
      to.setHours(23, 59, 59);
      if (new Date(o.created_at) > to) return false;
    }
    return true;
  });

  const totalPages = Math.max(1, Math.ceil(filtered.length / ITEMS_PER_PAGE));
  const paginated = filtered.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

  const clearFilters = () => { setSearchId(""); setDateFrom(""); setDateTo(""); setCurrentPage(1); };

  return (
    <CustomerLayout>
      <div className="max-w-3xl mx-auto px-4 py-6 pb-20 md:pb-6">
        <h1 className="text-xl font-bold mb-4">My Orders</h1>

        {/* Filters */}
        <Card className="p-3 mb-4">
          <div className="flex flex-col sm:flex-row gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by Order ID"
                value={searchId}
                onChange={e => { setSearchId(e.target.value); setCurrentPage(1); }}
                className="pl-8 h-9 text-xs"
              />
            </div>
            <div className="flex items-center gap-2">
              <div className="relative">
                <Calendar className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                <Input type="date" value={dateFrom} onChange={e => { setDateFrom(e.target.value); setCurrentPage(1); }}
                  className="pl-8 h-9 text-xs w-[130px]" placeholder="From" />
              </div>
              <span className="text-xs text-muted-foreground">to</span>
              <Input type="date" value={dateTo} onChange={e => { setDateTo(e.target.value); setCurrentPage(1); }}
                className="h-9 text-xs w-[130px]" />
            </div>
            {(searchId || dateFrom || dateTo) && (
              <Button variant="ghost" size="sm" className="text-xs h-9" onClick={clearFilters}>Clear</Button>
            )}
          </div>
        </Card>

        <div className="space-y-3">
          {isLoading ? Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-24 rounded-xl" />) :
            filtered.length === 0 ? <p className="text-center py-16 text-muted-foreground">{searchId || dateFrom || dateTo ? 'No matching orders' : 'No orders yet'}</p> :
            paginated.map((o) => (
              <Card key={o.id} className="p-4 hover:shadow-sm transition-shadow">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <p className="text-sm font-semibold">{o.id}</p>
                    <p className="text-xs text-muted-foreground">{new Date(o.created_at).toLocaleDateString('en-IN', { month: 'short', day: 'numeric', year: 'numeric' })} • {o.vendor_name}</p>
                  </div>
                  <Badge className={(statusColor[o.status] || "bg-muted") + " border-0"}>{o.status.replace("_", " ")}</Badge>
                </div>
                {o.items?.map((item: any, i: number) => (
                  <div key={i} className="flex items-center gap-3">
                    <div className="h-10 w-10 bg-secondary/30 rounded-lg flex items-center justify-center text-lg">{item.emoji}</div>
                    <div className="flex-1">
                      <p className="text-sm font-medium">{item.title}</p>
                      <p className="text-xs text-muted-foreground">Qty: {item.qty}</p>
                    </div>
                    <p className="text-sm font-bold">₹{o.total.toLocaleString()}</p>
                  </div>
                ))}
              </Card>
            ))}
        </div>

        {/* Pagination */}
        {filtered.length > ITEMS_PER_PAGE && (
          <div className="flex items-center justify-center gap-2 mt-6">
            <Button variant="outline" size="icon" className="h-8 w-8" disabled={currentPage <= 1}
              onClick={() => setCurrentPage(p => p - 1)}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            {Array.from({ length: totalPages }, (_, i) => (
              <Button key={i} variant={currentPage === i + 1 ? "default" : "outline"} size="sm"
                className="h-8 w-8 text-xs" onClick={() => setCurrentPage(i + 1)}>
                {i + 1}
              </Button>
            ))}
            <Button variant="outline" size="icon" className="h-8 w-8" disabled={currentPage >= totalPages}
              onClick={() => setCurrentPage(p => p + 1)}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        )}
      </div>
    </CustomerLayout>
  );
}
