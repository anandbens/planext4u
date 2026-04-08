import { useState, useEffect } from "react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { MediaLibraryPicker } from "@/components/admin/MediaLibraryPicker";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, GripVertical, Eye } from "lucide-react";

interface VendorOnboardingSlide {
  id: string;
  title: string;
  description: string;
  image_url: string;
  display_order: number;
  is_active: boolean;
}

export default function AdminVendorOnboardingPage() {
  const [slides, setSlides] = useState<VendorOnboardingSlide[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewIdx, setPreviewIdx] = useState(0);
  const [editing, setEditing] = useState<VendorOnboardingSlide | null>(null);
  const [form, setForm] = useState({ title: "", description: "", image_url: "", display_order: 0, is_active: true });

  const fetchSlides = async () => {
    setLoading(true);
    const { data } = await supabase.from("vendor_onboarding_screens" as any).select("*").order("display_order");
    setSlides((data as any) || []);
    setLoading(false);
  };

  useEffect(() => { fetchSlides(); }, []);

  const openAdd = () => {
    setEditing(null);
    setForm({ title: "", description: "", image_url: "", display_order: slides.length + 1, is_active: true });
    setModalOpen(true);
  };

  const openEdit = (s: VendorOnboardingSlide) => {
    setEditing(s);
    setForm({ title: s.title, description: s.description, image_url: s.image_url, display_order: s.display_order, is_active: s.is_active });
    setModalOpen(true);
  };

  const handleSave = async () => {
    if (!form.title.trim()) { toast.error("Title is required"); return; }
    if (editing) {
      const { error } = await supabase.from("vendor_onboarding_screens" as any).update(form as any).eq("id", editing.id);
      if (error) { toast.error("Update failed"); return; }
      toast.success("Screen updated");
    } else {
      const { error } = await supabase.from("vendor_onboarding_screens" as any).insert(form as any);
      if (error) { toast.error("Create failed"); return; }
      toast.success("Screen created");
    }
    setModalOpen(false);
    fetchSlides();
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this screen?")) return;
    await supabase.from("vendor_onboarding_screens" as any).delete().eq("id", id);
    toast.success("Deleted");
    fetchSlides();
  };

  const activeSlides = slides.filter(s => s.is_active);

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Vendor Onboarding Screens</h1>
            <p className="text-sm text-muted-foreground">Manage onboarding slides shown to vendors on first launch</p>
          </div>
          <div className="flex gap-2">
            {activeSlides.length > 0 && (
              <Button variant="outline" onClick={() => { setPreviewIdx(0); setPreviewOpen(true); }}>
                <Eye className="h-4 w-4 mr-1" /> Preview
              </Button>
            )}
            <Button onClick={openAdd}><Plus className="h-4 w-4 mr-1" /> Add Screen</Button>
          </div>
        </div>

        {loading ? (
          <div className="text-center py-12 text-muted-foreground">Loading...</div>
        ) : slides.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">No vendor onboarding screens yet. Click "Add Screen" to create one.</div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {slides.map((s) => (
              <Card key={s.id} className="overflow-hidden">
                <div className="h-40 bg-secondary/20 flex items-center justify-center overflow-hidden">
                  {s.image_url ? (
                    <img src={s.image_url} alt={s.title} className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-4xl">📱</span>
                  )}
                </div>
                <div className="p-4">
                  <div className="flex items-center justify-between mb-1">
                    <h3 className="font-semibold text-sm truncate flex-1">{s.title}</h3>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded ${s.is_active ? 'bg-success/10 text-success' : 'bg-muted text-muted-foreground'}`}>
                      {s.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground line-clamp-2 mb-3">{s.description}</p>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground flex items-center gap-1"><GripVertical className="h-3 w-3" /> Order: {s.display_order}</span>
                    <div className="flex-1" />
                    <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => openEdit(s)}><Pencil className="h-3 w-3" /></Button>
                    <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-destructive" onClick={() => handleDelete(s.id)}><Trash2 className="h-3 w-3" /></Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Add/Edit Modal */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editing ? "Edit Screen" : "Add Screen"}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div><Label>Title</Label><Input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} /></div>
            <div><Label>Description</Label><Textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} rows={3} /></div>
            <div>
              <Label>Image</Label>
              <MediaLibraryPicker value={form.image_url} onChange={url => setForm(f => ({ ...f, image_url: url }))} />
            </div>
            <div><Label>Display Order</Label><Input type="number" value={form.display_order} onChange={e => setForm(f => ({ ...f, display_order: parseInt(e.target.value) || 0 }))} /></div>
            <div className="flex items-center gap-2">
              <Switch checked={form.is_active} onCheckedChange={v => setForm(f => ({ ...f, is_active: v }))} />
              <Label>Active</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setModalOpen(false)}>Cancel</Button>
            <Button onClick={handleSave}>{editing ? "Update" : "Create"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Preview Modal */}
      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="max-w-sm p-0 overflow-hidden">
          <DialogTitle className="sr-only">Preview</DialogTitle>
          {activeSlides[previewIdx] && (
            <div className="flex flex-col items-center text-center p-8">
              <img src={activeSlides[previewIdx].image_url} alt="" className="w-64 h-64 object-contain rounded-2xl mb-6" />
              <h2 className="text-xl font-bold">{activeSlides[previewIdx].title}</h2>
              <p className="text-sm text-muted-foreground mt-2 px-4">{activeSlides[previewIdx].description}</p>
              <div className="flex gap-2 mt-6">
                {activeSlides.map((_, i) => (
                  <div key={i} className={`h-2 rounded-full transition-all ${i === previewIdx ? 'w-8 bg-primary' : 'w-2 bg-muted-foreground/30'}`} />
                ))}
              </div>
              <div className="flex gap-2 mt-4">
                <Button variant="outline" size="sm" disabled={previewIdx === 0} onClick={() => setPreviewIdx(i => i - 1)}>Previous</Button>
                <Button size="sm" disabled={previewIdx >= activeSlides.length - 1} onClick={() => setPreviewIdx(i => i + 1)}>
                  {previewIdx >= activeSlides.length - 1 ? "Done" : "Next"}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
