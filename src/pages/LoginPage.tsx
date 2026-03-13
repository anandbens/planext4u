import { useState } from "react";
import { useAuth } from "@/lib/auth";
import { useNavigate, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Eye, EyeOff, LogIn, Shield, Banknote, ShoppingCart, Database } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import p4uLogo from "@/assets/p4u-logo.png";

const QUICK_LOGINS = [
  { email: "admin@planext4u.com", password: "P4u@Admin2026", role: "Admin", icon: Shield, color: "bg-brand-dark", desc: "Full access" },
  { email: "finance@planext4u.com", password: "P4u@Finance2026", role: "Finance", icon: Banknote, color: "bg-success", desc: "Reports & Tax" },
  { email: "sales@planext4u.com", password: "P4u@Sales2026", role: "Sales", icon: ShoppingCart, color: "bg-info", desc: "Orders & CRM" },
];

export default function LoginPage() {
  const { login, seedDemoUsers } = useAuth();
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
      await login(email, password);
      toast.success("Welcome back!");
      // Small delay to allow onAuthStateChange to fire
      setTimeout(() => navigate("/", { replace: true }), 500);
    } catch (err: any) {
      toast.error(err.message || "Invalid credentials. Make sure demo users are seeded first.");
    } finally { setLoading(false); }
  };

  const quickLogin = async (cred: typeof QUICK_LOGINS[0]) => {
    setEmail(cred.email);
    setPassword(cred.password);
    setLoading(true);
    try {
      await login(cred.email, cred.password);
      toast.success(`Welcome, ${cred.role}!`);
      setTimeout(() => navigate("/", { replace: true }), 500);
    } catch (err: any) {
      toast.error(err.message || "Login failed. Have you seeded demo users?");
    } finally { setLoading(false); }
  };

  const handleSeedUsers = async () => {
    setSeeding(true);
    try {
      await seedDemoUsers();
      toast.success("Demo users created! You can now login with the quick login buttons.");
    } catch (err: any) {
      toast.error("Failed to seed users: " + (err.message || "Unknown error"));
    } finally { setSeeding(false); }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-brand-teal via-brand-teal/80 to-brand-dark">
      {/* Decorative shapes */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-32 -right-32 w-96 h-96 rounded-full bg-brand-amber/10 blur-3xl" />
        <div className="absolute -bottom-32 -left-32 w-96 h-96 rounded-full bg-white/5 blur-3xl" />
      </div>

      <div className="w-full max-w-md mx-4 relative z-10">
        <div className="bg-card rounded-2xl shadow-2xl overflow-hidden border border-white/10">
          {/* Header */}
          <div className="bg-gradient-to-r from-brand-teal to-brand-teal/90 p-8 text-center relative">
            <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGNpcmNsZSBjeD0iMjAiIGN5PSIyMCIgcj0iMSIgZmlsbD0icmdiYSgyNTUsMjU1LDI1NSwwLjA1KSIvPjwvc3ZnPg==')] opacity-50" />
            <div className="relative">
              <div className="bg-white rounded-2xl p-3 w-20 h-20 mx-auto mb-4 shadow-lg">
                <img src={p4uLogo} alt="Planext4u" className="w-full h-full object-contain" />
              </div>
              <h1 className="text-xl font-bold text-white">Admin Portal</h1>
              <p className="text-white/60 text-xs mt-1">Restricted access — Authorized personnel only</p>
            </div>
          </div>

          {/* Form */}
          <div className="p-6 space-y-4">
            {/* Seed Button */}
            <Button
              variant="outline"
              className="w-full gap-2 border-brand-amber/30 text-brand-amber hover:bg-brand-amber/10"
              onClick={handleSeedUsers}
              disabled={seeding}
            >
              <Database className="h-4 w-4" />
              {seeding ? "Creating demo accounts..." : "🔧 First time? Seed Demo Users"}
            </Button>

            <form onSubmit={handleSubmit} className="space-y-4">
              <Input placeholder="Admin Email" value={email} onChange={(e) => setEmail(e.target.value)}
                className="h-12 rounded-xl border-border/60 focus:border-brand-teal" type="email" />
              <div className="relative">
                <Input type={showPassword ? "text" : "password"} placeholder="Password"
                  value={password} onChange={(e) => setPassword(e.target.value)}
                  className="h-12 rounded-xl pr-10 border-border/60 focus:border-brand-teal" />
                <button type="button" onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors">
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              <Button type="submit" className="w-full h-12 rounded-xl text-base gap-2 bg-brand-teal hover:bg-brand-teal/90 text-white" disabled={loading}>
                {loading ? "Signing in..." : <><LogIn className="h-4 w-4" /> Sign In</>}
              </Button>
            </form>

            {/* Quick Login */}
            <div className="border-t border-border/50 pt-4">
              <p className="text-xs text-muted-foreground text-center mb-3">Quick Login (Demo)</p>
              <div className="grid grid-cols-3 gap-2">
                {QUICK_LOGINS.map((cred) => (
                  <button key={cred.role} onClick={() => quickLogin(cred)} disabled={loading}
                    className="bg-secondary/50 rounded-xl border border-border/50 p-3 text-center hover:border-brand-teal/40 hover:shadow-md transition-all group">
                    <div className={cn("h-8 w-8 rounded-lg flex items-center justify-center mx-auto mb-1.5", cred.color)}>
                      <cred.icon className="h-4 w-4 text-white" />
                    </div>
                    <p className="text-xs font-semibold group-hover:text-brand-teal transition-colors">{cred.role}</p>
                    <p className="text-[9px] text-muted-foreground">{cred.desc}</p>
                  </button>
                ))}
              </div>
            </div>

            <div className="text-center space-y-2 pt-2">
              <Link to="/app/login" className="text-xs text-brand-teal hover:underline block">Customer Login →</Link>
              <Link to="/vendor/login" className="text-xs text-brand-teal hover:underline block">Vendor Login →</Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
