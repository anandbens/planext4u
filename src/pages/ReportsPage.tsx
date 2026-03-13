import { AdminLayout } from "@/components/admin/AdminLayout";
import { BarChart3, TrendingUp, FileText, Users, Star, Gift, Megaphone, DollarSign, CreditCard } from "lucide-react";
import { Link } from "react-router-dom";

const reports = [
  { title: "Sales Report", desc: "Revenue, orders, and transaction analytics", icon: TrendingUp, color: "gradient-primary", to: "/reports/sales" },
  { title: "Vendor Performance", desc: "Vendor-wise revenue, ratings, and fulfillment", icon: BarChart3, color: "gradient-info", to: "/reports/vendors" },
  { title: "Settlement Report", desc: "Payouts, commissions, and pending settlements", icon: DollarSign, color: "gradient-success", to: "/reports/settlements" },
  { title: "Customer Report", desc: "User growth, retention, and demographics", icon: Users, color: "gradient-warning", to: "/reports/customers" },
  { title: "Points Report", desc: "Points issued, redeemed, and balance overview", icon: Star, color: "gradient-primary", to: "/reports/points" },
  { title: "Referral Report", desc: "Referral conversions and reward distribution", icon: Gift, color: "gradient-info", to: "/reports/referrals" },
  { title: "Classified Ads Report", desc: "Ad listings, approvals, and engagement", icon: Megaphone, color: "gradient-success", to: "/reports/classifieds" },
  { title: "Tax Report", desc: "Tax collection summary by category and period", icon: FileText, color: "gradient-warning", to: "/reports/tax" },
  { title: "Payment Report", desc: "Payment gateway transactions and reconciliation", icon: CreditCard, color: "gradient-danger", to: "/reports/payments" },
];

export default function ReportsPage() {
  return (
    <AdminLayout>
      <div className="page-header">
        <h1 className="page-title">Reports</h1>
        <p className="page-description">Analytics and exportable reports for all modules</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {reports.map((r) => (
          <Link
            key={r.title}
            to={r.to}
            className="bg-card rounded-xl border border-border/50 p-5 hover:border-primary/30 transition-all duration-200 cursor-pointer group"
            style={{ boxShadow: 'var(--shadow-sm)' }}
          >
            <div className={`h-11 w-11 rounded-xl ${r.color} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
              <r.icon className="h-5 w-5 text-card" />
            </div>
            <h3 className="text-sm font-semibold mb-1">{r.title}</h3>
            <p className="text-xs text-muted-foreground">{r.desc}</p>
          </Link>
        ))}
      </div>
    </AdminLayout>
  );
}
