import { useEffect, useState } from "react";
import { VendorLayout } from "@/components/vendor/VendorLayout";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { foodApi, FoodOrder } from "@/lib/food-api";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

const NEXT: Record<string, string | null> = {
  placed: 'accepted', accepted: 'preparing', preparing: 'ready', ready: 'assigned', assigned: null,
};

export default function VendorFoodOrdersPage() {
  const { vendorUser } = useAuth();
  const [orders, setOrders] = useState<FoodOrder[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    if (!vendorUser?.vendor_id) return;
    const { data: rest } = await supabase.from('restaurants').select('id').eq('vendor_id', vendorUser.vendor_id).maybeSingle();
    if (!rest) { setLoading(false); return; }
    const list = await foodApi.listRestaurantOrders(rest.id);
    setOrders(list); setLoading(false);
  };

  useEffect(() => { load(); }, [vendorUser?.vendor_id]);

  const advance = async (o: FoodOrder) => {
    const next = NEXT[o.status]; if (!next) return;
    await foodApi.updateOrderStatus(o.id, next); toast.success(`Marked ${next}`); load();
  };

  const reject = async (o: FoodOrder) => {
    if (!confirm("Reject this order?")) return;
    await foodApi.updateOrderStatus(o.id, 'rejected', { cancellation_reason: 'Rejected by restaurant' });
    toast.success("Rejected"); load();
  };

  return (
    <VendorLayout>
      <div className="p-4 space-y-3 pb-24">
        <h1 className="text-xl font-bold">Food Orders</h1>
        {loading ? <div className="flex justify-center py-12"><div className="h-8 w-8 rounded-full border-2 border-primary border-t-transparent animate-spin" /></div>
        : orders.length === 0 ? <p className="text-center text-sm text-muted-foreground py-12">No food orders yet</p>
        : orders.map(o => (
          <Card key={o.id} className="p-3 space-y-2">
            <div className="flex justify-between items-start">
              <div>
                <p className="font-semibold text-sm">{o.id}</p>
                <p className="text-xs text-muted-foreground">{o.customer_name} • {new Date(o.created_at).toLocaleString()}</p>
              </div>
              <Badge>{o.status}</Badge>
            </div>
            <div className="text-xs text-muted-foreground">
              {(o.items as any[]).map((it, i) => <div key={i}>{it.qty} × {it.name}</div>)}
            </div>
            <div className="flex justify-between items-center pt-1 border-t border-border/50">
              <span className="text-sm font-bold">₹{o.total}</span>
              <div className="flex gap-2">
                {o.status === 'placed' && <Button size="sm" variant="outline" onClick={() => reject(o)}>Reject</Button>}
                {NEXT[o.status] && <Button size="sm" onClick={() => advance(o)}>Mark {NEXT[o.status]}</Button>}
              </div>
            </div>
          </Card>
        ))}
      </div>
    </VendorLayout>
  );
}
