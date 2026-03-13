import { useState } from "react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon, Download, TrendingUp, ShoppingCart, DollarSign, Percent } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { downloadCSV } from "@/lib/csv";

const dailyData = [
  { date: "Mar 7", revenue: 185000, orders: 320, avgOrder: 578 },
  { date: "Mar 8", revenue: 210000, orders: 345, avgOrder: 609 },
  { date: "Mar 9", revenue: 195000, orders: 310, avgOrder: 629 },
  { date: "Mar 10", revenue: 240000, orders: 380, avgOrder: 632 },
  { date: "Mar 11", revenue: 275000, orders: 420, avgOrder: 655 },
  { date: "Mar 12", revenue: 260000, orders: 395, avgOrder: 658 },
  { date: "Mar 13", revenue: 290000, orders: 445, avgOrder: 652 },
];

const paymentMethods = [
  { name: "UPI", value: 45, color: "hsl(var(--primary))" },
  { name: "Card", value: 25, color: "hsl(var(--success))" },
  { name: "Wallet", value: 15, color: "hsl(var(--warning))" },
  { name: "COD", value: 15, color: "hsl(var(--info))" },
];

export default function SalesReportPage() {
  const [dateFrom, setDateFrom] = useState<Date>(new Date(2026, 2, 7));
  const [dateTo, setDateTo] = useState<Date>(new Date(2026, 2, 13));

  const handleExport = () => {
    downloadCSV(dailyData, ["date", "revenue", "orders", "avgOrder"], "sales_report");
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
        <MiniStat icon={DollarSign} label="Total Revenue" value="₹16,55,000" trend="+22.1%" />
        <MiniStat icon={ShoppingCart} label="Total Orders" value="2,615" trend="+15.2%" />
        <MiniStat icon={TrendingUp} label="Avg Order Value" value="₹633" trend="+4.8%" />
        <MiniStat icon={Percent} label="Conversion Rate" value="3.2%" trend="+0.5%" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
        <Card className="lg:col-span-2 p-5">
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
              <XAxis dataKey="date" tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" />
              <YAxis tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`} />
              <Tooltip formatter={(v: number) => [`₹${v.toLocaleString()}`, "Revenue"]} />
              <Area type="monotone" dataKey="revenue" stroke="hsl(var(--primary))" fill="url(#revGrad)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </Card>
        <Card className="p-5">
          <h3 className="text-sm font-semibold mb-4">Payment Methods</h3>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie data={paymentMethods} dataKey="value" cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={4}>
                {paymentMethods.map((e, i) => <Cell key={i} fill={e.color} />)}
              </Pie>
              <Tooltip formatter={(v: number) => [`${v}%`]} />
            </PieChart>
          </ResponsiveContainer>
          <div className="flex flex-wrap gap-3 mt-2 justify-center">
            {paymentMethods.map((m) => (
              <span key={m.name} className="text-xs flex items-center gap-1">
                <span className="h-2.5 w-2.5 rounded-full" style={{ background: m.color }} /> {m.name} ({m.value}%)
              </span>
            ))}
          </div>
        </Card>
      </div>

      <Card className="p-5">
        <h3 className="text-sm font-semibold mb-4">Daily Orders</h3>
        <ResponsiveContainer width="100%" height={250}>
          <BarChart data={dailyData}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis dataKey="date" tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" />
            <YAxis tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" />
            <Tooltip />
            <Bar dataKey="orders" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </Card>
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

function MiniStat({ icon: Icon, label, value, trend }: { icon: any; label: string; value: string; trend: string }) {
  return (
    <Card className="p-4">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs text-muted-foreground">{label}</span>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </div>
      <p className="text-xl font-bold">{value}</p>
      <p className="text-xs text-success mt-1">{trend} vs last period</p>
    </Card>
  );
}
