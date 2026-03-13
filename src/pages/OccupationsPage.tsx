import { useEffect, useState, useCallback } from "react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { DataTable } from "@/components/admin/DataTable";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { api, Occupation, PaginatedResponse } from "@/lib/api";
import { exportToCSV } from "@/lib/csv";
import { toast } from "sonner";

export default function OccupationsPage() {
  const [data, setData] = useState<PaginatedResponse<Occupation> | null>(null);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  const fetchData = useCallback(() => {
    api.getOccupations({ page, per_page: 10, search: search || undefined, status: statusFilter || undefined }).then(setData);
  }, [page, search, statusFilter]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleExport = () => {
    if (!data) return;
    exportToCSV(data.data, [
      { key: "id", label: "ID" }, { key: "name", label: "Occupation" },
      { key: "customer_count", label: "Customers" }, { key: "status", label: "Status" },
    ], "occupations");
    toast.success("CSV exported");
  };

  if (!data) return <AdminLayout><div className="flex items-center justify-center h-64"><div className="h-8 w-8 rounded-full border-2 border-primary border-t-transparent animate-spin" /></div></AdminLayout>;

  return (
    <AdminLayout>
      <div className="page-header">
        <h1 className="page-title">Occupations</h1>
        <p className="page-description">{data.total} occupation types</p>
      </div>
      <DataTable
        columns={[
          { key: "id", label: "ID" },
          { key: "name", label: "Occupation", render: (o) => <span className="font-medium">{o.name}</span> },
          { key: "customer_count", label: "Customers", render: (o) => <span className="font-semibold">{o.customer_count}</span> },
          { key: "status", label: "Status", render: (o) => <StatusBadge status={o.status} /> },
          { key: "created_at", label: "Created", render: (o) => new Date(o.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) },
        ]}
        data={data.data}
        total={data.total}
        page={data.page}
        perPage={data.per_page}
        totalPages={data.total_pages}
        onPageChange={setPage}
        onSearch={setSearch}
        onExport={handleExport}
        onFilterChange={(key, val) => { if (key === "status") { setStatusFilter(val); setPage(1); } }}
        searchPlaceholder="Search occupations..."
        filters={[{ key: "status", label: "Status", options: [{ value: "active", label: "Active" }, { value: "inactive", label: "Inactive" }] }]}
        showDateFilter={false}
      />
    </AdminLayout>
  );
}
