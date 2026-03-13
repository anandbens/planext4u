import { useEffect, useState, useCallback } from "react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { DataTable, SummaryWidget } from "@/components/admin/DataTable";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { ConfirmDialog } from "@/components/admin/ConfirmDialog";
import { api, Service, PaginatedResponse } from "@/lib/api";
import { ServiceModal } from "@/components/admin/modals/ServiceModal";
import { Button } from "@/components/ui/button";
import { Eye, Pencil, Trash2, Wrench, Star, IndianRupee, CheckCircle } from "lucide-react";
import { exportToCSV } from "@/lib/csv";
import { toast } from "sonner";

export default function AdminServicesPage() {
  const [data, setData] = useState<PaginatedResponse<Service> | null>(null);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [dateFrom, setDateFrom] = useState<string>();
  const [dateTo, setDateTo] = useState<string>();
  const [selected, setSelected] = useState<Service | null>(null);
  const [modalMode, setModalMode] = useState<"view" | "edit" | "create">("view");
  const [modalOpen, setModalOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmTarget, setConfirmTarget] = useState<Service | null>(null);

  const fetchData = useCallback(() => {
    api.getServices({ page, per_page: 10, search: search || undefined, date_from: dateFrom, date_to: dateTo }).then(setData);
  }, [page, search, dateFrom, dateTo]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const openModal = (service: Service | null, mode: "view" | "edit" | "create") => {
    setSelected(service); setModalMode(mode); setModalOpen(true);
  };

  const handleSave = async (id: string, updates: Partial<Service>) => { await api.updateService(id, updates); toast.success("Service updated"); fetchData(); };
  const handleCreate = async (data: Partial<Service>) => { await api.createService(data); toast.success("Service created"); fetchData(); };
  const handleDelete = async (id: string) => { await api.deleteService(id); toast.success("Service deleted"); fetchData(); };

  const handleBulkDelete = async (ids: string[]) => {
    await api.bulkDeleteServices(ids);
    toast.success(`${ids.length} services deleted`);
    fetchData();
  };

  const handleBulkStatus = async (ids: string[], status: string) => {
    await api.bulkUpdateServiceStatus(ids, status);
    toast.success(`${ids.length} services updated to ${status}`);
    fetchData();
  };

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

  const active = data.data.filter(s => s.status === 'active').length;
  const avgRating = data.data.length ? (data.data.reduce((s, sv) => s + (sv.rating || 0), 0) / data.data.length).toFixed(1) : '0';
  const avgPrice = data.data.length ? Math.round(data.data.reduce((s, sv) => s + sv.price, 0) / data.data.length) : 0;

  const summaryWidgets: SummaryWidget[] = [
    { label: "Total Services", value: data.total, icon: <Wrench className="h-5 w-5 text-primary" />, color: "bg-primary/5" },
    { label: "Active", value: active, icon: <CheckCircle className="h-5 w-5 text-success" />, color: "bg-success/5", textColor: "text-success" },
    { label: "Avg Rating", value: `⭐ ${avgRating}`, icon: <Star className="h-5 w-5 text-warning" />, color: "bg-warning/5" },
    { label: "Avg Price", value: `₹${avgPrice.toLocaleString()}`, icon: <IndianRupee className="h-5 w-5 text-info" />, color: "bg-info/5", textColor: "text-info" },
  ];

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
          { key: "actions", label: "", render: (s) => (
            <div className="flex gap-1">
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={(e) => { e.stopPropagation(); openModal(s, "view"); }}><Eye className="h-4 w-4" /></Button>
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={(e) => { e.stopPropagation(); openModal(s, "edit"); }}><Pencil className="h-4 w-4" /></Button>
              <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={(e) => { e.stopPropagation(); setConfirmTarget(s); setConfirmOpen(true); }}><Trash2 className="h-4 w-4" /></Button>
            </div>
          )},
        ]}
        data={data.data}
        total={data.total}
        page={data.page}
        perPage={data.per_page}
        totalPages={data.total_pages}
        onPageChange={setPage}
        onSearch={setSearch}
        onExport={handleExport}
        onAdd={() => openModal(null, "create")}
        addLabel="Add Service"
        onRowClick={(s) => openModal(s, "view")}
        onDateRangeChange={(f, t) => { setDateFrom(f); setDateTo(t); setPage(1); }}
        searchPlaceholder="Search services..."
        summaryWidgets={summaryWidgets}
        enableBulkSelect
        onBulkDelete={handleBulkDelete}
        onBulkStatusUpdate={handleBulkStatus}
        bulkStatusOptions={[
          { value: "active", label: "Active" },
          { value: "inactive", label: "Inactive" },
          { value: "draft", label: "Draft" },
        ]}
      />
      <ServiceModal service={selected} open={modalOpen} onOpenChange={setModalOpen} mode={modalMode} onSave={handleSave} onCreate={handleCreate} onDelete={handleDelete} />
      <ConfirmDialog open={confirmOpen} onOpenChange={setConfirmOpen} title="Delete Service" description={`Delete "${confirmTarget?.title}"?`} confirmLabel="Delete" variant="destructive"
        onConfirm={async () => { if (confirmTarget) { await handleDelete(confirmTarget.id); setConfirmOpen(false); } }} />
    </AdminLayout>
  );
}
