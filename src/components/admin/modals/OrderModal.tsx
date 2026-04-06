import { Order } from "@/lib/api";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { ShoppingCart, User, Store, Package } from "lucide-react";
import { useState, useEffect } from "react";

interface OrderModalProps {
  order: Order | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: "view" | "edit";
  onSave?: (id: string, status: Order["status"]) => Promise<void>;
}

const orderFlow: Order["status"][] = ["placed", "paid", "accepted", "in_progress", "delivered", "completed"];

export function OrderModal({ order, open, onOpenChange, mode, onSave }: OrderModalProps) {
  const [editMode, setEditMode] = useState(mode === "edit");
  const [saving, setSaving] = useState(false);
  const [newStatus, setNewStatus] = useState<Order["status"]>("placed");

  useEffect(() => {
    if (order) {
      setNewStatus(order.status);
      setEditMode(mode === "edit");
    }
  }, [order, mode]);

  if (!order) return null;

  const currentStep = orderFlow.indexOf(order.status);

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSave?.(order.id, newStatus);
      onOpenChange(false);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl gradient-success flex items-center justify-center shrink-0">
              <ShoppingCart className="h-5 w-5 text-card" />
            </div>
            <div>
              <span>{order.id}</span>
              <p className="text-xs font-normal text-muted-foreground mt-0.5">
                {new Date(order.created_at).toLocaleString()}
              </p>
            </div>
          </DialogTitle>
          <DialogDescription className="flex items-center gap-2 pt-1">
            <StatusBadge status={order.status} />
          </DialogDescription>
        </DialogHeader>

        {order.status !== "cancelled" && (
          <div className="flex items-center gap-0.5 py-3">
            {orderFlow.map((s, i) => (
              <div key={s} className="flex items-center flex-1">
                <div className="flex flex-col items-center flex-1">
                  <div className={`w-full h-1.5 rounded-full ${i <= currentStep ? 'gradient-success' : 'bg-secondary'}`} />
                  <span className={`text-[10px] mt-1 capitalize ${i <= currentStep ? 'text-success font-medium' : 'text-muted-foreground'}`}>
                    {s.replace("_", " ")}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="grid grid-cols-2 gap-4">
          <div className="p-3 rounded-lg bg-secondary/30 flex items-center gap-3">
            <User className="h-5 w-5 text-primary" />
            <div>
              <p className="text-xs text-muted-foreground">Customer</p>
              <p className="text-sm font-medium">{order.customer_name}</p>
            </div>
          </div>
          <div className="p-3 rounded-lg bg-secondary/30 flex items-center gap-3">
            <Store className="h-5 w-5 text-info" />
            <div>
              <p className="text-xs text-muted-foreground">Vendor</p>
              <p className="text-sm font-medium">{order.vendor_name}</p>
            </div>
          </div>
        </div>

        {/* Order Items */}
        {order.items && order.items.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-sm font-semibold flex items-center gap-1"><Package className="h-4 w-4" /> Order Items</h4>
            <div className="space-y-2 p-3 rounded-lg bg-secondary/10 border border-border/30">
              {order.items.map((item: any, i: number) => (
                <div key={i} className="flex items-center gap-3">
                  <div className="h-10 w-10 bg-secondary/30 rounded-lg flex items-center justify-center text-lg shrink-0 overflow-hidden">
                    {item.image ? <img src={item.image} alt="" className="w-full h-full object-cover" /> : <span>{item.emoji}</span>}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{item.title}</p>
                    <p className="text-xs text-muted-foreground">Qty: {item.qty}</p>
                  </div>
                  <p className="text-sm font-semibold">₹{((item.price || 0) * (item.qty || 1)).toLocaleString()}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="space-y-3 p-4 rounded-lg bg-secondary/20 border border-border/30">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Item Total (MRP)</span>
            <span>₹{order.subtotal.toLocaleString()}</span>
          </div>
          {order.discount > 0 && (
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Discount</span>
              <span className="text-success">-₹{order.discount.toLocaleString()}</span>
            </div>
          )}
          {order.points_used > 0 && (
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Points Redeemed</span>
              <span className="text-primary font-medium">{order.points_used} pts</span>
            </div>
          )}
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Platform Fee</span>
            <span>₹{((order as any).platform_fee || 0).toLocaleString()}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">GST on Platform Fee (18%)</span>
            <span>₹{((order as any).gst_on_platform_fee || 0).toLocaleString()}</span>
          </div>
          {order.tax > 0 && (
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Product Tax</span>
              <span>₹{order.tax.toLocaleString()}</span>
            </div>
          )}
          <Separator />
          <div className="flex justify-between text-base font-bold">
            <span>Grand Total</span>
            <span>₹{order.total.toLocaleString()}</span>
          </div>
          {(order as any).payment_reference_id && (
            <div className="flex justify-between text-sm pt-2 border-t border-border/30">
              <span className="text-muted-foreground">Payment Ref ID</span>
              <span className="font-mono text-xs">{(order as any).payment_reference_id}</span>
            </div>
          )}
          {(order as any).razorpay_order_id && (
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Gateway Order ID</span>
              <span className="font-mono text-xs">{(order as any).razorpay_order_id}</span>
            </div>
          )}
        </div>

        {editMode && order.status !== "cancelled" && order.status !== "completed" && (
          <div className="p-4 rounded-lg border border-primary/20 bg-accent/30">
            <Label className="text-xs text-muted-foreground mb-2 block">Update Order Status</Label>
            <Select value={newStatus} onValueChange={(v) => setNewStatus(v as Order["status"])}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {orderFlow.map((s) => (
                  <SelectItem key={s} value={s} className="capitalize">{s.replace("_", " ")}</SelectItem>
                ))}
                <SelectItem value="cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>
          </div>
        )}

        <DialogFooter className="mt-2">
          {editMode ? (
            <>
              <Button variant="outline" onClick={() => setEditMode(false)} disabled={saving}>Cancel</Button>
              <Button onClick={handleSave} disabled={saving}>
                {saving && <div className="h-4 w-4 rounded-full border-2 border-current border-t-transparent animate-spin mr-2" />}
                Save Changes
              </Button>
            </>
          ) : (
            <>
              <Button variant="outline" onClick={() => onOpenChange(false)}>Close</Button>
              <Button onClick={() => setEditMode(true)}>Edit Status</Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
