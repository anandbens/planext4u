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
import { exportToXLSX, getCurrentFinancialYear } from "@/lib/xlsx-export";
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

  const handleCSV = () => exportToCSV(filtered.map((r: any) => ({
    invoice_no: r.invoice_no,
    date: format(parseISO(r.invoice_date), "dd-MMM-yyyy"),
    order_id: r.order_id,
    customer: r.customer_name, vendor: r.vendor_name, vendor_gstin: r.vendor_gstin || "",
    pos: r.place_of_supply_code || "", supply_type: r.is_interstate ? "Inter-state" : "Intra-state",
    taxable: Number(r.taxable_value || 0),
    cgst: Number(r.cgst_amount || 0), sgst: Number(r.sgst_amount || 0), igst: Number(r.igst_amount || 0),
    total: Number(r.total_amount || 0),
  })), [
    { key: "invoice_no", label: "Invoice No" }, { key: "date", label: "Date" }, { key: "order_id", label: "Order" },
    { key: "customer", label: "Customer" }, { key: "vendor", label: "Vendor" }, { key: "vendor_gstin", label: "Vendor GSTIN" },
    { key: "pos", label: "POS" }, { key: "supply_type", label: "Supply Type" },
    { key: "taxable", label: "Taxable" }, { key: "cgst", label: "CGST" }, { key: "sgst", label: "SGST" }, { key: "igst", label: "IGST" },
    { key: "total", label: "Total" },
  ], "Tax_Invoices");

  const handleXLSX = () => exportToXLSX("Tax-Invoices", [{
    name: "Invoices",
    rows: filtered.map((r: any) => ({
      invoice_no: r.invoice_no, date: format(parseISO(r.invoice_date), "dd-MMM-yyyy"),
      order_id: r.order_id, customer: r.customer_name, vendor: r.vendor_name,
      vendor_gstin: r.vendor_gstin || "—", pos: r.place_of_supply_code || "—",
      taxable: Number(r.taxable_value || 0), cgst: Number(r.cgst_amount || 0),
      sgst: Number(r.sgst_amount || 0), igst: Number(r.igst_amount || 0), total: Number(r.total_amount || 0),
    }),
    columns: [
      { key: "invoice_no", label: "Invoice No" }, { key: "date", label: "Date" }, { key: "order_id", label: "Order" },
      { key: "customer", label: "Customer" }, { key: "vendor", label: "Vendor" }, { key: "vendor_gstin", label: "Vendor GSTIN" },
      { key: "pos", label: "POS" },
      { key: "taxable", label: "Taxable (₹)" }, { key: "cgst", label: "CGST (₹)" }, { key: "sgst", label: "SGST (₹)" },
      { key: "igst", label: "IGST (₹)" }, { key: "total", label: "Total (₹)" },
    ],
  }]);

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
