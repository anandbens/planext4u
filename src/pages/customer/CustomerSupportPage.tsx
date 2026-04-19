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
import { TicketChatThread } from "@/components/support/TicketChatThread";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { toast } from "sonner";
import { Plus, Search, Headphones, Clock, CheckCircle, AlertTriangle, ChevronRight, MessageSquare, AlertOctagon } from "lucide-react";

const TICKET_CATEGORIES = ["Order Issue", "Product Quality", "Delivery", "Refund", "Payment", "Account", "Service", "Billing", "General"];
const COMPLAINT_CATEGORIES = ["quality", "delay", "damage", "wrong_item", "refund", "behavior", "safety", "billing", "general"];
const COMPLAINT_ENTITY_TYPES = ["order", "product", "service", "delivery", "vendor", "general"];

const STATUS_COLORS: Record<string, string> = {
  open: "bg-destructive/10 text-destructive",
  in_progress: "bg-warning/10 text-warning",
  awaiting_response: "bg-info/10 text-info",
  resolved: "bg-success/10 text-success",
  closed: "bg-muted text-muted-foreground",
  escalated: "bg-destructive text-destructive-foreground",
};

export default function CustomerSupportPage() {
  const { customerUser } = useAuth();
  const customerId = customerUser?.id;

  const [activeTab, setActiveTab] = useState("tickets");

  // Tickets
  const [tickets, setTickets] = useState<any[]>([]);
  const [complaints, setComplaints] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");

  // Modals
  const [createOpen, setCreateOpen] = useState(false);
  const [createMode, setCreateMode] = useState<"ticket" | "complaint">("ticket");
  const [detailOpen, setDetailOpen] = useState(false);
  const [selected, setSelected] = useState<any>(null);
  const [selectedKind, setSelectedKind] = useState<"ticket" | "complaint">("ticket");

  // Create form
  const [subject, setSubject] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("");
  const [priority, setPriority] = useState("medium");
  const [entityType, setEntityType] = useState("general");
  const [orderId, setOrderId] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const fetchAll = async () => {
    if (!customerId) return;
    setLoading(true);
    const [t, c] = await Promise.all([
      supabase.from("support_tickets").select("*").eq("customer_id", customerId).order("created_at", { ascending: false }),
      // complaints.user_id = auth user uuid
      (async () => {
        const { data: u } = await supabase.auth.getUser();
        if (!u?.user?.id) return { data: [] };
        return await (supabase as any).from("complaints").select("*").eq("user_id", u.user.id).order("created_at", { ascending: false });
      })(),
    ]);
    setTickets(t.data || []);
    setComplaints(c.data || []);
    setLoading(false);
  };

  useEffect(() => { fetchAll(); }, [customerId]);

  // Realtime — refresh lists when admin updates
  useEffect(() => {
    if (!customerId) return;
    const ch = supabase
      .channel(`support-customer-${customerId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "support_tickets", filter: `customer_id=eq.${customerId}` }, () => fetchAll())
      .on("postgres_changes", { event: "*", schema: "public", table: "complaints" }, () => fetchAll())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [customerId]);

  const filteredTickets = tickets.filter(t => {
    if (filterStatus !== "all" && t.status !== filterStatus) return false;
    if (search && !t.subject.toLowerCase().includes(search.toLowerCase()) && !(t.category || "").toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const filteredComplaints = complaints.filter(c => {
    if (filterStatus !== "all" && c.status !== filterStatus) return false;
    if (search && !c.subject.toLowerCase().includes(search.toLowerCase()) && !(c.category || "").toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const resetForm = () => {
    setSubject(""); setDescription(""); setCategory(""); setPriority("medium");
    setEntityType("general"); setOrderId("");
  };

  const handleCreate = async () => {
    if (!subject.trim() || !category) {
      toast.error("Please fill subject and category");
      return;
    }
    setSubmitting(true);
    try {
      if (createMode === "ticket") {
        const now = new Date();
        const id = `TKT-${now.getFullYear()}${String(now.getMonth()+1).padStart(2,'0')}${String(now.getDate()).padStart(2,'0')}-${String(Math.floor(Math.random()*100000)).padStart(5,'0')}`;
        const { error } = await supabase.from("support_tickets").insert({
          id, customer_id: customerId!, customer_name: customerUser?.name || "",
          subject: subject.trim(), description: description.trim(), category, priority, status: "open",
        } as any);
        if (error) throw error;
        toast.success("Ticket created successfully");
      } else {
        const { data: u } = await supabase.auth.getUser();
        if (!u?.user?.id) throw new Error("Not authenticated");
        const { error } = await (supabase as any).from("complaints").insert({
          user_id: u.user.id,
          user_name: customerUser?.name || "",
          subject: subject.trim(), description: description.trim(),
          category, priority, entity_type: entityType,
          order_id: orderId.trim() || null,
          status: "open",
        });
        if (error) throw error;
        toast.success("Complaint submitted successfully");
      }
      setCreateOpen(false);
      resetForm();
      fetchAll();
    } catch (e: any) {
      toast.error(e.message || "Failed to submit");
    }
    setSubmitting(false);
  };

  const list = activeTab === "tickets" ? filteredTickets : filteredComplaints;
  const kind: "ticket" | "complaint" = activeTab === "tickets" ? "ticket" : "complaint";

  const stats = activeTab === "tickets" ? {
    total: tickets.length,
    open: tickets.filter(t => t.status === "open").length,
    inProgress: tickets.filter(t => t.status === "in_progress").length,
    resolved: tickets.filter(t => t.status === "resolved" || t.status === "closed").length,
  } : {
    total: complaints.length,
    open: complaints.filter(c => c.status === "open").length,
    inProgress: complaints.filter(c => c.status === "in_progress" || c.status === "awaiting_response").length,
    resolved: complaints.filter(c => c.status === "resolved" || c.status === "closed").length,
  };

  const openCreate = (mode: "ticket" | "complaint") => {
    resetForm();
    setCreateMode(mode);
    setCreateOpen(true);
  };

  return (
    <CustomerLayout>
      <div className="max-w-3xl mx-auto px-4 py-6 pb-32 space-y-5">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold flex items-center gap-2">
              <Headphones className="h-5 w-5 text-primary" /> Help & Support
            </h1>
            <p className="text-xs text-muted-foreground">Get help, raise issues, and track responses</p>
          </div>
          <Button size="sm" onClick={() => openCreate(activeTab === "tickets" ? "ticket" : "complaint")} className="gap-1">
            <Plus className="h-4 w-4" /> {activeTab === "tickets" ? "New Ticket" : "New Complaint"}
          </Button>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid grid-cols-2 w-full">
            <TabsTrigger value="tickets" className="gap-1"><MessageSquare className="h-3.5 w-3.5" /> Support Tickets ({tickets.length})</TabsTrigger>
            <TabsTrigger value="complaints" className="gap-1"><AlertOctagon className="h-3.5 w-3.5" /> Complaints ({complaints.length})</TabsTrigger>
          </TabsList>

          <div className="grid grid-cols-4 gap-2 mt-4">
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

          <div className="flex gap-2 mt-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder={`Search ${activeTab}...`} value={search} onChange={e => setSearch(e.target.value)} className="pl-9 h-9 text-sm" />
            </div>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-32 h-9 text-sm"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="open">Open</SelectItem>
                <SelectItem value="in_progress">In Progress</SelectItem>
                {activeTab === "complaints" && <SelectItem value="awaiting_response">Awaiting</SelectItem>}
                <SelectItem value="resolved">Resolved</SelectItem>
                <SelectItem value="closed">Closed</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <TabsContent value="tickets" className="mt-4">
            <ListBody loading={loading} items={list} kind="ticket" onOpen={(it) => { setSelected(it); setSelectedKind("ticket"); setDetailOpen(true); }} onCreate={() => openCreate("ticket")} />
          </TabsContent>
          <TabsContent value="complaints" className="mt-4">
            <ListBody loading={loading} items={list} kind="complaint" onOpen={(it) => { setSelected(it); setSelectedKind("complaint"); setDetailOpen(true); }} onCreate={() => openCreate("complaint")} />
          </TabsContent>
        </Tabs>
      </div>

      {/* Create dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Plus className="h-5 w-5" /> {createMode === "ticket" ? "New Support Ticket" : "New Complaint"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Category *</label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger className="mt-1"><SelectValue placeholder="Select category" /></SelectTrigger>
                <SelectContent>
                  {(createMode === "ticket" ? TICKET_CATEGORIES : COMPLAINT_CATEGORIES).map(c => (
                    <SelectItem key={c} value={c}>{c.replace(/_/g, " ").replace(/\b\w/g, l => l.toUpperCase())}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {createMode === "complaint" && (
              <>
                <div>
                  <label className="text-sm font-medium">About</label>
                  <Select value={entityType} onValueChange={setEntityType}>
                    <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {COMPLAINT_ENTITY_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-sm font-medium">Order ID (optional)</label>
                  <Input value={orderId} onChange={e => setOrderId(e.target.value)} placeholder="e.g. ORD-2024-001" className="mt-1" />
                </div>
              </>
            )}
            <div>
              <label className="text-sm font-medium">Subject *</label>
              <Input value={subject} onChange={e => setSubject(e.target.value)} placeholder="Brief description of your issue" className="mt-1" maxLength={200} />
            </div>
            <div>
              <label className="text-sm font-medium">Description</label>
              <Textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="Provide details..." className="mt-1" rows={4} maxLength={2000} />
            </div>
            <div>
              <label className="text-sm font-medium">Priority</label>
              <Select value={priority} onValueChange={setPriority}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  {createMode === "complaint" && <SelectItem value="critical">Critical</SelectItem>}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
            <Button onClick={handleCreate} disabled={submitting}>{submitting ? "Submitting..." : "Submit"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Detail dialog with chat thread */}
      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{selectedKind === "ticket" ? "Ticket" : "Complaint"} Details</DialogTitle>
          </DialogHeader>
          {selected && (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center gap-2">
                <Badge className={`border-0 ${STATUS_COLORS[selected.status] || 'bg-muted'}`}>{selected.status.replace(/_/g, ' ')}</Badge>
                <Badge variant="outline">{selected.category}</Badge>
                <Badge variant="outline">{selected.priority}</Badge>
                {selectedKind === "complaint" && <Badge variant="outline">{selected.entity_type}</Badge>}
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Subject</p>
                <p className="font-semibold text-sm">{selected.subject}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Description</p>
                <p className="text-sm">{selected.description || "—"}</p>
              </div>
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div><span className="text-muted-foreground">ID:</span> <span className="font-mono">{selected.id}</span></div>
                <div><span className="text-muted-foreground">Created:</span> {new Date(selected.created_at).toLocaleDateString('en-IN')}</div>
                {selectedKind === "ticket" && (
                  <>
                    <div><span className="text-muted-foreground">Assigned:</span> {selected.assigned_to || "Pending"}</div>
                    <div><span className="text-muted-foreground">Updated:</span> {selected.updated_at ? new Date(selected.updated_at).toLocaleDateString('en-IN') : "—"}</div>
                  </>
                )}
                {selectedKind === "complaint" && selected.order_id && (
                  <div><span className="text-muted-foreground">Order:</span> {selected.order_id}</div>
                )}
              </div>
              {selected.resolution_notes && (
                <div className="bg-success/5 border border-success/20 rounded-lg p-3">
                  <p className="text-xs font-medium text-success mb-1">Resolution from Support</p>
                  <p className="text-sm whitespace-pre-wrap">{selected.resolution_notes}</p>
                </div>
              )}

              <div>
                <p className="text-xs text-muted-foreground mb-1.5">Conversation</p>
                <TicketChatThread
                  parentId={selected.id}
                  table={selectedKind === "ticket" ? "support_ticket_messages" : "complaint_messages"}
                  parentColumn={selectedKind === "ticket" ? "ticket_id" : "complaint_id"}
                  senderId={customerId || ""}
                  senderName={customerUser?.name || "Customer"}
                  viewerRole="customer"
                  postAsRole="customer"
                />
              </div>
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

function ListBody({ loading, items, kind, onOpen, onCreate }: {
  loading: boolean; items: any[]; kind: "ticket" | "complaint";
  onOpen: (it: any) => void; onCreate: () => void;
}) {
  if (loading) return <div className="text-center py-12 text-muted-foreground">Loading…</div>;
  if (items.length === 0) {
    return (
      <Card className="p-8 text-center">
        <Headphones className="h-10 w-10 mx-auto text-muted-foreground/50 mb-2" />
        <p className="text-sm text-muted-foreground">No {kind === "ticket" ? "tickets" : "complaints"} yet</p>
        <Button size="sm" variant="outline" className="mt-3" onClick={onCreate}>Raise a {kind}</Button>
      </Card>
    );
  }
  return (
    <div className="space-y-2">
      {items.map(t => (
        <Card key={t.id} className="p-4 cursor-pointer hover:shadow-md transition-shadow" onClick={() => onOpen(t)}>
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1 flex-wrap">
                <Badge className={`text-[10px] border-0 ${STATUS_COLORS[t.status] || 'bg-muted'}`}>{t.status.replace(/_/g, ' ')}</Badge>
                <Badge variant="outline" className="text-[10px]">{t.category}</Badge>
                <Badge variant="outline" className={`text-[10px] ${t.priority === 'high' || t.priority === 'critical' ? 'border-destructive/50 text-destructive' : ''}`}>{t.priority}</Badge>
                {kind === "complaint" && t.entity_type && <Badge variant="outline" className="text-[10px]">{t.entity_type}</Badge>}
              </div>
              <p className="font-medium text-sm truncate">{t.subject}</p>
              <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">{t.description}</p>
              <p className="text-[10px] text-muted-foreground mt-1">
                {String(t.id).slice(0, 18)} · {new Date(t.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
              </p>
            </div>
            <ChevronRight className="h-4 w-4 text-muted-foreground mt-1 shrink-0" />
          </div>
        </Card>
      ))}
    </div>
  );
}
