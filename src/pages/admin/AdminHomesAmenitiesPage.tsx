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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { GripVertical, Plus } from "lucide-react";

export default function AdminHomesAmenitiesPage() {
  const qc = useQueryClient();
  const [tab, setTab] = useState("amenities");
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [search, setSearch] = useState("");

  // Amenity form
  const [amenityForm, setAmenityForm] = useState({ name: "", icon: "", category: "general", sort_order: "0", is_active: true });
  // Filter option form
  const [filterForm, setFilterForm] = useState({ filter_type: "property_type", label: "", value: "", sort_order: "0", is_active: true });

  const { data: amenities } = useQuery({
    queryKey: ["adminAmenities"],
    queryFn: async () => {
      const { data } = await supabase.from("property_amenities").select("*").order("sort_order");
      return data || [];
    },
  });

  const { data: filterOptions } = useQuery({
    queryKey: ["adminFilterOptions"],
    queryFn: async () => {
      const { data } = await supabase.from("property_filter_options").select("*").order("sort_order");
      return data || [];
    },
  });

  const filteredAmenities = (amenities || []).filter((a: any) =>
    !search || a.name?.toLowerCase().includes(search.toLowerCase())
  );

  const filteredOptions = (filterOptions || []).filter((o: any) =>
    !search || o.label?.toLowerCase().includes(search.toLowerCase())
  );

  const handleSaveAmenity = async () => {
    if (!amenityForm.name) { toast.error("Name required"); return; }
    const payload = { name: amenityForm.name, icon: amenityForm.icon, category: amenityForm.category, sort_order: Number(amenityForm.sort_order), is_active: amenityForm.is_active };
    if (editing) {
      await supabase.from("property_amenities").update(payload).eq("id", editing.id);
    } else {
      await supabase.from("property_amenities").insert(payload);
    }
    toast.success(editing ? "Updated!" : "Added!");
    setShowModal(false); setEditing(null);
    qc.invalidateQueries({ queryKey: ["adminAmenities"] });
  };

  const handleSaveFilter = async () => {
    if (!filterForm.label || !filterForm.value) { toast.error("Label and value required"); return; }
    const payload = { filter_type: filterForm.filter_type, label: filterForm.label, value: filterForm.value, sort_order: Number(filterForm.sort_order), is_active: filterForm.is_active };
    if (editing) {
      await supabase.from("property_filter_options").update(payload).eq("id", editing.id);
    } else {
      await supabase.from("property_filter_options").insert(payload);
    }
    toast.success(editing ? "Updated!" : "Added!");
    setShowModal(false); setEditing(null);
    qc.invalidateQueries({ queryKey: ["adminFilterOptions"] });
  };

  const handleDeleteAmenity = async (id: string) => {
    await supabase.from("property_amenities").delete().eq("id", id);
    toast.success("Deleted");
    qc.invalidateQueries({ queryKey: ["adminAmenities"] });
  };

  const handleDeleteFilter = async (id: string) => {
    await supabase.from("property_filter_options").delete().eq("id", id);
    toast.success("Deleted");
    qc.invalidateQueries({ queryKey: ["adminFilterOptions"] });
  };

  const amenityColumns = [
    { key: "name", label: "Amenity" },
    { key: "icon", label: "Icon", render: (a: any) => <code className="text-xs bg-muted px-1 rounded">{a.icon || "—"}</code> },
    { key: "category", label: "Category", render: (a: any) => <Badge variant="outline" className="text-[10px] capitalize">{a.category}</Badge> },
    { key: "sort_order", label: "Order" },
    { key: "is_active", label: "Active", render: (a: any) => a.is_active ? <Badge className="bg-success/10 text-success text-[10px]">Active</Badge> : <Badge variant="secondary" className="text-[10px]">Inactive</Badge> },
    { key: "actions", label: "", render: (a: any) => (
      <div className="flex gap-1">
        <Button size="sm" variant="outline" className="h-7 text-[10px]" onClick={(e) => {
          e.stopPropagation();
          setEditing(a);
          setAmenityForm({ name: a.name, icon: a.icon || "", category: a.category || "general", sort_order: String(a.sort_order || 0), is_active: a.is_active });
          setShowModal(true);
        }}>Edit</Button>
        <Button size="sm" variant="ghost" className="h-7 text-[10px] text-destructive" onClick={(e) => { e.stopPropagation(); handleDeleteAmenity(a.id); }}>Delete</Button>
      </div>
    )},
  ];

  const filterColumns = [
    { key: "filter_type", label: "Type", render: (o: any) => <Badge variant="outline" className="text-[10px] capitalize">{o.filter_type?.replace("_", " ")}</Badge> },
    { key: "label", label: "Label" },
    { key: "value", label: "Value", render: (o: any) => <code className="text-xs bg-muted px-1 rounded">{o.value}</code> },
    { key: "sort_order", label: "Order" },
    { key: "is_active", label: "Active", render: (o: any) => o.is_active ? <Badge className="bg-success/10 text-success text-[10px]">Active</Badge> : <Badge variant="secondary" className="text-[10px]">Inactive</Badge> },
    { key: "actions", label: "", render: (o: any) => (
      <div className="flex gap-1">
        <Button size="sm" variant="outline" className="h-7 text-[10px]" onClick={(e) => {
          e.stopPropagation();
          setEditing(o);
          setFilterForm({ filter_type: o.filter_type, label: o.label, value: o.value, sort_order: String(o.sort_order || 0), is_active: o.is_active });
          setTab("filters");
          setShowModal(true);
        }}>Edit</Button>
        <Button size="sm" variant="ghost" className="h-7 text-[10px] text-destructive" onClick={(e) => { e.stopPropagation(); handleDeleteFilter(o.id); }}>Delete</Button>
      </div>
    )},
  ];

  const filterTypes = ["property_type", "bhk", "furnishing", "facing", "age", "tenant_preference"];

  return (
    <AdminLayout>
      <div className="space-y-4">
        <h1 className="text-xl font-bold">Amenities & Filter Options</h1>
        <Tabs value={tab} onValueChange={setTab}>
          <TabsList>
            <TabsTrigger value="amenities">Amenities ({(amenities || []).length})</TabsTrigger>
            <TabsTrigger value="filters">Filter Options ({(filterOptions || []).length})</TabsTrigger>
          </TabsList>

          <TabsContent value="amenities">
            <DataTable
              columns={amenityColumns}
              data={filteredAmenities}
              total={filteredAmenities.length}
              page={1} perPage={100} totalPages={1}
              onPageChange={() => {}}
              onSearch={setSearch}
              onAdd={() => {
                setEditing(null);
                setAmenityForm({ name: "", icon: "", category: "general", sort_order: "0", is_active: true });
                setShowModal(true);
              }}
              addLabel="Add Amenity"
            />
          </TabsContent>

          <TabsContent value="filters">
            <DataTable
              columns={filterColumns}
              data={filteredOptions}
              total={filteredOptions.length}
              page={1} perPage={100} totalPages={1}
              onPageChange={() => {}}
              onSearch={setSearch}
              onAdd={() => {
                setEditing(null);
                setFilterForm({ filter_type: "property_type", label: "", value: "", sort_order: "0", is_active: true });
                setShowModal(true);
              }}
              addLabel="Add Option"
            />
          </TabsContent>
        </Tabs>
      </div>

      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent className="max-w-sm">
          <DialogTitle>{editing ? "Edit" : "Add"} {tab === "amenities" ? "Amenity" : "Filter Option"}</DialogTitle>
          {tab === "amenities" ? (
            <div className="space-y-3 pt-2">
              <div><Label className="text-xs">Name *</Label><Input value={amenityForm.name} onChange={(e) => setAmenityForm(f => ({ ...f, name: e.target.value }))} /></div>
              <div><Label className="text-xs">Icon (lucide name)</Label><Input value={amenityForm.icon} onChange={(e) => setAmenityForm(f => ({ ...f, icon: e.target.value }))} placeholder="shield" /></div>
              <div>
                <Label className="text-xs">Category</Label>
                <Select value={amenityForm.category} onValueChange={(v) => setAmenityForm(f => ({ ...f, category: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="security">Security</SelectItem>
                    <SelectItem value="recreation">Recreation</SelectItem>
                    <SelectItem value="building">Building</SelectItem>
                    <SelectItem value="general">General</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div><Label className="text-xs">Sort Order</Label><Input type="number" value={amenityForm.sort_order} onChange={(e) => setAmenityForm(f => ({ ...f, sort_order: e.target.value }))} /></div>
              <div className="flex items-center gap-2"><Switch checked={amenityForm.is_active} onCheckedChange={(v) => setAmenityForm(f => ({ ...f, is_active: v }))} /><Label className="text-xs">Active</Label></div>
              <Button className="w-full" onClick={handleSaveAmenity}>Save</Button>
            </div>
          ) : (
            <div className="space-y-3 pt-2">
              <div>
                <Label className="text-xs">Filter Type *</Label>
                <Select value={filterForm.filter_type} onValueChange={(v) => setFilterForm(f => ({ ...f, filter_type: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {filterTypes.map(t => <SelectItem key={t} value={t}>{t.replace("_", " ")}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div><Label className="text-xs">Label *</Label><Input value={filterForm.label} onChange={(e) => setFilterForm(f => ({ ...f, label: e.target.value }))} placeholder="2 BHK" /></div>
              <div><Label className="text-xs">Value *</Label><Input value={filterForm.value} onChange={(e) => setFilterForm(f => ({ ...f, value: e.target.value }))} placeholder="2bhk" /></div>
              <div><Label className="text-xs">Sort Order</Label><Input type="number" value={filterForm.sort_order} onChange={(e) => setFilterForm(f => ({ ...f, sort_order: e.target.value }))} /></div>
              <div className="flex items-center gap-2"><Switch checked={filterForm.is_active} onCheckedChange={(v) => setFilterForm(f => ({ ...f, is_active: v }))} /><Label className="text-xs">Active</Label></div>
              <Button className="w-full" onClick={handleSaveFilter}>Save</Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
