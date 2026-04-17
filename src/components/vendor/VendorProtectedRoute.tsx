import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/lib/auth";
import { useEffect, useState } from "react";
import { Capacitor } from "@capacitor/core";
import { supabase } from "@/integrations/supabase/client";
import { VendorFTUXFlow } from "./VendorFTUXFlow";

export function VendorProtectedRoute({ children }: { children: React.ReactNode }) {
  const { vendorUser, isLoading } = useAuth();
  const [checkingSession, setCheckingSession] = useState(!vendorUser && !isLoading);
  const location = useLocation();

  useEffect(() => {
    if (!vendorUser && !isLoading) {
      const grace = Capacitor.isNativePlatform() ? 5000 : 3000;
      supabase.auth.getSession().then(({ data: { session } }) => {
        if (!session) {
          setCheckingSession(false);
        } else {
          const timeout = setTimeout(() => setCheckingSession(false), grace);
          return () => clearTimeout(timeout);
        }
      });
    }
  }, [vendorUser, isLoading]);

  if (isLoading || (checkingSession && !vendorUser)) {
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
