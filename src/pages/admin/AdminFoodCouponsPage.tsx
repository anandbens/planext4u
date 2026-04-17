import { useEffect, useState } from "react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, Tag } from "lucide-react";

interface Coupon {
  id: string;
  code: string;
  title: string;
  description?: string | null;
  discount_type: "flat" | "percent";
  discount_value: number;
  max_discount?: number | null;
  min_order_amount: number;
  restaurant_id?: string | null;
  is_platform_wide: boolean;
  per_customer_limit: number;
  total_usage_limit?: number | null;
  usage_count: number;
  starts_at: string;
  expires_at?: string | null;
  is_active: boolean;
}

export default function AdminFoodCouponsPage() {
  const [list, setList] = useState<Coupon[]>([]);
  const [restaurants, setRestaurants] = useState<{ id: string; name: string }[]>([]);
  const [editing, setEditing] = useState<Partial<Coupon> | null>(null);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    const [{ data: c }, { data: r }] = await Promise.all([
      supabase.from("food_coupons" as any).select("*").order("created_at", { ascending: false }),
      supabase.from("restaurants").select("id,name").order("name"),
    ]);
    setList(((c as any[]) || []) as Coupon[]);
    setRestaurants((r as any[]) || []);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const openNew = () => setEditing({
    code: "", title: "", discount_type: "flat", discount_value: 50, min_order_amount: 199,
    per_customer_limit: 1, is_platform_wide: true, is_active: true,
    starts_at: new Date().toISOString(),
  });

  const save = async () => {
    if (!editing?.code || !editing.title || !editing.discount_value) {
      return toast.error("Code, title, and discount value are required");
    }
    const payload: any = { ...editing, code: editing.code.toUpperCase().trim() };
    if (!payload.restaurant_id) payload.restaurant_id = null;
    if (!payload.expires_at) payload.expires_at = null;
    const { error } = await supabase.from("food_coupons" as any).upsert(payload);
    if (error) return toast.error(error.message);
    toast.success("Saved"); setEditing(null); load();
  };

  const del = async (id: string) => {
    if (!confirm("Delete this coupon?")) return;
    const { error } = await supabase.from("food_coupons" as any).delete().eq("id", id);
    if (error) return toast.error(error.message);
    load();
  };

  const toggle = async (id: string, active: boolean) => {
    await supabase.from("food_coupons" as any).update({ is_active: active }).eq("id", id);
    load();
  };

  return (
    <AdminLayout>
      <div className="page-header flex justify-between items-start">
        <div>
          <h1 className="page-title">Food Coupons</h1>
          <p className="page-description">{list.length} promo codes for the food vertical</p>
        </div>
        <Button onClick={openNew}><Plus className="w-4 h-4 mr-1" /> New Coupon</Button>
      </div>

      {loading ? <div className="flex justify-center py-12"><div className="h-8 w-8 rounded-full border-2 border-primary border-t-transparent animate-spin" /></div>
      : (
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          {list.map(c => (
            <Card key={c.id} className="p-4 space-y-2">
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <Tag className="w-4 h-4 text-primary" />
                    <h3 className="font-bold text-primary">{c.code}</h3>
                  </div>
                  <p className="text-sm font-medium mt-1">{c.title}</p>
                </div>
                <Badge variant={c.is_active ? "default" : "outline"}>{c.is_active ? "Active" : "Inactive"}</Badge>
              </div>
              <p className="text-xs text-muted-foreground line-clamp-2">{c.description}</p>
              <div className="text-xs space-y-0.5">
                <p>{c.discount_type === "percent" ? `${c.discount_value}% off` : `₹${c.discount_value} off`}{c.max_discount ? ` (max ₹${c.max_discount})` : ""}</p>
                <p className="text-muted-foreground">Min order ₹{c.min_order_amount} • Used {c.usage_count}{c.total_usage_limit ? `/${c.total_usage_limit}` : ""}</p>
                <p className="text-muted-foreground">{c.is_platform_wide ? "Platform-wide" : (restaurants.find(r => r.id === c.restaurant_id)?.name || "—")}</p>
                {c.expires_at && <p className="text-muted-foreground">Expires {new Date(c.expires_at).toLocaleDateString()}</p>}
              </div>
              <div className="flex gap-2 pt-2">
                <Button size="sm" variant="outline" onClick={() => setEditing(c)}><Pencil className="w-3 h-3 mr-1" /> Edit</Button>
                <Button size="sm" variant="outline" onClick={() => toggle(c.id, !c.is_active)}>{c.is_active ? "Disable" : "Enable"}</Button>
                <Button size="sm" variant="ghost" onClick={() => del(c.id)}><Trash2 className="w-3 h-3 text-destructive" /></Button>
              </div>
            </Card>
          ))}
          {list.length === 0 && <p className="text-sm text-muted-foreground col-span-full text-center py-12">No coupons yet.</p>}
        </div>
      )}

      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editing?.id ? "Edit Coupon" : "New Coupon"}</DialogTitle></DialogHeader>
          {editing && (
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="sm:col-span-2"><Label>Code *</Label><Input value={editing.code || ""} onChange={e => setEditing({ ...editing, code: e.target.value.toUpperCase() })} placeholder="WELCOME50" /></div>
              <div className="sm:col-span-2"><Label>Title *</Label><Input value={editing.title || ""} onChange={e => setEditing({ ...editing, title: e.target.value })} placeholder="₹50 off your first order" /></div>
              <div className="sm:col-span-2"><Label>Description</Label><Textarea rows={2} value={editing.description || ""} onChange={e => setEditing({ ...editing, description: e.target.value })} /></div>
              <div><Label>Discount Type</Label>
                <select className="w-full h-10 border rounded px-2 bg-background" value={editing.discount_type || "flat"} onChange={e => setEditing({ ...editing, discount_type: e.target.value as any })}>
                  <option value="flat">Flat ₹</option>
                  <option value="percent">Percent %</option>
                </select>
              </div>
              <div><Label>Discount Value *</Label><Input type="number" value={editing.discount_value ?? 0} onChange={e => setEditing({ ...editing, discount_value: Number(e.target.value) })} /></div>
              <div><Label>Max Discount ₹ (for %)</Label><Input type="number" value={editing.max_discount ?? ""} onChange={e => setEditing({ ...editing, max_discount: e.target.value ? Number(e.target.value) : null })} /></div>
              <div><Label>Min Order ₹</Label><Input type="number" value={editing.min_order_amount ?? 0} onChange={e => setEditing({ ...editing, min_order_amount: Number(e.target.value) })} /></div>
              <div><Label>Per-Customer Limit</Label><Input type="number" value={editing.per_customer_limit ?? 1} onChange={e => setEditing({ ...editing, per_customer_limit: Number(e.target.value) })} /></div>
              <div><Label>Total Usage Limit</Label><Input type="number" value={editing.total_usage_limit ?? ""} onChange={e => setEditing({ ...editing, total_usage_limit: e.target.value ? Number(e.target.value) : null })} /></div>
              <div className="sm:col-span-2 flex items-center gap-2 pt-2">
                <Switch checked={!!editing.is_platform_wide} onCheckedChange={v => setEditing({ ...editing, is_platform_wide: v, restaurant_id: v ? null : editing.restaurant_id })} />
                <Label>Platform-wide (all restaurants)</Label>
              </div>
              {!editing.is_platform_wide && (
                <div className="sm:col-span-2"><Label>Restaurant</Label>
                  <select className="w-full h-10 border rounded px-2 bg-background" value={editing.restaurant_id || ""} onChange={e => setEditing({ ...editing, restaurant_id: e.target.value || null })}>
                    <option value="">— Select —</option>
                    {restaurants.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                  </select>
                </div>
              )}
              <div><Label>Starts</Label><Input type="datetime-local" value={editing.starts_at ? new Date(editing.starts_at).toISOString().slice(0, 16) : ""} onChange={e => setEditing({ ...editing, starts_at: e.target.value ? new Date(e.target.value).toISOString() : new Date().toISOString() })} /></div>
              <div><Label>Expires</Label><Input type="datetime-local" value={editing.expires_at ? new Date(editing.expires_at).toISOString().slice(0, 16) : ""} onChange={e => setEditing({ ...editing, expires_at: e.target.value ? new Date(e.target.value).toISOString() : null })} /></div>
              <div className="flex items-center gap-2 pt-2"><Switch checked={!!editing.is_active} onCheckedChange={v => setEditing({ ...editing, is_active: v })} /><Label>Active</Label></div>
            </div>
          )}
          <DialogFooter><Button variant="outline" onClick={() => setEditing(null)}>Cancel</Button><Button onClick={save}>Save</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
