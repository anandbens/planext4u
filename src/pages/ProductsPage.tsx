import { useEffect, useState, useCallback } from "react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { DataTable } from "@/components/admin/DataTable";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { api, Product, PaginatedResponse } from "@/lib/api";
import { ProductModal } from "@/components/admin/modals/ProductModal";
import { Button } from "@/components/ui/button";
import { Eye, Pencil } from "lucide-react";
import { exportToCSV } from "@/lib/csv";
import { toast } from "sonner";

export default function ProductsPage() {
  const [data, setData] = useState<PaginatedResponse<Product> | null>(null);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Product | null>(null);
  const [modalMode, setModalMode] = useState<"view" | "edit">("view");
  const [modalOpen, setModalOpen] = useState(false);

  const fetchData = useCallback(() => {
    api.getProducts({ page, per_page: 10, search: search || undefined }).then(setData);
  }, [page, search]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const openModal = (product: Product, mode: "view" | "edit") => {
    setSelected(product);
    setModalMode(mode);
    setModalOpen(true);
  };

  const handleSave = async (id: string, updates: Partial<Product>) => {
    await api.updateProduct(id, updates);
    toast.success("Product updated successfully");
    fetchData();
  };

  const handleExport = () => {
    if (!data) return;
    exportToCSV(data.data, [
      { key: "id", label: "ID" }, { key: "title", label: "Product" },
      { key: "vendor_name", label: "Vendor" }, { key: "category_name", label: "Category" },
      { key: "price", label: "Price" }, { key: "tax", label: "Tax" },
      { key: "discount", label: "Discount" }, { key: "max_points_redeemable", label: "Max Points" },
      { key: "status", label: "Status" },
    ], "products");
    toast.success("CSV exported");
  };

  if (!data) return <AdminLayout><div className="flex items-center justify-center h-64"><div className="h-8 w-8 rounded-full border-2 border-primary border-t-transparent animate-spin" /></div></AdminLayout>;

  return (
    <AdminLayout>
      <div className="page-header">
        <h1 className="page-title">Products</h1>
        <p className="page-description">{data.total.toLocaleString()} products across all vendors</p>
      </div>
      <DataTable
        columns={[
          { key: "id", label: "ID" },
          { key: "title", label: "Product", render: (p) => (
            <div><p className="font-medium">{p.title}</p><p className="text-xs text-muted-foreground">{p.category_name}</p></div>
          )},
          { key: "vendor_name", label: "Vendor" },
          { key: "price", label: "Price", render: (p) => <span className="font-semibold">₹{p.price.toLocaleString()}</span> },
          { key: "discount", label: "Discount", render: (p) => p.discount > 0 ? <span className="text-success font-medium">₹{p.discount}</span> : <span className="text-muted-foreground">—</span> },
          { key: "max_points_redeemable", label: "Max Points", render: (p) => <span>{p.max_points_redeemable}</span> },
          { key: "status", label: "Status", render: (p) => <StatusBadge status={p.status} /> },
          { key: "actions", label: "", render: (p) => (
            <div className="flex gap-1">
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={(e) => { e.stopPropagation(); openModal(p, "view"); }}><Eye className="h-4 w-4" /></Button>
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={(e) => { e.stopPropagation(); openModal(p, "edit"); }}><Pencil className="h-4 w-4" /></Button>
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
        onRowClick={(p) => openModal(p, "view")}
        searchPlaceholder="Search products..."
      />
      <ProductModal product={selected} open={modalOpen} onOpenChange={setModalOpen} mode={modalMode} onSave={handleSave} />
    </AdminLayout>
  );
}
