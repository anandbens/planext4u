import { useEffect, useState, useCallback } from "react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { DataTable } from "@/components/admin/DataTable";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { AdvertisementModal } from "@/components/admin/modals/AdvertisementModal";
import { exportToCSV } from "@/lib/csv";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";

export default function AdvertisementsPage() {
  const [data, setData] = useState<any>(null);
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState("");
  const [dateFrom, setDateFrom] = useState<string>();
  const [dateTo, setDateTo] = useState<string>();
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<"view" | "edit" | "create">("view");
  const [selectedAd, setSelectedAd] = useState<any>(null);

  const perPage = 10;

  const fetchData = useCallback(async () => {
    const from = (page - 1) * perPage;
    const to = from + perPage - 1;
    let query = supabase.from("advertisements").select("*", { count: "exact" });
    if (statusFilter && statusFilter !== "all") query = query.eq("status", statusFilter);
    if (dateFrom) query = query.gte("created_at", dateFrom);
    if (dateTo) query = query.lte("created_at", dateTo + "T23:59:59Z");
    query = query.order("created_at", { ascending: false }).range(from, to);
    const { data: rows, count, error } = await query;
    if (error) { toast.error("Failed to load ads"); return; }
    setData({ data: rows || [], total: count || 0, page, per_page: perPage, total_pages: Math.ceil((count || 0) / perPage) });
  }, [page, statusFilter, dateFrom, dateTo]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleExport = () => {
    if (!data) return;
    exportToCSV(data.data, [
      { key: "id", label: "ID" }, { key: "title", label: "Title" },
      { key: "advertiser", label: "Advertiser" }, { key: "link_type", label: "Link Type" },
      { key: "impressions", label: "Impressions" }, { key: "clicks", label: "Clicks" },
      { key: "status", label: "Status" }, { key: "start_date", label: "Start" }, { key: "end_date", label: "End" },
    ], "advertisements");
    toast.success("CSV exported");
  };

  const handleCreate = async (payload: any) => {
    const id = crypto.randomUUID();
    const { error } = await supabase.from("advertisements").insert({ id, ...payload } as any);
    if (error) { toast.error(error.message); return; }
    toast.success("Advertisement created");
    fetchData();
  };

  const handleSave = async (id: string, payload: any) => {
    const { error } = await supabase.from("advertisements").update(payload as any).eq("id", id);
    if (error) { toast.error(error.message); return; }
    toast.success("Advertisement updated");
    fetchData();
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this advertisement?")) return;
    const { error } = await supabase.from("advertisements").delete().eq("id", id);
    if (error) { toast.error(error.message); return; }
    toast.success("Advertisement deleted");
    fetchData();
  };

  if (!data) return <AdminLayout><div className="flex items-center justify-center h-64"><div className="h-8 w-8 rounded-full border-2 border-primary border-t-transparent animate-spin" /></div></AdminLayout>;

  return (
    <AdminLayout>
      <div className="page-header flex items-center justify-between">
        <div>
          <h1 className="page-title">Advertisements</h1>
          <p className="page-description">{data.total} ad campaigns</p>
        </div>
        <Button onClick={() => { setSelectedAd(null); setModalMode("create"); setModalOpen(true); }} className="gap-1">
          <Plus className="h-4 w-4" /> New Ad
        </Button>
      </div>
      <DataTable
        columns={[
          { key: "id", label: "ID" },
          { key: "title", label: "Campaign", render: (a: any) => (
            <div><p className="font-medium">{a.title}</p><p className="text-xs text-muted-foreground">{a.advertiser}</p></div>
          )},
          { key: "link_type", label: "Link", render: (a: any) => (
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-secondary text-secondary-foreground capitalize">{a.link_type}</span>
          )},
          { key: "placements", label: "Pages", render: (a: any) => (
            <span className="text-xs">{(a.placements || []).join(", ")}</span>
          )},
          { key: "type", label: "Type", render: (a: any) => (
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-secondary text-secondary-foreground capitalize">{a.type}</span>
          )},
          { key: "impressions", label: "Impressions", render: (a: any) => <span>{(a.impressions || 0).toLocaleString()}</span> },
          { key: "clicks", label: "Clicks", render: (a: any) => <span>{(a.clicks || 0).toLocaleString()}</span> },
          { key: "start_date", label: "Period", render: (a: any) => <span className="text-xs">{a.start_date} → {a.end_date}</span> },
          { key: "status", label: "Status", render: (a: any) => <StatusBadge status={a.status} /> },
        ]}
        data={data.data}
        total={data.total}
        page={data.page}
        perPage={data.per_page}
        totalPages={data.total_pages}
        onPageChange={setPage}
        onExport={handleExport}
        onRowClick={(row: any) => { setSelectedAd(row); setModalMode("edit"); setModalOpen(true); }}
        onFilterChange={(key, val) => { if (key === "status") { setStatusFilter(val); setPage(1); } }}
        onDateRangeChange={(f, t) => { setDateFrom(f); setDateTo(t); setPage(1); }}
        filters={[{ key: "status", label: "Status", options: [{ value: "active", label: "Active" }, { value: "paused", label: "Paused" }, { value: "expired", label: "Expired" }] }]}
      />
      <AdvertisementModal
        ad={selectedAd}
        open={modalOpen}
        onOpenChange={setModalOpen}
        mode={modalMode}
        onSave={handleSave}
        onCreate={handleCreate}
        onDelete={handleDelete}
      />
    </AdminLayout>
  );
}
