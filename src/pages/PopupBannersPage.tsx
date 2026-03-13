import { useEffect, useState, useCallback } from "react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { DataTable } from "@/components/admin/DataTable";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { api, PopupBanner, PaginatedResponse } from "@/lib/api";
import { exportToCSV } from "@/lib/csv";
import { toast } from "sonner";

export default function PopupBannersPage() {
  const [data, setData] = useState<PaginatedResponse<PopupBanner> | null>(null);
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState("");

  const fetchData = useCallback(() => {
    api.getPopupBanners({ page, per_page: 10, status: statusFilter || undefined }).then(setData);
  }, [page, statusFilter]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleExport = () => {
    if (!data) return;
    exportToCSV(data.data, [
      { key: "id", label: "ID" }, { key: "title", label: "Title" },
      { key: "description", label: "Description" }, { key: "status", label: "Status" },
      { key: "start_date", label: "Start" }, { key: "end_date", label: "End" },
    ], "popup_banners");
    toast.success("CSV exported");
  };

  if (!data) return <AdminLayout><div className="flex items-center justify-center h-64"><div className="h-8 w-8 rounded-full border-2 border-primary border-t-transparent animate-spin" /></div></AdminLayout>;

  return (
    <AdminLayout>
      <div className="page-header">
        <h1 className="page-title">Popup Banners</h1>
        <p className="page-description">{data.total} popup banners configured</p>
      </div>
      <DataTable
        columns={[
          { key: "id", label: "ID" },
          { key: "image", label: "Image", render: (b) => b.image ? (
            <img src={b.image} alt={b.title} className="h-10 w-16 rounded-lg object-cover" />
          ) : (
            <div className="h-10 w-16 rounded-lg bg-secondary/30 flex items-center justify-center text-xs text-muted-foreground">No img</div>
          )},
          { key: "title", label: "Title", render: (b) => (
            <div><p className="font-medium">{b.title}</p><p className="text-xs text-muted-foreground">{b.description}</p></div>
          )},
          { key: "link", label: "Link", render: (b) => <code className="text-xs bg-secondary px-2 py-0.5 rounded">{b.link}</code> },
          { key: "start_date", label: "Start Date", render: (b) => new Date(b.start_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) },
          { key: "end_date", label: "End Date", render: (b) => new Date(b.end_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) },
          { key: "status", label: "Status", render: (b) => <StatusBadge status={b.status} /> },
          { key: "created_at", label: "Created", render: (b) => new Date(b.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) },
        ]}
        data={data.data}
        total={data.total}
        page={data.page}
        perPage={data.per_page}
        totalPages={data.total_pages}
        onPageChange={setPage}
        onExport={handleExport}
        onFilterChange={(key, val) => { if (key === "status") { setStatusFilter(val); setPage(1); } }}
        filters={[{ key: "status", label: "Status", options: [{ value: "active", label: "Active" }, { value: "inactive", label: "Inactive" }] }]}
        showDateFilter={false}
      />
    </AdminLayout>
  );
}
