import { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { MapPin, Navigation, Loader2, ArrowLeft, X } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";

interface GeoAddress {
  lat: number;
  lng: number;
  formatted: string;
  area: string;
  city: string;
  pincode: string;
}

const GOOGLE_MAPS_KEY_FALLBACK = "AIzaSyAoz0ZK26oE1qZSKK8pG1Ebh9sTTeaOl7M";

async function fetchMapsKey(): Promise<string> {
  try {
    const { data } = await supabase
      .from("platform_variables")
      .select("value")
      .eq("key", "GOOGLE_MAPS_API_KEY")
      .maybeSingle();
    return data?.value || GOOGLE_MAPS_KEY_FALLBACK;
  } catch {
    return GOOGLE_MAPS_KEY_FALLBACK;
  }
}

export default function SetLocationPage() {
  const navigate = useNavigate();
  const { customerUser } = useAuth();
  const [loading, setLoading] = useState(false);
  const [locating, setLocating] = useState(false);
  const [address, setAddress] = useState<GeoAddress | null>(null);
  const [apartment, setApartment] = useState("");
  const [houseNo, setHouseNo] = useState("");
  const [landmark, setLandmark] = useState("");
  const [saveAs, setSaveAs] = useState<"home" | "work" | "other">("home");
  const [searchQuery, setSearchQuery] = useState("");
  const [street, setStreet] = useState("");
  const [district, setDistrict] = useState("");
  const [state, setState] = useState("");
  const [country, setCountry] = useState("");
  const [mapsKey, setMapsKey] = useState("");
  const mapInstanceRef = useRef<any>(null);
  const markerInstanceRef = useRef<any>(null);

  // Fetch API key once
  useEffect(() => {
    fetchMapsKey().then(setMapsKey);
  }, []);

  /**
   * Improved reverse geocoding that iterates multiple result objects
   * to find the most accurate state and district values.
   */
  const reverseGeocode = useCallback(async (lat: number, lng: number) => {
    const key = mapsKey || GOOGLE_MAPS_KEY_FALLBACK;
    try {
      const res = await fetch(
        `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=${key}&result_type=street_address|sublocality|locality|administrative_area_level_2|administrative_area_level_1`
      );
      const data = await res.json();
      if (data.status === "OK" && data.results.length > 0) {
        // Collect all address components across results for best coverage
        const allComponents: any[] = [];
        for (const r of data.results.slice(0, 5)) {
          allComponents.push(...(r.address_components || []));
        }

        // Helper: find the FIRST component matching a type across all results
        const findComponent = (type: string) => {
          for (const c of allComponents) {
            if (c.types.includes(type)) return c.long_name as string;
          }
          return "";
        };

        const area = findComponent("sublocality_level_1") || findComponent("sublocality") || findComponent("neighborhood");
        const city = findComponent("locality") || findComponent("administrative_area_level_3") || "";
        const pincode = findComponent("postal_code") || "";
        const routeName = findComponent("route") || "";
        const streetNumber = findComponent("street_number") || findComponent("premise") || findComponent("subpremise") || "";

        // For district and state, prefer the administrative_area results which are most accurate
        const districtName = findComponent("administrative_area_level_2") || findComponent("administrative_area_level_3") || city;
        const stateName = findComponent("administrative_area_level_1") || "";
        const countryName = findComponent("country") || "";

        const bestFormatted = data.results[0].formatted_address || `${lat}, ${lng}`;

        setAddress({ lat, lng, formatted: bestFormatted, area, city, pincode });
        setApartment(area || city);
        setStreet(routeName);
        setDistrict(districtName);
        setState(stateName);
        setCountry(countryName);
        if (streetNumber) setHouseNo(streetNumber);
      } else {
        // Fallback: try without result_type filter
        const res2 = await fetch(
          `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=${key}`
        );
        const data2 = await res2.json();
        if (data2.status === "OK" && data2.results.length > 0) {
          const r = data2.results[0];
          const components = r.address_components || [];
          const get = (type: string) => components.find((c: any) => c.types.includes(type))?.long_name || "";
          setAddress({ lat, lng, formatted: r.formatted_address, area: get("sublocality_level_1") || get("locality"), city: get("locality"), pincode: get("postal_code") });
          setApartment(get("sublocality_level_1") || get("locality"));
          setStreet(get("route"));
          setDistrict(get("administrative_area_level_2") || get("locality"));
          setState(get("administrative_area_level_1"));
          setCountry(get("country"));
          const sn = get("street_number") || get("premise");
          if (sn) setHouseNo(sn);
        } else {
          setAddress({ lat, lng, formatted: `${lat.toFixed(6)}, ${lng.toFixed(6)}`, area: "", city: "", pincode: "" });
        }
      }
    } catch {
      setAddress({ lat, lng, formatted: `${lat.toFixed(6)}, ${lng.toFixed(6)}`, area: "", city: "", pincode: "" });
    }
  }, [mapsKey]);

  const loadGoogleMapsScript = useCallback((): Promise<boolean> => {
    return new Promise((resolve) => {
      if ((window as any).google?.maps) { resolve(true); return; }
      const existing = document.querySelector('script[src*="maps.googleapis.com"]');
      if (existing) { existing.addEventListener('load', () => resolve(true)); return; }
      const key = mapsKey || GOOGLE_MAPS_KEY_FALLBACK;
      const script = document.createElement('script');
      script.src = `https://maps.googleapis.com/maps/api/js?key=${key}&libraries=places`;
      script.async = true;
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.head.appendChild(script);
    });
  }, [mapsKey]);

  const initMap = useCallback((lat: number, lng: number) => {
    const container = document.getElementById('location-map-container');
    if (!container || !(window as any).google?.maps) return;
    const map = new (window as any).google.maps.Map(container, {
      center: { lat, lng }, zoom: 16, disableDefaultUI: true, zoomControl: true,
      gestureHandling: 'greedy',
    });
    const marker = new (window as any).google.maps.Marker({
      position: { lat, lng }, map, draggable: true,
      animation: (window as any).google.maps.Animation.DROP,
    });
    marker.addListener('dragend', () => {
      const pos = marker.getPosition();
      reverseGeocode(pos.lat(), pos.lng());
    });
    map.addListener('click', (e: any) => {
      marker.setPosition(e.latLng);
      reverseGeocode(e.latLng.lat(), e.latLng.lng());
    });
    mapInstanceRef.current = map;
    markerInstanceRef.current = marker;
  }, [reverseGeocode]);

  const getCurrentLocation = useCallback(() => {
    if (!navigator.geolocation) {
      toast.error("Geolocation is not supported by your browser");
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords;
        await reverseGeocode(latitude, longitude);
        const loaded = await loadGoogleMapsScript();
        if (loaded) {
          if (mapInstanceRef.current && markerInstanceRef.current) {
            const p = new (window as any).google.maps.LatLng(latitude, longitude);
            mapInstanceRef.current.setCenter(p);
            markerInstanceRef.current.setPosition(p);
          } else {
            initMap(latitude, longitude);
          }
        }
        setLocating(false);
      },
      (err) => {
        setLocating(false);
        if (err.code === err.PERMISSION_DENIED) {
          toast.error("Location permission denied. Please enable GPS/location in your browser settings.");
        } else {
          toast.error("Could not get your location. Please try again.");
        }
      },
      { enableHighAccuracy: true, timeout: 15000 }
    );
  }, [reverseGeocode, loadGoogleMapsScript, initMap]);

  // Auto-detect location on mount (only after mapsKey is loaded)
  useEffect(() => {
    if (mapsKey) getCurrentLocation();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mapsKey]);

  const handleSearchAddress = async () => {
    if (!searchQuery.trim()) return;
    setLocating(true);
    const key = mapsKey || GOOGLE_MAPS_KEY_FALLBACK;
    try {
      const res = await fetch(
        `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(searchQuery)}&components=country:IN&key=${key}`
      );
      const data = await res.json();
      if (data.status === "OK" && data.results.length > 0) {
        const r = data.results[0];
        const lat = r.geometry.location.lat;
        const lng = r.geometry.location.lng;
        await reverseGeocode(lat, lng);
        const loaded = await loadGoogleMapsScript();
        if (loaded) {
          if (mapInstanceRef.current && markerInstanceRef.current) {
            const p = new (window as any).google.maps.LatLng(lat, lng);
            mapInstanceRef.current.setCenter(p);
            markerInstanceRef.current.setPosition(p);
          } else {
            initMap(lat, lng);
          }
        }
      } else {
        toast.error("Location not found. Try a different search.");
      }
    } catch {
      toast.error("Search failed. Please try again.");
    } finally {
      setLocating(false);
    }
  };

  const handleSaveAndProceed = async () => {
    if (!address) { toast.error("Please set your location first"); return;  }
    if (!apartment.trim()) { toast.error("Please enter your apartment/road/area"); return; }
    if (!houseNo.trim()) { toast.error("Please enter your house/flat/block number"); return; }

    setLoading(true);
    try {
      // Use the supabase auth UID for customer_id since that's the PK in customers table
      const { data: { session } } = await supabase.auth.getSession();
      const authUid = session?.user?.id;
      const customerId = customerUser?.customer_id || customerUser?.id || authUid || "";

      if (!customerId) {
        toast.error("User session not found. Please login again.");
        setLoading(false);
        return;
      }

      // Build full address line
      const fullAddress = [houseNo, street, apartment, landmark].filter(Boolean).join(", ");

      // Upsert address — set all other addresses as non-default first
      await supabase
        .from("customer_addresses")
        .update({ is_default: false } as any)
        .eq("customer_id", customerId);

      const { error } = await supabase.from("customer_addresses").insert({
        customer_id: customerId,
        label: saveAs === "home" ? "Home" : saveAs === "work" ? "Work" : "Other",
        type: saveAs,
        address_line: fullAddress,
        city: address.city || district || "",
        pincode: address.pincode || "",
        is_default: true,
        latitude: address.lat,
        longitude: address.lng,
      } as any);

      if (error) throw error;

      // Update customer coordinates
      await supabase
        .from("customers")
        .update({
          latitude: address.lat,
          longitude: address.lng,
        } as any)
        .eq("id", customerId);

      // Save to localStorage for quick access
      localStorage.setItem("app_db_selected_location", `${address.area || address.city}, ${state || district}`);
      localStorage.setItem("app_db_selected_coords", JSON.stringify({ lat: address.lat, lng: address.lng }));

      toast.success("Location saved successfully!");
      navigate("/app", { replace: true });
    } catch (err: any) {
      console.error("Save location error:", err);
      toast.error(err.message || "Failed to save location. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleSkip = () => {
    localStorage.setItem("p4u_location_skipped", "true");
    navigate("/app", { replace: true });
  };

  const handleBack = () => {
    if (customerUser) {
      navigate("/app", { replace: true });
    } else {
      navigate("/app/login", { replace: true });
    }
  };

  return (
    <div className="fixed inset-0 flex flex-col bg-background" style={{
      paddingTop: 'env(safe-area-inset-top, 0px)',
      paddingBottom: 'env(safe-area-inset-bottom, 0px)',
    }}>
      {/* Header — fixed height, never overlapped */}
      <div className="flex items-center justify-between gap-3 px-4 py-3 border-b bg-card shrink-0 z-20">
        <div className="flex items-center gap-3">
          <button onClick={handleBack} className="p-1.5 rounded-full hover:bg-accent">
            <ArrowLeft className="h-5 w-5" />
          </button>
          <h1 className="text-base font-bold">Set Delivery Location</h1>
        </div>
        <Button variant="ghost" size="sm" className="text-xs text-muted-foreground" onClick={handleSkip}>
          Skip
        </Button>
      </div>

      {/* Scrollable body */}
      <div className="flex-1 overflow-y-auto overscroll-contain">
        {/* Search bar */}
        <div className="p-3 bg-card border-b">
          <div className="flex gap-2">
            <Input
              placeholder="Search for area, street, locality..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSearchAddress()}
              className="h-10 text-sm"
            />
            <Button variant="outline" size="sm" className="h-10 px-3 shrink-0" onClick={handleSearchAddress} disabled={locating}>
              🔍
            </Button>
          </div>
        </div>

        {/* Map */}
        <div className="relative h-[35vh] min-h-[200px] max-h-[300px] bg-secondary/20">
          <div id="location-map-container" className="w-full h-full" />
          {!address && (
            <div className="absolute inset-0 flex items-center justify-center">
              {locating ? (
                <div className="text-center">
                  <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">Detecting your location...</p>
                </div>
              ) : (
                <div className="text-center">
                  <MapPin className="h-10 w-10 text-muted-foreground mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">Enable location to see map</p>
                </div>
              )}
            </div>
          )}
          <button
            onClick={getCurrentLocation}
            disabled={locating}
            className="absolute bottom-3 right-3 bg-card shadow-lg rounded-full p-2.5 border hover:bg-accent transition-colors z-10"
          >
            <Navigation className="h-4 w-4 text-primary" />
          </button>
        </div>

        {/* Form fields */}
        <div className="p-4 space-y-4">
          {address && (
            <p className="text-xs text-muted-foreground bg-secondary/30 rounded-lg p-3">
              📍 {address.formatted}
            </p>
          )}

          <div>
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
              House / Flat / Block No *
            </label>
            <Input value={houseNo} onChange={(e) => setHouseNo(e.target.value)} placeholder="Enter house/flat number"
              className="mt-1 h-10 border-0 border-b border-border rounded-none focus-visible:ring-0 px-0 text-sm" />
          </div>

          <div>
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
              Street / Road
            </label>
            <Input value={street} onChange={(e) => setStreet(e.target.value)} placeholder="Street name"
              className="mt-1 h-10 border-0 border-b border-border rounded-none focus-visible:ring-0 px-0 text-sm" />
          </div>

          <div>
            <label className="text-xs font-semibold text-primary uppercase tracking-wide">
              Apartment / Road / Area *
            </label>
            <Input value={apartment} onChange={(e) => setApartment(e.target.value)} placeholder="Enter area name"
              className="mt-1 h-10 border-0 border-b border-border rounded-none focus-visible:ring-0 px-0 text-sm" />
          </div>

          <div>
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
              Landmark
            </label>
            <Input value={landmark} onChange={(e) => setLandmark(e.target.value)} placeholder="Nearby landmark (optional)"
              className="mt-1 h-10 border-0 border-b border-border rounded-none focus-visible:ring-0 px-0 text-sm" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">City</label>
              <Input value={address?.city || ""} className="h-9 bg-secondary/20 text-sm" disabled />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Pincode</label>
              <Input value={address?.pincode || ""} className="h-9 bg-secondary/20 text-sm" disabled />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">District</label>
              <Input value={district} onChange={(e) => setDistrict(e.target.value)} className="h-9 bg-secondary/20 text-sm" placeholder="District" />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">State</label>
              <Input value={state} onChange={(e) => setState(e.target.value)} className="h-9 bg-secondary/20 text-sm" placeholder="State" />
            </div>
          </div>

          <div>
            <label className="text-sm font-bold uppercase tracking-wide">Save As *</label>
            <div className="flex gap-3 mt-2">
              {(["home", "work", "other"] as const).map((type) => (
                <button key={type} onClick={() => setSaveAs(type)}
                  className={`flex-1 py-2.5 rounded-xl border text-sm font-medium transition-colors ${
                    saveAs === type ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground hover:border-primary/50"
                  }`}>
                  {type === "home" ? "🏠 " : type === "work" ? "💼 " : "📍 "}
                  {type.charAt(0).toUpperCase() + type.slice(1)}
                </button>
              ))}
            </div>
          </div>

          {/* Bottom spacer for the fixed save button */}
          <div className="h-20" />
        </div>
      </div>

      {/* Fixed bottom save button — inside safe area */}
      <div className="shrink-0 px-4 py-3 bg-card border-t" style={{
        paddingBottom: 'max(env(safe-area-inset-bottom, 0px), 12px)',
      }}>
        <Button onClick={handleSaveAndProceed} disabled={loading || !address || !apartment.trim() || !houseNo.trim()}
          className="w-full h-11 rounded-xl text-sm font-semibold">
          {loading ? (<><Loader2 className="h-4 w-4 animate-spin mr-2" /> Saving...</>) : "Save and Proceed"}
        </Button>
      </div>
    </div>
  );
}
