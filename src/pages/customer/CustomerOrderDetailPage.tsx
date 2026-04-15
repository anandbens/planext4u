import { useState, useEffect } from "react";
import { Link, useParams } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Package, Truck, MapPin, Star, CheckCircle2, Clock, Store, Receipt, ChevronRight, Camera, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
  { key: "in_progress", label: "Processing", icon: Clock },
  { key: "shipped", label: "Shipped", icon: Truck },
  { key: "delivered", label: "Delivered", icon: MapPin },
  { key: "completed", label: "Completed", icon: CheckCircle2 },
];

export default function CustomerOrderDetailPage() {
  const { orderId } = useParams();
  const { customerUser } = useAuth();
  const qc = useQueryClient();
  const [rating, setRating] = useState(0);
  const [ratingComment, setRatingComment] = useState("");
  const [showPodPopup, setShowPodPopup] = useState(false);
  const [podForm, setPodForm] = useState({ confirmation_type: "received_in_person", recipient_name: "", notes: "" });

  const { data: order, isLoading } = useQuery({
    queryKey: ["orderDetail", orderId],
    queryFn: async () => {
      const { data } = await supabase.from("orders").select("*").eq("id", orderId!).single();
      return data as any;
    },
    enabled: !!orderId,
  });

  const { data: existingPod } = useQuery({
    queryKey: ["deliveryProof", orderId],
    queryFn: async () => {
      const { data } = await supabase.from("delivery_proofs" as any).select("*").eq("order_id", orderId!).maybeSingle();
      return data;
    },
    enabled: !!orderId,
  });

  // Auto-show POD popup when order is delivered and no POD exists
  useEffect(() => {
    if (order && (order.status === "delivered") && !existingPod && !isLoading) {
      const timer = setTimeout(() => setShowPodPopup(true), 500);
      return () => clearTimeout(timer);
    }
  }, [order, existingPod, isLoading]);

  const submitPod = useMutation({
    mutationFn: async () => {
      const customerId = customerUser?.customer_id || customerUser?.id || '';
      const { error } = await supabase.from("delivery_proofs" as any).insert({
        order_id: orderId,
        customer_id: customerId,
        confirmation_type: podForm.confirmation_type,
        recipient_name: podForm.recipient_name || null,
        notes: podForm.notes || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Delivery confirmed! Thank you.");
      setShowPodPopup(false);
      qc.invalidateQueries({ queryKey: ["deliveryProof", orderId] });
    },
    onError: (err: any) => toast.error(err.message || "Failed to submit"),
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
                  {item.selected_attributes && Object.keys(item.selected_attributes).length > 0 && (
                    <p className="text-[10px] text-primary/70">{Object.entries(item.selected_attributes).map(([k, v]: [string, any]) => `${k}: ${v}`).join(' · ')}</p>
                  )}
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

      {/* Proof of Delivery Popup */}
      <Dialog open={showPodPopup} onOpenChange={(open) => { if (!open && existingPod) setShowPodPopup(false); }}>
        <DialogContent className="max-w-sm" onPointerDownOutside={(e) => { if (!existingPod) e.preventDefault(); }}>
          <DialogTitle className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-primary" /> Confirm Delivery
          </DialogTitle>
          <DialogDescription>Please confirm you received your order to complete the delivery process.</DialogDescription>

          {/* Order Summary */}
          <div className="bg-secondary/30 rounded-lg p-3 space-y-2">
            <p className="text-xs font-semibold">{order.id}</p>
            {(order.items || []).slice(0, 3).map((item: any, i: number) => (
              <div key={i} className="flex items-center gap-2">
                <div className="h-8 w-8 bg-secondary rounded flex items-center justify-center text-sm shrink-0 overflow-hidden">
                  {item.image ? <img src={item.image} alt="" className="w-full h-full object-cover" /> : <span>{item.emoji || "📦"}</span>}
                </div>
                <p className="text-xs truncate flex-1">{item.title}</p>
                <p className="text-xs font-medium">×{item.qty}</p>
              </div>
            ))}
            {(order.items || []).length > 3 && <p className="text-xs text-muted-foreground">+{order.items.length - 3} more items</p>}
          </div>

          <div className="space-y-3">
            <div>
              <Label className="text-xs">How was it delivered? *</Label>
              <Select value={podForm.confirmation_type} onValueChange={v => setPodForm(f => ({ ...f, confirmation_type: v }))}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="received_in_person">Received in person</SelectItem>
                  <SelectItem value="left_at_door">Left at door</SelectItem>
                  <SelectItem value="received_by_other">Received by someone else</SelectItem>
                  <SelectItem value="collected_from_store">Collected from store</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {podForm.confirmation_type === "received_by_other" && (
              <div>
                <Label className="text-xs">Recipient Name</Label>
                <Input value={podForm.recipient_name} onChange={e => setPodForm(f => ({ ...f, recipient_name: e.target.value }))} placeholder="Who received it?" className="mt-1" />
              </div>
            )}
            <div>
              <Label className="text-xs">Notes (optional)</Label>
              <Textarea value={podForm.notes} onChange={e => setPodForm(f => ({ ...f, notes: e.target.value }))} placeholder="Any comments about the delivery..." className="mt-1" rows={2} />
            </div>
            <Button className="w-full" onClick={() => submitPod.mutate()} disabled={submitPod.isPending}>
              {submitPod.isPending ? "Submitting..." : "Confirm Delivery ✓"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </CustomerLayout>
  );
}
