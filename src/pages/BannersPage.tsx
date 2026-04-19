import { useEffect, useState, useCallback } from "react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { DataTable, SummaryWidget } from "@/components/admin/DataTable";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { ConfirmDialog } from "@/components/admin/ConfirmDialog";
import { BannerModal } from "@/components/admin/modals/BannerModal";
import { api, Banner, PaginatedResponse } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Eye, Pencil, Trash2, Image, CheckCircle, Clock } from "lucide-react";
import { exportToCSV } from "@/lib/csv";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

function genId(prefix: string) {
  return `${prefix}-${String(Math.floor(Math.random() * 999) + 1).padStart(3, '0')}-${Date.now().toString(36).slice(-4)}`;
}

export default function BannersPage() {
  const [allData, setAllData] = useState<Banner[]>([]);
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<Banner | null>(null);
  const [modalMode, setModalMode] = useState<"view" | "edit" | "create">("view");
  const [modalOpen, setModalOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmTarget, setConfirmTarget] = useState<Banner | null>(null);

  const fetchData = useCallback(() => {
    api.getBanners().then(setAllData);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const perPage = 10;
  const totalPages = Math.ceil(allData.length / perPage);
  const paginated = allData.slice((page - 1) * perPage, page * perPage);

  const openModal = (banner: Banner | null, mode: "view" | "edit" | "create") => {
    setSelected(banner); setModalMode(mode); setModalOpen(true);
  };

  const handleSave = async (id: string, updates: Partial<Banner>) => {
    await api.updateBanner(id, updates);
    toast.success("Banner updated");
    fetchData();
  };

  const handleCreate = async (data: Partial<Banner>) => {
    const newBanner = { id: genId("BNR"), ...data };
    const { error } = await supabase.from("banners").insert(newBanner as any);
    if (error) throw error;
    toast.success("Banner created");
    fetchData();
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from("banners").delete().eq("id", id);
    if (error) throw error;
    toast.success("Banner deleted");
    fetchData();
  };

  const handleExport = () => {
    exportToCSV(allData, [
      { key: "id", label: "ID" }, { key: "title", label: "Title" },
      { key: "subtitle", label: "Subtitle" }, { key: "link", label: "Link" },
      { key: "priority", label: "Priority" }, { key: "status", label: "Status" },
    ], "banners");
    toast.success("CSV exported");
  };

  const active = allData.filter(b => b.status === "active").length;
  const summaryWidgets: SummaryWidget[] = [
    { label: "Total Banners", value: allData.length, icon: <Image className="h-5 w-5 text-primary" />, color: "bg-primary/5" },
    { label: "Active", value: active, icon: <CheckCircle className="h-5 w-5 text-success" />, color: "bg-success/5", textColor: "text-success" },
    { label: "Inactive", value: allData.length - active, icon: <Clock className="h-5 w-5 text-warning" />, color: "bg-warning/5", textColor: "text-warning" },
  ];

  return (
    <AdminLayout>
      <div className="page-header">
        <h1 className="page-title">Banners</h1>
        <p className="page-description">{allData.length} banners configured — these appear on the home page carousel</p>
      </div>
      <DataTable
        columns={[
          { key: "id", label: "ID" },
          { key: "preview", label: "Preview", render: (b) => b.desktop_image ? (
            <img src={b.desktop_image} alt={b.title} className="h-10 w-20 rounded object-cover" />
          ) : <div className={`h-10 w-20 rounded bg-gradient-to-r ${b.gradient || 'from-primary to-primary/70'}`} /> },
          { key: "title", label: "Banner", render: (b) => (
            <div><p className="font-medium">{b.title}</p><p className="text-xs text-muted-foreground">{b.subtitle}</p></div>
          )},
          { key: "link", label: "Link", render: (b) => <code className="text-xs bg-secondary px-2 py-0.5 rounded">{b.link}</code> },
          { key: "priority", label: "Priority", render: (b) => <span className="font-semibold">#{b.priority}</span> },
          { key: "status", label: "Status", render: (b) => <StatusBadge status={b.status} /> },
          { key: "created_at", label: "Created", render: (b: any) => <span className="text-xs text-muted-foreground whitespace-nowrap">{fmtTs(b.created_at)}</span> },
          { key: "updated_at", label: "Updated", render: (b: any) => <span className="text-xs text-muted-foreground whitespace-nowrap">{fmtTs(b.updated_at || b.created_at)}</span> },
          { key: "actions", label: "", render: (b) => (
            <div className="flex gap-1">
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openModal(b, "view")}><Eye className="h-4 w-4" /></Button>
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openModal(b, "edit")}><Pencil className="h-4 w-4" /></Button>
              <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => { setConfirmTarget(b); setConfirmOpen(true); }}><Trash2 className="h-4 w-4" /></Button>
            </div>
          )},
        ]}
        data={paginated}
        total={allData.length}
        page={page}
        perPage={perPage}
        totalPages={totalPages}
        onPageChange={setPage}
        onExport={handleExport}
        showDateFilter={false}
        summaryWidgets={summaryWidgets}
        onAdd={() => openModal(null, "create")}
      />
      <BannerModal
        banner={selected}
        open={modalOpen}
        onOpenChange={setModalOpen}
        mode={modalMode}
        onSave={handleSave}
        onCreate={handleCreate}
        onDelete={handleDelete}
      />
      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title="Delete Banner"
        description={`Delete "${confirmTarget?.title}"? This cannot be undone.`}
        onConfirm={async () => { if (confirmTarget) { await handleDelete(confirmTarget.id); setConfirmOpen(false); } }}
      />
    </AdminLayout>
  );
}
