import { useEffect, useState, useCallback } from "react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { DataTable, SummaryWidget } from "@/components/admin/DataTable";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { ConfirmDialog } from "@/components/admin/ConfirmDialog";
import { api, Product, PaginatedResponse } from "@/lib/api";
import { ProductModal } from "@/components/admin/modals/ProductModal";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Eye, Pencil, Trash2, Package, IndianRupee, Tag, TrendingUp, CheckCircle, XCircle } from "lucide-react";
import { exportToCSV } from "@/lib/csv";
import { toast } from "sonner";

export default function ProductsPage() {
  const [activeTab, setActiveTab] = useState("pending");
  const [data, setData] = useState<PaginatedResponse<Product> | null>(null);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [dateFrom, setDateFrom] = useState<string>();
  const [dateTo, setDateTo] = useState<string>();
  const [selected, setSelected] = useState<Product | null>(null);
  const [modalMode, setModalMode] = useState<"view" | "edit" | "create">("view");
  const [modalOpen, setModalOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmTarget, setConfirmTarget] = useState<Product | null>(null);
  const [confirmAction, setConfirmAction] = useState<"delete" | "approve" | "reject">("delete");
  const [confirmLoading, setConfirmLoading] = useState(false);

  const statusFilter = activeTab === "pending" ? "pending_approval" : undefined;

  const fetchData = useCallback(() => {
    api.getProducts({ page, per_page: 10, search: search || undefined, date_from: dateFrom, date_to: dateTo, status: statusFilter }).then(setData);
  }, [page, search, dateFrom, dateTo, statusFilter]);

  useEffect(() => { fetchData(); }, [fetchData]);
  useEffect(() => { setPage(1); }, [activeTab]);

  const openModal = (product: Product | null, mode: "view" | "edit" | "create") => {
    setSelected(product); setModalMode(mode); setModalOpen(true);
  };

  const handleSave = async (id: string, updates: Partial<Product>) => { await api.updateProduct(id, updates); toast.success("Product updated"); fetchData(); };
  const handleCreate = async (data: Partial<Product>) => { await api.createProduct(data); toast.success("Product created"); fetchData(); };
  const handleDelete = async (id: string) => { await api.deleteProduct(id); toast.success("Product deleted"); fetchData(); };

  const handleBulkDelete = async (ids: string[]) => {
    await api.bulkDeleteProducts(ids);
    toast.success(`${ids.length} products deleted`);
    fetchData();
  };

  const handleBulkStatus = async (ids: string[], status: string) => {
    await api.bulkUpdateProductStatus(ids, status);
    toast.success(`${ids.length} products updated to ${status}`);
    fetchData();
  };

  const openConfirm = (product: Product, action: "delete" | "approve" | "reject") => {
    setConfirmTarget(product); setConfirmAction(action); setConfirmOpen(true);
  };

  const handleConfirm = async (reason?: string) => {
    if (!confirmTarget) return;
    setConfirmLoading(true);
    try {
      if (confirmAction === "delete") {
        await handleDelete(confirmTarget.id);
      } else if (confirmAction === "approve") {
        await api.updateProduct(confirmTarget.id, { status: "active" });
        toast.success("Product approved");
        fetchData();
      } else if (confirmAction === "reject") {
        await api.updateProduct(confirmTarget.id, { status: "rejected", rejection_reason: reason || "" });
        toast.success("Product rejected");
        fetchData();
      }
    } finally {
      setConfirmLoading(false); setConfirmOpen(false); setConfirmTarget(null);
    }
  };

  const handleExport = () => {
    if (!data) return;
    exportToCSV(data.data, [
      { key: "id", label: "ID" }, { key: "title", label: "Product" },
      { key: "vendor_name", label: "Vendor" }, { key: "category_name", label: "Category" },
      { key: "price", label: "Price" }, { key: "tax", label: "Tax" },
      { key: "discount", label: "Discount" }, { key: "status", label: "Status" },
    ], "products");
    toast.success("CSV exported");
  };

  if (!data) return <AdminLayout><div className="flex items-center justify-center h-64"><div className="h-8 w-8 rounded-full border-2 border-primary border-t-transparent animate-spin" /></div></AdminLayout>;

  const active = data.data.filter(p => p.status === 'active').length;
  const pending = data.data.filter(p => p.status === 'pending_approval').length;
  const rejected = data.data.filter(p => p.status === 'rejected').length;
  const avgPrice = data.data.length ? Math.round(data.data.reduce((s, p) => s + p.price, 0) / data.data.length) : 0;

  const summaryWidgets: SummaryWidget[] = activeTab === "pending" ? [
    { label: "Pending Approval", value: data.total, icon: <Tag className="h-5 w-5 text-warning" />, color: "bg-warning/5", textColor: "text-warning" },
  ] : [
    { label: "Total Products", value: data.total, icon: <Package className="h-5 w-5 text-primary" />, color: "bg-primary/5" },
    { label: "Active", value: active, icon: <TrendingUp className="h-5 w-5 text-success" />, color: "bg-success/5", textColor: "text-success" },
    { label: "Avg Price", value: `₹${avgPrice.toLocaleString()}`, icon: <IndianRupee className="h-5 w-5 text-info" />, color: "bg-info/5", textColor: "text-info" },
  ];

  const columns = [
    { key: "id", label: "ID" },
    { key: "title", label: "Product", render: (p: Product) => (
      <div><p className="font-medium">{p.title}</p><p className="text-xs text-muted-foreground">{p.category_name}{(p as any).subcategory_name ? ` › ${(p as any).subcategory_name}` : ''} • <span className="capitalize">{(p as any).product_type || 'simple'}</span></p></div>
    )},
    { key: "vendor_name", label: "Vendor" },
    { key: "price", label: "Price", render: (p: Product) => <span className="font-semibold">₹{p.price.toLocaleString()}</span> },
    { key: "discount", label: "Discount", render: (p: Product) => p.discount > 0 ? <span className="text-success font-medium">₹{p.discount}</span> : <span className="text-muted-foreground">—</span> },
    { key: "status", label: "Status", render: (p: Product) => (
      <div>
        <StatusBadge status={p.status} />
        {p.status === 'rejected' && p.rejection_reason && (
          <p className="text-[10px] text-destructive mt-0.5 max-w-[150px] truncate" title={p.rejection_reason}>{p.rejection_reason}</p>
        )}
      </div>
    )},
    { key: "actions", label: "", render: (p: Product) => (
      <div className="flex gap-1">
        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={(e) => { e.stopPropagation(); openModal(p, "view"); }}><Eye className="h-4 w-4" /></Button>
        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={(e) => { e.stopPropagation(); openModal(p, "edit"); }}><Pencil className="h-4 w-4" /></Button>
        {(p.status === 'pending_approval' || p.status === 'draft') && (
          <>
            <Button variant="ghost" size="icon" className="h-7 w-7 text-success" onClick={(e) => { e.stopPropagation(); openConfirm(p, "approve"); }} title="Approve"><CheckCircle className="h-4 w-4" /></Button>
            <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={(e) => { e.stopPropagation(); openConfirm(p, "reject"); }} title="Reject"><XCircle className="h-4 w-4" /></Button>
          </>
        )}
        <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={(e) => { e.stopPropagation(); openConfirm(p, "delete"); }}><Trash2 className="h-4 w-4" /></Button>
      </div>
    )},
  ];

  return (
    <AdminLayout>
      <div className="page-header">
        <h1 className="page-title">Products</h1>
        <p className="page-description">{data.total.toLocaleString()} products across all vendors</p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="mb-4">
        <TabsList>
          <TabsTrigger value="pending">Pending Approval</TabsTrigger>
          <TabsTrigger value="all">All Products</TabsTrigger>
        </TabsList>
      </Tabs>

      <DataTable
        columns={columns}
        data={data.data}
        total={data.total}
        page={data.page}
        perPage={data.per_page}
        totalPages={data.total_pages}
        onPageChange={setPage}
        onSearch={setSearch}
        onExport={handleExport}
        onAdd={() => openModal(null, "create")}
        addLabel="Add Product"
        onRowClick={(p) => openModal(p, "view")}
        onDateRangeChange={(f, t) => { setDateFrom(f); setDateTo(t); setPage(1); }}
        searchPlaceholder="Search products..."
        summaryWidgets={summaryWidgets}
        enableBulkSelect
        onBulkDelete={handleBulkDelete}
        onBulkStatusUpdate={handleBulkStatus}
        bulkStatusOptions={[
          { value: "active", label: "Approve (Active)" },
          { value: "inactive", label: "Inactive" },
          { value: "draft", label: "Draft" },
          { value: "rejected", label: "Reject" },
        ]}
      />
      <ProductModal product={selected} open={modalOpen} onOpenChange={setModalOpen} mode={modalMode} onSave={handleSave} onCreate={handleCreate} onDelete={handleDelete} />
      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title={confirmAction === "approve" ? "Approve Product" : confirmAction === "reject" ? "Reject Product" : "Delete Product"}
        description={confirmAction === "approve" ? `Approve "${confirmTarget?.title}" and make it active?` : confirmAction === "reject" ? `Reject "${confirmTarget?.title}"? Please provide a reason.` : `Delete "${confirmTarget?.title}"? This cannot be undone.`}
        confirmLabel={confirmAction === "approve" ? "Approve" : confirmAction === "reject" ? "Reject" : "Delete"}
        variant={confirmAction === "approve" ? "default" : "destructive"}
        onConfirm={handleConfirm}
        loading={confirmLoading}
        showReasonField={confirmAction === "reject"}
        reasonLabel="Rejection Reason *"
        reasonPlaceholder="Explain why this product is being rejected..."
      />
    </AdminLayout>
  );
}
