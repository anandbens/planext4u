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
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Textarea } from "@/components/ui/textarea";
import { VendorLayout } from "@/components/vendor/VendorLayout";
import { useAuth } from "@/lib/auth";
import { api, Order } from "@/lib/api";
import { toast } from "sonner";
import { Package, Truck, CheckCircle, Clock, Eye } from "lucide-react";
import { VendorOrderDetailModal } from "@/components/vendor/VendorOrderDetailModal";

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
  const [shippingType, setShippingType] = useState<"own" | "courier">("own");
  const [courierName, setCourierName] = useState('');
  const [trackingNumber, setTrackingNumber] = useState('');
  const [trackingUrl, setTrackingUrl] = useState('');
  const [shippingNotes, setShippingNotes] = useState('');
  const [detailOrder, setDetailOrder] = useState<Order | null>(null);

  const { data: orders, isLoading } = useQuery({
    queryKey: ["vendorOrders", vendorId],
    queryFn: () => api.getVendorOrders(vendorId),
  });

  const updateStatus = useMutation({
    mutationFn: ({ id, status, shippingData }: { id: string; status: Order['status']; shippingData?: any }) => api.updateOrderStatus(id, status, shippingData),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["vendorOrders"] }); toast.success("Order status updated"); },
    onError: (err: any) => {
      console.error("Order status update failed:", err);
      toast.error(err?.message || "Failed to update order status. Please try again.");
    },
  });

  const newOrders = orders?.filter((o) => o.status === 'placed') || [];
  const activeOrders = orders?.filter((o) => ['accepted', 'in_progress', 'paid', 'shipped'].includes(o.status)) || [];
  const completedOrders = orders?.filter((o) => ['completed', 'delivered', 'cancelled'].includes(o.status)) || [];

  const handleStatusUpdate = (order: Order) => {
    const flow = STATUS_FLOW[order.status];
    if (!flow) return;
    if (flow.next === 'shipped') {
      setShippingModal(order);
      setShippingType("own");
      setCourierName('');
      setTrackingNumber('');
      setTrackingUrl('');
      setShippingNotes('');
      return;
    }
    updateStatus.mutate({ id: order.id, status: flow.next as Order['status'] });
  };

  const handleShipOrder = () => {
    if (shippingType === "courier" && (!courierName.trim() || !trackingNumber.trim())) {
      toast.error("Please enter courier name and tracking number");
      return;
    }
    if (shippingModal) {
      const shippingData = {
        shipping_type: shippingType,
        courier_name: shippingType === "courier" ? courierName.trim() : undefined,
        tracking_number: shippingType === "courier" ? trackingNumber.trim() : undefined,
        tracking_url: shippingType === "courier" ? trackingUrl.trim() || undefined : undefined,
        shipping_notes: shippingNotes.trim() || undefined,
      };
      updateStatus.mutate({ id: shippingModal.id, status: 'shipped' as Order['status'], shippingData });
      setShippingModal(null);
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
            <div>
              <p className="text-xs text-muted-foreground">{item.title} × {item.qty}</p>
              {item.selected_attributes && Object.keys(item.selected_attributes).length > 0 && (
                <p className="text-[10px] text-primary/70">{Object.entries(item.selected_attributes).map(([k, v]: [string, any]) => `${k}: ${v}`).join(' · ')}</p>
              )}
            </div>
          </div>
        ))}
        {/* Shipping info display */}
        {o.shipping_type && (
          <div className="mt-2 p-2 rounded bg-secondary/30 text-xs space-y-0.5">
            <p className="font-medium">📦 {o.shipping_type === 'own' ? 'Own Delivery' : 'Courier Partner'}</p>
            {o.courier_name && <p>Courier: {o.courier_name}</p>}
            {o.tracking_number && <p>AWB: {o.tracking_number}</p>}
            {o.tracking_url && <a href={o.tracking_url} target="_blank" rel="noopener noreferrer" className="text-primary underline">Track Shipment</a>}
          </div>
        )}
        {/* POD status */}
        {o.pod_confirmed != null && (
          <div className={`mt-2 p-2 rounded text-xs ${o.pod_confirmed ? 'bg-success/10 text-success' : 'bg-destructive/10 text-destructive'}`}>
            {o.pod_confirmed ? '✅ Delivery Confirmed by Customer' : '❌ Customer reported non-delivery'}
          </div>
        )}
        <div className="flex gap-2 mt-3">
          <Button size="sm" variant="outline" className="h-8 text-xs gap-1" onClick={() => setDetailOrder(o)}>
            <Eye className="h-3.5 w-3.5" /> View
          </Button>
          {flow && (
            <>
              <Button size="sm" className="h-8 text-xs" onClick={() => handleStatusUpdate(o)}>
                {flow.label}
              </Button>
              {o.status === 'placed' && (
                <Button size="sm" variant="outline" className="h-8 text-xs text-destructive" onClick={() => updateStatus.mutate({ id: o.id, status: 'cancelled' })}>
                  Reject
                </Button>
              )}
            </>
          )}
        </div>
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
            {[
              { key: "all", items: orders || [] },
              { key: "new", items: newOrders },
              { key: "active", items: activeOrders },
              { key: "completed", items: completedOrders },
            ].map(({ key, items }) => (
              <TabsContent key={key} value={key} className="space-y-3">
                {items.length === 0 ? (
                  <Card className="p-8 text-center">
                    <Package className="h-10 w-10 text-muted-foreground/30 mx-auto mb-2" />
                    <p className="text-muted-foreground text-sm">No orders yet</p>
                    <p className="text-xs text-muted-foreground mt-1">Orders placed by customers will appear here</p>
                  </Card>
                ) : items.map((o) => <OrderCard key={o.id} o={o} />)}
              </TabsContent>
            ))}
          </Tabs>
        )}
      </div>

      {/* Shipping Modal with Own/Courier selection */}
      <Dialog open={!!shippingModal} onOpenChange={() => setShippingModal(null)}>
        <DialogContent className="max-w-sm">
          <DialogTitle>Shipping Details</DialogTitle>
          <div className="space-y-4 pt-2">
            <div>
              <Label className="text-xs font-semibold mb-2 block">Shipment Method *</Label>
              <RadioGroup value={shippingType} onValueChange={(v) => setShippingType(v as "own" | "courier")} className="flex gap-3">
                <div className={`flex-1 border rounded-lg p-3 cursor-pointer transition-colors ${shippingType === 'own' ? 'border-primary bg-primary/5' : 'border-border'}`}>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <RadioGroupItem value="own" />
                    <div>
                      <p className="text-sm font-medium">Own Delivery</p>
                      <p className="text-xs text-muted-foreground">Self/staff delivery</p>
                    </div>
                  </label>
                </div>
                <div className={`flex-1 border rounded-lg p-3 cursor-pointer transition-colors ${shippingType === 'courier' ? 'border-primary bg-primary/5' : 'border-border'}`}>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <RadioGroupItem value="courier" />
                    <div>
                      <p className="text-sm font-medium">Courier Partner</p>
                      <p className="text-xs text-muted-foreground">Third-party courier</p>
                    </div>
                  </label>
                </div>
              </RadioGroup>
            </div>

            {shippingType === "courier" && (
              <>
                <div>
                  <Label className="text-xs">Courier Name *</Label>
                  <Input placeholder="e.g. BlueDart, Delhivery" value={courierName} onChange={e => setCourierName(e.target.value)} className="h-9 mt-1" />
                </div>
                <div>
                  <Label className="text-xs">AWB / Tracking Number *</Label>
                  <Input placeholder="Enter tracking number" value={trackingNumber} onChange={e => setTrackingNumber(e.target.value)} className="h-9 mt-1" />
                </div>
                <div>
                  <Label className="text-xs">Tracking URL (optional)</Label>
                  <Input placeholder="https://track.courier.com/..." value={trackingUrl} onChange={e => setTrackingUrl(e.target.value)} className="h-9 mt-1" />
                </div>
              </>
            )}

            <div>
              <Label className="text-xs">Notes (optional)</Label>
              <Textarea placeholder="e.g. Expected delivery in 3 days" value={shippingNotes} onChange={e => setShippingNotes(e.target.value)} className="mt-1" rows={2} />
            </div>

            <Button className="w-full" onClick={handleShipOrder} disabled={updateStatus.isPending}>
              <Truck className="h-4 w-4 mr-2" />
              {updateStatus.isPending ? "Processing..." : "Confirm Shipment"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
      <VendorOrderDetailModal order={detailOrder} onClose={() => setDetailOrder(null)} />
    </VendorLayout>
  );
}
