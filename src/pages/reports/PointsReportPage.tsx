import { AdminLayout } from "@/components/admin/AdminLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { downloadCSV } from "@/lib/csv";

const data = [
  { month: "Oct", issued: 45000, redeemed: 32000 },
  { month: "Nov", issued: 52000, redeemed: 38000 },
  { month: "Dec", issued: 68000, redeemed: 45000 },
  { month: "Jan", issued: 72000, redeemed: 51000 },
  { month: "Feb", issued: 81000, redeemed: 58000 },
  { month: "Mar", issued: 95000, redeemed: 67000 },
];

export default function PointsReportPage() {
  return (
    <AdminLayout>
      <div className="page-header">
        <div>
          <h1 className="page-title">Points Report</h1>
          <p className="page-description">Points issued, redeemed, and balance overview</p>
        </div>
        <Button onClick={() => downloadCSV(data, ["month", "issued", "redeemed"], "points_report")} variant="outline" size="sm">
          <Download className="h-4 w-4 mr-1" /> Export CSV
        </Button>
      </div>

      <div className="grid grid-cols-3 gap-4 mb-6">
        <Card className="p-4"><span className="text-xs text-muted-foreground">Total Issued</span><p className="text-xl font-bold mt-1">4,13,000</p></Card>
        <Card className="p-4"><span className="text-xs text-muted-foreground">Total Redeemed</span><p className="text-xl font-bold mt-1">2,91,000</p></Card>
        <Card className="p-4"><span className="text-xs text-muted-foreground">Outstanding</span><p className="text-xl font-bold mt-1">1,22,000</p></Card>
      </div>

      <Card className="p-5">
        <h3 className="text-sm font-semibold mb-4">Points Issued vs Redeemed</h3>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis dataKey="month" tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" />
            <YAxis tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
            <Tooltip />
            <Bar dataKey="issued" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} name="Issued" />
            <Bar dataKey="redeemed" fill="hsl(var(--success))" radius={[4, 4, 0, 0]} name="Redeemed" />
          </BarChart>
        </ResponsiveContainer>
      </Card>
    </AdminLayout>
  );
}
