import { useState, useEffect, useMemo } from "react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import FinanceReportFilters, { FinanceFiltersValue, getDateRangeFromFilters } from "@/components/admin/FinanceReportFilters";
import { exportToCSV } from "@/lib/csv";
import { exportToXLSX, getCurrentFinancialYear, buildCoverSheet, amountInWordsINR } from "@/lib/xlsx-export";

interface HSNRow {
  hsn: string; description: string; uqc: string; gst_rate: number;
  quantity: number; taxable: number;
  cgst: number; sgst: number; igst: number; cess: number; total_value: number;
}

export default function HSNSummaryReportPage() {
  const [filters, setFilters] = useState<FinanceFiltersValue>({
    fyStart: getCurrentFinancialYear(), month: new Date().getMonth(), vendorId: "all", stateCode: "all",
  });
  const [rows, setRows] = useState<any[]>([]);
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
    let q = supabase.from("orders")
      .select("id, created_at, vendor_id, items, cgst_amount, sgst_amount, igst_amount, taxable_value, subtotal, status, place_of_supply_code")
      .gte("created_at", range.from.toISOString())
      .lte("created_at", range.to.toISOString())
      .in("status", ["delivered", "completed"]);
    if (filters.vendorId !== "all") q = q.eq("vendor_id", filters.vendorId);
    if (filters.stateCode !== "all") q = q.eq("place_of_supply_code", filters.stateCode);
    q.then(({ data }) => { setRows(data || []); setLoading(false); });
  }, [filters]);

  const hsnRows: HSNRow[] = useMemo(() => {
    // Group by HSN + GST rate (statutory requirement for GSTR-1 Table 12)
    const map = new Map<string, HSNRow>();
    rows.forEach(r => {
      const items = Array.isArray(r.items) ? r.items : [];
      const itemCount = Math.max(items.length, 1);
      items.forEach((it: any) => {
        const hsn = it.hsn_code || it.hsn || "9999";
        const gstRate = Number(it.gst_rate || it.tax_rate || 18);
        const key = `${hsn}__${gstRate}`;
        const cur = map.get(key) || {
          hsn, description: it.name || it.title || "—", uqc: it.uqc || "NOS",
          gst_rate: gstRate,
          quantity: 0, taxable: 0, cgst: 0, sgst: 0, igst: 0, cess: 0, total_value: 0,
        };
        const qty = Number(it.quantity || it.qty || 1);
        const lineTaxable = Number(it.price || it.unit_price || 0) * qty;
        cur.quantity += qty;
        cur.taxable += lineTaxable;
        cur.cgst += Number(r.cgst_amount || 0) / itemCount;
        cur.sgst += Number(r.sgst_amount || 0) / itemCount;
        cur.igst += Number(r.igst_amount || 0) / itemCount;
        cur.total_value += lineTaxable + (Number(r.cgst_amount || 0) + Number(r.sgst_amount || 0) + Number(r.igst_amount || 0)) / itemCount;
        map.set(key, cur);
      });
    });
    return Array.from(map.values()).map(r => ({
      ...r,
      taxable: Number(r.taxable.toFixed(2)),
      cgst: Number(r.cgst.toFixed(2)), sgst: Number(r.sgst.toFixed(2)),
      igst: Number(r.igst.toFixed(2)), total_value: Number(r.total_value.toFixed(2)),
    })).sort((a, b) => b.taxable - a.taxable);
  }, [rows]);

  const totals = useMemo(() => ({
    rows: hsnRows.length,
    qty: hsnRows.reduce((s, r) => s + r.quantity, 0),
    taxable: hsnRows.reduce((s, r) => s + r.taxable, 0),
    cgst: hsnRows.reduce((s, r) => s + r.cgst, 0),
    sgst: hsnRows.reduce((s, r) => s + r.sgst, 0),
    igst: hsnRows.reduce((s, r) => s + r.igst, 0),
  }), [hsnRows]);

  const range = getDateRangeFromFilters(filters);
  const auditCols = [
    { key: "hsn", label: "HSN/SAC Code" }, { key: "description", label: "Description", width: 30 },
    { key: "uqc", label: "UQC" }, { key: "gst_rate", label: "GST Rate (%)" },
    { key: "quantity", label: "Total Qty" },
    { key: "taxable", label: "Taxable Value (₹)" }, { key: "cgst", label: "CGST (₹)" },
    { key: "sgst", label: "SGST (₹)" }, { key: "igst", label: "IGST (₹)" },
    { key: "cess", label: "Cess (₹)" }, { key: "total_value", label: "Total Value (₹)" },
  ];

  const handleCSV = () => exportToCSV(hsnRows, auditCols, "HSN-Summary");

  const handleXLSX = () => exportToXLSX("HSN-Summary-Table12", [
    buildCoverSheet({
      reportTitle: "HSN-wise Summary — GSTR-1 Table 12",
      statutoryBasis: "Rule 59(3), CGST Rules — HSN-wise summary of outward supplies (mandatory: 4-digit for AATO ≤ ₹5cr, 6-digit > ₹5cr)",
      period: range.label, fyLabel: `FY ${filters.fyStart}-${String(filters.fyStart + 1).slice(-2)}`,
      filters: { Vendor: filters.vendorId, "POS State Code": filters.stateCode },
      notes: [
        "Each row represents one (HSN/SAC × GST Rate) combination as required by GSTR-1 Table 12.",
        "UQC (Unit Quantity Code) defaults to NOS when not configured on product master.",
        "CGST/SGST/IGST are pro-rated across line items per invoice — verify against the invoice register.",
      ],
    }),
    { name: "HSN-wise Summary", rows: hsnRows, columns: auditCols },
    { name: "Period Totals", rows: [{
      hsn_count: totals.rows, qty: totals.qty,
      taxable: Number(totals.taxable.toFixed(2)),
      cgst: Number(totals.cgst.toFixed(2)), sgst: Number(totals.sgst.toFixed(2)), igst: Number(totals.igst.toFixed(2)),
      total_tax: Number((totals.cgst + totals.sgst + totals.igst).toFixed(2)),
      tax_in_words: amountInWordsINR(totals.cgst + totals.sgst + totals.igst),
    }], columns: [
      { key: "hsn_count", label: "Unique HSNs" }, { key: "qty", label: "Total Qty" },
      { key: "taxable", label: "Taxable (₹)" }, { key: "cgst", label: "CGST (₹)" },
      { key: "sgst", label: "SGST (₹)" }, { key: "igst", label: "IGST (₹)" },
      { key: "total_tax", label: "Total Tax (₹)" }, { key: "tax_in_words", label: "Tax in Words", width: 60 },
    ]},
  ]);

  return (
    <AdminLayout>
      <div className="space-y-4">
        <div>
          <h1 className="page-title">HSN-wise Summary</h1>
          <p className="page-description">Aggregated outward supply by HSN code with quantity and tax breakup — required for GSTR-1 Table 12</p>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
          {loading ? Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-20 rounded-xl" />) : (<>
            <Stat label="Unique HSNs" value={totals.rows.toLocaleString()} />
            <Stat label="Total Qty" value={totals.qty.toLocaleString()} />
            <Stat label="Taxable" value={`₹${totals.taxable.toLocaleString("en-IN", { maximumFractionDigits: 0 })}`} />
            <Stat label="CGST + SGST" value={`₹${(totals.cgst + totals.sgst).toLocaleString("en-IN", { maximumFractionDigits: 0 })}`} />
            <Stat label="IGST" value={`₹${totals.igst.toLocaleString("en-IN", { maximumFractionDigits: 0 })}`} />
          </>)}
        </div>

        <FinanceReportFilters value={filters} onChange={setFilters} vendors={vendors} onExportCSV={handleCSV} onExportXLSX={handleXLSX} />

        <Card className="overflow-hidden">
          <div className="overflow-auto">
            <table className="w-full text-xs">
              <thead className="border-b bg-muted/30">
                <tr>
                  {["HSN","Description","UQC","Qty","Taxable","CGST","SGST","IGST","Cess","Total Value"].map(h => (
                    <th key={h} className="px-3 py-2 text-left font-semibold whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {hsnRows.length === 0 ? (
                  <tr><td colSpan={10} className="p-12 text-center text-muted-foreground">
                    No HSN data — set HSN codes on products to populate this report
                  </td></tr>
                ) : hsnRows.map((h, i) => (
                  <tr key={i} className="border-b border-border/20">
                    <td className="px-3 py-2 font-mono">{h.hsn}</td>
                    <td className="px-3 py-2 max-w-[260px] truncate">{h.description}</td>
                    <td className="px-3 py-2">{h.uqc}</td>
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
      </div>
    </AdminLayout>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <Card className="p-4">
      <div className="text-xs text-muted-foreground mb-1">{label}</div>
      <div className="text-xl font-bold">{value}</div>
    </Card>
  );
}
