// All invoices issued — searchable, filterable, downloadable
import { useState, useEffect, useMemo } from "react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Receipt, Download, Search } from "lucide-react";
import { format, parseISO } from "date-fns";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import FinanceReportFilters, { FinanceFiltersValue, getDateRangeFromFilters } from "@/components/admin/FinanceReportFilters";
import { exportToCSV } from "@/lib/csv";
import { exportToXLSX, getCurrentFinancialYear, buildCoverSheet, amountInWordsINR, stateName } from "@/lib/xlsx-export";
import { downloadOrderInvoice } from "@/lib/order-invoice";

export default function InvoicesListPage() {
  const [filters, setFilters] = useState<FinanceFiltersValue>({
    fyStart: getCurrentFinancialYear(), month: -1, vendorId: "all", stateCode: "all",
  });
  const [search, setSearch] = useState("");
  const [rows, setRows] = useState<any[]>([]);
  const [vendors, setVendors] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.from("vendors").select("id, name").order("name").then(({ data }) => setVendors((data || []).map(v => ({ id: v.id, name: v.name }))));
  }, []);

  useEffect(() => {
    const range = getDateRangeFromFilters(filters);
    setLoading(true);
    let q = supabase.from("order_invoices" as any).select("*")
      .gte("invoice_date", range.from.toISOString())
      .lte("invoice_date", range.to.toISOString());
    if (filters.vendorId !== "all") q = q.eq("vendor_id", filters.vendorId);
    if (filters.stateCode !== "all") q = q.eq("place_of_supply_code", filters.stateCode);
    q.order("invoice_date", { ascending: false }).then(({ data }) => {
      setRows((data || []) as any[]);
      setLoading(false);
    });
  }, [filters]);

  const filtered = useMemo(() => {
    if (!search) return rows;
    const s = search.toLowerCase();
    return rows.filter(r => (r.invoice_no || "").toLowerCase().includes(s) ||
      (r.customer_name || "").toLowerCase().includes(s) ||
      (r.vendor_name || "").toLowerCase().includes(s) ||
      (r.order_id || "").toLowerCase().includes(s));
  }, [rows, search]);

  const totals = useMemo(() => ({
    count: filtered.length,
    taxable: filtered.reduce((s, r) => s + Number(r.taxable_value || 0), 0),
    tax: filtered.reduce((s, r) => s + Number(r.cgst_amount || 0) + Number(r.sgst_amount || 0) + Number(r.igst_amount || 0), 0),
    total: filtered.reduce((s, r) => s + Number(r.total_amount || 0), 0),
  }), [filtered]);

  const auditRows = useMemo(() => filtered.map((r: any) => {
    const cgst = Number(r.cgst_amount || 0);
    const sgst = Number(r.sgst_amount || 0);
    const igst = Number(r.igst_amount || 0);
    const cess = Number(r.cess_amount || 0);
    const taxable = Number(r.taxable_value || 0);
    const total = Number(r.total_amount || 0);
    const totalTax = cgst + sgst + igst + cess;
    const effectiveRate = taxable > 0 ? Number(((totalTax / taxable) * 100).toFixed(2)) : 0;
    return {
      invoice_no: r.invoice_no,
      invoice_date: format(parseISO(r.invoice_date), "dd-MMM-yyyy"),
      fy: r.fy_start ? `FY ${r.fy_start}-${String(r.fy_start + 1).slice(-2)}` : "—",
      order_id: r.order_id,
      vendor_id: r.vendor_id,
      vendor_name: r.vendor_name || "—",
      vendor_gstin: r.vendor_gstin || "—",
      vendor_pan: r.vendor_pan || "—",
      vendor_state: r.vendor_state || stateName(r.vendor_state_code),
      vendor_state_code: r.vendor_state_code || "—",
      vendor_address: r.vendor_address || "—",
      customer_id: r.customer_id || "—",
      customer_name: r.customer_name || "—",
      customer_phone: r.customer_phone || "—",
      customer_email: r.customer_email || "—",
      pos_state: r.place_of_supply_state || stateName(r.place_of_supply_code),
      pos_code: r.place_of_supply_code || "—",
      supply_type: r.is_interstate ? "Inter-state" : "Intra-state",
      reverse_charge: "No",
      invoice_type: "Regular",
      hsn_or_sac: Array.isArray(r.items) && r.items.length > 0 ? r.items.map((it: any) => it.hsn_code || it.hsn || it.sac_code || "—").filter(Boolean).join(", ").slice(0, 80) : "—",
      taxable_value: Number(taxable.toFixed(2)),
      cgst_amount: Number(cgst.toFixed(2)),
      sgst_amount: Number(sgst.toFixed(2)),
      igst_amount: Number(igst.toFixed(2)),
      cess_amount: Number(cess.toFixed(2)),
      total_tax: Number(totalTax.toFixed(2)),
      effective_tax_rate_pct: effectiveRate,
      discount: Number((r.discount || 0).toFixed(2)),
      round_off: Number((r.round_off || 0).toFixed(2)),
      total_amount: Number(total.toFixed(2)),
      amount_in_words: amountInWordsINR(total),
      status: "Issued",
    };
  }), [filtered]);

  const auditColumns = [
    { key: "invoice_no", label: "Invoice No" }, { key: "invoice_date", label: "Invoice Date" }, { key: "fy", label: "FY" },
    { key: "order_id", label: "Order ID" },
    { key: "vendor_id", label: "Vendor ID" }, { key: "vendor_name", label: "Vendor Name", width: 26 },
    { key: "vendor_gstin", label: "Vendor GSTIN", width: 18 }, { key: "vendor_pan", label: "Vendor PAN" },
    { key: "vendor_state", label: "Vendor State" }, { key: "vendor_state_code", label: "Vendor State Code" },
    { key: "vendor_address", label: "Vendor Address", width: 40 },
    { key: "customer_id", label: "Customer ID" }, { key: "customer_name", label: "Customer Name", width: 24 },
    { key: "customer_phone", label: "Customer Phone" }, { key: "customer_email", label: "Customer Email", width: 26 },
    { key: "pos_state", label: "Place of Supply (State)" }, { key: "pos_code", label: "POS Code" },
    { key: "supply_type", label: "Supply Type" }, { key: "reverse_charge", label: "Reverse Charge" },
    { key: "invoice_type", label: "Invoice Type" }, { key: "hsn_or_sac", label: "HSN / SAC", width: 24 },
    { key: "taxable_value", label: "Taxable Value (₹)" },
    { key: "cgst_amount", label: "CGST (₹)" }, { key: "sgst_amount", label: "SGST (₹)" }, { key: "igst_amount", label: "IGST (₹)" },
    { key: "cess_amount", label: "Cess (₹)" }, { key: "total_tax", label: "Total Tax (₹)" },
    { key: "effective_tax_rate_pct", label: "Effective Tax Rate (%)" },
    { key: "discount", label: "Discount (₹)" }, { key: "round_off", label: "Round Off (₹)" },
    { key: "total_amount", label: "Invoice Total (₹)" },
    { key: "amount_in_words", label: "Amount in Words", width: 60 }, { key: "status", label: "Status" },
  ];

  const range = getDateRangeFromFilters(filters);
  const handleCSV = () => exportToCSV(auditRows, auditColumns, "Tax_Invoices");

  const handleXLSX = () => exportToXLSX("Tax-Invoices-Register", [
    buildCoverSheet({
      reportTitle: "Tax Invoices Register",
      statutoryBasis: "Section 31, CGST Act, 2017 — Tax Invoice issued on supply of goods/services",
      period: range.label, fyLabel: `FY ${filters.fyStart}-${String(filters.fyStart + 1).slice(-2)}`,
      filters: { Vendor: filters.vendorId, "POS State Code": filters.stateCode, Search: search || undefined },
      notes: [
        "Each row represents one tax invoice auto-generated on order delivery/completion.",
        "Reverse Charge defaults to 'No' (B2C marketplace flow).",
        "HSN/SAC column is concatenated from line items — see GSTR-1 export for line-level breakup.",
      ],
    }),
    { name: "Invoices", rows: auditRows, columns: auditColumns },
    { name: "Period Totals", rows: [{
      invoices: totals.count, taxable: Number(totals.taxable.toFixed(2)),
      total_tax: Number(totals.tax.toFixed(2)), invoice_total: Number(totals.total.toFixed(2)),
      amount_in_words: amountInWordsINR(totals.total),
    }], columns: [
      { key: "invoices", label: "Total Invoices" }, { key: "taxable", label: "Total Taxable (₹)" },
      { key: "total_tax", label: "Total Tax (₹)" }, { key: "invoice_total", label: "Invoice Total (₹)" },
      { key: "amount_in_words", label: "Total in Words", width: 60 },
    ]},
  ]);

  return (
    <AdminLayout>
      <div className="space-y-4">
        <div>
          <h1 className="page-title">Tax Invoices Issued</h1>
          <p className="page-description">All vendor → customer GST invoices auto-generated on order delivery</p>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {loading ? Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-20 rounded-xl" />) : (<>
            <Mini label="Total Invoices" value={totals.count.toLocaleString()} />
            <Mini label="Taxable Value" value={`₹${totals.taxable.toLocaleString("en-IN", { maximumFractionDigits: 0 })}`} />
            <Mini label="GST Collected" value={`₹${totals.tax.toLocaleString("en-IN", { maximumFractionDigits: 0 })}`} />
            <Mini label="Invoice Total" value={`₹${totals.total.toLocaleString("en-IN", { maximumFractionDigits: 0 })}`} />
          </>)}
        </div>

        <FinanceReportFilters value={filters} onChange={setFilters} vendors={vendors} onExportCSV={handleCSV} onExportXLSX={handleXLSX} />

        <Card className="p-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search invoice no, customer, vendor, order..." className="h-9 pl-9 text-sm" />
          </div>
        </Card>

        <Card className="overflow-hidden">
          <div className="overflow-auto">
            <table className="w-full text-xs">
              <thead className="border-b bg-muted/30">
                <tr>{["Invoice No","Date","Order","Customer","Vendor","POS","Supply","Taxable","Tax","Total","PDF"].map(h => (
                  <th key={h} className="px-3 py-2 text-left font-semibold text-muted-foreground whitespace-nowrap">{h}</th>
                ))}</tr>
              </thead>
              <tbody>
                {loading ? Array.from({ length: 6 }).map((_, i) => (
                  <tr key={i}><td colSpan={11} className="p-2"><Skeleton className="h-4 w-full" /></td></tr>
                )) : filtered.length === 0 ? (
                  <tr><td colSpan={11} className="p-12 text-center text-muted-foreground">No invoices in this period</td></tr>
                ) : filtered.map((r: any) => {
                  const tax = Number(r.cgst_amount || 0) + Number(r.sgst_amount || 0) + Number(r.igst_amount || 0);
                  return (
                    <tr key={r.id} className="border-b border-border/20 hover:bg-muted/20">
                      <td className="px-3 py-2 font-mono text-[11px]">{r.invoice_no}</td>
                      <td className="px-3 py-2 whitespace-nowrap">{format(parseISO(r.invoice_date), "dd-MMM-yyyy")}</td>
                      <td className="px-3 py-2 font-mono text-[10px]">{r.order_id}</td>
                      <td className="px-3 py-2 truncate max-w-[120px]">{r.customer_name}</td>
                      <td className="px-3 py-2 truncate max-w-[120px]">{r.vendor_name}</td>
                      <td className="px-3 py-2 text-[10px]"><Badge variant="outline">{r.place_of_supply_code || "—"}</Badge></td>
                      <td className="px-3 py-2"><Badge variant="outline" className="text-[10px]">{r.is_interstate ? "Inter" : "Intra"}</Badge></td>
                      <td className="px-3 py-2 text-right">₹{Number(r.taxable_value || 0).toLocaleString("en-IN", { maximumFractionDigits: 0 })}</td>
                      <td className="px-3 py-2 text-right">₹{tax.toLocaleString("en-IN", { maximumFractionDigits: 0 })}</td>
                      <td className="px-3 py-2 text-right font-semibold">₹{Number(r.total_amount || 0).toLocaleString("en-IN", { maximumFractionDigits: 0 })}</td>
                      <td className="px-3 py-2">
                        <Button size="sm" variant="ghost" className="h-7 px-2" onClick={() => downloadOrderInvoice(r.order_id).catch(e => alert(e.message))}>
                          <Download className="h-3.5 w-3.5" />
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </AdminLayout>
  );
}

function Mini({ label, value }: { label: string; value: string }) {
  return (
    <Card className="p-4">
      <div className="flex items-center justify-between mb-1"><span className="text-xs text-muted-foreground">{label}</span><Receipt className="h-4 w-4 text-muted-foreground" /></div>
      <p className="text-xl font-bold">{value}</p>
    </Card>
  );
}
