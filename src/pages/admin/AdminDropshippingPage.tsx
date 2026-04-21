import { useEffect, useState } from "react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Truck, Plus, Pencil, Trash2, Boxes, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { friendlyError } from "@/lib/friendly-error";
import { supabase } from "@/integrations/supabase/client";

interface Supplier {
  id: string;
  name: string;
  website: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  country_code: string | null;
  currency_code: string;
  api_endpoint: string | null;
  api_key_secret_name: string | null;
  default_lead_time_days: number;
  default_markup_percent: number;
  commission_percent: number;
  status: string;
  notes: string | null;
}

const empty: Supplier = {
  id: "", name: "", website: "", contact_email: "", contact_phone: "",
  country_code: "IN", currency_code: "INR", api_endpoint: "",
  api_key_secret_name: "", default_lead_time_days: 5,
  default_markup_percent: 20, commission_percent: 5,
  status: "active", notes: "",
};

export default function AdminDropshippingPage() {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Supplier | null>(null);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    const [{ data: s }, { data: o }] = await Promise.all([
      supabase.from("dropshipping_suppliers").select("*").order("created_at", { ascending: false }),
      supabase.from("dropshipping_orders").select("*").order("created_at", { ascending: false }).limit(50),
    ]);
    setSuppliers((s as any) || []);
    setOrders(o || []);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const save = async () => {
    if (!editing) return;
    if (!editing.name.trim()) { toast.error("Supplier name required"); return; }
    setSaving(true);
    try {
      const payload = { ...editing };
      if (!payload.id) delete (payload as any).id;
      const { error } = await supabase.from("dropshipping_suppliers").upsert(payload as any);
      if (error) throw error;
      toast.success("Supplier saved");
      setEditing(null);
      load();
    } catch (e: any) { toast.error(friendlyError(e, "Save failed")); }
    finally { setSaving(false); }
  };

  const remove = async (id: string) => {
    if (!confirm("Delete this supplier? Linked products will be unmapped.")) return;
    const { error } = await supabase.from("dropshipping_suppliers").delete().eq("id", id);
    if (error) toast.error(friendlyError(error)); else { toast.success("Supplier deleted"); load(); }
  };

  const toggleStatus = async (s: Supplier) => {
    const next = s.status === "active" ? "inactive" : "active";
    await supabase.from("dropshipping_suppliers").update({ status: next }).eq("id", s.id);
    load();
  };

  return (
    <AdminLayout>
      <div className="page-header flex items-start justify-between gap-2">
        <div>
          <h1 className="page-title flex items-center gap-2"><Truck className="h-6 w-6" /> Dropshipping</h1>
          <p className="page-description">Manage suppliers, monitor forwarded orders, and configure margins.</p>
        </div>
        <Button onClick={() => setEditing({ ...empty })}><Plus className="h-4 w-4 mr-1" /> New Supplier</Button>
      </div>

      <Tabs defaultValue="suppliers" className="space-y-4">
        <TabsList>
          <TabsTrigger value="suppliers" className="gap-2"><Boxes className="h-4 w-4" /> Suppliers ({suppliers.length})</TabsTrigger>
          <TabsTrigger value="orders" className="gap-2"><Truck className="h-4 w-4" /> Forwarded Orders ({orders.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="suppliers">
          {loading ? (
            <Card className="p-6">Loading…</Card>
          ) : suppliers.length === 0 ? (
            <Card className="p-12 text-center text-muted-foreground">
              <Boxes className="h-10 w-10 mx-auto mb-2 opacity-40" />
              <p>No suppliers yet. Add your first one to enable dropshipping.</p>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {suppliers.map(s => (
                <Card key={s.id} className="p-5 space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="text-base font-semibold truncate">{s.name}</h3>
                        <Badge variant={s.status === "active" ? "default" : "outline"} className="text-[10px]">{s.status}</Badge>
                      </div>
                      <p className="text-xs text-muted-foreground truncate">{s.website || s.contact_email || "—"}</p>
                    </div>
                    <div className="flex items-center gap-1">
                      <Switch checked={s.status === "active"} onCheckedChange={() => toggleStatus(s)} />
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-3 text-xs">
                    <Stat label="Country" value={s.country_code || "—"} />
                    <Stat label="Currency" value={s.currency_code} />
                    <Stat label="Lead time" value={`${s.default_lead_time_days}d`} />
                    <Stat label="Markup" value={`${s.default_markup_percent}%`} />
                    <Stat label="Commission" value={`${s.commission_percent}%`} />
                    <Stat label="API" value={s.api_endpoint ? "Linked" : "Manual"} />
                  </div>
                  <div className="flex gap-2 pt-2 border-t border-border/50">
                    <Button size="sm" variant="outline" onClick={() => setEditing(s)}><Pencil className="h-3.5 w-3.5 mr-1" /> Edit</Button>
                    <Button size="sm" variant="ghost" className="text-destructive" onClick={() => remove(s.id)}><Trash2 className="h-3.5 w-3.5 mr-1" /> Delete</Button>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="orders">
          <Card className="p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold">Recent supplier orders</h3>
              <Button size="sm" variant="ghost" onClick={load}><RefreshCw className="h-3.5 w-3.5 mr-1" /> Refresh</Button>
            </div>
            {orders.length === 0 ? (
              <p className="text-sm text-muted-foreground py-6 text-center">No forwarded orders yet.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead className="text-muted-foreground">
                    <tr className="text-left border-b border-border/50">
                      <th className="py-2">Created</th><th>Order ID</th><th>Vendor</th><th>Supplier ref</th><th>Cost</th><th>Margin</th><th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {orders.map(o => (
                      <tr key={o.id} className="border-b border-border/30">
                        <td className="py-2">{new Date(o.created_at).toLocaleDateString()}</td>
                        <td className="font-mono">{o.order_id}</td>
                        <td className="font-mono">{o.vendor_id?.slice(0, 8)}…</td>
                        <td className="font-mono">{o.supplier_order_ref || "—"}</td>
                        <td>{o.currency_code} {o.cost_total}</td>
                        <td>{o.currency_code} {o.margin_amount}</td>
                        <td><Badge variant={o.status === "delivered" ? "default" : "outline"} className="text-[10px]">{o.status}</Badge></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>{editing?.id ? "Edit supplier" : "New supplier"}</DialogTitle></DialogHeader>
          {editing && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <Label>Name *</Label>
                <Input value={editing.name} onChange={e => setEditing({ ...editing, name: e.target.value })} className="mt-1.5" />
              </div>
              <div>
                <Label>Website</Label>
                <Input value={editing.website || ""} onChange={e => setEditing({ ...editing, website: e.target.value })} className="mt-1.5" />
              </div>
              <div>
                <Label>Contact email</Label>
                <Input type="email" value={editing.contact_email || ""} onChange={e => setEditing({ ...editing, contact_email: e.target.value })} className="mt-1.5" />
              </div>
              <div>
                <Label>Contact phone</Label>
                <Input value={editing.contact_phone || ""} onChange={e => setEditing({ ...editing, contact_phone: e.target.value })} className="mt-1.5" />
              </div>
              <div>
                <Label>Country code</Label>
                <Input maxLength={2} value={editing.country_code || ""} onChange={e => setEditing({ ...editing, country_code: e.target.value.toUpperCase() })} className="mt-1.5 font-mono" />
              </div>
              <div>
                <Label>Currency code</Label>
                <Input maxLength={3} value={editing.currency_code} onChange={e => setEditing({ ...editing, currency_code: e.target.value.toUpperCase() })} className="mt-1.5 font-mono" />
              </div>
              <div>
                <Label>Lead time (days)</Label>
                <Input type="number" value={editing.default_lead_time_days} onChange={e => setEditing({ ...editing, default_lead_time_days: parseInt(e.target.value) || 0 })} className="mt-1.5" />
              </div>
              <div>
                <Label>Default markup %</Label>
                <Input type="number" value={editing.default_markup_percent} onChange={e => setEditing({ ...editing, default_markup_percent: parseFloat(e.target.value) || 0 })} className="mt-1.5" />
              </div>
              <div>
                <Label>Commission %</Label>
                <Input type="number" value={editing.commission_percent} onChange={e => setEditing({ ...editing, commission_percent: parseFloat(e.target.value) || 0 })} className="mt-1.5" />
              </div>
              <div className="md:col-span-2">
                <Label>API endpoint (optional)</Label>
                <Input value={editing.api_endpoint || ""} onChange={e => setEditing({ ...editing, api_endpoint: e.target.value })} className="mt-1.5 font-mono text-xs" placeholder="https://supplier.example.com/api/v1" />
              </div>
              <div className="md:col-span-2">
                <Label>API key secret name (optional)</Label>
                <Input value={editing.api_key_secret_name || ""} onChange={e => setEditing({ ...editing, api_key_secret_name: e.target.value })} className="mt-1.5 font-mono text-xs" placeholder="e.g. ACME_DROP_API_KEY" />
                <p className="text-[10px] text-muted-foreground mt-1">The actual key is stored in backend secrets, not here.</p>
              </div>
              <div className="md:col-span-2">
                <Label>Notes</Label>
                <textarea
                  value={editing.notes || ""}
                  onChange={e => setEditing({ ...editing, notes: e.target.value })}
                  className="mt-1.5 w-full min-h-[80px] rounded-md border border-input bg-background px-3 py-2 text-sm"
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditing(null)}>Cancel</Button>
            <Button onClick={save} disabled={saving}>{saving ? "Saving…" : "Save supplier"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md bg-muted/40 p-2">
      <p className="text-[10px] uppercase text-muted-foreground tracking-wider">{label}</p>
      <p className="text-sm font-semibold mt-0.5">{value}</p>
    </div>
  );
}
