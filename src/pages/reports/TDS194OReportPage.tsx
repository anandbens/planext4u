// TDS u/s 194-O — 1% deducted from vendor payouts > ₹5L per FY (Form 26Q quarterly return)
import { useState, useEffect, useMemo } from "react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Banknote, DollarSign, Users, Calculator } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import FinanceReportFilters, { FinanceFiltersValue, getDateRangeFromFilters } from "@/components/admin/FinanceReportFilters";
import { exportToCSV } from "@/lib/csv";
import { exportToXLSX, getCurrentFinancialYear, buildCoverSheet, amountInWordsINR } from "@/lib/xlsx-export";

const TDS_THRESHOLD = 500000; // ₹5L per FY per vendor
const TDS_RATE = 0.01;        // 1% (0.5% if PAN missing → 5%, but keep simple)

export default function TDS194OReportPage() {
  const [filters, setFilters] = useState<FinanceFiltersValue>({
    fyStart: getCurrentFinancialYear(), month: -1, vendorId: "all", stateCode: "all",
  });
  const [orders, setOrders] = useState<any[]>([]);
  const [vendors, setVendors] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.from("vendors").select("id, name, pan, gstin").then(({ data }) => setVendors(data || []));
  }, []);

  useEffect(() => {
    const range = getDateRangeFromFilters(filters);
    setLoading(true);
    let q = supabase.from("orders").select("id, vendor_id, vendor_name, total, taxable_value, subtotal, created_at, status, platform_fee")
      .gte("created_at", range.from.toISOString())
      .lte("created_at", range.to.toISOString())
      .in("status", ["delivered", "completed"]);
    if (filters.vendorId !== "all") q = q.eq("vendor_id", filters.vendorId);
    q.then(({ data }) => { setOrders(data || []); setLoading(false); });
  }, [filters]);

  // Aggregate per vendor for the FY
  const perVendor = useMemo(() => {
    const map = new Map<string, { vendor_id: string; vendor_name: string; pan: string; gstin: string; gross: number; orders: number }>();
    orders.forEach(o => {
      const v = vendors.find(x => x.id === o.vendor_id);
      const cur = map.get(o.vendor_id) || {
        vendor_id: o.vendor_id,
        vendor_name: v?.name || o.vendor_name || o.vendor_id,
        pan: v?.pan || "",
        gstin: v?.gstin || "",
        gross: 0, orders: 0,
      };
      cur.gross += Number(o.taxable_value || o.subtotal || o.total || 0);
      cur.orders += 1;
      map.set(o.vendor_id, cur);
    });
    return Array.from(map.values()).map(v => {
      const overThreshold = v.gross > TDS_THRESHOLD;
      const deductible_base = overThreshold ? v.gross : 0;
      const tds_amount = deductible_base * TDS_RATE;
      const effective_rate = v.pan ? "1%" : "5% (PAN missing)";
      return { ...v, deductible_base, tds_amount, threshold_breached: overThreshold, effective_rate, net_payable: v.gross - tds_amount };
    }).sort((a, b) => b.gross - a.gross);
  }, [orders, vendors]);

  const totals = useMemo(() => ({
    vendors_total: perVendor.length,
    vendors_above_threshold: perVendor.filter(v => v.threshold_breached).length,
    gross_payouts: perVendor.reduce((s, v) => s + v.gross, 0),
    tds_collected: perVendor.reduce((s, v) => s + v.tds_amount, 0),
  }), [perVendor]);

  const handleCSV = () => exportToCSV(perVendor, [
    { key: "vendor_id", label: "Vendor ID" }, { key: "vendor_name", label: "Vendor Name" },
    { key: "pan", label: "PAN" }, { key: "gstin", label: "GSTIN" },
    { key: "orders", label: "Orders" }, { key: "gross", label: "Gross Payout (₹)" },
    { key: "threshold_breached", label: ">₹5L?" }, { key: "deductible_base", label: "TDS Base (₹)" },
    { key: "effective_rate", label: "Rate" }, { key: "tds_amount", label: "TDS (₹)" }, { key: "net_payable", label: "Net Payable (₹)" },
  ], "TDS_194O_Form26Q");

  const range = getDateRangeFromFilters(filters);
  const handleXLSX = () => exportToXLSX("TDS-194O-Form-26Q", [
    buildCoverSheet({
      reportTitle: "TDS u/s 194-O — Form 26Q (E-commerce Operator)",
      statutoryBasis: "Section 194-O, Income Tax Act, 1961 — 1% TDS on gross sale to e-commerce participants (rate 5% if PAN unavailable, threshold ₹5,00,000 per FY)",
      period: range.label, fyLabel: `FY ${filters.fyStart}-${String(filters.fyStart + 1).slice(-2)}`,
      filters: { Vendor: filters.vendorId, Threshold: `₹${TDS_THRESHOLD.toLocaleString("en-IN")}`, Rate: "1% (5% if PAN missing)" },
      notes: [
        "TDS to be deposited within 7 days of the end of the month in which deduction is made (30 April for March).",
        "Issue Form 16A to the vendor (deductee) within 15 days of furnishing Form 26Q.",
        "Vendors with PAN missing are charged 5% — verify PAN/aadhaar in Vendor Master.",
      ],
    }),
    { name: "Per-Vendor TDS", rows: perVendor.map(v => ({
      ...v,
      gross: Number(v.gross.toFixed(2)),
      deductible_base: Number(v.deductible_base.toFixed(2)),
      tds_amount: Number(v.tds_amount.toFixed(2)),
      net_payable: Number(v.net_payable.toFixed(2)),
      threshold_breached: v.threshold_breached ? "Yes" : "No",
    })), columns: [
      { key: "vendor_id", label: "Vendor ID" }, { key: "vendor_name", label: "Name", width: 24 },
      { key: "pan", label: "PAN" }, { key: "gstin", label: "GSTIN", width: 18 },
      { key: "orders", label: "Orders" }, { key: "gross", label: "Gross Payout (₹)" },
      { key: "threshold_breached", label: ">₹5L Threshold" }, { key: "deductible_base", label: "Taxable Base (₹)" },
      { key: "effective_rate", label: "Rate" }, { key: "tds_amount", label: "TDS Deducted (₹)" }, { key: "net_payable", label: "Net Payable (₹)" },
    ]},
    { name: "PAN Missing — Action Needed", rows: perVendor.filter(v => !v.pan).map(v => ({
      vendor_id: v.vendor_id, vendor_name: v.vendor_name, gross: Number(v.gross.toFixed(2)),
      action: "Collect PAN from vendor — applicable rate is 5% until PAN provided",
    })), columns: [
      { key: "vendor_id", label: "Vendor ID" }, { key: "vendor_name", label: "Vendor", width: 26 },
      { key: "gross", label: "Gross Payout (₹)" }, { key: "action", label: "Required Action", width: 60 },
    ]},
    { name: "Summary", rows: [
      { metric: "Total vendors", value: totals.vendors_total },
      { metric: "Vendors above ₹5L threshold", value: totals.vendors_above_threshold },
      { metric: "Gross payouts (₹)", value: totals.gross_payouts.toFixed(2) },
      { metric: "Total TDS collected (₹)", value: totals.tds_collected.toFixed(2) },
      { metric: "Total TDS in words", value: amountInWordsINR(totals.tds_collected) },
      { metric: "Filing", value: "Deposit TDS by 7th of next month. File Form 26Q quarterly. Issue Form 16A to vendors." },
    ], columns: [
      { key: "metric", label: "Metric", width: 36 }, { key: "value", label: "Value", width: 60 },
    ]},
  ]);

  return (
    <AdminLayout>
      <div className="space-y-4">
        <div>
          <h1 className="page-title">TDS u/s 194-O — Form 26Q</h1>
          <p className="page-description">1% TDS on payouts to vendors with annual sales above ₹5,00,000 (Income Tax Act, Section 194-O)</p>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {loading ? Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-20 rounded-xl" />) : (<>
            <MiniStat icon={Users} label="Total Vendors" value={totals.vendors_total.toLocaleString()} />
            <MiniStat icon={Calculator} label="Above ₹5L Threshold" value={totals.vendors_above_threshold.toLocaleString()} />
            <MiniStat icon={DollarSign} label="Gross Payouts" value={`₹${totals.gross_payouts.toLocaleString("en-IN", { maximumFractionDigits: 0 })}`} />
            <MiniStat icon={Banknote} label="TDS to Deposit" value={`₹${totals.tds_collected.toLocaleString("en-IN", { maximumFractionDigits: 0 })}`} />
          </>)}
        </div>

        <FinanceReportFilters value={filters} onChange={setFilters} vendors={vendors.map(v => ({ id: v.id, name: v.name }))} onExportCSV={handleCSV} onExportXLSX={handleXLSX} />

        <Card className="overflow-hidden">
          <div className="overflow-auto">
            <table className="w-full text-xs">
              <thead className="border-b bg-muted/30">
                <tr>{["Vendor","PAN","GSTIN","Orders","Gross Payout","Threshold","Rate","TDS Deducted","Net Payable"].map(h => (
                  <th key={h} className="px-3 py-2 text-left font-semibold text-muted-foreground whitespace-nowrap">{h}</th>
                ))}</tr>
              </thead>
              <tbody>
                {loading ? Array.from({ length: 6 }).map((_, i) => (
                  <tr key={i}><td colSpan={9} className="p-2"><Skeleton className="h-4 w-full" /></td></tr>
                )) : perVendor.length === 0 ? (
                  <tr><td colSpan={9} className="p-12 text-center text-muted-foreground">No vendor sales in this period</td></tr>
                ) : perVendor.map(v => (
                  <tr key={v.vendor_id} className="border-b border-border/20 hover:bg-muted/20">
                    <td className="px-3 py-2"><div className="font-medium">{v.vendor_name}</div><div className="text-[10px] text-muted-foreground font-mono">{v.vendor_id}</div></td>
                    <td className="px-3 py-2 font-mono text-[10px]">{v.pan || <span className="text-destructive">— missing</span>}</td>
                    <td className="px-3 py-2 font-mono text-[10px]">{v.gstin || "—"}</td>
                    <td className="px-3 py-2 text-right">{v.orders}</td>
                    <td className="px-3 py-2 text-right">₹{v.gross.toLocaleString("en-IN", { maximumFractionDigits: 0 })}</td>
                    <td className="px-3 py-2"><Badge variant={v.threshold_breached ? "default" : "outline"} className="text-[10px]">{v.threshold_breached ? "Above ₹5L" : "Below"}</Badge></td>
                    <td className="px-3 py-2 text-[10px]">{v.effective_rate}</td>
                    <td className="px-3 py-2 text-right font-semibold text-warning">₹{v.tds_amount.toLocaleString("en-IN", { maximumFractionDigits: 2 })}</td>
                    <td className="px-3 py-2 text-right">₹{v.net_payable.toLocaleString("en-IN", { maximumFractionDigits: 0 })}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        <Card className="p-4 bg-info/5 border-info/30">
          <p className="text-xs"><b>Note:</b> Section 194-O requires e-commerce operators to deduct 1% TDS on the gross sale amount of goods/services facilitated through the platform if the vendor's annual sales exceed ₹5 lakh. If PAN is not provided, the rate is 5%. TDS must be deposited by the 7th of the following month and Form 26Q filed quarterly.</p>
        </Card>
      </div>
    </AdminLayout>
  );
}

function MiniStat({ icon: Icon, label, value }: { icon: any; label: string; value: string }) {
  return (
    <Card className="p-4">
      <div className="flex items-center justify-between mb-1"><span className="text-xs text-muted-foreground">{label}</span><Icon className="h-4 w-4 text-muted-foreground" /></div>
      <p className="text-xl font-bold">{value}</p>
    </Card>
  );
}
