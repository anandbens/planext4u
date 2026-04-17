import { useEffect, useState } from "react";
import { VendorLayout } from "@/components/vendor/VendorLayout";
import { foodApi, MenuCategory, MenuItem, Restaurant } from "@/lib/food-api";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";

export default function VendorRestaurantPage() {
  const { vendorUser } = useAuth();
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [categories, setCategories] = useState<MenuCategory[]>([]);
  const [items, setItems] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [editItem, setEditItem] = useState<Partial<MenuItem> | null>(null);
  const [editCat, setEditCat] = useState<Partial<MenuCategory> | null>(null);

  const loadAll = async () => {
    if (!vendorUser?.vendor_id) return;
    setLoading(true);
    const { data: r } = await supabase.from('restaurants').select('*').eq('vendor_id', vendorUser.vendor_id).maybeSingle();
    if (!r) { setLoading(false); return; }
    setRestaurant(r as Restaurant);
    const m = await foodApi.listMenu(r.id);
    setCategories(m.categories); setItems(m.items);
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

  return (
    <VendorLayout>
      <div className="p-4 space-y-4 pb-24">
        <Card className="p-4">
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-lg font-bold">{restaurant.name}</h1>
              <p className="text-xs text-muted-foreground">{restaurant.cuisine.join(" • ")}</p>
              <p className="text-xs text-muted-foreground mt-1">{restaurant.address}</p>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">{restaurant.status === 'open' ? 'Open' : 'Closed'}</span>
              <Switch checked={restaurant.status === 'open'} onCheckedChange={async (v) => {
                await foodApi.upsertRestaurant({ id: restaurant.id, status: v ? 'open' : 'closed' });
                loadAll();
              }} />
            </div>
          </div>
        </Card>

        <div className="flex justify-between items-center">
          <h2 className="font-semibold">Menu Categories</h2>
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
        <div className="space-y-2">
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
        </div>

        <div className="flex justify-between items-center mt-4">
          <h2 className="font-semibold">Menu Items</h2>
          <Dialog open={!!editItem} onOpenChange={(o) => !o && setEditItem(null)}>
            <DialogTrigger asChild>
              <Button size="sm" onClick={() => setEditItem({ is_veg: true, in_stock: true })}><Plus className="h-3.5 w-3.5 mr-1" />Add Item</Button>
            </DialogTrigger>
            <DialogContent className="max-h-[85vh] overflow-y-auto">
              <DialogHeader><DialogTitle>{editItem?.id ? 'Edit' : 'New'} Menu Item</DialogTitle></DialogHeader>
              <div className="space-y-3">
                <div><Label>Name</Label><Input value={editItem?.name || ""} onChange={e => setEditItem({ ...editItem, name: e.target.value })} /></div>
                <div><Label>Description</Label><Input value={editItem?.description || ""} onChange={e => setEditItem({ ...editItem, description: e.target.value })} /></div>
                <div className="grid grid-cols-2 gap-3">
                  <div><Label>Price</Label><Input type="number" value={editItem?.price ?? ""} onChange={e => setEditItem({ ...editItem, price: Number(e.target.value) })} /></div>
                  <div><Label>Discounted</Label><Input type="number" value={editItem?.discounted_price ?? ""} onChange={e => setEditItem({ ...editItem, discounted_price: e.target.value === "" ? null : Number(e.target.value) })} /></div>
                </div>
                <div><Label>Image URL</Label><Input value={editItem?.image_url || ""} onChange={e => setEditItem({ ...editItem, image_url: e.target.value })} /></div>
                <div className="flex items-center justify-between">
                  <Label>Vegetarian</Label>
                  <Switch checked={editItem?.is_veg ?? true} onCheckedChange={v => setEditItem({ ...editItem, is_veg: v })} />
                </div>
                <div className="flex items-center justify-between">
                  <Label>In Stock</Label>
                  <Switch checked={editItem?.in_stock ?? true} onCheckedChange={v => setEditItem({ ...editItem, in_stock: v })} />
                </div>
                <Button onClick={saveItem} className="w-full">Save</Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
        <div className="space-y-2">
          {items.map(it => (
            <Card key={it.id} className="p-3 flex justify-between items-center gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className={`h-3.5 w-3.5 rounded-sm border-2 flex items-center justify-center ${it.is_veg ? 'border-success' : 'border-destructive'}`}>
                    <span className={`h-1.5 w-1.5 rounded-full ${it.is_veg ? 'bg-success' : 'bg-destructive'}`} />
                  </span>
                  <p className="text-sm font-medium truncate">{it.name}</p>
                </div>
                <p className="text-xs text-muted-foreground">₹{it.discounted_price ?? it.price}</p>
              </div>
              <Switch checked={it.in_stock} onCheckedChange={async (v) => { await foodApi.toggleItemStock(it.id, v); loadAll(); }} />
              <Button size="icon" variant="ghost" onClick={() => setEditItem(it)}><Pencil className="h-4 w-4" /></Button>
              <Button size="icon" variant="ghost" onClick={async () => { if (confirm("Delete item?")) { await foodApi.deleteMenuItem(it.id); loadAll(); } }}>
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
            </Card>
          ))}
        </div>
      </div>
    </VendorLayout>
  );
}
