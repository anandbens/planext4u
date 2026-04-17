import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { foodApi, Rider } from "@/lib/food-api";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { LogOut, MapPin, Phone, Bike, Star } from "lucide-react";
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

  // Live geolocation push when rider is online and has an active assignment
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
        <p className="text-sm text-muted-foreground">Your account is not yet linked to a rider profile. Contact admin.</p>
        <Button onClick={async () => { await supabase.auth.signOut(); navigate('/rider/login'); }}>Sign out</Button>
      </Card>
    </div>
  );

  const toggleOnline = async (v: boolean) => {
    await foodApi.setRiderOnline(rider.id, v);
    setRider({ ...rider, is_online: v });
    toast.success(v ? "You're online" : "You're offline");
  };

  const respond = async (id: string, accept: boolean) => {
    await foodApi.respondToAssignment(id, accept);
    if (accept) toast.success("Order accepted"); else toast("Order declined");
    load();
  };

  return (
    <div className="min-h-screen bg-muted/20 pb-12">
      <header className="bg-background border-b border-border/50 px-4 py-3 flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold">{rider.name}</h1>
          <p className="text-xs text-muted-foreground"><Bike className="h-3 w-3 inline mr-1" />{rider.vehicle_type} • {rider.vehicle_number}</p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant={rider.is_online ? 'default' : 'outline'}>{rider.is_online ? 'Online' : 'Offline'}</Badge>
          <Switch checked={rider.is_online} onCheckedChange={toggleOnline} />
          <Button size="icon" variant="ghost" onClick={async () => { await supabase.auth.signOut(); navigate('/rider/login'); }}>
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </header>

      <div className="p-4 grid grid-cols-3 gap-2">
        <StatBox label="Today" value={`₹0`} />
        <StatBox label="Trips" value={String(rider.total_deliveries)} />
        <StatBox label="Rating" value={`★ ${rider.rating || 'New'}`} />
      </div>

      <div className="p-4 space-y-3">
        <h2 className="font-semibold">Assignments</h2>
        {assignments.length === 0 && <p className="text-sm text-muted-foreground text-center py-12">No assignments yet — go online to receive orders.</p>}
        {assignments.map(a => {
          const o = a.food_orders;
          if (!o) return null;
          return (
            <Card key={a.id} className="p-3 space-y-2">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-sm font-semibold">{o.restaurant_name}</p>
                  <p className="text-xs text-muted-foreground"><MapPin className="h-3 w-3 inline mr-1" />{o.delivery_address}</p>
                </div>
                <Badge>{a.status}</Badge>
              </div>
              <div className="text-xs text-muted-foreground">
                Distance: {a.distance_km ?? '—'} km • Payout: ₹{a.payout_amount}
              </div>
              {a.status === 'offered' && (
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" className="flex-1" onClick={() => respond(a.id, false)}>Decline</Button>
                  <Button size="sm" className="flex-1" onClick={() => respond(a.id, true)}>Accept</Button>
                </div>
              )}
              {a.status === 'accepted' && (
                <>
                  {(o.delivery_lat && o.delivery_lng) && (
                    <LiveTrackingMap
                      orderId={o.id}
                      riderId={rider.id}
                      drop={{ lat: Number(o.delivery_lat), lng: Number(o.delivery_lng) }}
                      height={200}
                    />
                  )}
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" onClick={() => window.open(`tel:${o.customer_phone || ''}`)}><Phone className="h-3 w-3 mr-1" />Call</Button>
                    <Button size="sm" variant="outline" onClick={() => {
                      if (o.delivery_lat && o.delivery_lng) window.open(`https://www.google.com/maps/dir/?api=1&destination=${o.delivery_lat},${o.delivery_lng}&travelmode=driving`);
                    }}>Navigate</Button>
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
                </>
              )}
            </Card>
          );
        })}
      </div>
    </div>
  );
}

function StatBox({ label, value }: { label: string; value: string }) {
  return (
    <Card className="p-3 text-center">
      <p className="text-lg font-bold">{value}</p>
      <p className="text-xs text-muted-foreground">{label}</p>
    </Card>
  );
}
