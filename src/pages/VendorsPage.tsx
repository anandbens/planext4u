import { useEffect, useState, useCallback } from "react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { DataTable } from "@/components/admin/DataTable";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { ConfirmDialog } from "@/components/admin/ConfirmDialog";
import { api, Vendor, PaginatedResponse } from "@/lib/api";
import { VendorModal } from "@/components/admin/modals/VendorModal";
import { Button } from "@/components/ui/button";
import { CheckCircle, XCircle, Eye, Pencil } from "lucide-react";
import { exportToCSV } from "@/lib/csv";
import { toast } from "sonner";

export default function VendorsPage() {
  const [data, setData] = useState<PaginatedResponse<Vendor> | null>(null);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [selected, setSelected] = useState<Vendor | null>(null);
  const [modalMode, setModalMode] = useState<"view" | "edit">("view");
  const [modalOpen, setModalOpen] = useState(false);

  // Confirmation dialog state
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmAction, setConfirmAction] = useState<{ vendor: Vendor; action: "approve" | "reject" } | null>(null);
  const [confirmLoading, setConfirmLoading] = useState(false);

  const fetchData = useCallback(() => {
    api.getVendors({ page, per_page: 10, search: search || undefined, status: statusFilter || undefined }).then(setData);
  }, [page, search, statusFilter]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const openModal = (vendor: Vendor, mode: "view" | "edit") => {
    setSelected(vendor);
    setModalMode(mode);
    setModalOpen(true);
  };

  const handleSave = async (id: string, updates: Partial<Vendor>) => {
    await api.updateVendor(id, updates);
    toast.success("Vendor updated successfully");
    fetchData();
  };

  const openConfirm = (vendor: Vendor, action: "approve" | "reject") => {
    setConfirmAction({ vendor, action });
    setConfirmOpen(true);
  };

  const handleConfirm = async () => {
    if (!confirmAction) return;
    setConfirmLoading(true);
    const { vendor, action } = confirmAction;
    const nextStatus: Vendor["status"] = action === "reject" ? "rejected"
      : vendor.status === "pending" ? "level1_approved"
      : vendor.status === "level1_approved" ? "level2_approved"
      : "verified";
    try {
      await api.updateVendorStatus(vendor.id, nextStatus);
      toast.success(action === "approve" ? `Vendor approved → ${nextStatus.replace(/_/g, " ")}` : "Vendor rejected");
      fetchData();
    } finally {
      setConfirmLoading(false);
      setConfirmOpen(false);
      setConfirmAction(null);
    }
  };

  const handleExport = () => {
    if (!data) return;
    exportToCSV(data.data, [
      { key: "id", label: "ID" }, { key: "business_name", label: "Business" },
      { key: "name", label: "Owner" }, { key: "email", label: "Email" },
      { key: "mobile", label: "Mobile" }, { key: "commission_rate", label: "Commission %" },
      { key: "membership", label: "Plan" }, { key: "status", label: "Status" },
    ], "vendors");
    toast.success("CSV exported");
  };

  if (!data) return <AdminLayout><div className="flex items-center justify-center h-64"><div className="h-8 w-8 rounded-full border-2 border-primary border-t-transparent animate-spin" /></div></AdminLayout>;

  return (
    <AdminLayout>
      <div className="page-header">
        <h1 className="page-title">Vendors</h1>
        <p className="page-description">{data.total.toLocaleString()} registered vendors · Multi-level approval</p>
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
          { key: "membership", label: "Plan", render: (v) => (
            <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${v.membership === 'premium' ? 'bg-warning/10 text-warning' : 'bg-secondary text-secondary-foreground'}`}>
              {v.membership}
            </span>
          )},
          { key: "status", label: "Status", render: (v) => <StatusBadge status={v.status} /> },
          { key: "actions", label: "Actions", render: (v) => (
            <div className="flex gap-1">
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={(e) => { e.stopPropagation(); openModal(v, "view"); }}><Eye className="h-4 w-4" /></Button>
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={(e) => { e.stopPropagation(); openModal(v, "edit"); }}><Pencil className="h-4 w-4" /></Button>
              {v.status !== 'verified' && v.status !== 'rejected' && (
                <>
                  <Button variant="ghost" size="icon" className="h-7 w-7 text-success" onClick={(e) => { e.stopPropagation(); openConfirm(v, "approve"); }}><CheckCircle className="h-4 w-4" /></Button>
                  <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={(e) => { e.stopPropagation(); openConfirm(v, "reject"); }}><XCircle className="h-4 w-4" /></Button>
                </>
              )}
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
        onRowClick={(v) => openModal(v, "view")}
        onFilterChange={(key, val) => { if (key === "status") { setStatusFilter(val); setPage(1); } }}
        searchPlaceholder="Search vendors..."
        filters={[{ key: "status", label: "Status", options: [
          { value: "pending", label: "Pending" },
          { value: "level1_approved", label: "Level 1" },
          { value: "level2_approved", label: "Level 2" },
          { value: "verified", label: "Verified" },
          { value: "rejected", label: "Rejected" },
        ]}]}
      />
      <VendorModal vendor={selected} open={modalOpen} onOpenChange={setModalOpen} mode={modalMode} onSave={handleSave} />
      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title={confirmAction?.action === "approve" ? "Approve Vendor" : "Reject Vendor"}
        description={
          confirmAction?.action === "approve"
            ? `Are you sure you want to approve "${confirmAction.vendor.business_name}"? This will advance them to the next approval level.`
            : `Are you sure you want to reject "${confirmAction?.vendor.business_name}"? This action can be reversed from the edit modal.`
        }
        confirmLabel={confirmAction?.action === "approve" ? "Approve" : "Reject"}
        variant={confirmAction?.action === "reject" ? "destructive" : "default"}
        onConfirm={handleConfirm}
        loading={confirmLoading}
      />
    </AdminLayout>
  );
}
