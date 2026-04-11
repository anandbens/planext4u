import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Plus, Edit, FileText, Eye } from "lucide-react";

interface CMSPage {
  id: string;
  slug: string;
  title: string;
  content: string;
  status: string;
  meta_description: string | null;
  updated_at: string;
}

export default function AdminCMSPagesPage() {
  const qc = useQueryClient();
  const [editing, setEditing] = useState<CMSPage | null>(null);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({ slug: "", title: "", content: "", status: "active", meta_description: "" });

  const { data: pages = [], isLoading } = useQuery({
    queryKey: ["cms-pages"],
    queryFn: async () => {
      const { data } = await supabase.from("cms_pages").select("*").order("title");
      return (data || []) as CMSPage[];
    },
  });

  const saveMutation = useMutation({
    mutationFn: async (page: Partial<CMSPage> & { id?: string }) => {
      if (page.id) {
        const { error } = await supabase.from("cms_pages").update({
          title: page.title,
          content: page.content,
          status: page.status,
          meta_description: page.meta_description,
        }).eq("id", page.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("cms_pages").insert({
          slug: page.slug!,
          title: page.title!,
          content: page.content || "",
          status: page.status || "active",
          meta_description: page.meta_description || null,
        });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["cms-pages"] });
      setEditing(null);
      setCreating(false);
      toast.success("Page saved");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const openEdit = (page: CMSPage) => {
    setForm({ slug: page.slug, title: page.title, content: page.content, status: page.status, meta_description: page.meta_description || "" });
    setEditing(page);
  };

  const openCreate = () => {
    setForm({ slug: "", title: "", content: "", status: "active", meta_description: "" });
    setCreating(true);
  };

  const handleSave = () => {
    if (!form.title.trim()) return toast.error("Title is required");
    if (creating && !form.slug.trim()) return toast.error("Slug is required");
    saveMutation.mutate(editing ? { ...form, id: editing.id } : form);
  };

  const isOpen = !!editing || creating;

  return (
    <AdminLayout>
      <div className="page-header">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="page-title">CMS Pages</h1>
            <p className="page-description">Manage Terms & Conditions, Privacy Policy, and other content pages</p>
          </div>
          <Button onClick={openCreate} className="gap-2"><Plus className="h-4 w-4" /> Add Page</Button>
        </div>
      </div>

      <div className="space-y-3">
        {isLoading ? <p className="text-muted-foreground text-sm">Loading...</p> :
          pages.map((p) => (
            <div key={p.id} className="bg-card rounded-xl border border-border/50 p-4 flex items-center gap-4" style={{ boxShadow: 'var(--shadow-sm)' }}>
              <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <FileText className="h-5 w-5 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium">{p.title}</p>
                <p className="text-xs text-muted-foreground">/{p.slug} · Updated {new Date(p.updated_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
              </div>
              <Badge className={`border-0 text-[10px] ${p.status === 'active' ? 'bg-success/10 text-success' : 'bg-muted text-muted-foreground'}`}>{p.status}</Badge>
              <Button variant="outline" size="sm" className="gap-1" onClick={() => openEdit(p)}>
                <Edit className="h-3.5 w-3.5" /> Edit
              </Button>
            </div>
          ))}
      </div>

      <Dialog open={isOpen} onOpenChange={() => { setEditing(null); setCreating(false); }}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? `Edit: ${editing.title}` : "Create New Page"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {creating && (
              <div>
                <Label>Slug (URL path)</Label>
                <Input value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-') })} placeholder="e.g. about-us" />
              </div>
            )}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Title</Label>
                <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
              </div>
              <div>
                <Label>Status</Label>
                <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="draft">Draft</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label>Meta Description</Label>
              <Input value={form.meta_description} onChange={(e) => setForm({ ...form, meta_description: e.target.value })} placeholder="SEO description" />
            </div>
            <div>
              <Label>Content (Rich Text)</Label>
              <div className="border rounded-lg overflow-hidden">
                <div className="bg-secondary/30 px-3 py-1.5 flex gap-1 border-b flex-wrap">
                  {[
                    { cmd: 'bold', label: 'B', style: 'font-bold' },
                    { cmd: 'italic', label: 'I', style: 'italic' },
                    { cmd: 'underline', label: 'U', style: 'underline' },
                    { cmd: 'insertUnorderedList', label: '• List', style: '' },
                    { cmd: 'insertOrderedList', label: '1. List', style: '' },
                  ].map((b) => (
                    <button key={b.cmd} className={`px-2 py-0.5 text-xs rounded hover:bg-secondary ${b.style}`}
                      onMouseDown={(e) => { e.preventDefault(); document.execCommand(b.cmd, false); }}>
                      {b.label}
                    </button>
                  ))}
                  {['H1', 'H2', 'H3', 'P'].map((tag) => (
                    <button key={tag} className="px-2 py-0.5 text-xs rounded hover:bg-secondary"
                      onMouseDown={(e) => {
                        e.preventDefault();
                        const tagName = tag === 'P' ? 'p' : tag.toLowerCase();
                        document.execCommand('formatBlock', false, `<${tagName}>`);
                      }}>
                      {tag}
                    </button>
                  ))}
                </div>
                <div
                  contentEditable
                  className="min-h-[300px] p-4 prose prose-sm dark:prose-invert max-w-none focus:outline-none"
                  dangerouslySetInnerHTML={{ __html: form.content }}
                  onBlur={(e) => setForm((prev) => ({ ...prev, content: e.currentTarget.innerHTML }))}
                />
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => { setEditing(null); setCreating(false); }}>Cancel</Button>
              <Button onClick={handleSave} disabled={saveMutation.isPending}>
                {saveMutation.isPending ? "Saving..." : "Save Page"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
