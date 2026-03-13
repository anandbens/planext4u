import { useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Heart, ShoppingCart, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { CustomerLayout } from "@/components/customer/CustomerLayout";
import { MOCK_PRODUCTS } from "@/lib/mockData";
import { api } from "@/lib/api";
import { toast } from "sonner";
import { logActivity } from "@/lib/auth";

export default function CustomerWishlistPage() {
  const [wishlist, setWishlist] = useState(() => {
    try { return JSON.parse(localStorage.getItem('app_db_wishlist') || '[]') as string[]; } catch { return [] as string[]; }
  });

  const products = MOCK_PRODUCTS.filter(p => wishlist.includes(p.id));

  // If wishlist is empty, show some default items for demo
  const displayProducts = products.length > 0 ? products : MOCK_PRODUCTS.filter(p => p.status === 'active').slice(0, 4);

  const removeFromWishlist = (id: string) => {
    const updated = wishlist.filter(w => w !== id);
    setWishlist(updated);
    localStorage.setItem('app_db_wishlist', JSON.stringify(updated));
    logActivity('wishlist_remove', `Removed from wishlist: ${id}`);
    toast.success("Removed from wishlist");
  };

  const addToCart = async (product: typeof MOCK_PRODUCTS[0]) => {
    await api.addToCart(product as any, 1);
    logActivity('add_to_cart', `Added to cart from wishlist: ${product.title}`);
    toast.success("Added to cart!");
  };

  return (
    <CustomerLayout>
      <div className="max-w-3xl mx-auto px-4 py-6 pb-20 md:pb-6 space-y-4">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" asChild><Link to="/app/profile"><ArrowLeft className="h-5 w-5" /></Link></Button>
          <h1 className="text-lg font-bold">My Wishlist</h1>
          <span className="text-xs text-muted-foreground">({displayProducts.length} items)</span>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {displayProducts.map((p) => (
            <Card key={p.id} className="overflow-hidden group">
              <Link to={`/app/product/${p.id}`}>
                <div className="h-36 md:h-44 bg-secondary/20 relative overflow-hidden">
                  {p.image ? <img src={p.image} alt={p.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform" /> :
                    <div className="w-full h-full flex items-center justify-center text-4xl">{p.emoji}</div>}
                  <button onClick={(e) => { e.preventDefault(); removeFromWishlist(p.id); }}
                    className="absolute top-2 right-2 h-8 w-8 rounded-full bg-card/90 flex items-center justify-center shadow">
                    <Heart className="h-4 w-4 fill-destructive text-destructive" />
                  </button>
                </div>
              </Link>
              <div className="p-3">
                <h3 className="text-xs font-semibold truncate">{p.title}</h3>
                <div className="flex items-center gap-1 mt-1">
                  <span className="text-sm font-bold text-primary">₹{(p.price - (p.discount || 0)).toLocaleString()}</span>
                  {p.discount > 0 && <span className="text-[10px] text-muted-foreground line-through">₹{p.price}</span>}
                </div>
                <Button size="sm" className="w-full mt-2 h-8 text-xs gap-1 bg-primary" onClick={() => addToCart(p)}>
                  <ShoppingCart className="h-3 w-3" /> Add to Cart
                </Button>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </CustomerLayout>
  );
}
