import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Heart, ShoppingCart, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { CustomerLayout } from "@/components/customer/CustomerLayout";
import { api } from "@/lib/api";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

export default function CustomerWishlistPage() {
  const [wishlist, setWishlist] = useState<string[]>(() => {
    try { return JSON.parse(localStorage.getItem('app_db_wishlist') || '[]'); } catch { return []; }
  });
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadProducts = async () => {
      if (wishlist.length === 0) { setProducts([]); setLoading(false); return; }
      const { data } = await supabase.from('products').select('*').in('id', wishlist);
      setProducts(data || []);
      setLoading(false);
    };
    loadProducts();
  }, [wishlist]);

  const removeFromWishlist = (id: string) => {
    const updated = wishlist.filter(w => w !== id);
    setWishlist(updated);
    localStorage.setItem('app_db_wishlist', JSON.stringify(updated));
    toast.success("Removed from wishlist");
  };

  const addToCart = async (product: any) => {
    await api.addToCart(product, 1);
    toast.success("Added to cart!");
  };

  return (
    <CustomerLayout>
      <div className="max-w-3xl mx-auto px-4 py-6 pb-20 md:pb-6 space-y-4">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" asChild><Link to="/app/profile"><ArrowLeft className="h-5 w-5" /></Link></Button>
          <h1 className="text-lg font-bold">My Wishlist</h1>
          <span className="text-xs text-muted-foreground">({products.length} items)</span>
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-32">
            <div className="h-8 w-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
          </div>
        ) : products.length === 0 ? (
          <div className="text-center py-16">
            <Heart className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-lg font-medium">Your wishlist is empty</p>
            <p className="text-sm text-muted-foreground mt-1">Browse products and tap the heart icon to save items</p>
            <Button asChild className="mt-4"><Link to="/app/browse">Browse Products</Link></Button>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {products.map((p) => (
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
                    <span className="text-sm font-bold text-primary">₹{(Number(p.price) - Number(p.discount || 0)).toLocaleString()}</span>
                    {Number(p.discount) > 0 && <span className="text-[10px] text-muted-foreground line-through">₹{Number(p.price).toLocaleString()}</span>}
                  </div>
                  <Button size="sm" className="w-full mt-2 h-8 text-xs gap-1 bg-primary" onClick={() => addToCart(p)}>
                    <ShoppingCart className="h-3 w-3" /> Add to Cart
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </CustomerLayout>
  );
}