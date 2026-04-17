import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/lib/auth";
import { foodApi, FoodOrder } from "@/lib/food-api";
import { CustomerLayout } from "@/components/customer/CustomerLayout";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const STATUS_LABEL: Record<string, string> = {
  placed: "Placed", accepted: "Accepted", preparing: "Preparing",
  ready: "Ready", assigned: "Rider assigned", picked_up: "Picked up",
  on_the_way: "On the way", delivered: "Delivered",
  cancelled: "Cancelled", rejected: "Rejected",
};

export default function FoodOrdersPage() {
  const { customerUser } = useAuth();
  const navigate = useNavigate();
  const [orders, setOrders] = useState<FoodOrder[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!customerUser?.customer_id) return;
    foodApi.listMyOrders(customerUser.customer_id).then(setOrders).finally(() => setLoading(false));
  }, [customerUser?.customer_id]);

  return (
    <CustomerLayout>
      <div className="px-4 py-3 space-y-3 pb-24">
        <h1 className="text-xl font-bold">My Food Orders</h1>
        {loading ? (
          <div className="flex justify-center py-12"><div className="h-8 w-8 rounded-full border-2 border-primary border-t-transparent animate-spin" /></div>
        ) : orders.length === 0 ? (
          <p className="text-center text-sm text-muted-foreground py-12">No food orders yet</p>
        ) : orders.map(o => (
          <Card key={o.id} className="p-3 cursor-pointer" onClick={() => navigate(`/app/food/order/${o.id}`)}>
            <div className="flex justify-between items-start">
              <div>
                <p className="font-semibold text-sm">{o.restaurant_name}</p>
                <p className="text-xs text-muted-foreground">{o.id} • {new Date(o.created_at).toLocaleString()}</p>
              </div>
              <Badge variant={o.status === 'delivered' ? 'default' : o.status === 'cancelled' ? 'destructive' : 'secondary'}>
                {STATUS_LABEL[o.status] || o.status}
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground mt-2">{(o.items as any[]).length} items • ₹{o.total}</p>
          </Card>
        ))}
      </div>
    </CustomerLayout>
  );
}
