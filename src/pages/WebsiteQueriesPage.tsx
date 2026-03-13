import { useEffect, useState, useCallback } from "react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { DataTable } from "@/components/admin/DataTable";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { api, WebsiteQuery, PaginatedResponse } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { CheckCircle, Clock } from "lucide-react";
import { exportToCSV } from "@/lib/csv";
import { toast } from "sonner";

export default function WebsiteQueriesPage() {
  const [data, setData] = useState<PaginatedResponse<WebsiteQuery> | null>(null);
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState("");
  const [dateFrom, setDateFrom] = useState<string>();
  const [dateTo, setDateTo] = useState<string>();

  const fetchData = useCallback(() => {
    api.getWebsiteQueries({ page, per_page: 10, status: statusFilter || undefined, date_from: dateFrom, date_to: dateTo }).then(setData);
  }, [page, statusFilter, dateFrom, dateTo]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleStatusChange = async (id: string, status: WebsiteQuery['status']) => {
    await api.updateWebsiteQueryStatus(id, status);
    toast.success(`Query marked as ${status.replace('_', ' ')}`);
    fetchData();
  };

  const handleExport = () => {
    if (!data) return;
    exportToCSV(data.data, [
      { key: "id", label: "ID" }, { key: "name", label: "Name" },
      { key: "email", label: "Email" }, { key: "subject", label: "Subject" },
      { key: "status", label: "Status" }, { key: "created_at", label: "Date" },
    ], "website_queries");
    toast.success("CSV exported");
  };

  if (!data) return <AdminLayout><div className="flex items-center justify-center h-64"><div className="h-8 w-8 rounded-full border-2 border-primary border-t-transparent animate-spin" /></div></AdminLayout>;

  return (
    <AdminLayout>
      <div className="page-header">
        <h1 className="page-title">Website Queries</h1>
        <p className="page-description">{data.total} queries received</p>
      </div>
      <DataTable
        columns={[
          { key: "id", label: "ID" },
          { key: "name", label: "From", render: (q) => (
            <div><p className="font-medium">{q.name}</p><p className="text-xs text-muted-foreground">{q.email}</p></div>
          )},
          { key: "phone", label: "Phone" },
          { key: "subject", label: "Subject", render: (q) => <span className="font-medium">{q.subject}</span> },
          { key: "message", label: "Message", render: (q) => <span className="text-xs text-muted-foreground line-clamp-1 max-w-[200px]">{q.message}</span> },
          { key: "status", label: "Status", render: (q) => <StatusBadge status={q.status} /> },
          { key: "created_at", label: "Received", render: (q) => (
            <span className="text-xs">{new Date(q.created_at).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</span>
          )},
          { key: "actions", label: "", render: (q) => q.status !== 'resolved' ? (
            <div className="flex gap-1">
              {q.status === 'new' && (
                <Button variant="ghost" size="icon" className="h-7 w-7 text-warning" onClick={(e) => { e.stopPropagation(); handleStatusChange(q.id, 'in_progress'); }}>
                  <Clock className="h-4 w-4" />
                </Button>
              )}
              <Button variant="ghost" size="icon" className="h-7 w-7 text-success" onClick={(e) => { e.stopPropagation(); handleStatusChange(q.id, 'resolved'); }}>
                <CheckCircle className="h-4 w-4" />
              </Button>
            </div>
          ) : null },
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
        filters={[{ key: "status", label: "Status", options: [{ value: "new", label: "New" }, { value: "in_progress", label: "In Progress" }, { value: "resolved", label: "Resolved" }] }]}
      />
    </AdminLayout>
  );
}
