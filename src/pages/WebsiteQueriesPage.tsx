import { useEffect, useState, useCallback } from "react";
import { fmtTs } from "@/lib/format-date";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { DataTable } from "@/components/admin/DataTable";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { api, WebsiteQuery, PaginatedResponse } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Reply, CheckCircle, Clock, Mail } from "lucide-react";
import { exportToCSV } from "@/lib/csv";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

export default function WebsiteQueriesPage() {
  const [data, setData] = useState<PaginatedResponse<WebsiteQuery> | null>(null);
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState("");
  const [dateFrom, setDateFrom] = useState<string>();
  const [dateTo, setDateTo] = useState<string>();
  const [selected, setSelected] = useState<any>(null);
  const [replyText, setReplyText] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const fetchData = useCallback(() => {
    api.getWebsiteQueries({ page, per_page: 10, status: statusFilter || undefined, date_from: dateFrom, date_to: dateTo }).then(setData);
  }, [page, statusFilter, dateFrom, dateTo]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleStatusChange = async (id: string, status: WebsiteQuery['status']) => {
    await api.updateWebsiteQueryStatus(id, status);
    toast.success(`Query marked as ${status.replace('_', ' ')}`);
    fetchData();
  };

  const handleReply = async () => {
    if (!selected || !replyText.trim()) { toast.error("Please type a reply"); return; }
    setSubmitting(true);
    try {
      const { data: u } = await supabase.auth.getUser();
      await api.replyToWebsiteQuery(selected.id, replyText.trim(), u?.user?.email || u?.user?.id || "admin");
      toast.success(`Reply sent to ${selected.email}`);
      setSelected(null); setReplyText(""); fetchData();
    } catch (e: any) {
      toast.error(e.message || "Failed to save reply");
    }
    setSubmitting(false);
  };

  const handleExport = () => {
    if (!data) return;
    exportToCSV(data.data, [
      { key: "id", label: "ID" }, { key: "name", label: "Name" },
      { key: "email", label: "Email" }, { key: "phone", label: "Phone" },
      { key: "subject", label: "Subject" }, { key: "message", label: "Message" },
      { key: "admin_reply", label: "Admin Reply" }, { key: "replied_by", label: "Replied By" },
      { key: "status", label: "Status" }, { key: "created_at", label: "Received" },
      { key: "replied_at", label: "Replied At" },
    ], "website_queries");
    toast.success("CSV exported");
  };

  if (!data) return <AdminLayout><div className="flex items-center justify-center h-64"><div className="h-8 w-8 rounded-full border-2 border-primary border-t-transparent animate-spin" /></div></AdminLayout>;

  return (
    <AdminLayout>
      <div className="page-header">
        <h1 className="page-title">Website Queries</h1>
        <p className="page-description">{data.total} queries received · Reply to close the loop with visitors</p>
      </div>
      <DataTable
        columns={[
          { key: "id", label: "ID" },
          { key: "name", label: "From", render: (q) => (
            <div><p className="font-medium">{q.name}</p><p className="text-xs text-muted-foreground">{q.email}</p></div>
          )},
          { key: "phone", label: "Phone" },
          { key: "subject", label: "Subject", render: (q) => <span className="font-medium">{q.subject}</span> },
          { key: "message", label: "Message", render: (q) => <span className="text-xs text-muted-foreground line-clamp-1 max-w-[200px]">{q.message}</span> },
          { key: "admin_reply", label: "Reply", render: (q: any) => q.admin_reply
            ? <span className="text-xs text-success line-clamp-1 max-w-[180px]" title={q.admin_reply}>✓ {q.admin_reply}</span>
            : <span className="text-xs text-muted-foreground">—</span> },
          { key: "status", label: "Status", render: (q) => <StatusBadge status={q.status} /> },
          { key: "created_at", label: "Received", render: (q: any) => <span className="text-xs text-muted-foreground whitespace-nowrap">{fmtTs(q.created_at)}</span> },
          { key: "updated_at", label: "Updated", render: (q: any) => <span className="text-xs text-muted-foreground whitespace-nowrap">{fmtTs(q.updated_at || q.created_at)}</span> },
          { key: "actions", label: "", render: (q: any) => (
            <div className="flex gap-1">
              <Button variant="ghost" size="icon" className="h-7 w-7 text-primary" title="Reply"
                onClick={(e) => { e.stopPropagation(); setSelected(q); setReplyText(q.admin_reply || ""); }}>
                <Reply className="h-4 w-4" />
              </Button>
              {q.status === 'new' && (
                <Button variant="ghost" size="icon" className="h-7 w-7 text-warning" title="Mark in progress"
                  onClick={(e) => { e.stopPropagation(); handleStatusChange(q.id, 'in_progress'); }}>
                  <Clock className="h-4 w-4" />
                </Button>
              )}
              {q.status !== 'resolved' && (
                <Button variant="ghost" size="icon" className="h-7 w-7 text-success" title="Mark resolved"
                  onClick={(e) => { e.stopPropagation(); handleStatusChange(q.id, 'resolved'); }}>
                  <CheckCircle className="h-4 w-4" />
                </Button>
              )}
            </div>
          )},
        ]}
        data={data.data} total={data.total} page={data.page} perPage={data.per_page}
        totalPages={data.total_pages} onPageChange={setPage} onExport={handleExport}
        onRowClick={(q: any) => { setSelected(q); setReplyText(q.admin_reply || ""); }}
        onFilterChange={(key, val) => { if (key === "status") { setStatusFilter(val); setPage(1); } }}
        onDateRangeChange={(f, t) => { setDateFrom(f); setDateTo(t); setPage(1); }}
        filters={[{ key: "status", label: "Status", options: [{ value: "new", label: "New" }, { value: "in_progress", label: "In Progress" }, { value: "resolved", label: "Resolved" }] }]}
      />

      <Dialog open={!!selected} onOpenChange={(o) => { if (!o) { setSelected(null); setReplyText(""); } }}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle className="flex items-center gap-2"><Mail className="h-5 w-5" /> Website Query</DialogTitle></DialogHeader>
          {selected && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div><Label className="text-xs text-muted-foreground">From</Label><p className="font-medium">{selected.name}</p></div>
                <div><Label className="text-xs text-muted-foreground">Email</Label><p className="font-mono text-xs">{selected.email}</p></div>
                <div><Label className="text-xs text-muted-foreground">Phone</Label><p>{selected.phone || "—"}</p></div>
                <div><Label className="text-xs text-muted-foreground">Subject</Label><p className="font-medium">{selected.subject}</p></div>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Message</Label>
                <p className="text-sm bg-muted/30 p-3 rounded whitespace-pre-wrap">{selected.message}</p>
              </div>
              <div>
                <Label className="text-xs">Your Reply (will be saved & marked resolved)</Label>
                <Textarea value={replyText} onChange={e => setReplyText(e.target.value)} rows={5} maxLength={2000} className="mt-1"
                  placeholder="Compose your response to the visitor..." />
                <p className="text-[10px] text-muted-foreground mt-1">After saving, send this reply to <span className="font-mono">{selected.email}</span> using your email client.</p>
              </div>
              {selected.admin_reply && selected.replied_at && (
                <p className="text-[11px] text-muted-foreground">Last replied: {new Date(selected.replied_at).toLocaleString('en-IN')} by {selected.replied_by || 'admin'}</p>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => { setSelected(null); setReplyText(""); }}>Cancel</Button>
            <Button onClick={handleReply} disabled={submitting || !replyText.trim()}>{submitting ? "Saving..." : "Save Reply & Resolve"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
