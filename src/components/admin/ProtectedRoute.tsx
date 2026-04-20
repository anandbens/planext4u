import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import type { UserRole } from "@/lib/auth-types";

interface ProtectedRouteProps {
  children: React.ReactNode;
  /**
   * Optional allow-list of admin-portal roles permitted to access this route.
   * If omitted, any authenticated admin-portal user (admin/finance/sales) may enter.
   * 'admin' always has access regardless of the list (super-user).
   */
  allowedRoles?: UserRole[];
}

/**
 * Gate admin pages until BOTH the auth context AND the live Supabase session
 * are confirmed ready. This prevents a race where cached admin_user makes
 * `isAuthenticated` true before the Supabase JWT is attached to outgoing
 * requests, which causes RLS to return partial / empty data on first load.
 */
export function ProtectedRoute({ children, allowedRoles }: ProtectedRouteProps) {
  const { isAuthenticated, isLoading, user } = useAuth();
  const [sessionReady, setSessionReady] = useState(false);
  const [hasSession, setHasSession] = useState(false);

  useEffect(() => {
    let cancelled = false;
    // Confirm a live Supabase session exists before letting child pages query.
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (cancelled) return;
      setHasSession(!!session);
      setSessionReady(true);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (cancelled) return;
      setHasSession(!!session);
      setSessionReady(true);
    });
    return () => { cancelled = true; subscription.unsubscribe(); };
  }, []);

  if (isLoading || !sessionReady) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="h-8 w-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
      </div>
    );
  }

  // Cached profile but no live session → force re-login (prevents stale-cache RLS race)
  if (!isAuthenticated || !hasSession) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && allowedRoles.length > 0 && user) {
    const role = user.role;
    if (role !== 'admin' && !allowedRoles.includes(role)) {
      return <Navigate to="/dashboard" replace />;
    }
  }

  return <>{children}</>;
}
