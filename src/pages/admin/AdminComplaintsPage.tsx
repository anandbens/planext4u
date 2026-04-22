import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { TicketChatThread } from "@/components/support/TicketChatThread";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Search, AlertTriangle, Clock, CheckCircle, MessageSquare, ExternalLink } from "lucide-react";

interface Complaint {
  id: string; user_id: string; user_name: string | null; entity_type: string;
  entity_id: string | null; booking_id: string | null; order_id: string | null;
  category: string; subject: string; description: string; images: string[] | null;
  status: string; priority: string; assigned_to: string | null;
  resolution_notes: string | null; resolved_at: string | null; created_at: string;
  customer_email?: string | null; customer_mobile?: string | null;
}

const STATUS_COLORS: Record<string, string> = {
  open: "bg-destructive/10 text-destructive",
  in_progress: "bg-warning/10 text-warning",
  awaiting_response: "bg-info/10 text-info",
  resolved: "bg-success/10 text-success",
  closed: "bg-muted text-muted-foreground",
  escalated: "bg-destructive text-destructive-foreground",
};

const PRIORITY_COLORS: Record<string, string> = {
  low: "bg-muted text-muted-foreground",
  medium: "bg-warning/10 text-warning",
  high: "bg-destructive/10 text-destructive",
  critical: "bg-destructive text-destructive-foreground",
};

const CATEGORIES = ["quality", "delay", "damage", "wrong_item", "refund", "behavior", "safety", "billing", "general"];

export default function AdminComplaintsPage() {
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [search, setSearch] = useState("");
  const [contactFilter, setContactFilter] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterCategory, setFilterCategory] = useState("all");
  const [selectedComplaint, setSelectedComplaint] = useState<Complaint | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [resolutionNotes, setResolutionNotes] = useState("");
  const [updateStatus, setUpdateStatus] = useState("");
  const [adminId, setAdminId] = useState("");

  const fetchComplaints = async () => {
    const { data } = await supabase.from("complaints" as any).select("*").order("created_at", { ascending: false });
    const list = (data || []) as any[];
    const userIds = Array.from(new Set(list.map(c => c.user_id).filter(Boolean)));
    const contactMap: Record<string, { email: string | null; mobile: string | null }> = {};
    if (userIds.length > 0) {
      const { data: customers } = await supabase
        .from("customers")
        .select("id, email, mobile")
        .in("id", userIds);
      (customers || []).forEach((c: any) => {
        contactMap[c.id] = { email: c.email || null, mobile: c.mobile || null };
      });
    }
    const enriched = list.map(c => ({
      ...c,
      customer_email: contactMap[c.user_id]?.email ?? null,
      customer_mobile: contactMap[c.user_id]?.mobile ?? null,
    }));
    setComplaints(enriched as any[]);
  };

  useEffect(() => { fetchComplaints(); }, []);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setAdminId(data?.user?.id || ""));
    const ch = supabase.channel("admin-complaints-list")
      .on("postgres_changes", { event: "*", schema: "public", table: "complaints" }, () => fetchComplaints())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, []);

  const filtered = complaints.filter(c => {
    if (filterStatus !== "all" && c.status !== filterStatus) return false;
    if (filterCategory !== "all" && c.category !== filterCategory) return false;
    if (search) {
      const q = search.toLowerCase();
      const hay = [c.subject, c.user_name, c.customer_email, c.customer_mobile]
        .filter(Boolean).join(" ").toLowerCase();
      if (!hay.includes(q)) return false;
    }
    if (contactFilter) {
      const q = contactFilter.toLowerCase().trim();
      const hay = [c.customer_email, c.customer_mobile].filter(Boolean).join(" ").toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  });

  const stats = {
    total: complaints.length,
    open: complaints.filter(c => c.status === "open").length,
    inProgress: complaints.filter(c => c.status === "in_progress" || c.status === "awaiting_response").length,
    resolved: complaints.filter(c => c.status === "resolved" || c.status === "closed").length,
  };

  const handleUpdateComplaint = async () => {
    if (!selectedComplaint) return;
    const updates: any = {};
    if (updateStatus) updates.status = updateStatus;
    updates.resolution_notes = resolutionNotes;
    if (updateStatus === "resolved" || updateStatus === "closed") updates.resolved_at = new Date().toISOString();

    const { error } = await supabase.from("complaints" as any).update(updates).eq("id", selectedComplaint.id);
    if (error) { toast.error("Failed to update"); return; }
    toast.success("Complaint updated");
    setDetailOpen(false);
    fetchComplaints();
  };

  const openDetail = (c: Complaint) => {
    setSelectedComplaint(c);
    setUpdateStatus(c.status);
    setResolutionNotes(c.resolution_notes || "");
    setDetailOpen(true);
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Customer Complaints</h1>
          <p className="text-sm text-muted-foreground">Manage and chat with customers about complaints across all modules</p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: "Total", value: stats.total, icon: MessageSquare, color: "text-primary" },
            { label: "Open", value: stats.open, icon: AlertTriangle, color: "text-destructive" },
            { label: "In Progress", value: stats.inProgress, icon: Clock, color: "text-warning" },
            { label: "Resolved", value: stats.resolved, icon: CheckCircle, color: "text-success" },
          ].map(s => (
            <Card key={s.label} className="p-4">
              <div className="flex items-center gap-3">
                <s.icon className={`h-5 w-5 ${s.color}`} />
                <div><p className="text-xs text-muted-foreground">{s.label}</p><p className="text-xl font-bold">{s.value}</p></div>
              </div>
            </Card>
          ))}
        </div>

        <div className="flex flex-wrap gap-3 items-center">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search complaints..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
          </div>
          <div className="relative w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Filter by email or phone..."
              value={contactFilter}
              onChange={e => setContactFilter(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="w-40"><SelectValue placeholder="Status" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="open">Open</SelectItem>
              <SelectItem value="in_progress">In Progress</SelectItem>
              <SelectItem value="awaiting_response">Awaiting Response</SelectItem>
              <SelectItem value="resolved">Resolved</SelectItem>
              <SelectItem value="closed">Closed</SelectItem>
              <SelectItem value="escalated">Escalated</SelectItem>
            </SelectContent>
          </Select>
          <Select value={filterCategory} onValueChange={setFilterCategory}>
            <SelectTrigger className="w-40"><SelectValue placeholder="Category" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              {CATEGORIES.map(c => <SelectItem key={c} value={c}>{c.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}</SelectItem>)}
            </SelectContent>
          </Select>
          {(search || contactFilter || filterStatus !== "all" || filterCategory !== "all") && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => { setSearch(""); setContactFilter(""); setFilterStatus("all"); setFilterCategory("all"); }}
            >
              Clear filters
            </Button>
          )}
        </div>

        <Tabs defaultValue="all" className="space-y-4">
          <TabsList>
            <TabsTrigger value="all">All ({complaints.length})</TabsTrigger>
            <TabsTrigger value="service">Service ({complaints.filter(c => c.entity_type === 'service').length})</TabsTrigger>
            <TabsTrigger value="product">Product ({complaints.filter(c => c.entity_type === 'product').length})</TabsTrigger>
            <TabsTrigger value="order">Order ({complaints.filter(c => c.entity_type === 'order').length})</TabsTrigger>
            <TabsTrigger value="general">General ({complaints.filter(c => c.entity_type === 'general').length})</TabsTrigger>
          </TabsList>

          {["all", "service", "product", "order", "general"].map(tabVal => (
            <TabsContent key={tabVal} value={tabVal}>
              <div className="space-y-3">
                {filtered.filter(c => tabVal === "all" || c.entity_type === tabVal).map(c => (
                  <Card key={c.id} className="p-4 cursor-pointer hover:shadow-md transition-shadow" onClick={() => openDetail(c)}>
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <Badge className={PRIORITY_COLORS[c.priority]}>{c.priority}</Badge>
                          <Badge className={STATUS_COLORS[c.status]}>{c.status.replace(/_/g, ' ')}</Badge>
                          <Badge variant="outline">{c.category.replace(/_/g, ' ')}</Badge>
                          <Badge variant="outline">{c.entity_type}</Badge>
                        </div>
                        <h3 className="font-semibold truncate">{c.subject}</h3>
                        <p className="text-sm text-muted-foreground line-clamp-1 mt-0.5">{c.description}</p>
                        <div className="flex items-center flex-wrap gap-x-3 gap-y-1 mt-2 text-xs text-muted-foreground">
                          <span className="inline-flex items-center gap-1">
                            By:{" "}
                            {c.user_id ? (
                              <Link
                                to={`/customers?customerId=${c.user_id}`}
                                onClick={(e) => e.stopPropagation()}
                                className="text-primary hover:underline inline-flex items-center gap-1"
                                title="Open customer profile"
                              >
                                {c.user_name || 'Unknown'}
                                <ExternalLink className="h-3 w-3" />
                              </Link>
                            ) : (c.user_name || 'Unknown')}
                          </span>
                          {c.customer_email && <span>📧 {c.customer_email}</span>}
                          {c.customer_mobile && <span>📱 {c.customer_mobile}</span>}
                          {c.order_id && <span>Order: {c.order_id}</span>}
                          <span>{new Date(c.created_at).toLocaleDateString()}</span>
                        </div>
                      </div>
                    </div>
                  </Card>
                ))}
                {filtered.filter(c => tabVal === "all" || c.entity_type === tabVal).length === 0 && (
                  <div className="text-center py-12 text-muted-foreground">No complaints found</div>
                )}
              </div>
            </TabsContent>
          ))}
        </Tabs>
      </div>

      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="max-w-2xl max-h-[92vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Complaint Details</DialogTitle></DialogHeader>
          {selectedComplaint && (
            <div className="space-y-4">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Subject</p>
                <p className="font-semibold">{selectedComplaint.subject}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Description</p>
                <p className="text-sm whitespace-pre-wrap">{selectedComplaint.description}</p>
              </div>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div><span className="text-muted-foreground">Type:</span> {selectedComplaint.entity_type}</div>
                <div><span className="text-muted-foreground">Category:</span> {selectedComplaint.category.replace(/_/g, ' ')}</div>
                <div><span className="text-muted-foreground">Priority:</span> {selectedComplaint.priority}</div>
                <div>
                  <span className="text-muted-foreground">Customer:</span>{" "}
                  {selectedComplaint.user_id ? (
                    <Link
                      to={`/customers?customerId=${selectedComplaint.user_id}`}
                      className="text-primary hover:underline inline-flex items-center gap-1"
                    >
                      {selectedComplaint.user_name || 'View profile'}
                      <ExternalLink className="h-3 w-3" />
                    </Link>
                  ) : (selectedComplaint.user_name || 'N/A')}
                </div>
                <div className="col-span-2 grid grid-cols-2 gap-3 rounded-md bg-muted/40 p-2">
                  <div><span className="text-muted-foreground">Email:</span> {selectedComplaint.customer_email || 'N/A'}</div>
                  <div><span className="text-muted-foreground">Phone:</span> {selectedComplaint.customer_mobile || 'N/A'}</div>
                </div>
                {selectedComplaint.order_id && <div><span className="text-muted-foreground">Order:</span> {selectedComplaint.order_id}</div>}
              </div>

              <Separator />
              <div>
                <p className="text-sm font-medium mb-1.5">Conversation with customer</p>
                <TicketChatThread parentId={selectedComplaint.id} table="complaint_messages" parentColumn="complaint_id"
                  senderId={adminId} senderName="Support Team" viewerRole="admin" postAsRole="admin" />
              </div>

              <Separator />
              <div>
                <p className="text-sm font-medium mb-1">Update Status</p>
                <Select value={updateStatus} onValueChange={setUpdateStatus}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="open">Open</SelectItem>
                    <SelectItem value="in_progress">In Progress</SelectItem>
                    <SelectItem value="awaiting_response">Awaiting Response</SelectItem>
                    <SelectItem value="resolved">Resolved</SelectItem>
                    <SelectItem value="closed">Closed</SelectItem>
                    <SelectItem value="escalated">Escalated</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <p className="text-sm font-medium mb-1">Resolution Notes (visible to customer)</p>
                <Textarea value={resolutionNotes} onChange={e => setResolutionNotes(e.target.value)} rows={3} placeholder="Add resolution notes..." />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setDetailOpen(false)}>Cancel</Button>
            <Button onClick={handleUpdateComplaint}>Update Complaint</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
