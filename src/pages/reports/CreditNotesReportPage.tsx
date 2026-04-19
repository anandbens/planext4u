import { useState, useEffect, useMemo } from "react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { FileMinus, DollarSign, Receipt, Download } from "lucide-react";
import { format, parseISO } from "date-fns";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import FinanceReportFilters, { FinanceFiltersValue, getDateRangeFromFilters } from "@/components/admin/FinanceReportFilters";
import { exportToCSV } from "@/lib/csv";
import { exportToXLSX, getCurrentFinancialYear, buildCoverSheet, amountInWordsINR, stateName } from "@/lib/xlsx-export";
import { downloadOrderInvoice } from "@/lib/order-invoice";

export default function CreditNotesReportPage() {
  const [filters, setFilters] = useState<FinanceFiltersValue>({
    fyStart: getCurrentFinancialYear(), month: -1, vendorId: "all", stateCode: "all",
  });
  const [rows, setRows] = useState<any[]>([]);
  const [vendors, setVendors] = useState<{ id: string; name: string }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.from("vendors").select("id, name").order("name").then(({ data }) =>
      setVendors((data || []).map(v => ({ id: v.id, name: v.name })))
    );
  }, []);

  useEffect(() => {
    const range = getDateRangeFromFilters(filters);
    setLoading(true);
    let q = supabase.from("credit_notes" as any).select("*")
      .gte("issue_date", range.from.toISOString())
      .lte("issue_date", range.to.toISOString());
    if (filters.vendorId !== "all") q = q.eq("vendor_id", filters.vendorId);
    if (filters.stateCode !== "all") q = q.eq("place_of_supply_code", filters.stateCode);
    q.order("issue_date", { ascending: false }).then(({ data }) => {
      setRows((data || []) as any[]);
      setLoading(false);
    });
  }, [filters]);

  const formatted = useMemo(() => rows.map((r: any) => ({
    cn_no: r.credit_note_no,
    cn_date: format(parseISO(r.issue_date), "dd-MMM-yyyy"),
    fy: r.fy_start ? `FY ${r.fy_start}-${String(r.fy_start + 1).slice(-2)}` : "—",
    original_invoice: r.original_invoice_no || "—",
    original_invoice_id: r.original_invoice_id || "—",
    order_id: r.order_id,
    customer_id: r.customer_id || "—",
    customer: r.customer_name || "—",
    vendor: r.vendor_id,
    vendor_gstin: r.vendor_gstin || "—",
    pos_state: stateName(r.place_of_supply_code),
    pos_code: r.place_of_supply_code || "—",
    supply_type: r.is_interstate ? "Inter-state" : "Intra-state",
    reason: r.reason,
    note_type: "Credit Note",
    pre_gst: "No",
    taxable: Number(r.taxable_value || 0),
    cgst: Number(r.cgst_amount || 0),
    sgst: Number(r.sgst_amount || 0),
    igst: Number(r.igst_amount || 0),
    cess: Number(r.cess_amount || 0),
    total_tax: Number(r.cgst_amount || 0) + Number(r.sgst_amount || 0) + Number(r.igst_amount || 0) + Number(r.cess_amount || 0),
    total: Number(r.total_amount || 0),
    amount_in_words: amountInWordsINR(Number(r.total_amount || 0)),
    notes: r.notes || "",
  })), [rows]);

  const auditColumns = [
    { key: "cn_no", label: "Credit Note No" }, { key: "cn_date", label: "CN Date" }, { key: "fy", label: "FY" },
    { key: "original_invoice", label: "Original Invoice No" }, { key: "original_invoice_id", label: "Original Invoice ID" },
    { key: "order_id", label: "Order ID" },
    { key: "customer_id", label: "Customer ID" }, { key: "customer", label: "Customer Name", width: 24 },
    { key: "vendor", label: "Vendor ID" }, { key: "vendor_gstin", label: "Vendor GSTIN", width: 18 },
    { key: "pos_state", label: "Place of Supply" }, { key: "pos_code", label: "POS Code" },
    { key: "supply_type", label: "Supply Type" }, { key: "note_type", label: "Note Type" }, { key: "pre_gst", label: "Pre-GST" },
    { key: "reason", label: "Reason" },
    { key: "taxable", label: "Taxable (₹)" },
    { key: "cgst", label: "CGST (₹)" }, { key: "sgst", label: "SGST (₹)" }, { key: "igst", label: "IGST (₹)" }, { key: "cess", label: "Cess (₹)" },
    { key: "total_tax", label: "Total Tax (₹)" }, { key: "total", label: "CN Total (₹)" },
    { key: "amount_in_words", label: "Amount in Words", width: 60 },
    { key: "notes", label: "Notes", width: 30 },
  ];
  const range = getDateRangeFromFilters(filters);

  const totals = useMemo(() => ({
    count: formatted.length,
    taxable: formatted.reduce((s, r) => s + r.taxable, 0),
    cgst: formatted.reduce((s, r) => s + r.cgst, 0),
    sgst: formatted.reduce((s, r) => s + r.sgst, 0),
    igst: formatted.reduce((s, r) => s + r.igst, 0),
    total: formatted.reduce((s, r) => s + r.total, 0),
  }), [formatted]);

  const handleCSV = () => exportToCSV(formatted, auditColumns as any, "Credit_Notes");

  // Reason breakup
  const reasonBreakup = useMemo(() => {
    const m = new Map<string, { reason: string; count: number; taxable: number; tax: number; total: number }>();
    formatted.forEach(r => {
      const k = r.reason || "—";
      const cur = m.get(k) || { reason: k, count: 0, taxable: 0, tax: 0, total: 0 };
      cur.count += 1; cur.taxable += r.taxable; cur.tax += r.total_tax; cur.total += r.total;
      m.set(k, cur);
    });
    return Array.from(m.values()).map(r => ({
      ...r, taxable: Number(r.taxable.toFixed(2)), tax: Number(r.tax.toFixed(2)), total: Number(r.total.toFixed(2)),
    }));
  }, [formatted]);

  const handleXLSX = () => exportToXLSX("Credit-Notes-GSTR1-Table-9B", [
    buildCoverSheet({
      reportTitle: "Credit Notes Register — GSTR-1 Table 9B / 9B(CDNUR)",
      statutoryBasis: "Section 34, CGST Act, 2017 — Credit/Debit notes issued in respect of taxable supplies",
      period: range.label, fyLabel: `FY ${filters.fyStart}-${String(filters.fyStart + 1).slice(-2)}`,
      filters: { Vendor: filters.vendorId, "POS State Code": filters.stateCode },
      notes: [
        "Credit notes are auto-generated when an order with an issued tax invoice is cancelled.",
        "Use this register to populate GSTR-1 Tables 9B (registered) & 9B-CDNUR (unregistered B2CL/Export).",
        "Reverse the corresponding tax liability in GSTR-3B Table 3.1(a) for the same period.",
      ],
    }),
    { name: "Credit Notes", rows: formatted, columns: auditColumns },
    { name: "Reason Breakup", rows: reasonBreakup, columns: [
      { key: "reason", label: "Reason" }, { key: "count", label: "Count" },
      { key: "taxable", label: "Taxable (₹)" }, { key: "tax", label: "Tax (₹)" }, { key: "total", label: "Total (₹)" },
    ]},
    { name: "Period Totals", rows: [{
      cn_count: totals.count,
      taxable: Number(totals.taxable.toFixed(2)),
      cgst: Number(totals.cgst.toFixed(2)), sgst: Number(totals.sgst.toFixed(2)),
      igst: Number(totals.igst.toFixed(2)), total: Number(totals.total.toFixed(2)),
      amount_in_words: amountInWordsINR(totals.total),
    }], columns: [
      { key: "cn_count", label: "Total CNs" }, { key: "taxable", label: "Total Taxable (₹)" },
      { key: "cgst", label: "CGST (₹)" }, { key: "sgst", label: "SGST (₹)" },
      { key: "igst", label: "IGST (₹)" }, { key: "total", label: "Total (₹)" },
      { key: "amount_in_words", label: "Total in Words", width: 60 },
    ]},
  ]);

  return (
    <AdminLayout>
      <div className="space-y-4">
        <div>
          <h1 className="page-title">Credit Notes — GSTR-1 Table 9B</h1>
          <p className="page-description">Refund / cancellation credit notes issued against tax invoices</p>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
          {loading ? Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-20 rounded-xl" />) : (<>
            <MiniStat icon={Receipt} label="Credit Notes" value={totals.count.toLocaleString()} />
            <MiniStat icon={DollarSign} label="Taxable" value={`₹${totals.taxable.toLocaleString("en-IN", { maximumFractionDigits: 0 })}`} />
            <MiniStat icon={FileMinus} label="CGST" value={`₹${totals.cgst.toLocaleString("en-IN", { maximumFractionDigits: 0 })}`} />
            <MiniStat icon={FileMinus} label="SGST" value={`₹${totals.sgst.toLocaleString("en-IN", { maximumFractionDigits: 0 })}`} />
            <MiniStat icon={FileMinus} label="IGST" value={`₹${totals.igst.toLocaleString("en-IN", { maximumFractionDigits: 0 })}`} />
          </>)}
        </div>

        <FinanceReportFilters value={filters} onChange={setFilters} vendors={vendors} onExportCSV={handleCSV} onExportXLSX={handleXLSX} />

        <Card className="overflow-hidden">
          <div className="overflow-auto">
            <table className="w-full text-xs">
              <thead className="border-b bg-muted/30">
                <tr>{["CN No","Date","Original Invoice","Customer","Reason","Taxable","CGST","SGST","IGST","Total","PDF"].map(h => (
                  <th key={h} className="px-3 py-2 text-left font-semibold text-muted-foreground whitespace-nowrap">{h}</th>
                ))}</tr>
              </thead>
              <tbody>
                {loading ? Array.from({ length: 4 }).map((_, i) => (
                  <tr key={i}><td colSpan={11} className="p-2"><Skeleton className="h-4 w-full" /></td></tr>
                )) : formatted.length === 0 ? (
                  <tr><td colSpan={11} className="p-12 text-center text-muted-foreground">No credit notes in this period</td></tr>
                ) : formatted.map((r, i) => (
                  <tr key={i} className="border-b border-border/20 hover:bg-muted/20">
                    <td className="px-3 py-2 font-mono">{r.cn_no}</td>
                    <td className="px-3 py-2 whitespace-nowrap">{r.cn_date}</td>
                    <td className="px-3 py-2 font-mono text-[10px]">{r.original_invoice}</td>
                    <td className="px-3 py-2">{r.customer}</td>
                    <td className="px-3 py-2"><Badge variant="outline" className="text-[10px]">{r.reason}</Badge></td>
                    <td className="px-3 py-2 text-right">₹{r.taxable.toLocaleString("en-IN", { maximumFractionDigits: 2 })}</td>
                    <td className="px-3 py-2 text-right">₹{r.cgst.toLocaleString("en-IN", { maximumFractionDigits: 2 })}</td>
                    <td className="px-3 py-2 text-right">₹{r.sgst.toLocaleString("en-IN", { maximumFractionDigits: 2 })}</td>
                    <td className="px-3 py-2 text-right">₹{r.igst.toLocaleString("en-IN", { maximumFractionDigits: 2 })}</td>
                    <td className="px-3 py-2 text-right font-semibold">₹{r.total.toLocaleString("en-IN", { maximumFractionDigits: 2 })}</td>
                    <td className="px-3 py-2">
                      <Button size="sm" variant="ghost" className="h-7 px-2" onClick={() => downloadOrderInvoice(r.order_id, true).catch(e => alert(e.message))}>
                        <Download className="h-3.5 w-3.5" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
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
