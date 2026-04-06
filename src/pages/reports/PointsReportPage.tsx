import { useState, useEffect } from "react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Download, CalendarIcon, Search, ChevronLeft, ChevronRight } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { exportToCSV } from "@/lib/csv";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { format, subDays, startOfDay, endOfDay, eachMonthOfInterval, parseISO, startOfMonth } from "date-fns";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

const typeStyle: Record<string, string> = {
  welcome: "bg-primary/10 text-primary",
  referral: "bg-info/10 text-info",
  order_reward: "bg-success/10 text-success",
  redemption: "bg-destructive/10 text-destructive",
};

export default function PointsReportPage() {
  const [dateFrom, setDateFrom] = useState<Date>(subDays(new Date(), 180));
  const [dateTo, setDateTo] = useState<Date>(new Date());
  const [stats, setStats] = useState({ issued: 0, redeemed: 0, outstanding: 0 });
  const [monthlyData, setMonthlyData] = useState<any[]>([]);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const perPage = 10;

  // Stats + chart
  useEffect(() => {
    const fetch = async () => {
      setLoading(true);
      const from = startOfDay(dateFrom).toISOString();
      const to = endOfDay(dateTo).toISOString();

      const { data: pts } = await supabase.from("points_transactions").select("points, type, created_at")
        .gte("created_at", from).lte("created_at", to);

      const all = pts || [];
      const issued = all.filter(p => p.points > 0).reduce((s, p) => s + p.points, 0);
      const redeemed = Math.abs(all.filter(p => p.points < 0).reduce((s, p) => s + p.points, 0));

      // Outstanding = total wallet balance across all customers
      const { data: customers } = await supabase.from("customers").select("wallet_points");
      const outstanding = (customers || []).reduce((s, c) => s + (c.wallet_points || 0), 0);
      setStats({ issued, redeemed, outstanding });

      // Monthly chart
      const months = eachMonthOfInterval({ start: dateFrom, end: dateTo });
      const monthMap = new Map<string, { issued: number; redeemed: number }>();
      months.forEach(m => monthMap.set(format(m, "yyyy-MM"), { issued: 0, redeemed: 0 }));
      all.forEach(p => {
        const key = format(startOfMonth(parseISO(p.created_at)), "yyyy-MM");
        const entry = monthMap.get(key);
        if (entry) {
          if (p.points > 0) entry.issued += p.points;
          else entry.redeemed += Math.abs(p.points);
        }
      });

      const md: any[] = [];
      monthMap.forEach((v, k) => md.push({ month: format(parseISO(k + "-01"), "MMM yy"), issued: v.issued, redeemed: v.redeemed }));
      setMonthlyData(md);
      setLoading(false);
    };
    fetch();
  }, [dateFrom, dateTo]);

  // Paginated transactions list
  useEffect(() => {
    const fetch = async () => {
      const from = startOfDay(dateFrom).toISOString();
      const to = endOfDay(dateTo).toISOString();
      const offset = (page - 1) * perPage;

      let query = supabase.from("points_transactions").select("*", { count: "exact" })
        .gte("created_at", from).lte("created_at", to);
      if (typeFilter !== "all") query = query.eq("type", typeFilter);
      if (search) query = query.or(`user_name.ilike.%${search}%,description.ilike.%${search}%`);
      query = query.order("created_at", { ascending: false }).range(offset, offset + perPage - 1);

      const { data, count } = await query;
      setTransactions(data || []);
      setTotal(count || 0);
    };
    fetch();
  }, [dateFrom, dateTo, typeFilter, search, page]);

  const handleExportAll = async () => {
    const from = startOfDay(dateFrom).toISOString();
    const to = endOfDay(dateTo).toISOString();
    let query = supabase.from("points_transactions").select("*")
      .gte("created_at", from).lte("created_at", to).order("created_at", { ascending: false });
    if (typeFilter !== "all") query = query.eq("type", typeFilter);
    if (search) query = query.or(`user_name.ilike.%${search}%,description.ilike.%${search}%`);
    const { data } = await query;
    if (!data?.length) return;
    exportToCSV(data, [
      { key: "id", label: "ID" }, { key: "user_name", label: "Customer" },
      { key: "type", label: "Type" }, { key: "points", label: "Points" },
      { key: "description", label: "Description" }, { key: "created_at", label: "Date" },
    ], "points_statement");
  };

  const totalPages = Math.ceil(total / perPage);

  return (
    <AdminLayout>
      <div className="page-header">
        <div>
          <h1 className="page-title">Points Report</h1>
          <p className="page-description">Points issued, redeemed, and balance overview</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <DatePicker label="From" date={dateFrom} setDate={setDateFrom} />
          <DatePicker label="To" date={dateTo} setDate={setDateTo} />
          <Button onClick={handleExportAll} variant="outline" size="sm"><Download className="h-4 w-4 mr-1" /> Export All</Button>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4 mb-6">
        {loading ? Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-24 rounded-xl" />) : (
          <>
            <Card className="p-4"><span className="text-xs text-muted-foreground">Total Issued</span><p className="text-xl font-bold mt-1 text-success">{stats.issued.toLocaleString('en-IN')}</p></Card>
            <Card className="p-4"><span className="text-xs text-muted-foreground">Total Redeemed</span><p className="text-xl font-bold mt-1 text-destructive">{stats.redeemed.toLocaleString('en-IN')}</p></Card>
            <Card className="p-4"><span className="text-xs text-muted-foreground">Outstanding Balance</span><p className="text-xl font-bold mt-1">{stats.outstanding.toLocaleString('en-IN')}</p></Card>
          </>
        )}
      </div>

      {!loading && (
        <Card className="p-5 mb-6">
          <h3 className="text-sm font-semibold mb-4">Points Issued vs Redeemed</h3>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={monthlyData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="month" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
              <YAxis tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
              <Tooltip />
              <Bar dataKey="issued" fill="hsl(var(--success))" radius={[4, 4, 0, 0]} name="Issued" />
              <Bar dataKey="redeemed" fill="hsl(var(--destructive))" radius={[4, 4, 0, 0]} name="Redeemed" />
            </BarChart>
          </ResponsiveContainer>
        </Card>
      )}

      {/* Transaction log */}
      <Card className="p-5">
        <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
          <h3 className="text-sm font-semibold">Points Statement</h3>
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input placeholder="Search customer..." className="pl-8 h-8 w-48 text-xs" value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} />
            </div>
            <Select value={typeFilter} onValueChange={(v) => { setTypeFilter(v); setPage(1); }}>
              <SelectTrigger className="h-8 w-36 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="welcome">Welcome</SelectItem>
                <SelectItem value="referral">Referral</SelectItem>
                <SelectItem value="order_reward">Order Reward</SelectItem>
                <SelectItem value="redemption">Redemption</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="space-y-2">
          {transactions.map((t) => (
            <div key={t.id} className="flex items-center justify-between p-3 rounded-lg bg-secondary/20">
              <div className="flex items-center gap-3">
                <Badge className={`${typeStyle[t.type] || ''} border-0 text-[10px]`}>{t.type?.replace(/_/g, ' ')}</Badge>
                <div>
                  <p className="text-sm font-medium">{t.user_name || 'Unknown'}</p>
                  <p className="text-xs text-muted-foreground">{t.description}</p>
                </div>
              </div>
              <div className="text-right">
                <p className={`text-sm font-bold ${t.points >= 0 ? 'text-success' : 'text-destructive'}`}>
                  {t.points >= 0 ? '+' : ''}{t.points}
                </p>
                <p className="text-[10px] text-muted-foreground">{format(parseISO(t.created_at), "dd MMM yy, HH:mm")}</p>
              </div>
            </div>
          ))}
          {transactions.length === 0 && <p className="text-sm text-muted-foreground text-center py-4">No transactions found</p>}
        </div>

        {totalPages > 1 && (
          <div className="flex items-center justify-between pt-3 mt-3 border-t border-border/50">
            <span className="text-xs text-muted-foreground">Page {page} of {totalPages} · {total} total</span>
            <div className="flex gap-1">
              <Button variant="outline" size="icon" className="h-7 w-7" disabled={page <= 1} onClick={() => setPage(p => p - 1)}><ChevronLeft className="h-3 w-3" /></Button>
              <Button variant="outline" size="icon" className="h-7 w-7" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}><ChevronRight className="h-3 w-3" /></Button>
            </div>
          </div>
        )}
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
