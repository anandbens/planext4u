import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Package, Truck, MapPin, Star, CheckCircle2, Clock, Store, Receipt, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { CustomerLayout } from "@/components/customer/CustomerLayout";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { toast } from "sonner";

const statusColor: Record<string, string> = {
  placed: "bg-primary/10 text-primary", paid: "bg-info/10 text-info", accepted: "bg-info/10 text-info",
  in_progress: "bg-warning/10 text-warning", delivered: "bg-success/10 text-success",
  completed: "bg-success/10 text-success", cancelled: "bg-destructive/10 text-destructive",
};

const trackingSteps = [
  { key: "placed", label: "Order Placed", icon: Package },
  { key: "accepted", label: "Confirmed", icon: CheckCircle2 },
  { key: "in_progress", label: "Out for Delivery", icon: Truck },
  { key: "delivered", label: "Delivered", icon: MapPin },
  { key: "completed", label: "Completed", icon: CheckCircle2 },
];

export default function CustomerOrderDetailPage() {
  const { orderId } = useParams();
  const { customerUser } = useAuth();
  const qc = useQueryClient();
  const [rating, setRating] = useState(0);
  const [ratingComment, setRatingComment] = useState("");

  const { data: order, isLoading } = useQuery({
    queryKey: ["orderDetail", orderId],
    queryFn: async () => {
      const { data } = await supabase.from("orders").select("*").eq("id", orderId!).single();
      return data as any;
    },
    enabled: !!orderId,
  });

  const submitRating = useMutation({
    mutationFn: async () => {
      if (!rating) { toast.error("Please select a rating"); return; }
      const { error } = await supabase.from("orders").update({
        delivery_rating: rating,
        rating_comment: ratingComment || null,
        rated_at: new Date().toISOString(),
      } as any).eq("id", orderId!);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Thank you for your feedback! ⭐");
      qc.invalidateQueries({ queryKey: ["orderDetail", orderId] });
    },
    onError: () => toast.error("Failed to submit rating"),
  });

  const currentStepIdx = order ? trackingSteps.findIndex(s => s.key === order.status) : -1;
  const items: any[] = order?.items || [];

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
      <div className="max-w-2xl mx-auto px-4 py-6 pb-20 md:pb-6 space-y-4">
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

        {/* Vendor - clickable link to vendor page */}
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

        {/* Items - with images and product links */}
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
                    <img src={item.image} alt={item.title} className="w-full h-full object-cover" />
                  ) : (
                    <Package className="h-6 w-6 text-muted-foreground" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate text-primary">{item.title}</p>
                  <p className="text-xs text-muted-foreground">Qty: {item.qty} × ₹{(item.price || 0).toLocaleString()}</p>
                </div>
                <p className="text-sm font-semibold whitespace-nowrap">₹{((item.price || 0) * (item.qty || 1)).toLocaleString()}</p>
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
              <span>₹{(order.subtotal || 0).toLocaleString()}</span>
            </div>
            {order.discount > 0 && (
              <div className="flex justify-between text-success">
                <span>Discount</span>
                <span>- ₹{order.discount.toLocaleString()}</span>
              </div>
            )}
            {order.points_used > 0 && (
              <div className="flex justify-between text-success">
                <span>Points Redeemed</span>
                <span>- {order.points_used} pts</span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-muted-foreground">Platform Fee</span>
              <span>₹{pf.toLocaleString()}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">GST on Platform Fee (18%)</span>
              <span>₹{gstPf.toLocaleString()}</span>
            </div>
            {(order.tax || 0) > 0 && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Product Tax</span>
                <span>₹{(order.tax || 0).toLocaleString()}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-muted-foreground">Delivery Fee</span>
              <span className="text-success font-medium">FREE</span>
            </div>
            <div className="border-t border-border/50 pt-2 flex justify-between font-bold">
              <span>Grand Total</span>
              <span>₹{(order.total || 0).toLocaleString()}</span>
            </div>
          </div>
        </Card>

        {/* Order Info with Payment Reference */}
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

        {/* Rating Section */}
        {(order.status === "delivered" || order.status === "completed") && (
          <Card className="p-4">
            <h3 className="text-sm font-semibold mb-3">
              {order.delivery_rating ? "Your Rating" : "Rate your delivery"}
            </h3>
            {order.delivery_rating ? (
              <div className="space-y-2">
                <div className="flex gap-1">
                  {[1, 2, 3, 4, 5].map(s => (
                    <Star key={s} className={`h-6 w-6 ${s <= order.delivery_rating ? 'fill-amber-400 text-amber-400' : 'text-muted-foreground'}`} />
                  ))}
                </div>
                {order.rating_comment && <p className="text-sm text-muted-foreground">{order.rating_comment}</p>}
                <p className="text-xs text-muted-foreground">
                  Rated on {new Date(order.rated_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex gap-2">
                  {[1, 2, 3, 4, 5].map(s => (
                    <button key={s} onClick={() => setRating(s)} className="transition-transform hover:scale-110">
                      <Star className={`h-8 w-8 ${s <= rating ? 'fill-amber-400 text-amber-400' : 'text-muted-foreground'}`} />
                    </button>
                  ))}
                </div>
                {rating > 0 && (
                  <p className="text-xs text-muted-foreground">
                    {rating <= 2 ? "We're sorry. Tell us what went wrong." : rating <= 3 ? "We can do better! Share your feedback." : "Glad you liked it! 🎉"}
                  </p>
                )}
                <Textarea
                  placeholder="Share your experience (optional)"
                  value={ratingComment}
                  onChange={e => setRatingComment(e.target.value)}
                  className="min-h-[70px] text-sm"
                />
                <Button onClick={() => submitRating.mutate()} disabled={!rating || submitRating.isPending} className="w-full">
                  {submitRating.isPending ? "Submitting..." : "Submit Rating"}
                </Button>
              </div>
            )}
          </Card>
        )}

        {/* Delivery Estimate */}
        {!["delivered", "completed", "cancelled"].includes(order.status) && (
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
    </CustomerLayout>
  );
}
