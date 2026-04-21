import { Link } from "react-router-dom";
import { ChevronRight, Star, Heart, ShoppingCart, Zap } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { isProductOutOfStock } from "@/lib/stock-display";

type RowProduct = {
  id: string;
  title: string;
  price: number;
  discount?: number;
  rating?: number;
  reviews?: number;
  image?: string;
  emoji?: string;
  vendor_name?: string;
  stock?: number | null;
  manage_stock?: boolean | null;
  stock_status?: string | null;
};

interface CategoryProductRowProps {
  title: string;
  products: RowProduct[];
  isLoading?: boolean;
  viewAllHref?: string;
  emptyHint?: string;
  wishlist: string[];
  onToggleWishlist: (id: string, e: React.MouseEvent) => void;
  onQuickAdd: (p: any) => void;
  onBuyNow: (p: any, e: React.MouseEvent) => void;
}

export function CategoryProductRow({
  title,
  products,
  isLoading,
  viewAllHref,
  emptyHint,
  wishlist,
  onToggleWishlist,
  onQuickAdd,
  onBuyNow,
}: CategoryProductRowProps) {
  if (!isLoading && products.length === 0) {
    if (!emptyHint) return null;
    return null;
  }

  return (
    <section className="mb-6">
      <div className="flex items-center justify-between mb-3 px-1">
        <h2 className="text-base md:text-lg font-bold">{title}</h2>
        {viewAllHref && (
          <Link to={viewAllHref} className="text-xs text-primary flex items-center gap-0.5 font-medium">
            View All <ChevronRight className="h-3 w-3" />
          </Link>
        )}
      </div>

      {isLoading ? (
        <div className="flex gap-3 overflow-x-auto scrollbar-hide pb-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-56 w-40 shrink-0 rounded-xl" />
          ))}
        </div>
      ) : (
        <div className="flex gap-3 overflow-x-auto scrollbar-hide pb-2 -mx-1 px-1 snap-x snap-mandatory">
          {products.map((p) => {
            const discountPct = p.discount ? Math.round((p.discount / p.price) * 100) : 0;
            const isWished = wishlist.includes(p.id);
            const isOutOfStock = isProductOutOfStock(p);
            return (
              <Card
                key={p.id}
                className="overflow-hidden hover:shadow-md transition-shadow flex flex-col w-44 shrink-0 snap-start"
              >
                <Link to={`/app/product/${p.id}`} className="flex-1 flex flex-col">
                  <div className="bg-secondary/30 flex items-center justify-center relative overflow-hidden h-32">
                    {discountPct > 0 && !isOutOfStock && (
                      <span className="absolute top-2 left-2 z-10 bg-primary/90 text-primary-foreground text-[9px] px-2 py-0.5 rounded-sm font-medium">
                        {discountPct}% Off
                      </span>
                    )}
                    {isOutOfStock && (
                      <span className="absolute top-2 left-2 z-10 bg-destructive/90 text-destructive-foreground text-[9px] px-2 py-0.5 rounded-sm font-medium">
                        Out of Stock
                      </span>
                    )}
                    {p.image ? (
                      <img
                        src={p.image}
                        alt={p.title}
                        className={`w-full h-full object-cover ${isOutOfStock ? "opacity-50" : ""}`}
                        loading="lazy"
                      />
                    ) : (
                      <span className="text-4xl">{p.emoji}</span>
                    )}
                    <button
                      className="absolute top-2 right-2 h-7 w-7 rounded-full bg-card/80 flex items-center justify-center z-10"
                      onClick={(e) => onToggleWishlist(p.id, e)}
                    >
                      <Heart
                        className={`h-3.5 w-3.5 ${
                          isWished ? "fill-destructive text-destructive" : "text-muted-foreground"
                        }`}
                      />
                    </button>
                  </div>
                  <div className="p-2.5 flex-1">
                    <p className="text-[10px] text-muted-foreground truncate">{p.vendor_name}</p>
                    <h3 className="text-sm font-medium mt-0.5 line-clamp-2 leading-snug min-h-[2.4em]">
                      {p.title}
                    </h3>
                    <div className="flex items-center gap-1 mt-1">
                      <Star className="h-3 w-3 fill-warning text-warning" />
                      <span className="text-xs font-medium">{p.rating ?? 0}</span>
                      <span className="text-[10px] text-muted-foreground">({p.reviews ?? 0})</span>
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-sm font-bold">₹{p.price.toLocaleString()}</span>
                      {discountPct > 0 && (
                        <span className="text-xs text-muted-foreground line-through">
                          ₹{(p.price + (p.discount || 0)).toLocaleString()}
                        </span>
                      )}
                    </div>
                  </div>
                </Link>
                <div className="px-2.5 pb-2.5 flex gap-1.5 mt-auto">
                  <Button
                    size="sm"
                    variant="outline"
                    className="flex-1 h-7 text-xs"
                    onClick={() => onQuickAdd(p)}
                    disabled={isOutOfStock}
                  >
                    <ShoppingCart className="h-3 w-3 mr-1" /> {isOutOfStock ? "N/A" : "Cart"}
                  </Button>
                  <Button
                    size="sm"
                    className="h-7 text-xs px-2"
                    onClick={(e) => onBuyNow(p, e as any)}
                    disabled={isOutOfStock}
                  >
                    <Zap className="h-3 w-3 mr-1" /> Buy
                  </Button>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </section>
  );
}
