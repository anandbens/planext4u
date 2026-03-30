import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Home, TrendingUp, Eye, MessageCircle, Shield, Download, MapPin, Users, Star, Crown, BarChart3 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line, AreaChart, Area } from "recharts";

const COLORS = ["hsl(var(--primary))", "hsl(var(--success))", "hsl(var(--warning))", "hsl(var(--destructive))", "#8b5cf6", "#06b6d4", "#f97316"];

export default function AdminPropertyReportsPage() {
  const [dateRange, setDateRange] = useState("30d");

  const { data: properties } = useQuery({
    queryKey: ["adminPropertyReportData"],
    queryFn: async () => {
      const { data } = await supabase.from("properties").select("*");
      return (data || []) as any[];
    },
  });

  const { data: enquiries } = useQuery({
    queryKey: ["adminEnquiryReport"],
    queryFn: async () => {
      const { data } = await supabase.from("property_enquiries").select("*");
      return (data || []) as any[];
    },
  });

  const { data: visits } = useQuery({
    queryKey: ["adminVisitsReport"],
    queryFn: async () => {
      const { data } = await supabase.from("property_visits").select("*");
      return (data || []) as any[];
    },
  });

  const { data: bookmarks } = useQuery({
    queryKey: ["adminBookmarksReport"],
    queryFn: async () => {
      const { data } = await supabase.from("property_bookmarks").select("*");
      return (data || []) as any[];
    },
  });

  const all = properties || [];
  const today = new Date().toISOString().split("T")[0];
  const todayListings = all.filter((p: any) => p.created_at?.startsWith(today)).length;
  const totalViews = all.reduce((s: number, p: any) => s + (p.views_count || 0), 0);
  const totalEnquiries = enquiries?.length || 0;
  const totalVisits = visits?.length || 0;
  const totalBookmarks = bookmarks?.length || 0;
  const verified = all.filter((p: any) => p.is_verified).length;
  const activeListings = all.filter((p: any) => p.status === "active").length;
  const contactReveals = all.reduce((s: number, p: any) => s + (p.contact_reveals || 0), 0);

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

  // Monthly listings trend
  const monthMap: Record<string, number> = {};
  all.forEach((p: any) => {
    const d = new Date(p.created_at);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    monthMap[key] = (monthMap[key] || 0) + 1;
  });
  const monthlyData = Object.entries(monthMap).sort().slice(-12).map(([name, count]) => ({ name, count }));

  // Daily contacts revealed (last 30 days)
  const dailyContacts: Record<string, number> = {};
  const thirtyDaysAgo = new Date(); thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  (enquiries || []).forEach((e: any) => {
    const d = new Date(e.created_at).toISOString().split("T")[0];
    if (new Date(d) >= thirtyDaysAgo) dailyContacts[d] = (dailyContacts[d] || 0) + 1;
  });
  const dailyContactData = Object.entries(dailyContacts).sort().map(([date, count]) => ({ date: date.slice(5), count }));

  // Top performing (most viewed)
  const topViewed = [...all].sort((a: any, b: any) => (b.views_count || 0) - (a.views_count || 0)).slice(0, 5);

  // Property type breakdown
  const typeMap: Record<string, number> = {};
  all.forEach((p: any) => { const t = p.property_type?.replace(/_/g, " ") || "Other"; typeMap[t] = (typeMap[t] || 0) + 1; });
  const typeData = Object.entries(typeMap).map(([name, value]) => ({ name: name.charAt(0).toUpperCase() + name.slice(1), value })).sort((a, b) => b.value - a.value);

  const handleExport = () => {
    const header = "ID,Title,City,Locality,Type,Transaction,Price,Status,Views,Enquiries,Contacts,Verified,Created\n";
    const rows = all.map((p: any) =>
      `${p.id},${p.title?.replace(/,/g, " ")},${p.city},${p.locality},${p.property_type},${p.transaction_type},${p.price},${p.status},${p.views_count || 0},${p.enquiry_count || 0},${p.contact_reveals || 0},${p.is_verified},${p.created_at}`
    ).join("\n");
    const blob = new Blob([header + rows], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = "property-report.csv"; a.click();
  };

  const kpis = [
    { label: "Total Properties", value: all.length, icon: Home, color: "text-primary" },
    { label: "Active Listings", value: activeListings, icon: TrendingUp, color: "text-success" },
    { label: "Added Today", value: todayListings, icon: Star, color: "text-warning" },
    { label: "Total Views", value: totalViews, icon: Eye, color: "text-info" },
    { label: "Contacts Revealed", value: contactReveals, icon: Users, color: "text-primary" },
    { label: "Enquiries", value: totalEnquiries, icon: MessageCircle, color: "text-warning" },
    { label: "Visit Requests", value: totalVisits, icon: MapPin, color: "text-success" },
    { label: "Shortlisted", value: totalBookmarks, icon: Crown, color: "text-primary" },
  ];

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold">Property Reports & Analytics</h1>
          <div className="flex gap-2">
            <Select value={dateRange} onValueChange={setDateRange}>
              <SelectTrigger className="w-32 h-8 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="7d">Last 7 days</SelectItem>
                <SelectItem value="30d">Last 30 days</SelectItem>
                <SelectItem value="90d">Last 90 days</SelectItem>
                <SelectItem value="all">All time</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" size="sm" onClick={handleExport}><Download className="h-4 w-4 mr-1" />Export CSV</Button>
          </div>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {kpis.map(k => (
            <Card key={k.label} className="p-4">
              <div className="flex items-center gap-2 mb-1">
                <k.icon className={`h-4 w-4 ${k.color}`} />
                <span className="text-xs text-muted-foreground">{k.label}</span>
              </div>
              <p className="text-2xl font-bold">{k.value.toLocaleString()}</p>
            </Card>
          ))}
        </div>

        {/* Charts Row 1 */}
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
        </div>

        {/* Charts Row 2 */}
        <div className="grid md:grid-cols-2 gap-4">
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
              <AreaChart data={monthlyData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Area type="monotone" dataKey="count" stroke="hsl(var(--primary))" fill="hsl(var(--primary))" fillOpacity={0.1} strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </Card>
        </div>

        {/* Charts Row 3 */}
        <div className="grid md:grid-cols-2 gap-4">
          <Card className="p-4">
            <h3 className="text-sm font-semibold mb-3">Daily Enquiries (30 days)</h3>
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={dailyContactData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Line type="monotone" dataKey="count" stroke="hsl(var(--warning))" strokeWidth={2} dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          </Card>

          <Card className="p-4">
            <h3 className="text-sm font-semibold mb-3">Property Types</h3>
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie data={typeData} cx="50%" cy="50%" innerRadius={50} outerRadius={90} dataKey="value" label={({ name, value }) => `${name}: ${value}`}>
                  {typeData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </Card>
        </div>

        {/* Top Performing */}
        <Card className="p-4">
          <h3 className="text-sm font-semibold mb-3">Top Performing Listings</h3>
          <div className="space-y-2">
            {topViewed.map((p: any, i: number) => (
              <div key={p.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
                <div className="flex items-center gap-3">
                  <span className="text-lg font-bold text-muted-foreground/50">#{i + 1}</span>
                  <div>
                    <p className="text-sm font-medium">{p.title}</p>
                    <p className="text-xs text-muted-foreground">{p.locality}, {p.city} • ₹{Number(p.price).toLocaleString("en-IN")}</p>
                  </div>
                </div>
                <div className="flex items-center gap-4 text-xs">
                  <div className="text-center"><Eye className="h-3 w-3 mx-auto text-muted-foreground" /><span>{p.views_count || 0}</span></div>
                  <div className="text-center"><MessageCircle className="h-3 w-3 mx-auto text-muted-foreground" /><span>{p.enquiry_count || 0}</span></div>
                  <div className="text-center"><Users className="h-3 w-3 mx-auto text-muted-foreground" /><span>{p.contact_reveals || 0}</span></div>
                </div>
              </div>
            ))}
            {topViewed.length === 0 && <p className="text-sm text-muted-foreground text-center py-4">No listings yet</p>}
          </div>
        </Card>
      </div>
    </AdminLayout>
  );
}
