import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/lib/auth";
import { useEffect, useState } from "react";
import { App as CapacitorApp } from "@capacitor/app";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { closeOAuthBrowser, extractOAuthResultFromUrl, isNativePlatform, isOAuthCallbackUrl } from "@/lib/capacitor-auth";
import { usePushNotifications } from "@/hooks/usePushNotifications";
import { ProtectedRoute } from "@/components/admin/ProtectedRoute";
import { CustomerProtectedRoute } from "@/components/customer/CustomerProtectedRoute";
import { GuestOrCustomerRoute } from "@/components/customer/GuestOrCustomerRoute";
import { VendorProtectedRoute } from "@/components/vendor/VendorProtectedRoute";
import { FTUXFlow } from "@/components/customer/FTUXFlow";
import { isVendorApp, isVendorAppSync, getNativeAppId } from "@/lib/capacitor";
import { ForceUpdateOverlay } from "@/components/ForceUpdateOverlay";
import LoginPage from "./pages/LoginPage";
import DashboardPage from "./pages/DashboardPage";
import CustomersPage from "./pages/CustomersPage";
import VendorsPage from "./pages/VendorsPage";
import ProductsPage from "./pages/ProductsPage";
import OrdersPage from "./pages/OrdersPage";
import SettlementsPage from "./pages/SettlementsPage";
import ClassifiedsPage from "./pages/ClassifiedsPage";
import PointsPage from "./pages/PointsPage";
import ReferralsPage from "./pages/ReferralsPage";
import ReportsPage from "./pages/ReportsPage";
import CMSPage from "./pages/CMSPage";
import AdminCMSPagesPage from "./pages/admin/AdminCMSPagesPage";
import SettingsPage from "./pages/SettingsPage";
import NotFound from "./pages/NotFound";
import CategoriesPage from "./pages/CategoriesPage";
import AdminServicesPage from "./pages/AdminServicesPage";
import TaxPage from "./pages/TaxPage";
import ReportLogPage from "./pages/ReportLogPage";
import CFCityPage from "./pages/CFCityPage";
import CFAreaPage from "./pages/CFAreaPage";
import CFCategoriesPage from "./pages/CFCategoriesPage";
import CFServicesPage from "./pages/CFServicesPage";
import CFVendorsPage from "./pages/CFVendorsPage";
import CFProductsPage from "./pages/CFProductsPage";
import OccupationsPage from "./pages/OccupationsPage";
import PlatformVariablesPage from "./pages/PlatformVariablesPage";
import PopupBannersPage from "./pages/PopupBannersPage";
import BannersPage from "./pages/BannersPage";
import AdvertisementsPage from "./pages/AdvertisementsPage";
import WebsiteQueriesPage from "./pages/WebsiteQueriesPage";
import SupportTicketsPage from "./pages/SupportTicketsPage";
import IntegrationsPage from "./pages/IntegrationsPage";
import SalesReportPage from "./pages/reports/SalesReportPage";
import VendorReportPage from "./pages/reports/VendorReportPage";
import SettlementReportPage from "./pages/reports/SettlementReportPage";
import CustomerReportPage from "./pages/reports/CustomerReportPage";
import PointsReportPage from "./pages/reports/PointsReportPage";
import ReferralReportPage from "./pages/reports/ReferralReportPage";
import ClassifiedReportPage from "./pages/reports/ClassifiedReportPage";
import TaxReportPage from "./pages/reports/TaxReportPage";
import PaymentReportPage from "./pages/reports/PaymentReportPage";
import P4URevenueReportPage from "./pages/reports/P4URevenueReportPage";
import GSTR1ReportPage from "./pages/reports/GSTR1ReportPage";
import GSTR3BReportPage from "./pages/reports/GSTR3BReportPage";
import HSNSummaryReportPage from "./pages/reports/HSNSummaryReportPage";
import TCSReportPage from "./pages/reports/TCSReportPage";
import CreditNotesReportPage from "./pages/reports/CreditNotesReportPage";
import TDS194OReportPage from "./pages/reports/TDS194OReportPage";
import GSTR9ReportPage from "./pages/reports/GSTR9ReportPage";
import DayBookReportPage from "./pages/reports/DayBookReportPage";
import InvoicesListPage from "./pages/reports/InvoicesListPage";

// Customer pages
import CustomerHomePage from "./pages/customer/CustomerHomePage";
import CustomerLoginPage from "./pages/customer/CustomerLoginPage";
import CustomerBrowsePage from "./pages/customer/CustomerBrowsePage";
import CustomerVendorPage from "./pages/customer/CustomerVendorPage";
import CustomerProductPage from "./pages/customer/CustomerProductPage";
import CustomerCartPage from "./pages/customer/CustomerCartPage";
import CustomerOrdersPage from "./pages/customer/CustomerOrdersPage";
import CustomerOrderDetailPage from "./pages/customer/CustomerOrderDetailPage";
import CustomerProfilePage from "./pages/customer/CustomerProfilePage";
import CustomerProfileEditPage from "./pages/customer/CustomerProfileEditPage";
import CustomerKYCPage from "./pages/customer/CustomerKYCPage";
import CustomerWalletPage from "./pages/customer/CustomerWalletPage";
import CustomerWishlistPage from "./pages/customer/CustomerWishlistPage";
import CustomerReferralPage from "./pages/customer/CustomerReferralPage";
import CustomerServicesPage from "./pages/customer/CustomerServicesPage";
import CustomerServiceDetailPage from "./pages/customer/CustomerServiceDetailPage";
import CustomerClassifiedsPage from "./pages/customer/CustomerClassifiedsPage";
import CustomerPostAdPage from "./pages/customer/CustomerPostAdPage";
import CustomerClassifiedDetailPage from "./pages/customer/CustomerClassifiedDetailPage";
import CustomerRegisterPage from "./pages/customer/CustomerRegisterPage";
import VendorRegisterPage from "./pages/customer/VendorRegisterPage";
import CustomerPhoneLoginPage from "./pages/customer/CustomerPhoneLoginPage";
import SetLocationPage from "./pages/customer/SetLocationPage";
import TermsPage from "./pages/customer/TermsPage";
import PrivacyPolicyPage from "./pages/customer/PrivacyPolicyPage";
import AuthCallbackPage from "./pages/customer/AuthCallbackPage";
import CustomerCMSPage from "./pages/customer/CustomerCMSPage";
import ForgotPasswordPage from "./pages/customer/ForgotPasswordPage";
import ResetPasswordPage from "./pages/customer/ResetPasswordPage";
import SetPasswordPage from "./pages/customer/SetPasswordPage";
import CustomerSupportPage from "./pages/customer/CustomerSupportPage";
import CustomerChangePasswordPage from "./pages/customer/CustomerChangePasswordPage";

// Social pages
import SocialFeedPage from "./pages/customer/SocialFeedPage";
import SocialCreatePostPage from "./pages/customer/SocialCreatePostPage";
import SocialProfilePage from "./pages/customer/SocialProfilePage";
import SocialExplorePage from "./pages/customer/SocialExplorePage";
import SocialReelsPage from "./pages/customer/SocialReelsPage";
import SocialStoryViewerPage from "./pages/customer/SocialStoryViewerPage";
import SocialDMPage from "./pages/customer/SocialDMPage";
import SocialNotificationsPage from "./pages/customer/SocialNotificationsPage";
import SocialSettingsPage from "./pages/customer/SocialSettingsPage";
import SocialCommentsPage from "./pages/customer/SocialCommentsPage";
import SocialFollowersPage from "./pages/customer/SocialFollowersPage";
import SocialEditProfilePage from "./pages/customer/SocialEditProfilePage";
import SocialCreatorDashboardPage from "./pages/customer/SocialCreatorDashboardPage";
import SocialLivePage from "./pages/customer/SocialLivePage";
import SocialBroadcastPage from "./pages/customer/SocialBroadcastPage";
import SocialShopPage from "./pages/customer/SocialShopPage";
import SocialChangePasswordPage from "./pages/customer/SocialChangePasswordPage";
import SocialPrivacyPage from "./pages/customer/SocialPrivacyPage";
import SocialSecurityPage from "./pages/customer/SocialSecurityPage";
import SocialNotificationSettingsPage from "./pages/customer/SocialNotificationSettingsPage";
import SocialHelpCenterPage from "./pages/customer/SocialHelpCenterPage";
import SocialSuggestionsPage from "./pages/customer/SocialSuggestionsPage";
import SocialFriendsPage from "./pages/customer/SocialFriendsPage";
import AdminSocialDashboardPage from "./pages/admin/AdminSocialDashboardPage";
import PaymentPage from "./pages/customer/PaymentPage";
import SocioDMChatPage from "./pages/customer/SocioDMChatPage";
import SocialPostDetailPage from "./pages/customer/SocialPostDetailPage";
import SocialUserPostsPage from "./pages/customer/SocialUserPostsPage";

// Property pages
import PropertyHomePage from "./pages/customer/PropertyHomePage";
import PropertyDetailPage from "./pages/customer/PropertyDetailPage";
import PostPropertyPage from "./pages/customer/PostPropertyPage";
import PropertyEMIPage from "./pages/customer/PropertyEMIPage";
import MyPropertiesPage from "./pages/customer/MyPropertiesPage";
import SavedSearchesPage from "./pages/customer/SavedSearchesPage";
import PropertyMessagesPage from "./pages/customer/PropertyMessagesPage";
import RentTrackerPage from "./pages/customer/RentTrackerPage";
import PropertyValueEstimatorPage from "./pages/customer/PropertyValueEstimatorPage";
import AdminPropertiesPage from "./pages/admin/AdminPropertiesPage";
import AdminLocalitiesPage from "./pages/admin/AdminLocalitiesPage";
import AdminPropertyPlansPage from "./pages/admin/AdminPropertyPlansPage";
import AdminPropertyReportsPage from "./pages/admin/AdminPropertyReportsPage";
import AdminHomesAmenitiesPage from "./pages/admin/AdminHomesAmenitiesPage";
import AdminHomesCMSPage from "./pages/admin/AdminHomesCMSPage";
import AdminHomesUsersPage from "./pages/admin/AdminHomesUsersPage";
import AdminHomesModerationPage from "./pages/admin/AdminHomesModerationPage";
import AdminVendorPlansPage from "./pages/admin/AdminVendorPlansPage";
import AdminMediaLibraryPage from "./pages/admin/AdminMediaLibraryPage";
import AdminOnboardingPage from "./pages/admin/AdminOnboardingPage";
import AdminProductAttributesPage from "./pages/admin/AdminProductAttributesPage";
import AdminNotificationsPage from "./pages/admin/AdminNotificationsPage";
import FileUploadsPage from "./pages/admin/FileUploadsPage";
import ParentItemsPage from "./pages/admin/ParentItemsPage";
import AdminComplaintsPage from "./pages/admin/AdminComplaintsPage";
import AdminVendorOnboardingPage from "./pages/admin/AdminVendorOnboardingPage";
import AdminSplashScreensPage from "./pages/admin/AdminSplashScreensPage";
import AdminHomepageCMSPage from "./pages/admin/AdminHomepageCMSPage";

// Vendor pages
import VendorLoginPage from "./pages/vendor/VendorLoginPage";
import VendorRegisterStandalonePage from "./pages/vendor/VendorRegisterPage";
import VendorDashboardPage from "./pages/vendor/VendorDashboardPage";
import VendorProductsPage from "./pages/vendor/VendorProductsPage";
import VendorServicesPage from "./pages/vendor/VendorServicesPage";
import VendorAvailabilityPage from "./pages/vendor/VendorAvailabilityPage";
import VendorOrdersPage from "./pages/vendor/VendorOrdersPage";
import VendorSettlementsPage from "./pages/vendor/VendorSettlementsPage";
import VendorProfilePage from "./pages/vendor/VendorProfilePage";
import VendorBankPage from "./pages/vendor/VendorBankPage";
import VendorPaymentHistoryPage from "./pages/vendor/VendorPaymentHistoryPage";
import VendorAccountControlPage from "./pages/vendor/VendorAccountControlPage";
import VendorMediaLibraryPage from "./pages/vendor/VendorMediaLibraryPage";
import VendorChangePasswordPage from "./pages/vendor/VendorChangePasswordPage";
import VendorBookingsPage from "./pages/vendor/VendorBookingsPage";
import VendorKYCPage from "./pages/vendor/VendorKYCPage";
import AccountControlPage from "./pages/customer/AccountControlPage";

// Food delivery
import FoodHomePage from "./pages/customer/food/FoodHomePage";
import FoodRestaurantPage from "./pages/customer/food/FoodRestaurantPage";
import FoodCartPage from "./pages/customer/food/FoodCartPage";
import FoodOrdersPage from "./pages/customer/food/FoodOrdersPage";
import FoodOrderDetailPage from "./pages/customer/food/FoodOrderDetailPage";
import VendorRestaurantPage from "./pages/vendor/VendorRestaurantPage";
import VendorFoodOrdersPage from "./pages/vendor/VendorFoodOrdersPage";
import RiderLoginPage from "./pages/rider/RiderLoginPage";
import RiderDashboardPage from "./pages/rider/RiderDashboardPage";
import AdminRestaurantsPage from "./pages/admin/AdminRestaurantsPage";
import AdminRidersPage from "./pages/admin/AdminRidersPage";
import AdminFoodOrdersPage from "./pages/admin/AdminFoodOrdersPage";
import AdminFoodCouponsPage from "./pages/admin/AdminFoodCouponsPage";
import { RiderProtectedRoute } from "@/components/rider/RiderProtectedRoute";

const queryClient = new QueryClient();
const NATIVE_PORTAL_STORAGE_KEY = "p4u_native_portal";

function detectForcedVendorPortal() {
  if (typeof window === "undefined") return false;

  const portal = new URLSearchParams(window.location.search).get("portal");
  if (portal === "vendor") {
    sessionStorage.setItem(NATIVE_PORTAL_STORAGE_KEY, "vendor");
    return true;
  }

  return sessionStorage.getItem(NATIVE_PORTAL_STORAGE_KEY) === "vendor";
}

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

function VendorPage({ children }: { children: React.ReactNode }) {
  return <VendorProtectedRoute>{children}</VendorProtectedRoute>;
}

const AppRoutes = () => {
  const { customerUser, vendorUser } = useAuth();
  const forcedVendorPortal = detectForcedVendorPortal();
  const [isVendorNativeApp, setIsVendorNativeApp] = useState(forcedVendorPortal);
  const [appIdReady, setAppIdReady] = useState(!isNativePlatform() || forcedVendorPortal);
  usePushNotifications();

  // Detect native app identity on mount
  useEffect(() => {
    if (!isNativePlatform() || forcedVendorPortal) return;
    getNativeAppId().then((appId) => {
      const isVendor = appId === "com.p4u.p4u_vendor" || appId === "com.planext4u.vendor" || isVendorAppSync();
      setIsVendorNativeApp(isVendor);
      if (isVendor) {
        sessionStorage.setItem(NATIVE_PORTAL_STORAGE_KEY, "vendor");
      }
      setAppIdReady(true);
    });
  }, [forcedVendorPortal]);

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
    return (
      <div className="min-h-[100dvh] flex items-center justify-center bg-background">
        <div className="h-8 w-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
      </div>
    );
  }

  // Determine portal redirects based on native app identity
  const vendorPortalMode = isVendorNativeApp || forcedVendorPortal;
  const rootRedirect = vendorPortalMode ? "/vendor" : "/app";
  const customerLoginRoute = vendorPortalMode ? "/vendor/login" : "/app/login";
  const customerRegisterRoute = vendorPortalMode ? "/vendor/register" : "/app/register";
  const customerHomeRoute = vendorPortalMode ? "/vendor" : "/app";

  return (
    <FTUXFlow userId={customerUser?.supabase_uid}>
      <Routes>
        {/* Redirect root based on app identity */}
        <Route path="/" element={<Navigate to={rootRedirect} replace />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/admin/login" element={<LoginPage />} />
        <Route path="/dashboard" element={<ProtectedPage><DashboardPage /></ProtectedPage>} />
        <Route path="/customers" element={<ProtectedPage><CustomersPage /></ProtectedPage>} />
        <Route path="/vendors" element={<ProtectedPage><VendorsPage /></ProtectedPage>} />
        <Route path="/products" element={<ProtectedPage><ProductsPage /></ProtectedPage>} />
        <Route path="/orders" element={<ProtectedPage><OrdersPage /></ProtectedPage>} />
        <Route path="/settlements" element={<ProtectedPage><SettlementsPage /></ProtectedPage>} />
        <Route path="/classifieds" element={<ProtectedPage><ClassifiedsPage /></ProtectedPage>} />
        <Route path="/points" element={<ProtectedPage><PointsPage /></ProtectedPage>} />
        <Route path="/referrals" element={<ProtectedPage><ReferralsPage /></ProtectedPage>} />
        <Route path="/reports" element={<ProtectedPage><ReportsPage /></ProtectedPage>} />
        <Route path="/reports/sales" element={<ProtectedPage><SalesReportPage /></ProtectedPage>} />
        <Route path="/reports/vendors" element={<ProtectedPage><VendorReportPage /></ProtectedPage>} />
        <Route path="/reports/settlements" element={<ProtectedPage><SettlementReportPage /></ProtectedPage>} />
        <Route path="/reports/customers" element={<ProtectedPage><CustomerReportPage /></ProtectedPage>} />
        <Route path="/reports/points" element={<ProtectedPage><PointsReportPage /></ProtectedPage>} />
        <Route path="/reports/referrals" element={<ProtectedPage><ReferralReportPage /></ProtectedPage>} />
        <Route path="/reports/classifieds" element={<ProtectedPage><ClassifiedReportPage /></ProtectedPage>} />
        <Route path="/reports/tax" element={<ProtectedPage><TaxReportPage /></ProtectedPage>} />
        <Route path="/reports/payments" element={<ProtectedPage><PaymentReportPage /></ProtectedPage>} />
        <Route path="/reports/revenue" element={<ProtectedPage><P4URevenueReportPage /></ProtectedPage>} />
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
        <Route path="/app" element={vendorPortalMode ? <Navigate to={customerHomeRoute} replace /> : <GuestPage><CustomerHomePage /></GuestPage>} />
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
        <Route path="/app/browse" element={<GuestPage><CustomerBrowsePage /></GuestPage>} />
        <Route path="/app/product/:id" element={<GuestPage><CustomerProductPage /></GuestPage>} />
        <Route path="/app/vendor/:id" element={<GuestPage><CustomerVendorPage /></GuestPage>} />
        <Route path="/app/cart" element={<CustomerPage><CustomerCartPage /></CustomerPage>} />
        <Route path="/app/payment" element={<CustomerPage><PaymentPage /></CustomerPage>} />
        <Route path="/app/orders" element={<CustomerPage><CustomerOrdersPage /></CustomerPage>} />
        <Route path="/app/orders/:orderId" element={<CustomerPage><CustomerOrderDetailPage /></CustomerPage>} />
        <Route path="/app/profile" element={<CustomerPage><CustomerProfilePage /></CustomerPage>} />
        <Route path="/app/profile/edit" element={<CustomerPage><CustomerProfileEditPage /></CustomerPage>} />
        <Route path="/app/kyc" element={<CustomerPage><CustomerKYCPage /></CustomerPage>} />
        <Route path="/app/wallet" element={<CustomerPage><CustomerWalletPage /></CustomerPage>} />
        <Route path="/app/wishlist" element={<CustomerPage><CustomerWishlistPage /></CustomerPage>} />
        <Route path="/app/referrals" element={<CustomerPage><CustomerReferralPage /></CustomerPage>} />
        <Route path="/app/services" element={<GuestPage><CustomerServicesPage /></GuestPage>} />
        <Route path="/app/service/:id" element={<GuestPage><CustomerServiceDetailPage /></GuestPage>} />
        <Route path="/app/classifieds" element={<GuestPage><CustomerClassifiedsPage /></GuestPage>} />
        <Route path="/app/classifieds/post" element={<CustomerPage><CustomerPostAdPage /></CustomerPage>} />
        <Route path="/app/classifieds/:id" element={<GuestPage><CustomerClassifiedDetailPage /></GuestPage>} />
        <Route path="/app/vendor-register" element={<CustomerPage><VendorRegisterPage /></CustomerPage>} />
        <Route path="/app/support" element={<CustomerPage><CustomerSupportPage /></CustomerPage>} />
        <Route path="/app/change-password" element={<CustomerPage><CustomerChangePasswordPage /></CustomerPage>} />

        {/* Social routes */}
        <Route path="/app/social" element={<CustomerPage><SocialFeedPage /></CustomerPage>} />
        <Route path="/app/social/create" element={<CustomerPage><SocialCreatePostPage /></CustomerPage>} />
        <Route path="/app/social/profile" element={<CustomerPage><SocialProfilePage /></CustomerPage>} />
        <Route path="/app/social/explore" element={<CustomerPage><SocialExplorePage /></CustomerPage>} />
        <Route path="/app/social/reels" element={<CustomerPage><SocialReelsPage /></CustomerPage>} />
        <Route path="/app/social/stories/:userId" element={<CustomerPage><SocialStoryViewerPage /></CustomerPage>} />
        <Route path="/app/social/messages" element={<CustomerPage><SocialDMPage /></CustomerPage>} />
        <Route path="/app/social/messages/:recipientId" element={<CustomerPage><SocioDMChatPage /></CustomerPage>} />
        <Route path="/app/social/notifications" element={<CustomerPage><SocialNotificationsPage /></CustomerPage>} />
        <Route path="/app/social/settings" element={<CustomerPage><SocialSettingsPage /></CustomerPage>} />
        <Route path="/app/social/@:username" element={<CustomerPage><SocialProfilePage /></CustomerPage>} />
        <Route path="/app/social/profile/:userId" element={<CustomerPage><SocialProfilePage /></CustomerPage>} />
        <Route path="/app/social/post/:postId" element={<CustomerPage><SocialPostDetailPage /></CustomerPage>} />
        <Route path="/app/social/user/:userId/posts/:postId" element={<CustomerPage><SocialUserPostsPage /></CustomerPage>} />
        <Route path="/app/social/comments/:postId" element={<CustomerPage><SocialCommentsPage /></CustomerPage>} />
        <Route path="/app/social/:username/followers" element={<CustomerPage><SocialFollowersPage /></CustomerPage>} />
        <Route path="/app/social/:username/following" element={<CustomerPage><SocialFollowersPage /></CustomerPage>} />
        <Route path="/app/social/profile/:userId/followers" element={<CustomerPage><SocialFollowersPage /></CustomerPage>} />
        <Route path="/app/social/edit-profile" element={<CustomerPage><SocialEditProfilePage /></CustomerPage>} />
        <Route path="/app/social/dashboard" element={<CustomerPage><SocialCreatorDashboardPage /></CustomerPage>} />
        <Route path="/app/social/live" element={<CustomerPage><SocialLivePage /></CustomerPage>} />
        <Route path="/app/social/channels" element={<CustomerPage><SocialBroadcastPage /></CustomerPage>} />
        <Route path="/app/social/change-password" element={<CustomerPage><SocialChangePasswordPage /></CustomerPage>} />
        <Route path="/app/social/privacy" element={<CustomerPage><SocialPrivacyPage /></CustomerPage>} />
        <Route path="/app/social/security" element={<CustomerPage><SocialSecurityPage /></CustomerPage>} />
        <Route path="/app/social/notification-settings" element={<CustomerPage><SocialNotificationSettingsPage /></CustomerPage>} />
        <Route path="/app/social/help" element={<CustomerPage><SocialHelpCenterPage /></CustomerPage>} />
        <Route path="/app/social/shop" element={<CustomerPage><SocialShopPage /></CustomerPage>} />
        <Route path="/app/social/suggestions" element={<CustomerPage><SocialSuggestionsPage /></CustomerPage>} />
        <Route path="/app/social/friends" element={<CustomerPage><SocialFriendsPage /></CustomerPage>} />

        {/* Admin Social */}
        <Route path="/admin/social" element={<ProtectedPage><AdminSocialDashboardPage /></ProtectedPage>} />

        {/* Property / Find Home routes */}
        <Route path="/app/find-home" element={<GuestPage><PropertyHomePage /></GuestPage>} />
        <Route path="/app/find-home/post" element={<CustomerPage><PostPropertyPage /></CustomerPage>} />
        <Route path="/app/find-home/emi" element={<GuestPage><PropertyEMIPage /></GuestPage>} />
        <Route path="/app/find-home/my-properties" element={<CustomerPage><MyPropertiesPage /></CustomerPage>} />
        <Route path="/app/find-home/saved" element={<CustomerPage><MyPropertiesPage /></CustomerPage>} />
        <Route path="/app/find-home/saved-searches" element={<CustomerPage><SavedSearchesPage /></CustomerPage>} />
        <Route path="/app/find-home/messages" element={<CustomerPage><PropertyMessagesPage /></CustomerPage>} />
        <Route path="/app/find-home/rent-tracker" element={<CustomerPage><RentTrackerPage /></CustomerPage>} />
        <Route path="/app/find-home/value-estimator" element={<GuestPage><PropertyValueEstimatorPage /></GuestPage>} />
        <Route path="/app/find-home/:id" element={<GuestPage><PropertyDetailPage /></GuestPage>} />

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
        <Route path="/app/food" element={<GuestPage><FoodHomePage /></GuestPage>} />
        <Route path="/app/food/restaurant/:id" element={<GuestPage><FoodRestaurantPage /></GuestPage>} />
        <Route path="/app/food/cart" element={<CustomerPage><FoodCartPage /></CustomerPage>} />
        <Route path="/app/food/orders" element={<CustomerPage><FoodOrdersPage /></CustomerPage>} />
        <Route path="/app/food/orders/:id" element={<CustomerPage><FoodOrderDetailPage /></CustomerPage>} />

        {/* Food delivery — Vendor (Restaurant) */}
        <Route path="/vendor/restaurant" element={<VendorPage><VendorRestaurantPage /></VendorPage>} />
        <Route path="/vendor/food-orders" element={<VendorPage><VendorFoodOrdersPage /></VendorPage>} />

        {/* Food delivery — Rider */}
        <Route path="/rider/login" element={<RiderLoginPage />} />
        <Route path="/rider" element={<RiderProtectedRoute><RiderDashboardPage /></RiderProtectedRoute>} />

        {/* Food delivery — Admin */}
        <Route path="/admin/restaurants" element={<ProtectedPage><AdminRestaurantsPage /></ProtectedPage>} />
        <Route path="/admin/riders" element={<ProtectedPage><AdminRidersPage /></ProtectedPage>} />
        <Route path="/admin/food-orders" element={<ProtectedPage><AdminFoodOrdersPage /></ProtectedPage>} />
        <Route path="/admin/food-coupons" element={<ProtectedPage><AdminFoodCouponsPage /></ProtectedPage>} />

        <Route path="*" element={<NotFound />} />
      </Routes>
    </FTUXFlow>
  );
};

const App = () => (
  <ErrorBoundary>
    <ForceUpdateOverlay>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <TooltipProvider>
            <Toaster />
            <Sonner />
            <BrowserRouter>
              <AppRoutes />
            </BrowserRouter>
          </TooltipProvider>
        </AuthProvider>
      </QueryClientProvider>
    </ForceUpdateOverlay>
  </ErrorBoundary>
);

export default App;
