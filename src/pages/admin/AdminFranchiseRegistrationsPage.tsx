import { useMemo, useState } from "react";
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
import { issueAndDownloadReceipt, redownloadReceipt } from "@/lib/issue-receipt";
import { CheckCircle2, RefreshCw } from "lucide-react";

interface Reg {
  id: string;
  registration_no: string;
  applicant_name: string;
  company_name: string | null;
  email: string | null;
  mobile: string | null;
  city: string | null;
  district: string | null;
  state: string | null;
  pincode: string | null;
  address: string | null;
  plan_id: string | null;
  requested_territory: string | null;
  status: "draft" | "pending" | "approved" | "rejected" | "converted" | "closed";
  rejection_reason: string | null;
  notes: string | null;
  created_at: string;
  franchise_plans?: any;
}

interface AuditRow {
  id: string;
  table_name: string;
  operation: "insert" | "update" | "delete" | string;
  record_id: string;
  old_data: Record<string, any> | null;
  new_data: Record<string, any> | null;
  performed_by: string | null;
  created_at: string;
}

const emptyForm = {
  applicant_name: "", company_name: "", email: "", mobile: "",
  address: "", city: "", district: "", state: "", pincode: "",
  plan_id: "", requested_territory: "", status: "pending" as const,
  notes: "",
  // Payment
  payment_status: "pending" as "paid" | "pending" | "partial",
  amount_paid: "0",
  transaction_ref: "",
  payment_mode: "upi" as string,
  payment_date: "",
  payment_remarks: "",
};

const STATUS_COLORS: Record<string, string> = {
  draft: "bg-gray-100 text-gray-700",
  pending: "bg-yellow-100 text-yellow-800",
  approved: "bg-blue-100 text-blue-800",
  rejected: "bg-red-100 text-red-700",
  converted: "bg-green-100 text-green-700",
  closed: "bg-gray-200 text-gray-600",
};

export default function AdminFranchiseRegistrationsPage() {
  const qc = useQueryClient();
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<Reg | null>(null);
  const [form, setForm] = useState({ ...emptyForm });
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [planFilter, setPlanFilter] = useState<string>("all");
  const [cityFilter, setCityFilter] = useState<string>("");
  const [contactFilter, setContactFilter] = useState<string>("");
  const [reconcileSummary, setReconcileSummary] = useState<string>("");
  const [isReconciling, setIsReconciling] = useState(false);
  const [verifiedFields, setVerifiedFields] = useState<{ label: string; value: string }[]>([]);

  const { data: plans } = useQuery({
    queryKey: ["franchisePlansAll"],
    queryFn: async () => {
      const { data } = await (supabase as any).from("franchise_plans").select("id, name, investment_amount, benefits, features, coverage_type, delivery_radius_km, validity_months").order("sort_order");
      return data || [];
    },
  });

  const { data: regs, isLoading, refetch: refetchRegs } = useQuery({
    queryKey: ["franchiseRegistrations", statusFilter, planFilter, cityFilter, contactFilter],
    queryFn: async () => {
      let q = (supabase as any).from("franchise_registrations").select("*, franchise_plans:plan_id(id,name,investment_amount,benefits,features,coverage_type,delivery_radius_km,validity_months)").order("created_at", { ascending: false });
      if (statusFilter !== "all") q = q.eq("status", statusFilter);
      if (planFilter !== "all") q = q.eq("plan_id", planFilter);
      if (cityFilter.trim()) q = q.ilike("city", `%${cityFilter.trim()}%`);
      if (contactFilter.trim()) {
        const term = contactFilter.trim().replace(/[(),]/g, " ");
        q = q.or(`mobile.ilike.%${term}%,email.ilike.%${term}%,applicant_name.ilike.%${term}%,registration_no.ilike.%${term}%`);
      }
      const { data, error } = await q;
      if (error) throw error;
      return (data || []) as Reg[];
    },
  });

  const { data: paymentsByReg, refetch: refetchPayments } = useQuery({
    queryKey: ["franchiseRegPayments"],
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from("payment_records")
        .select("*")
        .eq("entity_type", "franchise")
        .order("created_at", { ascending: false });
      const map: Record<string, any> = {};
      (data || []).forEach((p: any) => {
        // entity_id here maps to franchise_registrations.id for pre-conversion payments
        if (!map[p.entity_id]) map[p.entity_id] = p;
      });
      return map;
    },
  });

  const { data: auditRows, refetch: refetchAudit } = useQuery({
    queryKey: ["franchiseRegistrationAudit"],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("audit_logs")
        .select("id, table_name, operation, record_id, old_data, new_data, performed_by, created_at")
        .eq("table_name", "franchise_registrations")
        .order("created_at", { ascending: false })
        .limit(25);
      if (error) throw error;
      return (data || []) as AuditRow[];
    },
  });

  const openCreate = () => { setEditing(null); setVerifiedFields([]); setForm({ ...emptyForm }); setShowModal(true); };
  const openEdit = (r: Reg) => {
    setEditing(r);
    setVerifiedFields([]);
    const pay = paymentsByReg?.[r.id];
    setForm({
      applicant_name: r.applicant_name || "",
      company_name: r.company_name || "",
      email: r.email || "",
      mobile: r.mobile || "",
      address: r.address || "",
      city: r.city || "",
      district: r.district || "",
      state: r.state || "",
      pincode: r.pincode || "",
      plan_id: r.plan_id || "",
      requested_territory: r.requested_territory || "",
      status: r.status as any,
      notes: r.notes || "",
      payment_status: (pay?.payment_status as any) || "pending",
      amount_paid: String(pay?.amount_paid ?? 0),
      transaction_ref: pay?.transaction_ref || "",
      payment_mode: pay?.payment_mode || "upi",
      payment_date: pay?.payment_date ? String(pay.payment_date).slice(0, 10) : "",
      payment_remarks: pay?.remarks || "",
    });
    setShowModal(true);
  };

  const selectedPlan = (plans || []).find((p: any) => p.id === form.plan_id);
  const planAmount = Number(selectedPlan?.investment_amount || 0);
  const amountPaid = Number(form.amount_paid || 0);
  const balance = Math.max(0, planAmount - amountPaid);

  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = { all: rowsCount(regs || []) };
    (regs || []).forEach((r) => { counts[r.status] = (counts[r.status] || 0) + 1; });
    return counts;
  }, [regs]);

  const fetchVerifiedRegistration = async (regId: string) => {
    const { data, error } = await (supabase as any)
      .from("franchise_registrations")
      .select("*, franchise_plans:plan_id(id,name,investment_amount,benefits,features,coverage_type,delivery_radius_km,validity_months)")
      .eq("id", regId)
      .single();
    if (error) throw error;
    return data as Reg;
  };

  const hydrateFormFromReg = (r: Reg) => {
    const pay = paymentsByReg?.[r.id];
    setForm({
      applicant_name: r.applicant_name || "",
      company_name: r.company_name || "",
      email: r.email || "",
      mobile: r.mobile || "",
      address: r.address || "",
      city: r.city || "",
      district: r.district || "",
      state: r.state || "",
      pincode: r.pincode || "",
      plan_id: r.plan_id || "",
      requested_territory: r.requested_territory || "",
      status: r.status as any,
      notes: r.notes || "",
      payment_status: (pay?.payment_status as any) || "pending",
      amount_paid: String(pay?.amount_paid ?? 0),
      transaction_ref: pay?.transaction_ref || "",
      payment_mode: pay?.payment_mode || "upi",
      payment_date: pay?.payment_date ? String(pay.payment_date).slice(0, 10) : "",
      payment_remarks: pay?.remarks || "",
    });
  };

  const summarizeChangedFields = (before: Reg | null, after: Reg) => {
    const fields: { key: keyof Reg; label: string }[] = [
      { key: "applicant_name", label: "Applicant" },
      { key: "company_name", label: "Company" },
      { key: "email", label: "Email" },
      { key: "mobile", label: "Mobile" },
      { key: "city", label: "City" },
      { key: "district", label: "District" },
      { key: "state", label: "State" },
      { key: "pincode", label: "Pincode" },
      { key: "plan_id", label: "Plan" },
      { key: "requested_territory", label: "Territory" },
      { key: "status", label: "Status" },
      { key: "notes", label: "Notes" },
    ];
    const planName = (id: any) => (plans || []).find((p: any) => p.id === id)?.name || id || "—";
    return fields
      .filter(({ key }) => !before || (before as any)[key] !== (after as any)[key])
      .map(({ key, label }) => ({ label, value: key === "plan_id" ? planName(after.plan_id) : String((after as any)[key] ?? "—") }))
      .slice(0, 8);
  };

  const reconcileRegistrations = async () => {
    setIsReconciling(true);
    setReconcileSummary("");
    try {
      const [allResult] = await Promise.all([
        (supabase as any).from("franchise_registrations").select("id,status").order("created_at", { ascending: false }),
        refetchRegs(),
        refetchPayments(),
        refetchAudit(),
      ]);
      if (allResult.error) throw allResult.error;
      const list = (allResult.data || []) as Pick<Reg, "id" | "status">[];
      const counts = list.reduce<Record<string, number>>((acc, r) => {
        acc[r.status] = (acc[r.status] || 0) + 1;
        return acc;
      }, {});
      const parts = [
        `${list.length} visible`,
        `${counts.pending || 0} pending`,
        `${counts.approved || 0} approved`,
        `${counts.converted || 0} converted`,
        `${counts.rejected || 0} rejected`,
      ];
      setReconcileSummary(`Reconciled from backend: ${parts.join(" · ")}`);
      toast.success("Franchise registrations reconciled");
    } catch (err: any) {
      setReconcileSummary(`Reconcile failed: ${err?.message || "Unable to fetch registrations"}`);
      toast.error(err?.message || "Unable to reconcile registrations");
    } finally {
      setIsReconciling(false);
    }
  };

  const handleSave = async () => {
    if (!form.applicant_name.trim()) { toast.error("Applicant name required"); return; }
    if (!form.plan_id) { toast.error("Please select a plan"); return; }

    const regPayload: any = {
      applicant_name: form.applicant_name.trim(),
      company_name: form.company_name.trim() || null,
      email: form.email.trim() || null,
      mobile: form.mobile.trim() || null,
      address: form.address.trim() || null,
      city: form.city.trim() || null,
      district: form.district.trim() || null,
      state: form.state.trim() || null,
      pincode: form.pincode.trim() || null,
      plan_id: form.plan_id,
      requested_territory: form.requested_territory.trim() || null,
      status: form.status,
      notes: form.notes || null,
    };

    const client = supabase as any;
    const beforeSave = editing;
    let regId = editing?.id;
    if (editing) {
      const { error } = await client.from("franchise_registrations").update(regPayload).eq("id", editing.id);
      if (error) { toast.error(error.message); return; }
    } else {
      const { data, error } = await client.from("franchise_registrations").insert(regPayload).select("id, registration_no").single();
      if (error) { toast.error(error.message); return; }
      regId = data.id;
    }

    // Save payment record (append new row every save so history is preserved)
    if (regId && (amountPaid > 0 || form.payment_status !== "pending")) {
      const { data: paymentRow, error: payErr } = await client.from("payment_records").insert({
        entity_type: "franchise",
        entity_id: regId,
        plan_id: form.plan_id,
        plan_amount: planAmount,
        amount_paid: amountPaid,
        payment_status: form.payment_status,
        payment_mode: form.payment_mode,
        transaction_ref: form.transaction_ref || null,
        payment_date: form.payment_date ? new Date(form.payment_date).toISOString() : new Date().toISOString(),
        remarks: form.payment_remarks || null,
      }).select("id").single();
      if (payErr) console.warn("Payment save failed", payErr);

      // Auto-generate receipt if paid
      if (form.payment_status === "paid" && paymentRow?.id) {
        const p = (plans || []).find((x: any) => x.id === form.plan_id);
        await issueAndDownloadReceipt({
          entityType: "franchise",
          entityId: regId!,
          paymentRecordId: paymentRow.id,
          applicantName: form.applicant_name,
          companyName: form.company_name || null,
          registrationNo: editing?.registration_no || null,
          category: p?.name || null,
          planName: p?.name || null,
          planAmount,
          amountPaid,
          transactionRef: form.transaction_ref || null,
          paymentMode: form.payment_mode,
          paymentDate: form.payment_date || new Date().toISOString(),
          paymentStatus: "paid",
          planBenefits: Array.isArray(p?.benefits) ? p.benefits : [],
          planFeatures: Array.isArray(p?.features) ? p.features : [],
          coverageType: p?.coverage_type,
          deliveryRadiusKm: p?.delivery_radius_km,
          validityMonths: p?.validity_months,
          territory: form.requested_territory || null,
        });
      }
    }

    if (regId) {
      try {
        const verified = await fetchVerifiedRegistration(regId);
        setEditing(verified);
        hydrateFormFromReg(verified);
        setVerifiedFields(summarizeChangedFields(beforeSave, verified));
        qc.setQueriesData({ queryKey: ["franchiseRegistrations"] }, (old: any) => {
          if (!Array.isArray(old)) return old;
          const exists = old.some((r: Reg) => r.id === verified.id);
          return exists ? old.map((r: Reg) => r.id === verified.id ? verified : r) : [verified, ...old];
        });
        toast.success(editing ? "Changes saved and verified" : "Registration created and verified");
      } catch (err: any) {
        toast.warning(`Saved, but verification reload failed: ${err?.message || "Please reconcile"}`);
      }
    }
    qc.invalidateQueries({ queryKey: ["franchiseRegistrations"] });
    qc.invalidateQueries({ queryKey: ["franchiseRegPayments"] });
    qc.invalidateQueries({ queryKey: ["franchiseRegistrationAudit"] });
  };

  const setStatus = async (r: Reg, status: Reg["status"], reason?: string) => {
    const { error } = await (supabase as any).from("franchise_registrations")
      .update({ status, rejection_reason: reason || null, approved_at: status === "approved" ? new Date().toISOString() : null })
      .eq("id", r.id);
    if (error) { toast.error(error.message); return; }
    toast.success(`Marked ${status}`);
    qc.invalidateQueries({ queryKey: ["franchiseRegistrations"] });
    qc.invalidateQueries({ queryKey: ["franchiseRegistrationAudit"] });
  };

  const convertToActive = async (r: Reg) => {
    if (!confirm(`Convert ${r.registration_no} into an active franchise?`)) return;
    const { data, error } = await (supabase as any).rpc("convert_registration_to_franchise", { _registration_id: r.id });
    if (error) { toast.error(error.message || "Conversion failed"); return; }
    toast.success("Converted to active franchise");
    qc.invalidateQueries({ queryKey: ["franchiseRegistrations"] });
    qc.invalidateQueries({ queryKey: ["activeFranchises"] });
    qc.invalidateQueries({ queryKey: ["franchiseRegistrationAudit"] });
  };

  const handleDelete = async (r: Reg) => {
    if (!confirm(`Delete registration ${r.registration_no}?`)) return;
    const { error } = await (supabase as any).from("franchise_registrations").delete().eq("id", r.id);
    if (error) { toast.error(error.message); return; }
    toast.success("Deleted");
    qc.invalidateQueries({ queryKey: ["franchiseRegistrations"] });
    qc.invalidateQueries({ queryKey: ["franchiseRegistrationAudit"] });
  };

  const printReceipt = async (r: Reg) => {
    const pay = paymentsByReg?.[r.id];
    if (!pay) { toast.error("No payment recorded yet"); return; }
    // Prefer existing stored receipt (idempotent re-download)
    const { data: existing } = await (supabase as any)
      .from("payment_receipts")
      .select("id")
      .eq("payment_record_id", pay.id)
      .maybeSingle();
    if (existing?.id) {
      await redownloadReceipt(existing.id);
      return;
    }
    const p = r.franchise_plans;
    await issueAndDownloadReceipt({
      entityType: "franchise",
      entityId: r.id,
      paymentRecordId: pay.id,
      applicantName: r.applicant_name,
      companyName: r.company_name,
      registrationNo: r.registration_no,
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
      territory: r.requested_territory,
    });
  };


  const inr = (n: number) => `₹${Number(n || 0).toLocaleString("en-IN")}`;

  function rowsCount(list: Reg[]) { return list.length; }

  const auditSummary = (row: AuditRow) => {
    const oldData = row.old_data || {};
    const newData = row.new_data || {};
    if (row.operation === "insert") return `Created ${newData.registration_no || row.record_id}`;
    if (row.operation === "delete") return `Deleted ${oldData.registration_no || row.record_id}`;
    const changed = ["applicant_name", "company_name", "email", "mobile", "city", "district", "state", "pincode", "plan_id", "requested_territory", "status", "notes"]
      .filter((key) => oldData[key] !== newData[key])
      .map((key) => key.replace(/_/g, " "));
    return changed.length ? `Updated ${changed.slice(0, 5).join(", ")}${changed.length > 5 ? "…" : ""}` : "Updated registration";
  };

  const columns = [
    { key: "registration_no", label: "Registration No.", render: (r: Reg) => <span className="font-mono text-xs">{r.registration_no}</span> },
    {
      key: "applicant_name", label: "Applicant", render: (r: Reg) => (
        <div>
          <div className="font-medium text-sm">{r.applicant_name}</div>
          {r.mobile && <div className="text-[10px] text-muted-foreground">{r.mobile}</div>}
        </div>
      ),
    },
    { key: "company_name", label: "Company", render: (r: Reg) => r.company_name || "—" },
    { key: "plan", label: "Plan", render: (r: Reg) => r.franchise_plans?.name || "—" },
    { key: "plan_amount", label: "Plan Amount", render: (r: Reg) => inr(Number(r.franchise_plans?.investment_amount || 0)) },
    { key: "advance", label: "Advance", render: (r: Reg) => inr(Number(paymentsByReg?.[r.id]?.amount_paid || 0)) },
    {
      key: "balance", label: "Balance", render: (r: Reg) => {
        const plan = Number(r.franchise_plans?.investment_amount || 0);
        const paid = Number(paymentsByReg?.[r.id]?.amount_paid || 0);
        return inr(Math.max(0, plan - paid));
      },
    },
    {
      key: "payment_status", label: "Payment", render: (r: Reg) => {
        const p = paymentsByReg?.[r.id];
        if (!p) return <Badge variant="outline" className="text-[10px]">No Payment</Badge>;
        const cls = p.payment_status === "paid" ? "bg-green-100 text-green-700" : p.payment_status === "partial" ? "bg-amber-100 text-amber-800" : "bg-yellow-100 text-yellow-800";
        return <Badge className={`${cls} text-[10px] capitalize`}>{p.payment_status}</Badge>;
      },
    },
    {
      key: "status", label: "Approval", render: (r: Reg) => (
        <Badge className={`${STATUS_COLORS[r.status]} text-[10px] capitalize`}>{r.status}</Badge>
      ),
    },
    { key: "created_at", label: "Date", render: (r: Reg) => new Date(r.created_at).toLocaleDateString("en-IN") },
    {
      key: "actions", label: "", render: (r: Reg) => (
        <div className="flex flex-wrap gap-1 max-w-[240px]" onClick={(e) => e.stopPropagation()}>
          <Button size="sm" variant="outline" className="h-7 text-[10px]" onClick={() => openEdit(r)}>Edit</Button>
          {r.status === "pending" && (
            <>
              <Button size="sm" variant="outline" className="h-7 text-[10px] text-green-700" onClick={() => setStatus(r, "approved")}>Approve</Button>
              <Button size="sm" variant="outline" className="h-7 text-[10px] text-red-700" onClick={() => {
                const reason = prompt("Rejection reason?");
                if (reason !== null) setStatus(r, "rejected", reason);
              }}>Reject</Button>
            </>
          )}
          {r.status === "approved" && (
            <Button size="sm" variant="outline" className="h-7 text-[10px] text-blue-700" onClick={() => convertToActive(r)}>Convert</Button>
          )}
          <Button size="sm" variant="ghost" className="h-7 text-[10px]" onClick={() => printReceipt(r)}>Receipt</Button>
          <Button size="sm" variant="ghost" className="h-7 text-[10px] text-destructive" onClick={() => handleDelete(r)}>Delete</Button>
        </div>
      ),
    },
  ];

  const rows = regs || [];

  return (
    <AdminLayout>
      <div className="space-y-4">
        <div className="flex items-end justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-xl font-bold">Franchise Registrations</h1>
            <p className="text-sm text-muted-foreground">Manage franchise applications, payments, approvals, and conversions.</p>
          </div>
          <Button variant="outline" onClick={reconcileRegistrations} disabled={isReconciling} className="gap-2">
            <RefreshCw className={`h-4 w-4 ${isReconciling ? "animate-spin" : ""}`} /> Reconcile registrations
          </Button>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          {[
            ["Visible", statusCounts.all || 0],
            ["Pending", statusCounts.pending || 0],
            ["Approved", statusCounts.approved || 0],
            ["Converted", statusCounts.converted || 0],
            ["Rejected", statusCounts.rejected || 0],
          ].map(([label, value]) => (
            <div key={label} className="rounded-lg border bg-card p-3">
              <div className="text-[11px] text-muted-foreground">{label}</div>
              <div className="text-lg font-bold">{value}</div>
            </div>
          ))}
        </div>

        {reconcileSummary && (
          <div className="rounded-lg border border-primary/20 bg-primary/5 px-3 py-2 text-sm text-primary">
            {reconcileSummary}
          </div>
        )}

        <div className="rounded-xl border bg-card p-4 space-y-3">
          <div className="font-semibold text-sm">Advanced search & filters</div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
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
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="approved">Approved</SelectItem>
                  <SelectItem value="rejected">Rejected</SelectItem>
                  <SelectItem value="converted">Converted</SelectItem>
                  <SelectItem value="closed">Closed</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div><Label className="text-xs">City</Label><Input value={cityFilter} onChange={(e) => setCityFilter(e.target.value)} placeholder="Search city" /></div>
            <div><Label className="text-xs">Mobile / Email / Name</Label><Input value={contactFilter} onChange={(e) => setContactFilter(e.target.value)} placeholder="Search contact" /></div>
          </div>
        </div>

        <DataTable
          columns={columns}
          data={rows}
          total={rows.length}
          page={1} perPage={50} totalPages={1}
          onPageChange={() => {}}
          onSearch={setContactFilter}
          searchPlaceholder="Search name, mobile, email, reg no."
          onAdd={openCreate}
          addLabel="Add Registration"
          showDateFilter={false}
        />

        <div className="rounded-xl border bg-card p-4 space-y-3">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="font-semibold text-sm">Franchise registration audit log</h2>
              <p className="text-xs text-muted-foreground">Every create, edit, approval, conversion, and delete is recorded here.</p>
            </div>
            <Button variant="outline" size="sm" onClick={() => refetchAudit()}>Refresh audit</Button>
          </div>
          <div className="space-y-2 max-h-80 overflow-y-auto">
            {(auditRows || []).length === 0 && <div className="text-sm text-muted-foreground">No audit entries yet.</div>}
            {(auditRows || []).map((row) => (
              <div key={row.id} className="rounded-lg border bg-background p-3 text-sm">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <div className="font-medium capitalize">{row.operation} · {auditSummary(row)}</div>
                  <div className="text-xs text-muted-foreground">{new Date(row.created_at).toLocaleString("en-IN")}</div>
                </div>
                <div className="mt-1 text-xs text-muted-foreground">
                  By {row.performed_by ? row.performed_by.slice(0, 8) : "system/public"} · Record {row.new_data?.registration_no || row.old_data?.registration_no || row.record_id.slice(0, 8)}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogTitle>{editing ? `Edit ${editing.registration_no}` : "New Franchise Registration"}</DialogTitle>
          <div className="space-y-4 pt-2">
            {verifiedFields.length > 0 && (
              <div className="rounded-lg border border-green-200 bg-green-50 p-3 text-sm text-green-800">
                <div className="flex items-center gap-2 font-semibold"><CheckCircle2 className="h-4 w-4" /> Save verified from backend</div>
                <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {verifiedFields.map((f) => <div key={f.label}><span className="text-green-700/70">{f.label}:</span> {f.value}</div>)}
                </div>
              </div>
            )}
            <div className="grid grid-cols-2 gap-3">
              <div><Label className="text-xs">Applicant Name *</Label><Input value={form.applicant_name} onChange={(e) => setForm(f => ({ ...f, applicant_name: e.target.value }))} /></div>
              <div><Label className="text-xs">Company Name</Label><Input value={form.company_name} onChange={(e) => setForm(f => ({ ...f, company_name: e.target.value }))} /></div>
              <div><Label className="text-xs">Email</Label><Input type="email" value={form.email} onChange={(e) => setForm(f => ({ ...f, email: e.target.value }))} /></div>
              <div><Label className="text-xs">Mobile</Label><Input value={form.mobile} onChange={(e) => setForm(f => ({ ...f, mobile: e.target.value }))} /></div>
            </div>
            <div><Label className="text-xs">Address</Label><Input value={form.address} onChange={(e) => setForm(f => ({ ...f, address: e.target.value }))} /></div>
            <div className="grid grid-cols-4 gap-3">
              <div><Label className="text-xs">City</Label><Input value={form.city} onChange={(e) => setForm(f => ({ ...f, city: e.target.value }))} /></div>
              <div><Label className="text-xs">District</Label><Input value={form.district} onChange={(e) => setForm(f => ({ ...f, district: e.target.value }))} /></div>
              <div><Label className="text-xs">State</Label><Input value={form.state} onChange={(e) => setForm(f => ({ ...f, state: e.target.value }))} /></div>
              <div><Label className="text-xs">Pincode</Label><Input value={form.pincode} onChange={(e) => setForm(f => ({ ...f, pincode: e.target.value }))} /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Plan *</Label>
                <Select value={form.plan_id} onValueChange={(v) => setForm(f => ({ ...f, plan_id: v }))}>
                  <SelectTrigger><SelectValue placeholder="Select plan" /></SelectTrigger>
                  <SelectContent>
                    {(plans || []).map((p: any) => (
                      <SelectItem key={p.id} value={p.id}>{p.name} — ₹{Number(p.investment_amount).toLocaleString("en-IN")}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div><Label className="text-xs">Requested Territory</Label><Input value={form.requested_territory} onChange={(e) => setForm(f => ({ ...f, requested_territory: e.target.value }))} /></div>
            </div>
            <div>
              <Label className="text-xs">Approval Status</Label>
              <Select value={form.status} onValueChange={(v: any) => setForm(f => ({ ...f, status: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="approved">Approved</SelectItem>
                  <SelectItem value="rejected">Rejected</SelectItem>
                  <SelectItem value="closed">Closed</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="border-t pt-3">
              <h3 className="text-sm font-semibold mb-2">Payment Details</h3>
              <div className="grid grid-cols-3 gap-3 items-end mb-3">
                <div className="col-span-1 text-xs bg-muted/50 p-2 rounded">
                  <div className="text-muted-foreground">Plan Amount</div>
                  <div className="font-bold text-base">{inr(planAmount)}</div>
                </div>
                <div className="col-span-1 text-xs bg-green-50 p-2 rounded">
                  <div className="text-muted-foreground">Advance Paid</div>
                  <div className="font-bold text-base text-green-700">{inr(amountPaid)}</div>
                </div>
                <div className="col-span-1 text-xs bg-amber-50 p-2 rounded">
                  <div className="text-muted-foreground">Balance</div>
                  <div className="font-bold text-base text-amber-700">{inr(balance)}</div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs">Payment Status</Label>
                  <Select value={form.payment_status} onValueChange={(v: any) => setForm(f => ({ ...f, payment_status: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="partial">Partial</SelectItem>
                      <SelectItem value="paid">Paid</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div><Label className="text-xs">Amount Paid (₹)</Label><Input type="number" value={form.amount_paid} onChange={(e) => setForm(f => ({ ...f, amount_paid: e.target.value }))} /></div>
                <div>
                  <Label className="text-xs">Payment Mode</Label>
                  <Select value={form.payment_mode} onValueChange={(v) => setForm(f => ({ ...f, payment_mode: v }))}>
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
                <div><Label className="text-xs">Payment Date</Label><Input type="date" value={form.payment_date} onChange={(e) => setForm(f => ({ ...f, payment_date: e.target.value }))} /></div>
                <div className="col-span-2"><Label className="text-xs">Transaction Reference</Label><Input value={form.transaction_ref} onChange={(e) => setForm(f => ({ ...f, transaction_ref: e.target.value }))} placeholder="UTR / UPI ref / cheque no." /></div>
                <div className="col-span-2"><Label className="text-xs">Remarks</Label><Input value={form.payment_remarks} onChange={(e) => setForm(f => ({ ...f, payment_remarks: e.target.value }))} /></div>
              </div>
              {form.payment_status === "paid" && (
                <p className="text-[11px] text-muted-foreground mt-2">
                  On save, an official Payment Receipt will be generated and opened for download.
                </p>
              )}
            </div>

            <div><Label className="text-xs">Notes</Label><Input value={form.notes} onChange={(e) => setForm(f => ({ ...f, notes: e.target.value }))} /></div>
            <Button className="w-full" onClick={handleSave}>Save changes</Button>
          </div>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
