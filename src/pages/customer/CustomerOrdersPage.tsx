import { useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { CustomerLayout } from "@/components/customer/CustomerLayout";
import { api } from "@/lib/api";
import { Search, Calendar, ChevronLeft, ChevronRight, Package, Truck, MapPin, RefreshCcw, ArrowLeft, Star } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";

const statusColor: Record<string, string> = {
  placed: "bg-primary/10 text-primary", paid: "bg-info/10 text-info", accepted: "bg-info/10 text-info",
  in_progress: "bg-warning/10 text-warning", delivered: "bg-success/10 text-success",
  completed: "bg-success/10 text-success", cancelled: "bg-destructive/10 text-destructive",
};

const trackingSteps = ["placed", "accepted", "in_progress", "delivered", "completed"];

const ITEMS_PER_PAGE = 5;

export default function CustomerOrdersPage() {
  const { customerUser } = useAuth();
  const customerId = customerUser?.customer_id || customerUser?.id || '';
  const [searchTerm, setSearchTerm] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [trackingOrder, setTrackingOrder] = useState<any>(null);
  const [refundOrder, setRefundOrder] = useState<any>(null);

  const { data: orders, isLoading } = useQuery({
    queryKey: ["customerOrders", customerId],
    queryFn: () => api.getCustomerOrders(customerId),
    enabled: !!customerId,
  });

  // Search by order ID or product name
  const filtered = (orders || []).filter(o => {
    const term = searchTerm.toLowerCase();
    if (term) {
      const matchesId = o.id.toLowerCase().includes(term);
      const matchesProduct = o.items?.some((item: any) => item.title?.toLowerCase().includes(term));
      if (!matchesId && !matchesProduct) return false;
    }
    if (dateFrom && new Date(o.created_at) < new Date(dateFrom)) return false;
    if (dateTo) {
      const to = new Date(dateTo); to.setHours(23, 59, 59);
      if (new Date(o.created_at) > to) return false;
    }
    return true;
  });

  const totalPages = Math.max(1, Math.ceil(filtered.length / ITEMS_PER_PAGE));
  const paginated = filtered.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

  const clearFilters = () => { setSearchTerm(""); setDateFrom(""); setDateTo(""); setCurrentPage(1); };

  const currentStep = (status: string) => trackingSteps.indexOf(status);

  return (
    <CustomerLayout>
      <div className="max-w-3xl mx-auto px-4 py-6 pb-20 md:pb-6">
        <div className="flex items-center gap-3 mb-4">
          <Button variant="ghost" size="icon" asChild><Link to="/app/profile"><ArrowLeft className="h-5 w-5" /></Link></Button>
          <h1 className="text-xl font-bold">My Orders</h1>
        </div>

        <Card className="p-3 mb-4">
          <div className="flex flex-col sm:flex-row gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Search by Order ID or Product" value={searchTerm}
                onChange={e => { setSearchTerm(e.target.value); setCurrentPage(1); }} className="pl-8 h-9 text-xs" />
            </div>
            <div className="flex items-center gap-2">
              <div className="relative">
                <Calendar className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                <Input type="date" value={dateFrom} onChange={e => { setDateFrom(e.target.value); setCurrentPage(1); }}
                  className="pl-8 h-9 text-xs w-[130px]" />
              </div>
              <span className="text-xs text-muted-foreground">to</span>
              <Input type="date" value={dateTo} onChange={e => { setDateTo(e.target.value); setCurrentPage(1); }} className="h-9 text-xs w-[130px]" />
            </div>
            {(searchTerm || dateFrom || dateTo) && (
              <Button variant="ghost" size="sm" className="text-xs h-9" onClick={clearFilters}>Clear</Button>
            )}
          </div>
        </Card>

        <div className="space-y-3">
          {isLoading ? Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-28 rounded-xl" />) :
            filtered.length === 0 ? <p className="text-center py-16 text-muted-foreground">{searchTerm || dateFrom || dateTo ? 'No matching orders' : 'No orders yet'}</p> :
            paginated.map((o) => (
              <Link to={`/app/orders/${o.id}`} key={o.id}>
                <Card className="p-4 hover:shadow-sm transition-shadow">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <p className="text-sm font-semibold">{o.id}</p>
                      <p className="text-xs text-muted-foreground">{new Date(o.created_at).toLocaleDateString('en-IN', { month: 'short', day: 'numeric', year: 'numeric' })} • {o.vendor_name}</p>
                    </div>
                    <Badge className={(statusColor[o.status] || "bg-muted") + " border-0"}>{o.status.replace("_", " ")}</Badge>
                  </div>
                  {o.items?.map((item: any, i: number) => (
                    <div key={i} className="flex items-center gap-3 mb-1">
                      <div className="h-10 w-10 bg-secondary/30 rounded-lg flex items-center justify-center text-lg shrink-0 overflow-hidden">
                        {item.image ? <img src={item.image} alt="" className="w-full h-full object-cover" /> : <span>{item.emoji}</span>}
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-medium">{item.title}</p>
                        <p className="text-xs text-muted-foreground">Qty: {item.qty} × ₹{(item.price || 0).toLocaleString()}</p>
                      </div>
                    </div>
                  ))}
                  <div className="flex items-center justify-between mt-3 pt-2 border-t border-border/30">
                    <p className="text-sm font-bold">₹{o.total.toLocaleString()}</p>
                    <div className="flex gap-2 items-center">
                      {(o as any).delivery_rating ? (
                        <span className="flex items-center gap-1 text-xs text-amber-500">
                          <Star className="h-3 w-3 fill-amber-400" /> {(o as any).delivery_rating}/5
                        </span>
                      ) : null}
                      <span className="text-xs text-primary font-medium">View Details →</span>
                    </div>
                  </div>
                </Card>
              </Link>
            ))}
        </div>

        {filtered.length > ITEMS_PER_PAGE && (
          <div className="flex items-center justify-center gap-2 mt-6">
            <Button variant="outline" size="icon" className="h-8 w-8" disabled={currentPage <= 1} onClick={() => setCurrentPage(p => p - 1)}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            {Array.from({ length: totalPages }, (_, i) => (
              <Button key={i} variant={currentPage === i + 1 ? "default" : "outline"} size="sm" className="h-8 w-8 text-xs" onClick={() => setCurrentPage(i + 1)}>{i + 1}</Button>
            ))}
            <Button variant="outline" size="icon" className="h-8 w-8" disabled={currentPage >= totalPages} onClick={() => setCurrentPage(p => p + 1)}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        )}
      </div>

      {/* Delivery Tracking Dialog */}
      <Dialog open={!!trackingOrder} onOpenChange={() => setTrackingOrder(null)}>
        <DialogContent className="max-w-sm">
          <DialogTitle className="flex items-center gap-2"><Truck className="h-5 w-5 text-primary" /> Track Order</DialogTitle>
          {trackingOrder && (
            <div className="space-y-4 pt-2">
              <p className="text-sm font-semibold">{trackingOrder.id}</p>
              <div className="space-y-3">
                {trackingSteps.map((step, i) => {
                  const isCurrent = i === currentStep(trackingOrder.status);
                  const isDone = i <= currentStep(trackingOrder.status);
                  return (
                    <div key={step} className="flex items-center gap-3">
                      <div className={`h-8 w-8 rounded-full flex items-center justify-center shrink-0 ${isDone ? 'bg-success text-success-foreground' : 'bg-secondary text-muted-foreground'}`}>
                        {i === 0 && <Package className="h-4 w-4" />}
                        {i === 1 && <Package className="h-4 w-4" />}
                        {i === 2 && <Truck className="h-4 w-4" />}
                        {i === 3 && <MapPin className="h-4 w-4" />}
                        {i === 4 && <Package className="h-4 w-4" />}
                      </div>
                      <div className="flex-1">
                        <p className={`text-sm font-medium capitalize ${isDone ? '' : 'text-muted-foreground'}`}>{step.replace("_", " ")}</p>
                        {isCurrent && <p className="text-xs text-primary">Current status</p>}
                      </div>
                      {isDone && <Badge className="bg-success/10 text-success border-0 text-[10px]">Done</Badge>}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Refund Request Dialog */}
      <Dialog open={!!refundOrder} onOpenChange={() => setRefundOrder(null)}>
        <DialogContent className="max-w-sm">
          <DialogTitle className="flex items-center gap-2"><RefreshCcw className="h-5 w-5 text-destructive" /> Request Refund</DialogTitle>
          {refundOrder && (
            <div className="space-y-4 pt-2">
              <p className="text-sm">Order: <strong>{refundOrder.id}</strong></p>
              <p className="text-sm">Amount: <strong>₹{refundOrder.total.toLocaleString()}</strong></p>
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Reason for refund</label>
                <select className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm">
                  <option>Product not as described</option><option>Damaged item</option><option>Wrong item received</option><option>Late delivery</option><option>Other</option>
                </select>
              </div>
              <Button className="w-full" variant="destructive" onClick={() => { setRefundOrder(null); import("sonner").then(m => m.toast.success("Refund request submitted! You'll hear back within 3-5 business days.")); }}>
                Submit Refund Request
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </CustomerLayout>
  );
}
