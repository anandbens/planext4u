import { supabase } from "@/integrations/supabase/client";

/** Cache platform variable values for 5 minutes */
let cache: Record<string, number> = {};
let cacheTime = 0;

async function getPointValue(key: string): Promise<number> {
  if (Date.now() - cacheTime > 5 * 60 * 1000) {
    const { data } = await supabase.from('platform_variables').select('key, value');
    cache = {};
    (data || []).forEach((v: any) => { cache[v.key] = Number(v.value) || 0; });
    cacheTime = Date.now();
  }
  return cache[key] || 0;
}

/**
 * Award loyalty points to a customer.
 * Looks up the customer record by auth user_id match, then credits points.
 */
export async function awardPoints(
  authUserId: string,
  variableKey: string,
  description: string,
) {
  try {
    const points = await getPointValue(variableKey);
    if (points <= 0) return;

    // Find customer linked to this auth user
    const { data: customer } = await supabase
      .from('customers')
      .select('id, wallet_points')
      .eq('id', authUserId)
      .maybeSingle();

    if (!customer) return;

    // Insert points transaction
    await supabase.from('points_transactions').insert({
      id: `PT-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      user_id: customer.id,
      points,
      type: 'earned',
      description,
    });

    // Update wallet balance
    await supabase
      .from('customers')
      .update({ wallet_points: (customer.wallet_points || 0) + points })
      .eq('id', customer.id);
  } catch (e) {
    console.error('Award points error:', e);
  }
}
