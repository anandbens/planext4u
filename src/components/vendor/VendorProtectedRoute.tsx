import { Navigate } from "react-router-dom";
import { useAuth } from "@/lib/auth";

export function VendorProtectedRoute({ children }: { children: React.ReactNode }) {
  const { vendorUser, isLoading } = useAuth();

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

  return <>{children}</>;
}
