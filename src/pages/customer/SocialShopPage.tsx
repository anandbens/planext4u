import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, ShoppingBag, X, Star, Heart, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import SocialLayout from "@/components/social/SocialLayout";
import { useCurrency } from "@/lib/country-context";
import { supabase } from "@/integrations/supabase/client";
import { SmartImage } from "@/components/SmartImage";

interface ShopProduct {
  id: string;
  title: string;
  price: number;
  image: string | null;
  rating: number | null;
  reviews: number | null;
  category: string | null;
}

/**
 * Socio Shop surface. Previously rendered a static MOCK_PRODUCTS / MOCK_COLLECTIONS
 * array plus a synthetic "tagged posts" grid built from the same mocks. We now
 * render only real products from the marketplace; demo collections and the
 * derived tagged-posts grid have been removed entirely.
 */
export default function SocialShopPage() {
  const navigate = useNavigate();
  const { format: fmt } = useCurrency();
  const formatPrice = (n: number) => fmt(n, { decimals: 0 });

  const [activeTab, setActiveTab] = useState<"shop" | "collections">("shop");
  const [products, setProducts] = useState<ShopProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedProduct, setSelectedProduct] = useState<ShopProduct | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { data } = await supabase
          .from("products")
          .select("id, title, price, image, rating, reviews, category_name, status")
          .eq("status", "active")
          .order("rating", { ascending: false, nullsFirst: false })
          .limit(40);
        if (cancelled) return;
        const rows: ShopProduct[] = (data || []).map((p: any) => ({
          id: p.id,
          title: p.title,
          price: Number(p.price ?? 0),
          image: p.image ?? null,
          rating: p.rating ?? null,
          reviews: p.reviews ?? null,
          category: p.category_name ?? null,
        }));
        setProducts(rows);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const content = (
    <div className="pb-28 md:pb-8">
      <header className="sticky top-0 z-40 bg-card border-b border-border/30">
        <div className="flex items-center gap-3 px-4 py-3">
          <button onClick={() => navigate(-1)} aria-label="Back"><ArrowLeft className="h-5 w-5" /></button>
          <h1 className="text-lg font-bold flex-1">Shop</h1>
          <ShoppingBag className="h-5 w-5 text-muted-foreground" />
        </div>
        <div className="flex border-b border-border/20">
          <button
            onClick={() => setActiveTab("shop")}
            className={`flex-1 py-2.5 text-sm font-semibold text-center border-b-2 transition-colors ${activeTab === "shop" ? "border-foreground" : "border-transparent text-muted-foreground"}`}
          >Products</button>
          <button
            onClick={() => setActiveTab("collections")}
            className={`flex-1 py-2.5 text-sm font-semibold text-center border-b-2 transition-colors ${activeTab === "collections" ? "border-foreground" : "border-transparent text-muted-foreground"}`}
          >Collections</button>
        </div>
      </header>

      {activeTab === "shop" && (
        <>
          {loading ? (
            <div className="grid grid-cols-2 gap-2 p-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="bg-card rounded-xl border border-border/30 overflow-hidden">
                  <div className="aspect-square bg-muted animate-pulse" />
                  <div className="p-3 space-y-2">
                    <div className="h-3 bg-muted rounded animate-pulse" />
                    <div className="h-3 w-1/2 bg-muted rounded animate-pulse" />
                  </div>
                </div>
              ))}
            </div>
          ) : products.length === 0 ? (
            <div className="py-20 px-6 text-center">
              <ShoppingBag className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
              <p className="text-sm font-semibold">No products to shop yet</p>
              <p className="text-xs text-muted-foreground mt-1">Check back soon — new arrivals are added daily.</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-2 p-3">
              {products.map((product) => (
                <button
                  key={product.id}
                  className="bg-card rounded-xl border border-border/30 overflow-hidden text-left"
                  onClick={() => setSelectedProduct(product)}
                >
                  <div className="aspect-square bg-muted">
                    {product.image ? (
                      <SmartImage src={product.image} alt={product.title} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <ShoppingBag className="h-8 w-8 text-muted-foreground" />
                      </div>
                    )}
                  </div>
                  <div className="p-3">
                    <p className="text-xs font-semibold line-clamp-2">{product.title}</p>
                    <p className="text-sm font-bold text-primary mt-1">{formatPrice(product.price)}</p>
                    {product.rating != null && (
                      <div className="flex items-center gap-1 mt-1">
                        <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                        <span className="text-[10px] text-muted-foreground">
                          {Number(product.rating).toFixed(1)}{product.reviews ? ` (${product.reviews})` : ""}
                        </span>
                      </div>
                    )}
                  </div>
                </button>
              ))}
            </div>
          )}
        </>
      )}

      {activeTab === "collections" && (
        <div className="py-20 px-6 text-center">
          <ShoppingBag className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
          <p className="text-sm font-semibold">No collections yet</p>
          <p className="text-xs text-muted-foreground mt-1">
            Curated collections will appear here as creators tag products.
          </p>
        </div>
      )}

      {selectedProduct && (
        <div
          className="fixed inset-0 z-[100] bg-black/50 flex items-end md:items-center justify-center"
          onClick={() => setSelectedProduct(null)}
        >
          <div
            className="bg-card rounded-t-2xl md:rounded-2xl w-full max-w-md p-4 safe-area-bottom"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start gap-4">
              <div className="h-20 w-20 rounded-xl overflow-hidden bg-muted shrink-0">
                {selectedProduct.image ? (
                  <SmartImage src={selectedProduct.image} alt={selectedProduct.title} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <ShoppingBag className="h-6 w-6 text-muted-foreground" />
                  </div>
                )}
              </div>
              <div className="flex-1">
                <p className="text-sm font-semibold">{selectedProduct.title}</p>
                <p className="text-lg font-bold text-primary mt-1">{formatPrice(selectedProduct.price)}</p>
                {selectedProduct.rating != null && (
                  <div className="flex items-center gap-1 mt-1">
                    <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                    <span className="text-xs">{Number(selectedProduct.rating).toFixed(1)}</span>
                    {selectedProduct.reviews ? (
                      <span className="text-xs text-muted-foreground">({selectedProduct.reviews} reviews)</span>
                    ) : null}
                  </div>
                )}
              </div>
              <button onClick={() => setSelectedProduct(null)} aria-label="Close">
                <X className="h-5 w-5 text-muted-foreground" />
              </button>
            </div>
            <div className="flex gap-2 mt-4">
              <Button className="flex-1 h-10" onClick={() => navigate(`/app/product/${selectedProduct.id}`)}>
                <ExternalLink className="h-4 w-4 mr-1" /> View Product
              </Button>
              <Button
                variant="secondary"
                className="flex-1 h-10"
                onClick={() => { toast.success("Added to cart"); setSelectedProduct(null); }}
              >
                <ShoppingBag className="h-4 w-4 mr-1" /> Add to Cart
              </Button>
            </div>
            <Button
              variant="ghost"
              className="w-full mt-2 h-9 text-xs"
              onClick={() => { toast.success("Saved to wishlist"); setSelectedProduct(null); }}
            >
              <Heart className="h-4 w-4 mr-1" /> Save to Wishlist
            </Button>
          </div>
        </div>
      )}
    </div>
  );

  return <SocialLayout hideRightSidebar>{content}</SocialLayout>;
}
