import { supabase } from "@/integrations/supabase/client";

export interface CascadeResult {
  commission: number;
  commissionSource: 'plan' | 'vendor' | 'product';
  maxRedemption: number;
  redemptionSource: 'plan' | 'vendor' | 'product';
}

/**
 * Resolve effective commission and max redemption using cascade:
 * Product → Vendor → Plan
 */
export async function resolveCommissionCascade(
  vendorId: string,
  productCommissionOverride?: number | null,
  productMaxRedemption?: number | null,
): Promise<CascadeResult> {
  // Fetch vendor with plan
  const { data: vendor } = await supabase
    .from('vendors')
    .select('commission_rate, max_redemption_percentage, plan_id')
    .eq('id', vendorId)
    .maybeSingle();

  let planCommission = 0;
  let planRedemption = 3; // default

  if (vendor?.plan_id) {
    const { data: plan } = await supabase
      .from('vendor_plans')
      .select('commission_percentage, max_redemption_percentage')
      .eq('id', vendor.plan_id)
      .maybeSingle();
    if (plan) {
      planCommission = Number(plan.commission_percentage) || 0;
      planRedemption = Number(plan.max_redemption_percentage) || 3;
    }
  }

  // Cascade: plan → vendor → product
  let commission = planCommission;
  let commissionSource: CascadeResult['commissionSource'] = 'plan';

  if (vendor?.commission_rate != null && vendor.commission_rate !== planCommission) {
    commission = Number(vendor.commission_rate);
    commissionSource = 'vendor';
  }

  if (productCommissionOverride != null) {
    commission = productCommissionOverride;
    commissionSource = 'product';
  }

  let maxRedemption = planRedemption;
  let redemptionSource: CascadeResult['redemptionSource'] = 'plan';

  if (vendor?.max_redemption_percentage != null) {
    maxRedemption = Number(vendor.max_redemption_percentage);
    redemptionSource = 'vendor';
  }

  if (productMaxRedemption != null) {
    maxRedemption = productMaxRedemption;
    redemptionSource = 'product';
  }

  return { commission, commissionSource, maxRedemption, redemptionSource };
}

/**
 * Calculate max redeemable points for a product based on cascade logic.
 * Returns the max points that can be redeemed (1 point = 1 rupee).
 */
export function calculateMaxRedeemablePoints(
  sellingPrice: number,
  maxRedemptionPercent: number,
  walletBalance: number,
): number {
  const maxFromProduct = Math.floor(sellingPrice * maxRedemptionPercent / 100);
  return Math.min(maxFromProduct, walletBalance);
}
