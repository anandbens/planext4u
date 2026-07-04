import { useEffect, useState } from "react";
import { CustomerLayout } from "@/components/customer/CustomerLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Tag, Copy, Ticket } from "lucide-react";
import { useNavigate } from "react-router-dom";

export default function CustomerCouponsPage() {
  const navigate = useNavigate();
  const { customerUser } = useAuth();
  const customerId = customerUser?.customer_id || customerUser?.id || "";
  const [available, setAvailable] = useState<any[]>([]);
  const [used, setUsed] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);

  useEffect(() => {
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        p => setCoords({ lat: p.coords.latitude, lng: p.coords.longitude }),
        () => {}, { timeout: 5000 }
      );
    }
  }, []);

  useEffect(() => {
    if (!customerId) return;
    const load = async () => {
      const [avail, redemps] = await Promise.all([
        (supabase.rpc as any)("get_customer_available_coupons", {
          _customer_id: customerId,
          _lat: coords?.lat ?? null, _lng: coords?.lng ?? null,
        }),
        supabase.from("coupon_redemptions").select("*, coupon_campaigns(name, discount_type, discount_value)").eq("customer_id", customerId).order("redeemed_at", { ascending: false }),
      ]);
      setAvailable((avail.data as any) || []);
      setUsed((redemps.data as any) || []);
      setLoading(false);
    };
    load();
  }, [customerId, coords]);

  const copy = (code: string) => {
    navigator.clipboard.writeText(code);
    toast.success(`Code ${code} copied — paste it at checkout`);
  };

  return (
    <CustomerLayout>
      <div className="p-4 space-y-4 pb-24">
        <div>
          <h1 className="text-xl font-bold">My Coupons</h1>
          <p className="text-xs text-muted-foreground">Apply codes at checkout to save on eligible items.</p>
        </div>

        {loading ? (
          <div className="flex justify-center py-12"><div className="h-8 w-8 rounded-full border-2 border-primary border-t-transparent animate-spin" /></div>
        ) : (
          <>
            <div className="space-y-2">
              <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Available</h2>
              {available.length === 0 && <p className="text-sm text-muted-foreground py-6 text-center">No coupons available right now.</p>}
              {available.map(c => (
                <Card key={c.campaign_id + c.code} className="p-4 border-l-4 border-l-primary">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1"><Tag className="w-4 h-4 text-primary" /><h3 className="font-bold">{c.name}</h3></div>
                      <p className="text-xs text-muted-foreground line-clamp-2">{c.description}</p>
                      <div className="flex items-center gap-2 mt-2">
                        <div className="font-mono font-bold text-primary bg-primary/10 px-2.5 py-1 rounded">{c.code}</div>
                        <Button size="sm" variant="outline" onClick={() => copy(c.code)}><Copy className="w-3 h-3 mr-1" />Copy</Button>
                      </div>
                      <div className="text-[11px] text-muted-foreground mt-2">
                        {c.discount_type === "percent" ? `${c.discount_value}% off` : `₹${c.discount_value} off`}
                        {c.max_discount ? ` (max ₹${c.max_discount})` : ""}
                        {c.min_order_amount > 0 ? ` · Min order ₹${c.min_order_amount}` : ""}
                        {c.expires_at ? ` · Expires ${new Date(c.expires_at).toLocaleDateString()}` : ""}
                      </div>
                    </div>
                  </div>
                  <Button size="sm" className="w-full mt-3" onClick={() => navigate("/app/cart")}>Use at Checkout</Button>
                </Card>
              ))}
            </div>

            <div className="space-y-2 pt-4">
              <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Used</h2>
              {used.length === 0 && <p className="text-xs text-muted-foreground py-4 text-center">You haven't used any coupons yet.</p>}
              {used.map(r => (
                <Card key={r.id} className="p-3 opacity-70">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2 font-mono font-bold text-xs"><Ticket className="w-3 h-3" />{r.code}</div>
                      <p className="text-[11px] text-muted-foreground">{r.coupon_campaigns?.name}</p>
                    </div>
                    <div className="text-right">
                      <div className="text-success text-sm font-bold">- ₹{Number(r.discount_amount).toFixed(2)}</div>
                      <div className="text-[10px] text-muted-foreground">{new Date(r.redeemed_at).toLocaleDateString()}</div>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </>
        )}
      </div>
    </CustomerLayout>
  );
}
