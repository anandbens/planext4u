import { Navigate } from "react-router-dom";
import { useAuth } from "@/lib/auth";

export function CustomerProtectedRoute({ children }: { children: React.ReactNode }) {
  const { customerUser, isLoading } = useAuth();

  if (isLoading) {
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
