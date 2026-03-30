import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { ArrowLeft, ShoppingBag, X, Star, Plus, Heart, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import SocialLayout from "@/components/social/SocialLayout";

const MOCK_PRODUCTS = [
  { id: "p1", name: "Premium Wireless Headphones", price: 2499, image: "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=200&h=200&fit=crop", rating: 4.5, reviews: 128, category: "Electronics" },
  { id: "p2", name: "Smart Watch Pro Max", price: 4999, image: "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=200&h=200&fit=crop", rating: 4.8, reviews: 256, category: "Electronics" },
  { id: "p3", name: "Organic Cotton T-Shirt", price: 899, image: "https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=200&h=200&fit=crop", rating: 4.2, reviews: 89, category: "Fashion" },
  { id: "p4", name: "Artisan Coffee Beans 500g", price: 599, image: "https://images.unsplash.com/photo-1559056199-641a0ac8b55e?w=200&h=200&fit=crop", rating: 4.7, reviews: 342, category: "Food" },
  { id: "p5", name: "Yoga Mat Premium", price: 1299, image: "https://images.unsplash.com/photo-1601925260368-ae2f83cf8b7f?w=200&h=200&fit=crop", rating: 4.4, reviews: 67, category: "Fitness" },
  { id: "p6", name: "Designer Sunglasses", price: 1999, image: "https://images.unsplash.com/photo-1572635196237-14b3f281503f?w=200&h=200&fit=crop", rating: 4.6, reviews: 178, category: "Fashion" },
];

const MOCK_COLLECTIONS = [
  { id: "col1", name: "Summer Sale", count: 12 },
  { id: "col2", name: "New Arrivals", count: 8 },
  { id: "col3", name: "Best Sellers", count: 15 },
];

const TAGGED_POSTS = Array.from({ length: 9 }, (_, i) => ({
  id: `tp-${i}`,
  image: MOCK_PRODUCTS[i % MOCK_PRODUCTS.length].image,
  productName: MOCK_PRODUCTS[i % MOCK_PRODUCTS.length].name,
  price: MOCK_PRODUCTS[i % MOCK_PRODUCTS.length].price,
}));

function formatPrice(n: number): string {
  return '₹' + n.toLocaleString('en-IN');
}

export default function SocialShopPage() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'shop' | 'collections'>('shop');
  const [selectedProduct, setSelectedProduct] = useState<typeof MOCK_PRODUCTS[0] | null>(null);

  const content = (
    <div className="pb-20 md:pb-8">
      <header className="sticky top-0 z-40 bg-card border-b border-border/30">
        <div className="flex items-center gap-3 px-4 py-3">
          <button onClick={() => navigate(-1)}><ArrowLeft className="h-5 w-5" /></button>
          <h1 className="text-lg font-bold flex-1">Shop</h1>
          <ShoppingBag className="h-5 w-5 text-muted-foreground" />
        </div>
        <div className="flex border-b border-border/20">
          <button onClick={() => setActiveTab('shop')} className={`flex-1 py-2.5 text-sm font-semibold text-center border-b-2 transition-colors ${activeTab === 'shop' ? 'border-foreground' : 'border-transparent text-muted-foreground'}`}>Products</button>
          <button onClick={() => setActiveTab('collections')} className={`flex-1 py-2.5 text-sm font-semibold text-center border-b-2 transition-colors ${activeTab === 'collections' ? 'border-foreground' : 'border-transparent text-muted-foreground'}`}>Collections</button>
        </div>
      </header>

      {activeTab === 'shop' && (
        <>
          {/* Products grid */}
          <div className="grid grid-cols-2 gap-2 p-3">
            {MOCK_PRODUCTS.map(product => (
              <button key={product.id} className="bg-card rounded-xl border border-border/30 overflow-hidden text-left" onClick={() => setSelectedProduct(product)}>
                <div className="aspect-square bg-muted">
                  <img src={product.image} alt={product.name} className="w-full h-full object-cover" loading="lazy" />
                </div>
                <div className="p-3">
                  <p className="text-xs font-semibold line-clamp-2">{product.name}</p>
                  <p className="text-sm font-bold text-primary mt-1">{formatPrice(product.price)}</p>
                  <div className="flex items-center gap-1 mt-1">
                    <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                    <span className="text-[10px] text-muted-foreground">{product.rating} ({product.reviews})</span>
                  </div>
                </div>
              </button>
            ))}
          </div>

          {/* Tagged Posts */}
          <div className="px-4 mt-4">
            <h3 className="text-sm font-semibold mb-3">Posts with Product Tags</h3>
          </div>
          <div className="grid grid-cols-3 gap-[2px]">
            {TAGGED_POSTS.map(post => (
              <button key={post.id} className="aspect-square bg-muted relative overflow-hidden" onClick={() => toast.info("Post detail coming soon")}>
                <img src={post.image} alt="" className="w-full h-full object-cover" loading="lazy" />
                <div className="absolute bottom-1 left-1">
                  <ShoppingBag className="h-4 w-4 text-white drop-shadow" />
                </div>
              </button>
            ))}
          </div>
        </>
      )}

      {activeTab === 'collections' && (
        <div className="p-4 space-y-3">
          {MOCK_COLLECTIONS.map(col => (
            <button key={col.id} className="w-full bg-card rounded-xl border border-border/30 p-4 flex items-center gap-4 hover:bg-muted/30 transition-colors" onClick={() => toast.info(`${col.name} collection`)}>
              <div className="h-16 w-16 bg-muted rounded-lg flex items-center justify-center">
                <ShoppingBag className="h-6 w-6 text-muted-foreground" />
              </div>
              <div className="flex-1 text-left">
                <p className="text-sm font-semibold">{col.name}</p>
                <p className="text-xs text-muted-foreground">{col.count} products</p>
              </div>
            </button>
          ))}
        </div>
      )}

      {/* Product Mini-Card Modal */}
      {selectedProduct && (
        <div className="fixed inset-0 z-[100] bg-black/50 flex items-end md:items-center justify-center" onClick={() => setSelectedProduct(null)}>
          <div className="bg-card rounded-t-2xl md:rounded-2xl w-full max-w-md p-4 safe-area-bottom" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-start gap-4">
              <img src={selectedProduct.image} alt={selectedProduct.name} className="h-20 w-20 rounded-xl object-cover" />
              <div className="flex-1">
                <p className="text-sm font-semibold">{selectedProduct.name}</p>
                <p className="text-lg font-bold text-primary mt-1">{formatPrice(selectedProduct.price)}</p>
                <div className="flex items-center gap-1 mt-1">
                  <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                  <span className="text-xs">{selectedProduct.rating}</span>
                  <span className="text-xs text-muted-foreground">({selectedProduct.reviews} reviews)</span>
                </div>
              </div>
              <button onClick={() => setSelectedProduct(null)}><X className="h-5 w-5 text-muted-foreground" /></button>
            </div>
            <div className="flex gap-2 mt-4">
              <Button className="flex-1 h-10" onClick={() => { navigate(`/app/product/${selectedProduct.id}`); }}>
                <ExternalLink className="h-4 w-4 mr-1" /> View Product
              </Button>
              <Button variant="secondary" className="flex-1 h-10" onClick={() => { toast.success("Added to cart"); setSelectedProduct(null); }}>
                <ShoppingBag className="h-4 w-4 mr-1" /> Add to Cart
              </Button>
            </div>
            <Button variant="ghost" className="w-full mt-2 h-9 text-xs" onClick={() => { toast.success("Saved to wishlist"); setSelectedProduct(null); }}>
              <Heart className="h-4 w-4 mr-1" /> Save to Wishlist
            </Button>
          </div>
        </div>
      )}
    </div>
  );

  return <SocialLayout hideRightSidebar>{content}</SocialLayout>;
}
