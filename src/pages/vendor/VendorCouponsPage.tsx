import { useEffect, useState } from "react";
import { VendorLayout } from "@/components/vendor/VendorLayout";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { Tag, Ticket } from "lucide-react";

export default function VendorCouponsPage() {
  const { vendorUser } = useAuth();
  const vendorId = vendorUser?.vendor_id || vendorUser?.id;
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [redemptions, setRedemptions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!vendorId) return;
    Promise.all([
      supabase.from("coupon_campaigns").select("*").eq("vendor_id", vendorId).order("created_at", { ascending: false }),
      supabase.from("coupon_redemptions").select("*, coupon_campaigns(name, discount_type, discount_value)").order("redeemed_at", { ascending: false }).limit(500),
    ]).then(([c, r]) => {
      setCampaigns((c.data as any) || []);
      setRedemptions((r.data as any) || []);
      setLoading(false);
    });
  }, [vendorId]);

  return (
    <VendorLayout title="Coupons">
      <div className="p-4 space-y-4">
        <div>
          <h1 className="text-2xl font-bold">My Coupons</h1>
          <p className="text-sm text-muted-foreground">Coupon campaigns admin has tied to your shop/products.</p>
        </div>

        {loading ? (
          <div className="flex justify-center py-12"><div className="h-8 w-8 rounded-full border-2 border-primary border-t-transparent animate-spin" /></div>
        ) : (
          <Tabs defaultValue="active">
            <TabsList>
              <TabsTrigger value="active">Active ({campaigns.filter(c => c.is_active).length})</TabsTrigger>
              <TabsTrigger value="used">Redemptions ({redemptions.length})</TabsTrigger>
            </TabsList>

            <TabsContent value="active" className="space-y-3 mt-3">
              {campaigns.filter(c => c.is_active).map(c => (
                <Card key={c.id} className="p-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2"><Tag className="w-4 h-4 text-primary" /><h3 className="font-bold">{c.name}</h3></div>
                      <p className="text-xs text-muted-foreground mt-0.5">{c.description}</p>
                    </div>
                    <Badge>{c.discount_type === "percent" ? `${c.discount_value}%` : `₹${c.discount_value}`}</Badge>
                  </div>
                  <div className="grid grid-cols-3 gap-3 mt-3 text-xs">
                    <div><div className="text-muted-foreground">Codes generated</div><div className="font-bold">{c.total_codes_generated}</div></div>
                    <div><div className="text-muted-foreground">Codes used</div><div className="font-bold text-success">{c.total_codes_used}</div></div>
                    <div><div className="text-muted-foreground">Expires</div><div className="font-bold">{c.expires_at ? new Date(c.expires_at).toLocaleDateString() : "No expiry"}</div></div>
                  </div>
                </Card>
              ))}
              {campaigns.filter(c => c.is_active).length === 0 && <p className="text-sm text-muted-foreground text-center py-12">No active coupon campaigns.</p>}
            </TabsContent>

            <TabsContent value="used" className="space-y-2 mt-3">
              {redemptions.map(r => (
                <Card key={r.id} className="p-3">
                  <div className="flex items-start justify-between text-sm">
                    <div>
                      <div className="flex items-center gap-2 font-mono font-bold"><Ticket className="w-3.5 h-3.5" />{r.code}</div>
                      <p className="text-xs text-muted-foreground">{r.coupon_campaigns?.name}</p>
                      <p className="text-xs mt-1"><span className="text-muted-foreground">Customer mobile:</span> <span className="font-medium">{r.customer_mobile || "—"}</span></p>
                      <p className="text-xs"><span className="text-muted-foreground">Order:</span> {r.order_id || "—"}</p>
                    </div>
                    <div className="text-right">
                      <div className="text-success font-bold">- ₹{Number(r.discount_amount).toFixed(2)}</div>
                      <div className="text-[10px] text-muted-foreground">{new Date(r.redeemed_at).toLocaleString()}</div>
                    </div>
                  </div>
                </Card>
              ))}
              {redemptions.length === 0 && <p className="text-sm text-muted-foreground text-center py-12">No redemptions yet.</p>}
            </TabsContent>
          </Tabs>
        )}
      </div>
    </VendorLayout>
  );
}
