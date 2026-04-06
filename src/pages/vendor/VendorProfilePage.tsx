import { useState, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Store, Mail, Phone, MapPin, Shield, Star, CreditCard, Building2, Crown, ImagePlus, Camera } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { VendorLayout } from "@/components/vendor/VendorLayout";
import { useAuth } from "@/lib/auth";
import { api } from "@/lib/api";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export default function VendorProfilePage() {
  const { vendorUser } = useAuth();
  const vendorId = vendorUser?.vendor_id || "VND-001";
  const queryClient = useQueryClient();
  const [txnId, setTxnId] = useState("");

  const { data: vendor, isLoading } = useQuery({
    queryKey: ["vendorProfile", vendorId],
    queryFn: () => api.getVendorProfile(vendorId),
  });

  const { data: vendorPlan } = useQuery({
    queryKey: ["vendorPlanDetail", (vendor as any)?.plan_id],
    enabled: !!(vendor as any)?.plan_id,
    queryFn: async () => {
      const { data } = await supabase.from("vendor_plans").select("*").eq("id", (vendor as any).plan_id).single();
      return data;
    },
  });

  const { data: platformVars = [] } = useQuery({
    queryKey: ["companyBankDetails"],
    queryFn: async () => {
      const { data } = await supabase.from("platform_variables").select("*").in("key", [
        "company_account_name", "company_account_number", "company_ifsc", "company_bank_name",
      ]);
      return data || [];
    },
  });

  const submitTxnId = useMutation({
    mutationFn: async () => {
      if (!txnId.trim()) throw new Error("Enter transaction ID");
      await supabase.from("vendors").update({
        plan_transaction_id: txnId.trim(),
        plan_payment_status: "offline_pending",
      }).eq("id", vendorId);
    },
    onSuccess: () => {
      toast.success("Transaction ID submitted. Admin will verify.");
      queryClient.invalidateQueries({ queryKey: ["vendorProfile"] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const handleRazorpayPayment = async () => {
    if (!vendorPlan) return;
    // Load Razorpay
    const { data: vars } = await supabase.from("platform_variables").select("*").in("key", ["razorpay_key_id"]);
    const razorpayKey = vars?.find(v => v.key === "razorpay_key_id")?.value;
    if (!razorpayKey) { toast.error("Payment gateway not configured"); return; }

    const options = {
      key: razorpayKey,
      amount: Number(vendorPlan.price) * 100,
      currency: "INR",
      name: "Planext4U",
      description: `${vendorPlan.plan_name} Plan`,
      handler: async (response: any) => {
        await supabase.from("vendors").update({
          plan_payment_status: "paid",
          plan_transaction_id: response.razorpay_payment_id,
        }).eq("id", vendorId);
        toast.success("Payment successful!");
        queryClient.invalidateQueries({ queryKey: ["vendorProfile"] });
      },
      prefill: { name: vendor?.name, email: vendor?.email, contact: vendor?.mobile },
    };
    const rzp = new (window as any).Razorpay(options);
    rzp.open();
  };

  const getVar = (key: string) => platformVars.find(v => v.key === key)?.value || "";
  const paymentStatus = (vendor as any)?.plan_payment_status || "unpaid";

  if (isLoading) return <VendorLayout title="Profile"><div className="p-8"><Skeleton className="h-48 rounded-xl" /></div></VendorLayout>;

  return (
    <VendorLayout title="Business Profile">
      <div className="max-w-3xl mx-auto px-4 py-6 space-y-6">
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

        {/* Plan & Payment Section */}
        <Card className="p-5 space-y-4">
          <h3 className="text-sm font-semibold flex items-center gap-2"><Crown className="h-4 w-4 text-primary" /> Plan & Payment</h3>

          <div className="flex items-center justify-between bg-primary/5 rounded-xl p-4">
            <div>
              <p className="text-sm font-bold text-primary">{vendorPlan?.plan_name || vendor?.membership === 'premium' ? 'Premium Plan' : 'Basic Plan'}</p>
              <p className="text-xs text-muted-foreground">{vendorPlan ? `₹${vendorPlan.price} · ${vendorPlan.validity_days} days · ${vendorPlan.visibility_type.replace(/_/g, " ")}` : 'Standard commission rates'}</p>
            </div>
            <Badge className={`border-0 ${paymentStatus === 'paid' ? 'bg-success/10 text-success' : paymentStatus === 'offline_pending' ? 'bg-warning/10 text-warning' : 'bg-destructive/10 text-destructive'}`}>
              <CreditCard className="h-3 w-3 mr-1" />
              {paymentStatus === 'offline_pending' ? 'Verification Pending' : paymentStatus}
            </Badge>
          </div>

          {paymentStatus !== 'paid' && vendorPlan && (
            <>
              {/* Online Payment */}
              {(vendorPlan.payment_mode === 'online' || vendorPlan.payment_mode === 'both') && (
                <div className="p-4 rounded-lg border border-primary/20 bg-primary/5">
                  <h4 className="text-sm font-semibold mb-2">Pay Online via Razorpay</h4>
                  <p className="text-xs text-muted-foreground mb-3">Instant activation after payment of ₹{vendorPlan.price}</p>
                  <Button onClick={handleRazorpayPayment} className="w-full gap-2">
                    <CreditCard className="h-4 w-4" /> Pay ₹{vendorPlan.price} Now
                  </Button>
                  {vendorPlan.payment_mode === 'both' && (
                    <p className="text-[10px] text-center text-muted-foreground mt-2">Or pay offline using bank transfer below</p>
                  )}
                </div>
              )}

              {/* Offline Payment */}
              {(vendorPlan.payment_mode === 'offline' || vendorPlan.payment_mode === 'both') && (
                <div className="p-4 rounded-lg border border-muted bg-secondary/30">
                  <h4 className="text-sm font-semibold flex items-center gap-2 mb-3"><Building2 className="h-4 w-4" /> Offline Bank Transfer</h4>
                  <div className="grid grid-cols-2 gap-2 text-xs mb-3">
                    <div><span className="text-muted-foreground">Account Name:</span> <span className="font-medium">{getVar("company_account_name") || "Planext4U Pvt Ltd"}</span></div>
                    <div><span className="text-muted-foreground">Account No:</span> <span className="font-mono font-medium">{getVar("company_account_number") || "1234567890123"}</span></div>
                    <div><span className="text-muted-foreground">IFSC:</span> <span className="font-mono font-medium">{getVar("company_ifsc") || "SBIN0001234"}</span></div>
                    <div><span className="text-muted-foreground">Bank:</span> <span className="font-medium">{getVar("company_bank_name") || "State Bank of India"}</span></div>
                  </div>
                  <Label className="text-xs">Enter Transaction / UTR ID after payment</Label>
                  <div className="flex gap-2 mt-1">
                    <Input value={txnId} onChange={(e) => setTxnId(e.target.value)} placeholder="Transaction ID / UTR number" />
                    <Button size="sm" onClick={() => submitTxnId.mutate()} disabled={submitTxnId.isPending || !txnId.trim()}>
                      Submit
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}

          {(vendor as any)?.plan_transaction_id && (
            <div className="text-xs text-muted-foreground">
              Transaction ID: <span className="font-mono font-medium">{(vendor as any).plan_transaction_id}</span>
            </div>
          )}
        </Card>

        <Card className="p-5">
          <h3 className="text-sm font-semibold mb-3">Performance</h3>
          <div className="grid grid-cols-3 gap-3 text-center">
            <div><p className="text-lg font-bold">{vendor?.total_products || 0}</p><p className="text-xs text-muted-foreground">Products</p></div>
            <div><p className="text-lg font-bold">{vendor?.total_orders || 0}</p><p className="text-xs text-muted-foreground">Orders</p></div>
            <div><p className="text-lg font-bold">₹{((vendor?.total_revenue || 0) / 1000).toFixed(0)}k</p><p className="text-xs text-muted-foreground">Revenue</p></div>
          </div>
        </Card>
      </div>
    </VendorLayout>
  );
}
