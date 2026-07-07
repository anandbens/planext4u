import { useEffect, useState, useCallback } from "react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { DataTable, SummaryWidget } from "@/components/admin/DataTable";
import { api, Category } from "@/lib/api";
import { ServiceCategoryModal } from "@/components/admin/modals/ServiceCategoryModal";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Pencil, Trash2, Layers, CheckCircle, Wrench, Plus, TrendingUp } from "lucide-react";
import { exportToCSV } from "@/lib/csv";
import { toast } from "sonner";
import { ConfirmDialog } from "@/components/admin/ConfirmDialog";

type StatusFilter = "all" | "active" | "inactive";
type TrendingFilter = "all" | "yes" | "no";

export default function CFServicesPage() {
  const [allData, setAllData] = useState<Category[]>([]);
  const [page, setPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState("");
  const [selected, setSelected] = useState<Category | null>(null);
  const [modalMode, setModalMode] = useState<"view" | "edit" | "create">("view");
  const [modalOpen, setModalOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmTarget, setConfirmTarget] = useState<Category | null>(null);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [trendingFilter, setTrendingFilter] = useState<TrendingFilter>("all");
  const [createAsSubcategory, setCreateAsSubcategory] = useState(false);

  const fetchData = useCallback(() => {
    api.getServiceCategories(true).then(setAllData);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const parentCategories = allData.filter(c => !c.parent_id);
  const subcategories = allData.filter(c => !!c.parent_id);
  const childMap: Record<string, Category[]> = {};
  subcategories.forEach(c => {
    if (!childMap[c.parent_id!]) childMap[c.parent_id!] = [];
    childMap[c.parent_id!].push(c);
  });

  const filtered = parentCategories.filter(c => {
    if (statusFilter !== "all" && c.status !== statusFilter) return false;
    if (trendingFilter === "yes" && !c.is_trending) return false;
    if (trendingFilter === "no" && c.is_trending) return false;
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    if (c.name.toLowerCase().includes(q)) return true;
    const subs = childMap[c.id] || [];
    if (subs.some(s => s.name.toLowerCase().includes(q))) return true;
    return false;
  });

  const perPage = 10;
  const totalPages = Math.ceil(filtered.length / perPage);
  const paginated = filtered.slice((page - 1) * perPage, page * perPage);

  const openModal = (cat: Category | null, mode: "view" | "edit" | "create") => {
    setSelected(cat); setModalMode(mode); setModalOpen(true);
  };

  const handleSave = async (id: string, updates: Partial<Category>) => {
    await api.updateServiceCategory(id, updates); toast.success("Service category updated"); fetchData();
  };
  const handleCreate = async (data: Partial<Category>) => {
    await api.createServiceCategory(data); toast.success("Service category created"); fetchData();
  };
  const handleDelete = async (id: string) => {
    await api.deleteServiceCategory(id); toast.success("Service category deleted"); fetchData();
  };
  const handleBulkDelete = async (ids: string[]) => {
    await api.bulkDeleteServiceCategories(ids); toast.success(`${ids.length} categories deleted`); fetchData();
  };

  const handleExport = () => {
    exportToCSV(allData, [
      { key: "id", label: "ID" }, { key: "name", label: "Name" },
      { key: "parent_id", label: "Parent ID" },
      { key: "display_order", label: "Display Order" },
      { key: "show_on_homepage", label: "Show on Homepage" },
      { key: "count", label: "Services" }, { key: "status", label: "Status" },
      { key: "is_trending", label: "Trending" },
    ], "cf_services");
    toast.success("CSV exported");
  };

  const active = parentCategories.filter(c => c.status === "active").length;
  const trendingCount = allData.filter(c => c.is_trending).length;

  const summaryWidgets: SummaryWidget[] = [
    { label: "Service Categories", value: parentCategories.length, icon: <Layers className="h-5 w-5 text-primary" />, color: "bg-primary/5" },
    { label: "Active", value: active, icon: <CheckCircle className="h-5 w-5 text-success" />, color: "bg-success/5", textColor: "text-success" },
    { label: "Subcategories", value: subcategories.length, icon: <Wrench className="h-5 w-5 text-info" />, color: "bg-info/5", textColor: "text-info" },
    { label: "Trending", value: trendingCount, icon: <TrendingUp className="h-5 w-5 text-warning" />, color: "bg-warning/5", textColor: "text-warning" },
  ];

  return (
    <AdminLayout>
      <div className="page-header">
        <h1 className="page-title">CF Services</h1>
        <p className="page-description">{parentCategories.length} categories, {subcategories.length} subcategories</p>
      </div>

      <div className="flex flex-wrap items-center gap-3 mb-4">
        <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v as StatusFilter); setPage(1); }}>
          <SelectTrigger className="w-[130px] h-9 text-xs"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="inactive">Inactive</SelectItem>
          </SelectContent>
        </Select>

        <Select value={trendingFilter} onValueChange={(v) => { setTrendingFilter(v as TrendingFilter); setPage(1); }}>
          <SelectTrigger className="w-[130px] h-9 text-xs"><SelectValue placeholder="Trending" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Trending</SelectItem>
            <SelectItem value="yes">Trending</SelectItem>
            <SelectItem value="no">Not Trending</SelectItem>
          </SelectContent>
        </Select>

        <Button variant="outline" size="sm" className="h-9 text-xs gap-1"
          onClick={() => { setCreateAsSubcategory(true); setSelected(null); setModalMode("create"); setModalOpen(true); }}>
          <Plus className="h-3.5 w-3.5" /> Add Subcategory
        </Button>
      </div>

      <DataTable
        columns={[
          { key: "id", label: "S.No", render: (c) => <span className="text-sm font-medium">{filtered.indexOf(c) + 1}</span> },
          { key: "display_order", label: "Order", render: (c) => (
            <span className="text-xs font-mono px-2 py-0.5 rounded bg-muted">{(c as any).display_order ?? 999}</span>
          )},
          { key: "show_on_homepage", label: "On Home", render: (c) => (
            <Badge className={`text-[10px] border-0 ${(c as any).show_on_homepage !== false ? "bg-success text-white" : "bg-muted text-muted-foreground"}`}>
              {(c as any).show_on_homepage !== false ? "Yes" : "No"}
            </Badge>
          )},
          { key: "name", label: "Service Category", render: (c) => <span className="font-medium">{c.name}</span> },
          { key: "image", label: "Image", render: (c) => {
            const img = c.image;
            return img?.startsWith("/") || img?.startsWith("http")
              ? <img loading="lazy" decoding="async" src={img} alt={c.name} className="h-10 w-10 rounded object-cover" />
              : <span className="text-xl">{img}</span>;
          }},
          { key: "subcategories", label: "Subcategories", render: (c) => {
            const subs = childMap[c.id] || [];
            if (subs.length === 0) return <span className="text-xs text-muted-foreground">No subcategories</span>;
            return (
              <div>
                <span className="text-xs font-semibold text-primary mb-1 block">{subs.length}</span>
                <div className="flex flex-wrap gap-1 max-w-md">
                  {subs.map(s => (
                    <Badge key={s.id} variant="outline" className="text-[10px] cursor-pointer hover:bg-accent px-2 py-0.5"
                      onClick={(e) => { e.stopPropagation(); openModal(s, "edit"); }}>
                      {s.name}
                    </Badge>
                  ))}
                  <Badge variant="outline" className="text-[10px] cursor-pointer hover:bg-primary/10 text-primary border-primary/30 px-2 py-0.5"
                    onClick={(e) => {
                      e.stopPropagation();
                      setCreateAsSubcategory(true);
                      setSelected({ parent_id: c.id } as any);
                      setModalMode("create");
                      setModalOpen(true);
                    }}>
                    <Plus className="h-3 w-3 mr-0.5" /> Add
                  </Badge>
                </div>
              </div>
            );
          }},
          { key: "count", label: "Services", render: (c) => <span className="font-semibold">{(c.count || 0).toLocaleString()}</span> },
          { key: "status", label: "Availability", render: (c) => (
            <Badge className={`text-[10px] border-0 ${c.status === "active" ? "bg-success text-white" : "bg-destructive text-white"}`}>
              {c.status === "active" ? "Active" : "Inactive"}
            </Badge>
          )},
          { key: "is_trending", label: "Trending", render: (c) => (
            <Badge className={`text-[10px] border-0 ${c.is_trending ? "bg-success text-white" : "bg-muted text-muted-foreground"}`}>
              {c.is_trending ? "Yes" : "No"}
            </Badge>
          )},
          { key: "actions", label: "Action", render: (c) => (
            <div className="flex gap-1">
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={(e) => { e.stopPropagation(); openModal(c, "edit"); }}><Pencil className="h-4 w-4" /></Button>
              <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={(e) => { e.stopPropagation(); setConfirmTarget(c); setConfirmOpen(true); }}><Trash2 className="h-4 w-4" /></Button>
            </div>
          )},
        ]}
        data={paginated}
        total={filtered.length}
        page={page}
        perPage={perPage}
        totalPages={totalPages}
        onPageChange={setPage}
        onSearch={(q) => { setSearchQuery(q); setPage(1); }}
        onExport={handleExport}
        onAdd={() => { setCreateAsSubcategory(false); openModal(null, "create"); }}
        addLabel="Add Service Category"
        onRowClick={(c) => openModal(c, "edit")}
        searchPlaceholder="Search service categories or subcategories..."
        showDateFilter={false}
        summaryWidgets={summaryWidgets}
        enableBulkSelect
        onBulkDelete={handleBulkDelete}
      />

      <ServiceCategoryModal
        category={selected}
        open={modalOpen}
        onOpenChange={(open) => { setModalOpen(open); if (!open) setCreateAsSubcategory(false); }}
        mode={modalMode}
        onSave={handleSave}
        onCreate={handleCreate}
        onDelete={handleDelete}
        parentCategories={parentCategories}
        defaultAsSubcategory={createAsSubcategory}
      />
      <ConfirmDialog open={confirmOpen} onOpenChange={setConfirmOpen} title="Delete Service Category"
        description={`Delete "${confirmTarget?.name}"? This will also delete all subcategories.`}
        confirmLabel="Delete" variant="destructive"
        onConfirm={async () => { if (confirmTarget) { await handleDelete(confirmTarget.id); setConfirmOpen(false); } }} />
    </AdminLayout>
  );
}
