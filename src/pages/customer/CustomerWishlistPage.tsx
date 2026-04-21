import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Heart, ShoppingCart, Trash2, Wrench, Store } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CustomerLayout } from "@/components/customer/CustomerLayout";
import { api } from "@/lib/api";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useCurrency } from "@/lib/country-context";

export default function CustomerWishlistPage() {
  const { format: fmt } = useCurrency();
  const [tab, setTab] = useState("products");
  const [wishlist, setWishlist] = useState<string[]>([]);
  const [serviceWishlist, setServiceWishlist] = useState<string[]>([]);
  const [sellerWishlist, setSellerWishlist] = useState<string[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [services, setServices] = useState<any[]>([]);
  const [sellers, setSellers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = (key: string) => { try { return JSON.parse(localStorage.getItem(key) || '[]'); } catch { return []; } };
    setWishlist(load('app_db_wishlist'));
    setServiceWishlist(load('app_db_service_wishlist'));
    setSellerWishlist(load('app_db_seller_wishlist'));

    const handler = () => {
      setWishlist(load('app_db_wishlist'));
      setServiceWishlist(load('app_db_service_wishlist'));
      setSellerWishlist(load('app_db_seller_wishlist'));
    };
    window.addEventListener('storage', handler);
    return () => window.removeEventListener('storage', handler);
  }, []);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      if (tab === "products" && wishlist.length > 0) {
        const { data } = await supabase.from('products').select('*').in('id', wishlist);
        setProducts(data || []);
      } else if (tab === "services" && serviceWishlist.length > 0) {
        const { data } = await supabase.from('services' as any).select('*').in('id', serviceWishlist);
        setServices((data || []) as any[]);
      } else if (tab === "sellers" && sellerWishlist.length > 0) {
        const { data } = await supabase.from('vendors' as any).select('*').in('id', sellerWishlist);
        setSellers((data || []) as any[]);
      }
      setLoading(false);
    };
    loadData();
  }, [tab, wishlist, serviceWishlist, sellerWishlist]);

  const removeItem = (id: string, type: string) => {
    const keyMap: Record<string, string> = { products: 'app_db_wishlist', services: 'app_db_service_wishlist', sellers: 'app_db_seller_wishlist' };
    const key = keyMap[type];
    const current = JSON.parse(localStorage.getItem(key) || '[]');
    const updated = current.filter((w: string) => w !== id);
    localStorage.setItem(key, JSON.stringify(updated));
    if (type === 'products') { setWishlist(updated); setProducts(p => p.filter(x => x.id !== id)); }
    if (type === 'services') { setServiceWishlist(updated); setServices(s => s.filter(x => x.id !== id)); }
    if (type === 'sellers') { setSellerWishlist(updated); setSellers(s => s.filter(x => x.id !== id)); }
    toast.success("Removed from wishlist");
  };

  const addToCart = async (product: any) => {
    const result = await api.addToCart(product, 1);
    if (result.blocked) { toast.error(result.message, { duration: 5000 }); return; }
    toast.success("Added to cart!");
  };

  const EmptyState = ({ icon: Icon, text }: { icon: any; text: string }) => (
    <div className="text-center py-16">
      <Icon className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
      <p className="text-lg font-medium">No items yet</p>
      <p className="text-sm text-muted-foreground mt-1">{text}</p>
    </div>
  );

  return (
    <CustomerLayout>
      <div className="max-w-3xl mx-auto px-4 py-6 pb-28 md:pb-6 space-y-4">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" asChild><Link to="/app/profile"><ArrowLeft className="h-5 w-5" /></Link></Button>
          <h1 className="text-lg font-bold">My Wishlist</h1>
        </div>

        <Tabs value={tab} onValueChange={setTab}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="products" className="gap-1"><Heart className="h-3.5 w-3.5" /> Products ({wishlist.length})</TabsTrigger>
            <TabsTrigger value="services" className="gap-1"><Wrench className="h-3.5 w-3.5" /> Services ({serviceWishlist.length})</TabsTrigger>
            <TabsTrigger value="sellers" className="gap-1"><Store className="h-3.5 w-3.5" /> Sellers ({sellerWishlist.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="products">
            {loading ? <div className="flex justify-center py-8"><div className="h-8 w-8 rounded-full border-2 border-primary border-t-transparent animate-spin" /></div> :
              products.length === 0 ? <EmptyState icon={Heart} text="Browse products and tap the heart icon to save" /> : (
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {products.map((p) => (
                    <Card key={p.id} className="overflow-hidden group">
                      <Link to={`/app/product/${p.id}`}>
                        <div className="h-36 md:h-44 bg-secondary/20 relative overflow-hidden">
                          {p.image ? <img src={p.image} alt={p.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform" /> :
                            <div className="w-full h-full flex items-center justify-center text-4xl">{p.emoji}</div>}
                          <button onClick={(e) => { e.preventDefault(); removeItem(p.id, 'products'); }}
                            className="absolute top-2 right-2 h-8 w-8 rounded-full bg-card/90 flex items-center justify-center shadow">
                            <Heart className="h-4 w-4 fill-destructive text-destructive" />
                          </button>
                        </div>
                      </Link>
                      <div className="p-3">
                        <h3 className="text-xs font-semibold truncate">{p.title}</h3>
                        <div className="flex items-center gap-1 mt-1">
                          <span className="text-sm font-bold text-primary">{fmt(Number(p.price) - Number(p.discount || 0), { decimals: 0 })}</span>
                          {Number(p.discount) > 0 && <span className="text-[10px] text-muted-foreground line-through">{fmt(Number(p.price), { decimals: 0 })}</span>}
                        </div>
                        <Button size="sm" className="w-full mt-2 h-8 text-xs gap-1" onClick={() => addToCart(p)}>
                          <ShoppingCart className="h-3 w-3" /> Add to Cart
                        </Button>
                      </div>
                    </Card>
                  ))}
                </div>
              )}
          </TabsContent>

          <TabsContent value="services">
            {loading ? <div className="flex justify-center py-8"><div className="h-8 w-8 rounded-full border-2 border-primary border-t-transparent animate-spin" /></div> :
              services.length === 0 ? <EmptyState icon={Wrench} text="Browse services and save your favorites" /> : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {services.map((s: any) => (
                    <Card key={s.id} className="p-4 flex items-center gap-3">
                      <div className="h-16 w-16 bg-secondary/20 rounded-lg shrink-0 flex items-center justify-center overflow-hidden">
                        {s.image ? <img src={s.image} alt="" className="w-full h-full object-cover" /> : <Wrench className="h-6 w-6 text-muted-foreground" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="text-sm font-semibold truncate">{s.title || s.name}</h3>
                        <p className="text-xs text-muted-foreground">{s.vendor_name || 'Vendor'}</p>
                        <p className="text-sm font-bold text-primary mt-1">{fmt(Number(s.price || 0), { decimals: 0 })}</p>
                      </div>
                      <button onClick={() => removeItem(s.id, 'services')} className="shrink-0">
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </button>
                    </Card>
                  ))}
                </div>
              )}
          </TabsContent>

          <TabsContent value="sellers">
            {loading ? <div className="flex justify-center py-8"><div className="h-8 w-8 rounded-full border-2 border-primary border-t-transparent animate-spin" /></div> :
              sellers.length === 0 ? <EmptyState icon={Store} text="Browse sellers and save your favorites" /> : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {sellers.map((v: any) => (
                    <Link key={v.id} to={`/app/vendor/${v.id}`}>
                      <Card className="p-4 flex items-center gap-3 hover:shadow-md transition-shadow">
                        <div className="h-14 w-14 bg-secondary/20 rounded-full shrink-0 flex items-center justify-center overflow-hidden">
                          {v.logo ? <img src={v.logo} alt="" className="w-full h-full object-cover" /> : <Store className="h-6 w-6 text-muted-foreground" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="text-sm font-semibold truncate">{v.business_name || v.name}</h3>
                          <p className="text-xs text-muted-foreground">{v.category_name || 'Seller'}</p>
                        </div>
                        <button onClick={(e) => { e.preventDefault(); removeItem(v.id, 'sellers'); }} className="shrink-0">
                          <Heart className="h-4 w-4 fill-destructive text-destructive" />
                        </button>
                      </Card>
                    </Link>
                  ))}
                </div>
              )}
          </TabsContent>
        </Tabs>
      </div>
    </CustomerLayout>
  );
}
