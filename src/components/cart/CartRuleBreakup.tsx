/**
 * CartRuleBreakup — shared display of applied cart rules + discount lines.
 *
 * Used in three surfaces:
 *   1. Customer cart / checkout (audience="customer")
 *   2. Admin order modal       (audience="admin")
 *   3. Vendor order detail     (audience="vendor")
 *
 * Vendors see only rules whose discount they bear; admins see everything
 * with the discount-bearer chip; customers see everything as savings.
 */
import { Badge } from "@/components/ui/badge";
import { useCurrency } from "@/lib/country-context";
import { Tag, Sparkles } from "lucide-react";

export interface AppliedCartRule {
  rule_id: string;
  rule_name: string;
  discount_amount: number;
  discount_bearer: "p4u" | "vendor" | "shared" | string;
  bearer_breakup?: {
    p4u?: number;
    vendor?: number;
    [k: string]: number | undefined;
  } | null;
  rule_snapshot?: Record<string, unknown> | null;
}

interface CartRuleBreakupProps {
  rules: AppliedCartRule[] | null | undefined;
  totalDiscount?: number;
  audience: "customer" | "admin" | "vendor";
  /** When set (vendor view), only show rules where this vendor bears > 0. */
  vendorId?: string | null;
  className?: string;
}

const bearerLabel: Record<string, string> = {
  p4u: "Borne by P4U",
  vendor: "Borne by Vendor",
  shared: "Shared P4U + Vendor",
};

const bearerVariant: Record<string, "default" | "secondary" | "outline"> = {
  p4u: "default",
  vendor: "secondary",
  shared: "outline",
};

export function CartRuleBreakup({
  rules,
  totalDiscount,
  audience,
  vendorId: _vendorId,
  className = "",
}: CartRuleBreakupProps) {
  const { fmt } = useCurrency();

  if (!rules || rules.length === 0) return null;

  // Filter for vendor audience: only show rules where vendor share > 0
  const visibleRules =
    audience === "vendor"
      ? rules.filter(
          (r) =>
            r.discount_bearer === "vendor" ||
            (r.discount_bearer === "shared" && (r.bearer_breakup?.vendor ?? 0) > 0),
        )
      : rules;

  if (visibleRules.length === 0) return null;

  const sumLine = totalDiscount ?? visibleRules.reduce((s, r) => s + (r.discount_amount || 0), 0);

  return (
    <div className={`rounded-lg border border-success/20 bg-success/5 p-3 space-y-2 ${className}`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5 text-xs font-semibold text-success uppercase tracking-wide">
          <Sparkles className="h-3.5 w-3.5" />
          {audience === "vendor" ? "Vendor-borne discounts" : "Discounts applied"}
        </div>
        <span className="text-sm font-bold text-success">- {fmt(sumLine, { decimals: 0 })}</span>
      </div>

      <div className="space-y-1.5">
        {visibleRules.map((r) => {
          // For vendor view, show only their share; for others show full discount
          const amount =
            audience === "vendor" && r.discount_bearer === "shared"
              ? r.bearer_breakup?.vendor ?? 0
              : r.discount_amount;
          return (
            <div key={r.rule_id} className="flex items-start justify-between gap-3 text-xs">
              <div className="flex items-start gap-2 min-w-0">
                <Tag className="h-3.5 w-3.5 text-success/80 mt-0.5 shrink-0" />
                <div className="min-w-0">
                  <div className="font-medium truncate">{r.rule_name}</div>
                  {audience !== "customer" && (
                    <Badge
                      variant={bearerVariant[r.discount_bearer] || "outline"}
                      className="mt-0.5 text-[10px] py-0 px-1.5 h-4"
                    >
                      {bearerLabel[r.discount_bearer] || r.discount_bearer}
                    </Badge>
                  )}
                  {audience === "admin" && r.discount_bearer === "shared" && r.bearer_breakup && (
                    <div className="text-[10px] text-muted-foreground mt-0.5">
                      P4U {fmt(r.bearer_breakup.p4u || 0, { decimals: 0 })} · Vendor {fmt(r.bearer_breakup.vendor || 0, { decimals: 0 })}
                    </div>
                  )}
                </div>
              </div>
              <span className="font-medium text-success shrink-0">
                - {fmt(amount, { decimals: 0 })}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
