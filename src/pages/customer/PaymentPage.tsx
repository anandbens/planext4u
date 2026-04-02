import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { CustomerLayout } from "@/components/customer/CustomerLayout";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { ArrowLeft, CreditCard, Smartphone, Building2, Wallet, Truck, CheckCircle, XCircle, Copy, Share2, ShoppingBag } from "lucide-react";
import { api } from "@/lib/api";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { motion, AnimatePresence } from "framer-motion";
import { format, addDays } from "date-fns";

type PaymentMethod = 'upi' | 'card' | 'netbanking' | 'cod' | 'wallet';
type PaymentState = 'select' | 'processing' | 'success' | 'failure';

const UPI_APPS = [
  { name: "GPay", icon: "💳" },
  { name: "PhonePe", icon: "📱" },
  { name: "Paytm", icon: "💰" },
  { name: "BHIM", icon: "🏦" },
];

const BANKS = ["State Bank of India", "HDFC Bank", "ICICI Bank", "Axis Bank", "Punjab National Bank", "Bank of Baroda", "Kotak Mahindra", "Yes Bank", "IndusInd Bank", "Union Bank"];

export default function PaymentPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { customerUser } = useAuth();
  const customerId = customerUser?.customer_id || customerUser?.id || 'USR-001';

  const { cart, subtotal, platformFee, discount, pointsUsed, total, selectedAddress } = location.state || {};

  const [method, setMethod] = useState<PaymentMethod>('upi');
  const [upiId, setUpiId] = useState('');
  const [cardNumber, setCardNumber] = useState('');
  const [cardName, setCardName] = useState('');
  const [cardExpiry, setCardExpiry] = useState('');
  const [cardCvv, setCardCvv] = useState('');
  const [saveCard, setSaveCard] = useState(false);
  const [selectedBank, setSelectedBank] = useState('');
  const [useWallet, setUseWallet] = useState(false);
  const [walletBalance] = useState(0);
  const [paymentState, setPaymentState] = useState<PaymentState>('select');
  const [orderId, setOrderId] = useState('');
  const [orderItems, setOrderItems] = useState<any[]>([]);

  useEffect(() => {
    if (!cart || cart.length === 0) navigate('/app/cart');
  }, [cart, navigate]);

  const formatCardNumber = (val: string) => {
    const nums = val.replace(/\D/g, '').slice(0, 16);
    return nums.replace(/(.{4})/g, '$1 ').trim();
  };

  const formatExpiry = (val: string) => {
    const nums = val.replace(/\D/g, '').slice(0, 4);
    if (nums.length > 2) return nums.slice(0, 2) + '/' + nums.slice(2);
    return nums;
  };

  const isMethodValid = () => {
    switch (method) {
      case 'upi': return upiId.includes('@');
      case 'card': return cardNumber.replace(/\s/g, '').length === 16 && cardName.length > 1 && cardExpiry.length === 5 && cardCvv.length >= 3;
      case 'netbanking': return selectedBank.length > 0;
      case 'cod': return true;
      case 'wallet': return walletBalance >= total;
      default: return false;
    }
  };

  const loadRazorpayScript = (): Promise<boolean> => {
    return new Promise((resolve) => {
      if ((window as any).Razorpay) { resolve(true); return; }
      const script = document.createElement("script");
      script.src = "https://checkout.razorpay.com/v1/checkout.js";
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });
  };

  const handlePay = async () => {
    if (!isMethodValid()) { toast.error("Please complete payment details"); return; }

    if (method === 'cod') {
      // COD - create order directly
      setPaymentState('processing');
      await createOrder('cod', null);
      return;
    }

    setPaymentState('processing');

    try {
      // Load Razorpay script
      const loaded = await loadRazorpayScript();
      if (!loaded) { toast.error("Failed to load payment gateway"); setPaymentState('select'); return; }

      // Create Razorpay order via edge function
      const { data, error } = await supabase.functions.invoke("razorpay", {
        body: { action: "create_order", amount: total, currency: "INR" },
      });

      if (error || !data?.order_id) {
        toast.error("Failed to create payment order");
        setPaymentState('select');
        return;
      }

      setPaymentState('select'); // Hide processing while Razorpay modal is open

      const options = {
        key: data.key_id,
        amount: data.amount,
        currency: data.currency,
        name: "Planext4u",
        description: `Order - ${cart.length} item(s)`,
        order_id: data.order_id,
        handler: async (response: any) => {
          setPaymentState('processing');
          // Verify payment
          const { data: verifyData, error: verifyError } = await supabase.functions.invoke("razorpay", {
            body: {
              action: "verify_payment",
              order_id: data.order_id,
              payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
            },
          });

          if (verifyError || !verifyData?.verified) {
            setPaymentState('failure');
            return;
          }

          // Payment verified - create order
          await createOrder(method, response.razorpay_payment_id);
        },
        prefill: {
          name: customerUser?.name || "",
          email: customerUser?.email || "",
          contact: customerUser?.mobile || "",
        },
        theme: { color: "#0d9488" },
        modal: {
          ondismiss: () => {
            setPaymentState('select');
            toast.info("Payment cancelled");
          },
        },
      };

      const rzp = new (window as any).Razorpay(options);
      rzp.on("payment.failed", () => {
        setPaymentState('failure');
      });
      rzp.open();
    } catch (err: any) {
      console.error("Payment error:", err);
      toast.error("Payment failed: " + (err.message || "Unknown error"));
      setPaymentState('select');
    }
  };

  const createOrder = async (payMethod: string, paymentId: string | null) => {
    try {
      const dateStr = format(new Date(), 'yyyyMMdd');
      const rand = String(Math.floor(Math.random() * 99999)).padStart(5, '0');
      const newOrderId = `P4U-${dateStr}-${rand}`;

      const vendorGroups: Record<string, any[]> = {};
      (cart || []).forEach((item: any) => {
        const vid = item.vendor_id || item.vendor || 'VND-001';
        if (!vendorGroups[vid]) vendorGroups[vid] = [];
        vendorGroups[vid].push(item);
      });

      const orderPromises = Object.entries(vendorGroups).map(async ([vendorId, items]) => {
        const orderTotal = items.reduce((s: number, i: any) => s + i.price * i.qty, 0);
        const orderData = {
          id: newOrderId + '-' + vendorId.slice(-3),
          customer_id: customerId,
          customer_name: customerUser?.name || 'Customer',
          vendor_id: vendorId,
          vendor_name: items[0]?.vendor || 'Vendor',
          items: items.map((i: any) => ({ id: i.id, title: i.title, qty: i.qty, price: i.price, image: i.image })),
          subtotal: orderTotal,
          tax: items.reduce((s: number, i: any) => s + (i.tax || 0) * i.qty, 0),
          discount: discount || 0,
          points_used: pointsUsed || 0,
          total: orderTotal,
          status: payMethod === 'cod' ? 'placed' : 'confirmed',
        };
        await supabase.from('orders').insert(orderData as any);
        return orderData;
      });

      await Promise.all(orderPromises);
      await api.clearCart();
      setOrderId(newOrderId);
      setOrderItems(cart || []);
      setPaymentState('success');
    } catch (err) {
      console.error('Order creation failed:', err);
      setPaymentState('failure');
    }
  };

  if (!cart || cart.length === 0) return null;

  // Processing overlay
  if (paymentState === 'processing') {
    return (
      <div className="fixed inset-0 z-[200] bg-background flex flex-col items-center justify-center">
        <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}
          className="h-16 w-16 rounded-full border-4 border-primary border-t-transparent mb-6" />
        <h2 className="text-xl font-bold mb-2">Processing your payment...</h2>
        <p className="text-sm text-muted-foreground">Please do not press back or close the app</p>
      </div>
    );
  }

  // Success page
  if (paymentState === 'success') {
    const estDelivery = format(addDays(new Date(), 5), 'dd MMM yyyy');
    return (
      <CustomerLayout>
        <div className="max-w-lg mx-auto py-12 px-4 text-center">
          <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', stiffness: 200 }}
            className="h-24 w-24 rounded-full bg-success/10 flex items-center justify-center mx-auto mb-6">
            <CheckCircle className="h-14 w-14 text-success" />
          </motion.div>
          <h2 className="text-2xl font-bold mb-2">Order Placed Successfully!</h2>
          <div className="flex items-center justify-center gap-2 mb-4">
            <span className="text-sm text-muted-foreground">Order ID:</span>
            <span className="font-mono font-bold text-sm">{orderId}</span>
            <button onClick={() => { navigator.clipboard.writeText(orderId); toast.success("Copied!"); }}>
              <Copy className="h-3.5 w-3.5 text-muted-foreground" />
            </button>
          </div>
          <p className="text-sm text-muted-foreground mb-6">Estimated delivery by <strong>{estDelivery}</strong></p>

          <Card className="p-4 text-left mb-4">
            <h3 className="text-sm font-semibold mb-3">Items Summary</h3>
            {orderItems.map((item: any, i: number) => (
              <div key={i} className="flex items-center gap-3 mb-2">
                <div className="h-12 w-12 bg-secondary/30 rounded-lg overflow-hidden shrink-0">
                  {item.image ? <img src={item.image} className="w-full h-full object-cover" /> : <span className="flex items-center justify-center h-full text-lg">{item.emoji}</span>}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium truncate">{item.title}</p>
                  <p className="text-[10px] text-muted-foreground">Qty: {item.qty}</p>
                </div>
                <p className="text-xs font-bold">₹{(item.price * item.qty).toLocaleString()}</p>
              </div>
            ))}
            <Separator className="my-3" />
            <div className="flex justify-between text-sm font-bold">
              <span>Total Paid</span>
              <span>₹{total?.toLocaleString()}</span>
            </div>
          </Card>

          {selectedAddress && (
            <Card className="p-4 text-left mb-4">
              <h3 className="text-sm font-semibold mb-1">Delivery Address</h3>
              <p className="text-xs text-muted-foreground">{selectedAddress.address_line}, {selectedAddress.city} - {selectedAddress.pincode}</p>
            </Card>
          )}

          <Card className="p-4 text-left mb-6">
            <h3 className="text-sm font-semibold mb-1">Payment</h3>
            <p className="text-xs text-muted-foreground capitalize">{method === 'upi' ? `UPI (${upiId})` : method === 'card' ? 'Credit/Debit Card' : method === 'netbanking' ? `Net Banking (${selectedBank})` : method === 'cod' ? 'Cash on Delivery' : 'P4U Wallet'}</p>
            <p className="text-xs font-bold mt-1">₹{total?.toLocaleString()}</p>
          </Card>

          <div className="flex flex-col gap-3">
            <Button className="w-full h-12" onClick={() => navigate('/app/orders')}>
              <ShoppingBag className="h-4 w-4 mr-2" /> Track Order
            </Button>
            <Button variant="outline" className="w-full h-11" onClick={() => navigate('/app/browse')}>Continue Shopping</Button>
            <Button variant="ghost" className="w-full h-10 text-xs" onClick={() => {
              const text = `🎉 Just ordered on P4U! Order ${orderId}`;
              window.open(`https://wa.me/?text=${encodeURIComponent(text)}`);
            }}>
              <Share2 className="h-4 w-4 mr-2" /> Share on WhatsApp
            </Button>
          </div>
        </div>
      </CustomerLayout>
    );
  }

  // Failure page
  if (paymentState === 'failure') {
    return (
      <CustomerLayout>
        <div className="max-w-lg mx-auto py-12 px-4 text-center">
          <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', stiffness: 200 }}
            className="h-24 w-24 rounded-full bg-destructive/10 flex items-center justify-center mx-auto mb-6">
            <XCircle className="h-14 w-14 text-destructive" />
          </motion.div>
          <h2 className="text-2xl font-bold mb-2">Payment Failed</h2>
          <p className="text-sm text-muted-foreground mb-8">Your payment could not be processed. Please try again or use a different payment method.</p>
          <div className="flex flex-col gap-3">
            <Button className="w-full h-12" onClick={() => setPaymentState('select')}>Retry Payment</Button>
            <Button variant="outline" className="w-full h-11" onClick={() => { setMethod('upi'); setPaymentState('select'); }}>Try Different Method</Button>
          </div>
        </div>
      </CustomerLayout>
    );
  }

  // Payment method selection page
  return (
    <CustomerLayout>
      <div className="max-w-3xl mx-auto px-4 py-6 pb-28 md:pb-8">
        <button onClick={() => navigate('/app/cart')} className="flex items-center gap-2 text-sm text-muted-foreground mb-4 hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> Back to Cart
        </button>

        <h1 className="text-xl font-bold mb-6">Payment</h1>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Left - Payment Methods */}
          <div className="md:col-span-2 space-y-4">
            {/* Order Summary Card */}
            <Card className="p-4">
              <h3 className="text-sm font-semibold mb-2">Order Summary</h3>
              <div className="flex items-center gap-2 text-sm">
                <ShoppingBag className="h-4 w-4 text-muted-foreground" />
                <span>{cart.reduce((s: number, i: any) => s + i.qty, 0)} item(s)</span>
                <span className="ml-auto font-bold">₹{total?.toLocaleString()}</span>
              </div>
            </Card>

            {/* Payment Methods */}
            <Card className="p-4">
              <h3 className="text-sm font-semibold mb-4">Select Payment Method</h3>
              <RadioGroup value={method} onValueChange={(v) => setMethod(v as PaymentMethod)} className="space-y-3">
                {/* UPI */}
                <div className={`border rounded-xl p-4 transition-colors ${method === 'upi' ? 'border-primary bg-primary/5' : 'border-border'}`}>
                  <div className="flex items-center gap-3">
                    <RadioGroupItem value="upi" id="upi" />
                    <Label htmlFor="upi" className="flex items-center gap-2 cursor-pointer flex-1">
                      <Smartphone className="h-5 w-5 text-primary" />
                      <span className="font-semibold text-sm">UPI</span>
                    </Label>
                  </div>
                  {method === 'upi' && (
                    <div className="mt-4 space-y-3 pl-7">
                      <Input placeholder="Enter UPI ID (e.g. name@upi)" value={upiId} onChange={e => setUpiId(e.target.value)} className="h-10" />
                      <div className="flex gap-2 flex-wrap">
                        {UPI_APPS.map(app => (
                          <button key={app.name} onClick={() => setUpiId(`user@${app.name.toLowerCase()}`)}
                            className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-border hover:bg-accent text-xs font-medium">
                            <span>{app.icon}</span> {app.name}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Card */}
                <div className={`border rounded-xl p-4 transition-colors ${method === 'card' ? 'border-primary bg-primary/5' : 'border-border'}`}>
                  <div className="flex items-center gap-3">
                    <RadioGroupItem value="card" id="card" />
                    <Label htmlFor="card" className="flex items-center gap-2 cursor-pointer flex-1">
                      <CreditCard className="h-5 w-5 text-primary" />
                      <span className="font-semibold text-sm">Credit / Debit Card</span>
                    </Label>
                  </div>
                  {method === 'card' && (
                    <div className="mt-4 space-y-3 pl-7">
                      <Input placeholder="Card Number" value={cardNumber} onChange={e => setCardNumber(formatCardNumber(e.target.value))} className="h-10 font-mono" />
                      <Input placeholder="Cardholder Name" value={cardName} onChange={e => setCardName(e.target.value)} className="h-10" />
                      <div className="grid grid-cols-2 gap-3">
                        <Input placeholder="MM/YY" value={cardExpiry} onChange={e => setCardExpiry(formatExpiry(e.target.value))} className="h-10 font-mono" />
                        <Input type="password" placeholder="CVV" value={cardCvv} onChange={e => setCardCvv(e.target.value.replace(/\D/g, '').slice(0, 4))} className="h-10 font-mono" />
                      </div>
                      <div className="flex items-center gap-2">
                        <Checkbox checked={saveCard} onCheckedChange={(v) => setSaveCard(!!v)} id="save-card" />
                        <Label htmlFor="save-card" className="text-xs">Save card for future payments</Label>
                      </div>
                    </div>
                  )}
                </div>

                {/* Net Banking */}
                <div className={`border rounded-xl p-4 transition-colors ${method === 'netbanking' ? 'border-primary bg-primary/5' : 'border-border'}`}>
                  <div className="flex items-center gap-3">
                    <RadioGroupItem value="netbanking" id="netbanking" />
                    <Label htmlFor="netbanking" className="flex items-center gap-2 cursor-pointer flex-1">
                      <Building2 className="h-5 w-5 text-primary" />
                      <span className="font-semibold text-sm">Net Banking</span>
                    </Label>
                  </div>
                  {method === 'netbanking' && (
                    <div className="mt-4 pl-7">
                      <select value={selectedBank} onChange={e => setSelectedBank(e.target.value)}
                        className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm">
                        <option value="">Select Bank</option>
                        {BANKS.map(b => <option key={b} value={b}>{b}</option>)}
                      </select>
                    </div>
                  )}
                </div>

                {/* COD */}
                <div className={`border rounded-xl p-4 transition-colors ${method === 'cod' ? 'border-primary bg-primary/5' : 'border-border'}`}>
                  <div className="flex items-center gap-3">
                    <RadioGroupItem value="cod" id="cod" />
                    <Label htmlFor="cod" className="flex items-center gap-2 cursor-pointer flex-1">
                      <Truck className="h-5 w-5 text-primary" />
                      <span className="font-semibold text-sm">Cash on Delivery</span>
                    </Label>
                  </div>
                  {method === 'cod' && (
                    <p className="text-xs text-muted-foreground mt-3 pl-7">Pay with cash when your order is delivered. Additional ₹30 COD charge applies.</p>
                  )}
                </div>

                {/* Wallet */}
                <div className={`border rounded-xl p-4 transition-colors ${method === 'wallet' ? 'border-primary bg-primary/5' : 'border-border'}`}>
                  <div className="flex items-center gap-3">
                    <RadioGroupItem value="wallet" id="wallet" />
                    <Label htmlFor="wallet" className="flex items-center gap-2 cursor-pointer flex-1">
                      <Wallet className="h-5 w-5 text-primary" />
                      <span className="font-semibold text-sm">P4U Wallet</span>
                      <span className="text-xs text-muted-foreground ml-auto">Balance: ₹{walletBalance}</span>
                    </Label>
                  </div>
                  {method === 'wallet' && walletBalance < total && (
                    <p className="text-xs text-destructive mt-3 pl-7">Insufficient wallet balance. Please choose another method.</p>
                  )}
                </div>
              </RadioGroup>
            </Card>
          </div>

          {/* Right - Price Breakdown */}
          <div>
            <Card className="p-4 sticky top-24">
              <h3 className="text-sm font-semibold mb-3">Price Details</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between"><span className="text-muted-foreground">Subtotal</span><span>₹{subtotal?.toLocaleString()}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Platform Fee</span><span>₹{platformFee}</span></div>
                {discount > 0 && <div className="flex justify-between text-success"><span>Discount</span><span>-₹{discount}</span></div>}
                {pointsUsed > 0 && <div className="flex justify-between text-success"><span>Points Redeemed</span><span>-₹{pointsUsed}</span></div>}
                {method === 'cod' && <div className="flex justify-between"><span className="text-muted-foreground">COD Charge</span><span>₹30</span></div>}
                <Separator />
                <div className="flex justify-between font-bold text-base">
                  <span>Total Payable</span>
                  <span>₹{(total + (method === 'cod' ? 30 : 0))?.toLocaleString()}</span>
                </div>
              </div>
              <Button className="w-full h-12 mt-4 text-base font-semibold" onClick={handlePay} disabled={!isMethodValid()}>
                Pay ₹{(total + (method === 'cod' ? 30 : 0))?.toLocaleString()}
              </Button>
              <p className="text-[10px] text-muted-foreground text-center mt-2">🔒 100% Secure Payment</p>
            </Card>
          </div>
        </div>
      </div>

      {/* Mobile sticky pay button */}
      <div className="fixed bottom-0 left-0 right-0 z-40 bg-card border-t border-border/50 px-4 py-3 md:hidden safe-area-bottom">
        <Button className="w-full h-12 rounded-xl text-base font-semibold" onClick={handlePay} disabled={!isMethodValid()}>
          Pay ₹{(total + (method === 'cod' ? 30 : 0))?.toLocaleString()}
        </Button>
      </div>
    </CustomerLayout>
  );
}
