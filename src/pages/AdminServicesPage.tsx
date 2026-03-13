import { useEffect, useState, useCallback } from "react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { DataTable } from "@/components/admin/DataTable";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { api, Service, PaginatedResponse } from "@/lib/api";
import { exportToCSV } from "@/lib/csv";
import { toast } from "sonner";

export default function AdminServicesPage() {
  const [data, setData] = useState<PaginatedResponse<Service> | null>(null);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [dateFrom, setDateFrom] = useState<string>();
  const [dateTo, setDateTo] = useState<string>();

  const fetchData = useCallback(() => {
    api.getServices({ page, per_page: 10, search: search || undefined, date_from: dateFrom, date_to: dateTo }).then(setData);
  }, [page, search, dateFrom, dateTo]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleExport = () => {
    if (!data) return;
    exportToCSV(data.data, [
      { key: "id", label: "ID" }, { key: "title", label: "Title" },
      { key: "vendor_name", label: "Vendor" }, { key: "price", label: "Price" },
      { key: "status", label: "Status" }, { key: "rating", label: "Rating" },
    ], "services");
    toast.success("CSV exported");
  };

  if (!data) return <AdminLayout><div className="flex items-center justify-center h-64"><div className="h-8 w-8 rounded-full border-2 border-primary border-t-transparent animate-spin" /></div></AdminLayout>;

  return (
    <AdminLayout>
      <div className="page-header">
        <h1 className="page-title">Services</h1>
        <p className="page-description">{data.total} services listed</p>
      </div>
      <DataTable
        columns={[
          { key: "id", label: "ID" },
          { key: "title", label: "Service", render: (s) => (
            <div><p className="font-medium">{s.emoji} {s.title}</p><p className="text-xs text-muted-foreground">{s.category_name}</p></div>
          )},
          { key: "vendor_name", label: "Vendor" },
          { key: "price", label: "Price", render: (s) => <span className="font-semibold">₹{s.price.toLocaleString()}</span> },
          { key: "duration", label: "Duration" },
          { key: "rating", label: "Rating", render: (s) => <span>⭐ {s.rating}</span> },
          { key: "status", label: "Status", render: (s) => <StatusBadge status={s.status} /> },
          { key: "created_at", label: "Created", render: (s) => s.created_at ? new Date(s.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—' },
        ]}
        data={data.data}
        total={data.total}
        page={data.page}
        perPage={data.per_page}
        totalPages={data.total_pages}
        onPageChange={setPage}
        onSearch={setSearch}
        onExport={handleExport}
        onDateRangeChange={(f, t) => { setDateFrom(f); setDateTo(t); setPage(1); }}
        searchPlaceholder="Search services..."
      />
    </AdminLayout>
  );
}
