import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/lib/auth";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export function CustomerProtectedRoute({ children }: { children: React.ReactNode }) {
  const { customerUser, isLoading } = useAuth();
  const [checkingSession, setCheckingSession] = useState(!customerUser && !isLoading);
  const location = useLocation();

  useEffect(() => {
    if (!customerUser && !isLoading) {
      supabase.auth.getSession().then(({ data: { session } }) => {
        if (!session) {
          setCheckingSession(false);
        } else {
          const timeout = setTimeout(() => setCheckingSession(false), 3000);
          return () => clearTimeout(timeout);
        }
      });
    }
  }, [customerUser, isLoading]);

  if (isLoading || (checkingSession && !customerUser)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="h-8 w-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
      </div>
    );
  }

  if (!customerUser) {
    return <Navigate to="/app/login" replace />;
  }

  // Redirect to set-password ONLY on fresh first-time login (not on session restore / app reopen)
  if (customerUser.just_logged_in && !customerUser.password_set && location.pathname !== "/app/set-password") {
    return <Navigate to="/app/set-password" replace />;
  }

  return <>{children}</>;
}
