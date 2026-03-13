import { useQuery } from "@tanstack/react-query";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { StatCard } from "@/components/admin/StatCard";
import { Star, Gift, Users, TrendingUp } from "lucide-react";
import { api, PointsTransaction } from "@/lib/api";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const typeStyle: Record<string, string> = {
  welcome: "bg-primary/10 text-primary",
  referral: "bg-info/10 text-info",
  order_reward: "bg-success/10 text-success",
};

export default function PointsPage() {
  const { data } = useQuery({
    queryKey: ["pointsTransactions"],
    queryFn: () => api.getPointsTransactions({ page: 1, per_page: 20 }),
  });

  const transactions = data?.data || [];
  const totalIssued = transactions.reduce((s, t) => s + t.points, 0);

  return (
    <AdminLayout>
      <div className="page-header">
        <h1 className="page-title">Loyalty Points</h1>
        <p className="page-description">Welcome, referral, and order reward points management</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard title="Total Points Issued" value="4,85,200" trend={18.3} icon={Star} gradient="gradient-warning" />
        <StatCard title="Points Redeemed" value="1,92,400" trend={12.5} icon={TrendingUp} gradient="gradient-success" />
        <StatCard title="Welcome Points" value="49,700" trend={8.1} icon={Gift} gradient="gradient-primary" />
        <StatCard title="Referral Points" value="28,300" trend={22.6} icon={Users} gradient="gradient-info" />
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
            {transactions.map((t) => (
              <div key={t.id} className="flex items-center justify-between p-3 rounded-lg bg-secondary/20">
                <div className="flex items-center gap-3">
                  <Badge className={`${typeStyle[t.type] || ''} border-0 text-[10px]`}>{t.type.replace('_', ' ')}</Badge>
                  <div>
                    <p className="text-sm font-medium">{t.user_name}</p>
                    <p className="text-xs text-muted-foreground">{t.description}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold text-success">+{t.points}</p>
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
