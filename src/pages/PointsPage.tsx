import { AdminLayout } from "@/components/admin/AdminLayout";
import { StatCard } from "@/components/admin/StatCard";
import { Star, Gift, Users, TrendingUp } from "lucide-react";

export default function PointsPage() {
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

      <div className="bg-card rounded-xl border border-border/50 p-6" style={{ boxShadow: 'var(--shadow-sm)' }}>
        <h3 className="text-base font-semibold mb-4">Points Configuration</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="p-4 rounded-lg bg-secondary/30">
            <p className="text-sm font-medium text-muted-foreground">Welcome Bonus</p>
            <p className="text-2xl font-bold mt-1">200 pts</p>
            <p className="text-xs text-muted-foreground mt-1">Given to new customers on registration</p>
          </div>
          <div className="p-4 rounded-lg bg-secondary/30">
            <p className="text-sm font-medium text-muted-foreground">Referral Reward</p>
            <p className="text-2xl font-bold mt-1">100 pts</p>
            <p className="text-xs text-muted-foreground mt-1">When referred user places first order</p>
          </div>
          <div className="p-4 rounded-lg bg-secondary/30">
            <p className="text-sm font-medium text-muted-foreground">Order Reward Rate</p>
            <p className="text-2xl font-bold mt-1">2%</p>
            <p className="text-xs text-muted-foreground mt-1">Percentage of order value as points</p>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
