import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Search, MoreVertical, Edit, Trash2, MapPin, Navigation, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RichTextEditor } from "@/components/ui/rich-text-editor";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { VendorLayout } from "@/components/vendor/VendorLayout";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { MediaLibraryPicker } from "@/components/admin/MediaLibraryPicker";
import { getLocation } from "@/lib/device-service";

const statusStyle: Record<string, string> = {
  active: "bg-success/10 text-success",
  inactive: "bg-destructive/10 text-destructive",
  draft: "bg-muted text-muted-foreground",
  pending_approval: "bg-warning/10 text-warning",
  rejected: "bg-destructive/10 text-destructive",
};

interface ServiceForm {
  title: string; description: string; price: string; tax: string; discount: string;
  duration: string; service_area: string; category_id: string; subcategory_id: string;
  emoji: string; status: string;
  image: string; working_days: string; workers: string;
  service_duration_minutes: string;
  latitude: string; longitude: string; location_address: string;
}

const emptyForm: ServiceForm = {
  title: "", description: "", price: "", tax: "", discount: "0",
  duration: "", service_area: "", category_id: "", subcategory_id: "",
  emoji: "🔧", status: "pending_approval",
  image: "", working_days: "Mon-Sat", workers: "1",
  service_duration_minutes: "60",
  latitude: "", longitude: "", location_address: "",
};

export default function VendorServicesPage() {
  const { vendorUser } = useAuth();
  const vendorId = vendorUser?.vendor_id || "VND-001";
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<ServiceForm>(emptyForm);
  const [detectingLoc, setDetectingLoc] = useState(false);

  const detectServiceLocation = async () => {
    setDetectingLoc(true);
    try {
      const coords = await getLocation();
      if (!coords) throw new Error("Couldn't read your location");
      let address = form.location_address || form.service_area;
      try {
        const { data: kv } = await supabase.from("platform_variables").select("value").eq("key", "GOOGLE_MAPS_API_KEY").maybeSingle();
        const apiKey = kv?.value || "AIzaSyAoz0ZK26oE1qZSKK8pG1Ebh9sTTeaOl7M";
        const res = await fetch(`https://maps.googleapis.com/maps/api/geocode/json?latlng=${coords.lat},${coords.lng}&key=${apiKey}`);
        const data = await res.json();
        if (data.status === "OK" && data.results?.[0]) address = data.results[0].formatted_address;
      } catch {}
      setForm(f => ({ ...f, latitude: String(coords.lat), longitude: String(coords.lng), location_address: address, service_area: f.service_area || address }));
      toast.success("Exact service location captured");
    } catch (e: any) {
      toast.error(e?.message || "Could not detect service location");
    } finally {
      setDetectingLoc(false);
    }
  };

  const { data: services, isLoading } = useQuery({
    queryKey: ["vendorServices", vendorId],
    queryFn: async () => {
      const { data } = await supabase.from("services").select("*").eq("vendor_id", vendorId);
      return data || [];
    },
  });

  // Parent service categories (top-level only)
  const { data: parentCategories } = useQuery({
    queryKey: ["serviceParentCategories"],
    queryFn: async () => {
      const { data } = await supabase.from("service_categories")
        .select("id, name, parent_id")
        .eq("status", "active")
        .is("parent_id", null)
        .order("name");
      return data || [];
    },
  });

  // Subcategories for the currently selected parent category
  const { data: subcategories } = useQuery({
    queryKey: ["serviceSubcategories", form.category_id],
    queryFn: async () => {
      if (!form.category_id) return [];
      const { data } = await supabase.from("service_categories")
        .select("id, name, parent_id")
        .eq("status", "active")
        .eq("parent_id", form.category_id)
        .order("name");
      return data || [];
    },
    enabled: !!form.category_id,
  });

  // For backwards compatibility — flat list used to look up names from existing service rows
  const { data: allCategoriesFlat } = useQuery({
    queryKey: ["serviceAllCategoriesFlat"],
    queryFn: async () => {
      const { data } = await supabase.from("service_categories").select("id, name, parent_id");
      return data || [];
    },
  });

  // Check if vendor exists in service_vendors, create if not
  const ensureServiceVendor = async () => {
    const { data } = await supabase.from("service_vendors").select("id").eq("id", vendorId).maybeSingle();
    const { data: vendor } = await supabase.from("vendors").select("*").eq("id", vendorId).maybeSingle();
    if (!data) {
      const { error } = await supabase.from("service_vendors").insert({
        id: vendorId,
        name: vendor?.name || vendorUser?.name || "Vendor",
        business_name: vendor?.business_name || "",
        mobile: vendor?.mobile || "",
        email: vendor?.email || "",
        shop_address: (vendor as any)?.shop_address || "",
        shop_latitude: (vendor as any)?.shop_latitude || null,
        shop_longitude: (vendor as any)?.shop_longitude || null,
        status: "verified",
      });
      if (error) console.error("ensureServiceVendor error:", error.message);
    } else if ((vendor as any)?.shop_latitude && (vendor as any)?.shop_longitude) {
      await supabase.from("service_vendors").update({
        shop_address: (vendor as any)?.shop_address || null,
        shop_latitude: (vendor as any)?.shop_latitude,
        shop_longitude: (vendor as any)?.shop_longitude,
      } as any).eq("id", vendorId);
    }
    return vendor;
  };

  const validateServiceForm = (f: ServiceForm): string | null => {
    if (!f.title.trim()) return "Service title is required";
    if (!f.description.trim()) return "Description is required";
    if (!f.category_id) return "Category is required";
    if (!f.price || parseFloat(f.price) <= 0) return "Price must be greater than 0";
    if (!f.duration.trim()) return "Duration is required";
    if (!f.service_area.trim()) return "Service area is required";
    if (!f.image) return "Service image is required";
    return null;
  };

  const saveMutation = useMutation({
    mutationFn: async (formData: ServiceForm) => {
      const err = validateServiceForm(formData);
      if (err) throw new Error(err);
      // Ensure vendor exists in service_vendors table first
      const vendor = await ensureServiceVendor();

      const parentCat = (allCategoriesFlat || []).find(c => c.id === formData.category_id);
      const subCat = (allCategoriesFlat || []).find(c => c.id === formData.subcategory_id);

      // For NEW submissions or edits to a rejected service: force pending_approval (re-submit for review).
      // For edits to already-approved (active/inactive) services: keep current status.
      const isResubmit = editingId && (formData.status === 'rejected' || formData.status === 'pending_approval');
      const finalStatus = !editingId ? 'pending_approval' : (isResubmit ? 'pending_approval' : formData.status);

      const lat = formData.latitude ? Number(formData.latitude) : Number((vendor as any)?.shop_latitude || 0);
      const lng = formData.longitude ? Number(formData.longitude) : Number((vendor as any)?.shop_longitude || 0);
      if (!Number.isFinite(lat) || !Number.isFinite(lng) || lat === 0 || lng === 0) {
        throw new Error("Capture exact service location using GPS or enter map coordinates before submitting");
      }
      const payload: any = {
        title: formData.title, description: formData.description,
        price: parseFloat(formData.price) || 0, tax: parseFloat(formData.tax) || 0,
        discount: parseFloat(formData.discount) || 0, duration: formData.duration,
        service_duration_minutes: Math.max(15, parseInt(formData.service_duration_minutes) || 60),
        service_area: formData.service_area,
        latitude: Number.isFinite(lat) && lat !== 0 ? lat : null,
        longitude: Number.isFinite(lng) && lng !== 0 ? lng : null,
        location_address: formData.location_address || formData.service_area || (vendor as any)?.shop_address || null,
        category_id: formData.category_id || null,
        category_name: parentCat?.name || "",
        subcategory_id: formData.subcategory_id || null,
        subcategory_name: subCat?.name || null,
        emoji: formData.emoji, status: finalStatus,
        vendor_id: vendorId, vendor_name: vendorUser?.name || "",
        image: formData.image || null,
      };
      // Clear stale rejection reason on re-submit
      if (isResubmit) payload.rejection_reason = null;

      if (editingId) {
        const { error } = await supabase.from("services").update(payload).eq("id", editingId);
        if (error) throw error;
      } else {
        const id = `SVC-${Date.now().toString(36).toUpperCase()}`;
        const { error } = await supabase.from("services").insert({ ...payload, id });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["vendorServices"] });
      setModalOpen(false); setEditingId(null); setForm(emptyForm);
      toast.success(editingId ? "Service updated and re-submitted for approval" : "Service submitted for approval");
    },
    onError: (err: any) => toast.error(err.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("services").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["vendorServices"] }); toast.success("Service deleted"); },
  });

  const openEdit = (s: any) => {
    setEditingId(s.id);
    setForm({
      title: s.title, description: s.description, price: String(s.price), tax: String(s.tax),
      discount: String(s.discount), duration: s.duration || "", service_area: s.service_area || "",
      category_id: s.category_id || "", subcategory_id: s.subcategory_id || "",
      emoji: s.emoji || "🔧", status: s.status,
      image: s.image || "", working_days: "Mon-Sat", workers: "1",
      service_duration_minutes: String(s.service_duration_minutes || 60),
      latitude: String((s as any).latitude || ""), longitude: String((s as any).longitude || ""),
      location_address: (s as any).location_address || s.service_area || "",
    });
    setModalOpen(true);
  };

  const clearFilters = () => { setSearch(""); setStatusFilter(""); };

  const filtered = services?.filter((s) => {
    if (search && !s.title.toLowerCase().includes(search.toLowerCase())) return false;
    if (statusFilter && s.status !== statusFilter) return false;
    return true;
  }) || [];

  return (
    <VendorLayout title={`My Services (${filtered.length})`}>
      <div className="max-w-5xl mx-auto px-4 py-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search services..." className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[120px]"><SelectValue placeholder="Status" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="pending_approval">Pending Approval</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="rejected">Rejected</SelectItem>
              <SelectItem value="draft">Draft</SelectItem>
              <SelectItem value="inactive">Inactive</SelectItem>
            </SelectContent>
          </Select>
          {(search || statusFilter) && <Button variant="ghost" size="sm" className="text-xs" onClick={clearFilters}>Clear</Button>}
          <Button onClick={() => { setEditingId(null); setForm(emptyForm); setModalOpen(true); }}>
            <Plus className="h-4 w-4 mr-1" /> Add Service
          </Button>
        </div>
        <div className="space-y-3">
          {isLoading ? Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-20 rounded-xl" />) :
            filtered.length === 0 ? (
              <Card className="p-8 text-center"><p className="text-muted-foreground">No services yet. Add your first service!</p></Card>
            ) :
            filtered.map((s) => (
              <Card key={s.id} className="p-4 flex items-center gap-4">
                <div className="h-14 w-14 bg-secondary/30 rounded-xl flex items-center justify-center text-2xl shrink-0 overflow-hidden">
                  {s.image ? <img loading="lazy" decoding="async" src={s.image} alt="" className="w-full h-full object-cover" /> : <span>{s.emoji || "🔧"}</span>}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="text-sm font-medium truncate">{s.title}</h3>
                    <Badge className={`${statusStyle[s.status] || ''} border-0 text-[10px]`}>{String(s.status).replace(/_/g, ' ')}</Badge>
                  </div>
                  <div className="flex items-center gap-4 mt-1 text-xs text-muted-foreground">
                    <span>₹{Number(s.price).toLocaleString()}</span>
                    {s.duration && <span>{s.duration}</span>}
                    {s.service_area && <span>{s.service_area}</span>}
                  </div>
                  {s.status === 'rejected' && s.rejection_reason && (
                    <p className="text-[11px] text-destructive mt-1 line-clamp-2">
                      <span className="font-semibold">Rejection reason:</span> {s.rejection_reason}
                    </p>
                  )}
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="h-8 w-8"><MoreVertical className="h-4 w-4" /></Button></DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => openEdit(s)}><Edit className="h-4 w-4 mr-2" /> Edit</DropdownMenuItem>
                    <DropdownMenuItem className="text-destructive" onClick={() => deleteMutation.mutate(s.id)}><Trash2 className="h-4 w-4 mr-2" /> Delete</DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </Card>
            ))}
        </div>
      </div>

      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingId ? "Edit Service" : "Add New Service"}</DialogTitle>
            <DialogDescription>{editingId ? "Update your service details." : "New services will be submitted for admin approval."}</DialogDescription>
          </DialogHeader>
          <form onSubmit={(e) => { e.preventDefault(); saveMutation.mutate(form); }} className="space-y-4">
            <div><Label>Title</Label><Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required /></div>
            <div><Label>Description</Label><RichTextEditor value={form.description} onChange={(v) => setForm({ ...form, description: v })} placeholder="Service description..." minHeight="100px" /></div>
            
            {/* Service Image — via Media Library */}
            <div>
              <Label>Service Image *</Label>
              <MediaLibraryPicker
                value={form.image}
                onChange={(url) => setForm({ ...form, image: url })}
                folder="service-images"
                label="Upload or pick from Media Library"
                aspectRatio="aspect-video"
                className="mt-1"
              />
              <p className="text-[10px] text-muted-foreground mt-1">
                Images are managed through your Media Library.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div><Label>Price (₹)</Label><Input type="number" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} required /></div>
              <div><Label>Tax (₹)</Label><Input type="number" value={form.tax} onChange={(e) => setForm({ ...form, tax: e.target.value })} /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Approx Duration (display)</Label><Input value={form.duration} onChange={(e) => setForm({ ...form, duration: e.target.value })} placeholder="e.g. 2 hrs" /></div>
              <div><Label>Service Area</Label><Input value={form.service_area} onChange={(e) => setForm({ ...form, service_area: e.target.value })} placeholder="e.g. Coimbatore" /></div>
            </div>
            <div className="space-y-2 rounded-xl border border-border/60 bg-secondary/20 p-3">
              <div className="flex items-center justify-between gap-2">
                <Label className="text-xs font-semibold">Exact Service Location *</Label>
                <Button type="button" variant="outline" size="sm" onClick={detectServiceLocation} disabled={detectingLoc} className="h-8 text-xs">
                  {detectingLoc ? <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" /> : <Navigation className="h-3.5 w-3.5 mr-1" />}
                  Use GPS
                </Button>
              </div>
              <Input value={form.location_address} onChange={(e) => setForm({ ...form, location_address: e.target.value })} placeholder="Exact address from GPS or map" className="h-9" />
              <div className="grid grid-cols-2 gap-2">
                <Input type="number" step="any" placeholder="Latitude" value={form.latitude} onChange={(e) => setForm({ ...form, latitude: e.target.value })} className="h-9" />
                <Input type="number" step="any" placeholder="Longitude" value={form.longitude} onChange={(e) => setForm({ ...form, longitude: e.target.value })} className="h-9" />
              </div>
              <Button type="button" variant="ghost" size="sm" asChild className="h-8 px-0 text-xs">
                <a href={`https://www.google.com/maps${form.latitude && form.longitude ? `/@${form.latitude},${form.longitude},18z` : ""}`} target="_blank" rel="noreferrer">
                  <MapPin className="h-3.5 w-3.5 mr-1" /> Pick pin on map and paste coordinates
                </a>
              </Button>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Slot Duration (minutes) *</Label>
                <Input type="number" min={15} step={5} value={form.service_duration_minutes} onChange={(e) => setForm({ ...form, service_duration_minutes: e.target.value })} placeholder="60" />
                <p className="text-[10px] text-muted-foreground mt-1">Auto-generates bookable customer slots</p>
              </div>
              <div><Label>Discount (₹)</Label><Input type="number" value={form.discount} onChange={(e) => setForm({ ...form, discount: e.target.value })} /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Working Days</Label><Input value={form.working_days} onChange={(e) => setForm({ ...form, working_days: e.target.value })} placeholder="Mon-Sat" /></div>
              <div><Label>No. of Workers</Label><Input type="number" value={form.workers} onChange={(e) => setForm({ ...form, workers: e.target.value })} placeholder="1" /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Service Category *</Label>
                <Select value={form.category_id} onValueChange={(v) => setForm({ ...form, category_id: v, subcategory_id: "" })}>
                  <SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger>
                  <SelectContent>
                    {parentCategories?.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Subcategory</Label>
                <Select value={form.subcategory_id || undefined} onValueChange={(v) => setForm({ ...form, subcategory_id: v })} disabled={!form.category_id || (subcategories || []).length === 0}>
                  <SelectTrigger>
                    <SelectValue placeholder={!form.category_id ? "Select category first" : (subcategories?.length ? "Select subcategory" : "No subcategories")} />
                  </SelectTrigger>
                  <SelectContent>
                    {subcategories?.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div><Label>Emoji Icon</Label><Input value={form.emoji} onChange={(e) => setForm({ ...form, emoji: e.target.value })} placeholder="🔧" /></div>
            <Button type="submit" className="w-full" disabled={saveMutation.isPending}>
              {saveMutation.isPending ? "Saving..." : editingId ? "Update Service" : "Submit for Approval"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </VendorLayout>
  );
}
