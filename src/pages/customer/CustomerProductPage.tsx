import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Star, Heart, ShoppingCart, Minus, Plus, Truck, Shield, RotateCcw } from "lucide-react";
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

export default function CustomerProductPage() {
  const { id } = useParams();
  const [qty, setQty] = useState(1);
  const [wishlisted, setWishlisted] = useState(false);

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
      <div className="max-w-5xl mx-auto px-4 py-6 pb-20 md:pb-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="bg-secondary/30 rounded-2xl h-72 md:h-96 flex items-center justify-center text-8xl">{product.emoji}</div>
          <div>
            <p className="text-sm text-primary font-medium">{product.vendor_name}</p>
            <h1 className="text-2xl font-bold mt-1">{product.title}</h1>
            <div className="flex items-center gap-2 mt-2">
              <div className="flex items-center gap-1 bg-success/10 text-success px-2 py-0.5 rounded-full">
                <Star className="h-3.5 w-3.5 fill-current" /> <span className="text-sm font-semibold">{product.rating}</span>
              </div>
              <span className="text-sm text-muted-foreground">{product.reviews} reviews</span>
            </div>
            <div className="flex items-baseline gap-3 mt-4">
              <span className="text-3xl font-bold">₹{product.price.toLocaleString()}</span>
              {discountPct > 0 && <>
                <span className="text-lg text-muted-foreground line-through">₹{originalPrice.toLocaleString()}</span>
                <Badge className="bg-destructive/10 text-destructive border-0">{discountPct}% OFF</Badge>
              </>}
            </div>
            <p className="text-xs text-muted-foreground mt-2">Use up to {product.max_points_redeemable} loyalty points on this purchase</p>
            <div className="flex items-center gap-3 mt-6">
              <span className="text-sm font-medium">Qty:</span>
              <div className="flex items-center border border-border rounded-lg">
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setQty(Math.max(1, qty - 1))}><Minus className="h-4 w-4" /></Button>
                <span className="w-10 text-center text-sm font-medium">{qty}</span>
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setQty(qty + 1)}><Plus className="h-4 w-4" /></Button>
              </div>
              <Button variant="ghost" size="icon" onClick={() => { setWishlisted(!wishlisted); toast.success(wishlisted ? "Removed from wishlist" : "Added to wishlist"); }}>
                <Heart className={`h-5 w-5 ${wishlisted ? "fill-destructive text-destructive" : ""}`} />
              </Button>
            </div>
            <div className="flex gap-3 mt-6">
              <Button className="flex-1" onClick={addToCart}><ShoppingCart className="h-4 w-4 mr-2" /> Add to Cart</Button>
              <Button variant="secondary" className="flex-1">Buy Now</Button>
            </div>
            <div className="grid grid-cols-3 gap-3 mt-6">
              {[{ icon: Truck, text: "Free Delivery" }, { icon: Shield, text: "Genuine Product" }, { icon: RotateCcw, text: "Easy Returns" }].map((b) => (
                <div key={b.text} className="flex flex-col items-center text-center gap-1 p-2 bg-secondary/30 rounded-lg">
                  <b.icon className="h-4 w-4 text-muted-foreground" /><span className="text-[10px] text-muted-foreground">{b.text}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
        <Tabs defaultValue="description" className="mt-8">
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
    </CustomerLayout>
  );
}
