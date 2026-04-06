import { useEffect, useState, useCallback } from "react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { DataTable, SummaryWidget } from "@/components/admin/DataTable";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { api, PaginatedResponse, Category } from "@/lib/api";
import { CategoryModal } from "@/components/admin/modals/CategoryModal";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Pencil, Trash2, Layers, CheckCircle, Package, ChevronRight, ChevronDown, ShieldCheck, ShieldX } from "lucide-react";
import { exportToCSV } from "@/lib/csv";
import { toast } from "sonner";
import { ConfirmDialog } from "@/components/admin/ConfirmDialog";

export default function CategoriesPage() {
  const [allData, setAllData] = useState<Category[]>([]);
  const [page, setPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState("");
  const [selected, setSelected] = useState<Category | null>(null);
  const [modalMode, setModalMode] = useState<"view" | "edit" | "create">("view");
  const [modalOpen, setModalOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmTarget, setConfirmTarget] = useState<Category | null>(null);
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());

  const fetchData = useCallback(() => {
    api.getCategories().then(setAllData);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  // Separate parent and child categories
  const parentCategories = allData.filter(c => !c.parent_id);
  const childMap: Record<string, Category[]> = {};
  allData.filter(c => c.parent_id).forEach(c => {
    if (!childMap[c.parent_id!]) childMap[c.parent_id!] = [];
    childMap[c.parent_id!].push(c);
  });

  // Client-side search filtering
  const filtered = parentCategories.filter(c => {
    if (!searchQuery) return true;
    const subs = childMap[c.id] || [];
    return c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
           c.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
           subs.some(s => s.name.toLowerCase().includes(searchQuery.toLowerCase()));
  });

  const perPage = 10;
  const totalPages = Math.ceil(filtered.length / perPage);
  const paginated = filtered.slice((page - 1) * perPage, page * perPage);

  const toggleExpand = (id: string) => {
    setExpandedCategories(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const openModal = (cat: Category | null, mode: "view" | "edit" | "create") => {
    setSelected(cat); setModalMode(mode); setModalOpen(true);
  };

  const handleSave = async (id: string, updates: Partial<Category>) => { await api.updateCategory(id, updates); toast.success("Category updated"); fetchData(); };
  const handleCreate = async (data: Partial<Category>) => { await api.createCategory(data); toast.success("Category created"); fetchData(); };
  const handleDelete = async (id: string) => { await api.deleteCategory(id); toast.success("Category deleted"); fetchData(); };

  const handleBulkDelete = async (ids: string[]) => {
    await api.bulkDeleteCategories(ids);
    toast.success(`${ids.length} categories deleted`);
    fetchData();
  };

  const handleExport = () => {
    exportToCSV(allData, [
      { key: "id", label: "ID" }, { key: "name", label: "Name" },
      { key: "parent_id", label: "Parent ID" },
      { key: "count", label: "Products" }, { key: "status", label: "Status" },
    ], "categories");
    toast.success("CSV exported");
  };

  const active = parentCategories.filter(c => c.status === 'active').length;
  const totalProducts = allData.reduce((s, c) => s + (c.count || 0), 0);

  const summaryWidgets: SummaryWidget[] = [
    { label: "Total Categories", value: parentCategories.length, icon: <Layers className="h-5 w-5 text-primary" />, color: "bg-primary/5" },
    { label: "Active", value: active, icon: <CheckCircle className="h-5 w-5 text-success" />, color: "bg-success/5", textColor: "text-success" },
    { label: "Total Subcategories", value: allData.filter(c => c.parent_id).length, icon: <Package className="h-5 w-5 text-info" />, color: "bg-info/5", textColor: "text-info" },
  ];

  return (
    <AdminLayout>
      <div className="page-header">
        <h1 className="page-title">Categories</h1>
        <p className="page-description">{parentCategories.length} categories, {allData.filter(c => c.parent_id).length} subcategories</p>
      </div>
      <DataTable
        columns={[
          { key: "id", label: "#" },
          { key: "name", label: "Category Name", render: (c) => {
            const subs = childMap[c.id] || [];
            const isExpanded = expandedCategories.has(c.id);
            return (
              <div>
                <div className="flex items-center gap-2">
                  {subs.length > 0 && (
                    <button onClick={(e) => { e.stopPropagation(); toggleExpand(c.id); }} className="shrink-0">
                      {isExpanded ? <ChevronDown className="h-4 w-4 text-muted-foreground" /> : <ChevronRight className="h-4 w-4 text-muted-foreground" />}
                    </button>
                  )}
                  <span className="font-medium">{c.name}</span>
                </div>
                {subs.length > 0 && (
                  <div className="mt-1">
                    <span className="text-xs text-primary font-medium">{subs.length} subcategories</span>
                    {isExpanded && (
                      <div className="flex flex-wrap gap-1 mt-1.5">
                        {subs.map(s => (
                          <Badge key={s.id} variant="outline" className="text-[10px] font-normal cursor-pointer hover:bg-accent" onClick={(e) => { e.stopPropagation(); openModal(s, "edit"); }}>
                            {s.name}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          }},
          { key: "image", label: "Image", render: (c) => {
            const imgSrc = c.image;
            return imgSrc?.startsWith('/') || imgSrc?.startsWith('http')
              ? <img src={imgSrc} alt={c.name} className="h-10 w-10 rounded object-cover" />
              : <span className="text-xl">{imgSrc}</span>;
          }},
          { key: "status", label: "Availability", render: (c) => <StatusBadge status={c.status} /> },
          { key: "is_emergency", label: "Emergency", render: (c) => <span className="text-xs">{(c as any).is_emergency ? "Active" : "Deactive"}</span> },
          { key: "is_trending", label: "Trending", render: (c) => (
            <Badge className={`text-[10px] border-0 ${c.is_trending ? 'bg-success/10 text-success' : 'bg-muted text-muted-foreground'}`}>
              {c.is_trending ? "Yes" : "No"}
            </Badge>
          )},
          { key: "verification_status", label: "Verification Status", render: (c) => {
            const vs = (c as any).verification_status || 'unverified';
            return (
              <Badge className={`text-[10px] border-0 ${vs === 'verified' ? 'bg-success/10 text-success' : 'bg-destructive/10 text-destructive'}`}>
                {vs === 'verified' ? <><ShieldCheck className="h-3 w-3 mr-1" />VERIFIED</> : <><ShieldX className="h-3 w-3 mr-1" />UNVERIFIED</>}
              </Badge>
            );
          }},
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
        onAdd={() => openModal(null, "create")}
        addLabel="Add Category"
        onRowClick={(c) => openModal(c, "edit")}
        searchPlaceholder="Search categories or subcategories..."
        showDateFilter={false}
        summaryWidgets={summaryWidgets}
        enableBulkSelect
        onBulkDelete={handleBulkDelete}
      />
      <CategoryModal category={selected} open={modalOpen} onOpenChange={setModalOpen} mode={modalMode} onSave={handleSave} onCreate={handleCreate} onDelete={handleDelete} parentCategories={parentCategories} />
      <ConfirmDialog open={confirmOpen} onOpenChange={setConfirmOpen} title="Delete Category" description={`Delete "${confirmTarget?.name}"? This will also delete all subcategories.`} confirmLabel="Delete" variant="destructive"
        onConfirm={async () => { if (confirmTarget) { await handleDelete(confirmTarget.id); setConfirmOpen(false); } }} />
    </AdminLayout>
  );
}
