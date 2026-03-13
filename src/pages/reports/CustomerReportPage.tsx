import { AdminLayout } from "@/components/admin/AdminLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { downloadCSV } from "@/lib/csv";

const growthData = [
  { month: "Oct", newUsers: 1200, activeUsers: 8500 },
  { month: "Nov", newUsers: 1450, activeUsers: 9200 },
  { month: "Dec", newUsers: 1800, activeUsers: 10500 },
  { month: "Jan", newUsers: 2100, activeUsers: 12000 },
  { month: "Feb", newUsers: 2400, activeUsers: 14200 },
  { month: "Mar", newUsers: 2850, activeUsers: 16800 },
];

const demographics = [
  { name: "18-25", value: 28, color: "hsl(var(--primary))" },
  { name: "26-35", value: 38, color: "hsl(var(--success))" },
  { name: "36-45", value: 22, color: "hsl(var(--warning))" },
  { name: "46+", value: 12, color: "hsl(var(--info))" },
];

export default function CustomerReportPage() {
  return (
    <AdminLayout>
      <div className="page-header">
        <div>
          <h1 className="page-title">Customer Report</h1>
          <p className="page-description">User growth, retention, and demographics</p>
        </div>
        <Button onClick={() => downloadCSV(growthData, ["month", "newUsers", "activeUsers"], "customer_report")} variant="outline" size="sm">
          <Download className="h-4 w-4 mr-1" /> Export CSV
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-2 p-5">
          <h3 className="text-sm font-semibold mb-4">User Growth</h3>
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={growthData}>
              <defs>
                <linearGradient id="newG" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.3} /><stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0} /></linearGradient>
                <linearGradient id="actG" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="hsl(var(--success))" stopOpacity={0.3} /><stop offset="100%" stopColor="hsl(var(--success))" stopOpacity={0} /></linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="month" tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" />
              <YAxis tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" />
              <Tooltip />
              <Area type="monotone" dataKey="activeUsers" stroke="hsl(var(--success))" fill="url(#actG)" strokeWidth={2} name="Active Users" />
              <Area type="monotone" dataKey="newUsers" stroke="hsl(var(--primary))" fill="url(#newG)" strokeWidth={2} name="New Users" />
            </AreaChart>
          </ResponsiveContainer>
        </Card>
        <Card className="p-5">
          <h3 className="text-sm font-semibold mb-4">Age Demographics</h3>
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie data={demographics} dataKey="value" cx="50%" cy="50%" innerRadius={45} outerRadius={75} paddingAngle={4}>
                {demographics.map((e, i) => <Cell key={i} fill={e.color} />)}
              </Pie>
              <Tooltip formatter={(v: number) => [`${v}%`]} />
            </PieChart>
          </ResponsiveContainer>
          <div className="flex flex-wrap gap-3 mt-2 justify-center">
            {demographics.map((d) => (
              <span key={d.name} className="text-xs flex items-center gap-1">
                <span className="h-2.5 w-2.5 rounded-full" style={{ background: d.color }} /> {d.name} ({d.value}%)
              </span>
            ))}
          </div>
        </Card>
      </div>
    </AdminLayout>
  );
}
