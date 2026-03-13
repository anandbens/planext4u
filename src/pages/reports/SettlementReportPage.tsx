import { AdminLayout } from "@/components/admin/AdminLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Download, DollarSign, Clock, CheckCircle, AlertTriangle } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from "recharts";
import { downloadCSV } from "@/lib/csv";
import { cn } from "@/lib/utils";

const data = [
  { week: "W1", settled: 820000, pending: 180000, commission: 98000 },
  { week: "W2", settled: 950000, pending: 210000, commission: 114000 },
  { week: "W3", settled: 1100000, pending: 150000, commission: 132000 },
  { week: "W4", settled: 980000, pending: 240000, commission: 118000 },
];

const stats = [
  { icon: DollarSign, label: "Total Settled", value: "₹38,50,000", color: "text-success" },
  { icon: Clock, label: "Pending", value: "₹7,80,000", color: "text-warning" },
  { icon: CheckCircle, label: "Commission Earned", value: "₹4,62,000", color: "text-primary" },
  { icon: AlertTriangle, label: "On Hold", value: "₹1,20,000", color: "text-destructive" },
];

export default function SettlementReportPage() {
  return (
    <AdminLayout>
      <div className="page-header">
        <div>
          <h1 className="page-title">Settlement Report</h1>
          <p className="page-description">Payouts, commissions, and pending settlements</p>
        </div>
        <Button onClick={() => downloadCSV(data, ["week", "settled", "pending", "commission"], "settlement_report")} variant="outline" size="sm">
          <Download className="h-4 w-4 mr-1" /> Export CSV
        </Button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {stats.map((s) => (
          <Card key={s.label} className="p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-muted-foreground">{s.label}</span>
              <s.icon className={cn("h-4 w-4", s.color)} />
            </div>
            <p className="text-xl font-bold">{s.value}</p>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card className="p-5">
          <h3 className="text-sm font-semibold mb-4">Weekly Settlements</h3>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={data}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="week" tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" />
              <YAxis tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" tickFormatter={(v) => `₹${(v / 100000).toFixed(1)}L`} />
              <Tooltip formatter={(v: number) => [`₹${v.toLocaleString()}`]} />
              <Bar dataKey="settled" fill="hsl(var(--success))" radius={[4, 4, 0, 0]} name="Settled" />
              <Bar dataKey="pending" fill="hsl(var(--warning))" radius={[4, 4, 0, 0]} name="Pending" />
            </BarChart>
          </ResponsiveContainer>
        </Card>
        <Card className="p-5">
          <h3 className="text-sm font-semibold mb-4">Commission Trend</h3>
          <ResponsiveContainer width="100%" height={280}>
            <LineChart data={data}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="week" tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" />
              <YAxis tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`} />
              <Tooltip formatter={(v: number) => [`₹${v.toLocaleString()}`]} />
              <Line type="monotone" dataKey="commission" stroke="hsl(var(--primary))" strokeWidth={2} dot={{ fill: "hsl(var(--primary))" }} />
            </LineChart>
          </ResponsiveContainer>
        </Card>
      </div>
    </AdminLayout>
  );
}
