import { useState, useEffect } from "react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Download, CalendarIcon } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { exportToCSV } from "@/lib/csv";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";
import { format, subDays, eachDayOfInterval, parseISO, startOfDay, endOfDay } from "date-fns";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

export default function PaymentReportPage() {
  const [dateFrom, setDateFrom] = useState<Date>(subDays(new Date(), 30));
  const [dateTo, setDateTo] = useState<Date>(new Date());
  const [stats, setStats] = useState({ total: 0, completed: 0, cancelled: 0, successRate: 0 });
  const [dailyData, setDailyData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      setLoading(true);
      const from = startOfDay(dateFrom).toISOString();
      const to = endOfDay(dateTo).toISOString();

      const { data: orders } = await supabase.from("orders").select("status, created_at, total")
        .gte("created_at", from).lte("created_at", to);

      const all = orders || [];
      const total = all.length;
      const completed = all.filter(o => ['paid', 'accepted', 'in_progress', 'delivered', 'completed'].includes(o.status)).length;
      const cancelled = all.filter(o => o.status === 'cancelled').length;
      const successRate = total > 0 ? Math.round((completed / total) * 100 * 10) / 10 : 0;
      setStats({ total, completed, cancelled, successRate });

      // Daily breakdown
      const days = eachDayOfInterval({ start: dateFrom, end: dateTo });
      const dayMap = new Map<string, { success: number; cancelled: number }>();
      days.forEach(d => dayMap.set(format(d, "yyyy-MM-dd"), { success: 0, cancelled: 0 }));
      all.forEach(o => {
        const key = format(parseISO(o.created_at), "yyyy-MM-dd");
        const entry = dayMap.get(key);
        if (entry) {
          if (o.status === 'cancelled') entry.cancelled++;
          else entry.success++;
        }
      });

      const dd: any[] = [];
      dayMap.forEach((v, k) => dd.push({ date: format(parseISO(k), "MMM dd"), success: v.success, cancelled: v.cancelled }));
      setDailyData(dd);
      setLoading(false);
    };
    fetch();
  }, [dateFrom, dateTo]);

  return (
    <AdminLayout>
      <div className="page-header">
        <div>
          <h1 className="page-title">Payment Report</h1>
          <p className="page-description">Payment transactions and success rates</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <DatePicker label="From" date={dateFrom} setDate={setDateFrom} />
          <DatePicker label="To" date={dateTo} setDate={setDateTo} />
          <Button onClick={() => exportToCSV(dailyData, [{ key: "date", label: "Date" }, { key: "success", label: "Success" }, { key: "cancelled", label: "Cancelled" }], "payment_report")} variant="outline" size="sm">
            <Download className="h-4 w-4 mr-1" /> Export CSV
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {loading ? Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-24 rounded-xl" />) : (
          <>
            <Card className="p-4"><span className="text-xs text-muted-foreground">Total Transactions</span><p className="text-xl font-bold mt-1">{stats.total.toLocaleString()}</p></Card>
            <Card className="p-4"><span className="text-xs text-muted-foreground">Successful</span><p className="text-xl font-bold mt-1 text-success">{stats.completed.toLocaleString()}</p></Card>
            <Card className="p-4"><span className="text-xs text-muted-foreground">Success Rate</span><p className="text-xl font-bold mt-1 text-success">{stats.successRate}%</p></Card>
            <Card className="p-4"><span className="text-xs text-muted-foreground">Cancelled</span><p className="text-xl font-bold mt-1 text-destructive">{stats.cancelled}</p></Card>
          </>
        )}
      </div>

      {!loading && (
        <Card className="p-5">
          <h3 className="text-sm font-semibold mb-4">Transaction Trend</h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={dailyData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="date" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
              <YAxis tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" />
              <Tooltip />
              <Line type="monotone" dataKey="success" stroke="hsl(var(--success))" strokeWidth={2} name="Successful" />
              <Line type="monotone" dataKey="cancelled" stroke="hsl(var(--destructive))" strokeWidth={2} name="Cancelled" />
            </LineChart>
          </ResponsiveContainer>
        </Card>
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
