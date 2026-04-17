import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/lib/auth";
import { foodApi, calculateDeliveryFee, calculateRiderPayout, calculateETA, Restaurant } from "@/lib/food-api";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { ArrowLeft, MapPin, Plus, Minus, Tag, Clock, Heart, Utensils, Sparkles, ShieldCheck, X, Wallet } from "lucide-react";
import { toast } from "sonner";
import { loadSelectedCoords, loadSelectedLocation } from "@/components/customer/LocationModal";
import { haversineDistance } from "@/lib/geo-utils";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

const CART_KEY = "p4u_food_cart";
const DONATION_OPTIONS = [0, 2, 5, 10];
const TIP_OPTIONS = [0, 10, 20, 50];

interface CartLine { item_id: string; menu_item_id?: string; name: string; price: number; qty: number; restaurant_id: string; image_url?: string | null; }
interface AppliedCoupon { code: string; title: string; discount: number; coupon_id: string; }

function loadCart(): CartLine[] { try { return JSON.parse(localStorage.getItem(CART_KEY) || "[]"); } catch { return []; } }
function saveCart(c: CartLine[]) { localStorage.setItem(CART_KEY, JSON.stringify(c)); }

function generateSlots(): { value: string; label: string }[] {
  const slots: { value: string; label: string }[] = [{ value: "asap", label: "ASAP (~now)" }];
  const now = new Date();
  // Round up to next 30-min slot
  const start = new Date(now);
  start.setMinutes(start.getMinutes() + 60);
  start.setMinutes(start.getMinutes() < 30 ? 30 : 60);
  start.setSeconds(0); start.setMilliseconds(0);
  for (let i = 0; i < 24; i++) {
    const d = new Date(start.getTime() + i * 30 * 60 * 1000);
    slots.push({
      value: d.toISOString(),
      label: d.toLocaleString("en-IN", { weekday: "short", hour: "2-digit", minute: "2-digit" }),
    });
  }
  return slots;
}

export default function FoodCartPage() {
  const navigate = useNavigate();
  const { customerUser } = useAuth();
  const [cart, setCart] = useState<CartLine[]>(loadCart());
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [placing, setPlacing] = useState(false);
  const [coupon, setCoupon] = useState<AppliedCoupon | null>(null);
  const [couponInput, setCouponInput] = useState("");
  const [showCouponList, setShowCouponList] = useState(false);
  const [availableCoupons, setAvailableCoupons] = useState<any[]>([]);
  const [walletBalance, setWalletBalance] = useState(0);
  const [useWallet, setUseWallet] = useState(false);
  const [tip, setTip] = useState(0);
  const [donation, setDonation] = useState(0);
  const [contactless, setContactless] = useState(false);
  const [noCutlery, setNoCutlery] = useState(false);
  const [riderNote, setRiderNote] = useState("");
  const [slot, setSlot] = useState("asap");
  const [multiRestaurantWarn, setMultiRestaurantWarn] = useState<{ existing: string; incoming: string } | null>(null);

  const coords = loadSelectedCoords();
  const address = loadSelectedLocation() || "Current location";
  const slots = useMemo(() => generateSlots(), []);

  // Detect multi-restaurant cart on load + handle reorder payload
  useEffect(() => {
    const reorderRaw = localStorage.getItem('food_reorder_payload');
    if (reorderRaw) {
      try {
        const payload = JSON.parse(reorderRaw);
        const reorderLines: CartLine[] = (payload.items || []).map((it: any) => ({
          restaurant_id: payload.restaurant_id,
          menu_item_id: it.menu_item_id || it.id,
          name: it.name, price: it.price, qty: it.qty, gst_rate: it.gst_rate || 5,
        }));
        if (reorderLines.length) {
          const merged = [...cart.filter(l => l.restaurant_id === payload.restaurant_id), ...reorderLines];
          setCart(merged);
          toast.success("Items added from previous order");
        }
        localStorage.removeItem('food_reorder_payload');
      } catch {}
    }
    const ids = new Set(cart.map(l => l.restaurant_id));
    if (ids.size > 1) {
      const arr = Array.from(ids);
      setMultiRestaurantWarn({ existing: arr[0], incoming: arr[1] });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (cart.length === 0) return;
    foodApi.getRestaurant(cart[0].restaurant_id).then(setRestaurant);
  }, [cart.length]);

  useEffect(() => { saveCart(cart); }, [cart]);

  // Load wallet balance + active coupons
  useEffect(() => {
    if (!customerUser?.customer_id) return;
    supabase.from("customers").select("wallet_points").eq("id", customerUser.customer_id).maybeSingle()
      .then(({ data }) => setWalletBalance(data?.wallet_points || 0));
  }, [customerUser?.customer_id]);

  useEffect(() => {
    if (!restaurant) return;
    foodApi.listActiveCoupons(restaurant.id).then(setAvailableCoupons).catch(() => {});
  }, [restaurant?.id]);

  if (cart.length === 0) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6">
        <p className="text-muted-foreground">Your food cart is empty</p>
        <Button className="mt-4" onClick={() => navigate('/app/food')}>Browse restaurants</Button>
      </div>
    );
  }

  const subtotal = cart.reduce((s, l) => s + l.qty * l.price, 0);
  const distanceKm = restaurant?.latitude && restaurant?.longitude && coords
    ? haversineDistance(coords.lat, coords.lng, restaurant.latitude, restaurant.longitude) : 2;
  const deliveryFee = calculateDeliveryFee(distanceKm);
  const packagingFee = restaurant?.packaging_fee ?? 0;
  const platformFee = 5;
  const gst = Math.round(subtotal * 0.05);
  const couponDiscount = coupon?.discount || 0;
  const grossBeforeWallet = subtotal + deliveryFee + packagingFee + platformFee + gst + tip + donation - couponDiscount;
  const maxWalletUse = Math.min(walletBalance, Math.floor(grossBeforeWallet * 0.5));
  const walletApplied = useWallet ? maxWalletUse : 0;
  const total = Math.max(0, grossBeforeWallet - walletApplied);
  const eta = calculateETA(distanceKm, restaurant?.avg_prep_minutes ?? 25);
  const riderPayout = calculateRiderPayout(distanceKm) + tip;

  const applyCoupon = async (code: string) => {
    if (!customerUser?.customer_id || !restaurant) {
      toast.error("Please log in"); return;
    }
    const trimmed = code.trim().toUpperCase();
    if (!trimmed) return;
    const result = await foodApi.validateCoupon(trimmed, customerUser.customer_id, restaurant.id, subtotal);
    if (!result.valid) { toast.error(result.reason || "Invalid coupon"); return; }
    setCoupon({ code: result.code!, title: result.title!, discount: result.discount!, coupon_id: result.coupon_id! });
    setCouponInput("");
    setShowCouponList(false);
    toast.success(`Coupon applied — saved ₹${result.discount}`);
  };

  const autoApplyBest = async () => {
    if (!customerUser?.customer_id || !restaurant) return;
    const result = await foodApi.bestCoupon(customerUser.customer_id, restaurant.id, subtotal);
    if (result.valid && result.code) {
      setCoupon({ code: result.code, title: result.title!, discount: result.discount!, coupon_id: result.coupon_id! });
      toast.success(`Best deal applied: ${result.code} — saved ₹${result.discount}`);
    } else {
      toast("No applicable coupons right now");
    }
  };

  const placeOrder = async () => {
    if (!customerUser?.customer_id || !restaurant) {
      toast.error("Please log in"); navigate('/app/login'); return;
    }
    if (subtotal < (restaurant.min_order_amount || 0)) {
      toast.error(`Minimum order is ₹${restaurant.min_order_amount}`); return;
    }
    setPlacing(true);
    try {
      const orderId = "FO-" + Math.random().toString(36).slice(2, 10).toUpperCase();
      const otp = String(Math.floor(1000 + Math.random() * 9000));
      const restaurantPayout = subtotal - Math.round(subtotal * (restaurant.commission_rate / 100));
      const p4uCut = Math.max(0, subtotal - restaurantPayout - (riderPayout - tip) + platformFee - couponDiscount - donation);
      await foodApi.placeOrder({
        id: orderId,
        customer_id: customerUser.customer_id,
        customer_name: customerUser.name,
        customer_phone: customerUser.mobile,
        restaurant_id: restaurant.id,
        restaurant_name: restaurant.name,
        items: cart,
        subtotal, packaging_fee: packagingFee, delivery_fee: deliveryFee,
        gst, platform_fee: platformFee, total,
        rider_payout: riderPayout, restaurant_payout: restaurantPayout, p4u_cut: p4uCut,
        rider_tip: tip, discount: couponDiscount,
        coupon_code: coupon?.code || null,
        donation_amount: donation,
        is_contactless: contactless,
        no_cutlery: noCutlery,
        wallet_amount_used: walletApplied,
        rider_note: riderNote || null,
        scheduled_for: slot === "asap" ? null : slot,
        delivery_address: address,
        delivery_lat: coords?.lat, delivery_lng: coords?.lng,
        distance_km: distanceKm, eta_minutes: eta, handover_otp: otp,
        payment_method: 'cod', payment_status: 'pending', status: 'placed',
      } as any);

      // Record coupon usage
      if (coupon) {
        try { await foodApi.recordCouponRedemption(coupon.coupon_id, coupon.code, customerUser.customer_id, orderId, coupon.discount); } catch {}
      }
      // Deduct wallet
      if (walletApplied > 0) {
        await supabase.from("customers").update({ wallet_points: walletBalance - walletApplied }).eq("id", customerUser.customer_id);
      }

      saveCart([]);
      toast.success("Order placed!");
      navigate(`/app/food/order/${orderId}`);
    } catch (e: any) {
      toast.error(e.message || "Could not place order");
    } finally { setPlacing(false); }
  };

  const incQty = (id: string) => setCart(prev => prev.map(l => l.item_id === id ? { ...l, qty: l.qty + 1 } : l));
  const decQty = (id: string) => setCart(prev => prev.flatMap(l => l.item_id !== id ? [l] : l.qty > 1 ? [{ ...l, qty: l.qty - 1 }] : []));
  const clearCart = () => { saveCart([]); setCart([]); setMultiRestaurantWarn(null); };

  return (
    <div className="min-h-screen bg-muted/20 pb-32">
      <header className="sticky top-0 bg-background border-b border-border/50 px-4 py-3 flex items-center gap-3 z-30">
        <button onClick={() => navigate(-1)}><ArrowLeft className="h-5 w-5" /></button>
        <div>
          <h1 className="text-base font-bold">{restaurant?.name}</h1>
          <p className="text-xs text-muted-foreground">{slot === "asap" ? `Arriving in ~${eta} min` : `Scheduled • ${slots.find(s => s.value === slot)?.label}`}</p>
        </div>
      </header>

      {/* Multi-restaurant warning */}
      <Dialog open={!!multiRestaurantWarn} onOpenChange={(o) => !o && setMultiRestaurantWarn(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Items from different restaurants</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">Your cart contains items from more than one restaurant. We can only deliver from one at a time. Clear the cart to start fresh?</p>
          <div className="flex gap-2 justify-end">
            <Button variant="outline" onClick={() => setMultiRestaurantWarn(null)}>Cancel</Button>
            <Button variant="destructive" onClick={() => { clearCart(); }}>Clear cart</Button>
          </div>
        </DialogContent>
      </Dialog>

      <div className="p-4 space-y-3">
        <Card className="p-3 space-y-2">
          {cart.map(l => (
            <div key={l.item_id} className="flex items-center gap-3">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{l.name}</p>
                <p className="text-xs text-muted-foreground">₹{l.price} × {l.qty}</p>
              </div>
              <div className="flex items-center gap-2 bg-card border border-primary rounded-lg px-2 py-1">
                <button onClick={() => decQty(l.item_id)}><Minus className="h-3.5 w-3.5 text-primary" /></button>
                <span className="text-sm font-bold text-primary min-w-[1ch] text-center">{l.qty}</span>
                <button onClick={() => incQty(l.item_id)}><Plus className="h-3.5 w-3.5 text-primary" /></button>
              </div>
              <p className="text-sm font-semibold w-16 text-right">₹{l.qty * l.price}</p>
            </div>
          ))}
        </Card>

        {/* Address */}
        <Card className="p-3">
          <div className="flex items-center gap-2 text-sm">
            <MapPin className="h-4 w-4 text-primary" />
            <span className="font-medium">Delivering to:</span>
          </div>
          <p className="text-xs text-muted-foreground mt-1">{address}</p>
        </Card>

        {/* Delivery slot */}
        <Card className="p-3 space-y-2">
          <div className="flex items-center gap-2 text-sm font-semibold"><Clock className="h-4 w-4 text-primary" /> Delivery Time</div>
          <select className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm" value={slot} onChange={e => setSlot(e.target.value)}>
            {slots.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
          </select>
        </Card>

        {/* Coupons */}
        <Card className="p-3 space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm font-semibold"><Tag className="h-4 w-4 text-primary" /> Offers & Coupons</div>
            <button onClick={autoApplyBest} className="text-xs text-primary font-semibold flex items-center gap-1"><Sparkles className="h-3 w-3" /> Auto-apply best</button>
          </div>
          {coupon ? (
            <div className="flex items-center justify-between bg-success/10 border border-success/30 rounded-lg px-3 py-2">
              <div>
                <p className="text-xs font-bold text-success">{coupon.code} applied</p>
                <p className="text-xs text-muted-foreground">{coupon.title} — saved ₹{coupon.discount}</p>
              </div>
              <button onClick={() => setCoupon(null)} aria-label="Remove coupon"><X className="h-4 w-4 text-destructive" /></button>
            </div>
          ) : (
            <div className="flex gap-2">
              <Input placeholder="Enter promo code" value={couponInput} onChange={e => setCouponInput(e.target.value.toUpperCase())} className="h-9 text-sm" />
              <Button size="sm" onClick={() => applyCoupon(couponInput)}>Apply</Button>
            </div>
          )}
          {availableCoupons.length > 0 && (
            <button onClick={() => setShowCouponList(true)} className="text-xs text-primary underline">
              View {availableCoupons.length} available coupon{availableCoupons.length > 1 ? 's' : ''}
            </button>
          )}
        </Card>

        {/* Tip rider */}
        <Card className="p-3 space-y-2">
          <div className="flex items-center gap-2 text-sm font-semibold"><Heart className="h-4 w-4 text-primary" /> Tip your rider</div>
          <div className="flex gap-2 flex-wrap">
            {TIP_OPTIONS.map(t => (
              <button key={t} onClick={() => setTip(t)} className={`px-3 py-1.5 rounded-full border text-xs font-medium ${tip === t ? 'bg-primary text-primary-foreground border-primary' : 'bg-background border-border'}`}>
                {t === 0 ? 'No tip' : `₹${t}`}
              </button>
            ))}
          </div>
        </Card>

        {/* Donation */}
        <Card className="p-3 space-y-2">
          <div className="flex items-center gap-2 text-sm font-semibold"><Heart className="h-4 w-4 text-destructive" /> Donate to feed a child</div>
          <p className="text-xs text-muted-foreground">100% of your donation goes to our charity partner.</p>
          <div className="flex gap-2 flex-wrap">
            {DONATION_OPTIONS.map(d => (
              <button key={d} onClick={() => setDonation(d)} className={`px-3 py-1.5 rounded-full border text-xs font-medium ${donation === d ? 'bg-destructive text-destructive-foreground border-destructive' : 'bg-background border-border'}`}>
                {d === 0 ? 'Skip' : `₹${d}`}
              </button>
            ))}
          </div>
        </Card>

        {/* Wallet */}
        {walletBalance > 0 && (
          <Card className="p-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm">
                <Wallet className="h-4 w-4 text-primary" />
                <div>
                  <p className="font-semibold">P4U Wallet</p>
                  <p className="text-xs text-muted-foreground">Balance ₹{walletBalance} • Use up to ₹{maxWalletUse}</p>
                </div>
              </div>
              <Switch checked={useWallet} onCheckedChange={setUseWallet} />
            </div>
          </Card>
        )}

        {/* Preferences */}
        <Card className="p-3 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm">
              <ShieldCheck className="h-4 w-4 text-primary" />
              <div>
                <p className="font-semibold">Contactless delivery</p>
                <p className="text-xs text-muted-foreground">Drop at the door</p>
              </div>
            </div>
            <Switch checked={contactless} onCheckedChange={setContactless} />
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm">
              <Utensils className="h-4 w-4 text-primary" />
              <div>
                <p className="font-semibold">No cutlery please</p>
                <p className="text-xs text-muted-foreground">Help us reduce plastic waste</p>
              </div>
            </div>
            <Switch checked={noCutlery} onCheckedChange={setNoCutlery} />
          </div>
          <div>
            <Label className="text-xs">Note for the rider (optional)</Label>
            <Input value={riderNote} onChange={e => setRiderNote(e.target.value)} placeholder="e.g. Ring the bell once" className="h-9 text-sm mt-1" />
          </div>
        </Card>

        {/* Bill */}
        <Card className="p-3 space-y-1.5 text-sm">
          <h3 className="font-semibold text-xs uppercase text-muted-foreground mb-2">Bill Details</h3>
          <Row label="Item Total" value={`₹${subtotal}`} />
          <Row label={`Delivery (${distanceKm.toFixed(1)} km)`} value={`₹${deliveryFee}`} />
          <Row label="Packaging" value={`₹${packagingFee}`} />
          <Row label="Platform Fee" value={`₹${platformFee}`} />
          <Row label="GST" value={`₹${gst}`} />
          {tip > 0 && <Row label="Tip for rider" value={`₹${tip}`} />}
          {donation > 0 && <Row label="Donation" value={`₹${donation}`} />}
          {couponDiscount > 0 && <Row label={`Coupon (${coupon?.code})`} value={`-₹${couponDiscount}`} />}
          {walletApplied > 0 && <Row label="Wallet" value={`-₹${walletApplied}`} />}
          <div className="border-t border-border/50 my-2" />
          <Row label="To Pay" value={`₹${total}`} bold />
        </Card>
      </div>

      {/* Coupon list modal */}
      <Dialog open={showCouponList} onOpenChange={setShowCouponList}>
        <DialogContent className="max-h-[80vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Available Coupons</DialogTitle></DialogHeader>
          <div className="space-y-2">
            {availableCoupons.map(c => (
              <Card key={c.id} className="p-3 flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-bold text-primary">{c.code}</p>
                  <p className="text-xs">{c.title}</p>
                  <p className="text-xs text-muted-foreground">{c.description}</p>
                </div>
                <Button size="sm" onClick={() => applyCoupon(c.code)}>Apply</Button>
              </Card>
            ))}
            {availableCoupons.length === 0 && <p className="text-sm text-muted-foreground text-center py-4">No coupons available right now.</p>}
          </div>
        </DialogContent>
      </Dialog>

      <div className="fixed bottom-0 left-0 right-0 bg-background border-t border-border/50 px-4 py-3">
        <Button onClick={placeOrder} disabled={placing} className="w-full h-12 text-base font-semibold">
          {placing ? "Placing..." : `Place Order • ₹${total}`}
        </Button>
      </div>
    </div>
  );
}

function Row({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <div className={`flex justify-between ${bold ? 'font-bold' : ''}`}>
      <span className={bold ? '' : 'text-muted-foreground'}>{label}</span>
      <span>{value}</span>
    </div>
  );
}
