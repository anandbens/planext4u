import { useState, useEffect } from "react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { DollarSign, ShoppingCart, TrendingUp, Percent, FileDown } from "lucide-react";
import { format, subDays, startOfDay, endOfDay, parseISO } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import ReportDataGrid, { Column } from "@/components/admin/ReportDataGrid";
import { Button } from "@/components/ui/button";
import { downloadOrdersSummaryPdf } from "@/lib/orders-summary-pdf";

interface OrderRow {
  id: string; created_at: string; customer_name: string; customer_mobile: string; vendor_name: string;
  status: string; subtotal: number; discount: number; tax: number;
  platform_fee: number; gst_on_platform_fee: number; total: number;
  points_used: number; payment_reference_id: string; items_count: number;
  coupon_code: string | null;
}

const statusColors: Record<string, string> = {
  placed: "bg-primary/10 text-primary", paid: "bg-info/10 text-info",
  accepted: "bg-info/10 text-info", in_progress: "bg-warning/10 text-warning",
  delivered: "bg-success/10 text-success", completed: "bg-success/10 text-success",
  cancelled: "bg-destructive/10 text-destructive",
};

export default function SalesReportPage() {
  const [dateFrom, setDateFrom] = useState<Date>(subDays(new Date(), 30));
  const [dateTo, setDateTo] = useState<Date>(new Date());
  const [statusFilter, setStatusFilter] = useState("all");
  const [rows, setRows] = useState<OrderRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      let q = supabase.from("orders")
        .select("id, created_at, customer_id, customer_name, vendor_name, status, subtotal, discount, tax, platform_fee, gst_on_platform_fee, total, points_used, payment_reference_id, items, coupon_code, customers(mobile)")
        .gte("created_at", startOfDay(dateFrom).toISOString())
        .lte("created_at", endOfDay(dateTo).toISOString())
        .order("created_at", { ascending: false });
      if (statusFilter !== "all") q = q.eq("status", statusFilter);
      const { data } = await q;
      setRows((data || []).map((o: any) => ({
        ...o,
        customer_mobile: o.customers?.mobile || "",
        platform_fee: o.platform_fee || 0,
        gst_on_platform_fee: o.gst_on_platform_fee || 0,
        items_count: Array.isArray(o.items) ? o.items.length : 0,
      })));
      setLoading(false);
    };
    fetchData();
  }, [dateFrom, dateTo, statusFilter]);

  const totalRevenue = rows.reduce((s, o) => s + Number(o.total || 0), 0);
  const totalOrders = rows.length;
  const avgOrder = totalOrders > 0 ? Math.round(totalRevenue / totalOrders) : 0;
  const completedCount = rows.filter(o => ["completed", "delivered"].includes(o.status)).length;
  const completionRate = totalOrders > 0 ? ((completedCount / totalOrders) * 100).toFixed(1) : "0";

  const columns: Column<OrderRow>[] = [
    { key: "id", label: "Order ID", sortable: true, render: r => <span className="font-mono text-xs">{r.id}</span> },
    { key: "created_at", label: "Date", sortable: true, render: r => format(parseISO(r.created_at), "dd MMM yyyy, HH:mm") },
    { key: "customer_name", label: "Customer", sortable: true, render: r => r.customer_name || "—" },
    { key: "customer_mobile", label: "Mobile", sortable: true, render: r => r.customer_mobile ? <span className="font-mono text-xs">{r.customer_mobile}</span> : "—" },
    { key: "vendor_name", label: "Vendor", sortable: true, render: r => r.vendor_name || "—" },
    { key: "items_count", label: "Items", sortable: true, align: "center" },
    { key: "subtotal", label: "Subtotal (₹)", sortable: true, align: "right", render: r => `₹${Number(r.subtotal || 0).toLocaleString("en-IN")}` },
    { key: "discount", label: "Discount (₹)", sortable: true, align: "right", render: r => r.discount > 0 ? `₹${r.discount.toLocaleString("en-IN")}` : "—" },
    { key: "tax", label: "Tax (₹)", sortable: true, align: "right", render: r => `₹${Number(r.tax || 0).toLocaleString("en-IN")}` },
    { key: "platform_fee", label: "Platform Fee (₹)", sortable: true, align: "right", render: r => `₹${r.platform_fee.toLocaleString("en-IN")}` },
    { key: "gst_on_platform_fee", label: "GST on PF (₹)", sortable: true, align: "right", render: r => `₹${r.gst_on_platform_fee.toLocaleString("en-IN")}` },
    { key: "points_used", label: "Points Used", sortable: true, align: "right", render: r => r.points_used > 0 ? String(r.points_used) : "—" },
    { key: "total", label: "Grand Total (₹)", sortable: true, align: "right", render: r => <span className="font-semibold">₹{Number(r.total || 0).toLocaleString("en-IN")}</span> },
    { key: "payment_reference_id", label: "Payment Ref", render: r => r.payment_reference_id ? <span className="font-mono text-xs">{r.payment_reference_id}</span> : "—" },
    { key: "status", label: "Status", sortable: true, align: "center", render: r => <Badge className={(statusColors[r.status] || "bg-muted") + " border-0 text-[10px]"}>{r.status.replace("_", " ")}</Badge> },
  ];

  return (
    <AdminLayout>
      <ReportDataGrid
        title="Sales Report"
        subtitle={`${totalOrders} orders · ₹${totalRevenue.toLocaleString("en-IN")} revenue`}
        data={rows}
        columns={columns}
        loading={loading}
        searchPlaceholder="Search by order ID, customer, vendor..."
        searchKeys={["id", "customer_name", "vendor_name", "payment_reference_id"]}
        dateFrom={dateFrom}
        dateTo={dateTo}
        onDateFromChange={setDateFrom}
        onDateToChange={setDateTo}
        statusFilter={{
          value: statusFilter,
          onChange: setStatusFilter,
          options: [
            { label: "Placed", value: "placed" }, { label: "Paid", value: "paid" },
            { label: "Accepted", value: "accepted" }, { label: "In Progress", value: "in_progress" },
            { label: "Delivered", value: "delivered" }, { label: "Completed", value: "completed" },
            { label: "Cancelled", value: "cancelled" },
          ],
        }}
        exportFilename="sales_report"
        summaryCards={
          <div className="space-y-3">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {loading ? Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-20 rounded-xl" />) : (<>
                <MiniStat icon={DollarSign} label="Total Revenue" value={`₹${totalRevenue.toLocaleString("en-IN")}`} />
                <MiniStat icon={ShoppingCart} label="Total Orders" value={totalOrders.toLocaleString()} />
                <MiniStat icon={TrendingUp} label="Avg Order Value" value={`₹${avgOrder.toLocaleString("en-IN")}`} />
                <MiniStat icon={Percent} label="Completion Rate" value={`${completionRate}%`} />
              </>)}
            </div>
            <div className="flex justify-end">
              <Button
                size="sm"
                variant="outline"
                disabled={loading || rows.length === 0}
                onClick={() => downloadOrdersSummaryPdf(
                  rows.map(r => ({
                    id: r.id, date: r.created_at,
                    customer_name: r.customer_name, vendor_name: r.vendor_name,
                    coupon_code: r.coupon_code,
                    subtotal: Number(r.subtotal || 0),
                    discount: Number(r.discount || 0),
                    total: Number(r.total || 0),
                    status: r.status,
                  })),
                  {
                    title: "Sales Summary",
                    subtitle: `${format(dateFrom, "dd MMM yyyy")} — ${format(dateTo, "dd MMM yyyy")}`,
                    showVendorColumn: true,
                    showCustomerColumn: true,
                    filename: "p4u-sales-summary",
                  }
                )}
              >
                <FileDown className="h-4 w-4 mr-2" /> Download PDF
              </Button>
            </div>
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
