import { useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowLeft, Mail, Loader2, CheckCircle } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import p4uLogoTeal from "@/assets/p4u-logo-teal.webp";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      toast.error("Please enter a valid email address");
      return;
    }
    setLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/app/reset-password`,
      });
      if (error) throw error;
      setSent(true);
      toast.success("Password reset email sent!");
    } catch (err: any) {
      toast.error(err.message || "Failed to send reset email");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <div
        className="bg-primary pb-16 px-6 flex flex-col items-center relative"
        style={{ paddingTop: "calc(env(safe-area-inset-top, 0px) + 3rem)" }}
      >
        <Link to="/app/login" className="absolute top-4 left-4 text-primary-foreground/60 hover:text-primary-foreground">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <img loading="lazy" decoding="async" src={p4uLogoTeal} alt="Planext4u" className="h-20 w-20 object-contain mb-2 rounded-xl" />
        <h2 className="text-primary-foreground text-xl font-bold tracking-wider">Planext 4u</h2>
      </div>

      <div className="flex-1 bg-card -mt-6 rounded-t-3xl px-6 pt-8 pb-6">
        {sent ? (
          <div className="max-w-sm mx-auto text-center space-y-4">
            <CheckCircle className="h-16 w-16 text-green-500 mx-auto" />
            <h2 className="text-xl font-bold">Check Your Email</h2>
            <p className="text-muted-foreground text-sm">
              We've sent a password reset link to <strong>{email}</strong>. Please check your inbox and follow the instructions.
            </p>
            <p className="text-xs text-muted-foreground">Didn't receive it? Check your spam folder or try again.</p>
            <Button variant="outline" onClick={() => setSent(false)} className="mt-4">
              Try another email
            </Button>
            <div className="pt-2">
              <Link to="/app/login" className="text-sm text-primary font-semibold hover:underline">
                ← Back to Login
              </Link>
            </div>
          </div>
        ) : (
          <div className="max-w-sm mx-auto space-y-6">
            <div className="text-center">
              <h2 className="text-xl font-bold">Forgot Password?</h2>
              <p className="text-muted-foreground text-sm mt-2">
                Enter your registered email and we'll send you a link to reset your password.
              </p>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Enter your email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-10 h-12 text-base rounded-xl"
                  type="email"
                />
              </div>
              <Button type="submit" className="w-full h-12 rounded-xl text-base" disabled={loading}>
                {loading ? (
                  <><Loader2 className="h-4 w-4 animate-spin mr-2" /> Sending...</>
                ) : (
                  "Send Reset Link"
                )}
              </Button>
            </form>
            <div className="text-center">
              <Link to="/app/login" className="text-sm text-primary font-semibold hover:underline">
                ← Back to Login
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
