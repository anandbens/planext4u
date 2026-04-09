import { useState, useEffect } from "react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { CreditCard, CheckCircle, XCircle, Percent } from "lucide-react";
import { format, subDays, startOfDay, endOfDay, parseISO } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import ReportDataGrid, { Column } from "@/components/admin/ReportDataGrid";

interface PaymentRow {
  id: string; created_at: string; customer_name: string; vendor_name: string;
  status: string; subtotal: number; total: number; discount: number;
  platform_fee: number; gst_on_platform_fee: number; tax: number;
  payment_reference_id: string; razorpay_order_id: string;
}

const statusColors: Record<string, string> = {
  placed: "bg-primary/10 text-primary", paid: "bg-success/10 text-success",
  accepted: "bg-info/10 text-info", delivered: "bg-success/10 text-success",
  completed: "bg-success/10 text-success", cancelled: "bg-destructive/10 text-destructive",
  in_progress: "bg-warning/10 text-warning",
};

export default function PaymentReportPage() {
  const [dateFrom, setDateFrom] = useState<Date>(subDays(new Date(), 30));
  const [dateTo, setDateTo] = useState<Date>(new Date());
  const [statusFilter, setStatusFilter] = useState("all");
  const [rows, setRows] = useState<PaymentRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      let q = supabase.from("orders")
        .select("id, created_at, customer_name, vendor_name, status, subtotal, total, discount, platform_fee, gst_on_platform_fee, tax, payment_reference_id, razorpay_order_id")
        .gte("created_at", startOfDay(dateFrom).toISOString())
        .lte("created_at", endOfDay(dateTo).toISOString())
        .order("created_at", { ascending: false });
      if (statusFilter !== "all") q = q.eq("status", statusFilter);
      const { data } = await q;
      setRows((data || []).map((o: any) => ({ ...o, platform_fee: o.platform_fee || 0, gst_on_platform_fee: o.gst_on_platform_fee || 0 })));
      setLoading(false);
    };
    fetchData();
  }, [dateFrom, dateTo, statusFilter]);

  const totalTxn = rows.length;
  const successCount = rows.filter(o => !["cancelled"].includes(o.status)).length;
  const cancelledCount = rows.filter(o => o.status === "cancelled").length;
  const successRate = totalTxn > 0 ? ((successCount / totalTxn) * 100).toFixed(1) : "0";
  const totalCollected = rows.filter(o => o.status !== "cancelled").reduce((s, o) => s + Number(o.total || 0), 0);

  const columns: Column<PaymentRow>[] = [
    { key: "id", label: "Order ID", sortable: true, render: r => <span className="font-mono text-xs">{r.id}</span> },
    { key: "created_at", label: "Date", sortable: true, render: r => format(parseISO(r.created_at), "dd MMM yyyy, HH:mm") },
    { key: "customer_name", label: "Customer", sortable: true, render: r => r.customer_name || "—" },
    { key: "vendor_name", label: "Vendor", sortable: true, render: r => r.vendor_name || "—" },
    { key: "subtotal", label: "Subtotal (₹)", sortable: true, align: "right", render: r => `₹${Number(r.subtotal || 0).toLocaleString("en-IN")}` },
    { key: "platform_fee", label: "Platform Fee (₹)", sortable: true, align: "right", render: r => `₹${r.platform_fee.toLocaleString("en-IN")}` },
    { key: "gst_on_platform_fee", label: "GST on PF (₹)", sortable: true, align: "right", render: r => `₹${r.gst_on_platform_fee.toLocaleString("en-IN")}` },
    { key: "total", label: "Total (₹)", sortable: true, align: "right", render: r => <span className="font-semibold">₹{Number(r.total || 0).toLocaleString("en-IN")}</span> },
    { key: "payment_reference_id", label: "Payment Ref", render: r => r.payment_reference_id ? <span className="font-mono text-xs">{r.payment_reference_id}</span> : "—" },
    { key: "razorpay_order_id", label: "Gateway Order ID", render: r => r.razorpay_order_id ? <span className="font-mono text-xs">{r.razorpay_order_id}</span> : "—" },
    { key: "status", label: "Status", sortable: true, align: "center", render: r => <Badge className={(statusColors[r.status] || "bg-muted") + " border-0 text-[10px]"}>{r.status.replace("_", " ")}</Badge> },
  ];

  return (
    <AdminLayout>
      <ReportDataGrid
        title="Payment Report"
        subtitle="Payment transactions, gateway references, and reconciliation"
        data={rows} columns={columns} loading={loading}
        searchPlaceholder="Search by order ID, customer, payment ref..."
        searchKeys={["id", "customer_name", "vendor_name", "payment_reference_id", "razorpay_order_id"]}
        dateFrom={dateFrom} dateTo={dateTo}
        onDateFromChange={setDateFrom} onDateToChange={setDateTo}
        statusFilter={{ value: statusFilter, onChange: setStatusFilter, options: [
          { label: "Placed", value: "placed" }, { label: "Paid", value: "paid" },
          { label: "Completed", value: "completed" }, { label: "Cancelled", value: "cancelled" },
        ] }}
        exportFilename="payment_report"
        summaryCards={
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {loading ? Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-20 rounded-xl" />) : (<>
              <MiniStat icon={CreditCard} label="Total Transactions" value={totalTxn.toLocaleString()} />
              <MiniStat icon={CheckCircle} label="Successful" value={successCount.toLocaleString()} />
              <MiniStat icon={Percent} label="Success Rate" value={`${successRate}%`} />
              <MiniStat icon={XCircle} label="Cancelled" value={cancelledCount.toLocaleString()} />
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
