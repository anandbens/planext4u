import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Minus, Plus, Trash2, Tag, Coins, ShoppingBag, ChevronLeft, Share2, CalendarDays, Clock, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { CustomerLayout } from "@/components/customer/CustomerLayout";
import { toast } from "sonner";
import { api, CartItem } from "@/lib/api";

const DELIVERY_SLOTS = [
  { id: "1", label: "Today, 2:00 PM - 4:00 PM", date: "Today" },
  { id: "2", label: "Today, 4:00 PM - 6:00 PM", date: "Today" },
  { id: "3", label: "Today, 6:00 PM - 8:00 PM", date: "Today" },
  { id: "4", label: "Tomorrow, 10:00 AM - 12:00 PM", date: "Tomorrow" },
  { id: "5", label: "Tomorrow, 2:00 PM - 4:00 PM", date: "Tomorrow" },
  { id: "6", label: "Schedule for later", date: "Custom" },
];

export default function CustomerCartPage() {
  const navigate = useNavigate();
  const [cart, setCart] = useState<CartItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [placing, setPlacing] = useState(false);
  const [coupon, setCoupon] = useState("");
  const [couponApplied, setCouponApplied] = useState(false);
  const [pointsUsed, setPointsUsed] = useState(0);
  const [walletPoints, setWalletPoints] = useState(0);
  const [selectedSlot, setSelectedSlot] = useState("");
  const [showSlots, setShowSlots] = useState(false);
  const [billOpen, setBillOpen] = useState(false);
  const [deliveryAddress] = useState("No11a, Pandiyan Street, Sengun...");

  useEffect(() => {
    Promise.all([api.getCart(), api.getCustomerProfile('USR-001')]).then(([cartItems, profile]) => {
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
    if (coupon === "WELCOME") { setCouponApplied(true); toast.success("Coupon applied! 10% discount"); }
    else { toast.error("Invalid coupon code"); }
  };

  const applyPoints = () => {
    if (pointsUsed > maxPoints) { setPointsUsed(maxPoints); }
    toast.success(`${pointsUsed} points applied`);
  };

  const placeOrder = async () => {
    if (cart.length === 0) return;
    setPlacing(true);
    try {
      const result = await api.placeOrder(cart, 'USR-001', pointsUsed, discount);
      await api.clearCart();
      toast.success(`${result.orders.length} order(s) placed successfully!`);
      navigate('/app/orders');
    } catch { toast.error("Failed to place order"); }
    finally { setPlacing(false); }
  };

  if (loading) {
    return <CustomerLayout><div className="flex items-center justify-center h-64"><div className="h-8 w-8 rounded-full border-2 border-primary border-t-transparent animate-spin" /></div></CustomerLayout>;
  }

  return (
    <CustomerLayout>
      {/* Mobile Header */}
      <div className="sticky top-0 z-30 bg-card/95 backdrop-blur-md border-b border-border/50 px-4 py-3 flex items-center justify-between md:hidden">
        <button onClick={() => navigate(-1)} className="h-8 w-8 rounded-full bg-secondary flex items-center justify-center">
          <ChevronLeft className="h-4 w-4" />
        </button>
        <h1 className="text-base font-semibold">Cart</h1>
        <button className="text-primary text-xs font-medium flex items-center gap-1">
          <Share2 className="h-3.5 w-3.5" /> Share
        </button>
      </div>

      <div className="max-w-3xl mx-auto px-4 py-4 pb-28 md:pb-6">
        {cart.length === 0 ? (
          <div className="text-center py-16">
            <ShoppingBag className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-lg font-medium">Your cart is empty</p>
            <p className="text-sm text-muted-foreground mt-1">Browse products and add items to your cart</p>
            <Button asChild className="mt-4"><Link to="/app/browse">Continue Shopping</Link></Button>
          </div>
        ) : (
          <>
            {/* Tab Navigation - Shop/Services/Booking like Image 11 */}
            <Tabs defaultValue="shop" className="mb-4">
              <TabsList className="w-full">
                <TabsTrigger value="shop" className="flex-1">Shop</TabsTrigger>
                <TabsTrigger value="services" className="flex-1">Services</TabsTrigger>
                <TabsTrigger value="booking" className="flex-1">Booking</TabsTrigger>
              </TabsList>
              <TabsContent value="shop">
                <div className="space-y-3 mt-3">
                  {cart.map((item) => (
                    <Card key={item.id} className="p-3">
                      <div className="flex gap-3">
                        <div className="h-20 w-20 bg-secondary/30 rounded-xl flex items-center justify-center text-3xl shrink-0">{item.emoji}</div>
                        <div className="flex-1 min-w-0">
                          <h3 className="text-sm font-semibold leading-tight">{item.title}</h3>
                          <p className="text-[10px] text-muted-foreground mt-0.5">Seller: {item.vendor}</p>
                          <p className="text-[10px] text-primary flex items-center gap-0.5 mt-0.5">
                            <Clock className="h-2.5 w-2.5" /> Delivery in 30 Minutes
                          </p>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-sm font-bold">₹{item.price.toLocaleString()}</span>
                            {item.discount > 0 && (
                              <>
                                <span className="text-[10px] text-muted-foreground line-through">₹{(item.price + item.discount).toLocaleString()}</span>
                                <Badge className="bg-primary/10 text-primary border-0 text-[9px]">{Math.round(item.discount / item.price * 100)}% OFF</Badge>
                              </>
                            )}
                          </div>
                        </div>
                        <div className="flex flex-col items-end justify-between">
                          <div className="flex items-center gap-1">
                            <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => removeItem(item.id)}>
                              <Trash2 className="h-3 w-3" />
                            </Button>
                            <span className="text-sm font-medium w-6 text-center">{item.qty}</span>
                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => updateQty(item.id, 1)}>
                              <Plus className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              </TabsContent>
              <TabsContent value="services"><p className="text-sm text-muted-foreground text-center py-8">No service bookings in cart</p></TabsContent>
              <TabsContent value="booking"><p className="text-sm text-muted-foreground text-center py-8">No bookings in cart</p></TabsContent>
            </Tabs>

            {/* Schedule Delivery Slot */}
            <Card className="p-4 mt-4">
              <button onClick={() => setShowSlots(!showSlots)} className="w-full flex items-center justify-center gap-2 py-2 border border-border rounded-xl text-sm font-medium hover:bg-secondary/30 transition-colors">
                <CalendarDays className="h-4 w-4" />
                {selectedSlot ? DELIVERY_SLOTS.find(s => s.id === selectedSlot)?.label : "Schedule"}
              </button>
              {showSlots && (
                <div className="mt-3 space-y-2">
                  {DELIVERY_SLOTS.map(slot => (
                    <button key={slot.id} onClick={() => { setSelectedSlot(slot.id); setShowSlots(false); toast.success(`Delivery scheduled: ${slot.label}`); }}
                      className={`w-full text-left px-3 py-2.5 rounded-lg text-sm transition-colors ${selectedSlot === slot.id ? 'bg-primary/10 border border-primary/30 text-primary font-medium' : 'bg-secondary/30 hover:bg-secondary/50'}`}>
                      {slot.label}
                    </button>
                  ))}
                </div>
              )}
            </Card>

            {/* Redeem Points */}
            <Card className="p-4 mt-4">
              <h3 className="text-sm font-semibold mb-2">Redeem Points</h3>
              <div className="flex gap-2">
                <Input type="number" placeholder="0" value={pointsUsed || ""} onChange={(e) => setPointsUsed(Math.min(Number(e.target.value), maxPoints))} className="h-10 flex-1" />
                <Button variant="default" className="h-10 px-6" onClick={applyPoints}>Apply</Button>
              </div>
              <p className="text-[10px] text-success mt-1.5">Your have total reward points {walletPoints.toLocaleString()}</p>
            </Card>

            {/* Coupon */}
            <Card className="p-4 mt-4">
              <div className="flex items-center gap-2">
                <Tag className="h-4 w-4 text-muted-foreground" />
                <Input placeholder="Enter coupon code" value={coupon} onChange={(e) => setCoupon(e.target.value.toUpperCase())} className="h-10 flex-1" disabled={couponApplied} />
                <Button variant="secondary" className="h-10" onClick={applyCoupon} disabled={couponApplied}>
                  {couponApplied ? '✓ Applied' : 'Apply'}
                </Button>
              </div>
            </Card>

            {/* Bill Details - Collapsible */}
            <Collapsible open={billOpen} onOpenChange={setBillOpen}>
              <CollapsibleTrigger asChild>
                <Card className="p-4 mt-4 cursor-pointer">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-semibold">Bill Details</h3>
                    <ChevronDown className={`h-4 w-4 transition-transform ${billOpen ? 'rotate-180' : ''}`} />
                  </div>
                </Card>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <Card className="p-4 -mt-1 rounded-t-none border-t-0 space-y-2 text-sm">
                  <div className="flex justify-between"><span className="text-muted-foreground">Subtotal</span><span>₹{subtotal.toLocaleString()}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Tax</span><span>₹{tax.toLocaleString()}</span></div>
                  {discount > 0 && <div className="flex justify-between text-success"><span>Coupon Discount</span><span>-₹{discount.toLocaleString()}</span></div>}
                  {pointsUsed > 0 && <div className="flex justify-between text-success"><span>Points Redeemed</span><span>-₹{pointsUsed}</span></div>}
                </Card>
              </CollapsibleContent>
            </Collapsible>

            {/* Total */}
            <Card className="p-4 mt-4">
              <div className="flex justify-between items-center">
                <span className="text-base font-bold">Total Amount</span>
                <span className="text-lg font-bold">₹{total.toLocaleString()}.00</span>
              </div>
            </Card>

            {/* Delivery Address */}
            <div className="flex items-center gap-2 mt-4 px-1">
              <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                <Truck className="h-4 w-4 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs"><span className="font-semibold">Delivered :</span> <span className="text-muted-foreground truncate">{deliveryAddress}</span></p>
              </div>
              <button className="text-primary text-xs font-medium shrink-0">Change</button>
            </div>
          </>
        )}
      </div>

      {/* Sticky Bottom - Proceed Payment */}
      {cart.length > 0 && (
        <div className="fixed bottom-0 left-0 right-0 z-40 bg-card border-t border-border/50 px-4 py-3 md:hidden safe-area-bottom">
          <Button className="w-full h-12 rounded-xl text-base font-semibold" onClick={placeOrder} disabled={placing}>
            {placing ? <div className="h-4 w-4 rounded-full border-2 border-primary-foreground border-t-transparent animate-spin" /> : "Proceed Payment"}
          </Button>
        </div>
      )}

      {/* Desktop checkout button */}
      {cart.length > 0 && (
        <div className="hidden md:block max-w-3xl mx-auto px-4 pb-6">
          <Button className="w-full h-12 text-base" onClick={placeOrder} disabled={placing}>
            {placing ? "Placing..." : `Place Order • ₹${total.toLocaleString()}`}
          </Button>
        </div>
      )}
    </CustomerLayout>
  );
}
