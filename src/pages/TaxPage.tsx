import { useEffect, useState, useCallback } from "react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { DataTable } from "@/components/admin/DataTable";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { api, TaxConfig, PaginatedResponse } from "@/lib/api";
import { exportToCSV } from "@/lib/csv";
import { toast } from "sonner";

export default function TaxPage() {
  const [data, setData] = useState<PaginatedResponse<TaxConfig> | null>(null);
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState("");

  const fetchData = useCallback(() => {
    api.getTaxConfig({ page, per_page: 10, status: statusFilter || undefined }).then(setData);
  }, [page, statusFilter]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleExport = () => {
    if (!data) return;
    exportToCSV(data.data, [
      { key: "id", label: "ID" }, { key: "name", label: "Name" },
      { key: "rate", label: "Rate %" }, { key: "type", label: "Type" },
      { key: "applied_to", label: "Applied To" }, { key: "status", label: "Status" },
    ], "tax_config");
    toast.success("CSV exported");
  };

  if (!data) return <AdminLayout><div className="flex items-center justify-center h-64"><div className="h-8 w-8 rounded-full border-2 border-primary border-t-transparent animate-spin" /></div></AdminLayout>;

  return (
    <AdminLayout>
      <div className="page-header">
        <h1 className="page-title">Tax Configuration</h1>
        <p className="page-description">{data.total} tax rules configured</p>
      </div>
      <DataTable
        columns={[
          { key: "id", label: "ID" },
          { key: "name", label: "Tax Name", render: (t) => <span className="font-medium">{t.name}</span> },
          { key: "rate", label: "Rate", render: (t) => <span className="font-semibold">{t.rate}%</span> },
          { key: "type", label: "Type", render: (t) => (
            <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${t.type === 'GST' ? 'bg-primary/10 text-primary' : 'bg-warning/10 text-warning'}`}>
              {t.type}
            </span>
          )},
          { key: "applied_to", label: "Applied To" },
          { key: "status", label: "Status", render: (t) => <StatusBadge status={t.status} /> },
          { key: "created_at", label: "Created", render: (t) => new Date(t.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) },
        ]}
        data={data.data}
        total={data.total}
        page={data.page}
        perPage={data.per_page}
        totalPages={data.total_pages}
        onPageChange={setPage}
        onExport={handleExport}
        onFilterChange={(key, val) => { if (key === "status") { setStatusFilter(val); setPage(1); } }}
        searchPlaceholder="Search tax rules..."
        filters={[{ key: "status", label: "Status", options: [{ value: "active", label: "Active" }, { value: "inactive", label: "Inactive" }] }]}
        showDateFilter={false}
      />
    </AdminLayout>
  );
}
