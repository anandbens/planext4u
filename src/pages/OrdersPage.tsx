import { useEffect, useState, useCallback } from "react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { DataTable, SummaryWidget } from "@/components/admin/DataTable";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { ConfirmDialog } from "@/components/admin/ConfirmDialog";
import { api, Order, PaginatedResponse } from "@/lib/api";
import { OrderModal } from "@/components/admin/modals/OrderModal";
import { Button } from "@/components/ui/button";
import { Eye, Pencil, Ban, ShoppingCart, IndianRupee, Clock, CheckCircle } from "lucide-react";
import { exportToCSV } from "@/lib/csv";
import { toast } from "sonner";

export default function OrdersPage() {
  const [data, setData] = useState<PaginatedResponse<Order> | null>(null);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [dateFrom, setDateFrom] = useState<string>();
  const [dateTo, setDateTo] = useState<string>();
  const [selected, setSelected] = useState<Order | null>(null);
  const [modalMode, setModalMode] = useState<"view" | "edit">("view");
  const [modalOpen, setModalOpen] = useState(false);
  const [cancelConfirmOpen, setCancelConfirmOpen] = useState(false);
  const [cancelTarget, setCancelTarget] = useState<Order | null>(null);
  const [cancelLoading, setCancelLoading] = useState(false);

  const fetchData = useCallback(() => {
    api.getOrders({ page, per_page: 10, search: search || undefined, status: statusFilter || undefined, date_from: dateFrom, date_to: dateTo }).then(setData);
  }, [page, search, statusFilter, dateFrom, dateTo]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const openModal = (order: Order, mode: "view" | "edit") => {
    setSelected(order); setModalMode(mode); setModalOpen(true);
  };

  const handleSave = async (id: string, status: Order["status"]) => {
    if (status === "cancelled") {
      const order = data?.data.find(o => o.id === id);
      if (order) { setCancelTarget(order); setCancelConfirmOpen(true); setModalOpen(false); }
      return;
    }
    await api.updateOrderStatus(id, status);
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

  const handleExport = () => {
    if (!data) return;
    exportToCSV(data.data, [
      { key: "id", label: "Order ID" }, { key: "customer_name", label: "Customer" },
      { key: "vendor_name", label: "Vendor" }, { key: "total", label: "Total" },
      { key: "status", label: "Status" },
    ], "orders");
    toast.success("CSV exported");
  };

  if (!data) return <AdminLayout><div className="flex items-center justify-center h-64"><div className="h-8 w-8 rounded-full border-2 border-primary border-t-transparent animate-spin" /></div></AdminLayout>;

  const totalRevenue = data.data.filter(o => o.status !== 'cancelled').reduce((s, o) => s + o.total, 0);
  const activeOrders = data.data.filter(o => !['completed', 'cancelled'].includes(o.status)).length;
  const completed = data.data.filter(o => o.status === 'completed').length;

  const summaryWidgets: SummaryWidget[] = [
    { label: "Total Orders", value: data.total, icon: <ShoppingCart className="h-5 w-5 text-primary" />, color: "bg-primary/5" },
    { label: "Revenue (page)", value: `₹${totalRevenue.toLocaleString()}`, icon: <IndianRupee className="h-5 w-5 text-success" />, color: "bg-success/5", textColor: "text-success" },
    { label: "Active", value: activeOrders, icon: <Clock className="h-5 w-5 text-warning" />, color: "bg-warning/5", textColor: "text-warning" },
    { label: "Completed", value: completed, icon: <CheckCircle className="h-5 w-5 text-info" />, color: "bg-info/5", textColor: "text-info" },
  ];

  return (
    <AdminLayout>
      <div className="page-header">
        <h1 className="page-title">Orders</h1>
        <p className="page-description">{data.total.toLocaleString()} total orders</p>
      </div>
      <DataTable
        columns={[
          { key: "id", label: "Order ID" },
          { key: "customer_name", label: "Customer" },
          { key: "vendor_name", label: "Vendor" },
          { key: "subtotal", label: "Subtotal", render: (o) => `₹${o.subtotal.toLocaleString()}` },
          { key: "tax", label: "Tax", render: (o) => `₹${o.tax.toLocaleString()}` },
          { key: "discount", label: "Discount", render: (o) => o.discount > 0 ? <span className="text-success">-₹{o.discount}</span> : "—" },
          { key: "total", label: "Total", render: (o) => <span className="font-bold">₹{o.total.toLocaleString()}</span> },
          { key: "status", label: "Status", render: (o) => <StatusBadge status={o.status} /> },
          { key: "actions", label: "", render: (o) => (
            <div className="flex gap-1">
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={(e) => { e.stopPropagation(); openModal(o, "view"); }}><Eye className="h-4 w-4" /></Button>
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={(e) => { e.stopPropagation(); openModal(o, "edit"); }}><Pencil className="h-4 w-4" /></Button>
              {o.status !== "cancelled" && o.status !== "completed" && (
                <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={(e) => { e.stopPropagation(); setCancelTarget(o); setCancelConfirmOpen(true); }}><Ban className="h-4 w-4" /></Button>
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
        onRowClick={(o) => openModal(o, "view")}
        onFilterChange={(key, val) => { if (key === "status") { setStatusFilter(val); setPage(1); } }}
        onDateRangeChange={(f, t) => { setDateFrom(f); setDateTo(t); setPage(1); }}
        searchPlaceholder="Search orders..."
        filters={[{ key: "status", label: "Status", options: [
          { value: "placed", label: "Placed" }, { value: "paid", label: "Paid" },
          { value: "accepted", label: "Accepted" }, { value: "in_progress", label: "In Progress" },
          { value: "delivered", label: "Delivered" }, { value: "completed", label: "Completed" },
          { value: "cancelled", label: "Cancelled" },
        ]}]}
        summaryWidgets={summaryWidgets}
        enableBulkSelect
        onBulkStatusUpdate={handleBulkStatus}
        bulkStatusOptions={[
          { value: "placed", label: "Placed" }, { value: "accepted", label: "Accepted" },
          { value: "completed", label: "Completed" }, { value: "cancelled", label: "Cancelled" },
        ]}
      />
      <OrderModal order={selected} open={modalOpen} onOpenChange={setModalOpen} mode={modalMode} onSave={handleSave} />
      <ConfirmDialog open={cancelConfirmOpen} onOpenChange={setCancelConfirmOpen} title="Cancel Order"
        description={`Cancel order "${cancelTarget?.id}"? The customer will be notified.`}
        confirmLabel="Cancel Order" variant="destructive" onConfirm={handleCancelConfirm} loading={cancelLoading} />
    </AdminLayout>
  );
}
