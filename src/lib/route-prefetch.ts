/**
 * Route-hover prefetch registry.
 *
 * A page's JS chunk is normally fetched only when the user actually clicks a
 * link. That leaves ~200-500 ms of blank-screen latency on nav. This module
 * lets us start the fetch on hover / focus / touchstart, so by the time the
 * click resolves the module is usually already in cache.
 *
 * We register only high-traffic top-level routes here — dynamic-detail routes
 * (`/app/products/:id`, `/vendor/orders/:id`, …) share their code with the list
 * page and are prefetched by way of the list route.
 */

type Loader = () => Promise<unknown>;

// Registered chunk loaders. Keys are exact pathnames.
const loaders: Record<string, Loader> = {
  // ---- Customer ----
  "/app": () => import("@/pages/customer/CustomerHomePage"),
  "/app/dashboard": () => import("@/pages/customer/CustomerDashboardPage"),
  "/app/browse": () => import("@/pages/customer/CustomerBrowsePage"),
  "/app/categories": () => import("@/pages/customer/AllCategoriesPage"),
  "/app/deals": () => import("@/pages/customer/CustomerDealsPage"),
  "/app/trending": () => import("@/pages/customer/CustomerTrendingPage"),
  "/app/cart": () => import("@/pages/customer/CustomerCartPage"),
  "/app/orders": () => import("@/pages/customer/CustomerOrdersPage"),
  "/app/profile": () => import("@/pages/customer/CustomerProfilePage"),
  "/app/wallet": () => import("@/pages/customer/CustomerWalletPage"),
  "/app/wishlist": () => import("@/pages/customer/CustomerWishlistPage"),
  "/app/referral": () => import("@/pages/customer/CustomerReferralPage"),
  "/app/services": () => import("@/pages/customer/CustomerServicesPage"),
  "/app/classifieds": () => import("@/pages/customer/CustomerClassifiedsPage"),
  "/app/support": () => import("@/pages/customer/CustomerSupportPage"),
  "/app/login": () => import("@/pages/customer/CustomerLoginPage"),
  "/app/register": () => import("@/pages/customer/CustomerRegisterPage"),
  "/app/social": () => import("@/pages/customer/SocialFeedPage"),
  "/app/social/reels": () => import("@/pages/customer/SocialReelsPage"),
  "/app/social/explore": () => import("@/pages/customer/SocialExplorePage"),
  "/app/food": () => import("@/pages/customer/food/FoodHomePage"),
  "/app/food/orders": () => import("@/pages/customer/food/FoodOrdersPage"),
  "/app/food/cart": () => import("@/pages/customer/food/FoodCartPage"),
  "/app/homes": () => import("@/pages/customer/PropertyHomePage"),

  // ---- Vendor ----
  "/vendor": () => import("@/pages/vendor/VendorDashboardPage"),
  "/vendor/products": () => import("@/pages/vendor/VendorProductsPage"),
  "/vendor/services": () => import("@/pages/vendor/VendorServicesPage"),
  "/vendor/orders": () => import("@/pages/vendor/VendorOrdersPage"),
  "/vendor/settlements": () => import("@/pages/vendor/VendorSettlementsPage"),
  "/vendor/payments": () => import("@/pages/vendor/VendorPaymentHistoryPage"),
  "/vendor/profile": () => import("@/pages/vendor/VendorProfilePage"),
  "/vendor/bank": () => import("@/pages/vendor/VendorBankPage"),
  "/vendor/bookings": () => import("@/pages/vendor/VendorBookingsPage"),
  "/vendor/login": () => import("@/pages/vendor/VendorLoginPage"),

  // ---- Admin ----
  "/dashboard": () => import("@/pages/DashboardPage"),
  "/orders": () => import("@/pages/OrdersPage"),
  "/products": () => import("@/pages/ProductsPage"),
  "/customers": () => import("@/pages/CustomersPage"),
  "/vendors": () => import("@/pages/VendorsPage"),
  "/reports": () => import("@/pages/ReportsPage"),
  "/settlements": () => import("@/pages/SettlementsPage"),
  "/categories": () => import("@/pages/CategoriesPage"),
  "/support-tickets": () => import("@/pages/SupportTicketsPage"),
  "/settings": () => import("@/pages/SettingsPage"),
};

const done = new Set<string>();

export function prefetchRoute(pathname: string): void {
  if (!pathname || done.has(pathname)) return;
  const loader = loaders[pathname];
  if (!loader) return;
  done.add(pathname);
  // Fire-and-forget. On failure allow a later retry.
  loader().catch(() => done.delete(pathname));
}

/**
 * Attach a single delegated listener that starts prefetching a route's chunk
 * as soon as the user hovers / focuses / taps an internal link.
 */
export function installRoutePrefetch(): () => void {
  if (typeof document === "undefined") return () => {};

  const handle = (event: Event) => {
    const target = event.target as HTMLElement | null;
    if (!target || typeof target.closest !== "function") return;
    const anchor = target.closest('a[href^="/"]') as HTMLAnchorElement | null;
    if (!anchor) return;
    const href = anchor.getAttribute("href");
    if (!href || href.startsWith("//")) return;
    try {
      const url = new URL(anchor.href, window.location.origin);
      prefetchRoute(url.pathname);
    } catch {
      /* ignore malformed URLs */
    }
  };

  document.addEventListener("mouseover", handle, { passive: true, capture: true });
  document.addEventListener("focusin", handle, { passive: true, capture: true });
  document.addEventListener("touchstart", handle, { passive: true, capture: true });

  return () => {
    document.removeEventListener("mouseover", handle, true);
    document.removeEventListener("focusin", handle, true);
    document.removeEventListener("touchstart", handle, true);
  };
}
