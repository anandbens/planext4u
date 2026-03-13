import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/lib/auth";
import { ProtectedRoute } from "@/components/admin/ProtectedRoute";
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
import CustomerRegisterPage from "./pages/customer/CustomerRegisterPage";

// Vendor pages
import VendorLoginPage from "./pages/vendor/VendorLoginPage";
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

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            {/* Admin Login */}
            <Route path="/login" element={<LoginPage />} />

            {/* Admin routes */}
            <Route path="/" element={<ProtectedPage><DashboardPage /></ProtectedPage>} />
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

            {/* Customer-facing routes */}
            <Route path="/app" element={<CustomerHomePage />} />
            <Route path="/app/login" element={<CustomerLoginPage />} />
            <Route path="/app/register" element={<CustomerRegisterPage />} />
            <Route path="/app/browse" element={<CustomerBrowsePage />} />
            <Route path="/app/product/:id" element={<CustomerProductPage />} />
            <Route path="/app/vendor/:id" element={<CustomerVendorPage />} />
            <Route path="/app/cart" element={<CustomerCartPage />} />
            <Route path="/app/orders" element={<CustomerOrdersPage />} />
            <Route path="/app/profile" element={<CustomerProfilePage />} />
            <Route path="/app/profile/edit" element={<CustomerProfileEditPage />} />
            <Route path="/app/kyc" element={<CustomerKYCPage />} />
            <Route path="/app/wallet" element={<CustomerWalletPage />} />
            <Route path="/app/wishlist" element={<CustomerWishlistPage />} />
            <Route path="/app/referrals" element={<CustomerReferralPage />} />
            <Route path="/app/services" element={<CustomerServicesPage />} />
            <Route path="/app/service/:id" element={<CustomerServiceDetailPage />} />
            <Route path="/app/classifieds" element={<CustomerClassifiedsPage />} />
            <Route path="/app/classifieds/post" element={<CustomerPostAdPage />} />

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
