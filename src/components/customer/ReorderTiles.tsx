import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { RotateCcw, ShoppingCart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { api, type CartItem } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { useCurrency } from "@/lib/country-context";
import { toast } from "sonner";

/**
 * Reorder tiles: shows the customer's most-recently-purchased products in a
 * horizontally scrollable strip with a one-tap "Reorder" CTA. Quietly hides
 * itself for guests or customers without past orders so it never adds noise.
 *
 * Data source: api.getCustomerOrders → flattened items from the most recent
 * orders, deduplicated by product id, capped at 10. We only render items
 * whose source order is still attached to the active category context if a
 * `categoryName` is provided (lets the parent page scope reorders to the
 * current shop section without an extra DB roundtrip).
 */
interface ReorderItem {
  id: string;
  title: string;
  image?: string | null;
  price: number;
  vendor_id?: string;
  vendor_name?: string;
  category?: string;
  emoji?: string;
}

interface ReorderTilesProps {
  /** When set, only show items whose category matches this name. */
  categoryName?: string;
  /** Optional list of subcategory names whose items should also be allowed. */
  includeCategoryNames?: string[];
  /** Override the section heading. */
  title?: string;
}

export function ReorderTiles({ categoryName, includeCategoryNames, title = "Buy it again" }: ReorderTilesProps) {
  const { customerUser } = useAuth();
  const { format: fmt } = useCurrency();
  const [items, setItems] = useState<ReorderItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    if (!customerUser?.customer_id) {
      setItems([]);
      setLoading(false);
      return;
    }
    (async () => {
      try {
        const orders = await api.getCustomerOrders(customerUser.customer_id);
        if (cancelled) return;
        const seen = new Set<string>();
        const allowed = new Set<string>();
        if (categoryName) allowed.add(categoryName.toLowerCase());
        for (const c of includeCategoryNames || []) allowed.add(String(c).toLowerCase());
        const collected: ReorderItem[] = [];
        for (const order of orders) {
          const orderItems: any[] = Array.isArray((order as any).items) ? (order as any).items : [];
          for (const it of orderItems) {
            const id = String(it.id || it.product_id || "");
            if (!id || seen.has(id)) continue;
            const cat = String(it.category || "").toLowerCase();
            if (allowed.size > 0 && cat && !allowed.has(cat)) continue;
            seen.add(id);
            collected.push({
              id,
              title: String(it.title || "Product"),
              image: it.image ?? null,
              price: Number(it.price ?? 0),
              vendor_id: it.vendor_id,
              vendor_name: it.vendor_name,
              category: it.category,
              emoji: it.emoji,
            });
            if (collected.length >= 10) break;
          }
          if (collected.length >= 10) break;
        }
        if (!cancelled) setItems(collected);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [customerUser?.customer_id, categoryName, JSON.stringify(includeCategoryNames || [])]);

  const handleReorder = async (p: ReorderItem) => {
    const cartItem: CartItem = {
      id: p.id,
      title: p.title,
      price: p.price,
      qty: 1,
      image: p.image || undefined,
      emoji: p.emoji,
      vendor_id: p.vendor_id,
      vendor_name: p.vendor_name,
      category: p.category,
    } as any;
    const result = await api.addToCart(cartItem as any, 1);
    if (result.blocked) {
      toast.error(result.message, { duration: 5000 });
      return;
    }
    toast.success(`${p.title} added to cart`);
  };

  if (!customerUser) return null;
  if (!loading && items.length === 0) return null;

  return (
    <section className="mb-6">
      <div className="flex items-center gap-2 mb-3 px-1">
        <RotateCcw className="h-4 w-4 text-primary" />
        <h2 className="text-base md:text-lg font-bold">{title}</h2>
      </div>
      {loading ? (
        <div className="flex gap-3 overflow-x-auto scrollbar-hide pb-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-44 w-36 shrink-0 rounded-xl" />
          ))}
        </div>
      ) : (
        <div className="flex gap-3 overflow-x-auto scrollbar-hide pb-2 -mx-1 px-1 snap-x">
          {items.map((p) => (
            <div
              key={p.id}
              className="w-36 shrink-0 snap-start bg-card border border-border/40 rounded-xl overflow-hidden flex flex-col"
            >
              <Link to={`/app/product/${p.id}`} className="flex-1 flex flex-col">
                <div className="aspect-square bg-secondary/30 flex items-center justify-center overflow-hidden">
                  {p.image ? (
                    <img src={p.image} alt={p.title} className="w-full h-full object-cover" loading="lazy" />
                  ) : (
                    <span className="text-3xl">{p.emoji || "📦"}</span>
                  )}
                </div>
                <div className="p-2">
                  <p className="text-[10px] text-muted-foreground truncate">{p.vendor_name}</p>
                  <h3 className="text-xs font-medium line-clamp-2 leading-snug min-h-[2.4em]">{p.title}</h3>
                  <p className="text-sm font-bold mt-1">{fmt(p.price, { decimals: 0 })}</p>
                </div>
              </Link>
              <Button
                size="sm"
                variant="outline"
                className="rounded-none border-x-0 border-b-0 h-8 text-xs gap-1"
                onClick={() => handleReorder(p)}
              >
                <ShoppingCart className="h-3 w-3" /> Reorder
              </Button>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
