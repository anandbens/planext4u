import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { DataTable } from "@/components/admin/DataTable";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { issueAndDownloadReceipt } from "@/lib/issue-receipt";

interface ActiveFranchise {
  id: string;
  franchise_id: string;
  registration_id: string | null;
  plan_id: string | null;
  owner_name: string;
  company_name: string | null;
  email: string | null;
  mobile: string | null;
  address: string | null;
  city: string | null;
  district: string | null;
  state: string | null;
  pincode: string | null;
  territory: string | null;
  started_at: string;
  expires_at: string | null;
  status: string;
  notes: string | null;
  source_type?: "active" | "registration";
  franchise_plans?: any;
}

const STATUS_COLORS: Record<string, string> = {
  active: "bg-green-100 text-green-700",
  suspended: "bg-amber-100 text-amber-800",
  expired: "bg-gray-200 text-gray-700",
  terminated: "bg-red-100 text-red-700",
  pending: "bg-yellow-100 text-yellow-800",
  approved: "bg-blue-100 text-blue-800",
  converted: "bg-green-100 text-green-700",
  rejected: "bg-red-100 text-red-700",
  closed: "bg-gray-200 text-gray-600",
};

export default function AdminActiveFranchisesPage() {
  const qc = useQueryClient();
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<ActiveFranchise | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [planFilter, setPlanFilter] = useState<string>("all");
  const [stateFilter, setStateFilter] = useState<string>("");
  const [districtFilter, setDistrictFilter] = useState<string>("");
  const [cityFilter, setCityFilter] = useState<string>("");
  const [searchFilter, setSearchFilter] = useState<string>("");
  const [addPaymentFor, setAddPaymentFor] = useState<ActiveFranchise | null>(null);
  const [payForm, setPayForm] = useState({
    amount_paid: "0",
    payment_mode: "upi",
    transaction_ref: "",
    payment_date: "",
    remarks: "",
  });

  const { data: plans } = useQuery({
    queryKey: ["franchisePlansAll"],
    queryFn: async () => {
      const { data } = await (supabase as any).from("franchise_plans").select("id, name, investment_amount").order("sort_order");
      return data || [];
    },
  });

  const { data: rows, isLoading } = useQuery({
    queryKey: ["activeFranchises", statusFilter, planFilter, stateFilter, districtFilter, cityFilter, searchFilter],
    queryFn: async () => {
      const term = searchFilter.trim().replace(/[(),]/g, " ");
      const { data, error } = await (supabase as any).rpc("admin_list_franchise_management", {
        _status: statusFilter === "all" ? null : statusFilter,
        _plan_id: planFilter === "all" ? null : planFilter,
        _state: stateFilter.trim() || null,
        _district: districtFilter.trim() || null,
        _city: cityFilter.trim() || null,
        _search: term || null,
      });
      if (error) throw error;
      return (data || []) as ActiveFranchise[];
    },
  });

  const { data: paymentsByEntity } = useQuery({
    queryKey: ["activeFranchisePayments"],
    queryFn: async () => {
      const { data } = await (supabase as any).rpc("admin_list_franchise_payment_ledger", {
        _date_from: null,
        _date_to: null,
        _state: null,
        _district: null,
        _search: null,
      });
      const totals: Record<string, number> = {};
      const latest: Record<string, any> = {};
      (data || []).forEach((p: any) => {
        if (p.is_synthetic_pending) return;
        totals[p.entity_id] = (totals[p.entity_id] || 0) + Number(p.amount_paid || 0);
        if (!latest[p.entity_id]) latest[p.entity_id] = { ...p, id: p.payment_record_id || p.id };
      });
      return { totals, latest };
    },
  });

  const paymentKeys = (r: ActiveFranchise) => [r.id, r.registration_id].filter(Boolean) as string[];
  const paidForRow = (r: ActiveFranchise) => paymentKeys(r).reduce((sum, key) => sum + Number(paymentsByEntity?.totals?.[key] || 0), 0);
  const latestPaymentForRow = (r: ActiveFranchise) => paymentKeys(r).map((key) => paymentsByEntity?.latest?.[key]).find(Boolean);

  const setStatus = async (r: ActiveFranchise, status: ActiveFranchise["status"]) => {
    if (r.source_type !== "active") { toast.error("Convert the registration before changing active lifecycle status"); return; }
    if (!confirm(`Change status to ${status}?`)) return;
    const { error } = await (supabase as any).from("active_franchises").update({ status }).eq("id", r.id);
    if (error) { toast.error(error.message); return; }
    toast.success("Status updated");
    qc.invalidateQueries({ queryKey: ["activeFranchises"] });
  };

  const openPayment = (r: ActiveFranchise) => {
    setAddPaymentFor(r);
    setPayForm({ amount_paid: "0", payment_mode: "upi", transaction_ref: "", payment_date: new Date().toISOString().slice(0, 10), remarks: "" });
  };

  const inr = (n: number) => `₹${Number(n || 0).toLocaleString("en-IN")}`;

  const savePayment = async () => {
    if (!addPaymentFor) return;
    const amt = Number(payForm.amount_paid || 0);
    if (amt <= 0) { toast.error("Amount must be > 0"); return; }
    const planAmount = Number(addPaymentFor.franchise_plans?.investment_amount || 0);
    const totalPaidNow = paidForRow(addPaymentFor) + amt;
    const paymentStatus = totalPaidNow >= planAmount ? "paid" : "partial";

    const { data: paymentRow, error } = await (supabase as any).from("payment_records").insert({
      entity_type: "franchise",
      entity_id: addPaymentFor.id,
      plan_id: addPaymentFor.plan_id,
      plan_amount: planAmount,
      amount_paid: amt,
      payment_status: paymentStatus,
      payment_mode: payForm.payment_mode,
      transaction_ref: payForm.transaction_ref || null,
      payment_date: payForm.payment_date ? new Date(payForm.payment_date).toISOString() : new Date().toISOString(),
      remarks: payForm.remarks || null,
    }).select("id").single();
    if (error) { toast.error(error.message); return; }

    const p = addPaymentFor.franchise_plans;
    await issueAndDownloadReceipt({
      entityType: "franchise",
      entityId: addPaymentFor.id,
      paymentRecordId: paymentRow.id,
      applicantName: addPaymentFor.owner_name,
      companyName: addPaymentFor.company_name,
      registrationNo: addPaymentFor.franchise_id,
      category: p?.name || null,
      planName: p?.name || null,
      planAmount,
      amountPaid: amt,
      transactionRef: payForm.transaction_ref || null,
      paymentMode: payForm.payment_mode,
      paymentDate: payForm.payment_date || new Date().toISOString(),
      paymentStatus,
      planBenefits: Array.isArray(p?.benefits) ? p.benefits : [],
      planFeatures: Array.isArray(p?.features) ? p.features : [],
      coverageType: p?.coverage_type,
      deliveryRadiusKm: p?.delivery_radius_km,
      validityMonths: p?.validity_months,
      territory: addPaymentFor.territory,
    });

    toast.success("Payment recorded & receipt generated");
    setAddPaymentFor(null);
    qc.invalidateQueries({ queryKey: ["activeFranchisePayments"] });
  };

  const printLatestReceipt = async (r: ActiveFranchise) => {
    const pay = latestPaymentForRow(r);
    if (!pay) { toast.error("No payment on record"); return; }
    const p = r.franchise_plans;
    await issueAndDownloadReceipt({
      entityType: "franchise",
      entityId: r.id,
      paymentRecordId: pay.id,
      applicantName: r.owner_name,
      companyName: r.company_name,
      registrationNo: r.franchise_id,
      category: p?.name || null,
      planName: p?.name || null,
      planAmount: Number(pay.plan_amount || 0),
      amountPaid: Number(pay.amount_paid || 0),
      transactionRef: pay.transaction_ref,
      paymentMode: pay.payment_mode,
      paymentDate: pay.payment_date,
      paymentStatus: pay.payment_status,
      planBenefits: Array.isArray(p?.benefits) ? p.benefits : [],
      planFeatures: Array.isArray(p?.features) ? p.features : [],
      coverageType: p?.coverage_type,
      deliveryRadiusKm: p?.delivery_radius_km,
      validityMonths: p?.validity_months,
      territory: r.territory,
    });
  };

  const columns = [
    { key: "franchise_id", label: "Franchise ID", render: (r: ActiveFranchise) => <span className="font-mono text-xs">{r.franchise_id}</span> },
    { key: "owner_name", label: "Owner", render: (r: ActiveFranchise) => (
      <div>
        <div className="font-medium text-sm">{r.owner_name}</div>
        {r.mobile && <div className="text-[10px] text-muted-foreground">{r.mobile}</div>}
      </div>
    ) },
    { key: "company_name", label: "Company", render: (r: ActiveFranchise) => r.company_name || "—" },
    { key: "plan", label: "Plan", render: (r: ActiveFranchise) => r.franchise_plans?.name || "—" },
    { key: "district", label: "District", render: (r: ActiveFranchise) => r.district || "—" },
    { key: "state", label: "State", render: (r: ActiveFranchise) => r.state || "—" },
    { key: "territory", label: "Territory", render: (r: ActiveFranchise) => r.territory || `${r.city || ""} ${r.district || ""}`.trim() || "—" },
    { key: "total_paid", label: "Total Paid", render: (r: ActiveFranchise) => inr(paidForRow(r)) },
    { key: "balance", label: "Balance", render: (r: ActiveFranchise) => {
      const plan = Number(r.franchise_plans?.investment_amount || 0);
      const paid = paidForRow(r);
      return inr(Math.max(0, plan - paid));
    } },
    { key: "started_at", label: "Started", render: (r: ActiveFranchise) => new Date(r.started_at).toLocaleDateString("en-IN") },
    { key: "expires_at", label: "Expires", render: (r: ActiveFranchise) => r.expires_at ? new Date(r.expires_at).toLocaleDateString("en-IN") : "—" },
    { key: "status", label: "Status", render: (r: ActiveFranchise) => <Badge className={`${STATUS_COLORS[r.status]} text-[10px] capitalize`}>{r.status}</Badge> },
    { key: "actions", label: "", render: (r: ActiveFranchise) => (
      <div className="flex flex-wrap gap-1 max-w-[260px]" onClick={(e) => e.stopPropagation()}>
        <Button size="sm" variant="outline" className="h-7 text-[10px]" onClick={() => { setEditing(r); setShowModal(true); }}>View</Button>
        <Button size="sm" variant="outline" className="h-7 text-[10px] text-blue-700" onClick={() => openPayment(r)}>+ Payment</Button>
        <Button size="sm" variant="ghost" className="h-7 text-[10px]" onClick={() => printLatestReceipt(r)}>Receipt</Button>
        {r.source_type === "active" && r.status === "active" && <Button size="sm" variant="ghost" className="h-7 text-[10px] text-amber-700" onClick={() => setStatus(r, "suspended")}>Suspend</Button>}
        {r.source_type === "active" && r.status === "suspended" && <Button size="sm" variant="ghost" className="h-7 text-[10px] text-green-700" onClick={() => setStatus(r, "active")}>Reactivate</Button>}
        {r.source_type === "active" && r.status !== "terminated" && <Button size="sm" variant="ghost" className="h-7 text-[10px] text-red-700" onClick={() => setStatus(r, "terminated")}>Terminate</Button>}
      </div>
    ) },
  ];

  const list = rows || [];

  return (
    <AdminLayout>
      <div className="space-y-4">
        <div className="flex items-end justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-xl font-bold">Active Franchises</h1>
            <p className="text-sm text-muted-foreground">Manage lifecycle, payments, and receipts of live franchise partners.</p>
          </div>
        </div>

        <div className="rounded-xl border bg-card p-4 space-y-3">
          <div className="font-semibold text-sm">Search & filters</div>
          <div className="grid grid-cols-1 md:grid-cols-3 xl:grid-cols-6 gap-3">
            <div>
              <Label className="text-xs">Plan</Label>
              <Select value={planFilter} onValueChange={setPlanFilter}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Plans</SelectItem>
                  {(plans || []).map((p: any) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Status</Label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="approved">Approved</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="suspended">Suspended</SelectItem>
                  <SelectItem value="expired">Expired</SelectItem>
                  <SelectItem value="terminated">Terminated</SelectItem>
                  <SelectItem value="converted">Converted</SelectItem>
                  <SelectItem value="rejected">Rejected</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div><Label className="text-xs">State</Label><Input value={stateFilter} onChange={(e) => setStateFilter(e.target.value)} placeholder="Search state" /></div>
            <div><Label className="text-xs">District</Label><Input value={districtFilter} onChange={(e) => setDistrictFilter(e.target.value)} placeholder="Search district" /></div>
            <div><Label className="text-xs">City</Label><Input value={cityFilter} onChange={(e) => setCityFilter(e.target.value)} placeholder="Search city" /></div>
            <div><Label className="text-xs">Mobile / Email / Name</Label><Input value={searchFilter} onChange={(e) => setSearchFilter(e.target.value)} placeholder="Search contact" /></div>
          </div>
        </div>

        <DataTable
          columns={columns}
          data={list}
          total={list.length}
          page={1} perPage={50} totalPages={1}
          onPageChange={() => {}}
        />
      </div>

      {/* View / Edit */}
      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
          <DialogTitle>Franchise Details</DialogTitle>
          {editing && (
            <div className="space-y-2 pt-2 text-sm">
              <div><span className="text-muted-foreground">Franchise ID:</span> <span className="font-mono">{editing.franchise_id}</span></div>
              <div><span className="text-muted-foreground">Owner:</span> {editing.owner_name}</div>
              <div><span className="text-muted-foreground">Company:</span> {editing.company_name || "—"}</div>
              <div><span className="text-muted-foreground">Mobile:</span> {editing.mobile || "—"}</div>
              <div><span className="text-muted-foreground">Email:</span> {editing.email || "—"}</div>
              <div><span className="text-muted-foreground">Address:</span> {[editing.address, editing.city, editing.district, editing.state, editing.pincode].filter(Boolean).join(", ") || "—"}</div>
              <div><span className="text-muted-foreground">Territory:</span> {editing.territory || "—"}</div>
              <div><span className="text-muted-foreground">Plan:</span> {editing.franchise_plans?.name || "—"} ({inr(Number(editing.franchise_plans?.investment_amount || 0))})</div>
              <div><span className="text-muted-foreground">Started:</span> {new Date(editing.started_at).toLocaleDateString("en-IN")}</div>
              <div><span className="text-muted-foreground">Expires:</span> {editing.expires_at ? new Date(editing.expires_at).toLocaleDateString("en-IN") : "—"}</div>
               <div><span className="text-muted-foreground">Total Paid:</span> {inr(paidForRow(editing))}</div>
               <div><span className="text-muted-foreground">Balance:</span> {inr(Math.max(0, Number(editing.franchise_plans?.investment_amount || 0) - paidForRow(editing)))}</div>
              {editing.notes && <div><span className="text-muted-foreground">Notes:</span> {editing.notes}</div>}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Add Payment */}
      <Dialog open={!!addPaymentFor} onOpenChange={(v) => !v && setAddPaymentFor(null)}>
        <DialogContent className="max-w-md">
          <DialogTitle>Record Payment — {addPaymentFor?.franchise_id}</DialogTitle>
          {addPaymentFor && (
            <div className="space-y-3 pt-2">
              <div className="grid grid-cols-3 gap-2">
                <div className="text-xs bg-muted/50 p-2 rounded">
                  <div className="text-muted-foreground">Plan</div>
                  <div className="font-bold">{inr(Number(addPaymentFor.franchise_plans?.investment_amount || 0))}</div>
                </div>
                <div className="text-xs bg-green-50 p-2 rounded">
                  <div className="text-muted-foreground">Paid</div>
                  <div className="font-bold text-green-700">{inr(paidForRow(addPaymentFor))}</div>
                </div>
                <div className="text-xs bg-amber-50 p-2 rounded">
                  <div className="text-muted-foreground">Balance</div>
                  <div className="font-bold text-amber-700">
                    {inr(Math.max(0, Number(addPaymentFor.franchise_plans?.investment_amount || 0) - paidForRow(addPaymentFor)))}
                  </div>
                </div>
              </div>
              <div><Label className="text-xs">Amount (₹) *</Label><Input type="number" value={payForm.amount_paid} onChange={(e) => setPayForm(f => ({ ...f, amount_paid: e.target.value }))} /></div>
              <div>
                <Label className="text-xs">Payment Mode</Label>
                <Select value={payForm.payment_mode} onValueChange={(v) => setPayForm(f => ({ ...f, payment_mode: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="upi">UPI</SelectItem>
                    <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                    <SelectItem value="neft">NEFT</SelectItem>
                    <SelectItem value="rtgs">RTGS</SelectItem>
                    <SelectItem value="cash">Cash</SelectItem>
                    <SelectItem value="cheque">Cheque</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div><Label className="text-xs">Transaction Ref</Label><Input value={payForm.transaction_ref} onChange={(e) => setPayForm(f => ({ ...f, transaction_ref: e.target.value }))} /></div>
              <div><Label className="text-xs">Date</Label><Input type="date" value={payForm.payment_date} onChange={(e) => setPayForm(f => ({ ...f, payment_date: e.target.value }))} /></div>
              <div><Label className="text-xs">Remarks</Label><Input value={payForm.remarks} onChange={(e) => setPayForm(f => ({ ...f, remarks: e.target.value }))} /></div>
              <Button className="w-full" onClick={savePayment}>Save Payment & Generate Receipt</Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
