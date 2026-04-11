import { supabase } from "@/integrations/supabase/client";

/** Cache platform variable values for 5 minutes */
let cache: Record<string, string> = {};
let cacheTime = 0;

async function loadCache() {
  if (Date.now() - cacheTime > 5 * 60 * 1000) {
    const { data } = await supabase.from('platform_variables').select('key, value');
    cache = {};
    (data || []).forEach((v: any) => { cache[v.key] = v.value; });
    cacheTime = Date.now();
  }
}

async function getPointValue(key: string): Promise<number> {
  await loadCache();
  return Number(cache[key]) || 0;
}

async function getStringValue(key: string): Promise<string> {
  await loadCache();
  return cache[key] || '';
}

/**
 * Award loyalty points to a customer.
 * Supports cooling period for referral points.
 */
export async function awardPoints(
  authUserId: string,
  variableKey: string,
  description: string,
  options?: { type?: string; isCooling?: boolean }
) {
  try {
    const points = await getPointValue(variableKey);
    if (points <= 0) return;

    const expiryDays = Number(await getStringValue('points_expiry_days')) || 60;
    const coolingEnabled = (await getStringValue('referral_cooling_enabled')) === '1';

    // Check if this is a referral type and cooling is enabled
    const isReferralType = variableKey === 'referral_points' || variableKey === 'vendor_referral_points';
    const shouldCool = isReferralType && coolingEnabled && options?.isCooling !== false;

    // Find customer linked to this auth user
    const { data: customer } = await supabase
      .from('customers')
      .select('id, wallet_points')
      .eq('id', authUserId)
      .maybeSingle();

    if (!customer) return;

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + expiryDays);

    const coolingStatus = shouldCool ? 'pending' : 'credited';
    const txType = options?.type || variableKey.replace('_points', '');

    // Insert points transaction
    await supabase.from('points_transactions').insert({
      id: `PT-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      user_id: customer.id,
      points,
      type: txType,
      description,
      expires_at: expiresAt.toISOString(),
      cooling_status: coolingStatus,
    } as any);

    // Only update wallet balance if not in cooling period
    if (!shouldCool) {
      await supabase
        .from('customers')
        .update({ wallet_points: (customer.wallet_points || 0) + points })
        .eq('id', customer.id);
    }
  } catch (e) {
    console.error('Award points error:', e);
  }
}

/**
 * Credit cooling period referral points when the referred user places their first order.
 */
export async function creditCoolingPoints(referredCustomerId: string) {
  try {
    // Find who referred this customer
    const { data: customer } = await supabase
      .from('customers')
      .select('referred_by')
      .eq('id', referredCustomerId)
      .maybeSingle();

    if (!customer?.referred_by) return;

    // Find the referrer by referral code
    const { data: referrer } = await supabase
      .from('customers')
      .select('id, wallet_points')
      .eq('referral_code', customer.referred_by)
      .maybeSingle();

    if (!referrer) return;

    // Find pending cooling points for this referrer related to this referral
    const { data: pendingTx } = await supabase
      .from('points_transactions')
      .select('*')
      .eq('user_id', referrer.id)
      .eq('cooling_status', 'pending')
      .in('type', ['referral', 'vendor_referral']);

    if (!pendingTx || pendingTx.length === 0) return;

    // Credit each pending transaction
    let totalToCredit = 0;
    for (const tx of pendingTx) {
      await supabase
        .from('points_transactions')
        .update({ cooling_status: 'credited' } as any)
        .eq('id', tx.id);
      totalToCredit += tx.points;
    }

    if (totalToCredit > 0) {
      await supabase
        .from('customers')
        .update({ wallet_points: (referrer.wallet_points || 0) + totalToCredit })
        .eq('id', referrer.id);
    }
  } catch (e) {
    console.error('Credit cooling points error:', e);
  }
}
