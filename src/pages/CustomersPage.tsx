import { useEffect, useState, useCallback } from "react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { DataTable, SummaryWidget } from "@/components/admin/DataTable";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { ConfirmDialog } from "@/components/admin/ConfirmDialog";
import { api, User, PaginatedResponse } from "@/lib/api";
import { CustomerModal } from "@/components/admin/modals/CustomerModal";
import { Button } from "@/components/ui/button";
import { Eye, Pencil, Trash2, Users, UserCheck, UserX, Star } from "lucide-react";
import { exportToCSV } from "@/lib/csv";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";

export default function CustomersPage() {
  const [data, setData] = useState<PaginatedResponse<User> | null>(null);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [occupationFilter, setOccupationFilter] = useState("");
  const [dateFrom, setDateFrom] = useState<string>();
  const [dateTo, setDateTo] = useState<string>();
  const [selected, setSelected] = useState<User | null>(null);
  const [modalMode, setModalMode] = useState<"view" | "edit" | "create">("view");
  const [modalOpen, setModalOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmTarget, setConfirmTarget] = useState<User | null>(null);
  const [totalStats, setTotalStats] = useState({ total: 0, active: 0, inactive: 0, points: 0 });

  const { data: occupations = [] } = useQuery({
    queryKey: ["occupationsForFilter"],
    queryFn: async () => {
      const { data } = await supabase.from("occupations").select("id, name, status").eq("status", "active").order("name");
      return (data || []) as { id: string; name: string; status: string }[];
    },
  });

  const fetchData = useCallback(() => {
    api.getCustomers({ page, per_page: 10, search: search || undefined, status: statusFilter || undefined, occupation: occupationFilter || undefined, date_from: dateFrom, date_to: dateTo }).then(setData);
  }, [page, search, statusFilter, occupationFilter, dateFrom, dateTo]);

  const fetchStats = useCallback(async () => {
    const [
      { count: total },
      { count: active },
      { data: pointsData },
    ] = await Promise.all([
      supabase.from('customers').select('*', { count: 'exact', head: true }),
      supabase.from('customers').select('*', { count: 'exact', head: true }).eq('status', 'active'),
      supabase.from('customers').select('wallet_points'),
    ]);
    const totalPoints = (pointsData || []).reduce((s, c) => s + (c.wallet_points || 0), 0);
    setTotalStats({ total: total || 0, active: active || 0, inactive: (total || 0) - (active || 0), points: totalPoints });
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);
  useEffect(() => { fetchStats(); }, [fetchStats]);

  const openModal = (user: User | null, mode: "view" | "edit" | "create") => {
    setSelected(user); setModalMode(mode); setModalOpen(true);
  };

  const handleSave = async (id: string, updates: Partial<User>) => { await api.updateCustomer(id, updates); toast.success("Customer updated"); fetchData(); fetchStats(); };
  const handleCreate = async (data: Partial<User>) => { await api.createCustomer(data); toast.success("Customer created"); fetchData(); fetchStats(); };
  const handleDelete = async (id: string) => { await api.deleteCustomer(id); toast.success("Customer deleted"); fetchData(); fetchStats(); };

  const handleBulkDelete = async (ids: string[]) => {
    await api.bulkDeleteCustomers(ids);
    toast.success(`${ids.length} customers deleted`);
    fetchData(); fetchStats();
  };

  const handleBulkStatus = async (ids: string[], status: string) => {
    await api.bulkUpdateCustomerStatus(ids, status);
    toast.success(`${ids.length} customers updated to ${status}`);
    fetchData(); fetchStats();
  };

  const handleExport = () => {
    if (!data) return;
    exportToCSV(data.data, [
      { key: "id", label: "ID" }, { key: "name", label: "Name" },
      { key: "email", label: "Email" }, { key: "mobile", label: "Mobile" },
      { key: "occupation", label: "Occupation" },
      { key: "wallet_points", label: "Points" }, { key: "referral_code", label: "Referral Code" },
      { key: "status", label: "Status" }, { key: "created_at", label: "Registered" },
    ], "customers");
    toast.success("CSV exported");
  };

  if (!data) return <AdminLayout><div className="flex items-center justify-center h-64"><div className="h-8 w-8 rounded-full border-2 border-primary border-t-transparent animate-spin" /></div></AdminLayout>;

  const summaryWidgets: SummaryWidget[] = [
    { label: "Total Customers", value: totalStats.total, icon: <Users className="h-5 w-5 text-primary" />, color: "bg-primary/5" },
    { label: "Active", value: totalStats.active, icon: <UserCheck className="h-5 w-5 text-success" />, color: "bg-success/5", textColor: "text-success" },
    { label: "Inactive / Suspended", value: totalStats.inactive, icon: <UserX className="h-5 w-5 text-destructive" />, color: "bg-destructive/5", textColor: "text-destructive" },
    { label: "Total Wallet Points", value: totalStats.points, icon: <Star className="h-5 w-5 text-warning" />, color: "bg-warning/5", textColor: "text-warning" },
  ];

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
          { key: "occupation", label: "Occupation", render: (u) => <span className="text-sm">{u.occupation || '—'}</span> },
          { key: "wallet_points", label: "Points", render: (u) => <span className="font-semibold">{u.wallet_points.toLocaleString()}</span> },
          { key: "status", label: "Status", render: (u) => <StatusBadge status={u.status} /> },
          { key: "actions", label: "", render: (u) => (
            <div className="flex gap-1">
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={(e) => { e.stopPropagation(); openModal(u, "view"); }}><Eye className="h-4 w-4" /></Button>
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={(e) => { e.stopPropagation(); openModal(u, "edit"); }}><Pencil className="h-4 w-4" /></Button>
              <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={(e) => { e.stopPropagation(); setConfirmTarget(u); setConfirmOpen(true); }}><Trash2 className="h-4 w-4" /></Button>
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
        onAdd={() => openModal(null, "create")}
        addLabel="Add Customer"
        onRowClick={(u) => openModal(u, "view")}
        onFilterChange={(key, val) => {
          if (key === "status") { setStatusFilter(val); setPage(1); }
          if (key === "occupation") { setOccupationFilter(val); setPage(1); }
        }}
        onDateRangeChange={(f, t) => { setDateFrom(f); setDateTo(t); setPage(1); }}
        searchPlaceholder="Search by name, email, mobile, occupation..."
        filters={[
          { key: "status", label: "Status", options: [{ value: "active", label: "Active" }, { value: "inactive", label: "Inactive" }, { value: "suspended", label: "Suspended" }] },
          { key: "occupation", label: "Occupation", options: occupations.map(o => ({ value: o.name, label: o.name })) },
        ]}
        summaryWidgets={summaryWidgets}
        enableBulkSelect
        onBulkDelete={handleBulkDelete}
        onBulkStatusUpdate={handleBulkStatus}
        bulkStatusOptions={[
          { value: "active", label: "Active" },
          { value: "inactive", label: "Inactive" },
          { value: "suspended", label: "Suspended" },
        ]}
      />
      <CustomerModal customer={selected} open={modalOpen} onOpenChange={setModalOpen} mode={modalMode} onSave={handleSave} onCreate={handleCreate} onDelete={handleDelete} />
      <ConfirmDialog open={confirmOpen} onOpenChange={setConfirmOpen} title="Delete Customer" description={`Are you sure you want to delete "${confirmTarget?.name}"? This action cannot be undone.`} confirmLabel="Delete" variant="destructive"
        onConfirm={async () => { if (confirmTarget) { await handleDelete(confirmTarget.id); setConfirmOpen(false); } }} />
    </AdminLayout>
  );
}
