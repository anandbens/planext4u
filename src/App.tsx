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
            <Route path="/login" element={<LoginPage />} />
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
            <Route path="/cms" element={<ProtectedPage><CMSPage /></ProtectedPage>} />
            <Route path="/settings" element={<ProtectedPage><SettingsPage /></ProtectedPage>} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
