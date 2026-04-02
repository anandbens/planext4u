import { Category } from "@/lib/api";
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
}

const emptyForm = { name: "", image: "📦", status: "active" as Category["status"], banner_image: "", icon: "", is_trending: false, description: "", parent_id: "" as string | null };

export function CategoryModal({ category, open, onOpenChange, mode, onSave, onCreate, onDelete, parentCategories }: CategoryModalProps) {
  const isCreate = mode === "create";
  const [editMode, setEditMode] = useState(mode === "edit" || isCreate);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(emptyForm);

  useEffect(() => {
    if (isCreate) { setForm(emptyForm); setEditMode(true); }
    else if (category) {
      setForm({
        name: category.name, image: category.image || "📦", status: category.status,
        banner_image: category.banner_image || "", icon: category.icon || "",
        is_trending: category.is_trending || false, description: category.description || "",
        parent_id: category.parent_id || null,
      });
      setEditMode(mode === "edit");
    }
  }, [category, mode]);

  const handleSave = async () => {
    if (!form.name) return;
    setSaving(true);
    try {
      const payload = { ...form, parent_id: form.parent_id || null };
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

  // Filter out the current category from parent options to prevent self-reference
  const parentOptions = (parentCategories || []).filter(c => c.id !== category?.id && !c.parent_id);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isCreate ? "New Category" : `Edit: ${category?.name}`}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 mt-2">
          <div>
            <Label className="text-xs text-muted-foreground">Category Name *</Label>
            {editMode ? <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="mt-1" placeholder="Category name" /> : <p className="text-sm font-medium mt-1">{category?.name}</p>}
          </div>

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

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs text-muted-foreground">Icon/Emoji</Label>
              {editMode ? <Input value={form.image} onChange={(e) => setForm({ ...form, image: e.target.value })} className="mt-1" placeholder="📦" /> : <span className="text-2xl">{category?.image}</span>}
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Icon Class/URL</Label>
              {editMode ? <Input value={form.icon} onChange={(e) => setForm({ ...form, icon: e.target.value })} className="mt-1" placeholder="icon-name or URL" /> : <p className="text-sm mt-1">{category?.icon || '—'}</p>}
            </div>
          </div>

          <div>
            <Label className="text-xs text-muted-foreground">Banner Image</Label>
            {editMode ? (
              <MediaLibraryPicker value={form.banner_image} onChange={(url) => setForm({ ...form, banner_image: url })} folder="categories" label="Upload Banner Image" className="mt-1" />
            ) : form.banner_image ? (
              <img src={form.banner_image} alt="Banner" className="mt-1 h-20 w-full object-cover rounded" />
            ) : <p className="text-sm mt-1 text-muted-foreground">—</p>}
          </div>

          <div>
            <Label className="text-xs text-muted-foreground">Description</Label>
            {editMode ? <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="mt-1 min-h-[80px]" placeholder="Category description..." /> : <p className="text-sm mt-1">{category?.description || '—'}</p>}
          </div>

          <div className="flex items-center justify-between">
            <Label className="text-xs text-muted-foreground">Trending</Label>
            {editMode ? (
              <Switch checked={form.is_trending} onCheckedChange={(v) => setForm({ ...form, is_trending: v })} />
            ) : (
              <span className={`text-xs font-semibold ${category?.is_trending ? 'text-success' : 'text-muted-foreground'}`}>{category?.is_trending ? 'Yes' : 'No'}</span>
            )}
          </div>

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
