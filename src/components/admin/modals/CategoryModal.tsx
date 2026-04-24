import { Category } from "@/lib/api";
import { Badge } from "@/components/ui/badge";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RichTextEditor } from "@/components/ui/rich-text-editor";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Trash2 } from "lucide-react";
import { useState, useEffect } from "react";
import { MediaLibraryPicker } from "@/components/admin/MediaLibraryPicker";
import { toast } from "sonner";
import { friendlyError } from "@/lib/friendly-error";

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
  display_order: "" as string, show_on_homepage: true,
  category_type: "product" as "product" | "service",
  theme_color: "" as string, theme_accent: "" as string,
};

/**
 * Curated theme palette for category accents. Values are HSL triplets
 * (no "hsl()" wrapper) so they can be plugged directly into a CSS variable.
 * Pick "None" to fall back to the global primary.
 */
const THEME_PRESETS: Array<{ label: string; primary: string; accent: string; hex: string }> = [
  { label: "Teal (default)", primary: "178 90% 32%", accent: "168 85% 48%", hex: "#0d9488" },
  { label: "Indigo", primary: "239 84% 60%", accent: "262 83% 70%", hex: "#4f46e5" },
  { label: "Coral", primary: "12 88% 60%", accent: "24 95% 65%", hex: "#f97316" },
  { label: "Forest", primary: "152 60% 36%", accent: "142 70% 50%", hex: "#16a34a" },
  { label: "Berry", primary: "330 75% 50%", accent: "320 85% 65%", hex: "#db2777" },
  { label: "Slate", primary: "215 40% 28%", accent: "210 35% 50%", hex: "#334155" },
  { label: "Amber", primary: "35 92% 48%", accent: "45 95% 55%", hex: "#d97706" },
];

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
        // Inherit parent's category_type
        const parent = (parentCategories || []).find(p => p.id === category.parent_id);
        if (parent?.category_type) initialForm.category_type = parent.category_type;
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
        display_order: (category as any).display_order != null ? String((category as any).display_order) : "",
        show_on_homepage: (category as any).show_on_homepage !== false,
        category_type: (category.category_type as any) || "product",
        theme_color: (category as any).theme_color || "",
        theme_accent: (category as any).theme_accent || "",
      });
      setEditMode(mode === "edit");
    }
  }, [category, mode, defaultAsSubcategory, parentCategories]);

  const handleSave = async () => {
    // Validation
    if (!form.name?.trim()) { toast.error("Category name is required"); return; }
    if (form.name.trim().length < 2) { toast.error("Name must be at least 2 characters"); return; }
    if (form.name.length > 80) { toast.error("Name must be under 80 characters"); return; }
    if (form.commission_rate) {
      const rate = parseFloat(form.commission_rate);
      if (isNaN(rate) || rate < 0 || rate > 100) {
        toast.error("Commission rate must be a number between 0 and 100");
        return;
      }
    }
    if (form.promotion_active && !form.promotion_title?.trim()) {
      toast.error("Promotion title is required when promotion is active");
      return;
    }
    setSaving(true);
    try {
      const orderVal = form.display_order?.trim();
      const orderNum = orderVal === "" ? 999 : parseInt(orderVal, 10);
      if (orderVal !== "" && (isNaN(orderNum) || orderNum < 0 || orderNum > 9999)) {
        toast.error("Display order must be a number 0-9999");
        setSaving(false);
        return;
      }
      // If creating/editing a subcategory, force category_type to inherit from parent
      let finalType = form.category_type;
      if (form.parent_id) {
        const parent = (parentCategories || []).find(p => p.id === form.parent_id);
        if (parent?.category_type) finalType = parent.category_type;
      }
      const payload: any = {
        ...form,
        name: form.name.trim(),
        parent_id: form.parent_id || null,
        commission_rate: form.commission_rate ? parseFloat(form.commission_rate) : null,
        promotion_banner_url: form.promotion_banner_url || null,
        promotion_title: form.promotion_title?.trim() || null,
        promotion_active: form.promotion_active,
        is_emergency: form.is_emergency,
        verification_status: form.verification_status,
        display_order: orderNum,
        show_on_homepage: form.show_on_homepage,
        category_type: finalType,
        theme_color: form.theme_color || null,
        theme_accent: form.theme_accent || null,
      };
      if (isCreate) await onCreate?.(payload);
      else if (category) await onSave?.(category.id, payload);
      onOpenChange(false);
    } catch (err: any) {
      console.error("Category save error:", err);
      toast.error(friendlyError(err, "Failed to save category. Please review your input and try again."));
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

          {/* Category Type — only editable on top-level. Subcategories inherit. */}
          <div>
            <Label className="text-xs text-muted-foreground">Category Type *</Label>
            {editMode && !isSubcategory ? (
              <Select value={form.category_type} onValueChange={(v) => setForm({ ...form, category_type: v as "product" | "service" })}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="product">Product Category</SelectItem>
                  <SelectItem value="service">Service Category</SelectItem>
                </SelectContent>
              </Select>
            ) : (
              <div className="mt-1">
                <Badge className={`text-[10px] border-0 ${form.category_type === 'service' ? 'bg-info/10 text-info' : 'bg-primary/10 text-primary'}`}>
                  {form.category_type === 'service' ? 'SERVICE' : 'PRODUCT'}
                </Badge>
                {isSubcategory && editMode && (
                  <p className="text-[10px] text-muted-foreground mt-1">Inherited from parent category</p>
                )}
              </div>
            )}
          </div>

          {/* Parent Category */}
          {editMode && parentOptions.length > 0 && (
            <div>
              <Label className="text-xs text-muted-foreground">Parent Category (leave empty for top-level)</Label>
              <Select value={form.parent_id || "none"} onValueChange={(v) => {
                const newParentId = v === "none" ? null : v;
                const updates: any = { parent_id: newParentId };
                // When attaching to a parent, inherit its type
                if (newParentId) {
                  const parent = parentOptions.find(p => p.id === newParentId);
                  if (parent?.category_type) updates.category_type = parent.category_type;
                }
                setForm({ ...form, ...updates });
              }}>
                <SelectTrigger className="mt-1"><SelectValue placeholder="None (top-level)" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None (top-level)</SelectItem>
                  {parentOptions.map(p => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name} <span className="text-[10px] text-muted-foreground ml-1">({p.category_type === 'service' ? 'Service' : 'Product'})</span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Display Order & Homepage visibility */}
          <div className="grid grid-cols-2 gap-3 p-3 rounded-lg border border-border/50 bg-muted/20">
            <div>
              <Label className="text-xs text-muted-foreground">Display Order</Label>
              {editMode ? (
                <Input
                  type="number"
                  min="0"
                  max="9999"
                  value={form.display_order}
                  onChange={(e) => setForm({ ...form, display_order: e.target.value })}
                  className="mt-1"
                  placeholder="e.g., 10"
                />
              ) : (
                <p className="text-sm mt-1 font-medium">{(category as any)?.display_order ?? 999}</p>
              )}
              <p className="text-[10px] text-muted-foreground mt-1">Lower number shows first</p>
            </div>
            <div className="flex flex-col">
              <Label className="text-xs text-muted-foreground">Show on Homepage</Label>
              <div className="mt-2">
                {editMode ? (
                  <Switch checked={form.show_on_homepage} onCheckedChange={(v) => setForm({ ...form, show_on_homepage: v })} />
                ) : (
                  <span className={`text-xs font-semibold ${(category as any)?.show_on_homepage !== false ? 'text-success' : 'text-muted-foreground'}`}>
                    {(category as any)?.show_on_homepage !== false ? 'Visible' : 'Hidden'}
                  </span>
                )}
              </div>
              <p className="text-[10px] text-muted-foreground mt-1">Controls homepage visibility</p>
            </div>
          </div>

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

          {/* Category Theme — cosmetic accent applied to the customer browse view */}
          <div className="space-y-2 p-3 rounded-lg border border-border/50 bg-muted/20">
            <Label className="text-xs font-semibold">Category Theme</Label>
            <p className="text-[10px] text-muted-foreground -mt-1">
              Tints the category rail, active chip, and discount ribbon when shoppers browse this category. Subcategories inherit the parent's theme when unset.
            </p>
            {editMode ? (
              <>
                <div className="flex flex-wrap gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setForm({ ...form, theme_color: "", theme_accent: "" })}
                    className={`h-8 px-3 rounded-md border text-xs ${!form.theme_color ? "border-primary ring-2 ring-primary/30" : "border-border"}`}
                  >
                    None
                  </button>
                  {THEME_PRESETS.map((p) => {
                    const active = form.theme_color === p.primary;
                    return (
                      <button
                        key={p.label}
                        type="button"
                        onClick={() => setForm({ ...form, theme_color: p.primary, theme_accent: p.accent })}
                        title={p.label}
                        className={`h-8 px-2 rounded-md border flex items-center gap-1.5 text-xs ${active ? "ring-2 ring-offset-1 ring-primary border-primary" : "border-border"}`}
                      >
                        <span className="h-4 w-4 rounded-sm" style={{ background: p.hex }} />
                        {p.label}
                      </button>
                    );
                  })}
                </div>
                <div className="grid grid-cols-2 gap-2 pt-1">
                  <div>
                    <Label className="text-[10px] text-muted-foreground">Primary HSL</Label>
                    <Input
                      value={form.theme_color}
                      onChange={(e) => setForm({ ...form, theme_color: e.target.value })}
                      placeholder="e.g. 178 90% 32%"
                      className="mt-1 h-8 text-xs font-mono"
                    />
                  </div>
                  <div>
                    <Label className="text-[10px] text-muted-foreground">Accent HSL</Label>
                    <Input
                      value={form.theme_accent}
                      onChange={(e) => setForm({ ...form, theme_accent: e.target.value })}
                      placeholder="e.g. 168 85% 48%"
                      className="mt-1 h-8 text-xs font-mono"
                    />
                  </div>
                </div>
              </>
            ) : form.theme_color ? (
              <div className="flex items-center gap-2 mt-1">
                <span className="h-5 w-5 rounded" style={{ background: `hsl(${form.theme_color})` }} />
                <code className="text-[11px]">{form.theme_color}</code>
                {form.theme_accent && (
                  <>
                    <span className="h-5 w-5 rounded" style={{ background: `hsl(${form.theme_accent})` }} />
                    <code className="text-[11px]">{form.theme_accent}</code>
                  </>
                )}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground mt-1">Default (global primary)</p>
            )}
          </div>

          {/* Description */}
          <div>
            <Label className="text-xs text-muted-foreground">Description</Label>
            {editMode
              ? <RichTextEditor value={form.description} onChange={(v) => setForm({ ...form, description: v })} placeholder="Category description..." minHeight="80px" compact />
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
