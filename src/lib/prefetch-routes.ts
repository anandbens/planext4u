// Warm up the most-visited route chunks after the app is idle.
//
// Route modules are lazy-loaded in App.tsx, which keeps the initial JS payload
// small but means the FIRST navigation to each screen incurs a network fetch
// + parse. By kicking off those imports during idle time (post first paint),
// the chunks are already in the browser cache and later route transitions are
// effectively instant.
//
// Notes:
// - Each import is fire-and-forget; failures are swallowed on purpose so a
//   404 for a stale chunk after a redeploy is handled by main.tsx's global
//   stale-chunk reload guard, not by throwing here.
// - We import a compact list of high-traffic screens per portal. Adding every
//   route would defeat the purpose (we'd re-download the whole app).
// - Uses requestIdleCallback where available; falls back to a small timeout.

type Importer = () => Promise<unknown>;

// Keep the prefetch list SMALL. Every entry pulls in its transitive chunks
// too, so 9 pages effectively downloads a big slice of the app during idle
// and can starve the network on slower connections / dev preview.
const CUSTOMER_ROUTES: Importer[] = [
  () => import("@/pages/customer/CustomerHomePage"),
  () => import("@/pages/customer/CustomerBrowsePage"),
  () => import("@/pages/customer/CustomerCartPage"),
];

const VENDOR_ROUTES: Importer[] = [
  () => import("@/pages/vendor/VendorOrdersPage"),
  () => import("@/pages/vendor/VendorProductsPage"),
];

const ADMIN_ROUTES: Importer[] = [
  () => import("@/pages/DashboardPage"),
  () => import("@/pages/OrdersPage"),
];

function pickBundle(): Importer[] {
  if (typeof window === "undefined") return [];
  const path = window.location.pathname || "";
  const search = window.location.search || "";
  if (path.startsWith("/vendor") || search.includes("portal=vendor")) return VENDOR_ROUTES;
  if (path.startsWith("/admin")) return ADMIN_ROUTES;
  return CUSTOMER_ROUTES;
}

function schedule(cb: () => void) {
  const w = window as unknown as {
    requestIdleCallback?: (cb: () => void, opts?: { timeout: number }) => number;
  };
  if (typeof w.requestIdleCallback === "function") {
    w.requestIdleCallback(cb, { timeout: 6000 });
  } else {
    setTimeout(cb, 4000);
  }
}

let started = false;

export function prefetchLikelyRoutes(): void {
  if (started || typeof window === "undefined") return;
  started = true;

  // Respect users on slow / metered connections.
  const conn = (navigator as unknown as { connection?: { saveData?: boolean; effectiveType?: string } }).connection;
  if (conn?.saveData) return;
  if (conn?.effectiveType && /(^|-)(2g|slow-2g|3g)$/i.test(conn.effectiveType)) return;

  // Skip prefetch entirely in dev (Vite dev-server serves modules on demand
  // and prefetching thrashes the transform cache, making the first paint slow).
  if (import.meta.env?.DEV) return;

  schedule(() => {
    const routes = pickBundle();
    routes.forEach((imp, i) => {
      setTimeout(() => {
        try { imp().catch(() => { /* stale chunk handler in main.tsx */ }); } catch { /* ignore */ }
      }, i * 400);
    });
  });
}
