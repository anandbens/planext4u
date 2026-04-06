import { useState, useEffect } from "react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Download, CalendarIcon } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { exportToCSV } from "@/lib/csv";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";
import { format, subDays, startOfDay, endOfDay, eachMonthOfInterval, parseISO, startOfMonth } from "date-fns";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

export default function TaxReportPage() {
  const [dateFrom, setDateFrom] = useState<Date>(subDays(new Date(), 180));
  const [dateTo, setDateTo] = useState<Date>(new Date());
  const [stats, setStats] = useState({ totalTax: 0, totalOrders: 0, avgTaxPerOrder: 0 });
  const [monthlyData, setMonthlyData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      setLoading(true);
      const from = startOfDay(dateFrom).toISOString();
      const to = endOfDay(dateTo).toISOString();

      const { data: orders } = await supabase.from("orders").select("tax, total, created_at")
        .gte("created_at", from).lte("created_at", to);

      const all = orders || [];
      const totalTax = all.reduce((s, o) => s + Number(o.tax || 0), 0);
      const totalOrders = all.length;
      const avgTaxPerOrder = totalOrders > 0 ? Math.round(totalTax / totalOrders) : 0;
      setStats({ totalTax, totalOrders, avgTaxPerOrder });

      // Monthly grouping
      const months = eachMonthOfInterval({ start: dateFrom, end: dateTo });
      const monthMap = new Map<string, { tax: number; revenue: number }>();
      months.forEach(m => monthMap.set(format(m, "yyyy-MM"), { tax: 0, revenue: 0 }));
      all.forEach(o => {
        const key = format(startOfMonth(parseISO(o.created_at)), "yyyy-MM");
        const entry = monthMap.get(key);
        if (entry) { entry.tax += Number(o.tax || 0); entry.revenue += Number(o.total || 0); }
      });

      const md: any[] = [];
      monthMap.forEach((v, k) => md.push({ month: format(parseISO(k + "-01"), "MMM yy"), tax: v.tax, revenue: v.revenue }));
      setMonthlyData(md);
      setLoading(false);
    };
    fetch();
  }, [dateFrom, dateTo]);

  return (
    <AdminLayout>
      <div className="page-header">
        <div>
          <h1 className="page-title">Tax Report</h1>
          <p className="page-description">Tax collected across orders by period</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <DatePicker label="From" date={dateFrom} setDate={setDateFrom} />
          <DatePicker label="To" date={dateTo} setDate={setDateTo} />
          <Button onClick={() => exportToCSV(monthlyData, [{ key: "month", label: "Month" }, { key: "tax", label: "Tax (₹)" }, { key: "revenue", label: "Revenue (₹)" }], "tax_report")} variant="outline" size="sm">
            <Download className="h-4 w-4 mr-1" /> Export CSV
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4 mb-6">
        {loading ? Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-24 rounded-xl" />) : (
          <>
            <Card className="p-4"><span className="text-xs text-muted-foreground">Total Tax Collected</span><p className="text-xl font-bold mt-1">₹{stats.totalTax.toLocaleString('en-IN')}</p></Card>
            <Card className="p-4"><span className="text-xs text-muted-foreground">Taxable Orders</span><p className="text-xl font-bold mt-1">{stats.totalOrders.toLocaleString()}</p></Card>
            <Card className="p-4"><span className="text-xs text-muted-foreground">Avg Tax / Order</span><p className="text-xl font-bold mt-1">₹{stats.avgTaxPerOrder.toLocaleString('en-IN')}</p></Card>
          </>
        )}
      </div>

      {!loading && (
        <Card className="p-5">
          <h3 className="text-sm font-semibold mb-4">Monthly Tax Collection</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={monthlyData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="month" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
              <YAxis tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`} />
              <Tooltip formatter={(v: number) => [`₹${v.toLocaleString('en-IN')}`]} />
              <Bar dataKey="tax" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} name="Tax" />
            </BarChart>
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
