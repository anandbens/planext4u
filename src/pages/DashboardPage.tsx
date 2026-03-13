import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { StatCard } from "@/components/admin/StatCard";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { api, DashboardStats } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { Users, Store, ShoppingCart, DollarSign, Banknote, Megaphone, Wrench } from "lucide-react";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell } from "recharts";

const COLORS = ["hsl(245,58%,51%)", "hsl(280,70%,55%)", "hsl(199,89%,48%)", "hsl(152,60%,40%)", "hsl(38,92%,50%)"];

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => { api.getDashboardStats().then(setStats); }, []);

  if (!stats) return (
    <AdminLayout><div className="flex items-center justify-center h-64"><div className="h-8 w-8 rounded-full border-2 border-primary border-t-transparent animate-spin" /></div></AdminLayout>
  );

  const role = user?.role || 'admin';

  return (
    <AdminLayout>
      <div className="page-header">
        <h1 className="page-title">Dashboard</h1>
        <p className="page-description">
          {role === 'finance' ? 'Financial overview and settlement status' :
           role === 'sales' ? 'Sales performance and order tracking' :
           'Overview of your marketplace performance'}
        </p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7 gap-3 lg:gap-4 mb-6 lg:mb-8">
        <StatCard title="Customers" value={stats.total_customers.toLocaleString()} trend={stats.customers_trend} icon={Users} gradient="gradient-primary" linkTo="/customers" />
        <StatCard title="Vendors" value={stats.total_vendors.toLocaleString()} trend={stats.vendors_trend} icon={Store} gradient="gradient-info" linkTo="/vendors" />
        <StatCard title="Orders" value={stats.total_orders.toLocaleString()} trend={stats.orders_trend} icon={ShoppingCart} gradient="gradient-success" linkTo="/orders" />
        <StatCard title="Revenue" value={`₹${(stats.total_revenue / 100000).toFixed(1)}L`} trend={stats.revenue_trend} icon={DollarSign} gradient="gradient-warning" linkTo="/reports/sales" />
        <StatCard title="Settlements" value={stats.pending_settlements.toLocaleString()} trend={-2.1} icon={Banknote} gradient="gradient-danger" linkTo="/settlements" />
        <StatCard title="Services" value={stats.total_services.toLocaleString()} trend={5.8} icon={Wrench} gradient="gradient-info" linkTo="/admin/services" />
        <StatCard title="Active Ads" value={stats.active_ads.toLocaleString()} trend={5.8} icon={Megaphone} gradient="gradient-primary" linkTo="/classifieds" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 lg:gap-4 mb-6 lg:mb-8">
        <div className="lg:col-span-2 bg-card rounded-xl border border-border/50 p-4 lg:p-5" style={{ boxShadow: 'var(--shadow-sm)' }}>
          <h3 className="text-sm lg:text-base font-semibold mb-4">Revenue Trend</h3>
          <ResponsiveContainer width="100%" height={280}>
            <AreaChart data={stats.revenue_chart}>
              <defs>
                <linearGradient id="revenueGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(245,58%,51%)" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="hsl(245,58%,51%)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(220,13%,91%)" />
              <XAxis dataKey="date" tick={{ fontSize: 11 }} tickFormatter={(v) => v.slice(5)} />
              <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`} />
              <Tooltip formatter={(v: number) => [`₹${v.toLocaleString()}`, 'Revenue']} />
              <Area type="monotone" dataKey="revenue" stroke="hsl(245,58%,51%)" fill="url(#revenueGrad)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-card rounded-xl border border-border/50 p-4 lg:p-5" style={{ boxShadow: 'var(--shadow-sm)' }}>
          <h3 className="text-sm lg:text-base font-semibold mb-4">Categories</h3>
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie data={stats.category_distribution} dataKey="count" nameKey="name" cx="50%" cy="50%" outerRadius={80} innerRadius={45} paddingAngle={3}>
                {stats.category_distribution.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
          <div className="flex flex-wrap gap-2 mt-2 justify-center">
            {stats.category_distribution.map((c, i) => (
              <div key={c.name} className="flex items-center gap-1.5 text-[10px] lg:text-xs">
                <div className="h-2 w-2 lg:h-2.5 lg:w-2.5 rounded-full" style={{ background: COLORS[i % COLORS.length] }} />
                <span className="text-muted-foreground">{c.name}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 lg:gap-4">
        <div className="bg-card rounded-xl border border-border/50 p-4 lg:p-5 cursor-pointer hover:shadow-md transition-shadow" style={{ boxShadow: 'var(--shadow-sm)' }} onClick={() => navigate('/orders')}>
          <h3 className="text-sm lg:text-base font-semibold mb-4">Recent Orders</h3>
          <div className="space-y-3">
            {stats.recent_orders.map((order) => (
              <div key={order.id} className="flex items-center justify-between py-2 border-b border-border/30 last:border-0">
                <div>
                  <p className="text-xs lg:text-sm font-medium">{order.customer_name}</p>
                  <p className="text-[10px] lg:text-xs text-muted-foreground">{order.id} · {order.vendor_name}</p>
                </div>
                <div className="flex items-center gap-2 lg:gap-3">
                  <StatusBadge status={order.status} />
                  <span className="text-xs lg:text-sm font-semibold">₹{order.total.toLocaleString()}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-card rounded-xl border border-border/50 p-4 lg:p-5 cursor-pointer hover:shadow-md transition-shadow" style={{ boxShadow: 'var(--shadow-sm)' }} onClick={() => navigate('/vendors')}>
          <h3 className="text-sm lg:text-base font-semibold mb-4">Top Vendors</h3>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={stats.top_vendors} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(220,13%,91%)" />
              <XAxis type="number" tick={{ fontSize: 11 }} tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`} />
              <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={100} />
              <Tooltip formatter={(v: number) => [`₹${v.toLocaleString()}`, 'Revenue']} />
              <Bar dataKey="revenue" fill="hsl(245,58%,51%)" radius={[0, 6, 6, 0]} barSize={20} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </AdminLayout>
  );
}
