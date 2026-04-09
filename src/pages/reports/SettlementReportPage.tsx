import { useState, useEffect } from "react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { DollarSign, Clock, CheckCircle, AlertTriangle } from "lucide-react";
import { format, subDays, startOfDay, endOfDay, parseISO } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import ReportDataGrid, { Column } from "@/components/admin/ReportDataGrid";

interface SettlementRow {
  id: string; created_at: string; vendor_id: string; vendor_name: string;
  order_id: string; amount: number; commission: number; net_amount: number;
  status: string; settled_at: string;
}

const stlColors: Record<string, string> = {
  settled: "bg-success/10 text-success", pending: "bg-warning/10 text-warning",
  on_hold: "bg-destructive/10 text-destructive",
};

export default function SettlementReportPage() {
  const [dateFrom, setDateFrom] = useState<Date>(subDays(new Date(), 90));
  const [dateTo, setDateTo] = useState<Date>(new Date());
  const [statusFilter, setStatusFilter] = useState("all");
  const [rows, setRows] = useState<SettlementRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      let q = supabase.from("settlements")
        .select("id, created_at, vendor_id, vendor_name, order_id, amount, commission, net_amount, status, settled_at")
        .gte("created_at", startOfDay(dateFrom).toISOString())
        .lte("created_at", endOfDay(dateTo).toISOString())
        .order("created_at", { ascending: false });
      if (statusFilter !== "all") q = q.eq("status", statusFilter);
      const { data } = await q;
      setRows((data || []).map((s: any) => ({ ...s, amount: Number(s.amount || 0), commission: Number(s.commission || 0), net_amount: Number(s.net_amount || 0) })));
      setLoading(false);
    };
    fetchData();
  }, [dateFrom, dateTo, statusFilter]);

  const totalSettled = rows.filter(s => s.status === "settled").reduce((a, s) => a + s.net_amount, 0);
  const totalPending = rows.filter(s => s.status === "pending").reduce((a, s) => a + s.net_amount, 0);
  const totalCommission = rows.reduce((a, s) => a + s.commission, 0);
  const onHold = rows.filter(s => s.status === "on_hold").reduce((a, s) => a + s.net_amount, 0);

  const columns: Column<SettlementRow>[] = [
    { key: "id", label: "Settlement ID", sortable: true, render: r => <span className="font-mono text-xs">{r.id}</span> },
    { key: "created_at", label: "Date", sortable: true, render: r => format(parseISO(r.created_at), "dd MMM yyyy") },
    { key: "vendor_name", label: "Vendor", sortable: true, render: r => r.vendor_name || r.vendor_id },
    { key: "order_id", label: "Order ID", sortable: true, render: r => <span className="font-mono text-xs">{r.order_id}</span> },
    { key: "amount", label: "Order Amount (₹)", sortable: true, align: "right", render: r => `₹${r.amount.toLocaleString("en-IN")}` },
    { key: "commission", label: "Commission (₹)", sortable: true, align: "right", render: r => `₹${r.commission.toLocaleString("en-IN")}` },
    { key: "net_amount", label: "Net Payout (₹)", sortable: true, align: "right", render: r => <span className="font-semibold">₹{r.net_amount.toLocaleString("en-IN")}</span> },
    { key: "settled_at", label: "Settled On", sortable: true, render: r => r.settled_at ? format(parseISO(r.settled_at), "dd MMM yyyy") : "—" },
    { key: "status", label: "Status", sortable: true, align: "center", render: r => <Badge className={(stlColors[r.status] || "bg-muted") + " border-0 text-[10px]"}>{r.status.replace("_", " ")}</Badge> },
  ];

  return (
    <AdminLayout>
      <ReportDataGrid
        title="Settlement Report"
        subtitle="Payouts, commissions, and vendor settlements"
        data={rows} columns={columns} loading={loading}
        searchPlaceholder="Search by vendor, order ID, settlement ID..."
        searchKeys={["id", "vendor_name", "vendor_id", "order_id"]}
        dateFrom={dateFrom} dateTo={dateTo}
        onDateFromChange={setDateFrom} onDateToChange={setDateTo}
        statusFilter={{ value: statusFilter, onChange: setStatusFilter, options: [
          { label: "Settled", value: "settled" }, { label: "Pending", value: "pending" }, { label: "On Hold", value: "on_hold" },
        ] }}
        exportFilename="settlement_report"
        summaryCards={
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {loading ? Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-20 rounded-xl" />) : (<>
              <MiniStat icon={CheckCircle} label="Total Settled" value={`₹${totalSettled.toLocaleString("en-IN")}`} />
              <MiniStat icon={Clock} label="Pending" value={`₹${totalPending.toLocaleString("en-IN")}`} />
              <MiniStat icon={DollarSign} label="Total Commission" value={`₹${totalCommission.toLocaleString("en-IN")}`} />
              <MiniStat icon={AlertTriangle} label="On Hold" value={`₹${onHold.toLocaleString("en-IN")}`} />
            </>)}
          </div>
        }
      />
    </AdminLayout>
  );
}

function MiniStat({ icon: Icon, label, value }: { icon: any; label: string; value: string }) {
  return (
    <Card className="p-4">
      <div className="flex items-center justify-between mb-1"><span className="text-xs text-muted-foreground">{label}</span><Icon className="h-4 w-4 text-muted-foreground" /></div>
      <p className="text-xl font-bold">{value}</p>
    </Card>
  );
}
