import { useEffect, useState } from "react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { Restaurant, MenuCategory, MenuItem, foodApi } from "@/lib/food-api";
import { toast } from "sonner";
import { Plus, Pencil, Utensils, Trash2 } from "lucide-react";

const empty: Partial<Restaurant> = {
  id: "",
  name: "",
  cuisine: [],
  veg_only: false,
  address: "",
  is_active: true,
  status: "open",
  avg_prep_minutes: 20,
  delivery_radius_km: 8,
  packaging_fee: 15,
  min_order_amount: 99,
  commission_rate: 20,
  rating: 0,
  reviews_count: 0,
  total_orders: 0,
};

export default function AdminRestaurantsPage() {
  const [list, setList] = useState<Restaurant[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Partial<Restaurant> | null>(null);
  const [cuisineInput, setCuisineInput] = useState("");
  const [menuFor, setMenuFor] = useState<Restaurant | null>(null);

  const load = async () => {
    const { data, error } = await supabase.from('restaurants').select('*').order('created_at', { ascending: false });
    if (error) toast.error(error.message);
    setList((data as Restaurant[]) || []); setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const toggleActive = async (id: string, active: boolean) => {
    await supabase.from('restaurants').update({ is_active: active }).eq('id', id);
    load();
  };

  const openCreate = () => {
    setEditing({ ...empty, id: `REST-${Date.now()}` });
    setCuisineInput("");
  };
  const openEdit = (r: Restaurant) => {
    setEditing({ ...r });
    setCuisineInput((r.cuisine || []).join(", "));
  };

  const save = async () => {
    if (!editing?.name || !editing?.address) return toast.error("Name and address are required");
    const payload: any = {
      ...editing,
      cuisine: cuisineInput.split(",").map(s => s.trim()).filter(Boolean),
    };
    const { error } = await supabase.from('restaurants').upsert(payload);
    if (error) return toast.error(error.message);
    toast.success("Saved");
    setEditing(null); load();
  };

  return (
    <AdminLayout>
      <div className="page-header flex items-start justify-between">
        <div>
          <h1 className="page-title">Restaurants</h1>
          <p className="page-description">{list.length} restaurants on the platform</p>
        </div>
        <Button onClick={openCreate}><Plus className="w-4 h-4 mr-1" /> Add Restaurant</Button>
      </div>

      {loading ? <div className="flex justify-center py-12"><div className="h-8 w-8 rounded-full border-2 border-primary border-t-transparent animate-spin" /></div>
      : (
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          {list.map(r => (
            <Card key={r.id} className="p-4 space-y-2">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="font-semibold">{r.name}</h3>
                  <p className="text-xs text-muted-foreground">{(r.cuisine || []).join(" • ")}</p>
                </div>
                <Badge variant={r.is_active ? "default" : "outline"}>{r.is_active ? "Active" : "Inactive"}</Badge>
              </div>
              <p className="text-xs text-muted-foreground line-clamp-2">{r.address}</p>
              <div className="flex flex-wrap gap-2 pt-2">
                <Button size="sm" variant="outline" onClick={() => openEdit(r)}><Pencil className="w-3 h-3 mr-1" /> Edit</Button>
                <Button size="sm" variant="outline" onClick={() => setMenuFor(r)}><Utensils className="w-3 h-3 mr-1" /> Menu</Button>
                <Button size="sm" variant="outline" onClick={() => toggleActive(r.id, !r.is_active)}>
                  {r.is_active ? "Deactivate" : "Activate"}
                </Button>
              </div>
            </Card>
          ))}
          {list.length === 0 && <p className="text-sm text-muted-foreground col-span-full text-center py-12">No restaurants yet.</p>}
        </div>
      )}

      {/* Restaurant create/edit dialog */}
      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editing?.name ? `Edit ${editing.name}` : "New Restaurant"}</DialogTitle></DialogHeader>
          {editing && (
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="sm:col-span-2"><Label>Name *</Label><Input value={editing.name || ""} onChange={e => setEditing({ ...editing, name: e.target.value })} /></div>
              <div className="sm:col-span-2"><Label>Tagline</Label><Input value={editing.tagline || ""} onChange={e => setEditing({ ...editing, tagline: e.target.value })} /></div>
              <div className="sm:col-span-2"><Label>Description</Label><Textarea rows={2} value={editing.description || ""} onChange={e => setEditing({ ...editing, description: e.target.value })} /></div>
              <div className="sm:col-span-2"><Label>Cuisine (comma-separated)</Label><Input placeholder="South Indian, Chinese" value={cuisineInput} onChange={e => setCuisineInput(e.target.value)} /></div>
              <div className="sm:col-span-2"><Label>Address *</Label><Input value={editing.address || ""} onChange={e => setEditing({ ...editing, address: e.target.value })} /></div>
              <div><Label>Latitude</Label><Input type="number" step="any" value={editing.latitude ?? ""} onChange={e => setEditing({ ...editing, latitude: e.target.value ? Number(e.target.value) : null })} /></div>
              <div><Label>Longitude</Label><Input type="number" step="any" value={editing.longitude ?? ""} onChange={e => setEditing({ ...editing, longitude: e.target.value ? Number(e.target.value) : null })} /></div>
              <div><Label>Phone</Label><Input value={editing.phone || ""} onChange={e => setEditing({ ...editing, phone: e.target.value })} /></div>
              <div><Label>Vendor ID (link)</Label><Input value={editing.vendor_id || ""} onChange={e => setEditing({ ...editing, vendor_id: e.target.value || null })} /></div>
              <div><Label>Cover Image URL</Label><Input value={editing.cover_image || ""} onChange={e => setEditing({ ...editing, cover_image: e.target.value })} /></div>
              <div><Label>Banner URL</Label><Input value={(editing as any).banner_url || ""} onChange={e => setEditing({ ...editing, banner_url: e.target.value } as any)} /></div>
              <div><Label>Logo URL</Label><Input value={editing.logo_url || ""} onChange={e => setEditing({ ...editing, logo_url: e.target.value })} /></div>
              <div className="sm:col-span-2"><Label>Gallery URLs (comma-separated)</Label>
                <Input value={Array.isArray((editing as any).gallery_urls) ? ((editing as any).gallery_urls as string[]).join(", ") : ""} onChange={e => setEditing({ ...editing, gallery_urls: e.target.value.split(",").map(s => s.trim()).filter(Boolean) } as any)} />
              </div>
              <div><Label>FSSAI License</Label><Input value={editing.fssai_license || ""} onChange={e => setEditing({ ...editing, fssai_license: e.target.value })} /></div>
              <div><Label>Opening Time</Label><Input type="time" value={editing.opening_time || ""} onChange={e => setEditing({ ...editing, opening_time: e.target.value })} /></div>
              <div><Label>Closing Time</Label><Input type="time" value={editing.closing_time || ""} onChange={e => setEditing({ ...editing, closing_time: e.target.value })} /></div>
              <div><Label>Avg Prep Min</Label><Input type="number" value={editing.avg_prep_minutes ?? 20} onChange={e => setEditing({ ...editing, avg_prep_minutes: Number(e.target.value) })} /></div>
              <div><Label>Delivery Radius (km)</Label><Input type="number" value={editing.delivery_radius_km ?? 8} onChange={e => setEditing({ ...editing, delivery_radius_km: Number(e.target.value) })} /></div>
              <div><Label>Packaging Fee ₹</Label><Input type="number" value={editing.packaging_fee ?? 15} onChange={e => setEditing({ ...editing, packaging_fee: Number(e.target.value) })} /></div>
              <div><Label>Min Order ₹</Label><Input type="number" value={editing.min_order_amount ?? 99} onChange={e => setEditing({ ...editing, min_order_amount: Number(e.target.value) })} /></div>
              <div><Label>Commission %</Label><Input type="number" value={editing.commission_rate ?? 20} onChange={e => setEditing({ ...editing, commission_rate: Number(e.target.value) })} /></div>
              <div className="flex items-center gap-2 pt-6"><Switch checked={!!editing.veg_only} onCheckedChange={(v) => setEditing({ ...editing, veg_only: v })} /><Label>Pure Veg</Label></div>
              <div className="flex items-center gap-2 pt-6"><Switch checked={!!editing.is_active} onCheckedChange={(v) => setEditing({ ...editing, is_active: v })} /><Label>Active</Label></div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditing(null)}>Cancel</Button>
            <Button onClick={save}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Menu manager */}
      {menuFor && <MenuManager restaurant={menuFor} onClose={() => setMenuFor(null)} />}
    </AdminLayout>
  );
}

function MenuManager({ restaurant, onClose }: { restaurant: Restaurant; onClose: () => void }) {
  const [cats, setCats] = useState<MenuCategory[]>([]);
  const [items, setItems] = useState<MenuItem[]>([]);
  const [newCat, setNewCat] = useState("");
  const [editItem, setEditItem] = useState<Partial<MenuItem> | null>(null);

  const load = async () => {
    const { categories, items } = await foodApi.listMenu(restaurant.id);
    setCats(categories); setItems(items);
  };
  useEffect(() => { load(); }, [restaurant.id]);

  const addCat = async () => {
    if (!newCat.trim()) return;
    await foodApi.upsertMenuCategory({ restaurant_id: restaurant.id, name: newCat.trim(), display_order: cats.length + 1 });
    setNewCat(""); load();
  };

  const delCat = async (id: string) => {
    if (!confirm("Delete category and all its items?")) return;
    await foodApi.deleteMenuCategory(id); load();
  };

  const saveItem = async () => {
    if (!editItem?.name || !editItem.price) return toast.error("Name & price required");
    await foodApi.upsertMenuItem({
      ...(editItem as any),
      restaurant_id: restaurant.id,
      price: Number(editItem.price),
    });
    setEditItem(null); load();
  };

  const delItem = async (id: string) => {
    if (!confirm("Delete this item?")) return;
    await foodApi.deleteMenuItem(id); load();
  };

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>Menu — {restaurant.name}</DialogTitle></DialogHeader>

        <Tabs defaultValue="cats">
          <TabsList><TabsTrigger value="cats">Categories</TabsTrigger><TabsTrigger value="items">Items</TabsTrigger></TabsList>

          <TabsContent value="cats" className="space-y-3 pt-3">
            <div className="flex gap-2">
              <Input placeholder="New category name" value={newCat} onChange={e => setNewCat(e.target.value)} />
              <Button onClick={addCat}><Plus className="w-4 h-4" /></Button>
            </div>
            {cats.map(c => (
              <Card key={c.id} className="p-3 flex justify-between items-center">
                <span>{c.name}</span>
                <Button size="sm" variant="ghost" onClick={() => delCat(c.id)}><Trash2 className="w-4 h-4 text-destructive" /></Button>
              </Card>
            ))}
            {cats.length === 0 && <p className="text-sm text-muted-foreground text-center py-4">No categories yet.</p>}
          </TabsContent>

          <TabsContent value="items" className="space-y-3 pt-3">
            <Button size="sm" onClick={() => setEditItem({ restaurant_id: restaurant.id, in_stock: true, is_veg: true, gst_rate: 5, prep_minutes: 15 })}><Plus className="w-4 h-4 mr-1" /> New Item</Button>
            {items.map(it => (
              <Card key={it.id} className="p-3 flex justify-between items-center gap-3">
                {it.image_url && <img src={it.image_url} alt={it.name} className="w-14 h-14 rounded object-cover" />}
                <div className="flex-1 min-w-0">
                  <p className="font-semibold truncate">{it.name} <Badge variant="outline" className="ml-1 text-[10px]">{it.is_veg ? "VEG" : "NON-VEG"}</Badge></p>
                  <p className="text-xs text-muted-foreground truncate">{it.description}</p>
                  <p className="text-sm font-bold">₹{it.price}</p>
                </div>
                <div className="flex flex-col gap-1">
                  <Button size="sm" variant="ghost" onClick={() => setEditItem(it)}><Pencil className="w-4 h-4" /></Button>
                  <Button size="sm" variant="ghost" onClick={() => delItem(it.id)}><Trash2 className="w-4 h-4 text-destructive" /></Button>
                </div>
              </Card>
            ))}
            {items.length === 0 && <p className="text-sm text-muted-foreground text-center py-4">No items yet.</p>}
          </TabsContent>
        </Tabs>

        <Dialog open={!!editItem} onOpenChange={(o) => !o && setEditItem(null)}>
          <DialogContent className="max-w-lg">
            <DialogHeader><DialogTitle>{editItem?.id ? "Edit Item" : "New Item"}</DialogTitle></DialogHeader>
            {editItem && (
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="sm:col-span-2"><Label>Name *</Label><Input value={editItem.name || ""} onChange={e => setEditItem({ ...editItem, name: e.target.value })} /></div>
                <div className="sm:col-span-2"><Label>Description</Label><Textarea rows={2} value={editItem.description || ""} onChange={e => setEditItem({ ...editItem, description: e.target.value })} /></div>
                <div><Label>Price ₹ *</Label><Input type="number" value={editItem.price ?? ""} onChange={e => setEditItem({ ...editItem, price: Number(e.target.value) })} /></div>
                <div><Label>Discounted ₹</Label><Input type="number" value={editItem.discounted_price ?? ""} onChange={e => setEditItem({ ...editItem, discounted_price: e.target.value ? Number(e.target.value) : null })} /></div>
                <div className="sm:col-span-2"><Label>Image URL</Label><Input value={editItem.image_url || ""} onChange={e => setEditItem({ ...editItem, image_url: e.target.value })} /></div>
                <div><Label>Category</Label>
                  <select className="w-full border rounded h-10 px-2 bg-background" value={editItem.category_id || ""} onChange={e => setEditItem({ ...editItem, category_id: e.target.value || null })}>
                    <option value="">— None —</option>
                    {cats.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
                <div><Label>Prep Min</Label><Input type="number" value={editItem.prep_minutes ?? 15} onChange={e => setEditItem({ ...editItem, prep_minutes: Number(e.target.value) })} /></div>
                <div><Label>GST %</Label><Input type="number" value={editItem.gst_rate ?? 5} onChange={e => setEditItem({ ...editItem, gst_rate: Number(e.target.value) })} /></div>
                <div><Label>Calories (kcal)</Label><Input type="number" value={(editItem as any).calories ?? ""} onChange={e => setEditItem({ ...editItem, calories: e.target.value ? Number(e.target.value) : null } as any)} /></div>
                <div><Label>Spice Level</Label>
                  <select className="w-full border rounded h-10 px-2 bg-background" value={editItem.spice_level || ""} onChange={e => setEditItem({ ...editItem, spice_level: e.target.value || null })}>
                    <option value="">— None —</option>
                    <option value="mild">Mild</option><option value="medium">Medium</option>
                    <option value="spicy">Spicy</option><option value="extra_spicy">Extra Spicy</option>
                  </select>
                </div>
                <div className="sm:col-span-2"><Label>Dietary Tags (comma-separated)</Label>
                  <Input placeholder="Jain, Halal, Keto, Gluten-Free" value={Array.isArray((editItem as any).dietary_tags) ? ((editItem as any).dietary_tags as string[]).join(", ") : ""} onChange={e => setEditItem({ ...editItem, dietary_tags: e.target.value.split(",").map(s => s.trim()).filter(Boolean) } as any)} />
                </div>
                <div className="flex items-center gap-2 pt-6"><Switch checked={!!editItem.is_veg} onCheckedChange={(v) => setEditItem({ ...editItem, is_veg: v })} /><Label>Veg</Label></div>
                <div className="flex items-center gap-2 pt-6"><Switch checked={!!editItem.in_stock} onCheckedChange={(v) => setEditItem({ ...editItem, in_stock: v })} /><Label>In Stock</Label></div>
                <div className="flex items-center gap-2 pt-6"><Switch checked={!!editItem.is_bestseller} onCheckedChange={(v) => setEditItem({ ...editItem, is_bestseller: v })} /><Label>Bestseller</Label></div>
              </div>
            )}
            <DialogFooter><Button variant="outline" onClick={() => setEditItem(null)}>Cancel</Button><Button onClick={saveItem}>Save</Button></DialogFooter>
          </DialogContent>
        </Dialog>
      </DialogContent>
    </Dialog>
  );
}
