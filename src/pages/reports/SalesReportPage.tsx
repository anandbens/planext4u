import { useState, useEffect } from "react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon, Download, TrendingUp, ShoppingCart, DollarSign, Percent } from "lucide-react";
import { format, subDays, startOfDay, endOfDay, eachDayOfInterval, parseISO } from "date-fns";
import { cn } from "@/lib/utils";
import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { exportToCSV } from "@/lib/csv";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";

interface DailyData { date: string; revenue: number; orders: number; avgOrder: number; }

export default function SalesReportPage() {
  const [dateFrom, setDateFrom] = useState<Date>(subDays(new Date(), 30));
  const [dateTo, setDateTo] = useState<Date>(new Date());
  const [dailyData, setDailyData] = useState<DailyData[]>([]);
  const [stats, setStats] = useState({ totalRevenue: 0, totalOrders: 0, avgOrderValue: 0, completedRate: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      const from = startOfDay(dateFrom).toISOString();
      const to = endOfDay(dateTo).toISOString();

      const { data: orders } = await supabase.from("orders").select("total, status, created_at")
        .gte("created_at", from).lte("created_at", to);

      const allOrders = orders || [];
      const totalRevenue = allOrders.reduce((s, o) => s + Number(o.total || 0), 0);
      const totalOrders = allOrders.length;
      const avgOrderValue = totalOrders > 0 ? Math.round(totalRevenue / totalOrders) : 0;
      const completed = allOrders.filter(o => o.status === 'completed' || o.status === 'delivered').length;
      const completedRate = totalOrders > 0 ? Math.round((completed / totalOrders) * 100 * 10) / 10 : 0;

      setStats({ totalRevenue, totalOrders, avgOrderValue, completedRate });

      // Group by day
      const days = eachDayOfInterval({ start: dateFrom, end: dateTo });
      const dayMap = new Map<string, { revenue: number; orders: number }>();
      days.forEach(d => dayMap.set(format(d, "yyyy-MM-dd"), { revenue: 0, orders: 0 }));
      allOrders.forEach(o => {
        const key = format(parseISO(o.created_at), "yyyy-MM-dd");
        const entry = dayMap.get(key);
        if (entry) { entry.revenue += Number(o.total || 0); entry.orders++; }
      });

      const daily: DailyData[] = [];
      dayMap.forEach((v, k) => {
        daily.push({ date: format(parseISO(k), "MMM dd"), revenue: v.revenue, orders: v.orders, avgOrder: v.orders > 0 ? Math.round(v.revenue / v.orders) : 0 });
      });
      setDailyData(daily);
      setLoading(false);
    };
    fetchData();
  }, [dateFrom, dateTo]);

  const handleExport = () => {
    exportToCSV(dailyData, [
      { key: "date", label: "Date" }, { key: "revenue", label: "Revenue (₹)" },
      { key: "orders", label: "Orders" }, { key: "avgOrder", label: "Avg Order (₹)" },
    ], "sales_report");
  };

  return (
    <AdminLayout>
      <div className="page-header">
        <div>
          <h1 className="page-title">Sales Report</h1>
          <p className="page-description">Revenue, orders, and transaction analytics</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <DatePicker label="From" date={dateFrom} setDate={setDateFrom} />
          <DatePicker label="To" date={dateTo} setDate={setDateTo} />
          <Button onClick={handleExport} variant="outline" size="sm"><Download className="h-4 w-4 mr-1" /> Export CSV</Button>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {loading ? Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-24 rounded-xl" />) : (
          <>
            <MiniStat icon={DollarSign} label="Total Revenue" value={`₹${stats.totalRevenue.toLocaleString('en-IN')}`} />
            <MiniStat icon={ShoppingCart} label="Total Orders" value={stats.totalOrders.toLocaleString()} />
            <MiniStat icon={TrendingUp} label="Avg Order Value" value={`₹${stats.avgOrderValue.toLocaleString('en-IN')}`} />
            <MiniStat icon={Percent} label="Completion Rate" value={`${stats.completedRate}%`} />
          </>
        )}
      </div>

      {!loading && (
        <>
          <Card className="p-5 mb-6">
            <h3 className="text-sm font-semibold mb-4">Revenue Trend</h3>
            <ResponsiveContainer width="100%" height={280}>
              <AreaChart data={dailyData}>
                <defs>
                  <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                    <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                <YAxis tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`} />
                <Tooltip formatter={(v: number) => [`₹${v.toLocaleString('en-IN')}`, "Revenue"]} />
                <Area type="monotone" dataKey="revenue" stroke="hsl(var(--primary))" fill="url(#revGrad)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </Card>

          <Card className="p-5">
            <h3 className="text-sm font-semibold mb-4">Daily Orders</h3>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={dailyData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                <YAxis tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" />
                <Tooltip />
                <Bar dataKey="orders" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </Card>
        </>
      )}
    </AdminLayout>
  );
}

function DatePicker({ label, date, setDate }: { label: string; date: Date; setDate: (d: Date) => void }) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className={cn("justify-start text-left font-normal", !date && "text-muted-foreground")}>
          <CalendarIcon className="h-3.5 w-3.5 mr-1" />
          {date ? format(date, "MMM dd, yyyy") : label}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar mode="single" selected={date} onSelect={(d) => d && setDate(d)} initialFocus className="p-3 pointer-events-auto" />
      </PopoverContent>
    </Popover>
  );
}

function MiniStat({ icon: Icon, label, value }: { icon: any; label: string; value: string }) {
  return (
    <Card className="p-4">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs text-muted-foreground">{label}</span>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </div>
      <p className="text-xl font-bold">{value}</p>
    </Card>
  );
}
