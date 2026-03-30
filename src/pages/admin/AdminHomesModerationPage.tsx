import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { DataTable, SummaryWidget } from "@/components/admin/DataTable";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card } from "@/components/ui/card";
import { Clock, AlertTriangle, Flag, CheckCircle, XCircle, Shield, Eye, MessageCircle } from "lucide-react";

export default function AdminHomesModerationPage() {
  const qc = useQueryClient();
  const [tab, setTab] = useState("pending");
  const [search, setSearch] = useState("");
  const [selectedProperty, setSelectedProperty] = useState<any>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const { data: allProperties } = useQuery({
    queryKey: ["moderationProperties"],
    queryFn: async () => {
      const { data } = await supabase.from("properties").select("*").order("created_at", { ascending: false });
      return (data || []) as any[];
    },
  });

  const { data: reports } = useQuery({
    queryKey: ["propertyReports"],
    queryFn: async () => {
      const { data } = await supabase.from("property_reports").select("*").order("created_at", { ascending: false });
      return (data || []) as any[];
    },
  });

  const all = allProperties || [];
  const pending = all.filter((p: any) => p.status === "submitted");
  const reported = reports || [];
  const flagged = all.filter((p: any) => !p.images || (Array.isArray(p.images) && p.images.length === 0));

  const getItems = () => {
    let items: any[] = [];
    if (tab === "pending") items = pending;
    else if (tab === "reported") items = reported;
    else if (tab === "flagged") items = flagged;
    
    if (search) {
      items = items.filter((i: any) => 
        i.title?.toLowerCase().includes(search.toLowerCase()) ||
        i.city?.toLowerCase().includes(search.toLowerCase()) ||
        i.reason?.toLowerCase().includes(search.toLowerCase())
      );
    }
    return items;
  };

  const handleApprove = async (id: string) => {
    await supabase.from("properties").update({ status: "active" as any }).eq("id", id);
    toast.success("Approved!");
    qc.invalidateQueries({ queryKey: ["moderationProperties"] });
    setSelectedProperty(null);
  };

  const handleReject = async () => {
    if (!selectedProperty) return;
    await supabase.from("properties").update({ status: "rejected" as any, rejection_reason: rejectReason } as any).eq("id", selectedProperty.id);
    toast.success("Rejected");
    qc.invalidateQueries({ queryKey: ["moderationProperties"] });
    setShowRejectDialog(false);
    setSelectedProperty(null);
    setRejectReason("");
  };

  const handleBulkApprove = async () => {
    for (const id of selectedIds) {
      await supabase.from("properties").update({ status: "active" as any }).eq("id", id);
    }
    toast.success(`${selectedIds.length} properties approved`);
    setSelectedIds([]);
    qc.invalidateQueries({ queryKey: ["moderationProperties"] });
  };

  const handleBulkReject = async () => {
    for (const id of selectedIds) {
      await supabase.from("properties").update({ status: "rejected" as any, rejection_reason: "Bulk rejected by admin" } as any).eq("id", id);
    }
    toast.success(`${selectedIds.length} properties rejected`);
    setSelectedIds([]);
    qc.invalidateQueries({ queryKey: ["moderationProperties"] });
  };

  const handleDismissReport = async (reportId: string) => {
    await supabase.from("property_reports").update({ status: "dismissed" }).eq("id", reportId);
    toast.success("Report dismissed");
    qc.invalidateQueries({ queryKey: ["propertyReports"] });
  };

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const rejectReasons = ["No photos uploaded", "Fake listing suspected", "Incorrect pricing", "Duplicate listing", "Inappropriate content", "Incomplete information"];

  const pendingColumns = [
    { key: "select", label: "", render: (p: any) => (
      <input type="checkbox" checked={selectedIds.includes(p.id)} onChange={() => toggleSelect(p.id)} className="rounded" />
    )},
    { key: "title", label: "Property", render: (p: any) => (
      <div className="max-w-[200px]">
        <p className="text-sm font-medium truncate">{p.title}</p>
        <p className="text-xs text-muted-foreground">{p.locality}, {p.city}</p>
      </div>
    )},
    { key: "transaction_type", label: "Type", render: (p: any) => <Badge variant="outline" className="text-[10px] capitalize">{p.transaction_type}</Badge> },
    { key: "price", label: "Price", render: (p: any) => <span className="font-medium text-sm">₹{Number(p.price).toLocaleString("en-IN")}</span> },
    { key: "posted_by", label: "By", render: (p: any) => <span className="text-xs capitalize">{p.posted_by}</span> },
    { key: "images", label: "Photos", render: (p: any) => {
      const count = Array.isArray(p.images) ? p.images.length : 0;
      return <Badge variant={count === 0 ? "destructive" : "outline"} className="text-[10px]">{count}</Badge>;
    }},
    { key: "created_at", label: "Submitted", render: (p: any) => <span className="text-xs">{new Date(p.created_at).toLocaleDateString("en-IN", { day: "2-digit", month: "short" })}</span> },
    { key: "actions", label: "Actions", render: (p: any) => (
      <div className="flex gap-1">
        <Button size="sm" variant="outline" className="h-7 text-[10px] text-success border-success/30" onClick={(e) => { e.stopPropagation(); handleApprove(p.id); }}>
          <CheckCircle className="h-3 w-3 mr-1" />Approve
        </Button>
        <Button size="sm" variant="outline" className="h-7 text-[10px] text-destructive border-destructive/30" onClick={(e) => { e.stopPropagation(); setSelectedProperty(p); setShowRejectDialog(true); }}>
          <XCircle className="h-3 w-3 mr-1" />Reject
        </Button>
        <Button size="sm" variant="ghost" className="h-7 text-[10px]" onClick={(e) => { e.stopPropagation(); setSelectedProperty(p); }}>
          <Eye className="h-3 w-3" />
        </Button>
      </div>
    )},
  ];

  const reportColumns = [
    { key: "reason", label: "Reason", render: (r: any) => <p className="text-sm">{r.reason}</p> },
    { key: "details", label: "Details", render: (r: any) => <p className="text-xs text-muted-foreground truncate max-w-[200px]">{r.details || "—"}</p> },
    { key: "property_id", label: "Property", render: (r: any) => <code className="text-[10px] bg-muted px-1 rounded">{r.property_id?.slice(0, 12)}...</code> },
    { key: "status", label: "Status", render: (r: any) => <StatusBadge status={r.status} /> },
    { key: "created_at", label: "Date", render: (r: any) => <span className="text-xs">{new Date(r.created_at).toLocaleDateString("en-IN", { day: "2-digit", month: "short" })}</span> },
    { key: "actions", label: "", render: (r: any) => r.status === "pending" && (
      <div className="flex gap-1">
        <Button size="sm" variant="outline" className="h-7 text-[10px]" onClick={(e) => { e.stopPropagation(); handleDismissReport(r.id); }}>Dismiss</Button>
        <Button size="sm" variant="destructive" className="h-7 text-[10px]" onClick={async (e) => {
          e.stopPropagation();
          await supabase.from("properties").update({ status: "rejected" as any, rejection_reason: r.reason } as any).eq("id", r.property_id);
          await supabase.from("property_reports").update({ status: "resolved" }).eq("id", r.id);
          toast.success("Property removed");
          qc.invalidateQueries({ queryKey: ["moderationProperties", "propertyReports"] });
        }}>Remove Listing</Button>
      </div>
    )},
  ];

  const summaryWidgets: SummaryWidget[] = [
    { label: "Pending Review", value: pending.length, icon: <Clock className="h-4 w-4" />, color: "bg-warning/10", textColor: "text-warning" },
    { label: "Reports", value: reported.filter((r: any) => r.status === "pending").length, icon: <Flag className="h-4 w-4" />, color: "bg-destructive/10", textColor: "text-destructive" },
    { label: "No Photos", value: flagged.length, icon: <AlertTriangle className="h-4 w-4" />, color: "bg-orange-500/10", textColor: "text-orange-500" },
  ];

  return (
    <AdminLayout>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold">Moderation Queue</h1>
          {selectedIds.length > 0 && tab === "pending" && (
            <div className="flex gap-2">
              <Button size="sm" variant="outline" className="text-success border-success/30" onClick={handleBulkApprove}>
                <CheckCircle className="h-4 w-4 mr-1" /> Approve {selectedIds.length}
              </Button>
              <Button size="sm" variant="outline" className="text-destructive border-destructive/30" onClick={handleBulkReject}>
                <XCircle className="h-4 w-4 mr-1" /> Reject {selectedIds.length}
              </Button>
            </div>
          )}
        </div>

        {/* Summary */}
        <div className="grid grid-cols-3 gap-3">
          {summaryWidgets.map(w => (
            <Card key={w.label} className={`p-3 ${w.color}`}>
              <div className="flex items-center gap-2">
                {w.icon}
                <div>
                  <p className="text-2xl font-bold">{w.value}</p>
                  <p className="text-xs text-muted-foreground">{w.label}</p>
                </div>
              </div>
            </Card>
          ))}
        </div>

        <Tabs value={tab} onValueChange={setTab}>
          <TabsList>
            <TabsTrigger value="pending">Pending ({pending.length})</TabsTrigger>
            <TabsTrigger value="reported">Reported ({reported.filter((r: any) => r.status === "pending").length})</TabsTrigger>
            <TabsTrigger value="flagged">Auto-Flagged ({flagged.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="pending">
            <DataTable columns={pendingColumns} data={getItems()} total={getItems().length} page={1} perPage={50} totalPages={1} onPageChange={() => {}} onSearch={setSearch} />
          </TabsContent>
          <TabsContent value="reported">
            <DataTable columns={reportColumns} data={getItems()} total={getItems().length} page={1} perPage={50} totalPages={1} onPageChange={() => {}} onSearch={setSearch} />
          </TabsContent>
          <TabsContent value="flagged">
            <DataTable columns={pendingColumns.filter(c => c.key !== "select")} data={getItems()} total={getItems().length} page={1} perPage={50} totalPages={1} onPageChange={() => {}} onSearch={setSearch} />
          </TabsContent>
        </Tabs>
      </div>

      {/* Reject Dialog */}
      <Dialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
        <DialogContent className="max-w-sm">
          <DialogTitle>Reject Property</DialogTitle>
          <div className="space-y-3 pt-2">
            {rejectReasons.map(r => (
              <button key={r} onClick={() => setRejectReason(r)}
                className={`w-full text-left px-3 py-2 rounded-lg border text-sm transition-colors
                  ${rejectReason === r ? "border-primary bg-primary/5" : "border-border/50 hover:bg-secondary"}`}>{r}</button>
            ))}
            <Textarea placeholder="Additional notes..." value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} rows={2} />
            <Button className="w-full" variant="destructive" onClick={handleReject}>Reject Listing</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Detail View */}
      {selectedProperty && !showRejectDialog && (
        <Dialog open={!!selectedProperty} onOpenChange={() => setSelectedProperty(null)}>
          <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
            <DialogTitle>{selectedProperty.title}</DialogTitle>
            <div className="space-y-4 pt-2">
              {Array.isArray(selectedProperty.images) && selectedProperty.images.length > 0 && (
                <div className="grid grid-cols-3 gap-2">
                  {selectedProperty.images.slice(0, 6).map((img: string, i: number) => (
                    <img key={i} src={img} alt="" className="w-full h-24 object-cover rounded-lg" />
                  ))}
                </div>
              )}
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div><span className="text-muted-foreground">Type:</span> <span className="capitalize">{selectedProperty.transaction_type}</span></div>
                <div><span className="text-muted-foreground">Property:</span> <span className="capitalize">{selectedProperty.property_type?.replace(/_/g, " ")}</span></div>
                <div><span className="text-muted-foreground">Price:</span> ₹{Number(selectedProperty.price).toLocaleString("en-IN")}</div>
                <div><span className="text-muted-foreground">BHK:</span> {selectedProperty.bhk || "—"}</div>
                <div><span className="text-muted-foreground">Area:</span> {selectedProperty.area_sqft || "—"} sq.ft</div>
                <div><span className="text-muted-foreground">Floor:</span> {selectedProperty.floor_number || "—"}/{selectedProperty.total_floors || "—"}</div>
                <div><span className="text-muted-foreground">Furnishing:</span> <span className="capitalize">{selectedProperty.furnishing?.replace(/_/g, " ") || "—"}</span></div>
                <div><span className="text-muted-foreground">Parking:</span> <span className="capitalize">{selectedProperty.parking?.replace(/_/g, " ") || "—"}</span></div>
                <div><span className="text-muted-foreground">Facing:</span> <span className="capitalize">{selectedProperty.facing?.replace(/_/g, " ") || "—"}</span></div>
                <div><span className="text-muted-foreground">Location:</span> {selectedProperty.locality}, {selectedProperty.city}</div>
                <div><span className="text-muted-foreground">Posted by:</span> {selectedProperty.user_name} ({selectedProperty.posted_by})</div>
                <div><span className="text-muted-foreground">Views:</span> {selectedProperty.views_count || 0}</div>
                <div><span className="text-muted-foreground">Enquiries:</span> {selectedProperty.enquiry_count || 0}</div>
                <div><span className="text-muted-foreground">Deposit:</span> ₹{Number(selectedProperty.security_deposit || 0).toLocaleString("en-IN")}</div>
              </div>
              {selectedProperty.description && <p className="text-sm text-muted-foreground border-t pt-2">{selectedProperty.description}</p>}
              {Array.isArray(selectedProperty.amenities) && selectedProperty.amenities.length > 0 && (
                <div className="border-t pt-2">
                  <p className="text-xs font-medium mb-1">Amenities</p>
                  <div className="flex flex-wrap gap-1">
                    {selectedProperty.amenities.map((a: string, i: number) => (
                      <Badge key={i} variant="outline" className="text-[10px]">{a}</Badge>
                    ))}
                  </div>
                </div>
              )}
              <div className="flex gap-2 pt-2 border-t">
                {selectedProperty.status === "submitted" && (
                  <>
                    <Button className="flex-1" onClick={() => handleApprove(selectedProperty.id)}>
                      <CheckCircle className="h-4 w-4 mr-1" /> Approve
                    </Button>
                    <Button variant="destructive" className="flex-1" onClick={() => setShowRejectDialog(true)}>
                      <XCircle className="h-4 w-4 mr-1" /> Reject
                    </Button>
                  </>
                )}
                <Button variant="outline" className="flex-1" onClick={async () => {
                  await supabase.from("properties").update({ is_verified: !selectedProperty.is_verified } as any).eq("id", selectedProperty.id);
                  toast.success(selectedProperty.is_verified ? "Verification removed" : "Verified!");
                  qc.invalidateQueries({ queryKey: ["moderationProperties"] });
                  setSelectedProperty(null);
                }}>
                  <Shield className="h-4 w-4 mr-1" /> {selectedProperty.is_verified ? "Unverify" : "Verify"}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </AdminLayout>
  );
}
