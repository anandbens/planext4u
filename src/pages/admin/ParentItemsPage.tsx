import { useEffect, useState, useCallback } from "react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { DataTable } from "@/components/admin/DataTable";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { RichTextEditor } from "@/components/ui/rich-text-editor";
import { toast } from "sonner";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { exportToCSV } from "@/lib/csv";

interface ParentItem {
  id: string; name: string; description: string; category_id: string | null; status: string; created_at: string;
}

export default function ParentItemsPage() {
  const [items, setItems] = useState<ParentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editItem, setEditItem] = useState<ParentItem | null>(null);
  const [form, setForm] = useState({ id: "", name: "", description: "", category_id: "", status: "active" });
  const [saving, setSaving] = useState(false);
  const [categories, setCategories] = useState<any[]>([]);

  const fetch = useCallback(async () => {
    setLoading(true);
    let query = supabase.from("parent_items" as any).select("*").order("created_at", { ascending: false });
    if (search) query = query.ilike("name", `%${search}%`);
    const { data } = await query;
    setItems((data || []) as any[]);
    setLoading(false);
  }, [search]);

  useEffect(() => { fetch(); }, [fetch]);
  useEffect(() => {
    supabase.from("categories").select("id, name").is("parent_id", null).eq("status", "active").order("name")
      .then(({ data }) => setCategories(data || []));
  }, []);

  const openCreate = () => {
    const newId = `PAR${String(Math.floor(Math.random() * 9999) + 1000)}`;
    setForm({ id: newId, name: "", description: "", category_id: "", status: "active" });
    setEditItem(null);
    setModalOpen(true);
  };

  const openEdit = (item: ParentItem) => {
    setForm({ id: item.id, name: item.name, description: item.description || "", category_id: item.category_id || "", status: item.status });
    setEditItem(item);
    setModalOpen(true);
  };

  const handleSave = async () => {
    if (!form.id || !form.name) { toast.error("ID and Name are required"); return; }
    setSaving(true);
    try {
      if (editItem) {
        const { error } = await supabase.from("parent_items" as any).update({
          name: form.name, description: form.description, category_id: form.category_id || null, status: form.status,
        }).eq("id", editItem.id);
        if (error) throw error;
        toast.success("Parent item updated");
      } else {
        const { error } = await supabase.from("parent_items" as any).insert({
          id: form.id, name: form.name, description: form.description, category_id: form.category_id || null, status: form.status,
        });
        if (error) throw error;
        toast.success("Parent item created");
      }
      setModalOpen(false);
      fetch();
    } catch (e: any) {
      toast.error(e.message);
    } finally { setSaving(false); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this parent item?")) return;
    await supabase.from("parent_items" as any).delete().eq("id", id);
    toast.success("Deleted");
    fetch();
  };

  const handleExport = () => {
    exportToCSV(items, [
      { key: "id", label: "Parent ID" }, { key: "name", label: "Name" },
      { key: "description", label: "Description" }, { key: "status", label: "Status" },
    ], "parent_items");
  };

  return (
    <AdminLayout>
      <div className="page-header">
        <h1 className="page-title">Parent Items</h1>
        <p className="page-description">Manage parent item IDs for product grouping across vendors</p>
      </div>
      <DataTable
        columns={[
          { key: "id", label: "Parent ID", render: (p) => <span className="font-mono text-xs">{p.id}</span> },
          { key: "name", label: "Name", render: (p) => <span className="font-medium">{p.name}</span> },
          { key: "description", label: "Description", render: (p) => <span className="text-sm text-muted-foreground truncate max-w-[200px] block">{p.description || "—"}</span> },
          { key: "status", label: "Status", render: (p) => <StatusBadge status={p.status} /> },
          { key: "actions", label: "", render: (p) => (
            <div className="flex gap-1">
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={(e) => { e.stopPropagation(); openEdit(p); }}><Pencil className="h-4 w-4" /></Button>
              <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={(e) => { e.stopPropagation(); handleDelete(p.id); }}><Trash2 className="h-4 w-4" /></Button>
            </div>
          )},
        ]}
        data={items}
        total={items.length}
        page={1}
        perPage={items.length || 10}
        totalPages={1}
        onPageChange={() => {}}
        onSearch={setSearch}
        onExport={handleExport}
        onAdd={openCreate}
        addLabel="Add Parent Item"
        searchPlaceholder="Search parent items..."
      />

      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editItem ? "Edit Parent Item" : "New Parent Item"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label className="text-xs text-muted-foreground">Parent Item ID *</Label>
              <Input value={form.id} onChange={(e) => setForm({ ...form, id: e.target.value })} disabled={!!editItem} className="mt-1 font-mono" placeholder="PAR1101" />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Name *</Label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="mt-1" placeholder="Rajaboham Ponni" />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Category</Label>
              <Select value={form.category_id || "__none__"} onValueChange={(v) => setForm({ ...form, category_id: v === "__none__" ? "" : v })}>
                <SelectTrigger className="mt-1"><SelectValue placeholder="Select category" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">None</SelectItem>
                  {categories.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Description</Label>
              <RichTextEditor value={form.description} onChange={(v) => setForm({ ...form, description: v })} placeholder="Item description..." minHeight="80px" compact />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Status</Label>
              <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setModalOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving || !form.id || !form.name}>
              {saving && <div className="h-4 w-4 rounded-full border-2 border-current border-t-transparent animate-spin mr-2" />}
              {editItem ? "Update" : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
