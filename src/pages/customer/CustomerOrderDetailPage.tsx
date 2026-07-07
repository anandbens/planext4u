import { useState, useEffect } from "react";
import { Link, useParams } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Package, Truck, MapPin, Star, CheckCircle2, Clock, Store, Receipt, ChevronRight, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { CustomerLayout } from "@/components/customer/CustomerLayout";
import { PodRatingPopup } from "@/components/customer/PodRatingPopup";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { toast } from "sonner";
import { useCurrency } from "@/lib/country-context";

const statusColor: Record<string, string> = {
  placed: "bg-primary/10 text-primary", paid: "bg-info/10 text-info", accepted: "bg-info/10 text-info",
  in_progress: "bg-warning/10 text-warning", shipped: "bg-blue-500/10 text-blue-600",
  delivered: "bg-success/10 text-success", completed: "bg-success/10 text-success",
  cancelled: "bg-destructive/10 text-destructive",
};

const trackingSteps = [
  { key: "placed", label: "Order Placed", icon: Package },
  { key: "accepted", label: "Confirmed", icon: CheckCircle2 },
  { key: "in_progress", label: "Processing", icon: Clock },
  { key: "shipped", label: "Shipped", icon: Truck },
  { key: "delivered", label: "Delivered", icon: MapPin },
  { key: "completed", label: "Completed", icon: CheckCircle2 },
];

export default function CustomerOrderDetailPage() {
  const { orderId } = useParams();
  const { customerUser } = useAuth();
  const { format: fmt } = useCurrency();
  const qc = useQueryClient();
  const [showPodPopup, setShowPodPopup] = useState(false);

  // Parallel boot: fetch the order row and its delivery-proof in ONE round-trip
  // via Promise.all so the detail page doesn't wait on a sequential waterfall.
  const { data: boot, isLoading } = useQuery({
    queryKey: ["orderDetailBoot", orderId],
    queryFn: async () => {
      if (!orderId) return { order: null, pod: null };
      const [{ data: order }, { data: pod }] = await Promise.all([
        supabase.from("orders").select("*").eq("id", orderId).single(),
        supabase.from("delivery_proofs" as any).select("*").eq("order_id", orderId).maybeSingle(),
      ]);
      return { order, pod };
    },
    enabled: !!orderId,
  });
  const order = boot?.order as any;
  const existingPod = boot?.pod as any;

  // Auto-show POD popup when order is delivered and no POD exists
  useEffect(() => {
    if (order && order.status === "delivered" && !existingPod && !isLoading) {
      const timer = setTimeout(() => setShowPodPopup(true), 500);
      return () => clearTimeout(timer);
    }
  }, [order, existingPod, isLoading]);

  const currentStepIdx = order ? trackingSteps.findIndex(s => s.key === order.status) : -1;
  const items: any[] = order?.items || [];
  const customerId = customerUser?.customer_id || customerUser?.id || '';
  const supabaseUid = customerUser?.supabase_uid || '';
  const customerName = customerUser?.name || 'Customer';

  if (isLoading) {
    return (
      <CustomerLayout>
        <div className="max-w-2xl mx-auto px-4 py-6 space-y-4">
          <Skeleton className="h-8 w-40" />
          <Skeleton className="h-40 rounded-xl" />
          <Skeleton className="h-60 rounded-xl" />
        </div>
      </CustomerLayout>
    );
  }

  if (!order) {
    return (
      <CustomerLayout>
        <div className="max-w-2xl mx-auto px-4 py-20 text-center">
          <p className="text-muted-foreground">Order not found</p>
          <Button asChild className="mt-4"><Link to="/app/orders">Back to Orders</Link></Button>
        </div>
      </CustomerLayout>
    );
  }

  const pf = order.platform_fee || 0;
  const gstPf = order.gst_on_platform_fee || 0;

  return (
    <CustomerLayout>
      <div className="max-w-2xl mx-auto px-4 py-6 pb-28 md:pb-6 space-y-4">
        {/* Header */}
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" asChild><Link to="/app/orders"><ArrowLeft className="h-5 w-5" /></Link></Button>
          <div>
            <h1 className="text-lg font-bold">Order Details</h1>
            <p className="text-xs text-muted-foreground">{order.id}</p>
          </div>
          <Badge className={(statusColor[order.status] || "bg-muted") + " border-0 ml-auto"}>{order.status.replace("_", " ")}</Badge>
        </div>

        {/* Tracking Stepper */}
        {!["cancelled"].includes(order.status) && (
          <Card className="p-4">
            <h3 className="text-sm font-semibold mb-4">Order Status</h3>
            <div className="relative">
              {trackingSteps.map((step, i) => {
                const isDone = i <= currentStepIdx;
                const isCurrent = i === currentStepIdx;
                const Icon = step.icon;
                return (
                  <div key={step.key} className="flex items-start gap-3 relative">
                    {i < trackingSteps.length - 1 && (
                      <div className={`absolute left-[15px] top-8 w-0.5 h-8 ${i < currentStepIdx ? 'bg-success' : 'bg-border'}`} />
                    )}
                    <div className={`h-8 w-8 rounded-full flex items-center justify-center shrink-0 z-10 ${isDone ? 'bg-success text-success-foreground' : 'bg-secondary text-muted-foreground'} ${isCurrent ? 'ring-2 ring-success/30' : ''}`}>
                      <Icon className="h-4 w-4" />
                    </div>
                    <div className="flex-1 pb-6">
                      <p className={`text-sm font-medium ${isDone ? '' : 'text-muted-foreground'}`}>{step.label}</p>
                      {isCurrent && <p className="text-xs text-primary">Current</p>}
                      {isDone && i === 0 && (
                        <p className="text-xs text-muted-foreground">
                          {new Date(order.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>
        )}

        {/* Vendor */}
        <Link to={`/app/vendor/${order.vendor_id}`}>
          <Card className="p-4 flex items-center gap-3 hover:bg-accent/30 transition-colors cursor-pointer">
            <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
              <Store className="h-5 w-5 text-primary" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-semibold text-primary">{order.vendor_name || 'Vendor'}</p>
              <p className="text-xs text-muted-foreground">Tap to view seller products</p>
            </div>
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          </Card>
        </Link>

        {/* Shipping Info */}
        {order.shipping_type && (
          <Card className="p-4">
            <h3 className="text-sm font-semibold mb-2 flex items-center gap-2">
              <Truck className="h-4 w-4" /> Shipment Details
            </h3>
            <div className="space-y-1 text-sm">
              <p>Method: <span className="font-medium">{order.shipping_type === 'own' ? 'Seller Delivery' : 'Courier Partner'}</span></p>
              {order.courier_name && <p>Courier: <span className="font-medium">{order.courier_name}</span></p>}
              {order.tracking_number && <p>Tracking #: <span className="font-mono text-xs">{order.tracking_number}</span></p>}
              {order.tracking_url && (
                <a href={order.tracking_url} target="_blank" rel="noopener noreferrer" className="text-primary underline text-sm inline-block mt-1">
                  Track your shipment ↗
                </a>
              )}
              {order.shipping_notes && <p className="text-xs text-muted-foreground mt-1">{order.shipping_notes}</p>}
            </div>
          </Card>
        )}

        {/* Items */}
        <Card className="p-4">
          <h3 className="text-sm font-semibold mb-3">Items ({items.length})</h3>
          <div className="divide-y divide-border/30">
            {items.map((item: any, i: number) => (
              <Link
                to={`/app/product/${item.id}`}
                key={i}
                className="flex items-center gap-3 py-3 first:pt-0 last:pb-0 hover:bg-accent/30 rounded-lg transition-colors -mx-1 px-1"
              >
                <div className="h-14 w-14 bg-secondary/30 rounded-lg flex items-center justify-center overflow-hidden shrink-0">
                  {item.image ? (
                    <img loading="lazy" decoding="async" src={item.image} alt={item.title} className="w-full h-full object-cover" />
                  ) : (
                    <Package className="h-6 w-6 text-muted-foreground" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate text-primary">{item.title}</p>
                  {item.selected_attributes && Object.keys(item.selected_attributes).length > 0 && (
                    <p className="text-[10px] text-primary/70">{Object.entries(item.selected_attributes).map(([k, v]: [string, any]) => `${k}: ${v}`).join(' · ')}</p>
                  )}
                  <p className="text-xs text-muted-foreground">Qty: {item.qty} × {fmt(item.price || 0, { decimals: 0 })}</p>
                </div>
                <p className="text-sm font-semibold whitespace-nowrap">{fmt((item.price || 0) * (item.qty || 1), { decimals: 0 })}</p>
              </Link>
            ))}
          </div>
        </Card>

        {/* Bill Breakdown */}
        <Card className="p-4">
          <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
            <Receipt className="h-4 w-4" /> Bill Details
          </h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Item Total (MRP)</span>
              <span>{fmt(order.subtotal || 0, { decimals: 0 })}</span>
            </div>
            {order.discount > 0 && (
              <div className="flex justify-between text-success">
                <span>Discount</span>
                <span>- {fmt(order.discount, { decimals: 0 })}</span>
              </div>
            )}
            {Number((order as any).coupon_discount || 0) > 0 && (
              <div className="flex justify-between text-success">
                <span>Coupon <span className="font-mono text-xs opacity-70">({(order as any).coupon_code})</span></span>
                <span>- {fmt(Number((order as any).coupon_discount))}</span>
              </div>
            )}
            {order.points_used > 0 && (
              <div className="flex justify-between text-success">
                <span>Points Redeemed</span>
                <span>- {order.points_used} pts</span>
              </div>
            )}
            {(pf > 0 || gstPf > 0) && (
              <div className="flex justify-between">
                <div>
                  <span className="text-muted-foreground">Service & convenience fee</span>
                  <p className="text-[10px] text-muted-foreground/70">Inclusive of all applicable taxes</p>
                </div>
                <span>{fmt(pf + gstPf, { decimals: 2 })}</span>
              </div>
            )}
            {(order.tax || 0) > 0 && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Product Tax (GST)</span>
                <span>{fmt(order.tax || 0, { decimals: 0 })}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-muted-foreground">Delivery Fee</span>
              <span className="text-success font-medium">FREE</span>
            </div>
            <div className="border-t border-border/50 pt-2 flex justify-between font-bold">
              <span>Grand Total</span>
              <span>{fmt(order.total || 0, { decimals: 0 })}</span>
            </div>
          </div>
        </Card>

        {/* Order Info */}
        <Card className="p-4">
          <h3 className="text-sm font-semibold mb-3">Order Info</h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Order ID</span>
              <span className="font-mono text-xs">{order.id}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Placed on</span>
              <span>{new Date(order.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Payment</span>
              <span className="text-success font-medium">Paid ✓</span>
            </div>
            {order.payment_reference_id && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Payment Ref ID</span>
                <span className="font-mono text-xs">{order.payment_reference_id}</span>
              </div>
            )}
            {order.razorpay_order_id && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Gateway Order ID</span>
                <span className="font-mono text-xs">{order.razorpay_order_id}</span>
              </div>
            )}
          </div>
        </Card>

        {/* Seller Rating Display (after rated) */}
        {order.delivery_rating && (
          <Card className="p-4">
            <h3 className="text-sm font-semibold mb-2">Your Seller Rating</h3>
            <div className="flex items-center gap-2">
              <div className="flex gap-0.5">
                {[1, 2, 3, 4, 5].map(s => (
                  <Star key={s} className={`h-5 w-5 ${s <= order.delivery_rating ? 'fill-warning text-warning' : 'text-muted-foreground/30'}`} />
                ))}
              </div>
              {order.rating_comment && <p className="text-xs text-muted-foreground ml-2">{order.rating_comment}</p>}
            </div>
            {order.rated_at && <p className="text-xs text-muted-foreground mt-1">Rated on {new Date(order.rated_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</p>}
          </Card>
        )}

        {/* POD Confirmation Badge */}
        {existingPod && (
          <Card className="p-4 bg-success/5 border-success/20">
            <div className="flex items-center gap-3">
              <ShieldCheck className="h-5 w-5 text-success" />
              <div>
                <p className="text-sm font-semibold text-success">Delivery Confirmed</p>
                <p className="text-xs text-muted-foreground">
                  {(existingPod as any).confirmation_type?.replace(/_/g, " ")} · {new Date((existingPod as any).submitted_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                </p>
              </div>
            </div>
          </Card>
        )}

        {/* Manual POD trigger for delivered orders without POD */}
        {order.status === "delivered" && !existingPod && (
          <Button className="w-full" onClick={() => setShowPodPopup(true)}>
            <ShieldCheck className="h-4 w-4 mr-2" /> Confirm Delivery & Rate
          </Button>
        )}

        {/* Delivery Estimate */}
        {!["delivered", "completed", "cancelled", "shipped"].includes(order.status) && (
          <Card className="p-4 bg-primary/5 border-primary/20">
            <div className="flex items-center gap-3">
              <Clock className="h-5 w-5 text-primary" />
              <div>
                <p className="text-sm font-semibold">Estimated Delivery</p>
                <p className="text-xs text-muted-foreground">
                  {new Date(new Date(order.created_at).getTime() + 3 * 86400000).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', weekday: 'short' })}
                </p>
              </div>
            </div>
          </Card>
        )}
      </div>

      {/* 3-Step POD + Rating Popup */}
      <PodRatingPopup
        open={showPodPopup}
        onOpenChange={setShowPodPopup}
        order={order}
        customerId={customerId}
        customerName={customerName}
        supabaseUid={supabaseUid}
        onComplete={() => {
          qc.invalidateQueries({ queryKey: ["orderDetailBoot", orderId] });
        }}
      />
    </CustomerLayout>
  );
}
