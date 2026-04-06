import { useState, useEffect, useCallback } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, Navigation, Loader2 } from "lucide-react";

const GOOGLE_MAPS_KEY = "AIzaSyAoz0ZK26oE1qZSKK8pG1Ebh9sTTeaOl7M";

export function loadSelectedLocation(): string {
  return localStorage.getItem("app_db_selected_location") || "";
}

export function saveSelectedLocation(loc: string) {
  localStorage.setItem("app_db_selected_location", loc);
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
  const [searchQuery, setSearchQuery] = useState("");
  const [locating, setLocating] = useState(false);
  const [suggestions, setSuggestions] = useState<Array<{ description: string; place_id: string }>>([]);
  const [searching, setSearching] = useState(false);

  const handleUseCurrentLocation = useCallback(() => {
    if (!navigator.geolocation) return;
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords;
        saveSelectedCoords(latitude, longitude);
        try {
          const res = await fetch(`https://maps.googleapis.com/maps/api/geocode/json?latlng=${latitude},${longitude}&key=${GOOGLE_MAPS_KEY}`);
          const data = await res.json();
          if (data.status === "OK" && data.results.length > 0) {
            const components = data.results[0].address_components || [];
            const get = (type: string) => components.find((c: any) => c.types.includes(type))?.long_name || "";
            const area = get("sublocality_level_1") || get("sublocality") || get("neighborhood") || get("locality");
            const city = get("locality") || get("administrative_area_level_2") || "";
            const label = area ? `${area}, ${city}` : city || data.results[0].formatted_address?.slice(0, 30) || "Current Location";
            onSelect(label);
            saveSelectedLocation(label);
          } else {
            onSelect("Current Location");
            saveSelectedLocation("Current Location");
          }
        } catch {
          onSelect("Current Location");
          saveSelectedLocation("Current Location");
        }
        setLocating(false);
        onOpenChange(false);
      },
      () => { setLocating(false); },
      { enableHighAccuracy: true, timeout: 15000 }
    );
  }, [onSelect, onOpenChange]);

  const handleSearch = useCallback(async (query: string) => {
    setSearchQuery(query);
    if (query.length < 3) { setSuggestions([]); return; }
    setSearching(true);
    try {
      const res = await fetch(`https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(query)}&components=country:IN&key=${GOOGLE_MAPS_KEY}`);
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
  }, []);

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
          <Button variant="outline" size="sm" className="text-xs border-primary text-primary hover:bg-primary hover:text-primary-foreground" disabled={locating}>
            {locating ? "Detecting..." : "Enable"}
          </Button>
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
