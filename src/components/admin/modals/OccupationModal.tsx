import { Occupation } from "@/lib/api";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Trash2 } from "lucide-react";
import { useState, useEffect } from "react";

interface OccupationModalProps {
  occupation: Occupation | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: "view" | "edit" | "create";
  onSave?: (id: string, data: Partial<Occupation>) => Promise<void>;
  onCreate?: (data: Partial<Occupation>) => Promise<void>;
  onDelete?: (id: string) => Promise<void>;
}

const emptyForm = { name: "", status: "active" as Occupation["status"] };

export function OccupationModal({ occupation, open, onOpenChange, mode, onSave, onCreate, onDelete }: OccupationModalProps) {
  const isCreate = mode === "create";
  const [editMode, setEditMode] = useState(mode === "edit" || isCreate);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(emptyForm);

  useEffect(() => {
    if (isCreate) { setForm(emptyForm); setEditMode(true); }
    else if (occupation) { setForm({ name: occupation.name, status: occupation.status }); setEditMode(mode === "edit"); }
  }, [occupation, mode]);

  const handleSave = async () => {
    if (!form.name.trim()) return;
    setSaving(true);
    try {
      if (isCreate) await onCreate?.(form);
      else if (occupation) await onSave?.(occupation.id, form);
      onOpenChange(false);
    } finally { setSaving(false); }
  };

  const handleDelete = async () => {
    if (!occupation) return;
    setSaving(true);
    try { await onDelete?.(occupation.id); onOpenChange(false); } finally { setSaving(false); }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{isCreate ? "New Occupation" : `Edit: ${occupation?.name}`}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 mt-2">
          <div>
            <Label className="text-xs text-muted-foreground">Occupation Name *</Label>
            {editMode ? <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="mt-1" placeholder="Occupation name" /> : <p className="text-sm font-medium mt-1">{occupation?.name}</p>}
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
            ) : <div className="mt-1"><StatusBadge status={occupation?.status || "active"} /></div>}
          </div>
          {!isCreate && occupation && (
            <div>
              <Label className="text-xs text-muted-foreground">Customers using this occupation</Label>
              <p className="text-sm font-semibold mt-1">{occupation.customer_count}</p>
            </div>
          )}
        </div>
        <DialogFooter className="mt-4">
          {!isCreate && onDelete && editMode && (
            <Button variant="destructive" onClick={handleDelete} disabled={saving} className="mr-auto gap-1"><Trash2 className="h-4 w-4" /> Delete</Button>
          )}
          {editMode ? (
            <>
              <Button variant="outline" onClick={() => isCreate ? onOpenChange(false) : setEditMode(false)} disabled={saving}>Cancel</Button>
              <Button onClick={handleSave} disabled={saving || !form.name.trim()}>
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
