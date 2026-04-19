import { useEffect, useState, useCallback } from "react";
import { fmtTs } from "@/lib/format-date";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { DataTable, SummaryWidget } from "@/components/admin/DataTable";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { ConfirmDialog } from "@/components/admin/ConfirmDialog";
import { ClassifiedModal } from "@/components/admin/modals/ClassifiedModal";
import { api, ClassifiedAd, PaginatedResponse } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { CheckCircle, XCircle, Megaphone, Clock, ShieldCheck, IndianRupee } from "lucide-react";
import { toast } from "sonner";
import { exportToCSV } from "@/lib/csv";

export default function ClassifiedsPage() {
  const [data, setData] = useState<PaginatedResponse<ClassifiedAd> | null>(null);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [dateFrom, setDateFrom] = useState<string>();
  const [dateTo, setDateTo] = useState<string>();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmAction, setConfirmAction] = useState<{ ad: ClassifiedAd; action: "approve" | "reject" } | null>(null);
  const [selectedAd, setSelectedAd] = useState<ClassifiedAd | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<"view" | "edit">("view");

  const fetchData = useCallback(() => {
    api.getClassifiedAds({ page, per_page: 10, status: statusFilter || undefined, date_from: dateFrom, date_to: dateTo }).then(setData);
  }, [page, statusFilter, dateFrom, dateTo]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleAction = async () => {
    if (!confirmAction) return;
    const status = confirmAction.action === "approve" ? "approved" : "rejected";
    await api.updateClassifiedStatus(confirmAction.ad.id, status as ClassifiedAd['status']);
    toast.success(`Ad ${status}`);
    setConfirmOpen(false);
    setConfirmAction(null);
    fetchData();
  };

  const handleBulkStatus = async (ids: string[], status: string) => {
    await api.bulkUpdateClassifiedStatus(ids, status);
    toast.success(`${ids.length} ads updated to ${status}`);
    fetchData();
  };

  const handleSave = async (id: string, updates: Partial<ClassifiedAd>) => {
    await api.updateClassifiedStatus(id, updates.status as ClassifiedAd['status']);
    // Update images and other fields via direct supabase update
    const { supabase } = await import("@/integrations/supabase/client");
    await supabase.from("classified_ads").update({
      title: updates.title,
      description: updates.description,
      price: updates.price,
      category: updates.category,
      city: updates.city,
      area: updates.area,
      images: updates.images,
      status: updates.status,
    }).eq("id", id);
    toast.success("Ad updated");
    fetchData();
  };

  const handleDelete = async (id: string) => {
    const { supabase } = await import("@/integrations/supabase/client");
    await supabase.from("classified_ads").delete().eq("id", id);
    toast.success("Ad deleted");
    fetchData();
  };

  const handleExport = () => {
    if (!data) return;
    exportToCSV(data.data, [
      { key: "id", label: "ID" }, { key: "title", label: "Title" },
      { key: "price", label: "Price" }, { key: "city", label: "City" },
      { key: "user_name", label: "Posted By" }, { key: "status", label: "Status" },
    ], "classifieds");
    toast.success("CSV exported");
  };

  if (!data) return <AdminLayout><div className="flex items-center justify-center h-64"><div className="h-8 w-8 rounded-full border-2 border-primary border-t-transparent animate-spin" /></div></AdminLayout>;

  const pending = data.data.filter(a => a.status === 'pending').length;
  const approved = data.data.filter(a => a.status === 'approved').length;
  const totalValue = data.data.reduce((s, a) => s + a.price, 0);

  const summaryWidgets: SummaryWidget[] = [
    { label: "Total Ads", value: data.total, icon: <Megaphone className="h-5 w-5 text-primary" />, color: "bg-primary/5" },
    { label: "Pending Review", value: pending, icon: <Clock className="h-5 w-5 text-warning" />, color: "bg-warning/5", textColor: "text-warning" },
    { label: "Approved", value: approved, icon: <ShieldCheck className="h-5 w-5 text-success" />, color: "bg-success/5", textColor: "text-success" },
    { label: "Total Value", value: `₹${totalValue.toLocaleString()}`, icon: <IndianRupee className="h-5 w-5 text-info" />, color: "bg-info/5", textColor: "text-info" },
  ];

  return (
    <AdminLayout>
      <div className="page-header">
        <h1 className="page-title">Classified Ads</h1>
        <p className="page-description">{data.total.toLocaleString()} ads · Admin approval required</p>
      </div>
      <DataTable
        columns={[
          { key: "id", label: "ID" },
          { key: "image", label: "Image", render: (a) => {
            const images = Array.isArray((a as any).images) ? (a as any).images : [];
            return images.length > 0 ? (
              <img src={images[0]} alt={a.title} className="h-10 w-10 rounded-lg object-cover" />
            ) : (
              <div className="h-10 w-10 rounded-lg bg-secondary/30 flex items-center justify-center text-lg">📦</div>
            );
          }},
          { key: "title", label: "Title", render: (a) => (
            <div><p className="font-medium">{a.title}</p><p className="text-xs text-muted-foreground">{a.category}</p></div>
          )},
          { key: "price", label: "Price", render: (a) => <span className="font-semibold">₹{a.price.toLocaleString()}</span> },
          { key: "city", label: "Location", render: (a) => `${a.area}, ${a.city}` },
          { key: "user_name", label: "Posted By" },
          { key: "status", label: "Status", render: (a) => <StatusBadge status={a.status} /> },
          { key: "created_at", label: "Created", render: (a: any) => <span className="text-xs text-muted-foreground whitespace-nowrap">{fmtTs(a.created_at)}</span> },
          { key: "updated_at", label: "Updated", render: (a: any) => <span className="text-xs text-muted-foreground whitespace-nowrap">{fmtTs(a.updated_at || a.created_at)}</span> },
          { key: "actions", label: "", render: (a) => a.status === 'pending' ? (
            <div className="flex gap-1">
              <Button variant="ghost" size="icon" className="h-7 w-7 text-success" onClick={(e) => { e.stopPropagation(); setConfirmAction({ ad: a, action: "approve" }); setConfirmOpen(true); }}><CheckCircle className="h-4 w-4" /></Button>
              <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={(e) => { e.stopPropagation(); setConfirmAction({ ad: a, action: "reject" }); setConfirmOpen(true); }}><XCircle className="h-4 w-4" /></Button>
            </div>
          ) : null },
        ]}
        data={data.data}
        total={data.total}
        page={data.page}
        perPage={data.per_page}
        totalPages={data.total_pages}
        onPageChange={setPage}
        onSearch={setSearch}
        onExport={handleExport}
        onFilterChange={(key, val) => { if (key === "status") { setStatusFilter(val); setPage(1); } }}
        onDateRangeChange={(f, t) => { setDateFrom(f); setDateTo(t); setPage(1); }}
        searchPlaceholder="Search ads..."
        filters={[{ key: "status", label: "Status", options: [
          { value: "pending", label: "Pending" }, { value: "approved", label: "Approved" },
          { value: "rejected", label: "Rejected" }, { value: "expired", label: "Expired" }, { value: "sold", label: "Sold" },
        ]}]}
        summaryWidgets={summaryWidgets}
        enableBulkSelect
        onBulkStatusUpdate={handleBulkStatus}
        bulkStatusOptions={[
          { value: "approved", label: "Approve" },
          { value: "rejected", label: "Reject" },
        ]}
        onRowClick={(ad) => { setSelectedAd(ad); setModalMode("view"); setModalOpen(true); }}
      />
      <ClassifiedModal
        ad={selectedAd}
        open={modalOpen}
        onOpenChange={setModalOpen}
        mode={modalMode}
        onSave={handleSave}
        onDelete={handleDelete}
        onModeChange={setModalMode}
      />
      <ConfirmDialog open={confirmOpen} onOpenChange={setConfirmOpen}
        title={confirmAction?.action === "approve" ? "Approve Ad" : "Reject Ad"}
        description={`${confirmAction?.action === "approve" ? "Approve" : "Reject"} "${confirmAction?.ad.title}"?`}
        confirmLabel={confirmAction?.action === "approve" ? "Approve" : "Reject"}
        variant={confirmAction?.action === "approve" ? "default" : "destructive"}
        onConfirm={handleAction} />
    </AdminLayout>
  );
}
