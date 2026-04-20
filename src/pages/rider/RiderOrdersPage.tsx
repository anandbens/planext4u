import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { foodApi, Rider } from "@/lib/food-api";
import { RiderLayout } from "@/components/rider/RiderLayout";
import { MapPin, Clock, IndianRupee } from "lucide-react";

export default function RiderOrdersPage() {
  const navigate = useNavigate();
  const [rider, setRider] = useState<Rider | null>(null);
  const [assignments, setAssignments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

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

  useEffect(() => {
    if (!rider) return;
    const channel = supabase
      .channel(`rider-orders-${rider.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'rider_assignments', filter: `rider_id=eq.${rider.id}` }, () => load())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [rider?.id]);

  if (loading) return (
    <RiderLayout title="My Orders">
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="h-8 w-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
      </div>
    </RiderLayout>
  );

  const active = assignments.filter(a => a.status === 'accepted' && !['delivered', 'cancelled'].includes(a.food_orders?.status));
  const completed = assignments.filter(a => a.food_orders?.status === 'delivered');
  const cancelled = assignments.filter(a => ['cancelled', 'rejected', 'expired'].includes(a.status) || a.food_orders?.status === 'cancelled');

  const renderCard = (a: any) => {
    const o = a.food_orders;
    if (!o) return null;
    return (
      <Card key={a.id} className="p-3 space-y-2">
        <div className="flex justify-between items-start">
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold truncate">{o.restaurant_name}</p>
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <MapPin className="h-3 w-3" /><span className="truncate">{o.delivery_address}</span>
            </p>
          </div>
          <Badge variant={o.status === 'delivered' ? 'default' : 'outline'}>{o.status}</Badge>
        </div>
        <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
          <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{new Date(a.created_at).toLocaleString()}</span>
          <span className="flex items-center gap-1"><IndianRupee className="h-3 w-3" />{a.payout_amount}</span>
        </div>
      </Card>
    );
  };

  return (
    <RiderLayout title="My Orders">
      <div className="p-4">
        <Tabs defaultValue="active">
          <TabsList className="w-full grid grid-cols-3">
            <TabsTrigger value="active">Active ({active.length})</TabsTrigger>
            <TabsTrigger value="completed">Completed ({completed.length})</TabsTrigger>
            <TabsTrigger value="cancelled">Cancelled ({cancelled.length})</TabsTrigger>
          </TabsList>
          <TabsContent value="active" className="space-y-2 mt-4">
            {active.length === 0 ? <p className="text-sm text-center text-muted-foreground py-12">No active orders</p> : active.map(renderCard)}
            {active.length > 0 && (
              <Button className="w-full mt-4" onClick={() => navigate('/rider')}>Open Live Map</Button>
            )}
          </TabsContent>
          <TabsContent value="completed" className="space-y-2 mt-4">
            {completed.length === 0 ? <p className="text-sm text-center text-muted-foreground py-12">No completed orders yet</p> : completed.map(renderCard)}
          </TabsContent>
          <TabsContent value="cancelled" className="space-y-2 mt-4">
            {cancelled.length === 0 ? <p className="text-sm text-center text-muted-foreground py-12">No cancelled orders</p> : cancelled.map(renderCard)}
          </TabsContent>
        </Tabs>
      </div>
    </RiderLayout>
  );
}
