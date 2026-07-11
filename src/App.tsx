import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/lib/auth";
import { CountryProvider } from "@/lib/country-context";
import { lazy, Suspense, useEffect, useState } from "react";
import { App as CapacitorApp } from "@capacitor/app";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { closeOAuthBrowser, extractOAuthResultFromUrl, isNativePlatform, isOAuthCallbackUrl } from "@/lib/capacitor-auth";
import { usePushNotifications } from "@/hooks/usePushNotifications";
import { installRoutePrefetch } from "@/lib/route-prefetch";

import { ProtectedRoute } from "@/components/admin/ProtectedRoute";
import { CustomerProtectedRoute } from "@/components/customer/CustomerProtectedRoute";
import { GuestOrCustomerRoute } from "@/components/customer/GuestOrCustomerRoute";
import { VendorProtectedRoute } from "@/components/vendor/VendorProtectedRoute";
import { FTUXFlow } from "@/components/customer/FTUXFlow";
import { isVendorApp, isVendorAppSync, isRiderAppSync, getNativeAppId } from "@/lib/capacitor";
import { ForceUpdateOverlay } from "@/components/ForceUpdateOverlay";
import { ModuleGuard } from "@/components/customer/ModuleGuard";
import { RiderProtectedRoute } from "@/components/rider/RiderProtectedRoute";
import { RiderLayout } from "@/components/rider/RiderLayout";

// ---------- Lazy-loaded pages ----------
// Splitting routes into their own chunks dramatically reduces the initial JS
// payload (~200 page modules previously loaded eagerly on every visit).
const LoginPage = lazy(() => import("./pages/LoginPage"));
const DashboardPage = lazy(() => import("./pages/DashboardPage"));
const CustomersPage = lazy(() => import("./pages/CustomersPage"));
const VendorsPage = lazy(() => import("./pages/VendorsPage"));
const ProductsPage = lazy(() => import("./pages/ProductsPage"));
const OrdersPage = lazy(() => import("./pages/OrdersPage"));
const SettlementsPage = lazy(() => import("./pages/SettlementsPage"));
const ClassifiedsPage = lazy(() => import("./pages/ClassifiedsPage"));
const PointsPage = lazy(() => import("./pages/PointsPage"));
const ReferralsPage = lazy(() => import("./pages/ReferralsPage"));
const ReportsPage = lazy(() => import("./pages/ReportsPage"));
const CMSPage = lazy(() => import("./pages/CMSPage"));
const AdminCMSPagesPage = lazy(() => import("./pages/admin/AdminCMSPagesPage"));
const SettingsPage = lazy(() => import("./pages/SettingsPage"));
const NotFound = lazy(() => import("./pages/NotFound"));
const CategoriesPage = lazy(() => import("./pages/CategoriesPage"));
const AdminServicesPage = lazy(() => import("./pages/AdminServicesPage"));
const TaxPage = lazy(() => import("./pages/TaxPage"));
const ReportLogPage = lazy(() => import("./pages/ReportLogPage"));
const CFCityPage = lazy(() => import("./pages/CFCityPage"));
const CFAreaPage = lazy(() => import("./pages/CFAreaPage"));
const CFCategoriesPage = lazy(() => import("./pages/CFCategoriesPage"));
const CFServicesPage = lazy(() => import("./pages/CFServicesPage"));
const CFVendorsPage = lazy(() => import("./pages/CFVendorsPage"));
const CFProductsPage = lazy(() => import("./pages/CFProductsPage"));
const OccupationsPage = lazy(() => import("./pages/OccupationsPage"));
const PlatformVariablesPage = lazy(() => import("./pages/PlatformVariablesPage"));
const PopupBannersPage = lazy(() => import("./pages/PopupBannersPage"));
const BannersPage = lazy(() => import("./pages/BannersPage"));
const AdvertisementsPage = lazy(() => import("./pages/AdvertisementsPage"));
const WebsiteQueriesPage = lazy(() => import("./pages/WebsiteQueriesPage"));
const SupportTicketsPage = lazy(() => import("./pages/SupportTicketsPage"));
const IntegrationsPage = lazy(() => import("./pages/IntegrationsPage"));
const SalesReportPage = lazy(() => import("./pages/reports/SalesReportPage"));
const VendorReportPage = lazy(() => import("./pages/reports/VendorReportPage"));
const SettlementReportPage = lazy(() => import("./pages/reports/SettlementReportPage"));
const CustomerReportPage = lazy(() => import("./pages/reports/CustomerReportPage"));
const PointsReportPage = lazy(() => import("./pages/reports/PointsReportPage"));
const ReferralReportPage = lazy(() => import("./pages/reports/ReferralReportPage"));
const ClassifiedReportPage = lazy(() => import("./pages/reports/ClassifiedReportPage"));
const TaxReportPage = lazy(() => import("./pages/reports/TaxReportPage"));
const PaymentReportPage = lazy(() => import("./pages/reports/PaymentReportPage"));
const P4URevenueReportPage = lazy(() => import("./pages/reports/P4URevenueReportPage"));
const GSTR1ReportPage = lazy(() => import("./pages/reports/GSTR1ReportPage"));
const GSTR3BReportPage = lazy(() => import("./pages/reports/GSTR3BReportPage"));
const HSNSummaryReportPage = lazy(() => import("./pages/reports/HSNSummaryReportPage"));
const TCSReportPage = lazy(() => import("./pages/reports/TCSReportPage"));
const CreditNotesReportPage = lazy(() => import("./pages/reports/CreditNotesReportPage"));
const TDS194OReportPage = lazy(() => import("./pages/reports/TDS194OReportPage"));
const GSTR9ReportPage = lazy(() => import("./pages/reports/GSTR9ReportPage"));
const DayBookReportPage = lazy(() => import("./pages/reports/DayBookReportPage"));
const InvoicesListPage = lazy(() => import("./pages/reports/InvoicesListPage"));

// Customer pages
const CustomerHomePage = lazy(() => import("./pages/customer/CustomerHomePage"));
const CustomerDashboardPage = lazy(() => import("./pages/customer/CustomerDashboardPage"));
const CustomerLoginPage = lazy(() => import("./pages/customer/CustomerLoginPage"));
const CustomerBrowsePage = lazy(() => import("./pages/customer/CustomerBrowsePage"));
const AllCategoriesPage = lazy(() => import("./pages/customer/AllCategoriesPage"));
const CustomerDealsPage = lazy(() => import("./pages/customer/CustomerDealsPage"));
const CustomerTrendingPage = lazy(() => import("./pages/customer/CustomerTrendingPage"));
const CustomerVendorPage = lazy(() => import("./pages/customer/CustomerVendorPage"));
const CustomerProductPage = lazy(() => import("./pages/customer/CustomerProductPage"));
const CustomerCartPage = lazy(() => import("./pages/customer/CustomerCartPage"));
const CustomerOrdersPage = lazy(() => import("./pages/customer/CustomerOrdersPage"));
const CustomerOrderDetailPage = lazy(() => import("./pages/customer/CustomerOrderDetailPage"));
const CustomerProfilePage = lazy(() => import("./pages/customer/CustomerProfilePage"));
const CustomerProfileEditPage = lazy(() => import("./pages/customer/CustomerProfileEditPage"));
const CustomerKYCPage = lazy(() => import("./pages/customer/CustomerKYCPage"));
const CustomerWalletPage = lazy(() => import("./pages/customer/CustomerWalletPage"));
const CustomerWishlistPage = lazy(() => import("./pages/customer/CustomerWishlistPage"));
const CustomerReferralPage = lazy(() => import("./pages/customer/CustomerReferralPage"));
const CustomerServicesPage = lazy(() => import("./pages/customer/CustomerServicesPage"));
const CustomerServiceDetailPage = lazy(() => import("./pages/customer/CustomerServiceDetailPage"));
const CustomerClassifiedsPage = lazy(() => import("./pages/customer/CustomerClassifiedsPage"));
const CustomerPostAdPage = lazy(() => import("./pages/customer/CustomerPostAdPage"));
const CustomerClassifiedDetailPage = lazy(() => import("./pages/customer/CustomerClassifiedDetailPage"));
const CustomerRegisterPage = lazy(() => import("./pages/customer/CustomerRegisterPage"));
const VendorRegisterPage = lazy(() => import("./pages/customer/VendorRegisterPage"));
const CustomerPhoneLoginPage = lazy(() => import("./pages/customer/CustomerPhoneLoginPage"));
const SetLocationPage = lazy(() => import("./pages/customer/SetLocationPage"));
const TermsPage = lazy(() => import("./pages/customer/TermsPage"));
const PrivacyPolicyPage = lazy(() => import("./pages/customer/PrivacyPolicyPage"));
const AuthCallbackPage = lazy(() => import("./pages/customer/AuthCallbackPage"));
const CustomerCMSPage = lazy(() => import("./pages/customer/CustomerCMSPage"));
const ForgotPasswordPage = lazy(() => import("./pages/customer/ForgotPasswordPage"));
const ResetPasswordPage = lazy(() => import("./pages/customer/ResetPasswordPage"));
const SetPasswordPage = lazy(() => import("./pages/customer/SetPasswordPage"));
const CustomerSupportPage = lazy(() => import("./pages/customer/CustomerSupportPage"));
const CustomerChangePasswordPage = lazy(() => import("./pages/customer/CustomerChangePasswordPage"));

// Social pages
const SocialFeedPage = lazy(() => import("./pages/customer/SocialFeedPage"));
const SocialCreatePostPage = lazy(() => import("./pages/customer/SocialCreatePostPage"));
const SocialEditPostPage = lazy(() => import("./pages/customer/SocialEditPostPage"));
const SocialProfilePage = lazy(() => import("./pages/customer/SocialProfilePage"));
const SocialExplorePage = lazy(() => import("./pages/customer/SocialExplorePage"));
const SocialReelsPage = lazy(() => import("./pages/customer/SocialReelsPage"));
const SocialStoryViewerPage = lazy(() => import("./pages/customer/SocialStoryViewerPage"));
const SocialDMPage = lazy(() => import("./pages/customer/SocialDMPage"));
const SocialNotificationsPage = lazy(() => import("./pages/customer/SocialNotificationsPage"));
const SocialSettingsPage = lazy(() => import("./pages/customer/SocialSettingsPage"));
const SocialCommentsPage = lazy(() => import("./pages/customer/SocialCommentsPage"));
const SocialFollowersPage = lazy(() => import("./pages/customer/SocialFollowersPage"));
const SocialEditProfilePage = lazy(() => import("./pages/customer/SocialEditProfilePage"));
const SocialCreatorDashboardPage = lazy(() => import("./pages/customer/SocialCreatorDashboardPage"));
const SocialLivePage = lazy(() => import("./pages/customer/SocialLivePage"));
const SocialBroadcastPage = lazy(() => import("./pages/customer/SocialBroadcastPage"));
const SocialShopPage = lazy(() => import("./pages/customer/SocialShopPage"));
const SocialChangePasswordPage = lazy(() => import("./pages/customer/SocialChangePasswordPage"));
const SocialPrivacyPage = lazy(() => import("./pages/customer/SocialPrivacyPage"));
const SocialSecurityPage = lazy(() => import("./pages/customer/SocialSecurityPage"));
const SocialNotificationSettingsPage = lazy(() => import("./pages/customer/SocialNotificationSettingsPage"));
const SocialHelpCenterPage = lazy(() => import("./pages/customer/SocialHelpCenterPage"));
const SocialSuggestionsPage = lazy(() => import("./pages/customer/SocialSuggestionsPage"));
const SocialFriendsPage = lazy(() => import("./pages/customer/SocialFriendsPage"));
const AdminSocialDashboardPage = lazy(() => import("./pages/admin/AdminSocialDashboardPage"));
const PaymentPage = lazy(() => import("./pages/customer/PaymentPage"));
const SocioDMChatPage = lazy(() => import("./pages/customer/SocioDMChatPage"));
const SocialPostDetailPage = lazy(() => import("./pages/customer/SocialPostDetailPage"));
const SocialUserPostsPage = lazy(() => import("./pages/customer/SocialUserPostsPage"));

// Property pages
const PropertyHomePage = lazy(() => import("./pages/customer/PropertyHomePage"));
const PropertyDetailPage = lazy(() => import("./pages/customer/PropertyDetailPage"));
const PostPropertyPage = lazy(() => import("./pages/customer/PostPropertyPage"));
const PropertyEMIPage = lazy(() => import("./pages/customer/PropertyEMIPage"));
const MyPropertiesPage = lazy(() => import("./pages/customer/MyPropertiesPage"));
const SavedSearchesPage = lazy(() => import("./pages/customer/SavedSearchesPage"));
const PropertyMessagesPage = lazy(() => import("./pages/customer/PropertyMessagesPage"));
const RentTrackerPage = lazy(() => import("./pages/customer/RentTrackerPage"));
const PropertyValueEstimatorPage = lazy(() => import("./pages/customer/PropertyValueEstimatorPage"));
const AdminPropertiesPage = lazy(() => import("./pages/admin/AdminPropertiesPage"));
const AdminLocalitiesPage = lazy(() => import("./pages/admin/AdminLocalitiesPage"));
const AdminPropertyPlansPage = lazy(() => import("./pages/admin/AdminPropertyPlansPage"));
const AdminPropertyReportsPage = lazy(() => import("./pages/admin/AdminPropertyReportsPage"));
const AdminHomesAmenitiesPage = lazy(() => import("./pages/admin/AdminHomesAmenitiesPage"));
const AdminHomesCMSPage = lazy(() => import("./pages/admin/AdminHomesCMSPage"));
const AdminHomesUsersPage = lazy(() => import("./pages/admin/AdminHomesUsersPage"));
const AdminHomesModerationPage = lazy(() => import("./pages/admin/AdminHomesModerationPage"));
const AdminVendorPlansPage = lazy(() => import("./pages/admin/AdminVendorPlansPage"));
const AdminFranchisePlansPage = lazy(() => import("./pages/admin/AdminFranchisePlansPage"));
const AdminFranchiseRegistrationsPage = lazy(() => import("./pages/admin/AdminFranchiseRegistrationsPage"));
const AdminActiveFranchisesPage = lazy(() => import("./pages/admin/AdminActiveFranchisesPage"));
const AdminRegistrationPaymentsPage = lazy(() => import("./pages/admin/AdminRegistrationPaymentsPage"));
const AdminMediaLibraryPage = lazy(() => import("./pages/admin/AdminMediaLibraryPage"));
const AdminOnboardingPage = lazy(() => import("./pages/admin/AdminOnboardingPage"));
const AdminProductAttributesPage = lazy(() => import("./pages/admin/AdminProductAttributesPage"));
const AdminNotificationsPage = lazy(() => import("./pages/admin/AdminNotificationsPage"));
const FileUploadsPage = lazy(() => import("./pages/admin/FileUploadsPage"));
const ParentItemsPage = lazy(() => import("./pages/admin/ParentItemsPage"));
const AdminComplaintsPage = lazy(() => import("./pages/admin/AdminComplaintsPage"));
const AdminVendorOnboardingPage = lazy(() => import("./pages/admin/AdminVendorOnboardingPage"));
const AdminSplashScreensPage = lazy(() => import("./pages/admin/AdminSplashScreensPage"));
const AdminHomepageCMSPage = lazy(() => import("./pages/admin/AdminHomepageCMSPage"));
const AdminModuleVisibilityPage = lazy(() => import("./pages/admin/AdminModuleVisibilityPage"));

// Vendor pages
const VendorLoginPage = lazy(() => import("./pages/vendor/VendorLoginPage"));
const VendorRegisterStandalonePage = lazy(() => import("./pages/vendor/VendorRegisterPage"));
const VendorDashboardPage = lazy(() => import("./pages/vendor/VendorDashboardPage"));
const VendorProductsPage = lazy(() => import("./pages/vendor/VendorProductsPage"));
const VendorServicesPage = lazy(() => import("./pages/vendor/VendorServicesPage"));
const VendorAvailabilityPage = lazy(() => import("./pages/vendor/VendorAvailabilityPage"));
const VendorOrdersPage = lazy(() => import("./pages/vendor/VendorOrdersPage"));
const VendorSettlementsPage = lazy(() => import("./pages/vendor/VendorSettlementsPage"));
const VendorProfilePage = lazy(() => import("./pages/vendor/VendorProfilePage"));
const VendorBankPage = lazy(() => import("./pages/vendor/VendorBankPage"));
const VendorPaymentHistoryPage = lazy(() => import("./pages/vendor/VendorPaymentHistoryPage"));
const VendorAccountControlPage = lazy(() => import("./pages/vendor/VendorAccountControlPage"));
const VendorMediaLibraryPage = lazy(() => import("./pages/vendor/VendorMediaLibraryPage"));
const VendorChangePasswordPage = lazy(() => import("./pages/vendor/VendorChangePasswordPage"));
const VendorBookingsPage = lazy(() => import("./pages/vendor/VendorBookingsPage"));
const VendorKYCPage = lazy(() => import("./pages/vendor/VendorKYCPage"));
const AccountControlPage = lazy(() => import("./pages/customer/AccountControlPage"));

// Food delivery
const FoodHomePage = lazy(() => import("./pages/customer/food/FoodHomePage"));
const FoodRestaurantPage = lazy(() => import("./pages/customer/food/FoodRestaurantPage"));
const FoodCartPage = lazy(() => import("./pages/customer/food/FoodCartPage"));
const FoodOrdersPage = lazy(() => import("./pages/customer/food/FoodOrdersPage"));
const FoodOrderDetailPage = lazy(() => import("./pages/customer/food/FoodOrderDetailPage"));
const VendorRestaurantPage = lazy(() => import("./pages/vendor/VendorRestaurantPage"));
const VendorFoodOrdersPage = lazy(() => import("./pages/vendor/VendorFoodOrdersPage"));
const RiderLoginPage = lazy(() => import("./pages/rider/RiderLoginPage"));
const RiderRegisterPage = lazy(() => import("./pages/rider/RiderRegisterPage"));
const RiderDashboardPage = lazy(() => import("./pages/rider/RiderDashboardPage"));
const RiderKYCPage = lazy(() => import("./pages/rider/RiderKYCPage"));
const RiderProfilePage = lazy(() => import("./pages/rider/RiderProfilePage"));
const RiderEarningsPage = lazy(() => import("./pages/rider/RiderEarningsPage"));
const RiderOrdersPage = lazy(() => import("./pages/rider/RiderOrdersPage"));
const AdminRestaurantsPage = lazy(() => import("./pages/admin/AdminRestaurantsPage"));
const AdminRidersPage = lazy(() => import("./pages/admin/AdminRidersPage"));
const AdminRiderKYCPage = lazy(() => import("./pages/admin/AdminRiderKYCPage"));
const AdminRiderSettlementsPage = lazy(() => import("./pages/admin/AdminRiderSettlementsPage"));
const AdminFoodOrdersPage = lazy(() => import("./pages/admin/AdminFoodOrdersPage"));
const AdminFoodCouponsPage = lazy(() => import("./pages/admin/AdminFoodCouponsPage"));
const AdminDropshippingPage = lazy(() => import("./pages/admin/AdminDropshippingPage"));
const VendorDropshippingPage = lazy(() => import("./pages/vendor/VendorDropshippingPage"));
const AdminCouponsPage = lazy(() => import("./pages/admin/AdminCouponsPage"));
const CouponDashboardPage = lazy(() => import("./pages/admin/coupons/CouponDashboardPage"));
const CouponInventoryPage = lazy(() => import("./pages/admin/coupons/CouponInventoryPage"));
const CouponAuditLogPage = lazy(() => import("./pages/admin/coupons/CouponAuditLogPage"));
const CouponAnalyticsPage = lazy(() => import("./pages/admin/coupons/CouponAnalyticsPage"));
const CouponReportsPage = lazy(() => import("./pages/admin/coupons/CouponReportsPage"));
const CouponGeneratePage = lazy(() => import("./pages/admin/coupons/CouponGeneratePage"));
const AdminFraudPage = lazy(() => import("./pages/admin/coupons/AdminFraudPage"));
const VendorCouponsPage = lazy(() => import("./pages/vendor/VendorCouponsPage"));
const CustomerCouponsPage = lazy(() => import("./pages/customer/CustomerCouponsPage"));
const CallsPage = lazy(() => import("./pages/customer/CallsPage"));

// React Query defaults tuned for this app:
// - 2 min staleTime baseline → avoid refetching identical rows across every
//   route change / component mount. Reference data (categories, country,
//   platform_variables, customer basics) sets longer per-query staleTimes.
// - 24 h gcTime so navigating back to a page rehydrates instantly from cache
//   instead of re-hitting the database.
// - Persisted to localStorage so a cold reload does NOT refetch everything.
// - No window-focus refetch → big perf win on mobile WebViews.
// - Single retry with capped backoff → don't compound slowness on flaky calls.
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // 5 min staleTime — returning to a page within 5 min reuses cached
      // data with zero network. Individual queries can override for
      // fresher-needing data (orders, wallet, notifications).
      staleTime: 5 * 60_000,
      gcTime: 24 * 60 * 60_000,
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
      // Cached queries do NOT refetch on remount — big win when navigating
      // back to a screen. Stale data still refetches in background.
      refetchOnMount: false,
      retry: 1,
      retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 8000),
      networkMode: "online",
    },
  },
});

// Persist the React Query cache in localStorage so navigating back to a
// screen or reloading the app rehydrates instantly instead of re-issuing
// the same reference-data queries (categories, country, platform_variables,
// customer basics, etc.). Bump `buster` on incompatible cache shape changes.
if (typeof window !== "undefined") {
  import("@tanstack/query-sync-storage-persister")
    .then(({ createSyncStoragePersister }) =>
      import("@tanstack/react-query-persist-client").then(({ persistQueryClient }) => {
        const persister = createSyncStoragePersister({
          storage: window.localStorage,
          key: "p4u-rq-cache-v1",
          throttleTime: 1000,
        });
        persistQueryClient({
          queryClient: queryClient as any,
          persister,
          maxAge: 24 * 60 * 60 * 1000,
          buster: "v1",
          dehydrateOptions: {
            // Skip transient / user-scoped realtime queries from being persisted.
            shouldDehydrateQuery: (q) => {
              const key = Array.isArray(q.queryKey) ? String(q.queryKey[0]) : "";
              // Never persist: chat threads, incoming calls, live tracking,
              // realtime notifications — they should always re-fetch fresh.
              const skip = /^(chat|call|live-|realtime|notifications|delivery|order-)/i;
              return !skip.test(key);
            },
          },
        });
      })
    )
    .catch(() => { /* non-fatal — fall back to in-memory cache */ });
}

const NATIVE_PORTAL_STORAGE_KEY = "p4u_native_portal";

function detectForcedPortal(): "vendor" | "rider" | null {
  if (typeof window === "undefined") return null;
  const portal = new URLSearchParams(window.location.search).get("portal");
  if (portal === "vendor" || portal === "rider") {
    sessionStorage.setItem(NATIVE_PORTAL_STORAGE_KEY, portal);
    return portal;
  }
  const stored = sessionStorage.getItem(NATIVE_PORTAL_STORAGE_KEY);
  if (stored === "vendor" || stored === "rider") return stored;
  return null;
}

function detectForcedVendorPortal() { return detectForcedPortal() === "vendor"; }
function detectForcedRiderPortal() { return detectForcedPortal() === "rider"; }

const APP_ID_DETECTION_TIMEOUT_MS = 900;

function ProtectedPage({ children }: { children: React.ReactNode }) {
  return <ProtectedRoute>{children}</ProtectedRoute>;
}

// Sales-scoped routes (admin always allowed)
function SalesPage({ children }: { children: React.ReactNode }) {
  return <ProtectedRoute allowedRoles={['sales']}>{children}</ProtectedRoute>;
}

// Finance-scoped routes (admin always allowed)
function FinancePage({ children }: { children: React.ReactNode }) {
  return <ProtectedRoute allowedRoles={['finance']}>{children}</ProtectedRoute>;
}

// Routes that finance & sales may both access (read-only ops, reports overview, etc.)
function FinanceOrSalesPage({ children }: { children: React.ReactNode }) {
  return <ProtectedRoute allowedRoles={['finance', 'sales']}>{children}</ProtectedRoute>;
}

// Admin-only routes (system config, integrations, master data, etc.)
function AdminOnlyPage({ children }: { children: React.ReactNode }) {
  return <ProtectedRoute allowedRoles={[]}>{children}</ProtectedRoute>;
}

function CustomerPage({ children }: { children: React.ReactNode }) {
  return <CustomerProtectedRoute>{children}</CustomerProtectedRoute>;
}

function GuestPage({ children }: { children: React.ReactNode }) {
  return <GuestOrCustomerRoute>{children}</GuestOrCustomerRoute>;
}

// Module-gated wrappers: enforce platform_variables module flags at the route
// level so direct URL navigation cannot bypass a "Coming Soon" module.
function ServicesGate({ children }: { children: React.ReactNode }) {
  return <ModuleGuard moduleKey="services">{children}</ModuleGuard>;
}
function HomesGate({ children }: { children: React.ReactNode }) {
  return <ModuleGuard moduleKey="homes" label="Find Home">{children}</ModuleGuard>;
}
function ClassifiedsGate({ children }: { children: React.ReactNode }) {
  return <ModuleGuard moduleKey="classifieds">{children}</ModuleGuard>;
}
function SocioGate({ children }: { children: React.ReactNode }) {
  return <ModuleGuard moduleKey="socio" label="Socio">{children}</ModuleGuard>;
}
function ShopGate({ children }: { children: React.ReactNode }) {
  return <ModuleGuard moduleKey="shop">{children}</ModuleGuard>;
}
function FoodGate({ children }: { children: React.ReactNode }) {
  return <ModuleGuard moduleKey="food">{children}</ModuleGuard>;
}

function VendorPage({ children }: { children: React.ReactNode }) {
  return <VendorProtectedRoute>{children}</VendorProtectedRoute>;
}

// Lightweight fallback shown while a route's chunk is downloading.
function RouteFallback() {
  return (
    <div className="min-h-[100dvh] flex items-center justify-center bg-background">
      <div className="h-8 w-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
    </div>
  );
}

const AppRoutes = () => {
  const { customerUser, vendorUser } = useAuth();
  const forcedVendorPortal = detectForcedVendorPortal();
  const forcedRiderPortal = detectForcedRiderPortal();
  const [isVendorNativeApp, setIsVendorNativeApp] = useState(forcedVendorPortal);
  const [isRiderNativeApp, setIsRiderNativeApp] = useState(forcedRiderPortal);
  const [appIdReady, setAppIdReady] = useState(!isNativePlatform() || forcedVendorPortal || forcedRiderPortal);
  usePushNotifications();

  // Install a single delegated hover/focus/touch listener that prefetches the
  // JS chunk of the target route BEFORE the user clicks. Nav feels instant.
  useEffect(() => installRoutePrefetch(), []);



  // Detect native app identity on mount
  useEffect(() => {
    if (!isNativePlatform() || forcedVendorPortal || forcedRiderPortal) return;

    let cancelled = false;
    const fallback = setTimeout(() => {
      if (!cancelled) setAppIdReady(true);
    }, APP_ID_DETECTION_TIMEOUT_MS);

    getNativeAppId().then((appId) => {
      if (cancelled) return;
      const isVendor = appId === "com.p4u.p4u_vendor" || appId === "com.planext4u.vendor" || isVendorAppSync();
      const isRider = appId === "com.planext4u.rider" || isRiderAppSync();
      setIsVendorNativeApp(isVendor);
      setIsRiderNativeApp(isRider);
      if (isVendor) sessionStorage.setItem(NATIVE_PORTAL_STORAGE_KEY, "vendor");
      if (isRider) sessionStorage.setItem(NATIVE_PORTAL_STORAGE_KEY, "rider");
      setAppIdReady(true);
    }).finally(() => clearTimeout(fallback));

    return () => {
      cancelled = true;
      clearTimeout(fallback);
    };
  }, [forcedVendorPortal, forcedRiderPortal]);

  useEffect(() => {
    if (!isNativePlatform()) {
      return;
    }

    let listener: { remove: () => Promise<void> } | null = null;

    const registerListener = async () => {
      listener = await CapacitorApp.addListener("appUrlOpen", async ({ url }) => {
        if (!isOAuthCallbackUrl(url)) {
          return;
        }

        const { accessToken, refreshToken, errorDescription } = extractOAuthResultFromUrl(url);
        await closeOAuthBrowser();

        if (!accessToken || !refreshToken) {
          const fallbackLogin = isVendorNativeApp ? "/vendor/login" : "/app/login";
          toast.error(errorDescription || "Google sign-in failed. Please try again.");
          window.location.replace(fallbackLogin);
          return;
        }

        const { error } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken,
        });

        if (error) {
          const fallbackLogin = isVendorNativeApp ? "/vendor/login" : "/app/login";
          toast.error(error.message || "Google sign-in failed. Please try again.");
          window.location.replace(fallbackLogin);
          return;
        }

        window.location.replace("/auth/callback");
      });
    };

    void registerListener();

    return () => {
      void listener?.remove();
    };
  }, [isVendorNativeApp]);

  // Wait for app identity detection on native
  if (!appIdReady) {
    return <RouteFallback />;
  }

  // Determine portal redirects based on native app identity
  const vendorPortalMode = isVendorNativeApp || forcedVendorPortal;
  const riderPortalMode = isRiderNativeApp || forcedRiderPortal;
  const rootRedirect = riderPortalMode ? "/rider" : vendorPortalMode ? "/vendor" : "/app";
  const customerLoginRoute = riderPortalMode ? "/rider/login" : vendorPortalMode ? "/vendor/login" : "/app/login";
  const customerRegisterRoute = riderPortalMode ? "/rider/register" : vendorPortalMode ? "/vendor/register" : "/app/register";
  const customerHomeRoute = riderPortalMode ? "/rider" : vendorPortalMode ? "/vendor" : "/app";

  return (
    <FTUXFlow userId={customerUser?.supabase_uid}>
      <Suspense fallback={<RouteFallback />}>
        <Routes>
          {/* Redirect root based on app identity */}
          <Route path="/" element={<Navigate to={rootRedirect} replace />} />
          <Route path="/index" element={<Navigate to={rootRedirect} replace />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/admin/login" element={<LoginPage />} />
          <Route path="/dashboard" element={<ProtectedPage><DashboardPage /></ProtectedPage>} />
          <Route path="/customers" element={<SalesPage><CustomersPage /></SalesPage>} />
          <Route path="/vendors" element={<SalesPage><VendorsPage /></SalesPage>} />
          <Route path="/products" element={<SalesPage><ProductsPage /></SalesPage>} />
          <Route path="/orders" element={<FinanceOrSalesPage><OrdersPage /></FinanceOrSalesPage>} />
          <Route path="/settlements" element={<FinancePage><SettlementsPage /></FinancePage>} />
          <Route path="/classifieds" element={<SalesPage><ClassifiedsPage /></SalesPage>} />
          <Route path="/points" element={<FinancePage><PointsPage /></FinancePage>} />
          <Route path="/referrals" element={<AdminOnlyPage><ReferralsPage /></AdminOnlyPage>} />
          <Route path="/reports" element={<FinanceOrSalesPage><ReportsPage /></FinanceOrSalesPage>} />
          <Route path="/reports/sales" element={<FinanceOrSalesPage><SalesReportPage /></FinanceOrSalesPage>} />
          <Route path="/reports/vendors" element={<FinanceOrSalesPage><VendorReportPage /></FinanceOrSalesPage>} />
          <Route path="/reports/settlements" element={<FinancePage><SettlementReportPage /></FinancePage>} />
          <Route path="/reports/customers" element={<FinanceOrSalesPage><CustomerReportPage /></FinanceOrSalesPage>} />
          <Route path="/reports/points" element={<FinancePage><PointsReportPage /></FinancePage>} />
          <Route path="/reports/referrals" element={<FinanceOrSalesPage><ReferralReportPage /></FinanceOrSalesPage>} />
          <Route path="/reports/classifieds" element={<SalesPage><ClassifiedReportPage /></SalesPage>} />
          <Route path="/reports/tax" element={<FinancePage><TaxReportPage /></FinancePage>} />
          <Route path="/reports/payments" element={<FinancePage><PaymentReportPage /></FinancePage>} />
          <Route path="/reports/revenue" element={<FinancePage><P4URevenueReportPage /></FinancePage>} />
          <Route path="/reports/gstr1" element={<FinancePage><GSTR1ReportPage /></FinancePage>} />
          <Route path="/reports/gstr3b" element={<FinancePage><GSTR3BReportPage /></FinancePage>} />
          <Route path="/reports/hsn" element={<FinancePage><HSNSummaryReportPage /></FinancePage>} />
          <Route path="/reports/tcs" element={<FinancePage><TCSReportPage /></FinancePage>} />
          <Route path="/reports/credit-notes" element={<FinancePage><CreditNotesReportPage /></FinancePage>} />
          <Route path="/reports/tds-194o" element={<FinancePage><TDS194OReportPage /></FinancePage>} />
          <Route path="/reports/gstr9" element={<FinancePage><GSTR9ReportPage /></FinancePage>} />
          <Route path="/reports/daybook" element={<FinancePage><DayBookReportPage /></FinancePage>} />
          <Route path="/reports/invoices" element={<FinancePage><InvoicesListPage /></FinancePage>} />
          <Route path="/cms" element={<AdminOnlyPage><CMSPage /></AdminOnlyPage>} />
          <Route path="/admin/cms-pages" element={<AdminOnlyPage><AdminCMSPagesPage /></AdminOnlyPage>} />
          <Route path="/settings" element={<AdminOnlyPage><SettingsPage /></AdminOnlyPage>} />
          <Route path="/categories" element={<AdminOnlyPage><CategoriesPage /></AdminOnlyPage>} />
          <Route path="/admin/services" element={<SalesPage><AdminServicesPage /></SalesPage>} />
          <Route path="/tax" element={<FinancePage><TaxPage /></FinancePage>} />
          <Route path="/report-log" element={<AdminOnlyPage><ReportLogPage /></AdminOnlyPage>} />
          <Route path="/cf/city" element={<AdminOnlyPage><CFCityPage /></AdminOnlyPage>} />
          <Route path="/cf/area" element={<AdminOnlyPage><CFAreaPage /></AdminOnlyPage>} />
          <Route path="/cf/categories" element={<AdminOnlyPage><CFCategoriesPage /></AdminOnlyPage>} />
          <Route path="/cf/services" element={<AdminOnlyPage><CFServicesPage /></AdminOnlyPage>} />
          <Route path="/cf/vendors" element={<SalesPage><CFVendorsPage /></SalesPage>} />
          <Route path="/cf/products" element={<AdminOnlyPage><CFProductsPage /></AdminOnlyPage>} />
          <Route path="/occupations" element={<AdminOnlyPage><OccupationsPage /></AdminOnlyPage>} />
          <Route path="/platform-variables" element={<AdminOnlyPage><PlatformVariablesPage /></AdminOnlyPage>} />
          <Route path="/admin/module-visibility" element={<AdminOnlyPage><AdminModuleVisibilityPage /></AdminOnlyPage>} />
          <Route path="/popup-banners" element={<AdminOnlyPage><PopupBannersPage /></AdminOnlyPage>} />
          <Route path="/banners" element={<AdminOnlyPage><BannersPage /></AdminOnlyPage>} />
          <Route path="/advertisements" element={<SalesPage><AdvertisementsPage /></SalesPage>} />
          <Route path="/website-queries" element={<SalesPage><WebsiteQueriesPage /></SalesPage>} />
          <Route path="/support-tickets" element={<SalesPage><SupportTicketsPage /></SalesPage>} />
          <Route path="/integrations" element={<AdminOnlyPage><IntegrationsPage /></AdminOnlyPage>} />
          <Route path="/admin/properties" element={<AdminOnlyPage><AdminPropertiesPage /></AdminOnlyPage>} />
          <Route path="/admin/localities" element={<AdminOnlyPage><AdminLocalitiesPage /></AdminOnlyPage>} />
          <Route path="/admin/property-plans" element={<AdminOnlyPage><AdminPropertyPlansPage /></AdminOnlyPage>} />
          <Route path="/admin/property-reports" element={<AdminOnlyPage><AdminPropertyReportsPage /></AdminOnlyPage>} />
          <Route path="/admin/homes/moderation" element={<AdminOnlyPage><AdminHomesModerationPage /></AdminOnlyPage>} />
          <Route path="/admin/homes/amenities" element={<AdminOnlyPage><AdminHomesAmenitiesPage /></AdminOnlyPage>} />
          <Route path="/admin/homes/cms" element={<AdminOnlyPage><AdminHomesCMSPage /></AdminOnlyPage>} />
          <Route path="/admin/homes/users" element={<AdminOnlyPage><AdminHomesUsersPage /></AdminOnlyPage>} />
          <Route path="/admin/vendor-plans" element={<FinancePage><AdminVendorPlansPage /></FinancePage>} />
          <Route path="/admin/franchise/plans" element={<FinancePage><AdminFranchisePlansPage /></FinancePage>} />
          <Route path="/admin/franchise/registrations" element={<FinancePage><AdminFranchiseRegistrationsPage /></FinancePage>} />
          <Route path="/admin/franchise/active" element={<FinancePage><AdminActiveFranchisesPage /></FinancePage>} />
          <Route path="/admin/registration-payments" element={<FinancePage><AdminRegistrationPaymentsPage /></FinancePage>} />
          <Route path="/admin/media-library" element={<AdminOnlyPage><AdminMediaLibraryPage /></AdminOnlyPage>} />
          <Route path="/admin/onboarding" element={<AdminOnlyPage><AdminOnboardingPage /></AdminOnlyPage>} />
          <Route path="/admin/notifications" element={<AdminOnlyPage><AdminNotificationsPage /></AdminOnlyPage>} />
          <Route path="/admin/product-attributes" element={<AdminOnlyPage><AdminProductAttributesPage /></AdminOnlyPage>} />
          <Route path="/admin/file-uploads" element={<AdminOnlyPage><FileUploadsPage /></AdminOnlyPage>} />
          <Route path="/admin/parent-items" element={<AdminOnlyPage><ParentItemsPage /></AdminOnlyPage>} />
          <Route path="/admin/complaints" element={<SalesPage><AdminComplaintsPage /></SalesPage>} />
          <Route path="/admin/vendor-onboarding" element={<AdminOnlyPage><AdminVendorOnboardingPage /></AdminOnlyPage>} />
          <Route path="/admin/splash-screens" element={<AdminOnlyPage><AdminSplashScreensPage /></AdminOnlyPage>} />
          <Route path="/admin/homepage-cms" element={<AdminOnlyPage><AdminHomepageCMSPage /></AdminOnlyPage>} />

          {/* Customer-facing routes */}
          <Route path="/app" element={vendorPortalMode ? <Navigate to={customerHomeRoute} replace /> : <GuestPage><CustomerDashboardPage /></GuestPage>} />
          <Route path="/app/home" element={vendorPortalMode ? <Navigate to={customerHomeRoute} replace /> : <GuestPage><CustomerHomePage /></GuestPage>} />
          <Route path="/app/login" element={vendorPortalMode ? <Navigate to={customerLoginRoute} replace /> : <CustomerLoginPage />} />
          <Route path="/app/forgot-password" element={vendorPortalMode ? <Navigate to={customerLoginRoute} replace /> : <ForgotPasswordPage />} />
          <Route path="/app/reset-password" element={vendorPortalMode ? <Navigate to={customerLoginRoute} replace /> : <ResetPasswordPage />} />
          <Route path="/auth/callback" element={<AuthCallbackPage />} />
          <Route path="/app/register" element={vendorPortalMode ? <Navigate to={customerRegisterRoute} replace /> : <CustomerRegisterPage />} />
          <Route path="/app/phone-login" element={vendorPortalMode ? <Navigate to={customerLoginRoute} replace /> : <CustomerPhoneLoginPage />} />
          <Route path="/app/set-location" element={<CustomerPage><SetLocationPage /></CustomerPage>} />
          <Route path="/app/set-password" element={<SetPasswordPage />} />
          <Route path="/app/terms" element={<TermsPage />} />
          <Route path="/app/privacy" element={<PrivacyPolicyPage />} />
          <Route path="/app/cms/:slug" element={<CustomerCMSPage />} />
          <Route path="/app/browse" element={<GuestPage><ShopGate><CustomerBrowsePage /></ShopGate></GuestPage>} />
          <Route path="/app/categories" element={<GuestPage><ShopGate><AllCategoriesPage /></ShopGate></GuestPage>} />
          <Route path="/app/deals" element={<GuestPage><ShopGate><CustomerDealsPage /></ShopGate></GuestPage>} />
          <Route path="/app/trending" element={<GuestPage><ShopGate><CustomerTrendingPage /></ShopGate></GuestPage>} />
          <Route path="/app/product/:id" element={<GuestPage><ShopGate><CustomerProductPage /></ShopGate></GuestPage>} />
          <Route path="/app/vendor/:id" element={<GuestPage><ShopGate><CustomerVendorPage /></ShopGate></GuestPage>} />
          <Route path="/app/cart" element={<CustomerPage><ShopGate><CustomerCartPage /></ShopGate></CustomerPage>} />
          <Route path="/app/payment" element={<CustomerPage><ShopGate><PaymentPage /></ShopGate></CustomerPage>} />
          <Route path="/app/orders" element={<CustomerPage><ShopGate><CustomerOrdersPage /></ShopGate></CustomerPage>} />
          <Route path="/app/orders/:orderId" element={<CustomerPage><ShopGate><CustomerOrderDetailPage /></ShopGate></CustomerPage>} />
          <Route path="/app/profile" element={<CustomerPage><CustomerProfilePage /></CustomerPage>} />
          <Route path="/app/profile/edit" element={<CustomerPage><CustomerProfileEditPage /></CustomerPage>} />
          <Route path="/app/kyc" element={<CustomerPage><CustomerKYCPage /></CustomerPage>} />
          <Route path="/app/wallet" element={<CustomerPage><CustomerWalletPage /></CustomerPage>} />
          <Route path="/app/wishlist" element={<CustomerPage><CustomerWishlistPage /></CustomerPage>} />
          <Route path="/app/referrals" element={<CustomerPage><CustomerReferralPage /></CustomerPage>} />
          <Route path="/app/services" element={<GuestPage><ServicesGate><CustomerServicesPage /></ServicesGate></GuestPage>} />
          <Route path="/app/service/:id" element={<GuestPage><ServicesGate><CustomerServiceDetailPage /></ServicesGate></GuestPage>} />
          <Route path="/app/classifieds" element={<GuestPage><ClassifiedsGate><CustomerClassifiedsPage /></ClassifiedsGate></GuestPage>} />
          <Route path="/app/classifieds/post" element={<CustomerPage><ClassifiedsGate><CustomerPostAdPage /></ClassifiedsGate></CustomerPage>} />
          <Route path="/app/classifieds/:id" element={<GuestPage><ClassifiedsGate><CustomerClassifiedDetailPage /></ClassifiedsGate></GuestPage>} />
          <Route path="/app/vendor-register" element={<CustomerPage><VendorRegisterPage /></CustomerPage>} />
          <Route path="/app/support" element={<CustomerPage><CustomerSupportPage /></CustomerPage>} />
          <Route path="/app/change-password" element={<CustomerPage><CustomerChangePasswordPage /></CustomerPage>} />

          {/* Social routes */}
          <Route path="/app/social" element={<CustomerPage><SocioGate><SocialFeedPage /></SocioGate></CustomerPage>} />
          <Route path="/app/social/create" element={<CustomerPage><SocioGate><SocialCreatePostPage /></SocioGate></CustomerPage>} />
          <Route path="/app/social/post/:postId/edit" element={<CustomerPage><SocioGate><SocialEditPostPage /></SocioGate></CustomerPage>} />
          <Route path="/app/social/profile" element={<CustomerPage><SocioGate><SocialProfilePage /></SocioGate></CustomerPage>} />
          <Route path="/app/social/explore" element={<CustomerPage><SocioGate><SocialExplorePage /></SocioGate></CustomerPage>} />
          <Route path="/app/social/reels" element={<CustomerPage><SocioGate><SocialReelsPage /></SocioGate></CustomerPage>} />
          <Route path="/app/social/stories/:userId" element={<CustomerPage><SocioGate><SocialStoryViewerPage /></SocioGate></CustomerPage>} />
          <Route path="/app/social/messages" element={<CustomerPage><SocioGate><SocialDMPage /></SocioGate></CustomerPage>} />
          <Route path="/app/social/messages/:recipientId" element={<CustomerPage><SocioGate><SocioDMChatPage /></SocioGate></CustomerPage>} />
          <Route path="/app/social/notifications" element={<CustomerPage><SocioGate><SocialNotificationsPage /></SocioGate></CustomerPage>} />
          <Route path="/app/social/settings" element={<CustomerPage><SocioGate><SocialSettingsPage /></SocioGate></CustomerPage>} />
          <Route path="/app/social/@:username" element={<CustomerPage><SocioGate><SocialProfilePage /></SocioGate></CustomerPage>} />
          <Route path="/app/social/profile/:userId" element={<CustomerPage><SocioGate><SocialProfilePage /></SocioGate></CustomerPage>} />
          <Route path="/app/social/post/:postId" element={<CustomerPage><SocioGate><SocialPostDetailPage /></SocioGate></CustomerPage>} />
          <Route path="/app/social/user/:userId/posts/:postId" element={<CustomerPage><SocioGate><SocialUserPostsPage /></SocioGate></CustomerPage>} />
          <Route path="/app/social/comments/:postId" element={<CustomerPage><SocioGate><SocialCommentsPage /></SocioGate></CustomerPage>} />
          <Route path="/app/social/:username/followers" element={<CustomerPage><SocioGate><SocialFollowersPage /></SocioGate></CustomerPage>} />
          <Route path="/app/social/:username/following" element={<CustomerPage><SocioGate><SocialFollowersPage /></SocioGate></CustomerPage>} />
          <Route path="/app/social/profile/:userId/followers" element={<CustomerPage><SocioGate><SocialFollowersPage /></SocioGate></CustomerPage>} />
          <Route path="/app/social/edit-profile" element={<CustomerPage><SocioGate><SocialEditProfilePage /></SocioGate></CustomerPage>} />
          <Route path="/app/social/dashboard" element={<CustomerPage><SocioGate><SocialCreatorDashboardPage /></SocioGate></CustomerPage>} />
          <Route path="/app/social/live" element={<CustomerPage><SocioGate><SocialLivePage /></SocioGate></CustomerPage>} />
          <Route path="/app/social/channels" element={<CustomerPage><SocioGate><SocialBroadcastPage /></SocioGate></CustomerPage>} />
          <Route path="/app/social/change-password" element={<CustomerPage><SocioGate><SocialChangePasswordPage /></SocioGate></CustomerPage>} />
          <Route path="/app/social/privacy" element={<CustomerPage><SocioGate><SocialPrivacyPage /></SocioGate></CustomerPage>} />
          <Route path="/app/social/security" element={<CustomerPage><SocioGate><SocialSecurityPage /></SocioGate></CustomerPage>} />
          <Route path="/app/social/notification-settings" element={<CustomerPage><SocioGate><SocialNotificationSettingsPage /></SocioGate></CustomerPage>} />
          <Route path="/app/social/help" element={<CustomerPage><SocioGate><SocialHelpCenterPage /></SocioGate></CustomerPage>} />
          <Route path="/app/social/shop" element={<CustomerPage><SocioGate><SocialShopPage /></SocioGate></CustomerPage>} />
          <Route path="/app/social/suggestions" element={<CustomerPage><SocioGate><SocialSuggestionsPage /></SocioGate></CustomerPage>} />
          <Route path="/app/social/friends" element={<CustomerPage><SocioGate><SocialFriendsPage /></SocioGate></CustomerPage>} />
          <Route path="/app/calls" element={<CustomerPage><SocioGate><CallsPage /></SocioGate></CustomerPage>} />

          {/* Admin Social */}
          <Route path="/admin/social" element={<AdminOnlyPage><AdminSocialDashboardPage /></AdminOnlyPage>} />

          {/* Property / Find Home routes */}
          <Route path="/app/find-home" element={<GuestPage><HomesGate><PropertyHomePage /></HomesGate></GuestPage>} />
          <Route path="/app/find-home/post" element={<CustomerPage><HomesGate><PostPropertyPage /></HomesGate></CustomerPage>} />
          <Route path="/app/find-home/emi" element={<GuestPage><HomesGate><PropertyEMIPage /></HomesGate></GuestPage>} />
          <Route path="/app/find-home/my-properties" element={<CustomerPage><HomesGate><MyPropertiesPage /></HomesGate></CustomerPage>} />
          <Route path="/app/find-home/saved" element={<CustomerPage><HomesGate><MyPropertiesPage /></HomesGate></CustomerPage>} />
          <Route path="/app/find-home/saved-searches" element={<CustomerPage><HomesGate><SavedSearchesPage /></HomesGate></CustomerPage>} />
          <Route path="/app/find-home/messages" element={<CustomerPage><HomesGate><PropertyMessagesPage /></HomesGate></CustomerPage>} />
          <Route path="/app/find-home/rent-tracker" element={<CustomerPage><HomesGate><RentTrackerPage /></HomesGate></CustomerPage>} />
          <Route path="/app/find-home/value-estimator" element={<GuestPage><HomesGate><PropertyValueEstimatorPage /></HomesGate></GuestPage>} />
          <Route path="/app/find-home/:id" element={<GuestPage><HomesGate><PropertyDetailPage /></HomesGate></GuestPage>} />

          {/* Vendor-facing routes */}
          <Route path="/vendor/login" element={vendorUser ? <Navigate to="/vendor" replace /> : <VendorLoginPage />} />
          <Route path="/vendor/register" element={vendorUser ? <Navigate to="/vendor" replace /> : <VendorRegisterStandalonePage />} />
          <Route path="/vendor/set-password" element={<SetPasswordPage />} />
          <Route path="/vendor" element={vendorUser ? <VendorPage><VendorDashboardPage /></VendorPage> : <Navigate to="/vendor/login" replace />} />
          <Route path="/vendor/products" element={<VendorPage><VendorProductsPage /></VendorPage>} />
          <Route path="/vendor/services" element={<VendorPage><VendorServicesPage /></VendorPage>} />
          <Route path="/vendor/availability" element={<VendorPage><VendorAvailabilityPage /></VendorPage>} />
          <Route path="/vendor/orders" element={<VendorPage><VendorOrdersPage /></VendorPage>} />
          <Route path="/vendor/settlements" element={<VendorPage><VendorSettlementsPage /></VendorPage>} />
          <Route path="/vendor/payments" element={<VendorPage><VendorPaymentHistoryPage /></VendorPage>} />
          <Route path="/vendor/bank" element={<VendorPage><VendorBankPage /></VendorPage>} />
          <Route path="/vendor/profile" element={<VendorPage><VendorProfilePage /></VendorPage>} />
          <Route path="/vendor/settings" element={<VendorPage><VendorProfilePage /></VendorPage>} />
          <Route path="/vendor/account-control" element={<VendorPage><VendorAccountControlPage /></VendorPage>} />
          <Route path="/vendor/change-password" element={<VendorPage><VendorChangePasswordPage /></VendorPage>} />
          <Route path="/vendor/media" element={<VendorPage><VendorMediaLibraryPage /></VendorPage>} />
          <Route path="/vendor/bookings" element={<VendorPage><VendorBookingsPage /></VendorPage>} />
          <Route path="/vendor/kyc" element={<VendorPage><VendorKYCPage /></VendorPage>} />

          {/* Customer Account Control */}
          <Route path="/app/account-control" element={<CustomerPage><AccountControlPage /></CustomerPage>} />

          {/* Food delivery — Customer */}
          <Route path="/app/food" element={<GuestPage><FoodGate><FoodHomePage /></FoodGate></GuestPage>} />
          <Route path="/app/food/restaurant/:id" element={<GuestPage><FoodGate><FoodRestaurantPage /></FoodGate></GuestPage>} />
          <Route path="/app/food/cart" element={<CustomerPage><FoodGate><FoodCartPage /></FoodGate></CustomerPage>} />
          <Route path="/app/food/orders" element={<CustomerPage><FoodGate><FoodOrdersPage /></FoodGate></CustomerPage>} />
          <Route path="/app/food/orders/:id" element={<CustomerPage><FoodGate><FoodOrderDetailPage /></FoodGate></CustomerPage>} />

          {/* Food delivery — Vendor (Restaurant) */}
          <Route path="/vendor/restaurant" element={<VendorPage><VendorRestaurantPage /></VendorPage>} />
          <Route path="/vendor/food-orders" element={<VendorPage><VendorFoodOrdersPage /></VendorPage>} />

          {/* Food delivery — Rider */}
          <Route path="/rider/login" element={<RiderLoginPage />} />
          <Route path="/rider/register" element={<RiderRegisterPage />} />
          <Route path="/rider" element={<RiderProtectedRoute><RiderLayout><RiderDashboardPage /></RiderLayout></RiderProtectedRoute>} />
          <Route path="/rider/orders" element={<RiderProtectedRoute><RiderOrdersPage /></RiderProtectedRoute>} />
          <Route path="/rider/kyc" element={<RiderProtectedRoute><RiderLayout><RiderKYCPage /></RiderLayout></RiderProtectedRoute>} />
          <Route path="/rider/profile" element={<RiderProtectedRoute><RiderLayout><RiderProfilePage /></RiderLayout></RiderProtectedRoute>} />
          <Route path="/rider/earnings" element={<RiderProtectedRoute><RiderLayout><RiderEarningsPage /></RiderLayout></RiderProtectedRoute>} />

          {/* Food delivery — Admin */}
          <Route path="/admin/restaurants" element={<SalesPage><AdminRestaurantsPage /></SalesPage>} />
          <Route path="/admin/riders" element={<SalesPage><AdminRidersPage /></SalesPage>} />
          <Route path="/admin/rider-kyc" element={<SalesPage><AdminRiderKYCPage /></SalesPage>} />
          <Route path="/admin/rider-settlements" element={<SalesPage><AdminRiderSettlementsPage /></SalesPage>} />
          <Route path="/admin/food-orders" element={<SalesPage><AdminFoodOrdersPage /></SalesPage>} />
          <Route path="/admin/food-coupons" element={<SalesPage><AdminFoodCouponsPage /></SalesPage>} />
          <Route path="/admin/dropshipping" element={<AdminOnlyPage><AdminDropshippingPage /></AdminOnlyPage>} />
          <Route path="/admin/coupons" element={<AdminOnlyPage><AdminCouponsPage /></AdminOnlyPage>} />
          <Route path="/admin/coupons/dashboard" element={<AdminOnlyPage><CouponDashboardPage /></AdminOnlyPage>} />
          <Route path="/admin/coupons/inventory" element={<AdminOnlyPage><CouponInventoryPage /></AdminOnlyPage>} />
          <Route path="/admin/coupons/audit" element={<AdminOnlyPage><CouponAuditLogPage /></AdminOnlyPage>} />
          <Route path="/admin/coupons/analytics" element={<AdminOnlyPage><CouponAnalyticsPage /></AdminOnlyPage>} />
          <Route path="/admin/coupons/reports" element={<AdminOnlyPage><CouponReportsPage /></AdminOnlyPage>} />
          <Route path="/admin/coupons/generate" element={<AdminOnlyPage><CouponGeneratePage /></AdminOnlyPage>} />
          <Route path="/admin/coupons/fraud" element={<AdminOnlyPage><AdminFraudPage /></AdminOnlyPage>} />
          <Route path="/vendor/dropshipping" element={<VendorPage><VendorDropshippingPage /></VendorPage>} />
          <Route path="/vendor/coupons" element={<VendorPage><VendorCouponsPage /></VendorPage>} />
          <Route path="/app/coupons" element={<CustomerPage><CustomerCouponsPage /></CustomerPage>} />

          <Route path="*" element={<NotFound />} />
        </Routes>
      </Suspense>
    </FTUXFlow>
  );
};

const App = () => (
  <ErrorBoundary>
    <ForceUpdateOverlay>
      <QueryClientProvider client={queryClient}>
        <CountryProvider>
          <AuthProvider>
            <TooltipProvider>
              <Toaster />
              <Sonner />
              <BrowserRouter>
                <AppRoutes />
              </BrowserRouter>
            </TooltipProvider>
          </AuthProvider>
        </CountryProvider>
      </QueryClientProvider>
    </ForceUpdateOverlay>
  </ErrorBoundary>
);

export default App;
