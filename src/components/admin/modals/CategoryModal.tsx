import { Category } from "@/lib/api";
import { Badge } from "@/components/ui/badge";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Trash2 } from "lucide-react";
import { useState, useEffect } from "react";
import { MediaLibraryPicker } from "@/components/admin/MediaLibraryPicker";

interface CategoryModalProps {
  category: Category | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: "view" | "edit" | "create";
  onSave?: (id: string, data: Partial<Category>) => Promise<void>;
  onCreate?: (data: Partial<Category>) => Promise<void>;
  onDelete?: (id: string) => Promise<void>;
  parentCategories?: Category[];
  defaultAsSubcategory?: boolean;
}

const emptyForm = {
  name: "", image: "📦", status: "active" as Category["status"],
  banner_image: "", icon: "", is_trending: false, description: "",
  parent_id: "" as string | null, commission_rate: "" as string,
  promotion_banner_url: "", promotion_title: "", promotion_active: false,
  is_emergency: false, verification_status: "unverified" as string,
};

export function CategoryModal({ category, open, onOpenChange, mode, onSave, onCreate, onDelete, parentCategories, defaultAsSubcategory }: CategoryModalProps) {
  const isCreate = mode === "create";
  const [editMode, setEditMode] = useState(mode === "edit" || isCreate);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(emptyForm);

  useEffect(() => {
    if (isCreate) {
      const initialForm = { ...emptyForm };
      // If creating as subcategory and category has parent_id preset
      if (defaultAsSubcategory && category?.parent_id) {
        initialForm.parent_id = category.parent_id;
      }
      setForm(initialForm);
      setEditMode(true);
    } else if (category) {
      setForm({
        name: category.name, image: category.image || "📦", status: category.status,
        banner_image: category.banner_image || "", icon: category.icon || "",
        is_trending: category.is_trending || false, description: category.description || "",
        parent_id: category.parent_id || null,
        commission_rate: (category as any).commission_rate?.toString() || "",
        promotion_banner_url: (category as any).promotion_banner_url || "",
        promotion_title: (category as any).promotion_title || "",
        promotion_active: (category as any).promotion_active || false,
        is_emergency: (category as any).is_emergency || false,
        verification_status: (category as any).verification_status || "unverified",
      });
      setEditMode(mode === "edit");
    }
  }, [category, mode, defaultAsSubcategory]);

  const handleSave = async () => {
    if (!form.name) return;
    setSaving(true);
    try {
      const payload: any = {
        ...form,
        parent_id: form.parent_id || null,
        commission_rate: form.commission_rate ? parseFloat(form.commission_rate) : null,
        promotion_banner_url: form.promotion_banner_url || null,
        promotion_title: form.promotion_title || null,
        promotion_active: form.promotion_active,
        is_emergency: form.is_emergency,
        verification_status: form.verification_status,
      };
      if (isCreate) await onCreate?.(payload);
      else if (category) await onSave?.(category.id, payload);
      onOpenChange(false);
    } finally { setSaving(false); }
  };

  const handleDelete = async () => {
    if (!category) return;
    setSaving(true);
    try { await onDelete?.(category.id); onOpenChange(false); } finally { setSaving(false); }
  };

  const parentOptions = (parentCategories || []).filter(c => c.id !== category?.id && !c.parent_id);
  const isSubcategory = !!form.parent_id;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isCreate
              ? (defaultAsSubcategory ? "New Subcategory" : "New Category")
              : `Edit: ${category?.name}`}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 mt-2">
          {/* Name */}
          <div>
            <Label className="text-xs text-muted-foreground">
              {isSubcategory ? "Subcategory Name *" : "Category Name *"}
            </Label>
            {editMode
              ? <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="mt-1" placeholder="Category name" />
              : <p className="text-sm font-medium mt-1">{category?.name}</p>}
          </div>

          {/* Parent Category */}
          {editMode && parentOptions.length > 0 && (
            <div>
              <Label className="text-xs text-muted-foreground">Parent Category (leave empty for top-level)</Label>
              <Select value={form.parent_id || "none"} onValueChange={(v) => setForm({ ...form, parent_id: v === "none" ? null : v })}>
                <SelectTrigger className="mt-1"><SelectValue placeholder="None (top-level)" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None (top-level)</SelectItem>
                  {parentOptions.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Image & Icon from Media Library */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs text-muted-foreground">Image</Label>
              {editMode ? (
                <MediaLibraryPicker value={form.image} onChange={(url) => setForm({ ...form, image: url })} folder="categories" label="Choose Image" className="mt-1" />
              ) : (
                form.image?.startsWith('http') || form.image?.startsWith('/')
                  ? <img src={form.image} alt="cat" className="mt-1 h-12 w-12 rounded object-cover" />
                  : <span className="text-2xl mt-1 block">{form.image}</span>
              )}
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Icon (from Media Library)</Label>
              {editMode ? (
                <MediaLibraryPicker value={form.icon} onChange={(url) => setForm({ ...form, icon: url })} folder="icons" label="Choose Icon" className="mt-1" />
              ) : (
                form.icon?.startsWith('http') || form.icon?.startsWith('/')
                  ? <img src={form.icon} alt="icon" className="mt-1 h-10 w-10 rounded object-contain" />
                  : <p className="text-sm mt-1">{form.icon || '—'}</p>
              )}
            </div>
          </div>

          {/* Banner Image */}
          <div>
            <Label className="text-xs text-muted-foreground">Banner Image</Label>
            {editMode ? (
              <MediaLibraryPicker value={form.banner_image} onChange={(url) => setForm({ ...form, banner_image: url })} folder="categories" label="Upload Banner Image" className="mt-1" />
            ) : form.banner_image ? (
              <img src={form.banner_image} alt="Banner" className="mt-1 h-20 w-full object-cover rounded" />
            ) : <p className="text-sm mt-1 text-muted-foreground">—</p>}
          </div>

          {/* Description */}
          <div>
            <Label className="text-xs text-muted-foreground">Description</Label>
            {editMode
              ? <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="mt-1 min-h-[80px]" placeholder="Category description..." />
              : <p className="text-sm mt-1">{category?.description || '—'}</p>}
          </div>

          {/* Trending & Emergency */}
          <div className="flex items-center justify-between">
            <Label className="text-xs text-muted-foreground">Trending</Label>
            {editMode
              ? <Switch checked={form.is_trending} onCheckedChange={(v) => setForm({ ...form, is_trending: v })} />
              : <span className={`text-xs font-semibold ${category?.is_trending ? 'text-success' : 'text-muted-foreground'}`}>{category?.is_trending ? 'Yes' : 'No'}</span>}
          </div>

          <div className="flex items-center justify-between">
            <Label className="text-xs text-muted-foreground">Emergency</Label>
            {editMode
              ? <Switch checked={form.is_emergency} onCheckedChange={(v) => setForm({ ...form, is_emergency: v })} />
              : <span className={`text-xs font-semibold ${(category as any)?.is_emergency ? 'text-success' : 'text-muted-foreground'}`}>{(category as any)?.is_emergency ? 'Active' : 'Deactive'}</span>}
          </div>

          {/* Commission Rate */}
          <div>
            <Label className="text-xs text-muted-foreground">P4U Commission Rate (%)</Label>
            {editMode ? (
              <Input type="number" min="0" max="100" step="0.5" value={form.commission_rate} onChange={(e) => setForm({ ...form, commission_rate: e.target.value })} className="mt-1" placeholder="e.g., 10" />
            ) : <p className="text-sm mt-1">{(category as any)?.commission_rate ? `${(category as any).commission_rate}%` : '—'}</p>}
          </div>

          {/* Promotion Banner */}
          <div className="space-y-2 p-3 rounded-lg border border-border/50 bg-muted/20">
            <Label className="text-xs font-semibold">Category Promotion</Label>
            <div className="flex items-center justify-between">
              <Label className="text-xs text-muted-foreground">Active</Label>
              {editMode
                ? <Switch checked={form.promotion_active} onCheckedChange={(v) => setForm({ ...form, promotion_active: v })} />
                : <span className={`text-xs font-semibold ${(category as any)?.promotion_active ? 'text-success' : 'text-muted-foreground'}`}>{(category as any)?.promotion_active ? 'Yes' : 'No'}</span>}
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Promotion Title</Label>
              {editMode ? <Input value={form.promotion_title} onChange={(e) => setForm({ ...form, promotion_title: e.target.value })} className="mt-1" placeholder="e.g., Summer Sale" /> : <p className="text-sm mt-1">{(category as any)?.promotion_title || '—'}</p>}
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Promotion Banner</Label>
              {editMode ? (
                <MediaLibraryPicker value={form.promotion_banner_url} onChange={(url) => setForm({ ...form, promotion_banner_url: url })} folder="promotions" label="Upload Promotion Banner" className="mt-1" />
              ) : form.promotion_banner_url ? (
                <img src={form.promotion_banner_url} alt="Promotion" className="mt-1 h-16 w-full object-cover rounded" />
              ) : <p className="text-sm mt-1 text-muted-foreground">—</p>}
            </div>
          </div>

          {/* Status */}
          <div>
            <Label className="text-xs text-muted-foreground">Status</Label>
            {editMode ? (
              <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v as any })}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>
            ) : <div className="mt-1"><StatusBadge status={category?.status || "active"} /></div>}
          </div>

          {/* Verification Status */}
          <div>
            <Label className="text-xs text-muted-foreground">Verification Status</Label>
            {editMode ? (
              <Select value={form.verification_status} onValueChange={(v) => setForm({ ...form, verification_status: v })}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="verified">Verified</SelectItem>
                  <SelectItem value="unverified">Unverified</SelectItem>
                </SelectContent>
              </Select>
            ) : (
              <div className="mt-1">
                <Badge className={`text-[10px] border-0 ${(category as any)?.verification_status === 'verified' ? 'bg-success/10 text-success' : 'bg-destructive/10 text-destructive'}`}>
                  {(category as any)?.verification_status === 'verified' ? 'VERIFIED' : 'UNVERIFIED'}
                </Badge>
              </div>
            )}
          </div>
        </div>
        <DialogFooter className="mt-4">
          {!isCreate && onDelete && editMode && (
            <Button variant="destructive" onClick={handleDelete} disabled={saving} className="mr-auto gap-1"><Trash2 className="h-4 w-4" /> Delete</Button>
          )}
          {editMode ? (
            <>
              <Button variant="outline" onClick={() => isCreate ? onOpenChange(false) : setEditMode(false)} disabled={saving}>Cancel</Button>
              <Button onClick={handleSave} disabled={saving || !form.name}>
                {saving && <div className="h-4 w-4 rounded-full border-2 border-current border-t-transparent animate-spin mr-2" />}
                {isCreate ? "Create" : "Save"}
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
