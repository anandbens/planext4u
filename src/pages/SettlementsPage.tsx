import { useEffect, useState, useCallback } from "react";
import { fmtTs } from "@/lib/format-date";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { DataTable, SummaryWidget } from "@/components/admin/DataTable";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { api, Settlement, PaginatedResponse } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, Wallet, IndianRupee, Clock, Banknote, XCircle, Eye, Package } from "lucide-react";
import { toast } from "sonner";
import { exportToCSV } from "@/lib/csv";
import { supabase } from "@/integrations/supabase/client";
import { useCurrency } from "@/lib/country-context";

export default function SettlementsPage() {
  const { format: fmt } = useCurrency();
  const [data, setData] = useState<PaginatedResponse<Settlement> | null>(null);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [dateFrom, setDateFrom] = useState<string>();
  const [dateTo, setDateTo] = useState<string>();
  const [loading, setLoading] = useState(false);

  // Settle dialog
  const [settleOpen, setSettleOpen] = useState(false);
  const [settleTarget, setSettleTarget] = useState<Settlement | null>(null);
  const [txnRef, setTxnRef] = useState("");

  // Reject dialog
  const [rejectOpen, setRejectOpen] = useState(false);
  const [rejectTarget, setRejectTarget] = useState<Settlement | null>(null);
  const [rejectReason, setRejectReason] = useState("");

  // Order detail dialog
  const [orderDetailOpen, setOrderDetailOpen] = useState(false);
  const [orderDetail, setOrderDetail] = useState<any>(null);
  const [orderItems, setOrderItems] = useState<any[]>([]);

  const fetchData = useCallback(async () => {
    const page_ = page;
    const perPage = 10;
    const from = (page_ - 1) * perPage;
    const to = from + perPage - 1;

    let query = supabase.from('settlements').select('*', { count: 'exact' });
    if (statusFilter && statusFilter !== 'all') query = query.eq('status', statusFilter);
    if (dateFrom) query = query.gte('created_at', dateFrom);
    if (dateTo) query = query.lte('created_at', dateTo + 'T23:59:59Z');

    // Search across multiple columns
    if (search) {
      query = query.or(`id.ilike.%${search}%,vendor_name.ilike.%${search}%,order_id.ilike.%${search}%,vendor_id.ilike.%${search}%,transaction_reference.ilike.%${search}%`);
    }

    query = query.order('created_at', { ascending: false }).range(from, to);

    const { data: rows, count, error } = await query;
    if (error) { toast.error("Failed to load settlements"); return; }
    setData({
      data: (rows || []) as any,
      total: count || 0,
      page: page_,
      per_page: perPage,
      total_pages: Math.ceil((count || 0) / perPage),
    });
  }, [page, search, statusFilter, dateFrom, dateTo]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleSettle = (s: Settlement) => {
    setSettleTarget(s);
    setTxnRef((s as any).transaction_reference || "");
    setSettleOpen(true);
  };

  const confirmSettle = async () => {
    if (!settleTarget) return;
    if (!txnRef.trim()) { toast.error("Transaction reference is required"); return; }
    setLoading(true);
    try {
      const { error } = await supabase.from('settlements').update({
        status: 'settled',
        settled_at: new Date().toISOString(),
        transaction_reference: txnRef.trim(),
      } as any).eq('id', settleTarget.id);
      if (error) throw error;
      toast.success(`Settlement ${settleTarget.id} processed`);
      fetchData();
    } finally { setLoading(false); setSettleOpen(false); setSettleTarget(null); setTxnRef(""); }
  };

  const handleReject = (s: Settlement) => {
    setRejectTarget(s);
    setRejectReason("");
    setRejectOpen(true);
  };

  const confirmReject = async () => {
    if (!rejectTarget) return;
    if (!rejectReason.trim()) { toast.error("Rejection reason is required"); return; }
    setLoading(true);
    try {
      const { error } = await supabase.from('settlements').update({
        status: 'rejected',
        rejection_reason: rejectReason.trim(),
      } as any).eq('id', rejectTarget.id);
      if (error) throw error;
      toast.success(`Settlement ${rejectTarget.id} rejected`);
      fetchData();
    } finally { setLoading(false); setRejectOpen(false); setRejectTarget(null); setRejectReason(""); }
  };

  const viewOrderDetails = async (orderId: string) => {
    const { data: order } = await supabase.from('orders').select('*').eq('id', orderId).single();
    if (order) {
      setOrderDetail(order);
      setOrderItems(Array.isArray(order.items) ? order.items : (order.items ? JSON.parse(order.items as string) : []));
      setOrderDetailOpen(true);
    } else {
      toast.error("Order not found");
    }
  };

  const handleBulkSettle = async (ids: string[]) => {
    const now = new Date().toISOString();
    const { error } = await supabase.from('settlements').update({ status: 'settled', settled_at: now } as any).in('id', ids);
    if (error) { toast.error("Bulk settle failed"); return; }
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
    { label: "Order Amount (page)", value: fmt(totalAmount, { decimals: 0 }), icon: <IndianRupee className="h-5 w-5 text-info" />, color: "bg-info/5", textColor: "text-info" },
    { label: "Commission (page)", value: fmt(totalCommission, { decimals: 0 }), icon: <Banknote className="h-5 w-5 text-warning" />, color: "bg-warning/5", textColor: "text-warning" },
    { label: "Pending/Eligible", value: pendingCount, icon: <Clock className="h-5 w-5 text-destructive" />, color: "bg-destructive/5", textColor: "text-destructive" },
  ];

  return (
    <AdminLayout>
      <div className="page-header">
        <h1 className="page-title">Settlements</h1>
        <p className="page-description">{data.total} settlements · Search by ID, vendor, order, or txn ref</p>
      </div>
      <DataTable
        columns={[
          { key: "id", label: "ID" },
          { key: "vendor_name", label: "Vendor" },
          { key: "order_id", label: "Order", render: (s: any) => (
            <Button variant="link" className="h-auto p-0 text-xs text-primary" onClick={(e) => { e.stopPropagation(); viewOrderDetails(s.order_id); }}>
              {s.order_id}
            </Button>
          )},
          { key: "amount", label: "Order Amount", render: (s: any) => fmt(s.amount, { decimals: 0 }) },
          { key: "commission", label: "Commission", render: (s: any) => <span className="text-destructive">-{fmt(s.commission, { decimals: 0 })}</span> },
          { key: "net_amount", label: "Net Payout", render: (s: any) => <span className="font-bold text-success">{fmt(s.net_amount, { decimals: 0 })}</span> },
          { key: "transaction_reference", label: "Txn Ref", render: (s: any) => <span className="text-xs font-mono">{(s as any).transaction_reference || "—"}</span> },
          { key: "status", label: "Status", render: (s: any) => <StatusBadge status={s.status} /> },
          { key: "created_at", label: "Created", render: (s: any) => <span className="text-xs text-muted-foreground whitespace-nowrap">{fmtTs(s.created_at)}</span> },
          { key: "settled_at", label: "Settled", render: (s: any) => <span className="text-xs text-muted-foreground whitespace-nowrap">{fmtTs(s.settled_at)}</span> },
          { key: "actions", label: "", render: (s: any) => (
            <div className="flex gap-1">
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={(e) => { e.stopPropagation(); viewOrderDetails(s.order_id); }}><Eye className="h-4 w-4" /></Button>
              {(s.status === 'eligible' || s.status === 'pending') && (
                <>
                  <Button variant="outline" size="sm" className="gap-1 text-success border-success/30 hover:bg-success/10 h-7 text-xs"
                    onClick={(e) => { e.stopPropagation(); handleSettle(s); }}>
                    <CheckCircle className="h-3.5 w-3.5" /> Settle
                  </Button>
                  <Button variant="outline" size="sm" className="gap-1 text-destructive border-destructive/30 hover:bg-destructive/10 h-7 text-xs"
                    onClick={(e) => { e.stopPropagation(); handleReject(s); }}>
                    <XCircle className="h-3.5 w-3.5" /> Reject
                  </Button>
                </>
              )}
              {s.status === 'settled' && <span className="text-xs text-muted-foreground">Settled</span>}
              {s.status === 'rejected' && (
                <span className="text-xs text-destructive" title={(s as any).rejection_reason || ""}>Rejected</span>
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
        onFilterChange={(key, val) => { if (key === "status") { setStatusFilter(val); setPage(1); } }}
        onDateRangeChange={(f, t) => { setDateFrom(f); setDateTo(t); setPage(1); }}
        searchPlaceholder="Search by ID, vendor, order, txn ref..."
        filters={[{ key: "status", label: "Status", options: [
          { value: "pending", label: "Pending" }, { value: "eligible", label: "Eligible" },
          { value: "settled", label: "Settled" }, { value: "rejected", label: "Rejected" },
          { value: "on_hold", label: "On Hold" },
        ]}]}
        summaryWidgets={summaryWidgets}
        enableBulkSelect
        onBulkStatusUpdate={(ids) => handleBulkSettle(ids)}
        bulkStatusOptions={[{ value: "settle", label: "Settle Selected" }]}
      />

      {/* Settle Dialog */}
      <Dialog open={settleOpen} onOpenChange={setSettleOpen}>
        <DialogContent className="max-w-md">
          <DialogTitle>Process Settlement</DialogTitle>
          <div className="space-y-4 mt-2">
            <div className="p-3 rounded-lg bg-secondary/30 text-sm">
              <p><strong>Settlement:</strong> {settleTarget?.id}</p>
              <p><strong>Vendor:</strong> {settleTarget?.vendor_name}</p>
              <p><strong>Net Payout:</strong> <span className="text-success font-bold">{settleTarget ? fmt(settleTarget.net_amount, { decimals: 0 }) : ""}</span></p>
            </div>
            <div>
              <Label className="text-xs font-semibold">Transaction Reference Number *</Label>
              <Input value={txnRef} onChange={(e) => setTxnRef(e.target.value)} placeholder="Enter bank txn ref / UTR number" className="mt-1" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSettleOpen(false)} disabled={loading}>Cancel</Button>
            <Button onClick={confirmSettle} disabled={loading || !txnRef.trim()} className="gap-1">
              {loading && <div className="h-4 w-4 rounded-full border-2 border-current border-t-transparent animate-spin" />}
              <CheckCircle className="h-4 w-4" /> Confirm Settlement
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reject Dialog */}
      <Dialog open={rejectOpen} onOpenChange={setRejectOpen}>
        <DialogContent className="max-w-md">
          <DialogTitle>Reject Settlement</DialogTitle>
          <div className="space-y-4 mt-2">
            <div className="p-3 rounded-lg bg-destructive/5 text-sm">
              <p><strong>Settlement:</strong> {rejectTarget?.id}</p>
              <p><strong>Vendor:</strong> {rejectTarget?.vendor_name}</p>
              <p><strong>Amount:</strong> {rejectTarget ? fmt(rejectTarget.net_amount, { decimals: 0 }) : ""}</p>
            </div>
            <div>
              <Label className="text-xs font-semibold text-destructive">Rejection Reason *</Label>
              <Textarea value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} placeholder="Explain why this settlement is being rejected..." className="mt-1" rows={3} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectOpen(false)} disabled={loading}>Cancel</Button>
            <Button variant="destructive" onClick={confirmReject} disabled={loading || !rejectReason.trim()} className="gap-1">
              {loading && <div className="h-4 w-4 rounded-full border-2 border-current border-t-transparent animate-spin" />}
              <XCircle className="h-4 w-4" /> Reject Settlement
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Order Detail Dialog */}
      <Dialog open={orderDetailOpen} onOpenChange={setOrderDetailOpen}>
        <DialogContent className="max-w-lg">
          <DialogTitle className="flex items-center gap-2"><Package className="h-5 w-5 text-primary" /> Order Details</DialogTitle>
          {orderDetail && (
            <div className="space-y-4 mt-2">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div><span className="text-muted-foreground">Order ID:</span> <span className="font-mono font-medium">{orderDetail.id}</span></div>
                <div><span className="text-muted-foreground">Status:</span> <StatusBadge status={orderDetail.status} /></div>
                <div><span className="text-muted-foreground">Customer:</span> {orderDetail.customer_name || orderDetail.customer_id}</div>
                <div><span className="text-muted-foreground">Vendor:</span> {orderDetail.vendor_name || orderDetail.vendor_id}</div>
                <div><span className="text-muted-foreground">Subtotal:</span> ₹{orderDetail.subtotal?.toLocaleString()}</div>
                <div><span className="text-muted-foreground">Tax:</span> ₹{orderDetail.tax?.toLocaleString()}</div>
                <div><span className="text-muted-foreground">Discount:</span> ₹{orderDetail.discount?.toLocaleString()}</div>
                <div><span className="text-muted-foreground">Total:</span> <span className="font-bold">₹{orderDetail.total?.toLocaleString()}</span></div>
                <div><span className="text-muted-foreground">Platform Fee:</span> ₹{orderDetail.platform_fee?.toLocaleString() || 0}</div>
                <div><span className="text-muted-foreground">Points Used:</span> {orderDetail.points_used || 0}</div>
              </div>

              {orderItems.length > 0 && (
                <div>
                  <h4 className="text-sm font-semibold mb-2">Line Items</h4>
                  <div className="space-y-2">
                    {orderItems.map((item: any, idx: number) => (
                      <Card key={idx} className="p-3">
                        <div className="flex items-center gap-3">
                          {item.image && <img src={item.image} alt={item.title} className="h-10 w-10 rounded object-cover" />}
                          <div className="flex-1">
                            <p className="text-sm font-medium">{item.emoji || ""} {item.title}</p>
                            <p className="text-xs text-muted-foreground">
                              Qty: {item.qty} × {fmt(item.price || 0, { decimals: 0 })}
                              {item.id && <span className="ml-2 font-mono text-[10px]">({orderDetail.id}-{idx + 1})</span>}
                            </p>
                          </div>
                          <p className="text-sm font-bold">{fmt((item.qty || 1) * (item.price || 0), { decimals: 0 })}</p>
                        </div>
                      </Card>
                    ))}
                  </div>
                  <p className="text-[10px] text-muted-foreground mt-2">
                    Note: If items are from different vendors, each vendor gets a separate settlement with line item reference (OrderID-LineNo).
                  </p>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
