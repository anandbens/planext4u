import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ClassifiedAd } from "@/lib/api";
import { Trash2, Plus, X } from "lucide-react";

interface ClassifiedModalProps {
  ad: ClassifiedAd | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: "view" | "edit";
  onSave?: (id: string, data: Partial<ClassifiedAd>) => Promise<void>;
  onDelete?: (id: string) => Promise<void>;
  onModeChange?: (mode: "view" | "edit") => void;
}

export function ClassifiedModal({ ad, open, onOpenChange, mode, onSave, onDelete, onModeChange }: ClassifiedModalProps) {
  const [form, setForm] = useState<any>({});
  const [saving, setSaving] = useState(false);
  const [newImageUrl, setNewImageUrl] = useState("");

  useEffect(() => {
    if (ad) {
      setForm({
        title: ad.title || "",
        description: ad.description || "",
        price: ad.price || 0,
        category: ad.category || "",
        city: ad.city || "",
        area: ad.area || "",
        status: ad.status || "pending",
        images: Array.isArray((ad as any).images) ? (ad as any).images : [],
      });
    }
  }, [ad, open]);

  const handleSave = async () => {
    if (!ad) return;
    setSaving(true);
    try {
      await onSave?.(ad.id, form);
      onOpenChange(false);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!ad) return;
    setSaving(true);
    try {
      await onDelete?.(ad.id);
      onOpenChange(false);
    } finally {
      setSaving(false);
    }
  };

  const addImage = () => {
    if (!newImageUrl.trim()) return;
    setForm((f: any) => ({ ...f, images: [...(f.images || []), newImageUrl.trim()] }));
    setNewImageUrl("");
  };

  const removeImage = (idx: number) => {
    setForm((f: any) => ({ ...f, images: (f.images || []).filter((_: string, i: number) => i !== idx) }));
  };

  const isEdit = mode === "edit";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit Classified Ad" : "View Classified Ad"}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Images */}
          <div>
            <Label>Images</Label>
            <div className="flex gap-2 flex-wrap mt-1">
              {(form.images || []).map((img: string, i: number) => (
                <div key={i} className="relative h-20 w-20 rounded-lg overflow-hidden border border-border/50">
                  <img src={img} alt={`Ad ${i}`} className="h-full w-full object-cover" />
                  {isEdit && (
                    <button onClick={() => removeImage(i)}
                      className="absolute top-0.5 right-0.5 h-5 w-5 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center">
                      <X className="h-3 w-3" />
                    </button>
                  )}
                </div>
              ))}
            </div>
            {isEdit && (
              <div className="flex gap-2 mt-2">
                <Input placeholder="Paste image URL" value={newImageUrl} onChange={(e) => setNewImageUrl(e.target.value)} className="flex-1" />
                <Button type="button" size="sm" onClick={addImage} variant="outline"><Plus className="h-4 w-4" /></Button>
              </div>
            )}
          </div>

          <div>
            <Label>Title</Label>
            <Input value={form.title || ""} onChange={(e) => setForm({ ...form, title: e.target.value })} readOnly={!isEdit} />
          </div>
          <div>
            <Label>Description</Label>
            <Textarea value={form.description || ""} onChange={(e) => setForm({ ...form, description: e.target.value })} readOnly={!isEdit} rows={3} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Price (₹)</Label>
              <Input type="number" value={form.price || 0} onChange={(e) => setForm({ ...form, price: Number(e.target.value) })} readOnly={!isEdit} />
            </div>
            <div>
              <Label>Category</Label>
              <Input value={form.category || ""} onChange={(e) => setForm({ ...form, category: e.target.value })} readOnly={!isEdit} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>City</Label>
              <Input value={form.city || ""} onChange={(e) => setForm({ ...form, city: e.target.value })} readOnly={!isEdit} />
            </div>
            <div>
              <Label>Area</Label>
              <Input value={form.area || ""} onChange={(e) => setForm({ ...form, area: e.target.value })} readOnly={!isEdit} />
            </div>
          </div>
          {isEdit && (
            <div>
              <Label>Status</Label>
              <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {["pending", "approved", "rejected", "expired", "sold"].map(s => (
                    <SelectItem key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>

        <DialogFooter className="gap-2">
          {isEdit && onDelete && (
            <Button variant="destructive" size="sm" onClick={handleDelete} disabled={saving} className="mr-auto">
              <Trash2 className="h-4 w-4 mr-1" /> Delete
            </Button>
          )}
          <Button variant="outline" onClick={() => onOpenChange(false)}>{isEdit ? "Cancel" : "Close"}</Button>
          {isEdit ? (
            <Button onClick={handleSave} disabled={saving}>{saving ? "Saving..." : "Save"}</Button>
          ) : (
            <Button onClick={() => onModeChange?.("edit")}>Edit</Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
