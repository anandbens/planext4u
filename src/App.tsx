import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
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

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<DashboardPage />} />
          <Route path="/customers" element={<CustomersPage />} />
          <Route path="/vendors" element={<VendorsPage />} />
          <Route path="/products" element={<ProductsPage />} />
          <Route path="/orders" element={<OrdersPage />} />
          <Route path="/settlements" element={<SettlementsPage />} />
          <Route path="/classifieds" element={<ClassifiedsPage />} />
          <Route path="/points" element={<PointsPage />} />
          <Route path="/referrals" element={<ReferralsPage />} />
          <Route path="/reports" element={<ReportsPage />} />
          <Route path="/cms" element={<CMSPage />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
