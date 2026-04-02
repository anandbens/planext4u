import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { MapPin, Navigation, Loader2, ArrowLeft } from "lucide-react";
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
  const [mapUrl, setMapUrl] = useState("");

  const updateMapUrl = useCallback((lat: number, lng: number) => {
    setMapUrl(
      `https://maps.google.com/maps?q=${lat},${lng}&z=16&output=embed`
    );
  }, []);

  const GOOGLE_MAPS_KEY = "AIzaSyAoz0ZK26oE1qZSKK8pG1Ebh9sTTeaOl7M";

  const reverseGeocode = useCallback(async (lat: number, lng: number) => {
    try {
      const res = await fetch(
        `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=${GOOGLE_MAPS_KEY}`
      );
      const data = await res.json();
      if (data.status === "OK" && data.results.length > 0) {
        const result = data.results[0];
        const components = result.address_components || [];
        const get = (type: string) => components.find((c: any) => c.types.includes(type))?.long_name || "";
        const area = get("sublocality_level_1") || get("sublocality") || get("neighborhood") || get("locality");
        const city = get("locality") || get("administrative_area_level_2") || "";
        const pincode = get("postal_code") || "";

        setAddress({
          lat, lng,
          formatted: result.formatted_address || `${lat}, ${lng}`,
          area, city, pincode,
        });
        setApartment(area);
      } else {
        setAddress({ lat, lng, formatted: `${lat.toFixed(6)}, ${lng.toFixed(6)}`, area: "", city: "", pincode: "" });
      }
      updateMapUrl(lat, lng);
    } catch {
      setAddress({ lat, lng, formatted: `${lat.toFixed(6)}, ${lng.toFixed(6)}`, area: "", city: "", pincode: "" });
      updateMapUrl(lat, lng);
    }
  }, [updateMapUrl]);

  const getCurrentLocation = useCallback(() => {
    if (!navigator.geolocation) {
      toast.error("Geolocation is not supported by your browser");
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        reverseGeocode(latitude, longitude);
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
  }, [reverseGeocode]);

  useEffect(() => {
    // Auto-detect location on mount
    getCurrentLocation();
  }, [getCurrentLocation]);

  const handleSearchAddress = async () => {
    if (!searchQuery.trim()) return;
    setLocating(true);
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery)}&limit=1&addressdetails=1`
      );
      const results = await res.json();
      if (results.length > 0) {
        const r = results[0];
        await reverseGeocode(parseFloat(r.lat), parseFloat(r.lon));
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
    if (!address) {
      toast.error("Please set your location first");
      return;
    }
    if (!apartment.trim()) {
      toast.error("Please enter your apartment/road/area");
      return;
    }

    setLoading(true);
    try {
      const customerId = customerUser?.customer_id || customerUser?.id || "";
      
      // Save to customer_addresses
      const { error } = await supabase.from("customer_addresses").insert({
        customer_id: customerId,
        label: saveAs === "home" ? "Home" : saveAs === "work" ? "Work" : "Other",
        type: saveAs,
        address_line: [houseNo, apartment, landmark].filter(Boolean).join(", "),
        city: address.city,
        pincode: address.pincode,
        is_default: true,
      } as any);

      if (error) throw error;

      // Update customer lat/lng
      await supabase
        .from("customers")
        .update({ latitude: address.lat, longitude: address.lng } as any)
        .eq("id", customerId);

      toast.success("Location saved successfully!");
      navigate("/app", { replace: true });
    } catch (err: any) {
      console.error("Save location error:", err);
      toast.error(err.message || "Failed to save location");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Header */}
      <div className="flex items-center gap-3 p-4 border-b bg-card">
        <button onClick={() => navigate("/app")} className="p-1">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <h1 className="text-lg font-bold">Set Delivery Location</h1>
      </div>

      {/* Search bar */}
      <div className="p-4 bg-card border-b">
        <div className="flex gap-2">
          <Input
            placeholder="Search for area, street, locality..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSearchAddress()}
            className="h-11"
          />
          <Button variant="outline" size="sm" className="h-11 px-4" onClick={handleSearchAddress} disabled={locating}>
            🔍
          </Button>
        </div>
      </div>

      {/* Map area */}
      <div className="relative h-[40vh] min-h-[250px] bg-secondary/20">
        {mapUrl ? (
          <iframe
            src={mapUrl}
            className="w-full h-full border-0"
            allowFullScreen
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
            title="Location Map"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
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

        {/* Use current location button */}
        <button
          onClick={getCurrentLocation}
          disabled={locating}
          className="absolute bottom-4 right-4 bg-card shadow-lg rounded-full p-3 border hover:bg-accent transition-colors"
        >
          <Navigation className="h-5 w-5 text-primary" />
        </button>
      </div>

      {/* Address form */}
      <div className="flex-1 p-4 space-y-4 pb-28">
        {address && (
          <p className="text-xs text-muted-foreground bg-secondary/30 rounded-lg p-3">
            📍 {address.formatted}
          </p>
        )}

        <div>
          <label className="text-xs font-semibold text-primary uppercase tracking-wide">
            Apartment / Road / Area*
          </label>
          <Input
            value={apartment}
            onChange={(e) => setApartment(e.target.value)}
            placeholder="Enter area name"
            className="mt-1 h-11 border-0 border-b border-border rounded-none focus-visible:ring-0 px-0"
          />
        </div>

        <div>
          <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
            House / Flat / Block No*
          </label>
          <Input
            value={houseNo}
            onChange={(e) => setHouseNo(e.target.value)}
            placeholder="Enter house/flat number"
            className="mt-1 h-11 border-0 border-b border-border rounded-none focus-visible:ring-0 px-0"
          />
        </div>

        <div>
          <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
            Landmark
          </label>
          <Input
            value={landmark}
            onChange={(e) => setLandmark(e.target.value)}
            placeholder="Nearby landmark (optional)"
            className="mt-1 h-11 border-0 border-b border-border rounded-none focus-visible:ring-0 px-0"
          />
        </div>

        <div>
          <label className="text-sm font-bold uppercase tracking-wide">Save As*</label>
          <div className="flex gap-3 mt-3">
            {(["home", "work", "other"] as const).map((type) => (
              <button
                key={type}
                onClick={() => setSaveAs(type)}
                className={`flex-1 py-3 rounded-xl border text-sm font-medium transition-colors ${
                  saveAs === type
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border text-muted-foreground hover:border-primary/50"
                }`}
              >
                {type.charAt(0).toUpperCase() + type.slice(1)}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Fixed bottom button */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-card border-t safe-area-bottom">
        <Button
          onClick={handleSaveAndProceed}
          disabled={loading || !address || !apartment.trim()}
          className="w-full h-12 rounded-xl text-base font-semibold"
        >
          {loading ? (
            <><Loader2 className="h-4 w-4 animate-spin mr-2" /> Saving...</>
          ) : (
            "Save and proceed"
          )}
        </Button>
      </div>
    </div>
  );
}
