import { useEffect, useState, useCallback } from "react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { DataTable, SummaryWidget } from "@/components/admin/DataTable";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { api, Category } from "@/lib/api";
import { CategoryModal } from "@/components/admin/modals/CategoryModal";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Pencil, Trash2, Layers, CheckCircle, Package, ChevronRight, ChevronDown, ShieldCheck, ShieldX, Plus, TrendingUp } from "lucide-react";
import { exportToCSV } from "@/lib/csv";
import { toast } from "sonner";
import { ConfirmDialog } from "@/components/admin/ConfirmDialog";

type ViewType = "all" | "categories" | "subcategories";
type TrendingFilter = "all" | "yes" | "no";
type StatusFilter = "all" | "active" | "inactive";

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
  const [viewType, setViewType] = useState<ViewType>("all");
  const [trendingFilter, setTrendingFilter] = useState<TrendingFilter>("all");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [parentFilter, setParentFilter] = useState<string>("all");
  const [createAsSubcategory, setCreateAsSubcategory] = useState(false);

  const fetchData = useCallback(() => {
    api.getCategories().then(setAllData);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const parentCategories = allData.filter(c => !c.parent_id);
  const subcategories = allData.filter(c => !!c.parent_id);
  const childMap: Record<string, Category[]> = {};
  subcategories.forEach(c => {
    if (!childMap[c.parent_id!]) childMap[c.parent_id!] = [];
    childMap[c.parent_id!].push(c);
  });

  // Build flat list based on view type
  let displayList: Category[] = [];
  if (viewType === "categories") {
    displayList = parentCategories;
  } else if (viewType === "subcategories") {
    displayList = subcategories;
  } else {
    // "all" - show parents with expandable children inline
    displayList = parentCategories;
  }

  // Apply filters
  let filtered = displayList.filter(c => {
    if (statusFilter !== "all" && c.status !== statusFilter) return false;
    if (trendingFilter === "yes" && !c.is_trending) return false;
    if (trendingFilter === "no" && c.is_trending) return false;
    if (viewType === "subcategories" && parentFilter !== "all" && c.parent_id !== parentFilter) return false;
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    if (c.name.toLowerCase().includes(q)) return true;
    if (c.id.toLowerCase().includes(q)) return true;
    // For parent categories, also match children
    if (!c.parent_id) {
      const subs = childMap[c.id] || [];
      if (subs.some(s => s.name.toLowerCase().includes(q))) return true;
    }
    return false;
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
      { key: "is_trending", label: "Trending" },
    ], "categories");
    toast.success("CSV exported");
  };

  const active = parentCategories.filter(c => c.status === 'active').length;
  const trendingCount = allData.filter(c => c.is_trending).length;

  const summaryWidgets: SummaryWidget[] = [
    { label: "Total Categories", value: parentCategories.length, icon: <Layers className="h-5 w-5 text-primary" />, color: "bg-primary/5" },
    { label: "Active", value: active, icon: <CheckCircle className="h-5 w-5 text-success" />, color: "bg-success/5", textColor: "text-success" },
    { label: "Total Subcategories", value: subcategories.length, icon: <Package className="h-5 w-5 text-info" />, color: "bg-info/5", textColor: "text-info" },
    { label: "Trending", value: trendingCount, icon: <TrendingUp className="h-5 w-5 text-warning" />, color: "bg-warning/5", textColor: "text-warning" },
  ];

  // Get parent name helper
  const getParentName = (parentId: string | null) => {
    if (!parentId) return null;
    return parentCategories.find(p => p.id === parentId)?.name || parentId;
  };

  // Columns differ based on view
  const nameColumn = viewType === "subcategories"
    ? {
        key: "name", label: "Subcategory Name", render: (c: Category) => (
          <div>
            <span className="font-medium">{c.name}</span>
            <div className="text-[10px] text-muted-foreground mt-0.5">Parent: {getParentName(c.parent_id)}</div>
          </div>
        )
      }
    : {
        key: "name", label: "Category Name", render: (c: Category) => {
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
                      <Badge
                        variant="outline"
                        className="text-[10px] font-normal cursor-pointer hover:bg-primary/10 text-primary border-primary/30"
                        onClick={(e) => {
                          e.stopPropagation();
                          setCreateAsSubcategory(true);
                          const newSub = { parent_id: c.id } as any;
                          setSelected(newSub);
                          setModalMode("create");
                          setModalOpen(true);
                        }}
                      >
                        <Plus className="h-3 w-3 mr-0.5" /> Add
                      </Badge>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        }
      };

  return (
    <AdminLayout>
      <div className="page-header">
        <h1 className="page-title">Categories</h1>
        <p className="page-description">{parentCategories.length} categories, {subcategories.length} subcategories</p>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-wrap items-center gap-3 mb-4">
        <Select value={viewType} onValueChange={(v) => { setViewType(v as ViewType); setPage(1); }}>
          <SelectTrigger className="w-[160px] h-9 text-xs">
            <SelectValue placeholder="View" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            <SelectItem value="categories">Categories Only</SelectItem>
            <SelectItem value="subcategories">Subcategories Only</SelectItem>
          </SelectContent>
        </Select>

        <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v as StatusFilter); setPage(1); }}>
          <SelectTrigger className="w-[130px] h-9 text-xs">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="inactive">Inactive</SelectItem>
          </SelectContent>
        </Select>

        <Select value={trendingFilter} onValueChange={(v) => { setTrendingFilter(v as TrendingFilter); setPage(1); }}>
          <SelectTrigger className="w-[130px] h-9 text-xs">
            <SelectValue placeholder="Trending" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Trending</SelectItem>
            <SelectItem value="yes">Trending</SelectItem>
            <SelectItem value="no">Not Trending</SelectItem>
          </SelectContent>
        </Select>

        {viewType === "subcategories" && (
          <Select value={parentFilter} onValueChange={(v) => { setParentFilter(v); setPage(1); }}>
            <SelectTrigger className="w-[180px] h-9 text-xs">
              <SelectValue placeholder="Parent Category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Parents</SelectItem>
              {parentCategories.map(p => (
                <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        <Button
          variant="outline"
          size="sm"
          className="h-9 text-xs gap-1"
          onClick={() => {
            setCreateAsSubcategory(true);
            setSelected(null);
            setModalMode("create");
            setModalOpen(true);
          }}
        >
          <Plus className="h-3.5 w-3.5" /> Add Subcategory
        </Button>
      </div>

      <DataTable
        columns={[
          { key: "id", label: "#" },
          nameColumn,
          { key: "image", label: "Image", render: (c) => {
            const imgSrc = c.image;
            return imgSrc?.startsWith('/') || imgSrc?.startsWith('http')
              ? <img src={imgSrc} alt={c.name} className="h-10 w-10 rounded object-cover" />
              : <span className="text-xl">{imgSrc}</span>;
          }},
          { key: "icon", label: "Icon", render: (c) => {
            const iconSrc = c.icon;
            if (!iconSrc) return <span className="text-xs text-muted-foreground">—</span>;
            return iconSrc.startsWith('/') || iconSrc.startsWith('http')
              ? <img src={iconSrc} alt="icon" className="h-8 w-8 rounded object-contain" />
              : <span className="text-sm">{iconSrc}</span>;
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
        onAdd={() => { setCreateAsSubcategory(false); openModal(null, "create"); }}
        addLabel="Add Category"
        onRowClick={(c) => openModal(c, "edit")}
        searchPlaceholder="Search categories or subcategories..."
        showDateFilter={false}
        summaryWidgets={summaryWidgets}
        enableBulkSelect
        onBulkDelete={handleBulkDelete}
      />
      <CategoryModal
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
      <ConfirmDialog open={confirmOpen} onOpenChange={setConfirmOpen} title="Delete Category" description={`Delete "${confirmTarget?.name}"? This will also delete all subcategories.`} confirmLabel="Delete" variant="destructive"
        onConfirm={async () => { if (confirmTarget) { await handleDelete(confirmTarget.id); setConfirmOpen(false); } }} />
    </AdminLayout>
  );
}
