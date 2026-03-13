import { useEffect, useState, useCallback } from "react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { DataTable } from "@/components/admin/DataTable";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { api, Advertisement, PaginatedResponse } from "@/lib/api";
import { exportToCSV } from "@/lib/csv";
import { toast } from "sonner";

export default function AdvertisementsPage() {
  const [data, setData] = useState<PaginatedResponse<Advertisement> | null>(null);
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState("");
  const [dateFrom, setDateFrom] = useState<string>();
  const [dateTo, setDateTo] = useState<string>();

  const fetchData = useCallback(() => {
    api.getAdvertisements({ page, per_page: 10, status: statusFilter || undefined, date_from: dateFrom, date_to: dateTo }).then(setData);
  }, [page, statusFilter, dateFrom, dateTo]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleExport = () => {
    if (!data) return;
    exportToCSV(data.data, [
      { key: "id", label: "ID" }, { key: "title", label: "Title" },
      { key: "advertiser", label: "Advertiser" }, { key: "placement", label: "Placement" },
      { key: "impressions", label: "Impressions" }, { key: "clicks", label: "Clicks" },
      { key: "revenue", label: "Revenue" }, { key: "status", label: "Status" },
    ], "advertisements");
    toast.success("CSV exported");
  };

  if (!data) return <AdminLayout><div className="flex items-center justify-center h-64"><div className="h-8 w-8 rounded-full border-2 border-primary border-t-transparent animate-spin" /></div></AdminLayout>;

  return (
    <AdminLayout>
      <div className="page-header">
        <h1 className="page-title">Advertisements</h1>
        <p className="page-description">{data.total} ad campaigns</p>
      </div>
      <DataTable
        columns={[
          { key: "id", label: "ID" },
          { key: "title", label: "Campaign", render: (a) => (
            <div><p className="font-medium">{a.title}</p><p className="text-xs text-muted-foreground">{a.advertiser}</p></div>
          )},
          { key: "placement", label: "Placement" },
          { key: "type", label: "Type", render: (a) => (
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-secondary text-secondary-foreground capitalize">{a.type}</span>
          )},
          { key: "impressions", label: "Impressions", render: (a) => <span>{a.impressions.toLocaleString()}</span> },
          { key: "clicks", label: "Clicks", render: (a) => <span>{a.clicks.toLocaleString()}</span> },
          { key: "revenue", label: "Revenue", render: (a) => <span className="font-semibold">₹{a.revenue.toLocaleString()}</span> },
          { key: "status", label: "Status", render: (a) => <StatusBadge status={a.status} /> },
          { key: "created_at", label: "Created", render: (a) => new Date(a.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) },
        ]}
        data={data.data}
        total={data.total}
        page={data.page}
        perPage={data.per_page}
        totalPages={data.total_pages}
        onPageChange={setPage}
        onExport={handleExport}
        onFilterChange={(key, val) => { if (key === "status") { setStatusFilter(val); setPage(1); } }}
        onDateRangeChange={(f, t) => { setDateFrom(f); setDateTo(t); setPage(1); }}
        filters={[{ key: "status", label: "Status", options: [{ value: "active", label: "Active" }, { value: "paused", label: "Paused" }, { value: "expired", label: "Expired" }] }]}
      />
    </AdminLayout>
  );
}
