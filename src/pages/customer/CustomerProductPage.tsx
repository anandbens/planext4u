import { useState, useEffect } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Star, Heart, ShoppingCart, Minus, Plus, Truck, Shield, RotateCcw, ChevronLeft, Search, Clock, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { CustomerLayout } from "@/components/customer/CustomerLayout";
import { toast } from "sonner";
import { api } from "@/lib/api";

const reviews = [
  { user: "Rahul S.", rating: 5, comment: "Excellent quality, worth every rupee!", date: "2 days ago" },
  { user: "Priya P.", rating: 4, comment: "Good product, fast delivery", date: "5 days ago" },
  { user: "Amit K.", rating: 5, comment: "Best in this price range. Highly recommended!", date: "1 week ago" },
];

// Variant options per attribute type
const VARIANT_OPTIONS: Record<string, string[]> = {
  "Size": ["S", "M", "L", "XL", "XXL"],
  "Color": ["Black", "White", "Red", "Blue", "Green"],
  "Weight": ["250g", "500g", "1kg", "2kg"],
  "Material": ["Cotton", "Polyester", "Silk", "Linen"],
};

function getProductVariants(title: string): { label: string; options: string[]; selected: string }[] {
  const lower = title.toLowerCase();
  const variants: { label: string; options: string[]; selected: string }[] = [];
  if (lower.includes("shirt") || lower.includes("fashion") || lower.includes("cloth") || lower.includes("wear") || lower.includes("t-shirt") || lower.includes("jacket")) {
    variants.push({ label: "Size", options: VARIANT_OPTIONS["Size"], selected: "M" });
    variants.push({ label: "Color", options: VARIANT_OPTIONS["Color"], selected: "Black" });
  } else if (lower.includes("headphone") || lower.includes("speaker") || lower.includes("keyboard") || lower.includes("mouse") || lower.includes("electronics") || lower.includes("phone")) {
    variants.push({ label: "Color", options: ["Black", "White", "Silver", "Blue"], selected: "Black" });
  } else if (lower.includes("yoga") || lower.includes("mat") || lower.includes("fitness")) {
    variants.push({ label: "Color", options: ["Purple", "Blue", "Green", "Pink"], selected: "Purple" });
    variants.push({ label: "Size", options: ["4mm", "6mm", "8mm"], selected: "6mm" });
  } else {
    // Default: add a color variant
    variants.push({ label: "Color", options: ["Black", "White", "Blue"], selected: "Black" });
  }
  return variants;
}

export default function CustomerProductPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [qty, setQty] = useState(1);
  const [wishlisted, setWishlisted] = useState(false);
  const [imgIdx, setImgIdx] = useState(0);
  const [selectedVariants, setSelectedVariants] = useState<Record<string, string>>({});

  const { data: product, isLoading } = useQuery({
    queryKey: ["product", id],
    queryFn: () => api.getProductById(id!),
    enabled: !!id,
  });

  // Initialize variants when product loads
  useEffect(() => {
    if (product) {
      const vars = getProductVariants(product.title);
      const initial: Record<string, string> = {};
      vars.forEach(v => { initial[v.label] = v.selected; });
      setSelectedVariants(initial);
    }
  }, [product]);

  useEffect(() => {
    if (!id) return;
    try {
      const wl = JSON.parse(localStorage.getItem('app_db_wishlist') || '[]') as string[];
      setWishlisted(wl.includes(id));
    } catch {}
  }, [id]);

  const toggleWishlist = () => {
    if (!id) return;
    try {
      let wl = JSON.parse(localStorage.getItem('app_db_wishlist') || '[]') as string[];
      if (wishlisted) {
        wl = wl.filter(w => w !== id);
        toast.success("Removed from wishlist");
      } else {
        wl.push(id);
        toast.success("Added to wishlist ❤️");
      }
      localStorage.setItem('app_db_wishlist', JSON.stringify(wl));
      setWishlisted(!wishlisted);
    } catch {}
  };

  const addToCart = async () => {
    if (!product) return;
    await api.addToCart(product, qty);
    toast.success(`${product.title} (×${qty}) added to cart`);
  };

  const buyNow = async () => {
    if (!product) return;
    await api.addToCart(product, qty);
    navigate('/app/cart');
  };

  if (isLoading) return <CustomerLayout><div className="p-8"><Skeleton className="h-96 rounded-2xl" /></div></CustomerLayout>;
  if (!product) return <CustomerLayout><div className="p-8 text-center">Product not found</div></CustomerLayout>;

  const discountType = (product as any).discount_type || "fixed";
  const discountPct = discountType === "percentage" ? product.discount : (product.price > 0 ? Math.round((product.discount / product.price) * 100) : 0);
  const discountAmount = discountType === "percentage" ? Math.round(product.price * product.discount / 100) : product.discount;
  const originalPrice = product.price + discountAmount;
  
  // Use real product attributes if available, fallback to title-based
  const realAttrs = (product as any).product_attributes || [];
  const variants = realAttrs.length > 0 
    ? realAttrs.map((a: any) => ({ label: a.attribute_name, options: a.values || [], selected: (a.values || [])[0] || "" }))
    : getProductVariants(product.title);

  return (
    <CustomerLayout>
      {/* Mobile Header */}
      <div className="sticky top-0 z-30 bg-card/95 backdrop-blur-md border-b border-border/50 px-4 py-3 flex items-center justify-between md:hidden">
        <button onClick={() => navigate(-1)} className="h-8 w-8 rounded-full bg-secondary flex items-center justify-center">
          <ChevronLeft className="h-4 w-4" />
        </button>
        <h1 className="text-sm font-semibold truncate max-w-[200px]">{product.title}</h1>
        <Search className="h-4 w-4 text-muted-foreground" />
      </div>

      <div className="max-w-5xl mx-auto px-4 py-4 pb-36 md:pb-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Product Image */}
          <div className="relative">
            {(() => {
              const allImages = [product.image, ...((product as any).images || [])].filter(Boolean);
              if (allImages.length <= 1) {
                return (
                  <div className="bg-secondary/20 rounded-2xl h-64 md:h-96 flex items-center justify-center relative overflow-hidden">
                    {product.image ? (
                      <img src={product.image} alt={product.title} className="w-full h-full object-cover rounded-2xl" />
                    ) : (
                      <span className="text-8xl">{product.emoji}</span>
                    )}
                    <button onClick={toggleWishlist}
                      className="absolute top-3 right-3 h-8 w-8 rounded-full bg-card/80 flex items-center justify-center">
                      <Heart className={`h-4 w-4 ${wishlisted ? "fill-destructive text-destructive" : "text-muted-foreground"}`} />
                    </button>
                  </div>
                );
              }
              return (
                <div className="relative">
                  <div className="bg-secondary/20 rounded-2xl h-64 md:h-96 flex items-center justify-center relative overflow-hidden">
                    <img src={allImages[imgIdx] || ''} alt={product.title} className="w-full h-full object-cover rounded-2xl" />
                    <button onClick={toggleWishlist}
                      className="absolute top-3 right-3 h-8 w-8 rounded-full bg-card/80 flex items-center justify-center z-10">
                      <Heart className={`h-4 w-4 ${wishlisted ? "fill-destructive text-destructive" : "text-muted-foreground"}`} />
                    </button>
                    {imgIdx > 0 && (
                      <button onClick={() => setImgIdx(i => i - 1)} className="absolute left-2 top-1/2 -translate-y-1/2 h-8 w-8 rounded-full bg-card/80 flex items-center justify-center">
                        <ChevronLeft className="h-4 w-4" />
                      </button>
                    )}
                    {imgIdx < allImages.length - 1 && (
                      <button onClick={() => setImgIdx(i => i + 1)} className="absolute right-2 top-1/2 -translate-y-1/2 h-8 w-8 rounded-full bg-card/80 flex items-center justify-center">
                        <ChevronLeft className="h-4 w-4 rotate-180" />
                      </button>
                    )}
                    <div className="absolute top-3 left-3 bg-card/80 text-xs font-medium px-2 py-0.5 rounded-full">{imgIdx + 1}/{allImages.length}</div>
                  </div>
                  <div className="flex gap-1.5 justify-center mt-3">
                    {allImages.map((_: string, i: number) => (
                      <button key={i} onClick={() => setImgIdx(i)}
                        className={`h-2 rounded-full transition-all ${i === imgIdx ? 'w-5 bg-foreground' : 'w-2 bg-muted-foreground/30'}`} />
                    ))}
                  </div>
                </div>
              );
            })()}
          </div>

          {/* Product Info */}
          <div>
            <h1 className="text-xl md:text-2xl font-bold">{product.title}</h1>
            <div className="flex items-center gap-2 mt-2">
              <div className="flex items-center gap-0.5">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star key={i} className={`h-3.5 w-3.5 ${i < Math.round(product.rating || 0) ? 'fill-warning text-warning' : 'text-muted-foreground/30'}`} />
                ))}
              </div>
              <span className="text-xs font-medium">{product.rating}</span>
              <span className="text-xs text-muted-foreground">• {product.reviews} reviews</span>
              <span className="text-xs text-muted-foreground">• {product.sales} sold</span>
            </div>

            {discountPct > 0 && (
              <p className="text-sm text-success font-semibold mt-2">Extra ₹{discountAmount.toLocaleString()} off</p>
            )}

            <div className="flex items-baseline gap-3 mt-2">
              <span className="text-2xl md:text-3xl font-bold">₹{(product.price - discountAmount + (product.tax || 0)).toLocaleString()}</span>
              {discountPct > 0 && <>
                <span className="text-base text-muted-foreground line-through">MRP ₹{originalPrice.toLocaleString()}</span>
                <Badge className="bg-success/10 text-success border-0 text-xs font-bold">{discountPct}% OFF</Badge>
              </>}
            </div>

            <div className="flex items-center gap-1.5 mt-2 text-xs text-primary">
              <Clock className="h-3.5 w-3.5" />
              <span className="font-medium">Secure delivery in 20 Minutes</span>
            </div>

            {/* Variants / Attributes */}
            {variants.map((v) => (
              <div key={v.label} className="mt-4">
                <p className="text-sm font-semibold mb-2">{v.label}: <span className="font-normal text-muted-foreground">{selectedVariants[v.label] || v.selected}</span></p>
                <div className="flex flex-wrap gap-2">
                  {v.options.map(opt => (
                    <button key={opt} onClick={() => setSelectedVariants(prev => ({ ...prev, [v.label]: opt }))}
                      className={`px-3 py-1.5 rounded-lg border text-xs font-medium transition-colors
                        ${(selectedVariants[v.label] || v.selected) === opt ? 'border-primary bg-primary/10 text-primary' : 'border-border hover:border-primary/30'}`}>
                      {opt}
                    </button>
                  ))}
                </div>
              </div>
            ))}

            {/* Category info */}
            {product.category_name && (
              <div className="mt-4">
                <p className="text-sm font-semibold mb-1">Category</p>
                <Badge variant="outline">{product.category_name}</Badge>
              </div>
            )}

            {/* Quantity Selector */}
            <div className="mt-5">
              <p className="text-sm font-semibold mb-2">Quantity</p>
              <div className="flex items-center gap-2">
                <div className="flex items-center border border-border rounded-lg">
                  <button onClick={() => setQty(q => Math.max(1, q - 1))} className="h-10 w-10 flex items-center justify-center hover:bg-accent rounded-l-lg"><Minus className="h-4 w-4" /></button>
                  <span className="text-sm font-bold w-10 text-center">{qty}</span>
                  <button onClick={() => setQty(q => q + 1)} className="h-10 w-10 flex items-center justify-center hover:bg-accent rounded-r-lg"><Plus className="h-4 w-4" /></button>
                </div>
                <span className="text-xs text-muted-foreground">{product.stock ? `${product.stock} in stock` : ''}</span>
              </div>
            </div>

            {/* Desktop Action Buttons */}
            <div className="hidden md:flex gap-3 mt-5">
              <Button className="flex-1 h-12 gap-2" onClick={addToCart}>
                <ShoppingCart className="h-4 w-4" /> Add to Cart
              </Button>
              <Button variant="secondary" className="flex-1 h-12 gap-2" onClick={buyNow}>
                <Zap className="h-4 w-4" /> Buy Now
              </Button>
            </div>

            {/* Trust Badges */}
            <div className="grid grid-cols-3 gap-3 mt-5">
              {[{ icon: RotateCcw, text: "12 Hours", sub: "Replacement" }, { icon: Shield, text: "24/7", sub: "Support" }, { icon: Truck, text: "Fast", sub: "Delivery" }].map((b) => (
                <div key={b.text} className="flex flex-col items-center text-center gap-1 p-3 bg-secondary/30 rounded-xl">
                  <b.icon className="h-5 w-5 text-primary" /><span className="text-xs font-semibold">{b.text}</span>
                  <span className="text-[10px] text-muted-foreground">{b.sub}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Description + Reviews Tabs */}
        <Tabs defaultValue="description" className="mt-6">
          <TabsList><TabsTrigger value="description">Description</TabsTrigger><TabsTrigger value="reviews">Reviews ({product.reviews})</TabsTrigger></TabsList>
          <TabsContent value="description" className="mt-4"><p className="text-sm text-muted-foreground leading-relaxed">{product.description}</p></TabsContent>
          <TabsContent value="reviews" className="mt-4 space-y-3">
            {reviews.map((r, i) => (
              <Card key={i} className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-sm">{r.user}</span>
                    <div className="flex">{Array.from({ length: r.rating }).map((_, j) => <Star key={j} className="h-3 w-3 fill-warning text-warning" />)}</div>
                  </div>
                  <span className="text-xs text-muted-foreground">{r.date}</span>
                </div>
                <p className="text-sm text-muted-foreground mt-1">{r.comment}</p>
              </Card>
            ))}
          </TabsContent>
        </Tabs>
      </div>

      {/* Sticky Bottom Bar - mobile - positioned above bottom nav */}
      <div className="fixed bottom-16 left-0 right-0 z-30 bg-card border-t border-border/50 px-4 py-3 md:hidden">
        <div className="flex items-center gap-3">
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <div className="flex items-center border border-border rounded-lg">
                <button onClick={() => setQty(q => Math.max(1, q - 1))} className="h-9 w-8 flex items-center justify-center"><Minus className="h-3 w-3" /></button>
                <span className="text-sm font-bold w-6 text-center">{qty}</span>
                <button onClick={() => setQty(q => q + 1)} className="h-9 w-8 flex items-center justify-center"><Plus className="h-3 w-3" /></button>
              </div>
              <div>
                <span className="text-lg font-bold">₹{product.price.toLocaleString()}</span>
                {discountPct > 0 && <span className="text-[10px] text-muted-foreground line-through ml-1">₹{originalPrice.toLocaleString()}</span>}
              </div>
            </div>
          </div>
          <Button className="h-11 px-4 rounded-xl gap-1.5 text-sm" onClick={addToCart}>
            <ShoppingCart className="h-4 w-4" /> Cart
          </Button>
          <Button variant="secondary" className="h-11 px-4 rounded-xl gap-1.5 text-sm" onClick={buyNow}>
            <Zap className="h-4 w-4" /> Buy
          </Button>
        </div>
      </div>
    </CustomerLayout>
  );
}
