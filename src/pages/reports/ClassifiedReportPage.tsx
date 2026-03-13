import { AdminLayout } from "@/components/admin/AdminLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { downloadCSV } from "@/lib/csv";

const categoryData = [
  { category: "Electronics", listings: 520, sold: 340 },
  { category: "Vehicles", listings: 380, sold: 210 },
  { category: "Real Estate", listings: 290, sold: 85 },
  { category: "Furniture", listings: 260, sold: 180 },
  { category: "Others", listings: 406, sold: 250 },
];

const statusData = [
  { name: "Approved", value: 1200, color: "hsl(var(--success))" },
  { name: "Pending", value: 280, color: "hsl(var(--warning))" },
  { name: "Sold", value: 320, color: "hsl(var(--primary))" },
  { name: "Expired", value: 56, color: "hsl(var(--muted-foreground))" },
];

export default function ClassifiedReportPage() {
  return (
    <AdminLayout>
      <div className="page-header">
        <div>
          <h1 className="page-title">Classified Ads Report</h1>
          <p className="page-description">Ad listings, approvals, and engagement</p>
        </div>
        <Button onClick={() => downloadCSV(categoryData, ["category", "listings", "sold"], "classified_report")} variant="outline" size="sm">
          <Download className="h-4 w-4 mr-1" /> Export CSV
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card className="p-5">
          <h3 className="text-sm font-semibold mb-4">Listings by Category</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={categoryData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="category" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
              <YAxis tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" />
              <Tooltip />
              <Bar dataKey="listings" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} name="Total" />
              <Bar dataKey="sold" fill="hsl(var(--success))" radius={[4, 4, 0, 0]} name="Sold" />
            </BarChart>
          </ResponsiveContainer>
        </Card>
        <Card className="p-5">
          <h3 className="text-sm font-semibold mb-4">Status Distribution</h3>
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie data={statusData} dataKey="value" cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={4}>
                {statusData.map((e, i) => <Cell key={i} fill={e.color} />)}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
          <div className="flex flex-wrap gap-3 mt-2 justify-center">
            {statusData.map((d) => (
              <span key={d.name} className="text-xs flex items-center gap-1">
                <span className="h-2.5 w-2.5 rounded-full" style={{ background: d.color }} /> {d.name} ({d.value})
              </span>
            ))}
          </div>
        </Card>
      </div>
    </AdminLayout>
  );
}
