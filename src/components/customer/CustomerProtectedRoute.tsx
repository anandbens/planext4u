import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/lib/auth";
import { useEffect, useRef, useState } from "react";
import { Capacitor } from "@capacitor/core";
import { supabase } from "@/integrations/supabase/client";
import { isSessionStampValid } from "@/lib/session-stamp";

/**
 * Customer route guard.
 *
 * Cold-start behaviour on Capacitor (Android/iOS):
 *   1. Profile cache (Capacitor Preferences) and the Supabase auth token
 *      (also Preferences) are read asynchronously, so on the very first
 *      paint `customerUser` and `getSession()` may both be null even when
 *      a valid session exists.
 *   2. To avoid bouncing the user to /app/login during this race, we keep
 *      showing the loading spinner until EITHER:
 *        - the auth provider hydrates `customerUser`, OR
 *        - we receive a definitive auth event (`INITIAL_SESSION` / `SIGNED_IN`
 *          / `SIGNED_OUT`) from Supabase, OR
 *        - a hard timeout elapses (10s native, 4s web) as a last resort.
 *   3. If we have a valid <3-day session stamp, we extend the timeout further
 *      because the user explicitly logged in recently and should never see
 *      a forced re-login while their session is still inside the trust window.
 */
export function CustomerProtectedRoute({ children }: { children: React.ReactNode }) {
  const { customerUser, isLoading } = useAuth();
  const location = useLocation();
  const [resolved, setResolved] = useState(false);
  const [hasSession, setHasSession] = useState<boolean | null>(null);
  const settledRef = useRef(false);

  useEffect(() => {
    if (customerUser) { settledRef.current = true; setResolved(true); return; }
    settledRef.current = false;

    const isNative = Capacitor.isNativePlatform();
    const stampValid = isSessionStampValid("customer");
    // Hard ceiling: don't spin forever if something is genuinely wrong.
    const hardTimeoutMs = isNative ? (stampValid ? 12000 : 8000) : (stampValid ? 6000 : 3500);

    const settle = (sessionPresent: boolean | null) => {
      if (settledRef.current) return;
      settledRef.current = true;
      setHasSession(sessionPresent);
      setResolved(true);
    };

    // Listen for the next decisive auth event.
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "INITIAL_SESSION" || event === "SIGNED_IN" || event === "TOKEN_REFRESHED") {
        if (session) settle(true);
        else if (event === "INITIAL_SESSION") settle(false);
      } else if (event === "SIGNED_OUT") {
        settle(false);
      }
    });

    // Probe current session in parallel.
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) settle(true);
    });

    const t = setTimeout(() => settle(null), hardTimeoutMs);
    return () => { clearTimeout(t); subscription.unsubscribe(); };
  }, [customerUser]);

  if (isLoading || (!customerUser && !resolved)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="h-8 w-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
      </div>
    );
  }

  // If we already have a profile, let them in.
  if (customerUser) {
    if (customerUser.just_logged_in && !customerUser.password_set && location.pathname !== "/app/set-password") {
      return <Navigate to="/app/set-password" replace />;
    }
    return <>{children}</>;
  }

  // No profile yet, but Supabase says we DO have a live session AND we're inside
  // the 3-day trust window — keep the spinner so the auth provider can finish
  // loading the role instead of bouncing to /login.
  if (hasSession && isSessionStampValid("customer")) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="h-8 w-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
      </div>
    );
  }

  return <Navigate to="/app/login" replace />;
}
