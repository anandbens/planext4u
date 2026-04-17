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
import { CheckCircle, XCircle, Eye, Pencil, Trash2, Store, ShieldCheck, Clock, Ban, CreditCard, UserX } from "lucide-react";
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
  const [totalStats, setTotalStats] = useState({ total: 0, verified: 0, pending: 0, rejected: 0, deactivated: 0, deleted: 0 });

  const [pendingApps, setPendingApps] = useState<any[]>([]);

  const tabStatusFilter = activeTab === "pending" ? undefined : activeTab === "all" ? (statusFilter || "verified") : statusFilter || undefined;

  const fetchData = useCallback(async () => {
    if (activeTab === "deactivated" || activeTab === "deleted") {
      const targetStatus = activeTab;
      let q = supabase.from('vendors').select('*', { count: 'exact' }).eq('status', targetStatus);
      if (search) q = q.or(`name.ilike.%${search}%,business_name.ilike.%${search}%,email.ilike.%${search}%,mobile.ilike.%${search}%`);
      if (dateFrom) q = q.gte('created_at', dateFrom);
      if (dateTo) q = q.lte('created_at', dateTo + 'T23:59:59Z');
      const { data: rows, count } = await q.order('created_at', { ascending: false }).range((page - 1) * 10, page * 10 - 1);
      const mapped = (rows || []).map((v: any) => ({ ...v, commission_rate: v.commission_rate || 0, membership: v.membership || '' }));
      setData({ data: mapped as any, total: count || 0, page, per_page: 10, total_pages: Math.ceil((count || 0) / 10) });
      return;
    }

    if (activeTab === "pending") {
      let q = supabase
        .from('vendor_applications')
        .select('*', { count: 'exact' })
        .not('status', 'in', '(approved,verified,active,rejected)');

      if (search) q = q.or(`name.ilike.%${search}%,business_name.ilike.%${search}%,email.ilike.%${search}%,phone.ilike.%${search}%`);
      if (dateFrom) q = q.gte('created_at', dateFrom);
      if (dateTo) q = q.lte('created_at', dateTo + 'T23:59:59Z');

      const { data: apps, count, error } = await q
        .order('created_at', { ascending: false })
        .range((page - 1) * 10, page * 10 - 1);

      if (error) {
        toast.error("Failed to load pending vendor approvals");
        setData({ data: [], total: 0, page, per_page: 10, total_pages: 0 } as any);
        return;
      }

      const mapped = (apps || []).map((a: any) => ({
        id: a.id, name: a.name, business_name: a.business_name,
        mobile: a.phone, email: a.email,
        status: a.status === 'submitted' ? 'pending' : a.status,
        commission_rate: 0, membership: '', category_id: '', city_id: '', area_id: '',
        created_at: a.created_at, _isApplication: true,
      }));

      setData({ data: mapped as any, total: count || 0, page, per_page: 10, total_pages: Math.ceil((count || 0) / 10) });
      return;
    }

    if (activeTab === "rejected") {
      let q = supabase
        .from('vendor_applications')
        .select('*', { count: 'exact' })
        .eq('status', 'rejected');

      if (search) q = q.or(`name.ilike.%${search}%,business_name.ilike.%${search}%,email.ilike.%${search}%,phone.ilike.%${search}%`);
      if (dateFrom) q = q.gte('created_at', dateFrom);
      if (dateTo) q = q.lte('created_at', dateTo + 'T23:59:59Z');

      const { data: apps, count, error } = await q
        .order('created_at', { ascending: false })
        .range((page - 1) * 10, page * 10 - 1);

      if (error) {
        toast.error("Failed to load rejected vendors");
        setData({ data: [], total: 0, page, per_page: 10, total_pages: 0 } as any);
        return;
      }

      const mapped = (apps || []).map((a: any) => ({
        id: a.id, name: a.name, business_name: a.business_name,
        mobile: a.phone, email: a.email, status: 'rejected',
        commission_rate: 0, membership: '', category_id: '', city_id: '', area_id: '',
        created_at: a.created_at, _isApplication: true,
        rejection_reason: a.rejection_reason || '',
      }));

      setData({ data: mapped as any, total: count || 0, page, per_page: 10, total_pages: Math.ceil((count || 0) / 10) });
      return;
    }

    api.getVendors({ page, per_page: 10, search: search || undefined, status: tabStatusFilter, date_from: dateFrom, date_to: dateTo, payment_status: paymentFilter || undefined }).then(setData);
  }, [page, search, tabStatusFilter, paymentFilter, dateFrom, dateTo, activeTab]);

  const fetchStats = useCallback(async () => {
    const [
      { count: total },
      { count: verified },
      { count: rejected },
      { count: pendingCount },
      { count: deactivated },
      { count: deleted },
    ] = await Promise.all([
      supabase.from('vendors').select('*', { count: 'exact', head: true }).is('deleted_at', null),
      supabase.from('vendors').select('*', { count: 'exact', head: true }).eq('status', 'verified'),
      supabase.from('vendors').select('*', { count: 'exact', head: true }).eq('status', 'rejected'),
      supabase.from('vendor_applications').select('*', { count: 'exact', head: true }).not('status', 'in', '(approved,verified,active,rejected)'),
      supabase.from('vendors').select('*', { count: 'exact', head: true }).eq('status', 'deactivated'),
      supabase.from('vendors').select('*', { count: 'exact', head: true }).eq('status', 'deleted'),
    ]);

    setTotalStats({ total: total || 0, verified: verified || 0, pending: pendingCount || 0, rejected: rejected || 0, deactivated: deactivated || 0, deleted: deleted || 0 });
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);
  useEffect(() => { fetchStats(); }, [fetchStats]);
  useEffect(() => { setPage(1); setStatusFilter(""); setPaymentFilter(""); }, [activeTab]);

  const openModal = (vendor: Vendor | null, mode: "view" | "edit" | "create") => {
    setSelected(vendor); setModalMode(mode); setModalOpen(true);
  };

  const handleSave = async (id: string, updates: Partial<Vendor>) => {
    const isApp = (selected as any)?._isApplication;
    if (isApp) {
      if ((updates as any).status === 'verified' || (updates as any).status === 'approved') {
        // Approve application → create vendor in vendors table
        const { data: appData } = await supabase.from('vendor_applications').select('*').eq('id', id).single();
        if (appData) {
          const a = appData;
          const newVendor: any = {
            id: `VND-${Date.now()}`,
            name: updates.name || a.name, business_name: updates.business_name || a.business_name,
            mobile: updates.mobile || a.phone, email: updates.email || a.email,
            commission_rate: (updates as any).commission_rate || 10, membership: (updates as any).membership || 'basic',
            status: 'verified',
            shop_photo_url: a.shop_photo_url || '', shop_latitude: a.latitude || 0, shop_longitude: a.longitude || 0,
            shop_address: a.shop_address || '',
            plan_id: (updates as any).plan_id || null,
            max_redemption_percentage: (updates as any).max_redemption_percentage || null,
          };
          const { error: insertErr } = await supabase.from('vendors').insert(newVendor);
          if (insertErr) { toast.error("Failed to create vendor: " + insertErr.message); return; }
          await supabase.from('vendor_applications').update({ status: 'approved' }).eq('id', id);
          if (a.user_id) {
            await supabase.from('user_roles').insert({ user_id: a.user_id, role: 'vendor', vendor_id: newVendor.id } as any);
          }
          toast.success("Vendor approved and created");
        }
      } else {
        // Update application fields
        const appUpdates: any = {};
        if (updates.name) appUpdates.name = updates.name;
        if (updates.business_name) appUpdates.business_name = updates.business_name;
        if (updates.email) appUpdates.email = updates.email;
        if (updates.mobile) appUpdates.phone = updates.mobile;
        if ((updates as any).status) appUpdates.status = (updates as any).status;
        if ((updates as any).rejection_reason) appUpdates.rejection_reason = (updates as any).rejection_reason;
        if (Object.keys(appUpdates).length > 0) {
          await supabase.from('vendor_applications').update(appUpdates).eq('id', id);
        }
        toast.success("Application updated");
      }
    } else {
      try {
        await api.updateVendor(id, updates);
        toast.success("Vendor updated");
      } catch (err: any) {
        toast.error("Failed to update vendor: " + (err.message || "Unknown error"));
        return;
      }
    }
    fetchData(); fetchStats();
  };
  const [createVendorType, setCreateVendorType] = useState<"product" | "service">("product");

  const handleCreate = async (data: Partial<Vendor>) => {
    try {
      await api.createVendor(data, createVendorType);
      toast.success(`${createVendorType === "service" ? "Service" : "Product"} vendor created`);
    } catch (err: any) {
      toast.error("Failed to create vendor: " + (err.message || "Unknown error"));
      return;
    }
    // Jump to the "All" tab so the newly created (verified) vendor is visible right away.
    if (activeTab !== "all") setActiveTab("all");
    setPage(1);
    fetchData(); fetchStats();
  };
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
      const isApp = (vendor as any)._isApplication;
      if (action === "delete") {
        if (isApp) {
          await supabase.from('vendor_applications').delete().eq('id', vendor.id);
          toast.success("Application deleted");
        } else {
          await handleDelete(vendor.id);
        }
      } else if (action === "reject") {
        if (isApp) {
          await supabase.from('vendor_applications').update({ status: "rejected", rejection_reason: reason || "" }).eq('id', vendor.id);
        } else {
          await api.updateVendorStatus(vendor.id, "rejected");
          await supabase.from("vendor_applications").update({ status: "rejected", rejection_reason: reason || "" }).eq("phone", vendor.mobile);
        }
        toast.success("Vendor rejected");
      } else {
        if (isApp) {
          // Approve application → create vendor in vendors table
          const appData = await supabase.from('vendor_applications').select('*').eq('id', vendor.id).single();
          if (appData.data) {
            const a = appData.data;
            const newVendorId = `VND-${Date.now()}`;
            const newVendor: Record<string, any> = {
              id: newVendorId,
              name: a.name, business_name: a.business_name, mobile: a.phone, email: a.email,
              commission_rate: 10, membership: 'basic', status: 'verified',
              shop_latitude: a.latitude || 0, shop_longitude: a.longitude || 0,
              shop_address: a.shop_address || '',
              shop_photo_url: a.shop_photo_url || '',
            };
            const { error: insertErr } = await supabase.from('vendors').insert(newVendor as any);
            if (insertErr) { toast.error("Failed to create vendor: " + insertErr.message); return; }
            await supabase.from('vendor_applications').update({ status: 'approved' }).eq('id', vendor.id);
            // Create user_roles entry so vendor can log in
            if (a.user_id) {
              await supabase.from('user_roles').insert({ user_id: a.user_id, role: 'vendor', vendor_id: newVendorId } as any);
            }
            toast.success("Vendor approved and added to active vendors");
          }
        } else {
          const nextStatus: Vendor["status"] = vendor.status === "pending" ? "level1_approved"
            : vendor.status === "level1_approved" ? "level2_approved" : "verified";
          await api.updateVendorStatus(vendor.id, nextStatus);
          toast.success(`Vendor → ${nextStatus.replace(/_/g, " ")}`);
        }
      }
      fetchData(); fetchStats();
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

  const isSpecialTab = activeTab === "deactivated" || activeTab === "deleted";

  const summaryWidgets: SummaryWidget[] = activeTab === "pending" ? [
    { label: "Pending Approval", value: totalStats.pending, icon: <Clock className="h-5 w-5 text-warning" />, color: "bg-warning/5", textColor: "text-warning" },
  ] : activeTab === "deactivated" ? [
    { label: "Deactivated Vendors", value: totalStats.deactivated, icon: <UserX className="h-5 w-5 text-warning" />, color: "bg-warning/5", textColor: "text-warning" },
  ] : activeTab === "deleted" ? [
    { label: "Deleted Vendors", value: totalStats.deleted, icon: <Trash2 className="h-5 w-5 text-destructive" />, color: "bg-destructive/5", textColor: "text-destructive" },
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
        <div className="flex items-center gap-2">
          <p className="page-description">{data.total.toLocaleString()} registered vendors · Multi-level approval</p>
          {!isSpecialTab && (
            <Button variant="outline" size="sm" className="ml-auto gap-1" onClick={() => { setCreateVendorType("service"); openModal(null, "create"); }}>
              + Service Vendor
            </Button>
          )}
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="mb-4">
        <TabsList>
          <TabsTrigger value="pending">Pending Approval</TabsTrigger>
          <TabsTrigger value="all">All Verified Vendors</TabsTrigger>
          <TabsTrigger value="rejected">Rejected</TabsTrigger>
          <TabsTrigger value="deactivated">Deactivated ({totalStats.deactivated})</TabsTrigger>
          <TabsTrigger value="deleted">Deleted ({totalStats.deleted})</TabsTrigger>
        </TabsList>
      </Tabs>

      <DataTable
        columns={isSpecialTab ? [
          { key: "id", label: "ID" },
          { key: "business_name", label: "Business", render: (v: any) => (
            <div><p className="font-medium">{v.business_name}</p><p className="text-xs text-muted-foreground">{v.name}</p></div>
          )},
          { key: "email", label: "Email", render: (v: any) => <span className="text-xs">{v.email?.replace(/_DEL_\d+$/, '') || '—'}</span> },
          { key: "mobile", label: "Mobile", render: (v: any) => <span className="text-xs">{v.mobile?.replace(/_DEL_\d+$/, '') || '—'}</span> },
          { key: "deleted_at", label: activeTab === "deleted" ? "Deleted At" : "Deactivated", render: (v: any) => <span className="text-xs text-muted-foreground">{v.deleted_at ? new Date(v.deleted_at).toLocaleDateString() : '—'}</span> },
          { key: "status", label: "Status", render: (v: any) => <StatusBadge status={v.status} /> },
          { key: "actions", label: "", render: (v: any) => (
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={(e: any) => { e.stopPropagation(); openModal(v, "view"); }}><Eye className="h-4 w-4" /></Button>
          )},
        ] : [
          { key: "id", label: "ID" },
          { key: "business_name", label: "Business", render: (v: any) => (
            <div><p className="font-medium">{v.business_name}</p><p className="text-xs text-muted-foreground">{v.name}</p></div>
          )},
          { key: "email", label: "Email" },
          { key: "mobile", label: "Mobile" },
          { key: "commission_rate", label: "Commission", render: (v: any) => <span>{v.commission_rate}%</span> },
          { key: "plan_payment_status", label: "Payment", render: (v: any) => {
            const ps = v.plan_payment_status || "unpaid";
            const color = ps === "paid" ? "bg-success/10 text-success" : ps === "offline_pending" ? "bg-warning/10 text-warning" : "bg-destructive/10 text-destructive";
            return <Badge className={`border-0 text-[10px] ${color}`}>{ps === "offline_pending" ? "Pending" : ps}</Badge>;
          }},
          { key: "status", label: "Status", render: (v: any) => <StatusBadge status={v.status} /> },
          { key: "actions", label: "Actions", render: (v: any) => (
            <div className="flex gap-1">
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={(e: any) => { e.stopPropagation(); openModal(v, "view"); }}><Eye className="h-4 w-4" /></Button>
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={(e: any) => { e.stopPropagation(); openModal(v, "edit"); }}><Pencil className="h-4 w-4" /></Button>
              <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={(e: any) => { e.stopPropagation(); openConfirm(v, "delete"); }}><Trash2 className="h-4 w-4" /></Button>
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
        onAdd={!isSpecialTab ? () => { setCreateVendorType("product"); openModal(null, "create"); } : undefined}
        addLabel="Add Product Vendor"
        onRowClick={(v) => openModal(v, "view")}
        onFilterChange={(key, val) => { if (key === "status") { setStatusFilter(val); setPage(1); } if (key === "payment") { setPaymentFilter(val); setPage(1); } }}
        onDateRangeChange={(f, t) => { setDateFrom(f); setDateTo(t); setPage(1); }}
        searchPlaceholder="Search vendors..."
        filters={activeTab === "all" ? [{ key: "payment", label: "Payment", options: [
          { value: "paid", label: "Paid" }, { value: "unpaid", label: "Unpaid" },
          { value: "offline_pending", label: "Pending" },
        ]}] : undefined}
        summaryWidgets={summaryWidgets}
        enableBulkSelect={!isSpecialTab}
        onBulkDelete={!isSpecialTab ? handleBulkDelete : undefined}
        onBulkStatusUpdate={!isSpecialTab ? handleBulkStatus : undefined}
        bulkStatusOptions={!isSpecialTab ? [
          { value: "pending", label: "Pending" },
          { value: "verified", label: "Verified" },
          { value: "rejected", label: "Rejected" },
        ] : undefined}
      />
      <VendorModal vendor={selected} open={modalOpen} onOpenChange={setModalOpen} mode={modalMode} onSave={handleSave} onCreate={handleCreate} onDelete={handleDelete} vendorType={createVendorType} onRefresh={fetchData} />
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
