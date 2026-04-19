import { useState, useEffect, useMemo } from "react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import FinanceReportFilters, { FinanceFiltersValue, getDateRangeFromFilters } from "@/components/admin/FinanceReportFilters";
import { exportToCSV } from "@/lib/csv";
import { exportToXLSX, getCurrentFinancialYear } from "@/lib/xlsx-export";

const TCS_RATE = 1.0; // 1% u/s 52(1) of CGST Act for e-commerce operators

interface VendorTCS {
  vendor_id: string;
  vendor_name: string;
  vendor_gstin: string;
  vendor_state: string;
  invoices: number;
  gross_supplies: number;
  returns: number;
  net_supplies: number;
  tcs_amount: number;
}

export default function TCSReportPage() {
  const [filters, setFilters] = useState<FinanceFiltersValue>({
    fyStart: getCurrentFinancialYear(), month: new Date().getMonth(), vendorId: "all", stateCode: "all",
  });
  const [orders, setOrders] = useState<any[]>([]);
  const [vendors, setVendors] = useState<{ id: string; name: string; gstin: string | null; state_name: string | null }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.from("vendors").select("id, name, gstin, state_name").order("name").then(({ data }) => {
      setVendors((data || []) as any);
    });
  }, []);

  useEffect(() => {
    const range = getDateRangeFromFilters(filters);
    setLoading(true);
    let q = supabase.from("orders")
      .select("id, created_at, vendor_id, vendor_name, vendor_gstin, vendor_state, taxable_value, subtotal, total, status, place_of_supply_code")
      .gte("created_at", range.from.toISOString())
      .lte("created_at", range.to.toISOString());
    if (filters.vendorId !== "all") q = q.eq("vendor_id", filters.vendorId);
    if (filters.stateCode !== "all") q = q.eq("place_of_supply_code", filters.stateCode);
    q.then(({ data }) => { setOrders(data || []); setLoading(false); });
  }, [filters]);

  const tcsRows: VendorTCS[] = useMemo(() => {
    const map = new Map<string, VendorTCS>();
    orders.forEach(o => {
      const isCancel = ["cancelled", "refunded", "returned"].includes(o.status);
      const isDelivered = ["delivered", "completed"].includes(o.status);
      const value = Number(o.taxable_value || o.subtotal || 0);
      const cur = map.get(o.vendor_id) || {
        vendor_id: o.vendor_id, vendor_name: o.vendor_name || o.vendor_id,
        vendor_gstin: o.vendor_gstin || "—", vendor_state: o.vendor_state || "—",
        invoices: 0, gross_supplies: 0, returns: 0, net_supplies: 0, tcs_amount: 0,
      };
      if (isDelivered) { cur.invoices += 1; cur.gross_supplies += value; }
      if (isCancel) cur.returns += value;
      cur.net_supplies = cur.gross_supplies - cur.returns;
      cur.tcs_amount = Math.max(0, cur.net_supplies * TCS_RATE / 100);
      map.set(o.vendor_id, cur);
    });
    return Array.from(map.values())
      .map(r => ({
        ...r,
        gross_supplies: Number(r.gross_supplies.toFixed(2)),
        returns: Number(r.returns.toFixed(2)),
        net_supplies: Number(r.net_supplies.toFixed(2)),
        tcs_amount: Number(r.tcs_amount.toFixed(2)),
      }))
      .sort((a, b) => b.net_supplies - a.net_supplies);
  }, [orders]);

  const totals = useMemo(() => ({
    vendors: tcsRows.length,
    gross: tcsRows.reduce((s, r) => s + r.gross_supplies, 0),
    returns: tcsRows.reduce((s, r) => s + r.returns, 0),
    net: tcsRows.reduce((s, r) => s + r.net_supplies, 0),
    tcs: tcsRows.reduce((s, r) => s + r.tcs_amount, 0),
  }), [tcsRows]);

  const range = getDateRangeFromFilters(filters);

  const handleCSV = () => exportToCSV(tcsRows, [
    { key: "vendor_id", label: "Vendor ID" }, { key: "vendor_name", label: "Vendor Name" },
    { key: "vendor_gstin", label: "GSTIN" }, { key: "vendor_state", label: "State" },
    { key: "invoices", label: "Invoices" }, { key: "gross_supplies", label: "Gross Supplies" },
    { key: "returns", label: "Returns" }, { key: "net_supplies", label: "Net Supplies" },
    { key: "tcs_amount", label: "TCS @1%" },
  ], "GSTR8-TCS");

  const handleXLSX = () => exportToXLSX("GSTR8-TCS-Report", [
    { name: "TCS by Vendor", rows: tcsRows, columns: [
      { key: "vendor_id", label: "Vendor ID" }, { key: "vendor_name", label: "Vendor", width: 24 },
      { key: "vendor_gstin", label: "GSTIN", width: 18 }, { key: "vendor_state", label: "State" },
      { key: "invoices", label: "Invoices" }, { key: "gross_supplies", label: "Gross Supplies (₹)" },
      { key: "returns", label: "Returns (₹)" }, { key: "net_supplies", label: "Net Supplies (₹)" },
      { key: "tcs_amount", label: "TCS @1% (₹)" },
    ]},
    { name: "Period Summary", rows: [{
      period: range.label, tcs_rate: `${TCS_RATE}%`,
      vendors: totals.vendors, gross: totals.gross, returns: totals.returns,
      net: totals.net, total_tcs_collected: totals.tcs,
    }]},
  ]);

  return (
    <AdminLayout>
      <div className="space-y-4">
        <div>
          <h1 className="page-title">TCS u/s 52 — E-commerce Operator Report (GSTR-8)</h1>
          <p className="page-description">{range.label} • Tax Collected at Source @ {TCS_RATE}% on net taxable supplies per vendor — required for marketplace operators</p>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
          {loading ? Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-20 rounded-xl" />) : (<>
            <Stat label="Vendors" value={totals.vendors.toLocaleString()} />
            <Stat label="Gross Supplies" value={`₹${totals.gross.toLocaleString("en-IN", { maximumFractionDigits: 0 })}`} />
            <Stat label="Returns" value={`₹${totals.returns.toLocaleString("en-IN", { maximumFractionDigits: 0 })}`} />
            <Stat label="Net Supplies" value={`₹${totals.net.toLocaleString("en-IN", { maximumFractionDigits: 0 })}`} />
            <Stat label={`TCS @ ${TCS_RATE}%`} value={`₹${totals.tcs.toLocaleString("en-IN", { maximumFractionDigits: 2 })}`} highlight />
          </>)}
        </div>

        <FinanceReportFilters value={filters} onChange={setFilters} vendors={vendors.map(v => ({ id: v.id, name: v.name }))} onExportCSV={handleCSV} onExportXLSX={handleXLSX} />

        <Card className="overflow-hidden">
          <div className="overflow-auto">
            <table className="w-full text-xs">
              <thead className="border-b bg-muted/30">
                <tr>
                  {["Vendor ID","Vendor","GSTIN","State","Invoices","Gross","Returns","Net","TCS @ 1%"].map(h => (
                    <th key={h} className="px-3 py-2 text-left font-semibold whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {tcsRows.length === 0 ? (
                  <tr><td colSpan={9} className="p-12 text-center text-muted-foreground">No vendor supplies in this period</td></tr>
                ) : tcsRows.map((r) => (
                  <tr key={r.vendor_id} className="border-b border-border/20 hover:bg-muted/20">
                    <td className="px-3 py-2 font-mono text-[10px]">{r.vendor_id}</td>
                    <td className="px-3 py-2">{r.vendor_name}</td>
                    <td className="px-3 py-2 font-mono text-[10px]">{r.vendor_gstin}</td>
                    <td className="px-3 py-2">{r.vendor_state}</td>
                    <td className="px-3 py-2 text-right">{r.invoices}</td>
                    <td className="px-3 py-2 text-right">₹{r.gross_supplies.toLocaleString("en-IN")}</td>
                    <td className="px-3 py-2 text-right">₹{r.returns.toLocaleString("en-IN")}</td>
                    <td className="px-3 py-2 text-right font-semibold">₹{r.net_supplies.toLocaleString("en-IN")}</td>
                    <td className="px-3 py-2 text-right font-bold text-primary">₹{r.tcs_amount.toLocaleString("en-IN", { maximumFractionDigits: 2 })}</td>
                  </tr>
                ))}
                {tcsRows.length > 0 && (
                  <tr className="bg-muted/30 font-bold">
                    <td colSpan={5} className="px-3 py-2">Total</td>
                    <td className="px-3 py-2 text-right">₹{totals.gross.toLocaleString("en-IN")}</td>
                    <td className="px-3 py-2 text-right">₹{totals.returns.toLocaleString("en-IN")}</td>
                    <td className="px-3 py-2 text-right">₹{totals.net.toLocaleString("en-IN")}</td>
                    <td className="px-3 py-2 text-right text-primary">₹{totals.tcs.toLocaleString("en-IN", { maximumFractionDigits: 2 })}</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>

        <Card className="p-4">
          <h3 className="text-sm font-semibold mb-2">About this report</h3>
          <ul className="text-xs text-muted-foreground space-y-1 list-disc list-inside">
            <li>Section 52 of CGST Act requires e-commerce operators to collect TCS at 1% on net taxable supplies of registered vendors.</li>
            <li>Net Supplies = Gross Delivered Supplies − Returns/Cancellations.</li>
            <li>TCS must be filed monthly via <strong>GSTR-8</strong> by the 10th of the following month.</li>
            <li>The Excel export is GSTR-8-compatible and can be shared with your CA or uploaded as a working file.</li>
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
