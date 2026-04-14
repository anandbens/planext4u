import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { DataTable } from "@/components/admin/DataTable";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { RichTextEditor } from "@/components/ui/rich-text-editor";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { getPlanBadgeColor } from "@/lib/geo-utils";

export default function AdminVendorPlansPage() {
  const qc = useQueryClient();
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [planTab, setPlanTab] = useState("local");
  const [form, setForm] = useState({
    plan_name: "", plan_type: "local", price: "0", validity_days: "30",
    visibility_type: "radius_based", radius_km: "5",
    commission_percentage: "10", max_redemption_percentage: "5",
    banner_ads: false, video_ads: false, priority_listing: false,
    plan_tier: "1", is_active: true, description: "", payment_mode: "both",
  });

  const { data: plans } = useQuery({
    queryKey: ["vendorPlans"],
    queryFn: async () => {
      const { data } = await supabase.from("vendor_plans").select("*").order("plan_tier", { ascending: true });
      return data || [];
    },
  });

  const filtered = (plans || []).filter((p: any) => p.plan_type === planTab);

  const resetForm = (type: string) => setForm({
    plan_name: "", plan_type: type, price: "0", validity_days: "30",
    visibility_type: "radius_based", radius_km: "5",
    commission_percentage: "10", max_redemption_percentage: "5",
    banner_ads: false, video_ads: false, priority_listing: false,
    plan_tier: "1", is_active: true, description: "", payment_mode: "both",
  });

  const handleSave = async () => {
    if (!form.plan_name) { toast.error("Plan name required"); return; }
    const payload = {
      plan_name: form.plan_name, plan_type: form.plan_type, price: Number(form.price),
      validity_days: Number(form.validity_days), visibility_type: form.visibility_type,
      radius_km: Number(form.radius_km), commission_percentage: Number(form.commission_percentage),
      max_redemption_percentage: Number(form.max_redemption_percentage),
      banner_ads: form.banner_ads, video_ads: form.video_ads, priority_listing: form.priority_listing,
      plan_tier: Number(form.plan_tier), is_active: form.is_active, description: form.description,
      payment_mode: form.payment_mode,
    };
    if (editing) {
      await supabase.from("vendor_plans").update(payload).eq("id", editing.id);
      toast.success("Plan updated!");
    } else {
      await supabase.from("vendor_plans").insert(payload);
      toast.success("Plan created!");
    }
    setShowModal(false); setEditing(null);
    qc.invalidateQueries({ queryKey: ["vendorPlans"] });
  };

  const handleDelete = async (id: string) => {
    await supabase.from("vendor_plans").delete().eq("id", id);
    toast.success("Deleted");
    qc.invalidateQueries({ queryKey: ["vendorPlans"] });
  };

  const columns = [
    { key: "plan_name", label: "Plan", render: (p: any) => (
      <div className="flex items-center gap-2">
        <Badge className={`${getPlanBadgeColor(p.plan_name)} text-[10px]`}>{p.plan_name}</Badge>
        {p.description && <span className="text-[10px] text-muted-foreground truncate max-w-[120px]">{p.description}</span>}
      </div>
    )},
    { key: "price", label: "Price", render: (p: any) => <span className="font-medium">₹{Number(p.price).toLocaleString("en-IN")}</span> },
    { key: "validity_days", label: "Validity", render: (p: any) => `${p.validity_days} days` },
    { key: "visibility_type", label: "Visibility", render: (p: any) => (
      <span className="text-xs capitalize">{p.visibility_type.replace("_", " ")}{p.visibility_type === "radius_based" ? ` (${p.radius_km}km)` : ""}</span>
    )},
    { key: "commission_percentage", label: "Vendor to P4U Commission", render: (p: any) => `${p.commission_percentage}%` },
    { key: "max_redemption_percentage", label: "Max User Redemption %", render: (p: any) => `${p.max_redemption_percentage}%` },
    { key: "payment_mode", label: "Payment", render: (p: any) => (
      <Badge variant="outline" className="text-[9px] capitalize">{(p.payment_mode || "both").replace("_", " ")}</Badge>
    )},
    { key: "promotions", label: "Promotions", render: (p: any) => (
      <div className="flex gap-1">
        {p.banner_ads && <Badge variant="outline" className="text-[9px]">Banner</Badge>}
        {p.video_ads && <Badge variant="outline" className="text-[9px]">Video</Badge>}
        {p.priority_listing && <Badge variant="outline" className="text-[9px]">Priority</Badge>}
        {!p.banner_ads && !p.video_ads && !p.priority_listing && <span className="text-[10px] text-muted-foreground">None</span>}
      </div>
    )},
    { key: "is_active", label: "Status", render: (p: any) => p.is_active
      ? <Badge className="bg-green-100 text-green-700 text-[10px]">Active</Badge>
      : <Badge variant="secondary" className="text-[10px]">Inactive</Badge>
    },
    { key: "actions", label: "", render: (p: any) => (
      <div className="flex gap-1">
        <Button size="sm" variant="outline" className="h-7 text-[10px]" onClick={(e) => {
          e.stopPropagation();
          setEditing(p);
          setForm({
            plan_name: p.plan_name, plan_type: p.plan_type, price: String(p.price),
            validity_days: String(p.validity_days), visibility_type: p.visibility_type,
            radius_km: String(p.radius_km), commission_percentage: String(p.commission_percentage),
            max_redemption_percentage: String(p.max_redemption_percentage),
            banner_ads: p.banner_ads, video_ads: p.video_ads, priority_listing: p.priority_listing,
            plan_tier: String(p.plan_tier), is_active: p.is_active, description: p.description || "",
            payment_mode: p.payment_mode || "both",
          });
          setShowModal(true);
        }}>Edit</Button>
        <Button size="sm" variant="ghost" className="h-7 text-[10px] text-destructive" onClick={(e) => { e.stopPropagation(); handleDelete(p.id); }}>Delete</Button>
      </div>
    )},
  ];

  return (
    <AdminLayout>
      <div className="space-y-4">
        <div>
          <h1 className="text-xl font-bold">Vendor Plans</h1>
          <p className="text-sm text-muted-foreground">Configure marketplace vendor plans and pricing</p>
        </div>
        <Tabs value={planTab} onValueChange={setPlanTab}>
          <TabsList>
            <TabsTrigger value="local">Local Plans ({(plans || []).filter((p: any) => p.plan_type === "local").length})</TabsTrigger>
            <TabsTrigger value="vip">VIP Plans ({(plans || []).filter((p: any) => p.plan_type === "vip").length})</TabsTrigger>
          </TabsList>
          {["local", "vip"].map(type => (
            <TabsContent key={type} value={type}>
              <DataTable
                columns={columns}
                data={filtered}
                total={filtered.length}
                page={1} perPage={50} totalPages={1}
                onPageChange={() => {}}
                onAdd={() => { setEditing(null); resetForm(type); setShowModal(true); }}
                addLabel={`Add ${type === "vip" ? "VIP" : "Local"} Plan`}
              />
            </TabsContent>
          ))}
        </Tabs>
      </div>

      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent className="max-w-md max-h-[80vh] overflow-y-auto">
          <DialogTitle>{editing ? "Edit" : "Add"} Vendor Plan</DialogTitle>
          <div className="space-y-3 pt-2">
            <div><Label className="text-xs">Plan Name *</Label><Input value={form.plan_name} onChange={(e) => setForm(f => ({ ...f, plan_name: e.target.value }))} placeholder="e.g., Premium" /></div>
            <div><Label className="text-xs">Description</Label><RichTextEditor value={form.description} onChange={v => setForm(f => ({ ...f, description: v }))} placeholder="Plan description..." minHeight="80px" compact /></div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Plan Type</Label>
                <Select value={form.plan_type} onValueChange={(v) => setForm(f => ({ ...f, plan_type: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="local">Local</SelectItem>
                    <SelectItem value="vip">VIP</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div><Label className="text-xs">Tier (sort order)</Label><Input type="number" value={form.plan_tier} onChange={(e) => setForm(f => ({ ...f, plan_tier: e.target.value }))} /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label className="text-xs">Price (₹)</Label><Input type="number" value={form.price} onChange={(e) => setForm(f => ({ ...f, price: e.target.value }))} /></div>
              <div><Label className="text-xs">Validity (days)</Label><Input type="number" value={form.validity_days} onChange={(e) => setForm(f => ({ ...f, validity_days: e.target.value }))} /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Visibility Type</Label>
                <Select value={form.visibility_type} onValueChange={(v) => setForm(f => ({ ...f, visibility_type: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="radius_based">Radius Based</SelectItem>
                    <SelectItem value="city">City</SelectItem>
                    <SelectItem value="state">State</SelectItem>
                    <SelectItem value="pan_india">PAN India</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {form.visibility_type === "radius_based" && (
                <div><Label className="text-xs">Radius (km)</Label><Input type="number" value={form.radius_km} onChange={(e) => setForm(f => ({ ...f, radius_km: e.target.value }))} /></div>
              )}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label className="text-xs">Vendor to P4U Commission %</Label><Input type="number" value={form.commission_percentage} onChange={(e) => setForm(f => ({ ...f, commission_percentage: e.target.value }))} /></div>
              <div><Label className="text-xs">Max User Redemption %</Label><Input type="number" value={form.max_redemption_percentage} onChange={(e) => setForm(f => ({ ...f, max_redemption_percentage: e.target.value }))} /></div>
            </div>
            <div className="border-t pt-3">
              <Label className="text-xs font-medium">Payment Mode</Label>
              <Select value={form.payment_mode} onValueChange={(v) => setForm(f => ({ ...f, payment_mode: v }))}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="online">Online (Razorpay)</SelectItem>
                  <SelectItem value="offline">Offline (Bank Transfer)</SelectItem>
                  <SelectItem value="both">Both</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="border-t pt-3 space-y-2">
              <Label className="text-xs font-medium">Promotion Flags</Label>
              <div className="flex items-center gap-3"><Switch checked={form.banner_ads} onCheckedChange={(v) => setForm(f => ({ ...f, banner_ads: v }))} /><Label className="text-xs">Banner Ads</Label></div>
              <div className="flex items-center gap-3"><Switch checked={form.video_ads} onCheckedChange={(v) => setForm(f => ({ ...f, video_ads: v }))} /><Label className="text-xs">Video Ads</Label></div>
              <div className="flex items-center gap-3"><Switch checked={form.priority_listing} onCheckedChange={(v) => setForm(f => ({ ...f, priority_listing: v }))} /><Label className="text-xs">Priority Listing</Label></div>
            </div>
            <div className="flex items-center gap-3"><Switch checked={form.is_active} onCheckedChange={(v) => setForm(f => ({ ...f, is_active: v }))} /><Label className="text-xs">Active</Label></div>
            <Button className="w-full" onClick={handleSave}>Save Plan</Button>
          </div>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
