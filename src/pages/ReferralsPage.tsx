import { AdminLayout } from "@/components/admin/AdminLayout";
import { StatCard } from "@/components/admin/StatCard";
import { Gift, Users, CheckCircle, Clock } from "lucide-react";

export default function ReferralsPage() {
  return (
    <AdminLayout>
      <div className="page-header">
        <h1 className="page-title">Referrals</h1>
        <p className="page-description">Customer referral program tracking</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard title="Total Referrals" value="3,482" trend={14.2} icon={Users} gradient="gradient-primary" />
        <StatCard title="Successful" value="2,156" trend={11.8} icon={CheckCircle} gradient="gradient-success" />
        <StatCard title="Pending" value="1,326" trend={5.3} icon={Clock} gradient="gradient-warning" />
        <StatCard title="Points Awarded" value="2,15,600" trend={18.9} icon={Gift} gradient="gradient-info" />
      </div>

      <div className="bg-card rounded-xl border border-border/50 p-6" style={{ boxShadow: 'var(--shadow-sm)' }}>
        <h3 className="text-base font-semibold mb-4">Referral Flow</h3>
        <div className="flex flex-col md:flex-row gap-4">
          {[
            { step: "1", title: "User A shares code", desc: "Referrer shares unique referral code" },
            { step: "2", title: "User B registers", desc: "New user signs up with referral code" },
            { step: "3", title: "User B orders", desc: "Referred user places first order" },
            { step: "4", title: "Points awarded", desc: "Referrer receives reward points" },
          ].map((s) => (
            <div key={s.step} className="flex-1 p-4 rounded-lg bg-secondary/30 text-center">
              <div className="h-10 w-10 rounded-full gradient-primary flex items-center justify-center mx-auto mb-3">
                <span className="text-sm font-bold text-card">{s.step}</span>
              </div>
              <p className="text-sm font-semibold">{s.title}</p>
              <p className="text-xs text-muted-foreground mt-1">{s.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </AdminLayout>
  );
}
