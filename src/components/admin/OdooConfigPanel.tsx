import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Boxes, CheckCircle2, AlertTriangle, RefreshCw, Plug, Download, History } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { odooSync } from "@/lib/odoo-sync";
import { toast } from "sonner";

interface OdooCfgRow {
  base_url: string | null;
  database_name: string | null;
  username: string | null;
  api_key_secret_name: string | null;
  default_warehouse_id: string | null;
  sync_orders: boolean;
  sync_products: boolean;
  sync_customers: boolean;
  sync_inventory: boolean;
  sync_shipments: boolean;
  last_sync_at: string | null;
  last_sync_status: string | null;
}

export function OdooConfigPanel() {
  const [cfg, setCfg] = useState<OdooCfgRow>({
    base_url: "", database_name: "", username: "",
    api_key_secret_name: "ODOO_API_KEY", default_warehouse_id: "",
    sync_orders: true, sync_products: true, sync_customers: true, sync_inventory: true, sync_shipments: true,
    last_sync_at: null, last_sync_status: null,
  });
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [pulling, setPulling] = useState(false);

  const loadAll = async () => {
    const [{ data: row }, { data: l }] = await Promise.all([
      supabase.from("odoo_config").select("*").eq("id", 1).maybeSingle(),
      supabase.from("odoo_sync_log").select("*").order("created_at", { ascending: false }).limit(20),
    ]);
    if (row) setCfg(prev => ({ ...prev, ...row } as any));
    setLogs(l || []);
    setLoading(false);
  };
  useEffect(() => { loadAll(); }, []);

  const save = async () => {
    setSaving(true);
    try {
      const { error } = await supabase.from("odoo_config").upsert({
        id: 1,
        base_url: cfg.base_url,
        database_name: cfg.database_name,
        username: cfg.username,
        api_key_secret_name: cfg.api_key_secret_name || "ODOO_API_KEY",
        default_warehouse_id: cfg.default_warehouse_id,
        sync_orders: cfg.sync_orders,
        sync_products: cfg.sync_products,
        sync_customers: cfg.sync_customers,
        sync_inventory: cfg.sync_inventory,
        sync_shipments: cfg.sync_shipments,
        updated_at: new Date().toISOString(),
      } as any);
      if (error) throw error;
      toast.success("Odoo configuration saved");
    } catch (e: any) { toast.error(e.message || "Save failed"); }
    finally { setSaving(false); }
  };

  const test = async () => {
    setTesting(true);
    try {
      const r = await odooSync.test();
      toast.success(`Connected — Odoo v${r?.version?.server_version || "?"}`);
      loadAll();
    } catch (e: any) { toast.error(e.message); }
    finally { setTesting(false); }
  };

  const pull = async () => {
    setPulling(true);
    try {
      const r = await odooSync.pullInventory();
      toast.success(`Pulled inventory — ${r?.updated}/${r?.count} matched`);
      loadAll();
    } catch (e: any) { toast.error(e.message); }
    finally { setPulling(false); }
  };

  if (loading) return <Card className="p-6">Loading…</Card>;

  const statusOk = cfg.last_sync_status === "ok";
  return (
    <div className="space-y-4">
      <Card className="p-6 space-y-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center">
              <Boxes className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h3 className="text-lg font-semibold">Odoo ERP Sync</h3>
              <p className="text-sm text-muted-foreground">Bidirectional sync of orders, products, customers and inventory.</p>
            </div>
          </div>
          {cfg.last_sync_status && (
            <Badge variant={statusOk ? "default" : "destructive"} className="gap-1">
              {statusOk ? <CheckCircle2 className="h-3 w-3" /> : <AlertTriangle className="h-3 w-3" />}
              {statusOk ? "Healthy" : "Error"}
            </Badge>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border-t border-border pt-4">
          <div>
            <Label>Odoo Base URL</Label>
            <Input placeholder="https://yourcompany.odoo.com" value={cfg.base_url || ""} onChange={e => setCfg({ ...cfg, base_url: e.target.value })} className="mt-1.5 font-mono text-sm" />
          </div>
          <div>
            <Label>Database Name</Label>
            <Input placeholder="yourcompany" value={cfg.database_name || ""} onChange={e => setCfg({ ...cfg, database_name: e.target.value })} className="mt-1.5 font-mono text-sm" />
          </div>
          <div>
            <Label>Username / Login</Label>
            <Input placeholder="admin@yourcompany.com" value={cfg.username || ""} onChange={e => setCfg({ ...cfg, username: e.target.value })} className="mt-1.5 font-mono text-sm" />
          </div>
          <div>
            <Label>API Key Secret Name</Label>
            <Input value={cfg.api_key_secret_name || ""} onChange={e => setCfg({ ...cfg, api_key_secret_name: e.target.value })} className="mt-1.5 font-mono text-sm" />
            <p className="text-[10px] text-muted-foreground mt-1">The actual key value lives in backend secrets — never in the database.</p>
          </div>
          <div className="md:col-span-2">
            <Label>Default Warehouse ID (optional)</Label>
            <Input placeholder="1" value={cfg.default_warehouse_id || ""} onChange={e => setCfg({ ...cfg, default_warehouse_id: e.target.value })} className="mt-1.5 font-mono text-sm" />
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 border-t border-border pt-4">
          {([
            ["sync_orders", "Orders"],
            ["sync_products", "Products"],
            ["sync_customers", "Customers"],
            ["sync_inventory", "Inventory"],
            ["sync_shipments", "Shipments"],
          ] as const).map(([key, label]) => (
            <label key={key} className="flex items-center justify-between gap-2 p-3 rounded-lg border border-border/50 bg-card text-sm">
              <span>{label}</span>
              <Switch checked={(cfg as any)[key]} onCheckedChange={v => setCfg({ ...cfg, [key]: v } as any)} />
            </label>
          ))}
        </div>

        <div className="flex flex-wrap gap-2">
          <Button onClick={save} disabled={saving}>{saving ? "Saving…" : "Save Configuration"}</Button>
          <Button variant="outline" onClick={test} disabled={testing}><Plug className="h-4 w-4 mr-1" />{testing ? "Testing…" : "Test Connection"}</Button>
          <Button variant="outline" onClick={pull} disabled={pulling}><Download className="h-4 w-4 mr-1" />{pulling ? "Pulling…" : "Pull Inventory"}</Button>
          <Button variant="ghost" onClick={loadAll}><RefreshCw className="h-4 w-4 mr-1" />Refresh</Button>
        </div>

        {cfg.last_sync_at && (
          <p className="text-xs text-muted-foreground">Last sync: {new Date(cfg.last_sync_at).toLocaleString()} • {cfg.last_sync_status}</p>
        )}
      </Card>

      <Card className="p-6 space-y-3">
        <div className="flex items-center gap-2 text-sm font-semibold"><History className="h-4 w-4" /> Recent Sync Activity</div>
        {logs.length === 0 ? (
          <p className="text-sm text-muted-foreground">No sync activity yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="text-muted-foreground">
                <tr className="text-left border-b border-border/50">
                  <th className="py-2">Time</th><th>Entity</th><th>Direction</th><th>Status</th><th>Odoo ID</th><th>Notes</th>
                </tr>
              </thead>
              <tbody>
                {logs.map(l => (
                  <tr key={l.id} className="border-b border-border/30">
                    <td className="py-2">{new Date(l.created_at).toLocaleString()}</td>
                    <td>{l.entity_type}</td>
                    <td>{l.direction}</td>
                    <td>
                      <Badge variant={l.status === "success" ? "default" : "destructive"} className="text-[10px]">{l.status}</Badge>
                    </td>
                    <td className="font-mono">{l.odoo_record_id || "—"}</td>
                    <td className="text-muted-foreground truncate max-w-[200px]">{l.error_message || ""}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
