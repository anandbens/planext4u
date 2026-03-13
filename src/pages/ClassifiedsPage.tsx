import { useEffect, useState } from "react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { DataTable } from "@/components/admin/DataTable";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { api, ClassifiedAd, PaginatedResponse } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { CheckCircle, XCircle } from "lucide-react";

export default function ClassifiedsPage() {
  const [data, setData] = useState<PaginatedResponse<ClassifiedAd> | null>(null);
  const [page, setPage] = useState(1);

  useEffect(() => {
    api.getClassifiedAds({ page, per_page: 10 }).then(setData);
  }, [page]);

  if (!data) return <AdminLayout><div className="flex items-center justify-center h-64"><div className="h-8 w-8 rounded-full border-2 border-primary border-t-transparent animate-spin" /></div></AdminLayout>;

  return (
    <AdminLayout>
      <div className="page-header">
        <h1 className="page-title">Classified Ads</h1>
        <p className="page-description">{data.total.toLocaleString()} ads · Admin approval required</p>
      </div>
      <DataTable
        columns={[
          { key: "id", label: "ID" },
          { key: "title", label: "Title", render: (a) => (
            <div><p className="font-medium">{a.title}</p><p className="text-xs text-muted-foreground">{a.category}</p></div>
          )},
          { key: "price", label: "Price", render: (a) => <span className="font-semibold">₹{a.price.toLocaleString()}</span> },
          { key: "city", label: "Location", render: (a) => `${a.area}, ${a.city}` },
          { key: "user_name", label: "Posted By" },
          { key: "status", label: "Status", render: (a) => <StatusBadge status={a.status} /> },
          { key: "actions", label: "", render: (a) => a.status === 'pending' ? (
            <div className="flex gap-1">
              <Button variant="ghost" size="icon" className="h-7 w-7 text-success"><CheckCircle className="h-4 w-4" /></Button>
              <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive"><XCircle className="h-4 w-4" /></Button>
            </div>
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
        searchPlaceholder="Search ads..."
        filters={[{ key: "status", label: "Status", options: [
          { value: "pending", label: "Pending" }, { value: "approved", label: "Approved" },
          { value: "rejected", label: "Rejected" }, { value: "expired", label: "Expired" }, { value: "sold", label: "Sold" },
        ]}]}
      />
    </AdminLayout>
  );
}
