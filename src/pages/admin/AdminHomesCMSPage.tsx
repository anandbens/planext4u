import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { DataTable } from "@/components/admin/DataTable";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Image, HelpCircle, Bell, Link, FileText } from "lucide-react";

const contentTypes = [
  { value: "banner", label: "Banners", icon: Image },
  { value: "faq", label: "FAQs", icon: HelpCircle },
  { value: "announcement", label: "Announcements", icon: Bell },
  { value: "footer_link", label: "Footer Links", icon: Link },
  { value: "seo_meta", label: "SEO Meta", icon: FileText },
  { value: "page_content", label: "Page Content", icon: FileText },
];

export default function AdminHomesCMSPage() {
  const qc = useQueryClient();
  const [tab, setTab] = useState("banner");
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [search, setSearch] = useState("");
  const [form, setForm] = useState({
    content_type: "banner", title: "", content: "", sort_order: "0", is_active: true,
    start_date: "", end_date: "", image_url: "", link_url: "",
  });

  const { data: cmsItems } = useQuery({
    queryKey: ["adminHomesCMS"],
    queryFn: async () => {
      const { data } = await supabase.from("homes_cms").select("*").order("sort_order");
      return data || [];
    },
  });

  const filtered = (cmsItems || []).filter((c: any) =>
    c.content_type === tab && (!search || c.title?.toLowerCase().includes(search.toLowerCase()))
  );

  const handleSave = async () => {
    if (!form.title) { toast.error("Title required"); return; }
    const metadata = { image_url: form.image_url, link_url: form.link_url };
    const payload: any = {
      content_type: form.content_type, title: form.title, content: form.content,
      sort_order: Number(form.sort_order), is_active: form.is_active, metadata,
      start_date: form.start_date || null, end_date: form.end_date || null,
    };
    if (editing) {
      await supabase.from("homes_cms").update(payload).eq("id", editing.id);
    } else {
      await supabase.from("homes_cms").insert(payload);
    }
    toast.success(editing ? "Updated!" : "Added!");
    setShowModal(false); setEditing(null);
    qc.invalidateQueries({ queryKey: ["adminHomesCMS"] });
  };

  const handleDelete = async (id: string) => {
    await supabase.from("homes_cms").delete().eq("id", id);
    toast.success("Deleted");
    qc.invalidateQueries({ queryKey: ["adminHomesCMS"] });
  };

  const openAdd = () => {
    setEditing(null);
    setForm({ content_type: tab, title: "", content: "", sort_order: "0", is_active: true, start_date: "", end_date: "", image_url: "", link_url: "" });
    setShowModal(true);
  };

  const openEdit = (item: any) => {
    setEditing(item);
    const meta = item.metadata || {};
    setForm({
      content_type: item.content_type, title: item.title, content: item.content || "",
      sort_order: String(item.sort_order || 0), is_active: item.is_active,
      start_date: item.start_date || "", end_date: item.end_date || "",
      image_url: meta.image_url || "", link_url: meta.link_url || "",
    });
    setShowModal(true);
  };

  const columns = [
    { key: "title", label: "Title", render: (c: any) => <p className="text-sm font-medium truncate max-w-[200px]">{c.title}</p> },
    { key: "content", label: "Content", render: (c: any) => <p className="text-xs text-muted-foreground truncate max-w-[200px]">{c.content || "—"}</p> },
    { key: "sort_order", label: "Order" },
    { key: "is_active", label: "Status", render: (c: any) => c.is_active ? <Badge className="bg-success/10 text-success text-[10px]">Active</Badge> : <Badge variant="secondary" className="text-[10px]">Inactive</Badge> },
    { key: "start_date", label: "Start", render: (c: any) => c.start_date || "—" },
    { key: "end_date", label: "End", render: (c: any) => c.end_date || "—" },
    { key: "actions", label: "", render: (c: any) => (
      <div className="flex gap-1">
        <Button size="sm" variant="outline" className="h-7 text-[10px]" onClick={(e) => { e.stopPropagation(); openEdit(c); }}>Edit</Button>
        <Button size="sm" variant="ghost" className="h-7 text-[10px] text-destructive" onClick={(e) => { e.stopPropagation(); handleDelete(c.id); }}>Delete</Button>
      </div>
    )},
  ];

  return (
    <AdminLayout>
      <div className="space-y-4">
        <h1 className="text-xl font-bold">Homes CMS</h1>
        <Tabs value={tab} onValueChange={setTab}>
          <TabsList className="flex-wrap h-auto">
            {contentTypes.map(ct => (
              <TabsTrigger key={ct.value} value={ct.value} className="text-xs gap-1">
                <ct.icon className="h-3 w-3" />{ct.label}
              </TabsTrigger>
            ))}
          </TabsList>

          {contentTypes.map(ct => (
            <TabsContent key={ct.value} value={ct.value}>
              <DataTable
                columns={columns}
                data={filtered}
                total={filtered.length}
                page={1} perPage={100} totalPages={1}
                onPageChange={() => {}}
                onSearch={setSearch}
                onAdd={openAdd}
                addLabel={`Add ${ct.label.replace(/s$/, "")}`}
              />
            </TabsContent>
          ))}
        </Tabs>
      </div>

      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent className="max-w-md max-h-[80vh] overflow-y-auto">
          <DialogTitle>{editing ? "Edit" : "Add"} Content</DialogTitle>
          <div className="space-y-3 pt-2">
            <div><Label className="text-xs">Title *</Label><Input value={form.title} onChange={(e) => setForm(f => ({ ...f, title: e.target.value }))} /></div>
            <div><Label className="text-xs">Content</Label><Textarea value={form.content} onChange={(e) => setForm(f => ({ ...f, content: e.target.value }))} rows={4} /></div>
            {(tab === "banner" || tab === "announcement") && (
              <>
                <div><Label className="text-xs">Image URL</Label><Input value={form.image_url} onChange={(e) => setForm(f => ({ ...f, image_url: e.target.value }))} /></div>
                <div><Label className="text-xs">Link URL</Label><Input value={form.link_url} onChange={(e) => setForm(f => ({ ...f, link_url: e.target.value }))} /></div>
                <div className="grid grid-cols-2 gap-3">
                  <div><Label className="text-xs">Start Date</Label><Input type="date" value={form.start_date} onChange={(e) => setForm(f => ({ ...f, start_date: e.target.value }))} /></div>
                  <div><Label className="text-xs">End Date</Label><Input type="date" value={form.end_date} onChange={(e) => setForm(f => ({ ...f, end_date: e.target.value }))} /></div>
                </div>
              </>
            )}
            {tab === "footer_link" && (
              <div><Label className="text-xs">Link URL</Label><Input value={form.link_url} onChange={(e) => setForm(f => ({ ...f, link_url: e.target.value }))} /></div>
            )}
            <div><Label className="text-xs">Sort Order</Label><Input type="number" value={form.sort_order} onChange={(e) => setForm(f => ({ ...f, sort_order: e.target.value }))} /></div>
            <div className="flex items-center gap-2"><Switch checked={form.is_active} onCheckedChange={(v) => setForm(f => ({ ...f, is_active: v }))} /><Label className="text-xs">Active</Label></div>
            <Button className="w-full" onClick={handleSave}>Save</Button>
          </div>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
