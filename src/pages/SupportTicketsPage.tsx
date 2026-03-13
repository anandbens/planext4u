import { useState, useEffect } from "react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { DataTable } from "@/components/admin/DataTable";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { api, SupportTicket } from "@/lib/api";
import { toast } from "sonner";
import { Headphones, MessageSquare, Clock, CheckCircle } from "lucide-react";

export default function SupportTicketsPage() {
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<SupportTicket | null>(null);
  const [resolution, setResolution] = useState("");
  const [newStatus, setNewStatus] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const load = () => {
    setLoading(true);
    api.getSupportTickets({ search, status: statusFilter }).then((res) => {
      setTickets(res.data);
      setLoading(false);
    });
  };

  useEffect(() => { load(); }, [search, statusFilter]);

  const handleResolve = async () => {
    if (!selected || !resolution.trim()) { toast.error("Please enter resolution notes"); return; }
    await api.resolveTicket(selected.id, newStatus as any || "resolved", resolution);
    toast.success("Ticket updated");
    setSelected(null);
    setResolution("");
    load();
  };

  const stats = {
    total: tickets.length,
    open: tickets.filter(t => t.status === "open").length,
    inProgress: tickets.filter(t => t.status === "in_progress").length,
    resolved: tickets.filter(t => t.status === "resolved").length,
  };

  const columns = [
    { key: "id", label: "Ticket ID", render: (v: string) => <span className="font-mono text-xs">{v}</span> },
    { key: "subject", label: "Subject" },
    { key: "customer_name", label: "Customer" },
    { key: "category", label: "Category", render: (v: string) => <Badge variant="outline" className="text-xs">{v}</Badge> },
    { key: "priority", label: "Priority", render: (v: string) => (
      <Badge className={`text-[10px] border-0 ${v === 'high' ? 'bg-destructive/10 text-destructive' : v === 'medium' ? 'bg-warning/10 text-warning' : 'bg-muted text-muted-foreground'}`}>{v}</Badge>
    )},
    { key: "status", label: "Status", render: (v: string) => <StatusBadge status={v} /> },
    { key: "assigned_to", label: "Assigned To" },
    { key: "created_at", label: "Created", render: (v: string) => new Date(v).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) },
  ];

  return (
    <AdminLayout>
      <div className="page-header">
        <h1 className="page-title flex items-center gap-2"><Headphones className="h-6 w-6" /> Support Tickets</h1>
        <p className="page-description">Manage customer support tickets and call center resolutions</p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        <div className="stat-card bg-card"><p className="text-xs text-muted-foreground">Total</p><p className="text-2xl font-bold">{stats.total}</p></div>
        <div className="stat-card bg-card"><p className="text-xs text-muted-foreground flex items-center gap-1"><Clock className="h-3 w-3" /> Open</p><p className="text-2xl font-bold text-warning">{stats.open}</p></div>
        <div className="stat-card bg-card"><p className="text-xs text-muted-foreground flex items-center gap-1"><MessageSquare className="h-3 w-3" /> In Progress</p><p className="text-2xl font-bold text-info">{stats.inProgress}</p></div>
        <div className="stat-card bg-card"><p className="text-xs text-muted-foreground flex items-center gap-1"><CheckCircle className="h-3 w-3" /> Resolved</p><p className="text-2xl font-bold text-success">{stats.resolved}</p></div>
      </div>

      <DataTable
        columns={columns}
        data={tickets}
        loading={loading}
        searchPlaceholder="Search tickets..."
        onSearch={setSearch}
        statusFilter={statusFilter}
        onStatusFilter={setStatusFilter}
        statusOptions={[
          { label: "All", value: "all" },
          { label: "Open", value: "open" },
          { label: "In Progress", value: "in_progress" },
          { label: "Resolved", value: "resolved" },
          { label: "Closed", value: "closed" },
        ]}
        onRowClick={(ticket) => { setSelected(ticket); setNewStatus(ticket.status); setResolution(""); }}
      />

      <Dialog open={!!selected} onOpenChange={() => setSelected(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Headphones className="h-5 w-5" /> Ticket: {selected?.id}
            </DialogTitle>
          </DialogHeader>
          {selected && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div><Label className="text-muted-foreground text-xs">Customer</Label><p className="font-medium">{selected.customer_name}</p></div>
                <div><Label className="text-muted-foreground text-xs">Priority</Label><p className="font-medium capitalize">{selected.priority}</p></div>
                <div><Label className="text-muted-foreground text-xs">Category</Label><p className="font-medium">{selected.category}</p></div>
                <div><Label className="text-muted-foreground text-xs">Phone</Label><p className="font-medium">{selected.phone}</p></div>
              </div>
              <div><Label className="text-muted-foreground text-xs">Subject</Label><p className="text-sm font-medium">{selected.subject}</p></div>
              <div><Label className="text-muted-foreground text-xs">Description</Label><p className="text-sm text-muted-foreground">{selected.description}</p></div>
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
                <Label className="text-xs">Resolution Notes</Label>
                <Textarea placeholder="Enter resolution details, actions taken, customer feedback..." value={resolution} onChange={(e) => setResolution(e.target.value)} className="mt-1" rows={3} />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setSelected(null)}>Cancel</Button>
            <Button onClick={handleResolve}>Update Ticket</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
