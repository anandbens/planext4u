import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { DataTable } from "@/components/admin/DataTable";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { MapPin, Star } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const LIFE_SCORE_KEYS = ["connectivity", "safety", "amenities", "air_quality", "water", "power"] as const;

export default function AdminLocalitiesPage() {
  const qc = useQueryClient();
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [form, setForm] = useState({
    name: "", city: "", is_popular: false,
    avg_rent: "0", avg_sale_price: "0",
    seo_title: "", seo_description: "",
    life_score: { connectivity: 0, safety: 0, amenities: 0, air_quality: 0, water: 0, power: 0 },
  });
  const [search, setSearch] = useState("");
  const [tab, setTab] = useState("details");

  const { data: localities } = useQuery({
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
    const payload: any = {
      name: form.name, city: form.city, is_popular: form.is_popular,
      avg_rent: Number(form.avg_rent), avg_sale_price: Number(form.avg_sale_price),
      seo_title: form.seo_title, seo_description: form.seo_description,
      life_score: form.life_score,
    };
    if (editing) {
      await supabase.from("property_localities").update(payload).eq("id", editing.id);
      toast.success("Updated!");
    } else {
      await supabase.from("property_localities").insert(payload);
      toast.success("Added!");
    }
    setShowModal(false); setEditing(null);
    qc.invalidateQueries({ queryKey: ["adminLocalities"] });
  };

  const handleDelete = async (id: string) => {
    await supabase.from("property_localities").delete().eq("id", id);
    toast.success("Deleted");
    qc.invalidateQueries({ queryKey: ["adminLocalities"] });
  };

  const openEdit = (l: any) => {
    setEditing(l);
    const ls = l.life_score || {};
    setForm({
      name: l.name, city: l.city, is_popular: l.is_popular || false,
      avg_rent: String(l.avg_rent || 0), avg_sale_price: String(l.avg_sale_price || 0),
      seo_title: l.seo_title || "", seo_description: l.seo_description || "",
      life_score: {
        connectivity: ls.connectivity || 0, safety: ls.safety || 0,
        amenities: ls.amenities || 0, air_quality: ls.air_quality || 0,
        water: ls.water || 0, power: ls.power || 0,
      },
    });
    setShowModal(true);
  };

  const getCompositeScore = (ls: any) => {
    const vals = LIFE_SCORE_KEYS.map(k => ls?.[k] || 0);
    return vals.length > 0 ? (vals.reduce((a, b) => a + b, 0) / vals.length).toFixed(1) : "0";
  };

  const columns = [
    { key: "name", label: "Locality" },
    { key: "city", label: "City" },
    { key: "is_popular", label: "Popular", render: (l: any) => l.is_popular ? <Star className="h-4 w-4 text-warning fill-warning" /> : <span className="text-xs text-muted-foreground">No</span> },
    { key: "avg_rent", label: "Avg Rent", render: (l: any) => l.avg_rent ? `₹${Number(l.avg_rent).toLocaleString("en-IN")}` : "—" },
    { key: "avg_sale_price", label: "Avg Sale", render: (l: any) => l.avg_sale_price ? `₹${Number(l.avg_sale_price).toLocaleString("en-IN")}` : "—" },
    { key: "life_score", label: "Life Score", render: (l: any) => {
      const score = getCompositeScore(l.life_score);
      const color = Number(score) >= 7 ? "text-success" : Number(score) >= 4 ? "text-warning" : "text-destructive";
      return <Badge variant="outline" className={`text-[10px] ${color}`}>{score}/10</Badge>;
    }},
    { key: "status", label: "Status", render: (l: any) => <StatusBadge status={l.status} /> },
    { key: "actions", label: "", render: (l: any) => (
      <div className="flex gap-1">
        <Button size="sm" variant="outline" className="h-7 text-[10px]" onClick={(e) => { e.stopPropagation(); openEdit(l); }}>Edit</Button>
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
        page={1} perPage={50} totalPages={1}
        onPageChange={() => {}}
        onSearch={setSearch}
        onAdd={() => {
          setEditing(null);
          setForm({ name: "", city: "", is_popular: false, avg_rent: "0", avg_sale_price: "0", seo_title: "", seo_description: "", life_score: { connectivity: 0, safety: 0, amenities: 0, air_quality: 0, water: 0, power: 0 } });
          setTab("details");
          setShowModal(true);
        }}
        addLabel="Add Locality"
      />

      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent className="max-w-md max-h-[80vh] overflow-y-auto">
          <DialogTitle>{editing ? "Edit" : "Add"} Locality</DialogTitle>
          <Tabs value={tab} onValueChange={setTab}>
            <TabsList className="w-full">
              <TabsTrigger value="details" className="flex-1 text-xs">Details</TabsTrigger>
              <TabsTrigger value="lifescore" className="flex-1 text-xs">Life Score</TabsTrigger>
              <TabsTrigger value="seo" className="flex-1 text-xs">SEO</TabsTrigger>
            </TabsList>

            <TabsContent value="details" className="space-y-3 pt-2">
              <div><Label className="text-xs">Name *</Label><Input value={form.name} onChange={(e) => setForm(f => ({ ...f, name: e.target.value }))} /></div>
              <div><Label className="text-xs">City *</Label><Input value={form.city} onChange={(e) => setForm(f => ({ ...f, city: e.target.value }))} /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label className="text-xs">Avg Rent (₹/mo)</Label><Input type="number" value={form.avg_rent} onChange={(e) => setForm(f => ({ ...f, avg_rent: e.target.value }))} /></div>
                <div><Label className="text-xs">Avg Sale Price (₹)</Label><Input type="number" value={form.avg_sale_price} onChange={(e) => setForm(f => ({ ...f, avg_sale_price: e.target.value }))} /></div>
              </div>
              <div className="flex items-center gap-2"><Switch checked={form.is_popular} onCheckedChange={(v) => setForm(f => ({ ...f, is_popular: v }))} /><Label className="text-xs">Popular Locality</Label></div>
            </TabsContent>

            <TabsContent value="lifescore" className="space-y-4 pt-2">
              <p className="text-xs text-muted-foreground">Override Life Score categories (0–10)</p>
              {LIFE_SCORE_KEYS.map(key => (
                <div key={key} className="space-y-1">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs capitalize">{key.replace("_", " ")}</Label>
                    <span className="text-xs font-medium">{form.life_score[key]}/10</span>
                  </div>
                  <Slider
                    value={[form.life_score[key]]}
                    onValueChange={([v]) => setForm(f => ({ ...f, life_score: { ...f.life_score, [key]: v } }))}
                    max={10} step={1} className="w-full"
                  />
                </div>
              ))}
              <div className="p-3 rounded-lg bg-muted/50 text-center">
                <p className="text-xs text-muted-foreground">Composite Score</p>
                <p className="text-2xl font-bold">{getCompositeScore(form.life_score)}/10</p>
              </div>
            </TabsContent>

            <TabsContent value="seo" className="space-y-3 pt-2">
              <div><Label className="text-xs">SEO Title</Label><Input value={form.seo_title} onChange={(e) => setForm(f => ({ ...f, seo_title: e.target.value }))} placeholder="Properties in [Locality] | P4U Homes" /></div>
              <div><Label className="text-xs">SEO Description</Label><Input value={form.seo_description} onChange={(e) => setForm(f => ({ ...f, seo_description: e.target.value }))} placeholder="Find apartments, houses for rent & sale in..." /></div>
            </TabsContent>
          </Tabs>

          <Button className="w-full mt-2" onClick={handleSave}>Save Locality</Button>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
