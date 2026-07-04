import { useEffect, useMemo, useState } from "react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { friendlyError } from "@/lib/friendly-error";
import { Plus, Pencil, Trash2, Tag, Download, Ticket } from "lucide-react";

type Campaign = any;

interface Vendor { id: string; business_name?: string; name?: string; shop_latitude?: number; shop_longitude?: number }
interface Product { id: string; title: string; vendor_id: string; price: number }
interface District { id: string; name: string; state_id?: string }

const CODE_MODES = [
  { value: "unique_single_use", label: "Unique codes (each code used once by one user)" },
  { value: "shared_per_customer", label: "One shared code (each user can use once)" },
];

export default function AdminCouponsPage() {
  const [list, setList] = useState<Campaign[]>([]);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [districts, setDistricts] = useState<District[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Partial<Campaign> | null>(null);
  const [codesView, setCodesView] = useState<{ campaign: Campaign; codes: any[] } | null>(null);
  const [bulkCount, setBulkCount] = useState(100);
  const [bulkLen, setBulkLen] = useState(8);

  const load = async () => {
    setLoading(true);
    const [{ data: c }, { data: v }, { data: d }] = await Promise.all([
      supabase.from("coupon_campaigns").select("*").order("created_at", { ascending: false }),
      supabase.from("vendors").select("id, business_name, name, shop_latitude, shop_longitude").eq("status", "active").order("business_name"),
      supabase.from("districts").select("id, name, state_id").eq("status", "active").order("name"),
    ]);
    setList((c as any) || []);
    setVendors((v as any) || []);
    setDistricts((d as any) || []);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const loadProductsForVendor = async (vendorId: string | null | undefined) => {
    if (!vendorId) { setProducts([]); return; }
    const { data } = await supabase.from("products").select("id, title, vendor_id, price").eq("vendor_id", vendorId).eq("status", "active").order("title");
    setProducts((data as any) || []);
  };

  const openNew = () => {
    setEditing({
      name: "", description: "",
      discount_type: "flat", discount_value: 50, min_order_amount: 0,
      vendor_id: null, product_ids: [], district_ids: [],
      use_geo_radius: false, radius_km: 5, center_lat: null, center_lng: null,
      first_time_only: true, qty_limit: 1, per_customer_limit: 1,
      code_mode: "unique_single_use",
      popup_enabled: true, popup_title: "", popup_description: "", popup_image_url: "", popup_target: "new_users",
      total_codes_target: 100,
      starts_at: new Date().toISOString(),
      expires_at: null,
      rollback_policy: "always_restore",
      rollback_window_minutes: null,
      is_active: true,
    });
    setProducts([]);
  };

  const openEdit = async (c: Campaign) => {
    setEditing({ ...c });
    if (c.vendor_id) await loadProductsForVendor(c.vendor_id);
  };

  const save = async () => {
    if (!editing?.name) return toast.error("Name is required");
    if (!editing.discount_value || Number(editing.discount_value) <= 0) return toast.error("Discount value must be > 0");
    const payload: any = { ...editing };
    if (!payload.vendor_id) payload.vendor_id = null;
    if (!payload.expires_at) payload.expires_at = null;
    payload.product_ids = payload.product_ids || [];
    payload.district_ids = payload.district_ids || [];
    // Remove computed columns
    delete payload.total_codes_generated;
    delete payload.total_codes_used;
    delete payload.created_at;
    delete payload.updated_at;
    if (payload.id) {
      const { error } = await supabase.from("coupon_campaigns").update(payload).eq("id", payload.id);
      if (error) return toast.error(friendlyError(error));
    } else {
      const { error } = await supabase.from("coupon_campaigns").insert(payload);
      if (error) return toast.error(friendlyError(error));
    }
    toast.success("Saved");
    setEditing(null);
    load();
  };

  const del = async (id: string) => {
    if (!confirm("Delete this campaign and all its codes?")) return;
    const { error } = await supabase.from("coupon_campaigns").delete().eq("id", id);
    if (error) return toast.error(friendlyError(error));
    load();
  };

  const generate = async (c: Campaign, count: number, length: number) => {
    const { data, error } = await (supabase.rpc as any)("generate_coupon_codes", {
      _campaign_id: c.id, _count: count, _length: length,
    });
    if (error) return toast.error(friendlyError(error));
    toast.success(`Generated ${Array.isArray(data) ? data.length : 0} codes`);
    load();
    viewCodes(c);
  };

  const viewCodes = async (c: Campaign) => {
    const { data } = await supabase.from("coupon_codes").select("*").eq("campaign_id", c.id).order("created_at", { ascending: false }).limit(2000);
    setCodesView({ campaign: c, codes: (data as any) || [] });
  };

  const exportCodesCsv = () => {
    if (!codesView) return;
    const rows = [["code", "status", "used_by_mobile", "used_order_id", "used_at"]];
    codesView.codes.forEach(c => rows.push([c.code, c.status, c.used_by_mobile || "", c.used_order_id || "", c.used_at || ""]));
    const csv = rows.map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `coupons_${codesView.campaign.name}.csv`;
    a.click();
  };

  return (
    <AdminLayout>
      <div className="page-header flex justify-between items-start">
        <div>
          <h1 className="page-title">Coupons</h1>
          <p className="page-description">{list.length} campaigns · bulk-generate 6-8 digit codes tied to vendors, products, districts</p>
        </div>
        <Button onClick={openNew}><Plus className="w-4 h-4 mr-1" /> New Campaign</Button>
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><div className="h-8 w-8 rounded-full border-2 border-primary border-t-transparent animate-spin" /></div>
      ) : (
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          {list.map(c => (
            <Card key={c.id} className="p-4 space-y-2">
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2"><Tag className="w-4 h-4 text-primary shrink-0" /><h3 className="font-bold truncate">{c.name}</h3></div>
                  <p className="text-[11px] text-muted-foreground line-clamp-2 mt-0.5">{c.description}</p>
                </div>
                <Badge variant={c.is_active ? "default" : "outline"}>{c.is_active ? "Active" : "Inactive"}</Badge>
              </div>
              <div className="text-xs space-y-0.5">
                <p>{c.discount_type === "percent" ? `${c.discount_value}% off` : `₹${c.discount_value} off`}{c.max_discount ? ` (max ₹${c.max_discount})` : ""}</p>
                <p className="text-muted-foreground">Codes: {c.total_codes_generated} generated · {c.total_codes_used} used</p>
                <p className="text-muted-foreground">Mode: {c.code_mode.replace("_", " ")}</p>
                <p className="text-muted-foreground">Vendor: {vendors.find(v => v.id === c.vendor_id)?.business_name || "Any"}</p>
                {c.first_time_only && <Badge variant="secondary" className="text-[10px]">First-time users only</Badge>}
              </div>
              <div className="flex flex-wrap gap-2 pt-2">
                <Button size="sm" variant="outline" onClick={() => openEdit(c)}><Pencil className="w-3 h-3 mr-1" />Edit</Button>
                <Button size="sm" variant="outline" onClick={() => viewCodes(c)}><Ticket className="w-3 h-3 mr-1" />Codes</Button>
                <Button size="sm" variant="ghost" onClick={() => del(c.id)}><Trash2 className="w-3 h-3 text-destructive" /></Button>
              </div>
            </Card>
          ))}
          {list.length === 0 && <p className="text-sm text-muted-foreground col-span-full text-center py-12">No campaigns yet.</p>}
        </div>
      )}

      {/* Edit dialog */}
      <Dialog open={!!editing} onOpenChange={o => !o && setEditing(null)}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editing?.id ? "Edit Campaign" : "New Campaign"}</DialogTitle></DialogHeader>
          {editing && (
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="sm:col-span-2"><Label>Name *</Label><Input value={editing.name || ""} onChange={e => setEditing({ ...editing, name: e.target.value })} placeholder="Namakkal Petrol Welcome ₹50" /></div>
              <div className="sm:col-span-2"><Label>Description</Label><Textarea rows={2} value={editing.description || ""} onChange={e => setEditing({ ...editing, description: e.target.value })} /></div>
              <div><Label>Discount Type</Label>
                <Select value={editing.discount_type} onValueChange={v => setEditing({ ...editing, discount_type: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="flat">Flat ₹</SelectItem>
                    <SelectItem value="percent">Percent %</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div><Label>Discount Value *</Label><Input type="number" step="0.01" value={editing.discount_value ?? 0} onChange={e => setEditing({ ...editing, discount_value: Number(e.target.value) })} /></div>
              <div><Label>Max Discount ₹ (for %)</Label><Input type="number" value={editing.max_discount ?? ""} onChange={e => setEditing({ ...editing, max_discount: e.target.value ? Number(e.target.value) : null })} /></div>
              <div><Label>Min Order ₹</Label><Input type="number" value={editing.min_order_amount ?? 0} onChange={e => setEditing({ ...editing, min_order_amount: Number(e.target.value) })} /></div>

              <div className="sm:col-span-2"><Label>Vendor (leave empty = all vendors)</Label>
                <Select value={editing.vendor_id || "__none__"} onValueChange={async v => {
                  const vid = v === "__none__" ? null : v;
                  const vendor = vendors.find(x => x.id === vid);
                  setEditing({
                    ...editing, vendor_id: vid, product_ids: [],
                    center_lat: vendor?.shop_latitude ?? editing.center_lat,
                    center_lng: vendor?.shop_longitude ?? editing.center_lng,
                  });
                  await loadProductsForVendor(vid);
                }}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">Any vendor</SelectItem>
                    {vendors.map(v => <SelectItem key={v.id} value={v.id}>{v.business_name || v.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              {editing.vendor_id && (
                <div className="sm:col-span-2">
                  <Label>Products (multi-select · empty = all vendor products)</Label>
                  <div className="border rounded p-2 max-h-40 overflow-auto space-y-1 bg-background">
                    {products.length === 0 && <p className="text-xs text-muted-foreground">Loading / no products</p>}
                    {products.map(p => {
                      const checked = (editing.product_ids || []).includes(p.id);
                      return (
                        <label key={p.id} className="flex items-center gap-2 text-xs cursor-pointer">
                          <input type="checkbox" checked={checked} onChange={e => {
                            const cur: string[] = editing.product_ids || [];
                            setEditing({ ...editing, product_ids: e.target.checked ? [...cur, p.id] : cur.filter((x: string) => x !== p.id) });
                          }} />
                          <span className="truncate">{p.title} <span className="text-muted-foreground">— ₹{p.price}</span></span>
                        </label>
                      );
                    })}
                  </div>
                </div>
              )}

              <div className="sm:col-span-2">
                <Label>Eligible Districts (multi-select · empty = all districts)</Label>
                <div className="border rounded p-2 max-h-40 overflow-auto grid grid-cols-2 gap-1 bg-background">
                  {districts.map(d => {
                    const checked = (editing.district_ids || []).includes(d.id);
                    return (
                      <label key={d.id} className="flex items-center gap-2 text-xs cursor-pointer">
                        <input type="checkbox" checked={checked} onChange={e => {
                          const cur: string[] = editing.district_ids || [];
                          setEditing({ ...editing, district_ids: e.target.checked ? [...cur, d.id] : cur.filter((x: string) => x !== d.id) });
                        }} />
                        <span className="truncate">{d.name}</span>
                      </label>
                    );
                  })}
                </div>
              </div>

              <div className="sm:col-span-2 flex items-center gap-2 pt-1">
                <Switch checked={!!editing.use_geo_radius} onCheckedChange={v => setEditing({ ...editing, use_geo_radius: v })} />
                <Label className="!m-0">Also allow live GPS within radius of vendor</Label>
              </div>
              {editing.use_geo_radius && (
                <>
                  <div><Label>Radius (km)</Label><Input type="number" value={editing.radius_km ?? 5} onChange={e => setEditing({ ...editing, radius_km: Number(e.target.value) })} /></div>
                  <div className="grid grid-cols-2 gap-2">
                    <div><Label>Center Lat</Label><Input type="number" step="0.000001" value={editing.center_lat ?? ""} onChange={e => setEditing({ ...editing, center_lat: e.target.value ? Number(e.target.value) : null })} /></div>
                    <div><Label>Center Lng</Label><Input type="number" step="0.000001" value={editing.center_lng ?? ""} onChange={e => setEditing({ ...editing, center_lng: e.target.value ? Number(e.target.value) : null })} /></div>
                  </div>
                </>
              )}

              <div className="flex items-center gap-2"><Switch checked={!!editing.first_time_only} onCheckedChange={v => setEditing({ ...editing, first_time_only: v })} /><Label className="!m-0">First-time users only</Label></div>
              <div><Label>Qty Limit / order</Label><Input type="number" value={editing.qty_limit ?? 1} onChange={e => setEditing({ ...editing, qty_limit: Number(e.target.value) })} /></div>
              <div><Label>Per-customer limit</Label><Input type="number" value={editing.per_customer_limit ?? 1} onChange={e => setEditing({ ...editing, per_customer_limit: Number(e.target.value) })} /></div>

              <div className="sm:col-span-2"><Label>Code Mode</Label>
                <Select value={editing.code_mode} onValueChange={v => setEditing({ ...editing, code_mode: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{CODE_MODES.map(m => <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>

              <div><Label>Starts</Label><Input type="datetime-local" value={editing.starts_at ? new Date(editing.starts_at).toISOString().slice(0, 16) : ""} onChange={e => setEditing({ ...editing, starts_at: e.target.value ? new Date(e.target.value).toISOString() : new Date().toISOString() })} /></div>
              <div><Label>Expires</Label><Input type="datetime-local" value={editing.expires_at ? new Date(editing.expires_at).toISOString().slice(0, 16) : ""} onChange={e => setEditing({ ...editing, expires_at: e.target.value ? new Date(e.target.value).toISOString() : null })} /></div>

              <div className="sm:col-span-2 border-t pt-3 space-y-3">
                <div className="flex items-center gap-2"><Switch checked={!!editing.popup_enabled} onCheckedChange={v => setEditing({ ...editing, popup_enabled: v })} /><Label className="!m-0">Show popup to eligible customers on Home</Label></div>
                {editing.popup_enabled && (
                  <div className="grid sm:grid-cols-2 gap-3">
                    <div className="sm:col-span-2"><Label>Popup Title</Label><Input value={editing.popup_title || ""} onChange={e => setEditing({ ...editing, popup_title: e.target.value })} placeholder="₹50 off your first litre" /></div>
                    <div className="sm:col-span-2"><Label>Popup Description</Label><Textarea rows={2} value={editing.popup_description || ""} onChange={e => setEditing({ ...editing, popup_description: e.target.value })} /></div>
                    <div className="sm:col-span-2"><Label>Popup Image URL</Label><Input value={editing.popup_image_url || ""} onChange={e => setEditing({ ...editing, popup_image_url: e.target.value })} /></div>
                    <div><Label>Audience</Label>
                      <Select value={editing.popup_target} onValueChange={v => setEditing({ ...editing, popup_target: v })}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="new_users">New users (no prior order)</SelectItem>
                          <SelectItem value="all">All eligible users</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                )}
              </div>

              <div className="flex items-center gap-2"><Switch checked={!!editing.is_active} onCheckedChange={v => setEditing({ ...editing, is_active: v })} /><Label className="!m-0">Active</Label></div>
              <div><Label>Target codes to generate</Label><Input type="number" value={editing.total_codes_target ?? 0} onChange={e => setEditing({ ...editing, total_codes_target: Number(e.target.value) })} /></div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditing(null)}>Cancel</Button>
            <Button onClick={save}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Codes viewer */}
      <Dialog open={!!codesView} onOpenChange={o => !o && setCodesView(null)}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Codes — {codesView?.campaign.name}</DialogTitle></DialogHeader>
          {codesView && (
            <>
              <div className="flex flex-wrap items-end gap-2 border-b pb-3">
                {codesView.campaign.code_mode === "unique_single_use" ? (
                  <>
                    <div><Label>Count</Label><Input type="number" className="w-24" value={bulkCount} onChange={e => setBulkCount(Number(e.target.value))} /></div>
                    <div><Label>Length</Label><Input type="number" className="w-20" value={bulkLen} onChange={e => setBulkLen(Number(e.target.value))} min={6} max={8} /></div>
                    <Button onClick={() => generate(codesView.campaign, bulkCount, bulkLen)}><Plus className="w-4 h-4 mr-1" />Generate</Button>
                  </>
                ) : (
                  <Button onClick={() => generate(codesView.campaign, 1, bulkLen)}>
                    Generate shared code {codesView.campaign.shared_code ? `(current: ${codesView.campaign.shared_code})` : ""}
                  </Button>
                )}
                <Button variant="outline" onClick={exportCodesCsv}><Download className="w-4 h-4 mr-1" />Export CSV</Button>
              </div>
              {codesView.campaign.shared_code && (
                <div className="p-3 bg-primary/10 rounded font-mono text-lg tracking-widest text-center">
                  {codesView.campaign.shared_code}
                </div>
              )}
              <div className="overflow-auto max-h-96 border rounded">
                <table className="w-full text-xs">
                  <thead className="sticky top-0 bg-muted">
                    <tr>
                      <th className="text-left p-2">Code</th>
                      <th className="text-left p-2">Status</th>
                      <th className="text-left p-2">Used by (mobile)</th>
                      <th className="text-left p-2">Order</th>
                      <th className="text-left p-2">Used at</th>
                    </tr>
                  </thead>
                  <tbody>
                    {codesView.codes.map(c => (
                      <tr key={c.id} className="border-t">
                        <td className="p-2 font-mono">{c.code}</td>
                        <td className="p-2"><Badge variant={c.status === "used" ? "secondary" : "outline"}>{c.status}</Badge></td>
                        <td className="p-2">{c.used_by_mobile || "—"}</td>
                        <td className="p-2">{c.used_order_id || "—"}</td>
                        <td className="p-2">{c.used_at ? new Date(c.used_at).toLocaleString() : "—"}</td>
                      </tr>
                    ))}
                    {codesView.codes.length === 0 && <tr><td colSpan={5} className="p-4 text-center text-muted-foreground">No codes yet</td></tr>}
                  </tbody>
                </table>
              </div>
            </>
          )}
          <DialogFooter><Button variant="outline" onClick={() => setCodesView(null)}>Close</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
