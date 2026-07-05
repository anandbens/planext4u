import { useEffect, useState } from "react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { CouponAdminNav } from "@/components/admin/CouponAdminNav";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/integrations/supabase/client";

export default function CouponAnalyticsPage() {
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.from("coupon_campaigns")
      .select("id,name,status,is_active,discount_type,discount_value,total_codes_generated,total_codes_used,starts_at,expires_at")
      .order("total_codes_used", { ascending: false })
      .limit(50)
      .then(({ data }) => { setRows(data || []); setLoading(false); });
  }, []);

  return (
    <AdminLayout>
      <div className="page-header">
        <h1 className="page-title">Coupon Analytics</h1>
        <p className="page-description">Top campaigns by redemption</p>
      </div>
      <CouponAdminNav />
      {loading ? (
        <div className="flex justify-center py-12"><div className="h-8 w-8 rounded-full border-2 border-primary border-t-transparent animate-spin" /></div>
      ) : (
        <div className="grid gap-2">
          {rows.map((c: any) => {
            const pct = c.total_codes_generated ? Math.round((c.total_codes_used * 100) / c.total_codes_generated) : 0;
            return (
              <Card key={c.id} className="p-3">
                <div className="flex justify-between items-center mb-1">
                  <div className="min-w-0">
                    <p className="font-medium truncate">{c.name}</p>
                    <p className="text-[11px] text-muted-foreground">
                      {c.discount_type === "percent" ? `${c.discount_value}%` : `₹${c.discount_value}`} · {c.total_codes_used}/{c.total_codes_generated} redeemed
                    </p>
                  </div>
                  <span className="text-sm font-mono">{pct}%</span>
                </div>
                <Progress value={pct} className="h-1.5" />
              </Card>
            );
          })}
          {rows.length === 0 && <p className="text-center py-12 text-muted-foreground text-sm">No campaigns yet</p>}
        </div>
      )}
    </AdminLayout>
  );
}
