import { useState, useEffect, useMemo } from "react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { FileText, DollarSign, Receipt, Building2 } from "lucide-react";
import { format, parseISO } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import FinanceReportFilters, { FinanceFiltersValue, getDateRangeFromFilters } from "@/components/admin/FinanceReportFilters";
import { exportToCSV } from "@/lib/csv";
import { exportToXLSX } from "@/lib/xlsx-export";
import { getCurrentFinancialYear } from "@/lib/xlsx-export";
import { Card as UICard } from "@/components/ui/card";

interface OrderRow {
  id: string;
  invoice_no: string | null;
  created_at: string;
  customer_name: string | null;
  customer_id: string;
  vendor_id: string;
  vendor_name: string | null;
  vendor_gstin: string | null;
  vendor_state: string | null;
  place_of_supply_state: string | null;
  place_of_supply_code: string | null;
  is_interstate: boolean | null;
  taxable_value: number | null;
  subtotal: number | null;
  cgst_amount: number | null;
  sgst_amount: number | null;
  igst_amount: number | null;
  tax: number | null;
  total: number | null;
  status: string;
  items: any;
}

export default function GSTR1ReportPage() {
  const [filters, setFilters] = useState<FinanceFiltersValue>({
    fyStart: getCurrentFinancialYear(), month: new Date().getMonth(), vendorId: "all", stateCode: "all",
  });
  const [rows, setRows] = useState<OrderRow[]>([]);
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
      .select("id, invoice_no, created_at, customer_name, customer_id, vendor_id, vendor_name, vendor_gstin, vendor_state, place_of_supply_state, place_of_supply_code, is_interstate, taxable_value, subtotal, cgst_amount, sgst_amount, igst_amount, tax, total, status, items")
      .gte("created_at", range.from.toISOString())
      .lte("created_at", range.to.toISOString())
      .in("status", ["delivered", "completed"]);
    if (filters.vendorId !== "all") q = q.eq("vendor_id", filters.vendorId);
    if (filters.stateCode !== "all") q = q.eq("place_of_supply_code", filters.stateCode);
    q.order("created_at", { ascending: false }).then(({ data }) => {
      setRows((data || []) as any);
      setLoading(false);
    });
  }, [filters]);

  // B2C summary (no GSTIN on customer in this app, so all are B2C)
  const b2cRows = useMemo(() => rows.map(r => ({
    invoice_no: r.invoice_no || r.id,
    invoice_date: format(parseISO(r.created_at), "dd-MMM-yyyy"),
    customer: r.customer_name || "—",
    place_of_supply: r.place_of_supply_code ? `${r.place_of_supply_code}-${r.place_of_supply_state || ""}` : "—",
    taxable_value: Number(r.taxable_value || r.subtotal || 0),
    cgst: Number(r.cgst_amount || 0),
    sgst: Number(r.sgst_amount || 0),
    igst: Number(r.igst_amount || 0),
    total_tax: Number(r.cgst_amount || 0) + Number(r.sgst_amount || 0) + Number(r.igst_amount || 0),
    invoice_total: Number(r.total || 0),
    vendor: r.vendor_name || "—",
    vendor_gstin: r.vendor_gstin || "—",
  })), [rows]);

  // HSN-wise summary derived from order items
  const hsnSummary = useMemo(() => {
    const map = new Map<string, { hsn: string; description: string; quantity: number; taxable: number; cgst: number; sgst: number; igst: number; uqc: string }>();
    rows.forEach(r => {
      const items = Array.isArray(r.items) ? r.items : [];
      const itemCount = items.length || 1;
      items.forEach((it: any) => {
        const hsn = it.hsn_code || it.hsn || "9999";
        const uqc = it.uqc || "NOS";
        const qty = Number(it.quantity || it.qty || 1);
        const itemTaxable = Number(it.price || it.unit_price || 0) * qty;
        const cur = map.get(hsn) || { hsn, description: it.name || it.title || "—", quantity: 0, taxable: 0, cgst: 0, sgst: 0, igst: 0, uqc };
        cur.quantity += qty;
        cur.taxable += itemTaxable;
        cur.cgst += Number(r.cgst_amount || 0) / itemCount;
        cur.sgst += Number(r.sgst_amount || 0) / itemCount;
        cur.igst += Number(r.igst_amount || 0) / itemCount;
        map.set(hsn, cur);
      });
    });
    return Array.from(map.values()).map(r => ({
      ...r,
      taxable: Number(r.taxable.toFixed(2)),
      cgst: Number(r.cgst.toFixed(2)), sgst: Number(r.sgst.toFixed(2)), igst: Number(r.igst.toFixed(2)),
    }));
  }, [rows]);

  // Document summary
  const docSummary = useMemo(() => ({
    total_invoices: rows.length,
    cancelled: 0,
    nature: "Tax Invoice",
    range_from: rows.length > 0 ? rows[rows.length - 1].invoice_no || rows[rows.length - 1].id : "",
    range_to: rows.length > 0 ? rows[0].invoice_no || rows[0].id : "",
  }), [rows]);

  const totals = useMemo(() => ({
    invoices: rows.length,
    taxable: b2cRows.reduce((s, r) => s + r.taxable_value, 0),
    cgst: b2cRows.reduce((s, r) => s + r.cgst, 0),
    sgst: b2cRows.reduce((s, r) => s + r.sgst, 0),
    igst: b2cRows.reduce((s, r) => s + r.igst, 0),
  }), [b2cRows]);

  const handleCSV = () => {
    exportToCSV(b2cRows, [
      { key: "invoice_no", label: "Invoice No" }, { key: "invoice_date", label: "Invoice Date" },
      { key: "customer", label: "Customer" }, { key: "place_of_supply", label: "Place of Supply" },
      { key: "taxable_value", label: "Taxable Value" }, { key: "cgst", label: "CGST" },
      { key: "sgst", label: "SGST" }, { key: "igst", label: "IGST" },
      { key: "total_tax", label: "Total Tax" }, { key: "invoice_total", label: "Invoice Total" },
      { key: "vendor", label: "Vendor" }, { key: "vendor_gstin", label: "Vendor GSTIN" },
    ], "GSTR1");
  };

  const handleXLSX = () => {
    exportToXLSX("GSTR1-Outward-Supplies", [
      { name: "B2C (Small)", rows: b2cRows, columns: [
        { key: "invoice_no", label: "Invoice No" }, { key: "invoice_date", label: "Date" },
        { key: "customer", label: "Customer" }, { key: "place_of_supply", label: "Place of Supply" },
        { key: "taxable_value", label: "Taxable Value (₹)" }, { key: "cgst", label: "CGST (₹)" },
        { key: "sgst", label: "SGST (₹)" }, { key: "igst", label: "IGST (₹)" },
        { key: "total_tax", label: "Total Tax (₹)" }, { key: "invoice_total", label: "Invoice Total (₹)" },
        { key: "vendor", label: "Vendor" }, { key: "vendor_gstin", label: "Vendor GSTIN" },
      ]},
      { name: "HSN Summary", rows: hsnSummary, columns: [
        { key: "hsn", label: "HSN" }, { key: "description", label: "Description" },
        { key: "uqc", label: "UQC" }, { key: "quantity", label: "Total Qty" },
        { key: "taxable", label: "Taxable Value (₹)" }, { key: "cgst", label: "CGST (₹)" },
        { key: "sgst", label: "SGST (₹)" }, { key: "igst", label: "IGST (₹)" },
      ]},
      { name: "Doc Summary", rows: [docSummary] },
    ]);
  };

  return (
    <AdminLayout>
      <div className="space-y-4">
        <div>
          <h1 className="page-title">GSTR-1 — Outward Supplies</h1>
          <p className="page-description">Invoice-wise outward supply report for GST filing (B2C, HSN summary, document summary)</p>
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
            <TabsTrigger value="b2c">B2C Invoices ({b2cRows.length})</TabsTrigger>
            <TabsTrigger value="hsn">HSN Summary ({hsnSummary.length})</TabsTrigger>
          </TabsList>
          <TabsContent value="b2c">
            <Card className="overflow-hidden">
              <div className="overflow-auto">
                <table className="w-full text-xs">
                  <thead className="border-b bg-muted/30">
                    <tr>
                      {["Invoice","Date","Customer","Place of Supply","Taxable","CGST","SGST","IGST","Total Tax","Invoice Total","Vendor"].map(h => (
                        <th key={h} className="px-3 py-2 text-left font-semibold text-muted-foreground whitespace-nowrap">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {loading ? Array.from({ length: 6 }).map((_, i) => (
                      <tr key={i}><td colSpan={11} className="p-2"><Skeleton className="h-4 w-full" /></td></tr>
                    )) : b2cRows.length === 0 ? (
                      <tr><td colSpan={11} className="p-12 text-center text-muted-foreground">No invoices in this period</td></tr>
                    ) : b2cRows.map((r, i) => (
                      <tr key={i} className="border-b border-border/20 hover:bg-muted/20">
                        <td className="px-3 py-2 font-mono">{r.invoice_no}</td>
                        <td className="px-3 py-2 whitespace-nowrap">{r.invoice_date}</td>
                        <td className="px-3 py-2">{r.customer}</td>
                        <td className="px-3 py-2 text-xs"><Badge variant="outline" className="text-[10px]">{r.place_of_supply}</Badge></td>
                        <td className="px-3 py-2 text-right">₹{r.taxable_value.toLocaleString("en-IN", { maximumFractionDigits: 2 })}</td>
                        <td className="px-3 py-2 text-right">₹{r.cgst.toLocaleString("en-IN", { maximumFractionDigits: 2 })}</td>
                        <td className="px-3 py-2 text-right">₹{r.sgst.toLocaleString("en-IN", { maximumFractionDigits: 2 })}</td>
                        <td className="px-3 py-2 text-right">₹{r.igst.toLocaleString("en-IN", { maximumFractionDigits: 2 })}</td>
                        <td className="px-3 py-2 text-right font-semibold">₹{r.total_tax.toLocaleString("en-IN", { maximumFractionDigits: 2 })}</td>
                        <td className="px-3 py-2 text-right font-semibold">₹{r.invoice_total.toLocaleString("en-IN", { maximumFractionDigits: 2 })}</td>
                        <td className="px-3 py-2 truncate max-w-[140px]">{r.vendor}</td>
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
                      {["HSN","Description","UQC","Qty","Taxable","CGST","SGST","IGST"].map(h => (
                        <th key={h} className="px-3 py-2 text-left font-semibold text-muted-foreground">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {hsnSummary.length === 0 ? (
                      <tr><td colSpan={8} className="p-12 text-center text-muted-foreground">No HSN data available — set HSN codes on products</td></tr>
                    ) : hsnSummary.map((h, i) => (
                      <tr key={i} className="border-b border-border/20">
                        <td className="px-3 py-2 font-mono">{h.hsn}</td>
                        <td className="px-3 py-2">{h.description}</td>
                        <td className="px-3 py-2">{h.uqc}</td>
                        <td className="px-3 py-2 text-right">{h.quantity}</td>
                        <td className="px-3 py-2 text-right">₹{h.taxable.toLocaleString("en-IN")}</td>
                        <td className="px-3 py-2 text-right">₹{h.cgst.toLocaleString("en-IN")}</td>
                        <td className="px-3 py-2 text-right">₹{h.sgst.toLocaleString("en-IN")}</td>
                        <td className="px-3 py-2 text-right">₹{h.igst.toLocaleString("en-IN")}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </AdminLayout>
  );
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
