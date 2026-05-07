import { Category } from "@/lib/api";
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
import { toast } from "sonner";
import { friendlyError } from "@/lib/friendly-error";

interface Props {
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

const empty = {
  name: "", image: "🛠️", icon: "", banner_image: "",
  status: "active" as Category["status"],
  parent_id: "" as string | null,
  is_trending: false, is_emergency: false, description: "",
  display_order: "" as string, show_on_homepage: true,
};

export function ServiceCategoryModal({ category, open, onOpenChange, mode, onSave, onCreate, onDelete, parentCategories, defaultAsSubcategory }: Props) {
  const isCreate = mode === "create";
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(empty);

  useEffect(() => {
    if (isCreate) {
      const init = { ...empty };
      if (defaultAsSubcategory && category?.parent_id) init.parent_id = category.parent_id;
      setForm(init);
    } else if (category) {
      setForm({
        name: category.name,
        image: category.image || "🛠️",
        icon: (category as any).icon || "",
        banner_image: (category as any).banner_image || "",
        status: category.status,
        parent_id: category.parent_id || null,
        is_trending: !!category.is_trending,
        is_emergency: !!(category as any).is_emergency,
        description: category.description || "",
        display_order: (category as any).display_order != null ? String((category as any).display_order) : "",
        show_on_homepage: (category as any).show_on_homepage !== false,
      });
    }
  }, [category, mode, defaultAsSubcategory]);

  const handleSave = async () => {
    if (!form.name?.trim()) { toast.error("Name is required"); return; }
    if (form.name.trim().length < 2) { toast.error("Name must be at least 2 characters"); return; }
    const orderVal = form.display_order?.trim();
    const orderNum = orderVal === "" ? 999 : parseInt(orderVal, 10);
    if (orderVal !== "" && (isNaN(orderNum) || orderNum < 0 || orderNum > 9999)) {
      toast.error("Display order must be 0-9999"); return;
    }
    setSaving(true);
    try {
      const payload: any = {
        ...form,
        name: form.name.trim(),
        parent_id: form.parent_id || null,
        display_order: orderNum,
      };
      if (isCreate) await onCreate?.(payload);
      else if (category) await onSave?.(category.id, payload);
      onOpenChange(false);
    } catch (err: any) {
      toast.error(friendlyError(err, "Failed to save service category"));
    } finally { setSaving(false); }
  };

  const handleDelete = async () => {
    if (!category) return;
    setSaving(true);
    try { await onDelete?.(category.id); onOpenChange(false); } finally { setSaving(false); }
  };

  const parentOptions = (parentCategories || []).filter(c => c.id !== category?.id && !c.parent_id);
  const isSub = !!form.parent_id;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isCreate ? (defaultAsSubcategory ? "New Service Subcategory" : "New Service Category") : `Edit: ${category?.name}`}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 mt-2">
          <div>
            <Label className="text-xs text-muted-foreground">{isSub ? "Subcategory Name *" : "Category Name *"}</Label>
            <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="mt-1" placeholder="e.g., Home Cleaning" />
          </div>

          {parentOptions.length > 0 && (
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

          <div className="grid grid-cols-2 gap-3 p-3 rounded-lg border border-border/50 bg-muted/20">
            <div>
              <Label className="text-xs text-muted-foreground">Display Order</Label>
              <Input type="number" min="0" max="9999" value={form.display_order}
                onChange={(e) => setForm({ ...form, display_order: e.target.value })}
                className="mt-1" placeholder="e.g., 10" />
              <p className="text-[10px] text-muted-foreground mt-1">Lower number shows first</p>
            </div>
            <div className="flex flex-col">
              <Label className="text-xs text-muted-foreground">Show on Homepage</Label>
              <div className="mt-2">
                <Switch checked={form.show_on_homepage} onCheckedChange={(v) => setForm({ ...form, show_on_homepage: v })} />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs text-muted-foreground">Image</Label>
              <MediaLibraryPicker value={form.image} onChange={(url) => setForm({ ...form, image: url })} folder="service-categories" label="Choose Image" className="mt-1" />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Icon</Label>
              <MediaLibraryPicker value={form.icon} onChange={(url) => setForm({ ...form, icon: url })} folder="icons" label="Choose Icon" className="mt-1" />
            </div>
          </div>

          <div>
            <Label className="text-xs text-muted-foreground">Banner Image</Label>
            <MediaLibraryPicker value={form.banner_image} onChange={(url) => setForm({ ...form, banner_image: url })} folder="service-categories" label="Upload Banner" className="mt-1" />
          </div>

          <div>
            <Label className="text-xs text-muted-foreground">Description</Label>
            <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={3} className="mt-1" />
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <Label className="text-xs text-muted-foreground">Status</Label>
              <Select value={form.status} onValueChange={(v: any) => setForm({ ...form, status: v })}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Trending</Label>
              <div className="mt-2"><Switch checked={form.is_trending} onCheckedChange={(v) => setForm({ ...form, is_trending: v })} /></div>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Emergency</Label>
              <div className="mt-2"><Switch checked={form.is_emergency} onCheckedChange={(v) => setForm({ ...form, is_emergency: v })} /></div>
            </div>
          </div>
        </div>

        <DialogFooter className="mt-4 gap-2">
          {!isCreate && category && (
            <Button variant="destructive" onClick={handleDelete} disabled={saving} className="mr-auto gap-1">
              <Trash2 className="h-4 w-4" /> Delete
            </Button>
          )}
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>Cancel</Button>
          <Button onClick={handleSave} disabled={saving}>{isCreate ? "Create" : "Save"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
