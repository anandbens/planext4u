import { useEffect, useState } from "react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { FoodOrder } from "@/lib/food-api";

export default function AdminFoodOrdersPage() {
  const [orders, setOrders] = useState<FoodOrder[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.from('food_orders').select('*').order('created_at', { ascending: false }).limit(200)
      .then(({ data }) => { setOrders((data as FoodOrder[]) || []); setLoading(false); });
  }, []);

  return (
    <AdminLayout>
      <div className="page-header">
        <h1 className="page-title">Food Orders</h1>
        <p className="page-description">{orders.length} orders</p>
      </div>
      {loading ? <div className="flex justify-center py-12"><div className="h-8 w-8 rounded-full border-2 border-primary border-t-transparent animate-spin" /></div>
      : (
        <div className="space-y-2">
          {orders.map(o => (
            <Card key={o.id} className="p-3 flex justify-between items-center">
              <div>
                <p className="font-semibold text-sm">{o.id} — {o.restaurant_name}</p>
                <p className="text-xs text-muted-foreground">{o.customer_name} • {new Date(o.created_at).toLocaleString()}</p>
              </div>
              <div className="text-right">
                <Badge>{o.status}</Badge>
                <p className="text-sm font-bold mt-1">₹{o.total}</p>
              </div>
            </Card>
          ))}
          {orders.length === 0 && <p className="text-sm text-muted-foreground text-center py-12">No food orders yet.</p>}
        </div>
      )}
    </AdminLayout>
  );
}
