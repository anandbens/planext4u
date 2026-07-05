// Confirmation dialog shown before bulk-generating coupon codes.
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle } from "lucide-react";

interface Props {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  campaign: any | null;
  count: number;
  length: number;
  vendorName?: string;
  eligibleDistricts?: number;
  eligibleVendors?: number;
  eligibleProducts?: number;
  estimatedCustomers?: number | null;
}

export function CouponGenerateConfirm({
  open, onClose, onConfirm, campaign, count, length,
  vendorName, eligibleDistricts, eligibleVendors, eligibleProducts, estimatedCustomers,
}: Props) {
  if (!campaign) return null;

  const discountLine = campaign.discount_type === "percent"
    ? `${campaign.discount_value}% off${campaign.max_discount ? ` (max ₹${campaign.max_discount})` : ""}`
    : `₹${campaign.discount_value} off`;

  const dateRange = `${campaign.starts_at ? new Date(campaign.starts_at).toLocaleDateString() : "—"} → ${
    campaign.expires_at ? new Date(campaign.expires_at).toLocaleDateString() : "No expiry"
  }`;

  const Row = ({ label, value }: { label: string; value: React.ReactNode }) => (
    <div className="flex justify-between items-baseline gap-3 py-1.5 border-b border-dashed last:border-0">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className="text-sm font-medium text-right">{value}</span>
    </div>
  );

  const overCap = estimatedCustomers != null && estimatedCustomers > 0 && count > estimatedCustomers * 2;

  return (
    <Dialog open={open} onOpenChange={o => !o && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader><DialogTitle>Confirm coupon generation</DialogTitle></DialogHeader>
        <div className="space-y-1">
          <Row label="Campaign" value={campaign.name} />
          <Row label="Vendor" value={vendorName || "Any vendor"} />
          <Row label="Discount" value={<Badge variant="secondary">{discountLine}</Badge>} />
          <Row label="Min order" value={`₹${campaign.min_order_amount || 0}`} />
          <Row label="Campaign dates" value={dateRange} />
          <Row label="Eligible districts" value={eligibleDistricts ?? "All"} />
          <Row label="Eligible vendors" value={eligibleVendors ?? "—"} />
          <Row label="Eligible products" value={eligibleProducts ?? "—"} />
          <Row label="Estimated reach" value={estimatedCustomers != null ? estimatedCustomers.toLocaleString() + " customers" : "—"} />
          <Row label="Total coupons" value={<b>{count.toLocaleString()}</b>} />
          <Row label="Code length" value={`${length} chars`} />
          <Row label="Code mode" value={campaign.code_mode?.replace("_", " ")} />
        </div>

        {overCap && (
          <div className="flex items-start gap-2 text-xs text-warning border-t pt-2">
            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>Generating <b>{count.toLocaleString()}</b> codes is much larger than the eligible customer base ({estimatedCustomers?.toLocaleString()}). Consider reducing the quantity.</span>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={onConfirm}>Generate {count.toLocaleString()} codes</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
