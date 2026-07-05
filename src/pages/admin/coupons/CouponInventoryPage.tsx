import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { CouponAdminNav } from "@/components/admin/CouponAdminNav";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { Download, Search } from "lucide-react";

const STATUSES = ["all", "available", "reserved", "used", "expired", "cancelled", "rolled_back"] as const;

export default function CouponInventoryPage() {
  const [sp, setSp] = useSearchParams();
  const status = sp.get("status") || "all";
  const [q, setQ] = useState("");
  const [campaignId, setCampaignId] = useState<string>("all");
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const pageSize = 50;

  useEffect(() => {
    supabase.from("coupon_campaigns").select("id,name").order("created_at", { ascending: false })
      .then(({ data }) => setCampaigns(data || []));
  }, []);

  useEffect(() => {
    setLoading(true);
    let query: any = supabase.from("coupon_codes")
      .select("id,code,status,campaign_id,used_by_mobile,used_order_id,used_at,expires_at,created_at,assigned_customer_id,batch_number", { count: "exact" })
      .order("created_at", { ascending: false })
      .range(page * pageSize, page * pageSize + pageSize - 1);
    if (status !== "all") query = query.eq("status", status);
    if (campaignId !== "all") query = query.eq("campaign_id", campaignId);
    if (q.trim()) query = query.ilike("code", `%${q.trim()}%`);
    query.then(({ data }: any) => { setRows(data || []); setLoading(false); });
  }, [status, campaignId, q, page]);

  const campaignMap = useMemo(() => Object.fromEntries(campaigns.map((c: any) => [c.id, c.name])), [campaigns]);

  const setStatus = (v: string) => {
    if (v === "all") sp.delete("status"); else sp.set("status", v);
    setSp(sp); setPage(0);
  };

  const exportCsv = () => {
    const header = ["code", "status", "campaign", "customer", "order", "used_at", "expires_at", "batch"];
    const csv = [header.join(",")].concat(rows.map(r => [
      r.code, r.status, campaignMap[r.campaign_id] || r.campaign_id,
      r.used_by_mobile || r.assigned_customer_id || "",
      r.used_order_id || "", r.used_at || "", r.expires_at || "", r.batch_number || "",
    ].map(v => `"${String(v).replace(/"/g, '""')}"`).join(","))).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob); a.download = `coupon-inventory-${status}.csv`; a.click();
  };

  return (
    <AdminLayout>
      <div className="page-header flex justify-between items-start">
        <div>
          <h1 className="page-title">Coupon Inventory</h1>
          <p className="page-description">All generated coupon codes · filter by status, campaign, code</p>
        </div>
        <Button variant="outline" onClick={exportCsv}><Download className="w-4 h-4 mr-1" />Export</Button>
      </div>
      <CouponAdminNav />

      <Card className="p-3 mb-3 flex flex-wrap gap-2 items-end">
        <div className="flex-1 min-w-[200px]">
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input value={q} onChange={e => { setQ(e.target.value); setPage(0); }} placeholder="Search code…" className="pl-7 h-9" />
          </div>
        </div>
        <div className="w-40">
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
            <SelectContent>{STATUSES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div className="w-60">
          <Select value={campaignId} onValueChange={v => { setCampaignId(v); setPage(0); }}>
            <SelectTrigger className="h-9"><SelectValue placeholder="Campaign" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All campaigns</SelectItem>
              {campaigns.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </Card>

      <Card className="overflow-hidden">
        <div className="overflow-auto max-h-[70vh]">
          <table className="w-full text-xs">
            <thead className="sticky top-0 bg-muted">
              <tr>
                <th className="text-left p-2">Code</th>
                <th className="text-left p-2">Status</th>
                <th className="text-left p-2">Campaign</th>
                <th className="text-left p-2">Customer</th>
                <th className="text-left p-2">Order</th>
                <th className="text-left p-2">Used at</th>
                <th className="text-left p-2">Expires</th>
                <th className="text-left p-2">Batch</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={8} className="p-8 text-center text-muted-foreground">Loading…</td></tr>
              ) : rows.length === 0 ? (
                <tr><td colSpan={8} className="p-8 text-center text-muted-foreground">No coupons found</td></tr>
              ) : rows.map(r => (
                <tr key={r.id} className="border-t hover:bg-muted/30">
                  <td className="p-2 font-mono">{r.code}</td>
                  <td className="p-2"><Badge variant={r.status === "used" ? "secondary" : r.status === "expired" ? "outline" : "default"}>{r.status}</Badge></td>
                  <td className="p-2 truncate max-w-[180px]">{campaignMap[r.campaign_id] || "—"}</td>
                  <td className="p-2">{r.used_by_mobile || r.assigned_customer_id || "—"}</td>
                  <td className="p-2">{r.used_order_id || "—"}</td>
                  <td className="p-2">{r.used_at ? new Date(r.used_at).toLocaleString() : "—"}</td>
                  <td className="p-2">{r.expires_at ? new Date(r.expires_at).toLocaleDateString() : "—"}</td>
                  <td className="p-2">{r.batch_number || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="flex justify-between items-center p-2 border-t text-xs">
          <span className="text-muted-foreground">Page {page + 1}</span>
          <div className="flex gap-1">
            <Button size="sm" variant="outline" disabled={page === 0} onClick={() => setPage(p => Math.max(0, p - 1))}>Prev</Button>
            <Button size="sm" variant="outline" disabled={rows.length < pageSize} onClick={() => setPage(p => p + 1)}>Next</Button>
          </div>
        </div>
      </Card>
    </AdminLayout>
  );
}
