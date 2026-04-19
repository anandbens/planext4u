import { useState, useEffect, useMemo } from "react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import FinanceReportFilters, { FinanceFiltersValue, getDateRangeFromFilters } from "@/components/admin/FinanceReportFilters";
import { exportToCSV } from "@/lib/csv";
import { exportToXLSX, getCurrentFinancialYear } from "@/lib/xlsx-export";

export default function GSTR3BReportPage() {
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
      .select("id, created_at, vendor_id, taxable_value, subtotal, cgst_amount, sgst_amount, igst_amount, tax, total, is_interstate, place_of_supply_code, status")
      .gte("created_at", range.from.toISOString())
      .lte("created_at", range.to.toISOString())
      .in("status", ["delivered", "completed"]);
    if (filters.vendorId !== "all") q = q.eq("vendor_id", filters.vendorId);
    if (filters.stateCode !== "all") q = q.eq("place_of_supply_code", filters.stateCode);
    q.then(({ data }) => { setRows(data || []); setLoading(false); });
  }, [filters]);

  const summary = useMemo(() => {
    const taxable = rows.reduce((s, r) => s + Number(r.taxable_value || r.subtotal || 0), 0);
    const cgst = rows.reduce((s, r) => s + Number(r.cgst_amount || 0), 0);
    const sgst = rows.reduce((s, r) => s + Number(r.sgst_amount || 0), 0);
    const igst = rows.reduce((s, r) => s + Number(r.igst_amount || 0), 0);
    return {
      taxable, cgst, sgst, igst,
      total_tax: cgst + sgst + igst,
      invoices: rows.length,
      interstate: rows.filter(r => r.is_interstate).length,
      intrastate: rows.filter(r => !r.is_interstate).length,
    };
  }, [rows]);

  const range = getDateRangeFromFilters(filters);

  const tableSection3_1 = [
    { sr: "(a)", nature: "Outward taxable supplies (other than zero-rated, nil-rated, exempted)", taxable: summary.taxable, igst: summary.igst, cgst: summary.cgst, sgst: summary.sgst, cess: 0 },
    { sr: "(b)", nature: "Outward taxable supplies (zero-rated)", taxable: 0, igst: 0, cgst: 0, sgst: 0, cess: 0 },
    { sr: "(c)", nature: "Other outward supplies (Nil rated, exempted)", taxable: 0, igst: 0, cgst: 0, sgst: 0, cess: 0 },
    { sr: "(d)", nature: "Inward supplies (liable to reverse charge)", taxable: 0, igst: 0, cgst: 0, sgst: 0, cess: 0 },
    { sr: "(e)", nature: "Non-GST outward supplies", taxable: 0, igst: 0, cgst: 0, sgst: 0, cess: 0 },
  ];

  const handleCSV = () => {
    exportToCSV(tableSection3_1, [
      { key: "sr", label: "Sr." }, { key: "nature", label: "Nature of Supplies" },
      { key: "taxable", label: "Total Taxable Value" }, { key: "igst", label: "IGST" },
      { key: "cgst", label: "CGST" }, { key: "sgst", label: "SGST/UTGST" }, { key: "cess", label: "Cess" },
    ], "GSTR3B");
  };

  const handleXLSX = () => {
    exportToXLSX("GSTR3B-Summary", [
      { name: "3.1 Outward & RCM", rows: tableSection3_1, columns: [
        { key: "sr", label: "Sr." }, { key: "nature", label: "Nature of Supplies", width: 60 },
        { key: "taxable", label: "Taxable Value (₹)" }, { key: "igst", label: "IGST (₹)" },
        { key: "cgst", label: "CGST (₹)" }, { key: "sgst", label: "SGST (₹)" }, { key: "cess", label: "Cess (₹)" },
      ]},
      { name: "Period Summary", rows: [{
        period: range.label, invoices: summary.invoices,
        intrastate_invoices: summary.intrastate, interstate_invoices: summary.interstate,
        taxable_value: summary.taxable, cgst: summary.cgst, sgst: summary.sgst, igst: summary.igst,
        total_tax_liability: summary.total_tax,
      }]},
    ]);
  };

  return (
    <AdminLayout>
      <div className="space-y-4">
        <div>
          <h1 className="page-title">GSTR-3B — Monthly Summary Return</h1>
          <p className="page-description">{range.label} • Self-declaration summary of outward supplies, ITC, and tax liability</p>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
          {loading ? Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-20 rounded-xl" />) : (<>
            <Stat label="Total Invoices" value={summary.invoices.toLocaleString()} />
            <Stat label="Taxable Value" value={`₹${summary.taxable.toLocaleString("en-IN", { maximumFractionDigits: 0 })}`} />
            <Stat label="CGST + SGST" value={`₹${(summary.cgst + summary.sgst).toLocaleString("en-IN", { maximumFractionDigits: 0 })}`} />
            <Stat label="IGST" value={`₹${summary.igst.toLocaleString("en-IN", { maximumFractionDigits: 0 })}`} />
            <Stat label="Total Tax Liability" value={`₹${summary.total_tax.toLocaleString("en-IN", { maximumFractionDigits: 0 })}`} highlight />
          </>)}
        </div>

        <FinanceReportFilters value={filters} onChange={setFilters} vendors={vendors} onExportCSV={handleCSV} onExportXLSX={handleXLSX} />

        <Card className="overflow-hidden">
          <div className="px-4 py-3 border-b bg-muted/30">
            <h3 className="text-sm font-semibold">Table 3.1 — Details of Outward Supplies and Inward Supplies liable to Reverse Charge</h3>
          </div>
          <div className="overflow-auto">
            <table className="w-full text-xs">
              <thead className="border-b bg-muted/20">
                <tr>
                  <th className="px-3 py-2 text-left font-semibold w-12">Sr.</th>
                  <th className="px-3 py-2 text-left font-semibold">Nature of Supplies</th>
                  <th className="px-3 py-2 text-right font-semibold">Taxable Value</th>
                  <th className="px-3 py-2 text-right font-semibold">IGST</th>
                  <th className="px-3 py-2 text-right font-semibold">CGST</th>
                  <th className="px-3 py-2 text-right font-semibold">SGST/UTGST</th>
                  <th className="px-3 py-2 text-right font-semibold">Cess</th>
                </tr>
              </thead>
              <tbody>
                {tableSection3_1.map((r, i) => (
                  <tr key={i} className="border-b border-border/20">
                    <td className="px-3 py-2 font-mono">{r.sr}</td>
                    <td className="px-3 py-2">{r.nature}</td>
                    <td className="px-3 py-2 text-right">₹{r.taxable.toLocaleString("en-IN", { maximumFractionDigits: 2 })}</td>
                    <td className="px-3 py-2 text-right">₹{r.igst.toLocaleString("en-IN", { maximumFractionDigits: 2 })}</td>
                    <td className="px-3 py-2 text-right">₹{r.cgst.toLocaleString("en-IN", { maximumFractionDigits: 2 })}</td>
                    <td className="px-3 py-2 text-right">₹{r.sgst.toLocaleString("en-IN", { maximumFractionDigits: 2 })}</td>
                    <td className="px-3 py-2 text-right">₹{r.cess.toLocaleString("en-IN", { maximumFractionDigits: 2 })}</td>
                  </tr>
                ))}
                <tr className="bg-muted/30 font-bold">
                  <td colSpan={2} className="px-3 py-2">Total</td>
                  <td className="px-3 py-2 text-right">₹{summary.taxable.toLocaleString("en-IN", { maximumFractionDigits: 2 })}</td>
                  <td className="px-3 py-2 text-right">₹{summary.igst.toLocaleString("en-IN", { maximumFractionDigits: 2 })}</td>
                  <td className="px-3 py-2 text-right">₹{summary.cgst.toLocaleString("en-IN", { maximumFractionDigits: 2 })}</td>
                  <td className="px-3 py-2 text-right">₹{summary.sgst.toLocaleString("en-IN", { maximumFractionDigits: 2 })}</td>
                  <td className="px-3 py-2 text-right">₹0</td>
                </tr>
              </tbody>
            </table>
          </div>
        </Card>

        <Card className="p-4">
          <h3 className="text-sm font-semibold mb-2">Notes for filing</h3>
          <ul className="text-xs text-muted-foreground space-y-1 list-disc list-inside">
            <li>This summary auto-derives outward supplies from delivered/completed orders during {range.label}.</li>
            <li>ITC (Input Tax Credit) on procurement is not tracked in this app — fill manually on the GST portal.</li>
            <li>Reverse charge (RCM) entries default to zero — add manually if applicable.</li>
            <li>Use the Excel export to attach to your GST return working file.</li>
          </ul>
        </Card>
      </div>
    </AdminLayout>
  );
}

function Stat({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <Card className={`p-4 ${highlight ? "border-primary/40 bg-primary/5" : ""}`}>
      <div className="text-xs text-muted-foreground mb-1">{label}</div>
      <div className="text-xl font-bold">{value}</div>
    </Card>
  );
}
