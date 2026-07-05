import { useEffect, useMemo, useState } from "react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { CouponAdminNav } from "@/components/admin/CouponAdminNav";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { friendlyError } from "@/lib/friendly-error";
import { toast } from "sonner";
import { Ticket, Download, Sparkles, AlertTriangle, CheckCircle2 } from "lucide-react";

type Campaign = any;
type GenRow = { code: string; batch_number: string };

const CHARSETS = [
  { v: "alnum_upper", label: "Alphanumeric · UPPER" },
  { v: "alnum_lower", label: "Alphanumeric · lower" },
  { v: "alnum_mixed", label: "Alphanumeric · Mixed" },
  { v: "alpha_upper", label: "Alphabet · UPPER" },
  { v: "alpha_lower", label: "Alphabet · lower" },
  { v: "alpha_mixed", label: "Alphabet · Mixed" },
  { v: "numeric",     label: "Numeric only" },
];

const QTY_PRESETS = [100, 250, 500, 1000, 5000, 10000];
const CHUNK = 500;

export default function CouponGeneratePage() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [campaignId, setCampaignId] = useState<string>("");
  const [count, setCount] = useState(100);
  const [length, setLength] = useState(8);
  const [charset, setCharset] = useState("alnum_upper");
  const [prefix, setPrefix] = useState("");
  const [suffix, setSuffix] = useState("");
  const [separator, setSeparator] = useState("");
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [running, setRunning] = useState(false);
  const [progress, setProgress] = useState(0);
  const [target, setTarget] = useState(0);
  const [generated, setGenerated] = useState<GenRow[]>([]);
  const [durationMs, setDurationMs] = useState(0);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    supabase.from("coupon_campaigns")
      .select("id,name,discount_type,discount_value,is_active,status,starts_at,expires_at,total_codes_target,total_codes_generated,vendor_id,product_ids,district_ids,code_mode")
      .order("created_at", { ascending: false })
      .then(({ data }) => setCampaigns(data || []));
  }, []);

  const campaign = useMemo(() => campaigns.find(c => c.id === campaignId), [campaigns, campaignId]);

  const sampleCode = useMemo(() => {
    const src = charset === "numeric" ? "0123456789"
      : charset.startsWith("alpha") ? "ABCDEFGHJKMNPQRSTUVWXYZ"
      : "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    let body = "";
    for (let i = 0; i < length; i++) body += src[Math.floor(Math.random() * src.length)];
    return `${prefix}${prefix ? separator : ""}${body}${suffix ? separator : ""}${suffix}`;
  }, [charset, length, prefix, suffix, separator]);

  const remaining = campaign?.total_codes_target
    ? Math.max(0, campaign.total_codes_target - (campaign.total_codes_generated || 0))
    : null;

  const validate = () => {
    if (!campaignId) return "Select a campaign";
    if (!count || count < 1) return "Quantity must be at least 1";
    if (count > 10000) return "Max 10,000 per generation call";
    if (length < 4 || length > 16) return "Length must be between 4 and 16";
    if (remaining !== null && count > remaining) return `Exceeds campaign target (${remaining} remaining)`;
    if (campaign?.code_mode === "shared_per_customer") return "This campaign uses a shared code — use campaign editor instead";
    return null;
  };

  const openConfirm = () => {
    const err = validate();
    if (err) return toast.error(err);
    setConfirmOpen(true);
  };

  const run = async () => {
    if (!campaign) return;
    setConfirmOpen(false);
    setRunning(true);
    setGenerated([]);
    setErrorMsg(null);
    setTarget(count);
    setProgress(0);

    const batch = `BATCH-${new Date().toISOString().replace(/[-:.TZ]/g, "").slice(0, 14)}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
    const t0 = performance.now();
    const collected: GenRow[] = [];
    try {
      let remaining = count;
      let chunkIdx = 0;
      while (remaining > 0) {
        const n = Math.min(CHUNK, remaining);
        const chunkBatch = count > CHUNK ? `${batch}-${String(chunkIdx).padStart(3, "0")}` : batch;
        const { data, error } = await (supabase.rpc as any)("generate_coupon_codes_v2", {
          _campaign_id: campaign.id,
          _count: n,
          _length: length,
          _charset: charset,
          _prefix: prefix,
          _suffix: suffix,
          _separator: separator,
          _batch_number: chunkBatch,
        });
        if (error) throw error;
        (data || []).forEach((r: any) => collected.push({ code: r.code, batch_number: r.batch_number }));
        setGenerated([...collected]);
        setProgress(collected.length);
        remaining -= n;
        chunkIdx++;
      }
      setDurationMs(Math.round(performance.now() - t0));
      toast.success(`Generated ${collected.length} coupons`);
    } catch (e: any) {
      setErrorMsg(friendlyError(e));
      toast.error(friendlyError(e));
    } finally {
      setRunning(false);
    }
  };

  const downloadCsv = () => {
    const header = ["code", "campaign", "batch", "status", "expiry"];
    const csv = [header.join(",")].concat(generated.map(r => [
      r.code, campaign?.name || "", r.batch_number, "available", campaign?.expires_at || "",
    ].map(v => `"${String(v).replace(/"/g, '""')}"`).join(","))).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob); a.download = `coupons-${campaign?.name || "batch"}.csv`; a.click();
  };

  const downloadXlsx = async () => {
    const XLSX = await import("xlsx");
    const rows = generated.map(r => ({
      Code: r.code, Campaign: campaign?.name || "", Batch: r.batch_number,
      Status: "available", Expiry: campaign?.expires_at || "",
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Coupons");
    XLSX.writeFile(wb, `coupons-${campaign?.name || "batch"}.xlsx`);
  };

  return (
    <AdminLayout>
      <div className="page-header">
        <h1 className="page-title">Generate Coupons</h1>
        <p className="page-description">Bulk generation engine · cryptographically secure · collision-safe · fully audited</p>
      </div>
      <CouponAdminNav />

      <div className="grid gap-3 lg:grid-cols-3">
        <Card className="p-4 lg:col-span-2 space-y-3">
          <div>
            <Label>Campaign *</Label>
            <Select value={campaignId} onValueChange={setCampaignId}>
              <SelectTrigger><SelectValue placeholder="Choose campaign…" /></SelectTrigger>
              <SelectContent>
                {campaigns.map(c => (
                  <SelectItem key={c.id} value={c.id}>{c.name} {c.status === "archived" ? "· archived" : ""}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {campaign && (
            <Card className="p-3 bg-muted/40 border-dashed">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                <div><p className="text-muted-foreground">Name</p><p className="font-medium truncate">{campaign.name}</p></div>
                <div><p className="text-muted-foreground">Discount</p><p className="font-medium">{campaign.discount_type === "percent" ? `${campaign.discount_value}%` : `₹${campaign.discount_value}`}</p></div>
                <div><p className="text-muted-foreground">Status</p><Badge variant={campaign.is_active ? "default" : "outline"} className="text-[10px]">{campaign.status || (campaign.is_active ? "active" : "inactive")}</Badge></div>
                <div><p className="text-muted-foreground">Remaining</p><p className="font-medium">{remaining === null ? "unlimited" : remaining.toLocaleString()}</p></div>
              </div>
            </Card>
          )}

          <div className="grid sm:grid-cols-2 gap-3">
            <div>
              <Label>Quantity *</Label>
              <div className="flex flex-wrap gap-1 mb-1">
                {QTY_PRESETS.map(q => (
                  <Button key={q} size="sm" type="button" variant={count === q ? "default" : "outline"} className="h-7 px-2 text-xs" onClick={() => setCount(q)}>{q.toLocaleString()}</Button>
                ))}
              </div>
              <Input type="number" min={1} max={10000} value={count} onChange={e => setCount(Number(e.target.value))} />
            </div>
            <div>
              <Label>Code length</Label>
              <div className="flex gap-1">
                {[6, 7, 8].map(l => (
                  <Button key={l} size="sm" variant={length === l ? "default" : "outline"} className="h-9 flex-1" onClick={() => setLength(l)}>{l}</Button>
                ))}
                <Input type="number" min={4} max={16} value={length} onChange={e => setLength(Number(e.target.value))} className="w-16" />
              </div>
            </div>

            <div>
              <Label>Character type</Label>
              <Select value={charset} onValueChange={setCharset}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{CHARSETS.map(c => <SelectItem key={c.v} value={c.v}>{c.label}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label>Separator</Label>
              <Select value={separator || "__none__"} onValueChange={v => setSeparator(v === "__none__" ? "" : v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">None</SelectItem>
                  <SelectItem value="-">Dash ( - )</SelectItem>
                  <SelectItem value="_">Underscore ( _ )</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div><Label>Prefix</Label><Input value={prefix} maxLength={16} onChange={e => setPrefix(e.target.value.toUpperCase())} placeholder="e.g. WELCOME" /></div>
            <div><Label>Suffix</Label><Input value={suffix} maxLength={16} onChange={e => setSuffix(e.target.value.toUpperCase())} placeholder="e.g. 25" /></div>
          </div>

          <div className="border rounded p-3 bg-background">
            <p className="text-xs text-muted-foreground">Sample</p>
            <p className="font-mono text-lg tracking-widest">{sampleCode}</p>
          </div>

          <div className="flex gap-2">
            <Button onClick={openConfirm} disabled={running || !campaignId}>
              <Sparkles className="w-4 h-4 mr-1" />Generate
            </Button>
          </div>
        </Card>

        <Card className="p-4 space-y-3">
          <h3 className="font-semibold flex items-center gap-2"><Ticket className="w-4 h-4" />Result</h3>
          {running ? (
            <div className="space-y-2">
              <Progress value={target ? (progress * 100) / target : 0} />
              <p className="text-xs text-muted-foreground">Generating… {progress.toLocaleString()} / {target.toLocaleString()}</p>
            </div>
          ) : errorMsg ? (
            <div className="text-xs text-destructive flex items-start gap-2"><AlertTriangle className="w-4 h-4 shrink-0" /><span>{errorMsg}</span></div>
          ) : generated.length > 0 ? (
            <div className="space-y-2 text-xs">
              <div className="flex items-center gap-1.5 text-emerald-600"><CheckCircle2 className="w-4 h-4" /> Generation successful</div>
              <p><span className="text-muted-foreground">Coupons:</span> <b>{generated.length.toLocaleString()}</b></p>
              <p><span className="text-muted-foreground">Time:</span> <b>{(durationMs / 1000).toFixed(2)}s</b></p>
              <p><span className="text-muted-foreground">Batch:</span> <span className="font-mono text-[10px]">{generated[0]?.batch_number}</span></p>
              <div className="flex flex-wrap gap-1 pt-1">
                <Button size="sm" variant="outline" onClick={downloadCsv}><Download className="w-3 h-3 mr-1" />CSV</Button>
                <Button size="sm" variant="outline" onClick={downloadXlsx}><Download className="w-3 h-3 mr-1" />Excel</Button>
              </div>
              <div className="border rounded max-h-64 overflow-auto mt-2">
                <table className="w-full">
                  <tbody>
                    {generated.slice(0, 200).map((r, i) => (
                      <tr key={i} className="border-t"><td className="p-1.5 font-mono">{r.code}</td></tr>
                    ))}
                    {generated.length > 200 && <tr><td className="p-2 text-center text-muted-foreground">…and {(generated.length - 200).toLocaleString()} more</td></tr>}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">Configure options and click Generate.</p>
          )}
        </Card>
      </div>

      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Confirm coupon generation</DialogTitle></DialogHeader>
          {campaign && (
            <div className="space-y-2 text-sm">
              <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
                <div className="text-muted-foreground">Campaign</div><div className="font-medium">{campaign.name}</div>
                <div className="text-muted-foreground">Discount</div><div>{campaign.discount_type === "percent" ? `${campaign.discount_value}%` : `₹${campaign.discount_value}`}</div>
                <div className="text-muted-foreground">Vendors</div><div>{campaign.vendor_id ? "1 vendor" : "All vendors"}</div>
                <div className="text-muted-foreground">Products</div><div>{campaign.product_ids?.length || "All"}</div>
                <div className="text-muted-foreground">Districts</div><div>{campaign.district_ids?.length || "All"}</div>
                <div className="text-muted-foreground">Quantity</div><div><b>{count.toLocaleString()}</b> coupons</div>
                <div className="text-muted-foreground">Format</div><div className="font-mono">{sampleCode}</div>
                <div className="text-muted-foreground">Est. inserts</div><div>{count.toLocaleString()} rows</div>
                <div className="text-muted-foreground">Est. time</div><div>≈ {Math.ceil(count / 800)}s</div>
              </div>
              {remaining !== null && count > remaining && (
                <p className="text-xs text-destructive">⚠ Exceeds remaining campaign target ({remaining})</p>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmOpen(false)}>Cancel</Button>
            <Button onClick={run}><Sparkles className="w-4 h-4 mr-1" />Confirm & Generate</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
