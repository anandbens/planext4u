import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/lib/auth";
import { foodApi, FoodOrder } from "@/lib/food-api";
import { CustomerLayout } from "@/components/customer/CustomerLayout";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { RotateCcw, X, Eye } from "lucide-react";
import { CancelOrderDialog } from "@/components/food/CancelOrderDialog";
import { toast } from "sonner";

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
  const [cancelTarget, setCancelTarget] = useState<string | null>(null);

  const refresh = () => {
    if (!customerUser?.customer_id) return;
    setLoading(true);
    foodApi.listMyOrders(customerUser.customer_id).then(setOrders).finally(() => setLoading(false));
  };

  useEffect(() => { refresh(); }, [customerUser?.customer_id]);

  const handleReorder = async (o: FoodOrder, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const data = await foodApi.reorder(o.id);
      if (!data) return;
      localStorage.setItem('food_reorder_payload', JSON.stringify({
        restaurant_id: o.restaurant_id, items: data.items,
      }));
      toast.success("Items added to cart");
      navigate(`/app/food/restaurant/${o.restaurant_id}`);
    } catch (err: any) {
      toast.error(err.message || "Couldn't reorder");
    }
  };

  const canCancelOrder = (o: FoodOrder) =>
    o.status === 'placed' ||
    (o.status === 'accepted' && o.accepted_at &&
     (Date.now() - new Date(o.accepted_at).getTime()) < 60_000);

  return (
    <CustomerLayout>
      <div className="px-4 py-3 space-y-3 pb-24">
        <h1 className="text-xl font-bold">My Food Orders</h1>
        {loading ? (
          <div className="flex justify-center py-12"><div className="h-8 w-8 rounded-full border-2 border-primary border-t-transparent animate-spin" /></div>
        ) : orders.length === 0 ? (
          <p className="text-center text-sm text-muted-foreground py-12">No food orders yet</p>
        ) : orders.map(o => (
          <Card key={o.id} className="p-3 space-y-2 cursor-pointer" onClick={() => navigate(`/app/food/order/${o.id}`)}>
            <div className="flex justify-between items-start">
              <div>
                <p className="font-semibold text-sm">{o.restaurant_name}</p>
                <p className="text-xs text-muted-foreground">#{o.id} • {new Date(o.created_at).toLocaleString()}</p>
              </div>
              <Badge variant={o.status === 'delivered' ? 'default' : (o.status === 'cancelled' || o.status === 'rejected') ? 'destructive' : 'secondary'}>
                {STATUS_LABEL[o.status] || o.status}
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground">{(o.items as any[]).length} items • ₹{o.total}</p>

            <div className="flex gap-2 pt-1">
              <Button size="sm" variant="outline" className="flex-1 gap-1" onClick={(e) => { e.stopPropagation(); navigate(`/app/food/order/${o.id}`); }}>
                <Eye className="h-3 w-3" /> Track
              </Button>
              {(o.status === 'delivered' || o.status === 'cancelled' || o.status === 'rejected') && (
                <Button size="sm" variant="outline" className="flex-1 gap-1" onClick={(e) => handleReorder(o, e)}>
                  <RotateCcw className="h-3 w-3" /> Reorder
                </Button>
              )}
              {canCancelOrder(o) && (
                <Button size="sm" variant="destructive" className="gap-1" onClick={(e) => { e.stopPropagation(); setCancelTarget(o.id); }}>
                  <X className="h-3 w-3" /> Cancel
                </Button>
              )}
            </div>
          </Card>
        ))}
      </div>

      {cancelTarget && (
        <CancelOrderDialog
          open={!!cancelTarget}
          onOpenChange={(v) => { if (!v) setCancelTarget(null); }}
          orderId={cancelTarget}
          onCancelled={refresh}
        />
      )}
    </CustomerLayout>
  );
}
