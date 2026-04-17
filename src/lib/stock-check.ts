import { supabase } from "@/integrations/supabase/client";
import type { CartItem } from "@/lib/api";

export interface StockIssue {
  cartItemId: string;
  productId: string;
  variantId?: string | null;
  title: string;
  requested: number;
  available: number;
}

/**
 * Cross-checks live stock for every cart item.
 * - For variant items, reads `product_variants.stock_quantity` by variant_id.
 * - For simple items, reads `products.stock` by product id.
 * Returns the list of items where available stock < requested qty.
 */
export async function checkCartStock(cart: CartItem[]): Promise<StockIssue[]> {
  if (!cart || cart.length === 0) return [];

  const issues: StockIssue[] = [];

  const variantIds = cart.map((i: any) => i.variant_id).filter(Boolean) as string[];
  const productIds = cart.map((i: any) => {
    // For variant items the cart "id" is composite (`PRD__VAR`). The real product id
    // is stored separately when added; fall back to splitting if needed.
    return i.product_id || (typeof i.id === 'string' && i.id.includes('__') ? i.id.split('__')[0] : i.id);
  });

  const [variantsRes, productsRes] = await Promise.all([
    variantIds.length
      ? supabase.from('product_variants').select('id, stock_quantity').in('id', variantIds)
      : Promise.resolve({ data: [] as any[] }),
    productIds.length
      ? supabase.from('products').select('id, stock, title').in('id', Array.from(new Set(productIds)))
      : Promise.resolve({ data: [] as any[] }),
  ]);

  const variantMap = new Map((variantsRes.data || []).map((v: any) => [v.id, v.stock_quantity ?? 0]));
  const productMap = new Map((productsRes.data || []).map((p: any) => [p.id, { stock: p.stock ?? 0, title: p.title }]));

  for (const item of cart as any[]) {
    const realProductId = item.product_id || (typeof item.id === 'string' && item.id.includes('__') ? item.id.split('__')[0] : item.id);
    const requested = item.qty || 0;

    let available = 0;
    if (item.variant_id) {
      available = variantMap.get(item.variant_id) ?? 0;
    } else {
      available = productMap.get(realProductId)?.stock ?? 0;
    }

    if (available < requested) {
      issues.push({
        cartItemId: item.id,
        productId: realProductId,
        variantId: item.variant_id || null,
        title: item.title || productMap.get(realProductId)?.title || 'Item',
        requested,
        available,
      });
    }
  }

  return issues;
}

/**
 * Decrements stock for ordered items after successful payment.
 * - Variant items: decrements `product_variants.stock_quantity`.
 * - Simple items: decrements `products.stock`.
 * Best-effort: errors are logged but do not throw, so the order is not blocked.
 */
export async function decrementStockForCart(cart: CartItem[]): Promise<void> {
  if (!cart || cart.length === 0) return;

  for (const item of cart as any[]) {
    const realProductId = item.product_id || (typeof item.id === 'string' && item.id.includes('__') ? item.id.split('__')[0] : item.id);
    const qty = item.qty || 0;
    if (qty <= 0) continue;

    try {
      if (item.variant_id) {
        const { data: v } = await supabase.from('product_variants').select('stock_quantity').eq('id', item.variant_id).maybeSingle();
        const current = v?.stock_quantity ?? 0;
        const next = Math.max(0, current - qty);
        await supabase.from('product_variants').update({
          stock_quantity: next,
          stock_status: next === 0 ? 'out_of_stock' : 'in_stock',
        }).eq('id', item.variant_id);
      } else {
        const { data: p } = await supabase.from('products').select('stock').eq('id', realProductId).maybeSingle();
        const current = (p as any)?.stock ?? 0;
        const next = Math.max(0, current - qty);
        await supabase.from('products').update({ stock: next }).eq('id', realProductId);
      }
    } catch (err) {
      console.error('Stock decrement failed for', item.id, err);
    }
  }
}
