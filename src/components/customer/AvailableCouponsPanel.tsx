import { useMemo, useState } from "react";
import { Sparkles, Tag, Copy, Info, Check, TicketPercent, Clock } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import type { CouponRecommendation } from "@/lib/coupons/recommendation";
import { useCurrency } from "@/lib/country-context";

interface Props {
  loading: boolean;
  coupons: CouponRecommendation[];
  bestCampaignId: string | null;
  appliedCampaignId: string | null;
  onApply: (c: CouponRecommendation) => void;
  onRemove: () => void;
}

function formatExpiry(iso: string | null): string {
  if (!iso) return "";
  try {
    const d = new Date(iso);
    const days = Math.max(0, Math.ceil((d.getTime() - Date.now()) / 86400000));
    if (days <= 0) return "Expires today";
    if (days === 1) return "Expires tomorrow";
    if (days <= 7) return `${days} days left`;
    return `Valid till ${d.toLocaleDateString()}`;
  } catch {
    return "";
  }
}

export function AvailableCouponsPanel({
  loading,
  coupons,
  bestCampaignId,
  appliedCampaignId,
  onApply,
  onRemove,
}: Props) {
  const { format: fmt } = useCurrency();
  const [details, setDetails] = useState<CouponRecommendation | null>(null);
  const best = useMemo(
    () => coupons.find((c) => c.campaign_id === bestCampaignId) ?? coupons[0] ?? null,
    [coupons, bestCampaignId],
  );

  if (loading) {
    return (
      <Card className="p-4">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Sparkles className="h-4 w-4 animate-pulse" /> Finding best coupons for your cart…
        </div>
      </Card>
    );
  }

  if (coupons.length === 0) return null;

  const applied = appliedCampaignId ? coupons.find((c) => c.campaign_id === appliedCampaignId) : null;

  return (
    <Card className="p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <TicketPercent className="h-4 w-4 text-primary" />
          <h3 className="text-sm font-semibold">Available Coupons</h3>
          <Badge variant="secondary" className="text-[10px]">
            {coupons.length} eligible
          </Badge>
        </div>
        {applied && (
          <Button size="sm" variant="ghost" className="h-7 text-[11px]" onClick={onRemove}>
            Remove
          </Button>
        )}
      </div>

      {/* Congratulations banner */}
      {!applied && (
        <div className="rounded-lg border border-primary/20 bg-gradient-to-r from-primary/5 to-amber-500/5 p-3">
          <p className="text-[12px] font-semibold text-primary">
            🎉 Congratulations! You unlocked {coupons.length} offer{coupons.length > 1 ? "s" : ""}.
          </p>
        </div>
      )}

      {/* Recommended card */}
      {best && !applied && (
        <div className="rounded-xl border-2 border-primary/40 bg-primary/5 p-3">
          <div className="flex items-center gap-2 mb-1">
            <Sparkles className="h-3.5 w-3.5 text-primary" />
            <span className="text-[11px] font-bold uppercase tracking-wide text-primary">
              Recommended for you · Best Savings
            </span>
          </div>
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-sm font-semibold truncate">{best.campaign_name}</p>
              <p className="text-[11px] text-muted-foreground truncate">
                Code <span className="font-mono">{best.code}</span> · Save{" "}
                <span className="text-success font-semibold">{fmt(best.discount_amount)}</span>
              </p>
              <p className="text-[10px] text-muted-foreground mt-0.5">{formatExpiry(best.expires_at)}</p>
            </div>
            <Button size="sm" className="h-8 shrink-0" onClick={() => onApply(best)}>
              Apply
            </Button>
          </div>
        </div>
      )}

      {applied && (
        <div className="rounded-xl border-2 border-success/40 bg-success/5 p-3 flex items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 mb-0.5">
              <Check className="h-3.5 w-3.5 text-success" />
              <span className="text-[11px] font-bold uppercase text-success">Applied</span>
            </div>
            <p className="text-sm font-semibold">{applied.campaign_name}</p>
            <p className="text-[11px] text-success">
              You saved {fmt(applied.discount_amount)} · <span className="font-mono">{applied.code}</span>
            </p>
          </div>
        </div>
      )}

      {/* List of all eligible coupons */}
      <div className="space-y-2">
        {coupons.map((c) => {
          const isApplied = c.campaign_id === appliedCampaignId;
          const isBest = c.campaign_id === bestCampaignId;
          return (
            <div
              key={c.campaign_id}
              className={`rounded-lg border p-2.5 flex items-center gap-2 ${
                isApplied ? "border-success/40 bg-success/5" : "border-border/60 bg-card"
              }`}
            >
              <div className="h-9 w-9 rounded bg-primary/10 flex items-center justify-center shrink-0">
                <Tag className="h-4 w-4 text-primary" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <p className="text-[13px] font-semibold truncate">{c.campaign_name}</p>
                  {isBest && !isApplied && (
                    <Badge className="h-4 text-[9px] px-1.5">Best</Badge>
                  )}
                </div>
                <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                  <span className="font-mono">{c.code}</span>
                  <span className="text-success font-medium">Save {fmt(c.discount_amount)}</span>
                  {c.expires_at && (
                    <span className="flex items-center gap-0.5">
                      <Clock className="h-2.5 w-2.5" /> {formatExpiry(c.expires_at)}
                    </span>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-1">
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-7 w-7"
                  onClick={() => {
                    navigator.clipboard?.writeText(c.code);
                    toast.success("Code copied");
                  }}
                  aria-label="Copy code"
                >
                  <Copy className="h-3.5 w-3.5" />
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-7 w-7"
                  onClick={() => setDetails(c)}
                  aria-label="View details"
                >
                  <Info className="h-3.5 w-3.5" />
                </Button>
                {isApplied ? (
                  <Button size="sm" variant="outline" className="h-7 text-[11px]" onClick={onRemove}>
                    Remove
                  </Button>
                ) : (
                  <Button size="sm" className="h-7 text-[11px]" onClick={() => onApply(c)}>
                    Apply
                  </Button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <Dialog open={!!details} onOpenChange={(o) => !o && setDetails(null)}>
        <DialogContent className="max-w-md">
          {details && (
            <>
              <DialogHeader>
                <DialogTitle>{details.campaign_name}</DialogTitle>
                <DialogDescription className="font-mono text-xs">{details.code}</DialogDescription>
              </DialogHeader>
              <div className="space-y-2 text-sm">
                {details.description && <p className="text-muted-foreground">{details.description}</p>}
                <div className="grid grid-cols-2 gap-2 text-[12px]">
                  <div>
                    <p className="text-muted-foreground">Discount</p>
                    <p className="font-semibold">
                      {details.discount_type === "percentage"
                        ? `${details.discount_value}%`
                        : fmt(details.discount_value)}
                    </p>
                  </div>
                  {details.max_discount != null && (
                    <div>
                      <p className="text-muted-foreground">Max Discount</p>
                      <p className="font-semibold">{fmt(details.max_discount)}</p>
                    </div>
                  )}
                  {details.min_order_amount != null && (
                    <div>
                      <p className="text-muted-foreground">Min Purchase</p>
                      <p className="font-semibold">{fmt(details.min_order_amount)}</p>
                    </div>
                  )}
                  <div>
                    <p className="text-muted-foreground">Estimated Savings</p>
                    <p className="font-semibold text-success">{fmt(details.discount_amount)}</p>
                  </div>
                  {details.expires_at && (
                    <div className="col-span-2">
                      <p className="text-muted-foreground">Expiry</p>
                      <p className="font-semibold">
                        {new Date(details.expires_at).toLocaleString()}
                      </p>
                    </div>
                  )}
                </div>
                <p className="text-[10px] text-muted-foreground">
                  Terms &amp; conditions apply. Discount is applied only to eligible items in your
                  cart and is subject to campaign rules.
                </p>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </Card>
  );
}
