import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { VendorLayout } from "@/components/vendor/VendorLayout";
import { useAuth } from "@/lib/auth";
import { api, Order } from "@/lib/api";
import { toast } from "sonner";
import { Package, Truck, CheckCircle, Clock, Eye, Pencil } from "lucide-react";
import { OrderModal } from "@/components/admin/modals/OrderModal";

const statusStyle: Record<string, string> = {
  placed: "bg-primary/10 text-primary", paid: "bg-info/10 text-info", accepted: "bg-info/10 text-info",
  in_progress: "bg-warning/10 text-warning", shipped: "bg-blue-500/10 text-blue-600",
  delivered: "bg-success/10 text-success", completed: "bg-success/10 text-success",
  cancelled: "bg-destructive/10 text-destructive",
};

export default function VendorOrdersPage() {
  const { vendorUser } = useAuth();
  const vendorId = vendorUser?.vendor_id || "VND-001";
  const qc = useQueryClient();
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [modalMode, setModalMode] = useState<"view" | "edit">("view");
  const [modalOpen, setModalOpen] = useState(false);

  const { data: orders, isLoading } = useQuery({
    queryKey: ["vendorOrders", vendorId],
    queryFn: () => api.getVendorOrders(vendorId),
  });

  const updateStatus = useMutation({
    mutationFn: ({ id, status, shippingData }: { id: string; status: Order['status']; shippingData?: any }) =>
      api.updateOrderStatus(id, status, shippingData),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["vendorOrders"] }); toast.success("Order status updated"); },
    onError: (err: any) => {
      console.error("Order status update failed:", err);
      toast.error(err?.message || "Failed to update order status. Please try again.");
    },
  });

  const handleSave = async (id: string, status: Order["status"], shippingData?: any) => {
    await updateStatus.mutateAsync({ id, status, shippingData });
  };

  const openModal = (order: Order, mode: "view" | "edit") => {
    setSelectedOrder(order); setModalMode(mode); setModalOpen(true);
  };

  const newOrders = orders?.filter((o) => o.status === 'placed') || [];
  const activeOrders = orders?.filter((o) => ['accepted', 'in_progress', 'paid', 'shipped'].includes(o.status)) || [];
  const completedOrders = orders?.filter((o) => ['completed', 'delivered', 'cancelled'].includes(o.status)) || [];

  const todayOrders = orders?.filter(o => new Date(o.created_at).toDateString() === new Date().toDateString()).length || 0;
  const monthRevenue = orders?.filter(o => {
    const d = new Date(o.created_at);
    return d.getMonth() === new Date().getMonth() && d.getFullYear() === new Date().getFullYear();
  }).reduce((s, o) => s + Number(o.total || 0), 0) || 0;

  const OrderCard = ({ o }: { o: Order }) => {
    const customerDisplay = o.customer_name
      ? o.customer_name.split(' ')[0] + (o.customer_name.split(' ')[1] ? ' ' + o.customer_name.split(' ')[1].charAt(0) + '.' : '')
      : 'Customer';

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
          <p className="text-sm font-bold">₹{Number(o.total).toLocaleString()}</p>
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
        {o.shipping_type && (
          <div className="mt-2 p-2 rounded bg-secondary/30 text-xs space-y-0.5">
            <p className="font-medium">📦 {o.shipping_type === 'own' ? 'Own Delivery' : 'Courier Partner'}</p>
            {o.courier_name && <p>Courier: {o.courier_name}</p>}
            {o.tracking_number && <p>AWB: {o.tracking_number}</p>}
            {o.tracking_url && <a href={o.tracking_url} target="_blank" rel="noopener noreferrer" className="text-primary underline">Track Shipment</a>}
          </div>
        )}
        {o.pod_confirmed != null && (
          <div className={`mt-2 p-2 rounded text-xs ${o.pod_confirmed ? 'bg-success/10 text-success' : 'bg-destructive/10 text-destructive'}`}>
            {o.pod_confirmed ? '✅ Delivery Confirmed by Customer' : '❌ Customer reported non-delivery'}
          </div>
        )}
        <div className="flex gap-2 mt-3">
          <Button size="sm" variant="outline" className="h-8 text-xs gap-1" onClick={() => openModal(o, "view")}>
            <Eye className="h-3.5 w-3.5" /> View
          </Button>
          {o.status !== 'completed' && o.status !== 'cancelled' && (
            <Button size="sm" className="h-8 text-xs gap-1" onClick={() => openModal(o, "edit")}>
              <Pencil className="h-3.5 w-3.5" /> Update Status
            </Button>
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

      <OrderModal
        order={selectedOrder}
        open={modalOpen}
        onOpenChange={setModalOpen}
        mode={modalMode}
        onSave={handleSave}
      />
    </VendorLayout>
  );
}
