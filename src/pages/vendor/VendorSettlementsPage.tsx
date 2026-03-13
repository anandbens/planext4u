import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, DollarSign, Clock, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { api } from "@/lib/api";

const statusStyle: Record<string, string> = {
  pending: "bg-warning/10 text-warning", eligible: "bg-info/10 text-info",
  settled: "bg-success/10 text-success", on_hold: "bg-destructive/10 text-destructive",
};

export default function VendorSettlementsPage() {
  const { data: settlements, isLoading } = useQuery({
    queryKey: ["vendorSettlements"],
    queryFn: () => api.getVendorSettlements("VND-001"),
  });

  const totalEarned = settlements?.reduce((s, x) => s + x.net_amount, 0) || 0;
  const pending = settlements?.filter((s) => s.status === 'pending').reduce((sum, s) => sum + s.net_amount, 0) || 0;
  const settled = settlements?.filter((s) => s.status === 'settled').reduce((sum, s) => sum + s.net_amount, 0) || 0;

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-30 bg-card/95 backdrop-blur-sm border-b border-border/50">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center gap-3">
          <Button variant="ghost" size="icon" asChild><Link to="/vendor"><ArrowLeft className="h-5 w-5" /></Link></Button>
          <h1 className="font-semibold">Settlements</h1>
        </div>
      </header>
      <main className="max-w-5xl mx-auto px-4 py-6">
        <div className="grid grid-cols-3 gap-3 mb-6">
          <Card className="p-4 text-center"><DollarSign className="h-5 w-5 mx-auto text-success mb-1" /><p className="text-lg font-bold">₹{totalEarned.toLocaleString()}</p><p className="text-xs text-muted-foreground">Total Earned</p></Card>
          <Card className="p-4 text-center"><Clock className="h-5 w-5 mx-auto text-warning mb-1" /><p className="text-lg font-bold">₹{pending.toLocaleString()}</p><p className="text-xs text-muted-foreground">Pending</p></Card>
          <Card className="p-4 text-center"><CheckCircle className="h-5 w-5 mx-auto text-success mb-1" /><p className="text-lg font-bold">₹{settled.toLocaleString()}</p><p className="text-xs text-muted-foreground">Settled</p></Card>
        </div>
        <div className="space-y-3">
          {isLoading ? Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-20 rounded-xl" />) :
            settlements?.map((s) => (
              <Card key={s.id} className="p-4">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-semibold">{s.id}</p>
                      <Badge className={`${statusStyle[s.status] || ''} border-0 text-[10px]`}>{s.status}</Badge>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">Order: {s.order_id}</p>
                  </div>
                  <p className="text-sm font-bold text-success">₹{s.net_amount.toLocaleString()}</p>
                </div>
                <div className="flex gap-4 text-xs text-muted-foreground">
                  <span>Gross: ₹{s.amount.toLocaleString()}</span>
                  <span>Commission: ₹{s.commission.toLocaleString()}</span>
                </div>
              </Card>
            ))}
        </div>
      </main>
    </div>
  );
}
