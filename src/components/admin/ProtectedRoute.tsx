import { useEffect, useRef, useState } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { isSessionStampValid } from "@/lib/session-stamp";
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
 * Gate admin pages until BOTH the auth context AND a live Supabase session
 * are confirmed. Cold-start strategy mirrors the customer/vendor guards: we
 * wait for a decisive Supabase auth event instead of a fixed short timeout,
 * so a freshly resumed/cold-started app does NOT bounce the user to /login
 * while their <3-day session is silently being refreshed.
 */
export function ProtectedRoute({ children, allowedRoles }: ProtectedRouteProps) {
  const { isAuthenticated, isLoading, user } = useAuth();
  const [resolved, setResolved] = useState(false);
  const [hasSession, setHasSession] = useState<boolean | null>(null);
  const settledRef = useRef(false);

  useEffect(() => {
    if (user) { settledRef.current = true; setResolved(true); setHasSession(true); return; }
    settledRef.current = false;

    const stampValid = isSessionStampValid("admin");
    const hardTimeoutMs = stampValid ? 6000 : 3500;

    const settle = (sessionPresent: boolean | null) => {
      if (settledRef.current) return;
      settledRef.current = true;
      setHasSession(sessionPresent);
      setResolved(true);
    };

    // Single top-level auth subscription lives in AuthProvider. One-shot probe here.
    supabase.auth.getSession().then(({ data: { session } }) => {
      settle(!!session);
    });

    const t = setTimeout(() => settle(null), hardTimeoutMs);
    return () => { clearTimeout(t); };
  }, [user]);


  if (isLoading || (!user && !resolved)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="h-8 w-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
      </div>
    );
  }

  // No live session AND no cached profile → force re-login.
  if (!isAuthenticated && !hasSession) {
    return <Navigate to="/login" replace />;
  }

  // Live session detected but the auth provider hasn't loaded the role yet —
  // keep the spinner instead of bouncing to /login.
  if (!user && hasSession && isSessionStampValid("admin")) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="h-8 w-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
      </div>
    );
  }

  if (!user) return <Navigate to="/login" replace />;

  if (allowedRoles && allowedRoles.length > 0) {
    const role = user.role;
    if (role !== 'admin' && !allowedRoles.includes(role)) {
      return <Navigate to="/dashboard" replace />;
    }
  }

  return <>{children}</>;
}
