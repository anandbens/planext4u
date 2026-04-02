import { Vendor } from "@/lib/api";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Mail, Phone, Store, Percent, Crown, ArrowRight, Trash2 } from "lucide-react";
import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface VendorModalProps {
  vendor: Vendor | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: "view" | "edit" | "create";
  onSave?: (id: string, data: Partial<Vendor>) => Promise<void>;
  onCreate?: (data: Partial<Vendor>) => Promise<void>;
  onDelete?: (id: string) => Promise<void>;
  vendorType?: "product" | "service";
}

const statusFlow: Vendor["status"][] = ["pending", "level1_approved", "level2_approved", "verified"];

const emptyForm = {
  name: "", business_name: "", email: "", mobile: "", rejection_reason: "",
  commission_rate: 10, membership: "basic", status: "pending" as Vendor["status"],
  category_id: "1", city_id: "1", area_id: "1", plan_id: "",
};

export function VendorModal({ vendor, open, onOpenChange, mode, onSave, onCreate, onDelete, vendorType = "product" }: VendorModalProps) {
  const isCreate = mode === "create";
  const [editMode, setEditMode] = useState(mode === "edit" || isCreate);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(emptyForm);

  const { data: vendorPlans = [] } = useQuery({
    queryKey: ["vendorPlansDropdown"],
    queryFn: async () => {
      const { data } = await supabase.from("vendor_plans").select("id, plan_name, plan_type, visibility_type").eq("is_active", true).order("plan_tier");
      return data || [];
    },
  });

  useEffect(() => {
    if (isCreate) {
      setForm(emptyForm);
      setEditMode(true);
    } else if (vendor) {
      setForm({
        name: vendor.name, business_name: vendor.business_name,
        email: vendor.email, mobile: vendor.mobile,
        rejection_reason: (vendor as any).rejection_reason || "",
        commission_rate: vendor.commission_rate, membership: vendor.membership,
        status: vendor.status, category_id: vendor.category_id,
        city_id: vendor.city_id, area_id: vendor.area_id,
        plan_id: (vendor as any).plan_id || "",
      });
      setEditMode(mode === "edit");
    }
  }, [vendor, mode]);

  const currentStep = vendor ? statusFlow.indexOf(vendor.status) : -1;

  const handleSave = async () => {
    if (!form.name || !form.business_name) return;
    setSaving(true);
    try {
      if (isCreate) { await onCreate?.(form); }
      else if (vendor) { await onSave?.(vendor.id, form); }
      onOpenChange(false);
    } finally { setSaving(false); }
  };

  const handleDelete = async () => {
    if (!vendor) return;
    setSaving(true);
    try { await onDelete?.(vendor.id); onOpenChange(false); } finally { setSaving(false); }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl gradient-info flex items-center justify-center shrink-0">
              <Store className="h-5 w-5 text-card" />
            </div>
            <div>
              <span>{isCreate ? `New ${vendorType === "service" ? "Service" : "Product"} Vendor` : vendor?.business_name}</span>
              {!isCreate && vendor && <p className="text-xs font-normal text-muted-foreground mt-0.5">{vendor.name} · {vendor.id}</p>}
            </div>
          </DialogTitle>
          {!isCreate && vendor && (
            <DialogDescription className="flex items-center gap-2 pt-1">
              <StatusBadge status={vendor.status} />
              <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${vendor.membership === 'premium' ? 'bg-warning/10 text-warning' : 'bg-secondary text-secondary-foreground'}`}>
                {vendor.membership}
              </span>
            </DialogDescription>
          )}
        </DialogHeader>

        {!isCreate && vendor && vendor.status !== "rejected" && (
          <div className="flex items-center gap-1 py-3">
            {statusFlow.map((s, i) => (
              <div key={s} className="flex items-center gap-1 flex-1">
                <div className={`flex-1 h-1.5 rounded-full transition-colors ${i <= currentStep ? 'gradient-primary' : 'bg-secondary'}`} />
                {i < statusFlow.length - 1 && <ArrowRight className="h-3 w-3 text-muted-foreground shrink-0" />}
              </div>
            ))}
          </div>
        )}

        <div className="space-y-4 mt-1">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-xs text-muted-foreground">Owner Name *</Label>
              {editMode ? <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="mt-1" placeholder="Owner name" /> : <p className="text-sm font-medium mt-1">{vendor?.name}</p>}
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Business Name *</Label>
              {editMode ? <Input value={form.business_name} onChange={(e) => setForm({ ...form, business_name: e.target.value })} className="mt-1" placeholder="Business name" /> : <p className="text-sm font-medium mt-1">{vendor?.business_name}</p>}
            </div>
            <div>
              <Label className="text-xs text-muted-foreground flex items-center gap-1"><Mail className="h-3 w-3" /> Email</Label>
              {editMode ? <Input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="mt-1" placeholder="vendor@email.com" /> : <p className="text-sm font-medium mt-1">{vendor?.email}</p>}
            </div>
            <div>
              <Label className="text-xs text-muted-foreground flex items-center gap-1"><Phone className="h-3 w-3" /> Mobile</Label>
              {editMode ? <Input value={form.mobile} onChange={(e) => setForm({ ...form, mobile: e.target.value })} className="mt-1" placeholder="+91 99887 76543" /> : <p className="text-sm font-medium mt-1">{vendor?.mobile}</p>}
            </div>
            {editMode && (
              <div>
                <Label className="text-xs text-muted-foreground">Status</Label>
                <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v as Vendor["status"] })}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {statusFlow.map((s) => <SelectItem key={s} value={s} className="capitalize">{s.replace(/_/g, " ")}</SelectItem>)}
                    <SelectItem value="rejected">Rejected</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 rounded-lg bg-secondary/30">
              <div className="flex items-center gap-2 mb-1"><Percent className="h-4 w-4 text-primary" /><Label className="text-xs text-muted-foreground">Commission Rate</Label></div>
              {editMode ? <Input type="number" value={form.commission_rate} onChange={(e) => setForm({ ...form, commission_rate: Number(e.target.value) })} className="mt-1" /> : <p className="text-xl font-bold">{vendor?.commission_rate}%</p>}
            </div>
            <div className="p-4 rounded-lg bg-secondary/30">
              <div className="flex items-center gap-2 mb-1"><Crown className="h-4 w-4 text-warning" /><Label className="text-xs text-muted-foreground">Membership</Label></div>
              {editMode ? (
                <Select value={form.membership} onValueChange={(v) => setForm({ ...form, membership: v })}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="basic">Basic</SelectItem>
                    <SelectItem value="premium">Premium</SelectItem>
                  </SelectContent>
                </Select>
              ) : <p className="text-xl font-bold capitalize">{vendor?.membership}</p>}
            </div>
          </div>

          {/* Vendor Plan Assignment */}
          <div className="p-4 rounded-lg bg-secondary/30">
            <div className="flex items-center gap-2 mb-2"><Crown className="h-4 w-4 text-primary" /><Label className="text-xs text-muted-foreground">Vendor Plan</Label></div>
            {editMode ? (
              <Select value={form.plan_id || "none"} onValueChange={(v) => setForm({ ...form, plan_id: v === "none" ? "" : v })}>
                <SelectTrigger className="mt-1"><SelectValue placeholder="Select a plan" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No Plan</SelectItem>
                  {vendorPlans.filter(p => p.plan_type === "local").length > 0 && (
                    <>
                      <div className="px-2 py-1 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Local Plans</div>
                      {vendorPlans.filter(p => p.plan_type === "local").map(p => (
                        <SelectItem key={p.id} value={p.id}>{p.plan_name} ({p.visibility_type.replace(/_/g, " ")})</SelectItem>
                      ))}
                    </>
                  )}
                  {vendorPlans.filter(p => p.plan_type === "vip").length > 0 && (
                    <>
                      <div className="px-2 py-1 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">VIP Plans</div>
                      {vendorPlans.filter(p => p.plan_type === "vip").map(p => (
                        <SelectItem key={p.id} value={p.id}>{p.plan_name} ({p.visibility_type.replace(/_/g, " ")})</SelectItem>
                      ))}
                    </>
                  )}
                </SelectContent>
              </Select>
            ) : (
              <p className="text-sm font-medium">{vendorPlans.find(p => p.id === (vendor as any)?.plan_id)?.plan_name || "No Plan"}</p>
            )}
          </div>
        </div>

        <DialogFooter className="mt-4">
          {!isCreate && onDelete && editMode && (
            <Button variant="destructive" onClick={handleDelete} disabled={saving} className="mr-auto gap-1">
              <Trash2 className="h-4 w-4" /> Delete
            </Button>
          )}
          {editMode ? (
            <>
              <Button variant="outline" onClick={() => isCreate ? onOpenChange(false) : setEditMode(false)} disabled={saving}>Cancel</Button>
              <Button onClick={handleSave} disabled={saving || !form.name || !form.business_name}>
                {saving && <div className="h-4 w-4 rounded-full border-2 border-current border-t-transparent animate-spin mr-2" />}
                {isCreate ? "Create Vendor" : "Save Changes"}
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
