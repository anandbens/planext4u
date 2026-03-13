import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { CustomerLayout } from "@/components/customer/CustomerLayout";
import { api } from "@/lib/api";

const statusColor: Record<string, string> = {
  placed: "bg-primary/10 text-primary", paid: "bg-info/10 text-info", accepted: "bg-info/10 text-info",
  in_progress: "bg-warning/10 text-warning", delivered: "bg-success/10 text-success",
  completed: "bg-success/10 text-success", cancelled: "bg-destructive/10 text-destructive",
};

export default function CustomerOrdersPage() {
  const { data: orders, isLoading } = useQuery({
    queryKey: ["customerOrders"],
    queryFn: () => api.getCustomerOrders("USR-001"),
  });

  return (
    <CustomerLayout>
      <div className="max-w-3xl mx-auto px-4 py-6 pb-20 md:pb-6">
        <h1 className="text-xl font-bold mb-6">My Orders</h1>
        <div className="space-y-3">
          {isLoading ? Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-24 rounded-xl" />) :
            orders?.length === 0 ? <p className="text-center py-16 text-muted-foreground">No orders yet</p> :
            orders?.map((o) => (
              <Card key={o.id} className="p-4 hover:shadow-sm transition-shadow">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <p className="text-sm font-semibold">{o.id}</p>
                    <p className="text-xs text-muted-foreground">{new Date(o.created_at).toLocaleDateString('en-IN', { month: 'short', day: 'numeric', year: 'numeric' })} • {o.vendor_name}</p>
                  </div>
                  <Badge className={(statusColor[o.status] || "bg-muted") + " border-0"}>{o.status.replace("_", " ")}</Badge>
                </div>
                {o.items?.map((item, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <div className="h-10 w-10 bg-secondary/30 rounded-lg flex items-center justify-center text-lg">{item.emoji}</div>
                    <div className="flex-1">
                      <p className="text-sm font-medium">{item.title}</p>
                      <p className="text-xs text-muted-foreground">Qty: {item.qty}</p>
                    </div>
                    <p className="text-sm font-bold">₹{o.total.toLocaleString()}</p>
                  </div>
                ))}
              </Card>
            ))}
        </div>
      </div>
    </CustomerLayout>
  );
}
