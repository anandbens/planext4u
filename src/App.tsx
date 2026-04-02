import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/lib/auth";
import { ProtectedRoute } from "@/components/admin/ProtectedRoute";
import { CustomerProtectedRoute } from "@/components/customer/CustomerProtectedRoute";
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

// Customer pages
import CustomerHomePage from "./pages/customer/CustomerHomePage";
import CustomerLoginPage from "./pages/customer/CustomerLoginPage";
import CustomerBrowsePage from "./pages/customer/CustomerBrowsePage";
import CustomerVendorPage from "./pages/customer/CustomerVendorPage";
import CustomerProductPage from "./pages/customer/CustomerProductPage";
import CustomerCartPage from "./pages/customer/CustomerCartPage";
import CustomerOrdersPage from "./pages/customer/CustomerOrdersPage";
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
import AdminSocialDashboardPage from "./pages/admin/AdminSocialDashboardPage";
import PaymentPage from "./pages/customer/PaymentPage";
import SocioDMChatPage from "./pages/customer/SocioDMChatPage";

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

// Vendor pages
import VendorLoginPage from "./pages/vendor/VendorLoginPage";
import VendorRegisterStandalonePage from "./pages/vendor/VendorRegisterPage";
import VendorDashboardPage from "./pages/vendor/VendorDashboardPage";
import VendorProductsPage from "./pages/vendor/VendorProductsPage";
import VendorServicesPage from "./pages/vendor/VendorServicesPage";
import VendorOrdersPage from "./pages/vendor/VendorOrdersPage";
import VendorSettlementsPage from "./pages/vendor/VendorSettlementsPage";
import VendorProfilePage from "./pages/vendor/VendorProfilePage";
import VendorBankPage from "./pages/vendor/VendorBankPage";
import VendorPaymentHistoryPage from "./pages/vendor/VendorPaymentHistoryPage";

const queryClient = new QueryClient();

function ProtectedPage({ children }: { children: React.ReactNode }) {
  return <ProtectedRoute>{children}</ProtectedRoute>;
}

function CustomerPage({ children }: { children: React.ReactNode }) {
  return <CustomerProtectedRoute>{children}</CustomerProtectedRoute>;
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            {/* Redirect root to customer app, admin login available */}
            <Route path="/" element={<Navigate to="/app" replace />} />
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
            <Route path="/cms" element={<ProtectedPage><CMSPage /></ProtectedPage>} />
            <Route path="/settings" element={<ProtectedPage><SettingsPage /></ProtectedPage>} />
            <Route path="/categories" element={<ProtectedPage><CategoriesPage /></ProtectedPage>} />
            <Route path="/admin/services" element={<ProtectedPage><AdminServicesPage /></ProtectedPage>} />
            <Route path="/tax" element={<ProtectedPage><TaxPage /></ProtectedPage>} />
            <Route path="/report-log" element={<ProtectedPage><ReportLogPage /></ProtectedPage>} />
            <Route path="/cf/city" element={<ProtectedPage><CFCityPage /></ProtectedPage>} />
            <Route path="/cf/area" element={<ProtectedPage><CFAreaPage /></ProtectedPage>} />
            <Route path="/cf/categories" element={<ProtectedPage><CFCategoriesPage /></ProtectedPage>} />
            <Route path="/cf/services" element={<ProtectedPage><CFServicesPage /></ProtectedPage>} />
            <Route path="/cf/vendors" element={<ProtectedPage><CFVendorsPage /></ProtectedPage>} />
            <Route path="/cf/products" element={<ProtectedPage><CFProductsPage /></ProtectedPage>} />
            <Route path="/occupations" element={<ProtectedPage><OccupationsPage /></ProtectedPage>} />
            <Route path="/platform-variables" element={<ProtectedPage><PlatformVariablesPage /></ProtectedPage>} />
            <Route path="/popup-banners" element={<ProtectedPage><PopupBannersPage /></ProtectedPage>} />
            <Route path="/banners" element={<ProtectedPage><BannersPage /></ProtectedPage>} />
            <Route path="/advertisements" element={<ProtectedPage><AdvertisementsPage /></ProtectedPage>} />
            <Route path="/website-queries" element={<ProtectedPage><WebsiteQueriesPage /></ProtectedPage>} />
            <Route path="/support-tickets" element={<ProtectedPage><SupportTicketsPage /></ProtectedPage>} />
            <Route path="/integrations" element={<ProtectedPage><IntegrationsPage /></ProtectedPage>} />
            <Route path="/admin/properties" element={<ProtectedPage><AdminPropertiesPage /></ProtectedPage>} />
            <Route path="/admin/localities" element={<ProtectedPage><AdminLocalitiesPage /></ProtectedPage>} />
            <Route path="/admin/property-plans" element={<ProtectedPage><AdminPropertyPlansPage /></ProtectedPage>} />
            <Route path="/admin/property-reports" element={<ProtectedPage><AdminPropertyReportsPage /></ProtectedPage>} />
            <Route path="/admin/homes/moderation" element={<ProtectedPage><AdminHomesModerationPage /></ProtectedPage>} />
            <Route path="/admin/homes/amenities" element={<ProtectedPage><AdminHomesAmenitiesPage /></ProtectedPage>} />
            <Route path="/admin/homes/cms" element={<ProtectedPage><AdminHomesCMSPage /></ProtectedPage>} />
            <Route path="/admin/homes/users" element={<ProtectedPage><AdminHomesUsersPage /></ProtectedPage>} />

            {/* Customer-facing routes */}
            <Route path="/app" element={<CustomerPage><CustomerHomePage /></CustomerPage>} />
            <Route path="/app/login" element={<CustomerLoginPage />} />
            <Route path="/auth/callback" element={<AuthCallbackPage />} />
            <Route path="/app/register" element={<CustomerRegisterPage />} />
            <Route path="/app/phone-login" element={<CustomerPhoneLoginPage />} />
            <Route path="/app/set-location" element={<SetLocationPage />} />
            <Route path="/app/terms" element={<TermsPage />} />
            <Route path="/app/privacy" element={<PrivacyPolicyPage />} />
            <Route path="/app/browse" element={<CustomerPage><CustomerBrowsePage /></CustomerPage>} />
            <Route path="/app/product/:id" element={<CustomerPage><CustomerProductPage /></CustomerPage>} />
            <Route path="/app/vendor/:id" element={<CustomerPage><CustomerVendorPage /></CustomerPage>} />
            <Route path="/app/cart" element={<CustomerPage><CustomerCartPage /></CustomerPage>} />
            <Route path="/app/payment" element={<CustomerPage><PaymentPage /></CustomerPage>} />
            <Route path="/app/orders" element={<CustomerPage><CustomerOrdersPage /></CustomerPage>} />
            <Route path="/app/profile" element={<CustomerPage><CustomerProfilePage /></CustomerPage>} />
            <Route path="/app/profile/edit" element={<CustomerPage><CustomerProfileEditPage /></CustomerPage>} />
            <Route path="/app/kyc" element={<CustomerPage><CustomerKYCPage /></CustomerPage>} />
            <Route path="/app/wallet" element={<CustomerPage><CustomerWalletPage /></CustomerPage>} />
            <Route path="/app/wishlist" element={<CustomerPage><CustomerWishlistPage /></CustomerPage>} />
            <Route path="/app/referrals" element={<CustomerPage><CustomerReferralPage /></CustomerPage>} />
            <Route path="/app/services" element={<CustomerPage><CustomerServicesPage /></CustomerPage>} />
            <Route path="/app/service/:id" element={<CustomerPage><CustomerServiceDetailPage /></CustomerPage>} />
            <Route path="/app/classifieds" element={<CustomerPage><CustomerClassifiedsPage /></CustomerPage>} />
            <Route path="/app/classifieds/post" element={<CustomerPage><CustomerPostAdPage /></CustomerPage>} />
            <Route path="/app/classifieds/:id" element={<CustomerPage><CustomerClassifiedDetailPage /></CustomerPage>} />
            <Route path="/app/vendor-register" element={<CustomerPage><VendorRegisterPage /></CustomerPage>} />

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
            <Route path="/app/social/comments/:postId" element={<CustomerPage><SocialCommentsPage /></CustomerPage>} />
            <Route path="/app/social/:username/followers" element={<CustomerPage><SocialFollowersPage /></CustomerPage>} />
            <Route path="/app/social/:username/following" element={<CustomerPage><SocialFollowersPage /></CustomerPage>} />
            <Route path="/app/social/edit-profile" element={<CustomerPage><SocialEditProfilePage /></CustomerPage>} />
            <Route path="/app/social/dashboard" element={<CustomerPage><SocialCreatorDashboardPage /></CustomerPage>} />
            <Route path="/app/social/live" element={<CustomerPage><SocialLivePage /></CustomerPage>} />
            <Route path="/app/social/channels" element={<CustomerPage><SocialBroadcastPage /></CustomerPage>} />
            <Route path="/app/social/shop" element={<CustomerPage><SocialShopPage /></CustomerPage>} />

            {/* Admin Social */}
            <Route path="/admin/social" element={<ProtectedPage><AdminSocialDashboardPage /></ProtectedPage>} />

            {/* Property / Find Home routes */}
            <Route path="/app/find-home" element={<CustomerPage><PropertyHomePage /></CustomerPage>} />
            <Route path="/app/find-home/post" element={<CustomerPage><PostPropertyPage /></CustomerPage>} />
            <Route path="/app/find-home/emi" element={<CustomerPage><PropertyEMIPage /></CustomerPage>} />
            <Route path="/app/find-home/my-properties" element={<CustomerPage><MyPropertiesPage /></CustomerPage>} />
            <Route path="/app/find-home/saved" element={<CustomerPage><MyPropertiesPage /></CustomerPage>} />
            <Route path="/app/find-home/saved-searches" element={<CustomerPage><SavedSearchesPage /></CustomerPage>} />
            <Route path="/app/find-home/messages" element={<CustomerPage><PropertyMessagesPage /></CustomerPage>} />
            <Route path="/app/find-home/rent-tracker" element={<CustomerPage><RentTrackerPage /></CustomerPage>} />
            <Route path="/app/find-home/value-estimator" element={<CustomerPage><PropertyValueEstimatorPage /></CustomerPage>} />
            <Route path="/app/find-home/:id" element={<CustomerPage><PropertyDetailPage /></CustomerPage>} />

            {/* Vendor-facing routes */}
            <Route path="/vendor/login" element={<VendorLoginPage />} />
            <Route path="/vendor" element={<VendorDashboardPage />} />
            <Route path="/vendor/products" element={<VendorProductsPage />} />
            <Route path="/vendor/services" element={<VendorServicesPage />} />
            <Route path="/vendor/orders" element={<VendorOrdersPage />} />
            <Route path="/vendor/settlements" element={<VendorSettlementsPage />} />
            <Route path="/vendor/payments" element={<VendorPaymentHistoryPage />} />
            <Route path="/vendor/bank" element={<VendorBankPage />} />
            <Route path="/vendor/profile" element={<VendorProfilePage />} />
            <Route path="/vendor/settings" element={<VendorProfilePage />} />

            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
