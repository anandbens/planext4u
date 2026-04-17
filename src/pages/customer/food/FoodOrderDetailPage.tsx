import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { foodApi, FoodOrder } from "@/lib/food-api";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowLeft, MapPin, Phone, Clock } from "lucide-react";
import { LiveTrackingMap } from "@/components/food/LiveTrackingMap";

const STATUS_STEPS = ['placed', 'accepted', 'preparing', 'ready', 'picked_up', 'on_the_way', 'delivered'];
const STATUS_LABEL: Record<string, string> = {
  placed: "Order placed", accepted: "Restaurant accepted", preparing: "Preparing your food",
  ready: "Ready for pickup", picked_up: "Rider picked up", on_the_way: "On the way",
  delivered: "Delivered",
};

export default function FoodOrderDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [order, setOrder] = useState<FoodOrder | null>(null);
  const [restaurantCoords, setRestaurantCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [riderId, setRiderId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    const load = async () => {
      const { data } = await supabase.from('food_orders').select('*').eq('id', id).maybeSingle();
      setOrder(data as FoodOrder); setLoading(false);
      if (data) {
        const { data: r } = await supabase.from('restaurants').select('latitude,longitude').eq('id', (data as any).restaurant_id).maybeSingle();
        if (r?.latitude && r?.longitude) setRestaurantCoords({ lat: Number(r.latitude), lng: Number(r.longitude) });
        const { data: ra } = await supabase.from('rider_assignments').select('rider_id').eq('order_id', id).eq('status', 'accepted').maybeSingle();
        if (ra?.rider_id) setRiderId(ra.rider_id);
      }
    };
    load();
    const ch = supabase.channel(`food-order-${id}`)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'food_orders', filter: `id=eq.${id}` },
        (payload) => setOrder(payload.new as FoodOrder))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'rider_assignments', filter: `order_id=eq.${id}` },
        (payload) => { const r: any = payload.new; if (r?.rider_id && r?.status === 'accepted') setRiderId(r.rider_id); })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [id]);

  if (loading || !order) return (
    <div className="min-h-screen flex items-center justify-center"><div className="h-8 w-8 rounded-full border-2 border-primary border-t-transparent animate-spin" /></div>
  );

  const stepIdx = STATUS_STEPS.indexOf(order.status);

  return (
    <div className="min-h-screen bg-muted/20 pb-12">
      <header className="sticky top-0 bg-background border-b border-border/50 px-4 py-3 flex items-center gap-3 z-30">
        <button onClick={() => navigate(-1)}><ArrowLeft className="h-5 w-5" /></button>
        <div>
          <h1 className="text-base font-bold">{order.restaurant_name}</h1>
          <p className="text-xs text-muted-foreground">{order.id}</p>
        </div>
      </header>

      <div className="p-4 space-y-3">
        {order.status === 'cancelled' || order.status === 'rejected' ? (
          <Card className="p-4">
            <Badge variant="destructive">{STATUS_LABEL[order.status] || order.status}</Badge>
            {order.cancellation_reason && <p className="text-xs text-muted-foreground mt-2">{order.cancellation_reason}</p>}
          </Card>
        ) : (
          <Card className="p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-sm">Order status</h3>
              {order.eta_minutes != null && order.status !== 'delivered' && (
                <Badge variant="secondary"><Clock className="h-3 w-3 mr-1" />~{order.eta_minutes} min</Badge>
              )}
            </div>
            <div className="space-y-2">
              {STATUS_STEPS.filter(s => s !== 'assigned').map((s, i) => (
                <div key={s} className="flex items-center gap-3">
                  <div className={`h-6 w-6 rounded-full border-2 flex items-center justify-center text-xs ${
                    i <= stepIdx ? 'bg-success border-success text-success-foreground' : 'border-border'
                  }`}>{i <= stepIdx ? '✓' : i + 1}</div>
                  <span className={`text-sm ${i <= stepIdx ? 'font-medium' : 'text-muted-foreground'}`}>{STATUS_LABEL[s]}</span>
                </div>
              ))}
            </div>
            {order.handover_otp && order.status !== 'delivered' && (
              <div className="bg-primary/10 rounded-lg p-3 text-center">
                <p className="text-xs text-muted-foreground">Share this OTP with rider</p>
                <p className="text-2xl font-bold tracking-widest mt-1">{order.handover_otp}</p>
              </div>
            )}
          </Card>
        )}

        {order.status !== 'delivered' && order.status !== 'cancelled' && order.status !== 'rejected' &&
          (order.delivery_lat && order.delivery_lng) && (
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
          <div className="flex justify-between text-base font-bold mt-1"><span>Total</span><span>₹{order.total}</span></div>
        </Card>
      </div>
    </div>
  );
}
