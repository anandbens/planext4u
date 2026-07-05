/**
 * CouponDetailsDialog — Amazon/Flipkart-style coupon detail sheet.
 * Displays campaign details, T&Cs, applicable vendors/products/locations,
 * validity, quantity limits and customer eligibility summary.
 */
import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Copy, Tag, MapPin, Store, Package, CalendarClock, ShieldCheck, Percent, Users } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { logCouponAudit } from "@/lib/coupons/audit";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  coupon: any | null;
  customerId?: string | null;
}

export function CouponDetailsDialog({ open, onOpenChange, coupon, customerId }: Props) {
  const navigate = useNavigate();
  const [campaign, setCampaign] = useState<any>(null);
  const [vendors, setVendors] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open || !coupon?.campaign_id) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      const { data: c } = await supabase.from("coupon_campaigns").select("*").eq("id", coupon.campaign_id).maybeSingle();
      if (cancelled) return;
      setCampaign(c);
      const vIds: string[] = c?.vendor_ids || (coupon.vendor_id ? [coupon.vendor_id] : []);
      const pIds: string[] = c?.product_ids || coupon.product_ids || [];
      const [v, p] = await Promise.all([
        vIds.length ? supabase.from("vendors").select("id, store_name, city").in("id", vIds).limit(10) : Promise.resolve({ data: [] as any[] }),
        pIds.length ? supabase.from("products").select("id, name").in("id", pIds).limit(10) : Promise.resolve({ data: [] as any[] }),
      ]);
      if (cancelled) return;
      setVendors((v.data as any[]) || []);
      setProducts((p.data as any[]) || []);
      setLoading(false);
      logCouponAudit({ event: "coupon_details_viewed", customerId, campaignId: coupon.campaign_id, code: coupon.code });
    })();
    return () => { cancelled = true; };
  }, [open, coupon?.campaign_id]);

  if (!coupon) return null;

  const copy = () => {
    navigator.clipboard.writeText(coupon.code);
    toast.success(`Code ${coupon.code} copied`);
    logCouponAudit({ event: "coupon_copied", customerId, campaignId: coupon.campaign_id, code: coupon.code });
  };

  const applyNow = () => {
    logCouponAudit({ event: "coupon_applied", customerId, campaignId: coupon.campaign_id, code: coupon.code });
    navigate("/app/cart");
    onOpenChange(false);
  };

  const disc = coupon.discount_type === "percent"
    ? `${coupon.discount_value}% off`
    : `₹${coupon.discount_value} off`;

  const banner = campaign?.popup_image_url || coupon.popup_image_url;
  const expiresAt = coupon.expires_at || campaign?.end_date;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto p-0">
        <DialogHeader className="sr-only"><DialogTitle>{coupon.name}</DialogTitle></DialogHeader>

        <div className="relative">
          {banner ? (
            <img src={banner} alt={coupon.name} loading="lazy" className="w-full h-40 object-cover" />
          ) : (
            <div className="w-full h-32 bg-gradient-to-br from-primary/80 to-primary/40 flex items-center justify-center">
              <Tag className="w-12 h-12 text-primary-foreground/80" />
            </div>
          )}
          <div className="absolute bottom-2 left-3 right-3">
            <div className="bg-background/95 backdrop-blur rounded-lg p-2 flex items-center justify-between gap-2">
              <div>
                <div className="text-[10px] uppercase text-muted-foreground tracking-wide">Coupon Code</div>
                <div className="font-mono font-bold text-primary">{coupon.code}</div>
              </div>
              <Button size="sm" variant="outline" onClick={copy}><Copy className="w-3.5 h-3.5 mr-1" />Copy</Button>
            </div>
          </div>
        </div>

        <div className="p-4 space-y-4">
          <div>
            <h2 className="text-lg font-bold">{coupon.name}</h2>
            <p className="text-xs text-muted-foreground mt-1">{coupon.description || campaign?.description || "Save more with this exclusive offer."}</p>
            <div className="flex flex-wrap items-center gap-2 mt-2">
              <Badge variant="secondary" className="text-xs"><Percent className="w-3 h-3 mr-1" />{disc}</Badge>
              {coupon.max_discount ? <Badge variant="outline" className="text-xs">Max ₹{coupon.max_discount}</Badge> : null}
              {coupon.min_order_amount > 0 ? <Badge variant="outline" className="text-xs">Min ₹{coupon.min_order_amount}</Badge> : null}
              {coupon.qty_limit ? <Badge variant="outline" className="text-xs">Qty limit {coupon.qty_limit}</Badge> : null}
            </div>
          </div>

          <Separator />

          <Section icon={CalendarClock} title="Validity">
            {expiresAt ? `Valid until ${new Date(expiresAt).toLocaleDateString()}` : "Limited-time offer"}
            {campaign?.start_date ? ` · Starts ${new Date(campaign.start_date).toLocaleDateString()}` : ""}
          </Section>

          {vendors.length > 0 && (
            <Section icon={Store} title="Applicable Vendors">
              <div className="flex flex-wrap gap-1.5">
                {vendors.map(v => <Badge key={v.id} variant="outline" className="text-[11px]">{v.store_name}{v.city ? ` · ${v.city}` : ""}</Badge>)}
              </div>
            </Section>
          )}

          {products.length > 0 && (
            <Section icon={Package} title="Applicable Products">
              <div className="flex flex-wrap gap-1.5">
                {products.map(p => <Badge key={p.id} variant="outline" className="text-[11px]">{p.name}</Badge>)}
              </div>
            </Section>
          )}

          {(campaign?.state_codes?.length || campaign?.district_ids?.length || campaign?.radius_km) && (
            <Section icon={MapPin} title="Applicable Locations">
              {campaign?.state_codes?.length ? <div>States: {campaign.state_codes.join(", ")}</div> : null}
              {campaign?.district_ids?.length ? <div>Districts: {campaign.district_ids.length} selected</div> : null}
              {campaign?.radius_km ? <div>Within {campaign.radius_km} km of campaign center</div> : null}
            </Section>
          )}

          {(campaign?.first_time_only || campaign?.min_orders || campaign?.min_lifetime_spend) && (
            <Section icon={Users} title="Customer Eligibility">
              {campaign?.first_time_only ? <div>First-time customers only</div> : null}
              {campaign?.min_orders ? <div>Minimum {campaign.min_orders} previous orders</div> : null}
              {campaign?.min_lifetime_spend ? <div>Lifetime spend ≥ ₹{campaign.min_lifetime_spend}</div> : null}
            </Section>
          )}

          <Section icon={ShieldCheck} title="Terms & Conditions">
            <ul className="list-disc pl-4 space-y-0.5">
              <li>Offer valid for eligible customers only, subject to campaign rules.</li>
              <li>Cannot be combined with certain other promotions.</li>
              <li>P4U reserves the right to modify or cancel the offer at any time.</li>
              {campaign?.terms ? <li>{campaign.terms}</li> : null}
            </ul>
          </Section>

          <div className="flex gap-2 pt-2 sticky bottom-0 bg-background pb-1">
            <Button variant="outline" className="flex-1" onClick={copy}><Copy className="w-4 h-4 mr-1" />Copy Code</Button>
            <Button className="flex-1" onClick={applyNow}>Apply Now</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function Section({ icon: Icon, title, children }: { icon: any; title: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="flex items-center gap-1.5 text-sm font-semibold mb-1"><Icon className="w-4 h-4 text-primary" />{title}</div>
      <div className="text-xs text-muted-foreground space-y-0.5">{children}</div>
    </div>
  );
}
