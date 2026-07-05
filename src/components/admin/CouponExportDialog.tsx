// Admin coupon export dialog — CSV / XLSX / PDF with rich filters and paginated fetch for large exports.
import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { exportToCSV } from "@/lib/csv";
import { exportToXLSX, buildCoverSheet } from "@/lib/xlsx-export";
import { Download, Loader2 } from "lucide-react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { fmtTs } from "@/lib/format-date";

interface Props {
  open: boolean;
  onClose: () => void;
  campaigns: any[];
  vendors: { id: string; business_name?: string; name?: string }[];
  districts: { id: string; name: string }[];
}

type Format = "csv" | "xlsx" | "pdf";

const PAGE = 1000;

const COLUMNS = [
  { key: "code", label: "Code" },
  { key: "campaign_name", label: "Campaign" },
  { key: "status", label: "Status" },
  { key: "discount_type", label: "Disc Type" },
  { key: "discount_value", label: "Disc Value" },
  { key: "vendor_name", label: "Vendor" },
  { key: "used_by_mobile", label: "Used By (Mobile)" },
  { key: "used_order_id", label: "Order ID" },
  { key: "used_at", label: "Used At" },
  { key: "created_at", label: "Generated At" },
  { key: "expires_at", label: "Expires At" },
  { key: "rolled_back", label: "Rolled Back" },
];

export function CouponExportDialog({ open, onClose, campaigns, vendors, districts }: Props) {
  const [format, setFormat] = useState<Format>("csv");
  const [campaignId, setCampaignId] = useState<string>("__all__");
  const [status, setStatus] = useState<string>("__all__");
  const [vendorId, setVendorId] = useState<string>("__all__");
  const [districtId, setDistrictId] = useState<string>("__all__");
  const [mobile, setMobile] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [dateField, setDateField] = useState<"created_at" | "used_at">("created_at");
  const [running, setRunning] = useState(false);
  const [progress, setProgress] = useState(0);
  const [count, setCount] = useState<number | null>(null);

  useEffect(() => {
    if (!open) { setProgress(0); setCount(null); setRunning(false); }
  }, [open]);

  const buildQuery = (from: number, to: number) => {
    let q = supabase
      .from("coupon_codes")
      .select("*, coupon_campaigns!inner(id, name, discount_type, discount_value, vendor_id, district_ids, expires_at)", { count: "exact" })
      .order("created_at", { ascending: false })
      .range(from, to);
    if (campaignId !== "__all__") q = q.eq("campaign_id", campaignId);
    if (status !== "__all__") q = q.eq("status", status);
    if (mobile.trim()) q = q.ilike("used_by_mobile", `%${mobile.trim()}%`);
    if (vendorId !== "__all__") q = q.eq("coupon_campaigns.vendor_id", vendorId);
    if (districtId !== "__all__") q = q.contains("coupon_campaigns.district_ids", [districtId]);
    if (dateFrom) q = q.gte(dateField, new Date(dateFrom).toISOString());
    if (dateTo) q = q.lte(dateField, new Date(dateTo + "T23:59:59").toISOString());
    return q;
  };

  const preview = async () => {
    setRunning(true);
    const { count: c, error } = await buildQuery(0, 0);
    setRunning(false);
    if (error) return toast.error(error.message);
    setCount(c || 0);
  };

  const run = async () => {
    setRunning(true);
    setProgress(0);
    try {
      // First fetch: get count + first page
      const first = await buildQuery(0, PAGE - 1);
      if (first.error) throw first.error;
      const total = first.count || 0;
      if (total === 0) { toast.info("No matching coupons"); setRunning(false); return; }
      let rows: any[] = first.data || [];
      setProgress(Math.min(100, Math.round((rows.length / total) * 100)));

      // Subsequent pages
      while (rows.length < total) {
        const { data, error } = await buildQuery(rows.length, rows.length + PAGE - 1);
        if (error) throw error;
        if (!data || data.length === 0) break;
        rows = rows.concat(data);
        setProgress(Math.min(100, Math.round((rows.length / total) * 100)));
        // Yield to UI
        await new Promise(r => setTimeout(r, 0));
      }

      const vendorMap = new Map(vendors.map(v => [v.id, v.business_name || v.name || ""]));
      const flat = rows.map(r => {
        const camp = r.coupon_campaigns || {};
        return {
          code: r.code,
          campaign_name: camp.name || "",
          status: r.rolled_back ? "rolled_back" : r.status,
          discount_type: camp.discount_type || "",
          discount_value: camp.discount_value ?? "",
          vendor_name: vendorMap.get(camp.vendor_id) || "Any",
          used_by_mobile: r.used_by_mobile || "",
          used_order_id: r.used_order_id || "",
          used_at: r.used_at ? fmtTs(r.used_at) : "",
          created_at: fmtTs(r.created_at),
          expires_at: camp.expires_at ? fmtTs(camp.expires_at) : "",
          rolled_back: r.rolled_back ? "Yes" : "No",
        };
      });

      const stamp = new Date().toISOString().slice(0, 10);
      const fname = `coupons-export-${stamp}`;

      if (format === "csv") {
        exportToCSV(flat, COLUMNS, "coupons-export");
      } else if (format === "xlsx") {
        const cover = buildCoverSheet({
          reportTitle: "Coupons Export",
          filters: {
            Campaign: campaignId === "__all__" ? "All" : (campaigns.find(c => c.id === campaignId)?.name || campaignId),
            Status: status,
            Vendor: vendorId === "__all__" ? "All" : (vendorMap.get(vendorId) || vendorId),
            District: districtId === "__all__" ? "All" : (districts.find(d => d.id === districtId)?.name || districtId),
            Mobile: mobile || "—",
            "Date field": dateField,
            "Date from": dateFrom || "—",
            "Date to": dateTo || "—",
            "Row count": flat.length,
          },
        });
        exportToXLSX("coupons-export", [
          cover,
          { name: "Coupons", rows: flat, columns: COLUMNS.map(c => ({ key: c.key, label: c.label, width: 18 })) },
        ]);
      } else {
        // PDF
        const doc = new jsPDF({ orientation: "landscape", unit: "pt", format: "a4" });
        doc.setFontSize(14);
        doc.text("Coupons Export", 40, 40);
        doc.setFontSize(9);
        doc.text(
          `Generated ${new Date().toLocaleString("en-IN")}  ·  ${flat.length} rows` +
            (campaignId !== "__all__" ? `  ·  Campaign: ${campaigns.find(c => c.id === campaignId)?.name}` : "") +
            (status !== "__all__" ? `  ·  Status: ${status}` : ""),
          40,
          58,
        );
        autoTable(doc, {
          startY: 72,
          head: [COLUMNS.map(c => c.label)],
          body: flat.map(r => COLUMNS.map(c => String((r as any)[c.key] ?? ""))),
          styles: { fontSize: 7, cellPadding: 3 },
          headStyles: { fillColor: [1, 29, 51] },
          didDrawPage: (data) => {
            const page = (doc as any).internal.getCurrentPageInfo().pageNumber;
            doc.setFontSize(8);
            doc.text(`Page ${page}`, doc.internal.pageSize.getWidth() - 60, doc.internal.pageSize.getHeight() - 20);
          },
        });
        doc.save(`${fname}.pdf`);
      }

      // Log to report_log (best-effort)
      try {
        await supabase.from("report_log").insert({
          report_type: "coupons_export",
          format: format.toUpperCase(),
          status: "completed",
          file_size: `${flat.length} rows`,
        } as any);
      } catch { /* non-blocking */ }

      toast.success(`Exported ${flat.length} rows`);
      onClose();
    } catch (e: any) {
      toast.error(e.message || "Export failed");
    } finally {
      setRunning(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={o => !o && !running && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>Export Coupons</DialogTitle></DialogHeader>
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <Label>Format</Label>
            <Select value={format} onValueChange={v => setFormat(v as Format)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="csv">CSV</SelectItem>
                <SelectItem value="xlsx">Excel (.xlsx)</SelectItem>
                <SelectItem value="pdf">PDF</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Campaign</Label>
            <Select value={campaignId} onValueChange={setCampaignId}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">All campaigns</SelectItem>
                {campaigns.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Status</Label>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">All</SelectItem>
                <SelectItem value="available">Available</SelectItem>
                <SelectItem value="reserved">Reserved</SelectItem>
                <SelectItem value="used">Used</SelectItem>
                <SelectItem value="expired">Expired</SelectItem>
                <SelectItem value="disabled">Disabled</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Vendor</Label>
            <Select value={vendorId} onValueChange={setVendorId}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">All vendors</SelectItem>
                {vendors.map(v => <SelectItem key={v.id} value={v.id}>{v.business_name || v.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>District</Label>
            <Select value={districtId} onValueChange={setDistrictId}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">All districts</SelectItem>
                {districts.map(d => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Customer mobile</Label>
            <Input value={mobile} onChange={e => setMobile(e.target.value)} placeholder="e.g. 98765" />
          </div>
          <div>
            <Label>Date field</Label>
            <Select value={dateField} onValueChange={v => setDateField(v as any)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="created_at">Generated at</SelectItem>
                <SelectItem value="used_at">Used at</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div><Label>From</Label><Input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} /></div>
            <div><Label>To</Label><Input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} /></div>
          </div>
        </div>

        {count !== null && !running && (
          <p className="text-sm text-muted-foreground border-t pt-3">Matched <b>{count}</b> rows{count > 5000 ? " — large export will run in pages of 1,000." : ""}</p>
        )}
        {running && (
          <div className="space-y-2 border-t pt-3">
            <div className="flex items-center gap-2 text-sm"><Loader2 className="w-4 h-4 animate-spin" /> Exporting… {progress}%</div>
            <Progress value={progress} />
          </div>
        )}

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onClose} disabled={running}>Cancel</Button>
          <Button variant="outline" onClick={preview} disabled={running}>Preview count</Button>
          <Button onClick={run} disabled={running}><Download className="w-4 h-4 mr-1" />Export</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
