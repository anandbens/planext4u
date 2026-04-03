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

interface OnboardingSlide {
  id: string;
  title: string;
  description: string;
  image_url: string;
  display_order: number;
  is_active: boolean;
}

export default function AdminOnboardingPage() {
  const [slides, setSlides] = useState<OnboardingSlide[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewIdx, setPreviewIdx] = useState(0);
  const [editing, setEditing] = useState<OnboardingSlide | null>(null);
  const [form, setForm] = useState({ title: "", description: "", image_url: "", display_order: 0, is_active: true });

  const fetchSlides = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("onboarding_screens")
      .select("*")
      .order("display_order");
    setSlides((data as any) || []);
    setLoading(false);
  };

  useEffect(() => { fetchSlides(); }, []);

  const openAdd = () => {
    setEditing(null);
    setForm({ title: "", description: "", image_url: "", display_order: slides.length + 1, is_active: true });
    setModalOpen(true);
  };

  const openEdit = (s: OnboardingSlide) => {
    setEditing(s);
    setForm({ title: s.title, description: s.description, image_url: s.image_url, display_order: s.display_order, is_active: s.is_active });
    setModalOpen(true);
  };

  const handleSave = async () => {
    if (!form.title.trim() || !form.image_url.trim()) {
      toast.error("Title and image are required");
      return;
    }
    if (editing) {
      await supabase.from("onboarding_screens").update(form).eq("id", editing.id);
      toast.success("Slide updated");
    } else {
      await supabase.from("onboarding_screens").insert(form as any);
      toast.success("Slide added");
    }
    setModalOpen(false);
    fetchSlides();
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this slide?")) return;
    await supabase.from("onboarding_screens").delete().eq("id", id);
    toast.success("Slide deleted");
    fetchSlides();
  };

  const toggleActive = async (s: OnboardingSlide) => {
    await supabase.from("onboarding_screens").update({ is_active: !s.is_active }).eq("id", s.id);
    fetchSlides();
  };

  const activeSlides = slides.filter((s) => s.is_active);

  return (
    <AdminLayout title="Onboarding Screens" subtitle="Manage first-time user experience slides">
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">{slides.length} slides ({activeSlides.length} active)</p>
          <div className="flex gap-2">
            {activeSlides.length > 0 && (
              <Button variant="outline" size="sm" onClick={() => { setPreviewIdx(0); setPreviewOpen(true); }}>
                <Eye className="h-4 w-4 mr-1" /> Preview
              </Button>
            )}
            <Button size="sm" onClick={openAdd}>
              <Plus className="h-4 w-4 mr-1" /> Add Slide
            </Button>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <div className="h-8 w-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {slides.map((s) => (
              <Card key={s.id} className={`p-4 space-y-3 ${!s.is_active ? "opacity-50" : ""}`}>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <GripVertical className="h-4 w-4 text-muted-foreground" />
                    <span className="text-xs font-mono bg-muted px-2 py-0.5 rounded">#{s.display_order}</span>
                  </div>
                  <Switch checked={s.is_active} onCheckedChange={() => toggleActive(s)} />
                </div>
                {s.image_url && (
                  <img src={s.image_url} alt={s.title} className="w-full h-40 object-contain rounded-lg bg-muted" />
                )}
                <h3 className="font-semibold text-sm">{s.title}</h3>
                <p className="text-xs text-muted-foreground line-clamp-2">{s.description}</p>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={() => openEdit(s)}>
                    <Pencil className="h-3 w-3 mr-1" /> Edit
                  </Button>
                  <Button size="sm" variant="destructive" onClick={() => handleDelete(s.id)}>
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Add/Edit Modal */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit Slide" : "Add Slide"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Title</Label>
              <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
            </div>
            <div>
              <Label>Description</Label>
              <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={3} />
            </div>
            <div>
              <Label>Image</Label>
              <MediaLibraryPicker
                value={form.image_url}
                onChange={(url) => setForm({ ...form, image_url: url })}
                folder="onboarding"
                label="Select Onboarding Image"
              />
            </div>
            <div className="flex gap-4">
              <div className="flex-1">
                <Label>Display Order</Label>
                <Input type="number" value={form.display_order} onChange={(e) => setForm({ ...form, display_order: parseInt(e.target.value) || 0 })} />
              </div>
              <div className="flex items-center gap-2 pt-6">
                <Switch checked={form.is_active} onCheckedChange={(v) => setForm({ ...form, is_active: v })} />
                <Label>Active</Label>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setModalOpen(false)}>Cancel</Button>
            <Button onClick={handleSave}>{editing ? "Update" : "Add"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Preview Modal */}
      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="max-w-sm p-0 overflow-hidden">
          <div className="bg-background flex flex-col min-h-[500px]">
            {activeSlides[previewIdx] && (
              <>
                <div className="flex-1 flex flex-col items-center justify-center p-6 gap-4">
                  <img
                    src={activeSlides[previewIdx].image_url}
                    alt={activeSlides[previewIdx].title}
                    className="w-48 h-48 object-contain rounded-xl"
                  />
                  <h3 className="text-lg font-bold text-center">{activeSlides[previewIdx].title}</h3>
                  <p className="text-sm text-muted-foreground text-center">{activeSlides[previewIdx].description}</p>
                </div>
                <div className="p-4 flex flex-col items-center gap-3">
                  <div className="flex gap-1.5">
                    {activeSlides.map((_, i) => (
                      <div key={i} className={`h-2 rounded-full transition-all ${i === previewIdx ? "w-6 bg-primary" : "w-2 bg-muted"}`} />
                    ))}
                  </div>
                  <div className="flex gap-2 w-full">
                    <Button variant="outline" size="sm" className="flex-1" disabled={previewIdx === 0} onClick={() => setPreviewIdx((i) => i - 1)}>Back</Button>
                    <Button size="sm" className="flex-1" onClick={() => {
                      if (previewIdx >= activeSlides.length - 1) setPreviewOpen(false);
                      else setPreviewIdx((i) => i + 1);
                    }}>
                      {previewIdx >= activeSlides.length - 1 ? "Get Started" : "Next"}
                    </Button>
                  </div>
                </div>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
