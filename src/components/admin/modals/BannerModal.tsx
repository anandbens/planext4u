import { Banner } from "@/lib/api";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Trash2 } from "lucide-react";
import { useState, useEffect } from "react";
import { MediaLibraryPicker } from "@/components/admin/MediaLibraryPicker";

interface BannerModalProps {
  banner: Banner | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: "view" | "edit" | "create";
  onSave?: (id: string, data: Partial<Banner>) => Promise<void>;
  onCreate?: (data: Partial<Banner>) => Promise<void>;
  onDelete?: (id: string) => Promise<void>;
}

const emptyForm = {
  title: "", subtitle: "", desktop_image: "", mobile_image: "",
  link: "/app/browse", priority: 1, start_date: new Date().toISOString().split("T")[0],
  end_date: new Date(Date.now() + 30 * 86400000).toISOString().split("T")[0],
  status: "active" as Banner["status"], gradient: "from-primary to-primary/70",
};

export function BannerModal({ banner, open, onOpenChange, mode, onSave, onCreate, onDelete }: BannerModalProps) {
  const isCreate = mode === "create";
  const [editMode, setEditMode] = useState(mode === "edit" || isCreate);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(emptyForm);

  useEffect(() => {
    if (isCreate) { setForm(emptyForm); setEditMode(true); }
    else if (banner) {
      setForm({
        title: banner.title, subtitle: banner.subtitle || "",
        desktop_image: banner.desktop_image, mobile_image: banner.mobile_image,
        link: banner.link, priority: banner.priority,
        start_date: banner.start_date, end_date: banner.end_date,
        status: banner.status, gradient: banner.gradient || "",
      });
      setEditMode(mode === "edit");
    }
  }, [banner, mode]);

  const handleSave = async () => {
    if (!form.title) return;
    setSaving(true);
    try {
      if (isCreate) await onCreate?.(form);
      else if (banner) await onSave?.(banner.id, form);
      onOpenChange(false);
    } finally { setSaving(false); }
  };

  const handleDelete = async () => {
    if (!banner) return;
    setSaving(true);
    try { await onDelete?.(banner.id); onOpenChange(false); } finally { setSaving(false); }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isCreate ? "New Banner" : `Edit: ${banner?.title}`}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 mt-2">
          <div>
            <Label className="text-xs text-muted-foreground">Title *</Label>
            {editMode ? <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className="mt-1" /> : <p className="text-sm font-medium mt-1">{banner?.title}</p>}
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">Subtitle</Label>
            {editMode ? <Input value={form.subtitle} onChange={(e) => setForm({ ...form, subtitle: e.target.value })} className="mt-1" /> : <p className="text-sm mt-1">{banner?.subtitle}</p>}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs text-muted-foreground">Desktop Image</Label>
              {editMode ? (
                <MediaLibraryPicker value={form.desktop_image} onChange={(url) => setForm({ ...form, desktop_image: url })} folder="banners" label="Desktop Image" className="mt-1" />
              ) : <p className="text-xs mt-1 truncate">{banner?.desktop_image || "—"}</p>}
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Mobile Image</Label>
              {editMode ? (
                <MediaLibraryPicker value={form.mobile_image} onChange={(url) => setForm({ ...form, mobile_image: url })} folder="banners" label="Mobile Image" className="mt-1" />
              ) : <p className="text-xs mt-1 truncate">{banner?.mobile_image || "—"}</p>}
            </div>
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">Link</Label>
            {editMode ? <Input value={form.link} onChange={(e) => setForm({ ...form, link: e.target.value })} className="mt-1" /> : <code className="text-xs">{banner?.link}</code>}
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">Gradient (fallback if no image)</Label>
            {editMode ? <Input value={form.gradient} onChange={(e) => setForm({ ...form, gradient: e.target.value })} className="mt-1" placeholder="from-primary to-primary/70" /> : <p className="text-xs mt-1">{banner?.gradient || "—"}</p>}
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <Label className="text-xs text-muted-foreground">Priority</Label>
              {editMode ? <Input type="number" value={form.priority} onChange={(e) => setForm({ ...form, priority: Number(e.target.value) })} className="mt-1" /> : <p className="text-sm font-medium mt-1">#{banner?.priority}</p>}
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Start Date</Label>
              {editMode ? <Input type="date" value={form.start_date} onChange={(e) => setForm({ ...form, start_date: e.target.value })} className="mt-1" /> : <p className="text-xs mt-1">{banner?.start_date}</p>}
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">End Date</Label>
              {editMode ? <Input type="date" value={form.end_date} onChange={(e) => setForm({ ...form, end_date: e.target.value })} className="mt-1" /> : <p className="text-xs mt-1">{banner?.end_date}</p>}
            </div>
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
            ) : <p className="text-sm mt-1 capitalize">{banner?.status}</p>}
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
