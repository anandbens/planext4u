/**
 * SpecialOffersWidget — horizontally-scrolling "Special Offers" row on the
 * customer home page. Only eligible active coupons for the current customer
 * are shown, powered by the same Eligibility Engine used everywhere else.
 */
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Tag, Copy, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { CouponDetailsDialog } from "./CouponDetailsDialog";
import { logCouponAudit } from "@/lib/coupons/audit";

export function SpecialOffersWidget() {
  const navigate = useNavigate();
  const { customerUser } = useAuth();
  const customerId = customerUser?.customer_id || customerUser?.id || "";
  const [items, setItems] = useState<any[]>([]);
  const [detail, setDetail] = useState<any>(null);

  useEffect(() => {
    if (!customerId) return;
    let cancelled = false;
    (async () => {
      let lat: number | null = null, lng: number | null = null;
      try {
        const pos = await new Promise<GeolocationPosition>((res, rej) => {
          if (!("geolocation" in navigator)) return rej();
          navigator.geolocation.getCurrentPosition(res, rej, { timeout: 3500 });
        });
        lat = pos.coords.latitude; lng = pos.coords.longitude;
      } catch { /* ignore */ }

      const { data } = await (supabase.rpc as any)("get_customer_available_coupons", {
        _customer_id: customerId, _lat: lat, _lng: lng,
      });
      if (cancelled) return;
      const list = Array.isArray(data) ? data.slice(0, 10) : [];
      setItems(list);
      if (list.length > 0) {
        logCouponAudit({ event: "coupon_viewed", customerId, metadata: { surface: "home_widget", count: list.length } });
      }
    })();
    return () => { cancelled = true; };
  }, [customerId]);

  if (!items.length) return null;

  const copy = (c: any) => {
    navigator.clipboard.writeText(c.code);
    toast.success(`Code ${c.code} copied`);
    logCouponAudit({ event: "coupon_copied", customerId, campaignId: c.campaign_id, code: c.code, metadata: { surface: "home_widget" } });
  };

  return (
    <section className="mt-4">
      <div className="flex items-center justify-between px-4 mb-2">
        <h2 className="text-base font-bold flex items-center gap-1.5"><Tag className="w-4 h-4 text-primary" />Special Offers</h2>
        <button className="text-xs text-primary font-medium flex items-center" onClick={() => navigate("/app/coupons")}>
          View all <ArrowRight className="w-3 h-3 ml-0.5" />
        </button>
      </div>
      <div className="flex gap-3 overflow-x-auto scrollbar-hide px-4 pb-2 snap-x">
        {items.map((c: any) => {
          const disc = c.discount_type === "percent" ? `${c.discount_value}% OFF` : `₹${c.discount_value} OFF`;
          return (
            <div key={c.campaign_id + c.code} className="snap-start shrink-0 w-64 rounded-2xl border border-border bg-card overflow-hidden shadow-sm">
              <div className="h-20 bg-gradient-to-br from-primary/90 to-primary/50 relative flex items-center justify-center">
                {c.popup_image_url ? (
                  <img src={c.popup_image_url} alt={c.name} loading="lazy" className="w-full h-full object-cover" />
                ) : (
                  <div className="text-primary-foreground font-extrabold text-xl">{disc}</div>
                )}
              </div>
              <div className="p-2.5 space-y-1">
                <div className="font-semibold text-sm line-clamp-1">{c.name}</div>
                <div className="text-[11px] text-muted-foreground line-clamp-1">
                  {disc}{c.expires_at ? ` · till ${new Date(c.expires_at).toLocaleDateString()}` : ""}
                </div>
                <div className="flex items-center gap-1 mt-1.5">
                  <div className="font-mono text-[11px] font-bold bg-primary/10 text-primary px-2 py-0.5 rounded">{c.code}</div>
                  <button className="ml-auto text-xs text-primary hover:underline" onClick={() => copy(c)}>
                    <Copy className="w-3 h-3 inline mr-0.5" />Copy
                  </button>
                </div>
                <div className="flex gap-1.5 pt-1.5">
                  <Button size="sm" variant="outline" className="flex-1 h-7 text-[11px]" onClick={() => setDetail(c)}>Details</Button>
                  <Button size="sm" className="flex-1 h-7 text-[11px]" onClick={() => { logCouponAudit({ event: "coupon_applied", customerId, campaignId: c.campaign_id, code: c.code, metadata: { surface: "home_widget" } }); navigate("/app/cart"); }}>Apply</Button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
      <CouponDetailsDialog open={!!detail} onOpenChange={(v) => !v && setDetail(null)} coupon={detail} customerId={customerId} />
    </section>
  );
}
