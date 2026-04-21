import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { foodApi, MenuCategory, MenuItem, Restaurant, MenuCombo } from "@/lib/food-api";
import { RestaurantReviewsList } from "@/components/food/RestaurantReviewsList";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  ArrowLeft,
  Plus,
  Minus,
  Star,
  Clock,
  ShoppingBag,
  Leaf,
  BellRing,
  Search as SearchIcon,
  Flame,
  Image as ImageIcon,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useCurrency } from "@/lib/country-context";

const CART_KEY = "p4u_food_cart";

interface CartLine {
  item_id: string;
  name: string;
  price: number;
  qty: number;
  restaurant_id: string;
  image_url?: string | null;
  notes?: string;
}

function loadCart(): CartLine[] {
  try {
    return JSON.parse(localStorage.getItem(CART_KEY) || "[]");
  } catch {
    return [];
  }
}
function saveCart(c: CartLine[]) {
  localStorage.setItem(CART_KEY, JSON.stringify(c));
}

const DIETARY_OPTIONS = ["Jain", "Halal", "Keto", "Gluten-Free", "Vegan", "Low-Cal"];

export default function FoodRestaurantPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { format: fmt } = useCurrency();
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [categories, setCategories] = useState<MenuCategory[]>([]);
  const [items, setItems] = useState<MenuItem[]>([]);
  const [combos, setCombos] = useState<MenuCombo[]>([]);
  const [cart, setCart] = useState<CartLine[]>(loadCart());
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [vegOnly, setVegOnly] = useState(false);
  const [bestsellersOnly, setBestsellersOnly] = useState(false);
  const [activeDietary, setActiveDietary] = useState<string[]>([]);
  const [galleryOpen, setGalleryOpen] = useState(false);
  const [galleryIndex, setGalleryIndex] = useState(0);
  const [customizingItem, setCustomizingItem] = useState<MenuItem | null>(null);
  const [customizationNotes, setCustomizationNotes] = useState("");
  const [notifySubscriptions, setNotifySubscriptions] = useState<string[]>([]);
  const [customerId, setCustomerId] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    Promise.all([
      foodApi.getRestaurant(id),
      foodApi.listMenu(id),
      foodApi.listCombos(id).catch(() => []),
    ])
      .then(([r, m, c]) => {
        setRestaurant(r);
        setCategories(m.categories);
        setItems(m.items);
        setCombos(c as MenuCombo[]);
      })
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    saveCart(cart);
  }, [cart]);

  // Load customer id + notify subscriptions
  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getUser();
      const uid = data.user?.id;
      if (!uid) return;
      const { data: roleRow } = await supabase
        .from("user_roles")
        .select("customer_id")
        .eq("user_id", uid)
        .eq("role", "customer")
        .maybeSingle();
      const cid = roleRow?.customer_id || null;
      setCustomerId(cid);
      if (cid) {
        try {
          const subs = await foodApi.listMyNotifyRequests(cid);
          setNotifySubscriptions(subs);
        } catch {
          /* ignore */
        }
      }
    })();
  }, []);

  const filteredItems = useMemo(() => {
    return items.filter((it) => {
      if (vegOnly && !it.is_veg) return false;
      if (bestsellersOnly && !it.is_bestseller) return false;
      if (
        activeDietary.length > 0 &&
        !activeDietary.every((tag) => (it.dietary_tags || []).includes(tag))
      )
        return false;
      if (
        search.trim() &&
        !it.name.toLowerCase().includes(search.trim().toLowerCase()) &&
        !(it.description || "").toLowerCase().includes(search.trim().toLowerCase())
      )
        return false;
      return true;
    });
  }, [items, vegOnly, bestsellersOnly, activeDietary, search]);

  const grouped = useMemo(() => {
    const map = new Map<string, MenuItem[]>();
    filteredItems.forEach((it) => {
      const key = it.category_id || "uncategorized";
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(it);
    });
    return map;
  }, [filteredItems]);

  const cartCount = cart.reduce((s, l) => s + l.qty, 0);
  const cartTotal = cart.reduce((s, l) => s + l.qty * l.price, 0);

  const addToCart = (item: MenuItem, notes?: string) => {
    if (!restaurant) return;
    setCart((prev) => {
      const existing = prev.find((l) => l.item_id === item.id);
      if (existing)
        return prev.map((l) =>
          l.item_id === item.id ? { ...l, qty: l.qty + 1, notes: notes ?? l.notes } : l
        );
      return [
        ...prev,
        {
          item_id: item.id,
          name: item.name,
          price: item.discounted_price ?? item.price,
          qty: 1,
          restaurant_id: restaurant.id,
          image_url: item.image_url,
          notes,
        },
      ];
    });
  };

  const removeFromCart = (itemId: string) => {
    setCart((prev) =>
      prev.flatMap((l) =>
        l.item_id !== itemId ? [l] : l.qty > 1 ? [{ ...l, qty: l.qty - 1 }] : []
      )
    );
  };

  const handleNotifyMe = async (itemId: string) => {
    if (!customerId) {
      toast.error("Please log in to get notified");
      return;
    }
    try {
      await foodApi.subscribeNotifyAvailable(itemId, customerId);
      setNotifySubscriptions((prev) => [...prev, itemId]);
      toast.success("We'll notify you when it's back");
    } catch (e: any) {
      toast.error(e.message || "Failed to subscribe");
    }
  };

  const addComboToCart = (combo: MenuCombo) => {
    if (!restaurant) return;
    setCart((prev) => [
      ...prev,
      {
        item_id: `combo-${combo.id}`,
        name: `🍱 ${combo.name} (Combo)`,
        price: combo.combo_price,
        qty: 1,
        restaurant_id: restaurant.id,
        image_url: combo.image_url,
      },
    ]);
    toast.success("Combo added");
  };

  const isOpenNow = useMemo(() => {
    if (!restaurant?.opening_time || !restaurant?.closing_time) return restaurant?.status === "open";
    const now = new Date();
    const cur = now.getHours() * 60 + now.getMinutes();
    const [oh, om] = restaurant.opening_time.split(":").map(Number);
    const [ch, cm] = restaurant.closing_time.split(":").map(Number);
    const open = oh * 60 + om;
    const close = ch * 60 + cm;
    if (close > open) return cur >= open && cur <= close;
    return cur >= open || cur <= close;
  }, [restaurant]);

  if (loading || !restaurant)
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="h-8 w-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
      </div>
    );

  const galleryImages = [
    restaurant.banner_url,
    restaurant.cover_image,
    ...((restaurant.gallery_urls as string[]) || []),
  ].filter(Boolean) as string[];

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Banner */}
      <div className="relative aspect-[16/9] bg-muted">
        {galleryImages[0] && (
          <img
            src={galleryImages[0]}
            alt={restaurant.name}
            className="w-full h-full object-cover"
          />
        )}
        <button
          onClick={() => navigate(-1)}
          className="absolute top-3 left-3 h-9 w-9 rounded-full bg-background/80 backdrop-blur flex items-center justify-center"
        >
          <ArrowLeft className="h-4 w-4" />
        </button>
        {galleryImages.length > 1 && (
          <button
            onClick={() => {
              setGalleryIndex(0);
              setGalleryOpen(true);
            }}
            className="absolute bottom-3 right-3 bg-background/80 backdrop-blur rounded-full px-3 py-1.5 text-xs flex items-center gap-1"
          >
            <ImageIcon className="h-3.5 w-3.5" /> {galleryImages.length} photos
          </button>
        )}
      </div>

      {/* Header */}
      <div className="px-4 py-3 border-b border-border/50">
        <div className="flex items-start justify-between gap-3">
          <div className="flex gap-3 flex-1 min-w-0">
            {restaurant.logo_url && (
              <img
                src={restaurant.logo_url}
                alt={`${restaurant.name} logo`}
                className="w-14 h-14 rounded-lg object-cover border border-border/40 shrink-0"
              />
            )}
            <div className="min-w-0">
              <h1 className="text-xl font-bold truncate">{restaurant.name}</h1>
              {restaurant.tagline && (
                <p className="text-xs text-muted-foreground italic mt-0.5">{restaurant.tagline}</p>
              )}
              <p className="text-xs text-muted-foreground mt-0.5 truncate">
                {restaurant.cuisine.join(" • ")}
              </p>
              <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{restaurant.address}</p>
            </div>
          </div>
          <div className="flex flex-col items-end gap-1 shrink-0">
            <Badge className="bg-success text-success-foreground">
              <Star className="h-3 w-3 mr-1 fill-current" />
              {restaurant.rating ? restaurant.rating.toFixed(1) : "New"}
            </Badge>
            {restaurant.reviews_count > 0 && (
              <span className="text-[10px] text-muted-foreground">
                {restaurant.reviews_count} reviews
              </span>
            )}
          </div>
        </div>
        <div className="flex flex-wrap gap-2 mt-3 text-xs">
          <Badge variant={isOpenNow ? "default" : "destructive"} className="text-[10px]">
            {isOpenNow ? "Open now" : "Closed"}
          </Badge>
          {restaurant.opening_time && restaurant.closing_time && (
            <span className="inline-flex items-center gap-1 text-muted-foreground">
              <Clock className="h-3 w-3" /> {restaurant.opening_time.slice(0, 5)} –{" "}
              {restaurant.closing_time.slice(0, 5)}
            </span>
          )}
          <span className="inline-flex items-center gap-1 text-muted-foreground">
            <Clock className="h-3 w-3" /> ~{restaurant.avg_prep_minutes} min prep
          </span>
          {restaurant.veg_only && (
            <Badge variant="outline" className="text-success border-success">
              <Leaf className="h-3 w-3 mr-1" />
              Pure Veg
            </Badge>
          )}
          {restaurant.min_order_amount > 0 && (
            <span className="text-muted-foreground">Min {fmt(restaurant.min_order_amount, { decimals: 0 })}</span>
          )}
          {restaurant.fssai_license && (
            <span className="text-muted-foreground">FSSAI: {restaurant.fssai_license}</span>
          )}
        </div>
      </div>

      {/* Search + filters */}
      <div className="px-4 py-3 border-b border-border/50 space-y-2">
        <div className="relative">
          <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search this menu"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 h-9"
          />
        </div>
        <div className="flex gap-2 overflow-x-auto pb-1">
          <FilterChip active={vegOnly} onClick={() => setVegOnly((v) => !v)}>
            <Leaf className="h-3 w-3 mr-1" /> Veg only
          </FilterChip>
          <FilterChip active={bestsellersOnly} onClick={() => setBestsellersOnly((v) => !v)}>
            ★ Bestsellers
          </FilterChip>
          {DIETARY_OPTIONS.map((tag) => (
            <FilterChip
              key={tag}
              active={activeDietary.includes(tag)}
              onClick={() =>
                setActiveDietary((prev) =>
                  prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
                )
              }
            >
              {tag}
            </FilterChip>
          ))}
        </div>
      </div>

      {/* Combos */}
      {combos.length > 0 && (
        <section className="px-4 py-4 border-b border-border/40">
          <h2 className="text-sm font-bold uppercase text-muted-foreground mb-2">
            🍱 Combo Meals
          </h2>
          <div className="flex gap-3 overflow-x-auto pb-2">
            {combos.map((c) => (
              <div
                key={c.id}
                className="min-w-[220px] rounded-xl border border-border/60 p-3 bg-card"
              >
                {c.image_url && (
                  <img
                    src={c.image_url}
                    alt={c.name}
                    className="w-full h-28 rounded-lg object-cover mb-2"
                  />
                )}
                <h3 className="font-semibold text-sm">{c.name}</h3>
                {c.description && (
                  <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">
                    {c.description}
                  </p>
                )}
                <div className="flex items-baseline gap-2 mt-2">
                  <span className="font-bold text-primary">{fmt(c.combo_price, { decimals: 0 })}</span>
                  {c.original_price > c.combo_price && (
                    <span className="text-xs text-muted-foreground line-through">
                      {fmt(c.original_price, { decimals: 0 })}
                    </span>
                  )}
                </div>
                <Button
                  size="sm"
                  className="w-full mt-2"
                  onClick={() => addComboToCart(c)}
                >
                  <Plus className="h-3 w-3 mr-1" /> Add Combo
                </Button>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Menu */}
      <div className="p-4 space-y-6">
        {[
          ...categories,
          {
            id: "uncategorized",
            name: "Other items",
            display_order: 999,
            restaurant_id: restaurant.id,
            is_active: true,
          },
        ].map((cat) => {
          const list = grouped.get(cat.id) || [];
          if (list.length === 0) return null;
          return (
            <section key={cat.id}>
              <h2 className="text-sm font-bold uppercase text-muted-foreground mb-2">
                {cat.name} <span className="text-xs">({list.length})</span>
              </h2>
              <div className="space-y-3">
                {list.map((item) => {
                  const inCart = cart.find((l) => l.item_id === item.id);
                  const isSubscribed = notifySubscriptions.includes(item.id);
                  const hasCustomization =
                    (item.addons && (item.addons as any[]).length > 0) ||
                    (item.customizations && (item.customizations as any[]).length > 0);
                  return (
                    <div
                      key={item.id}
                      className="flex gap-3 p-3 rounded-xl border border-border/60"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center flex-wrap gap-1.5 mb-1">
                          {/* FSSAI veg/non-veg dot */}
                          <span
                            title={item.is_veg ? "Vegetarian" : "Non-Vegetarian"}
                            className={`h-3.5 w-3.5 rounded-sm border-2 flex items-center justify-center ${
                              item.is_veg ? "border-success" : "border-destructive"
                            }`}
                          >
                            <span
                              className={`h-1.5 w-1.5 rounded-full ${
                                item.is_veg ? "bg-success" : "bg-destructive"
                              }`}
                            />
                          </span>
                          {item.is_bestseller && (
                            <Badge
                              variant="outline"
                              className="text-warning border-warning text-[9px] py-0 px-1.5"
                            >
                              ★ Bestseller
                            </Badge>
                          )}
                          {item.spice_level && item.spice_level !== "mild" && (
                            <span className="text-[10px] text-destructive inline-flex items-center">
                              <Flame className="h-3 w-3 mr-0.5" />
                              {item.spice_level.replace("_", " ")}
                            </span>
                          )}
                          {(item.dietary_tags || []).map((tag) => (
                            <Badge
                              key={tag}
                              variant="outline"
                              className="text-[9px] py-0 px-1.5"
                            >
                              {tag}
                            </Badge>
                          ))}
                        </div>
                        <h3 className="font-semibold text-sm">{item.name}</h3>
                        <p className="text-sm font-medium mt-0.5">
                          {fmt(item.discounted_price ?? item.price, { decimals: 0 })}
                          {item.discounted_price != null && (
                            <span className="text-xs text-muted-foreground line-through ml-2">
                              {fmt(item.price, { decimals: 0 })}
                            </span>
                          )}
                          {item.calories != null && (
                            <span className="text-[10px] text-muted-foreground ml-2">
                              • {item.calories} cal
                            </span>
                          )}
                        </p>
                        {item.description && (
                          <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                            {item.description}
                          </p>
                        )}
                      </div>
                      <div
                        className={`w-24 shrink-0 flex flex-col items-center gap-2 ${
                          !item.in_stock ? "opacity-60" : ""
                        }`}
                      >
                        {item.image_url ? (
                          <img
                            src={item.image_url}
                            alt={item.name}
                            className={`w-24 h-24 rounded-lg object-cover ${
                              !item.in_stock ? "grayscale" : ""
                            }`}
                            loading="lazy"
                          />
                        ) : (
                          <div className="w-24 h-24 rounded-lg bg-muted" />
                        )}
                        {!item.in_stock ? (
                          isSubscribed ? (
                            <Badge variant="outline" className="text-[9px]">
                              <BellRing className="h-3 w-3 mr-1" /> Notifying
                            </Badge>
                          ) : (
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-[10px] h-7 px-2"
                              onClick={() => handleNotifyMe(item.id)}
                            >
                              <BellRing className="h-3 w-3 mr-1" /> Notify me
                            </Button>
                          )
                        ) : inCart ? (
                          <div className="flex items-center gap-2 bg-card border border-primary rounded-lg px-2 py-1">
                            <button onClick={() => removeFromCart(item.id)}>
                              <Minus className="h-3.5 w-3.5 text-primary" />
                            </button>
                            <span className="text-sm font-bold text-primary min-w-[1ch] text-center">
                              {inCart.qty}
                            </span>
                            <button onClick={() => addToCart(item)}>
                              <Plus className="h-3.5 w-3.5 text-primary" />
                            </button>
                          </div>
                        ) : (
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-primary border-primary"
                            onClick={() => {
                              if (hasCustomization) {
                                setCustomizingItem(item);
                                setCustomizationNotes("");
                              } else {
                                addToCart(item);
                              }
                            }}
                          >
                            <Plus className="h-3.5 w-3.5 mr-1" />{" "}
                            {hasCustomization ? "Customize" : "Add"}
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
        {filteredItems.length === 0 && (
          <p className="text-center text-sm text-muted-foreground py-8">
            No items match your filters.
          </p>
        )}
      </div>

      {restaurant && (
        <section className="px-4 py-4 border-t border-border/40 bg-muted/10">
          <h2 className="text-base font-bold mb-3">Customer reviews</h2>
          <RestaurantReviewsList restaurantId={restaurant.id} max={8} />
        </section>
      )}
      {cartCount > 0 && (
        <div className="fixed bottom-16 left-0 right-0 px-4 z-40">
          <button
            onClick={() => navigate("/app/food/cart")}
            className="w-full bg-primary text-primary-foreground rounded-xl px-4 py-3 flex items-center justify-between shadow-lg"
          >
            <span className="text-sm">
              <ShoppingBag className="h-4 w-4 inline mr-2" />
              {cartCount} {cartCount === 1 ? "item" : "items"} • {fmt(cartTotal, { decimals: 0 })}
            </span>
            <span className="text-sm font-semibold">View Cart →</span>
          </button>
        </div>
      )}

      {/* Gallery dialog */}
      <Dialog open={galleryOpen} onOpenChange={setGalleryOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>{restaurant.name} — Gallery</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-[70vh] overflow-y-auto">
            {galleryImages.map((src, i) => (
              <button
                key={i}
                onClick={() => setGalleryIndex(i)}
                className={`relative rounded-lg overflow-hidden border ${
                  galleryIndex === i ? "border-primary" : "border-border/40"
                }`}
              >
                <img src={src} alt={`Photo ${i + 1}`} className="w-full h-32 object-cover" />
              </button>
            ))}
          </div>
          {galleryImages[galleryIndex] && (
            <img
              src={galleryImages[galleryIndex]}
              alt="Selected"
              className="w-full max-h-[60vh] object-contain rounded-lg"
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Customization dialog */}
      <Dialog open={!!customizingItem} onOpenChange={(o) => !o && setCustomizingItem(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{customizingItem?.name}</DialogTitle>
          </DialogHeader>
          {customizingItem && (
            <div className="space-y-3">
              {customizingItem.description && (
                <p className="text-sm text-muted-foreground">{customizingItem.description}</p>
              )}
              {(customizingItem.addons as any[])?.length > 0 && (
                <div>
                  <p className="text-xs font-semibold uppercase text-muted-foreground mb-1">
                    Add-ons
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {(customizingItem.addons as any[]).map((a: any, i: number) => (
                      <Badge key={i} variant="outline">
                        {a.name || a} {a.price ? `(+${fmt(a.price, { decimals: 0 })})` : ""}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
              {(customizingItem.customizations as any[])?.length > 0 && (
                <div>
                  <p className="text-xs font-semibold uppercase text-muted-foreground mb-1">
                    Options
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {(customizingItem.customizations as any[]).map((c: any, i: number) => (
                      <Badge key={i} variant="outline">
                        {c.name || c}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
              <div>
                <p className="text-xs font-semibold uppercase text-muted-foreground mb-1">
                  Special instructions
                </p>
                <Input
                  placeholder="e.g. Less spicy, no onions"
                  value={customizationNotes}
                  onChange={(e) => setCustomizationNotes(e.target.value)}
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setCustomizingItem(null)}>
              Cancel
            </Button>
            <Button
              onClick={() => {
                if (customizingItem) {
                  addToCart(customizingItem, customizationNotes.trim() || undefined);
                  setCustomizingItem(null);
                }
              }}
            >
              Add to Cart
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function FilterChip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`shrink-0 rounded-full px-3 py-1 text-xs border inline-flex items-center transition-colors ${
        active
          ? "bg-primary text-primary-foreground border-primary"
          : "bg-card border-border/60 text-muted-foreground hover:bg-muted"
      }`}
    >
      {children}
    </button>
  );
}
