import { useState, useEffect } from "react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DollarSign, TrendingUp, Percent, Download, Store, Package } from "lucide-react";
import { format, subDays, startOfDay, endOfDay, parseISO } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import ReportDataGrid, { Column } from "@/components/admin/ReportDataGrid";
import { exportCSV } from "@/lib/csv";

interface OrderRow {
  id: string; created_at: string; customer_name: string; vendor_name: string; vendor_id: string;
  status: string; subtotal: number; discount: number; tax: number;
  platform_fee: number; gst_on_platform_fee: number; total: number;
  points_used: number; effective_commission: number; effective_max_redemption: number;
  commission_source: string; redemption_source: string;
  items: any[];
  commission_revenue: number;
}

const sourceLabel = (s: string) => {
  switch (s) {
    case 'product': return 'Product Level';
    case 'vendor': return 'Vendor Level';
    default: return 'Plan Level';
  }
};

const sourceBadge = (s: string) => {
  const colors: Record<string, string> = {
    plan: 'bg-primary/10 text-primary',
    vendor: 'bg-warning/10 text-warning',
    product: 'bg-info/10 text-info',
  };
  return <Badge className={`border-0 text-[9px] ${colors[s] || colors.plan}`}>{sourceLabel(s)}</Badge>;
};

export default function P4URevenueReportPage() {
  const [dateFrom, setDateFrom] = useState<Date>(subDays(new Date(), 30));
  const [dateTo, setDateTo] = useState<Date>(new Date());
  const [rows, setRows] = useState<OrderRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("orders");

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      const { data } = await supabase.from("orders")
        .select("*")
        .gte("created_at", startOfDay(dateFrom).toISOString())
        .lte("created_at", endOfDay(dateTo).toISOString())
        .in("status", ["placed", "accepted", "in_progress", "delivered", "completed"])
        .order("created_at", { ascending: false });
      setRows((data || []).map((o: any) => ({
        ...o,
        platform_fee: o.platform_fee || 0,
        gst_on_platform_fee: o.gst_on_platform_fee || 0,
        effective_commission: o.effective_commission || 0,
        effective_max_redemption: o.effective_max_redemption || 0,
        commission_source: o.commission_source || 'plan',
        redemption_source: o.redemption_source || 'plan',
        items: o.items || [],
        commission_revenue: Math.round((o.subtotal || 0) * (o.effective_commission || 0) / 100),
      })));
      setLoading(false);
    };
    fetchData();
  }, [dateFrom, dateTo]);

  // Summary metrics
  const totalRevenue = rows.reduce((s, r) => s + r.total, 0);
  const totalCommission = rows.reduce((s, r) => s + r.commission_revenue, 0);
  const totalPlatformFee = rows.reduce((s, r) => s + r.platform_fee + r.gst_on_platform_fee, 0);
  const netProfit = totalCommission + totalPlatformFee;
  const totalPointsRedeemed = rows.reduce((s, r) => s + r.points_used, 0);

  // Vendor-wise aggregation
  const vendorMap = new Map<string, { vendor: string; orders: number; revenue: number; commission: number; platformFee: number; netProfit: number }>();
  rows.forEach(r => {
    const existing = vendorMap.get(r.vendor_id) || { vendor: r.vendor_name, orders: 0, revenue: 0, commission: 0, platformFee: 0, netProfit: 0 };
    existing.orders++;
    existing.revenue += r.total;
    existing.commission += r.commission_revenue;
    existing.platformFee += r.platform_fee + r.gst_on_platform_fee;
    existing.netProfit = existing.commission + existing.platformFee;
    vendorMap.set(r.vendor_id, existing);
  });
  const vendorRows = Array.from(vendorMap.entries()).map(([id, v]) => ({ id, ...v }));

  // Product-wise aggregation
  const productMap = new Map<string, { title: string; vendor: string; qty: number; revenue: number; commissionPct: number; commission: number }>();
  rows.forEach(r => {
    (r.items || []).forEach((item: any) => {
      const key = item.id || item.title;
      const existing = productMap.get(key) || { title: item.title, vendor: r.vendor_name, qty: 0, revenue: 0, commissionPct: r.effective_commission, commission: 0 };
      existing.qty += item.qty || 1;
      const itemRevenue = (item.price || 0) * (item.qty || 1);
      existing.revenue += itemRevenue;
      existing.commission += Math.round(itemRevenue * r.effective_commission / 100);
      productMap.set(key, existing);
    });
  });
  const productRows = Array.from(productMap.entries()).map(([id, p]) => ({ id, ...p }));

  const orderColumns: Column[] = [
    { key: "id", label: "Order ID", sortable: true, render: r => <span className="font-mono text-[10px]">{r.id}</span> },
    { key: "created_at", label: "Date", sortable: true, render: r => format(parseISO(r.created_at), "dd MMM yyyy") },
    { key: "vendor_name", label: "Vendor", sortable: true },
    { key: "customer_name", label: "Customer", sortable: true },
    { key: "subtotal", label: "Subtotal", sortable: true, align: "right", render: r => `₹${r.subtotal.toLocaleString("en-IN")}` },
    { key: "effective_commission", label: "Commission %", sortable: true, align: "right", render: r => `${r.effective_commission}%` },
    { key: "commission_source", label: "Commission Source", render: r => sourceBadge(r.commission_source) },
    { key: "commission_revenue", label: "Commission ₹", sortable: true, align: "right", render: r => <span className="font-semibold text-success">₹{r.commission_revenue.toLocaleString("en-IN")}</span> },
    { key: "effective_max_redemption", label: "Max Redemption %", sortable: true, align: "right", render: r => `${r.effective_max_redemption}%` },
    { key: "redemption_source", label: "Redemption Source", render: r => sourceBadge(r.redemption_source) },
    { key: "points_used", label: "Points Used", sortable: true, align: "right" },
    { key: "platform_fee", label: "Platform Fee", sortable: true, align: "right", render: r => `₹${(r.platform_fee + r.gst_on_platform_fee).toLocaleString("en-IN")}` },
    { key: "total", label: "Order Total", sortable: true, align: "right", render: r => `₹${r.total.toLocaleString("en-IN")}` },
    { key: "status", label: "Status", render: r => <Badge variant="outline" className="text-[9px] capitalize">{r.status}</Badge> },
  ];

  const vendorColumns: Column[] = [
    { key: "vendor", label: "Vendor", sortable: true },
    { key: "orders", label: "Orders", sortable: true, align: "right" },
    { key: "revenue", label: "Total Revenue", sortable: true, align: "right", render: r => `₹${r.revenue.toLocaleString("en-IN")}` },
    { key: "commission", label: "Commission Revenue", sortable: true, align: "right", render: r => <span className="font-semibold text-success">₹{r.commission.toLocaleString("en-IN")}</span> },
    { key: "platformFee", label: "Platform Fees", sortable: true, align: "right", render: r => `₹${r.platformFee.toLocaleString("en-IN")}` },
    { key: "netProfit", label: "Net Profit", sortable: true, align: "right", render: r => <span className="font-bold text-success">₹{r.netProfit.toLocaleString("en-IN")}</span> },
  ];

  const productColumns: Column[] = [
    { key: "title", label: "Product", sortable: true },
    { key: "vendor", label: "Vendor", sortable: true },
    { key: "qty", label: "Qty Sold", sortable: true, align: "right" },
    { key: "revenue", label: "Revenue", sortable: true, align: "right", render: r => `₹${r.revenue.toLocaleString("en-IN")}` },
    { key: "commissionPct", label: "Commission %", sortable: true, align: "right", render: r => `${r.commissionPct}%` },
    { key: "commission", label: "P4U Commission", sortable: true, align: "right", render: r => <span className="font-semibold text-success">₹${r.commission.toLocaleString("en-IN")}</span> },
  ];

  const handleExport = (data: any[], filename: string) => {
    exportCSV(data, filename);
  };

  return (
    <AdminLayout>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold">P4U Revenue & Profit Report</h1>
            <p className="text-sm text-muted-foreground">Commission revenue, platform fees, and net profit analysis</p>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          <Card className="p-4 text-center">
            <DollarSign className="h-5 w-5 mx-auto text-primary mb-1" />
            <p className="text-xl font-bold">₹{totalRevenue.toLocaleString("en-IN")}</p>
            <p className="text-[10px] text-muted-foreground">Total Order Revenue</p>
          </Card>
          <Card className="p-4 text-center">
            <Percent className="h-5 w-5 mx-auto text-success mb-1" />
            <p className="text-xl font-bold text-success">₹{totalCommission.toLocaleString("en-IN")}</p>
            <p className="text-[10px] text-muted-foreground">Commission Revenue</p>
          </Card>
          <Card className="p-4 text-center">
            <Store className="h-5 w-5 mx-auto text-info mb-1" />
            <p className="text-xl font-bold">₹{totalPlatformFee.toLocaleString("en-IN")}</p>
            <p className="text-[10px] text-muted-foreground">Platform Fees + GST</p>
          </Card>
          <Card className="p-4 text-center">
            <TrendingUp className="h-5 w-5 mx-auto text-success mb-1" />
            <p className="text-xl font-bold text-success">₹{netProfit.toLocaleString("en-IN")}</p>
            <p className="text-[10px] text-muted-foreground">Net Profit</p>
          </Card>
          <Card className="p-4 text-center">
            <Package className="h-5 w-5 mx-auto text-warning mb-1" />
            <p className="text-xl font-bold">{totalPointsRedeemed.toLocaleString()}</p>
            <p className="text-[10px] text-muted-foreground">Points Redeemed</p>
          </Card>
        </div>

        <Tabs value={tab} onValueChange={setTab}>
          <div className="flex items-center justify-between">
            <TabsList>
              <TabsTrigger value="orders">Detailed Orders ({rows.length})</TabsTrigger>
              <TabsTrigger value="vendors">Vendor-wise ({vendorRows.length})</TabsTrigger>
              <TabsTrigger value="products">Product-wise ({productRows.length})</TabsTrigger>
            </TabsList>
            <Button variant="outline" size="sm" className="gap-1" onClick={() => {
              if (tab === "orders") handleExport(rows.map(r => ({ ...r, items: undefined, commission_source_label: sourceLabel(r.commission_source), redemption_source_label: sourceLabel(r.redemption_source) })), "p4u_revenue_orders");
              else if (tab === "vendors") handleExport(vendorRows, "p4u_revenue_vendors");
              else handleExport(productRows, "p4u_revenue_products");
            }}>
              <Download className="h-3.5 w-3.5" /> Export CSV
            </Button>
          </div>

          <TabsContent value="orders">
            <ReportDataGrid
              columns={orderColumns}
              data={rows}
              loading={loading}
              dateFrom={dateFrom}
              dateTo={dateTo}
              onDateFromChange={setDateFrom}
              onDateToChange={setDateTo}
              searchKeys={["id", "vendor_name", "customer_name"]}
              searchPlaceholder="Search by order, vendor, or customer..."
            />
          </TabsContent>

          <TabsContent value="vendors">
            <ReportDataGrid
              columns={vendorColumns}
              data={vendorRows}
              loading={loading}
              dateFrom={dateFrom}
              dateTo={dateTo}
              onDateFromChange={setDateFrom}
              onDateToChange={setDateTo}
              searchKeys={["vendor"]}
              searchPlaceholder="Search by vendor..."
            />
          </TabsContent>

          <TabsContent value="products">
            <ReportDataGrid
              columns={productColumns}
              data={productRows}
              loading={loading}
              dateFrom={dateFrom}
              dateTo={dateTo}
              onDateFromChange={setDateFrom}
              onDateToChange={setDateTo}
              searchKeys={["title", "vendor"]}
              searchPlaceholder="Search by product or vendor..."
            />
          </TabsContent>
        </Tabs>
      </div>
    </AdminLayout>
  );
}
