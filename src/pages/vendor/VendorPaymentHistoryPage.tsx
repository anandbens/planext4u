import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { DollarSign, ArrowDownLeft, ArrowUpRight, Calendar, Search } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { VendorLayout } from "@/components/vendor/VendorLayout";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";

const statusStyle: Record<string, string> = {
  pending: "bg-warning/10 text-warning", eligible: "bg-info/10 text-info",
  settled: "bg-success/10 text-success", on_hold: "bg-destructive/10 text-destructive",
};

export default function VendorPaymentHistoryPage() {
  const { vendorUser } = useAuth();
  const vendorId = vendorUser?.vendor_id || "VND-001";
  const [search, setSearch] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [page, setPage] = useState(1);
  const perPage = 10;

  const { data: settlements, isLoading } = useQuery({
    queryKey: ["vendorPayments", vendorId],
    queryFn: async () => {
      const { data } = await supabase.from("settlements").select("*").eq("vendor_id", vendorId).order("created_at", { ascending: false });
      return data || [];
    },
  });

  let filtered = settlements?.filter((s) => {
    if (search && !s.id.toLowerCase().includes(search.toLowerCase()) && !s.order_id.toLowerCase().includes(search.toLowerCase())) return false;
    if (dateFrom && new Date(s.created_at) < new Date(dateFrom)) return false;
    if (dateTo && new Date(s.created_at) > new Date(dateTo + "T23:59:59")) return false;
    return true;
  }) || [];

  const totalSettled = filtered.filter(s => s.status === "settled").reduce((sum, s) => sum + Number(s.net_amount), 0);
  const totalPending = filtered.filter(s => s.status !== "settled").reduce((sum, s) => sum + Number(s.net_amount), 0);
  const totalPages = Math.ceil(filtered.length / perPage);
  const paginated = filtered.slice((page - 1) * perPage, page * perPage);

  return (
    <VendorLayout title="Payment History">
      <div className="max-w-5xl mx-auto px-4 py-6 space-y-4">
        {/* Summary Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
          <Card className="p-4 flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-success/10 flex items-center justify-center">
              <ArrowDownLeft className="h-5 w-5 text-success" />
            </div>
            <div><p className="text-xs text-muted-foreground">Total Settled</p><p className="text-lg font-bold text-success">₹{totalSettled.toLocaleString()}</p></div>
          </Card>
          <Card className="p-4 flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-warning/10 flex items-center justify-center">
              <ArrowUpRight className="h-5 w-5 text-warning" />
            </div>
            <div><p className="text-xs text-muted-foreground">Pending</p><p className="text-lg font-bold text-warning">₹{totalPending.toLocaleString()}</p></div>
          </Card>
          <Card className="p-4 flex items-center gap-3 col-span-2 lg:col-span-1">
            <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <DollarSign className="h-5 w-5 text-primary" />
            </div>
            <div><p className="text-xs text-muted-foreground">Total Transactions</p><p className="text-lg font-bold">{filtered.length}</p></div>
          </Card>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search by ID or Order ID..." className="pl-9" value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} />
          </div>
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <Input type="date" value={dateFrom} onChange={(e) => { setDateFrom(e.target.value); setPage(1); }} className="w-36 text-xs" />
            <span className="text-xs text-muted-foreground">to</span>
            <Input type="date" value={dateTo} onChange={(e) => { setDateTo(e.target.value); setPage(1); }} className="w-36 text-xs" />
          </div>
        </div>

        {/* Transaction List */}
        <div className="space-y-3">
          {isLoading ? Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-20 rounded-xl" />) :
            paginated.length === 0 ? (
              <Card className="p-8 text-center"><p className="text-muted-foreground">No payment history found.</p></Card>
            ) :
            paginated.map((s: any) => (
              <Card key={s.id} className="p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-semibold">{s.id}</p>
                      <Badge className={`${statusStyle[s.status] || ''} border-0 text-[10px]`}>{s.status}</Badge>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">Order: {s.order_id}</p>
                    <p className="text-xs text-muted-foreground">{new Date(s.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}</p>
                  </div>
                  <div className="text-right">
                    <p className={`text-sm font-bold ${s.status === 'settled' ? 'text-success' : ''}`}>₹{Number(s.net_amount).toLocaleString()}</p>
                    <div className="text-[10px] text-muted-foreground mt-0.5">
                      <span>Gross: ₹{Number(s.amount).toLocaleString()}</span> · <span>Comm: ₹{Number(s.commission).toLocaleString()}</span>
                    </div>
                    {s.settled_at && <p className="text-[10px] text-success mt-0.5">Settled: {new Date(s.settled_at).toLocaleDateString("en-IN")}</p>}
                  </div>
                </div>
              </Card>
            ))}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-2 pt-2">
            <Button variant="outline" size="sm" disabled={page === 1} onClick={() => setPage(page - 1)}>Previous</Button>
            <span className="text-xs text-muted-foreground">Page {page} of {totalPages}</span>
            <Button variant="outline" size="sm" disabled={page === totalPages} onClick={() => setPage(page + 1)}>Next</Button>
          </div>
        )}
      </div>
    </VendorLayout>
  );
}
