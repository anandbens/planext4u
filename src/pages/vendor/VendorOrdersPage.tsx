import { Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { api, Order } from "@/lib/api";

const statusStyle: Record<string, string> = {
  placed: "bg-primary/10 text-primary", paid: "bg-info/10 text-info", accepted: "bg-info/10 text-info",
  in_progress: "bg-warning/10 text-warning", delivered: "bg-success/10 text-success",
  completed: "bg-success/10 text-success", cancelled: "bg-destructive/10 text-destructive",
};

export default function VendorOrdersPage() {
  const qc = useQueryClient();
  const { data: orders, isLoading } = useQuery({
    queryKey: ["vendorOrders"],
    queryFn: () => api.getVendorOrders("VND-001"),
  });

  const updateStatus = useMutation({
    mutationFn: ({ id, status }: { id: string; status: Order['status'] }) => api.updateOrderStatus(id, status),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["vendorOrders"] }); toast.success("Order status updated"); },
  });

  const newOrders = orders?.filter((o) => o.status === 'placed') || [];
  const activeOrders = orders?.filter((o) => ['accepted', 'in_progress', 'paid'].includes(o.status)) || [];
  const completedOrders = orders?.filter((o) => ['completed', 'delivered', 'cancelled'].includes(o.status)) || [];

  const OrderCard = ({ o }: { o: Order }) => (
    <Card key={o.id} className="p-4">
      <div className="flex items-start justify-between mb-2">
        <div>
          <div className="flex items-center gap-2">
            <p className="text-sm font-semibold">{o.id}</p>
            <Badge className={`${statusStyle[o.status] || ''} border-0 text-[10px]`}>{o.status.replace("_", " ")}</Badge>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">{o.customer_name} • {new Date(o.created_at).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' })}</p>
        </div>
        <p className="text-sm font-bold">₹{o.total.toLocaleString()}</p>
      </div>
      {o.items?.map((item, i) => <p key={i} className="text-xs text-muted-foreground">{item.title} × {item.qty}</p>)}
      {o.status === "placed" && (
        <div className="flex gap-2 mt-3">
          <Button size="sm" className="h-7 text-xs" onClick={() => updateStatus.mutate({ id: o.id, status: 'accepted' })}>Accept</Button>
          <Button size="sm" variant="outline" className="h-7 text-xs text-destructive" onClick={() => updateStatus.mutate({ id: o.id, status: 'cancelled' })}>Reject</Button>
        </div>
      )}
      {o.status === "accepted" && <Button size="sm" className="h-7 text-xs mt-3" onClick={() => updateStatus.mutate({ id: o.id, status: 'in_progress' })}>Mark In Progress</Button>}
      {o.status === "in_progress" && <Button size="sm" className="h-7 text-xs mt-3" onClick={() => updateStatus.mutate({ id: o.id, status: 'delivered' })}>Mark Delivered</Button>}
    </Card>
  );

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-30 bg-card/95 backdrop-blur-sm border-b border-border/50">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center gap-3">
          <Button variant="ghost" size="icon" asChild><Link to="/vendor"><ArrowLeft className="h-5 w-5" /></Link></Button>
          <h1 className="font-semibold">Orders ({orders?.length || 0})</h1>
        </div>
      </header>
      <main className="max-w-5xl mx-auto px-4 py-6">
        {isLoading ? Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-24 rounded-xl mb-3" />) : (
          <Tabs defaultValue="all">
            <TabsList className="mb-4">
              <TabsTrigger value="all">All ({orders?.length || 0})</TabsTrigger>
              <TabsTrigger value="new">New ({newOrders.length})</TabsTrigger>
              <TabsTrigger value="active">Active ({activeOrders.length})</TabsTrigger>
              <TabsTrigger value="completed">Done ({completedOrders.length})</TabsTrigger>
            </TabsList>
            <TabsContent value="all" className="space-y-3">{orders?.map((o) => <OrderCard key={o.id} o={o} />)}</TabsContent>
            <TabsContent value="new" className="space-y-3">{newOrders.map((o) => <OrderCard key={o.id} o={o} />)}</TabsContent>
            <TabsContent value="active" className="space-y-3">{activeOrders.map((o) => <OrderCard key={o.id} o={o} />)}</TabsContent>
            <TabsContent value="completed" className="space-y-3">{completedOrders.map((o) => <OrderCard key={o.id} o={o} />)}</TabsContent>
          </Tabs>
        )}
      </main>
    </div>
  );
}
