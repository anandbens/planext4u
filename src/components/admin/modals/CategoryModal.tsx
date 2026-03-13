import { Category } from "@/lib/api";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Trash2 } from "lucide-react";
import { useState, useEffect } from "react";

interface CategoryModalProps {
  category: Category | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: "view" | "edit" | "create";
  onSave?: (id: string, data: Partial<Category>) => Promise<void>;
  onCreate?: (data: Partial<Category>) => Promise<void>;
  onDelete?: (id: string) => Promise<void>;
}

const emptyForm = { name: "", image: "📦", status: "active" as Category["status"] };

export function CategoryModal({ category, open, onOpenChange, mode, onSave, onCreate, onDelete }: CategoryModalProps) {
  const isCreate = mode === "create";
  const [editMode, setEditMode] = useState(mode === "edit" || isCreate);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(emptyForm);

  useEffect(() => {
    if (isCreate) { setForm(emptyForm); setEditMode(true); }
    else if (category) { setForm({ name: category.name, image: category.image || "📦", status: category.status }); setEditMode(mode === "edit"); }
  }, [category, mode]);

  const handleSave = async () => {
    if (!form.name) return;
    setSaving(true);
    try {
      if (isCreate) await onCreate?.(form);
      else if (category) await onSave?.(category.id, form);
      onOpenChange(false);
    } finally { setSaving(false); }
  };

  const handleDelete = async () => {
    if (!category) return;
    setSaving(true);
    try { await onDelete?.(category.id); onOpenChange(false); } finally { setSaving(false); }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{isCreate ? "New Category" : `Edit: ${category?.name}`}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 mt-2">
          <div>
            <Label className="text-xs text-muted-foreground">Category Name *</Label>
            {editMode ? <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="mt-1" placeholder="Category name" /> : <p className="text-sm font-medium mt-1">{category?.name}</p>}
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">Icon/Emoji</Label>
            {editMode ? <Input value={form.image} onChange={(e) => setForm({ ...form, image: e.target.value })} className="mt-1" placeholder="📦 or /images/..." /> : <span className="text-2xl">{category?.image}</span>}
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
