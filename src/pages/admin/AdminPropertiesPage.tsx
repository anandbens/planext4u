import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { DataTable, SummaryWidget } from "@/components/admin/DataTable";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { Home, CheckCircle, XCircle, Clock, Eye, Shield } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";

export default function AdminPropertiesPage() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [selectedProperty, setSelectedProperty] = useState<any>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const perPage = 20;

  const { data, isLoading } = useQuery({
    queryKey: ["adminProperties", page, search, statusFilter],
    queryFn: async () => {
      let query = supabase.from("properties" as any).select("*", { count: "exact" });
      if (search) query = query.or(`title.ilike.%${search}%,city.ilike.%${search}%,locality.ilike.%${search}%`);
      if (statusFilter) query = query.eq("status", statusFilter);
      const { data, count } = await query.order("created_at", { ascending: false }).range((page - 1) * perPage, page * perPage - 1);
      return { items: (data || []) as any[], total: count || 0 };
    },
  });

  const properties = data?.items || [];
  const total = data?.total || 0;

  const handleApprove = async (id: string) => {
    const { error } = await supabase.from("properties" as any).update({ status: "active" } as any).eq("id", id);
    if (error) { toast.error(error.message); return; }
    toast.success("Property approved!");
    queryClient.invalidateQueries({ queryKey: ["adminProperties"] });
    setSelectedProperty(null);
  };

  const handleReject = async () => {
    if (!selectedProperty) return;
    const { error } = await supabase.from("properties" as any).update({ status: "rejected", rejection_reason: rejectReason } as any).eq("id", selectedProperty.id);
    if (error) { toast.error(error.message); return; }
    toast.success("Property rejected");
    queryClient.invalidateQueries({ queryKey: ["adminProperties"] });
    setShowRejectDialog(false);
    setSelectedProperty(null);
    setRejectReason("");
  };

  const handleVerify = async (id: string, verified: boolean) => {
    await supabase.from("properties" as any).update({ is_verified: verified } as any).eq("id", id);
    toast.success(verified ? "Verified!" : "Verification removed");
    queryClient.invalidateQueries({ queryKey: ["adminProperties"] });
  };

  const summaryWidgets: SummaryWidget[] = [
    { label: "Total", value: total, icon: <Home className="h-4 w-4" />, color: "bg-primary/10", textColor: "text-primary" },
    { label: "Pending", value: properties.filter((p: any) => p.status === "submitted").length, icon: <Clock className="h-4 w-4" />, color: "bg-warning/10", textColor: "text-warning" },
    { label: "Active", value: properties.filter((p: any) => p.status === "active").length, icon: <CheckCircle className="h-4 w-4" />, color: "bg-success/10", textColor: "text-success" },
    { label: "Rejected", value: properties.filter((p: any) => p.status === "rejected").length, icon: <XCircle className="h-4 w-4" />, color: "bg-destructive/10", textColor: "text-destructive" },
  ];

  const columns = [
    { key: "title", label: "Property", render: (p: any) => (
      <div className="max-w-[200px]">
        <p className="text-sm font-medium truncate">{p.title}</p>
        <p className="text-xs text-muted-foreground">{p.locality}, {p.city}</p>
      </div>
    )},
    { key: "transaction_type", label: "Type", render: (p: any) => <Badge variant="outline" className="capitalize text-[10px]">{p.transaction_type}</Badge> },
    { key: "price", label: "Price", render: (p: any) => <span className="font-medium">₹{Number(p.price).toLocaleString("en-IN")}</span> },
    { key: "posted_by", label: "Posted By", render: (p: any) => <span className="text-xs capitalize">{p.posted_by} - {p.user_name}</span> },
    { key: "status", label: "Status", render: (p: any) => <StatusBadge status={p.status} /> },
    { key: "is_verified", label: "Verified", render: (p: any) => p.is_verified ? <Shield className="h-4 w-4 text-success" /> : <span className="text-xs text-muted-foreground">No</span> },
    { key: "actions", label: "Actions", render: (p: any) => (
      <div className="flex gap-1">
        {p.status === "submitted" && (
          <>
            <Button size="sm" variant="outline" className="h-7 text-[10px] text-success border-success/30" onClick={(e) => { e.stopPropagation(); handleApprove(p.id); }}>Approve</Button>
            <Button size="sm" variant="outline" className="h-7 text-[10px] text-destructive border-destructive/30" onClick={(e) => { e.stopPropagation(); setSelectedProperty(p); setShowRejectDialog(true); }}>Reject</Button>
          </>
        )}
        <Button size="sm" variant="ghost" className="h-7 text-[10px]" onClick={(e) => { e.stopPropagation(); handleVerify(p.id, !p.is_verified); }}>
          {p.is_verified ? "Unverify" : "Verify"}
        </Button>
      </div>
    )},
  ];

  return (
    <AdminLayout>
      <DataTable
        columns={columns}
        data={properties}
        total={total}
        page={page}
        perPage={perPage}
        totalPages={Math.ceil(total / perPage)}
        onPageChange={setPage}
        onSearch={setSearch}
        summaryWidgets={summaryWidgets}
        onRowClick={(p) => setSelectedProperty(p)}
        filters={[{ key: "status", label: "Status", options: [
          { value: "", label: "All" },
          { value: "submitted", label: "Pending" },
          { value: "active", label: "Active" },
          { value: "draft", label: "Draft" },
          { value: "rejected", label: "Rejected" },
        ]}]}
        onFilterChange={(key, value) => { if (key === "status") setStatusFilter(value); }}
      />

      {/* Reject Dialog */}
      <Dialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
        <DialogContent className="max-w-sm">
          <DialogTitle>Reject Property</DialogTitle>
          <div className="space-y-3 pt-2">
            <div className="space-y-2">
              {["Incomplete information", "Fake listing", "Duplicate", "Inappropriate content", "Wrong pricing"].map((r) => (
                <button key={r} onClick={() => setRejectReason(r)}
                  className={`w-full text-left px-3 py-2 rounded-lg border text-sm transition-colors
                    ${rejectReason === r ? "border-primary bg-primary/5" : "border-border/50 hover:bg-secondary"}`}>{r}</button>
              ))}
            </div>
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
            <div className="space-y-3 pt-2">
              {Array.isArray(selectedProperty.images) && selectedProperty.images[0] && (
                <img src={selectedProperty.images[0]} alt="" className="w-full h-48 object-cover rounded-lg" />
              )}
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div><span className="text-muted-foreground">Type:</span> <span className="capitalize">{selectedProperty.transaction_type}</span></div>
                <div><span className="text-muted-foreground">Property:</span> <span className="capitalize">{selectedProperty.property_type?.replace("_", " ")}</span></div>
                <div><span className="text-muted-foreground">Price:</span> ₹{Number(selectedProperty.price).toLocaleString("en-IN")}</div>
                <div><span className="text-muted-foreground">BHK:</span> {selectedProperty.bhk || "-"}</div>
                <div><span className="text-muted-foreground">Area:</span> {selectedProperty.area_sqft || "-"} sq.ft</div>
                <div><span className="text-muted-foreground">Location:</span> {selectedProperty.locality}, {selectedProperty.city}</div>
                <div><span className="text-muted-foreground">Posted by:</span> {selectedProperty.user_name} ({selectedProperty.posted_by})</div>
                <div><span className="text-muted-foreground">Status:</span> <StatusBadge status={selectedProperty.status} /></div>
              </div>
              <p className="text-sm text-muted-foreground">{selectedProperty.description}</p>
              <div className="flex gap-2 pt-2">
                {selectedProperty.status === "submitted" && (
                  <>
                    <Button className="flex-1" onClick={() => handleApprove(selectedProperty.id)}>Approve</Button>
                    <Button variant="destructive" className="flex-1" onClick={() => setShowRejectDialog(true)}>Reject</Button>
                  </>
                )}
                <Button variant="outline" className="flex-1" onClick={() => handleVerify(selectedProperty.id, !selectedProperty.is_verified)}>
                  {selectedProperty.is_verified ? "Remove Verification" : "Verify Owner"}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </AdminLayout>
  );
}
