import { useEffect, useState, useCallback } from "react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { DataTable, SummaryWidget } from "@/components/admin/DataTable";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { api, PaginatedResponse, Category } from "@/lib/api";
import { CategoryModal } from "@/components/admin/modals/CategoryModal";
import { Button } from "@/components/ui/button";
import { Pencil, Trash2, Layers, CheckCircle, Package } from "lucide-react";
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

  const fetchData = useCallback(() => {
    api.getCategories().then(setAllData);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  // Client-side search filtering
  const filtered = allData.filter(c => {
    if (!searchQuery) return true;
    return c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
           c.id.toLowerCase().includes(searchQuery.toLowerCase());
  });

  const perPage = 10;
  const totalPages = Math.ceil(filtered.length / perPage);
  const paginated = filtered.slice((page - 1) * perPage, page * perPage);

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
    exportToCSV(filtered, [
      { key: "id", label: "ID" }, { key: "name", label: "Name" },
      { key: "count", label: "Products" }, { key: "status", label: "Status" },
    ], "categories");
    toast.success("CSV exported");
  };

  const active = filtered.filter(c => c.status === 'active').length;
  const totalProducts = filtered.reduce((s, c) => s + (c.count || 0), 0);

  const summaryWidgets: SummaryWidget[] = [
    { label: "Total Categories", value: filtered.length, icon: <Layers className="h-5 w-5 text-primary" />, color: "bg-primary/5" },
    { label: "Active", value: active, icon: <CheckCircle className="h-5 w-5 text-success" />, color: "bg-success/5", textColor: "text-success" },
    { label: "Total Products", value: totalProducts, icon: <Package className="h-5 w-5 text-info" />, color: "bg-info/5", textColor: "text-info" },
  ];

  return (
    <AdminLayout>
      <div className="page-header">
        <h1 className="page-title">Categories</h1>
        <p className="page-description">{filtered.length} product categories</p>
      </div>
      <DataTable
        columns={[
          { key: "id", label: "ID" },
          { key: "image", label: "Icon", render: (c) => c.image?.startsWith('/') ? <img src={c.image} alt={c.name} className="h-8 w-8 rounded object-cover" /> : <span className="text-xl">{c.image}</span> },
          { key: "name", label: "Category Name", render: (c) => <span className="font-medium">{c.name}</span> },
          { key: "count", label: "Products", render: (c) => <span className="font-semibold">{(c.count || 0).toLocaleString()}</span> },
          { key: "status", label: "Status", render: (c) => <StatusBadge status={c.status} /> },
          { key: "created_at", label: "Created", render: (c) => c.created_at ? new Date(c.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—' },
          { key: "actions", label: "", render: (c) => (
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
        searchPlaceholder="Search categories..."
        showDateFilter={false}
        summaryWidgets={summaryWidgets}
        enableBulkSelect
        onBulkDelete={handleBulkDelete}
      />
      <CategoryModal category={selected} open={modalOpen} onOpenChange={setModalOpen} mode={modalMode} onSave={handleSave} onCreate={handleCreate} onDelete={handleDelete} />
      <ConfirmDialog open={confirmOpen} onOpenChange={setConfirmOpen} title="Delete Category" description={`Delete "${confirmTarget?.name}"?`} confirmLabel="Delete" variant="destructive"
        onConfirm={async () => { if (confirmTarget) { await handleDelete(confirmTarget.id); setConfirmOpen(false); } }} />
    </AdminLayout>
  );
}
