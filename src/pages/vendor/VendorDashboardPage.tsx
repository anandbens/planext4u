import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Package, ShoppingCart, DollarSign, Star, Bell, Settings } from "lucide-react";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
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
  const { data, isLoading } = useQuery({
    queryKey: ["vendorDashboard"],
    queryFn: () => api.getVendorDashboard("VND-001"),
  });

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-30 bg-card/95 backdrop-blur-sm border-b border-border/50">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
          <div>
            <h1 className="text-lg font-bold">{data?.vendor.business_name || "Loading..."}</h1>
            <p className="text-xs text-muted-foreground">Vendor Dashboard</p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" className="relative"><Bell className="h-5 w-5" /><span className="absolute -top-0.5 -right-0.5 h-4 w-4 rounded-full bg-destructive text-[10px] text-destructive-foreground flex items-center justify-center font-bold">2</span></Button>
            <Button variant="ghost" size="icon" asChild><Link to="/vendor/settings"><Settings className="h-5 w-5" /></Link></Button>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-6 space-y-6">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {isLoading ? Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-24 rounded-xl" />) : [
            { icon: DollarSign, label: "Total Revenue", value: `₹${(data?.todayRevenue || 0).toLocaleString()}`, trend: `${data?.orders.length} orders` },
            { icon: ShoppingCart, label: "Active Orders", value: String(data?.activeOrders || 0), trend: "" },
            { icon: Package, label: "Products", value: String(data?.products.length || 0), trend: "" },
            { icon: Star, label: "Rating", value: String(data?.vendor.rating || 0), trend: `${data?.vendor.total_orders} total orders` },
          ].map((s) => (
            <Card key={s.label} className="p-4">
              <div className="flex items-center justify-between mb-2"><span className="text-xs text-muted-foreground">{s.label}</span><s.icon className="h-4 w-4 text-muted-foreground" /></div>
              <p className="text-xl font-bold">{s.value}</p>
              {s.trend && <p className="text-xs text-success mt-0.5">{s.trend}</p>}
            </Card>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <Card className="lg:col-span-2 p-5">
            <h3 className="text-sm font-semibold mb-4">This Week's Revenue</h3>
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
          <Card className="p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold">Recent Orders</h3>
              <Link to="/vendor/orders" className="text-xs text-primary hover:underline">View All</Link>
            </div>
            <div className="space-y-3">
              {data?.orders.slice(0, 4).map((o) => (
                <div key={o.id} className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-medium">{o.id}</p>
                    <p className="text-[11px] text-muted-foreground">{o.customer_name}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs font-bold">₹{o.total.toLocaleString()}</p>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${statusColor[o.status] || 'bg-muted'}`}>{o.status.replace('_', ' ')}</span>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: "Manage Products", to: "/vendor/products", icon: Package },
            { label: "All Orders", to: "/vendor/orders", icon: ShoppingCart },
            { label: "Settlements", to: "/vendor/settlements", icon: DollarSign },
            { label: "Profile", to: "/vendor/profile", icon: Settings },
          ].map((l) => (
            <Link key={l.label} to={l.to}><Card className="p-4 hover:border-primary/30 transition-colors text-center"><l.icon className="h-6 w-6 mx-auto text-primary mb-2" /><p className="text-xs font-medium">{l.label}</p></Card></Link>
          ))}
        </div>
      </main>
    </div>
  );
}
