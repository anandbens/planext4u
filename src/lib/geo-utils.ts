/**
 * Calculate distance between two lat/lng points using Haversine formula
 * @returns distance in kilometers
 */
export function haversineDistance(
  lat1: number, lon1: number,
  lat2: number, lon2: number
): number {
  const R = 6371; // Earth's radius in km
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c * 10) / 10; // 1 decimal place
}

function toRad(deg: number): number {
  return deg * (Math.PI / 180);
}

/**
 * Format distance for display
 */
export function formatDistance(km: number): string {
  if (km < 1) return `${Math.round(km * 1000)}m away`;
  return `${km} km away`;
}

/**
 * Get plan tier badge color
 */
export function getPlanBadgeColor(planName: string): string {
  const colors: Record<string, string> = {
    basic: "bg-muted text-muted-foreground",
    standard: "bg-blue-100 text-blue-700",
    premium: "bg-purple-100 text-purple-700",
    bronze: "bg-amber-100 text-amber-800",
    silver: "bg-slate-200 text-slate-700",
    gold: "bg-yellow-100 text-yellow-700",
    diamond: "bg-cyan-100 text-cyan-700",
    platinum: "bg-gradient-to-r from-violet-100 to-pink-100 text-violet-700",
  };
  return colors[planName.toLowerCase()] || "bg-muted text-muted-foreground";
}
