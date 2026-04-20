import { useEffect, useState } from "react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { foodApi } from "@/lib/food-api";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format } from "date-fns";
import { Wallet } from "lucide-react";

export default function AdminRiderSettlementsPage() {
  const [riders, setRiders] = useState<any[]>([]);
  const [settlements, setSettlements] = useState<any[]>([]);
  const [pendingByRider, setPendingByRider] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [settleRider, setSettleRider] = useState<any | null>(null);
  const [form, setForm] = useState<any>({ method: 'bank_transfer', reference: '', notes: '' });
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    const [rs, st] = await Promise.all([
      foodApi.listRiders(),
      foodApi.listAllRiderSettlements(),
    ]);
    setRiders(rs);
    setSettlements(st);
    // fetch pending balance for each
    const { data: pendingRows } = await supabase.from('rider_payouts' as any)
      .select('rider_id, total_amount').eq('status', 'pending');
    const map: Record<string, number> = {};
    (pendingRows as any[] || []).forEach(p => { map[p.rider_id] = (map[p.rider_id] || 0) + Number(p.total_amount); });
    setPendingByRider(map);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const onSettle = async () => {
    if (!settleRider) return;
    setSaving(true);
    try {
      const res = await foodApi.adminCreateRiderSettlement(settleRider.id, form.method, form.reference || undefined, form.notes || undefined);
      if (!res.ok) { toast.error(res.reason || "Could not settle"); return; }
      toast.success(`Settled ₹${res.amount} (${res.payout_count} deliveries)`);
      setSettleRider(null); setForm({ method: 'bank_transfer', reference: '', notes: '' });
      load();
    } catch (err: any) {
      toast.error(err.message || "Failed");
    } finally { setSaving(false); }
  };

  if (loading) return <AdminLayout><div className="flex justify-center py-12"><div className="h-8 w-8 rounded-full border-2 border-primary border-t-transparent animate-spin" /></div></AdminLayout>;

  return (
    <AdminLayout>
      <div className="page-header">
        <h1 className="page-title">Rider Settlements</h1>
        <p className="page-description">Pay riders for completed deliveries</p>
      </div>

      <Tabs defaultValue="pending">
        <TabsList>
          <TabsTrigger value="pending">Pending Balances ({Object.keys(pendingByRider).length})</TabsTrigger>
          <TabsTrigger value="history">History ({settlements.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="pending" className="space-y-2 mt-4">
          {riders.filter(r => (pendingByRider[r.id] || 0) > 0).length === 0 && (
            <Card className="p-12 text-center"><p className="text-sm text-muted-foreground">No pending payouts.</p></Card>
          )}
          {riders.filter(r => (pendingByRider[r.id] || 0) > 0).map(r => (
            <Card key={r.id} className="p-4 flex items-center justify-between">
              <div>
                <h3 className="font-semibold">{r.name}</h3>
                <p className="text-xs text-muted-foreground">{r.mobile} • {r.vehicle_type} {r.vehicle_number || ''}</p>
              </div>
              <div className="flex items-center gap-3">
                <div className="text-right">
                  <p className="text-lg font-bold text-primary">₹{(pendingByRider[r.id] || 0).toFixed(0)}</p>
                  <p className="text-xs text-muted-foreground">pending</p>
                </div>
                <Button size="sm" onClick={() => setSettleRider(r)}><Wallet className="h-3 w-3 mr-1" />Settle Now</Button>
              </div>
            </Card>
          ))}
        </TabsContent>

        <TabsContent value="history" className="space-y-2 mt-4">
          {settlements.length === 0 && <Card className="p-12 text-center"><p className="text-sm text-muted-foreground">No settlements yet.</p></Card>}
          {settlements.map(s => (
            <Card key={s.id} className="p-3 flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold">{s.rider_name || s.riders?.name || s.rider_id}</p>
                <p className="text-xs text-muted-foreground">{format(new Date(s.initiated_at), 'dd MMM yyyy, HH:mm')} • {s.payout_count} deliveries • {s.method}</p>
                {s.reference && <p className="text-[10px] text-muted-foreground">Ref: {s.reference}</p>}
              </div>
              <div className="text-right">
                <p className="font-bold">₹{Number(s.amount).toFixed(0)}</p>
                <Badge variant={s.status === 'completed' ? 'default' : 'secondary'} className="text-[10px]">{s.status}</Badge>
              </div>
            </Card>
          ))}
        </TabsContent>
      </Tabs>

      <Dialog open={!!settleRider} onOpenChange={(o) => !o && setSettleRider(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Settle {settleRider?.name}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="rounded-lg bg-muted p-3">
              <p className="text-xs text-muted-foreground">Pending balance</p>
              <p className="text-2xl font-bold text-primary">₹{(pendingByRider[settleRider?.id] || 0).toFixed(0)}</p>
            </div>
            <div>
              <Label>Payment Method</Label>
              <Select value={form.method} onValueChange={v => setForm({ ...form, method: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                  <SelectItem value="upi">UPI</SelectItem>
                  <SelectItem value="cash">Cash</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div><Label>Reference / UTR</Label><Input value={form.reference} onChange={e => setForm({ ...form, reference: e.target.value })} placeholder="Optional" /></div>
            <div><Label>Notes</Label><Input value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} placeholder="Optional" /></div>
            <Button className="w-full" onClick={onSettle} disabled={saving}>{saving ? "Settling…" : "Confirm Settlement"}</Button>
          </div>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
