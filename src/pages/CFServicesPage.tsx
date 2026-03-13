import { useEffect, useState, useCallback } from "react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { DataTable } from "@/components/admin/DataTable";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { api, PaginatedResponse, Category } from "@/lib/api";
import { exportToCSV } from "@/lib/csv";
import { toast } from "sonner";

export default function CFServicesPage() {
  const [data, setData] = useState<PaginatedResponse<Category> | null>(null);
  const [page, setPage] = useState(1);

  const fetchData = useCallback(() => {
    api.getServiceCategories().then((cats) => {
      const start = (page - 1) * 10;
      setData({ data: cats.slice(start, start + 10) as Category[], total: cats.length, page, per_page: 10, total_pages: Math.ceil(cats.length / 10) });
    });
  }, [page]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleExport = () => {
    if (!data) return;
    exportToCSV(data.data, [
      { key: "id", label: "ID" }, { key: "name", label: "Service Category" },
      { key: "count", label: "Services" }, { key: "status", label: "Status" },
    ], "cf_services");
    toast.success("CSV exported");
  };

  if (!data) return <AdminLayout><div className="flex items-center justify-center h-64"><div className="h-8 w-8 rounded-full border-2 border-primary border-t-transparent animate-spin" /></div></AdminLayout>;

  return (
    <AdminLayout>
      <div className="page-header">
        <h1 className="page-title">CF Services</h1>
        <p className="page-description">Service categories configuration</p>
      </div>
      <DataTable
        columns={[
          { key: "id", label: "ID" },
          { key: "image", label: "Icon", render: (c) => <span className="text-xl">{c.image}</span> },
          { key: "name", label: "Service Category", render: (c) => <span className="font-medium">{c.name}</span> },
          { key: "count", label: "Services", render: (c) => <span className="font-semibold">{(c.count || 0).toLocaleString()}</span> },
          { key: "status", label: "Status", render: (c) => <StatusBadge status={c.status} /> },
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
