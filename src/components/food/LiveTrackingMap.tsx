import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

interface LatLng { lat: number; lng: number; }

interface Props {
  orderId?: string;                           // for realtime rider location subscription
  pickup?: LatLng | null;                     // restaurant
  drop?: LatLng | null;                       // customer delivery address
  initialRider?: LatLng | null;
  riderId?: string | null;                    // when provided, also subscribes to riders.current_lat/lng updates
  height?: number;
  showRoute?: boolean;
}

let mapsScriptPromise: Promise<void> | null = null;

async function loadGoogleMaps(): Promise<void> {
  if (typeof window === "undefined") return;
  if ((window as any).google?.maps) return;
  if (mapsScriptPromise) return mapsScriptPromise;

  mapsScriptPromise = (async () => {
    const { data } = await supabase
      .from("platform_variables")
      .select("value")
      .or("key.eq.GOOGLE_MAPS_API_KEY,key.eq.google_maps_api_key")
      .limit(1)
      .maybeSingle();
    const apiKey = (data as any)?.value || "";
    if (!apiKey) throw new Error("Google Maps API key not configured");

    await new Promise<void>((resolve, reject) => {
      const script = document.createElement("script");
      script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=geometry`;
      script.async = true;
      script.defer = true;
      script.onload = () => resolve();
      script.onerror = () => reject(new Error("Failed to load Google Maps"));
      document.head.appendChild(script);
    });
  })();

  return mapsScriptPromise;
}

export function LiveTrackingMap({ orderId, pickup, drop, initialRider, riderId, height = 280, showRoute = true }: Props) {
  const mapEl = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<any>(null);
  const riderMarker = useRef<any>(null);
  const pickupMarker = useRef<any>(null);
  const dropMarker = useRef<any>(null);
  const polylineRef = useRef<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [riderPos, setRiderPos] = useState<LatLng | null>(initialRider || null);

  // Init map
  useEffect(() => {
    let cancelled = false;
    loadGoogleMaps().then(() => {
      if (cancelled || !mapEl.current) return;
      const g = (window as any).google;
      const center = riderPos || pickup || drop || { lat: 12.9716, lng: 77.5946 };
      mapRef.current = new g.maps.Map(mapEl.current, {
        center, zoom: 14, disableDefaultUI: true, zoomControl: true,
        styles: [{ featureType: "poi", stylers: [{ visibility: "off" }] }],
      });

      if (pickup) {
        pickupMarker.current = new g.maps.Marker({
          position: pickup, map: mapRef.current, title: "Restaurant",
          label: { text: "🍽", fontSize: "20px" },
        });
      }
      if (drop) {
        dropMarker.current = new g.maps.Marker({
          position: drop, map: mapRef.current, title: "Delivery address",
          label: { text: "📍", fontSize: "20px" },
        });
      }
      if (riderPos) {
        riderMarker.current = new g.maps.Marker({
          position: riderPos, map: mapRef.current, title: "Rider",
          icon: { path: g.maps.SymbolPath.CIRCLE, scale: 9, fillColor: "#0aa", fillOpacity: 1, strokeColor: "#fff", strokeWeight: 3 },
        });
      }
      drawRoute();
      fitBounds();
    }).catch(e => setError(e.message));
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Update markers/route when positions change
  useEffect(() => {
    const g = (window as any).google;
    if (!g || !mapRef.current) return;
    if (riderPos) {
      if (!riderMarker.current) {
        riderMarker.current = new g.maps.Marker({
          position: riderPos, map: mapRef.current, title: "Rider",
          icon: { path: g.maps.SymbolPath.CIRCLE, scale: 9, fillColor: "#0aa", fillOpacity: 1, strokeColor: "#fff", strokeWeight: 3 },
        });
      } else {
        riderMarker.current.setPosition(riderPos);
      }
    }
    drawRoute();
    fitBounds();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [riderPos, pickup?.lat, pickup?.lng, drop?.lat, drop?.lng]);

  // Realtime: subscribe to rider_locations for this order
  useEffect(() => {
    if (!orderId) return;
    const ch = supabase
      .channel(`rider-loc-${orderId}`)
      .on("postgres_changes", {
        event: "INSERT", schema: "public", table: "rider_locations", filter: `order_id=eq.${orderId}`,
      }, (payload) => {
        const row: any = payload.new;
        if (row?.latitude != null && row?.longitude != null) {
          setRiderPos({ lat: Number(row.latitude), lng: Number(row.longitude) });
        }
      })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [orderId]);

  // Realtime: also listen for rider's current_lat/lng updates (when not yet picked up)
  useEffect(() => {
    if (!riderId) return;
    const ch = supabase
      .channel(`rider-pos-${riderId}`)
      .on("postgres_changes", {
        event: "UPDATE", schema: "public", table: "riders", filter: `id=eq.${riderId}`,
      }, (payload) => {
        const row: any = payload.new;
        if (row?.current_lat != null && row?.current_lng != null) {
          setRiderPos({ lat: Number(row.current_lat), lng: Number(row.current_lng) });
        }
      })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [riderId]);

  function drawRoute() {
    if (!showRoute) return;
    const g = (window as any).google;
    if (!g || !mapRef.current) return;
    const path: LatLng[] = [];
    if (riderPos) path.push(riderPos);
    if (pickup && (!riderPos || riderPos.lat !== pickup.lat || riderPos.lng !== pickup.lng)) path.push(pickup);
    if (drop) path.push(drop);
    if (path.length < 2) return;
    if (polylineRef.current) polylineRef.current.setMap(null);
    polylineRef.current = new g.maps.Polyline({
      path, geodesic: true, strokeColor: "#0aa", strokeOpacity: 0.9, strokeWeight: 4, map: mapRef.current,
    });
  }

  function fitBounds() {
    const g = (window as any).google;
    if (!g || !mapRef.current) return;
    const bounds = new g.maps.LatLngBounds();
    let any = false;
    [riderPos, pickup, drop].forEach(p => { if (p) { bounds.extend(p); any = true; } });
    if (any) mapRef.current.fitBounds(bounds, 60);
  }

  if (error) {
    return (
      <div style={{ height }} className="rounded-xl bg-muted/40 border border-border/50 flex items-center justify-center text-xs text-muted-foreground p-3 text-center">
        Live map unavailable: {error}
      </div>
    );
  }

  return <div ref={mapEl} style={{ height }} className="w-full rounded-xl overflow-hidden border border-border/50" />;
}
