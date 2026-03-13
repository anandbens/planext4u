import { useEffect, useState, useCallback } from "react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { DataTable, SummaryWidget } from "@/components/admin/DataTable";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { ConfirmDialog } from "@/components/admin/ConfirmDialog";
import { api, Settlement, PaginatedResponse } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { CheckCircle, Wallet, IndianRupee, Clock, Banknote } from "lucide-react";
import { toast } from "sonner";
import { exportToCSV } from "@/lib/csv";

export default function SettlementsPage() {
  const [data, setData] = useState<PaginatedResponse<Settlement> | null>(null);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [dateFrom, setDateFrom] = useState<string>();
  const [dateTo, setDateTo] = useState<string>();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmTarget, setConfirmTarget] = useState<Settlement | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchData = useCallback(() => {
    api.getSettlements({ page, per_page: 10, search: search || undefined, status: statusFilter || undefined, date_from: dateFrom, date_to: dateTo }).then(setData);
  }, [page, search, statusFilter, dateFrom, dateTo]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleSettle = (settlement: Settlement) => { setConfirmTarget(settlement); setConfirmOpen(true); };

  const confirmSettle = async () => {
    if (!confirmTarget) return;
    setLoading(true);
    try { await api.settleSettlement(confirmTarget.id); toast.success(`Settlement ${confirmTarget.id} processed`); fetchData(); }
    finally { setLoading(false); setConfirmOpen(false); setConfirmTarget(null); }
  };

  const handleBulkSettle = async (ids: string[]) => {
    await api.bulkSettleSettlements(ids);
    toast.success(`${ids.length} settlements processed`);
    fetchData();
  };

  const handleExport = () => {
    if (!data) return;
    exportToCSV(data.data, [
      { key: "id", label: "ID" }, { key: "vendor_name", label: "Vendor" },
      { key: "order_id", label: "Order" }, { key: "amount", label: "Amount" },
      { key: "commission", label: "Commission" }, { key: "net_amount", label: "Net" },
      { key: "status", label: "Status" },
    ], "settlements");
    toast.success("CSV exported");
  };

  if (!data) return <AdminLayout><div className="flex items-center justify-center h-64"><div className="h-8 w-8 rounded-full border-2 border-primary border-t-transparent animate-spin" /></div></AdminLayout>;

  const totalAmount = data.data.reduce((s, st) => s + st.amount, 0);
  const totalCommission = data.data.reduce((s, st) => s + st.commission, 0);
  const totalNet = data.data.reduce((s, st) => s + st.net_amount, 0);
  const pendingCount = data.data.filter(s => s.status === 'pending' || s.status === 'eligible').length;

  const summaryWidgets: SummaryWidget[] = [
    { label: "Total Settlements", value: data.total, icon: <Wallet className="h-5 w-5 text-primary" />, color: "bg-primary/5" },
    { label: "Order Amount (page)", value: `₹${totalAmount.toLocaleString()}`, icon: <IndianRupee className="h-5 w-5 text-info" />, color: "bg-info/5", textColor: "text-info" },
    { label: "Commission (page)", value: `₹${totalCommission.toLocaleString()}`, icon: <Banknote className="h-5 w-5 text-warning" />, color: "bg-warning/5", textColor: "text-warning" },
    { label: "Pending/Eligible", value: pendingCount, icon: <Clock className="h-5 w-5 text-destructive" />, color: "bg-destructive/5", textColor: "text-destructive" },
  ];

  return (
    <AdminLayout>
      <div className="page-header">
        <h1 className="page-title">Settlements</h1>
        <p className="page-description">{data.total} settlements · Manual settlement by default</p>
      </div>
      <DataTable
        columns={[
          { key: "id", label: "ID" },
          { key: "vendor_name", label: "Vendor" },
          { key: "order_id", label: "Order" },
          { key: "amount", label: "Order Amount", render: (s) => `₹${s.amount.toLocaleString()}` },
          { key: "commission", label: "Commission", render: (s) => <span className="text-destructive">-₹{s.commission.toLocaleString()}</span> },
          { key: "net_amount", label: "Net Payout", render: (s) => <span className="font-bold text-success">₹{s.net_amount.toLocaleString()}</span> },
          { key: "status", label: "Status", render: (s) => <StatusBadge status={s.status} /> },
          { key: "actions", label: "", render: (s) => s.status === 'eligible' || s.status === 'pending' ? (
            <Button variant="outline" size="sm" className="gap-1 text-success border-success/30 hover:bg-success/10"
              onClick={(e) => { e.stopPropagation(); handleSettle(s); }}>
              <CheckCircle className="h-3.5 w-3.5" /> Settle
            </Button>
          ) : s.status === 'settled' ? (
            <span className="text-xs text-muted-foreground">Settled</span>
          ) : null },
        ]}
        data={data.data}
        total={data.total}
        page={data.page}
        perPage={data.per_page}
        totalPages={data.total_pages}
        onPageChange={setPage}
        onSearch={setSearch}
        onExport={handleExport}
        onFilterChange={(key, val) => { if (key === "status") { setStatusFilter(val); setPage(1); } }}
        onDateRangeChange={(f, t) => { setDateFrom(f); setDateTo(t); setPage(1); }}
        searchPlaceholder="Search settlements..."
        filters={[{ key: "status", label: "Status", options: [
          { value: "pending", label: "Pending" }, { value: "eligible", label: "Eligible" },
          { value: "settled", label: "Settled" }, { value: "on_hold", label: "On Hold" },
        ]}]}
        summaryWidgets={summaryWidgets}
        enableBulkSelect
        onBulkStatusUpdate={(ids) => handleBulkSettle(ids)}
        bulkStatusOptions={[{ value: "settle", label: "Settle Selected" }]}
      />
      <ConfirmDialog open={confirmOpen} onOpenChange={setConfirmOpen} title="Process Settlement"
        description={`Process settlement ${confirmTarget?.id} for vendor "${confirmTarget?.vendor_name}"? Net payout: ₹${confirmTarget?.net_amount.toLocaleString()}`}
        confirmLabel="Process Settlement" variant="default" onConfirm={confirmSettle} loading={loading} />
    </AdminLayout>
  );
}
