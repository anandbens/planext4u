import { useEffect, useState, useCallback } from "react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { DataTable, SummaryWidget } from "@/components/admin/DataTable";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { ConfirmDialog } from "@/components/admin/ConfirmDialog";
import { ImpactConfirmDialog, type ImpactRow } from "@/components/admin/ImpactConfirmDialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { api, Order, PaginatedResponse } from "@/lib/api";
import { OrderModal } from "@/components/admin/modals/OrderModal";
import { Button } from "@/components/ui/button";
import { Eye, Pencil, Ban, ShoppingCart, IndianRupee, Clock, CheckCircle, Trash2, RotateCcw, Wrench, Package } from "lucide-react";
import { exportToCSV } from "@/lib/csv";
import { toast } from "sonner";

type TabKey = "product" | "service" | "deleted";

export default function OrdersPage() {
  const [tab, setTab] = useState<TabKey>("product");
  const [data, setData] = useState<PaginatedResponse<Order> | null>(null);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [vendorFilter, setVendorFilter] = useState("");
  const [productFilter, setProductFilter] = useState("");
  const [customerFilter, setCustomerFilter] = useState("");
  const [minAmount, setMinAmount] = useState<string>("");
  const [maxAmount, setMaxAmount] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState("");
  const [dateFrom, setDateFrom] = useState<string>();
  const [dateTo, setDateTo] = useState<string>();
  /** Sub-filter applied to the Deleted tab to classify by Product / Service */
  const [deletedTypeFilter, setDeletedTypeFilter] = useState<"all" | "product" | "service">("all");

  const [selected, setSelected] = useState<Order | null>(null);
  const [modalMode, setModalMode] = useState<"view" | "edit">("view");
  const [modalOpen, setModalOpen] = useState(false);

  const [cancelConfirmOpen, setCancelConfirmOpen] = useState(false);
  const [cancelTarget, setCancelTarget] = useState<Order | null>(null);
  const [cancelLoading, setCancelLoading] = useState(false);

  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [deleteIds, setDeleteIds] = useState<string[]>([]);
  const [deleteLoading, setDeleteLoading] = useState(false);

  // Permanent (hard) delete state
  const [hardOpen, setHardOpen] = useState(false);
  const [hardIds, setHardIds] = useState<string[]>([]);
  const [hardImpact, setHardImpact] = useState<Record<string, number> | null>(null);
  const [hardImpactLoading, setHardImpactLoading] = useState(false);
  const [hardSubmitting, setHardSubmitting] = useState(false);

  const buildFilterParams = useCallback(() => {
    const min = minAmount === "" ? undefined : Number(minAmount);
    const max = maxAmount === "" ? undefined : Number(maxAmount);
    const effectiveType: "product" | "service" | "all" =
      tab === "deleted" ? deletedTypeFilter : tab;
    return {
      search: search || undefined,
      status: statusFilter || undefined,
      date_from: dateFrom, date_to: dateTo,
      vendor_type: effectiveType,
      deleted: tab === "deleted",
      vendor_filter: vendorFilter || undefined,
      product_filter: productFilter || undefined,
      customer_filter: customerFilter || undefined,
      min_amount: typeof min === "number" && !isNaN(min) ? min : undefined,
      max_amount: typeof max === "number" && !isNaN(max) ? max : undefined,
    };
  }, [search, statusFilter, dateFrom, dateTo, tab, deletedTypeFilter, vendorFilter, productFilter, customerFilter, minAmount, maxAmount]);

  const fetchData = useCallback(() => {
    api.getOrders({ page, per_page: 10, ...buildFilterParams() }).then(setData);
  }, [page, buildFilterParams]);

  useEffect(() => { fetchData(); }, [fetchData]);

  useEffect(() => {
    setPage(1); setSearch(""); setStatusFilter("");
    setVendorFilter(""); setProductFilter(""); setCustomerFilter("");
    setMinAmount(""); setMaxAmount("");
    if (tab !== "deleted") setDeletedTypeFilter("all");
  }, [tab]);

  const openModal = (order: Order, mode: "view" | "edit") => {
    setSelected(order); setModalMode(mode); setModalOpen(true);
  };

  const handleSave = async (id: string, status: Order["status"], shippingData?: any) => {
    if (status === "cancelled") {
      const order = data?.data.find(o => o.id === id);
      if (order) { setCancelTarget(order); setCancelConfirmOpen(true); setModalOpen(false); }
      return;
    }
    await api.updateOrderStatus(id, status, shippingData);
    toast.success("Order status updated");
    fetchData();
  };

  const handleCancelConfirm = async () => {
    if (!cancelTarget) return;
    setCancelLoading(true);
    try { await api.updateOrderStatus(cancelTarget.id, "cancelled"); toast.success("Order cancelled"); fetchData(); }
    finally { setCancelLoading(false); setCancelConfirmOpen(false); setCancelTarget(null); }
  };

  const handleBulkStatus = async (ids: string[], status: string) => {
    await api.bulkUpdateOrderStatus(ids, status);
    toast.success(`${ids.length} orders updated to ${status}`);
    fetchData();
  };

  const requestDelete = (ids: string[]) => { setDeleteIds(ids); setDeleteConfirmOpen(true); };

  const handleDeleteConfirm = async () => {
    if (deleteIds.length === 0) return;
    setDeleteLoading(true);
    try {
      await api.softDeleteOrders(deleteIds);
      toast.success(`${deleteIds.length} order${deleteIds.length > 1 ? 's' : ''} moved to Deleted`);
      fetchData();
    } catch (e: any) {
      toast.error(e?.message || "Failed to delete");
    } finally {
      setDeleteLoading(false); setDeleteConfirmOpen(false); setDeleteIds([]);
    }
  };

  const handleRestore = async (ids: string[]) => {
    try {
      await api.restoreOrders(ids);
      toast.success(`${ids.length} order${ids.length > 1 ? 's' : ''} restored`);
      fetchData();
    } catch (e: any) { toast.error(e?.message || "Failed to restore"); }
  };

  const requestHardDelete = async (ids: string[]) => {
    setHardIds(ids); setHardOpen(true); setHardImpact(null); setHardImpactLoading(true);
    try {
      const impact = await api.getOrdersDeletionImpact(ids);
      setHardImpact(impact);
    } catch (e: any) { toast.error(e?.message || "Could not check impact"); }
    finally { setHardImpactLoading(false); }
  };

  const handleHardDelete = async () => {
    if (hardIds.length === 0) return;
    setHardSubmitting(true);
    try {
      await api.hardDeleteOrders(hardIds);
      toast.success(`${hardIds.length} order${hardIds.length > 1 ? 's' : ''} permanently deleted`);
      fetchData();
      setHardOpen(false); setHardIds([]); setHardImpact(null);
    } catch (e: any) {
      toast.error(e?.message || "Failed to permanently delete orders");
    } finally { setHardSubmitting(false); }
  };

  const hardImpactRows: ImpactRow[] = hardImpact ? [
    { label: "Orders", count: hardImpact.orders || 0, critical: true, note: "removed from all reports" },
    { label: "Settlement records", count: hardImpact.settlements || 0, note: "vendor payouts tied to these orders" },
    { label: "Payment transactions", count: hardImpact.payments || 0, note: "Razorpay / wallet ledger entries" },
    { label: "Customer ratings", count: hardImpact.ratings || 0, note: "reviews left for these orders" },
  ] : [];

  const handleExport = () => {
    if (!data) return;
    exportToCSV(data.data, [
      { key: "id", label: "Order ID" }, { key: "customer_name", label: "Customer" },
      { key: "vendor_name", label: "Vendor" }, { key: "total", label: "Total" },
      { key: "status", label: "Status" },
    ], `orders-${tab}`);
    toast.success("CSV exported");
  };

  const totalRevenue = (data?.data || []).filter(o => o.status !== 'cancelled').reduce((s, o) => s + Number(o.total || 0), 0);
  const activeOrders = (data?.data || []).filter(o => !['completed', 'cancelled'].includes(o.status)).length;
  const completed = (data?.data || []).filter(o => o.status === 'completed').length;

  const summaryWidgets: SummaryWidget[] = tab === "deleted" ? [
    { label: "Deleted Orders", value: data?.total || 0, icon: <Trash2 className="h-5 w-5 text-destructive" />, color: "bg-destructive/5", textColor: "text-destructive" },
    { label: "Revenue (page)", value: `₹${totalRevenue.toLocaleString()}`, icon: <IndianRupee className="h-5 w-5 text-muted-foreground" />, color: "bg-muted/30" },
  ] : [
    { label: tab === "product" ? "Product Orders" : "Service Orders", value: data?.total || 0, icon: tab === "product" ? <Package className="h-5 w-5 text-primary" /> : <Wrench className="h-5 w-5 text-primary" />, color: "bg-primary/5" },
    { label: "Revenue (page)", value: `₹${totalRevenue.toLocaleString()}`, icon: <IndianRupee className="h-5 w-5 text-success" />, color: "bg-success/5", textColor: "text-success" },
    { label: "Active", value: activeOrders, icon: <Clock className="h-5 w-5 text-warning" />, color: "bg-warning/5", textColor: "text-warning" },
    { label: "Completed", value: completed, icon: <CheckCircle className="h-5 w-5 text-info" />, color: "bg-info/5", textColor: "text-info" },
  ];

  const columns = [
    { key: "id", label: "Order ID" },
    { key: "customer_name", label: "Customer" },
    { key: "vendor_name", label: "Vendor" },
    { key: "items", label: "Items", render: (o: Order) => <span className="text-xs text-muted-foreground">{(o.items || []).slice(0, 2).map((i: any) => i.title).join(", ") || "—"}{(o.items || []).length > 2 ? ` +${(o.items || []).length - 2}` : ""}</span> },
    { key: "total", label: "Total", render: (o: Order) => <span className="font-bold">₹{Number(o.total).toLocaleString()}</span> },
    { key: "status", label: "Status", render: (o: Order) => <StatusBadge status={o.status} /> },
    { key: "actions", label: "", render: (o: Order) => (
      <div className="flex gap-1">
        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={(e) => { e.stopPropagation(); openModal(o, "view"); }}><Eye className="h-4 w-4" /></Button>
        {tab !== "deleted" && (
          <>
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={(e) => { e.stopPropagation(); openModal(o, "edit"); }}><Pencil className="h-4 w-4" /></Button>
            {o.status !== "cancelled" && o.status !== "completed" && (
              <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={(e) => { e.stopPropagation(); setCancelTarget(o); setCancelConfirmOpen(true); }} title="Cancel order"><Ban className="h-4 w-4" /></Button>
            )}
            <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={(e) => { e.stopPropagation(); requestDelete([o.id]); }} title="Move to deleted"><Trash2 className="h-4 w-4" /></Button>
          </>
        )}
        {tab === "deleted" && (
          <>
            <Button variant="ghost" size="icon" className="h-7 w-7 text-success" onClick={(e) => { e.stopPropagation(); handleRestore([o.id]); }} title="Restore"><RotateCcw className="h-4 w-4" /></Button>
            <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={(e) => { e.stopPropagation(); requestHardDelete([o.id]); }} title="Permanently delete"><Trash2 className="h-4 w-4" /></Button>
          </>
        )}
      </div>
    )},
  ];

  return (
    <AdminLayout>
      <div className="page-header">
        <h1 className="page-title">Orders</h1>
        <p className="page-description">Product, Service & Deleted orders</p>
      </div>

      <Tabs value={tab} onValueChange={(v) => setTab(v as TabKey)} className="space-y-4">
        <TabsList>
          <TabsTrigger value="product"><Package className="h-4 w-4 mr-1.5" />Product Orders</TabsTrigger>
          <TabsTrigger value="service"><Wrench className="h-4 w-4 mr-1.5" />Service Orders</TabsTrigger>
          <TabsTrigger value="deleted"><Trash2 className="h-4 w-4 mr-1.5" />Deleted</TabsTrigger>
        </TabsList>

        {(["product", "service", "deleted"] as TabKey[]).map((k) => (
          <TabsContent key={k} value={k} className="space-y-3">
            {/* Vendor & product filters */}
            <div className="flex flex-wrap gap-2">
              <Input placeholder="Filter by vendor (name / ID)…" value={vendorFilter} onChange={(e) => { setVendorFilter(e.target.value); setPage(1); }} className="max-w-xs h-9 bg-secondary/50 border-0" />
              <Input placeholder="Filter by product / item title…" value={productFilter} onChange={(e) => { setProductFilter(e.target.value); setPage(1); }} className="max-w-xs h-9 bg-secondary/50 border-0" />
              {(vendorFilter || productFilter) && (
                <Button variant="ghost" size="sm" className="h-9 text-xs" onClick={() => { setVendorFilter(""); setProductFilter(""); setPage(1); }}>Clear filters</Button>
              )}
            </div>

            {!data ? (
              <div className="flex items-center justify-center h-64"><div className="h-8 w-8 rounded-full border-2 border-primary border-t-transparent animate-spin" /></div>
            ) : (
              <DataTable
                columns={columns}
                data={data.data}
                total={data.total}
                page={data.page}
                perPage={data.per_page}
                totalPages={data.total_pages}
                onPageChange={setPage}
                onSearch={setSearch}
                onExport={handleExport}
                onRowClick={(o) => openModal(o, "view")}
                onFilterChange={(key, val) => { if (key === "status") { setStatusFilter(val); setPage(1); } }}
                onDateRangeChange={(f, t) => { setDateFrom(f); setDateTo(t); setPage(1); }}
                searchPlaceholder="Search by order ID, customer, vendor…"
                filters={tab === "deleted" ? undefined : [{ key: "status", label: "Status", options: [
                  { value: "placed", label: "Placed" }, { value: "paid", label: "Paid" },
                  { value: "accepted", label: "Accepted" }, { value: "in_progress", label: "In Progress" },
                  { value: "shipped", label: "Shipped" }, { value: "delivered", label: "Delivered" },
                  { value: "completed", label: "Completed" }, { value: "cancelled", label: "Cancelled" },
                ]}]}
                summaryWidgets={summaryWidgets}
                enableBulkSelect
                onBulkDelete={tab === "deleted" ? requestHardDelete : requestDelete}
                onBulkStatusUpdate={tab === "deleted" ? undefined : handleBulkStatus}
                bulkStatusOptions={tab === "deleted" ? undefined : [
                  { value: "placed", label: "Placed" }, { value: "accepted", label: "Accepted" },
                  { value: "completed", label: "Completed" }, { value: "cancelled", label: "Cancelled" },
                ]}
              />
            )}

            {tab === "deleted" && data && data.data.length > 0 && (
              <p className="text-xs text-muted-foreground">Tip: Click the restore icon to bring an order back to its original tab.</p>
            )}
          </TabsContent>
        ))}
      </Tabs>

      <OrderModal order={selected} open={modalOpen} onOpenChange={setModalOpen} mode={modalMode} onSave={handleSave} />
      <ConfirmDialog open={cancelConfirmOpen} onOpenChange={setCancelConfirmOpen} title="Cancel Order"
        description={`Cancel order "${cancelTarget?.id}"? The customer will be notified.`}
        confirmLabel="Cancel Order" variant="destructive" onConfirm={handleCancelConfirm} loading={cancelLoading} />
      <ConfirmDialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen} title="Move to Deleted Orders"
        description={`Move ${deleteIds.length} order${deleteIds.length > 1 ? 's' : ''} to the Deleted tab? You can restore them later.`}
        confirmLabel="Move to Deleted" variant="destructive" onConfirm={handleDeleteConfirm} loading={deleteLoading} />

      <ImpactConfirmDialog
        open={hardOpen}
        onOpenChange={(o) => { setHardOpen(o); if (!o) { setHardIds([]); setHardImpact(null); } }}
        title={`Permanently delete ${hardIds.length} order${hardIds.length > 1 ? "s" : ""}`}
        description="This will erase the orders from the database. The records will disappear from every report (sales, tax, settlements, vendor revenue) and cannot be recovered."
        impacts={hardImpactRows}
        loading={hardImpactLoading}
        submitting={hardSubmitting}
        onConfirm={handleHardDelete}
      />
    </AdminLayout>
  );
}
