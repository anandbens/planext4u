import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Minus, Plus, Trash2, Tag, Coins, ShoppingBag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { CustomerLayout } from "@/components/customer/CustomerLayout";
import { toast } from "sonner";
import { api, CartItem } from "@/lib/api";

export default function CustomerCartPage() {
  const navigate = useNavigate();
  const [cart, setCart] = useState<CartItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [placing, setPlacing] = useState(false);
  const [coupon, setCoupon] = useState("");
  const [couponApplied, setCouponApplied] = useState(false);
  const [pointsUsed, setPointsUsed] = useState(0);
  const [walletPoints, setWalletPoints] = useState(0);

  useEffect(() => {
    Promise.all([
      api.getCart(),
      api.getCustomerProfile('USR-001'),
    ]).then(([cartItems, profile]) => {
      setCart(cartItems);
      setWalletPoints(profile.wallet_points);
      setLoading(false);
    });
  }, []);

  const updateQty = async (id: string, delta: number) => {
    const item = cart.find(i => i.id === id);
    if (!item) return;
    const newQty = Math.max(1, item.qty + delta);
    await api.updateCartItem(id, newQty);
    setCart(prev => prev.map(i => i.id === id ? { ...i, qty: newQty } : i));
  };

  const removeItem = async (id: string) => {
    await api.removeFromCart(id);
    setCart(prev => prev.filter(i => i.id !== id));
    toast.info("Item removed from cart");
  };

  const subtotal = cart.reduce((sum, item) => sum + item.price * item.qty, 0);
  const tax = cart.reduce((sum, item) => sum + item.tax * item.qty, 0);
  const discount = couponApplied ? Math.round(subtotal * 0.1) : 0;
  const maxPoints = Math.min(walletPoints, cart.reduce((s, i) => s + i.maxPoints * i.qty, 0));
  const total = subtotal + tax - discount - pointsUsed;

  const applyCoupon = () => {
    if (coupon === "WELCOME") {
      setCouponApplied(true);
      toast.success("Coupon applied! 10% discount");
    } else {
      toast.error("Invalid coupon code");
    }
  };

  const placeOrder = async () => {
    if (cart.length === 0) return;
    setPlacing(true);
    try {
      const result = await api.placeOrder(cart, 'USR-001', pointsUsed, discount);
      await api.clearCart();
      toast.success(`${result.orders.length} order(s) placed successfully!`);
      navigate('/app/orders');
    } catch {
      toast.error("Failed to place order");
    } finally {
      setPlacing(false);
    }
  };

  if (loading) {
    return (
      <CustomerLayout>
        <div className="flex items-center justify-center h-64">
          <div className="h-8 w-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
        </div>
      </CustomerLayout>
    );
  }

  return (
    <CustomerLayout>
      <div className="max-w-3xl mx-auto px-4 py-6 pb-20 md:pb-6">
        <h1 className="text-xl font-bold mb-6 flex items-center gap-2">
          <ShoppingBag className="h-5 w-5" /> Cart ({cart.length} items)
        </h1>

        {cart.length === 0 ? (
          <div className="text-center py-16">
            <ShoppingBag className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-lg font-medium">Your cart is empty</p>
            <p className="text-sm text-muted-foreground mt-1">Browse products and add items to your cart</p>
            <Button asChild className="mt-4"><Link to="/app/browse">Continue Shopping</Link></Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-3">
              {cart.map((item) => (
                <Card key={item.id} className="p-4 flex gap-4">
                  <div className="h-20 w-20 bg-secondary/30 rounded-xl flex items-center justify-center text-3xl shrink-0">{item.emoji}</div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-muted-foreground">{item.vendor}</p>
                    <h3 className="text-sm font-medium">{item.title}</h3>
                    <p className="text-sm font-bold mt-1">₹{item.price.toLocaleString()}</p>
                    <div className="flex items-center gap-3 mt-2">
                      <div className="flex items-center border border-border rounded-lg">
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => updateQty(item.id, -1)}><Minus className="h-3 w-3" /></Button>
                        <span className="w-8 text-center text-xs font-medium">{item.qty}</span>
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => updateQty(item.id, 1)}><Plus className="h-3 w-3" /></Button>
                      </div>
                      <Button variant="ghost" size="sm" className="text-destructive h-7 px-2" onClick={() => removeItem(item.id)}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                  <p className="text-sm font-bold shrink-0">₹{(item.price * item.qty).toLocaleString()}</p>
                </Card>
              ))}
            </div>

            <div>
              <Card className="p-4 space-y-4">
                <div>
                  <label className="text-xs font-medium flex items-center gap-1 mb-1.5"><Tag className="h-3 w-3" /> Coupon Code</label>
                  <div className="flex gap-2">
                    <Input placeholder="Enter code" value={coupon} onChange={(e) => setCoupon(e.target.value.toUpperCase())} className="h-8 text-xs" disabled={couponApplied} />
                    <Button size="sm" variant="secondary" className="h-8" onClick={applyCoupon} disabled={couponApplied}>
                      {couponApplied ? '✓' : 'Apply'}
                    </Button>
                  </div>
                </div>
                <div>
                  <label className="text-xs font-medium flex items-center gap-1 mb-1.5"><Coins className="h-3 w-3" /> Use Points ({walletPoints.toLocaleString()} available)</label>
                  <Input type="number" placeholder="0" value={pointsUsed || ""} onChange={(e) => setPointsUsed(Math.min(Number(e.target.value), maxPoints))} className="h-8 text-xs" />
                  <p className="text-[10px] text-muted-foreground mt-0.5">Max redeemable: {maxPoints} points</p>
                </div>
                <Separator />
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between"><span className="text-muted-foreground">Subtotal</span><span>₹{subtotal.toLocaleString()}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Tax</span><span>₹{tax.toLocaleString()}</span></div>
                  {discount > 0 && <div className="flex justify-between text-success"><span>Coupon Discount</span><span>-₹{discount.toLocaleString()}</span></div>}
                  {pointsUsed > 0 && <div className="flex justify-between text-success"><span>Points Redeemed</span><span>-₹{pointsUsed}</span></div>}
                  <Separator />
                  <div className="flex justify-between font-bold text-base"><span>Total</span><span>₹{total.toLocaleString()}</span></div>
                </div>
                <Button className="w-full" onClick={placeOrder} disabled={placing}>
                  {placing ? <div className="h-4 w-4 rounded-full border-2 border-primary-foreground border-t-transparent animate-spin" /> : `Place Order • ₹${total.toLocaleString()}`}
                </Button>
                <p className="text-[10px] text-center text-muted-foreground">
                  Order placed at {new Date().toLocaleString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                </p>
              </Card>
            </div>
          </div>
        )}
      </div>
    </CustomerLayout>
  );
}
