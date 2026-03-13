import { AdminLayout } from "@/components/admin/AdminLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis } from "recharts";
import { downloadCSV } from "@/lib/csv";

const vendorData = [
  { name: "TechMart", revenue: 485000, orders: 1240, rating: 4.8, fulfillment: 96 },
  { name: "FashionHub", revenue: 392000, orders: 980, rating: 4.5, fulfillment: 92 },
  { name: "HomeDecor", revenue: 321000, orders: 756, rating: 4.7, fulfillment: 94 },
  { name: "GadgetWorld", revenue: 278000, orders: 654, rating: 4.3, fulfillment: 88 },
  { name: "BookStore+", revenue: 195000, orders: 520, rating: 4.9, fulfillment: 98 },
];

const radarData = [
  { metric: "Revenue", TechMart: 95, FashionHub: 80, HomeDecor: 65 },
  { metric: "Orders", TechMart: 90, FashionHub: 75, HomeDecor: 60 },
  { metric: "Rating", TechMart: 96, FashionHub: 90, HomeDecor: 94 },
  { metric: "Fulfillment", TechMart: 96, FashionHub: 92, HomeDecor: 94 },
  { metric: "Returns", TechMart: 85, FashionHub: 78, HomeDecor: 90 },
];

export default function VendorReportPage() {
  return (
    <AdminLayout>
      <div className="page-header">
        <div>
          <h1 className="page-title">Vendor Performance</h1>
          <p className="page-description">Vendor-wise revenue, ratings, and fulfillment metrics</p>
        </div>
        <Button onClick={() => downloadCSV(vendorData, ["name", "revenue", "orders", "rating", "fulfillment"], "vendor_report")} variant="outline" size="sm">
          <Download className="h-4 w-4 mr-1" /> Export CSV
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
        <Card className="p-5">
          <h3 className="text-sm font-semibold mb-4">Revenue by Vendor</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={vendorData} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis type="number" tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`} />
              <YAxis type="category" dataKey="name" tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" width={90} />
              <Tooltip formatter={(v: number) => [`₹${v.toLocaleString()}`]} />
              <Bar dataKey="revenue" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Card>
        <Card className="p-5">
          <h3 className="text-sm font-semibold mb-4">Performance Comparison</h3>
          <ResponsiveContainer width="100%" height={300}>
            <RadarChart data={radarData}>
              <PolarGrid stroke="hsl(var(--border))" />
              <PolarAngleAxis dataKey="metric" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
              <PolarRadiusAxis tick={{ fontSize: 10 }} />
              <Radar name="TechMart" dataKey="TechMart" stroke="hsl(var(--primary))" fill="hsl(var(--primary))" fillOpacity={0.2} />
              <Radar name="FashionHub" dataKey="FashionHub" stroke="hsl(var(--success))" fill="hsl(var(--success))" fillOpacity={0.2} />
              <Tooltip />
            </RadarChart>
          </ResponsiveContainer>
        </Card>
      </div>

      <Card className="p-5">
        <h3 className="text-sm font-semibold mb-4">Vendor Summary</h3>
        <div className="overflow-auto">
          <table className="admin-table w-full">
            <thead><tr><th>Vendor</th><th>Revenue</th><th>Orders</th><th>Rating</th><th>Fulfillment %</th></tr></thead>
            <tbody>
              {vendorData.map((v) => (
                <tr key={v.name}><td className="font-medium">{v.name}</td><td>₹{v.revenue.toLocaleString()}</td><td>{v.orders}</td><td>⭐ {v.rating}</td><td>{v.fulfillment}%</td></tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </AdminLayout>
  );
}
