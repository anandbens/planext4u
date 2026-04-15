import { Navigate } from "react-router-dom";
import { useAuth } from "@/lib/auth";
import { isNativePlatform } from "@/lib/capacitor-auth";
import { CustomerProtectedRoute } from "./CustomerProtectedRoute";

/**
 * On desktop/mobile browsers: renders children directly (guest access).
 * On Capacitor native apps: requires authentication via CustomerProtectedRoute.
 */
export function GuestOrCustomerRoute({ children }: { children: React.ReactNode }) {
  if (isNativePlatform()) {
    return <CustomerProtectedRoute>{children}</CustomerProtectedRoute>;
  }
  // Web browser — allow guest access
  return <>{children}</>;
}
