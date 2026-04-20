import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { foodApi, Rider } from "@/lib/food-api";
import { ArrowLeft, IndianRupee, TrendingUp, Wallet } from "lucide-react";
import { format } from "date-fns";

export default function RiderEarningsPage() {
  const navigate = useNavigate();
  const [rider, setRider] = useState<Rider | null>(null);
  const [payouts, setPayouts] = useState<any[]>([]);
  const [settlements, setSettlements] = useState<any[]>([]);
  const [pending, setPending] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const r = await foodApi.getMyRider();
      if (!r) { navigate('/rider/login'); return; }
      setRider(r);
      const [p, s, pb] = await Promise.all([
        foodApi.listRiderPayouts(r.id),
        foodApi.listRiderSettlements(r.id),
        foodApi.riderPendingBalance(r.id),
      ]);
      setPayouts(p); setSettlements(s); setPending(pb);
      setLoading(false);
    })();
  }, [navigate]);

  if (loading) return <div className="min-h-screen flex items-center justify-center"><div className="h-8 w-8 rounded-full border-2 border-primary border-t-transparent animate-spin" /></div>;
  if (!rider) return null;

  const todayEarnings = payouts
    .filter(p => format(new Date(p.earned_at), 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd'))
    .reduce((s, p) => s + Number(p.total_amount), 0);

  return (
    <div className="min-h-screen bg-muted/20 pb-20">
      <header className="sticky top-0 z-10 bg-background border-b border-border/50 px-4 py-3 flex items-center gap-3">
        <Button size="icon" variant="ghost" onClick={() => navigate('/rider')}><ArrowLeft className="h-4 w-4" /></Button>
        <h1 className="text-base font-semibold flex-1">Earnings</h1>
      </header>

      <div className="p-4 grid grid-cols-3 gap-2">
        <StatBox icon={<IndianRupee className="h-4 w-4" />} label="Today" value={`₹${todayEarnings.toFixed(0)}`} />
        <StatBox icon={<Wallet className="h-4 w-4" />} label="Pending" value={`₹${pending.toFixed(0)}`} />
        <StatBox icon={<TrendingUp className="h-4 w-4" />} label="Lifetime" value={`₹${Number(rider.total_earnings || 0).toFixed(0)}`} />
      </div>

      <div className="p-4">
        <Tabs defaultValue="payouts">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="payouts">Payouts ({payouts.length})</TabsTrigger>
            <TabsTrigger value="settlements">Settlements ({settlements.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="payouts" className="space-y-2 mt-3">
            {payouts.length === 0 && <p className="text-center text-sm text-muted-foreground py-12">No deliveries completed yet.</p>}
            {payouts.map(p => (
              <Card key={p.id} className="p-3 flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold">Order {p.order_id}</p>
                  <p className="text-xs text-muted-foreground">{format(new Date(p.earned_at), 'dd MMM yyyy, HH:mm')} • {Number(p.distance_km).toFixed(1)} km</p>
                  <p className="text-[10px] text-muted-foreground">Base ₹{p.base_amount} + Distance ₹{p.distance_amount} + Tip ₹{p.tip_amount}</p>
                </div>
                <div className="text-right">
                  <p className="font-bold text-primary">₹{Number(p.total_amount).toFixed(0)}</p>
                  <Badge variant={p.status === 'settled' ? 'default' : 'secondary'} className="text-[10px]">{p.status}</Badge>
                </div>
              </Card>
            ))}
          </TabsContent>

          <TabsContent value="settlements" className="space-y-2 mt-3">
            {settlements.length === 0 && <p className="text-center text-sm text-muted-foreground py-12">No settlements yet.</p>}
            {settlements.map(s => (
              <Card key={s.id} className="p-3 flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold">{s.id}</p>
                  <p className="text-xs text-muted-foreground">{format(new Date(s.initiated_at), 'dd MMM yyyy, HH:mm')} • {s.payout_count} deliveries</p>
                  <p className="text-[10px] text-muted-foreground">{s.method}{s.reference ? ` • Ref ${s.reference}` : ''}</p>
                </div>
                <div className="text-right">
                  <p className="font-bold">₹{Number(s.amount).toFixed(0)}</p>
                  <Badge variant={s.status === 'completed' ? 'default' : 'secondary'} className="text-[10px]">{s.status}</Badge>
                </div>
              </Card>
            ))}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

function StatBox({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <Card className="p-3 text-center">
      <div className="flex justify-center text-primary mb-1">{icon}</div>
      <p className="text-base font-bold">{value}</p>
      <p className="text-[10px] text-muted-foreground uppercase tracking-wide">{label}</p>
    </Card>
  );
}
