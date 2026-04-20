import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { foodApi, Rider } from "@/lib/food-api";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { LogOut, MapPin, Phone, Bike, User, Wallet, Navigation } from "lucide-react";
import { LiveTrackingMap } from "@/components/food/LiveTrackingMap";

export default function RiderDashboardPage() {
  const navigate = useNavigate();
  const [rider, setRider] = useState<Rider | null>(null);
  const [assignments, setAssignments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const watchId = useRef<number | null>(null);

  const load = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { navigate('/rider/login'); return; }
    const { data: r } = await supabase.from('riders').select('*').eq('user_id', user.id).maybeSingle();
    if (!r) { setLoading(false); return; }
    setRider(r as Rider);
    const list = await foodApi.listRiderAssignments(r.id);
    setAssignments(list);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  // Realtime subscription for new offers
  useEffect(() => {
    if (!rider) return;
    const channel = supabase
      .channel(`rider-${rider.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'rider_assignments', filter: `rider_id=eq.${rider.id}` },
        () => load())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [rider?.id]);

  // Live geolocation push when rider is online
  useEffect(() => {
    if (!rider?.is_online) {
      if (watchId.current != null) { navigator.geolocation.clearWatch(watchId.current); watchId.current = null; }
      return;
    }
    if (!('geolocation' in navigator)) return;
    const activeAssignment = assignments.find(a => a.status === 'accepted');
    watchId.current = navigator.geolocation.watchPosition(async (pos) => {
      try {
        await foodApi.setRiderOnline(rider.id, true, { lat: pos.coords.latitude, lng: pos.coords.longitude });
        if (activeAssignment) {
          await foodApi.pushLocation(rider.id, activeAssignment.order_id, pos.coords.latitude, pos.coords.longitude,
            pos.coords.heading ?? undefined, pos.coords.speed ? pos.coords.speed * 3.6 : undefined);
        }
      } catch {}
    }, () => {}, { enableHighAccuracy: true, maximumAge: 5000 });

    return () => { if (watchId.current != null) navigator.geolocation.clearWatch(watchId.current); };
  }, [rider?.is_online, assignments]);

  if (loading) return <div className="min-h-screen flex items-center justify-center"><div className="h-8 w-8 rounded-full border-2 border-primary border-t-transparent animate-spin" /></div>;

  if (!rider) return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <Card className="p-6 text-center space-y-3 max-w-sm">
        <h2 className="text-lg font-semibold">Rider profile not found</h2>
        <p className="text-sm text-muted-foreground">Your account is not yet linked to a rider profile. Contact admin or complete registration.</p>
        <div className="flex gap-2">
          <Button variant="outline" className="flex-1" onClick={() => navigate('/rider/register')}>Register</Button>
          <Button className="flex-1" onClick={async () => { await supabase.auth.signOut(); navigate('/rider/login'); }}>Sign out</Button>
        </div>
      </Card>
    </div>
  );

  const toggleOnline = async (v: boolean) => {
    if (v && rider.kyc_status !== 'verified') {
      toast.error("KYC must be verified to go online"); return;
    }
    await foodApi.setRiderOnline(rider.id, v);
    setRider({ ...rider, is_online: v });
    toast.success(v ? "You're online" : "You're offline");
  };

  const respond = async (id: string, accept: boolean) => {
    await foodApi.respondToAssignment(id, accept);
    if (accept) toast.success("Order accepted"); else toast("Order declined");
    load();
  };

  // Group active orders for stacking visualization
  const activeOrders = assignments.filter(a => a.status === 'accepted');
  const offers = assignments.filter(a => a.status === 'offered');
  const recent = assignments.filter(a => ['delivered', 'cancelled', 'rejected'].includes(a.food_orders?.status || '') || ['rejected', 'expired'].includes(a.status)).slice(0, 5);

  // Build stacked route URL when multiple active orders exist
  const buildStackedRouteUrl = () => {
    if (activeOrders.length === 0) return null;
    const points = activeOrders
      .sort((a, b) => (a.sequence_no || 1) - (b.sequence_no || 1))
      .flatMap(a => {
        const o = a.food_orders;
        if (!o) return [];
        const pts: string[] = [];
        if (o.status === 'ready' || o.status === 'assigned') pts.push(`${o.restaurant_lat || a.pickup_lat},${o.restaurant_lng || a.pickup_lng}`);
        pts.push(`${o.delivery_lat || a.drop_lat},${o.delivery_lng || a.drop_lng}`);
        return pts;
      })
      .filter(p => !p.startsWith('null'));
    if (points.length === 0) return null;
    const dest = points[points.length - 1];
    const waypoints = points.slice(0, -1).join('|');
    return `https://www.google.com/maps/dir/?api=1&destination=${dest}${waypoints ? `&waypoints=${waypoints}` : ''}&travelmode=driving`;
  };

  return (
    <div className="min-h-screen bg-muted/20 pb-12">
      <header className="bg-background border-b border-border/50 px-4 py-3 flex items-center justify-between sticky top-0 z-10">
        <div>
          <h1 className="text-lg font-bold">{rider.name}</h1>
          <p className="text-xs text-muted-foreground"><Bike className="h-3 w-3 inline mr-1" />{rider.vehicle_type} • {rider.vehicle_number}</p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant={rider.is_online ? 'default' : 'outline'}>{rider.is_online ? 'Online' : 'Offline'}</Badge>
          <Switch checked={rider.is_online} onCheckedChange={toggleOnline} />
          <Button size="icon" variant="ghost" onClick={() => navigate('/rider/profile')}>
            <User className="h-4 w-4" />
          </Button>
          <Button size="icon" variant="ghost" onClick={async () => { await supabase.auth.signOut(); navigate('/rider/login'); }}>
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </header>

      {rider.kyc_status !== 'verified' && (
        <div className="m-4 p-3 rounded-lg bg-accent/20 border border-accent/40 text-foreground text-sm">
          <p className="font-semibold">Complete your KYC to start receiving orders.</p>
          <Button size="sm" variant="outline" className="mt-2" onClick={() => navigate('/rider/kyc')}>Complete KYC</Button>
        </div>
      )}

      <div className="p-4 grid grid-cols-3 gap-2">
        <button onClick={() => navigate('/rider/earnings')} className="text-left">
          <Card className="p-3 text-center"><Wallet className="h-4 w-4 mx-auto text-primary mb-1" /><p className="text-base font-bold">₹{Number(rider.total_earnings || 0).toFixed(0)}</p><p className="text-[10px] text-muted-foreground">Lifetime</p></Card>
        </button>
        <Card className="p-3 text-center"><p className="text-base font-bold">{rider.total_deliveries}</p><p className="text-[10px] text-muted-foreground">Trips</p></Card>
        <Card className="p-3 text-center"><p className="text-base font-bold">★ {rider.rating || 'New'}</p><p className="text-[10px] text-muted-foreground">Rating</p></Card>
      </div>

      {activeOrders.length > 1 && (
        <div className="px-4">
          <Card className="p-3 bg-primary/5 border-primary/30 flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-primary">{activeOrders.length} stacked orders</p>
              <p className="text-xs text-muted-foreground">Optimised pickup → delivery route</p>
            </div>
            <Button size="sm" onClick={() => { const u = buildStackedRouteUrl(); if (u) window.open(u); }}>
              <Navigation className="h-3 w-3 mr-1" />Route
            </Button>
          </Card>
        </div>
      )}

      <div className="p-4 space-y-3">
        {offers.length > 0 && <h2 className="font-semibold text-sm">New offers</h2>}
        {offers.map(a => {
          const o = a.food_orders;
          if (!o) return null;
          return (
            <Card key={a.id} className="p-3 space-y-2 border-primary/40 bg-primary/5">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-sm font-semibold">{o.restaurant_name}</p>
                  <p className="text-xs text-muted-foreground"><MapPin className="h-3 w-3 inline mr-1" />{o.delivery_address}</p>
                </div>
                <Badge>NEW</Badge>
              </div>
              <div className="text-xs text-muted-foreground">
                Distance: {Number(a.distance_km).toFixed(1)} km • Payout: ₹{a.payout_amount}
              </div>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" className="flex-1" onClick={() => respond(a.id, false)}>Decline</Button>
                <Button size="sm" className="flex-1" onClick={() => respond(a.id, true)}>Accept</Button>
              </div>
            </Card>
          );
        })}

        {activeOrders.length > 0 && <h2 className="font-semibold text-sm pt-2">Active deliveries ({activeOrders.length})</h2>}
        {activeOrders.map((a, idx) => {
          const o = a.food_orders;
          if (!o) return null;
          return (
            <Card key={a.id} className="p-3 space-y-2">
              <div className="flex justify-between items-start">
                <div className="flex items-center gap-2">
                  <span className="h-6 w-6 rounded-full bg-primary text-primary-foreground text-xs font-bold flex items-center justify-center">{idx + 1}</span>
                  <div>
                    <p className="text-sm font-semibold">{o.restaurant_name}</p>
                    <p className="text-xs text-muted-foreground"><MapPin className="h-3 w-3 inline mr-1" />{o.delivery_address}</p>
                  </div>
                </div>
                <Badge>{o.status}</Badge>
              </div>
              {(o.delivery_lat && o.delivery_lng) && idx === 0 && (
                <LiveTrackingMap
                  orderId={o.id}
                  riderId={rider.id}
                  drop={{ lat: Number(o.delivery_lat), lng: Number(o.delivery_lng) }}
                  height={180}
                />
              )}
              <div className="flex gap-2 flex-wrap">
                <Button size="sm" variant="outline" onClick={() => window.open(`tel:${o.customer_phone || ''}`)}><Phone className="h-3 w-3 mr-1" />Call</Button>
                <Button size="sm" variant="outline" onClick={() => {
                  if (o.status === 'ready' || o.status === 'assigned') {
                    if (o.restaurant_lat && o.restaurant_lng) window.open(`https://www.google.com/maps/dir/?api=1&destination=${o.restaurant_lat},${o.restaurant_lng}&travelmode=driving`);
                  } else if (o.delivery_lat && o.delivery_lng) {
                    window.open(`https://www.google.com/maps/dir/?api=1&destination=${o.delivery_lat},${o.delivery_lng}&travelmode=driving`);
                  }
                }}><Navigation className="h-3 w-3 mr-1" />Navigate</Button>
                <Button size="sm" className="ml-auto" onClick={async () => {
                  if (o.status === 'ready' || o.status === 'assigned') {
                    await foodApi.updateOrderStatus(o.id, 'picked_up'); toast.success("Picked up"); load();
                  } else if (o.status === 'picked_up' || o.status === 'on_the_way') {
                    const otp = prompt("Enter handover OTP from customer:");
                    if (otp && otp === o.handover_otp) {
                      await foodApi.updateOrderStatus(o.id, 'delivered'); toast.success("Delivered ✓"); load();
                    } else if (otp) toast.error("OTP doesn't match");
                  }
                }}>
                  {o.status === 'picked_up' || o.status === 'on_the_way' ? 'Mark Delivered' : 'Mark Picked Up'}
                </Button>
              </div>
            </Card>
          );
        })}

        {offers.length === 0 && activeOrders.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-12">
            {rider.is_online ? "No assignments — waiting for new orders." : "Go online to receive orders."}
          </p>
        )}

        {recent.length > 0 && (
          <>
            <h2 className="font-semibold text-sm pt-2">Recent</h2>
            {recent.map(a => (
              <Card key={a.id} className="p-3 flex items-center justify-between text-xs">
                <div>
                  <p className="font-medium">{a.food_orders?.restaurant_name || 'Order'}</p>
                  <p className="text-muted-foreground">{a.food_orders?.delivery_address || ''}</p>
                </div>
                <Badge variant="outline" className="text-[10px]">{a.food_orders?.status || a.status}</Badge>
              </Card>
            ))}
          </>
        )}
      </div>
    </div>
  );
}
