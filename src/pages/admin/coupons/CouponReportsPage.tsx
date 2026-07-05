import { AdminLayout } from "@/components/admin/AdminLayout";
import { CouponAdminNav } from "@/components/admin/CouponAdminNav";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { CouponExportDialog } from "@/components/admin/CouponExportDialog";
import { supabase } from "@/integrations/supabase/client";
import { useEffect } from "react";
import { FileDown } from "lucide-react";

export default function CouponReportsPage() {
  const [open, setOpen] = useState(false);
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [vendors, setVendors] = useState<any[]>([]);
  const [districts, setDistricts] = useState<any[]>([]);

  useEffect(() => {
    Promise.all([
      supabase.from("coupon_campaigns").select("*").order("created_at", { ascending: false }),
      supabase.from("vendors").select("id,business_name,name").eq("status", "active"),
      supabase.from("districts").select("id,name,state_id").eq("status", "active"),
    ]).then(([c, v, d]) => {
      setCampaigns(c.data || []); setVendors(v.data || []); setDistricts(d.data || []);
    });
  }, []);

  return (
    <AdminLayout>
      <div className="page-header">
        <h1 className="page-title">Coupon Reports</h1>
        <p className="page-description">Advanced filtered exports · CSV, Excel, PDF</p>
      </div>
      <CouponAdminNav />
      <Card className="p-6 text-center space-y-3">
        <FileDown className="w-10 h-10 mx-auto text-primary" />
        <p className="text-sm text-muted-foreground max-w-md mx-auto">
          Export coupon redemptions, usage history and campaign performance with advanced filters and multiple file formats.
        </p>
        <Button onClick={() => setOpen(true)}><FileDown className="w-4 h-4 mr-1" />Open Export</Button>
      </Card>
      <CouponExportDialog open={open} onClose={() => setOpen(false)} campaigns={campaigns} vendors={vendors} districts={districts} />
    </AdminLayout>
  );
}
