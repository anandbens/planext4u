import { useState, useEffect } from "react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Megaphone, CheckCircle, Clock, Eye } from "lucide-react";
import { format, subDays, startOfDay, endOfDay, parseISO } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import ReportDataGrid, { Column } from "@/components/admin/ReportDataGrid";

interface ClassifiedRow {
  id: string; created_at: string; title: string; category: string;
  city: string; area: string; price: number; user_name: string;
  user_id: string; status: string;
}

const statusColors: Record<string, string> = {
  active: "bg-success/10 text-success", pending: "bg-warning/10 text-warning",
  sold: "bg-info/10 text-info", expired: "bg-muted text-muted-foreground",
  rejected: "bg-destructive/10 text-destructive",
};

export default function ClassifiedReportPage() {
  const [dateFrom, setDateFrom] = useState<Date>(subDays(new Date(), 90));
  const [dateTo, setDateTo] = useState<Date>(new Date());
  const [statusFilter, setStatusFilter] = useState("all");
  const [rows, setRows] = useState<ClassifiedRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      let q = supabase.from("classified_ads")
        .select("id, created_at, title, category, city, area, price, user_name, user_id, status")
        .gte("created_at", startOfDay(dateFrom).toISOString())
        .lte("created_at", endOfDay(dateTo).toISOString())
        .order("created_at", { ascending: false });
      if (statusFilter !== "all") q = q.eq("status", statusFilter);
      const { data } = await q;
      setRows(data || []);
      setLoading(false);
    };
    fetchData();
  }, [dateFrom, dateTo, statusFilter]);

  const totalAds = rows.length;
  const activeAds = rows.filter(r => r.status === "active").length;
  const pendingAds = rows.filter(r => r.status === "pending").length;
  const totalValue = rows.reduce((s, r) => s + Number(r.price || 0), 0);

  const columns: Column<ClassifiedRow>[] = [
    { key: "id", label: "Ad ID", sortable: true, render: r => <span className="font-mono text-xs">{r.id}</span> },
    { key: "created_at", label: "Posted On", sortable: true, render: r => format(parseISO(r.created_at), "dd MMM yyyy") },
    { key: "title", label: "Title", sortable: true, render: r => <span className="font-medium">{r.title}</span> },
    { key: "category", label: "Category", sortable: true },
    { key: "city", label: "City", sortable: true },
    { key: "area", label: "Area", sortable: true },
    { key: "price", label: "Price (₹)", sortable: true, align: "right", render: r => `₹${Number(r.price || 0).toLocaleString("en-IN")}` },
    { key: "user_name", label: "Posted By", sortable: true, render: r => r.user_name || "—" },
    { key: "status", label: "Status", sortable: true, align: "center", render: r => <Badge className={(statusColors[r.status] || "bg-muted") + " border-0 text-[10px]"}>{r.status}</Badge> },
  ];

  return (
    <AdminLayout>
      <ReportDataGrid
        title="Classified Ads Report"
        subtitle="Ad listings, approvals, and engagement"
        data={rows} columns={columns} loading={loading}
        searchPlaceholder="Search by title, category, city, user..."
        searchKeys={["title", "category", "city", "area", "user_name", "id"]}
        dateFrom={dateFrom} dateTo={dateTo}
        onDateFromChange={setDateFrom} onDateToChange={setDateTo}
        statusFilter={{ value: statusFilter, onChange: setStatusFilter, options: [
          { label: "Active", value: "active" }, { label: "Pending", value: "pending" },
          { label: "Sold", value: "sold" }, { label: "Expired", value: "expired" },
          { label: "Rejected", value: "rejected" },
        ] }}
        exportFilename="classified_report"
        summaryCards={
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {loading ? Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-20 rounded-xl" />) : (<>
              <MiniStat icon={Megaphone} label="Total Ads" value={totalAds.toLocaleString()} />
              <MiniStat icon={CheckCircle} label="Active Ads" value={activeAds.toLocaleString()} />
              <MiniStat icon={Clock} label="Pending Review" value={pendingAds.toLocaleString()} />
              <MiniStat icon={Eye} label="Total Listing Value" value={`₹${totalValue.toLocaleString("en-IN")}`} />
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
