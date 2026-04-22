// Shared fallback image helper for services.
// Ensures the customer list view and the detail view render the same image.
const serviceImages: Record<string, string> = {
  cleaning: "https://images.unsplash.com/photo-1581578731548-c64695cc6952?w=600",
  plumbing: "https://images.unsplash.com/photo-1585704032915-c3400ca199e7?w=600",
  electrical: "https://images.unsplash.com/photo-1621905251189-08b45d6a269e?w=600",
  painting: "https://images.unsplash.com/photo-1562259929-b4e1fd3aef09?w=600",
  pest: "https://images.unsplash.com/photo-1632935190508-b25c2e7dc9f7?w=600",
  carpentry: "https://images.unsplash.com/photo-1504148455328-c376907d081c?w=600",
  ac: "https://images.unsplash.com/photo-1585771724684-38269d6639fd?w=600",
  beauty: "https://images.unsplash.com/photo-1560066984-138dadb4c035?w=600",
  nail: "https://images.unsplash.com/photo-1604654894610-df63bc536371?w=600",
  karate: "https://images.unsplash.com/photo-1555597673-b21d5c935865?w=600",
  camera: "https://images.unsplash.com/photo-1502920917128-1aa500764cbd?w=600",
  default: "https://images.unsplash.com/photo-1581578731548-c64695cc6952?w=600",
};

export function getServiceImage(title: string, image?: string | null): string {
  if (image && typeof image === "string" && image.startsWith("http")) return image;
  const lower = (title || "").toLowerCase();
  for (const [key, url] of Object.entries(serviceImages)) {
    if (key !== "default" && lower.includes(key)) return url;
  }
  return serviceImages.default;
}
