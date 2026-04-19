// Day Book / Tally-Zoho compatible accounting export — sales register, credit notes, settlements as journal entries
import { useState, useEffect, useMemo } from "react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Book, FileSpreadsheet, Download } from "lucide-react";
import { format, parseISO } from "date-fns";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import FinanceReportFilters, { FinanceFiltersValue, getDateRangeFromFilters } from "@/components/admin/FinanceReportFilters";
import { exportToCSV } from "@/lib/csv";
import { exportToXLSX, getCurrentFinancialYear, buildCoverSheet, amountInWordsINR } from "@/lib/xlsx-export";

export default function DayBookReportPage() {
  const [filters, setFilters] = useState<FinanceFiltersValue>({
    fyStart: getCurrentFinancialYear(), month: new Date().getMonth(), vendorId: "all", stateCode: "all",
  });
  const [invoices, setInvoices] = useState<any[]>([]);
  const [creditNotes, setCreditNotes] = useState<any[]>([]);
  const [pfInvoices, setPfInvoices] = useState<any[]>([]);
  const [vendors, setVendors] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.from("vendors").select("id, name").order("name").then(({ data }) => setVendors((data || []).map(v => ({ id: v.id, name: v.name }))));
  }, []);

  useEffect(() => {
    const range = getDateRangeFromFilters(filters);
    setLoading(true);
    Promise.all([
      supabase.from("order_invoices" as any).select("*").gte("invoice_date", range.from.toISOString()).lte("invoice_date", range.to.toISOString()),
      supabase.from("credit_notes" as any).select("*").gte("issue_date", range.from.toISOString()).lte("issue_date", range.to.toISOString()),
      supabase.from("platform_fee_invoices" as any).select("*").gte("invoice_date", range.from.toISOString()).lte("invoice_date", range.to.toISOString()),
    ]).then(([inv, cn, pf]) => {
      setInvoices((inv.data || []) as any[]);
      setCreditNotes((cn.data || []) as any[]);
      setPfInvoices((pf.data || []) as any[]);
      setLoading(false);
    });
  }, [filters]);

  // Sales register (Tally-style)
  const salesRegister = useMemo(() => invoices.map((i: any) => ({
    voucher_date: format(parseISO(i.invoice_date), "dd-MMM-yyyy"),
    voucher_type: "Sales",
    voucher_no: i.invoice_no,
    party_name: i.customer_name,
    place_of_supply: i.place_of_supply_code || "",
    gstin: i.vendor_gstin || "",
    taxable_value: Number(i.taxable_value || 0),
    cgst: Number(i.cgst_amount || 0),
    sgst: Number(i.sgst_amount || 0),
    igst: Number(i.igst_amount || 0),
    cess: Number(i.cess_amount || 0),
    total: Number(i.total_amount || 0),
    narration: `Sale to ${i.customer_name} via Order ${i.order_id}`,
  })), [invoices]);

  const cnRegister = useMemo(() => creditNotes.map((c: any) => ({
    voucher_date: format(parseISO(c.issue_date), "dd-MMM-yyyy"),
    voucher_type: "Credit Note",
    voucher_no: c.credit_note_no,
    party_name: c.customer_name,
    against_invoice: c.original_invoice_no,
    taxable_value: Number(c.taxable_value || 0),
    cgst: Number(c.cgst_amount || 0),
    sgst: Number(c.sgst_amount || 0),
    igst: Number(c.igst_amount || 0),
    total: Number(c.total_amount || 0),
    narration: `Credit Note for ${c.reason} — Order ${c.order_id}`,
  })), [creditNotes]);

  const pfRegister = useMemo(() => pfInvoices.map((p: any) => ({
    voucher_date: format(parseISO(p.invoice_date), "dd-MMM-yyyy"),
    voucher_type: "Sales (Service)",
    voucher_no: p.invoice_no,
    party_name: p.recipient_name,
    sac: p.sac_code,
    taxable_value: Number(p.taxable_value || 0),
    cgst: Number(p.cgst_amount || 0),
    sgst: Number(p.sgst_amount || 0),
    igst: Number(p.igst_amount || 0),
    total: Number(p.total_amount || 0),
    narration: `Platform fee for Order ${p.order_id}`,
  })), [pfInvoices]);

  // Journal entries (double-entry: Customer Dr, Sales Cr, Output GST Cr)
  const journal = useMemo(() => {
    const entries: any[] = [];
    invoices.forEach((i: any) => {
      const total = Number(i.total_amount || 0);
      const taxable = Number(i.taxable_value || 0);
      const cgst = Number(i.cgst_amount || 0);
      const sgst = Number(i.sgst_amount || 0);
      const igst = Number(i.igst_amount || 0);
      const date = format(parseISO(i.invoice_date), "dd-MMM-yyyy");
      entries.push({ date, voucher_no: i.invoice_no, ledger: i.customer_name, debit: total, credit: 0, narration: `Sales — ${i.invoice_no}` });
      entries.push({ date, voucher_no: i.invoice_no, ledger: "Sales A/c", debit: 0, credit: taxable, narration: "" });
      if (cgst > 0) entries.push({ date, voucher_no: i.invoice_no, ledger: "Output CGST", debit: 0, credit: cgst, narration: "" });
      if (sgst > 0) entries.push({ date, voucher_no: i.invoice_no, ledger: "Output SGST", debit: 0, credit: sgst, narration: "" });
      if (igst > 0) entries.push({ date, voucher_no: i.invoice_no, ledger: "Output IGST", debit: 0, credit: igst, narration: "" });
    });
    creditNotes.forEach((c: any) => {
      const total = Number(c.total_amount || 0);
      const taxable = Number(c.taxable_value || 0);
      const cgst = Number(c.cgst_amount || 0);
      const sgst = Number(c.sgst_amount || 0);
      const igst = Number(c.igst_amount || 0);
      const date = format(parseISO(c.issue_date), "dd-MMM-yyyy");
      entries.push({ date, voucher_no: c.credit_note_no, ledger: "Sales Returns", debit: taxable, credit: 0, narration: `CN against ${c.original_invoice_no}` });
      if (cgst > 0) entries.push({ date, voucher_no: c.credit_note_no, ledger: "Output CGST", debit: cgst, credit: 0, narration: "" });
      if (sgst > 0) entries.push({ date, voucher_no: c.credit_note_no, ledger: "Output SGST", debit: sgst, credit: 0, narration: "" });
      if (igst > 0) entries.push({ date, voucher_no: c.credit_note_no, ledger: "Output IGST", debit: igst, credit: 0, narration: "" });
      entries.push({ date, voucher_no: c.credit_note_no, ledger: c.customer_name, debit: 0, credit: total, narration: "" });
    });
    return entries.sort((a, b) => a.date.localeCompare(b.date));
  }, [invoices, creditNotes]);

  const totals = useMemo(() => ({
    sales_count: salesRegister.length,
    cn_count: cnRegister.length,
    pf_count: pfRegister.length,
    sales_value: salesRegister.reduce((s, r) => s + r.total, 0),
    cn_value: cnRegister.reduce((s, r) => s + r.total, 0),
    pf_value: pfRegister.reduce((s, r) => s + r.total, 0),
  }), [salesRegister, cnRegister, pfRegister]);

  // Ledger summary (sum debits/credits per ledger account)
  const ledgerSummary = useMemo(() => {
    const m = new Map<string, { ledger: string; debit: number; credit: number; net: number }>();
    journal.forEach(j => {
      const cur = m.get(j.ledger) || { ledger: j.ledger, debit: 0, credit: 0, net: 0 };
      cur.debit += Number(j.debit || 0);
      cur.credit += Number(j.credit || 0);
      cur.net = cur.debit - cur.credit;
      m.set(j.ledger, cur);
    });
    return Array.from(m.values()).map(r => ({
      ledger: r.ledger,
      debit: Number(r.debit.toFixed(2)),
      credit: Number(r.credit.toFixed(2)),
      net: Number(r.net.toFixed(2)),
    })).sort((a, b) => Math.abs(b.net) - Math.abs(a.net));
  }, [journal]);

  const trialBalance = useMemo(() => {
    const totalDebit = ledgerSummary.reduce((s, r) => s + r.debit, 0);
    const totalCredit = ledgerSummary.reduce((s, r) => s + r.credit, 0);
    return { totalDebit: Number(totalDebit.toFixed(2)), totalCredit: Number(totalCredit.toFixed(2)), diff: Number((totalDebit - totalCredit).toFixed(2)) };
  }, [ledgerSummary]);

  const range = getDateRangeFromFilters(filters);

  const handleXLSX = () => exportToXLSX("DayBook-Tally-Export", [
    buildCoverSheet({
      reportTitle: "Day Book — Tally / Zoho Books Import",
      statutoryBasis: "Section 35 & 36, CGST Act, 2017 — Books of accounts to be maintained for 6 years; Income Tax Act Section 44AA",
      period: range.label, fyLabel: `FY ${filters.fyStart}-${String(filters.fyStart + 1).slice(-2)}`,
      filters: { Vendor: filters.vendorId, "POS State Code": filters.stateCode },
      notes: [
        "Sales Register: one row per tax invoice (Tally voucher type 'Sales').",
        "Credit Notes: one row per CN (Tally voucher type 'Credit Note').",
        "Platform Fee Invoices: services billed by P4U to customer (SAC 998599).",
        "Journal Entries: full double-entry with Customer Dr / Sales+Output GST Cr (and reversal for CNs).",
        "Ledger Summary & Trial Balance auto-aggregate the journal — debits must equal credits.",
        "Import via Tally Prime: Gateway → Import → Vouchers (XML/Excel). For Zoho Books: Settings → Data Administration → Import.",
      ],
    }),
    { name: "Sales Register", rows: salesRegister, columns: [
      { key: "voucher_date", label: "Date" }, { key: "voucher_type", label: "Voucher Type" }, { key: "voucher_no", label: "Voucher No" },
      { key: "party_name", label: "Party", width: 24 }, { key: "place_of_supply", label: "POS" }, { key: "gstin", label: "Party GSTIN" },
      { key: "taxable_value", label: "Taxable (₹)" }, { key: "cgst", label: "CGST (₹)" }, { key: "sgst", label: "SGST (₹)" },
      { key: "igst", label: "IGST (₹)" }, { key: "cess", label: "Cess (₹)" }, { key: "total", label: "Total (₹)" }, { key: "narration", label: "Narration", width: 40 },
    ]},
    { name: "Credit Notes", rows: cnRegister, columns: [
      { key: "voucher_date", label: "Date" }, { key: "voucher_type", label: "Voucher Type" }, { key: "voucher_no", label: "CN No" },
      { key: "party_name", label: "Party", width: 24 }, { key: "against_invoice", label: "Against Invoice" },
      { key: "taxable_value", label: "Taxable (₹)" }, { key: "cgst", label: "CGST (₹)" }, { key: "sgst", label: "SGST (₹)" },
      { key: "igst", label: "IGST (₹)" }, { key: "total", label: "Total (₹)" }, { key: "narration", label: "Narration", width: 40 },
    ]},
    { name: "Platform Fee Invoices", rows: pfRegister, columns: [
      { key: "voucher_date", label: "Date" }, { key: "voucher_type", label: "Type" }, { key: "voucher_no", label: "Invoice No" },
      { key: "party_name", label: "Party", width: 24 }, { key: "sac", label: "SAC" },
      { key: "taxable_value", label: "Taxable (₹)" }, { key: "cgst", label: "CGST (₹)" }, { key: "sgst", label: "SGST (₹)" },
      { key: "igst", label: "IGST (₹)" }, { key: "total", label: "Total (₹)" }, { key: "narration", label: "Narration", width: 40 },
    ]},
    { name: "Journal Entries", rows: journal, columns: [
      { key: "date", label: "Date" }, { key: "voucher_no", label: "Voucher No" }, { key: "ledger", label: "Ledger", width: 28 },
      { key: "debit", label: "Debit (₹)" }, { key: "credit", label: "Credit (₹)" }, { key: "narration", label: "Narration", width: 40 },
    ]},
    { name: "Ledger Summary", rows: ledgerSummary, columns: [
      { key: "ledger", label: "Ledger", width: 30 }, { key: "debit", label: "Total Debit (₹)" },
      { key: "credit", label: "Total Credit (₹)" }, { key: "net", label: "Net (Dr − Cr) (₹)" },
    ]},
    { name: "Trial Balance Check", rows: [
      { particulars: "Total Debits (₹)", value: trialBalance.totalDebit },
      { particulars: "Total Credits (₹)", value: trialBalance.totalCredit },
      { particulars: "Difference (must be zero)", value: trialBalance.diff },
      { particulars: "Status", value: trialBalance.diff === 0 ? "✓ BALANCED" : "✗ MISMATCH — review journal" },
      { particulars: "Total Sales (in words)", value: amountInWordsINR(totals.sales_value) },
    ], columns: [
      { key: "particulars", label: "Particulars", width: 40 }, { key: "value", label: "Value", width: 40 },
    ]},
  ]);

  const handleCSV = () => exportToCSV(salesRegister, [
    { key: "voucher_date", label: "Date" }, { key: "voucher_no", label: "Invoice" },
    { key: "party_name", label: "Party" }, { key: "taxable_value", label: "Taxable" },
    { key: "cgst", label: "CGST" }, { key: "sgst", label: "SGST" }, { key: "igst", label: "IGST" }, { key: "total", label: "Total" },
  ], "Sales_Register");

  return (
    <AdminLayout>
      <div className="space-y-4">
        <div>
          <h1 className="page-title">Day Book — Tally / Zoho Books Export</h1>
          <p className="page-description">Sales register, credit notes, platform-fee invoices and journal entries for accountant import</p>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {loading ? Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-20 rounded-xl" />) : (<>
            <MiniStat label="Sales Vouchers" value={`${totals.sales_count} · ₹${totals.sales_value.toLocaleString("en-IN", { maximumFractionDigits: 0 })}`} />
            <MiniStat label="Credit Notes" value={`${totals.cn_count} · ₹${totals.cn_value.toLocaleString("en-IN", { maximumFractionDigits: 0 })}`} />
            <MiniStat label="Platform Fee Invoices" value={`${totals.pf_count} · ₹${totals.pf_value.toLocaleString("en-IN", { maximumFractionDigits: 0 })}`} />
            <MiniStat label="Journal Entries" value={journal.length.toLocaleString()} />
          </>)}
        </div>

        <FinanceReportFilters value={filters} onChange={setFilters} vendors={vendors} onExportCSV={handleCSV} onExportXLSX={handleXLSX} />

        <Card className="p-4 bg-info/5 border-info/30">
          <p className="text-xs"><b>Tally / Zoho Books import:</b> Click <b>Excel</b> above to download a multi-sheet workbook with the Sales Register (vouchers), Credit Notes, Platform Fee Invoices, and Journal Entries (double-entry). Hand this file to your CA — it can be imported via Tally Prime's "Import → Vouchers" or Zoho Books' "Bulk Update".</p>
        </Card>

        <Card className="overflow-hidden">
          <div className="px-4 py-3 border-b bg-muted/30 flex items-center gap-2">
            <Book className="h-4 w-4" />
            <h3 className="text-sm font-semibold">Sales Register Preview</h3>
          </div>
          <div className="overflow-auto">
            <table className="w-full text-xs">
              <thead className="border-b bg-muted/20">
                <tr>{["Date","Voucher No","Party","POS","GSTIN","Taxable","CGST","SGST","IGST","Total"].map(h => <th key={h} className="px-3 py-2 text-left font-semibold text-muted-foreground">{h}</th>)}</tr>
              </thead>
              <tbody>
                {salesRegister.length === 0 ? (
                  <tr><td colSpan={10} className="p-12 text-center text-muted-foreground">No sales vouchers in this period</td></tr>
                ) : salesRegister.slice(0, 50).map((r, i) => (
                  <tr key={i} className="border-b border-border/20">
                    <td className="px-3 py-2 whitespace-nowrap">{r.voucher_date}</td>
                    <td className="px-3 py-2 font-mono text-[10px]">{r.voucher_no}</td>
                    <td className="px-3 py-2 truncate max-w-[140px]">{r.party_name}</td>
                    <td className="px-3 py-2 text-[10px]">{r.place_of_supply}</td>
                    <td className="px-3 py-2 font-mono text-[10px]">{r.gstin || "—"}</td>
                    <td className="px-3 py-2 text-right">₹{r.taxable_value.toLocaleString("en-IN", { maximumFractionDigits: 0 })}</td>
                    <td className="px-3 py-2 text-right">₹{r.cgst.toLocaleString("en-IN", { maximumFractionDigits: 0 })}</td>
                    <td className="px-3 py-2 text-right">₹{r.sgst.toLocaleString("en-IN", { maximumFractionDigits: 0 })}</td>
                    <td className="px-3 py-2 text-right">₹{r.igst.toLocaleString("en-IN", { maximumFractionDigits: 0 })}</td>
                    <td className="px-3 py-2 text-right font-semibold">₹{r.total.toLocaleString("en-IN", { maximumFractionDigits: 0 })}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {salesRegister.length > 50 && <p className="text-xs text-muted-foreground p-3 text-center">Showing first 50. Download Excel for full register.</p>}
          </div>
        </Card>
      </div>
    </AdminLayout>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <Card className="p-4">
      <div className="flex items-center justify-between mb-1"><span className="text-xs text-muted-foreground">{label}</span><FileSpreadsheet className="h-4 w-4 text-muted-foreground" /></div>
      <p className="text-base font-bold">{value}</p>
    </Card>
  );
}
