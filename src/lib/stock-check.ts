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
      ? supabase.from('product_variants').select('id, stock_quantity, stock_status').in('id', variantIds)
      : Promise.resolve({ data: [] as any[] }),
    productIds.length
      ? supabase.from('products').select('id, stock, title, manage_stock, stock_status').in('id', Array.from(new Set(productIds)))
      : Promise.resolve({ data: [] as any[] }),
  ]);

  const variantMap = new Map((variantsRes.data || []).map((v: any) => [v.id, { stock: v.stock_quantity ?? 0, status: v.stock_status }]));
  const productMap = new Map((productsRes.data || []).map((p: any) => [p.id, {
    stock: p.stock ?? 0,
    title: p.title,
    manage_stock: p.manage_stock ?? true,
    stock_status: p.stock_status ?? null,
  }]));

  for (const item of cart as any[]) {
    const realProductId = item.product_id || (typeof item.id === 'string' && item.id.includes('__') ? item.id.split('__')[0] : item.id);
    const requested = item.qty || 0;

    if (item.variant_id) {
      const v = variantMap.get(item.variant_id);
      const available = v?.stock ?? 0;
      if (available < requested) {
        issues.push({
          cartItemId: item.id, productId: realProductId, variantId: item.variant_id,
          title: item.title || productMap.get(realProductId)?.title || 'Item',
          requested, available,
        });
      }
    } else {
      const p = productMap.get(realProductId);
      // Untracked products: only block when explicitly marked out_of_stock.
      if (p && p.manage_stock === false) {
        if (p.stock_status === 'out_of_stock') {
          issues.push({
            cartItemId: item.id, productId: realProductId, variantId: null,
            title: item.title || p.title || 'Item', requested, available: 0,
          });
        }
        continue;
      }
      const available = p?.stock ?? 0;
      if (available < requested) {
        issues.push({
          cartItemId: item.id, productId: realProductId, variantId: null,
          title: item.title || p?.title || 'Item', requested, available,
        });
      }
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
      // Always bump the parent product's sold_count regardless of variant
      const { data: parent } = await supabase
        .from('products')
        .select('stock, sold_count')
        .eq('id', realProductId)
        .maybeSingle();

      if (item.variant_id) {
        const { data: v } = await supabase.from('product_variants').select('stock_quantity').eq('id', item.variant_id).maybeSingle();
        const current = (v as any)?.stock_quantity ?? 0;
        const next = Math.max(0, current - qty);
        await supabase.from('product_variants').update({
          stock_quantity: next,
          stock_status: next === 0 ? 'out_of_stock' : 'in_stock',
        }).eq('id', item.variant_id);
      } else {
        const current = (parent as any)?.stock ?? 0;
        const next = Math.max(0, current - qty);
        await supabase.from('products').update({
          stock: next,
          stock_status: next === 0 ? 'out_of_stock' : 'in_stock',
        } as any).eq('id', realProductId);
      }

      // Increment sold_count on the parent product
      const currentSold = (parent as any)?.sold_count ?? 0;
      await supabase.from('products').update({
        sold_count: currentSold + qty,
      } as any).eq('id', realProductId);
    } catch (err) {
      console.error('Stock decrement failed for', item.id, err);
    }
  }
}
