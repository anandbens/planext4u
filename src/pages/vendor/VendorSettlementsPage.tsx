import { Link } from "react-router-dom";
import { ArrowLeft, DollarSign, Clock, CheckCircle, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const settlements = [
  { id: "STL-042", period: "Mar 7-13, 2026", amount: 28500, commission: 2280, net: 26220, status: "pending", orders: 12 },
  { id: "STL-041", period: "Feb 28 - Mar 6", amount: 32100, commission: 2568, net: 29532, status: "eligible", orders: 15 },
  { id: "STL-040", period: "Feb 21-27", amount: 24800, commission: 1984, net: 22816, status: "settled", orders: 10 },
  { id: "STL-039", period: "Feb 14-20", amount: 29300, commission: 2344, net: 26956, status: "settled", orders: 13 },
];

const statusStyle: Record<string, string> = {
  pending: "bg-warning/10 text-warning", eligible: "bg-info/10 text-info", settled: "bg-success/10 text-success",
};

export default function VendorSettlementsPage() {
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
          <Card className="p-4 text-center"><DollarSign className="h-5 w-5 mx-auto text-success mb-1" /><p className="text-lg font-bold">₹1,05,524</p><p className="text-xs text-muted-foreground">Total Earned</p></Card>
          <Card className="p-4 text-center"><Clock className="h-5 w-5 mx-auto text-warning mb-1" /><p className="text-lg font-bold">₹26,220</p><p className="text-xs text-muted-foreground">Pending</p></Card>
          <Card className="p-4 text-center"><CheckCircle className="h-5 w-5 mx-auto text-success mb-1" /><p className="text-lg font-bold">₹49,772</p><p className="text-xs text-muted-foreground">Settled</p></Card>
        </div>

        <div className="space-y-3">
          {settlements.map((s) => (
            <Card key={s.id} className="p-4">
              <div className="flex items-start justify-between mb-2">
                <div>
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-semibold">{s.id}</p>
                    <Badge className={`${statusStyle[s.status]} border-0 text-[10px]`}>{s.status}</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">{s.period} • {s.orders} orders</p>
                </div>
                <p className="text-sm font-bold text-success">₹{s.net.toLocaleString()}</p>
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
