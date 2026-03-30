import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { DataTable } from "@/components/admin/DataTable";
import { Crown, Plus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";

export default function AdminPropertyPlansPage() {
  const queryClient = useQueryClient();
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [form, setForm] = useState({ id: "", name: "", price: "0", duration_days: "30", listing_limit: "5", contact_reveal_limit: "10", visibility_boost: false, description: "", is_active: true });

  const { data: plans } = useQuery({
    queryKey: ["adminPlans"],
    queryFn: async () => {
      const { data } = await supabase.from("property_plans").select("*").order("price", { ascending: true });
      return data || [];
    },
  });

  const handleSave = async () => {
    if (!form.name) { toast.error("Name required"); return; }
    const payload = {
      name: form.name, price: Number(form.price), duration_days: Number(form.duration_days),
      listing_limit: Number(form.listing_limit), contact_reveal_limit: Number(form.contact_reveal_limit),
      visibility_boost: form.visibility_boost, description: form.description, is_active: form.is_active,
    };
    if (editing) {
      await supabase.from("property_plans").update(payload).eq("id", editing.id);
      toast.success("Updated!");
    } else {
      await supabase.from("property_plans").insert({ ...payload, id: `plan_${Date.now()}` });
      toast.success("Created!");
    }
    setShowModal(false); setEditing(null);
    queryClient.invalidateQueries({ queryKey: ["adminPlans"] });
  };

  const columns = [
    { key: "name", label: "Plan", render: (p: any) => <div><p className="font-medium text-sm">{p.name}</p><p className="text-[10px] text-muted-foreground">{p.description}</p></div> },
    { key: "price", label: "Price", render: (p: any) => <span className="font-medium">₹{Number(p.price).toLocaleString("en-IN")}</span> },
    { key: "duration_days", label: "Duration", render: (p: any) => `${p.duration_days} days` },
    { key: "listing_limit", label: "Listings", render: (p: any) => p.listing_limit },
    { key: "contact_reveal_limit", label: "Contact Reveals", render: (p: any) => p.contact_reveal_limit },
    { key: "visibility_boost", label: "Boost", render: (p: any) => p.visibility_boost ? <Badge className="bg-success/10 text-success text-[10px]">Yes</Badge> : "No" },
    { key: "is_active", label: "Active", render: (p: any) => p.is_active ? <Badge className="bg-success/10 text-success text-[10px]">Active</Badge> : <Badge variant="secondary" className="text-[10px]">Inactive</Badge> },
    { key: "actions", label: "", render: (p: any) => (
      <Button size="sm" variant="outline" className="h-7 text-[10px]" onClick={(e) => {
        e.stopPropagation();
        setEditing(p);
        setForm({ id: p.id, name: p.name, price: String(p.price), duration_days: String(p.duration_days), listing_limit: String(p.listing_limit), contact_reveal_limit: String(p.contact_reveal_limit), visibility_boost: p.visibility_boost, description: p.description || "", is_active: p.is_active });
        setShowModal(true);
      }}>Edit</Button>
    )},
  ];

  return (
    <AdminLayout>
      <DataTable
        columns={columns}
        data={plans || []}
        total={(plans || []).length}
        page={1} perPage={50} totalPages={1}
        onPageChange={() => {}}
        headerActions={
          <Button size="sm" onClick={() => {
            setEditing(null);
            setForm({ id: "", name: "", price: "0", duration_days: "30", listing_limit: "5", contact_reveal_limit: "10", visibility_boost: false, description: "", is_active: true });
            setShowModal(true);
          }}>
            <Plus className="h-4 w-4 mr-1" /> Add Plan
          </Button>
        }
      />
      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent className="max-w-sm">
          <DialogTitle>{editing ? "Edit" : "Add"} Plan</DialogTitle>
          <div className="space-y-3 pt-2">
            <div><Label className="text-xs">Name *</Label><Input value={form.name} onChange={(e) => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Premium Plan" /></div>
            <div><Label className="text-xs">Description</Label><Input value={form.description} onChange={(e) => setForm(f => ({ ...f, description: e.target.value }))} /></div>
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
            <Button className="w-full" onClick={handleSave}>Save Plan</Button>
          </div>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
