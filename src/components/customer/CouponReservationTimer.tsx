/**
 * CouponReservationTimer — checkout countdown badge for an active
 * coupon reservation. Polls `get_active_coupon_reservation` on mount so
 * multiple tabs and page refreshes stay in sync, and warns as the lock
 * approaches expiry.
 */
import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, Clock, Tag, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
  getActiveCouponReservation,
  releaseCouponReservation,
  type ActiveReservation,
} from "@/lib/coupons/reservation";

interface Props {
  customerId: string;
  onExpired?: () => void;
  onReleased?: () => void;
  className?: string;
}

export function CouponReservationTimer({ customerId, onExpired, onReleased, className }: Props) {
  const [res, setRes] = useState<ActiveReservation | null>(null);
  const [now, setNow] = useState<number>(Date.now());
  const [loading, setLoading] = useState(true);

  const refresh = async () => {
    if (!customerId) { setLoading(false); return; }
    const r = await getActiveCouponReservation(customerId);
    setRes(r);
    setLoading(false);
  };

  useEffect(() => { refresh(); /* eslint-disable-next-line */ }, [customerId]);

  // 1s ticker + a periodic re-sync so multi-tab / server-expiry stays honest.
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    const s = setInterval(refresh, 30000);
    const onFocus = () => refresh();
    window.addEventListener("focus", onFocus);
    return () => { clearInterval(t); clearInterval(s); window.removeEventListener("focus", onFocus); };
  }, [customerId]);

  const secondsRemaining = useMemo(() => {
    if (!res) return 0;
    return Math.max(0, Math.floor((new Date(res.expires_at).getTime() - now) / 1000));
  }, [res, now]);

  useEffect(() => {
    if (res && secondsRemaining === 0) {
      onExpired?.();
      refresh();
    }
  }, [secondsRemaining, res]); // eslint-disable-line

  if (loading || !res) return null;

  const mm = String(Math.floor(secondsRemaining / 60)).padStart(2, "0");
  const ss = String(secondsRemaining % 60).padStart(2, "0");
  const warning = secondsRemaining <= 60;

  const release = async () => {
    const r = await releaseCouponReservation(res.reservation_id, customerId, "user_cancelled");
    if (r.ok) {
      toast.success("Reservation released");
      setRes(null);
      onReleased?.();
    } else {
      toast.error("Could not release reservation");
    }
  };

  return (
    <div className={`rounded-lg border px-3 py-2 flex items-center gap-3 text-sm ${warning ? "border-destructive bg-destructive/5" : "border-primary/40 bg-primary/5"} ${className || ""}`}>
      <Tag className={`w-4 h-4 shrink-0 ${warning ? "text-destructive" : "text-primary"}`} />
      <div className="flex-1 min-w-0">
        <div className="font-semibold truncate">
          Coupon reserved: <span className="font-mono">{res.code}</span>
        </div>
        <div className="text-[11px] text-muted-foreground flex items-center gap-1">
          {warning ? <AlertTriangle className="w-3 h-3 text-destructive" /> : <Clock className="w-3 h-3" />}
          {secondsRemaining > 0 ? `Time remaining ${mm}:${ss}` : "Reservation expired"}
        </div>
      </div>
      <Button size="sm" variant="ghost" onClick={release} title="Release reservation">
        <X className="w-4 h-4" />
      </Button>
    </div>
  );
}
