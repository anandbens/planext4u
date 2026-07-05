// Coupon eligibility preview — live stats + interactive radius map + exclusion lists.
import { useEffect, useMemo, useRef, useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, MapPin, AlertTriangle, CheckCircle2, RefreshCw, EyeOff } from "lucide-react";

interface VendorLite {
  id: string;
  business_name?: string;
  name?: string;
  shop_latitude?: number | null;
  shop_longitude?: number | null;
  city_id?: string | null;
  state_code?: string | null;
  state_name?: string | null;
}
interface DistrictLite { id: string; name: string; state_id?: string | null }

interface Props {
  editing: any;
  vendors: VendorLite[];
  districts: DistrictLite[];
}

function distanceKm(aLat: number, aLng: number, bLat: number, bLng: number): number {
  const R = 6371;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(bLat - aLat);
  const dLng = toRad(bLng - aLng);
  const s = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(aLat)) * Math.cos(toRad(bLat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(s));
}

let mapsPromise: Promise<any> | null = null;
async function loadMaps(): Promise<any | null> {
  if (typeof window === "undefined") return null;
  const w = window as any;
  if (w.google?.maps) return w.google.maps;
  const key = (import.meta as any).env?.VITE_LOVABLE_CONNECTOR_GOOGLE_MAPS_BROWSER_KEY;
  if (!key) return null;
  if (!mapsPromise) {
    mapsPromise = new Promise((resolve, reject) => {
      const cbName = `__couponMapInit_${Date.now()}`;
      (window as any)[cbName] = () => resolve((window as any).google.maps);
      const s = document.createElement("script");
      s.src = `https://maps.googleapis.com/maps/api/js?key=${key}&loading=async&callback=${cbName}`;
      s.async = true;
      s.onerror = () => reject(new Error("maps load failed"));
      document.head.appendChild(s);
    });
  }
  return mapsPromise.catch(() => null);
}

export function CouponEligibilityPreview({ editing, vendors, districts }: Props) {
  const [customerCount, setCustomerCount] = useState<number | null>(null);
  const [productCount, setProductCount] = useState<number | null>(null);
  const [totalProductsForVendor, setTotalProductsForVendor] = useState<number | null>(null);
  const [cityCount, setCityCount] = useState<number | null>(null);
  const [totalCities, setTotalCities] = useState<number | null>(null);
  const [conflictCount, setConflictCount] = useState<number | null>(null);
  const [totalCustomers, setTotalCustomers] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const mapEl = useRef<HTMLDivElement | null>(null);
  const mapInstance = useRef<any>(null);
  const circleRef = useRef<any>(null);
  const markerRef = useRef<any>(null);

  // Derived (client-side) eligibility using known columns
  const derived = useMemo(() => {
    const selectedDistricts: string[] = editing?.district_ids || [];
    const districtIdSet = new Set(selectedDistricts);
    const eligibleDistricts = districtIdSet.size
      ? districts.filter(d => districtIdSet.has(d.id))
      : districts;
    const eligibleStateIds = new Set(eligibleDistricts.map(d => d.state_id).filter(Boolean) as string[]);

    let elVendors = vendors;
    const selectedVendorIds: string[] = editing?.vendor_ids || [];
    if (editing?.vendor_id) elVendors = elVendors.filter(v => v.id === editing.vendor_id);
    if (selectedVendorIds.length) elVendors = elVendors.filter(v => selectedVendorIds.includes(v.id));

    let excludedByRadius = 0;
    if (editing?.use_geo_radius && editing?.center_lat != null && editing?.center_lng != null && editing?.radius_km) {
      const before = elVendors.length;
      elVendors = elVendors.filter(v =>
        v.shop_latitude != null && v.shop_longitude != null &&
        distanceKm(Number(editing.center_lat), Number(editing.center_lng), v.shop_latitude!, v.shop_longitude!) <= Number(editing.radius_km),
      );
      excludedByRadius = before - elVendors.length;
    }

    const excludedDistricts = districtIdSet.size ? districts.length - eligibleDistricts.length : 0;
    const excludedVendors = vendors.length - elVendors.length;
    return { eligibleStateIds, eligibleDistricts, eligibleVendors: elVendors, excludedDistricts, excludedVendors, excludedByRadius };
  }, [editing, vendors, districts]);

  const refresh = async () => {
    setLoading(true);
    try {
      // Product scope: explicit product_ids > vendor scope > all active
      const explicitProductIds: string[] = editing?.product_ids || [];
      const vendorScope: string[] = editing?.vendor_ids || [];
      let pq: any = supabase.from("products").select("id", { count: "exact", head: true }).eq("status", "active");
      if (editing?.vendor_id) pq = pq.eq("vendor_id", editing.vendor_id);
      if (explicitProductIds.length) {
        pq = pq.in("id", explicitProductIds);
      } else if (vendorScope.length) {
        pq = pq.in("vendor_id", vendorScope);
      }
      const { count: pc } = await pq;
      setProductCount(pc || 0);

      if (editing?.vendor_id) {
        const { count: tp } = await supabase.from("products").select("id", { count: "exact", head: true })
          .eq("status", "active").eq("vendor_id", editing.vendor_id);
        setTotalProductsForVendor(tp || 0);
      } else setTotalProductsForVendor(null);

      // Cities (in eligible states)
      let cityIn: any = supabase.from("cities").select("id", { count: "exact", head: true }).eq("status", "active");
      const { count: tCities } = await cityIn;
      setTotalCities(tCities || 0);
      if (derived.eligibleStateIds.size) {
        const stateNames = districts.filter(d => derived.eligibleStateIds.has(d.state_id!)).map(d => d.name);
        // Fallback: cities have "state" text, so we can't perfectly match by state_id → approximate
        setCityCount(null);
        void stateNames;
      } else {
        setCityCount(tCities || 0);
      }

      // Customers (active)
      const totalC = await supabase.from("customers").select("id", { count: "exact", head: true }).eq("status", "active");
      setTotalCustomers(totalC.count || 0);

      let cq: any = supabase.from("customers").select("id", { count: "exact", head: true }).eq("status", "active");
      // If vendor city is known & no district filter, scope to same city
      if (!(editing?.district_ids || []).length && editing?.vendor_id) {
        const v = vendors.find(x => x.id === editing.vendor_id);
        if (v?.city_id) cq = cq.eq("city_id", v.city_id);
      }
      const { count: cc } = await cq;
      setCustomerCount(cc || 0);

      // Overlapping campaigns
      let confQ: any = supabase.from("coupon_campaigns").select("id", { count: "exact", head: true })
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
  }, [editing?.vendor_id, editing?.vendor_ids?.length, editing?.district_ids?.length, editing?.product_ids?.length, editing?.first_time_only, editing?.use_geo_radius, editing?.radius_km, editing?.center_lat, editing?.center_lng]);

  // Interactive map with radius circle
  useEffect(() => {
    if (!editing?.use_geo_radius || editing.center_lat == null || editing.center_lng == null || !mapEl.current) return;
    let cancelled = false;
    (async () => {
      const maps = await loadMaps();
      if (cancelled || !maps || !mapEl.current) return;
      const center = { lat: Number(editing.center_lat), lng: Number(editing.center_lng) };
      if (!mapInstance.current) {
        mapInstance.current = new maps.Map(mapEl.current, { center, zoom: 10, mapTypeControl: false, streetViewControl: false, fullscreenControl: false });
      } else {
        mapInstance.current.setCenter(center);
      }
      if (markerRef.current) markerRef.current.setMap(null);
      markerRef.current = new maps.Marker({ position: center, map: mapInstance.current, title: "Vendor / Campaign center" });
      if (circleRef.current) circleRef.current.setMap(null);
      circleRef.current = new maps.Circle({
        map: mapInstance.current, center,
        radius: Number(editing.radius_km || 0) * 1000,
        strokeColor: "#009999", strokeWeight: 2, fillColor: "#009999", fillOpacity: 0.15,
      });
      // Fit bounds to circle
      mapInstance.current.fitBounds(circleRef.current.getBounds());
    })();
    return () => { cancelled = true; };
  }, [editing?.use_geo_radius, editing?.center_lat, editing?.center_lng, editing?.radius_km]);

  // Warnings
  const warnings: string[] = [];
  if (derived.eligibleVendors.length === 0) warnings.push("No vendors match the current filters.");
  if (productCount === 0) warnings.push("No products mapped for these filters.");
  if (editing?.use_geo_radius && Number(editing?.radius_km || 0) < 1) warnings.push("Radius smaller than 1 km — very few customers likely.");
  if (editing?.use_geo_radius && (editing?.center_lat == null || editing?.center_lng == null)) warnings.push("Geo-radius enabled but center coordinates missing.");
  if ((conflictCount ?? 0) > 0 && editing?.vendor_id) warnings.push(`${conflictCount} other active campaign(s) target the same vendor — possible duplicate promotion.`);
  if (editing?.total_codes_target && customerCount !== null && customerCount > 0 && Number(editing.total_codes_target) > customerCount * 2) {
    warnings.push("Coupon quantity is much larger than the eligible customer base.");
  }
  if (editing?.qty_limit && editing?.total_codes_target && Number(editing.qty_limit) < Number(editing.total_codes_target)) {
    warnings.push(`Redemption limit (${editing.qty_limit}) is smaller than target codes (${editing.total_codes_target}).`);
  }

  const coveragePct = districts.length > 0 ? Math.round((derived.eligibleDistricts.length / districts.length) * 100) : 0;

  const Stat = ({ label, value, hint }: { label: string; value: string | number | null; hint?: string }) => (
    <div className="p-2 rounded-md border bg-muted/30">
      <div className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="text-lg font-semibold">{value ?? "—"}</div>
      {hint && <div className="text-[10px] text-muted-foreground">{hint}</div>}
    </div>
  );

  const excludedProducts = totalProductsForVendor != null && productCount != null
    ? Math.max(0, totalProductsForVendor - productCount) : null;

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

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        <Stat label="States" value={derived.eligibleStateIds.size || "All"} />
        <Stat label="Districts" value={derived.eligibleDistricts.length} hint={`${coveragePct}% coverage`} />
        <Stat label="Cities" value={cityCount ?? "—"} hint={totalCities ? `of ${totalCities}` : undefined} />
        <Stat label="Vendors" value={derived.eligibleVendors.length} />
        <Stat label="Products" value={productCount} hint={totalProductsForVendor != null ? `of ${totalProductsForVendor}` : undefined} />
        <Stat label="Est. Customers" value={customerCount} hint={totalCustomers ? `of ${totalCustomers.toLocaleString()}` : undefined} />
        <Stat label="Radius" value={editing?.use_geo_radius ? `${editing.radius_km || 0} km` : "—"} />
        <Stat label="Overlaps" value={conflictCount} hint="active campaigns" />
      </div>

      {/* Excluded summary */}
      {(derived.excludedDistricts + derived.excludedVendors + (excludedProducts || 0) + derived.excludedByRadius) > 0 && (
        <div className="border-t pt-2">
          <div className="flex items-center gap-2 text-xs font-medium mb-1">
            <EyeOff className="w-3.5 h-3.5 text-muted-foreground" /> Excluded
          </div>
          <div className="flex flex-wrap gap-2 text-[11px] text-muted-foreground">
            {derived.excludedDistricts > 0 && <Badge variant="outline">{derived.excludedDistricts} districts</Badge>}
            {derived.excludedVendors > 0 && <Badge variant="outline">{derived.excludedVendors} vendors</Badge>}
            {excludedProducts != null && excludedProducts > 0 && <Badge variant="outline">{excludedProducts} products</Badge>}
            {derived.excludedByRadius > 0 && <Badge variant="outline">{derived.excludedByRadius} by radius</Badge>}
          </div>
        </div>
      )}

      {/* Map */}
      {editing?.use_geo_radius && editing?.center_lat != null && editing?.center_lng != null && (
        <div>
          <div ref={mapEl} className="w-full h-56 rounded border bg-muted" />
          <p className="text-[10px] text-muted-foreground mt-1">
            Marker = campaign center · Circle = {editing.radius_km || 0} km eligibility radius
          </p>
        </div>
      )}

      {/* Eligible district chips */}
      {derived.eligibleDistricts.length > 0 && derived.eligibleDistricts.length < 12 && (
        <div className="flex flex-wrap gap-1">
          {derived.eligibleDistricts.map(d => (
            <Badge key={d.id} variant="outline" className="text-[10px]">{d.name}</Badge>
          ))}
        </div>
      )}

      {/* Warnings */}
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
