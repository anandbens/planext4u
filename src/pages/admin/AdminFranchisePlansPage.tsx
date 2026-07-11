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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RichTextEditor } from "@/components/ui/rich-text-editor";

interface FranchisePlan {
  id: string;
  name: string;
  category: string | null;
  investment_amount: number;
  security_deposit: number | null;
  delivery_radius_km: number | null;
  coverage_type: "radius" | "city" | "district" | "state";
  validity_months: number;
  description: string | null;
  benefits: string[] | any;
  features: string[] | any;
  status: "active" | "inactive";
  sort_order: number;
}

const emptyForm = {
  name: "", category: "", investment_amount: "0", security_deposit: "0",
  delivery_radius_km: "0", coverage_type: "radius" as "radius" | "city" | "district" | "state",
  validity_months: "12", description: "",
  benefits: "", features: "", status: true, sort_order: "1",
};

export default function AdminFranchisePlansPage() {
  const qc = useQueryClient();
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<FranchisePlan | null>(null);
  const [form, setForm] = useState({ ...emptyForm });

  const { data: plans, isLoading } = useQuery({
    queryKey: ["franchisePlans"],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("franchise_plans")
        .select("*")
        .order("sort_order", { ascending: true });
      if (error) throw error;
      return (data || []) as FranchisePlan[];
    },
  });

  const openEdit = (p: FranchisePlan) => {
    setEditing(p);
    setForm({
      name: p.name,
      category: p.category || "",
      investment_amount: String(p.investment_amount || 0),
      security_deposit: String(p.security_deposit || 0),
      delivery_radius_km: String(p.delivery_radius_km || 0),
      coverage_type: p.coverage_type,
      validity_months: String(p.validity_months || 12),
      description: p.description || "",
      benefits: Array.isArray(p.benefits) ? p.benefits.join("\n") : "",
      features: Array.isArray(p.features) ? p.features.join("\n") : "",
      status: p.status === "active",
      sort_order: String(p.sort_order || 1),
    });
    setShowModal(true);
  };

  const openCreate = () => {
    setEditing(null);
    setForm({ ...emptyForm });
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!form.name.trim()) {
      toast.error("Plan name required");
      return;
    }
    const payload = {
      name: form.name.trim(),
      category: form.category.trim() || null,
      investment_amount: Number(form.investment_amount || 0),
      security_deposit: Number(form.security_deposit || 0),
      delivery_radius_km: Number(form.delivery_radius_km || 0),
      coverage_type: form.coverage_type,
      validity_months: Number(form.validity_months || 12),
      description: form.description || null,
      benefits: form.benefits.split("\n").map((s) => s.trim()).filter(Boolean),
      features: form.features.split("\n").map((s) => s.trim()).filter(Boolean),
      status: form.status ? "active" : "inactive",
      sort_order: Number(form.sort_order || 1),
    };
    const client = supabase as any;
    const { error } = editing
      ? await client.from("franchise_plans").update(payload).eq("id", editing.id)
      : await client.from("franchise_plans").insert(payload);
    if (error) {
      toast.error(error.message || "Save failed");
      return;
    }
    toast.success(editing ? "Plan updated" : "Plan created");
    setShowModal(false);
    setEditing(null);
    qc.invalidateQueries({ queryKey: ["franchisePlans"] });
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this franchise plan?")) return;
    const { error } = await (supabase as any).from("franchise_plans").delete().eq("id", id);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Deleted");
    qc.invalidateQueries({ queryKey: ["franchisePlans"] });
  };

  const toggleStatus = async (p: FranchisePlan) => {
    const next = p.status === "active" ? "inactive" : "active";
    await (supabase as any).from("franchise_plans").update({ status: next }).eq("id", p.id);
    toast.success(`Marked ${next}`);
    qc.invalidateQueries({ queryKey: ["franchisePlans"] });
  };

  const inr = (n: number) => `₹${Number(n || 0).toLocaleString("en-IN")}`;

  const columns = [
    {
      key: "name", label: "Plan", render: (p: FranchisePlan) => (
        <div>
          <div className="font-semibold text-sm">{p.name}</div>
          {p.category && <div className="text-[10px] text-muted-foreground">{p.category}</div>}
        </div>
      ),
    },
    { key: "investment_amount", label: "Investment", render: (p: FranchisePlan) => <span className="font-medium">{inr(p.investment_amount)}</span> },
    {
      key: "radius", label: "Radius / Coverage", render: (p: FranchisePlan) => (
        <span className="text-xs capitalize">
          {p.coverage_type === "radius" ? `${p.delivery_radius_km || 0} KM` : p.coverage_type}
        </span>
      ),
    },
    { key: "validity_months", label: "Validity", render: (p: FranchisePlan) => `${p.validity_months} mo` },
    {
      key: "status", label: "Status", render: (p: FranchisePlan) => p.status === "active"
        ? <Badge className="bg-green-100 text-green-700 text-[10px]">Active</Badge>
        : <Badge variant="secondary" className="text-[10px]">Inactive</Badge>,
    },
    {
      key: "actions", label: "", render: (p: FranchisePlan) => (
        <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
          <Button size="sm" variant="outline" className="h-7 text-[10px]" onClick={() => openEdit(p)}>Edit</Button>
          <Button size="sm" variant="ghost" className="h-7 text-[10px]" onClick={() => toggleStatus(p)}>
            {p.status === "active" ? "Deactivate" : "Activate"}
          </Button>
          <Button size="sm" variant="ghost" className="h-7 text-[10px] text-destructive" onClick={() => handleDelete(p.id)}>Delete</Button>
        </div>
      ),
    },
  ];

  const rows = plans || [];

  return (
    <AdminLayout>
      <div className="space-y-4">
        <div>
          <h1 className="text-xl font-bold">Franchise Plans</h1>
          <p className="text-sm text-muted-foreground">Configure franchise packages, coverage, and benefits.</p>
        </div>

        <DataTable
          columns={columns}
          data={rows}
          total={rows.length}
          page={1} perPage={50} totalPages={1}
          onPageChange={() => {}}
          onAdd={openCreate}
          addLabel="Add Franchise Plan"
          loading={isLoading}
        />
      </div>

      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogTitle>{editing ? "Edit" : "Add"} Franchise Plan</DialogTitle>
          <div className="space-y-3 pt-2">
            <div className="grid grid-cols-2 gap-3">
              <div><Label className="text-xs">Plan Name *</Label><Input value={form.name} onChange={(e) => setForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g., Micro" /></div>
              <div><Label className="text-xs">Category</Label><Input value={form.category} onChange={(e) => setForm(f => ({ ...f, category: e.target.value }))} placeholder="e.g., Micro" /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label className="text-xs">Investment Amount (₹) *</Label><Input type="number" value={form.investment_amount} onChange={(e) => setForm(f => ({ ...f, investment_amount: e.target.value }))} /></div>
              <div><Label className="text-xs">Security Deposit (₹)</Label><Input type="number" value={form.security_deposit} onChange={(e) => setForm(f => ({ ...f, security_deposit: e.target.value }))} /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Coverage Type</Label>
                <Select value={form.coverage_type} onValueChange={(v: any) => setForm(f => ({ ...f, coverage_type: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="radius">Radius</SelectItem>
                    <SelectItem value="city">City</SelectItem>
                    <SelectItem value="district">District</SelectItem>
                    <SelectItem value="state">State</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div><Label className="text-xs">Delivery Radius (KM)</Label><Input type="number" value={form.delivery_radius_km} onChange={(e) => setForm(f => ({ ...f, delivery_radius_km: e.target.value }))} /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label className="text-xs">Validity (months)</Label><Input type="number" value={form.validity_months} onChange={(e) => setForm(f => ({ ...f, validity_months: e.target.value }))} /></div>
              <div><Label className="text-xs">Sort Order</Label><Input type="number" value={form.sort_order} onChange={(e) => setForm(f => ({ ...f, sort_order: e.target.value }))} /></div>
            </div>
            <div>
              <Label className="text-xs">Description</Label>
              <RichTextEditor value={form.description} onChange={v => setForm(f => ({ ...f, description: v }))} placeholder="Plan description..." minHeight="80px" compact />
            </div>
            <div>
              <Label className="text-xs">Benefits (one per line)</Label>
              <textarea className="w-full border rounded-md p-2 text-sm min-h-[90px]" value={form.benefits} onChange={(e) => setForm(f => ({ ...f, benefits: e.target.value }))} placeholder="Local territory rights&#10;Marketing kit&#10;Dedicated dashboard" />
            </div>
            <div>
              <Label className="text-xs">Features Included (one per line)</Label>
              <textarea className="w-full border rounded-md p-2 text-sm min-h-[70px]" value={form.features} onChange={(e) => setForm(f => ({ ...f, features: e.target.value }))} placeholder="Standard support&#10;Onboarding training" />
            </div>
            <div className="flex items-center gap-3"><Switch checked={form.status} onCheckedChange={(v) => setForm(f => ({ ...f, status: v }))} /><Label className="text-xs">Active</Label></div>
            <Button className="w-full" onClick={handleSave}>Save Plan</Button>
          </div>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
