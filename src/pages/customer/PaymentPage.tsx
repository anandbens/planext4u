import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { CustomerLayout } from "@/components/customer/CustomerLayout";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { ArrowLeft, CheckCircle, XCircle, Copy, Share2, ShoppingBag, CreditCard } from "lucide-react";
import { api } from "@/lib/api";
import { supabase } from "@/integrations/supabase/client";
import { resolveCommissionCascade } from "@/lib/commission-cascade";
import { checkCartStock, decrementStockForCart } from "@/lib/stock-check";
import { useAuth } from "@/lib/auth";
import { motion } from "framer-motion";
import { format, addDays } from "date-fns";

type PaymentState = 'select' | 'processing' | 'success' | 'failure';

export default function PaymentPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { customerUser } = useAuth();
  const customerId = customerUser?.customer_id || customerUser?.id || 'USR-001';

  const { cart, subtotal, mrpTotal, totalDiscount, platformFee, gstOnPlatformFee, discount, pointsUsed, total, savings, selectedAddress, itemRedemptionMap, isServiceBooking, bookingDate, bookingSlot } = location.state || {};

  const [paymentState, setPaymentState] = useState<PaymentState>('select');
  const [orderId, setOrderId] = useState('');
  const [orderItems, setOrderItems] = useState<any[]>([]);

  useEffect(() => {
    if (!cart || cart.length === 0) navigate('/app/cart');
  }, [cart, navigate]);

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
    setPaymentState('processing');

    try {
      // Final stock cross-check right before charging the customer
      try {
        const issues = await checkCartStock(cart as any);
        if (issues.length > 0) {
          const first = issues[0];
          toast.error(`Stock Unavailable for the Product ${first.title} so remove the item from the cart to checkout`, { duration: 6000 });
          setPaymentState('select');
          navigate('/app/cart');
          return;
        }
      } catch (e) {
        console.error('Pre-payment stock check failed', e);
      }

      const loaded = await loadRazorpayScript();
      if (!loaded) { toast.error("Failed to load payment gateway"); setPaymentState('select'); return; }

      const { data, error } = await supabase.functions.invoke("razorpay", {
        body: { action: "create_order", amount: total, currency: "INR" },
      });

      if (error || !data?.order_id) {
        toast.error("Failed to create payment order");
        setPaymentState('select');
        return;
      }

      setPaymentState('select');

      const options = {
        key: data.key_id,
        amount: data.amount,
        currency: data.currency,
        name: "Planext4u",
        description: `Order - ${cart.length} item(s)`,
        order_id: data.order_id,
        handler: async (response: any) => {
          setPaymentState('processing');
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

          if (isServiceBooking) {
            await createBooking(response.razorpay_payment_id, data.order_id);
          } else {
            await createOrder(response.razorpay_payment_id, data.order_id);
          }
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

  const parseSlot = (slot: string): { start: string; end: string } => {
    // slot e.g. "10:00 AM" → start 10:00:00, end 11:00:00
    const [time, ampm] = slot.split(' ');
    const [hStr, mStr] = time.split(':');
    let h = parseInt(hStr, 10);
    const m = parseInt(mStr || '0', 10);
    if (ampm === 'PM' && h !== 12) h += 12;
    if (ampm === 'AM' && h === 12) h = 0;
    const pad = (n: number) => String(n).padStart(2, '0');
    const start = `${pad(h)}:${pad(m)}:00`;
    const end = `${pad((h + 1) % 24)}:${pad(m)}:00`;
    return { start, end };
  };

  const createBooking = async (paymentId: string | null, rzpOrderId?: string) => {
    try {
      const item = cart[0];
      const vendorId = item.vendor_id || 'VND-001';
      const serviceId = item.id;

      // Resolve commission and tax split
      let commissionRate = 0;
      try {
        const { data: svc } = await supabase.from('services').select('commission_override, gst_rate, sac_code').eq('id', serviceId).maybeSingle();
        const cascade = await resolveCommissionCascade(vendorId, svc?.commission_override, undefined);
        commissionRate = cascade.commission;
        var gstRate = (svc as any)?.gst_rate ?? 18;
        var sacCode = (svc as any)?.sac_code ?? null;
      } catch (e) { console.error('Cascade error:', e); var gstRate = 18; var sacCode: any = null; }

      // Customer + vendor state for interstate split
      const { data: cust } = await supabase.from('customers').select('name, mobile').eq('id', customerId).maybeSingle();
      const { data: vend } = await supabase.from('vendors').select('business_name, state_name, state_code').eq('id', vendorId).maybeSingle();
      const customerStateCode = (selectedAddress as any)?.state_code || null;
      const vendorStateCode = (vend as any)?.state_code || null;
      const isInterstate = !!customerStateCode && !!vendorStateCode && customerStateCode !== vendorStateCode;

      const baseAmount = Number(item.price) * Number(item.qty || 1);
      const couponDiscount = Number(discount || 0);
      const taxableValue = Math.max(0, baseAmount - couponDiscount);
      const taxAmt = Math.round((taxableValue * (Number(gstRate) / 100)) * 100) / 100;
      const cgst = isInterstate ? 0 : Math.round((taxAmt / 2) * 100) / 100;
      const sgst = isInterstate ? 0 : Math.round((taxAmt / 2) * 100) / 100;
      const igst = isInterstate ? taxAmt : 0;
      const commissionAmount = Math.round(((taxableValue * commissionRate) / 100) * 100) / 100;
      const netToVendor = Math.round((taxableValue - commissionAmount) * 100) / 100;

      const { start, end } = parseSlot(bookingSlot);

      const insertPayload: any = {
        service_id: serviceId,
        service_title: item.title,
        customer_id: customerId,
        customer_name: cust?.name || customerUser?.name || 'Customer',
        customer_phone: cust?.mobile || customerUser?.mobile || null,
        customer_address: selectedAddress ? `${selectedAddress.address_line}, ${selectedAddress.city} - ${selectedAddress.pincode}` : null,
        vendor_id: vendorId,
        assigned_vendor_name: vend?.business_name || item.vendor || null,
        booking_date: bookingDate,
        start_time: start,
        end_time: end,
        status: 'pending',
        payment_status: 'paid',
        razorpay_payment_id: paymentId,
        razorpay_order_id: rzpOrderId || null,
        total_amount: total,
        sac_code: sacCode,
        subtotal: baseAmount,
        discount: couponDiscount,
        taxable_value: taxableValue,
        gst_rate: gstRate,
        cgst_amount: cgst,
        sgst_amount: sgst,
        igst_amount: igst,
        is_interstate: isInterstate,
        place_of_supply_state: (selectedAddress as any)?.state || null,
        place_of_supply_code: customerStateCode,
        platform_fee: platformFee || 0,
        gst_on_platform_fee: gstOnPlatformFee || 0,
        commission_rate: commissionRate,
        commission_amount: commissionAmount,
        net_to_vendor: netToVendor,
        points_used: pointsUsed || 0,
      };

      const { data: booking, error: bookErr } = await supabase
        .from('service_bookings')
        .insert(insertPayload)
        .select('id, otp_code')
        .single();
      if (bookErr) {
        if ((bookErr as any).code === '23505') throw new Error('This time slot was just booked. Please pick another slot.');
        throw new Error(bookErr.message);
      }

      // Deduct wallet points
      if (pointsUsed > 0 && customerId) {
        try {
          const { data: c } = await supabase.from('customers').select('wallet_points').eq('id', customerId).maybeSingle();
          if (c) await supabase.from('customers').update({ wallet_points: Math.max(0, (c.wallet_points || 0) - pointsUsed) }).eq('id', customerId);
          await supabase.from('points_transactions').insert({
            id: `PT-RD-${booking.id.toString().slice(-8)}`,
            user_id: customerId, user_name: customerUser?.name || 'Customer',
            type: 'redemption', points: -pointsUsed,
            description: `Redeemed ${pointsUsed} points on booking ${booking.id}`,
            is_expired: false, cooling_status: 'credited',
          } as any);
        } catch (e) { console.error('Points deduction error:', e); }
      }

      await api.clearCart();
      setOrderId(String(booking.id));
      setOrderItems(cart || []);
      setPaymentState('success');
      toast.success(`Booking confirmed. Share OTP ${booking.otp_code} with the vendor on arrival.`, { duration: 8000 });
    } catch (err: any) {
      console.error('Booking creation failed:', err);
      toast.error(err?.message || 'Failed to create booking');
      setPaymentState('failure');
    }
  };

  const createOrder = async (paymentId: string | null, rzpOrderId?: string) => {
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

      const pf = platformFee || 0;
      const gstPf = pf * 0.18;

      const orderPromises = Object.entries(vendorGroups).map(async ([vendorId, items]) => {
        const itemTotal = items.reduce((s: number, i: any) => s + i.price * i.qty, 0);

        // Resolve cascade for this vendor's items (use first product as representative)
        let effectiveCommission = 0;
        let effectiveMaxRedemption = 3;
        let commissionSource = 'plan';
        let redemptionSource = 'plan';
        try {
          const firstProduct = items[0];
          const { data: prod } = await supabase.from('products').select('commission_override, max_redemption_percentage').eq('id', firstProduct.id).maybeSingle();
          const cascade = await resolveCommissionCascade(vendorId, prod?.commission_override, prod?.max_redemption_percentage);
          effectiveCommission = cascade.commission;
          effectiveMaxRedemption = cascade.maxRedemption;
          commissionSource = cascade.commissionSource;
          redemptionSource = cascade.redemptionSource;
        } catch (e) { console.error('Cascade error:', e); }

        const orderData = {
          id: newOrderId + '-' + vendorId.slice(-3),
          customer_id: customerId,
          customer_name: customerUser?.name || 'Customer',
          vendor_id: vendorId,
          vendor_name: items[0]?.vendor_name || items[0]?.vendor || 'Vendor',
          items: items.map((i: any) => ({ id: i.id, title: i.title, qty: i.qty, price: i.price, image: i.image, selected_attributes: i.selected_attributes || null, variant_id: i.variant_id || null })),
          subtotal: itemTotal,
          tax: items.reduce((s: number, i: any) => s + (i.tax || 0) * i.qty, 0),
          discount: discount || 0,
          points_used: pointsUsed || 0,
          platform_fee: pf,
          gst_on_platform_fee: Math.round(gstPf * 100) / 100,
          total: total || (itemTotal + pf + gstPf - (discount || 0)),
          status: 'placed',
          payment_reference_id: paymentId || null,
          razorpay_order_id: rzpOrderId || null,
          effective_commission: effectiveCommission,
          effective_max_redemption: effectiveMaxRedemption,
          commission_source: commissionSource,
          redemption_source: redemptionSource,
        };
        const { error: insertErr } = await supabase.from('orders').insert(orderData as any);
        if (insertErr) {
          console.error('Order insert error:', insertErr);
          throw new Error(insertErr.message);
        }
        return orderData;
      });

      await Promise.all(orderPromises);
      // Decrement stock for the products that were just paid for
      try { await decrementStockForCart(cart as any); } catch (e) { console.error('Stock decrement failed', e); }
      await api.clearCart();

      // Deduct wallet points and record the redemption transaction
      if (pointsUsed > 0 && customerId) {
        try {
          // 1. Deduct from customer wallet
          const { data: cust } = await supabase
            .from('customers')
            .select('wallet_points')
            .eq('id', customerId)
            .maybeSingle();
          if (cust) {
            await supabase
              .from('customers')
              .update({ wallet_points: Math.max(0, (cust.wallet_points || 0) - pointsUsed) })
              .eq('id', customerId);
          }
          // 2. Record redemption transaction
          await supabase.from('points_transactions').insert({
            id: `PT-RD-${newOrderId.slice(-8)}`,
            user_id: customerId,
            user_name: customerUser?.name || 'Customer',
            type: 'redemption',
            points: -pointsUsed,
            description: `Redeemed ${pointsUsed} points on order ${newOrderId}`,
            is_expired: false,
            cooling_status: 'credited',
          } as any);
        } catch (e) {
          console.error('Points deduction error:', e);
        }
      }

      // Credit any cooling period referral points for this customer's first order
      if (customerId) {
        import('@/lib/award-points').then(({ creditCoolingPoints }) => {
          creditCoolingPoints(customerId);
        });
      }

      setOrderId(newOrderId);
      setOrderItems(cart || []);
      setPaymentState('success');
    } catch (err) {
      console.error('Order creation failed:', err);
      setPaymentState('failure');
    }
  };

  if (!cart || cart.length === 0) return null;

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
            <Card className="p-4 text-left mb-6">
              <h3 className="text-sm font-semibold mb-1">Delivery Address</h3>
              <p className="text-xs text-muted-foreground">{selectedAddress.address_line}, {selectedAddress.city} - {selectedAddress.pincode}</p>
            </Card>
          )}

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

  if (paymentState === 'failure') {
    return (
      <CustomerLayout>
        <div className="max-w-lg mx-auto py-12 px-4 text-center">
          <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', stiffness: 200 }}
            className="h-24 w-24 rounded-full bg-destructive/10 flex items-center justify-center mx-auto mb-6">
            <XCircle className="h-14 w-14 text-destructive" />
          </motion.div>
          <h2 className="text-2xl font-bold mb-2">Payment Failed</h2>
          <p className="text-sm text-muted-foreground mb-8">Your payment could not be processed. Please try again.</p>
          <div className="flex flex-col gap-3">
            <Button className="w-full h-12" onClick={() => setPaymentState('select')}>Retry Payment</Button>
          </div>
        </div>
      </CustomerLayout>
    );
  }

  return (
    <CustomerLayout>
      <div className="max-w-3xl mx-auto px-4 py-6 pb-36 md:pb-8">
        <button onClick={() => navigate('/app/cart')} className="flex items-center gap-2 text-sm text-muted-foreground mb-4 hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> Back to Cart
        </button>

        <h1 className="text-xl font-bold mb-6">Payment</h1>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="md:col-span-2 space-y-4">
        <Card className="p-4">
              <h3 className="text-sm font-semibold mb-3">Order Summary ({cart.reduce((s: number, i: any) => s + i.qty, 0)} items)</h3>
              <div className="space-y-3">
                {cart.map((item: any, i: number) => (
                  <div key={i} className="flex items-center gap-3">
                    <div className="h-14 w-14 bg-secondary/30 rounded-lg overflow-hidden shrink-0">
                      {item.image ? <img src={item.image} alt={item.title} className="w-full h-full object-cover" /> : <span className="flex items-center justify-center h-full text-lg">{item.emoji}</span>}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold truncate">{item.title}</p>
                      <p className="text-[10px] text-muted-foreground">Vendor: {item.vendor} · Qty: {item.qty}</p>
                    </div>
                    <p className="text-xs font-bold shrink-0">₹{(item.price * item.qty).toLocaleString()}</p>
                  </div>
                ))}
              </div>
              <Separator className="my-3" />
              <div className="flex justify-between text-sm font-bold">
                <span>Total</span>
                <span>₹{total?.toLocaleString()}</span>
              </div>
            </Card>

            <Card className="p-4">
              <div className="flex items-center gap-3">
                <CreditCard className="h-5 w-5 text-primary" />
                <div>
                  <h3 className="text-sm font-semibold">Razorpay Secure Payment</h3>
                  <p className="text-xs text-muted-foreground">Pay via UPI, Credit/Debit Card, Net Banking, Wallet & more</p>
                </div>
              </div>
            </Card>
          </div>

          <div>
            <Card className="p-4 sticky top-24">
              <h3 className="text-sm font-semibold mb-3">Price Details</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between"><span className="text-muted-foreground">Item Total (MRP)</span><span>₹{(mrpTotal || subtotal)?.toLocaleString()}</span></div>
                {(totalDiscount || 0) > 0 && <div className="flex justify-between text-success"><span>Product Discount</span><span>-₹{totalDiscount?.toLocaleString()}</span></div>}
                <div className="flex justify-between"><span className="text-muted-foreground">Subtotal</span><span>₹{subtotal?.toLocaleString()}</span></div>
                {(platformFee > 0 || (gstOnPlatformFee || 0) > 0) && (
                  <div className="flex justify-between">
                    <div>
                      <span className="text-muted-foreground">Service & convenience fee</span>
                      <p className="text-[10px] text-muted-foreground/70">Inclusive of all applicable taxes</p>
                    </div>
                    <span>{platformFee === 0 && (gstOnPlatformFee || 0) === 0 ? <span className="text-success">FREE</span> : `₹${(platformFee + (gstOnPlatformFee || 0)).toFixed(2)}`}</span>
                  </div>
                )}
                {discount > 0 && <div className="flex justify-between text-success"><span>Coupon Discount</span><span>-₹{discount}</span></div>}
                {pointsUsed > 0 && (
                  <div className="flex justify-between pl-3 border-l-2 border-success/30 text-success">
                    <div>
                      <span>Wallet Points Redeemed</span>
                      <p className="text-[10px] text-success/70">{pointsUsed} pts × ₹1 = ₹{pointsUsed}</p>
                    </div>
                    <span>-₹{pointsUsed}</span>
                  </div>
                )}
                <Separator />
                <div className="flex justify-between font-bold text-base">
                  <span>Total Payable</span>
                  <span>₹{total?.toLocaleString()}</span>
                </div>
                {(savings || 0) > 0 && (
                  <div className="p-2 bg-success/5 rounded-lg border border-success/20">
                    <p className="text-xs text-success font-semibold text-center">🎉 You save ₹{savings?.toLocaleString()} on this order!</p>
                  </div>
                )}
              </div>
              <Button className="w-full h-12 mt-4 text-base font-semibold" onClick={handlePay}>
                Pay ₹{total?.toLocaleString()}
              </Button>
              <p className="text-[10px] text-muted-foreground text-center mt-2">🔒 100% Secure Payment</p>
            </Card>
          </div>
        </div>
      </div>

      <div className="fixed bottom-0 left-0 right-0 z-40 bg-card border-t border-border/50 px-4 py-3 md:hidden safe-area-bottom">
        <Button className="w-full h-12 rounded-xl text-base font-semibold" onClick={handlePay}>
          Pay ₹{total?.toLocaleString()}
        </Button>
      </div>
    </CustomerLayout>
  );
}
