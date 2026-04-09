import { useState, useEffect } from "react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Star, Gift, ArrowUp, ArrowDown } from "lucide-react";
import { format, subDays, startOfDay, endOfDay, parseISO } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import ReportDataGrid, { Column } from "@/components/admin/ReportDataGrid";

interface PointsRow {
  id: string; created_at: string; user_id: string; user_name: string;
  type: string; points: number; description: string; is_expired: boolean;
  expires_at: string;
}

const typeColors: Record<string, string> = {
  welcome: "bg-primary/10 text-primary", referral: "bg-info/10 text-info",
  order_reward: "bg-success/10 text-success", redemption: "bg-destructive/10 text-destructive",
  expired: "bg-muted text-muted-foreground",
};

export default function PointsReportPage() {
  const [dateFrom, setDateFrom] = useState<Date>(subDays(new Date(), 180));
  const [dateTo, setDateTo] = useState<Date>(new Date());
  const [typeFilter, setTypeFilter] = useState("all");
  const [rows, setRows] = useState<PointsRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      let q = supabase.from("points_transactions")
        .select("id, created_at, user_id, user_name, type, points, description, is_expired, expires_at")
        .gte("created_at", startOfDay(dateFrom).toISOString())
        .lte("created_at", endOfDay(dateTo).toISOString())
        .order("created_at", { ascending: false });
      if (typeFilter !== "all") q = q.eq("type", typeFilter);
      const { data } = await q;
      setRows(data || []);
      setLoading(false);
    };
    fetchData();
  }, [dateFrom, dateTo, typeFilter]);

  const totalIssued = rows.filter(r => r.points > 0).reduce((s, r) => s + r.points, 0);
  const totalRedeemed = rows.filter(r => r.points < 0).reduce((s, r) => s + Math.abs(r.points), 0);
  const welcomeCount = rows.filter(r => r.type === "welcome").length;
  const referralCount = rows.filter(r => r.type === "referral").length;

  const columns: Column<PointsRow>[] = [
    { key: "id", label: "Transaction ID", sortable: true, render: r => <span className="font-mono text-xs">{r.id}</span> },
    { key: "created_at", label: "Date", sortable: true, render: r => format(parseISO(r.created_at), "dd MMM yyyy, HH:mm") },
    { key: "user_name", label: "Customer", sortable: true, render: r => r.user_name || "—" },
    { key: "user_id", label: "Customer ID", render: r => <span className="font-mono text-xs">{r.user_id}</span> },
    { key: "type", label: "Type", sortable: true, align: "center", render: r => <Badge className={(typeColors[r.type] || "bg-muted") + " border-0 text-[10px]"}>{r.type.replace("_", " ")}</Badge> },
    { key: "points", label: "Points", sortable: true, align: "right", render: r => <span className={`font-semibold ${r.points > 0 ? "text-success" : "text-destructive"}`}>{r.points > 0 ? "+" : ""}{r.points}</span> },
    { key: "description", label: "Description", render: r => <span className="text-xs">{r.description}</span> },
    { key: "expires_at", label: "Expires At", sortable: true, render: r => r.expires_at ? format(parseISO(r.expires_at), "dd MMM yyyy") : "—" },
    { key: "is_expired", label: "Expired", align: "center", render: r => r.is_expired ? <Badge variant="destructive" className="text-[10px]">Yes</Badge> : "—" },
  ];

  return (
    <AdminLayout>
      <ReportDataGrid
        title="Points Report"
        subtitle="Points issued, redeemed, and balance overview"
        data={rows} columns={columns} loading={loading}
        searchPlaceholder="Search by customer, description, transaction ID..."
        searchKeys={["user_name", "user_id", "description", "id"]}
        dateFrom={dateFrom} dateTo={dateTo}
        onDateFromChange={setDateFrom} onDateToChange={setDateTo}
        statusFilter={{ value: typeFilter, onChange: setTypeFilter, label: "Type", options: [
          { label: "Welcome", value: "welcome" }, { label: "Referral", value: "referral" },
          { label: "Order Reward", value: "order_reward" }, { label: "Redemption", value: "redemption" },
        ] }}
        exportFilename="points_report"
        summaryCards={
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {loading ? Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-20 rounded-xl" />) : (<>
              <MiniStat icon={ArrowUp} label="Total Issued" value={totalIssued.toLocaleString()} />
              <MiniStat icon={ArrowDown} label="Total Redeemed" value={totalRedeemed.toLocaleString()} />
              <MiniStat icon={Star} label="Welcome Bonuses" value={welcomeCount.toLocaleString()} />
              <MiniStat icon={Gift} label="Referral Bonuses" value={referralCount.toLocaleString()} />
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
