import { useEffect, useState, useCallback } from "react";
import { fmtTs } from "@/lib/format-date";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { DataTable, SummaryWidget } from "@/components/admin/DataTable";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { ConfirmDialog } from "@/components/admin/ConfirmDialog";
import { api, Service, PaginatedResponse } from "@/lib/api";
import { ServiceModal } from "@/components/admin/modals/ServiceModal";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Eye, Pencil, Trash2, Wrench, Star, IndianRupee, CheckCircle, Check, X as XIcon, Clock as ClockIcon } from "lucide-react";
import { exportToCSV } from "@/lib/csv";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

type TabKey = "all" | "pending_approval" | "active" | "rejected" | "draft";

export default function AdminServicesPage() {
  const [tab, setTab] = useState<TabKey>("all");
  const [data, setData] = useState<PaginatedResponse<Service> | null>(null);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [dateFrom, setDateFrom] = useState<string>();
  const [dateTo, setDateTo] = useState<string>();
  const [selected, setSelected] = useState<Service | null>(null);
  const [modalMode, setModalMode] = useState<"view" | "edit" | "create">("view");
  const [modalOpen, setModalOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmTarget, setConfirmTarget] = useState<Service | null>(null);

  // Approval review dialog state
  const [reviewService, setReviewService] = useState<Service | null>(null);
  const [reviewOpen, setReviewOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [reviewing, setReviewing] = useState(false);

  // Per-tab pending count badge
  const [pendingCount, setPendingCount] = useState<number>(0);

  const fetchData = useCallback(() => {
    const status = tab === "all" ? undefined : tab;
    api.getServices({ page, per_page: 10, search: search || undefined, date_from: dateFrom, date_to: dateTo, status }).then(setData);
  }, [page, search, dateFrom, dateTo, tab]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // Fetch pending count for badge regardless of selected tab
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { count } = await supabase
        .from("services")
        .select("id", { count: "exact", head: true })
        .eq("status", "pending_approval");
      if (!cancelled) setPendingCount(count || 0);
    })();
    return () => { cancelled = true; };
  }, [data]);

  const openModal = (service: Service | null, mode: "view" | "edit" | "create") => {
    setSelected(service); setModalMode(mode); setModalOpen(true);
  };

  const openReview = (service: Service) => {
    setReviewService(service); setRejectReason(""); setReviewOpen(true);
  };

  const handleApprove = async () => {
    if (!reviewService) return;
    setReviewing(true);
    try {
      await api.approveService(reviewService.id);
      toast.success("Service approved & published");
      setReviewOpen(false);
      fetchData();
    } catch (err: any) { toast.error("Approve failed: " + (err.message || "Unknown error")); }
    finally { setReviewing(false); }
  };

  const handleReject = async () => {
    if (!reviewService) return;
    if (!rejectReason.trim()) { toast.error("Rejection reason is required"); return; }
    setReviewing(true);
    try {
      await api.rejectService(reviewService.id, rejectReason.trim());
      toast.success("Service rejected — vendor will be notified");
      setReviewOpen(false);
      fetchData();
    } catch (err: any) { toast.error("Reject failed: " + (err.message || "Unknown error")); }
    finally { setReviewing(false); }
  };

  const handleSave = async (id: string, updates: Partial<Service>) => {
    try { await api.updateService(id, updates); toast.success("Service updated"); fetchData(); }
    catch (err: any) { toast.error("Failed to update service: " + (err.message || "Unknown error")); }
  };
  const handleCreate = async (data: Partial<Service>) => {
    try { await api.createService(data); toast.success("Service created"); fetchData(); }
    catch (err: any) { toast.error("Failed to create service: " + (err.message || "Unknown error")); }
  };
  const handleDelete = async (id: string) => {
    try { await api.deleteService(id); toast.success("Service deleted"); fetchData(); }
    catch (err: any) { toast.error("Failed to delete service: " + (err.message || "Unknown error")); }
  };

  const handleBulkDelete = async (ids: string[]) => {
    await api.bulkDeleteServices(ids);
    toast.success(`${ids.length} services deleted`);
    fetchData();
  };

  const handleBulkStatus = async (ids: string[], status: string) => {
    await api.bulkUpdateServiceStatus(ids, status);
    toast.success(`${ids.length} services updated to ${status}`);
    fetchData();
  };

  const handleExport = () => {
    if (!data) return;
    exportToCSV(data.data, [
      { key: "id", label: "ID" }, { key: "title", label: "Title" },
      { key: "vendor_name", label: "Vendor" }, { key: "price", label: "Price" },
      { key: "status", label: "Status" }, { key: "rating", label: "Rating" },
    ], "services");
    toast.success("CSV exported");
  };

  if (!data) return <AdminLayout><div className="flex items-center justify-center h-64"><div className="h-8 w-8 rounded-full border-2 border-primary border-t-transparent animate-spin" /></div></AdminLayout>;

  const active = data.data.filter(s => s.status === 'active').length;
  const avgRating = data.data.length ? (data.data.reduce((s, sv) => s + (sv.rating || 0), 0) / data.data.length).toFixed(1) : '0';
  const avgPrice = data.data.length ? Math.round(data.data.reduce((s, sv) => s + sv.price, 0) / data.data.length) : 0;

  const summaryWidgets: SummaryWidget[] = [
    { label: "Total Services", value: data.total, icon: <Wrench className="h-5 w-5 text-primary" />, color: "bg-primary/5" },
    { label: "Active", value: active, icon: <CheckCircle className="h-5 w-5 text-success" />, color: "bg-success/5", textColor: "text-success" },
    { label: "Pending Approval", value: pendingCount, icon: <ClockIcon className="h-5 w-5 text-warning" />, color: "bg-warning/5", textColor: "text-warning" },
    { label: "Avg Price", value: `₹${avgPrice.toLocaleString()}`, icon: <IndianRupee className="h-5 w-5 text-info" />, color: "bg-info/5", textColor: "text-info" },
  ];

  const isPendingTab = tab === "pending_approval";

  return (
    <AdminLayout>
      <div className="page-header">
        <h1 className="page-title">Services</h1>
        <p className="page-description">{data.total} services listed</p>
      </div>

      <Tabs value={tab} onValueChange={(v) => { setTab(v as TabKey); setPage(1); }} className="mb-4">
        <TabsList>
          <TabsTrigger value="all">All</TabsTrigger>
          <TabsTrigger value="pending_approval" className="gap-2">
            Pending Approval
            {pendingCount > 0 && <Badge variant="destructive" className="h-5 px-1.5 text-[10px]">{pendingCount}</Badge>}
          </TabsTrigger>
          <TabsTrigger value="active">Active</TabsTrigger>
          <TabsTrigger value="rejected">Rejected</TabsTrigger>
          <TabsTrigger value="draft">Draft</TabsTrigger>
        </TabsList>
      </Tabs>

      <DataTable
        columns={[
          { key: "id", label: "ID" },
          { key: "title", label: "Service", render: (s) => (
            <div className="flex items-center gap-2">
              {(s as any).image
                ? <img src={(s as any).image} alt={s.title} className="h-9 w-9 rounded object-cover" loading="lazy" />
                : <div className="h-9 w-9 rounded bg-muted flex items-center justify-center text-base">{s.emoji}</div>}
              <div className="min-w-0"><p className="font-medium truncate">{s.title}</p><p className="text-xs text-muted-foreground truncate">{s.category_name}</p></div>
            </div>
          )},
          { key: "vendor_name", label: "Vendor" },
          { key: "price", label: "Price", render: (s) => <span className="font-semibold">₹{s.price.toLocaleString()}</span> },
          { key: "duration", label: "Duration" },
          { key: "rating", label: "Rating", render: (s) => <span>⭐ {s.rating}</span> },
          { key: "status", label: "Status", render: (s) => <StatusBadge status={s.status} /> },
          { key: "created_at", label: "Created", render: (s: any) => <span className="text-xs text-muted-foreground whitespace-nowrap">{fmtTs(s.created_at)}</span> },
          { key: "updated_at", label: "Updated", render: (s: any) => <span className="text-xs text-muted-foreground whitespace-nowrap">{fmtTs(s.updated_at || s.created_at)}</span> },
          { key: "actions", label: "", render: (s) => (
            <div className="flex gap-1">
              {(isPendingTab || s.status === 'pending_approval') && (
                <Button variant="default" size="sm" className="h-7 gap-1 bg-success hover:bg-success/90" onClick={(e) => { e.stopPropagation(); openReview(s); }}>
                  <Check className="h-3.5 w-3.5" /> Review
                </Button>
              )}
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={(e) => { e.stopPropagation(); openModal(s, "view"); }}><Eye className="h-4 w-4" /></Button>
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={(e) => { e.stopPropagation(); openModal(s, "edit"); }}><Pencil className="h-4 w-4" /></Button>
              <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={(e) => { e.stopPropagation(); setConfirmTarget(s); setConfirmOpen(true); }}><Trash2 className="h-4 w-4" /></Button>
            </div>
          )},
        ]}
        data={data.data}
        total={data.total}
        page={data.page}
        perPage={data.per_page}
        totalPages={data.total_pages}
        onPageChange={setPage}
        onSearch={setSearch}
        onExport={handleExport}
        onAdd={() => openModal(null, "create")}
        addLabel="Add Service"
        onRowClick={(s) => isPendingTab ? openReview(s) : openModal(s, "view")}
        onDateRangeChange={(f, t) => { setDateFrom(f); setDateTo(t); setPage(1); }}
        searchPlaceholder="Search services..."
        summaryWidgets={summaryWidgets}
        enableBulkSelect
        onBulkDelete={handleBulkDelete}
        onBulkStatusUpdate={handleBulkStatus}
        bulkStatusOptions={[
          { value: "active", label: "Approve (Active)" },
          { value: "inactive", label: "Inactive" },
          { value: "draft", label: "Draft" },
          { value: "pending_approval", label: "Pending Approval" },
          { value: "rejected", label: "Rejected" },
        ]}
      />

      <ServiceModal service={selected} open={modalOpen} onOpenChange={setModalOpen} mode={modalMode} onSave={handleSave} onCreate={handleCreate} onDelete={handleDelete} />

      <ConfirmDialog open={confirmOpen} onOpenChange={setConfirmOpen} title="Delete Service" description={`Delete "${confirmTarget?.title}"?`} confirmLabel="Delete" variant="destructive"
        onConfirm={async () => { if (confirmTarget) { await handleDelete(confirmTarget.id); setConfirmOpen(false); } }} />

      {/* Approval review dialog */}
      <Dialog open={reviewOpen} onOpenChange={setReviewOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ClockIcon className="h-5 w-5 text-warning" />
              Review Service Submission
            </DialogTitle>
            <DialogDescription>
              Review the service details below, then approve to publish or reject with a reason.
            </DialogDescription>
          </DialogHeader>

          {reviewService && (
            <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-1">
              <div className="flex gap-3">
                {(reviewService as any).image ? (
                  <img src={(reviewService as any).image} alt={reviewService.title}
                    className="h-24 w-24 rounded-lg object-cover border" />
                ) : (
                  <div className="h-24 w-24 rounded-lg bg-muted flex items-center justify-center text-3xl border">{reviewService.emoji}</div>
                )}
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold">{reviewService.title}</h3>
                  <p className="text-sm text-muted-foreground">{reviewService.category_name}</p>
                  <p className="text-sm mt-1">By <span className="font-medium">{reviewService.vendor_name}</span></p>
                  <div className="flex items-center gap-3 mt-2 text-sm">
                    <span className="font-semibold">₹{reviewService.price.toLocaleString()}</span>
                    <span className="text-muted-foreground">· {reviewService.duration}</span>
                    <StatusBadge status={reviewService.status} />
                  </div>
                </div>
              </div>

              {reviewService.description && (
                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">Description</p>
                  <p className="text-sm whitespace-pre-wrap">{reviewService.description}</p>
                </div>
              )}

              {reviewService.service_area && (
                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">Service Area</p>
                  <p className="text-sm">{reviewService.service_area}</p>
                </div>
              )}

              {Array.isArray((reviewService as any).images) && (reviewService as any).images.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Gallery</p>
                  <div className="flex gap-2 flex-wrap">
                    {(reviewService as any).images.slice(0, 6).map((img: string, i: number) => (
                      <img key={i} src={img} alt={`Gallery ${i}`} className="h-16 w-16 rounded object-cover border" />
                    ))}
                  </div>
                </div>
              )}

              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">
                  Rejection Reason <span className="text-destructive">*</span> <span className="font-normal normal-case text-muted-foreground">(required only when rejecting)</span>
                </p>
                <Textarea
                  placeholder="e.g. Service description is incomplete; please add operating hours and detailed scope of work."
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  rows={3}
                />
              </div>
            </div>
          )}

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setReviewOpen(false)} disabled={reviewing}>Cancel</Button>
            <Button variant="destructive" onClick={handleReject} disabled={reviewing || !rejectReason.trim()} className="gap-1">
              <XIcon className="h-4 w-4" /> Reject
            </Button>
            <Button onClick={handleApprove} disabled={reviewing} className="bg-success hover:bg-success/90 gap-1">
              <Check className="h-4 w-4" /> Approve & Publish
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
