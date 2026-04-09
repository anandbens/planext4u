import { useState, useEffect } from "react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Users, UserPlus, Wallet, Activity } from "lucide-react";
import { format, subDays, startOfDay, endOfDay, parseISO } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import ReportDataGrid, { Column } from "@/components/admin/ReportDataGrid";

interface CustomerRow {
  id: string; name: string; email: string; mobile: string; status: string;
  wallet_points: number; referral_code: string; occupation: string;
  created_at: string; kyc_status: string; profile_completeness: number;
}

export default function CustomerReportPage() {
  const [dateFrom, setDateFrom] = useState<Date>(subDays(new Date(), 90));
  const [dateTo, setDateTo] = useState<Date>(new Date());
  const [statusFilter, setStatusFilter] = useState("all");
  const [rows, setRows] = useState<CustomerRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      let q = supabase.from("customers")
        .select("id, name, email, mobile, status, wallet_points, referral_code, occupation, created_at, kyc_status, profile_completeness")
        .gte("created_at", startOfDay(dateFrom).toISOString())
        .lte("created_at", endOfDay(dateTo).toISOString())
        .order("created_at", { ascending: false });
      if (statusFilter !== "all") q = q.eq("status", statusFilter);
      const { data } = await q;
      setRows((data || []).map((c: any) => ({ ...c, wallet_points: c.wallet_points || 0, profile_completeness: c.profile_completeness || 0 })));
      setLoading(false);
    };
    fetchData();
  }, [dateFrom, dateTo, statusFilter]);

  const totalCustomers = rows.length;
  const activeCount = rows.filter(c => c.status === "active").length;
  const totalWallet = rows.reduce((s, c) => s + c.wallet_points, 0);
  const kycVerified = rows.filter(c => c.kyc_status === "verified").length;

  const columns: Column<CustomerRow>[] = [
    { key: "id", label: "Customer ID", sortable: true, render: r => <span className="font-mono text-xs">{r.id}</span> },
    { key: "name", label: "Name", sortable: true, render: r => <span className="font-medium">{r.name}</span> },
    { key: "email", label: "Email", sortable: true },
    { key: "mobile", label: "Mobile", sortable: true },
    { key: "occupation", label: "Occupation", sortable: true, render: r => r.occupation || "—" },
    { key: "wallet_points", label: "Wallet Points", sortable: true, align: "right" },
    { key: "referral_code", label: "Referral Code", render: r => <span className="font-mono text-xs">{r.referral_code}</span> },
    { key: "profile_completeness", label: "Profile %", sortable: true, align: "right", render: r => `${r.profile_completeness}%` },
    { key: "kyc_status", label: "KYC", sortable: true, align: "center", render: r => <Badge variant={r.kyc_status === "verified" ? "default" : "outline"} className="text-[10px]">{r.kyc_status || "pending"}</Badge> },
    { key: "created_at", label: "Registered On", sortable: true, render: r => format(parseISO(r.created_at), "dd MMM yyyy") },
    { key: "status", label: "Status", sortable: true, align: "center", render: r => <Badge className={`border-0 text-[10px] ${r.status === "active" ? "bg-success/10 text-success" : "bg-destructive/10 text-destructive"}`}>{r.status}</Badge> },
  ];

  return (
    <AdminLayout>
      <ReportDataGrid
        title="Customer Report"
        subtitle={`${totalCustomers} customers in selected period`}
        data={rows}
        columns={columns}
        loading={loading}
        searchPlaceholder="Search by name, email, mobile, referral code..."
        searchKeys={["name", "email", "mobile", "referral_code", "id"]}
        dateFrom={dateFrom} dateTo={dateTo}
        onDateFromChange={setDateFrom} onDateToChange={setDateTo}
        statusFilter={{ value: statusFilter, onChange: setStatusFilter, options: [{ label: "Active", value: "active" }, { label: "Inactive", value: "inactive" }] }}
        exportFilename="customer_report"
        summaryCards={
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {loading ? Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-20 rounded-xl" />) : (<>
              <MiniStat icon={Users} label="Total Customers" value={totalCustomers.toLocaleString()} />
              <MiniStat icon={UserPlus} label="Active" value={activeCount.toLocaleString()} />
              <MiniStat icon={Wallet} label="Total Wallet Points" value={totalWallet.toLocaleString()} />
              <MiniStat icon={Activity} label="KYC Verified" value={kycVerified.toLocaleString()} />
            </>)}
          </div>
        }
      />
    </AdminLayout>
  );
}

function MiniStat({ icon: Icon, label, value }: { icon: any; label: string; value: string }) {
  return (
    <Card className="p-4">
      <div className="flex items-center justify-between mb-1"><span className="text-xs text-muted-foreground">{label}</span><Icon className="h-4 w-4 text-muted-foreground" /></div>
      <p className="text-xl font-bold">{value}</p>
    </Card>
  );
}
