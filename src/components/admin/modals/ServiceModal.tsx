import { Service } from "@/lib/api";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Wrench, DollarSign, Trash2 } from "lucide-react";
import { useState, useEffect } from "react";
import { MOCK_SERVICE_CATEGORIES, MOCK_SERVICE_VENDORS } from "@/lib/mockData";

interface ServiceModalProps {
  service: Service | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: "view" | "edit" | "create";
  onSave?: (id: string, data: Partial<Service>) => Promise<void>;
  onCreate?: (data: Partial<Service>) => Promise<void>;
  onDelete?: (id: string) => Promise<void>;
}

const emptyForm = {
  title: "", description: "", price: 0, tax: 0, discount: 0,
  max_points_redeemable: 0, status: "active" as Service["status"],
  vendor_id: "", vendor_name: "", category_id: "", category_name: "",
  emoji: "🔧", service_area: "Coimbatore", duration: "1-2 hours",
};

export function ServiceModal({ service, open, onOpenChange, mode, onSave, onCreate, onDelete }: ServiceModalProps) {
  const isCreate = mode === "create";
  const [editMode, setEditMode] = useState(mode === "edit" || isCreate);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(emptyForm);

  useEffect(() => {
    if (isCreate) { setForm(emptyForm); setEditMode(true); }
    else if (service) {
      setForm({
        title: service.title, description: service.description,
        price: service.price, tax: service.tax, discount: service.discount,
        max_points_redeemable: service.max_points_redeemable, status: service.status,
        vendor_id: service.vendor_id, vendor_name: service.vendor_name,
        category_id: service.category_id, category_name: service.category_name,
        emoji: service.emoji || "🔧", service_area: service.service_area || "Coimbatore",
        duration: service.duration || "1-2 hours",
      });
      setEditMode(mode === "edit");
    }
  }, [service, mode]);

  const handleSave = async () => {
    if (!form.title) return;
    setSaving(true);
    try {
      if (isCreate) await onCreate?.(form);
      else if (service) await onSave?.(service.id, form);
      onOpenChange(false);
    } finally { setSaving(false); }
  };

  const handleDelete = async () => {
    if (!service) return;
    setSaving(true);
    try { await onDelete?.(service.id); onOpenChange(false); } finally { setSaving(false); }
  };

  const handleVendorChange = (id: string) => {
    const v = MOCK_SERVICE_VENDORS.find(sv => sv.id === id);
    setForm({ ...form, vendor_id: id, vendor_name: v?.business_name || "" });
  };

  const handleCategoryChange = (id: string) => {
    const c = MOCK_SERVICE_CATEGORIES.find(sc => sc.id === id);
    setForm({ ...form, category_id: id, category_name: c?.name || "" });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
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

        <div className="space-y-5 mt-2">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <Label className="text-xs text-muted-foreground">Title *</Label>
              {editMode ? <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className="mt-1" placeholder="Service name" /> : <p className="text-sm font-medium mt-1">{service?.title}</p>}
            </div>
            <div className="col-span-2">
              <Label className="text-xs text-muted-foreground">Description</Label>
              {editMode ? <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="mt-1" rows={3} /> : <p className="text-sm mt-1 text-muted-foreground">{service?.description}</p>}
            </div>
            {editMode && (
              <>
                <div>
                  <Label className="text-xs text-muted-foreground">Vendor *</Label>
                  <Select value={form.vendor_id} onValueChange={handleVendorChange}>
                    <SelectTrigger className="mt-1"><SelectValue placeholder="Select vendor" /></SelectTrigger>
                    <SelectContent>
                      {MOCK_SERVICE_VENDORS.map(v => <SelectItem key={v.id} value={v.id}>{v.business_name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Category *</Label>
                  <Select value={form.category_id} onValueChange={handleCategoryChange}>
                    <SelectTrigger className="mt-1"><SelectValue placeholder="Select category" /></SelectTrigger>
                    <SelectContent>
                      {MOCK_SERVICE_CATEGORIES.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
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
              </>
            )}
            <div>
              <Label className="text-xs text-muted-foreground">Status</Label>
              {editMode ? (
                <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v as Service["status"] })}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                  </SelectContent>
                </Select>
              ) : <div className="mt-1"><StatusBadge status={service?.status || "active"} /></div>}
            </div>
          </div>

          <div className="p-4 rounded-lg bg-secondary/20 border border-border/30 space-y-3">
            <h4 className="text-sm font-semibold flex items-center gap-2"><DollarSign className="h-4 w-4 text-primary" /> Pricing</h4>
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
            <div className="flex justify-between items-center">
              <span className="text-sm font-semibold">Final Price</span>
              <span className="text-lg font-bold">₹{(form.price + form.tax - form.discount).toLocaleString()}</span>
            </div>
          </div>
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
