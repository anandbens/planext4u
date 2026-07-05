import { useEffect, useState } from "react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { CouponAdminNav } from "@/components/admin/CouponAdminNav";
import { Card } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { Tag, Play, Pause, Clock, CheckCircle2, Ticket, XCircle, Calendar } from "lucide-react";

interface KPI {
  totalCampaigns: number;
  active: number;
  upcoming: number;
  expired: number;
  paused: number;
  generated: number;
  redeemed: number;
  remaining: number;
}

const emptyKpi: KPI = {
  totalCampaigns: 0, active: 0, upcoming: 0, expired: 0, paused: 0,
  generated: 0, redeemed: 0, remaining: 0,
};

export default function CouponDashboardPage() {
  const [kpi, setKpi] = useState<KPI>(emptyKpi);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from("coupon_campaigns")
        .select("id,is_active,status,starts_at,expires_at,total_codes_generated,total_codes_used");
      const now = new Date();
      const rows = data || [];
      const k: KPI = { ...emptyKpi, totalCampaigns: rows.length };
      for (const c of rows as any[]) {
        const starts = c.starts_at ? new Date(c.starts_at) : null;
        const ends = c.expires_at ? new Date(c.expires_at) : null;
        const isExpired = ends && ends < now;
        const isUpcoming = starts && starts > now;
        if (c.status === "paused" || (c.is_active === false && !isExpired)) k.paused++;
        else if (isExpired || c.status === "expired") k.expired++;
        else if (isUpcoming) k.upcoming++;
        else if (c.is_active) k.active++;
        k.generated += c.total_codes_generated || 0;
        k.redeemed += c.total_codes_used || 0;
      }
      k.remaining = Math.max(0, k.generated - k.redeemed);
      setKpi(k);
      setLoading(false);
    })();
  }, []);

  const cards = [
    { label: "Total Campaigns", value: kpi.totalCampaigns, icon: Tag, tone: "text-primary" },
    { label: "Active", value: kpi.active, icon: Play, tone: "text-emerald-500" },
    { label: "Upcoming", value: kpi.upcoming, icon: Calendar, tone: "text-sky-500" },
    { label: "Paused", value: kpi.paused, icon: Pause, tone: "text-amber-500" },
    { label: "Expired", value: kpi.expired, icon: Clock, tone: "text-muted-foreground" },
    { label: "Coupons Generated", value: kpi.generated, icon: Ticket, tone: "text-primary" },
    { label: "Coupons Redeemed", value: kpi.redeemed, icon: CheckCircle2, tone: "text-emerald-500" },
    { label: "Coupons Remaining", value: kpi.remaining, icon: XCircle, tone: "text-amber-500" },
  ];

  return (
    <AdminLayout>
      <div className="page-header">
        <h1 className="page-title">Coupon Management</h1>
        <p className="page-description">Enterprise coupon campaigns · realtime KPIs</p>
      </div>
      <CouponAdminNav />
      {loading ? (
        <div className="flex justify-center py-12"><div className="h-8 w-8 rounded-full border-2 border-primary border-t-transparent animate-spin" /></div>
      ) : (
        <div className="grid gap-3 grid-cols-2 md:grid-cols-4">
          {cards.map((c) => (
            <Card key={c.label} className="p-4 space-y-1">
              <div className="flex items-center justify-between">
                <p className="text-xs text-muted-foreground">{c.label}</p>
                <c.icon className={`w-4 h-4 ${c.tone}`} />
              </div>
              <p className="text-2xl font-bold">{c.value.toLocaleString()}</p>
            </Card>
          ))}
        </div>
      )}
    </AdminLayout>
  );
}
