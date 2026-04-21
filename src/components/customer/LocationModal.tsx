import { useState, useCallback } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { getLocation } from "@/lib/device-service";
import { toast } from "sonner";
import { Search, Navigation, Loader2 } from "lucide-react";
import { useCountry } from "@/lib/country-context";

const GOOGLE_MAPS_KEY_FALLBACK = "AIzaSyAoz0ZK26oE1qZSKK8pG1Ebh9sTTeaOl7M";

async function getGoogleMapsKey(): Promise<string> {
  try {
    const { supabase } = await import("@/integrations/supabase/client");
    const { data } = await supabase.from("platform_variables").select("value").eq("key", "GOOGLE_MAPS_API_KEY").maybeSingle();
    return data?.value || GOOGLE_MAPS_KEY_FALLBACK;
  } catch {
    return GOOGLE_MAPS_KEY_FALLBACK;
  }
}

export const LOCATION_CHANGED_EVENT = "p4u:location-changed";

export function loadSelectedLocation(): string {
  return localStorage.getItem("app_db_selected_location") || "";
}

export function saveSelectedLocation(loc: string) {
  localStorage.setItem("app_db_selected_location", loc);
  try { window.dispatchEvent(new CustomEvent(LOCATION_CHANGED_EVENT, { detail: { location: loc } })); } catch {}
}

export function loadSelectedCoords(): { lat: number; lng: number } | null {
  try {
    const raw = localStorage.getItem("app_db_selected_coords");
    if (raw) return JSON.parse(raw);
  } catch {}
  return null;
}

export function saveSelectedCoords(lat: number, lng: number) {
  localStorage.setItem("app_db_selected_coords", JSON.stringify({ lat, lng }));
}

interface LocationModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (address: string) => void;
}

export function LocationModal({ open, onOpenChange, onSelect }: LocationModalProps) {
  const { country } = useCountry();
  const [searchQuery, setSearchQuery] = useState("");
  const [locating, setLocating] = useState(false);
  const [suggestions, setSuggestions] = useState<Array<{ description: string; place_id: string }>>([]);
  const [searching, setSearching] = useState(false);

  const handleUseCurrentLocation = useCallback(async () => {
    setLocating(true);
    try {
      const coords = await getLocation();
      if (!coords) {
        toast.error("Couldn't read your current location. Please try again.");
        return;
      }

      saveSelectedCoords(coords.lat, coords.lng);

      let label = "Current Location";

      try {
        const apiKey = await getGoogleMapsKey();
        const res = await fetch(`https://maps.googleapis.com/maps/api/geocode/json?latlng=${coords.lat},${coords.lng}&key=${apiKey}`);
        const data = await res.json();

        if (data.status === "OK" && data.results.length > 0) {
          const components = data.results[0].address_components || [];
          const get = (type: string) => components.find((c: { long_name: string; types: string[] }) => c.types.includes(type))?.long_name || "";
          const area = get("sublocality_level_1") || get("sublocality") || get("neighborhood") || get("locality");
          const city = get("locality") || get("administrative_area_level_3") || get("administrative_area_level_2") || "";
          const state = get("administrative_area_level_1");

          label = [area || city, state].filter(Boolean).join(", ")
            || data.results[0].formatted_address?.split(",").slice(0, 2).join(", ")
            || "Current Location";
        }
      } catch {
        label = "Current Location";
      }

      onSelect(label);
      saveSelectedLocation(label);
      onOpenChange(false);
    } catch (err: any) {
      // Surface the specific reason instead of a generic "permission denied"
      // toast — the underlying cause is often GPS off, timeout, or an
      // insecure origin, NOT a denied permission.
      const reason = err?.message || "Could not fetch your current location. Please try again.";
      console.error("[LocationModal] getLocation failed:", err);
      toast.error(reason, { duration: 6000 });
    } finally {
      setLocating(false);
    }
  }, [onSelect, onOpenChange]);

  const handleSearch = useCallback(async (query: string) => {
    setSearchQuery(query);
    if (query.length < 3) { setSuggestions([]); return; }
    setSearching(true);
    try {
      const apiKey = await getGoogleMapsKey();
      // Bias search results to active country (IN, NG, US, ...)
      const countryFilter = country?.code ? `&components=country:${country.code}` : "";
      const res = await fetch(`https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(query)}${countryFilter}&key=${apiKey}`);
      const data = await res.json();
      if (data.status === "OK") {
        setSuggestions(data.results.slice(0, 5).map((r: any) => ({
          description: r.formatted_address,
          place_id: r.place_id,
          lat: r.geometry.location.lat,
          lng: r.geometry.location.lng,
        })));
      }
    } catch {}
    setSearching(false);
  }, [country?.code]);

  const handleSelectSuggestion = (s: any) => {
    if (s.lat && s.lng) saveSelectedCoords(s.lat, s.lng);
    const short = s.description.length > 35 ? s.description.slice(0, 35) + "..." : s.description;
    onSelect(short);
    saveSelectedLocation(short);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-lg font-bold">Select Location</DialogTitle>
        </DialogHeader>

        <div className="relative mt-2">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search for area, city..."
            value={searchQuery}
            onChange={(e) => handleSearch(e.target.value)}
            className="pl-9 h-11"
          />
        </div>

        <button
          type="button"
          onClick={handleUseCurrentLocation}
          disabled={locating}
          className="flex items-center gap-3 w-full p-3 rounded-xl border border-border/50 hover:bg-accent/50 transition-colors mt-2"
        >
          <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
            {locating ? <Loader2 className="h-5 w-5 text-primary animate-spin" /> : <Navigation className="h-5 w-5 text-primary" />}
          </div>
          <div className="text-left flex-1">
            <p className="text-sm font-semibold text-primary">Use My Current Location</p>
            <p className="text-xs text-muted-foreground">Enable your current location for better services</p>
          </div>
          <span className="inline-flex min-w-20 items-center justify-center rounded-md border border-primary px-3 py-2 text-xs font-medium text-primary transition-colors">
            {locating ? "Detecting..." : "Enable"}
          </span>
        </button>

        {suggestions.length > 0 && (
          <div className="mt-3 space-y-1">
            <h3 className="font-semibold text-sm mb-2">Search Results</h3>
            {suggestions.map((s, i) => (
              <button key={i} onClick={() => handleSelectSuggestion(s)}
                className="w-full text-left px-3 py-2.5 rounded-lg hover:bg-accent/50 text-sm flex items-center gap-2 transition-colors">
                <Navigation className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                <span className="truncate">{s.description}</span>
              </button>
            ))}
          </div>
        )}

        {searching && <p className="text-xs text-muted-foreground text-center py-4">Searching...</p>}
      </DialogContent>
    </Dialog>
  );
}
