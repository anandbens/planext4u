import { useEffect, useState, useCallback } from "react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { DataTable, SummaryWidget } from "@/components/admin/DataTable";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { ConfirmDialog } from "@/components/admin/ConfirmDialog";
import { api, Vendor, PaginatedResponse } from "@/lib/api";
import { VendorModal } from "@/components/admin/modals/VendorModal";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, XCircle, Eye, Pencil, Trash2, Store, ShieldCheck, Clock, Ban, CreditCard } from "lucide-react";
import { exportToCSV } from "@/lib/csv";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

export default function VendorsPage() {
  const [activeTab, setActiveTab] = useState("pending");
  const [data, setData] = useState<PaginatedResponse<Vendor> | null>(null);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [paymentFilter, setPaymentFilter] = useState("");
  const [dateFrom, setDateFrom] = useState<string>();
  const [dateTo, setDateTo] = useState<string>();
  const [selected, setSelected] = useState<Vendor | null>(null);
  const [modalMode, setModalMode] = useState<"view" | "edit" | "create">("view");
  const [modalOpen, setModalOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmAction, setConfirmAction] = useState<{ vendor: Vendor; action: "approve" | "reject" | "delete" } | null>(null);
  const [confirmLoading, setConfirmLoading] = useState(false);
  const [totalStats, setTotalStats] = useState({ total: 0, verified: 0, pending: 0, rejected: 0 });

  const tabStatusFilter = activeTab === "pending" ? "pending" : statusFilter || undefined;

  const fetchData = useCallback(() => {
    api.getVendors({ page, per_page: 10, search: search || undefined, status: tabStatusFilter, date_from: dateFrom, date_to: dateTo, payment_status: paymentFilter || undefined }).then(setData);
  }, [page, search, tabStatusFilter, paymentFilter, dateFrom, dateTo]);

  const fetchStats = useCallback(async () => {
    const [
      { count: total },
      { count: verified },
      { count: pending },
      { count: rejected },
    ] = await Promise.all([
      supabase.from('vendors').select('*', { count: 'exact', head: true }),
      supabase.from('vendors').select('*', { count: 'exact', head: true }).eq('status', 'verified'),
      supabase.from('vendors').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
      supabase.from('vendors').select('*', { count: 'exact', head: true }).eq('status', 'rejected'),
    ]);
    setTotalStats({ total: total || 0, verified: verified || 0, pending: pending || 0, rejected: rejected || 0 });
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);
  useEffect(() => { fetchStats(); }, [fetchStats]);
  useEffect(() => { setPage(1); setStatusFilter(""); setPaymentFilter(""); }, [activeTab]);

  const openModal = (vendor: Vendor | null, mode: "view" | "edit" | "create") => {
    setSelected(vendor); setModalMode(mode); setModalOpen(true);
  };

  const handleSave = async (id: string, updates: Partial<Vendor>) => { await api.updateVendor(id, updates); toast.success("Vendor updated"); fetchData(); fetchStats(); };
  const handleCreate = async (data: Partial<Vendor>) => { await api.createVendor(data); toast.success("Vendor created"); fetchData(); fetchStats(); };
  const handleDelete = async (id: string) => { await api.deleteVendor(id); toast.success("Vendor deleted"); fetchData(); fetchStats(); };

  const handleBulkDelete = async (ids: string[]) => {
    await api.bulkDeleteVendors(ids);
    toast.success(`${ids.length} vendors deleted`);
    fetchData(); fetchStats();
  };

  const handleBulkStatus = async (ids: string[], status: string) => {
    await api.bulkUpdateVendorStatus(ids, status);
    toast.success(`${ids.length} vendors updated to ${status}`);
    fetchData(); fetchStats();
  };

  const openConfirm = (vendor: Vendor, action: "approve" | "reject" | "delete") => {
    setConfirmAction({ vendor, action }); setConfirmOpen(true);
  };

  const handleConfirm = async (reason?: string) => {
    if (!confirmAction) return;
    setConfirmLoading(true);
    const { vendor, action } = confirmAction;
    try {
      if (action === "delete") { await handleDelete(vendor.id); }
      else if (action === "reject") {
        await api.updateVendorStatus(vendor.id, "rejected");
        const { supabase: _sb } = await import("@/integrations/supabase/client");
        await _sb.from("vendor_applications").update({ status: "rejected", rejection_reason: reason || "" }).eq("phone", vendor.mobile);
        toast.success("Vendor rejected");
        fetchData(); fetchStats();
      } else {
        const nextStatus: Vendor["status"] = vendor.status === "pending" ? "level1_approved"
          : vendor.status === "level1_approved" ? "level2_approved" : "verified";
        await api.updateVendorStatus(vendor.id, nextStatus);
        toast.success(`Vendor → ${nextStatus.replace(/_/g, " ")}`);
        fetchData(); fetchStats();
      }
    } finally { setConfirmLoading(false); setConfirmOpen(false); setConfirmAction(null); }
  };

  const handleExport = () => {
    if (!data) return;
    exportToCSV(data.data, [
      { key: "id", label: "ID" }, { key: "business_name", label: "Business" },
      { key: "name", label: "Owner" }, { key: "email", label: "Email" },
      { key: "commission_rate", label: "Commission %" }, { key: "status", label: "Status" },
    ], "vendors");
    toast.success("CSV exported");
  };

  if (!data) return <AdminLayout><div className="flex items-center justify-center h-64"><div className="h-8 w-8 rounded-full border-2 border-primary border-t-transparent animate-spin" /></div></AdminLayout>;

  const summaryWidgets: SummaryWidget[] = activeTab === "pending" ? [
    { label: "Pending Approval", value: totalStats.pending, icon: <Clock className="h-5 w-5 text-warning" />, color: "bg-warning/5", textColor: "text-warning" },
  ] : [
    { label: "Total Vendors", value: totalStats.total, icon: <Store className="h-5 w-5 text-primary" />, color: "bg-primary/5" },
    { label: "Verified", value: totalStats.verified, icon: <ShieldCheck className="h-5 w-5 text-success" />, color: "bg-success/5", textColor: "text-success" },
    { label: "Pending", value: totalStats.pending, icon: <Clock className="h-5 w-5 text-warning" />, color: "bg-warning/5", textColor: "text-warning" },
    { label: "Rejected", value: totalStats.rejected, icon: <Ban className="h-5 w-5 text-destructive" />, color: "bg-destructive/5", textColor: "text-destructive" },
  ];

  return (
    <AdminLayout>
      <div className="page-header">
        <h1 className="page-title">Vendors</h1>
        <p className="page-description">{data.total.toLocaleString()} registered vendors · Multi-level approval</p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="mb-4">
        <TabsList>
          <TabsTrigger value="pending">Pending Approval</TabsTrigger>
          <TabsTrigger value="all">All Vendors</TabsTrigger>
        </TabsList>
      </Tabs>

      <DataTable
        columns={[
          { key: "id", label: "ID" },
          { key: "business_name", label: "Business", render: (v) => (
            <div><p className="font-medium">{v.business_name}</p><p className="text-xs text-muted-foreground">{v.name}</p></div>
          )},
          { key: "email", label: "Email" },
          { key: "mobile", label: "Mobile" },
          { key: "commission_rate", label: "Commission", render: (v) => <span>{v.commission_rate}%</span> },
          { key: "plan_payment_status", label: "Payment", render: (v: any) => {
            const ps = v.plan_payment_status || "unpaid";
            const color = ps === "paid" ? "bg-success/10 text-success" : ps === "offline_pending" ? "bg-warning/10 text-warning" : "bg-destructive/10 text-destructive";
            return <Badge className={`border-0 text-[10px] ${color}`}>{ps === "offline_pending" ? "Pending" : ps}</Badge>;
          }},
          { key: "status", label: "Status", render: (v) => <StatusBadge status={v.status} /> },
          { key: "actions", label: "Actions", render: (v) => (
            <div className="flex gap-1">
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={(e) => { e.stopPropagation(); openModal(v, "view"); }}><Eye className="h-4 w-4" /></Button>
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={(e) => { e.stopPropagation(); openModal(v, "edit"); }}><Pencil className="h-4 w-4" /></Button>
              {v.status !== 'verified' && v.status !== 'rejected' && (
                <>
                  <Button variant="ghost" size="icon" className="h-7 w-7 text-success" onClick={(e) => { e.stopPropagation(); openConfirm(v, "approve"); }} title="Approve"><CheckCircle className="h-4 w-4" /></Button>
                  <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={(e) => { e.stopPropagation(); openConfirm(v, "reject"); }} title="Reject"><XCircle className="h-4 w-4" /></Button>
                </>
              )}
              <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={(e) => { e.stopPropagation(); openConfirm(v, "delete"); }}><Trash2 className="h-4 w-4" /></Button>
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
        addLabel="Add Vendor"
        onRowClick={(v) => openModal(v, "view")}
        onFilterChange={(key, val) => { if (key === "status") { setStatusFilter(val); setPage(1); } if (key === "payment") { setPaymentFilter(val); setPage(1); } }}
        onDateRangeChange={(f, t) => { setDateFrom(f); setDateTo(t); setPage(1); }}
        searchPlaceholder="Search vendors..."
        filters={activeTab === "all" ? [{ key: "status", label: "Status", options: [
          { value: "pending", label: "Pending" }, { value: "level1_approved", label: "Level 1" },
          { value: "level2_approved", label: "Level 2" }, { value: "verified", label: "Verified" },
          { value: "rejected", label: "Rejected" },
        ]}, { key: "payment", label: "Payment", options: [
          { value: "paid", label: "Paid" }, { value: "unpaid", label: "Unpaid" },
          { value: "offline_pending", label: "Pending" },
        ]}] : undefined}
        summaryWidgets={summaryWidgets}
        enableBulkSelect
        onBulkDelete={handleBulkDelete}
        onBulkStatusUpdate={handleBulkStatus}
        bulkStatusOptions={[
          { value: "pending", label: "Pending" },
          { value: "verified", label: "Verified" },
          { value: "rejected", label: "Rejected" },
        ]}
      />
      <VendorModal vendor={selected} open={modalOpen} onOpenChange={setModalOpen} mode={modalMode} onSave={handleSave} onCreate={handleCreate} onDelete={handleDelete} onRefresh={fetchData} />
      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title={confirmAction?.action === "approve" ? "Approve Vendor" : confirmAction?.action === "delete" ? "Delete Vendor" : "Reject Vendor"}
        description={confirmAction?.action === "approve" ? `Approve "${confirmAction.vendor.business_name}"?` : confirmAction?.action === "delete" ? `Delete "${confirmAction?.vendor.business_name}"?` : `Reject "${confirmAction?.vendor.business_name}"? Please provide a reason.`}
        confirmLabel={confirmAction?.action === "approve" ? "Approve" : confirmAction?.action === "delete" ? "Delete" : "Reject"}
        variant={confirmAction?.action === "approve" ? "default" : "destructive"}
        onConfirm={handleConfirm}
        loading={confirmLoading}
        showReasonField={confirmAction?.action === "reject"}
        reasonLabel="Rejection Reason *"
        reasonPlaceholder="Explain why this vendor is being rejected..."
      />
    </AdminLayout>
  );
}
