import { useEffect, useState } from "react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { DataTable } from "@/components/admin/DataTable";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { api, Settlement, PaginatedResponse } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { CheckCircle } from "lucide-react";

export default function SettlementsPage() {
  const [data, setData] = useState<PaginatedResponse<Settlement> | null>(null);
  const [page, setPage] = useState(1);

  useEffect(() => {
    api.getSettlements({ page, per_page: 10 }).then(setData);
  }, [page]);

  if (!data) return <AdminLayout><div className="flex items-center justify-center h-64"><div className="h-8 w-8 rounded-full border-2 border-primary border-t-transparent animate-spin" /></div></AdminLayout>;

  return (
    <AdminLayout>
      <div className="page-header">
        <h1 className="page-title">Settlements</h1>
        <p className="page-description">{data.total} pending settlements · Manual settlement by default</p>
      </div>
      <DataTable
        columns={[
          { key: "id", label: "ID" },
          { key: "vendor_name", label: "Vendor" },
          { key: "order_id", label: "Order" },
          { key: "amount", label: "Order Amount", render: (s) => `₹${s.amount.toLocaleString()}` },
          { key: "commission", label: "Commission", render: (s) => <span className="text-destructive">-₹{s.commission.toLocaleString()}</span> },
          { key: "net_amount", label: "Net Payout", render: (s) => <span className="font-bold text-success">₹{s.net_amount.toLocaleString()}</span> },
          { key: "status", label: "Status", render: (s) => <StatusBadge status={s.status} /> },
          { key: "actions", label: "", render: (s) => s.status === 'eligible' ? (
            <Button variant="outline" size="sm" className="gap-1 text-success border-success/30 hover:bg-success/10">
              <CheckCircle className="h-3.5 w-3.5" /> Settle
            </Button>
          ) : null },
        ]}
        data={data.data}
        total={data.total}
        page={data.page}
        perPage={data.per_page}
        totalPages={data.total_pages}
        onPageChange={setPage}
        onSearch={() => {}}
        onExport={() => {}}
        filters={[{ key: "status", label: "Status", options: [
          { value: "pending", label: "Pending" }, { value: "eligible", label: "Eligible" },
          { value: "settled", label: "Settled" }, { value: "on_hold", label: "On Hold" },
        ]}]}
      />
    </AdminLayout>
  );
}
