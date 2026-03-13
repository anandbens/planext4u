import { useEffect, useState } from "react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { DataTable } from "@/components/admin/DataTable";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { api, Vendor, PaginatedResponse } from "@/lib/api";
import { VendorModal } from "@/components/admin/modals/VendorModal";
import { Button } from "@/components/ui/button";
import { CheckCircle, XCircle, Eye, Pencil } from "lucide-react";

export default function VendorsPage() {
  const [data, setData] = useState<PaginatedResponse<Vendor> | null>(null);
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<Vendor | null>(null);
  const [modalMode, setModalMode] = useState<"view" | "edit">("view");
  const [modalOpen, setModalOpen] = useState(false);

  useEffect(() => {
    api.getVendors({ page, per_page: 10 }).then(setData);
  }, [page]);

  const openModal = (vendor: Vendor, mode: "view" | "edit") => {
    setSelected(vendor);
    setModalMode(mode);
    setModalOpen(true);
  };

  if (!data) return <AdminLayout><div className="flex items-center justify-center h-64"><div className="h-8 w-8 rounded-full border-2 border-primary border-t-transparent animate-spin" /></div></AdminLayout>;

  return (
    <AdminLayout>
      <div className="page-header">
        <h1 className="page-title">Vendors</h1>
        <p className="page-description">{data.total.toLocaleString()} registered vendors · Multi-level approval</p>
      </div>
      <DataTable
        columns={[
          { key: "id", label: "ID" },
          { key: "business_name", label: "Business", render: (v) => (
            <div><p className="font-medium">{v.business_name}</p><p className="text-xs text-muted-foreground">{v.name}</p></div>
          )},
          { key: "email", label: "Email" },
          { key: "mobile", label: "Mobile" },
          { key: "commission_rate", label: "Commission", render: (v) => <span>{v.commission_rate}%</span> },
          { key: "membership", label: "Plan", render: (v) => (
            <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${v.membership === 'premium' ? 'bg-warning/10 text-warning' : 'bg-secondary text-secondary-foreground'}`}>
              {v.membership}
            </span>
          )},
          { key: "status", label: "Status", render: (v) => <StatusBadge status={v.status} /> },
          { key: "actions", label: "Actions", render: (v) => (
            <div className="flex gap-1">
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={(e) => { e.stopPropagation(); openModal(v, "view"); }}><Eye className="h-4 w-4" /></Button>
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={(e) => { e.stopPropagation(); openModal(v, "edit"); }}><Pencil className="h-4 w-4" /></Button>
              {v.status !== 'verified' && v.status !== 'rejected' && (
                <>
                  <Button variant="ghost" size="icon" className="h-7 w-7 text-success" onClick={(e) => e.stopPropagation()}><CheckCircle className="h-4 w-4" /></Button>
                  <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={(e) => e.stopPropagation()}><XCircle className="h-4 w-4" /></Button>
                </>
              )}
            </div>
          )},
        ]}
        data={data.data}
        total={data.total}
        page={data.page}
        perPage={data.per_page}
        totalPages={data.total_pages}
        onPageChange={setPage}
        onSearch={() => {}}
        onExport={() => {}}
        onRowClick={(v) => openModal(v, "view")}
        searchPlaceholder="Search vendors..."
        filters={[{ key: "status", label: "Status", options: [
          { value: "pending", label: "Pending" },
          { value: "level1_approved", label: "Level 1" },
          { value: "level2_approved", label: "Level 2" },
          { value: "verified", label: "Verified" },
          { value: "rejected", label: "Rejected" },
        ]}]}
      />
      <VendorModal vendor={selected} open={modalOpen} onOpenChange={setModalOpen} mode={modalMode} />
    </AdminLayout>
  );
}
