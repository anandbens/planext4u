import { Service } from "@/lib/api";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RichTextEditor } from "@/components/ui/rich-text-editor";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Wrench, DollarSign, Trash2, ImageIcon, Search, MapPin, Plus, X, Clock, Globe } from "lucide-react";
import { useState, useEffect, useMemo } from "react";
import { MediaLibraryPicker } from "@/components/admin/MediaLibraryPicker";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { friendlyError } from "@/lib/friendly-error";
import { useCountry } from "@/lib/country-context";

interface ServiceModalProps {
  service: Service | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: "view" | "edit" | "create";
  onSave?: (id: string, data: Partial<Service>) => Promise<void>;
  onCreate?: (data: Partial<Service>) => Promise<void>;
  onDelete?: (id: string) => Promise<void>;
}

interface PricingSlot {
  label: string;
  duration_minutes: number;
  price: number;
}

const emptyForm = {
  title: "", description: "", short_description: "", long_description: "",
  price: 0, tax: 0, discount: 0,
  max_points_redeemable: 0, status: "draft" as Service["status"],
  vendor_id: "", vendor_name: "",
  category_id: "", category_name: "",
  subcategory_id: "", subcategory_name: "",
  emoji: "🔧", service_area: "", duration: "1-2 hours",
  image: "",
  meta_title: "", meta_description: "", slug: "",
  pricing_slots: [] as PricingSlot[],
  booking_duration_minutes: 60,
  max_bookings_per_slot: 1,
  service_duration_minutes: 60,
  sac_code: "",
  gst_rate: 18,
};

export function ServiceModal({ service, open, onOpenChange, mode, onSave, onCreate, onDelete }: ServiceModalProps) {
  const isCreate = mode === "create";
  const [editMode, setEditMode] = useState(mode === "edit" || isCreate);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [activeTab, setActiveTab] = useState("general");

  // Vendor filtering state
  const [vendorState, setVendorState] = useState("");
  const [vendorDistrict, setVendorDistrict] = useState("");
  const [vendorSearch, setVendorSearch] = useState("");

  const { country: activeCountry } = useCountry();

  // Fetch states (country-aware)
  const { data: states } = useQuery({
    queryKey: ["statesForServiceVendor", activeCountry.code],
    queryFn: async () => {
      const { data } = await supabase.from("states" as any).select("id, name").eq("status", "active").eq("country_code", activeCountry.code).order("name");
      return (data || []) as any[];
    },
  });

  const { data: districts } = useQuery({
    queryKey: ["districtsForServiceVendor", vendorState],
    queryFn: async () => {
      if (!vendorState) return [];
      const { data } = await supabase.from("districts").select("id, name").eq("state_id", vendorState).eq("status", "active").order("name");
      return (data || []) as any[];
    },
    enabled: !!vendorState,
  });

  // Vendors filtered to active country via city.country_code — SERVICE VENDORS ONLY.
  // Product-only vendors (those listed in `vendors` but not in `service_vendors`) are excluded.
  const { data: allVendors } = useQuery({
    queryKey: ["serviceVendorsForServiceModal", activeCountry.code],
    queryFn: async () => {
      const { data: sv } = await supabase
        .from("service_vendors" as any)
        .select("id, business_name, mobile, city_id, status, vendor_category")
        .in("status", ["active", "verified", "level1_approved", "level2_approved"])
        .order("business_name");
      const list = (sv || []) as any[];
      const cityIds = [...new Set(list.map((v) => v.city_id).filter(Boolean))];
      let cityMap: Record<string, { name: string; state: string }> = {};
      if (cityIds.length > 0) {
        const { data: cities } = await supabase
          .from("cities")
          .select("id, name, state, country_code")
          .in("id", cityIds)
          .eq("country_code", activeCountry.code);
        (cities || []).forEach((c: any) => { cityMap[c.id] = { name: c.name, state: c.state }; });
      }
      return list
        .filter((v) => !v.city_id || cityMap[v.city_id])
        .map((v) => ({
          ...v,
          city_name: cityMap[v.city_id]?.name || "",
          state_name: cityMap[v.city_id]?.state || "",
        }));
    },
  });

  // Filter vendors
  const filteredVendors = useMemo(() => {
    if (!allVendors) return [];
    let list = allVendors;
    if (vendorState) {
      const stateObj = (states || []).find((s: any) => s.id === vendorState);
      if (stateObj) list = list.filter((v: any) => v.state_name === stateObj.name);
    }
    if (vendorDistrict) {
      const distObj = (districts || []).find((d: any) => d.id === vendorDistrict);
      if (distObj) list = list.filter((v: any) => v.city_name === distObj.name);
    }
    if (vendorSearch) {
      const q = vendorSearch.toLowerCase();
      list = list.filter((v: any) =>
        v.business_name?.toLowerCase().includes(q) ||
        v.mobile?.includes(q) ||
        v.id?.toLowerCase().includes(q)
      );
    }
    return list;
  }, [allVendors, vendorState, vendorDistrict, vendorSearch, states, districts]);

  // Parent service categories (top-level only) — from both `categories` (category_type='service')
  // and legacy `service_categories` table, so admin sees only service-typed parents.
  const { data: dbCategories } = useQuery({
    queryKey: ["serviceParentCategoriesForModal_v2"],
    queryFn: async () => {
      const [catRes, svcRes]: any[] = await Promise.all([
        supabase.from("categories" as any)
          .select("id, name, parent_id, category_type")
          .eq("status", "active")
          .eq("category_type", "service")
          .is("parent_id", null)
          .order("name"),
        supabase.from("service_categories" as any)
          .select("id, name, parent_id")
          .eq("status", "active")
          .is("parent_id", null)
          .order("name"),
      ]);
      const merged: any[] = [...((catRes?.data) || []), ...((svcRes?.data) || [])];
      const seen = new Set<string>();
      return merged.filter((c: any) => {
        if (seen.has(c.id)) return false;
        seen.add(c.id);
        return true;
      });
    },
  });

  // Subcategories for the selected parent — checks both tables
  const { data: dbSubcategories } = useQuery({
    queryKey: ["serviceSubcategoriesForModal_v2", form.category_id],
    queryFn: async () => {
      if (!form.category_id) return [];
      const [catRes, svcRes]: any[] = await Promise.all([
        supabase.from("categories" as any)
          .select("id, name, parent_id, category_type")
          .eq("status", "active")
          .eq("category_type", "service")
          .eq("parent_id", form.category_id)
          .order("name"),
        supabase.from("service_categories" as any)
          .select("id, name, parent_id")
          .eq("status", "active")
          .eq("parent_id", form.category_id)
          .order("name"),
      ]);
      const merged: any[] = [...((catRes?.data) || []), ...((svcRes?.data) || [])];
      const seen = new Set<string>();
      return merged.filter((c: any) => {
        if (seen.has(c.id)) return false;
        seen.add(c.id);
        return true;
      });
    },
    enabled: !!form.category_id,
  });

  useEffect(() => {
    if (isCreate) { setForm(emptyForm); setEditMode(true); setActiveTab("general"); setVendorState(""); setVendorDistrict(""); setVendorSearch(""); }
    else if (service) {
      setForm({
        title: service.title, description: service.description,
        short_description: service.short_description || "",
        long_description: service.long_description || "",
        price: service.price, tax: service.tax, discount: service.discount,
        max_points_redeemable: service.max_points_redeemable, status: service.status,
        vendor_id: service.vendor_id, vendor_name: service.vendor_name || "",
        category_id: service.category_id, category_name: service.category_name || "",
        subcategory_id: (service as any).subcategory_id || "",
        subcategory_name: (service as any).subcategory_name || "",
        emoji: service.emoji || "🔧", service_area: service.service_area || "",
        duration: service.duration || "1-2 hours",
        image: (service as any).image || "",
        meta_title: service.meta_title || "",
        meta_description: service.meta_description || "",
        slug: service.slug || "",
        pricing_slots: (service.pricing_slots || []) as PricingSlot[],
        booking_duration_minutes: service.booking_duration_minutes || 60,
        max_bookings_per_slot: service.max_bookings_per_slot || 1,
        service_duration_minutes: (service as any).service_duration_minutes || 60,
        sac_code: (service as any).sac_code || "",
        gst_rate: (service as any).gst_rate ?? 18,
      });
      setEditMode(mode === "edit");
      setActiveTab("general");
    }
  }, [service, mode]);

  const handleSave = async () => {
    const errors: string[] = [];
    if (!form.title.trim()) errors.push("Service title is required");
    else if (form.title.trim().length < 2) errors.push("Title must be at least 2 characters");
    else if (form.title.length > 200) errors.push("Title must be under 200 characters");
    if (!form.vendor_id) errors.push("Vendor is required");
    if (!form.category_id) errors.push("Service category is required");
    if (!form.description?.trim()) errors.push("Description is required");
    if (!form.short_description?.trim()) errors.push("Short Description is required");
    if (!form.long_description?.trim()) errors.push("Long Description is required");
    if (form.price <= 0) errors.push("Base price must be greater than 0");
    if (form.discount && form.discount < 0) errors.push("Discount cannot be negative");
    if (form.discount && form.discount > form.price) errors.push("Discount cannot exceed price");
    if (!form.duration?.trim()) errors.push("Duration is required");
    if (!form.service_area?.trim()) errors.push("Service area is required");
    if (!form.image) errors.push("Service image is required");
    if (form.sac_code && !/^\d{4,8}$/.test(form.sac_code.trim())) errors.push("SAC code must be 4-8 digits");
    if (form.gst_rate !== null && form.gst_rate !== undefined && (form.gst_rate < 0 || form.gst_rate > 28)) errors.push("GST rate must be between 0 and 28");
    if (form.slug && !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(form.slug.trim())) errors.push("Slug must be lowercase letters/numbers/hyphens only");
    if (form.booking_duration_minutes < 5 || form.booking_duration_minutes > 1440) errors.push("Booking duration must be 5-1440 minutes");
    if (form.max_bookings_per_slot < 1) errors.push("Max bookings per slot must be at least 1");
    if (!form.service_duration_minutes || form.service_duration_minutes < 15) errors.push("Service duration must be at least 15 minutes");
    if (errors.length > 0) { toast.error(errors[0]); return; }
    setSaving(true);
    try {
      if (isCreate) await onCreate?.(form);
      else if (service) await onSave?.(service.id, form);
      onOpenChange(false);
    } catch (err: any) {
      console.error("Service save error:", err);
      toast.error(friendlyError(err, "Failed to save service. Please review your input and try again."));
    } finally { setSaving(false); }
  };

  const handleDelete = async () => {
    if (!service) return;
    setSaving(true);
    try { await onDelete?.(service.id); onOpenChange(false); } finally { setSaving(false); }
  };

  const handleVendorChange = (id: string) => {
    const v = (allVendors || []).find((sv: any) => sv.id === id);
    setForm({ ...form, vendor_id: id, vendor_name: v?.business_name || "" });
  };

  const handleCategoryChange = (id: string) => {
    const c = (dbCategories || []).find((sc: any) => sc.id === id);
    setForm({ ...form, category_id: id, category_name: c?.name || "" });
  };

  const addPricingSlot = () => {
    setForm({ ...form, pricing_slots: [...form.pricing_slots, { label: "", duration_minutes: 60, price: 0 }] });
  };

  const updateSlot = (idx: number, field: string, value: any) => {
    const updated = [...form.pricing_slots];
    (updated[idx] as any)[field] = value;
    setForm({ ...form, pricing_slots: updated });
  };

  const removeSlot = (idx: number) => {
    setForm({ ...form, pricing_slots: form.pricing_slots.filter((_, i) => i !== idx) });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl gradient-success flex items-center justify-center shrink-0">
              <Wrench className="h-5 w-5 text-card" />
            </div>
            <div>
              <span>{isCreate ? "New Service" : service?.title}</span>
              {!isCreate && service && <p className="text-xs font-normal text-muted-foreground mt-0.5">{service.id}</p>}
            </div>
          </DialogTitle>
          {!isCreate && service && (
            <DialogDescription className="flex items-center gap-2 pt-1">
              <StatusBadge status={service.status} />
              <span className="text-xs text-muted-foreground">{service.vendor_name}</span>
            </DialogDescription>
          )}
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="mt-2">
          <TabsList className="grid grid-cols-4 w-full">
            <TabsTrigger value="general">General</TabsTrigger>
            <TabsTrigger value="pricing">Pricing & Slots</TabsTrigger>
            <TabsTrigger value="description">Descriptions</TabsTrigger>
            <TabsTrigger value="seo">SEO</TabsTrigger>
          </TabsList>

          {/* General Tab */}
          <TabsContent value="general" className="space-y-4 mt-4">
            {/* Image Upload */}
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground flex items-center gap-1"><ImageIcon className="h-3 w-3" /> Service Image</Label>
              {editMode ? (
                <MediaLibraryPicker value={form.image} onChange={(url) => setForm({ ...form, image: url })} folder="services" label="Upload Service Image" />
              ) : form.image ? (
                <div className="h-32 w-full rounded-lg overflow-hidden bg-secondary/20 border border-border/30">
                  <img loading="lazy" decoding="async" src={form.image} alt="Preview" className="w-full h-full object-cover" />
                </div>
              ) : null}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <Label className="text-xs text-muted-foreground">Title *</Label>
                {editMode ? <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className="mt-1" placeholder="Service name" /> : <p className="text-sm font-medium mt-1">{service?.title}</p>}
              </div>
              <div className="col-span-2">
                <Label className="text-xs text-muted-foreground">Description</Label>
                {editMode ? <RichTextEditor value={form.description} onChange={(v) => setForm({ ...form, description: v })} placeholder="Service description..." minHeight="100px" compact /> : <p className="text-sm mt-1 text-muted-foreground">{service?.description}</p>}
              </div>

              {/* Vendor Selection with State/District Filtering */}
              {editMode && (
                <>
                  <div className="col-span-2 p-3 rounded-lg bg-secondary/20 border border-border/30 space-y-3">
                    <h4 className="text-sm font-semibold flex items-center gap-2"><MapPin className="h-4 w-4 text-primary" /> Vendor Selection</h4>
                    <div className="grid grid-cols-3 gap-3">
                      <div>
                        <Label className="text-xs text-muted-foreground">State</Label>
                        <Select value={vendorState || undefined} onValueChange={(v) => { setVendorState(v); setVendorDistrict(""); }}>
                          <SelectTrigger className="mt-1"><SelectValue placeholder="All states" /></SelectTrigger>
                          <SelectContent>
                            {(states || []).map((s: any) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label className="text-xs text-muted-foreground">District</Label>
                        <Select value={vendorDistrict || undefined} onValueChange={setVendorDistrict} disabled={!vendorState}>
                          <SelectTrigger className="mt-1"><SelectValue placeholder="All districts" /></SelectTrigger>
                          <SelectContent>
                            {(districts || []).map((d: any) => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label className="text-xs text-muted-foreground">Search Vendor</Label>
                        <div className="relative mt-1">
                          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                          <Input value={vendorSearch} onChange={(e) => setVendorSearch(e.target.value)} className="pl-8" placeholder="Name, mobile, ID..." />
                        </div>
                      </div>
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground">Vendor *</Label>
                      <Select value={form.vendor_id || undefined} onValueChange={handleVendorChange}>
                        <SelectTrigger className="mt-1"><SelectValue placeholder="Select vendor" /></SelectTrigger>
                        <SelectContent className="max-h-48">
                          {filteredVendors.map((v: any) => (
                            <SelectItem key={v.id} value={v.id}>
                              {v.business_name} {v.city_name ? `(${v.city_name})` : ""} — {v.mobile || v.id}
                            </SelectItem>
                          ))}
                          {filteredVendors.length === 0 && <div className="px-3 py-2 text-sm text-muted-foreground">No vendors found</div>}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div>
                    <Label className="text-xs text-muted-foreground">Service Category *</Label>
                    <Select value={form.category_id || undefined} onValueChange={(v) => {
                      const c = (dbCategories || []).find((x: any) => x.id === v);
                      setForm({ ...form, category_id: v, category_name: c?.name || "", subcategory_id: "", subcategory_name: "" });
                    }}>
                      <SelectTrigger className="mt-1"><SelectValue placeholder="Select category" /></SelectTrigger>
                      <SelectContent>
                        {(dbCategories || []).map((c: any) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Subcategory</Label>
                    <Select value={form.subcategory_id || undefined} onValueChange={(v) => {
                      const sc = (dbSubcategories || []).find((x: any) => x.id === v);
                      setForm({ ...form, subcategory_id: v, subcategory_name: sc?.name || "" });
                    }} disabled={!form.category_id || (dbSubcategories || []).length === 0}>
                      <SelectTrigger className="mt-1">
                        <SelectValue placeholder={!form.category_id ? "Select category first" : ((dbSubcategories || []).length ? "Select subcategory" : "No subcategories")} />
                      </SelectTrigger>
                      <SelectContent>
                        {(dbSubcategories || []).map((s: any) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Duration</Label>
                    <Input value={form.duration} onChange={(e) => setForm({ ...form, duration: e.target.value })} className="mt-1" placeholder="1-2 hours" />
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Service Area</Label>
                    <Input value={form.service_area} onChange={(e) => setForm({ ...form, service_area: e.target.value })} className="mt-1" placeholder="Coimbatore" />
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Status</Label>
                    <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v as Service["status"] })}>
                      <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="active">Active</SelectItem>
                        <SelectItem value="inactive">Inactive</SelectItem>
                        <SelectItem value="draft">Draft</SelectItem>
                        <SelectItem value="pending_approval">Pending Approval</SelectItem>
                        <SelectItem value="rejected">Rejected</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </>
              )}
              {!editMode && (
                <>
                  <div>
                    <Label className="text-xs text-muted-foreground">Vendor</Label>
                    <p className="text-sm mt-1">{service?.vendor_name || "—"}</p>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Category</Label>
                    <p className="text-sm mt-1">{service?.category_name || "—"}</p>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Status</Label>
                    <div className="mt-1"><StatusBadge status={service?.status || "active"} /></div>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Duration</Label>
                    <p className="text-sm mt-1">{service?.duration || "—"}</p>
                  </div>
                </>
              )}
            </div>
          </TabsContent>

          {/* Pricing & Slots Tab */}
          <TabsContent value="pricing" className="space-y-4 mt-4">
            <div className="p-4 rounded-lg bg-secondary/20 border border-border/30 space-y-3">
              <h4 className="text-sm font-semibold flex items-center gap-2"><DollarSign className="h-4 w-4 text-primary" /> Base Pricing</h4>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label className="text-xs text-muted-foreground">Base Price</Label>
                  {editMode ? <Input type="number" value={form.price} onChange={(e) => setForm({ ...form, price: Number(e.target.value) })} className="mt-1" /> : <p className="text-sm font-bold mt-1">₹{service?.price.toLocaleString()}</p>}
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Tax</Label>
                  {editMode ? <Input type="number" value={form.tax} onChange={(e) => setForm({ ...form, tax: Number(e.target.value) })} className="mt-1" /> : <p className="text-sm font-medium mt-1">₹{service?.tax.toLocaleString()}</p>}
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Discount</Label>
                  {editMode ? <Input type="number" value={form.discount} onChange={(e) => setForm({ ...form, discount: Number(e.target.value) })} className="mt-1" /> : <p className="text-sm font-medium mt-1 text-success">{(service?.discount || 0) > 0 ? `₹${service?.discount}` : "—"}</p>}
                </div>
              </div>
              <Separator />
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-xs text-muted-foreground">SAC Code</Label>
                  {editMode ? <Input value={form.sac_code} onChange={(e) => setForm({ ...form, sac_code: e.target.value.replace(/\D/g, "").slice(0, 6) })} className="mt-1 font-mono" placeholder="e.g. 998719" maxLength={6} /> : <p className="text-sm mt-1 font-mono">{form.sac_code || "—"}</p>}
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">GST Rate (%)</Label>
                  {editMode ? <Input type="number" min={0} max={28} value={form.gst_rate} onChange={(e) => setForm({ ...form, gst_rate: Number(e.target.value) })} className="mt-1" /> : <p className="text-sm mt-1">{form.gst_rate}%</p>}
                </div>
              </div>
              <Separator />
              <div className="flex justify-between items-center">
                <span className="text-sm font-semibold">Final Price</span>
                <span className="text-lg font-bold">₹{(form.price + form.tax - form.discount).toLocaleString()}</span>
              </div>
            </div>

            {/* Booking Settings */}
            <div className="p-4 rounded-lg bg-secondary/20 border border-border/30 space-y-3">
              <h4 className="text-sm font-semibold flex items-center gap-2"><Clock className="h-4 w-4 text-primary" /> Booking Settings</h4>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label className="text-xs text-muted-foreground">Service Duration (min) *</Label>
                  {editMode ? <Input type="number" min={15} step={5} value={form.service_duration_minutes} onChange={(e) => setForm({ ...form, service_duration_minutes: Number(e.target.value) })} className="mt-1" /> : <p className="text-sm mt-1">{form.service_duration_minutes} min</p>}
                  <p className="text-[10px] text-muted-foreground mt-1">Auto-generates bookable slots</p>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Default Slot (min)</Label>
                  {editMode ? <Input type="number" value={form.booking_duration_minutes} onChange={(e) => setForm({ ...form, booking_duration_minutes: Number(e.target.value) })} className="mt-1" /> : <p className="text-sm mt-1">{form.booking_duration_minutes} min</p>}
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Max / Slot</Label>
                  {editMode ? <Input type="number" value={form.max_bookings_per_slot} onChange={(e) => setForm({ ...form, max_bookings_per_slot: Number(e.target.value) })} className="mt-1" /> : <p className="text-sm mt-1">{form.max_bookings_per_slot}</p>}
                </div>
              </div>
            </div>

            {/* Pricing Slots */}
            <div className="p-4 rounded-lg bg-secondary/20 border border-border/30 space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-semibold flex items-center gap-2"><Clock className="h-4 w-4 text-primary" /> Pricing Time Slots</h4>
                {editMode && (
                  <Button variant="outline" size="sm" onClick={addPricingSlot} className="gap-1"><Plus className="h-3 w-3" /> Add Slot</Button>
                )}
              </div>
              {form.pricing_slots.length === 0 && <p className="text-sm text-muted-foreground">No time-based pricing defined. Base price will be used.</p>}
              {form.pricing_slots.map((slot, idx) => (
                <div key={idx} className="grid grid-cols-4 gap-2 items-end">
                  <div>
                    <Label className="text-xs text-muted-foreground">Label</Label>
                    {editMode ? <Input value={slot.label} onChange={(e) => updateSlot(idx, "label", e.target.value)} className="mt-1" placeholder="e.g. Morning Slot" /> : <p className="text-sm mt-1">{slot.label}</p>}
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Duration (min)</Label>
                    {editMode ? <Input type="number" value={slot.duration_minutes} onChange={(e) => updateSlot(idx, "duration_minutes", Number(e.target.value))} className="mt-1" /> : <p className="text-sm mt-1">{slot.duration_minutes} min</p>}
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Price (₹)</Label>
                    {editMode ? <Input type="number" value={slot.price} onChange={(e) => updateSlot(idx, "price", Number(e.target.value))} className="mt-1" /> : <p className="text-sm mt-1">₹{slot.price}</p>}
                  </div>
                  {editMode && (
                    <Button variant="ghost" size="icon" className="h-9 w-9 text-destructive" onClick={() => removeSlot(idx)}><X className="h-4 w-4" /></Button>
                  )}
                </div>
              ))}
            </div>
          </TabsContent>

          {/* Descriptions Tab */}
          <TabsContent value="description" className="space-y-4 mt-4">
            <div>
              <Label className="text-xs text-muted-foreground">Short Description</Label>
              {editMode ? <RichTextEditor value={form.short_description} onChange={(v) => setForm({ ...form, short_description: v })} placeholder="Brief description for listings..." minHeight="80px" compact /> : <p className="text-sm mt-1 text-muted-foreground">{form.short_description || "—"}</p>}
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Long Description</Label>
              {editMode ? <RichTextEditor value={form.long_description} onChange={(v) => setForm({ ...form, long_description: v })} placeholder="Detailed service description..." minHeight="150px" /> : <p className="text-sm mt-1 text-muted-foreground whitespace-pre-wrap">{form.long_description || "—"}</p>}
            </div>
          </TabsContent>

          {/* SEO Tab */}
          <TabsContent value="seo" className="space-y-4 mt-4">
            <div className="p-4 rounded-lg bg-secondary/20 border border-border/30 space-y-3">
              <h4 className="text-sm font-semibold flex items-center gap-2"><Globe className="h-4 w-4 text-primary" /> SEO Settings</h4>
              <div>
                <Label className="text-xs text-muted-foreground">URL Slug</Label>
                {editMode ? <Input value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value })} className="mt-1" placeholder="service-url-slug" /> : <p className="text-sm mt-1 font-mono">{form.slug || "—"}</p>}
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Meta Title</Label>
                {editMode ? <Input value={form.meta_title} onChange={(e) => setForm({ ...form, meta_title: e.target.value })} className="mt-1" placeholder="Page title for search engines" /> : <p className="text-sm mt-1">{form.meta_title || "—"}</p>}
                {editMode && <p className="text-xs text-muted-foreground mt-0.5">{form.meta_title.length}/60 chars</p>}
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Meta Description</Label>
                {editMode ? <Textarea value={form.meta_description} onChange={(e) => setForm({ ...form, meta_description: e.target.value })} className="mt-1" rows={2} placeholder="Description for search results" /> : <p className="text-sm mt-1">{form.meta_description || "—"}</p>}
                {editMode && <p className="text-xs text-muted-foreground mt-0.5">{form.meta_description.length}/160 chars</p>}
              </div>
            </div>
          </TabsContent>
        </Tabs>

        <DialogFooter className="mt-4">
          {!isCreate && onDelete && editMode && (
            <Button variant="destructive" onClick={handleDelete} disabled={saving} className="mr-auto gap-1"><Trash2 className="h-4 w-4" /> Delete</Button>
          )}
          {editMode ? (
            <>
              <Button variant="outline" onClick={() => isCreate ? onOpenChange(false) : setEditMode(false)} disabled={saving}>Cancel</Button>
              <Button onClick={handleSave} disabled={saving || !form.title}>
                {saving && <div className="h-4 w-4 rounded-full border-2 border-current border-t-transparent animate-spin mr-2" />}
                {isCreate ? "Create Service" : "Save Changes"}
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
