import { AdminLayout } from "@/components/admin/AdminLayout";
import { BarChart3, TrendingUp, FileText, Users, Star, Gift, Megaphone, DollarSign, CreditCard, Receipt, FileBarChart, Package, Building2, BookOpen, RotateCcw, Percent, ScrollText } from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { useEffect } from "react";

const operationalReports = [
  { title: "Sales Report", desc: "Revenue, orders, and transaction analytics", icon: TrendingUp, color: "gradient-primary", to: "/reports/sales" },
  { title: "Vendor Performance", desc: "Vendor-wise revenue, ratings, and fulfillment", icon: BarChart3, color: "gradient-info", to: "/reports/vendors" },
  { title: "Settlement Report", desc: "Payouts, commissions, and pending settlements", icon: DollarSign, color: "gradient-success", to: "/reports/settlements" },
  { title: "Customer Report", desc: "User growth, retention, and demographics", icon: Users, color: "gradient-warning", to: "/reports/customers" },
  { title: "Points Report", desc: "Points issued, redeemed, and balance overview", icon: Star, color: "gradient-primary", to: "/reports/points" },
  { title: "Referral Report", desc: "Referral conversions and reward distribution", icon: Gift, color: "gradient-info", to: "/reports/referrals" },
  { title: "Classified Ads Report", desc: "Ad listings, approvals, and engagement", icon: Megaphone, color: "gradient-success", to: "/reports/classifieds" },
  { title: "Payment Report", desc: "Payment gateway transactions and reconciliation", icon: CreditCard, color: "gradient-danger", to: "/reports/payments" },
  { title: "P4U Revenue & Profit", desc: "Commission revenue, vendor/product-wise profit with cascade source tracking", icon: TrendingUp, color: "gradient-primary", to: "/reports/revenue" },
];

const financeReports = [
  { title: "Tax Invoices Issued", desc: "All vendor → customer GST invoices auto-generated on order delivery (statutory register)", icon: ScrollText, color: "gradient-primary", to: "/reports/invoices" },
  { title: "Tax Report", desc: "Product tax, GST on platform fee, and tax collection summary", icon: FileText, color: "gradient-warning", to: "/reports/tax" },
  { title: "GSTR-1 (Outward Supplies)", desc: "Invoice-wise B2C outward supplies with CGST/SGST/IGST + HSN summary for monthly GST filing", icon: Receipt, color: "gradient-primary", to: "/reports/gstr1" },
  { title: "GSTR-3B (Monthly Summary)", desc: "Self-declaration summary of outward supplies, tax liability, and ITC for monthly return", icon: FileBarChart, color: "gradient-info", to: "/reports/gstr3b" },
  { title: "Credit Notes (GSTR-1 Table 9B)", desc: "Refund/cancellation credit notes auto-generated with reverse tax breakup for amendment filing", icon: RotateCcw, color: "gradient-warning", to: "/reports/credit-notes" },
  { title: "HSN-wise Summary", desc: "Aggregated supply by HSN code with quantity, taxable value, and tax breakup (GSTR-1 Table 12)", icon: Package, color: "gradient-success", to: "/reports/hsn" },
  { title: "TCS u/s 52 (GSTR-8)", desc: "Tax Collected at Source @1% per vendor — required monthly filing for e-commerce operators", icon: Building2, color: "gradient-danger", to: "/reports/tcs" },
  { title: "TDS u/s 194-O", desc: "1% TDS deducted from vendor payouts > ₹5L/yr — quarterly statutory filing for marketplaces", icon: Percent, color: "gradient-info", to: "/reports/tds-194o" },
  { title: "GSTR-9 (Annual Return)", desc: "Consolidated annual GST return — auto-aggregates monthly GSTR-1/3B data for FY filing", icon: FileBarChart, color: "gradient-primary", to: "/reports/gstr9" },
  { title: "Day Book (Tally / Zoho Export)", desc: "Multi-sheet XLSX with Sales register, Credit notes, Journal entries — direct import to Tally/Zoho Books", icon: BookOpen, color: "gradient-success", to: "/reports/daybook" },
];

export default function ReportsPage() {
  return (
    <AdminLayout>
      <div className="page-header">
        <h1 className="page-title">Reports</h1>
        <p className="page-description">Analytics and exportable reports for all modules</p>
      </div>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Operational Reports</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {operationalReports.map((r) => <ReportCard key={r.title} {...r} />)}
        </div>
      </section>

      <section id="finance" className="space-y-3 mt-8 scroll-mt-20">
        <div className="flex items-baseline gap-3">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Finance & GST Compliance</h2>
          <span className="text-[10px] text-muted-foreground/70">India audit & statutory filings</span>
        </div>
        <p className="text-xs text-muted-foreground max-w-3xl">
          All reports below are auto-generated from completed orders &amp; settlements, support date-range filters, and export to CSV / XLSX for direct upload to the GSTN portal or import into Tally / Zoho Books.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {financeReports.map((r) => <ReportCard key={r.title} {...r} />)}
        </div>
      </section>
    </AdminLayout>
  );
}

function ReportCard({ title, desc, icon: Icon, color, to }: { title: string; desc: string; icon: any; color: string; to: string }) {
  return (
    <Link
      to={to}
      className="bg-card rounded-xl border border-border/50 p-5 hover:border-primary/30 transition-all duration-200 cursor-pointer group block"
      style={{ boxShadow: 'var(--shadow-sm)' }}
    >
      <div className={`h-11 w-11 rounded-xl ${color} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
        <Icon className="h-5 w-5 text-card" />
      </div>
      <h3 className="text-sm font-semibold mb-1">{title}</h3>
      <p className="text-xs text-muted-foreground">{desc}</p>
    </Link>
  );
}
