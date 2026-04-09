import { useState, useEffect, useMemo } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import ProductReviews from "@/components/customer/ProductReviews";
import { useQuery } from "@tanstack/react-query";
import { Star, Heart, ShoppingCart, Minus, Plus, Truck, Shield, RotateCcw, ChevronLeft, Search, Clock, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CustomerLayout } from "@/components/customer/CustomerLayout";
import { toast } from "sonner";
import { api, ProductVariant } from "@/lib/api";
import { supabase } from "@/integrations/supabase/client";

const reviews = [
  { user: "Rahul S.", rating: 5, comment: "Excellent quality, worth every rupee!", date: "2 days ago" },
  { user: "Priya P.", rating: 4, comment: "Good product, fast delivery", date: "5 days ago" },
  { user: "Amit K.", rating: 5, comment: "Best in this price range. Highly recommended!", date: "1 week ago" },
];

export default function CustomerProductPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [qty, setQty] = useState(1);
  const [wishlisted, setWishlisted] = useState(false);
  const [imgIdx, setImgIdx] = useState(0);
  const [selectedAttrs, setSelectedAttrs] = useState<Record<string, string>>({});

  const { data: product, isLoading } = useQuery({
    queryKey: ["product", id],
    queryFn: () => api.getProductById(id!),
    enabled: !!id,
  });

  // Fetch variants for variable products
  const { data: variants } = useQuery({
    queryKey: ["productVariants", id],
    queryFn: async () => {
      const { data } = await supabase.from("product_variants" as any).select("*").eq("product_id", id).eq("is_active", true).order("sort_order");
      return (data || []) as unknown as ProductVariant[];
    },
    enabled: !!id,
  });

  // Fetch attribute values for hex colors
  const { data: attrValues } = useQuery({
    queryKey: ["productAttributeValues"],
    queryFn: async () => {
      const { data } = await supabase.from("product_attribute_values" as any).select("*").order("sort_order");
      return (data || []) as any[];
    },
  });

  const isVariable = (product as any)?.product_type === "variable" && variants && variants.length > 0;

  // Build attribute options from variants (only show available combinations)
  const attrOptions = useMemo(() => {
    if (!isVariable || !variants) return {};
    const opts: Record<string, Set<string>> = {};
    variants.forEach(v => {
      Object.entries(v.variant_attributes || {}).forEach(([key, val]) => {
        if (!opts[key]) opts[key] = new Set();
        opts[key].add(val as string);
      });
    });
    return Object.fromEntries(Object.entries(opts).map(([k, v]) => [k, Array.from(v)]));
  }, [variants, isVariable]);

  // Fallback: use product_attributes for simple products
  const realAttrs = (product as any)?.product_attributes || [];
  const displayAttrs = useMemo(() => {
    if (isVariable) {
      return Object.entries(attrOptions).map(([label, options]) => ({ label, options }));
    }
    if (realAttrs.length > 0) {
      return realAttrs.map((a: any) => ({ label: a.attribute_name, options: a.values || [] }));
    }
    return [];
  }, [isVariable, attrOptions, realAttrs]);

  // Initialize selected attributes
  useEffect(() => {
    if (displayAttrs.length > 0) {
      const initial: Record<string, string> = {};
      displayAttrs.forEach((a: any) => { initial[a.label] = a.options[0] || ""; });
      setSelectedAttrs(initial);
    }
  }, [displayAttrs.length]);

  // Find matching variant
  const selectedVariant = useMemo(() => {
    if (!isVariable || !variants) return null;
    return variants.find(v => {
      return Object.entries(selectedAttrs).every(([key, val]) => v.variant_attributes[key] === val);
    }) || null;
  }, [isVariable, variants, selectedAttrs]);

  // Filter available options based on current selection (cascade logic)
  const getAvailableValues = (attrName: string): Set<string> => {
    if (!isVariable || !variants) return new Set(attrOptions[attrName] || []);
    const otherSelections = Object.entries(selectedAttrs).filter(([k]) => k !== attrName);
    const available = new Set<string>();
    variants.forEach(v => {
      const matches = otherSelections.every(([k, val]) => v.variant_attributes[k] === val);
      if (matches && v.variant_attributes[attrName]) {
        available.add(v.variant_attributes[attrName]);
      }
    });
    return available;
  };

  // Get hex color for a value
  const getHexColor = (value: string): string | null => {
    const av = (attrValues || []).find((v: any) => v.value === value && v.hex_color);
    return av?.hex_color || null;
  };

  const isColorAttr = (name: string) => name.toLowerCase() === "color" || name.toLowerCase() === "colour";

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
      if (wishlisted) { wl = wl.filter(w => w !== id); toast.success("Removed from wishlist"); }
      else { wl.push(id); toast.success("Added to wishlist ❤️"); }
      localStorage.setItem('app_db_wishlist', JSON.stringify(wl));
      setWishlisted(!wishlisted);
    } catch {}
  };

  const addToCart = async () => {
    if (!product) return;
    const result = await api.addToCart(product, qty);
    if (result.blocked) {
      toast.error(result.message || "This product is already added from another vendor. Please remove it before adding this.", { duration: 5000 });
      return;
    }
    toast.success(`${product.title} (×${qty}) added to cart`);
  };

  const buyNow = async () => {
    if (!product) return;
    const result = await api.addToCart(product, qty);
    if (result.blocked) {
      toast.error(result.message || "This product is already added from another vendor. Please remove it before adding this.", { duration: 5000 });
      return;
    }
    navigate('/app/cart');
  };

  if (isLoading) return <CustomerLayout><div className="p-8"><Skeleton className="h-96 rounded-2xl" /></div></CustomerLayout>;
  if (!product) return <CustomerLayout><div className="p-8 text-center">Product not found</div></CustomerLayout>;

  // Price calculation - use variant price if variable
  const basePrice = selectedVariant ? selectedVariant.price : product.price;
  const comparePrice = selectedVariant?.compare_at_price;
  const discountType = (product as any).discount_type || "fixed";
  const discountPct = comparePrice && comparePrice > basePrice
    ? Math.round(((comparePrice - basePrice) / comparePrice) * 100)
    : discountType === "percentage" ? product.discount : (product.price > 0 ? Math.round((product.discount / product.price) * 100) : 0);
  const discountAmount = comparePrice && comparePrice > basePrice
    ? comparePrice - basePrice
    : discountType === "percentage" ? Math.round(product.price * product.discount / 100) : product.discount;
  const originalPrice = comparePrice || product.price + discountAmount;
  const displayPrice = basePrice + (product.tax || 0);
  const stockInfo = selectedVariant ? `${selectedVariant.stock_quantity} in stock` : product.stock ? `${product.stock} in stock` : '';
  const outOfStock = selectedVariant ? selectedVariant.stock_quantity <= 0 : (product.stock !== undefined && product.stock <= 0);

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
              const variantImg = selectedVariant?.image_url;
              const allImages = [variantImg, product.image, ...((product as any).images || [])].filter(Boolean) as string[];
              const uniqueImages = [...new Set(allImages)];
              if (uniqueImages.length <= 1) {
                return (
                  <div className="bg-secondary/20 rounded-2xl h-64 md:h-96 flex items-center justify-center relative overflow-hidden">
                    {uniqueImages[0] ? (
                      <img src={uniqueImages[0]} alt={product.title} className="w-full h-full object-cover rounded-2xl" />
                    ) : (
                      <span className="text-8xl">{product.emoji}</span>
                    )}
                    <button onClick={toggleWishlist} className="absolute top-3 right-3 h-8 w-8 rounded-full bg-card/80 flex items-center justify-center">
                      <Heart className={`h-4 w-4 ${wishlisted ? "fill-destructive text-destructive" : "text-muted-foreground"}`} />
                    </button>
                  </div>
                );
              }
              return (
                <div className="relative">
                  <div className="bg-secondary/20 rounded-2xl h-64 md:h-96 flex items-center justify-center relative overflow-hidden">
                    <img src={uniqueImages[imgIdx] || ''} alt={product.title} className="w-full h-full object-cover rounded-2xl" />
                    <button onClick={toggleWishlist} className="absolute top-3 right-3 h-8 w-8 rounded-full bg-card/80 flex items-center justify-center z-10">
                      <Heart className={`h-4 w-4 ${wishlisted ? "fill-destructive text-destructive" : "text-muted-foreground"}`} />
                    </button>
                    {imgIdx > 0 && (
                      <button onClick={() => setImgIdx(i => i - 1)} className="absolute left-2 top-1/2 -translate-y-1/2 h-8 w-8 rounded-full bg-card/80 flex items-center justify-center">
                        <ChevronLeft className="h-4 w-4" />
                      </button>
                    )}
                    {imgIdx < uniqueImages.length - 1 && (
                      <button onClick={() => setImgIdx(i => i + 1)} className="absolute right-2 top-1/2 -translate-y-1/2 h-8 w-8 rounded-full bg-card/80 flex items-center justify-center">
                        <ChevronLeft className="h-4 w-4 rotate-180" />
                      </button>
                    )}
                    <div className="absolute top-3 left-3 bg-card/80 text-xs font-medium px-2 py-0.5 rounded-full">{imgIdx + 1}/{uniqueImages.length}</div>
                  </div>
                  <div className="flex gap-1.5 justify-center mt-3">
                    {uniqueImages.map((_: string, i: number) => (
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
              <span className="text-2xl md:text-3xl font-bold">₹{displayPrice.toLocaleString()}</span>
              {discountPct > 0 && <>
                <span className="text-base text-muted-foreground line-through">MRP ₹{originalPrice.toLocaleString()}</span>
                <Badge className="bg-success/10 text-success border-0 text-xs font-bold">{discountPct}% OFF</Badge>
              </>}
            </div>

            {outOfStock && <Badge variant="destructive" className="mt-2">Out of Stock</Badge>}

            <div className="flex items-center gap-1.5 mt-2 text-xs text-primary">
              <Clock className="h-3.5 w-3.5" />
              <span className="font-medium">Secure delivery in 20 Minutes</span>
            </div>

            {/* Attribute Selectors with Color Swatches */}
            {displayAttrs.map((attr: any) => {
              const available = isVariable ? getAvailableValues(attr.label) : new Set(attr.options);
              const isColor = isColorAttr(attr.label);

              return (
                <div key={attr.label} className="mt-4">
                  <p className="text-sm font-semibold mb-2">{attr.label}: <span className="font-normal text-muted-foreground">{selectedAttrs[attr.label]}</span></p>
                  <div className="flex flex-wrap gap-2">
                    {attr.options.map((opt: string) => {
                      const isAvail = available.has(opt);
                      const isSelected = selectedAttrs[attr.label] === opt;
                      const hex = isColor ? getHexColor(opt) : null;

                      if (isColor && hex) {
                        // Color swatch
                        return (
                          <button key={opt}
                            onClick={() => isAvail && setSelectedAttrs(prev => ({ ...prev, [attr.label]: opt }))}
                            disabled={!isAvail}
                            title={opt}
                            className={`relative h-10 w-10 rounded-full border-2 transition-all ${
                              isSelected ? 'ring-2 ring-primary ring-offset-2 border-primary' : 'border-border hover:border-primary/50'
                            } ${!isAvail ? 'opacity-30 cursor-not-allowed' : 'cursor-pointer'}`}
                            style={{ backgroundColor: hex }}>
                            {!isAvail && (
                              <span className="absolute inset-0 flex items-center justify-center">
                                <span className="block w-full h-0.5 bg-destructive rotate-45 absolute" />
                              </span>
                            )}
                          </button>
                        );
                      }

                      // Size / other attribute pills
                      return (
                        <button key={opt}
                          onClick={() => isAvail && setSelectedAttrs(prev => ({ ...prev, [attr.label]: opt }))}
                          disabled={!isAvail}
                          className={`px-4 py-2 rounded-lg border text-sm font-medium transition-all ${
                            isSelected ? 'border-primary bg-primary/10 text-primary' : 'border-border hover:border-primary/30'
                          } ${!isAvail ? 'opacity-30 cursor-not-allowed line-through' : ''}`}>
                          {opt}
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}

            {/* Category */}
            {product.category_name && (
              <div className="mt-4">
                <p className="text-sm font-semibold mb-1">Category</p>
                <Badge variant="outline">{product.category_name}</Badge>
              </div>
            )}

            {/* Quantity */}
            <div className="mt-5">
              <p className="text-sm font-semibold mb-2">Quantity</p>
              <div className="flex items-center gap-2">
                <div className="flex items-center border border-border rounded-lg">
                  <button onClick={() => setQty(q => Math.max(1, q - 1))} className="h-10 w-10 flex items-center justify-center hover:bg-accent rounded-l-lg"><Minus className="h-4 w-4" /></button>
                  <span className="text-sm font-bold w-10 text-center">{qty}</span>
                  <button onClick={() => setQty(q => q + 1)} className="h-10 w-10 flex items-center justify-center hover:bg-accent rounded-r-lg"><Plus className="h-4 w-4" /></button>
                </div>
                {stockInfo && <span className="text-xs text-muted-foreground">{stockInfo}</span>}
              </div>
            </div>

            {/* Desktop Actions */}
            <div className="hidden md:flex gap-3 mt-5">
              <Button className="flex-1 h-12 gap-2" onClick={addToCart} disabled={outOfStock}>
                <ShoppingCart className="h-4 w-4" /> Add to Cart
              </Button>
              <Button variant="secondary" className="flex-1 h-12 gap-2" onClick={buyNow} disabled={outOfStock}>
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

        {/* Tabs */}
        <Tabs defaultValue="description" className="mt-6">
          <TabsList>
            <TabsTrigger value="description">Description</TabsTrigger>
            {realAttrs.length > 0 && <TabsTrigger value="specs">Specifications</TabsTrigger>}
            <TabsTrigger value="reviews">Reviews ({product.reviews})</TabsTrigger>
          </TabsList>
          <TabsContent value="description" className="mt-4">
            {(product as any).short_description && <p className="text-sm font-medium mb-2">{(product as any).short_description}</p>}
            <p className="text-sm text-muted-foreground leading-relaxed">{(product as any).long_description || product.description}</p>
          </TabsContent>
          {realAttrs.length > 0 && (
            <TabsContent value="specs" className="mt-4">
              <div className="space-y-2">
                {realAttrs.map((attr: any, i: number) => (
                  <div key={i} className="flex border-b border-border/30 py-2 last:border-0">
                    <span className="text-sm text-muted-foreground w-1/3">{attr.attribute_name}</span>
                    <span className="text-sm font-medium">{(attr.values || []).join(", ")}</span>
                  </div>
                ))}
              </div>
            </TabsContent>
          )}
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

      {/* Sticky Bottom Bar - mobile */}
      <div className="fixed bottom-20 left-0 right-0 z-30 bg-card border-t border-border/50 px-4 py-3 md:hidden">
        <div className="flex items-center gap-3">
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <div className="flex items-center border border-border rounded-lg">
                <button onClick={() => setQty(q => Math.max(1, q - 1))} className="h-9 w-8 flex items-center justify-center"><Minus className="h-3 w-3" /></button>
                <span className="text-sm font-bold w-6 text-center">{qty}</span>
                <button onClick={() => setQty(q => q + 1)} className="h-9 w-8 flex items-center justify-center"><Plus className="h-3 w-3" /></button>
              </div>
              <div>
                <span className="text-lg font-bold">₹{displayPrice.toLocaleString()}</span>
                {discountPct > 0 && <span className="text-[10px] text-muted-foreground line-through ml-1">₹{originalPrice.toLocaleString()}</span>}
              </div>
            </div>
          </div>
          <Button className="h-11 px-4 rounded-xl gap-1.5 text-sm" onClick={addToCart} disabled={outOfStock}>
            <ShoppingCart className="h-4 w-4" /> Cart
          </Button>
          <Button variant="secondary" className="h-11 px-4 rounded-xl gap-1.5 text-sm" onClick={buyNow} disabled={outOfStock}>
            <Zap className="h-4 w-4" /> Buy
          </Button>
        </div>
      </div>
    </CustomerLayout>
  );
}
