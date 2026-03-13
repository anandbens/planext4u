import { Vendor } from "@/lib/api";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Mail, Phone, Store, Percent, Crown, ArrowRight } from "lucide-react";
import { useState, useEffect } from "react";

interface VendorModalProps {
  vendor: Vendor | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: "view" | "edit";
  onSave?: (id: string, data: Partial<Vendor>) => Promise<void>;
}

const statusFlow: Vendor["status"][] = ["pending", "level1_approved", "level2_approved", "verified"];

export function VendorModal({ vendor, open, onOpenChange, mode, onSave }: VendorModalProps) {
  const [editMode, setEditMode] = useState(mode === "edit");
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    name: "", business_name: "", email: "", mobile: "",
    commission_rate: 0, membership: "", status: "" as Vendor["status"],
  });

  useEffect(() => {
    if (vendor) {
      setForm({
        name: vendor.name, business_name: vendor.business_name,
        email: vendor.email, mobile: vendor.mobile,
        commission_rate: vendor.commission_rate, membership: vendor.membership,
        status: vendor.status,
      });
      setEditMode(mode === "edit");
    }
  }, [vendor, mode]);

  if (!vendor) return null;

  const currentStep = statusFlow.indexOf(vendor.status);

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSave?.(vendor.id, form);
      onOpenChange(false);
    } finally {
      setSaving(false);
    }
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
              <span>{vendor.business_name}</span>
              <p className="text-xs font-normal text-muted-foreground mt-0.5">{vendor.name} · {vendor.id}</p>
            </div>
          </DialogTitle>
          <DialogDescription className="flex items-center gap-2 pt-1">
            <StatusBadge status={vendor.status} />
            <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${vendor.membership === 'premium' ? 'bg-warning/10 text-warning' : 'bg-secondary text-secondary-foreground'}`}>
              {vendor.membership}
            </span>
          </DialogDescription>
        </DialogHeader>

        {vendor.status !== "rejected" && (
          <div className="flex items-center gap-1 py-3">
            {statusFlow.map((s, i) => (
              <div key={s} className="flex items-center gap-1 flex-1">
                <div className={`flex-1 h-1.5 rounded-full transition-colors ${i <= currentStep ? 'gradient-primary' : 'bg-secondary'}`} />
                {i < statusFlow.length - 1 && <ArrowRight className="h-3 w-3 text-muted-foreground shrink-0" />}
              </div>
            ))}
          </div>
        )}

        <Tabs defaultValue="details" className="mt-1">
          <TabsList className="bg-secondary/50 w-full justify-start">
            <TabsTrigger value="details">Details</TabsTrigger>
            <TabsTrigger value="business">Business</TabsTrigger>
          </TabsList>

          <TabsContent value="details" className="space-y-4 mt-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-xs text-muted-foreground">Owner Name</Label>
                {editMode ? <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="mt-1" /> : <p className="text-sm font-medium mt-1">{vendor.name}</p>}
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Business Name</Label>
                {editMode ? <Input value={form.business_name} onChange={(e) => setForm({ ...form, business_name: e.target.value })} className="mt-1" /> : <p className="text-sm font-medium mt-1">{vendor.business_name}</p>}
              </div>
              <div>
                <Label className="text-xs text-muted-foreground flex items-center gap-1"><Mail className="h-3 w-3" /> Email</Label>
                {editMode ? <Input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="mt-1" /> : <p className="text-sm font-medium mt-1">{vendor.email}</p>}
              </div>
              <div>
                <Label className="text-xs text-muted-foreground flex items-center gap-1"><Phone className="h-3 w-3" /> Mobile</Label>
                {editMode ? <Input value={form.mobile} onChange={(e) => setForm({ ...form, mobile: e.target.value })} className="mt-1" /> : <p className="text-sm font-medium mt-1">{vendor.mobile}</p>}
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Status</Label>
                {editMode ? (
                  <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v as Vendor["status"] })}>
                    <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {statusFlow.map((s) => <SelectItem key={s} value={s} className="capitalize">{s.replace(/_/g, " ")}</SelectItem>)}
                      <SelectItem value="rejected">Rejected</SelectItem>
                    </SelectContent>
                  </Select>
                ) : <div className="mt-1"><StatusBadge status={vendor.status} /></div>}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="business" className="mt-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 rounded-lg bg-secondary/30">
                <div className="flex items-center gap-2 mb-1">
                  <Percent className="h-4 w-4 text-primary" />
                  <Label className="text-xs text-muted-foreground">Commission Rate</Label>
                </div>
                {editMode ? <Input type="number" value={form.commission_rate} onChange={(e) => setForm({ ...form, commission_rate: Number(e.target.value) })} className="mt-1" /> : <p className="text-xl font-bold">{vendor.commission_rate}%</p>}
              </div>
              <div className="p-4 rounded-lg bg-secondary/30">
                <div className="flex items-center gap-2 mb-1">
                  <Crown className="h-4 w-4 text-warning" />
                  <Label className="text-xs text-muted-foreground">Membership</Label>
                </div>
                {editMode ? (
                  <Select value={form.membership} onValueChange={(v) => setForm({ ...form, membership: v })}>
                    <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="basic">Basic</SelectItem>
                      <SelectItem value="premium">Premium</SelectItem>
                    </SelectContent>
                  </Select>
                ) : <p className="text-xl font-bold capitalize">{vendor.membership}</p>}
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Category ID</Label>
                <p className="text-sm font-medium mt-1">{vendor.category_id}</p>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">City / Area</Label>
                <p className="text-sm font-medium mt-1">{vendor.city_id} / {vendor.area_id}</p>
              </div>
            </div>
          </TabsContent>
        </Tabs>

        <DialogFooter className="mt-4">
          {editMode ? (
            <>
              <Button variant="outline" onClick={() => setEditMode(false)} disabled={saving}>Cancel</Button>
              <Button onClick={handleSave} disabled={saving}>
                {saving && <div className="h-4 w-4 rounded-full border-2 border-current border-t-transparent animate-spin mr-2" />}
                Save Changes
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
