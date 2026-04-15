import { useState, useCallback, useEffect } from "react";
import { DollarSign, Clock, CheckCircle, XCircle, IndianRupee } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { VendorLayout } from "@/components/vendor/VendorLayout";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";

const statusStyle: Record<string, string> = {
  pending: "bg-warning/10 text-warning", eligible: "bg-info/10 text-info",
  settled: "bg-success/10 text-success", on_hold: "bg-destructive/10 text-destructive",
  rejected: "bg-destructive/10 text-destructive",
};

const PER_PAGE = 10;

export default function VendorSettlementsPage() {
  const { vendorUser } = useAuth();
  const vendorId = vendorUser?.vendor_id || "VND-001";

  const [settlements, setSettlements] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [stats, setStats] = useState({ totalEarned: 0, pending: 0, settled: 0, rejected: 0 });

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    const from = (page - 1) * PER_PAGE;
    const to = from + PER_PAGE - 1;

    const { data, count } = await supabase
      .from('settlements')
      .select('*', { count: 'exact' })
      .eq('vendor_id', vendorId)
      .order('created_at', { ascending: false })
      .range(from, to);

    setSettlements(data || []);
    setTotal(count || 0);
    setIsLoading(false);
  }, [vendorId, page]);

  const fetchStats = useCallback(async () => {
    const { data: allRows } = await supabase
      .from('settlements')
      .select('net_amount, status')
      .eq('vendor_id', vendorId);

    if (allRows) {
      const totalEarned = allRows.reduce((s, x) => s + (x.net_amount || 0), 0);
      const pending = allRows.filter(x => x.status === 'pending' || x.status === 'eligible').reduce((s, x) => s + (x.net_amount || 0), 0);
      const settled = allRows.filter(x => x.status === 'settled').reduce((s, x) => s + (x.net_amount || 0), 0);
      const rejected = allRows.filter(x => x.status === 'rejected').reduce((s, x) => s + (x.net_amount || 0), 0);
      setStats({ totalEarned, pending, settled, rejected });
    }
  }, [vendorId]);

  useEffect(() => { fetchData(); }, [fetchData]);
  useEffect(() => { fetchStats(); }, [fetchStats]);

  const totalPages = Math.ceil(total / PER_PAGE);

  return (
    <VendorLayout title="Settlements">
      <div className="max-w-5xl mx-auto px-4 py-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          <Card className="p-4 text-center"><DollarSign className="h-5 w-5 mx-auto text-success mb-1" /><p className="text-lg font-bold">₹{stats.totalEarned.toLocaleString()}</p><p className="text-xs text-muted-foreground">Total Earned</p></Card>
          <Card className="p-4 text-center"><Clock className="h-5 w-5 mx-auto text-warning mb-1" /><p className="text-lg font-bold">₹{stats.pending.toLocaleString()}</p><p className="text-xs text-muted-foreground">Pending Settlement</p></Card>
          <Card className="p-4 text-center"><CheckCircle className="h-5 w-5 mx-auto text-success mb-1" /><p className="text-lg font-bold">₹{stats.settled.toLocaleString()}</p><p className="text-xs text-muted-foreground">Settled</p></Card>
          <Card className="p-4 text-center"><XCircle className="h-5 w-5 mx-auto text-destructive mb-1" /><p className="text-lg font-bold">₹{stats.rejected.toLocaleString()}</p><p className="text-xs text-muted-foreground">Rejected</p></Card>
        </div>

        <div className="flex items-center justify-between mb-3">
          <p className="text-sm text-muted-foreground">{total} settlement{total !== 1 ? "s" : ""}</p>
        </div>

        <div className="space-y-3">
          {isLoading ? Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-20 rounded-xl" />) :
            settlements.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">No settlements found</div>
            ) :
            settlements.map((s) => (
              <Card key={s.id} className="p-4">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-semibold">{s.id}</p>
                      <Badge className={`${statusStyle[s.status] || ''} border-0 text-[10px]`}>{s.status}</Badge>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">Order: {s.order_id}</p>
                    {s.transaction_reference && (
                      <p className="text-xs text-muted-foreground">Txn: <span className="font-mono">{s.transaction_reference}</span></p>
                    )}
                    {s.rejection_reason && (
                      <p className="text-xs text-destructive mt-1">Reason: {s.rejection_reason}</p>
                    )}
                  </div>
                  <p className="text-sm font-bold text-success">₹{s.net_amount.toLocaleString()}</p>
                </div>
                <div className="flex gap-4 text-xs text-muted-foreground">
                  <span>Gross: ₹{s.amount.toLocaleString()}</span>
                  <span>Commission: ₹{s.commission.toLocaleString()}</span>
                  {s.settled_at && <span>Settled: {new Date(s.settled_at).toLocaleDateString('en-IN')}</span>}
                </div>
              </Card>
            ))}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-2 mt-6">
            <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>Previous</Button>
            <span className="text-sm text-muted-foreground">Page {page} of {totalPages}</span>
            <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>Next</Button>
          </div>
        )}
      </div>
    </VendorLayout>
  );
}
