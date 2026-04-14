import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/lib/auth";
import { VendorFTUXFlow } from "./VendorFTUXFlow";

export function VendorProtectedRoute({ children }: { children: React.ReactNode }) {
  const { vendorUser, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="h-8 w-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
      </div>
    );
  }

  if (!vendorUser) {
    return <Navigate to="/vendor/login" replace />;
  }

  // Redirect to set-password ONLY on fresh first-time login (not on session restore / app reopen)
  if (vendorUser.just_logged_in && !vendorUser.password_set && location.pathname !== "/vendor/set-password") {
    return <Navigate to="/vendor/set-password" replace />;
  }

  return <VendorFTUXFlow>{children}</VendorFTUXFlow>;
}
