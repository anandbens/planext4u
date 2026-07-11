import { useEffect, useMemo, useState } from "react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Download, Printer, IndianRupee, Receipt, Users, Wallet } from "lucide-react";
import { format, subDays, parseISO, startOfDay, endOfDay } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import ReportDataGrid, { Column } from "@/components/admin/ReportDataGrid";
import { redownloadReceipt, issueAndDownloadReceipt } from "@/lib/issue-receipt";
import { toast } from "sonner";

interface LedgerRow {
  id: string;                    // payment_record id
  receipt_id: string | null;
  receipt_no: string;
  registration_no: string;
  entity_type: "vendor" | "franchise";
  entity_id: string;
  entity_name: string;
  plan_name: string;
  plan_amount: number;
  amount_paid: number;
  balance: number;
  payment_mode: string;
  transaction_ref: string;
  payment_date: string;
  payment_status: string;
  snapshot: any;
}

const statusColors: Record<string, string> = {
  paid: "bg-success/10 text-success",
  partial: "bg-warning/10 text-warning",
  pending: "bg-destructive/10 text-destructive",
};

export default function AdminRegistrationPaymentsPage() {
  const [dateFrom, setDateFrom] = useState<Date>(subDays(new Date(), 90));
  const [dateTo, setDateTo] = useState<Date>(new Date());
  const [entityFilter, setEntityFilter] = useState("all");
  const [rows, setRows] = useState<LedgerRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        // 1. Payment records in range
        const { data: pays } = await (supabase as any)
          .from("payment_records")
          .select("id, entity_type, entity_id, plan_id, plan_amount, amount_paid, balance, payment_status, payment_mode, transaction_ref, payment_date, created_at")
          .gte("payment_date", startOfDay(dateFrom).toISOString())
          .lte("payment_date", endOfDay(dateTo).toISOString())
          .order("payment_date", { ascending: false });

        const payments = pays || [];
        if (payments.length === 0) { setRows([]); setLoading(false); return; }

        const paymentIds = payments.map((p: any) => p.id);
        const franchiseIds = [...new Set(payments.filter((p: any) => p.entity_type === "franchise").map((p: any) => p.entity_id))];
        const vendorIds = [...new Set(payments.filter((p: any) => p.entity_type === "vendor").map((p: any) => p.entity_id))];
        const franchisePlanIds = [...new Set(payments.filter((p: any) => p.entity_type === "franchise" && p.plan_id).map((p: any) => p.plan_id))];
        const vendorPlanIds = [...new Set(payments.filter((p: any) => p.entity_type === "vendor" && p.plan_id).map((p: any) => p.plan_id))];

        // 2. Parallel supporting fetches
        const [receiptsRes, fRegRes, vAppRes, fPlansRes, vPlansRes] = await Promise.all([
          (supabase as any).from("payment_receipts").select("id, receipt_no, payment_record_id, snapshot, entity_type").in("payment_record_id", paymentIds),
          franchiseIds.length ? (supabase as any).from("franchise_registrations").select("id, registration_no, applicant_name, company_name").in("id", franchiseIds) : Promise.resolve({ data: [] }),
          vendorIds.length ? (supabase as any).from("vendor_applications").select("id, business_name, name, phone").in("id", vendorIds) : Promise.resolve({ data: [] }),
          franchisePlanIds.length ? (supabase as any).from("franchise_plans").select("id, name").in("id", franchisePlanIds) : Promise.resolve({ data: [] }),
          vendorPlanIds.length ? (supabase as any).from("vendor_plans").select("id, name").in("id", vendorPlanIds) : Promise.resolve({ data: [] }),
        ]);

        const receiptByRecord = new Map<string, any>();
        (receiptsRes.data || []).forEach((r: any) => receiptByRecord.set(r.payment_record_id, r));
        const fRegMap = new Map<string, any>();
        (fRegRes.data || []).forEach((r: any) => fRegMap.set(r.id, r));
        const vAppMap = new Map<string, any>();
        (vAppRes.data || []).forEach((r: any) => vAppMap.set(r.id, r));
        const planMap = new Map<string, string>();
        (fPlansRes.data || []).forEach((r: any) => planMap.set(r.id, r.name));
        (vPlansRes.data || []).forEach((r: any) => planMap.set(r.id, r.name));

        const mapped: LedgerRow[] = payments.map((p: any) => {
          const rc = receiptByRecord.get(p.id);
          const snap = rc?.snapshot || {};
          let name = "—", regNo = "—";
          if (p.entity_type === "franchise") {
            const f = fRegMap.get(p.entity_id);
            name = f?.company_name || f?.applicant_name || snap.company_name || snap.applicant_name || "—";
            regNo = f?.registration_no || snap.registration_no || "—";
          } else {
            const v = vAppMap.get(p.entity_id);
            name = v?.business_name || v?.contact_name || v?.applicant_name || snap.company_name || snap.applicant_name || "—";
            regNo = snap.registration_no || v?.applicant_mobile || "—";
          }
          return {
            id: p.id,
            receipt_id: rc?.id || null,
            receipt_no: rc?.receipt_no || "—",
            registration_no: regNo,
            entity_type: p.entity_type,
            entity_id: p.entity_id,
            entity_name: name,
            plan_name: planMap.get(p.plan_id) || snap.plan_name || "—",
            plan_amount: Number(p.plan_amount || 0),
            amount_paid: Number(p.amount_paid || 0),
            balance: Number(p.balance || 0),
            payment_mode: p.payment_mode || "—",
            transaction_ref: p.transaction_ref || "—",
            payment_date: p.payment_date || p.created_at,
            payment_status: p.payment_status || "pending",
            snapshot: snap,
          };
        });

        setRows(mapped);
      } catch (e) {
        console.error(e);
        toast.error("Failed to load payment ledger");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [dateFrom, dateTo]);

  const filtered = useMemo(
    () => (entityFilter === "all" ? rows : rows.filter((r) => r.entity_type === entityFilter)),
    [rows, entityFilter]
  );

  const totals = useMemo(() => {
    const paid = filtered.reduce((s, r) => s + r.amount_paid, 0);
    const balance = filtered.reduce((s, r) => s + r.balance, 0);
    const uniq = new Set(filtered.map((r) => `${r.entity_type}:${r.entity_id}`)).size;
    return { paid, balance, count: filtered.length, entities: uniq };
  }, [filtered]);

  const handleDownload = async (row: LedgerRow) => {
    if (row.receipt_id) {
      await redownloadReceipt(row.receipt_id);
      return;
    }
    // No receipt row yet — issue one on the fly from record data
    await issueAndDownloadReceipt({
      entityType: row.entity_type,
      entityId: row.entity_id,
      paymentRecordId: row.id,
      applicantName: row.entity_name,
      companyName: row.entity_name,
      registrationNo: row.registration_no === "—" ? null : row.registration_no,
      planName: row.plan_name === "—" ? null : row.plan_name,
      planAmount: row.plan_amount,
      amountPaid: row.amount_paid,
      transactionRef: row.transaction_ref === "—" ? null : row.transaction_ref,
      paymentMode: row.payment_mode === "—" ? null : row.payment_mode,
      paymentDate: row.payment_date,
      paymentStatus: (row.payment_status as any) || "paid",
    });
  };

  const columns: Column<LedgerRow>[] = [
    { key: "receipt_no", label: "Receipt No.", sortable: true, render: (r) => <span className="font-mono text-xs">{r.receipt_no}</span> },
    { key: "registration_no", label: "Registration No.", sortable: true, render: (r) => <span className="font-mono text-xs">{r.registration_no}</span> },
    {
      key: "entity_name", label: "Vendor / Franchise", sortable: true, render: (r) => (
        <div className="flex flex-col">
          <span className="font-medium text-sm">{r.entity_name}</span>
          <Badge variant="outline" className="mt-0.5 text-[9px] w-fit capitalize">{r.entity_type}</Badge>
        </div>
      ),
    },
    { key: "plan_name", label: "Plan", sortable: true, render: (r) => r.plan_name },
    { key: "plan_amount", label: "Plan Amt (₹)", sortable: true, align: "right", render: (r) => `₹${r.plan_amount.toLocaleString("en-IN")}` },
    { key: "amount_paid", label: "Amount Paid (₹)", sortable: true, align: "right", render: (r) => <span className="font-semibold">₹{r.amount_paid.toLocaleString("en-IN")}</span> },
    { key: "balance", label: "Balance (₹)", sortable: true, align: "right", render: (r) => <span className={r.balance > 0 ? "text-warning font-semibold" : ""}>₹{r.balance.toLocaleString("en-IN")}</span> },
    { key: "payment_mode", label: "Mode", sortable: true, render: (r) => <span className="capitalize">{r.payment_mode.replace("_", " ")}</span> },
    { key: "transaction_ref", label: "UTR / Txn Ref", render: (r) => <span className="font-mono text-xs">{r.transaction_ref}</span> },
    { key: "payment_date", label: "Date", sortable: true, render: (r) => r.payment_date ? format(parseISO(r.payment_date), "dd MMM yyyy") : "—" },
    { key: "payment_status", label: "Status", sortable: true, align: "center", render: (r) => <Badge className={(statusColors[r.payment_status] || "bg-muted") + " border-0 text-[10px] capitalize"}>{r.payment_status}</Badge> },
    {
      key: "actions", label: "Receipt", align: "center", render: (r) => (
        <div className="flex items-center justify-center gap-1">
          <Button size="sm" variant="outline" className="h-7 px-2" onClick={() => handleDownload(r)} title="Download PDF">
            <Download className="h-3.5 w-3.5" />
          </Button>
          <Button size="sm" variant="outline" className="h-7 px-2" onClick={() => handleDownload(r)} title="Print">
            <Printer className="h-3.5 w-3.5" />
          </Button>
        </div>
      ),
    },
  ];

  return (
    <AdminLayout>
      <ReportDataGrid
        title="Registration Payments"
        subtitle="Centralized ledger of all vendor & franchise registration payments"
        data={filtered}
        columns={columns}
        loading={loading}
        searchPlaceholder="Search receipt, registration, name, UTR..."
        searchKeys={["receipt_no", "registration_no", "entity_name", "transaction_ref", "plan_name"]}
        dateFrom={dateFrom}
        dateTo={dateTo}
        onDateFromChange={setDateFrom}
        onDateToChange={setDateTo}
        statusFilter={{
          value: entityFilter,
          onChange: setEntityFilter,
          label: "Type",
          options: [
            { label: "Vendors", value: "vendor" },
            { label: "Franchises", value: "franchise" },
          ],
        }}
        exportFilename="registration_payments"
        summaryCards={
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {loading ? Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-20 rounded-xl" />) : (
              <>
                <MiniStat icon={Receipt} label="Total Payments" value={totals.count.toLocaleString()} />
                <MiniStat icon={IndianRupee} label="Amount Collected" value={`₹${totals.paid.toLocaleString("en-IN")}`} />
                <MiniStat icon={Wallet} label="Outstanding Balance" value={`₹${totals.balance.toLocaleString("en-IN")}`} />
                <MiniStat icon={Users} label="Unique Entities" value={totals.entities.toLocaleString()} />
              </>
            )}
          </div>
        }
      />
    </AdminLayout>
  );
}

function MiniStat({ icon: Icon, label, value }: { icon: any; label: string; value: string }) {
  return (
    <Card className="p-4">
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs text-muted-foreground">{label}</span>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </div>
      <p className="text-xl font-bold">{value}</p>
    </Card>
  );
}
