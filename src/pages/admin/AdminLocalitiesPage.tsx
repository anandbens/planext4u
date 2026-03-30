import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { DataTable } from "@/components/admin/DataTable";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { MapPin, Plus, Star } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";

export default function AdminLocalitiesPage() {
  const queryClient = useQueryClient();
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [form, setForm] = useState({ name: "", city: "", is_popular: false });
  const [search, setSearch] = useState("");

  const { data: localities, isLoading } = useQuery({
    queryKey: ["adminLocalities"],
    queryFn: async () => {
      const { data } = await supabase.from("property_localities").select("*").order("created_at", { ascending: false });
      return data || [];
    },
  });

  const filtered = (localities || []).filter((l: any) => 
    !search || l.name?.toLowerCase().includes(search.toLowerCase()) || l.city?.toLowerCase().includes(search.toLowerCase())
  );

  const handleSave = async () => {
    if (!form.name || !form.city) { toast.error("Name and City required"); return; }
    if (editing) {
      await supabase.from("property_localities").update({ name: form.name, city: form.city, is_popular: form.is_popular }).eq("id", editing.id);
      toast.success("Updated!");
    } else {
      await supabase.from("property_localities").insert({ name: form.name, city: form.city, is_popular: form.is_popular });
      toast.success("Added!");
    }
    setShowModal(false); setEditing(null);
    setForm({ name: "", city: "", is_popular: false });
    queryClient.invalidateQueries({ queryKey: ["adminLocalities"] });
  };

  const handleDelete = async (id: string) => {
    await supabase.from("property_localities").delete().eq("id", id);
    toast.success("Deleted");
    queryClient.invalidateQueries({ queryKey: ["adminLocalities"] });
  };

  const columns = [
    { key: "name", label: "Locality" },
    { key: "city", label: "City" },
    { key: "is_popular", label: "Popular", render: (l: any) => l.is_popular ? <Star className="h-4 w-4 text-warning fill-warning" /> : <span className="text-xs text-muted-foreground">No</span> },
    { key: "status", label: "Status", render: (l: any) => <StatusBadge status={l.status} /> },
    { key: "actions", label: "", render: (l: any) => (
      <div className="flex gap-1">
        <Button size="sm" variant="outline" className="h-7 text-[10px]" onClick={(e) => { e.stopPropagation(); setEditing(l); setForm({ name: l.name, city: l.city, is_popular: l.is_popular }); setShowModal(true); }}>Edit</Button>
        <Button size="sm" variant="ghost" className="h-7 text-[10px] text-destructive" onClick={(e) => { e.stopPropagation(); handleDelete(l.id); }}>Delete</Button>
      </div>
    )},
  ];

  return (
    <AdminLayout>
      <DataTable
        columns={columns}
        data={filtered}
        total={filtered.length}
        page={1}
        perPage={50}
        totalPages={1}
        onPageChange={() => {}}
        onSearch={setSearch}
        onAdd={() => { setEditing(null); setForm({ name: "", city: "", is_popular: false }); setShowModal(true); }}
        addLabel="Add Locality"
      />
      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent className="max-w-sm">
          <DialogTitle>{editing ? "Edit" : "Add"} Locality</DialogTitle>
          <div className="space-y-3 pt-2">
            <div><Label className="text-xs">Name *</Label><Input value={form.name} onChange={(e) => setForm(f => ({ ...f, name: e.target.value }))} /></div>
            <div><Label className="text-xs">City *</Label><Input value={form.city} onChange={(e) => setForm(f => ({ ...f, city: e.target.value }))} /></div>
            <div className="flex items-center gap-2"><Switch checked={form.is_popular} onCheckedChange={(v) => setForm(f => ({ ...f, is_popular: v }))} /><Label className="text-xs">Popular Locality</Label></div>
            <Button className="w-full" onClick={handleSave}>Save</Button>
          </div>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
