import { useState } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Star, Heart, ShoppingCart, Minus, Plus, Truck, Shield, RotateCcw, ChevronLeft, Search, Clock } from "lucide-react";
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

const COLORS = [
  { name: "Red", color: "bg-red-500" },
  { name: "Blue", color: "bg-blue-600" },
  { name: "Green", color: "bg-green-500" },
];

const SIZES = ["128 GB", "256 GB", "512 GB", "1 TB"];

export default function CustomerProductPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [qty, setQty] = useState(1);
  const [wishlisted, setWishlisted] = useState(false);
  const [selectedColor, setSelectedColor] = useState(0);
  const [selectedSize, setSelectedSize] = useState(0);
  const [imgIdx, setImgIdx] = useState(0);

  const { data: product, isLoading } = useQuery({
    queryKey: ["product", id],
    queryFn: () => api.getProductById(id!),
    enabled: !!id,
  });

  const addToCart = async () => {
    if (!product) return;
    await api.addToCart(product, qty);
    toast.success(`${product.title} (×${qty}) added to cart`);
  };

  if (isLoading) return <CustomerLayout><div className="p-8"><Skeleton className="h-96 rounded-2xl" /></div></CustomerLayout>;
  if (!product) return <CustomerLayout><div className="p-8 text-center">Product not found</div></CustomerLayout>;

  const discountPct = product.discount ? Math.round((product.discount / product.price) * 100) : 0;
  const originalPrice = product.price + product.discount;

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

      <div className="max-w-5xl mx-auto px-4 py-4 pb-24 md:pb-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Product Image */}
          <div className="relative">
            <div className="bg-secondary/20 rounded-2xl h-64 md:h-96 flex items-center justify-center text-8xl relative">
              {product.emoji}
              <button onClick={() => { setWishlisted(!wishlisted); toast.success(wishlisted ? "Removed from wishlist" : "Added to wishlist"); }}
                className="absolute top-3 right-3 h-8 w-8 rounded-full bg-card/80 flex items-center justify-center">
                <Heart className={`h-4 w-4 ${wishlisted ? "fill-destructive text-destructive" : "text-muted-foreground"}`} />
              </button>
            </div>
            {/* Image Dots */}
            <div className="flex gap-1.5 justify-center mt-3">
              {[0,1,2].map(i => (
                <button key={i} onClick={() => setImgIdx(i)}
                  className={`h-2 rounded-full transition-all ${i === imgIdx ? 'w-5 bg-foreground' : 'w-2 bg-muted-foreground/30'}`} />
              ))}
            </div>
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
              <p className="text-sm text-success font-semibold mt-2">Extra ₹{product.discount.toLocaleString()} off</p>
            )}

            <div className="flex items-baseline gap-3 mt-2">
              <span className="text-2xl md:text-3xl font-bold">₹{product.price.toLocaleString()}</span>
              {discountPct > 0 && <>
                <span className="text-base text-muted-foreground line-through">₹{originalPrice.toLocaleString()}</span>
                <Badge className="bg-primary/10 text-primary border-0 text-xs">{discountPct}% OFF</Badge>
              </>}
            </div>

            <div className="flex items-center gap-1.5 mt-2 text-xs text-primary">
              <Clock className="h-3.5 w-3.5" />
              <span className="font-medium">Secure delivery in 20 Minutes</span>
            </div>

            {/* Color Selection */}
            <div className="mt-5">
              <p className="text-sm font-semibold mb-2">Colour</p>
              <div className="flex gap-2">
                {COLORS.map((c, i) => (
                  <button key={c.name} onClick={() => setSelectedColor(i)}
                    className={`h-9 w-9 rounded-full ${c.color} ${i === selectedColor ? 'ring-2 ring-primary ring-offset-2' : ''}`} />
                ))}
              </div>
            </div>

            {/* Size/Storage Selection */}
            <div className="mt-4">
              <p className="text-sm font-semibold mb-2">Storage</p>
              <div className="flex gap-2 flex-wrap">
                {SIZES.map((s, i) => (
                  <button key={s} onClick={() => setSelectedSize(i)}
                    className={`px-3 py-1.5 rounded-lg border text-xs font-medium transition-colors ${i === selectedSize ? 'border-primary bg-primary/5 text-primary' : 'border-border text-muted-foreground hover:border-primary/30'}`}>
                    {s}
                  </button>
                ))}
              </div>
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

      {/* Sticky Bottom Bar - Like Image 10 */}
      <div className="fixed bottom-0 left-0 right-0 z-40 bg-card border-t border-border/50 px-4 py-3 md:hidden safe-area-bottom">
        <div className="flex items-center justify-between mb-2">
          <div>
            <span className="text-[10px] text-muted-foreground">1 Unit</span>
            <div className="flex items-baseline gap-2">
              <span className="text-lg font-bold">₹{product.price.toLocaleString()}</span>
              {discountPct > 0 && <span className="text-xs text-muted-foreground line-through">MRP ₹{originalPrice.toLocaleString()}</span>}
              {discountPct > 0 && <Badge className="bg-primary/10 text-primary border-0 text-[9px]">{discountPct}% OFF</Badge>}
            </div>
            <p className="text-[9px] text-muted-foreground">Inclusive of all taxes</p>
          </div>
          <Button className="h-11 px-6 rounded-xl gap-2" onClick={addToCart}>
            <ShoppingCart className="h-4 w-4" /> Add to cart
          </Button>
        </div>
      </div>
    </CustomerLayout>
  );
}
