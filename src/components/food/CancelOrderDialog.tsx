import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { foodApi } from "@/lib/food-api";
import { toast } from "sonner";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  orderId: string;
  onCancelled?: () => void;
}

export function CancelOrderDialog({ open, onOpenChange, orderId, onCancelled }: Props) {
  const [reasons, setReasons] = useState<any[]>([]);
  const [selected, setSelected] = useState<string>("");
  const [other, setOther] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open) foodApi.listCancellationReasons('customer').then(setReasons);
  }, [open]);

  const submit = async () => {
    const reason = selected === 'Other' ? other.trim() : selected;
    if (!reason) { toast.error("Please pick a reason"); return; }
    setLoading(true);
    try {
      const res = await foodApi.cancelOrderByCustomer(orderId, reason);
      if (!res?.ok) { toast.error(res?.reason || "Couldn't cancel"); return; }
      toast.success("Order cancelled");
      onOpenChange(false);
      onCancelled?.();
    } catch (e: any) {
      toast.error(e.message || "Couldn't cancel");
    } finally { setLoading(false); }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Cancel order</DialogTitle>
        </DialogHeader>
        <div className="space-y-2">
          <p className="text-xs text-muted-foreground">Cancellation is allowed only within 60 seconds of restaurant accepting the order.</p>
          {reasons.map(r => (
            <label key={r.id} className="flex items-center gap-2 text-sm cursor-pointer">
              <input type="radio" name="cancel-reason" value={r.reason}
                checked={selected === r.reason} onChange={() => setSelected(r.reason)} />
              {r.reason}
            </label>
          ))}
          {selected === 'Other' && (
            <Textarea placeholder="Tell us more..." value={other} onChange={(e) => setOther(e.target.value)} />
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Keep order</Button>
          <Button variant="destructive" onClick={submit} disabled={loading}>
            {loading ? "Cancelling..." : "Cancel order"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
