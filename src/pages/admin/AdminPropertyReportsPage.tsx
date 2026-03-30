import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Home, TrendingUp, Eye, MessageCircle, Shield, Download, MapPin, Users } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from "recharts";

const COLORS = ["hsl(var(--primary))", "hsl(var(--success))", "hsl(var(--warning))", "hsl(var(--destructive))", "#8b5cf6", "#06b6d4"];

export default function AdminPropertyReportsPage() {
  const [dateRange, setDateRange] = useState("30d");

  const { data: properties } = useQuery({
    queryKey: ["adminPropertyReportData"],
    queryFn: async () => {
      const { data } = await supabase.from("properties" as any).select("*");
      return (data || []) as any[];
    },
  });

  const { data: enquiries } = useQuery({
    queryKey: ["adminEnquiryReport"],
    queryFn: async () => {
      const { data } = await supabase.from("property_enquiries" as any).select("*");
      return (data || []) as any[];
    },
  });

  const all = properties || [];
  const totalViews = all.reduce((s: number, p: any) => s + (p.views_count || 0), 0);
  const totalEnquiries = enquiries?.length || 0;
  const verified = all.filter((p: any) => p.is_verified).length;

  // Status distribution
  const statusData = ["draft", "submitted", "active", "rejected", "paused", "expired", "sold"].map(s => ({
    name: s.charAt(0).toUpperCase() + s.slice(1), value: all.filter((p: any) => p.status === s).length,
  })).filter(d => d.value > 0);

  // Transaction type distribution
  const txData = ["rent", "sale", "lease", "pg"].map(t => ({
    name: t.charAt(0).toUpperCase() + t.slice(1), value: all.filter((p: any) => p.transaction_type === t).length,
  })).filter(d => d.value > 0);

  // City-wise
  const cityMap: Record<string, number> = {};
  all.forEach((p: any) => { if (p.city) cityMap[p.city] = (cityMap[p.city] || 0) + 1; });
  const cityData = Object.entries(cityMap).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value).slice(0, 10);

  // Monthly listings
  const monthMap: Record<string, number> = {};
  all.forEach((p: any) => {
    const d = new Date(p.created_at);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    monthMap[key] = (monthMap[key] || 0) + 1;
  });
  const monthlyData = Object.entries(monthMap).sort().slice(-12).map(([name, count]) => ({ name, count }));

  const handleExport = () => {
    const header = "ID,Title,City,Type,Transaction,Price,Status,Views,Enquiries,Created\n";
    const rows = all.map((p: any) => `${p.id},${p.title?.replace(/,/g, " ")},${p.city},${p.property_type},${p.transaction_type},${p.price},${p.status},${p.views_count || 0},${p.enquiry_count || 0},${p.created_at}`).join("\n");
    const blob = new Blob([header + rows], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = "property-report.csv"; a.click();
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold">Property Reports</h1>
          <Button variant="outline" size="sm" onClick={handleExport}><Download className="h-4 w-4 mr-1" />Export CSV</Button>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: "Total Properties", value: all.length, icon: Home, color: "text-primary" },
            { label: "Total Views", value: totalViews, icon: Eye, color: "text-success" },
            { label: "Total Enquiries", value: totalEnquiries, icon: MessageCircle, color: "text-warning" },
            { label: "Verified", value: verified, icon: Shield, color: "text-primary" },
          ].map(s => (
            <Card key={s.label} className="p-4">
              <div className="flex items-center gap-2 mb-1">
                <s.icon className={`h-4 w-4 ${s.color}`} />
                <span className="text-xs text-muted-foreground">{s.label}</span>
              </div>
              <p className="text-2xl font-bold">{s.value.toLocaleString()}</p>
            </Card>
          ))}
        </div>

        {/* Charts */}
        <div className="grid md:grid-cols-2 gap-4">
          <Card className="p-4">
            <h3 className="text-sm font-semibold mb-3">Listings by Status</h3>
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie data={statusData} cx="50%" cy="50%" outerRadius={90} dataKey="value" label={({ name, value }) => `${name}: ${value}`}>
                  {statusData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </Card>

          <Card className="p-4">
            <h3 className="text-sm font-semibold mb-3">Transaction Types</h3>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={txData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Bar dataKey="value" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </Card>

          <Card className="p-4">
            <h3 className="text-sm font-semibold mb-3">Top Cities</h3>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={cityData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis type="number" tick={{ fontSize: 11 }} />
                <YAxis dataKey="name" type="category" tick={{ fontSize: 11 }} width={80} />
                <Tooltip />
                <Bar dataKey="value" fill="hsl(var(--success))" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </Card>

          <Card className="p-4">
            <h3 className="text-sm font-semibold mb-3">Monthly New Listings</h3>
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={monthlyData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Line type="monotone" dataKey="count" stroke="hsl(var(--primary))" strokeWidth={2} dot={{ r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          </Card>
        </div>
      </div>
    </AdminLayout>
  );
}
