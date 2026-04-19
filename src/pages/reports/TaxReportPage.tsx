import { useState, useEffect } from "react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { FileText, DollarSign, ShoppingCart, Percent } from "lucide-react";
import { format, subDays, startOfDay, endOfDay, parseISO } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import ReportDataGrid, { Column } from "@/components/admin/ReportDataGrid";

interface TaxRow {
  id: string; created_at: string; customer_name: string; vendor_name: string;
  status: string; subtotal: number; tax: number; platform_fee: number;
  gst_on_platform_fee: number; total: number;
}

export default function TaxReportPage() {
  const [dateFrom, setDateFrom] = useState<Date>(subDays(new Date(), 180));
  const [dateTo, setDateTo] = useState<Date>(new Date());
  const [rows, setRows] = useState<TaxRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      const { data } = await supabase.from("orders")
        .select("id, created_at, customer_name, vendor_name, status, subtotal, tax, platform_fee, gst_on_platform_fee, total")
        .gte("created_at", startOfDay(dateFrom).toISOString())
        .lte("created_at", endOfDay(dateTo).toISOString())
        .order("created_at", { ascending: false });
      setRows((data || []).map((o: any) => ({ ...o, platform_fee: o.platform_fee || 0, gst_on_platform_fee: o.gst_on_platform_fee || 0 })));
      setLoading(false);
    };
    fetchData();
  }, [dateFrom, dateTo]);

  const totalProductTax = rows.reduce((s, r) => s + Number(r.tax || 0), 0);
  const totalGstOnPF = rows.reduce((s, r) => s + r.gst_on_platform_fee, 0);
  const totalPlatformFee = rows.reduce((s, r) => s + r.platform_fee, 0);
  const totalTaxCollected = totalProductTax + totalGstOnPF;

  const columns: Column<TaxRow>[] = [
    { key: "id", label: "Order ID", sortable: true, render: r => <span className="font-mono text-xs">{r.id}</span> },
    { key: "created_at", label: "Date", sortable: true, render: r => format(parseISO(r.created_at), "dd MMM yyyy") },
    { key: "customer_name", label: "Customer", sortable: true, render: r => r.customer_name || "—" },
    { key: "vendor_name", label: "Vendor", sortable: true, render: r => r.vendor_name || "—" },
    { key: "subtotal", label: "Subtotal (₹)", sortable: true, align: "right", render: r => `₹${Number(r.subtotal || 0).toLocaleString("en-IN")}` },
    { key: "tax", label: "Product Tax (₹)", sortable: true, align: "right", render: r => <span className="font-semibold">₹{Number(r.tax || 0).toLocaleString("en-IN")}</span> },
    { key: "platform_fee", label: "Platform Fee (₹)", sortable: true, align: "right", render: r => `₹${r.platform_fee.toLocaleString("en-IN")}` },
    { key: "gst_on_platform_fee", label: "GST on PF (₹)", sortable: true, align: "right", render: r => <span className="font-semibold">₹{r.gst_on_platform_fee.toLocaleString("en-IN")}</span> },
    { key: "total", label: "Order Total (₹)", sortable: true, align: "right", render: r => `₹${Number(r.total || 0).toLocaleString("en-IN")}` },
    { key: "status", label: "Status", sortable: true, align: "center", render: r => <Badge className={`border-0 text-[10px] ${["completed", "delivered"].includes(r.status) ? "bg-success/10 text-success" : r.status === "cancelled" ? "bg-destructive/10 text-destructive" : "bg-warning/10 text-warning"}`}>{r.status.replace("_", " ")}</Badge> },
  ];

  return (
    <AdminLayout>
      <ReportDataGrid
        title="Tax Report"
        subtitle="Product tax, GST on platform fee, and tax collection summary"
        data={rows} columns={columns} loading={loading}
        searchPlaceholder="Search by order ID, customer, vendor..."
        searchKeys={["id", "customer_name", "vendor_name"]}
        dateFrom={dateFrom} dateTo={dateTo}
        onDateFromChange={setDateFrom} onDateToChange={setDateTo}
        exportFilename="tax_report"
        summaryCards={
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {loading ? Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-20 rounded-xl" />) : (<>
              <MiniStat icon={FileText} label="Total Tax Collected" value={`₹${totalTaxCollected.toLocaleString("en-IN")}`} />
              <MiniStat icon={DollarSign} label="Product Tax" value={`₹${totalProductTax.toLocaleString("en-IN")}`} />
              <MiniStat icon={Percent} label="GST on Platform Fee" value={`₹${totalGstOnPF.toLocaleString("en-IN")}`} />
              <MiniStat icon={ShoppingCart} label="Total Orders" value={rows.length.toLocaleString()} />
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
