import { useQuery } from "@tanstack/react-query";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { StatCard } from "@/components/admin/StatCard";
import { Gift, Users, CheckCircle, Clock } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { api } from "@/lib/api";

const statusStyle: Record<string, string> = {
  completed: "bg-success/10 text-success",
  pending: "bg-warning/10 text-warning",
};

export default function ReferralsPage() {
  const { data } = useQuery({
    queryKey: ["referrals"],
    queryFn: () => api.getReferrals({ page: 1, per_page: 20 }),
  });

  const referrals = data?.data || [];
  const completed = referrals.filter((r) => r.status === 'completed');
  const pending = referrals.filter((r) => r.status === 'pending');
  const totalPoints = referrals.reduce((s, r) => s + r.points_awarded, 0);

  return (
    <AdminLayout>
      <div className="page-header">
        <h1 className="page-title">Referrals</h1>
        <p className="page-description">Customer referral program tracking</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard title="Total Referrals" value={String(referrals.length)} trend={14.2} icon={Users} gradient="gradient-primary" />
        <StatCard title="Successful" value={String(completed.length)} trend={11.8} icon={CheckCircle} gradient="gradient-success" />
        <StatCard title="Pending" value={String(pending.length)} trend={5.3} icon={Clock} gradient="gradient-warning" />
        <StatCard title="Points Awarded" value={totalPoints.toLocaleString()} trend={18.9} icon={Gift} gradient="gradient-info" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Referral Flow */}
        <div className="bg-card rounded-xl border border-border/50 p-6" style={{ boxShadow: 'var(--shadow-sm)' }}>
          <h3 className="text-base font-semibold mb-4">Referral Flow</h3>
          <div className="flex flex-col gap-4">
            {[
              { step: "1", title: "User A shares code", desc: "Referrer shares unique referral code" },
              { step: "2", title: "User B registers", desc: "New user signs up with referral code" },
              { step: "3", title: "User B orders", desc: "Referred user places first order" },
              { step: "4", title: "Points awarded", desc: "Referrer receives reward points" },
            ].map((s) => (
              <div key={s.step} className="flex items-center gap-4 p-3 rounded-lg bg-secondary/30">
                <div className="h-10 w-10 rounded-full gradient-primary flex items-center justify-center shrink-0">
                  <span className="text-sm font-bold text-card">{s.step}</span>
                </div>
                <div>
                  <p className="text-sm font-semibold">{s.title}</p>
                  <p className="text-xs text-muted-foreground">{s.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Referral List */}
        <div className="bg-card rounded-xl border border-border/50 p-6" style={{ boxShadow: 'var(--shadow-sm)' }}>
          <h3 className="text-base font-semibold mb-4">Recent Referrals</h3>
          <div className="space-y-3">
            {referrals.map((r) => (
              <div key={r.id} className="flex items-center justify-between p-3 rounded-lg bg-secondary/20">
                <div>
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium">{r.referrer_name}</p>
                    <span className="text-xs text-muted-foreground">→</span>
                    <p className="text-sm font-medium">{r.referee_name}</p>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">{new Date(r.created_at).toLocaleDateString('en-IN', { month: 'short', day: 'numeric', year: 'numeric' })}</p>
                </div>
                <div className="text-right flex items-center gap-2">
                  <Badge className={`${statusStyle[r.status] || ''} border-0 text-[10px]`}>{r.status}</Badge>
                  {r.points_awarded > 0 && <span className="text-xs font-bold text-success">+{r.points_awarded}</span>}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
