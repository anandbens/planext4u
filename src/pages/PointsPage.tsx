import { useState, useEffect } from "react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { StatCard } from "@/components/admin/StatCard";
import { Star, Gift, Users, TrendingUp } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";

const typeStyle: Record<string, string> = {
  welcome: "bg-primary/10 text-primary",
  referral: "bg-info/10 text-info",
  order_reward: "bg-success/10 text-success",
  redemption: "bg-destructive/10 text-destructive",
};

export default function PointsPage() {
  const [stats, setStats] = useState({ totalIssued: 0, totalRedeemed: 0, welcomePts: 0, referralPts: 0 });
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      setLoading(true);
      const { data: pts } = await supabase.from("points_transactions").select("*").order("created_at", { ascending: false }).limit(20);
      setTransactions(pts || []);

      // Stats from all points
      const { data: allPts } = await supabase.from("points_transactions").select("points, type");
      const all = allPts || [];
      const totalIssued = all.filter(p => p.points > 0).reduce((s, p) => s + p.points, 0);
      const totalRedeemed = Math.abs(all.filter(p => p.points < 0).reduce((s, p) => s + p.points, 0));
      const welcomePts = all.filter(p => p.type === 'welcome').reduce((s, p) => s + p.points, 0);
      const referralPts = all.filter(p => p.type === 'referral').reduce((s, p) => s + p.points, 0);
      setStats({ totalIssued, totalRedeemed, welcomePts, referralPts });
      setLoading(false);
    };
    fetch();
  }, []);

  return (
    <AdminLayout>
      <div className="page-header">
        <h1 className="page-title">Loyalty Points</h1>
        <p className="page-description">Welcome, referral, and order reward points management</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {loading ? Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-24 rounded-xl" />) : (
          <>
            <StatCard title="Total Points Issued" value={stats.totalIssued.toLocaleString('en-IN')} icon={Star} gradient="gradient-warning" />
            <StatCard title="Points Redeemed" value={stats.totalRedeemed.toLocaleString('en-IN')} icon={TrendingUp} gradient="gradient-success" />
            <StatCard title="Welcome Points" value={stats.welcomePts.toLocaleString('en-IN')} icon={Gift} gradient="gradient-primary" />
            <StatCard title="Referral Points" value={stats.referralPts.toLocaleString('en-IN')} icon={Users} gradient="gradient-info" />
          </>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <div className="bg-card rounded-xl border border-border/50 p-6" style={{ boxShadow: 'var(--shadow-sm)' }}>
          <h3 className="text-base font-semibold mb-4">Points Configuration</h3>
          <div className="space-y-4">
            {[
              { label: "Welcome Bonus", value: "200 pts", desc: "Given to new customers on registration" },
              { label: "Referral Reward", value: "100 pts", desc: "When referred user places first order" },
              { label: "Order Reward Rate", value: "2%", desc: "Percentage of order value as points" },
            ].map((c) => (
              <div key={c.label} className="p-3 rounded-lg bg-secondary/30">
                <p className="text-sm font-medium text-muted-foreground">{c.label}</p>
                <p className="text-xl font-bold mt-0.5">{c.value}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{c.desc}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="md:col-span-2 bg-card rounded-xl border border-border/50 p-6" style={{ boxShadow: 'var(--shadow-sm)' }}>
          <h3 className="text-base font-semibold mb-4">Recent Transactions</h3>
          <div className="space-y-3">
            {loading ? Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-14 rounded-lg" />) :
              transactions.map((t) => (
                <div key={t.id} className="flex items-center justify-between p-3 rounded-lg bg-secondary/20">
                  <div className="flex items-center gap-3">
                    <Badge className={`${typeStyle[t.type] || ''} border-0 text-[10px]`}>{t.type?.replace(/_/g, ' ')}</Badge>
                    <div>
                      <p className="text-sm font-medium">{t.user_name || 'Unknown'}</p>
                      <p className="text-xs text-muted-foreground">{t.description}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className={`text-sm font-bold ${t.points >= 0 ? 'text-success' : 'text-destructive'}`}>
                      {t.points >= 0 ? '+' : ''}{t.points}
                    </p>
                    <p className="text-[10px] text-muted-foreground">{new Date(t.created_at).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' })}</p>
                  </div>
                </div>
              ))}
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
