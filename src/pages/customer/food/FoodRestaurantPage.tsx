import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { foodApi, MenuCategory, MenuItem, Restaurant } from "@/lib/food-api";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Plus, Minus, Star, Clock, ShoppingBag, Leaf } from "lucide-react";
import { toast } from "sonner";

const CART_KEY = "p4u_food_cart";

interface CartLine { item_id: string; name: string; price: number; qty: number; restaurant_id: string; image_url?: string | null; }

function loadCart(): CartLine[] { try { return JSON.parse(localStorage.getItem(CART_KEY) || "[]"); } catch { return []; } }
function saveCart(c: CartLine[]) { localStorage.setItem(CART_KEY, JSON.stringify(c)); }

export default function FoodRestaurantPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [categories, setCategories] = useState<MenuCategory[]>([]);
  const [items, setItems] = useState<MenuItem[]>([]);
  const [cart, setCart] = useState<CartLine[]>(loadCart());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    Promise.all([foodApi.getRestaurant(id), foodApi.listMenu(id)]).then(([r, m]) => {
      setRestaurant(r); setCategories(m.categories); setItems(m.items);
    }).finally(() => setLoading(false));
  }, [id]);

  useEffect(() => { saveCart(cart); }, [cart]);

  const grouped = useMemo(() => {
    const map = new Map<string, MenuItem[]>();
    items.forEach(it => {
      const key = it.category_id || 'uncategorized';
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(it);
    });
    return map;
  }, [items]);

  const cartCount = cart.reduce((s, l) => s + l.qty, 0);
  const cartTotal = cart.reduce((s, l) => s + l.qty * l.price, 0);

  const addToCart = (item: MenuItem) => {
    if (!restaurant) return;
    if (cart.length > 0 && cart[0].restaurant_id !== restaurant.id) {
      if (!confirm("Your cart has items from another restaurant. Clear it?")) return;
      setCart([{ item_id: item.id, name: item.name, price: item.discounted_price ?? item.price, qty: 1, restaurant_id: restaurant.id, image_url: item.image_url }]);
      toast.success("Added to cart");
      return;
    }
    setCart(prev => {
      const existing = prev.find(l => l.item_id === item.id);
      if (existing) return prev.map(l => l.item_id === item.id ? { ...l, qty: l.qty + 1 } : l);
      return [...prev, { item_id: item.id, name: item.name, price: item.discounted_price ?? item.price, qty: 1, restaurant_id: restaurant.id, image_url: item.image_url }];
    });
  };

  const removeFromCart = (itemId: string) => {
    setCart(prev => prev.flatMap(l => l.item_id !== itemId ? [l] : l.qty > 1 ? [{ ...l, qty: l.qty - 1 }] : []));
  };

  if (loading || !restaurant) return (
    <div className="min-h-screen flex items-center justify-center"><div className="h-8 w-8 rounded-full border-2 border-primary border-t-transparent animate-spin" /></div>
  );

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Header */}
      <div className="relative aspect-[16/9] bg-muted">
        {restaurant.cover_image && <img src={restaurant.cover_image} alt={restaurant.name} className="w-full h-full object-cover" />}
        <button onClick={() => navigate(-1)} className="absolute top-3 left-3 h-9 w-9 rounded-full bg-background/80 backdrop-blur flex items-center justify-center">
          <ArrowLeft className="h-4 w-4" />
        </button>
      </div>

      <div className="px-4 py-3 border-b border-border/50">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold">{restaurant.name}</h1>
            <p className="text-xs text-muted-foreground mt-0.5">{restaurant.cuisine.join(" • ")}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{restaurant.address}</p>
          </div>
          <Badge className="bg-success text-success-foreground"><Star className="h-3 w-3 mr-1 fill-current" />{restaurant.rating || "New"}</Badge>
        </div>
        <div className="flex gap-3 mt-2 text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1"><Clock className="h-3 w-3" /> {restaurant.avg_prep_minutes} min</span>
          {restaurant.veg_only && <Badge variant="outline" className="text-success border-success"><Leaf className="h-3 w-3 mr-1" />Pure Veg</Badge>}
          {restaurant.min_order_amount > 0 && <span>Min ₹{restaurant.min_order_amount}</span>}
        </div>
      </div>

      {/* Menu */}
      <div className="p-4 space-y-6">
        {[...categories, { id: 'uncategorized', name: 'Other items', display_order: 999, restaurant_id: restaurant.id, is_active: true }].map(cat => {
          const list = grouped.get(cat.id) || [];
          if (list.length === 0) return null;
          return (
            <section key={cat.id}>
              <h2 className="text-sm font-bold uppercase text-muted-foreground mb-2">{cat.name} <span className="text-xs">({list.length})</span></h2>
              <div className="space-y-3">
                {list.map(item => {
                  const inCart = cart.find(l => l.item_id === item.id);
                  return (
                    <div key={item.id} className="flex gap-3 p-3 rounded-xl border border-border/60">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 mb-1">
                          <span className={`h-3.5 w-3.5 rounded-sm border-2 flex items-center justify-center ${item.is_veg ? 'border-success' : 'border-destructive'}`}>
                            <span className={`h-1.5 w-1.5 rounded-full ${item.is_veg ? 'bg-success' : 'bg-destructive'}`} />
                          </span>
                          {item.is_bestseller && <Badge variant="outline" className="text-warning border-warning text-[9px] py-0">★ Bestseller</Badge>}
                        </div>
                        <h3 className="font-semibold text-sm">{item.name}</h3>
                        <p className="text-sm font-medium mt-0.5">
                          ₹{item.discounted_price ?? item.price}
                          {item.discounted_price != null && <span className="text-xs text-muted-foreground line-through ml-2">₹{item.price}</span>}
                        </p>
                        {item.description && <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{item.description}</p>}
                      </div>
                      <div className="w-24 shrink-0 flex flex-col items-center gap-2">
                        {item.image_url ? (
                          <img src={item.image_url} alt={item.name} className="w-24 h-24 rounded-lg object-cover" loading="lazy" />
                        ) : (
                          <div className="w-24 h-24 rounded-lg bg-muted" />
                        )}
                        {!item.in_stock ? (
                          <Badge variant="destructive">Sold out</Badge>
                        ) : inCart ? (
                          <div className="flex items-center gap-2 bg-card border border-primary rounded-lg px-2 py-1">
                            <button onClick={() => removeFromCart(item.id)}><Minus className="h-3.5 w-3.5 text-primary" /></button>
                            <span className="text-sm font-bold text-primary min-w-[1ch] text-center">{inCart.qty}</span>
                            <button onClick={() => addToCart(item)}><Plus className="h-3.5 w-3.5 text-primary" /></button>
                          </div>
                        ) : (
                          <Button size="sm" variant="outline" className="text-primary border-primary" onClick={() => addToCart(item)}>
                            <Plus className="h-3.5 w-3.5 mr-1" /> Add
                          </Button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          );
        })}
      </div>

      {/* Sticky cart bar */}
      {cartCount > 0 && (
        <div className="fixed bottom-16 left-0 right-0 px-4 z-40">
          <button onClick={() => navigate('/app/food/cart')}
            className="w-full bg-primary text-primary-foreground rounded-xl px-4 py-3 flex items-center justify-between shadow-lg">
            <span className="text-sm"><ShoppingBag className="h-4 w-4 inline mr-2" />{cartCount} {cartCount === 1 ? 'item' : 'items'} • ₹{cartTotal}</span>
            <span className="text-sm font-semibold">View Cart →</span>
          </button>
        </div>
      )}
    </div>
  );
}
