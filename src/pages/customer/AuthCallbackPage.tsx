import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

/**
 * Handles OAuth redirect callback.
 * After Google OAuth completes, the user lands here.
 * We wait for the session to initialize, validate the user exists
 * in the customers table, then redirect accordingly.
 */
export default function AuthCallbackPage() {
  const navigate = useNavigate();
  const { customerUser, isLoading } = useAuth();
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    let cancelled = false;

    const handleCallback = async () => {
      // Wait for Supabase session to be established
      const { data: { session } } = await supabase.auth.getSession();

      if (!session?.user) {
        // No session yet - wait for auth state change
        // The auth provider will handle this
        if (!cancelled) {
          // Give it a few seconds for the session to establish
          setTimeout(async () => {
            const { data: { session: retrySession } } = await supabase.auth.getSession();
            if (!retrySession?.user) {
              toast.error("Authentication failed. Please try again.");
              navigate("/app/login", { replace: true });
            }
            setChecking(false);
          }, 3000);
        }
        return;
      }

      // Session exists - check if user is a registered customer
      if (session.user.email) {
        const { data: customer } = await supabase
          .from("customers")
          .select("id")
          .eq("email", session.user.email)
          .maybeSingle();

        if (!customer) {
          await supabase.auth.signOut();
          toast.error(
            "Your Gmail is not registered with Planext4U. Create your account first to do a Google Sign-in.",
            { duration: 6000 }
          );
          if (!cancelled) navigate("/app/login", { replace: true });
          return;
        }
      }

      if (!cancelled) setChecking(false);
    };

    handleCallback();

    return () => { cancelled = true; };
  }, [navigate]);

  // Once auth provider finishes loading and customerUser is set, redirect
  useEffect(() => {
    if (!isLoading && !checking && customerUser) {
      toast.success("Welcome to Planext4u!");
      navigate("/app", { replace: true });
    }
  }, [isLoading, checking, customerUser, navigate]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background gap-4">
      <Loader2 className="h-10 w-10 animate-spin text-primary" />
      <p className="text-muted-foreground text-sm">Signing you in...</p>
    </div>
  );
}
