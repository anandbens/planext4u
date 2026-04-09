import { useState, useEffect } from "react";
import { CustomerLayout } from "@/components/customer/CustomerLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { toast } from "sonner";
import { Plus, Search, Headphones, Clock, CheckCircle, AlertTriangle, ChevronRight, MessageSquare } from "lucide-react";

const CATEGORIES = [
  "Order Issue", "Product Quality", "Delivery", "Refund", "Payment",
  "Account", "Service", "Billing", "General",
];

const STATUS_COLORS: Record<string, string> = {
  open: "bg-destructive/10 text-destructive",
  in_progress: "bg-warning/10 text-warning",
  resolved: "bg-success/10 text-success",
  closed: "bg-muted text-muted-foreground",
};

export default function CustomerSupportPage() {
  const { customerUser } = useAuth();
  const customerId = customerUser?.id;

  const [tickets, setTickets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [createOpen, setCreateOpen] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const [selected, setSelected] = useState<any>(null);

  // Create form
  const [subject, setSubject] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("");
  const [priority, setPriority] = useState("medium");
  const [submitting, setSubmitting] = useState(false);

  const fetchTickets = async () => {
    if (!customerId) return;
    setLoading(true);
    const { data } = await supabase
      .from("support_tickets")
      .select("*")
      .eq("customer_id", customerId)
      .order("created_at", { ascending: false });
    setTickets(data || []);
    setLoading(false);
  };

  useEffect(() => { fetchTickets(); }, [customerId]);

  const filtered = tickets.filter(t => {
    if (filterStatus !== "all" && t.status !== filterStatus) return false;
    if (search && !t.subject.toLowerCase().includes(search.toLowerCase()) && !t.category.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const handleCreate = async () => {
    if (!subject.trim() || !category) {
      toast.error("Please fill subject and category");
      return;
    }
    setSubmitting(true);
    try {
      const now = new Date();
      const id = `TKT-${now.getFullYear()}${String(now.getMonth()+1).padStart(2,'0')}${String(now.getDate()).padStart(2,'0')}-${String(Math.floor(Math.random()*100000)).padStart(5,'0')}`;
      const { error } = await supabase.from("support_tickets").insert({
        id,
        customer_id: customerId!,
        customer_name: customerUser?.name || "",
        subject: subject.trim(),
        description: description.trim(),
        category,
        priority,
        status: "open",
      } as any);
      if (error) throw error;
      toast.success("Ticket created successfully");
      setCreateOpen(false);
      setSubject(""); setDescription(""); setCategory(""); setPriority("medium");
      fetchTickets();
    } catch (e: any) {
      toast.error(e.message || "Failed to create ticket");
    }
    setSubmitting(false);
  };

  const stats = {
    total: tickets.length,
    open: tickets.filter(t => t.status === "open").length,
    inProgress: tickets.filter(t => t.status === "in_progress").length,
    resolved: tickets.filter(t => t.status === "resolved" || t.status === "closed").length,
  };

  return (
    <CustomerLayout>
      <div className="max-w-3xl mx-auto px-4 py-6 pb-24 space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold flex items-center gap-2">
              <Headphones className="h-5 w-5 text-primary" /> Support
            </h1>
            <p className="text-xs text-muted-foreground">Get help with your orders and services</p>
          </div>
          <Button size="sm" onClick={() => setCreateOpen(true)} className="gap-1">
            <Plus className="h-4 w-4" /> New Ticket
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-4 gap-2">
          {[
            { label: "Total", value: stats.total, icon: MessageSquare, color: "text-primary" },
            { label: "Open", value: stats.open, icon: AlertTriangle, color: "text-destructive" },
            { label: "In Progress", value: stats.inProgress, icon: Clock, color: "text-warning" },
            { label: "Resolved", value: stats.resolved, icon: CheckCircle, color: "text-success" },
          ].map(s => (
            <Card key={s.label} className="p-3 text-center">
              <s.icon className={`h-4 w-4 mx-auto ${s.color}`} />
              <p className="text-lg font-bold">{s.value}</p>
              <p className="text-[10px] text-muted-foreground">{s.label}</p>
            </Card>
          ))}
        </div>

        {/* Filters */}
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search tickets..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9 h-9 text-sm" />
          </div>
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="w-32 h-9 text-sm"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="open">Open</SelectItem>
              <SelectItem value="in_progress">In Progress</SelectItem>
              <SelectItem value="resolved">Resolved</SelectItem>
              <SelectItem value="closed">Closed</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Tickets list */}
        {loading ? (
          <div className="text-center py-12 text-muted-foreground">Loading...</div>
        ) : filtered.length === 0 ? (
          <Card className="p-8 text-center">
            <Headphones className="h-10 w-10 mx-auto text-muted-foreground/50 mb-2" />
            <p className="text-sm text-muted-foreground">No tickets found</p>
            <Button size="sm" variant="outline" className="mt-3" onClick={() => setCreateOpen(true)}>Create a ticket</Button>
          </Card>
        ) : (
          <div className="space-y-2">
            {filtered.map(t => (
              <Card key={t.id} className="p-4 cursor-pointer hover:shadow-md transition-shadow" onClick={() => { setSelected(t); setDetailOpen(true); }}>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge className={`text-[10px] border-0 ${STATUS_COLORS[t.status] || 'bg-muted'}`}>
                        {t.status.replace(/_/g, ' ')}
                      </Badge>
                      <Badge variant="outline" className="text-[10px]">{t.category}</Badge>
                      <Badge variant="outline" className={`text-[10px] ${t.priority === 'high' ? 'border-destructive/50 text-destructive' : ''}`}>
                        {t.priority}
                      </Badge>
                    </div>
                    <p className="font-medium text-sm truncate">{t.subject}</p>
                    <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">{t.description}</p>
                    <p className="text-[10px] text-muted-foreground mt-1">
                      {t.id} · {new Date(t.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </p>
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground mt-1 shrink-0" />
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Create ticket dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><Plus className="h-5 w-5" /> New Support Ticket</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Category *</label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger className="mt-1"><SelectValue placeholder="Select category" /></SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium">Subject *</label>
              <Input value={subject} onChange={e => setSubject(e.target.value)} placeholder="Brief description of your issue" className="mt-1" maxLength={200} />
            </div>
            <div>
              <label className="text-sm font-medium">Description</label>
              <Textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="Provide details about your issue, including order IDs if applicable..." className="mt-1" rows={4} maxLength={2000} />
            </div>
            <div>
              <label className="text-sm font-medium">Priority</label>
              <Select value={priority} onValueChange={setPriority}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
            <Button onClick={handleCreate} disabled={submitting}>{submitting ? "Submitting..." : "Submit Ticket"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Ticket detail dialog */}
      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Ticket Details</DialogTitle>
          </DialogHeader>
          {selected && (
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Badge className={`border-0 ${STATUS_COLORS[selected.status] || 'bg-muted'}`}>
                  {selected.status.replace(/_/g, ' ')}
                </Badge>
                <Badge variant="outline">{selected.category}</Badge>
                <Badge variant="outline">{selected.priority}</Badge>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Subject</p>
                <p className="font-semibold text-sm">{selected.subject}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Description</p>
                <p className="text-sm">{selected.description || "No description provided"}</p>
              </div>
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div><span className="text-muted-foreground">Ticket ID:</span> <span className="font-mono">{selected.id}</span></div>
                <div><span className="text-muted-foreground">Created:</span> {new Date(selected.created_at).toLocaleDateString('en-IN')}</div>
                <div><span className="text-muted-foreground">Assigned:</span> {selected.assigned_to || "Pending"}</div>
                <div><span className="text-muted-foreground">Updated:</span> {new Date(selected.updated_at).toLocaleDateString('en-IN')}</div>
              </div>
              {selected.resolution_notes && (
                <div className="bg-success/5 border border-success/20 rounded-lg p-3">
                  <p className="text-xs font-medium text-success mb-1">Resolution</p>
                  <p className="text-sm">{selected.resolution_notes}</p>
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setDetailOpen(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </CustomerLayout>
  );
}
