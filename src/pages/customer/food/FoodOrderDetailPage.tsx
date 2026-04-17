import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { foodApi, FoodOrder } from "@/lib/food-api";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowLeft, MapPin, Clock, MessageCircle, Phone, RotateCcw, X, Star, Bike, ChefHat, CheckCircle2, FileText, Receipt } from "lucide-react";
import { LiveTrackingMap } from "@/components/food/LiveTrackingMap";
import { OrderChatPanel } from "@/components/food/OrderChatPanel";
import { CancelOrderDialog } from "@/components/food/CancelOrderDialog";
import { downloadInvoice } from "@/lib/food-invoice";
import { FoodReviewModal } from "@/components/food/FoodReviewModal";
import { toast } from "sonner";

const STATUS_STEPS = ['placed', 'accepted', 'preparing', 'ready', 'picked_up', 'on_the_way', 'delivered'];
const STATUS_LABEL: Record<string, string> = {
  placed: "Order placed",
  accepted: "Restaurant accepted",
  preparing: "Preparing your food",
  ready: "Ready for pickup",
  picked_up: "Rider picked up",
  on_the_way: "On the way",
  delivered: "Delivered",
};
const STATUS_DESC: Record<string, string> = {
  placed: "We've received your order",
  accepted: "Restaurant is getting ready",
  preparing: "Your delicious food is being cooked",
  ready: "Food is packed, waiting for the rider",
  picked_up: "Rider has collected your order",
  on_the_way: "Rider is heading to your address",
  delivered: "Enjoy your meal!",
};

export default function FoodOrderDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { customerUser, user } = useAuth();
  const [order, setOrder] = useState<FoodOrder | null>(null);
  const [restaurantCoords, setRestaurantCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [restaurantPhone, setRestaurantPhone] = useState<string | null>(null);
  const [riderId, setRiderId] = useState<string | null>(null);
  const [rider, setRider] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showChat, setShowChat] = useState(false);
  const [showCancel, setShowCancel] = useState(false);
  const [unread, setUnread] = useState(0);
  const [showReview, setShowReview] = useState(false);
  const [existingReview, setExistingReview] = useState<any>(null);

  useEffect(() => {
    if (!id) return;
    const load = async () => {
      const { data } = await supabase.from('food_orders').select('*').eq('id', id).maybeSingle();
      setOrder(data as FoodOrder); setLoading(false);
      if (data) {
        const { data: r } = await supabase.from('restaurants').select('latitude,longitude,phone').eq('id', (data as any).restaurant_id).maybeSingle();
        if (r?.latitude && r?.longitude) setRestaurantCoords({ lat: Number(r.latitude), lng: Number(r.longitude) });
        if (r?.phone) setRestaurantPhone(r.phone);
        const { data: ra } = await supabase.from('rider_assignments').select('rider_id').eq('order_id', id).eq('status', 'accepted').maybeSingle();
        if (ra?.rider_id) {
          setRiderId(ra.rider_id);
          foodApi.getRider(ra.rider_id).then(setRider);
        }
      }
      // load existing review for this order
      const { data: rev } = await supabase.from('food_reviews').select('*').eq('order_id', id).maybeSingle();
      if (rev) setExistingReview(rev);
    };
    load();
    const ch = supabase.channel(`food-order-${id}`)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'food_orders', filter: `id=eq.${id}` },
        (payload) => setOrder(payload.new as FoodOrder))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'rider_assignments', filter: `order_id=eq.${id}` },
        (payload) => {
          const r: any = payload.new;
          if (r?.rider_id && r?.status === 'accepted') {
            setRiderId(r.rider_id);
            foodApi.getRider(r.rider_id).then(setRider);
          }
        })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'food_order_chats', filter: `order_id=eq.${id}` },
        (payload) => {
          const m: any = payload.new;
          if (m.sender_id !== user?.id && !showChat) setUnread(u => u + 1);
        })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [id, user?.id, showChat]);

  const handleReorder = async () => {
    if (!order) return;
    try {
      const data = await foodApi.reorder(order.id);
      if (!data) return;
      localStorage.setItem('food_reorder_payload', JSON.stringify({
        restaurant_id: order.restaurant_id,
        items: data.items,
      }));
      toast.success("Items added to cart");
      navigate(`/app/food/restaurant/${order.restaurant_id}`);
    } catch (e: any) {
      toast.error(e.message || "Couldn't reorder");
    }
  };

  const handleDownloadInvoice = async () => {
    if (!order) return;
    try {
      const inv = await foodApi.getInvoice(order.id);
      if (!inv) { toast.error("Invoice not yet generated"); return; }
      downloadInvoice({
        invoice_no: inv.invoice_no, order_id: order.id, generated_at: inv.generated_at,
        customer_name: order.customer_name, customer_phone: order.customer_phone,
        delivery_address: order.delivery_address, restaurant_name: order.restaurant_name,
        items: (order.items as any[]).map(it => ({ name: it.name, qty: it.qty, price: it.price })),
        subtotal: order.subtotal, delivery_fee: order.delivery_fee, packaging_fee: order.packaging_fee,
        platform_fee: order.platform_fee, tax: order.gst, discount: order.discount, total: order.total,
        payment_method: order.payment_method, payment_id: (order as any).razorpay_payment_id,
      });
    } catch (e: any) {
      toast.error(e.message || "Could not download invoice");
    }
  };

  if (loading || !order) return (
    <div className="min-h-screen flex items-center justify-center"><div className="h-8 w-8 rounded-full border-2 border-primary border-t-transparent animate-spin" /></div>
  );

  const stepIdx = STATUS_STEPS.indexOf(order.status);
  const isTerminal = order.status === 'cancelled' || order.status === 'rejected';
  const canCancel = (order.status === 'placed') ||
    (order.status === 'accepted' && order.accepted_at &&
     (Date.now() - new Date(order.accepted_at).getTime()) < 60_000);

  return (
    <div className="min-h-screen bg-muted/20 pb-12">
      <header className="sticky top-0 bg-background border-b border-border/50 px-4 py-3 flex items-center gap-3 z-30">
        <button onClick={() => navigate(-1)}><ArrowLeft className="h-5 w-5" /></button>
        <div className="flex-1">
          <h1 className="text-base font-bold">{order.restaurant_name}</h1>
          <p className="text-xs text-muted-foreground">#{order.id}</p>
        </div>
        {order.status === 'delivered' && (
          <Button size="sm" variant="outline" onClick={handleReorder} className="gap-1">
            <RotateCcw className="h-3 w-3" /> Reorder
          </Button>
        )}
      </header>

      <div className="p-4 space-y-3">
        {isTerminal ? (
          <Card className="p-4">
            <Badge variant="destructive" className="mb-2">{STATUS_LABEL[order.status] || order.status}</Badge>
            {order.cancellation_reason && <p className="text-xs text-muted-foreground">{order.cancellation_reason}</p>}
            <Button variant="outline" size="sm" className="mt-3 gap-1" onClick={handleReorder}>
              <RotateCcw className="h-3 w-3" /> Reorder
            </Button>
          </Card>
        ) : (
          <>
            {/* Status hero card */}
            <Card className="p-4 space-y-3 bg-gradient-to-br from-primary/5 to-primary/10">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-primary/15 flex items-center justify-center">
                    {order.status === 'preparing' ? <ChefHat className="h-5 w-5 text-primary" /> :
                     order.status === 'on_the_way' || order.status === 'picked_up' ? <Bike className="h-5 w-5 text-primary" /> :
                     order.status === 'delivered' ? <CheckCircle2 className="h-5 w-5 text-primary" /> :
                     <Clock className="h-5 w-5 text-primary" />}
                  </div>
                  <div>
                    <p className="font-semibold text-sm">{STATUS_LABEL[order.status]}</p>
                    <p className="text-xs text-muted-foreground">{STATUS_DESC[order.status]}</p>
                  </div>
                </div>
                {order.eta_minutes != null && order.status !== 'delivered' && (
                  <Badge variant="secondary"><Clock className="h-3 w-3 mr-1" />~{order.eta_minutes} min</Badge>
                )}
              </div>

              <div className="space-y-2 pt-2">
                {STATUS_STEPS.map((s, i) => (
                  <div key={s} className="flex items-center gap-3">
                    <div className={`h-6 w-6 rounded-full border-2 flex items-center justify-center text-xs ${
                      i <= stepIdx ? 'bg-primary border-primary text-primary-foreground' : 'border-border bg-background'
                    }`}>{i <= stepIdx ? '✓' : i + 1}</div>
                    <span className={`text-sm ${i <= stepIdx ? 'font-medium' : 'text-muted-foreground'}`}>{STATUS_LABEL[s]}</span>
                  </div>
                ))}
              </div>

              {order.handover_otp && order.status !== 'delivered' && (
                <div className="bg-background rounded-lg p-3 text-center border border-border/50">
                  <p className="text-xs text-muted-foreground">Share this OTP with rider on delivery</p>
                  <p className="text-2xl font-bold tracking-widest mt-1 text-primary">{order.handover_otp}</p>
                </div>
              )}

              {canCancel && (
                <Button variant="outline" size="sm" className="w-full gap-1" onClick={() => setShowCancel(true)}>
                  <X className="h-3 w-3" /> Cancel order
                </Button>
              )}
            </Card>

            {/* Rider card */}
            {rider && (
              <Card className="p-3">
                <div className="flex items-center gap-3">
                  <div className="h-12 w-12 rounded-full bg-primary/15 flex items-center justify-center">
                    <Bike className="h-6 w-6 text-primary" />
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold text-sm">{rider.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {rider.vehicle_type}{rider.vehicle_number ? ` • ${rider.vehicle_number}` : ''}
                    </p>
                    {rider.rating > 0 && (
                      <div className="flex items-center gap-1 text-xs mt-0.5">
                        <Star className="h-3 w-3 fill-warning text-warning" />
                        <span>{rider.rating.toFixed(1)} • {rider.total_deliveries} deliveries</span>
                      </div>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <Button size="icon" variant="outline" className="relative" onClick={() => { setShowChat(s => !s); setUnread(0); }}>
                      <MessageCircle className="h-4 w-4" />
                      {unread > 0 && (
                        <span className="absolute -top-1 -right-1 bg-destructive text-destructive-foreground text-[10px] h-4 w-4 rounded-full flex items-center justify-center">
                          {unread}
                        </span>
                      )}
                    </Button>
                  </div>
                </div>
                {showChat && customerUser?.id && (
                  <div className="mt-3 pt-3 border-t border-border/50">
                    <OrderChatPanel orderId={order.id} userId={user!.id} role="customer" height={260} />
                  </div>
                )}
              </Card>
            )}

            {/* Live map */}
            {order.status !== 'delivered' && (order.delivery_lat && order.delivery_lng) && (
              <Card className="p-3">
                <h3 className="font-semibold text-sm mb-2">Live tracking</h3>
                <LiveTrackingMap
                  orderId={order.id}
                  riderId={riderId}
                  pickup={restaurantCoords}
                  drop={{ lat: Number(order.delivery_lat), lng: Number(order.delivery_lng) }}
                  height={260}
                />
              </Card>
            )}

            {/* Restaurant call */}
            {restaurantPhone && (
              <Card className="p-3 flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">Need to reach the restaurant?</p>
                  <p className="text-xs text-muted-foreground">Call them directly for queries</p>
                </div>
                <Button size="sm" variant="outline" asChild className="gap-1">
                  <a href={`tel:${restaurantPhone}`}><Phone className="h-3 w-3" /> Call</a>
                </Button>
              </Card>
            )}
          </>
        )}

        <Card className="p-4">
          <h3 className="font-semibold text-sm mb-2">Delivery address</h3>
          <p className="text-xs text-muted-foreground"><MapPin className="h-3 w-3 inline mr-1" />{order.delivery_address}</p>
        </Card>

        <Card className="p-4 space-y-2">
          <h3 className="font-semibold text-sm">Items ({(order.items as any[]).length})</h3>
          {(order.items as any[]).map((it, i) => (
            <div key={i} className="flex justify-between text-sm">
              <span>{it.qty} × {it.name}</span>
              <span>₹{it.qty * it.price}</span>
            </div>
          ))}
          <div className="border-t border-border/50 my-2" />
          <div className="flex justify-between text-sm"><span className="text-muted-foreground">Subtotal</span><span>₹{order.subtotal}</span></div>
          <div className="flex justify-between text-sm"><span className="text-muted-foreground">Delivery</span><span>₹{order.delivery_fee}</span></div>
          <div className="flex justify-between text-sm"><span className="text-muted-foreground">Packaging</span><span>₹{order.packaging_fee}</span></div>
          <div className="flex justify-between text-sm"><span className="text-muted-foreground">GST</span><span>₹{order.gst}</span></div>
          {order.discount > 0 && (
            <div className="flex justify-between text-sm text-success"><span>Discount</span><span>-₹{order.discount}</span></div>
          )}
          <div className="flex justify-between text-base font-bold mt-1"><span>Total</span><span>₹{order.total}</span></div>
          <div className="flex justify-between text-xs text-muted-foreground mt-2">
            <span className="flex items-center gap-1"><Receipt className="h-3 w-3" /> Paid via {(order.payment_method || '').toUpperCase()}</span>
            <span>{order.payment_status === 'paid' ? '✓ Paid' : order.payment_status === 'refunded' ? 'Refunded' : 'Pending'}</span>
          </div>
          {(order.status === 'delivered' || order.status === 'completed') && (
            <div className="flex gap-2 mt-2">
              <Button variant="outline" size="sm" className="flex-1 gap-1" onClick={handleDownloadInvoice}>
                <FileText className="h-3 w-3" /> Invoice
              </Button>
              <Button size="sm" className="flex-1 gap-1" onClick={() => setShowReview(true)}>
                <Star className="h-3 w-3" /> {existingReview ? "Edit review" : "Rate order"}
              </Button>
            </div>
          )}
        </Card>
      </div>

      <CancelOrderDialog open={showCancel} onOpenChange={setShowCancel} orderId={order.id}
        onCancelled={() => setOrder(o => o ? { ...o, status: 'cancelled' } : o)} />

      {customerUser?.id && (
        <FoodReviewModal
          open={showReview}
          onOpenChange={setShowReview}
          orderId={order.id}
          customerId={customerUser.id}
          restaurantId={order.restaurant_id}
          riderId={riderId}
          initial={existingReview}
          onSubmitted={async () => {
            const { data } = await supabase.from('food_reviews').select('*').eq('order_id', order.id).maybeSingle();
            if (data) setExistingReview(data);
          }}
        />
      )}
    </div>
  );
}
