import { useEffect, useMemo, useRef, useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { MapPin, Radius, Store, Package, User, ShoppingCart, Search, X } from "lucide-react";

interface Vendor {
  id: string;
  business_name?: string;
  name?: string;
  category_id?: string;
  state_name?: string;
  city_id?: string;
  shop_latitude?: number;
  shop_longitude?: number;
}
interface District { id: string; name: string; state_id?: string }
interface State { id: string; name: string; code?: string }
interface Category { id: string; name: string; parent_id?: string }

interface Props {
  editing: any;
  onChange: (patch: any) => void;
  vendors: Vendor[];
  districts: District[];
}

const RADIUS_PRESETS = [1, 2, 5, 10, 20, 25, 50, 100];
const SEGMENTS = [
  { v: "first_time",  label: "First-time users" },
  { v: "existing",    label: "Existing customers" },
  { v: "referral",    label: "Referral customers" },
  { v: "vip",         label: "VIP customers" },
];

function CheckList<T extends { id: string; name?: string; business_name?: string }>(
  { items, selected, onToggle, placeholder }: { items: T[]; selected: string[]; onToggle: (id: string) => void; placeholder: string }
) {
  const [q, setQ] = useState("");
  const filtered = q ? items.filter(i => (i.business_name || i.name || "").toLowerCase().includes(q.toLowerCase())) : items;
  return (
    <div className="border rounded bg-background">
      <div className="p-1.5 border-b">
        <div className="relative">
          <Search className="w-3 h-3 absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input value={q} onChange={e => setQ(e.target.value)} placeholder={placeholder} className="h-7 pl-6 text-xs" />
        </div>
      </div>
      <div className="max-h-40 overflow-auto p-2 space-y-0.5">
        {filtered.map(i => {
          const checked = selected.includes(i.id);
          return (
            <label key={i.id} className="flex items-center gap-2 text-xs cursor-pointer hover:bg-muted/50 rounded px-1 py-0.5">
              <input type="checkbox" checked={checked} onChange={() => onToggle(i.id)} />
              <span className="truncate">{i.business_name || i.name}</span>
            </label>
          );
        })}
        {filtered.length === 0 && <p className="text-[11px] text-muted-foreground text-center py-3">No matches</p>}
      </div>
    </div>
  );
}

export function CouponEligibilityTabs({ editing, onChange, vendors, districts }: Props) {
  const [states, setStates] = useState<State[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [vendorCats, setVendorCats] = useState<Category[]>([]);
  const [cities, setCities] = useState<{ id: string; name: string; state?: string }[]>([]);

  useEffect(() => {
    supabase.from("states").select("id,name,code").order("name").then(({ data }) => setStates((data as any) || []));
    supabase.from("categories").select("id,name,parent_id").eq("category_type", "product").order("name").limit(500)
      .then(({ data }) => setCategories((data as any) || []));
    supabase.from("categories").select("id,name,parent_id").eq("category_type", "vendor").order("name").limit(200)
      .then(({ data }) => setVendorCats((data as any) || []));
    supabase.from("cities").select("id,name,state").then(({ data }) => setCities((data as any) || []));
  }, []);

  const toggleArr = (field: string, id: string) => {
    const cur: string[] = editing[field] || [];
    onChange({ [field]: cur.includes(id) ? cur.filter(x => x !== id) : [...cur, id] });
  };

  const toggleSegment = (v: string) => {
    const cur: string[] = editing.customer_segments || [];
    onChange({ customer_segments: cur.includes(v) ? cur.filter(x => x !== v) : [...cur, v] });
  };

  const num = (v: any) => (v === "" || v === null || v === undefined ? null : Number(v));

  // ── Location-aware vendor filter ─────────────────────────────
  // Vendors are filtered by the states/districts chosen on the Location tab.
  // • state_codes stores state NAMES (see the Location tab handler).
  // • districts don't have a foreign-key on vendors, but cities carry a state
  //   name; when the admin selects a district, we resolve its state via
  //   `districts → state_id → states → name` and intersect with the vendor's
  //   state_name. If no location is chosen, ALL active vendors are shown.
  const filteredVendors = useMemo(() => {
    const stateNames = new Set<string>(editing.state_codes || []);
    const districtIds: string[] = editing.district_ids || [];
    if (districtIds.length > 0 && states.length > 0) {
      for (const d of districts) {
        if (districtIds.includes(d.id)) {
          const st = states.find(s => s.id === d.state_id);
          if (st?.name) stateNames.add(st.name);
        }
      }
    }
    if (stateNames.size === 0) return vendors;
    return vendors.filter(v => v.state_name && stateNames.has(v.state_name));
  }, [vendors, editing.state_codes, editing.district_ids, districts, states]);

  const locationLabel = useMemo(() => {
    const parts: string[] = [];
    if ((editing.state_codes || []).length) parts.push(`${editing.state_codes.length} state(s)`);
    if ((editing.district_ids || []).length) parts.push(`${editing.district_ids.length} district(s)`);
    return parts.length ? parts.join(" · ") : "all locations";
  }, [editing.state_codes, editing.district_ids]);

  return (
    <div className="border rounded-lg p-3 bg-muted/20 space-y-2">
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Eligibility Configuration</p>
      <Tabs defaultValue="location">
        <TabsList className="w-full flex-wrap h-auto">
          <TabsTrigger value="location" className="text-xs"><MapPin className="w-3 h-3 mr-1" />Location</TabsTrigger>
          <TabsTrigger value="radius" className="text-xs"><Radius className="w-3 h-3 mr-1" />Radius</TabsTrigger>
          <TabsTrigger value="vendors" className="text-xs"><Store className="w-3 h-3 mr-1" />Vendors</TabsTrigger>
          <TabsTrigger value="products" className="text-xs"><Package className="w-3 h-3 mr-1" />Products</TabsTrigger>
          <TabsTrigger value="customers" className="text-xs"><User className="w-3 h-3 mr-1" />Customers</TabsTrigger>
          <TabsTrigger value="order" className="text-xs"><ShoppingCart className="w-3 h-3 mr-1" />Order</TabsTrigger>
        </TabsList>

        {/* LOCATION */}
        <TabsContent value="location" className="space-y-3 mt-3">
          <div className="grid sm:grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">States (empty = all)</Label>
              <CheckList items={states as any} selected={editing.state_codes || []}
                onToggle={(id) => {
                  const st = states.find(s => s.id === id);
                  if (!st) return;
                  const key = st.name;
                  const cur: string[] = editing.state_codes || [];
                  onChange({ state_codes: cur.includes(key) ? cur.filter(x => x !== key) : [...cur, key] });
                }}
                placeholder="Search states…" />
            </div>
            <div>
              <Label className="text-xs">Districts (empty = all)</Label>
              <CheckList items={districts as any} selected={editing.district_ids || []}
                onToggle={(id) => toggleArr("district_ids", id)} placeholder="Search districts…" />
            </div>
          </div>
          <div>
            <Label className="text-xs">Pincodes (comma-separated)</Label>
            <Input value={(editing.pincodes || []).join(", ")}
              onChange={e => onChange({ pincodes: e.target.value.split(",").map(s => s.trim()).filter(Boolean) })}
              placeholder="637001, 637002, 637003" className="h-8 text-xs" />
          </div>
        </TabsContent>

        {/* RADIUS */}
        <TabsContent value="radius" className="space-y-3 mt-3">
          <div className="flex items-center gap-2">
            <Switch checked={!!editing.use_geo_radius} onCheckedChange={v => onChange({ use_geo_radius: v })} />
            <Label className="!m-0 text-xs">Restrict to a GPS radius around a location</Label>
          </div>
          {editing.use_geo_radius && (
            <>
              <div>
                <Label className="text-xs">Radius (km)</Label>
                <div className="flex flex-wrap gap-1 mb-1">
                  {RADIUS_PRESETS.map(r => (
                    <Button key={r} size="sm" type="button" variant={editing.radius_km === r ? "default" : "outline"}
                      className="h-7 px-2 text-xs" onClick={() => onChange({ radius_km: r })}>{r} km</Button>
                  ))}
                </div>
                <Input type="number" min={0.5} step={0.5} value={editing.radius_km ?? 5}
                  onChange={e => onChange({ radius_km: Number(e.target.value) })} className="h-8 text-xs" />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div><Label className="text-xs">Center Lat</Label>
                  <Input type="number" step="0.000001" value={editing.center_lat ?? ""}
                    onChange={e => onChange({ center_lat: num(e.target.value) })} className="h-8 text-xs" /></div>
                <div><Label className="text-xs">Center Lng</Label>
                  <Input type="number" step="0.000001" value={editing.center_lng ?? ""}
                    onChange={e => onChange({ center_lng: num(e.target.value) })} className="h-8 text-xs" /></div>
              </div>
              <p className="text-[11px] text-muted-foreground">Tip: Selecting a vendor auto-fills lat/lng from that vendor's shop.</p>
            </>
          )}
        </TabsContent>

        {/* VENDORS — location-aware, vendor picker FIRST */}
        <TabsContent value="vendors" className="space-y-3 mt-3">
          <div className="flex items-center justify-between gap-2">
            <p className="text-[11px] text-muted-foreground">
              Showing vendors for <span className="font-medium text-foreground">{locationLabel}</span>
              {filteredVendors.length !== vendors.length && ` · ${filteredVendors.length} of ${vendors.length}`}
            </p>
            {(editing.vendor_ids || []).length > 0 && (
              <Button size="sm" variant="ghost" className="h-6 px-2 text-[11px]"
                onClick={() => onChange({ vendor_ids: [] })}>
                <X className="w-3 h-3 mr-0.5" />Clear vendors
              </Button>
            )}
          </div>

          <div>
            <Label className="text-xs">Vendors (empty = all active in this location)</Label>
            <CheckList items={filteredVendors as any} selected={editing.vendor_ids || []}
              onToggle={(id) => toggleArr("vendor_ids", id)} placeholder="Search vendors…" />
            {(editing.vendor_ids || []).length > 0 && (
              <p className="text-[11px] text-muted-foreground mt-1">
                <Badge variant="secondary" className="text-[10px]">{editing.vendor_ids.length} selected</Badge>
              </p>
            )}
          </div>

          <div>
            <Label className="text-xs">Vendor Categories (empty = all)</Label>
            <CheckList items={vendorCats as any} selected={editing.vendor_category_ids || []}
              onToggle={(id) => toggleArr("vendor_category_ids", id)} placeholder="Search vendor categories…" />
          </div>
        </TabsContent>

        {/* PRODUCTS — depend on Vendor selection, autosuggest as you type */}
        <TabsContent value="products" className="space-y-3 mt-3">
          <ProductAutosuggest
            vendorIds={editing.vendor_ids || []}
            selectedIds={editing.product_ids || []}
            onToggle={(id) => toggleArr("product_ids", id)}
            onClear={() => onChange({ product_ids: [] })}
          />
          <div>
            <Label className="text-xs">Product Categories (empty = all)</Label>
            <CheckList items={categories as any} selected={editing.category_ids || []}
              onToggle={(id) => toggleArr("category_ids", id)} placeholder="Search product categories…" />
          </div>
        </TabsContent>


        {/* CUSTOMERS */}
        <TabsContent value="customers" className="space-y-3 mt-3">
          <div>
            <Label className="text-xs">Customer Segments</Label>
            <div className="flex flex-wrap gap-1 mt-1">
              {SEGMENTS.map(s => {
                const on = (editing.customer_segments || []).includes(s.v);
                return (
                  <Button key={s.v} type="button" size="sm" variant={on ? "default" : "outline"}
                    className="h-7 px-2 text-xs" onClick={() => toggleSegment(s.v)}>{s.label}</Button>
                );
              })}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Switch checked={!!editing.first_time_only} onCheckedChange={v => onChange({ first_time_only: v })} />
            <Label className="!m-0 text-xs">First-time users only (strict)</Label>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div><Label className="text-xs">Min orders</Label>
              <Input type="number" min={0} value={editing.min_orders ?? ""}
                onChange={e => onChange({ min_orders: num(e.target.value) })} className="h-8 text-xs" /></div>
            <div><Label className="text-xs">Max orders</Label>
              <Input type="number" min={0} value={editing.max_orders ?? ""}
                onChange={e => onChange({ max_orders: num(e.target.value) })} className="h-8 text-xs" /></div>
            <div><Label className="text-xs">Min lifetime spend ₹</Label>
              <Input type="number" min={0} value={editing.min_lifetime_spend ?? ""}
                onChange={e => onChange({ min_lifetime_spend: num(e.target.value) })} className="h-8 text-xs" /></div>
            <div><Label className="text-xs">Per-customer limit</Label>
              <Input type="number" min={1} value={editing.per_customer_limit ?? 1}
                onChange={e => onChange({ per_customer_limit: Number(e.target.value) })} className="h-8 text-xs" /></div>
          </div>
          <div>
            <Label className="text-xs">Specific customer IDs (comma-separated · empty = any)</Label>
            <Input value={(editing.customer_ids || []).join(", ")}
              onChange={e => onChange({ customer_ids: e.target.value.split(",").map(s => s.trim()).filter(Boolean) })}
              placeholder="uuid, uuid, uuid…" className="h-8 text-xs" />
          </div>
        </TabsContent>

        {/* ORDER */}
        <TabsContent value="order" className="space-y-3 mt-3">
          <div className="grid grid-cols-2 gap-2">
            <div><Label className="text-xs">Min cart value ₹</Label>
              <Input type="number" min={0} value={editing.min_order_amount ?? 0}
                onChange={e => onChange({ min_order_amount: num(e.target.value) ?? 0 })} className="h-8 text-xs" /></div>
            <div><Label className="text-xs">Max cart value ₹</Label>
              <Input type="number" min={0} value={editing.max_order_amount ?? ""}
                onChange={e => onChange({ max_order_amount: num(e.target.value) })} className="h-8 text-xs" /></div>
            <div><Label className="text-xs">Min quantity</Label>
              <Input type="number" min={1} value={editing.min_qty ?? ""}
                onChange={e => onChange({ min_qty: num(e.target.value) })} className="h-8 text-xs" /></div>
            <div><Label className="text-xs">Max quantity (e.g. "first 1 litre")</Label>
              <Input type="number" min={1} value={editing.max_qty ?? editing.qty_limit ?? 1}
                onChange={e => onChange({ max_qty: num(e.target.value), qty_limit: num(e.target.value) ?? 1 })} className="h-8 text-xs" /></div>
          </div>
          <div className="grid grid-cols-2 gap-2 pt-1">
            <div className="flex items-center gap-2">
              <Switch checked={!!editing.stackable} onCheckedChange={v => onChange({ stackable: v })} />
              <Label className="!m-0 text-xs">Stackable with other coupons</Label>
            </div>
            <div className="flex items-center gap-2">
              <Switch checked={!!editing.exclusive} onCheckedChange={v => onChange({ exclusive: v })} />
              <Label className="!m-0 text-xs">Exclusive (blocks other coupons)</Label>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
