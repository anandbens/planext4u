import { useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Minus, Plus, Trash2, Tag, Coins } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";

const initialCart = [
  { id: 1, title: "Wireless Headphones Pro", price: 2499, qty: 1, vendor: "TechMart", emoji: "🎧", maxPoints: 200 },
  { id: 2, title: "Cotton T-Shirt Pack", price: 899, qty: 2, vendor: "FashionHub", emoji: "👕", maxPoints: 50 },
];

export default function CustomerCartPage() {
  const [cart, setCart] = useState(initialCart);
  const [coupon, setCoupon] = useState("");
  const [pointsUsed, setPointsUsed] = useState(0);
  const walletPoints = 1250;

  const updateQty = (id: number, delta: number) => {
    setCart((prev) => prev.map((item) => item.id === id ? { ...item, qty: Math.max(1, item.qty + delta) } : item));
  };
  const removeItem = (id: number) => {
    setCart((prev) => prev.filter((item) => item.id !== id));
    toast.info("Item removed from cart");
  };

  const subtotal = cart.reduce((sum, item) => sum + item.price * item.qty, 0);
  const tax = Math.round(subtotal * 0.18);
  const discount = coupon === "WELCOME" ? Math.round(subtotal * 0.1) : 0;
  const total = subtotal + tax - discount - pointsUsed;

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-30 bg-card/95 backdrop-blur-sm border-b border-border/50">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center gap-3">
          <Button variant="ghost" size="icon" asChild><Link to="/app"><ArrowLeft className="h-5 w-5" /></Link></Button>
          <h1 className="font-semibold">Cart ({cart.length} items)</h1>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-6">
        {cart.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-lg font-medium">Your cart is empty</p>
            <Button asChild className="mt-4"><Link to="/app">Continue Shopping</Link></Button>
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
                {/* Coupon */}
                <div>
                  <label className="text-xs font-medium flex items-center gap-1 mb-1.5"><Tag className="h-3 w-3" /> Coupon Code</label>
                  <div className="flex gap-2">
                    <Input placeholder="Enter code" value={coupon} onChange={(e) => setCoupon(e.target.value.toUpperCase())} className="h-8 text-xs" />
                    <Button size="sm" variant="secondary" className="h-8" onClick={() => coupon === "WELCOME" ? toast.success("Coupon applied!") : toast.error("Invalid coupon")}>Apply</Button>
                  </div>
                </div>

                {/* Points */}
                <div>
                  <label className="text-xs font-medium flex items-center gap-1 mb-1.5"><Coins className="h-3 w-3" /> Use Points ({walletPoints} available)</label>
                  <Input type="number" placeholder="0" value={pointsUsed || ""} onChange={(e) => setPointsUsed(Math.min(Number(e.target.value), walletPoints, 250))} className="h-8 text-xs" />
                </div>

                <Separator />

                <div className="space-y-2 text-sm">
                  <div className="flex justify-between"><span className="text-muted-foreground">Subtotal</span><span>₹{subtotal.toLocaleString()}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Tax (18%)</span><span>₹{tax.toLocaleString()}</span></div>
                  {discount > 0 && <div className="flex justify-between text-success"><span>Discount</span><span>-₹{discount.toLocaleString()}</span></div>}
                  {pointsUsed > 0 && <div className="flex justify-between text-success"><span>Points Used</span><span>-₹{pointsUsed}</span></div>}
                  <Separator />
                  <div className="flex justify-between font-bold text-base"><span>Total</span><span>₹{total.toLocaleString()}</span></div>
                </div>

                <Button className="w-full" onClick={() => toast.success("Order placed successfully!")}>Place Order</Button>
              </Card>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
