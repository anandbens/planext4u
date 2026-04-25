import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/lib/auth";
import { useEffect, useRef, useState } from "react";
import { Capacitor } from "@capacitor/core";
import { supabase } from "@/integrations/supabase/client";
import { isSessionStampValid } from "@/lib/session-stamp";
import { VendorFTUXFlow } from "./VendorFTUXFlow";

/**
 * Vendor route guard.
 *
 * Same cold-start strategy as CustomerProtectedRoute — see that file for the
 * full rationale. In short: wait for a decisive Supabase auth event (or for
 * the cached vendor profile to hydrate) instead of a fixed short timeout, and
 * never redirect to /vendor/login while a <3-day session stamp is still valid
 * AND Supabase reports a live session.
 */
export function VendorProtectedRoute({ children }: { children: React.ReactNode }) {
  const { vendorUser, isLoading } = useAuth();
  const location = useLocation();
  const [resolved, setResolved] = useState(false);
  const [hasSession, setHasSession] = useState<boolean | null>(null);
  const settledRef = useRef(false);

  useEffect(() => {
    if (vendorUser) { settledRef.current = true; setResolved(true); return; }
    settledRef.current = false;

    const isNative = Capacitor.isNativePlatform();
    const stampValid = isSessionStampValid("vendor");
    const hardTimeoutMs = isNative ? (stampValid ? 12000 : 8000) : (stampValid ? 6000 : 3500);

    const settle = (sessionPresent: boolean | null) => {
      if (settledRef.current) return;
      settledRef.current = true;
      setHasSession(sessionPresent);
      setResolved(true);
    };

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "INITIAL_SESSION" || event === "SIGNED_IN" || event === "TOKEN_REFRESHED") {
        if (session) settle(true);
        else if (event === "INITIAL_SESSION") settle(false);
      } else if (event === "SIGNED_OUT") {
        settle(false);
      }
    });
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) settle(true);
    });

    const t = setTimeout(() => settle(null), hardTimeoutMs);
    return () => { clearTimeout(t); subscription.unsubscribe(); };
  }, [vendorUser]);

  if (isLoading || (!vendorUser && !resolved)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="h-8 w-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
      </div>
    );
  }

  if (vendorUser) {
    if (vendorUser.just_logged_in && !vendorUser.password_set && location.pathname !== "/vendor/set-password") {
      return <Navigate to="/vendor/set-password" replace />;
    }
    return <VendorFTUXFlow>{children}</VendorFTUXFlow>;
  }

  if (hasSession && isSessionStampValid("vendor")) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="h-8 w-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
      </div>
    );
  }

  return <Navigate to="/vendor/login" replace />;
}
