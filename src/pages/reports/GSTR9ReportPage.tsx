// GSTR-9 Annual Return — consolidated yearly summary aggregated from invoices and credit notes
import { useState, useEffect, useMemo } from "react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { FileBarChart, Calendar, TrendingUp, ArrowDownCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { exportToCSV } from "@/lib/csv";
import { exportToXLSX, getCurrentFinancialYear, buildCoverSheet, amountInWordsINR } from "@/lib/xlsx-export";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Download, FileSpreadsheet } from "lucide-react";

export default function GSTR9ReportPage() {
  const [fyStart, setFyStart] = useState(getCurrentFinancialYear() - 1); // typically file last completed FY
  const [invoices, setInvoices] = useState<any[]>([]);
  const [creditNotes, setCreditNotes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      supabase.from("order_invoices" as any).select("*").eq("fy_start", fyStart),
      supabase.from("credit_notes" as any).select("*").eq("fy_start", fyStart),
    ]).then(([inv, cn]) => {
      setInvoices((inv.data || []) as any[]);
      setCreditNotes((cn.data || []) as any[]);
      setLoading(false);
    });
  }, [fyStart]);

  const monthly = useMemo(() => {
    const months = ["Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec","Jan","Feb","Mar"];
    const data = months.map(m => ({ month: m, taxable: 0, cgst: 0, sgst: 0, igst: 0, cn_taxable: 0, cn_cgst: 0, cn_sgst: 0, cn_igst: 0, invoices: 0 }));
    invoices.forEach((i: any) => {
      const d = new Date(i.invoice_date);
      const monthIdx = d.getMonth() >= 3 ? d.getMonth() - 3 : d.getMonth() + 9;
      const row = data[monthIdx];
      row.taxable += Number(i.taxable_value || 0);
      row.cgst += Number(i.cgst_amount || 0);
      row.sgst += Number(i.sgst_amount || 0);
      row.igst += Number(i.igst_amount || 0);
      row.invoices += 1;
    });
    creditNotes.forEach((c: any) => {
      const d = new Date(c.issue_date);
      const monthIdx = d.getMonth() >= 3 ? d.getMonth() - 3 : d.getMonth() + 9;
      const row = data[monthIdx];
      row.cn_taxable += Number(c.taxable_value || 0);
      row.cn_cgst += Number(c.cgst_amount || 0);
      row.cn_sgst += Number(c.sgst_amount || 0);
      row.cn_igst += Number(c.igst_amount || 0);
    });
    return data;
  }, [invoices, creditNotes]);

  const annual = useMemo(() => {
    const sum = (k: string) => monthly.reduce((s, m: any) => s + m[k], 0);
    const gross_taxable = sum("taxable");
    const cn_taxable = sum("cn_taxable");
    const net_taxable = gross_taxable - cn_taxable;
    return {
      total_invoices: invoices.length,
      credit_notes: creditNotes.length,
      gross_taxable, cn_taxable, net_taxable,
      cgst_payable: sum("cgst") - sum("cn_cgst"),
      sgst_payable: sum("sgst") - sum("cn_sgst"),
      igst_payable: sum("igst") - sum("cn_igst"),
      total_tax_payable: (sum("cgst") + sum("sgst") + sum("igst")) - (sum("cn_cgst") + sum("cn_sgst") + sum("cn_igst")),
    };
  }, [monthly, invoices, creditNotes]);

  const fyOptions = [getCurrentFinancialYear(), getCurrentFinancialYear() - 1, getCurrentFinancialYear() - 2, getCurrentFinancialYear() - 3];

  const handleCSV = () => exportToCSV(monthly, [
    { key: "month", label: "Month" }, { key: "invoices", label: "Invoices" },
    { key: "taxable", label: "Outward Taxable" }, { key: "cgst", label: "CGST" }, { key: "sgst", label: "SGST" }, { key: "igst", label: "IGST" },
    { key: "cn_taxable", label: "CN Taxable" }, { key: "cn_cgst", label: "CN CGST" }, { key: "cn_sgst", label: "CN SGST" }, { key: "cn_igst", label: "CN IGST" },
  ], `GSTR9_FY${fyStart}-${(fyStart+1)%100}`);

  // Annual HSN summary (Table 17)
  const annualHSN = useMemo(() => {
    const m = new Map<string, any>();
    invoices.forEach((inv: any) => {
      const items = Array.isArray(inv.items) ? inv.items : [];
      items.forEach((it: any) => {
        const hsn = it.hsn_code || it.hsn || it.sac_code || "9999";
        const rate = Number(it.gst_rate || it.tax_rate || 18);
        const k = `${hsn}__${rate}`;
        const cur = m.get(k) || { hsn, gst_rate: rate, uqc: it.uqc || "NOS", qty: 0, taxable: 0, cgst: 0, sgst: 0, igst: 0, cess: 0 };
        const qty = Number(it.quantity || it.qty || 1);
        cur.qty += qty;
        cur.taxable += Number(it.price || it.unit_price || 0) * qty;
        m.set(k, cur);
      });
    });
    return Array.from(m.values()).map(r => ({ ...r, taxable: Number(r.taxable.toFixed(2)) }));
  }, [invoices]);

  const taxPaidTable = [
    { description: "Integrated Tax (IGST)", payable: Number(annual.igst_payable.toFixed(2)), paid_cash: Number(annual.igst_payable.toFixed(2)), paid_itc: 0 },
    { description: "Central Tax (CGST)", payable: Number(annual.cgst_payable.toFixed(2)), paid_cash: Number(annual.cgst_payable.toFixed(2)), paid_itc: 0 },
    { description: "State/UT Tax (SGST)", payable: Number(annual.sgst_payable.toFixed(2)), paid_cash: Number(annual.sgst_payable.toFixed(2)), paid_itc: 0 },
    { description: "Cess", payable: 0, paid_cash: 0, paid_itc: 0 },
    { description: "Interest", payable: 0, paid_cash: 0, paid_itc: 0 },
    { description: "Late fee", payable: 0, paid_cash: 0, paid_itc: 0 },
  ];

  const handleXLSX = () => exportToXLSX(`GSTR9-Annual-Return-FY${fyStart}-${String(fyStart+1).slice(-2)}`, [
    buildCoverSheet({
      reportTitle: `GSTR-9 — Annual Return FY ${fyStart}-${String(fyStart + 1).slice(-2)}`,
      statutoryBasis: "Section 44, CGST Act, 2017 + Rule 80, CGST Rules — Annual return for every registered person (turnover above ₹2cr)",
      period: `01-Apr-${fyStart} to 31-Mar-${fyStart + 1}`,
      fyLabel: `FY ${fyStart}-${String(fyStart + 1).slice(-2)}`,
      notes: [
        "Auto-aggregated from monthly tax invoices and credit notes — must reconcile with monthly GSTR-1 & GSTR-3B filings.",
        "Pt. III — ITC details to be filled manually based on procurement invoices.",
        "Pt. V — Particulars of transactions for the previous FY declared in returns of April–Sept of current FY (amendments) to be added manually.",
        "Pt. VI — Other information (refund / demands / HSN summary) — annual HSN sheet auto-populated; refunds & demands manual.",
        "Filing due date: 31 December following the end of the relevant FY.",
      ],
    }),
    { name: "Annual Summary", rows: [
      { item: "Pt. II - Outward Supplies", taxable: annual.gross_taxable.toFixed(2), cgst: monthly.reduce((s, m) => s + m.cgst, 0).toFixed(2), sgst: monthly.reduce((s, m) => s + m.sgst, 0).toFixed(2), igst: monthly.reduce((s, m) => s + m.igst, 0).toFixed(2) },
      { item: "Less: Credit Notes (Pt. II 4I)", taxable: annual.cn_taxable.toFixed(2), cgst: monthly.reduce((s, m) => s + m.cn_cgst, 0).toFixed(2), sgst: monthly.reduce((s, m) => s + m.cn_sgst, 0).toFixed(2), igst: monthly.reduce((s, m) => s + m.cn_igst, 0).toFixed(2) },
      { item: "Net Outward Supplies (Pt. II 4N)", taxable: annual.net_taxable.toFixed(2), cgst: annual.cgst_payable.toFixed(2), sgst: annual.sgst_payable.toFixed(2), igst: annual.igst_payable.toFixed(2) },
      { item: "Total Tax Payable (in words)", taxable: amountInWordsINR(annual.total_tax_payable), cgst: "", sgst: "", igst: annual.total_tax_payable.toFixed(2) },
    ], columns: [
      { key: "item", label: "Particulars", width: 40 }, { key: "taxable", label: "Taxable Value (₹)" },
      { key: "cgst", label: "CGST (₹)" }, { key: "sgst", label: "SGST (₹)" }, { key: "igst", label: "IGST (₹)" },
    ]},
    { name: "Monthly Breakup", rows: monthly, columns: [
      { key: "month", label: "Month" }, { key: "invoices", label: "Invoices" },
      { key: "taxable", label: "Outward Taxable (₹)" }, { key: "cgst", label: "CGST (₹)" }, { key: "sgst", label: "SGST (₹)" }, { key: "igst", label: "IGST (₹)" },
      { key: "cn_taxable", label: "CN Taxable (₹)" }, { key: "cn_cgst", label: "CN CGST (₹)" }, { key: "cn_sgst", label: "CN SGST (₹)" }, { key: "cn_igst", label: "CN IGST (₹)" },
    ]},
    { name: "Pt. IV — Tax Paid (Tbl 9)", rows: taxPaidTable, columns: [
      { key: "description", label: "Description", width: 30 }, { key: "payable", label: "Tax Payable (₹)" },
      { key: "paid_cash", label: "Paid through Cash (₹)" }, { key: "paid_itc", label: "Paid through ITC (₹)" },
    ]},
    { name: "Pt. VI — HSN Summary (Tbl 17)", rows: annualHSN, columns: [
      { key: "hsn", label: "HSN/SAC" }, { key: "gst_rate", label: "GST Rate (%)" }, { key: "uqc", label: "UQC" },
      { key: "qty", label: "Total Qty" }, { key: "taxable", label: "Taxable Value (₹)" },
    ]},
    { name: "Pt. V — Amendments (manual)", rows: [
      { particulars: "Supplies/tax declared through Amendments (+) (net of debit notes)", taxable: 0, igst: 0, cgst: 0, sgst: 0, cess: 0 },
      { particulars: "Supplies/tax reduced through Amendments (-) (net of credit notes)", taxable: 0, igst: 0, cgst: 0, sgst: 0, cess: 0 },
    ], columns: [
      { key: "particulars", label: "Particulars", width: 60 },
      { key: "taxable", label: "Taxable (₹)" }, { key: "igst", label: "IGST (₹)" },
      { key: "cgst", label: "CGST (₹)" }, { key: "sgst", label: "SGST (₹)" }, { key: "cess", label: "Cess (₹)" },
    ]},
  ]);

  return (
    <AdminLayout>
      <div className="space-y-4">
        <div>
          <h1 className="page-title">GSTR-9 — Annual Return</h1>
          <p className="page-description">Consolidated annual GST return summary (auto-aggregated from monthly invoices & credit notes)</p>
        </div>

        <Card className="p-3">
          <div className="flex items-center gap-3 flex-wrap">
            <span className="text-xs text-muted-foreground">Financial Year:</span>
            <Select value={String(fyStart)} onValueChange={(v) => setFyStart(Number(v))}>
              <SelectTrigger className="h-9 w-[160px] text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>{fyOptions.map(y => <SelectItem key={y} value={String(y)}>FY {y}-{String(y+1).slice(-2)}</SelectItem>)}</SelectContent>
            </Select>
            <div className="ml-auto flex items-center gap-2">
              <Button variant="outline" size="sm" className="h-9" onClick={handleCSV}><Download className="h-3.5 w-3.5 mr-1" /> CSV</Button>
              <Button variant="outline" size="sm" className="h-9" onClick={handleXLSX}><FileSpreadsheet className="h-3.5 w-3.5 mr-1" /> Excel</Button>
            </div>
          </div>
        </Card>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {loading ? Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-20 rounded-xl" />) : (<>
            <MiniStat icon={FileBarChart} label="Total Invoices" value={annual.total_invoices.toLocaleString()} />
            <MiniStat icon={ArrowDownCircle} label="Credit Notes" value={annual.credit_notes.toLocaleString()} />
            <MiniStat icon={TrendingUp} label="Net Taxable Value" value={`₹${annual.net_taxable.toLocaleString("en-IN", { maximumFractionDigits: 0 })}`} />
            <MiniStat icon={Calendar} label="Total Tax Payable" value={`₹${annual.total_tax_payable.toLocaleString("en-IN", { maximumFractionDigits: 0 })}`} />
          </>)}
        </div>

        <Card className="overflow-hidden">
          <div className="px-4 py-3 border-b bg-muted/30"><h3 className="text-sm font-semibold">Annual Reconciliation (Pt. II — Outward Supplies)</h3></div>
          <div className="overflow-auto">
            <table className="w-full text-xs">
              <thead className="border-b bg-muted/20">
                <tr>{["Particulars","Taxable Value","CGST","SGST","IGST"].map(h => <th key={h} className="px-3 py-2 text-left font-semibold text-muted-foreground">{h}</th>)}</tr>
              </thead>
              <tbody>
                <tr className="border-b"><td className="px-3 py-2 font-medium">Outward taxable supplies (Table 4A)</td>
                  <td className="px-3 py-2 text-right">₹{annual.gross_taxable.toLocaleString("en-IN", { maximumFractionDigits: 2 })}</td>
                  <td className="px-3 py-2 text-right">₹{monthly.reduce((s, m) => s + m.cgst, 0).toLocaleString("en-IN", { maximumFractionDigits: 2 })}</td>
                  <td className="px-3 py-2 text-right">₹{monthly.reduce((s, m) => s + m.sgst, 0).toLocaleString("en-IN", { maximumFractionDigits: 2 })}</td>
                  <td className="px-3 py-2 text-right">₹{monthly.reduce((s, m) => s + m.igst, 0).toLocaleString("en-IN", { maximumFractionDigits: 2 })}</td>
                </tr>
                <tr className="border-b text-warning"><td className="px-3 py-2 font-medium">Less: Credit notes (Table 4I)</td>
                  <td className="px-3 py-2 text-right">- ₹{annual.cn_taxable.toLocaleString("en-IN", { maximumFractionDigits: 2 })}</td>
                  <td className="px-3 py-2 text-right">- ₹{monthly.reduce((s, m) => s + m.cn_cgst, 0).toLocaleString("en-IN", { maximumFractionDigits: 2 })}</td>
                  <td className="px-3 py-2 text-right">- ₹{monthly.reduce((s, m) => s + m.cn_sgst, 0).toLocaleString("en-IN", { maximumFractionDigits: 2 })}</td>
                  <td className="px-3 py-2 text-right">- ₹{monthly.reduce((s, m) => s + m.cn_igst, 0).toLocaleString("en-IN", { maximumFractionDigits: 2 })}</td>
                </tr>
                <tr className="font-bold bg-primary/5"><td className="px-3 py-2">Net Outward Supplies (Table 4N)</td>
                  <td className="px-3 py-2 text-right">₹{annual.net_taxable.toLocaleString("en-IN", { maximumFractionDigits: 2 })}</td>
                  <td className="px-3 py-2 text-right">₹{annual.cgst_payable.toLocaleString("en-IN", { maximumFractionDigits: 2 })}</td>
                  <td className="px-3 py-2 text-right">₹{annual.sgst_payable.toLocaleString("en-IN", { maximumFractionDigits: 2 })}</td>
                  <td className="px-3 py-2 text-right">₹{annual.igst_payable.toLocaleString("en-IN", { maximumFractionDigits: 2 })}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </Card>

        <Card className="overflow-hidden">
          <div className="px-4 py-3 border-b bg-muted/30"><h3 className="text-sm font-semibold">Monthly Breakup</h3></div>
          <div className="overflow-auto">
            <table className="w-full text-xs">
              <thead className="border-b bg-muted/20">
                <tr>{["Month","Invoices","Taxable","CGST","SGST","IGST","CN Taxable","CN Tax"].map(h => <th key={h} className="px-3 py-2 text-left font-semibold text-muted-foreground">{h}</th>)}</tr>
              </thead>
              <tbody>
                {monthly.map(m => (
                  <tr key={m.month} className="border-b border-border/20">
                    <td className="px-3 py-2 font-medium">{m.month}</td>
                    <td className="px-3 py-2 text-right">{m.invoices}</td>
                    <td className="px-3 py-2 text-right">₹{m.taxable.toLocaleString("en-IN", { maximumFractionDigits: 0 })}</td>
                    <td className="px-3 py-2 text-right">₹{m.cgst.toLocaleString("en-IN", { maximumFractionDigits: 0 })}</td>
                    <td className="px-3 py-2 text-right">₹{m.sgst.toLocaleString("en-IN", { maximumFractionDigits: 0 })}</td>
                    <td className="px-3 py-2 text-right">₹{m.igst.toLocaleString("en-IN", { maximumFractionDigits: 0 })}</td>
                    <td className="px-3 py-2 text-right text-warning">₹{m.cn_taxable.toLocaleString("en-IN", { maximumFractionDigits: 0 })}</td>
                    <td className="px-3 py-2 text-right text-warning">₹{(m.cn_cgst + m.cn_sgst + m.cn_igst).toLocaleString("en-IN", { maximumFractionDigits: 0 })}</td>
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
      <div className="flex items-center justify-between mb-1"><span className="text-xs text-muted-foreground">{label}</span><Icon className="h-4 w-4 text-muted-foreground" /></div>
      <p className="text-xl font-bold">{value}</p>
    </Card>
  );
}
