import { useState, useEffect } from "react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Download, CalendarIcon } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { exportToCSV } from "@/lib/csv";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { format, subDays, startOfDay, endOfDay } from "date-fns";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

interface VendorRow {
  id: string; name: string; business_name: string; status: string;
  commission_rate: number; total_orders: number; total_revenue: number;
  rating: number; plan_name?: string;
}

export default function VendorReportPage() {
  const [dateFrom, setDateFrom] = useState<Date>(subDays(new Date(), 90));
  const [dateTo, setDateTo] = useState<Date>(new Date());
  const [vendors, setVendors] = useState<VendorRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      setLoading(true);

      // Get all vendors with their plans
      const { data: vds } = await supabase.from("vendors").select("id, name, business_name, status, commission_rate, total_orders, total_revenue, rating, plan_id")
        .order("total_revenue", { ascending: false });

      // Get plan names
      const { data: plans } = await supabase.from("vendor_plans").select("id, plan_name");
      const planMap = new Map((plans || []).map(p => [p.id, p.plan_name]));

      // Get settlement data per vendor in date range
      const from = startOfDay(dateFrom).toISOString();
      const to = endOfDay(dateTo).toISOString();
      const { data: settlements } = await supabase.from("settlements").select("vendor_id, amount, commission, net_amount, status")
        .gte("created_at", from).lte("created_at", to);

      const stlMap = new Map<string, { settled: number; commission: number; pending: number }>();
      (settlements || []).forEach(s => {
        const entry = stlMap.get(s.vendor_id) || { settled: 0, commission: 0, pending: 0 };
        entry.commission += Number(s.commission);
        if (s.status === 'settled') entry.settled += Number(s.net_amount);
        else entry.pending += Number(s.net_amount);
        stlMap.set(s.vendor_id, entry);
      });

      const rows: VendorRow[] = (vds || []).map(v => ({
        ...v,
        total_orders: v.total_orders || 0,
        total_revenue: Number(v.total_revenue || 0),
        rating: v.rating || 0,
        plan_name: v.plan_id ? planMap.get(v.plan_id) || '—' : 'No Plan',
      }));

      setVendors(rows);
      setLoading(false);
    };
    fetch();
  }, [dateFrom, dateTo]);

  const topVendors = vendors.slice(0, 10);
  const chartData = topVendors.map(v => ({ name: v.business_name?.slice(0, 15) || v.name?.slice(0, 15), revenue: v.total_revenue, orders: v.total_orders }));

  const handleExport = () => {
    exportToCSV(vendors.map(v => ({
      ...v,
      revenue: v.total_revenue,
    })), [
      { key: "id", label: "ID" }, { key: "name", label: "Name" }, { key: "business_name", label: "Business" },
      { key: "plan_name", label: "Plan" }, { key: "commission_rate", label: "Commission %" },
      { key: "total_orders", label: "Orders" }, { key: "revenue", label: "Revenue (₹)" },
      { key: "rating", label: "Rating" }, { key: "status", label: "Status" },
    ], "vendor_performance");
  };

  return (
    <AdminLayout>
      <div className="page-header">
        <div>
          <h1 className="page-title">Vendor Performance</h1>
          <p className="page-description">{vendors.length} vendors · Revenue, ratings, and plan details</p>
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
            <Card className="p-4"><span className="text-xs text-muted-foreground">Total Vendors</span><p className="text-xl font-bold mt-1">{vendors.length}</p></Card>
            <Card className="p-4"><span className="text-xs text-muted-foreground">Total Revenue</span><p className="text-xl font-bold mt-1">₹{vendors.reduce((s, v) => s + v.total_revenue, 0).toLocaleString('en-IN')}</p></Card>
            <Card className="p-4"><span className="text-xs text-muted-foreground">Total Orders</span><p className="text-xl font-bold mt-1">{vendors.reduce((s, v) => s + v.total_orders, 0).toLocaleString()}</p></Card>
            <Card className="p-4"><span className="text-xs text-muted-foreground">Avg Rating</span><p className="text-xl font-bold mt-1">⭐ {vendors.length > 0 ? (vendors.reduce((s, v) => s + v.rating, 0) / vendors.filter(v => v.rating > 0).length || 0).toFixed(1) : '0'}</p></Card>
          </>
        )}
      </div>

      {!loading && chartData.length > 0 && (
        <Card className="p-5 mb-6">
          <h3 className="text-sm font-semibold mb-4">Top Vendors by Revenue</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={chartData} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis type="number" tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`} />
              <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" width={110} />
              <Tooltip formatter={(v: number) => [`₹${v.toLocaleString('en-IN')}`]} />
              <Bar dataKey="revenue" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Card>
      )}

      {!loading && (
        <Card className="p-5">
          <h3 className="text-sm font-semibold mb-4">Vendor Summary</h3>
          <div className="overflow-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border/50">
                  <th className="text-left py-2 text-xs text-muted-foreground font-medium">Vendor</th>
                  <th className="text-left py-2 text-xs text-muted-foreground font-medium">Plan</th>
                  <th className="text-right py-2 text-xs text-muted-foreground font-medium">Commission</th>
                  <th className="text-right py-2 text-xs text-muted-foreground font-medium">Revenue</th>
                  <th className="text-right py-2 text-xs text-muted-foreground font-medium">Orders</th>
                  <th className="text-right py-2 text-xs text-muted-foreground font-medium">Rating</th>
                  <th className="text-center py-2 text-xs text-muted-foreground font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {vendors.map((v) => (
                  <tr key={v.id} className="border-b border-border/30">
                    <td className="py-2 font-medium">{v.business_name || v.name}</td>
                    <td className="py-2 text-xs">{v.plan_name}</td>
                    <td className="py-2 text-right">{v.commission_rate}%</td>
                    <td className="py-2 text-right font-medium">₹{v.total_revenue.toLocaleString('en-IN')}</td>
                    <td className="py-2 text-right">{v.total_orders}</td>
                    <td className="py-2 text-right">{v.rating > 0 ? `⭐ ${v.rating.toFixed(1)}` : '—'}</td>
                    <td className="py-2 text-center"><StatusBadge status={v.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
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
