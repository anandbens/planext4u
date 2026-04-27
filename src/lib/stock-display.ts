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
  // Explicit status flag always wins.
  if (p.stock_status === 'out_of_stock') return true;
  // Whenever a numeric stock value is present, treat 0 (or less) as out of stock,
  // regardless of whether the vendor manages inventory. This ensures that any
  // product whose stock has been depleted is clearly blocked from purchase.
  if (typeof p.stock === 'number') return p.stock <= 0;
  // Untracked product with no numeric stock: assume in stock.
  return false;
}
