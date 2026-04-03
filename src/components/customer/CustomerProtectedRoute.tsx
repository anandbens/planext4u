import { Navigate } from "react-router-dom";
import { useAuth } from "@/lib/auth";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export function CustomerProtectedRoute({ children }: { children: React.ReactNode }) {
  const { customerUser, isLoading } = useAuth();
  const [checkingSession, setCheckingSession] = useState(!customerUser && !isLoading);

  useEffect(() => {
    if (!customerUser && !isLoading) {
      // Double-check for an active Supabase session before redirecting
      supabase.auth.getSession().then(({ data: { session } }) => {
        if (!session) {
          setCheckingSession(false);
        } else {
          // Session exists but customerUser not yet hydrated — keep waiting
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

  return <>{children}</>;
}
