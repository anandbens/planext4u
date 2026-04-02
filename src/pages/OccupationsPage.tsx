import { useEffect, useState, useCallback } from "react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { DataTable, SummaryWidget } from "@/components/admin/DataTable";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { api, Occupation, PaginatedResponse } from "@/lib/api";
import { OccupationModal } from "@/components/admin/modals/OccupationModal";
import { Button } from "@/components/ui/button";
import { Pencil, Trash2, Briefcase, CheckCircle, Users } from "lucide-react";
import { exportToCSV } from "@/lib/csv";
import { toast } from "sonner";
import { ConfirmDialog } from "@/components/admin/ConfirmDialog";

export default function OccupationsPage() {
  const [data, setData] = useState<PaginatedResponse<Occupation> | null>(null);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [selected, setSelected] = useState<Occupation | null>(null);
  const [modalMode, setModalMode] = useState<"view" | "edit" | "create">("view");
  const [modalOpen, setModalOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmTarget, setConfirmTarget] = useState<Occupation | null>(null);

  const fetchData = useCallback(() => {
    api.getOccupations({ page, per_page: 10, search: search || undefined, status: statusFilter || undefined }).then(setData);
  }, [page, search, statusFilter]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const openModal = (occ: Occupation | null, mode: "view" | "edit" | "create") => {
    setSelected(occ); setModalMode(mode); setModalOpen(true);
  };

  const handleSave = async (id: string, updates: Partial<Occupation>) => { await api.updateOccupation(id, updates); toast.success("Occupation updated"); fetchData(); };
  const handleCreate = async (d: Partial<Occupation>) => { await api.createOccupation(d); toast.success("Occupation created"); fetchData(); };
  const handleDelete = async (id: string) => { await api.deleteOccupation(id); toast.success("Occupation deleted"); fetchData(); };

  const handleExport = () => {
    if (!data) return;
    exportToCSV(data.data, [
      { key: "id", label: "ID" }, { key: "name", label: "Occupation" },
      { key: "customer_count", label: "Customers" }, { key: "status", label: "Status" },
    ], "occupations");
    toast.success("CSV exported");
  };

  if (!data) return <AdminLayout><div className="flex items-center justify-center h-64"><div className="h-8 w-8 rounded-full border-2 border-primary border-t-transparent animate-spin" /></div></AdminLayout>;

  const active = data.data.filter(o => o.status === "active").length;
  const totalCustomers = data.data.reduce((s, o) => s + o.customer_count, 0);

  const summaryWidgets: SummaryWidget[] = [
    { label: "Total Occupations", value: data.total, icon: <Briefcase className="h-5 w-5 text-primary" />, color: "bg-primary/5" },
    { label: "Active", value: active, icon: <CheckCircle className="h-5 w-5 text-success" />, color: "bg-success/5", textColor: "text-success" },
    { label: "Total Customers", value: totalCustomers, icon: <Users className="h-5 w-5 text-info" />, color: "bg-info/5", textColor: "text-info" },
  ];

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
          { key: "actions", label: "", render: (o) => (
            <div className="flex gap-1">
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={(e) => { e.stopPropagation(); openModal(o, "edit"); }}><Pencil className="h-4 w-4" /></Button>
              <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={(e) => { e.stopPropagation(); setConfirmTarget(o); setConfirmOpen(true); }}><Trash2 className="h-4 w-4" /></Button>
            </div>
          )},
        ]}
        data={data.data}
        total={data.total}
        page={data.page}
        perPage={data.per_page}
        totalPages={data.total_pages}
        onPageChange={setPage}
        onSearch={(q) => { setSearch(q); setPage(1); }}
        onExport={handleExport}
        onAdd={() => openModal(null, "create")}
        addLabel="Add Occupation"
        onRowClick={(o) => openModal(o, "edit")}
        onFilterChange={(key, val) => { if (key === "status") { setStatusFilter(val); setPage(1); } }}
        searchPlaceholder="Search occupations..."
        filters={[{ key: "status", label: "Status", options: [{ value: "active", label: "Active" }, { value: "inactive", label: "Inactive" }] }]}
        showDateFilter={false}
        summaryWidgets={summaryWidgets}
      />
      <OccupationModal occupation={selected} open={modalOpen} onOpenChange={setModalOpen} mode={modalMode} onSave={handleSave} onCreate={handleCreate} onDelete={handleDelete} />
      <ConfirmDialog open={confirmOpen} onOpenChange={setConfirmOpen} title="Delete Occupation" description={`Delete "${confirmTarget?.name}"? Existing customer profiles with this occupation will not be affected.`} confirmLabel="Delete" variant="destructive"
        onConfirm={async () => { if (confirmTarget) { await handleDelete(confirmTarget.id); setConfirmOpen(false); } }} />
    </AdminLayout>
  );
}
