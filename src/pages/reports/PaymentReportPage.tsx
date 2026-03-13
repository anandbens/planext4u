import { AdminLayout } from "@/components/admin/AdminLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { downloadCSV } from "@/lib/csv";

const txnData = [
  { date: "Mar 7", success: 310, failed: 10 },
  { date: "Mar 8", success: 335, failed: 12 },
  { date: "Mar 9", success: 298, failed: 14 },
  { date: "Mar 10", success: 370, failed: 8 },
  { date: "Mar 11", success: 410, failed: 11 },
  { date: "Mar 12", success: 385, failed: 9 },
  { date: "Mar 13", success: 435, failed: 7 },
];

const gatewayData = [
  { name: "Razorpay", value: 65, color: "hsl(var(--primary))" },
  { name: "PayU", value: 20, color: "hsl(var(--success))" },
  { name: "Cashfree", value: 15, color: "hsl(var(--warning))" },
];

export default function PaymentReportPage() {
  return (
    <AdminLayout>
      <div className="page-header">
        <div>
          <h1 className="page-title">Payment Report</h1>
          <p className="page-description">Payment gateway transactions and reconciliation</p>
        </div>
        <Button onClick={() => downloadCSV(txnData, ["date", "success", "failed"], "payment_report")} variant="outline" size="sm">
          <Download className="h-4 w-4 mr-1" /> Export CSV
        </Button>
      </div>

      <div className="grid grid-cols-3 gap-4 mb-6">
        <Card className="p-4"><span className="text-xs text-muted-foreground">Total Transactions</span><p className="text-xl font-bold mt-1">2,614</p></Card>
        <Card className="p-4"><span className="text-xs text-muted-foreground">Success Rate</span><p className="text-xl font-bold mt-1 text-success">97.2%</p></Card>
        <Card className="p-4"><span className="text-xs text-muted-foreground">Failed</span><p className="text-xl font-bold mt-1 text-destructive">71</p></Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-2 p-5">
          <h3 className="text-sm font-semibold mb-4">Transaction Trend</h3>
          <ResponsiveContainer width="100%" height={280}>
            <LineChart data={txnData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="date" tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" />
              <YAxis tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" />
              <Tooltip />
              <Line type="monotone" dataKey="success" stroke="hsl(var(--success))" strokeWidth={2} name="Success" />
              <Line type="monotone" dataKey="failed" stroke="hsl(var(--destructive))" strokeWidth={2} name="Failed" />
            </LineChart>
          </ResponsiveContainer>
        </Card>
        <Card className="p-5">
          <h3 className="text-sm font-semibold mb-4">Gateway Split</h3>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie data={gatewayData} dataKey="value" cx="50%" cy="50%" innerRadius={45} outerRadius={75} paddingAngle={4}>
                {gatewayData.map((e, i) => <Cell key={i} fill={e.color} />)}
              </Pie>
              <Tooltip formatter={(v: number) => [`${v}%`]} />
            </PieChart>
          </ResponsiveContainer>
          <div className="flex flex-wrap gap-3 mt-2 justify-center">
            {gatewayData.map((d) => (
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
