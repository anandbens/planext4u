import { useEffect, useState, useCallback } from "react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { DataTable } from "@/components/admin/DataTable";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { api, Vendor, PaginatedResponse } from "@/lib/api";
import { VendorModal } from "@/components/admin/modals/VendorModal";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { exportToCSV } from "@/lib/csv";
import { toast } from "sonner";

export default function CFVendorsPage() {
  const [data, setData] = useState<PaginatedResponse<Vendor> | null>(null);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [dateFrom, setDateFrom] = useState<string>();
  const [dateTo, setDateTo] = useState<string>();
  const [modalOpen, setModalOpen] = useState(false);
  const [selected, setSelected] = useState<Vendor | null>(null);
  const [modalMode, setModalMode] = useState<"view" | "edit" | "create">("view");

  const fetchData = useCallback(() => {
    api.getVendors({ page, per_page: 10, search: search || undefined, date_from: dateFrom, date_to: dateTo }).then(setData);
  }, [page, search, dateFrom, dateTo]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleExport = () => {
    if (!data) return;
    exportToCSV(data.data, [
      { key: "id", label: "ID" }, { key: "business_name", label: "Business" },
      { key: "name", label: "Owner" }, { key: "email", label: "Email" },
      { key: "status", label: "Status" }, { key: "created_at", label: "Registered" },
    ], "service_vendors");
    toast.success("CSV exported");
  };

  const openModal = (vendor: Vendor | null, mode: "view" | "edit" | "create") => {
    setSelected(vendor); setModalMode(mode); setModalOpen(true);
  };

  if (!data) return <AdminLayout><div className="flex items-center justify-center h-64"><div className="h-8 w-8 rounded-full border-2 border-primary border-t-transparent animate-spin" /></div></AdminLayout>;

  return (
    <AdminLayout>
      <div className="page-header flex items-center justify-between">
        <div>
          <h1 className="page-title">Service Vendors</h1>
          <p className="page-description">Service vendor management</p>
        </div>
        <Button onClick={() => openModal(null, "create")} className="gap-2">
          <Plus className="h-4 w-4" /> Add Service Vendor
        </Button>
      </div>
      <DataTable
        columns={[
          { key: "id", label: "ID" },
          { key: "business_name", label: "Business", render: (v) => (
            <div><p className="font-medium">{v.business_name}</p><p className="text-xs text-muted-foreground">{v.name}</p></div>
          )},
          { key: "email", label: "Email" },
          { key: "mobile", label: "Mobile" },
          { key: "commission_rate", label: "Commission", render: (v) => <span>{v.commission_rate}%</span> },
          { key: "status", label: "Status", render: (v) => <StatusBadge status={v.status} /> },
          { key: "created_at", label: "Registered", render: (v) => new Date(v.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) },
        ]}
        data={data.data}
        total={data.total}
        page={data.page}
        perPage={data.per_page}
        totalPages={data.total_pages}
        onPageChange={setPage}
        onSearch={setSearch}
        onExport={handleExport}
        onRowClick={(v) => openModal(v, "view")}
        onDateRangeChange={(f, t) => { setDateFrom(f); setDateTo(t); setPage(1); }}
        searchPlaceholder="Search service vendors..."
      />
      <VendorModal vendor={selected} open={modalOpen} onOpenChange={setModalOpen} mode={modalMode}
        onSave={async () => { fetchData(); }} onCreate={async () => { fetchData(); }} onDelete={async () => { fetchData(); }} />
    </AdminLayout>
  );
}
