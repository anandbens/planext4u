import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Package, ShoppingCart, DollarSign, Star, Wrench, CreditCard, History, ArrowUpRight, Sparkles, Plus, ChevronRight } from "lucide-react";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { VendorLayout } from "@/components/vendor/VendorLayout";
import { useAuth } from "@/lib/auth";
import { api } from "@/lib/api";

const statusColor: Record<string, string> = {
  placed: "bg-primary/10 text-primary", paid: "bg-info/10 text-info", accepted: "bg-info/10 text-info",
  in_progress: "bg-warning/10 text-warning", delivered: "bg-success/10 text-success",
  completed: "bg-success/10 text-success", cancelled: "bg-destructive/10 text-destructive",
};

const revenueData = [
  { day: "Mon", revenue: 12000 }, { day: "Tue", revenue: 18000 }, { day: "Wed", revenue: 15000 },
  { day: "Thu", revenue: 22000 }, { day: "Fri", revenue: 28000 }, { day: "Sat", revenue: 32000 }, { day: "Sun", revenue: 25000 },
];

export default function VendorDashboardPage() {
  const { vendorUser } = useAuth();
  const vendorId = vendorUser?.vendor_id || "VND-001";

  const { data, isLoading } = useQuery({
    queryKey: ["vendorDashboard", vendorId],
    queryFn: () => api.getVendorDashboard(vendorId),
    retry: 1,
  });

  return (
    <VendorLayout title="Dashboard">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-5 sm:py-7 space-y-5 sm:space-y-7">
        <section className="relative overflow-hidden rounded-[1.75rem] bg-[hsl(var(--brand-dark))] text-white p-5 sm:p-8 shadow-xl">
          <div className="absolute -right-16 -top-20 h-56 w-56 rounded-full bg-primary/35 blur-3xl" />
          <div className="absolute -bottom-20 left-1/3 h-44 w-44 rounded-full bg-warning/25 blur-3xl" />
          <div className="relative flex flex-col sm:flex-row sm:items-end justify-between gap-5">
            <div>
              <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1 text-[11px] font-semibold text-white/80 backdrop-blur">
                <Sparkles className="h-3.5 w-3.5 text-warning" /> Your business at a glance
              </div>
              <p className="text-sm text-white/60">Welcome back, {vendorUser?.name?.split(" ")[0] || "Partner"}</p>
              <h2 className="app-section-title mt-1 max-w-lg text-2xl sm:text-4xl font-extrabold">Keep your store moving forward.</h2>
              <p className="mt-3 max-w-xl text-xs sm:text-sm text-white/60">Manage products, fulfil orders and track earnings from one clean workspace.</p>
            </div>
            <Link to="/vendor/products" className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-white px-4 text-sm font-bold text-[hsl(var(--brand-dark))] shadow-lg transition hover:-translate-y-0.5">
              <Plus className="h-4 w-4" /> Add product
            </Link>
          </div>
        </section>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {isLoading ? Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-24 rounded-xl" />) : [
            { icon: DollarSign, label: "Total Revenue", value: `₹${(data?.todayRevenue || 0).toLocaleString()}`, trend: `${data?.orders?.length || 0} orders` },
            { icon: ShoppingCart, label: "Active Orders", value: String(data?.activeOrders || 0), trend: "" },
            { icon: Package, label: "Products", value: String(data?.products?.length || 0), trend: "" },
            { icon: Star, label: "Rating", value: String((data?.vendor as any)?.rating || 0), trend: `${(data?.vendor as any)?.total_orders || 0} total orders` },
          ].map((s, index) => (
            <Card key={s.label} className="app-surface group overflow-hidden rounded-2xl border-0 p-4 sm:p-5 transition hover:-translate-y-1 hover:shadow-lg">
              <div className="flex items-center justify-between mb-3"><span className="text-[11px] sm:text-xs font-semibold text-muted-foreground">{s.label}</span><span className={`app-icon-tile h-9 w-9 ${index === 0 ? 'bg-amber-50 text-amber-600' : ''}`}><s.icon className="h-4 w-4" /></span></div>
              <p className="text-xl sm:text-2xl font-extrabold tracking-tight">{s.value}</p>
              {s.trend && <p className="text-xs text-success mt-0.5">{s.trend}</p>}
            </Card>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <Card className="app-surface lg:col-span-2 rounded-[1.5rem] border-0 p-5 sm:p-6">
            <div className="mb-4 flex items-center justify-between"><div><p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">Performance</p><h3 className="app-section-title mt-1 text-lg font-bold">This week's revenue</h3></div><span className="flex items-center gap-1 rounded-full bg-success/10 px-2.5 py-1 text-[11px] font-bold text-success"><ArrowUpRight className="h-3 w-3" /> Live</span></div>
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={revenueData}>
                <defs><linearGradient id="vRevGrad" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.3} /><stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0} /></linearGradient></defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="day" tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" />
                <YAxis tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`} />
                <Tooltip formatter={(v: number) => [`₹${v.toLocaleString()}`]} />
                <Area type="monotone" dataKey="revenue" stroke="hsl(var(--primary))" fill="url(#vRevGrad)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </Card>
          <Card className="app-surface rounded-[1.5rem] border-0 p-5 sm:p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-bold">Recent orders</h3>
              <Link to="/vendor/orders" className="text-xs text-primary hover:underline">View All</Link>
            </div>
            <div className="space-y-3">
              {data?.orders?.slice(0, 4).map((o: any) => (
                <div key={o.id} className="flex items-center justify-between rounded-xl bg-background/70 p-2.5">
                  <div>
                    <p className="text-xs font-medium">{o.id}</p>
                    <p className="text-[11px] text-muted-foreground">{o.customer_name}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs font-bold">₹{Number(o.total || 0).toLocaleString()}</p>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${statusColor[o.status] || 'bg-muted'}`}>{(o.status || '').replace('_', ' ')}</span>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {[
            { label: "Products", to: "/vendor/products", icon: Package },
            { label: "Services", to: "/vendor/services", icon: Wrench },
            { label: "Orders", to: "/vendor/orders", icon: ShoppingCart },
            { label: "Settlements", to: "/vendor/settlements", icon: DollarSign },
            { label: "Payments", to: "/vendor/payments", icon: History },
            { label: "Bank A/C", to: "/vendor/bank", icon: CreditCard },
          ].map((l) => (
            <Link key={l.label} to={l.to}><Card className="app-surface group rounded-2xl border-0 p-4 text-center transition hover:-translate-y-1 hover:shadow-lg"><span className="app-icon-tile mx-auto mb-2 h-11 w-11"><l.icon className="h-5 w-5" /></span><p className="text-xs font-bold">{l.label}</p><ChevronRight className="mx-auto mt-1 h-3.5 w-3.5 text-muted-foreground opacity-0 transition group-hover:opacity-100" /></Card></Link>
          ))}
        </div>
      </div>
    </VendorLayout>
  );
}
