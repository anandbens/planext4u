import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/lib/auth";
import { Minus, Plus, Trash2, Tag, ShoppingBag, ChevronLeft, Share2, ChevronDown, ChevronRight, Truck, Clock, Save } from "lucide-react";
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
import { format, addDays, startOfWeek, addWeeks, isSameDay } from "date-fns";

const TIME_SLOTS = [
  { id: "morning", label: "Morning 9 - 11 AM" },
  { id: "afternoon", label: "Afternoon 12 - 3 PM" },
  { id: "evening", label: "Evening 4-6 PM" },
];

export default function CustomerCartPage() {
  const navigate = useNavigate();
  const { customerUser } = useAuth();
  const customerId = customerUser?.customer_id || customerUser?.id || 'USR-001';
  const [cart, setCart] = useState<CartItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [placing, setPlacing] = useState(false);
  const [coupon, setCoupon] = useState("");
  const [couponApplied, setCouponApplied] = useState(false);
  const [pointsUsed, setPointsUsed] = useState(0);
  const [walletPoints, setWalletPoints] = useState(0);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedTimeSlot, setSelectedTimeSlot] = useState("");
  const [calendarWeekOffset, setCalendarWeekOffset] = useState(0);
  const [deliveryAddress] = useState("P4U Complex - 605001");

  useEffect(() => {
    Promise.all([api.getCart(), api.getCustomerProfile(customerId)]).then(([cartItems, profile]) => {
      setCart(cartItems);
      setWalletPoints(profile?.wallet_points || 0);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [customerId]);

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
  const platformFee = 50;
  const tax = cart.reduce((sum, item) => sum + item.tax * item.qty, 0);
  const discount = couponApplied ? Math.round(subtotal * 0.1) : 0;
  const maxPoints = Math.min(walletPoints, cart.reduce((s, i) => s + i.maxPoints * i.qty, 0));
  const total = subtotal + platformFee - discount - pointsUsed;
  const savings = discount + pointsUsed;

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
      const result = await api.placeOrder(cart, customerId, pointsUsed, discount);
      await api.clearCart();
      toast.success(`${result.orders.length} order(s) placed successfully!`);
      navigate('/app/orders');
    } catch { toast.error("Failed to place order"); }
    finally { setPlacing(false); }
  };

  // Calendar logic
  const today = new Date();
  const weekStart = addDays(startOfWeek(today, { weekStartsOn: 5 }), calendarWeekOffset * 7);
  const calendarDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  const currentMonth = format(calendarDays[3], "MMMM");

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

      <div className="max-w-5xl mx-auto px-4 py-4 pb-28 md:pb-6">
        {cart.length === 0 ? (
          <div className="text-center py-16">
            <ShoppingBag className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-lg font-medium">Your cart is empty</p>
            <p className="text-sm text-muted-foreground mt-1">Browse products and add items to your cart</p>
            <Button asChild className="mt-4"><Link to="/app/browse">Continue Shopping</Link></Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Left Column - Cart Items + Delivery */}
            <div className="md:col-span-2 space-y-4">
              {/* Breadcrumb */}
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <Link to="/app" className="hover:text-foreground">Home</Link>
                <ChevronRight className="h-3 w-3" />
                <Link to="/app/browse" className="hover:text-foreground">Shop</Link>
                <ChevronRight className="h-3 w-3" />
                <span className="text-foreground font-medium">Cart</span>
              </div>

              {/* Tab Navigation */}
              <Tabs defaultValue="shop">
                <TabsList className="w-full">
                  <TabsTrigger value="shop" className="flex-1">Shop</TabsTrigger>
                  <TabsTrigger value="services" className="flex-1">Services</TabsTrigger>
                  <TabsTrigger value="booking" className="flex-1">Booking</TabsTrigger>
                </TabsList>
                <TabsContent value="shop">
                  {/* Delivery Address */}
                  <Card className="p-3 mt-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Delivered To: <strong>{deliveryAddress}</strong></span>
                      <Button variant="outline" size="sm" className="text-xs h-8">Change</Button>
                    </div>
                  </Card>

                  {/* Schedule Delivery */}
                  <Card className="p-4 mt-3">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="text-sm font-semibold">Schedule your Delivery</h3>
                      <span className="text-xs text-muted-foreground">Select your time to deliver</span>
                    </div>

                    {/* Calendar - like reference image */}
                    <div className="border border-border/50 rounded-xl p-4">
                      <p className="text-sm font-medium mb-3">When will you like your service?*</p>

                      {/* Month nav */}
                      <div className="flex items-center justify-end gap-2 mb-3">
                        <button onClick={() => setCalendarWeekOffset(p => p - 1)} className="text-xs text-primary hover:underline">← {format(addDays(weekStart, -7), "MMMM")}</button>
                        <button onClick={() => setCalendarWeekOffset(p => p + 1)} className="text-xs text-primary hover:underline">{format(addDays(weekStart, 14), "MMMM")} →</button>
                      </div>

                      {/* Week header */}
                      <div className="text-center mb-2">
                        <span className="font-semibold text-sm">{currentMonth}</span>
                      </div>

                      {/* Day grid */}
                      <div className="grid grid-cols-7 gap-1 mb-4">
                        {["Fri", "Sat", "Sun", "Mon", "Tue", "Wed", "Thu"].map(d => (
                          <div key={d} className="text-center text-xs text-muted-foreground font-medium py-1">{d}</div>
                        ))}
                        {calendarDays.map((day) => {
                          const isToday = isSameDay(day, today);
                          const isSelected = selectedDate && isSameDay(day, selectedDate);
                          const isPast = day < today && !isToday;
                          return (
                            <button key={day.toISOString()} disabled={isPast}
                              onClick={() => setSelectedDate(day)}
                              className={`py-2 rounded-lg text-sm font-medium transition-colors
                                ${isPast ? 'text-muted-foreground/30 cursor-not-allowed' : ''}
                                ${isSelected ? 'bg-primary text-primary-foreground' : ''}
                                ${isToday && !isSelected ? 'text-primary font-bold' : ''}
                                ${!isPast && !isSelected ? 'hover:bg-accent' : ''}`}>
                              {format(day, "d")}
                            </button>
                          );
                        })}
                      </div>

                      {/* Time slots */}
                      <div className="grid grid-cols-3 gap-2">
                        {TIME_SLOTS.map(slot => (
                          <button key={slot.id} onClick={() => { setSelectedTimeSlot(slot.id); toast.success(`Delivery scheduled: ${slot.label}`); }}
                            className={`px-3 py-2.5 rounded-xl text-xs font-medium transition-colors
                              ${selectedTimeSlot === slot.id ? 'bg-primary text-primary-foreground' : 'border border-border hover:border-primary/30'}`}>
                            {slot.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  </Card>

                  {/* Cart Items */}
                  <div className="space-y-3 mt-3">
                    {cart.map((item) => {
                      const discountPct = item.discount > 0 ? Math.round(item.discount / (item.price + item.discount) * 100) : 0;
                      return (
                        <Card key={item.id} className="p-4">
                          <div className="flex gap-3">
                            <div className="h-20 w-20 bg-secondary/30 rounded-xl flex items-center justify-center shrink-0 overflow-hidden">
                              {item.image ? (
                                <img src={item.image} alt={item.title} className="w-full h-full object-cover" />
                              ) : (
                                <span className="text-3xl">{item.emoji}</span>
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-start justify-between">
                                <div>
                                  <h3 className="text-sm font-semibold leading-tight">{item.title}</h3>
                                  <p className="text-[10px] text-muted-foreground mt-0.5">Black Strap, Free Size</p>
                                  <p className="text-[10px] text-muted-foreground">Vendor: {item.vendor}</p>
                                </div>
                                <div className="text-right">
                                  <p className="text-xs text-primary flex items-center gap-0.5">
                                    <Clock className="h-2.5 w-2.5" /> Delivery in 30 Mins
                                  </p>
                                </div>
                              </div>
                              <div className="flex items-center gap-2 mt-1.5">
                                {item.discount > 0 && <span className="text-[10px] text-muted-foreground line-through">₹{(item.price + item.discount).toLocaleString()}</span>}
                                <span className="text-sm font-bold">₹{item.price.toLocaleString()}</span>
                                {discountPct > 0 && <span className="text-[10px] text-success font-medium">{discountPct}% Off</span>}
                              </div>
                              <p className="text-[10px] text-success mt-0.5">Eligible for FREE Shipping</p>
                              <div className="flex items-center gap-3 mt-2">
                                <div className="flex items-center gap-1 border border-border rounded-lg">
                                  <button onClick={() => updateQty(item.id, -1)} className="h-7 w-7 flex items-center justify-center hover:bg-accent rounded-l-lg"><Minus className="h-3 w-3" /></button>
                                  <span className="text-sm font-medium w-6 text-center">{item.qty}</span>
                                  <button onClick={() => updateQty(item.id, 1)} className="h-7 w-7 flex items-center justify-center hover:bg-accent rounded-r-lg"><Plus className="h-3 w-3" /></button>
                                </div>
                                <button className="text-xs font-medium text-muted-foreground hover:text-foreground flex items-center gap-1">
                                  <Save className="h-3 w-3" /> SAVE FOR LATER
                                </button>
                                <button onClick={() => removeItem(item.id)} className="text-xs font-medium text-destructive hover:underline">REMOVE</button>
                              </div>
                            </div>
                          </div>
                        </Card>
                      );
                    })}
                  </div>
                </TabsContent>
                <TabsContent value="services"><p className="text-sm text-muted-foreground text-center py-8">No service bookings in cart</p></TabsContent>
                <TabsContent value="booking"><p className="text-sm text-muted-foreground text-center py-8">No bookings in cart</p></TabsContent>
              </Tabs>
            </div>

            {/* Right Column - Price Summary */}
            <div className="space-y-4">
              {/* Redeem Points */}
              <Card className="p-4">
                <h3 className="text-sm font-semibold mb-2">Redeem Points</h3>
                <div className="flex gap-2">
                  <Input type="number" placeholder="Enter Points" value={pointsUsed || ""} onChange={(e) => setPointsUsed(Math.min(Number(e.target.value), maxPoints))} className="h-10 flex-1" />
                  <Button className="h-10 px-6" onClick={applyPoints}>Apply</Button>
                </div>
                <p className="text-[10px] text-success mt-1.5">Your have total reward points {walletPoints.toLocaleString()}</p>
              </Card>

              {/* Coupon */}
              <Card className="p-4">
                <div className="flex items-center gap-2">
                  <Tag className="h-4 w-4 text-muted-foreground" />
                  <Input placeholder="Enter coupon code" value={coupon} onChange={(e) => setCoupon(e.target.value.toUpperCase())} className="h-10 flex-1" disabled={couponApplied} />
                  <Button variant="secondary" className="h-10" onClick={applyCoupon} disabled={couponApplied}>
                    {couponApplied ? '✓' : 'Apply'}
                  </Button>
                </div>
              </Card>

              {/* Price Details */}
              <Card className="p-4">
                <h3 className="text-sm font-semibold mb-3">Price details</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Price ({cart.reduce((s, i) => s + i.qty, 0)} item)</span>
                    <span>₹{subtotal.toLocaleString()}.00</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Platform Fee</span>
                    <span>₹{platformFee}</span>
                  </div>
                  {pointsUsed > 0 && (
                    <div className="flex justify-between text-success">
                      <span>Redeem Points</span>
                      <span>- ₹{pointsUsed.toLocaleString()}</span>
                    </div>
                  )}
                  {discount > 0 && (
                    <div className="flex justify-between text-success">
                      <span>Coupon Discount</span>
                      <span>- ₹{discount.toLocaleString()}</span>
                    </div>
                  )}
                  <Separator />
                  <div className="flex justify-between font-bold">
                    <span>Total Amount</span>
                    <span>₹{total.toLocaleString()}</span>
                  </div>
                </div>
                {savings > 0 && (
                  <p className="text-xs text-success mt-2 font-medium">You will save ₹{savings.toLocaleString()} on this order</p>
                )}

                {/* Desktop Proceed Button */}
                <Button className="w-full h-12 mt-4 text-base font-semibold" onClick={placeOrder} disabled={placing}>
                  {placing ? "Placing..." : "Proceed Payment"}
                </Button>
              </Card>
            </div>
          </div>
        )}
      </div>

      {/* Sticky Bottom - Mobile */}
      {cart.length > 0 && (
        <div className="fixed bottom-0 left-0 right-0 z-40 bg-card border-t border-border/50 px-4 py-3 md:hidden safe-area-bottom">
          <Button className="w-full h-12 rounded-xl text-base font-semibold" onClick={placeOrder} disabled={placing}>
            {placing ? <div className="h-4 w-4 rounded-full border-2 border-primary-foreground border-t-transparent animate-spin" /> : "Proceed Payment"}
          </Button>
        </div>
      )}
    </CustomerLayout>
  );
}
