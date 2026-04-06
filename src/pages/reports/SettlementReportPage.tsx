import { useState, useEffect } from "react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Download, DollarSign, Clock, CheckCircle, AlertTriangle } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from "recharts";
import { exportToCSV } from "@/lib/csv";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { format, subDays, startOfWeek, parseISO, eachWeekOfInterval, startOfDay, endOfDay } from "date-fns";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon } from "lucide-react";

export default function SettlementReportPage() {
  const [dateFrom, setDateFrom] = useState<Date>(subDays(new Date(), 90));
  const [dateTo, setDateTo] = useState<Date>(new Date());
  const [stats, setStats] = useState({ settled: 0, pending: 0, commission: 0, onHold: 0 });
  const [weeklyData, setWeeklyData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      setLoading(true);
      const from = startOfDay(dateFrom).toISOString();
      const to = endOfDay(dateTo).toISOString();

      const { data: settlements } = await supabase.from("settlements").select("*")
        .gte("created_at", from).lte("created_at", to);

      const all = settlements || [];
      const settled = all.filter(s => s.status === 'settled').reduce((sum, s) => sum + Number(s.net_amount), 0);
      const pending = all.filter(s => s.status === 'pending' || s.status === 'eligible').reduce((sum, s) => sum + Number(s.net_amount), 0);
      const commission = all.reduce((sum, s) => sum + Number(s.commission), 0);
      const onHold = all.filter(s => s.status === 'on_hold').reduce((sum, s) => sum + Number(s.net_amount), 0);
      setStats({ settled, pending, commission, onHold });

      // Group by week
      const weeks = eachWeekOfInterval({ start: dateFrom, end: dateTo });
      const weekMap = new Map<string, { settled: number; pending: number; commission: number }>();
      weeks.forEach(w => weekMap.set(format(w, "yyyy-MM-dd"), { settled: 0, pending: 0, commission: 0 }));

      all.forEach(s => {
        const wk = format(startOfWeek(parseISO(s.created_at)), "yyyy-MM-dd");
        const entry = weekMap.get(wk);
        if (entry) {
          entry.commission += Number(s.commission);
          if (s.status === 'settled') entry.settled += Number(s.net_amount);
          else entry.pending += Number(s.net_amount);
        }
      });

      const wd: any[] = [];
      let wIdx = 1;
      weekMap.forEach((v) => {
        wd.push({ week: `W${wIdx++}`, settled: v.settled, pending: v.pending, commission: v.commission });
      });
      setWeeklyData(wd.slice(-12)); // last 12 weeks
      setLoading(false);
    };
    fetch();
  }, [dateFrom, dateTo]);

  const handleExport = () => {
    exportToCSV(weeklyData, [
      { key: "week", label: "Week" }, { key: "settled", label: "Settled (₹)" },
      { key: "pending", label: "Pending (₹)" }, { key: "commission", label: "Commission (₹)" },
    ], "settlement_report");
  };

  const statCards = [
    { icon: DollarSign, label: "Total Settled", value: `₹${stats.settled.toLocaleString('en-IN')}`, color: "text-success" },
    { icon: Clock, label: "Pending", value: `₹${stats.pending.toLocaleString('en-IN')}`, color: "text-warning" },
    { icon: CheckCircle, label: "P4U Commission Earned", value: `₹${stats.commission.toLocaleString('en-IN')}`, color: "text-primary" },
    { icon: AlertTriangle, label: "On Hold", value: `₹${stats.onHold.toLocaleString('en-IN')}`, color: "text-destructive" },
  ];

  return (
    <AdminLayout>
      <div className="page-header">
        <div>
          <h1 className="page-title">Settlement Report</h1>
          <p className="page-description">Payouts, P4U commissions, and pending settlements</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <DatePicker label="From" date={dateFrom} setDate={setDateFrom} />
          <DatePicker label="To" date={dateTo} setDate={setDateTo} />
          <Button onClick={handleExport} variant="outline" size="sm"><Download className="h-4 w-4 mr-1" /> Export CSV</Button>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {loading ? Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-24 rounded-xl" />) :
          statCards.map((s) => (
            <Card key={s.label} className="p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-muted-foreground">{s.label}</span>
                <s.icon className={cn("h-4 w-4", s.color)} />
              </div>
              <p className="text-xl font-bold">{s.value}</p>
            </Card>
          ))
        }
      </div>

      {!loading && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Card className="p-5">
            <h3 className="text-sm font-semibold mb-4">Weekly Settlements</h3>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={weeklyData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="week" tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" />
                <YAxis tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`} />
                <Tooltip formatter={(v: number) => [`₹${v.toLocaleString('en-IN')}`]} />
                <Bar dataKey="settled" fill="hsl(var(--success))" radius={[4, 4, 0, 0]} name="Settled" />
                <Bar dataKey="pending" fill="hsl(var(--warning))" radius={[4, 4, 0, 0]} name="Pending" />
              </BarChart>
            </ResponsiveContainer>
          </Card>
          <Card className="p-5">
            <h3 className="text-sm font-semibold mb-4">P4U Commission Trend</h3>
            <ResponsiveContainer width="100%" height={280}>
              <LineChart data={weeklyData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="week" tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" />
                <YAxis tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`} />
                <Tooltip formatter={(v: number) => [`₹${v.toLocaleString('en-IN')}`]} />
                <Line type="monotone" dataKey="commission" stroke="hsl(var(--primary))" strokeWidth={2} dot={{ fill: "hsl(var(--primary))" }} />
              </LineChart>
            </ResponsiveContainer>
          </Card>
        </div>
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
