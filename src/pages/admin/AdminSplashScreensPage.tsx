import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { MediaLibraryPicker } from "@/components/admin/MediaLibraryPicker";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Plus, Edit2, Trash2, Smartphone, Store, Globe, GripVertical } from "lucide-react";

interface SplashScreen {
  id: string;
  title: string;
  tagline: string;
  image_url: string;
  background_color: string;
  app_type: string;
  is_active: boolean;
  display_order: number;
}

const defaultForm: Omit<SplashScreen, "id"> = {
  title: "", tagline: "", image_url: "", background_color: "#009999",
  app_type: "both", is_active: true, display_order: 0,
};

export default function AdminSplashScreensPage() {
  const qc = useQueryClient();
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<SplashScreen | null>(null);
  const [form, setForm] = useState(defaultForm);
  const [filter, setFilter] = useState<string>("all");

  const { data: screens = [], isLoading } = useQuery({
    queryKey: ["admin-splash-screens"],
    queryFn: async () => {
      const { data } = await supabase
        .from("splash_screens" as any)
        .select("*")
        .order("app_type")
        .order("display_order");
      return (data || []) as unknown as SplashScreen[];
    },
  });

  const saveMutation = useMutation({
    mutationFn: async (item: typeof form & { id?: string }) => {
      if (item.id) {
        const { id, ...rest } = item;
        await supabase.from("splash_screens" as any).update(rest as any).eq("id", id);
      } else {
        await supabase.from("splash_screens" as any).insert(item as any);
      }
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["admin-splash-screens"] }); toast.success("Saved!"); setModalOpen(false); },
    onError: () => toast.error("Failed to save"),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await supabase.from("splash_screens" as any).delete().eq("id", id);
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["admin-splash-screens"] }); toast.success("Deleted"); },
  });

  const toggleMutation = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      await supabase.from("splash_screens" as any).update({ is_active } as any).eq("id", id);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-splash-screens"] }),
  });

  const openCreate = () => { setEditing(null); setForm({ ...defaultForm, display_order: screens.length + 1 }); setModalOpen(true); };
  const openEdit = (s: SplashScreen) => { setEditing(s); setForm({ title: s.title, tagline: s.tagline, image_url: s.image_url, background_color: s.background_color, app_type: s.app_type, is_active: s.is_active, display_order: s.display_order }); setModalOpen(true); };
  const handleSave = () => { if (!form.title || !form.image_url) { toast.error("Title and image are required"); return; } saveMutation.mutate(editing ? { ...form, id: editing.id } : form); };

  const filtered = filter === "all" ? screens : screens.filter(s => s.app_type === filter || s.app_type === "both");

  const appIcon = (type: string) => {
    if (type === "customer") return <Smartphone className="h-3.5 w-3.5 text-primary" />;
    if (type === "vendor") return <Store className="h-3.5 w-3.5 text-amber-500" />;
    return <Globe className="h-3.5 w-3.5 text-green-500" />;
  };

  const appLabel = (type: string) => {
    if (type === "customer") return "Customer";
    if (type === "vendor") return "Vendor";
    return "Both";
  };

  return (
    <AdminLayout title="Splash Screens">
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold">Splash Screens</h2>
            <p className="text-sm text-muted-foreground">Manage app loading screens for customer and vendor apps</p>
          </div>
          <div className="flex gap-2">
            <Select value={filter} onValueChange={setFilter}>
              <SelectTrigger className="w-32 h-9"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="customer">Customer</SelectItem>
                <SelectItem value="vendor">Vendor</SelectItem>
                <SelectItem value="both">Both</SelectItem>
              </SelectContent>
            </Select>
            <Button onClick={openCreate} className="gap-2"><Plus className="h-4 w-4" /> Add Screen</Button>
          </div>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1,2,3].map(i => <div key={i} className="h-64 bg-muted rounded-xl animate-pulse" />)}
          </div>
        ) : filtered.length === 0 ? (
          <Card className="p-12 text-center">
            <p className="text-muted-foreground">No splash screens configured</p>
            <Button onClick={openCreate} variant="outline" className="mt-4 gap-2"><Plus className="h-4 w-4" /> Add First Screen</Button>
          </Card>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map((s) => (
              <Card key={s.id} className="overflow-hidden group">
                <div className="relative h-48" style={{ backgroundColor: s.background_color }}>
                  {s.image_url && <img src={s.image_url} alt={s.title} className="absolute inset-0 w-full h-full object-cover opacity-40" />}
                  <div className="absolute inset-0 flex flex-col items-center justify-center text-white z-10">
                    <p className="text-lg font-bold drop-shadow">{s.title}</p>
                    {s.tagline && <p className="text-xs opacity-80 mt-1 px-4 text-center">{s.tagline}</p>}
                  </div>
                  <div className="absolute top-2 left-2 z-10 flex items-center gap-1 bg-black/40 rounded-full px-2 py-0.5">
                    {appIcon(s.app_type)}
                    <span className="text-[10px] text-white font-medium">{appLabel(s.app_type)}</span>
                  </div>
                  <div className="absolute top-2 right-2 z-10 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button size="icon" variant="secondary" className="h-7 w-7" onClick={() => openEdit(s)}><Edit2 className="h-3 w-3" /></Button>
                    <Button size="icon" variant="destructive" className="h-7 w-7" onClick={() => deleteMutation.mutate(s.id)}><Trash2 className="h-3 w-3" /></Button>
                  </div>
                </div>
                <div className="p-3 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <GripVertical className="h-4 w-4 text-muted-foreground" />
                    <span className="text-xs text-muted-foreground">Order: {s.display_order}</span>
                  </div>
                  <Switch checked={s.is_active} onCheckedChange={(checked) => toggleMutation.mutate({ id: s.id, is_active: checked })} />
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit Splash Screen" : "Add Splash Screen"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Title *</Label>
                <Input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="Fast Delivery" />
              </div>
              <div className="space-y-2">
                <Label>App Type</Label>
                <Select value={form.app_type} onValueChange={v => setForm(f => ({ ...f, app_type: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="customer">Customer</SelectItem>
                    <SelectItem value="vendor">Vendor</SelectItem>
                    <SelectItem value="both">Both</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Tagline</Label>
              <Input value={form.tagline} onChange={e => setForm(f => ({ ...f, tagline: e.target.value }))} placeholder="Get everything delivered..." />
            </div>
            <div className="space-y-2">
              <Label>Image *</Label>
              <MediaLibraryPicker value={form.image_url} onChange={url => setForm(f => ({ ...f, image_url: url }))} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Background Color</Label>
                <div className="flex gap-2 items-center">
                  <input type="color" value={form.background_color} onChange={e => setForm(f => ({ ...f, background_color: e.target.value }))} className="h-9 w-12 rounded border cursor-pointer" />
                  <Input value={form.background_color} onChange={e => setForm(f => ({ ...f, background_color: e.target.value }))} className="flex-1" />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Display Order</Label>
                <Input type="number" value={form.display_order} onChange={e => setForm(f => ({ ...f, display_order: parseInt(e.target.value) || 0 }))} />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Switch checked={form.is_active} onCheckedChange={checked => setForm(f => ({ ...f, is_active: checked }))} />
              <Label>Active</Label>
            </div>

            {/* Preview */}
            {form.image_url && (
              <div className="rounded-xl overflow-hidden h-32 relative" style={{ backgroundColor: form.background_color }}>
                <img src={form.image_url} alt="" className="absolute inset-0 w-full h-full object-cover opacity-30" />
                <div className="absolute inset-0 flex flex-col items-center justify-center text-white">
                  <p className="text-sm font-bold">{form.title || "Preview"}</p>
                  {form.tagline && <p className="text-[10px] opacity-80 mt-0.5">{form.tagline}</p>}
                </div>
              </div>
            )}

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setModalOpen(false)}>Cancel</Button>
              <Button onClick={handleSave} disabled={saveMutation.isPending}>{saveMutation.isPending ? "Saving..." : "Save"}</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
