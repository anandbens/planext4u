import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, Star, Heart, ShoppingCart, Minus, Plus, MapPin, Truck, Shield, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";

const product = {
  id: 1, title: "Wireless Headphones Pro", price: 2499, originalPrice: 3499, rating: 4.8, reviews: 245,
  vendor: "TechMart", emoji: "🎧", discount: 29, description: "Premium wireless headphones with active noise cancellation, 30-hour battery life, and crystal-clear sound quality. Features Bluetooth 5.3, multipoint connection, and a comfortable over-ear design.",
  specs: [
    { label: "Driver Size", value: "40mm" }, { label: "Battery", value: "30 hours" },
    { label: "Bluetooth", value: "5.3" }, { label: "Weight", value: "250g" },
    { label: "ANC", value: "Yes" }, { label: "Warranty", value: "1 Year" },
  ],
  maxPoints: 200,
};

const reviews = [
  { user: "Rahul S.", rating: 5, comment: "Excellent sound quality and battery life!", date: "2 days ago" },
  { user: "Priya P.", rating: 4, comment: "Good ANC, comfortable for long use", date: "5 days ago" },
  { user: "Amit K.", rating: 5, comment: "Best in this price range. Highly recommended!", date: "1 week ago" },
];

export default function CustomerProductPage() {
  const { id } = useParams();
  const [qty, setQty] = useState(1);
  const [wishlisted, setWishlisted] = useState(false);

  const addToCart = () => toast.success(`${product.title} added to cart`);

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-30 bg-card/95 backdrop-blur-sm border-b border-border/50">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center gap-3">
          <Button variant="ghost" size="icon" asChild><Link to="/app"><ArrowLeft className="h-5 w-5" /></Link></Button>
          <h1 className="font-semibold truncate">{product.title}</h1>
          <div className="ml-auto flex items-center gap-2">
            <Button variant="ghost" size="icon" onClick={() => setWishlisted(!wishlisted)}>
              <Heart className={`h-5 w-5 ${wishlisted ? "fill-destructive text-destructive" : ""}`} />
            </Button>
            <Button variant="ghost" size="icon" asChild><Link to="/app/cart"><ShoppingCart className="h-5 w-5" /></Link></Button>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Image */}
          <div className="bg-secondary/30 rounded-2xl h-72 md:h-96 flex items-center justify-center text-8xl">
            {product.emoji}
          </div>

          {/* Details */}
          <div>
            <p className="text-sm text-primary font-medium">{product.vendor}</p>
            <h1 className="text-2xl font-bold mt-1">{product.title}</h1>
            <div className="flex items-center gap-2 mt-2">
              <div className="flex items-center gap-1 bg-success/10 text-success px-2 py-0.5 rounded-full">
                <Star className="h-3.5 w-3.5 fill-current" /> <span className="text-sm font-semibold">{product.rating}</span>
              </div>
              <span className="text-sm text-muted-foreground">{product.reviews} reviews</span>
            </div>

            <div className="flex items-baseline gap-3 mt-4">
              <span className="text-3xl font-bold">₹{product.price.toLocaleString()}</span>
              <span className="text-lg text-muted-foreground line-through">₹{product.originalPrice.toLocaleString()}</span>
              <Badge className="bg-destructive/10 text-destructive border-0">{product.discount}% OFF</Badge>
            </div>

            <p className="text-xs text-muted-foreground mt-2">Use up to {product.maxPoints} loyalty points on this purchase</p>

            {/* Qty */}
            <div className="flex items-center gap-3 mt-6">
              <span className="text-sm font-medium">Qty:</span>
              <div className="flex items-center border border-border rounded-lg">
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setQty(Math.max(1, qty - 1))}><Minus className="h-4 w-4" /></Button>
                <span className="w-10 text-center text-sm font-medium">{qty}</span>
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setQty(qty + 1)}><Plus className="h-4 w-4" /></Button>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <Button className="flex-1" onClick={addToCart}><ShoppingCart className="h-4 w-4 mr-2" /> Add to Cart</Button>
              <Button variant="secondary" className="flex-1">Buy Now</Button>
            </div>

            {/* Trust badges */}
            <div className="grid grid-cols-3 gap-3 mt-6">
              {[{ icon: Truck, text: "Free Delivery" }, { icon: Shield, text: "Genuine Product" }, { icon: RotateCcw, text: "Easy Returns" }].map((b) => (
                <div key={b.text} className="flex flex-col items-center text-center gap-1 p-2 bg-secondary/30 rounded-lg">
                  <b.icon className="h-4 w-4 text-muted-foreground" />
                  <span className="text-[10px] text-muted-foreground">{b.text}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="description" className="mt-8">
          <TabsList>
            <TabsTrigger value="description">Description</TabsTrigger>
            <TabsTrigger value="specs">Specifications</TabsTrigger>
            <TabsTrigger value="reviews">Reviews ({product.reviews})</TabsTrigger>
          </TabsList>
          <TabsContent value="description" className="mt-4">
            <p className="text-sm text-muted-foreground leading-relaxed">{product.description}</p>
          </TabsContent>
          <TabsContent value="specs" className="mt-4">
            <div className="grid grid-cols-2 gap-2">
              {product.specs.map((s) => (
                <div key={s.label} className="flex justify-between bg-secondary/30 rounded-lg px-3 py-2">
                  <span className="text-xs text-muted-foreground">{s.label}</span>
                  <span className="text-xs font-medium">{s.value}</span>
                </div>
              ))}
            </div>
          </TabsContent>
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
      </main>
    </div>
  );
}
