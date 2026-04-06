import { Product } from "@/lib/api";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Package, Store, Tag, Star, DollarSign, Trash2, ImageIcon } from "lucide-react";
import { useState, useEffect } from "react";
import { MOCK_CATEGORIES, MOCK_VENDORS } from "@/lib/mockData";
import { MediaLibraryPicker } from "@/components/admin/MediaLibraryPicker";

interface ProductModalProps {
  product: Product | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: "view" | "edit" | "create";
  onSave?: (id: string, data: Partial<Product>) => Promise<void>;
  onCreate?: (data: Partial<Product>) => Promise<void>;
  onDelete?: (id: string) => Promise<void>;
}

const emptyForm = {
  title: "", description: "", price: 0, tax: 0, discount: 0,
  max_points_redeemable: 0, status: "active" as Product["status"],
  vendor_id: "", vendor_name: "", category_id: "", category_name: "", stock: 0, emoji: "📦",
  image: "", rejection_reason: "",
};

export function ProductModal({ product, open, onOpenChange, mode, onSave, onCreate, onDelete }: ProductModalProps) {
  const isCreate = mode === "create";
  const [editMode, setEditMode] = useState(mode === "edit" || isCreate);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(emptyForm);

  useEffect(() => {
    if (isCreate) {
      setForm(emptyForm);
      setEditMode(true);
    } else if (product) {
      setForm({
        title: product.title, description: product.description,
        price: product.price, tax: product.tax, discount: product.discount,
        max_points_redeemable: product.max_points_redeemable, status: product.status,
        vendor_id: product.vendor_id, vendor_name: product.vendor_name,
        category_id: product.category_id, category_name: product.category_name,
        stock: product.stock || 0, emoji: product.emoji || "📦",
        image: product.image || "", rejection_reason: product.rejection_reason || "",
      });
      setEditMode(mode === "edit");
    }
  }, [product, mode]);

  const finalPrice = form.price + form.tax - form.discount;

  const handleSave = async () => {
    if (!form.title) return;
    if (form.status === 'rejected' && !form.rejection_reason?.trim()) {
      return; // rejection reason required
    }
    setSaving(true);
    try {
      if (isCreate) {
        await onCreate?.(form);
      } else if (product) {
        await onSave?.(product.id, form);
      }
      onOpenChange(false);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!product) return;
    setSaving(true);
    try { await onDelete?.(product.id); onOpenChange(false); } finally { setSaving(false); }
  };

  const handleVendorChange = (vendorId: string) => {
    const vendor = MOCK_VENDORS.find(v => v.id === vendorId);
    setForm({ ...form, vendor_id: vendorId, vendor_name: vendor?.business_name || "" });
  };

  const handleCategoryChange = (catId: string) => {
    const cat = MOCK_CATEGORIES.find(c => c.id === catId);
    setForm({ ...form, category_id: catId, category_name: cat?.name || "" });
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
              <span>{isCreate ? "New Product" : product?.title}</span>
              {!isCreate && product && <p className="text-xs font-normal text-muted-foreground mt-0.5">{product.id}</p>}
            </div>
          </DialogTitle>
          {!isCreate && product && (
            <DialogDescription className="flex items-center gap-2 pt-1">
              <StatusBadge status={product.status} />
              <span className="text-xs text-muted-foreground flex items-center gap-1"><Tag className="h-3 w-3" /> {product.category_name}</span>
              <span className="text-xs text-muted-foreground flex items-center gap-1"><Store className="h-3 w-3" /> {product.vendor_name}</span>
            </DialogDescription>
          )}
        </DialogHeader>

        <div className="space-y-5 mt-2">
          {/* Image Upload */}
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground flex items-center gap-1"><ImageIcon className="h-3 w-3" /> Product Image</Label>
            {editMode ? (
              <MediaLibraryPicker value={form.image} onChange={(url) => setForm({ ...form, image: url })} folder="product-images" label="Upload Product Image" />
            ) : form.image ? (
              <div className="h-32 w-full rounded-lg overflow-hidden bg-secondary/20 border border-border/30">
                <img src={form.image} alt="Preview" className="w-full h-full object-cover" />
              </div>
            ) : null}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <Label className="text-xs text-muted-foreground">Title *</Label>
              {editMode ? <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className="mt-1" placeholder="Product name" /> : <p className="text-sm font-medium mt-1">{product?.title}</p>}
            </div>
            <div className="col-span-2">
              <Label className="text-xs text-muted-foreground">Description</Label>
              {editMode ? <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="mt-1" rows={3} /> : <p className="text-sm mt-1 text-muted-foreground">{product?.description}</p>}
            </div>
            {editMode && (
              <>
                <div>
                  <Label className="text-xs text-muted-foreground">Vendor *</Label>
                  <Select value={form.vendor_id} onValueChange={handleVendorChange}>
                    <SelectTrigger className="mt-1"><SelectValue placeholder="Select vendor" /></SelectTrigger>
                    <SelectContent>
                      {MOCK_VENDORS.map(v => <SelectItem key={v.id} value={v.id}>{v.business_name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Category *</Label>
                  <Select value={form.category_id} onValueChange={handleCategoryChange}>
                    <SelectTrigger className="mt-1"><SelectValue placeholder="Select category" /></SelectTrigger>
                    <SelectContent>
                      {MOCK_CATEGORIES.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </>
            )}
            <div>
              <Label className="text-xs text-muted-foreground">Status</Label>
              {editMode ? (
                <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v as Product["status"] })}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active (Approved)</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                    <SelectItem value="draft">Draft</SelectItem>
                    <SelectItem value="pending_approval">Pending Approval</SelectItem>
                    <SelectItem value="rejected">Rejected</SelectItem>
                  </SelectContent>
                </Select>
              ) : <div className="mt-1"><StatusBadge status={product?.status || "active"} /></div>}
            </div>
            {editMode && form.status === 'rejected' && (
              <div className="col-span-2">
                <Label className="text-xs text-destructive font-semibold">Rejection Reason *</Label>
                <Textarea value={form.rejection_reason} onChange={(e) => setForm({ ...form, rejection_reason: e.target.value })} className="mt-1 border-destructive/50" rows={2} placeholder="Explain why this product is being rejected..." />
              </div>
            )}
            {!editMode && product?.status === 'rejected' && product?.rejection_reason && (
              <div className="col-span-2 p-3 rounded-lg bg-destructive/10 border border-destructive/20">
                <Label className="text-xs text-destructive font-semibold">Rejection Reason</Label>
                <p className="text-sm mt-1">{product.rejection_reason}</p>
              </div>
            )}
            {editMode && (
              <div>
                <Label className="text-xs text-muted-foreground">Stock</Label>
                <Input type="number" value={form.stock} onChange={(e) => setForm({ ...form, stock: Number(e.target.value) })} className="mt-1" />
              </div>
            )}
          </div>

          <div className="p-4 rounded-lg bg-secondary/20 border border-border/30 space-y-3">
            <h4 className="text-sm font-semibold flex items-center gap-2"><DollarSign className="h-4 w-4 text-primary" /> Pricing</h4>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label className="text-xs text-muted-foreground">Base Price</Label>
                {editMode ? <Input type="number" value={form.price} onChange={(e) => setForm({ ...form, price: Number(e.target.value) })} className="mt-1" /> : <p className="text-sm font-bold mt-1">₹{product?.price.toLocaleString()}</p>}
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Tax</Label>
                {editMode ? <Input type="number" value={form.tax} onChange={(e) => setForm({ ...form, tax: Number(e.target.value) })} className="mt-1" /> : <p className="text-sm font-medium mt-1">₹{product?.tax.toLocaleString()}</p>}
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Discount</Label>
                {editMode ? <Input type="number" value={form.discount} onChange={(e) => setForm({ ...form, discount: Number(e.target.value) })} className="mt-1" /> : <p className="text-sm font-medium mt-1 text-success">{(product?.discount || 0) > 0 ? `₹${product?.discount}` : "—"}</p>}
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
              {editMode ? <Input type="number" value={form.max_points_redeemable} onChange={(e) => setForm({ ...form, max_points_redeemable: Number(e.target.value) })} className="mt-1 max-w-32" /> : <p className="text-xl font-bold">{product?.max_points_redeemable} pts</p>}
            </div>
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
              <Button onClick={handleSave} disabled={saving || !form.title}>
                {saving && <div className="h-4 w-4 rounded-full border-2 border-current border-t-transparent animate-spin mr-2" />}
                {isCreate ? "Create Product" : "Save Changes"}
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
