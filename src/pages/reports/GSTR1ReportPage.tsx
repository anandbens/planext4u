// GSTR-1 — Outward Supplies Return (Sec 37, CGST Act)
// Auditor-grade export with B2B, B2C(L), B2C(S), CDNUR (credit notes), HSN summary,
// Document summary, and a Report-Info cover sheet.
import { useState, useEffect, useMemo } from "react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { FileText, DollarSign, Receipt, Building2 } from "lucide-react";
import { format, parseISO } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import FinanceReportFilters, { FinanceFiltersValue, getDateRangeFromFilters } from "@/components/admin/FinanceReportFilters";
import { exportToCSV } from "@/lib/csv";
import { exportToXLSX, getCurrentFinancialYear, buildCoverSheet, INDIA_STATES } from "@/lib/xlsx-export";
import { Card as UICard } from "@/components/ui/card";

// B2C(L) threshold — invoices > ₹2.5L to unregistered customers in another state.
const B2CL_THRESHOLD = 250000;

interface Invoice {
  id: string;
  invoice_no: string | null;
  invoice_date: string;
  order_id: string;
  fy_start: number;
  vendor_id: string;
  vendor_name: string | null;
  vendor_gstin: string | null;
  vendor_pan: string | null;
  vendor_address: string | null;
  vendor_state: string | null;
  vendor_state_code: string | null;
  customer_id: string;
  customer_name: string | null;
  customer_email: string | null;
  customer_phone: string | null;
  customer_address: string | null;
  place_of_supply_state: string | null;
  place_of_supply_code: string | null;
  is_interstate: boolean | null;
  items: any;
  taxable_value: number | null;
  cgst_amount: number | null;
  sgst_amount: number | null;
  igst_amount: number | null;
  cess_amount: number | null;
  tcs_amount: number | null;
  discount: number | null;
  round_off: number | null;
  total_amount: number | null;
  amount_in_words: string | null;
  cancelled_at: string | null;
  notes: string | null;
}

interface CreditNote {
  id: string;
  credit_note_no: string;
  original_invoice_no: string | null;
  issue_date: string;
  vendor_id: string;
  vendor_gstin: string | null;
  customer_id: string;
  customer_name: string | null;
  reason: string;
  taxable_value: number | null;
  cgst_amount: number | null;
  sgst_amount: number | null;
  igst_amount: number | null;
  total_amount: number | null;
  is_interstate: boolean | null;
  place_of_supply_code: string | null;
}

const stateName = (code: string | null | undefined) =>
  INDIA_STATES.find(s => s.code === (code || ""))?.name || "";

export default function GSTR1ReportPage() {
  const { user } = useAuth();
  const [filters, setFilters] = useState<FinanceFiltersValue>({
    fyStart: getCurrentFinancialYear(), month: new Date().getMonth(), vendorId: "all", stateCode: "all",
  });
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [creditNotes, setCreditNotes] = useState<CreditNote[]>([]);
  const [vendors, setVendors] = useState<{ id: string; name: string }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.from("vendors").select("id, name").order("name").then(({ data }) => {
      setVendors((data || []).map(v => ({ id: v.id, name: v.name })));
    });
  }, []);

  useEffect(() => {
    const range = getDateRangeFromFilters(filters);
    setLoading(true);
    let invQ = supabase.from("order_invoices" as any).select("*")
      .gte("invoice_date", range.from.toISOString())
      .lte("invoice_date", range.to.toISOString());
    let cnQ = supabase.from("credit_notes" as any).select("*")
      .gte("issue_date", range.from.toISOString())
      .lte("issue_date", range.to.toISOString());
    if (filters.vendorId !== "all") {
      invQ = invQ.eq("vendor_id", filters.vendorId);
      cnQ = cnQ.eq("vendor_id", filters.vendorId);
    }
    if (filters.stateCode !== "all") {
      invQ = invQ.eq("place_of_supply_code", filters.stateCode);
      cnQ = cnQ.eq("place_of_supply_code", filters.stateCode);
    }
    Promise.all([
      invQ.order("invoice_date", { ascending: false }),
      cnQ.order("issue_date", { ascending: false }),
    ]).then(([inv, cn]) => {
      setInvoices((inv.data || []) as any);
      setCreditNotes((cn.data || []) as any);
      setLoading(false);
    });
  }, [filters]);

  // ── Split into GSTR-1 sections ────────────────────────────────────────────
  // Customers do not store GSTIN in this app, so all invoices are unregistered (B2C).
  // B2C(L) = inter-state + invoice value > ₹2.5L; everything else is B2C(S).
  const b2cl = useMemo(() => invoices.filter(i =>
    i.is_interstate && Number(i.total_amount || 0) > B2CL_THRESHOLD
  ), [invoices]);
  const b2cs = useMemo(() => invoices.filter(i =>
    !(i.is_interstate && Number(i.total_amount || 0) > B2CL_THRESHOLD)
  ), [invoices]);

  // Pre-compute presentation rows for each table
  const b2cRows = useMemo(() => invoices.map(r => ({
    invoice_no: r.invoice_no || r.id,
    invoice_date: format(parseISO(r.invoice_date), "dd-MMM-yyyy"),
    customer: r.customer_name || "—",
    customer_phone: r.customer_phone || "",
    customer_email: r.customer_email || "",
    customer_address: r.customer_address || "",
    place_of_supply: r.place_of_supply_code ? `${r.place_of_supply_code}-${r.place_of_supply_state || stateName(r.place_of_supply_code)}` : "—",
    pos_code: r.place_of_supply_code || "",
    supply_type: r.is_interstate ? "Inter-state" : "Intra-state",
    invoice_value_bucket: Number(r.total_amount || 0) > B2CL_THRESHOLD ? "Above ₹2.5L (B2CL)" : "≤ ₹2.5L (B2CS)",
    taxable_value: Number(r.taxable_value || 0),
    cgst: Number(r.cgst_amount || 0),
    sgst: Number(r.sgst_amount || 0),
    igst: Number(r.igst_amount || 0),
    cess: Number(r.cess_amount || 0),
    tcs: Number(r.tcs_amount || 0),
    discount: Number(r.discount || 0),
    round_off: Number(r.round_off || 0),
    total_tax: Number(r.cgst_amount || 0) + Number(r.sgst_amount || 0) + Number(r.igst_amount || 0) + Number(r.cess_amount || 0),
    invoice_total: Number(r.total_amount || 0),
    amount_in_words: r.amount_in_words || "",
    vendor: r.vendor_name || "—",
    vendor_gstin: r.vendor_gstin || "—",
    vendor_pan: r.vendor_pan || "",
    vendor_state: r.vendor_state || "",
    vendor_state_code: r.vendor_state_code || "",
    vendor_address: r.vendor_address || "",
    order_id: r.order_id,
    cancelled: r.cancelled_at ? "Yes" : "No",
    notes: r.notes || "",
  })), [invoices]);

  // HSN-wise summary derived from order items, with rate bucketing.
  const hsnSummary = useMemo(() => {
    const map = new Map<string, {
      hsn: string; description: string; uqc: string; gst_rate: number;
      quantity: number; taxable: number; cgst: number; sgst: number; igst: number; cess: number; total_value: number;
    }>();
    invoices.forEach(r => {
      const items = Array.isArray(r.items) ? r.items : [];
      const itemCount = Math.max(items.length, 1);
      items.forEach((it: any) => {
        const hsn = it.hsn_code || it.hsn || "9999";
        const rate = Number(it.gst_rate ?? it.tax_rate ?? 18);
        const key = `${hsn}|${rate}`;
        const uqc = it.uqc || "NOS";
        const qty = Number(it.quantity || it.qty || 1);
        const itemTaxable = Number(it.taxable_value ?? (Number(it.price || it.unit_price || 0) * qty));
        const cur = map.get(key) || {
          hsn, description: it.name || it.title || "—", uqc, gst_rate: rate,
          quantity: 0, taxable: 0, cgst: 0, sgst: 0, igst: 0, cess: 0, total_value: 0,
        };
        cur.quantity += qty;
        cur.taxable += itemTaxable;
        cur.cgst += Number(r.cgst_amount || 0) / itemCount;
        cur.sgst += Number(r.sgst_amount || 0) / itemCount;
        cur.igst += Number(r.igst_amount || 0) / itemCount;
        cur.cess += Number(r.cess_amount || 0) / itemCount;
        map.set(key, cur);
      });
    });
    return Array.from(map.values()).map(r => ({
      ...r,
      taxable: Number(r.taxable.toFixed(2)),
      cgst: Number(r.cgst.toFixed(2)), sgst: Number(r.sgst.toFixed(2)),
      igst: Number(r.igst.toFixed(2)), cess: Number(r.cess.toFixed(2)),
      total_value: Number((r.taxable + r.cgst + r.sgst + r.igst + r.cess).toFixed(2)),
    })).sort((a, b) => b.taxable - a.taxable);
  }, [invoices]);

  // Document summary with serial range and cancelled count.
  const docSummary = useMemo(() => {
    const sortedAsc = [...invoices].sort((a, b) => (a.invoice_no || "").localeCompare(b.invoice_no || ""));
    const cancelledCount = invoices.filter(i => i.cancelled_at).length;
    return [
      {
        nature_of_document: "Tax Invoice (B2C)",
        serial_no_from: sortedAsc[0]?.invoice_no || "",
        serial_no_to: sortedAsc[sortedAsc.length - 1]?.invoice_no || "",
        total_number: invoices.length,
        cancelled: cancelledCount,
        net_issued: invoices.length - cancelledCount,
      },
      {
        nature_of_document: "Credit Note",
        serial_no_from: creditNotes[creditNotes.length - 1]?.credit_note_no || "",
        serial_no_to: creditNotes[0]?.credit_note_no || "",
        total_number: creditNotes.length,
        cancelled: 0,
        net_issued: creditNotes.length,
      },
    ];
  }, [invoices, creditNotes]);

  // Credit Notes for unregistered (CDNUR) — Table 9B
  const cdnurRows = useMemo(() => creditNotes.map(c => ({
    cn_no: c.credit_note_no,
    cn_date: format(parseISO(c.issue_date), "dd-MMM-yyyy"),
    note_type: "Credit",
    pre_gst: "No",
    document_type: c.is_interstate && Number(c.total_amount || 0) > B2CL_THRESHOLD ? "B2CL" : "EXPWP/EXPWOP/B2CL",
    original_invoice_no: c.original_invoice_no || "",
    customer: c.customer_name || "",
    place_of_supply: `${c.place_of_supply_code || ""}-${stateName(c.place_of_supply_code)}`,
    rate: 18, // default presentation
    taxable: Number(c.taxable_value || 0),
    cgst: Number(c.cgst_amount || 0),
    sgst: Number(c.sgst_amount || 0),
    igst: Number(c.igst_amount || 0),
    cess: 0,
    total: Number(c.total_amount || 0),
    reason: c.reason,
    vendor: c.vendor_id,
    vendor_gstin: c.vendor_gstin || "",
  })), [creditNotes]);

  const totals = useMemo(() => ({
    invoices: invoices.length,
    cancelled: invoices.filter(i => i.cancelled_at).length,
    taxable: b2cRows.reduce((s, r) => s + r.taxable_value, 0),
    cgst: b2cRows.reduce((s, r) => s + r.cgst, 0),
    sgst: b2cRows.reduce((s, r) => s + r.sgst, 0),
    igst: b2cRows.reduce((s, r) => s + r.igst, 0),
    cess: b2cRows.reduce((s, r) => s + r.cess, 0),
    total_invoice_value: b2cRows.reduce((s, r) => s + r.invoice_total, 0),
    cn_count: cdnurRows.length,
    cn_taxable: cdnurRows.reduce((s, r) => s + r.taxable, 0),
    cn_total: cdnurRows.reduce((s, r) => s + r.total, 0),
  }), [b2cRows, cdnurRows, invoices]);

  // ── EXPORT — full audit columns ──────────────────────────────────────────
  const handleCSV = () => {
    // Add a grand-total row so CSV is self-contained
    const csvRows = [
      ...b2cRows,
      {
        invoice_no: "TOTAL", invoice_date: "", customer: `${b2cRows.length} invoices`, customer_phone: "", customer_email: "",
        customer_address: "", place_of_supply: "", pos_code: "", supply_type: "", invoice_value_bucket: "",
        taxable_value: totals.taxable, cgst: totals.cgst, sgst: totals.sgst, igst: totals.igst, cess: totals.cess,
        tcs: 0, discount: 0, round_off: 0, total_tax: totals.cgst + totals.sgst + totals.igst + totals.cess,
        invoice_total: totals.total_invoice_value, amount_in_words: "", vendor: "", vendor_gstin: "", vendor_pan: "",
        vendor_state: "", vendor_state_code: "", vendor_address: "", order_id: "", cancelled: "", notes: "",
      },
    ];
    exportToCSV(csvRows, [
      { key: "invoice_no", label: "Invoice No" }, { key: "invoice_date", label: "Invoice Date" },
      { key: "customer", label: "Customer Name" }, { key: "customer_phone", label: "Customer Phone" },
      { key: "customer_email", label: "Customer Email" }, { key: "customer_address", label: "Customer Address" },
      { key: "place_of_supply", label: "Place of Supply" }, { key: "pos_code", label: "POS Code" },
      { key: "supply_type", label: "Supply Type" }, { key: "invoice_value_bucket", label: "B2CL/B2CS" },
      { key: "taxable_value", label: "Taxable Value (₹)" }, { key: "cgst", label: "CGST (₹)" },
      { key: "sgst", label: "SGST (₹)" }, { key: "igst", label: "IGST (₹)" }, { key: "cess", label: "Cess (₹)" },
      { key: "tcs", label: "TCS (₹)" }, { key: "discount", label: "Discount (₹)" },
      { key: "round_off", label: "Round-off (₹)" }, { key: "total_tax", label: "Total Tax (₹)" },
      { key: "invoice_total", label: "Invoice Total (₹)" }, { key: "amount_in_words", label: "Amount in Words" },
      { key: "vendor", label: "Vendor Name" }, { key: "vendor_gstin", label: "Vendor GSTIN" },
      { key: "vendor_pan", label: "Vendor PAN" }, { key: "vendor_state", label: "Vendor State" },
      { key: "vendor_state_code", label: "Vendor State Code" }, { key: "vendor_address", label: "Vendor Address" },
      { key: "order_id", label: "Order Reference" }, { key: "cancelled", label: "Cancelled" }, { key: "notes", label: "Notes" },
    ], "GSTR1-Outward-Supplies");
  };

  const handleXLSX = () => {
    const range = getDateRangeFromFilters(filters);
    const cover = buildCoverSheet({
      reportTitle: "GSTR-1 — Outward Supplies (B2C(L) · B2C(S) · CDNUR · HSN Summary · Document Summary)",
      statutoryBasis: "Section 37 of the CGST Act, 2017 — Furnishing details of outward supplies",
      period: range.label,
      fyLabel: `FY ${filters.fyStart}-${String(filters.fyStart + 1).slice(-2)}`,
      filters: {
        "Month": filters.month === -1 ? "Whole FY" : range.label,
        "Vendor": filters.vendorId === "all" ? "All vendors" : (vendors.find(v => v.id === filters.vendorId)?.name || filters.vendorId),
        "Place of Supply": filters.stateCode === "all" ? "All states" : `${filters.stateCode} — ${stateName(filters.stateCode)}`,
        "Status filter": "delivered, completed (only)",
        "Total Invoices": totals.invoices,
        "Cancelled Invoices": totals.cancelled,
        "Total Taxable Value (₹)": totals.taxable.toFixed(2),
        "Total CGST (₹)": totals.cgst.toFixed(2),
        "Total SGST (₹)": totals.sgst.toFixed(2),
        "Total IGST (₹)": totals.igst.toFixed(2),
        "Total Cess (₹)": totals.cess.toFixed(2),
        "Total Invoice Value (₹)": totals.total_invoice_value.toFixed(2),
        "Credit Notes Count": totals.cn_count,
        "Credit Notes Total (₹)": totals.cn_total.toFixed(2),
      },
      generatedBy: user?.email,
      notes: [
        "B2CL = inter-state supplies to unregistered persons with invoice value > ₹2.5L (Table 5).",
        "B2CS = all other unregistered B2C supplies (Table 7).",
        "CDNUR = Credit/Debit notes issued to unregistered persons (Table 9B).",
        "HSN Summary populates Table 12. UQC defaults to NOS where missing.",
        "Document Summary populates Table 13 with serial range and cancellation count.",
      ],
    });

    exportToXLSX("GSTR1-Outward-Supplies", [
      cover,
      { name: "5 — B2CL (Above 2.5L)", rows: b2cRows.filter(r => r.invoice_value_bucket.startsWith("Above")), columns: b2cExportColumns() },
      { name: "7 — B2CS (Small)", rows: b2cRows.filter(r => r.invoice_value_bucket.startsWith("≤")), columns: b2cExportColumns() },
      { name: "9B — CDNUR", rows: cdnurRows, columns: [
        { key: "cn_no", label: "CN/DN No" }, { key: "cn_date", label: "Date" },
        { key: "note_type", label: "Note Type" }, { key: "pre_gst", label: "Pre-GST" },
        { key: "document_type", label: "Document Type" }, { key: "original_invoice_no", label: "Original Invoice No" },
        { key: "customer", label: "Customer" }, { key: "place_of_supply", label: "Place of Supply" },
        { key: "rate", label: "Rate (%)" }, { key: "taxable", label: "Taxable Value (₹)" },
        { key: "cgst", label: "CGST (₹)" }, { key: "sgst", label: "SGST (₹)" },
        { key: "igst", label: "IGST (₹)" }, { key: "cess", label: "Cess (₹)" },
        { key: "total", label: "Total (₹)" }, { key: "reason", label: "Reason" },
        { key: "vendor", label: "Vendor" }, { key: "vendor_gstin", label: "Vendor GSTIN" },
      ]},
      { name: "12 — HSN Summary", rows: hsnSummary, columns: [
        { key: "hsn", label: "HSN" }, { key: "description", label: "Description", width: 30 },
        { key: "uqc", label: "UQC" }, { key: "gst_rate", label: "Rate (%)" },
        { key: "quantity", label: "Total Qty" }, { key: "taxable", label: "Taxable Value (₹)" },
        { key: "cgst", label: "CGST (₹)" }, { key: "sgst", label: "SGST (₹)" },
        { key: "igst", label: "IGST (₹)" }, { key: "cess", label: "Cess (₹)" }, { key: "total_value", label: "Total Value (₹)" },
      ]},
      { name: "13 — Doc Summary", rows: docSummary, columns: [
        { key: "nature_of_document", label: "Nature of Document" },
        { key: "serial_no_from", label: "Sr. No. From" }, { key: "serial_no_to", label: "Sr. No. To" },
        { key: "total_number", label: "Total Number" }, { key: "cancelled", label: "Cancelled" },
        { key: "net_issued", label: "Net Issued" },
      ]},
    ]);
  };

  return (
    <AdminLayout>
      <div className="space-y-4">
        <div>
          <h1 className="page-title">GSTR-1 — Outward Supplies</h1>
          <p className="page-description">Sec 37, CGST Act · Invoice-wise outward supply return (B2C, CDNUR, HSN, Doc summary). Excel export ships with auditor cover sheet.</p>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
          {loading ? Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-20 rounded-xl" />) : (<>
            <MiniStat icon={Receipt} label="Invoices" value={totals.invoices.toLocaleString()} />
            <MiniStat icon={DollarSign} label="Taxable Value" value={`₹${totals.taxable.toLocaleString("en-IN", { maximumFractionDigits: 0 })}`} />
            <MiniStat icon={FileText} label="CGST" value={`₹${totals.cgst.toLocaleString("en-IN", { maximumFractionDigits: 0 })}`} />
            <MiniStat icon={FileText} label="SGST" value={`₹${totals.sgst.toLocaleString("en-IN", { maximumFractionDigits: 0 })}`} />
            <MiniStat icon={Building2} label="IGST" value={`₹${totals.igst.toLocaleString("en-IN", { maximumFractionDigits: 0 })}`} />
          </>)}
        </div>

        <FinanceReportFilters
          value={filters} onChange={setFilters} vendors={vendors}
          onExportCSV={handleCSV} onExportXLSX={handleXLSX}
        />

        <Tabs defaultValue="b2c">
          <TabsList>
            <TabsTrigger value="b2c">B2C ({b2cRows.length})</TabsTrigger>
            <TabsTrigger value="cdnur">9B CDNUR ({cdnurRows.length})</TabsTrigger>
            <TabsTrigger value="hsn">12 HSN ({hsnSummary.length})</TabsTrigger>
            <TabsTrigger value="docs">13 Docs</TabsTrigger>
          </TabsList>
          <TabsContent value="b2c">
            <Card className="overflow-hidden">
              <div className="overflow-auto">
                <table className="w-full text-xs">
                  <thead className="border-b bg-muted/30">
                    <tr>
                      {["Invoice","Date","Customer","POS","Bucket","Supply","Taxable","CGST","SGST","IGST","Cess","Invoice Total","Vendor","GSTIN"].map(h => (
                        <th key={h} className="px-3 py-2 text-left font-semibold text-muted-foreground whitespace-nowrap">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {loading ? Array.from({ length: 6 }).map((_, i) => (
                      <tr key={i}><td colSpan={14} className="p-2"><Skeleton className="h-4 w-full" /></td></tr>
                    )) : b2cRows.length === 0 ? (
                      <tr><td colSpan={14} className="p-12 text-center text-muted-foreground">No invoices in this period</td></tr>
                    ) : b2cRows.map((r, i) => (
                      <tr key={i} className="border-b border-border/20 hover:bg-muted/20">
                        <td className="px-3 py-2 font-mono text-[11px]">{r.invoice_no}</td>
                        <td className="px-3 py-2 whitespace-nowrap">{r.invoice_date}</td>
                        <td className="px-3 py-2">{r.customer}</td>
                        <td className="px-3 py-2 text-xs"><Badge variant="outline" className="text-[10px]">{r.place_of_supply}</Badge></td>
                        <td className="px-3 py-2 text-[10px]">{r.invoice_value_bucket}</td>
                        <td className="px-3 py-2 text-[10px]">{r.supply_type}</td>
                        <td className="px-3 py-2 text-right">₹{r.taxable_value.toLocaleString("en-IN", { maximumFractionDigits: 2 })}</td>
                        <td className="px-3 py-2 text-right">₹{r.cgst.toLocaleString("en-IN", { maximumFractionDigits: 2 })}</td>
                        <td className="px-3 py-2 text-right">₹{r.sgst.toLocaleString("en-IN", { maximumFractionDigits: 2 })}</td>
                        <td className="px-3 py-2 text-right">₹{r.igst.toLocaleString("en-IN", { maximumFractionDigits: 2 })}</td>
                        <td className="px-3 py-2 text-right">₹{r.cess.toLocaleString("en-IN", { maximumFractionDigits: 2 })}</td>
                        <td className="px-3 py-2 text-right font-semibold">₹{r.invoice_total.toLocaleString("en-IN", { maximumFractionDigits: 2 })}</td>
                        <td className="px-3 py-2 truncate max-w-[140px]">{r.vendor}</td>
                        <td className="px-3 py-2 font-mono text-[10px]">{r.vendor_gstin}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          </TabsContent>
          <TabsContent value="cdnur">
            <Card className="overflow-hidden">
              <div className="overflow-auto">
                <table className="w-full text-xs">
                  <thead className="border-b bg-muted/30">
                    <tr>{["CN No","Date","Original Invoice","Customer","POS","Taxable","CGST","SGST","IGST","Total","Reason"].map(h => (
                      <th key={h} className="px-3 py-2 text-left font-semibold whitespace-nowrap">{h}</th>
                    ))}</tr>
                  </thead>
                  <tbody>
                    {cdnurRows.length === 0 ? (
                      <tr><td colSpan={11} className="p-12 text-center text-muted-foreground">No credit notes in this period</td></tr>
                    ) : cdnurRows.map((c, i) => (
                      <tr key={i} className="border-b border-border/20">
                        <td className="px-3 py-2 font-mono text-[10px]">{c.cn_no}</td>
                        <td className="px-3 py-2 whitespace-nowrap">{c.cn_date}</td>
                        <td className="px-3 py-2 font-mono text-[10px]">{c.original_invoice_no}</td>
                        <td className="px-3 py-2">{c.customer}</td>
                        <td className="px-3 py-2 text-[10px]">{c.place_of_supply}</td>
                        <td className="px-3 py-2 text-right">₹{c.taxable.toLocaleString("en-IN")}</td>
                        <td className="px-3 py-2 text-right">₹{c.cgst.toLocaleString("en-IN")}</td>
                        <td className="px-3 py-2 text-right">₹{c.sgst.toLocaleString("en-IN")}</td>
                        <td className="px-3 py-2 text-right">₹{c.igst.toLocaleString("en-IN")}</td>
                        <td className="px-3 py-2 text-right font-semibold">₹{c.total.toLocaleString("en-IN")}</td>
                        <td className="px-3 py-2"><Badge variant="outline" className="text-[10px]">{c.reason}</Badge></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          </TabsContent>
          <TabsContent value="hsn">
            <Card className="overflow-hidden">
              <div className="overflow-auto">
                <table className="w-full text-xs">
                  <thead className="border-b bg-muted/30">
                    <tr>
                      {["HSN","Description","UQC","Rate","Qty","Taxable","CGST","SGST","IGST","Cess","Total"].map(h => (
                        <th key={h} className="px-3 py-2 text-left font-semibold text-muted-foreground">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {hsnSummary.length === 0 ? (
                      <tr><td colSpan={11} className="p-12 text-center text-muted-foreground">No HSN data — set HSN codes on products to populate this report</td></tr>
                    ) : hsnSummary.map((h, i) => (
                      <tr key={i} className="border-b border-border/20">
                        <td className="px-3 py-2 font-mono">{h.hsn}</td>
                        <td className="px-3 py-2 max-w-[220px] truncate">{h.description}</td>
                        <td className="px-3 py-2">{h.uqc}</td>
                        <td className="px-3 py-2 text-right">{h.gst_rate}%</td>
                        <td className="px-3 py-2 text-right">{h.quantity}</td>
                        <td className="px-3 py-2 text-right">₹{h.taxable.toLocaleString("en-IN")}</td>
                        <td className="px-3 py-2 text-right">₹{h.cgst.toLocaleString("en-IN")}</td>
                        <td className="px-3 py-2 text-right">₹{h.sgst.toLocaleString("en-IN")}</td>
                        <td className="px-3 py-2 text-right">₹{h.igst.toLocaleString("en-IN")}</td>
                        <td className="px-3 py-2 text-right">₹{h.cess.toLocaleString("en-IN")}</td>
                        <td className="px-3 py-2 text-right font-semibold">₹{h.total_value.toLocaleString("en-IN")}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          </TabsContent>
          <TabsContent value="docs">
            <Card className="overflow-hidden">
              <table className="w-full text-xs">
                <thead className="border-b bg-muted/30">
                  <tr>{["Nature of Document","Sr. From","Sr. To","Total","Cancelled","Net Issued"].map(h => (
                    <th key={h} className="px-3 py-2 text-left font-semibold">{h}</th>
                  ))}</tr>
                </thead>
                <tbody>
                  {docSummary.map((d, i) => (
                    <tr key={i} className="border-b border-border/20">
                      <td className="px-3 py-2 font-medium">{d.nature_of_document}</td>
                      <td className="px-3 py-2 font-mono text-[10px]">{d.serial_no_from || "—"}</td>
                      <td className="px-3 py-2 font-mono text-[10px]">{d.serial_no_to || "—"}</td>
                      <td className="px-3 py-2 text-right">{d.total_number}</td>
                      <td className="px-3 py-2 text-right text-warning">{d.cancelled}</td>
                      <td className="px-3 py-2 text-right font-semibold">{d.net_issued}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </AdminLayout>
  );
}

// Re-used column spec for B2CL & B2CS export tabs.
function b2cExportColumns() {
  return [
    { key: "invoice_no", label: "Invoice No" }, { key: "invoice_date", label: "Date" },
    { key: "customer", label: "Customer Name" }, { key: "customer_phone", label: "Phone" },
    { key: "customer_email", label: "Email" }, { key: "customer_address", label: "Customer Address", width: 32 },
    { key: "place_of_supply", label: "Place of Supply" }, { key: "pos_code", label: "POS Code" },
    { key: "supply_type", label: "Supply Type" },
    { key: "taxable_value", label: "Taxable Value (₹)" }, { key: "cgst", label: "CGST (₹)" },
    { key: "sgst", label: "SGST (₹)" }, { key: "igst", label: "IGST (₹)" }, { key: "cess", label: "Cess (₹)" },
    { key: "tcs", label: "TCS (₹)" }, { key: "discount", label: "Discount (₹)" },
    { key: "round_off", label: "Round-off (₹)" }, { key: "invoice_total", label: "Invoice Total (₹)" },
    { key: "amount_in_words", label: "Amount in Words" },
    { key: "vendor", label: "Vendor Name" }, { key: "vendor_gstin", label: "Vendor GSTIN" },
    { key: "vendor_pan", label: "Vendor PAN" }, { key: "vendor_state", label: "Vendor State" },
    { key: "vendor_state_code", label: "Vendor State Code" }, { key: "vendor_address", label: "Vendor Address", width: 32 },
    { key: "order_id", label: "Order Reference" }, { key: "cancelled", label: "Cancelled" }, { key: "notes", label: "Notes" },
  ];
}

function MiniStat({ icon: Icon, label, value }: { icon: any; label: string; value: string }) {
  return (
    <UICard className="p-4">
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs text-muted-foreground">{label}</span>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </div>
      <p className="text-xl font-bold">{value}</p>
    </UICard>
  );
}
