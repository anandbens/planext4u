import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Order } from "@/lib/api";
import { Clock, MapPin, Phone, User, Package, CreditCard, Truck, MessageSquare, IndianRupee } from "lucide-react";
import { format } from "date-fns";
import { CartRuleBreakup, type AppliedCartRule } from "@/components/cart/CartRuleBreakup";

interface Props {
  order: (Order & { customer_notes?: string | null }) | null;
  onClose: () => void;
}

const statusStyle: Record<string, string> = {
  placed: "bg-primary/10 text-primary",
  paid: "bg-info/10 text-info",
  accepted: "bg-info/10 text-info",
  in_progress: "bg-warning/10 text-warning",
  shipped: "bg-blue-500/10 text-blue-600",
  delivered: "bg-success/10 text-success",
  completed: "bg-success/10 text-success",
  cancelled: "bg-destructive/10 text-destructive",
};

export function VendorOrderDetailModal({ order, onClose }: Props) {
  if (!order) return null;
  const o: any = order;
  return (
    <Dialog open={!!order} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-md max-h-[90vh] p-0 flex flex-col">
        <div className="px-6 pt-6 pb-3 border-b border-border/30">
          <DialogTitle className="flex items-center justify-between text-base">
            <span className="font-mono">{o.id}</span>
            <Badge className={`${statusStyle[o.status] || ''} border-0 text-[10px]`}>
              {o.status.replace('_', ' ')}
            </Badge>
          </DialogTitle>
          <DialogDescription className="text-xs mt-1">
            Placed {format(new Date(o.created_at), 'dd MMM yyyy, hh:mm a')}
          </DialogDescription>
        </div>

        <ScrollArea className="flex-1 px-6 py-4">
          <div className="space-y-4">
            {/* Customer info */}
            <Card className="p-3">
              <div className="flex items-center gap-2 mb-2">
                <User className="h-4 w-4 text-primary" />
                <span className="text-xs font-semibold">Customer</span>
              </div>
              <p className="text-sm font-medium">{o.customer_name || 'Customer'}</p>
              <p className="text-[11px] text-muted-foreground font-mono mt-0.5">ID: {o.customer_id}</p>
            </Card>

            {/* Customer notes — high priority */}
            {o.customer_notes && (
              <Card className="p-3 bg-warning/5 border-warning/30">
                <div className="flex items-center gap-2 mb-2">
                  <MessageSquare className="h-4 w-4 text-warning" />
                  <span className="text-xs font-semibold">Customer Notes</span>
                </div>
                <p className="text-sm whitespace-pre-wrap">{o.customer_notes}</p>
              </Card>
            )}

            {/* Items */}
            <Card className="p-3">
              <div className="flex items-center gap-2 mb-2">
                <Package className="h-4 w-4 text-primary" />
                <span className="text-xs font-semibold">Items ({o.items?.length || 0})</span>
              </div>
              <div className="space-y-2">
                {(o.items || []).map((item: any, i: number) => (
                  <div key={i} className="flex items-center gap-2 pb-2 border-b border-border/20 last:border-0 last:pb-0">
                    {item.image && (
                      <img src={item.image} className="h-10 w-10 rounded object-cover shrink-0" alt="" />
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium truncate">{item.title}</p>
                      <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                        <span>Qty: {item.qty}</span>
                        <span>·</span>
                        <span>₹{item.price}</span>
                      </div>
                      {item.selected_attributes && Object.keys(item.selected_attributes).length > 0 && (
                        <p className="text-[10px] text-primary/70 mt-0.5">
                          {Object.entries(item.selected_attributes)
                            .map(([k, v]: [string, any]) => `${k}: ${v}`)
                            .join(' · ')}
                        </p>
                      )}
                    </div>
                    <p className="text-xs font-bold">₹{(item.price * item.qty).toLocaleString()}</p>
                  </div>
                ))}
              </div>
            </Card>

            {/* Bill */}
            <Card className="p-3">
              <div className="flex items-center gap-2 mb-2">
                <IndianRupee className="h-4 w-4 text-primary" />
                <span className="text-xs font-semibold">Bill Details</span>
              </div>
              <div className="space-y-1 text-xs">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span>₹{Number(o.subtotal).toLocaleString()}</span>
                </div>
                {o.tax > 0 && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Tax</span>
                    <span>₹{Number(o.tax).toLocaleString()}</span>
                  </div>
                )}
                {o.discount > 0 && (
                  <div className="flex justify-between text-success">
                    <span>Discount</span>
                    <span>-₹{Number(o.discount).toLocaleString()}</span>
                  </div>
                )}
                {Array.isArray(o.applied_cart_rules) && o.applied_cart_rules.length > 0 && (
                  <CartRuleBreakup
                    rules={o.applied_cart_rules as AppliedCartRule[]}
                    audience="vendor"
                    vendorId={o.vendor_id}
                    className="mt-1"
                  />
                )}
                {o.points_used > 0 && (
                  <div className="flex justify-between text-success">
                    <span>Points Used</span>
                    <span>-₹{Number(o.points_used).toLocaleString()}</span>
                  </div>
                )}
                {o.platform_fee > 0 && (
                  <div className="flex justify-between text-muted-foreground">
                    <span>Platform Fee</span>
                    <span>₹{Number(o.platform_fee).toLocaleString()}</span>
                  </div>
                )}
                <div className="flex justify-between pt-1 border-t border-border/30 font-bold text-sm">
                  <span>Total</span>
                  <span>₹{Number(o.total).toLocaleString()}</span>
                </div>
              </div>
            </Card>

            {/* Shipping info */}
            {o.shipping_type && (
              <Card className="p-3">
                <div className="flex items-center gap-2 mb-2">
                  <Truck className="h-4 w-4 text-primary" />
                  <span className="text-xs font-semibold">Shipping</span>
                </div>
                <div className="space-y-1 text-xs">
                  <p>
                    <span className="text-muted-foreground">Method: </span>
                    {o.shipping_type === 'own' ? 'Own Delivery' : 'Courier Partner'}
                  </p>
                  {o.courier_name && (
                    <p>
                      <span className="text-muted-foreground">Courier: </span>
                      {o.courier_name}
                    </p>
                  )}
                  {o.tracking_number && (
                    <p>
                      <span className="text-muted-foreground">AWB: </span>
                      <span className="font-mono">{o.tracking_number}</span>
                    </p>
                  )}
                  {o.tracking_url && (
                    <a
                      href={o.tracking_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary underline block"
                    >
                      Track Shipment →
                    </a>
                  )}
                  {o.shipping_notes && (
                    <p className="text-muted-foreground italic mt-1">{o.shipping_notes}</p>
                  )}
                </div>
              </Card>
            )}

            {/* Payment info */}
            {o.payment_reference_id && (
              <Card className="p-3">
                <div className="flex items-center gap-2 mb-2">
                  <CreditCard className="h-4 w-4 text-primary" />
                  <span className="text-xs font-semibold">Payment</span>
                </div>
                <p className="text-[10px] font-mono text-muted-foreground break-all">
                  {o.payment_reference_id}
                </p>
              </Card>
            )}

            {/* Delivery rating */}
            {o.delivery_rating && (
              <Card className="p-3 bg-success/5 border-success/30">
                <p className="text-xs font-semibold mb-1">Customer Rating: {o.delivery_rating} / 5 ⭐</p>
                {o.rating_comment && <p className="text-xs italic">"{o.rating_comment}"</p>}
              </Card>
            )}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
