import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RichTextEditor } from "@/components/ui/rich-text-editor";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Trash2, Search } from "lucide-react";
import { useState, useEffect, useCallback } from "react";
import { MediaLibraryPicker } from "@/components/admin/MediaLibraryPicker";
import { supabase } from "@/integrations/supabase/client";

interface AdvertisementModalProps {
  ad: any | null;
  open: boolean;
  onOpenChange: (o: boolean) => void;
  mode: "view" | "edit" | "create";
  onSave?: (id: string, data: any) => Promise<void>;
  onCreate?: (data: any) => Promise<void>;
  onDelete?: (id: string) => Promise<void>;
}

const PLACEMENT_OPTIONS = [
  { value: "all", label: "All Pages" },
  { value: "home", label: "Home Page" },
  { value: "products", label: "Product Listing" },
  { value: "product_detail", label: "Product Detail" },
  { value: "services", label: "Services" },
  { value: "classifieds", label: "Classifieds" },
  { value: "socio", label: "Socio Feed" },
];

const emptyForm = {
  title: "", advertiser: "", description: "", type: "banner" as string, status: "active" as string,
  image_url: "", mobile_image_url: "",
  link_type: "custom" as string, link_target_id: "", link_url: "",
  placements: ["all"] as string[],
  start_date: new Date().toISOString().split("T")[0],
  end_date: new Date(Date.now() + 30 * 86400000).toISOString().split("T")[0],
  placement: "home", impressions: 0, clicks: 0, revenue: 0,
};

export function AdvertisementModal({ ad, open, onOpenChange, mode, onSave, onCreate, onDelete }: AdvertisementModalProps) {
  const isCreate = mode === "create";
  const [editMode, setEditMode] = useState(mode === "edit" || isCreate);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(emptyForm);

  // Selectors
  const [categories, setCategories] = useState<any[]>([]);
  const [categoryFilter, setCategoryFilter] = useState("");
  const [products, setProducts] = useState<any[]>([]);
  const [productSearch, setProductSearch] = useState("");
  const [states, setStates] = useState<any[]>([]);
  const [districts, setDistricts] = useState<any[]>([]);
  const [stateFilter, setStateFilter] = useState("");
  const [districtFilter, setDistrictFilter] = useState("");
  const [vendorSearch, setVendorSearch] = useState("");
  const [vendors, setVendors] = useState<any[]>([]);

  useEffect(() => {
    if (isCreate) { setForm(emptyForm); setEditMode(true); }
    else if (ad) {
      setForm({
        title: ad.title || "", advertiser: ad.advertiser || "", description: ad.description || "",
        type: ad.type || "banner", status: ad.status || "active",
        image_url: ad.image_url || "", mobile_image_url: ad.mobile_image_url || "",
        link_type: ad.link_type || "custom", link_target_id: ad.link_target_id || "", link_url: ad.link_url || "",
        placements: ad.placements || ["all"],
        start_date: ad.start_date || "", end_date: ad.end_date || "",
        placement: ad.placement || "home", impressions: ad.impressions || 0, clicks: ad.clicks || 0, revenue: ad.revenue || 0,
      });
      setEditMode(mode === "edit");
    }
  }, [ad, mode, isCreate]);

  // Load categories on mount
  useEffect(() => {
    if (!open) return;
    supabase.from("categories").select("id, name").eq("status", "active").order("name").then(({ data }) => setCategories(data || []));
    supabase.from("states" as any).select("id, name").eq("status", "active").order("name").then(({ data }) => setStates(data || []));
  }, [open]);

  // Load products when category changes
  const loadProducts = useCallback(async () => {
    let q = supabase.from("products").select("id, title, category_name, vendor_name").eq("status", "active");
    if (categoryFilter) q = q.eq("category_id", categoryFilter);
    if (productSearch) q = q.ilike("title", `%${productSearch}%`);
    q = q.limit(20);
    const { data } = await q;
    setProducts(data || []);
  }, [categoryFilter, productSearch]);

  useEffect(() => { if (form.link_type === "product" && open) loadProducts(); }, [form.link_type, categoryFilter, productSearch, open]);

  // Load districts when state changes
  useEffect(() => {
    if (stateFilter) {
      supabase.from("districts").select("id, name").eq("state_id", stateFilter).eq("status", "active").order("name").then(({ data }) => setDistricts(data || []));
    } else { setDistricts([]); }
  }, [stateFilter]);

  // Load vendors
  const loadVendors = useCallback(async () => {
    let q = supabase.from("vendors" as any).select("id, business_name, name, city_id").in("status", ["verified", "level2_approved"]);
    if (vendorSearch) q = q.ilike("business_name", `%${vendorSearch}%`);
    q = q.limit(20);
    const { data } = await q;
    setVendors(data || []);
  }, [vendorSearch, districtFilter]);

  useEffect(() => { if (form.link_type === "vendor" && open) loadVendors(); }, [form.link_type, vendorSearch, open]);

  const togglePlacement = (val: string) => {
    setForm(f => {
      if (val === "all") return { ...f, placements: ["all"] };
      const without = f.placements.filter(p => p !== "all");
      const has = without.includes(val);
      const next = has ? without.filter(p => p !== val) : [...without, val];
      return { ...f, placements: next.length === 0 ? ["all"] : next };
    });
  };

  const handleSave = async () => {
    if (!form.title) return;
    setSaving(true);
    try {
      const payload = { ...form };
      if (isCreate) await onCreate?.(payload);
      else if (ad) await onSave?.(ad.id, payload);
      onOpenChange(false);
    } finally { setSaving(false); }
  };

  const handleDelete = async () => {
    if (!ad) return;
    setSaving(true);
    try { await onDelete?.(ad.id); onOpenChange(false); } finally { setSaving(false); }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isCreate ? "New Advertisement" : `Edit: ${ad?.title}`}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 mt-2">
          {/* Basic Info */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs text-muted-foreground">Title *</Label>
              {editMode ? <Input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} className="mt-1" /> : <p className="text-sm font-medium mt-1">{ad?.title}</p>}
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Advertiser</Label>
              {editMode ? <Input value={form.advertiser} onChange={e => setForm({ ...form, advertiser: e.target.value })} className="mt-1" /> : <p className="text-sm mt-1">{ad?.advertiser}</p>}
            </div>
          </div>

          <div>
            <Label className="text-xs text-muted-foreground">Description</Label>
            {editMode ? <RichTextEditor value={form.description} onChange={v => setForm({ ...form, description: v })} placeholder="Advertisement description..." minHeight="80px" compact /> : <p className="text-sm mt-1">{ad?.description || "—"}</p>}
          </div>

          {/* Images */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs text-muted-foreground">Desktop Image</Label>
              {editMode ? <MediaLibraryPicker value={form.image_url} onChange={url => setForm({ ...form, image_url: url })} folder="advertisements" label="Desktop" className="mt-1" /> : <p className="text-xs mt-1 truncate">{ad?.image_url || "—"}</p>}
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Mobile Image</Label>
              {editMode ? <MediaLibraryPicker value={form.mobile_image_url} onChange={url => setForm({ ...form, mobile_image_url: url })} folder="advertisements" label="Mobile" className="mt-1" /> : <p className="text-xs mt-1 truncate">{ad?.mobile_image_url || "—"}</p>}
            </div>
          </div>

          {/* Link Type & Target */}
          <div className="space-y-3 p-3 border rounded-lg bg-muted/30">
            <Label className="text-xs font-semibold">Click Destination</Label>
            {editMode ? (
              <Select value={form.link_type} onValueChange={v => setForm({ ...form, link_type: v, link_target_id: "", link_url: "" })}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="product">Product</SelectItem>
                  <SelectItem value="category">Category</SelectItem>
                  <SelectItem value="vendor">Vendor / Seller</SelectItem>
                  <SelectItem value="service">Service Category</SelectItem>
                  <SelectItem value="custom">Custom URL</SelectItem>
                </SelectContent>
              </Select>
            ) : <p className="text-sm capitalize mt-1">{ad?.link_type}</p>}

            {editMode && form.link_type === "product" && (
              <div className="space-y-2">
                <div className="grid grid-cols-2 gap-2">
                  <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                    <SelectTrigger><SelectValue placeholder="Filter by category" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all_cats">All Categories</SelectItem>
                      {categories.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <div className="relative">
                    <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input placeholder="Search product..." value={productSearch} onChange={e => setProductSearch(e.target.value)} className="pl-8" />
                  </div>
                </div>
                <div className="max-h-32 overflow-y-auto border rounded-md divide-y">
                  {products.map(p => (
                    <button key={p.id} onClick={() => setForm({ ...form, link_target_id: p.id })}
                      className={`w-full text-left px-3 py-2 text-sm hover:bg-accent ${form.link_target_id === p.id ? 'bg-primary/10 font-semibold' : ''}`}>
                      {p.title} <span className="text-xs text-muted-foreground">({p.category_name} · {p.vendor_name})</span>
                    </button>
                  ))}
                  {products.length === 0 && <p className="text-xs text-muted-foreground p-3 text-center">No products found</p>}
                </div>
              </div>
            )}

            {editMode && form.link_type === "category" && (
              <Select value={form.link_target_id} onValueChange={v => setForm({ ...form, link_target_id: v })}>
                <SelectTrigger className="mt-1"><SelectValue placeholder="Select category" /></SelectTrigger>
                <SelectContent>
                  {categories.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
            )}

            {editMode && form.link_type === "service" && (
              <Select value={form.link_target_id} onValueChange={v => setForm({ ...form, link_target_id: v })}>
                <SelectTrigger className="mt-1"><SelectValue placeholder="Select service category" /></SelectTrigger>
                <SelectContent>
                  {categories.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
            )}

            {editMode && form.link_type === "vendor" && (
              <div className="space-y-2">
                <div className="grid grid-cols-2 gap-2">
                  <Select value={stateFilter} onValueChange={v => { setStateFilter(v); setDistrictFilter(""); }}>
                    <SelectTrigger><SelectValue placeholder="Filter by state" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all_states">All States</SelectItem>
                      {states.map((s: any) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  {districts.length > 0 && (
                    <Select value={districtFilter} onValueChange={setDistrictFilter}>
                      <SelectTrigger><SelectValue placeholder="Filter by district" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all_districts">All Districts</SelectItem>
                        {districts.map((d: any) => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  )}
                </div>
                <div className="relative">
                  <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input placeholder="Search vendor..." value={vendorSearch} onChange={e => setVendorSearch(e.target.value)} className="pl-8" />
                </div>
                <div className="max-h-32 overflow-y-auto border rounded-md divide-y">
                  {vendors.map((v: any) => (
                    <button key={v.id} onClick={() => setForm({ ...form, link_target_id: v.id })}
                      className={`w-full text-left px-3 py-2 text-sm hover:bg-accent ${form.link_target_id === v.id ? 'bg-primary/10 font-semibold' : ''}`}>
                      {v.business_name} <span className="text-xs text-muted-foreground">({v.name})</span>
                    </button>
                  ))}
                  {vendors.length === 0 && <p className="text-xs text-muted-foreground p-3 text-center">No vendors found</p>}
                </div>
              </div>
            )}

            {editMode && form.link_type === "custom" && (
              <div>
                <Label className="text-xs text-muted-foreground">Custom URL</Label>
                <Input value={form.link_url} onChange={e => setForm({ ...form, link_url: e.target.value })} placeholder="/app/browse or https://..." className="mt-1" />
              </div>
            )}

            {!editMode && (
              <p className="text-sm mt-1">Target: <code className="text-xs">{ad?.link_target_id || ad?.link_url || "—"}</code></p>
            )}
          </div>

          {/* Placements */}
          <div>
            <Label className="text-xs font-semibold">Display on Pages</Label>
            {editMode ? (
              <div className="flex flex-wrap gap-3 mt-2">
                {PLACEMENT_OPTIONS.map(opt => (
                  <label key={opt.value} className="flex items-center gap-2 text-sm cursor-pointer">
                    <Checkbox
                      checked={form.placements.includes(opt.value)}
                      onCheckedChange={() => togglePlacement(opt.value)}
                    />
                    {opt.label}
                  </label>
                ))}
              </div>
            ) : (
              <p className="text-sm mt-1">{(ad?.placements || []).join(", ")}</p>
            )}
          </div>

          {/* Dates, Type, Status */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div>
              <Label className="text-xs text-muted-foreground">Type</Label>
              {editMode ? (
                <Select value={form.type} onValueChange={v => setForm({ ...form, type: v })}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="banner">Banner</SelectItem>
                    <SelectItem value="sidebar">Sidebar</SelectItem>
                    <SelectItem value="sponsored">Sponsored Post</SelectItem>
                    <SelectItem value="strip">Strip</SelectItem>
                  </SelectContent>
                </Select>
              ) : <p className="text-sm mt-1 capitalize">{ad?.type}</p>}
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Status</Label>
              {editMode ? (
                <Select value={form.status} onValueChange={v => setForm({ ...form, status: v })}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="paused">Paused</SelectItem>
                    <SelectItem value="expired">Expired</SelectItem>
                  </SelectContent>
                </Select>
              ) : <p className="text-sm mt-1 capitalize">{ad?.status}</p>}
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Start Date</Label>
              {editMode ? <Input type="date" value={form.start_date} onChange={e => setForm({ ...form, start_date: e.target.value })} className="mt-1" /> : <p className="text-xs mt-1">{ad?.start_date}</p>}
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">End Date</Label>
              {editMode ? <Input type="date" value={form.end_date} onChange={e => setForm({ ...form, end_date: e.target.value })} className="mt-1" /> : <p className="text-xs mt-1">{ad?.end_date}</p>}
            </div>
          </div>

          {/* Stats (read-only) */}
          {!isCreate && (
            <div className="grid grid-cols-3 gap-3 p-3 bg-muted/30 rounded-lg">
              <div className="text-center">
                <p className="text-2xl font-bold">{(ad?.impressions || 0).toLocaleString()}</p>
                <p className="text-xs text-muted-foreground">Impressions</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold">{(ad?.clicks || 0).toLocaleString()}</p>
                <p className="text-xs text-muted-foreground">Clicks</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold">₹{(ad?.revenue || 0).toLocaleString()}</p>
                <p className="text-xs text-muted-foreground">Revenue</p>
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="mt-4">
          {!isCreate && onDelete && editMode && (
            <Button variant="destructive" onClick={handleDelete} disabled={saving} className="mr-auto gap-1"><Trash2 className="h-4 w-4" /> Delete</Button>
          )}
          {editMode ? (
            <>
              <Button variant="outline" onClick={() => isCreate ? onOpenChange(false) : setEditMode(false)} disabled={saving}>Cancel</Button>
              <Button onClick={handleSave} disabled={saving || !form.title}>
                {saving && <div className="h-4 w-4 rounded-full border-2 border-current border-t-transparent animate-spin mr-2" />}
                {isCreate ? "Create" : "Save"}
              </Button>
            </>
          ) : (
            <>
              <Button variant="outline" onClick={() => onOpenChange(false)}>Close</Button>
              <Button onClick={() => setEditMode(true)}>Edit</Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
