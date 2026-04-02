import { useState } from "react";
import { useAuth } from "@/lib/auth";
import { useNavigate, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Eye, EyeOff, Mail, Database } from "lucide-react";
import { toast } from "sonner";
import p4uLogoTeal from "@/assets/p4u-logo-teal.png";

export default function CustomerLoginPage() {
  const { customerLogin, seedDemoUsers } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [seeding, setSeeding] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) { toast.error("Please enter email and password"); return; }
    setLoading(true);
    try {
      await customerLogin(email, password);
      toast.success("Welcome to Planext4u!");
      setTimeout(() => navigate("/app", { replace: true }), 500);
    } catch (err: any) {
      toast.error(err.message || "Invalid credentials");
    } finally { setLoading(false); }
  };

  const quickLogin = async () => {
    setLoading(true);
    try {
      await customerLogin("customer@planext4u.com", "P4u@Customer2026");
      toast.success("Welcome to Planext4u!");
      setTimeout(() => navigate("/app", { replace: true }), 500);
    } catch (err: any) {
      toast.error(err.message || "Login failed. Seed demo users first.");
    } finally { setLoading(false); }
  };

  const handleSeedUsers = async () => {
    setSeeding(true);
    try {
      await seedDemoUsers();
      toast.success("Demo users created!");
    } catch (err: any) {
      toast.error("Failed: " + (err.message || "Unknown error"));
    } finally { setSeeding(false); }
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* P4U Branded Header */}
      <div className="bg-primary pt-12 pb-16 px-6 flex flex-col items-center relative">
        <Link to="/app" className="absolute top-4 right-4 bg-primary-foreground/20 text-primary-foreground text-xs px-4 py-1.5 rounded-full hover:bg-primary-foreground/30 transition-colors">skip</Link>
        <img src={p4uLogoTeal} alt="Planext4u" className="h-20 w-20 object-contain mb-2 rounded-xl" />
        <h2 className="text-primary-foreground text-xl font-bold tracking-wider">Planext 4u</h2>
        <span className="text-primary-foreground/60 text-[10px] absolute top-14 right-[calc(50%-40px)] font-semibold">TM</span>
      </div>

      {/* Login Form */}
      <div className="flex-1 bg-card -mt-6 rounded-t-3xl px-6 pt-8 pb-6">
        <h2 className="text-xl font-bold text-center mb-6">Log in or Sign up</h2>

        <div className="space-y-4 max-w-sm mx-auto">
          <Button
            variant="outline"
            className="w-full gap-2 border-primary/30 text-primary hover:bg-primary/10"
            onClick={handleSeedUsers}
            disabled={seeding}
          >
            <Database className="h-4 w-4" />
            {seeding ? "Creating demo accounts..." : "🔧 First time? Seed Demo Users"}
          </Button>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Enter E-mail ID" value={email} onChange={(e) => setEmail(e.target.value)}
                className="pl-10 h-12 text-base rounded-xl" type="email" />
            </div>
            <div className="relative">
              <Input type={showPassword ? "text" : "password"} placeholder="Enter password"
                value={password} onChange={(e) => setPassword(e.target.value)}
                className="h-12 text-base pr-10 rounded-xl" />
              <button type="button" onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            <Button type="submit" className="w-full h-12 rounded-xl text-base bg-primary" disabled={loading}>
              {loading ? "Signing in..." : "Sign In →"}
            </Button>
          </form>

          <button onClick={quickLogin} disabled={loading}
            className="w-full bg-secondary/50 rounded-xl border border-border/50 p-3 text-center hover:border-primary/40 transition-all">
            <p className="text-xs font-semibold">Quick Demo Login</p>
            <p className="text-[10px] text-muted-foreground">customer@planext4u.com / P4u@Customer2026</p>
          </button>
        </div>

        {/* Social Login */}
        <div className="mt-6 text-center max-w-sm mx-auto">
          <p className="text-xs text-muted-foreground mb-3">Or login with</p>
          <div className="flex justify-center gap-4">
            {["G", "f", "🍎"].map((icon, i) => (
              <button key={i} className="h-12 w-12 rounded-full border border-border flex items-center justify-center hover:bg-secondary transition-colors text-lg font-bold">
                {icon}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-4 text-center max-w-sm mx-auto">
          <Link to="/app/phone-login" className="text-sm text-primary font-semibold hover:underline block mb-2">Login with Phone (OTP) →</Link>
          <Link to="/app/register" className="text-sm text-primary font-semibold hover:underline">New user? Register here</Link>
        </div>

        <p className="text-[10px] text-muted-foreground text-center mt-6 max-w-sm mx-auto">
          By continuing, you agree to our <span className="underline">Terms of service</span>{" "}
          <span className="underline">Privacy Policy</span>{" "}
          <span className="underline">Content Policies</span>
        </p>
      </div>
    </div>
  );
}
