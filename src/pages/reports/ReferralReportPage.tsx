import { AdminLayout } from "@/components/admin/AdminLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from "recharts";
import { downloadCSV } from "@/lib/csv";

const data = [
  { month: "Oct", referrals: 120, conversions: 85, rewards: 8500 },
  { month: "Nov", referrals: 145, conversions: 102, rewards: 10200 },
  { month: "Dec", referrals: 180, conversions: 128, rewards: 12800 },
  { month: "Jan", referrals: 210, conversions: 152, rewards: 15200 },
  { month: "Feb", referrals: 250, conversions: 180, rewards: 18000 },
  { month: "Mar", referrals: 295, conversions: 215, rewards: 21500 },
];

export default function ReferralReportPage() {
  return (
    <AdminLayout>
      <div className="page-header">
        <div>
          <h1 className="page-title">Referral Report</h1>
          <p className="page-description">Referral conversions and reward distribution</p>
        </div>
        <Button onClick={() => downloadCSV(data, ["month", "referrals", "conversions", "rewards"], "referral_report")} variant="outline" size="sm">
          <Download className="h-4 w-4 mr-1" /> Export CSV
        </Button>
      </div>

      <div className="grid grid-cols-3 gap-4 mb-6">
        <Card className="p-4"><span className="text-xs text-muted-foreground">Total Referrals</span><p className="text-xl font-bold mt-1">1,200</p></Card>
        <Card className="p-4"><span className="text-xs text-muted-foreground">Conversions</span><p className="text-xl font-bold mt-1">862 (71.8%)</p></Card>
        <Card className="p-4"><span className="text-xs text-muted-foreground">Rewards Paid</span><p className="text-xl font-bold mt-1">₹86,200</p></Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card className="p-5">
          <h3 className="text-sm font-semibold mb-4">Referral Trend</h3>
          <ResponsiveContainer width="100%" height={280}>
            <LineChart data={data}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="month" tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" />
              <YAxis tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" />
              <Tooltip />
              <Line type="monotone" dataKey="referrals" stroke="hsl(var(--primary))" strokeWidth={2} name="Referrals" />
              <Line type="monotone" dataKey="conversions" stroke="hsl(var(--success))" strokeWidth={2} name="Conversions" />
            </LineChart>
          </ResponsiveContainer>
        </Card>
        <Card className="p-5">
          <h3 className="text-sm font-semibold mb-4">Rewards Distributed</h3>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={data}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="month" tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" />
              <YAxis tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`} />
              <Tooltip formatter={(v: number) => [`₹${v.toLocaleString()}`]} />
              <Bar dataKey="rewards" fill="hsl(var(--warning))" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Card>
      </div>
    </AdminLayout>
  );
}
