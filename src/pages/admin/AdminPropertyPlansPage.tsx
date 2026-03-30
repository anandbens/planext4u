import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { DataTable } from "@/components/admin/DataTable";
import { Crown } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function AdminPropertyPlansPage() {
  const qc = useQueryClient();
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [planTypeTab, setPlanTypeTab] = useState("owner");
  const [form, setForm] = useState({
    id: "", name: "", price: "0", duration_days: "30", listing_limit: "5",
    contact_reveal_limit: "10", visibility_boost: false, description: "",
    is_active: true, plan_type: "owner",
    features: [] as string[], newFeature: "",
  });

  const { data: plans } = useQuery({
    queryKey: ["adminPlans"],
    queryFn: async () => {
      const { data } = await supabase.from("property_plans").select("*").order("price", { ascending: true });
      return data || [];
    },
  });

  const filteredPlans = (plans || []).filter((p: any) => (p.plan_type || "owner") === planTypeTab);

  const handleSave = async () => {
    if (!form.name) { toast.error("Name required"); return; }
    const payload: any = {
      name: form.name, price: Number(form.price), duration_days: Number(form.duration_days),
      listing_limit: Number(form.listing_limit), contact_reveal_limit: Number(form.contact_reveal_limit),
      visibility_boost: form.visibility_boost, description: form.description, is_active: form.is_active,
      plan_type: form.plan_type, features: form.features,
    };
    if (editing) {
      await supabase.from("property_plans").update(payload).eq("id", editing.id);
      toast.success("Updated!");
    } else {
      await supabase.from("property_plans").insert({ ...payload, id: `plan_${Date.now()}` });
      toast.success("Created!");
    }
    setShowModal(false); setEditing(null);
    qc.invalidateQueries({ queryKey: ["adminPlans"] });
  };

  const handleDelete = async (id: string) => {
    await supabase.from("property_plans").delete().eq("id", id);
    toast.success("Deleted");
    qc.invalidateQueries({ queryKey: ["adminPlans"] });
  };

  const addFeature = () => {
    if (form.newFeature.trim()) {
      setForm(f => ({ ...f, features: [...f.features, f.newFeature.trim()], newFeature: "" }));
    }
  };

  const columns = [
    { key: "name", label: "Plan", render: (p: any) => (
      <div>
        <p className="font-medium text-sm">{p.name}</p>
        <p className="text-[10px] text-muted-foreground">{p.description}</p>
      </div>
    )},
    { key: "price", label: "Price", render: (p: any) => <span className="font-medium">₹{Number(p.price).toLocaleString("en-IN")}</span> },
    { key: "duration_days", label: "Duration", render: (p: any) => `${p.duration_days} days` },
    { key: "listing_limit", label: "Listings" },
    { key: "contact_reveal_limit", label: "Contacts" },
    { key: "visibility_boost", label: "Boost", render: (p: any) => p.visibility_boost ? <Badge className="bg-success/10 text-success text-[10px]">Yes</Badge> : "No" },
    { key: "features", label: "Features", render: (p: any) => {
      const f = Array.isArray(p.features) ? p.features : [];
      return <span className="text-xs text-muted-foreground">{f.length} features</span>;
    }},
    { key: "is_active", label: "Active", render: (p: any) => p.is_active ? <Badge className="bg-success/10 text-success text-[10px]">Active</Badge> : <Badge variant="secondary" className="text-[10px]">Inactive</Badge> },
    { key: "actions", label: "", render: (p: any) => (
      <div className="flex gap-1">
        <Button size="sm" variant="outline" className="h-7 text-[10px]" onClick={(e) => {
          e.stopPropagation();
          setEditing(p);
          const features = Array.isArray(p.features) ? p.features : [];
          setForm({
            id: p.id, name: p.name, price: String(p.price), duration_days: String(p.duration_days),
            listing_limit: String(p.listing_limit), contact_reveal_limit: String(p.contact_reveal_limit),
            visibility_boost: p.visibility_boost, description: p.description || "", is_active: p.is_active,
            plan_type: p.plan_type || "owner", features, newFeature: "",
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
        <h1 className="text-xl font-bold">Plans & Pricing</h1>
        <Tabs value={planTypeTab} onValueChange={setPlanTypeTab}>
          <TabsList>
            <TabsTrigger value="owner">Owner Plans ({(plans || []).filter((p: any) => (p.plan_type || "owner") === "owner").length})</TabsTrigger>
            <TabsTrigger value="seeker">Seeker Plans ({(plans || []).filter((p: any) => p.plan_type === "seeker").length})</TabsTrigger>
            <TabsTrigger value="assisted">Assisted Plans ({(plans || []).filter((p: any) => p.plan_type === "assisted").length})</TabsTrigger>
          </TabsList>

          {["owner", "seeker", "assisted"].map(type => (
            <TabsContent key={type} value={type}>
              <DataTable
                columns={columns}
                data={filteredPlans}
                total={filteredPlans.length}
                page={1} perPage={50} totalPages={1}
                onPageChange={() => {}}
                onAdd={() => {
                  setEditing(null);
                  setForm({
                    id: "", name: "", price: "0", duration_days: "30", listing_limit: "5",
                    contact_reveal_limit: "10", visibility_boost: false, description: "",
                    is_active: true, plan_type: type, features: [], newFeature: "",
                  });
                  setShowModal(true);
                }}
                addLabel={`Add ${type.charAt(0).toUpperCase() + type.slice(1)} Plan`}
              />
            </TabsContent>
          ))}
        </Tabs>
      </div>

      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent className="max-w-md max-h-[80vh] overflow-y-auto">
          <DialogTitle>{editing ? "Edit" : "Add"} Plan</DialogTitle>
          <div className="space-y-3 pt-2">
            <div><Label className="text-xs">Name *</Label><Input value={form.name} onChange={(e) => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Premium Plan" /></div>
            <div><Label className="text-xs">Description</Label><Textarea value={form.description} onChange={(e) => setForm(f => ({ ...f, description: e.target.value }))} rows={2} /></div>
            <div>
              <Label className="text-xs">Plan Type</Label>
              <Select value={form.plan_type} onValueChange={(v) => setForm(f => ({ ...f, plan_type: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="owner">Owner</SelectItem>
                  <SelectItem value="seeker">Seeker</SelectItem>
                  <SelectItem value="assisted">Assisted</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label className="text-xs">Price (₹)</Label><Input type="number" value={form.price} onChange={(e) => setForm(f => ({ ...f, price: e.target.value }))} /></div>
              <div><Label className="text-xs">Duration (days)</Label><Input type="number" value={form.duration_days} onChange={(e) => setForm(f => ({ ...f, duration_days: e.target.value }))} /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label className="text-xs">Listing Limit</Label><Input type="number" value={form.listing_limit} onChange={(e) => setForm(f => ({ ...f, listing_limit: e.target.value }))} /></div>
              <div><Label className="text-xs">Contact Reveals</Label><Input type="number" value={form.contact_reveal_limit} onChange={(e) => setForm(f => ({ ...f, contact_reveal_limit: e.target.value }))} /></div>
            </div>
            <div className="flex items-center gap-2"><Switch checked={form.visibility_boost} onCheckedChange={(v) => setForm(f => ({ ...f, visibility_boost: v }))} /><Label className="text-xs">Visibility Boost</Label></div>
            <div className="flex items-center gap-2"><Switch checked={form.is_active} onCheckedChange={(v) => setForm(f => ({ ...f, is_active: v }))} /><Label className="text-xs">Active</Label></div>

            {/* Features list */}
            <div className="border-t pt-3">
              <Label className="text-xs font-medium">Plan Features</Label>
              <div className="flex gap-2 mt-1">
                <Input value={form.newFeature} onChange={(e) => setForm(f => ({ ...f, newFeature: e.target.value }))} placeholder="e.g., Priority listing" className="text-xs" onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addFeature())} />
                <Button size="sm" variant="outline" onClick={addFeature}>Add</Button>
              </div>
              <div className="space-y-1 mt-2">
                {form.features.map((feat, i) => (
                  <div key={i} className="flex items-center justify-between px-2 py-1 bg-muted/50 rounded text-xs">
                    <span>{feat}</span>
                    <button onClick={() => setForm(f => ({ ...f, features: f.features.filter((_, j) => j !== i) }))} className="text-destructive text-[10px]">✕</button>
                  </div>
                ))}
              </div>
            </div>

            <Button className="w-full" onClick={handleSave}>Save Plan</Button>
          </div>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
