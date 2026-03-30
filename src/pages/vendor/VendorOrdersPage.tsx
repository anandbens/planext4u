import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { VendorLayout } from "@/components/vendor/VendorLayout";
import { useAuth } from "@/lib/auth";
import { api, Order } from "@/lib/api";
import { toast } from "sonner";
import { Package, Truck, CheckCircle, Clock } from "lucide-react";

const statusStyle: Record<string, string> = {
  placed: "bg-primary/10 text-primary", paid: "bg-info/10 text-info", accepted: "bg-info/10 text-info",
  in_progress: "bg-warning/10 text-warning", shipped: "bg-blue-500/10 text-blue-600",
  delivered: "bg-success/10 text-success", completed: "bg-success/10 text-success",
  cancelled: "bg-destructive/10 text-destructive",
};

const STATUS_FLOW: Record<string, { next: string; label: string }> = {
  placed: { next: 'accepted', label: 'Accept Order' },
  accepted: { next: 'in_progress', label: 'Start Processing' },
  in_progress: { next: 'shipped', label: 'Mark Shipped' },
  shipped: { next: 'delivered', label: 'Out for Delivery' },
};

export default function VendorOrdersPage() {
  const { vendorUser } = useAuth();
  const vendorId = vendorUser?.vendor_id || "VND-001";
  const qc = useQueryClient();
  const [shippingModal, setShippingModal] = useState<Order | null>(null);
  const [courierName, setCourierName] = useState('');
  const [trackingNumber, setTrackingNumber] = useState('');
  const [customerMessage, setCustomerMessage] = useState('');

  const { data: orders, isLoading } = useQuery({
    queryKey: ["vendorOrders", vendorId],
    queryFn: () => api.getVendorOrders(vendorId),
  });

  const updateStatus = useMutation({
    mutationFn: ({ id, status }: { id: string; status: Order['status'] }) => api.updateOrderStatus(id, status),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["vendorOrders"] }); toast.success("Order status updated"); },
  });

  const newOrders = orders?.filter((o) => o.status === 'placed') || [];
  const activeOrders = orders?.filter((o) => ['accepted', 'in_progress', 'paid', 'shipped'].includes(o.status)) || [];
  const completedOrders = orders?.filter((o) => ['completed', 'delivered', 'cancelled'].includes(o.status)) || [];

  const handleStatusUpdate = (order: Order) => {
    const flow = STATUS_FLOW[order.status];
    if (!flow) return;
    if (flow.next === 'shipped') {
      setShippingModal(order);
      return;
    }
    updateStatus.mutate({ id: order.id, status: flow.next as Order['status'] });
  };

  const handleShipOrder = () => {
    if (!courierName.trim() || !trackingNumber.trim()) {
      toast.error("Please enter courier and tracking details");
      return;
    }
    if (shippingModal) {
      updateStatus.mutate({ id: shippingModal.id, status: 'shipped' as Order['status'] });
      setShippingModal(null);
      setCourierName('');
      setTrackingNumber('');
      setCustomerMessage('');
    }
  };

  const todayOrders = orders?.filter(o => new Date(o.created_at).toDateString() === new Date().toDateString()).length || 0;
  const monthRevenue = orders?.filter(o => {
    const d = new Date(o.created_at);
    return d.getMonth() === new Date().getMonth() && d.getFullYear() === new Date().getFullYear();
  }).reduce((s, o) => s + o.total, 0) || 0;

  const OrderCard = ({ o }: { o: Order }) => {
    const flow = STATUS_FLOW[o.status];
    const customerDisplay = o.customer_name ? o.customer_name.split(' ')[0] + (o.customer_name.split(' ')[1] ? ' ' + o.customer_name.split(' ')[1].charAt(0) + '.' : '') : 'Customer';

    return (
      <Card key={o.id} className="p-4">
        <div className="flex items-start justify-between mb-2">
          <div>
            <div className="flex items-center gap-2">
              <p className="text-sm font-semibold font-mono">{o.id}</p>
              <Badge className={`${statusStyle[o.status] || ''} border-0 text-[10px]`}>{o.status.replace("_", " ")}</Badge>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">{customerDisplay} • {new Date(o.created_at).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' })}</p>
          </div>
          <p className="text-sm font-bold">₹{o.total.toLocaleString()}</p>
        </div>
        {o.items?.map((item: any, i: number) => (
          <div key={i} className="flex items-center gap-2 mb-1">
            {item.image && <img src={item.image} className="h-8 w-8 rounded object-cover" />}
            <p className="text-xs text-muted-foreground">{item.title} × {item.qty}</p>
          </div>
        ))}
        {flow && (
          <div className="flex gap-2 mt-3">
            <Button size="sm" className="h-8 text-xs" onClick={() => handleStatusUpdate(o)}>
              {flow.label}
            </Button>
            {o.status === 'placed' && (
              <Button size="sm" variant="outline" className="h-8 text-xs text-destructive" onClick={() => updateStatus.mutate({ id: o.id, status: 'cancelled' })}>
                Reject
              </Button>
            )}
          </div>
        )}
      </Card>
    );
  };

  return (
    <VendorLayout title={`Orders (${orders?.length || 0})`}>
      <div className="max-w-5xl mx-auto px-4 py-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          <Card className="p-3">
            <div className="flex items-center gap-2 mb-1"><Clock className="h-4 w-4 text-primary" /><span className="text-xs text-muted-foreground">Today</span></div>
            <p className="text-lg font-bold">{todayOrders}</p>
          </Card>
          <Card className="p-3">
            <div className="flex items-center gap-2 mb-1"><Package className="h-4 w-4 text-warning" /><span className="text-xs text-muted-foreground">Pending</span></div>
            <p className="text-lg font-bold text-warning">{newOrders.length}</p>
          </Card>
          <Card className="p-3">
            <div className="flex items-center gap-2 mb-1"><Truck className="h-4 w-4 text-info" /><span className="text-xs text-muted-foreground">Active</span></div>
            <p className="text-lg font-bold">{activeOrders.length}</p>
          </Card>
          <Card className="p-3">
            <div className="flex items-center gap-2 mb-1"><CheckCircle className="h-4 w-4 text-success" /><span className="text-xs text-muted-foreground">Revenue</span></div>
            <p className="text-lg font-bold">₹{monthRevenue.toLocaleString()}</p>
          </Card>
        </div>

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
      </div>

      <Dialog open={!!shippingModal} onOpenChange={() => setShippingModal(null)}>
        <DialogContent className="max-w-sm">
          <DialogTitle>Shipping Details</DialogTitle>
          <div className="space-y-3 pt-2">
            <div>
              <Label className="text-xs">Courier Name *</Label>
              <Input placeholder="e.g. BlueDart, Delhivery" value={courierName} onChange={e => setCourierName(e.target.value)} className="h-9 mt-1" />
            </div>
            <div>
              <Label className="text-xs">Tracking Number *</Label>
              <Input placeholder="Enter tracking number" value={trackingNumber} onChange={e => setTrackingNumber(e.target.value)} className="h-9 mt-1" />
            </div>
            <div>
              <Label className="text-xs">Message to Customer (optional)</Label>
              <Input placeholder="e.g. Expected delivery in 3 days" value={customerMessage} onChange={e => setCustomerMessage(e.target.value)} className="h-9 mt-1" />
            </div>
            <Button className="w-full" onClick={handleShipOrder}>
              <Truck className="h-4 w-4 mr-2" /> Confirm Shipment
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </VendorLayout>
  );
}
