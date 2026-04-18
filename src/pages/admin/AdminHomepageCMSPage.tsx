import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { GripVertical, Plus, Pencil, Trash2, Eye, EyeOff, Image, Video, Layout, Play, ChevronUp, ChevronDown, Calendar } from "lucide-react";
import { VideoOptimizerUpload } from "@/components/admin/VideoOptimizerUpload";

/* ── Banner Modal ── */
function BannerModal({ open, onClose, banner, onSave }: any) {
  const [form, setForm] = useState(banner || {
    title: "", subtitle: "", media_type: "image", media_url: "", mobile_media_url: "",
    cta_text: "", cta_link: "", redirect_type: "url", redirect_id: "",
    theme_header_color: "", theme_bg_color: "", theme_button_color: "", background_gradient: "",
    display_order: 0, is_active: true, start_date: "", end_date: "", festival_tag: "",
  });
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!form.title) { toast.error("Title is required"); return; }
    setSaving(true);
    try { await onSave(form); onClose(); }
    catch { toast.error("Save failed"); }
    finally { setSaving(false); }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogTitle>{banner ? "Edit Banner" : "Add Banner"}</DialogTitle>
        <div className="grid grid-cols-2 gap-4 mt-4">
          <div className="col-span-2"><Label>Title *</Label><Input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} /></div>
          <div className="col-span-2"><Label>Subtitle</Label><Input value={form.subtitle || ""} onChange={e => setForm({ ...form, subtitle: e.target.value })} /></div>
          <div><Label>Media Type</Label>
            <Select value={form.media_type} onValueChange={v => setForm({ ...form, media_type: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="image">Image</SelectItem>
                <SelectItem value="gif">GIF</SelectItem>
                <SelectItem value="video">Video (MP4)</SelectItem>
                <SelectItem value="lottie">Lottie JSON</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div><Label>Display Order</Label><Input type="number" value={form.display_order} onChange={e => setForm({ ...form, display_order: +e.target.value })} /></div>
          <div className="col-span-2"><Label>Desktop Media URL</Label><Input value={form.media_url || ""} onChange={e => setForm({ ...form, media_url: e.target.value })} /></div>
          <div className="col-span-2"><Label>Mobile Media URL</Label><Input value={form.mobile_media_url || ""} onChange={e => setForm({ ...form, mobile_media_url: e.target.value })} /></div>
          <div><Label>CTA Text</Label><Input value={form.cta_text || ""} onChange={e => setForm({ ...form, cta_text: e.target.value })} /></div>
          <div><Label>CTA Link</Label><Input value={form.cta_link || ""} onChange={e => setForm({ ...form, cta_link: e.target.value })} /></div>
          <div><Label>Redirect Type</Label>
            <Select value={form.redirect_type || "url"} onValueChange={v => setForm({ ...form, redirect_type: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="product">Product</SelectItem>
                <SelectItem value="category">Category</SelectItem>
                <SelectItem value="service">Service</SelectItem>
                <SelectItem value="url">External URL</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div><Label>Redirect ID</Label><Input value={form.redirect_id || ""} onChange={e => setForm({ ...form, redirect_id: e.target.value })} placeholder="Product/Category/Service ID" /></div>
          <div><Label>Theme Header Color</Label><Input value={form.theme_header_color || ""} onChange={e => setForm({ ...form, theme_header_color: e.target.value })} placeholder="#FF5733" /></div>
          <div><Label>Theme BG Color</Label><Input value={form.theme_bg_color || ""} onChange={e => setForm({ ...form, theme_bg_color: e.target.value })} /></div>
          <div><Label>Theme Button Color</Label><Input value={form.theme_button_color || ""} onChange={e => setForm({ ...form, theme_button_color: e.target.value })} /></div>
          <div><Label>Background Gradient</Label><Input value={form.background_gradient || ""} onChange={e => setForm({ ...form, background_gradient: e.target.value })} placeholder="linear-gradient(135deg, #667eea, #764ba2)" /></div>
          <div><Label>Start Date</Label><Input type="datetime-local" value={form.start_date ? form.start_date.slice(0, 16) : ""} onChange={e => setForm({ ...form, start_date: e.target.value })} /></div>
          <div><Label>End Date</Label><Input type="datetime-local" value={form.end_date ? form.end_date.slice(0, 16) : ""} onChange={e => setForm({ ...form, end_date: e.target.value })} /></div>
          <div><Label>Festival Tag</Label><Input value={form.festival_tag || ""} onChange={e => setForm({ ...form, festival_tag: e.target.value })} placeholder="e.g. Diwali, Christmas" /></div>
          <div className="flex items-center gap-2 pt-6"><Switch checked={form.is_active} onCheckedChange={v => setForm({ ...form, is_active: v })} /><Label>Active</Label></div>
        </div>
        <div className="flex justify-end gap-2 mt-4">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSave} disabled={saving}>{saving ? "Saving..." : "Save"}</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/* ── Section Modal ── */
function SectionModal({ open, onClose, section, onSave }: any) {
  const [form, setForm] = useState(section || {
    title: "", section_type: "product_slider", display_order: 0, is_visible: true,
    background_color: "", background_gradient: "", cta_text: "", cta_link: "",
    festival_tag: "", target_location: "", target_segment: "", start_date: "", end_date: "",
  });
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!form.title) { toast.error("Title required"); return; }
    setSaving(true);
    try { await onSave(form); onClose(); } catch { toast.error("Save failed"); }
    finally { setSaving(false); }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogTitle>{section ? "Edit Section" : "Add Section"}</DialogTitle>
        <div className="grid grid-cols-2 gap-4 mt-4">
          <div className="col-span-2"><Label>Title *</Label><Input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} /></div>
          <div><Label>Section Type</Label>
            <Select value={form.section_type} onValueChange={v => setForm({ ...form, section_type: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="category_tiles">Category Tiles</SelectItem>
                <SelectItem value="product_slider">Product Slider</SelectItem>
                <SelectItem value="service_tiles">Service Tiles</SelectItem>
                <SelectItem value="promotional_cards">Promotional Cards</SelectItem>
                <SelectItem value="brand_deals">Brand Deals</SelectItem>
                <SelectItem value="custom_html">Custom HTML</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div><Label>Display Order</Label><Input type="number" value={form.display_order} onChange={e => setForm({ ...form, display_order: +e.target.value })} /></div>
          <div><Label>Background Color</Label><Input value={form.background_color || ""} onChange={e => setForm({ ...form, background_color: e.target.value })} /></div>
          <div><Label>Background Gradient</Label><Input value={form.background_gradient || ""} onChange={e => setForm({ ...form, background_gradient: e.target.value })} /></div>
          <div><Label>CTA Text</Label><Input value={form.cta_text || ""} onChange={e => setForm({ ...form, cta_text: e.target.value })} /></div>
          <div><Label>CTA Link</Label><Input value={form.cta_link || ""} onChange={e => setForm({ ...form, cta_link: e.target.value })} /></div>
          <div><Label>Festival Tag</Label><Input value={form.festival_tag || ""} onChange={e => setForm({ ...form, festival_tag: e.target.value })} /></div>
          <div><Label>Target Location</Label><Input value={form.target_location || ""} onChange={e => setForm({ ...form, target_location: e.target.value })} placeholder="City name or 'all'" /></div>
          <div><Label>Target Segment</Label>
            <Select value={form.target_segment || "all"} onValueChange={v => setForm({ ...form, target_segment: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Users</SelectItem>
                <SelectItem value="new_user">New Users</SelectItem>
                <SelectItem value="repeat_user">Repeat Users</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div><Label>Start Date</Label><Input type="datetime-local" value={form.start_date ? form.start_date.slice(0, 16) : ""} onChange={e => setForm({ ...form, start_date: e.target.value })} /></div>
          <div><Label>End Date</Label><Input type="datetime-local" value={form.end_date ? form.end_date.slice(0, 16) : ""} onChange={e => setForm({ ...form, end_date: e.target.value })} /></div>
          <div className="flex items-center gap-2 pt-6"><Switch checked={form.is_visible} onCheckedChange={v => setForm({ ...form, is_visible: v })} /><Label>Visible</Label></div>
        </div>
        <div className="flex justify-end gap-2 mt-4">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSave} disabled={saving}>{saving ? "Saving..." : "Save"}</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/* ── Video Ad Modal ── */
function VideoAdModal({ open, onClose, ad, onSave }: any) {
  const [form, setForm] = useState(ad || {
    title: "", video_url: "", thumbnail_url: "", duration_seconds: 0,
    cta_text: "", cta_link: "", status: "active", start_date: "", end_date: "",
    display_mode: "floating", show_delay_seconds: 3, auto_open_fullscreen: false,
  });
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!form.title || !form.video_url) { toast.error("Title and video URL required"); return; }
    setSaving(true);
    try { await onSave(form); onClose(); } catch { toast.error("Save failed"); }
    finally { setSaving(false); }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogTitle>{ad ? "Edit Video Ad" : "Add Video Ad"}</DialogTitle>
        <div className="grid gap-4 mt-4">
          <div><Label>Title *</Label><Input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} /></div>

          <div className="space-y-2">
            <Label>Optimized Video *</Label>
            <p className="text-[11px] text-muted-foreground -mt-1">
              Pick any video file — it will be re-encoded to 480p H.264 MP4 (~1 Mbps),
              served with the correct <code>video/mp4</code> mime so it plays everywhere.
            </p>
            <VideoOptimizerUpload
              value={form.video_url}
              folder="homepage-videos"
              onUploaded={(r) =>
                setForm({
                  ...form,
                  video_url: r.videoUrl,
                  thumbnail_url: r.thumbnailUrl || form.thumbnail_url,
                  duration_seconds: r.durationSeconds || form.duration_seconds,
                })
              }
              onClear={() => setForm({ ...form, video_url: "" })}
            />
          </div>

          <div><Label>Video URL (auto-filled)</Label><Input value={form.video_url} onChange={e => setForm({ ...form, video_url: e.target.value })} placeholder="Paste a URL or upload above" /></div>
          <div><Label>Thumbnail URL (auto-filled)</Label><Input value={form.thumbnail_url || ""} onChange={e => setForm({ ...form, thumbnail_url: e.target.value })} /></div>
          <div className="grid grid-cols-2 gap-4">
            <div><Label>Duration (seconds)</Label><Input type="number" value={form.duration_seconds || 0} onChange={e => setForm({ ...form, duration_seconds: +e.target.value })} /></div>
            <div><Label>Status</Label>
              <Select value={form.status} onValueChange={v => setForm({ ...form, status: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                  <SelectItem value="scheduled">Scheduled</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div><Label>CTA Text</Label><Input value={form.cta_text || ""} onChange={e => setForm({ ...form, cta_text: e.target.value })} /></div>
          <div><Label>CTA Link</Label><Input value={form.cta_link || ""} onChange={e => setForm({ ...form, cta_link: e.target.value })} /></div>

          {/* Display behaviour */}
          <div className="grid grid-cols-2 gap-4 pt-2 border-t">
            <div>
              <Label>Display Mode</Label>
              <Select value={form.display_mode || "floating"} onValueChange={v => setForm({ ...form, display_mode: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="floating">Floating (small PiP)</SelectItem>
                  <SelectItem value="fullscreen">Fullscreen takeover</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-[11px] text-muted-foreground mt-1">Floating shows as a small video the user can close or expand.</p>
            </div>
            <div>
              <Label>Show after (seconds)</Label>
              <Input type="number" min={0} max={60} value={form.show_delay_seconds ?? 3} onChange={e => setForm({ ...form, show_delay_seconds: +e.target.value })} />
              <p className="text-[11px] text-muted-foreground mt-1">Delay after page loads.</p>
            </div>
          </div>

          {form.display_mode === "floating" && (
            <label className="flex items-start gap-2 text-sm cursor-pointer">
              <input
                type="checkbox"
                checked={!!form.auto_open_fullscreen}
                onChange={e => setForm({ ...form, auto_open_fullscreen: e.target.checked })}
                className="mt-0.5"
              />
              <span>
                Auto-expand to fullscreen after 5 seconds
                <span className="block text-[11px] text-muted-foreground">User can still close. Leave off for non-intrusive ads.</span>
              </span>
            </label>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div><Label>Start Date</Label><Input type="datetime-local" value={form.start_date ? form.start_date.slice(0, 16) : ""} onChange={e => setForm({ ...form, start_date: e.target.value })} /></div>
            <div><Label>End Date</Label><Input type="datetime-local" value={form.end_date ? form.end_date.slice(0, 16) : ""} onChange={e => setForm({ ...form, end_date: e.target.value })} /></div>
          </div>
        </div>
        <div className="flex justify-end gap-2 mt-4">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSave} disabled={saving}>{saving ? "Saving..." : "Save"}</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/* ── Main Page ── */
export default function AdminHomepageCMSPage() {
  const qc = useQueryClient();
  const [tab, setTab] = useState("banners");
  const [bannerModal, setBannerModal] = useState<any>(null);
  const [sectionModal, setSectionModal] = useState<any>(null);
  const [videoModal, setVideoModal] = useState<any>(null);

  const { data: banners = [], isLoading: loadingBanners } = useQuery({
    queryKey: ["homepage_banners"],
    queryFn: async () => {
      const { data } = await supabase.from("homepage_banners" as any).select("*").order("display_order");
      return (data || []) as any[];
    },
  });

  const { data: sections = [], isLoading: loadingSections } = useQuery({
    queryKey: ["homepage_sections"],
    queryFn: async () => {
      const { data } = await supabase.from("homepage_sections" as any).select("*").order("display_order");
      return (data || []) as any[];
    },
  });

  const { data: videoAds = [], isLoading: loadingVideos } = useQuery({
    queryKey: ["video_ads"],
    queryFn: async () => {
      const { data } = await supabase.from("video_ads" as any).select("*").order("created_at", { ascending: false });
      return (data || []) as any[];
    },
  });

  /* ── CRUD handlers ── */
  const saveBanner = async (form: any) => {
    const payload = { ...form };
    delete payload.id; delete payload.created_at; delete payload.updated_at; delete payload.impressions; delete payload.clicks;
    if (form.id) {
      const { error } = await supabase.from("homepage_banners" as any).update(payload as any).eq("id", form.id);
      if (error) throw error;
      toast.success("Banner updated");
    } else {
      const { error } = await supabase.from("homepage_banners" as any).insert(payload as any);
      if (error) throw error;
      toast.success("Banner created");
    }
    qc.invalidateQueries({ queryKey: ["homepage_banners"] });
  };

  const deleteBanner = async (id: string) => {
    if (!confirm("Delete this banner?")) return;
    await supabase.from("homepage_banners" as any).delete().eq("id", id);
    toast.success("Banner deleted"); qc.invalidateQueries({ queryKey: ["homepage_banners"] });
  };

  const saveSection = async (form: any) => {
    const payload = { ...form };
    delete payload.id; delete payload.created_at; delete payload.updated_at;
    if (form.id) {
      const { error } = await supabase.from("homepage_sections" as any).update(payload as any).eq("id", form.id);
      if (error) throw error;
      toast.success("Section updated");
    } else {
      const { error } = await supabase.from("homepage_sections" as any).insert(payload as any);
      if (error) throw error;
      toast.success("Section created");
    }
    qc.invalidateQueries({ queryKey: ["homepage_sections"] });
  };

  const deleteSection = async (id: string) => {
    if (!confirm("Delete this section?")) return;
    await supabase.from("homepage_sections" as any).delete().eq("id", id);
    toast.success("Section deleted"); qc.invalidateQueries({ queryKey: ["homepage_sections"] });
  };

  const saveVideoAd = async (form: any) => {
    const payload = { ...form };
    delete payload.id; delete payload.created_at; delete payload.updated_at; delete payload.impressions; delete payload.clicks;
    if (form.id) {
      const { error } = await supabase.from("video_ads" as any).update(payload as any).eq("id", form.id);
      if (error) throw error;
      toast.success("Video ad updated");
    } else {
      const { error } = await supabase.from("video_ads" as any).insert(payload as any);
      if (error) throw error;
      toast.success("Video ad created");
    }
    qc.invalidateQueries({ queryKey: ["video_ads"] });
  };

  const deleteVideoAd = async (id: string) => {
    if (!confirm("Delete this video ad?")) return;
    await supabase.from("video_ads" as any).delete().eq("id", id);
    toast.success("Video ad deleted"); qc.invalidateQueries({ queryKey: ["video_ads"] });
  };

  const moveOrder = async (table: string, items: any[], idx: number, dir: -1 | 1) => {
    const swapIdx = idx + dir;
    if (swapIdx < 0 || swapIdx >= items.length) return;
    const a = items[idx], b = items[swapIdx];
    await supabase.from(table as any).update({ display_order: b.display_order } as any).eq("id", a.id);
    await supabase.from(table as any).update({ display_order: a.display_order } as any).eq("id", b.id);
    qc.invalidateQueries({ queryKey: [table] });
  };

  const sectionTypeLabels: Record<string, string> = {
    category_tiles: "Category Tiles", product_slider: "Product Slider",
    service_tiles: "Service Tiles", promotional_cards: "Promotional Cards",
    brand_deals: "Brand Deals", custom_html: "Custom HTML",
  };

  return (
    <AdminLayout>
      <div className="page-header">
        <h1 className="page-title">Homepage CMS</h1>
        <p className="page-description">Manage dynamic homepage banners, sections, and video ads</p>
      </div>

      <Tabs value={tab} onValueChange={setTab} className="space-y-4">
        <TabsList className="bg-secondary/50">
          <TabsTrigger value="banners" className="gap-2"><Image className="h-4 w-4" /> Hero Banners</TabsTrigger>
          <TabsTrigger value="sections" className="gap-2"><Layout className="h-4 w-4" /> Content Sections</TabsTrigger>
          <TabsTrigger value="videos" className="gap-2"><Video className="h-4 w-4" /> Video Ads</TabsTrigger>
        </TabsList>

        {/* ── BANNERS TAB ── */}
        <TabsContent value="banners">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-base font-semibold">Hero Carousel Banners ({banners.length})</h3>
            <Button size="sm" className="gap-2" onClick={() => setBannerModal({})}><Plus className="h-4 w-4" /> Add Banner</Button>
          </div>
          <div className="space-y-3">
            {loadingBanners ? <p className="text-sm text-muted-foreground py-8 text-center">Loading...</p> :
              banners.map((b: any, idx: number) => (
                <Card key={b.id} className="p-4 flex items-center gap-4">
                  <div className="flex flex-col gap-1">
                    <button onClick={() => moveOrder("homepage_banners", banners, idx, -1)} disabled={idx === 0} className="text-muted-foreground hover:text-foreground disabled:opacity-30"><ChevronUp className="h-4 w-4" /></button>
                    <button onClick={() => moveOrder("homepage_banners", banners, idx, 1)} disabled={idx === banners.length - 1} className="text-muted-foreground hover:text-foreground disabled:opacity-30"><ChevronDown className="h-4 w-4" /></button>
                  </div>
                  <div className="h-16 w-28 rounded-lg bg-secondary/50 flex items-center justify-center overflow-hidden shrink-0">
                    {b.media_url ? <img src={b.media_url} className="w-full h-full object-cover" alt="" /> : <Image className="h-6 w-6 text-muted-foreground" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{b.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {b.media_type?.toUpperCase()} · Order: {b.display_order}
                      {b.festival_tag && <> · <Badge variant="outline" className="text-[10px] ml-1">{b.festival_tag}</Badge></>}
                    </p>
                    <p className="text-[10px] text-muted-foreground">{b.impressions} impressions · {b.clicks} clicks</p>
                  </div>
                  <Badge variant={b.is_active ? "default" : "secondary"}>{b.is_active ? "Active" : "Inactive"}</Badge>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setBannerModal(b)}><Pencil className="h-4 w-4" /></Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => deleteBanner(b.id)}><Trash2 className="h-4 w-4" /></Button>
                  </div>
                </Card>
              ))}
          </div>
        </TabsContent>

        {/* ── SECTIONS TAB ── */}
        <TabsContent value="sections">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-base font-semibold">Content Sections ({sections.length})</h3>
            <Button size="sm" className="gap-2" onClick={() => setSectionModal({})}><Plus className="h-4 w-4" /> Add Section</Button>
          </div>
          <div className="space-y-3">
            {loadingSections ? <p className="text-sm text-muted-foreground py-8 text-center">Loading...</p> :
              sections.map((s: any, idx: number) => (
                <Card key={s.id} className="p-4 flex items-center gap-4">
                  <div className="flex flex-col gap-1">
                    <button onClick={() => moveOrder("homepage_sections", sections, idx, -1)} disabled={idx === 0} className="text-muted-foreground hover:text-foreground disabled:opacity-30"><ChevronUp className="h-4 w-4" /></button>
                    <button onClick={() => moveOrder("homepage_sections", sections, idx, 1)} disabled={idx === sections.length - 1} className="text-muted-foreground hover:text-foreground disabled:opacity-30"><ChevronDown className="h-4 w-4" /></button>
                  </div>
                  <div className="h-12 w-12 rounded-lg bg-secondary/50 flex items-center justify-center shrink-0">
                    <Layout className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{s.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {sectionTypeLabels[s.section_type] || s.section_type} · Order: {s.display_order}
                      {s.target_segment && s.target_segment !== "all" && <> · <Badge variant="outline" className="text-[10px] ml-1">{s.target_segment}</Badge></>}
                    </p>
                  </div>
                  {s.is_visible ? <Eye className="h-4 w-4 text-success" /> : <EyeOff className="h-4 w-4 text-muted-foreground" />}
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setSectionModal(s)}><Pencil className="h-4 w-4" /></Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => deleteSection(s.id)}><Trash2 className="h-4 w-4" /></Button>
                  </div>
                </Card>
              ))}
          </div>
        </TabsContent>

        {/* ── VIDEO ADS TAB ── */}
        <TabsContent value="videos">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-base font-semibold">Video Ads ({videoAds.length})</h3>
            <Button size="sm" className="gap-2" onClick={() => setVideoModal({})}><Plus className="h-4 w-4" /> Add Video Ad</Button>
          </div>
          <div className="space-y-3">
            {loadingVideos ? <p className="text-sm text-muted-foreground py-8 text-center">Loading...</p> :
              videoAds.map((v: any) => (
                <Card key={v.id} className="p-4 flex items-center gap-4">
                  <div className="h-16 w-12 rounded-lg bg-secondary/50 flex items-center justify-center shrink-0 overflow-hidden">
                    {v.thumbnail_url ? <img src={v.thumbnail_url} className="w-full h-full object-cover" alt="" /> : <Play className="h-6 w-6 text-muted-foreground" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{v.title}</p>
                    <p className="text-xs text-muted-foreground">{v.duration_seconds}s · {v.impressions} impressions · {v.clicks} clicks</p>
                    {v.start_date && <p className="text-[10px] text-muted-foreground"><Calendar className="h-3 w-3 inline mr-1" />{new Date(v.start_date).toLocaleDateString()} — {v.end_date ? new Date(v.end_date).toLocaleDateString() : "Ongoing"}</p>}
                  </div>
                  <Badge variant={v.status === "active" ? "default" : "secondary"}>{v.status}</Badge>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setVideoModal(v)}><Pencil className="h-4 w-4" /></Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => deleteVideoAd(v.id)}><Trash2 className="h-4 w-4" /></Button>
                  </div>
                </Card>
              ))}
          </div>
        </TabsContent>
      </Tabs>

      {/* Modals */}
      {bannerModal !== null && <BannerModal open={true} onClose={() => setBannerModal(null)} banner={bannerModal.id ? bannerModal : null} onSave={saveBanner} />}
      {sectionModal !== null && <SectionModal open={true} onClose={() => setSectionModal(null)} section={sectionModal.id ? sectionModal : null} onSave={saveSection} />}
      {videoModal !== null && <VideoAdModal open={true} onClose={() => setVideoModal(null)} ad={videoModal.id ? videoModal : null} onSave={saveVideoAd} />}
    </AdminLayout>
  );
}
