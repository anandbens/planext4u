import { Navigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export function RiderProtectedRoute({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<"checking" | "ok" | "no">("checking");

  useEffect(() => {
    let mounted = true;
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) { if (mounted) setState("no"); return; }
      const { data } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", session.user.id)
        .in("role", ["rider", "admin"])
        .maybeSingle();
      if (mounted) setState(data ? "ok" : "no");
    })();
    return () => { mounted = false; };
  }, []);

  if (state === "checking") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="h-8 w-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
      </div>
    );
  }
  if (state === "no") return <Navigate to="/rider/login" replace />;
  return <>{children}</>;
}
