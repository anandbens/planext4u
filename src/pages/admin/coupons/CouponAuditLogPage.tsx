import { useEffect, useState } from "react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { CouponAdminNav } from "@/components/admin/CouponAdminNav";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { Download, Search } from "lucide-react";

export default function CouponAuditLogPage() {
  const [rows, setRows] = useState<any[]>([]);
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const pageSize = 100;

  useEffect(() => {
    setLoading(true);
    let query: any = supabase.from("coupon_audit_log")
      .select("*").order("created_at", { ascending: false })
      .range(page * pageSize, page * pageSize + pageSize - 1);
    if (q.trim()) query = query.or(`code.ilike.%${q.trim()}%,event_type.ilike.%${q.trim()}%,actor.ilike.%${q.trim()}%`);
    query.then(({ data }: any) => { setRows(data || []); setLoading(false); });
  }, [q, page]);

  const exportCsv = () => {
    const header = ["created_at", "event", "code", "campaign", "actor", "previous_status", "new_status", "reason", "ip", "device"];
    const csv = [header.join(",")].concat(rows.map((r: any) => [
      r.created_at, r.event_type, r.code || "", r.campaign_id || "", r.actor || "",
      r.previous_status || "", r.new_status || "", r.reason || "", r.ip_address || "", r.device || "",
    ].map(v => `"${String(v).replace(/"/g, '""')}"`).join(","))).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob); a.download = "coupon-audit-log.csv"; a.click();
  };

  return (
    <AdminLayout>
      <div className="page-header flex justify-between items-start">
        <div>
          <h1 className="page-title">Coupon Audit Log</h1>
          <p className="page-description">Every coupon lifecycle event · immutable trail</p>
        </div>
        <Button variant="outline" onClick={exportCsv}><Download className="w-4 h-4 mr-1" />Export</Button>
      </div>
      <CouponAdminNav />

      <Card className="p-3 mb-3">
        <div className="relative max-w-md">
          <Search className="w-3.5 h-3.5 absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input value={q} onChange={e => { setQ(e.target.value); setPage(0); }} placeholder="Search event / code / actor…" className="pl-7 h-9" />
        </div>
      </Card>

      <Card className="overflow-hidden">
        <div className="overflow-auto max-h-[70vh]">
          <table className="w-full text-xs">
            <thead className="sticky top-0 bg-muted">
              <tr>
                <th className="text-left p-2">Time</th>
                <th className="text-left p-2">Event</th>
                <th className="text-left p-2">Code</th>
                <th className="text-left p-2">Actor</th>
                <th className="text-left p-2">Prev → New</th>
                <th className="text-left p-2">Reason</th>
                <th className="text-left p-2">IP</th>
                <th className="text-left p-2">Device</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={8} className="p-8 text-center text-muted-foreground">Loading…</td></tr>
              ) : rows.length === 0 ? (
                <tr><td colSpan={8} className="p-8 text-center text-muted-foreground">No audit entries</td></tr>
              ) : rows.map((r: any) => (
                <tr key={r.id} className="border-t hover:bg-muted/30">
                  <td className="p-2 whitespace-nowrap">{new Date(r.created_at).toLocaleString()}</td>
                  <td className="p-2"><Badge variant="outline" className="text-[10px]">{r.event_type}</Badge></td>
                  <td className="p-2 font-mono">{r.code || "—"}</td>
                  <td className="p-2 truncate max-w-[120px]">{r.actor || "system"}</td>
                  <td className="p-2 text-muted-foreground">{r.previous_status || "—"} → {r.new_status || "—"}</td>
                  <td className="p-2 truncate max-w-[180px]">{r.reason || "—"}</td>
                  <td className="p-2">{r.ip_address || "—"}</td>
                  <td className="p-2 truncate max-w-[120px]">{r.device || "—"}</td>
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
