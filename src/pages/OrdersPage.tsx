import { useEffect, useState } from "react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { DataTable } from "@/components/admin/DataTable";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { api, Order, PaginatedResponse } from "@/lib/api";

export default function OrdersPage() {
  const [data, setData] = useState<PaginatedResponse<Order> | null>(null);
  const [page, setPage] = useState(1);

  useEffect(() => {
    api.getOrders({ page, per_page: 10 }).then(setData);
  }, [page]);

  if (!data) return <AdminLayout><div className="flex items-center justify-center h-64"><div className="h-8 w-8 rounded-full border-2 border-primary border-t-transparent animate-spin" /></div></AdminLayout>;

  return (
    <AdminLayout>
      <div className="page-header">
        <h1 className="page-title">Orders</h1>
        <p className="page-description">{data.total.toLocaleString()} total orders</p>
      </div>
      <DataTable
        columns={[
          { key: "id", label: "Order ID" },
          { key: "customer_name", label: "Customer" },
          { key: "vendor_name", label: "Vendor" },
          { key: "subtotal", label: "Subtotal", render: (o) => `₹${o.subtotal.toLocaleString()}` },
          { key: "tax", label: "Tax", render: (o) => `₹${o.tax.toLocaleString()}` },
          { key: "discount", label: "Discount", render: (o) => o.discount > 0 ? <span className="text-success">-₹{o.discount}</span> : "—" },
          { key: "points_used", label: "Points", render: (o) => o.points_used > 0 ? <span className="text-primary font-medium">{o.points_used}</span> : "—" },
          { key: "total", label: "Total", render: (o) => <span className="font-bold">₹{o.total.toLocaleString()}</span> },
          { key: "status", label: "Status", render: (o) => <StatusBadge status={o.status} /> },
        ]}
        data={data.data}
        total={data.total}
        page={data.page}
        perPage={data.per_page}
        totalPages={data.total_pages}
        onPageChange={setPage}
        onSearch={() => {}}
        onExport={() => {}}
        searchPlaceholder="Search orders..."
        filters={[{ key: "status", label: "Status", options: [
          { value: "placed", label: "Placed" }, { value: "paid", label: "Paid" },
          { value: "accepted", label: "Accepted" }, { value: "in_progress", label: "In Progress" },
          { value: "delivered", label: "Delivered" }, { value: "completed", label: "Completed" },
          { value: "cancelled", label: "Cancelled" },
        ]}]}
      />
    </AdminLayout>
  );
}
