import { Product } from "@/lib/api";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Package, Store, Tag, Star, DollarSign } from "lucide-react";
import { useState, useEffect } from "react";

interface ProductModalProps {
  product: Product | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: "view" | "edit";
  onSave?: (id: string, data: Partial<Product>) => Promise<void>;
}

export function ProductModal({ product, open, onOpenChange, mode, onSave }: ProductModalProps) {
  const [editMode, setEditMode] = useState(mode === "edit");
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    title: "", description: "", price: 0, tax: 0, discount: 0,
    max_points_redeemable: 0, status: "" as Product["status"],
  });

  useEffect(() => {
    if (product) {
      setForm({
        title: product.title, description: product.description,
        price: product.price, tax: product.tax, discount: product.discount,
        max_points_redeemable: product.max_points_redeemable, status: product.status,
      });
      setEditMode(mode === "edit");
    }
  }, [product, mode]);

  if (!product) return null;

  const finalPrice = (editMode ? form.price + form.tax - form.discount : product.price + product.tax - product.discount);

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSave?.(product.id, form);
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
            <div className="h-10 w-10 rounded-xl gradient-warning flex items-center justify-center shrink-0">
              <Package className="h-5 w-5 text-card" />
            </div>
            <div>
              <span>{product.title}</span>
              <p className="text-xs font-normal text-muted-foreground mt-0.5">{product.id}</p>
            </div>
          </DialogTitle>
          <DialogDescription className="flex items-center gap-2 pt-1">
            <StatusBadge status={product.status} />
            <span className="text-xs text-muted-foreground flex items-center gap-1">
              <Tag className="h-3 w-3" /> {product.category_name}
            </span>
            <span className="text-xs text-muted-foreground flex items-center gap-1">
              <Store className="h-3 w-3" /> {product.vendor_name}
            </span>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 mt-2">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <Label className="text-xs text-muted-foreground">Title</Label>
              {editMode ? <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className="mt-1" /> : <p className="text-sm font-medium mt-1">{product.title}</p>}
            </div>
            <div className="col-span-2">
              <Label className="text-xs text-muted-foreground">Description</Label>
              {editMode ? <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="mt-1" rows={3} /> : <p className="text-sm mt-1 text-muted-foreground">{product.description}</p>}
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Status</Label>
              {editMode ? (
                <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v as Product["status"] })}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                    <SelectItem value="draft">Draft</SelectItem>
                  </SelectContent>
                </Select>
              ) : <div className="mt-1"><StatusBadge status={product.status} /></div>}
            </div>
          </div>

          <div className="p-4 rounded-lg bg-secondary/20 border border-border/30 space-y-3">
            <h4 className="text-sm font-semibold flex items-center gap-2"><DollarSign className="h-4 w-4 text-primary" /> Pricing</h4>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label className="text-xs text-muted-foreground">Base Price</Label>
                {editMode ? <Input type="number" value={form.price} onChange={(e) => setForm({ ...form, price: Number(e.target.value) })} className="mt-1" /> : <p className="text-sm font-bold mt-1">₹{product.price.toLocaleString()}</p>}
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Tax</Label>
                {editMode ? <Input type="number" value={form.tax} onChange={(e) => setForm({ ...form, tax: Number(e.target.value) })} className="mt-1" /> : <p className="text-sm font-medium mt-1">₹{product.tax.toLocaleString()}</p>}
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Discount</Label>
                {editMode ? <Input type="number" value={form.discount} onChange={(e) => setForm({ ...form, discount: Number(e.target.value) })} className="mt-1" /> : <p className="text-sm font-medium mt-1 text-success">{product.discount > 0 ? `₹${product.discount}` : "—"}</p>}
              </div>
            </div>
            <Separator />
            <div className="flex justify-between items-center">
              <span className="text-sm font-semibold">Final Price</span>
              <span className="text-lg font-bold">₹{finalPrice.toLocaleString()}</span>
            </div>
          </div>

          <div className="p-4 rounded-lg bg-accent/30 border border-primary/10 flex items-center gap-4">
            <Star className="h-8 w-8 text-warning" />
            <div className="flex-1">
              <Label className="text-xs text-muted-foreground">Max Points Redeemable</Label>
              {editMode ? <Input type="number" value={form.max_points_redeemable} onChange={(e) => setForm({ ...form, max_points_redeemable: Number(e.target.value) })} className="mt-1 max-w-32" /> : <p className="text-xl font-bold">{product.max_points_redeemable} pts</p>}
            </div>
          </div>
        </div>

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
