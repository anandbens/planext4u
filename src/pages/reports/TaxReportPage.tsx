import { AdminLayout } from "@/components/admin/AdminLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { downloadCSV } from "@/lib/csv";

const data = [
  { category: "Electronics", gst: 285000, cess: 12000 },
  { category: "Fashion", gst: 195000, cess: 0 },
  { category: "Home & Living", gst: 142000, cess: 0 },
  { category: "Food", gst: 58000, cess: 0 },
  { category: "Services", gst: 98000, cess: 5000 },
];

export default function TaxReportPage() {
  return (
    <AdminLayout>
      <div className="page-header">
        <div>
          <h1 className="page-title">Tax Report</h1>
          <p className="page-description">Tax collection summary by category and period</p>
        </div>
        <Button onClick={() => downloadCSV(data, ["category", "gst", "cess"], "tax_report")} variant="outline" size="sm">
          <Download className="h-4 w-4 mr-1" /> Export CSV
        </Button>
      </div>

      <div className="grid grid-cols-3 gap-4 mb-6">
        <Card className="p-4"><span className="text-xs text-muted-foreground">Total GST Collected</span><p className="text-xl font-bold mt-1">₹7,78,000</p></Card>
        <Card className="p-4"><span className="text-xs text-muted-foreground">Total Cess</span><p className="text-xl font-bold mt-1">₹17,000</p></Card>
        <Card className="p-4"><span className="text-xs text-muted-foreground">Net Tax</span><p className="text-xl font-bold mt-1">₹7,95,000</p></Card>
      </div>

      <Card className="p-5">
        <h3 className="text-sm font-semibold mb-4">Tax by Category</h3>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis dataKey="category" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
            <YAxis tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`} />
            <Tooltip formatter={(v: number) => [`₹${v.toLocaleString()}`]} />
            <Bar dataKey="gst" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} name="GST" />
            <Bar dataKey="cess" fill="hsl(var(--warning))" radius={[4, 4, 0, 0]} name="Cess" />
          </BarChart>
        </ResponsiveContainer>
      </Card>
    </AdminLayout>
  );
}
