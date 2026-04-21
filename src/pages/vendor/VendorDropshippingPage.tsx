import { useEffect, useState } from "react";
import { VendorLayout } from "@/components/vendor/VendorLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Truck, ShieldCheck, Package, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";

interface Settings {
  vendor_id: string;
  enabled: boolean;
  auto_forward_orders: boolean;
  default_supplier_id: string | null;
  default_margin_percent: number;
  notify_on_status_change: boolean;
}

export default function VendorDropshippingPage() {
  const { vendorUser } = useAuth();
  const vendorId = vendorUser?.vendor_id;
  const [settings, setSettings] = useState<Settings>({
    vendor_id: vendorId || "",
    enabled: false,
    auto_forward_orders: false,
    default_supplier_id: null,
    default_margin_percent: 20,
    notify_on_status_change: true,
  });
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [recentOrders, setRecentOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [globallyEnabled, setGloballyEnabled] = useState(true);

  const load = async () => {
    if (!vendorId) return;
    setLoading(true);
    const [{ data: s }, { data: sup }, { data: o }, { data: settings }] = await Promise.all([
      supabase.from("vendor_dropshipping_settings").select("*").eq("vendor_id", vendorId).maybeSingle(),
      supabase.from("dropshipping_suppliers").select("id, name, country_code, currency_code, default_lead_time_days, default_markup_percent").eq("status", "active"),
      supabase.from("dropshipping_orders").select("*").eq("vendor_id", vendorId).order("created_at", { ascending: false }).limit(10),
      supabase.from("platform_settings").select("dropshipping_enabled").eq("id", 1).maybeSingle(),
    ]);
    if (s) setSettings({ ...s } as Settings);
    setSuppliers(sup || []);
    setRecentOrders(o || []);
    setGloballyEnabled(!!settings?.dropshipping_enabled);
    setLoading(false);
  };
  useEffect(() => { load(); }, [vendorId]);

  const save = async () => {
    if (!vendorId) return;
    setSaving(true);
    try {
      const { error } = await supabase.from("vendor_dropshipping_settings").upsert({
        vendor_id: vendorId,
        enabled: settings.enabled,
        auto_forward_orders: settings.auto_forward_orders,
        default_supplier_id: settings.default_supplier_id,
        default_margin_percent: settings.default_margin_percent,
        notify_on_status_change: settings.notify_on_status_change,
        updated_at: new Date().toISOString(),
      } as any);
      if (error) throw error;
      toast.success("Dropshipping settings saved");
    } catch (e: any) { toast.error(e.message || "Save failed"); }
    finally { setSaving(false); }
  };

  if (loading) {
    return <VendorLayout title="Dropshipping"><Card className="p-6">Loading…</Card></VendorLayout>;
  }

  return (
    <VendorLayout title="Dropshipping" showBack>
      <div className="space-y-4">
        {!globallyEnabled && (
          <Card className="p-4 border-warning/40 bg-warning/5 flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-warning shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold">Dropshipping is currently disabled platform-wide.</p>
              <p className="text-xs text-muted-foreground">An administrator must enable it in Integrations → Country & Mode before forwarding can occur.</p>
            </div>
          </Card>
        )}

        <Card className="p-5 space-y-4">
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center">
              <Truck className="h-6 w-6 text-primary" />
            </div>
            <div className="flex-1">
              <h2 className="text-lg font-semibold">Dropshipping</h2>
              <p className="text-sm text-muted-foreground">Sell catalog items without holding inventory — orders are forwarded to your chosen supplier.</p>
            </div>
            <Switch checked={settings.enabled} onCheckedChange={(v) => setSettings({ ...settings, enabled: v })} />
          </div>

          {settings.enabled && (
            <div className="space-y-4 border-t border-border pt-4">
              <div>
                <Label>Default supplier</Label>
                <select
                  value={settings.default_supplier_id || ""}
                  onChange={(e) => setSettings({ ...settings, default_supplier_id: e.target.value || null })}
                  className="mt-1.5 w-full h-10 rounded-md border border-input bg-background px-3 text-sm"
                >
                  <option value="">— Select supplier —</option>
                  {suppliers.map(s => (
                    <option key={s.id} value={s.id}>
                      {s.name} ({s.country_code || "—"} • {s.currency_code} • {s.default_lead_time_days}d lead)
                    </option>
                  ))}
                </select>
                {suppliers.length === 0 && (
                  <p className="text-xs text-muted-foreground mt-1">No active suppliers — contact your admin to add one.</p>
                )}
              </div>

              <div>
                <Label>Your margin %</Label>
                <Input
                  type="number"
                  value={settings.default_margin_percent}
                  onChange={(e) => setSettings({ ...settings, default_margin_percent: parseFloat(e.target.value) || 0 })}
                  className="mt-1.5"
                />
                <p className="text-[10px] text-muted-foreground mt-1">Added on top of supplier cost when listing prices are auto-calculated.</p>
              </div>

              <div className="flex items-center justify-between p-3 rounded-lg bg-muted/40">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="h-4 w-4 text-primary" />
                  <div>
                    <p className="text-sm font-medium">Auto-forward orders</p>
                    <p className="text-xs text-muted-foreground">Send each customer order to your supplier automatically.</p>
                  </div>
                </div>
                <Switch checked={settings.auto_forward_orders} onCheckedChange={(v) => setSettings({ ...settings, auto_forward_orders: v })} />
              </div>

              <div className="flex items-center justify-between p-3 rounded-lg bg-muted/40">
                <div className="flex items-center gap-2">
                  <Package className="h-4 w-4 text-primary" />
                  <div>
                    <p className="text-sm font-medium">Notify me on status changes</p>
                    <p className="text-xs text-muted-foreground">Push alerts when supplier marks shipped/delivered.</p>
                  </div>
                </div>
                <Switch checked={settings.notify_on_status_change} onCheckedChange={(v) => setSettings({ ...settings, notify_on_status_change: v })} />
              </div>
            </div>
          )}

          <Button onClick={save} disabled={saving} className="w-full">{saving ? "Saving…" : "Save settings"}</Button>
        </Card>

        <Card className="p-5 space-y-3">
          <h3 className="text-sm font-semibold">Recent supplier orders</h3>
          {recentOrders.length === 0 ? (
            <p className="text-sm text-muted-foreground">No supplier orders yet.</p>
          ) : (
            <div className="space-y-2">
              {recentOrders.map(o => (
                <div key={o.id} className="flex items-center justify-between p-3 rounded-lg border border-border/50">
                  <div className="min-w-0">
                    <p className="text-sm font-medium font-mono truncate">{o.order_id}</p>
                    <p className="text-xs text-muted-foreground">{new Date(o.created_at).toLocaleString()} • {o.currency_code} {o.cost_total}</p>
                  </div>
                  <Badge variant={o.status === "delivered" ? "default" : "outline"} className="text-[10px]">{o.status}</Badge>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </VendorLayout>
  );
}
