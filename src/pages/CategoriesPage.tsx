import { useEffect, useState, useCallback } from "react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { DataTable } from "@/components/admin/DataTable";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { api, PaginatedResponse, Category } from "@/lib/api";
import { CategoryModal } from "@/components/admin/modals/CategoryModal";
import { Button } from "@/components/ui/button";
import { Pencil, Trash2 } from "lucide-react";
import { exportToCSV } from "@/lib/csv";
import { toast } from "sonner";
import { ConfirmDialog } from "@/components/admin/ConfirmDialog";

export default function CategoriesPage() {
  const [data, setData] = useState<PaginatedResponse<Category> | null>(null);
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<Category | null>(null);
  const [modalMode, setModalMode] = useState<"view" | "edit" | "create">("view");
  const [modalOpen, setModalOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmTarget, setConfirmTarget] = useState<Category | null>(null);

  const fetchData = useCallback(() => {
    api.getCategories().then((cats) => {
      const start = (page - 1) * 10;
      setData({ data: cats.slice(start, start + 10), total: cats.length, page, per_page: 10, total_pages: Math.ceil(cats.length / 10) });
    });
  }, [page]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const openModal = (cat: Category | null, mode: "view" | "edit" | "create") => {
    setSelected(cat);
    setModalMode(mode);
    setModalOpen(true);
  };

  const handleSave = async (id: string, updates: Partial<Category>) => {
    await api.updateCategory(id, updates);
    toast.success("Category updated");
    fetchData();
  };

  const handleCreate = async (data: Partial<Category>) => {
    await api.createCategory(data);
    toast.success("Category created");
    fetchData();
  };

  const handleDelete = async (id: string) => {
    await api.deleteCategory(id);
    toast.success("Category deleted");
    fetchData();
  };

  const handleExport = () => {
    if (!data) return;
    exportToCSV(data.data, [
      { key: "id", label: "ID" }, { key: "name", label: "Name" },
      { key: "count", label: "Products" }, { key: "status", label: "Status" },
    ], "categories");
    toast.success("CSV exported");
  };

  if (!data) return <AdminLayout><div className="flex items-center justify-center h-64"><div className="h-8 w-8 rounded-full border-2 border-primary border-t-transparent animate-spin" /></div></AdminLayout>;

  return (
    <AdminLayout>
      <div className="page-header">
        <h1 className="page-title">Categories</h1>
        <p className="page-description">{data.total} product categories</p>
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
        data={data.data}
        total={data.total}
        page={data.page}
        perPage={data.per_page}
        totalPages={data.total_pages}
        onPageChange={setPage}
        onExport={handleExport}
        onAdd={() => openModal(null, "create")}
        addLabel="Add Category"
        onRowClick={(c) => openModal(c, "edit")}
        searchPlaceholder="Search categories..."
        showDateFilter={false}
      />
      <CategoryModal category={selected} open={modalOpen} onOpenChange={setModalOpen} mode={modalMode} onSave={handleSave} onCreate={handleCreate} onDelete={handleDelete} />
      <ConfirmDialog open={confirmOpen} onOpenChange={setConfirmOpen} title="Delete Category" description={`Delete "${confirmTarget?.name}"?`} confirmLabel="Delete" variant="destructive"
        onConfirm={async () => { if (confirmTarget) { await handleDelete(confirmTarget.id); setConfirmOpen(false); } }} />
    </AdminLayout>
  );
}
