import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Store, Mail, Phone, MapPin, Shield, Star, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { api } from "@/lib/api";

export default function VendorProfilePage() {
  const { data: vendor, isLoading } = useQuery({
    queryKey: ["vendorProfile"],
    queryFn: () => api.getVendorProfile("VND-001"),
  });

  if (isLoading) return <div className="min-h-screen bg-background p-8"><Skeleton className="h-48 rounded-xl" /></div>;

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-30 bg-card/95 backdrop-blur-sm border-b border-border/50">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center gap-3">
          <Button variant="ghost" size="icon" asChild><Link to="/vendor"><ArrowLeft className="h-5 w-5" /></Link></Button>
          <h1 className="font-semibold">Business Profile</h1>
        </div>
      </header>
      <main className="max-w-3xl mx-auto px-4 py-6 space-y-6">
        <Card className="p-6">
          <div className="flex items-center gap-4">
            <div className="h-16 w-16 rounded-2xl bg-primary/10 flex items-center justify-center"><Store className="h-8 w-8 text-primary" /></div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold">{vendor?.business_name}</h2>
                <Badge className={`border-0 text-[10px] ${vendor?.status === 'verified' ? 'bg-success/10 text-success' : 'bg-warning/10 text-warning'}`}>{vendor?.status}</Badge>
              </div>
              <p className="text-sm text-muted-foreground">{vendor?.name} • Category {vendor?.category_id}</p>
              {vendor?.rating ? <div className="flex items-center gap-1 mt-0.5"><Star className="h-3.5 w-3.5 fill-warning text-warning" /><span className="text-sm font-medium">{vendor.rating}</span><span className="text-xs text-muted-foreground">({vendor.total_orders} orders)</span></div> : null}
            </div>
          </div>
        </Card>
        <Card className="p-5 space-y-4">
          <h3 className="text-sm font-semibold">Business Details</h3>
          {[
            { icon: Mail, label: "Email", value: vendor?.email },
            { icon: Phone, label: "Phone", value: vendor?.mobile },
            { icon: MapPin, label: "Location", value: `Area ${vendor?.area_id}, City ${vendor?.city_id}` },
            { icon: Shield, label: "Commission Rate", value: `${vendor?.commission_rate}%` },
          ].map((d) => (
            <div key={d.label} className="flex items-center gap-3">
              <d.icon className="h-4 w-4 text-muted-foreground shrink-0" />
              <div><p className="text-xs text-muted-foreground">{d.label}</p><p className="text-sm font-medium">{d.value}</p></div>
            </div>
          ))}
        </Card>
        <Card className="p-5 space-y-4">
          <h3 className="text-sm font-semibold">Membership</h3>
          <div className="flex items-center justify-between bg-primary/5 rounded-xl p-4">
            <div>
              <p className="text-sm font-bold text-primary">{vendor?.membership === 'premium' ? 'Premium Plan' : 'Basic Plan'}</p>
              <p className="text-xs text-muted-foreground">{vendor?.membership === 'premium' ? 'Lower commission, priority support' : 'Standard commission rates'}</p>
            </div>
            <Badge className="bg-primary text-primary-foreground">Active</Badge>
          </div>
        </Card>
        <Card className="p-5">
          <h3 className="text-sm font-semibold mb-3">Performance</h3>
          <div className="grid grid-cols-3 gap-3 text-center">
            <div><p className="text-lg font-bold">{vendor?.total_products || 0}</p><p className="text-xs text-muted-foreground">Products</p></div>
            <div><p className="text-lg font-bold">{vendor?.total_orders || 0}</p><p className="text-xs text-muted-foreground">Orders</p></div>
            <div><p className="text-lg font-bold">₹{((vendor?.total_revenue || 0) / 1000).toFixed(0)}k</p><p className="text-xs text-muted-foreground">Revenue</p></div>
          </div>
        </Card>
        <Button variant="outline" className="w-full text-destructive"><LogOut className="h-4 w-4 mr-2" /> Logout</Button>
      </main>
    </div>
  );
}
