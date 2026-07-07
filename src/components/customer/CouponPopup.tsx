/**
 * CouponPopup — shown on customer home after login when there are
 * unclaimed, eligible coupon campaigns with popup_enabled = true.
 * Dismissible; "Don't show again" writes to coupon_popup_dismissals.
 */
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Tag, X, Copy, Gift } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { supabase as sb } from "@/integrations/supabase/client";

interface Props { customerId: string }

export function CouponPopup({ customerId }: Props) {
  const navigate = useNavigate();
  const [campaign, setCampaign] = useState<any>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!customerId) return;
    let cancelled = false;

    const run = async () => {
      // best-effort geo
      let lat: number | null = null, lng: number | null = null;
      try {
        const pos = await new Promise<GeolocationPosition>((res, rej) => {
          if (!("geolocation" in navigator)) return rej();
          navigator.geolocation.getCurrentPosition(res, rej, { timeout: 4000 });
        });
        lat = pos.coords.latitude; lng = pos.coords.longitude;
      } catch { /* ignore */ }

      const { data: avail } = await (supabase.rpc as any)("get_customer_available_coupons", {
        _customer_id: customerId, _lat: lat, _lng: lng,
      });
      if (cancelled) return;

      const eligible: any[] = Array.isArray(avail) ? avail : [];
      if (eligible.length === 0) return;

      // fetch full campaigns to check popup_enabled + popup content
      const ids = eligible.map(e => e.campaign_id);
      const { data: full } = await supabase.from("coupon_campaigns")
        .select("*").in("id", ids).eq("popup_enabled", true);
      if (cancelled || !full || full.length === 0) return;

      // check dismissals
      const { data: dismiss } = await supabase.from("coupon_popup_dismissals")
        .select("campaign_id, dismissed_permanently")
        .eq("customer_id", customerId)
        .in("campaign_id", full.map((c: any) => c.id));
      const permanent = new Set((dismiss || []).filter((d: any) => d.dismissed_permanently).map((d: any) => d.campaign_id));

      // For new_users audience — filter by prior orders
      if (full.some((c: any) => c.popup_target === "new_users")) {
        const { count } = await supabase.from("orders").select("*", { count: "exact", head: true })
          .eq("customer_id", customerId).neq("status", "cancelled");
        if ((count || 0) > 0) {
          // no new-user popups apply
          const nonNew = full.filter((c: any) => c.popup_target !== "new_users" && !permanent.has(c.id));
          if (nonNew.length === 0) return;
          const enriched = nonNew[0];
          const ac = eligible.find(e => e.campaign_id === enriched.id);
          setCampaign({ ...enriched, code: ac?.code });
          setOpen(true);
          return;
        }
      }
      const showable = full.filter((c: any) => !permanent.has(c.id));
      if (showable.length === 0) return;
      const chosen = showable[0];
      const ac = eligible.find(e => e.campaign_id === chosen.id);
      setCampaign({ ...chosen, code: ac?.code });
      setOpen(true);
    };

    run();
    return () => { cancelled = true; };
  }, [customerId]);

  const dismiss = async (permanent: boolean) => {
    setOpen(false);
    if (!campaign) return;
    await supabase.from("coupon_popup_dismissals").upsert({
      customer_id: customerId, campaign_id: campaign.id,
      dismissed_permanently: permanent, last_dismissed_at: new Date().toISOString(),
    } as any, { onConflict: "campaign_id,customer_id" });
  };

  if (!campaign) return null;

  return (
    <Dialog open={open} onOpenChange={o => { if (!o) dismiss(false); }}>
      <DialogContent className="max-w-sm p-0 overflow-hidden">
        <div className="bg-gradient-to-br from-primary via-primary to-primary/80 text-primary-foreground p-6 relative">
          <button onClick={() => dismiss(false)} className="absolute top-3 right-3 opacity-70 hover:opacity-100"><X className="w-5 h-5" /></button>
          {campaign.popup_image_url && (
            <img loading="lazy" decoding="async" src={campaign.popup_image_url} alt="" className="w-24 h-24 object-cover rounded-lg mx-auto mb-3" />
          )}
          <div className="flex items-center justify-center gap-2 mb-2"><Tag className="w-5 h-5" /><span className="text-xs uppercase tracking-widest opacity-90">Special Offer</span></div>
          <h2 className="text-2xl font-bold text-center">{campaign.popup_title || campaign.name}</h2>
          <p className="text-sm text-center mt-2 opacity-95">{campaign.popup_description || campaign.description}</p>
          <div className="mt-4 bg-white/15 border-2 border-dashed border-white/40 rounded-lg p-3 text-center">
            <div className="text-[10px] opacity-80">Coupon code</div>
            <div className="font-mono font-bold text-xl tracking-widest">{campaign.code}</div>
          </div>
        </div>
        <div className="p-4 space-y-2">
          <Button className="w-full" onClick={async () => {
            // Claim reward: auto-add first eligible campaign product to cart
            try {
              const pids: string[] = campaign.product_ids || [];
              if (pids.length === 0) { toast.error("No product configured for this offer"); return; }
              // Prefer Petrol/Petroleum over Diesel when multiple products are attached to the campaign
              const { data: prods } = await sb.from("products").select("*").in("id", pids).eq("status","active");
              const list = (prods as any[]) || [];
              const prod = list.find(p => /petrol/i.test(p.title || "")) || list[0];
              if (!prod) { toast.error("Offer product unavailable right now"); return; }
              const res = await api.addToCart(prod as any, 1);
              if (!res?.success) { toast.error(res?.message || "Could not add to cart"); return; }
              navigator.clipboard.writeText(campaign.code).catch(() => {});
              toast.success(`Added to cart — apply code ${campaign.code} at checkout`);
              setOpen(false);
              navigate("/app/cart");
            } catch (e: any) {
              toast.error(e?.message || "Failed to claim");
            }
          }}><Gift className="w-4 h-4 mr-1" /> Claim Reward</Button>
          <Button variant="outline" className="w-full" onClick={() => {
            navigator.clipboard.writeText(campaign.code);
            toast.success("Code copied");
            setOpen(false);
            navigate("/app/coupons");
          }}><Copy className="w-4 h-4 mr-1" /> Copy & View My Coupons</Button>
          <div className="flex gap-2">
            <Button variant="ghost" size="sm" className="flex-1" onClick={() => dismiss(false)}>Later</Button>
            <Button variant="ghost" size="sm" className="flex-1" onClick={() => dismiss(true)}>Don't show again</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
