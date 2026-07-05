// Coupon eligibility preview — live counts of eligible states/districts/vendors/products/customers
// + radius map + validation warnings before campaign save / code generation.
import { useEffect, useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, MapPin, AlertTriangle, CheckCircle2, RefreshCw } from "lucide-react";

interface Props {
  editing: any;                             // current campaign form state
  vendors: { id: string; business_name?: string; name?: string; shop_latitude?: number; shop_longitude?: number; district_id?: string; state_id?: string }[];
  districts: { id: string; name: string; state_id?: string }[];
}

// Haversine (km)
function distanceKm(aLat: number, aLng: number, bLat: number, bLng: number): number {
  const R = 6371;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(bLat - aLat);
  const dLng = toRad(bLng - aLng);
  const s = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(aLat)) * Math.cos(toRad(bLat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(s));
}

export function CouponEligibilityPreview({ editing, vendors, districts }: Props) {
  const [customerCount, setCustomerCount] = useState<number | null>(null);
  const [productCount, setProductCount] = useState<number | null>(null);
  const [conflictCount, setConflictCount] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [mapsKey, setMapsKey] = useState<string | null>(null);

  // Load maps key once
  useEffect(() => {
    supabase.from("platform_variables").select("value")
      .or("key.eq.GOOGLE_MAPS_API_KEY,key.eq.google_maps_api_key")
      .limit(1).maybeSingle().then(({ data }) => setMapsKey((data as any)?.value || null));
  }, []);

  // Compute derived eligibility from current form state
  const derived = useMemo(() => {
    const selectedDistrictIds: string[] = editing?.district_ids || [];
    const districtIdSet = new Set(selectedDistrictIds);

    // Eligible districts (empty = all)
    const eligibleDistricts = districtIdSet.size
      ? districts.filter(d => districtIdSet.has(d.id))
      : districts;
    const eligibleStateIds = new Set(eligibleDistricts.map(d => d.state_id).filter(Boolean) as string[]);

    // Eligible vendors: match vendor_id filter + district
    let eligibleVendors = vendors;
    if (editing?.vendor_id) eligibleVendors = eligibleVendors.filter(v => v.id === editing.vendor_id);
    if (districtIdSet.size) {
      eligibleVendors = eligibleVendors.filter(v => !v.district_id || districtIdSet.has(v.district_id));
    }

    // Geo radius filter
    if (editing?.use_geo_radius && editing?.center_lat != null && editing?.center_lng != null && editing?.radius_km) {
      eligibleVendors = eligibleVendors.filter(v =>
        v.shop_latitude != null && v.shop_longitude != null &&
        distanceKm(Number(editing.center_lat), Number(editing.center_lng), v.shop_latitude!, v.shop_longitude!) <= Number(editing.radius_km),
      );
    }

    return { eligibleStateIds, eligibleDistricts, eligibleVendors };
  }, [editing, vendors, districts]);

  const refresh = async () => {
    setLoading(true);
    try {
      // Product count
      let pq = supabase.from("products").select("id", { count: "exact", head: true }).eq("status", "active");
      if (editing?.vendor_id) pq = pq.eq("vendor_id", editing.vendor_id);
      if ((editing?.product_ids || []).length) pq = pq.in("id", editing.product_ids);
      const { count: pc } = await pq;
      setProductCount(pc || 0);

      // Customer estimate (by district if any, else all active)
      let cq: any = supabase.from("customers").select("id", { count: "exact", head: true }).eq("status", "active");
      if ((editing?.district_ids || []).length) cq = cq.in("district_id", editing.district_ids);
      const { count: cc } = await cq;
      setCustomerCount(cc || 0);

      // Conflict detection: active overlapping campaigns
      let confQ = supabase.from("coupon_campaigns").select("id", { count: "exact", head: true })
        .eq("is_active", true).neq("id", editing?.id || "00000000-0000-0000-0000-000000000000");
      if (editing?.vendor_id) confQ = confQ.eq("vendor_id", editing.vendor_id);
      const { count: nc } = await confQ;
      setConflictCount(nc || 0);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editing?.vendor_id, editing?.district_ids?.length, editing?.product_ids?.length, editing?.first_time_only, editing?.use_geo_radius, editing?.radius_km, editing?.center_lat, editing?.center_lng]);

  // Warnings
  const warnings: string[] = [];
  if (derived.eligibleVendors.length === 0) warnings.push("No vendors match the current filters.");
  if (productCount === 0) warnings.push("No products mapped for these filters.");
  if (editing?.use_geo_radius && Number(editing?.radius_km || 0) < 1) warnings.push("Radius is smaller than 1 km — very few customers likely.");
  if (editing?.use_geo_radius && (editing?.center_lat == null || editing?.center_lng == null)) warnings.push("Geo-radius enabled but center coordinates missing.");
  if ((conflictCount ?? 0) > 0 && editing?.vendor_id) warnings.push(`${conflictCount} other active campaign(s) target the same vendor.`);
  if (editing?.total_codes_target && customerCount !== null && customerCount > 0 && Number(editing.total_codes_target) > customerCount * 2) {
    warnings.push("Estimated coupon quantity is much larger than the eligible customer base.");
  }

  const coveragePct = districts.length > 0
    ? Math.round((derived.eligibleDistricts.length / districts.length) * 100)
    : 0;

  const staticMapUrl = mapsKey && editing?.use_geo_radius && editing?.center_lat && editing?.center_lng
    ? `https://maps.googleapis.com/maps/api/staticmap?center=${editing.center_lat},${editing.center_lng}&zoom=${
        Number(editing.radius_km) > 50 ? 8 : Number(editing.radius_km) > 20 ? 9 : Number(editing.radius_km) > 10 ? 10 : 11
      }&size=560x220&scale=2&maptype=roadmap&markers=color:red%7C${editing.center_lat},${editing.center_lng}&key=${mapsKey}`
    : null;

  const Stat = ({ label, value, hint }: { label: string; value: string | number; hint?: string }) => (
    <div className="p-2 rounded-md border bg-muted/30">
      <div className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="text-lg font-semibold">{value}</div>
      {hint && <div className="text-[10px] text-muted-foreground">{hint}</div>}
    </div>
  );

  return (
    <Card className="p-3 space-y-3 border-primary/20 bg-primary/5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <MapPin className="w-4 h-4 text-primary" />
          <h4 className="font-semibold text-sm">Eligibility Preview</h4>
          {loading && <Loader2 className="w-3 h-3 animate-spin text-muted-foreground" />}
        </div>
        <Button size="sm" variant="ghost" onClick={refresh} disabled={loading} className="h-7 px-2">
          <RefreshCw className="w-3 h-3 mr-1" /> Refresh
        </Button>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
        <Stat label="States" value={derived.eligibleStateIds.size || "All"} />
        <Stat label="Districts" value={derived.eligibleDistricts.length} hint={`${coveragePct}% coverage`} />
        <Stat label="Vendors" value={derived.eligibleVendors.length} />
        <Stat label="Products" value={productCount ?? "—"} />
        <Stat label="Est. Customers" value={customerCount ?? "—"} hint={editing?.first_time_only ? "First-time only" : undefined} />
        <Stat label="Overlapping campaigns" value={conflictCount ?? "—"} />
      </div>

      {editing?.use_geo_radius && (
        <div className="text-xs">
          Radius: <b>{editing.radius_km || 0} km</b> around ({editing.center_lat || "—"}, {editing.center_lng || "—"})
          {staticMapUrl && (
            <img
              src={staticMapUrl}
              alt="Campaign radius preview"
              className="mt-2 rounded border w-full max-w-[560px]"
              onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
            />
          )}
        </div>
      )}

      {derived.eligibleDistricts.length > 0 && derived.eligibleDistricts.length < 12 && (
        <div className="flex flex-wrap gap-1">
          {derived.eligibleDistricts.map(d => (
            <Badge key={d.id} variant="outline" className="text-[10px]">{d.name}</Badge>
          ))}
        </div>
      )}

      {warnings.length > 0 ? (
        <div className="space-y-1 border-t pt-2">
          {warnings.map((w, i) => (
            <div key={i} className="flex items-start gap-2 text-xs text-warning">
              <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
              <span>{w}</span>
            </div>
          ))}
        </div>
      ) : (
        <div className="flex items-center gap-2 text-xs text-success border-t pt-2">
          <CheckCircle2 className="w-3.5 h-3.5" />
          <span>Configuration looks healthy.</span>
        </div>
      )}
    </Card>
  );
}
