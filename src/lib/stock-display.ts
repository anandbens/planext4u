// Shared helper to determine UI "out of stock" state for a product card.
//
// Untracked products (manage_stock === false) are considered in stock unless
// stock_status is explicitly 'out_of_stock'. This matches the cart/server logic
// in src/lib/api.ts (addToCart) and src/lib/stock-check.ts. Without this,
// vendors who don't track inventory end up with stock=0 in the DB and every
// "Add to Cart" / "Buy" button gets disabled silently.
export function isProductOutOfStock(p: {
  stock?: number | null;
  manage_stock?: boolean | null;
  stock_status?: string | null;
} | null | undefined): boolean {
  if (!p) return false;
  // Untracked: only block when explicitly marked out_of_stock.
  if (p.manage_stock === false) {
    return p.stock_status === 'out_of_stock';
  }
  // Tracked (or unknown): rely on numeric stock when present.
  if (p.stock === undefined || p.stock === null) return false;
  return p.stock <= 0;
}
