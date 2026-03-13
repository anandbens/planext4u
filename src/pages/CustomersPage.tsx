import { useEffect, useState } from "react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { DataTable } from "@/components/admin/DataTable";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { api, User, PaginatedResponse } from "@/lib/api";
import { CustomerModal } from "@/components/admin/modals/CustomerModal";
import { Button } from "@/components/ui/button";
import { Eye, Pencil } from "lucide-react";

export default function CustomersPage() {
  const [data, setData] = useState<PaginatedResponse<User> | null>(null);
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<User | null>(null);
  const [modalMode, setModalMode] = useState<"view" | "edit">("view");
  const [modalOpen, setModalOpen] = useState(false);

  useEffect(() => {
    api.getCustomers({ page, per_page: 10 }).then(setData);
  }, [page]);

  const openModal = (user: User, mode: "view" | "edit") => {
    setSelected(user);
    setModalMode(mode);
    setModalOpen(true);
  };

  if (!data) return <AdminLayout><div className="flex items-center justify-center h-64"><div className="h-8 w-8 rounded-full border-2 border-primary border-t-transparent animate-spin" /></div></AdminLayout>;

  return (
    <AdminLayout>
      <div className="page-header">
        <h1 className="page-title">Customers</h1>
        <p className="page-description">{data.total.toLocaleString()} registered customers</p>
      </div>
      <DataTable
        columns={[
          { key: "id", label: "ID" },
          { key: "name", label: "Name" },
          { key: "email", label: "Email" },
          { key: "mobile", label: "Mobile" },
          { key: "wallet_points", label: "Points", render: (u) => <span className="font-semibold">{u.wallet_points.toLocaleString()}</span> },
          { key: "referral_code", label: "Referral Code", render: (u) => <code className="text-xs bg-secondary px-2 py-0.5 rounded">{u.referral_code}</code> },
          { key: "status", label: "Status", render: (u) => <StatusBadge status={u.status} /> },
          { key: "actions", label: "", render: (u) => (
            <div className="flex gap-1">
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={(e) => { e.stopPropagation(); openModal(u, "view"); }}><Eye className="h-4 w-4" /></Button>
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={(e) => { e.stopPropagation(); openModal(u, "edit"); }}><Pencil className="h-4 w-4" /></Button>
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
        onRowClick={(u) => openModal(u, "view")}
        searchPlaceholder="Search customers..."
        filters={[{ key: "status", label: "Status", options: [{ value: "active", label: "Active" }, { value: "inactive", label: "Inactive" }, { value: "suspended", label: "Suspended" }] }]}
      />
      <CustomerModal customer={selected} open={modalOpen} onOpenChange={setModalOpen} mode={modalMode} />
    </AdminLayout>
  );
}
