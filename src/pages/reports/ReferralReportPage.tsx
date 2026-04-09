import { useState, useEffect } from "react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Gift, Users, CheckCircle, Clock } from "lucide-react";
import { format, subDays, startOfDay, endOfDay, parseISO } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import ReportDataGrid, { Column } from "@/components/admin/ReportDataGrid";

interface ReferralRow {
  id: string; name: string; email: string; mobile: string;
  referral_code: string; referred_by: string; created_at: string;
  wallet_points: number; status: string;
}

export default function ReferralReportPage() {
  const [dateFrom, setDateFrom] = useState<Date>(subDays(new Date(), 180));
  const [dateTo, setDateTo] = useState<Date>(new Date());
  const [rows, setRows] = useState<ReferralRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      const { data } = await supabase.from("customers")
        .select("id, name, email, mobile, referral_code, referred_by, created_at, wallet_points, status")
        .not("referred_by", "is", null)
        .gte("created_at", startOfDay(dateFrom).toISOString())
        .lte("created_at", endOfDay(dateTo).toISOString())
        .order("created_at", { ascending: false });
      setRows(data || []);
      setLoading(false);
    };
    fetchData();
  }, [dateFrom, dateTo]);

  const totalReferrals = rows.length;
  const activeReferrals = rows.filter(r => r.status === "active").length;
  const uniqueReferrers = new Set(rows.map(r => r.referred_by)).size;

  const columns: Column<ReferralRow>[] = [
    { key: "id", label: "Customer ID", sortable: true, render: r => <span className="font-mono text-xs">{r.id}</span> },
    { key: "name", label: "Referred User", sortable: true, render: r => <span className="font-medium">{r.name}</span> },
    { key: "email", label: "Email", sortable: true },
    { key: "mobile", label: "Mobile", sortable: true },
    { key: "referred_by", label: "Referral Code Used", sortable: true, render: r => <span className="font-mono text-xs font-semibold">{r.referred_by}</span> },
    { key: "referral_code", label: "Own Code", render: r => <span className="font-mono text-xs">{r.referral_code}</span> },
    { key: "wallet_points", label: "Wallet Points", sortable: true, align: "right" },
    { key: "created_at", label: "Joined On", sortable: true, render: r => format(parseISO(r.created_at), "dd MMM yyyy") },
    { key: "status", label: "Status", sortable: true, align: "center", render: r => <Badge className={`border-0 text-[10px] ${r.status === "active" ? "bg-success/10 text-success" : "bg-destructive/10 text-destructive"}`}>{r.status}</Badge> },
  ];

  return (
    <AdminLayout>
      <ReportDataGrid
        title="Referral Report"
        subtitle="Referral conversions and reward tracking"
        data={rows} columns={columns} loading={loading}
        searchPlaceholder="Search by name, email, referral code..."
        searchKeys={["name", "email", "mobile", "referred_by", "referral_code"]}
        dateFrom={dateFrom} dateTo={dateTo}
        onDateFromChange={setDateFrom} onDateToChange={setDateTo}
        exportFilename="referral_report"
        summaryCards={
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {loading ? Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-20 rounded-xl" />) : (<>
              <MiniStat icon={Gift} label="Total Referrals" value={totalReferrals.toLocaleString()} />
              <MiniStat icon={CheckCircle} label="Active Referred" value={activeReferrals.toLocaleString()} />
              <MiniStat icon={Users} label="Unique Referrers" value={uniqueReferrers.toLocaleString()} />
              <MiniStat icon={Clock} label="Avg per Referrer" value={uniqueReferrers > 0 ? (totalReferrals / uniqueReferrers).toFixed(1) : "0"} />
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
