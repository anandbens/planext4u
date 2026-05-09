import { useState, useRef, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Store, Mail, Phone, MapPin, Shield, Star, CreditCard, Building2, Crown, ImagePlus, Camera, Pencil, Save, X, Navigation, Loader2 } from "lucide-react";
import { getLocation } from "@/lib/device-service";
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
  const bgInputRef = useRef<HTMLInputElement>(null);
  const [bgUploading, setBgUploading] = useState(false);
  const [editingProfile, setEditingProfile] = useState(false);
  const [profileForm, setProfileForm] = useState({ email: "", mobile: "", area_id: "", city_id: "", shop_address: "", shop_latitude: "" as string | number, shop_longitude: "" as string | number });
  const [detectingLoc, setDetectingLoc] = useState(false);

  const detectLocation = async () => {
    setDetectingLoc(true);
    try {
      const coords = await getLocation();
      if (!coords) { toast.error("Couldn't read your location."); return; }
      let address = profileForm.shop_address;
      try {
        const { data: kv } = await supabase.from("platform_variables").select("value").eq("key", "GOOGLE_MAPS_API_KEY").maybeSingle();
        const apiKey = kv?.value || "AIzaSyAoz0ZK26oE1qZSKK8pG1Ebh9sTTeaOl7M";
        const res = await fetch(`https://maps.googleapis.com/maps/api/geocode/json?latlng=${coords.lat},${coords.lng}&key=${apiKey}`);
        const data = await res.json();
        if (data.status === "OK" && data.results?.[0]) address = data.results[0].formatted_address;
      } catch {}
      setProfileForm(f => ({ ...f, shop_latitude: coords.lat, shop_longitude: coords.lng, shop_address: address }));
      toast.success("Location captured");
    } catch (e: any) {
      toast.error(e?.message || "Could not detect location");
    } finally {
      setDetectingLoc(false);
    }
  };

  const saveProfileMutation = useMutation({
    mutationFn: async () => {
      const lat = profileForm.shop_latitude === "" ? null : Number(profileForm.shop_latitude);
      const lng = profileForm.shop_longitude === "" ? null : Number(profileForm.shop_longitude);
      const { error } = await supabase.from("vendors").update({
        email: profileForm.email,
        mobile: profileForm.mobile,
        shop_address: profileForm.shop_address,
        shop_latitude: lat,
        shop_longitude: lng,
      } as any).eq("id", vendorId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Profile updated");
      setEditingProfile(false);
      queryClient.invalidateQueries({ queryKey: ["vendorProfile"] });
    },
    onError: (e: any) => toast.error(e.message),
  });

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

  const { data: perfStats = { products: 0, orders: 0, revenue: 0 } } = useQuery({
    queryKey: ["vendorPerfStats", vendorId],
    queryFn: async () => {
      const [{ count: products }, { data: ordersData }] = await Promise.all([
        supabase.from("products").select("*", { count: "exact", head: true }).eq("vendor_id", vendorId),
        supabase.from("orders").select("total, status").eq("vendor_id", vendorId),
      ]);
      const orders = ordersData || [];
      const revenue = orders.filter(o => !['cancelled'].includes(o.status)).reduce((s, o) => s + (o.total || 0), 0);
      return { products: products || 0, orders: orders.length, revenue };
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
  const backgroundImage = (vendor as any)?.background_image || "";

  const handleBgUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setBgUploading(true);
    try {
      const { compressToWebP } = await import("@/lib/webp-compress");
      const { uploadToB2 } = await import("@/lib/b2-upload");
      const { blob, contentType } = await compressToWebP(file);
      const { publicUrl } = await uploadToB2(blob, {
        folder: `vendor-assets/vendor-backgrounds`,
        filename: `${vendorId}.webp`,
        contentType,
      });
      await supabase.from("vendors").update({ background_image: publicUrl }).eq("id", vendorId);
      toast.success("Background image updated");
      queryClient.invalidateQueries({ queryKey: ["vendorProfile"] });
    } catch (err: any) {
      toast.error(err.message || "Upload failed");
    } finally {
      setBgUploading(false);
      e.target.value = "";
    }
  };

  if (isLoading) return <VendorLayout title="Profile"><div className="p-8"><Skeleton className="h-48 rounded-xl" /></div></VendorLayout>;

  return (
    <VendorLayout title="Business Profile">
      <div className="max-w-3xl mx-auto px-4 py-6 space-y-6">
        {/* Background Image */}
        <div className="relative rounded-2xl overflow-hidden h-40 bg-gradient-to-r from-primary/20 to-primary/5">
          {backgroundImage && <img src={backgroundImage} alt="Background" className="w-full h-full object-cover" />}
          <input ref={bgInputRef} type="file" className="hidden" accept="image/*" onChange={handleBgUpload} />
          <Button
            size="sm"
            variant="secondary"
            className="absolute bottom-3 right-3 gap-1 text-xs opacity-80 hover:opacity-100"
            onClick={() => bgInputRef.current?.click()}
            disabled={bgUploading}
          >
            {bgUploading ? "Uploading..." : <><ImagePlus className="h-3.5 w-3.5" /> Change Cover</>}
          </Button>
        </div>

        <Card className="p-6 -mt-10 relative z-10">
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
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold">Business Details</h3>
            {!editingProfile ? (
              <Button variant="ghost" size="sm" onClick={() => { setEditingProfile(true); setProfileForm({ email: vendor?.email || "", mobile: vendor?.mobile || "", area_id: vendor?.area_id || "", city_id: vendor?.city_id || "", shop_address: (vendor as any)?.shop_address || "", shop_latitude: (vendor as any)?.shop_latitude ?? "", shop_longitude: (vendor as any)?.shop_longitude ?? "" }); }}>
                <Pencil className="h-3.5 w-3.5 mr-1" /> Edit
              </Button>
            ) : (
              <div className="flex gap-1">
                <Button variant="ghost" size="sm" onClick={() => setEditingProfile(false)}><X className="h-3.5 w-3.5" /></Button>
                <Button size="sm" onClick={() => saveProfileMutation.mutate()} disabled={saveProfileMutation.isPending}>
                  <Save className="h-3.5 w-3.5 mr-1" /> Save
                </Button>
              </div>
            )}
          </div>
          {editingProfile ? (
            <div className="space-y-3">
              <div><Label className="text-xs">Email</Label><Input value={profileForm.email} onChange={e => setProfileForm(f => ({...f, email: e.target.value}))} className="h-9" /></div>
              <div><Label className="text-xs">Phone</Label><Input value={profileForm.mobile} onChange={e => setProfileForm(f => ({...f, mobile: e.target.value}))} className="h-9" /></div>
              <div><Label className="text-xs">Shop Address</Label><Input value={profileForm.shop_address} onChange={e => setProfileForm(f => ({...f, shop_address: e.target.value}))} className="h-9" /></div>
              <div className="space-y-2">
                <Label className="text-xs">Exact Shop Coordinates (used for nearby search)</Label>
                <div className="grid grid-cols-2 gap-2">
                  <Input placeholder="Latitude" value={profileForm.shop_latitude} onChange={e => setProfileForm(f => ({...f, shop_latitude: e.target.value}))} className="h-9" />
                  <Input placeholder="Longitude" value={profileForm.shop_longitude} onChange={e => setProfileForm(f => ({...f, shop_longitude: e.target.value}))} className="h-9" />
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button type="button" variant="outline" size="sm" onClick={detectLocation} disabled={detectingLoc}>
                    {detectingLoc ? <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" /> : <Navigation className="h-3.5 w-3.5 mr-1" />}
                    Use Current Location
                  </Button>
                  <Button type="button" variant="ghost" size="sm" asChild>
                    <a href={`https://www.google.com/maps${profileForm.shop_latitude && profileForm.shop_longitude ? `/@${profileForm.shop_latitude},${profileForm.shop_longitude},18z` : ""}`} target="_blank" rel="noreferrer">
                      <MapPin className="h-3.5 w-3.5 mr-1" /> Pick on Map
                    </a>
                  </Button>
                </div>
                <p className="text-[10px] text-muted-foreground">Tip: Open Google Maps, long-press your shop, and copy the lat,lng into the fields above.</p>
              </div>
            </div>
          ) : (
            [
              { icon: Mail, label: "Email", value: vendor?.email },
              { icon: Phone, label: "Phone", value: vendor?.mobile },
              { icon: MapPin, label: "Location", value: (vendor as any)?.shop_address || `Area ${vendor?.area_id}, City ${vendor?.city_id}` },
              { icon: Shield, label: "Commission Rate", value: `${vendor?.commission_rate}%` },
            ].map((d) => (
              <div key={d.label} className="flex items-center gap-3">
                <d.icon className="h-4 w-4 text-muted-foreground shrink-0" />
                <div><p className="text-xs text-muted-foreground">{d.label}</p><p className="text-sm font-medium">{d.value}</p></div>
              </div>
            ))
          )}
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
            <div><p className="text-lg font-bold">{perfStats.products}</p><p className="text-xs text-muted-foreground">Products</p></div>
            <div><p className="text-lg font-bold">{perfStats.orders}</p><p className="text-xs text-muted-foreground">Orders</p></div>
            <div><p className="text-lg font-bold">₹{perfStats.revenue > 1000 ? `${(perfStats.revenue / 1000).toFixed(0)}k` : perfStats.revenue}</p><p className="text-xs text-muted-foreground">Revenue</p></div>
          </div>
        </Card>
      </div>
    </VendorLayout>
  );
}
