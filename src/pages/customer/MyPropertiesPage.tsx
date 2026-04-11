import { Link, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Plus, Eye, Phone, MessageCircle, Edit, Pause, Play, Trash2, Home } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { CustomerLayout } from "@/components/customer/CustomerLayout";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const STATUS_COLORS: Record<string, string> = {
  draft: "bg-secondary text-secondary-foreground",
  submitted: "bg-warning/10 text-warning",
  active: "bg-success/10 text-success",
  rejected: "bg-destructive/10 text-destructive",
  paused: "bg-muted text-muted-foreground",
  expired: "bg-muted text-muted-foreground",
};

export default function MyPropertiesPage() {
  const navigate = useNavigate();
  const { customerUser } = useAuth();

  const { data: properties, isLoading } = useQuery({
    queryKey: ["myProperties", customerUser?.id],
    queryFn: async () => {
      if (!customerUser) return [];
      const userId = customerUser.customer_id || customerUser.id;
      const { data } = await supabase.from("properties" as any).select("*").eq("user_id", userId).order("created_at", { ascending: false });
      return (data || []) as any[];
    },
    enabled: !!customerUser,
  });

  if (!customerUser) {
    return (
      <CustomerLayout>
        <div className="text-center py-20 px-4">
          <Home className="h-16 w-16 text-muted-foreground/30 mx-auto mb-4" />
          <h2 className="text-xl font-bold">Login Required</h2>
          <Button className="mt-4" onClick={() => navigate("/app/login")}>Login</Button>
        </div>
      </CustomerLayout>
    );
  }

  return (
    <CustomerLayout>
      <div className="max-w-3xl mx-auto pb-32 md:pb-6">
        <div className="px-4 py-3 flex items-center justify-between border-b border-border/30">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate(-1)} className="h-9 w-9 rounded-full border border-border/50 flex items-center justify-center">
              <ArrowLeft className="h-4 w-4" />
            </button>
            <h1 className="text-base font-bold">My Properties</h1>
          </div>
          <Link to="/app/find-home/post">
            <Button size="sm" className="gap-1 h-8 text-xs rounded-full"><Plus className="h-3 w-3" /> Post New</Button>
          </Link>
        </div>

        {/* Stats */}
        <div className="px-4 py-4 grid grid-cols-3 gap-3">
          {[
            { label: "Total Views", value: properties?.reduce((s: number, p: any) => s + (p.views_count || 0), 0) || 0 },
            { label: "Contact Reveals", value: properties?.reduce((s: number, p: any) => s + (p.contact_reveals || 0), 0) || 0 },
            { label: "Enquiries", value: properties?.reduce((s: number, p: any) => s + (p.enquiry_count || 0), 0) || 0 },
          ].map((stat) => (
            <Card key={stat.label} className="p-3 text-center">
              <p className="text-lg font-bold">{stat.value}</p>
              <p className="text-[10px] text-muted-foreground">{stat.label}</p>
            </Card>
          ))}
        </div>

        {/* Property List */}
        <div className="px-4 space-y-3">
          {isLoading ? (
            Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-28 rounded-xl" />)
          ) : !properties?.length ? (
            <div className="text-center py-16">
              <Home className="h-16 w-16 text-muted-foreground/30 mx-auto mb-4" />
              <h3 className="text-lg font-bold">No Properties Posted</h3>
              <p className="text-sm text-muted-foreground mt-1">Start by posting your first property</p>
              <Link to="/app/find-home/post"><Button className="mt-4 rounded-full">Post Property</Button></Link>
            </div>
          ) : properties.map((p: any) => {
            const images = Array.isArray(p.images) ? p.images : [];
            const img = images[0] || "/images/properties/apartment-2bhk.jpg";
            return (
              <Card key={p.id} className="overflow-hidden">
                <div className="flex">
                  <img src={img} alt={p.title} className="w-24 h-24 object-cover shrink-0" loading="lazy" />
                  <div className="flex-1 p-3">
                    <div className="flex items-start justify-between">
                      <h3 className="text-xs font-bold line-clamp-1 flex-1">{p.title}</h3>
                      <Badge className={`${STATUS_COLORS[p.status] || ""} text-[9px] ml-1 capitalize`}>{p.status}</Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">{p.locality}, {p.city}</p>
                    <p className="text-sm font-bold text-primary mt-1">₹{Number(p.price).toLocaleString("en-IN")}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-[10px] text-muted-foreground flex items-center gap-0.5"><Eye className="h-3 w-3" />{p.views_count || 0}</span>
                      <span className="text-[10px] text-muted-foreground flex items-center gap-0.5"><Phone className="h-3 w-3" />{p.contact_reveals || 0}</span>
                      <span className="text-[10px] text-muted-foreground flex items-center gap-0.5"><MessageCircle className="h-3 w-3" />{p.enquiry_count || 0}</span>
                    </div>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      </div>
    </CustomerLayout>
  );
}
