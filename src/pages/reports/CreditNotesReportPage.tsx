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
import { exportToXLSX, getCurrentFinancialYear } from "@/lib/xlsx-export";
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
    original_invoice: r.original_invoice_no || "—",
    order_id: r.order_id,
    customer: r.customer_name || "—",
    vendor: r.vendor_id,
    vendor_gstin: r.vendor_gstin || "—",
    reason: r.reason,
    taxable: Number(r.taxable_value || 0),
    cgst: Number(r.cgst_amount || 0),
    sgst: Number(r.sgst_amount || 0),
    igst: Number(r.igst_amount || 0),
    total: Number(r.total_amount || 0),
  })), [rows]);

  const totals = useMemo(() => ({
    count: formatted.length,
    taxable: formatted.reduce((s, r) => s + r.taxable, 0),
    cgst: formatted.reduce((s, r) => s + r.cgst, 0),
    sgst: formatted.reduce((s, r) => s + r.sgst, 0),
    igst: formatted.reduce((s, r) => s + r.igst, 0),
    total: formatted.reduce((s, r) => s + r.total, 0),
  }), [formatted]);

  const handleCSV = () => exportToCSV(formatted, [
    { key: "cn_no", label: "Credit Note No" }, { key: "cn_date", label: "Date" },
    { key: "original_invoice", label: "Original Invoice" }, { key: "order_id", label: "Order ID" },
    { key: "customer", label: "Customer" }, { key: "vendor", label: "Vendor" },
    { key: "vendor_gstin", label: "Vendor GSTIN" }, { key: "reason", label: "Reason" },
    { key: "taxable", label: "Taxable" }, { key: "cgst", label: "CGST" },
    { key: "sgst", label: "SGST" }, { key: "igst", label: "IGST" }, { key: "total", label: "Total" },
  ], "Credit_Notes");

  const handleXLSX = () => exportToXLSX("Credit-Notes-GSTR1-Table-9B", [
    { name: "Credit Notes", rows: formatted, columns: [
      { key: "cn_no", label: "CN No" }, { key: "cn_date", label: "Date" },
      { key: "original_invoice", label: "Original Invoice" }, { key: "order_id", label: "Order" },
      { key: "customer", label: "Customer" }, { key: "vendor", label: "Vendor" },
      { key: "vendor_gstin", label: "Vendor GSTIN" }, { key: "reason", label: "Reason" },
      { key: "taxable", label: "Taxable (₹)" }, { key: "cgst", label: "CGST (₹)" },
      { key: "sgst", label: "SGST (₹)" }, { key: "igst", label: "IGST (₹)" }, { key: "total", label: "Total (₹)" },
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
