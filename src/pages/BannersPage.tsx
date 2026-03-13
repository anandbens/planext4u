import { useEffect, useState, useCallback } from "react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { DataTable } from "@/components/admin/DataTable";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { api, Banner, PaginatedResponse } from "@/lib/api";
import { exportToCSV } from "@/lib/csv";
import { toast } from "sonner";

export default function BannersPage() {
  const [data, setData] = useState<PaginatedResponse<Banner> | null>(null);
  const [page, setPage] = useState(1);

  const fetchData = useCallback(() => {
    api.getBanners().then((banners) => {
      const start = (page - 1) * 10;
      setData({ data: banners.slice(start, start + 10), total: banners.length, page, per_page: 10, total_pages: Math.ceil(banners.length / 10) });
    });
  }, [page]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleExport = () => {
    if (!data) return;
    exportToCSV(data.data, [
      { key: "id", label: "ID" }, { key: "title", label: "Title" },
      { key: "subtitle", label: "Subtitle" }, { key: "link", label: "Link" },
      { key: "priority", label: "Priority" }, { key: "status", label: "Status" },
    ], "banners");
    toast.success("CSV exported");
  };

  if (!data) return <AdminLayout><div className="flex items-center justify-center h-64"><div className="h-8 w-8 rounded-full border-2 border-primary border-t-transparent animate-spin" /></div></AdminLayout>;

  return (
    <AdminLayout>
      <div className="page-header">
        <h1 className="page-title">Banners</h1>
        <p className="page-description">{data.total} banners configured</p>
      </div>
      <DataTable
        columns={[
          { key: "id", label: "ID" },
          { key: "title", label: "Banner", render: (b) => (
            <div><p className="font-medium">{b.title}</p><p className="text-xs text-muted-foreground">{b.subtitle}</p></div>
          )},
          { key: "link", label: "Link", render: (b) => <code className="text-xs bg-secondary px-2 py-0.5 rounded">{b.link}</code> },
          { key: "priority", label: "Priority", render: (b) => <span className="font-semibold">#{b.priority}</span> },
          { key: "start_date", label: "Start", render: (b) => new Date(b.start_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) },
          { key: "end_date", label: "End", render: (b) => new Date(b.end_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) },
          { key: "status", label: "Status", render: (b) => <StatusBadge status={b.status} /> },
          { key: "created_at", label: "Created", render: (b) => b.created_at ? new Date(b.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—' },
        ]}
        data={data.data}
        total={data.total}
        page={data.page}
        perPage={data.per_page}
        totalPages={data.total_pages}
        onPageChange={setPage}
        onExport={handleExport}
        showDateFilter={false}
      />
    </AdminLayout>
  );
}
