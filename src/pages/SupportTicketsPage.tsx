import { useState, useEffect } from "react";
import { fmtTs } from "@/lib/format-date";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { DataTable } from "@/components/admin/DataTable";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { TicketChatThread } from "@/components/support/TicketChatThread";
import { api } from "@/lib/api";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Headphones, MessageSquare, Clock, CheckCircle } from "lucide-react";

interface SupportTicket {
  id: string; subject: string; description: string; category: string; priority: string;
  status: string; customer_id: string; customer_name: string; phone?: string;
  assigned_to: string; resolution?: string; resolution_notes?: string; created_at: string; updated_at: string;
}

export default function SupportTicketsPage() {
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<SupportTicket | null>(null);
  const [resolution, setResolution] = useState("");
  const [newStatus, setNewStatus] = useState("");
  const [adminId, setAdminId] = useState<string>("");
  const [search, setSearch] = useState("");
  const [dateFrom, setDateFrom] = useState<string>();
  const [dateTo, setDateTo] = useState<string>();
  const [filterStatus, setFilterStatus] = useState("all");

  const load = () => {
    api.getSupportTickets({ page, search, status: filterStatus, date_from: dateFrom, date_to: dateTo }).then((res) => {
      setTickets(res.data); setTotal(res.total);
    });
  };

  useEffect(() => { load(); }, [page, search, dateFrom, dateTo, filterStatus]);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setAdminId(data?.user?.id || ""));
    const ch = supabase.channel("admin-tickets-list")
      .on("postgres_changes", { event: "*", schema: "public", table: "support_tickets" }, () => load())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleResolve = async () => {
    if (!selected) return;
    await api.resolveTicket(selected.id, newStatus || selected.status, resolution || selected.resolution_notes || "");
    toast.success("Ticket updated");
    setSelected(null); setResolution(""); load();
  };

  const stats = {
    total, open: tickets.filter(t => t.status === "open").length,
    inProgress: tickets.filter(t => t.status === "in_progress").length,
    resolved: tickets.filter(t => t.status === "resolved").length,
  };

  const columns = [
    { key: "id", label: "Ticket ID", render: (row: SupportTicket) => <span className="font-mono text-xs">{row.id}</span> },
    { key: "subject", label: "Subject" },
    { key: "customer_name", label: "Customer" },
    { key: "category", label: "Category", render: (row: SupportTicket) => <Badge variant="outline" className="text-xs">{row.category}</Badge> },
    { key: "priority", label: "Priority", render: (row: SupportTicket) => (
      <Badge className={`text-[10px] border-0 ${row.priority === 'high' ? 'bg-destructive/10 text-destructive' : row.priority === 'medium' ? 'bg-warning/10 text-warning' : 'bg-muted text-muted-foreground'}`}>{row.priority}</Badge>
    )},
    { key: "status", label: "Status", render: (row: SupportTicket) => <StatusBadge status={row.status} /> },
    { key: "assigned_to", label: "Assigned To" },
    { key: "created_at", label: "Created", render: (row: any) => <span className="text-xs text-muted-foreground whitespace-nowrap">{fmtTs(row.created_at)}</span> },
    { key: "updated_at", label: "Updated", render: (row: any) => <span className="text-xs text-muted-foreground whitespace-nowrap">{fmtTs(row.updated_at || row.created_at)}</span> },
  ];

  return (
    <AdminLayout>
      <div className="page-header">
        <h1 className="page-title flex items-center gap-2"><Headphones className="h-6 w-6" /> Support Tickets</h1>
        <p className="page-description">Two-way chat with customers; updates push back to their app instantly</p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        <div className="stat-card bg-card"><p className="text-xs text-muted-foreground">Total</p><p className="text-2xl font-bold">{stats.total}</p></div>
        <div className="stat-card bg-card"><p className="text-xs text-muted-foreground flex items-center gap-1"><Clock className="h-3 w-3" /> Open</p><p className="text-2xl font-bold text-warning">{stats.open}</p></div>
        <div className="stat-card bg-card"><p className="text-xs text-muted-foreground flex items-center gap-1"><MessageSquare className="h-3 w-3" /> In Progress</p><p className="text-2xl font-bold text-info">{stats.inProgress}</p></div>
        <div className="stat-card bg-card"><p className="text-xs text-muted-foreground flex items-center gap-1"><CheckCircle className="h-3 w-3" /> Resolved</p><p className="text-2xl font-bold text-success">{stats.resolved}</p></div>
      </div>

      <DataTable
        columns={columns} data={tickets} total={total} page={page} perPage={10}
        totalPages={Math.ceil(total / 10)} onPageChange={setPage}
        searchPlaceholder="Search tickets..." onSearch={setSearch}
        filters={[{ key: "status", label: "Status", options: [
          { label: "All", value: "all" }, { label: "Open", value: "open" },
          { label: "In Progress", value: "in_progress" }, { label: "Resolved", value: "resolved" }, { label: "Closed", value: "closed" },
        ]}]}
        onFilterChange={(_k, val) => { setFilterStatus(val); setPage(1); }}
        onDateRangeChange={(from, to) => { setDateFrom(from); setDateTo(to); }}
        onRowClick={(t) => { setSelected(t); setNewStatus(t.status); setResolution(t.resolution_notes || ""); }}
      />

      <Dialog open={!!selected} onOpenChange={() => setSelected(null)}>
        <DialogContent className="max-w-2xl max-h-[92vh] overflow-y-auto">
          <DialogHeader><DialogTitle className="flex items-center gap-2"><Headphones className="h-5 w-5" /> Ticket: {selected?.id}</DialogTitle></DialogHeader>
          {selected && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div><Label className="text-muted-foreground text-xs">Customer</Label><p className="font-medium">{selected.customer_name}</p></div>
                <div><Label className="text-muted-foreground text-xs">Priority</Label><p className="font-medium capitalize">{selected.priority}</p></div>
                <div><Label className="text-muted-foreground text-xs">Category</Label><p className="font-medium">{selected.category}</p></div>
                <div><Label className="text-muted-foreground text-xs">Phone</Label><p className="font-medium">{selected.phone || "—"}</p></div>
              </div>
              <div><Label className="text-muted-foreground text-xs">Subject</Label><p className="text-sm font-medium">{selected.subject}</p></div>
              <div><Label className="text-muted-foreground text-xs">Description</Label><p className="text-sm text-muted-foreground whitespace-pre-wrap">{selected.description}</p></div>

              <Separator />
              <div>
                <Label className="text-xs mb-1.5 block">Conversation with customer</Label>
                <TicketChatThread parentId={selected.id} table="support_ticket_messages" parentColumn="ticket_id"
                  senderId={adminId} senderName="Support Team" viewerRole="admin" postAsRole="admin" />
              </div>

              <Separator />
              <div>
                <Label className="text-xs">Update Status</Label>
                <Select value={newStatus} onValueChange={setNewStatus}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="open">Open</SelectItem>
                    <SelectItem value="in_progress">In Progress</SelectItem>
                    <SelectItem value="resolved">Resolved</SelectItem>
                    <SelectItem value="closed">Closed</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">Resolution Notes (visible to customer)</Label>
                <Textarea value={resolution} onChange={(e) => setResolution(e.target.value)} className="mt-1" rows={3} />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setSelected(null)}>Close</Button>
            <Button onClick={handleResolve}>Save Status & Notes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
