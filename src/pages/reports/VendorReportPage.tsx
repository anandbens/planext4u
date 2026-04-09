import { useState, useEffect } from "react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Store, DollarSign, ShoppingCart, Star } from "lucide-react";
import { format, subDays, startOfDay, endOfDay, parseISO } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import ReportDataGrid, { Column } from "@/components/admin/ReportDataGrid";

interface VendorRow {
  id: string; name: string; business_name: string; email: string; mobile: string;
  status: string; commission_rate: number; total_orders: number; total_revenue: number;
  rating: number; plan_name: string; created_at: string;
}

export default function VendorReportPage() {
  const [dateFrom, setDateFrom] = useState<Date>(subDays(new Date(), 90));
  const [dateTo, setDateTo] = useState<Date>(new Date());
  const [statusFilter, setStatusFilter] = useState("all");
  const [rows, setRows] = useState<VendorRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      let q = supabase.from("vendors")
        .select("id, name, business_name, email, mobile, status, commission_rate, total_orders, total_revenue, rating, plan_id, created_at")
        .order("total_revenue", { ascending: false });
      if (statusFilter !== "all") q = q.eq("status", statusFilter);
      const { data: vds } = await q;
      const { data: plans } = await supabase.from("vendor_plans").select("id, plan_name");
      const planMap = new Map((plans || []).map((p: any) => [p.id, p.plan_name]));

      setRows((vds || []).map((v: any) => ({
        ...v,
        total_orders: v.total_orders || 0,
        total_revenue: Number(v.total_revenue || 0),
        rating: v.rating || 0,
        plan_name: v.plan_id ? planMap.get(v.plan_id) || "—" : "No Plan",
      })));
      setLoading(false);
    };
    fetchData();
  }, [dateFrom, dateTo, statusFilter]);

  const totalVendors = rows.length;
  const totalRevenue = rows.reduce((s, v) => s + v.total_revenue, 0);
  const totalOrders = rows.reduce((s, v) => s + v.total_orders, 0);
  const avgRating = rows.filter(v => v.rating > 0).length > 0 ? (rows.reduce((s, v) => s + v.rating, 0) / rows.filter(v => v.rating > 0).length).toFixed(1) : "0";

  const columns: Column<VendorRow>[] = [
    { key: "id", label: "Vendor ID", sortable: true, render: r => <span className="font-mono text-xs">{r.id}</span> },
    { key: "business_name", label: "Business Name", sortable: true, render: r => <span className="font-medium">{r.business_name || r.name}</span> },
    { key: "name", label: "Contact Name", sortable: true },
    { key: "email", label: "Email", sortable: true },
    { key: "mobile", label: "Mobile", sortable: true },
    { key: "plan_name", label: "Plan", sortable: true },
    { key: "commission_rate", label: "Commission %", sortable: true, align: "right", render: r => `${r.commission_rate}%` },
    { key: "total_orders", label: "Orders", sortable: true, align: "right" },
    { key: "total_revenue", label: "Revenue (₹)", sortable: true, align: "right", render: r => <span className="font-semibold">₹{r.total_revenue.toLocaleString("en-IN")}</span> },
    { key: "rating", label: "Rating", sortable: true, align: "right", render: r => r.rating > 0 ? `⭐ ${r.rating.toFixed(1)}` : "—" },
    { key: "created_at", label: "Joined On", sortable: true, render: r => format(parseISO(r.created_at), "dd MMM yyyy") },
    { key: "status", label: "Status", sortable: true, align: "center", render: r => <Badge className={`border-0 text-[10px] ${r.status === "active" ? "bg-success/10 text-success" : "bg-destructive/10 text-destructive"}`}>{r.status}</Badge> },
  ];

  return (
    <AdminLayout>
      <ReportDataGrid
        title="Vendor Performance Report"
        subtitle={`${totalVendors} vendors`}
        data={rows}
        columns={columns}
        loading={loading}
        searchPlaceholder="Search by name, business, email..."
        searchKeys={["name", "business_name", "email", "mobile", "id"]}
        dateFrom={dateFrom} dateTo={dateTo}
        onDateFromChange={setDateFrom} onDateToChange={setDateTo}
        statusFilter={{ value: statusFilter, onChange: setStatusFilter, options: [{ label: "Active", value: "active" }, { label: "Inactive", value: "inactive" }, { label: "Pending", value: "pending" }] }}
        exportFilename="vendor_report"
        summaryCards={
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {loading ? Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-20 rounded-xl" />) : (<>
              <MiniStat icon={Store} label="Total Vendors" value={totalVendors.toLocaleString()} />
              <MiniStat icon={DollarSign} label="Total Revenue" value={`₹${totalRevenue.toLocaleString("en-IN")}`} />
              <MiniStat icon={ShoppingCart} label="Total Orders" value={totalOrders.toLocaleString()} />
              <MiniStat icon={Star} label="Avg Rating" value={`⭐ ${avgRating}`} />
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
