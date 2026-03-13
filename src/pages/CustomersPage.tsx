import { useEffect, useState } from "react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { DataTable } from "@/components/admin/DataTable";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { api, User, PaginatedResponse } from "@/lib/api";

export default function CustomersPage() {
  const [data, setData] = useState<PaginatedResponse<User> | null>(null);
  const [page, setPage] = useState(1);

  useEffect(() => {
    api.getCustomers({ page, per_page: 10 }).then(setData);
  }, [page]);

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
        ]}
        data={data.data}
        total={data.total}
        page={data.page}
        perPage={data.per_page}
        totalPages={data.total_pages}
        onPageChange={setPage}
        onSearch={() => {}}
        onExport={() => {}}
        searchPlaceholder="Search customers..."
        filters={[{ key: "status", label: "Status", options: [{ value: "active", label: "Active" }, { value: "inactive", label: "Inactive" }, { value: "suspended", label: "Suspended" }] }]}
      />
    </AdminLayout>
  );
}
