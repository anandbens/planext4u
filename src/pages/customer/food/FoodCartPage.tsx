import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/lib/auth";
import { foodApi, calculateDeliveryFee, calculateRiderPayout, calculateETA, Restaurant } from "@/lib/food-api";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ArrowLeft, MapPin, Plus, Minus } from "lucide-react";
import { toast } from "sonner";
import { loadSelectedCoords, loadSelectedLocation } from "@/components/customer/LocationModal";
import { haversineDistance } from "@/lib/geo-utils";

const CART_KEY = "p4u_food_cart";

interface CartLine { item_id: string; name: string; price: number; qty: number; restaurant_id: string; image_url?: string | null; }

function loadCart(): CartLine[] { try { return JSON.parse(localStorage.getItem(CART_KEY) || "[]"); } catch { return []; } }
function saveCart(c: CartLine[]) { localStorage.setItem(CART_KEY, JSON.stringify(c)); }

export default function FoodCartPage() {
  const navigate = useNavigate();
  const { customerUser } = useAuth();
  const [cart, setCart] = useState<CartLine[]>(loadCart());
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [placing, setPlacing] = useState(false);

  const coords = loadSelectedCoords();
  const address = loadSelectedLocation() || "Current location";

  useEffect(() => {
    if (cart.length === 0) return;
    foodApi.getRestaurant(cart[0].restaurant_id).then(setRestaurant);
  }, [cart.length]);

  useEffect(() => { saveCart(cart); }, [cart]);

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
  const total = subtotal + deliveryFee + packagingFee + platformFee + gst;
  const eta = calculateETA(distanceKm, restaurant?.avg_prep_minutes ?? 25);
  const riderPayout = calculateRiderPayout(distanceKm);

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
      const p4uCut = subtotal - restaurantPayout - riderPayout + platformFee;
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
        delivery_address: address,
        delivery_lat: coords?.lat, delivery_lng: coords?.lng,
        distance_km: distanceKm, eta_minutes: eta, handover_otp: otp,
        payment_method: 'cod', payment_status: 'pending', status: 'placed',
      });
      saveCart([]);
      toast.success("Order placed!");
      navigate(`/app/food/order/${orderId}`);
    } catch (e: any) {
      toast.error(e.message || "Could not place order");
    } finally { setPlacing(false); }
  };

  const incQty = (id: string) => setCart(prev => prev.map(l => l.item_id === id ? { ...l, qty: l.qty + 1 } : l));
  const decQty = (id: string) => setCart(prev => prev.flatMap(l => l.item_id !== id ? [l] : l.qty > 1 ? [{ ...l, qty: l.qty - 1 }] : []));

  return (
    <div className="min-h-screen bg-muted/20 pb-32">
      <header className="sticky top-0 bg-background border-b border-border/50 px-4 py-3 flex items-center gap-3 z-30">
        <button onClick={() => navigate(-1)}><ArrowLeft className="h-5 w-5" /></button>
        <div>
          <h1 className="text-base font-bold">{restaurant?.name}</h1>
          <p className="text-xs text-muted-foreground">Arriving in ~{eta} min</p>
        </div>
      </header>

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

        <Card className="p-3">
          <div className="flex items-center gap-2 text-sm">
            <MapPin className="h-4 w-4 text-primary" />
            <span className="font-medium">Delivering to:</span>
          </div>
          <p className="text-xs text-muted-foreground mt-1">{address}</p>
        </Card>

        <Card className="p-3 space-y-1.5 text-sm">
          <h3 className="font-semibold text-xs uppercase text-muted-foreground mb-2">Bill Details</h3>
          <Row label="Item Total" value={`₹${subtotal}`} />
          <Row label={`Delivery (${distanceKm.toFixed(1)} km)`} value={`₹${deliveryFee}`} />
          <Row label="Packaging" value={`₹${packagingFee}`} />
          <Row label="Platform Fee" value={`₹${platformFee}`} />
          <Row label="GST" value={`₹${gst}`} />
          <div className="border-t border-border/50 my-2" />
          <Row label="To Pay" value={`₹${total}`} bold />
        </Card>
      </div>

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
