import { Navigate } from "react-router-dom";
import { useAuth } from "@/lib/auth";
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

export function ProtectedRoute({ children, allowedRoles }: ProtectedRouteProps) {
  const { isAuthenticated, isLoading, user } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="h-8 w-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && allowedRoles.length > 0 && user) {
    const role = user.role;
    // Admins always pass; otherwise the role must be explicitly listed.
    if (role !== 'admin' && !allowedRoles.includes(role)) {
      return <Navigate to="/dashboard" replace />;
    }
  }

  return <>{children}</>;
}
