import { useEffect, useState } from "react";
import { VendorLayout } from "@/components/vendor/VendorLayout";
import { foodApi, MenuCategory, MenuItem, Restaurant } from "@/lib/food-api";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Plus, Pencil, Trash2, Image as ImageIcon } from "lucide-react";
import { toast } from "sonner";

export default function VendorRestaurantPage() {
  const { vendorUser } = useAuth();
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [categories, setCategories] = useState<MenuCategory[]>([]);
  const [items, setItems] = useState<MenuItem[]>([]);
  const [combos, setCombos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [editItem, setEditItem] = useState<Partial<MenuItem> | null>(null);
  const [editCat, setEditCat] = useState<Partial<MenuCategory> | null>(null);
  const [editCombo, setEditCombo] = useState<any | null>(null);
  const [editProfile, setEditProfile] = useState<Partial<Restaurant> | null>(null);

  const loadAll = async () => {
    if (!vendorUser?.vendor_id) return;
    setLoading(true);
    const { data: r } = await supabase.from('restaurants').select('*').eq('vendor_id', vendorUser.vendor_id).maybeSingle();
    if (!r) { setLoading(false); return; }
    setRestaurant(r as Restaurant);
    const m = await foodApi.listMenu(r.id);
    setCategories(m.categories); setItems(m.items);
    try {
      const { data: cb } = await supabase.from("menu_combos" as any).select("*").eq("restaurant_id", r.id).order("display_order");
      setCombos((cb as any[]) || []);
    } catch {}
    setLoading(false);
  };

  useEffect(() => { loadAll(); }, [vendorUser?.vendor_id]);

  const createRestaurant = async () => {
    if (!vendorUser?.vendor_id) return;
    const id = "RST-" + Math.random().toString(36).slice(2, 8).toUpperCase();
    await foodApi.upsertRestaurant({
      id, vendor_id: vendorUser.vendor_id, name: vendorUser.business_name || vendorUser.name,
      address: "Update your address in profile", cuisine: ["Indian"], status: 'closed',
    });
    toast.success("Restaurant profile created"); loadAll();
  };

  if (loading) return <VendorLayout><div className="flex justify-center py-12"><div className="h-8 w-8 rounded-full border-2 border-primary border-t-transparent animate-spin" /></div></VendorLayout>;

  if (!restaurant) {
    return (
      <VendorLayout>
        <Card className="p-6 m-4 text-center space-y-3">
          <h2 className="text-lg font-semibold">No restaurant profile yet</h2>
          <p className="text-sm text-muted-foreground">Create your restaurant profile to start receiving food orders.</p>
          <Button onClick={createRestaurant}>Create Restaurant</Button>
        </Card>
      </VendorLayout>
    );
  }

  const saveItem = async () => {
    if (!editItem || !restaurant) return;
    await foodApi.upsertMenuItem({
      id: editItem.id,
      restaurant_id: restaurant.id,
      category_id: editItem.category_id ?? null,
      name: editItem.name || "Untitled",
      description: editItem.description ?? null,
      price: Number(editItem.price) || 0,
      discounted_price: editItem.discounted_price != null ? Number(editItem.discounted_price) : null,
      is_veg: editItem.is_veg ?? true,
      image_url: editItem.image_url ?? null,
      in_stock: editItem.in_stock ?? true,
      is_bestseller: editItem.is_bestseller ?? false,
      spice_level: editItem.spice_level ?? null,
      calories: (editItem as any).calories ?? null,
      dietary_tags: (editItem as any).dietary_tags ?? [],
    } as any);
    toast.success("Item saved"); setEditItem(null); loadAll();
  };

  const saveCat = async () => {
    if (!editCat || !restaurant) return;
    await foodApi.upsertMenuCategory({
      id: editCat.id, restaurant_id: restaurant.id, name: editCat.name || "Untitled", display_order: editCat.display_order ?? 0,
    } as any);
    toast.success("Category saved"); setEditCat(null); loadAll();
  };

  const saveCombo = async () => {
    if (!editCombo?.name || !editCombo.combo_price) return toast.error("Name & combo price required");
    if (!editCombo.item_ids || editCombo.item_ids.length < 2) return toast.error("Select at least 2 items");
    const original = items.filter(i => editCombo.item_ids.includes(i.id)).reduce((s, i) => s + Number(i.price), 0);
    await foodApi.upsertCombo({ ...editCombo, restaurant_id: restaurant.id, original_price: original, combo_price: Number(editCombo.combo_price) });
    toast.success("Combo saved"); setEditCombo(null); loadAll();
  };

  const saveProfile = async () => {
    if (!editProfile) return;
    await foodApi.upsertRestaurant({
      id: restaurant.id,
      tagline: editProfile.tagline,
      description: editProfile.description,
      banner_url: (editProfile as any).banner_url,
      logo_url: editProfile.logo_url,
      cover_image: editProfile.cover_image,
      gallery_urls: (editProfile as any).gallery_urls,
      fssai_license: editProfile.fssai_license,
      opening_time: editProfile.opening_time,
      closing_time: editProfile.closing_time,
      phone: editProfile.phone,
      address: editProfile.address || restaurant.address,
      packaging_fee: editProfile.packaging_fee,
      min_order_amount: editProfile.min_order_amount,
      delivery_radius_km: editProfile.delivery_radius_km,
      avg_prep_minutes: editProfile.avg_prep_minutes,
      veg_only: editProfile.veg_only,
      cuisine: editProfile.cuisine,
    } as any);
    toast.success("Profile updated"); setEditProfile(null); loadAll();
  };

  return (
    <VendorLayout>
      <div className="p-4 space-y-4 pb-24">
        {/* Restaurant header card */}
        <Card className="p-0 overflow-hidden">
          {(restaurant as any).banner_url && (
            <img loading="lazy" decoding="async" src={(restaurant as any).banner_url} alt={restaurant.name} className="w-full h-32 object-cover" />
          )}
          <div className="p-4">
            <div className="flex justify-between items-start">
              <div className="flex-1 min-w-0">
                <h1 className="text-lg font-bold">{restaurant.name}</h1>
                <p className="text-xs text-muted-foreground">{restaurant.cuisine.join(" • ")}</p>
                <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{restaurant.address}</p>
                {restaurant.fssai_license && <p className="text-[10px] text-muted-foreground mt-1">FSSAI: {restaurant.fssai_license}</p>}
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">{restaurant.status === 'open' ? 'Open' : 'Closed'}</span>
                <Switch checked={restaurant.status === 'open'} onCheckedChange={async (v) => {
                  await foodApi.upsertRestaurant({ id: restaurant.id, status: v ? 'open' : 'closed' });
                  loadAll();
                }} />
              </div>
            </div>
            <Button size="sm" variant="outline" className="mt-3" onClick={() => setEditProfile({ ...restaurant, cuisine: restaurant.cuisine || [] })}>
              <Pencil className="h-3.5 w-3.5 mr-1" /> Edit Profile
            </Button>
          </div>
        </Card>

        <Tabs defaultValue="items" className="w-full">
          <TabsList className="w-full">
            <TabsTrigger value="cats" className="flex-1">Categories</TabsTrigger>
            <TabsTrigger value="items" className="flex-1">Items</TabsTrigger>
            <TabsTrigger value="combos" className="flex-1">Combos</TabsTrigger>
          </TabsList>

          {/* Categories */}
          <TabsContent value="cats" className="pt-3 space-y-2">
            <div className="flex justify-end">
              <Dialog open={!!editCat} onOpenChange={(o) => !o && setEditCat(null)}>
                <DialogTrigger asChild>
                  <Button size="sm" onClick={() => setEditCat({})}><Plus className="h-3.5 w-3.5 mr-1" />Add</Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader><DialogTitle>{editCat?.id ? 'Edit' : 'New'} Category</DialogTitle></DialogHeader>
                  <div className="space-y-3">
                    <div><Label>Name</Label><Input value={editCat?.name || ""} onChange={e => setEditCat({ ...editCat, name: e.target.value })} /></div>
                    <div><Label>Display order</Label><Input type="number" value={editCat?.display_order ?? 0} onChange={e => setEditCat({ ...editCat, display_order: Number(e.target.value) })} /></div>
                    <Button onClick={saveCat} className="w-full">Save</Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
            {categories.map(c => (
              <Card key={c.id} className="p-3 flex justify-between items-center">
                <span className="text-sm font-medium">{c.name}</span>
                <div className="flex gap-2">
                  <Button size="icon" variant="ghost" onClick={() => setEditCat(c)}><Pencil className="h-4 w-4" /></Button>
                  <Button size="icon" variant="ghost" onClick={async () => { if (confirm("Delete category?")) { await foodApi.deleteMenuCategory(c.id); loadAll(); } }}>
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </Card>
            ))}
          </TabsContent>

          {/* Items */}
          <TabsContent value="items" className="pt-3 space-y-2">
            <div className="flex justify-end">
              <Dialog open={!!editItem} onOpenChange={(o) => !o && setEditItem(null)}>
                <DialogTrigger asChild>
                  <Button size="sm" onClick={() => setEditItem({ is_veg: true, in_stock: true })}><Plus className="h-3.5 w-3.5 mr-1" />Add Item</Button>
                </DialogTrigger>
                <DialogContent className="max-h-[85vh] overflow-y-auto">
                  <DialogHeader><DialogTitle>{editItem?.id ? 'Edit' : 'New'} Menu Item</DialogTitle></DialogHeader>
                  <div className="space-y-3">
                    <div><Label>Name</Label><Input value={editItem?.name || ""} onChange={e => setEditItem({ ...editItem, name: e.target.value })} /></div>
                    <div><Label>Description</Label><Input value={editItem?.description || ""} onChange={e => setEditItem({ ...editItem, description: e.target.value })} /></div>
                    <div><Label>Category</Label>
                      <select className="w-full border rounded h-10 px-2 bg-background" value={editItem?.category_id || ""} onChange={e => setEditItem({ ...editItem, category_id: e.target.value || null })}>
                        <option value="">— None —</option>
                        {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                      </select>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div><Label>Price</Label><Input type="number" value={editItem?.price ?? ""} onChange={e => setEditItem({ ...editItem, price: Number(e.target.value) })} /></div>
                      <div><Label>Discounted</Label><Input type="number" value={editItem?.discounted_price ?? ""} onChange={e => setEditItem({ ...editItem, discounted_price: e.target.value === "" ? null : Number(e.target.value) })} /></div>
                    </div>
                    <div><Label>Image URL</Label><Input value={editItem?.image_url || ""} onChange={e => setEditItem({ ...editItem, image_url: e.target.value })} /></div>
                    <div className="grid grid-cols-2 gap-3">
                      <div><Label>Calories</Label><Input type="number" value={(editItem as any)?.calories ?? ""} onChange={e => setEditItem({ ...editItem, calories: e.target.value ? Number(e.target.value) : null } as any)} /></div>
                      <div><Label>Spice Level</Label>
                        <select className="w-full border rounded h-10 px-2 bg-background" value={editItem?.spice_level || ""} onChange={e => setEditItem({ ...editItem, spice_level: e.target.value || null })}>
                          <option value="">— None —</option>
                          <option value="mild">Mild</option><option value="medium">Medium</option>
                          <option value="spicy">Spicy</option><option value="extra_spicy">Extra Spicy</option>
                        </select>
                      </div>
                    </div>
                    <div><Label>Dietary Tags (comma-separated)</Label>
                      <Input placeholder="Jain, Halal, Keto, Gluten-Free" value={Array.isArray((editItem as any)?.dietary_tags) ? ((editItem as any).dietary_tags as string[]).join(", ") : ""} onChange={e => setEditItem({ ...editItem, dietary_tags: e.target.value.split(",").map(s => s.trim()).filter(Boolean) } as any)} />
                    </div>
                    <div className="flex items-center justify-between"><Label>Vegetarian</Label><Switch checked={editItem?.is_veg ?? true} onCheckedChange={v => setEditItem({ ...editItem, is_veg: v })} /></div>
                    <div className="flex items-center justify-between"><Label>In Stock</Label><Switch checked={editItem?.in_stock ?? true} onCheckedChange={v => setEditItem({ ...editItem, in_stock: v })} /></div>
                    <Button onClick={saveItem} className="w-full">Save</Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
            {items.map(it => (
              <Card key={it.id} className="p-3 flex justify-between items-center gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className={`h-3.5 w-3.5 rounded-sm border-2 flex items-center justify-center ${it.is_veg ? 'border-success' : 'border-destructive'}`}>
                      <span className={`h-1.5 w-1.5 rounded-full ${it.is_veg ? 'bg-success' : 'bg-destructive'}`} />
                    </span>
                    <p className="text-sm font-medium truncate">{it.name}</p>
                  </div>
                  <p className="text-xs text-muted-foreground">₹{it.discounted_price ?? it.price}{it.calories ? ` • ${it.calories} kcal` : ""}</p>
                </div>
                <Switch checked={it.in_stock} onCheckedChange={async (v) => { await foodApi.toggleItemStock(it.id, v); loadAll(); }} />
                <Button size="icon" variant="ghost" onClick={() => setEditItem(it)}><Pencil className="h-4 w-4" /></Button>
                <Button size="icon" variant="ghost" onClick={async () => { if (confirm("Delete item?")) { await foodApi.deleteMenuItem(it.id); loadAll(); } }}>
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </Card>
            ))}
          </TabsContent>

          {/* Combos */}
          <TabsContent value="combos" className="pt-3 space-y-2">
            <div className="flex justify-end">
              <Button size="sm" onClick={() => setEditCombo({ item_ids: [], display_order: combos.length + 1, is_active: true })}><Plus className="h-3.5 w-3.5 mr-1" />Add Combo</Button>
            </div>
            {combos.map(c => {
              const inCombo = items.filter(i => (c.item_ids || []).includes(i.id));
              return (
                <Card key={c.id} className="p-3 flex justify-between items-start gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold">{c.name}</p>
                    <p className="text-xs text-muted-foreground line-clamp-2">{inCombo.map(i => i.name).join(", ")}</p>
                    <p className="text-sm mt-1">
                      <span className="line-through text-muted-foreground mr-2">₹{c.original_price}</span>
                      <span className="font-bold text-success">₹{c.combo_price}</span>
                    </p>
                  </div>
                  <Button size="icon" variant="ghost" onClick={() => setEditCombo(c)}><Pencil className="h-4 w-4" /></Button>
                  <Button size="icon" variant="ghost" onClick={async () => { if (confirm("Delete combo?")) { await foodApi.deleteCombo(c.id); loadAll(); } }}>
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </Card>
              );
            })}
            {combos.length === 0 && <p className="text-xs text-muted-foreground text-center py-6">No combos yet. Bundle items together at a discount.</p>}
          </TabsContent>
        </Tabs>
      </div>

      {/* Profile edit dialog */}
      <Dialog open={!!editProfile} onOpenChange={(o) => !o && setEditProfile(null)}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Edit Restaurant Profile</DialogTitle></DialogHeader>
          {editProfile && (
            <div className="space-y-3">
              <div><Label>Tagline</Label><Input value={editProfile.tagline || ""} onChange={e => setEditProfile({ ...editProfile, tagline: e.target.value })} /></div>
              <div><Label>Description</Label><Textarea rows={2} value={editProfile.description || ""} onChange={e => setEditProfile({ ...editProfile, description: e.target.value })} /></div>
              <div><Label>Address</Label><Input value={editProfile.address || ""} onChange={e => setEditProfile({ ...editProfile, address: e.target.value })} /></div>
              <div><Label>Phone</Label><Input value={editProfile.phone || ""} onChange={e => setEditProfile({ ...editProfile, phone: e.target.value })} /></div>
              <div><Label>Cuisine (comma-separated)</Label>
                <Input value={(editProfile.cuisine || []).join(", ")} onChange={e => setEditProfile({ ...editProfile, cuisine: e.target.value.split(",").map(s => s.trim()).filter(Boolean) })} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Banner URL</Label><Input value={(editProfile as any).banner_url || ""} onChange={e => setEditProfile({ ...editProfile, banner_url: e.target.value } as any)} /></div>
                <div><Label>Logo URL</Label><Input value={editProfile.logo_url || ""} onChange={e => setEditProfile({ ...editProfile, logo_url: e.target.value })} /></div>
              </div>
              <div><Label>Gallery URLs (comma-separated)</Label>
                <Input value={Array.isArray((editProfile as any).gallery_urls) ? ((editProfile as any).gallery_urls as string[]).join(", ") : ""} onChange={e => setEditProfile({ ...editProfile, gallery_urls: e.target.value.split(",").map(s => s.trim()).filter(Boolean) } as any)} />
              </div>
              <div><Label>FSSAI License</Label><Input value={editProfile.fssai_license || ""} onChange={e => setEditProfile({ ...editProfile, fssai_license: e.target.value })} /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Opening Time</Label><Input type="time" value={editProfile.opening_time || ""} onChange={e => setEditProfile({ ...editProfile, opening_time: e.target.value })} /></div>
                <div><Label>Closing Time</Label><Input type="time" value={editProfile.closing_time || ""} onChange={e => setEditProfile({ ...editProfile, closing_time: e.target.value })} /></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Min Order ₹</Label><Input type="number" value={editProfile.min_order_amount ?? 99} onChange={e => setEditProfile({ ...editProfile, min_order_amount: Number(e.target.value) })} /></div>
                <div><Label>Packaging ₹</Label><Input type="number" value={editProfile.packaging_fee ?? 15} onChange={e => setEditProfile({ ...editProfile, packaging_fee: Number(e.target.value) })} /></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Delivery Radius (km)</Label><Input type="number" value={editProfile.delivery_radius_km ?? 8} onChange={e => setEditProfile({ ...editProfile, delivery_radius_km: Number(e.target.value) })} /></div>
                <div><Label>Avg Prep (min)</Label><Input type="number" value={editProfile.avg_prep_minutes ?? 20} onChange={e => setEditProfile({ ...editProfile, avg_prep_minutes: Number(e.target.value) })} /></div>
              </div>
              <div className="flex items-center justify-between"><Label>Pure Veg</Label><Switch checked={!!editProfile.veg_only} onCheckedChange={v => setEditProfile({ ...editProfile, veg_only: v })} /></div>
            </div>
          )}
          <DialogFooter><Button variant="outline" onClick={() => setEditProfile(null)}>Cancel</Button><Button onClick={saveProfile}>Save</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Combo edit dialog */}
      <Dialog open={!!editCombo} onOpenChange={(o) => !o && setEditCombo(null)}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editCombo?.id ? 'Edit' : 'New'} Combo</DialogTitle></DialogHeader>
          {editCombo && (
            <div className="space-y-3">
              <div><Label>Name *</Label><Input value={editCombo.name || ""} onChange={e => setEditCombo({ ...editCombo, name: e.target.value })} /></div>
              <div><Label>Description</Label><Textarea rows={2} value={editCombo.description || ""} onChange={e => setEditCombo({ ...editCombo, description: e.target.value })} /></div>
              <div><Label>Image URL</Label><Input value={editCombo.image_url || ""} onChange={e => setEditCombo({ ...editCombo, image_url: e.target.value })} /></div>
              <div><Label>Combo Price ₹ *</Label><Input type="number" value={editCombo.combo_price ?? ""} onChange={e => setEditCombo({ ...editCombo, combo_price: Number(e.target.value) })} /></div>
              <div>
                <Label>Items in combo (select 2+) *</Label>
                <div className="max-h-48 overflow-y-auto border rounded p-2 space-y-1 mt-1">
                  {items.map(it => {
                    const checked = (editCombo.item_ids || []).includes(it.id);
                    return (
                      <label key={it.id} className="flex items-center gap-2 text-sm cursor-pointer">
                        <input type="checkbox" checked={checked} onChange={(e) => {
                          const ids: string[] = editCombo.item_ids || [];
                          setEditCombo({ ...editCombo, item_ids: e.target.checked ? [...ids, it.id] : ids.filter(x => x !== it.id) });
                        }} />
                        <span className="flex-1">{it.name}</span>
                        <span className="text-xs text-muted-foreground">₹{it.price}</span>
                      </label>
                    );
                  })}
                  {items.length === 0 && <p className="text-xs text-muted-foreground">Add menu items first</p>}
                </div>
              </div>
              <div className="flex items-center justify-between"><Label>Active</Label><Switch checked={!!editCombo.is_active} onCheckedChange={v => setEditCombo({ ...editCombo, is_active: v })} /></div>
            </div>
          )}
          <DialogFooter><Button variant="outline" onClick={() => setEditCombo(null)}>Cancel</Button><Button onClick={saveCombo}>Save</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </VendorLayout>
  );
}
