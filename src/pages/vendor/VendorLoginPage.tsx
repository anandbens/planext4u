import { useState } from "react";
import { useAuth } from "@/lib/auth";
import { useNavigate, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Eye, EyeOff, LogIn, Store, Database, Home, ShoppingBag, Wrench, User } from "lucide-react";
import { toast } from "sonner";
import p4uLogo from "@/assets/p4u-logo.png";

export default function VendorLoginPage() {
  const { vendorLogin, seedDemoUsers } = useAuth();
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
      await vendorLogin(email, password);
      toast.success("Welcome to Vendor Portal!");
      setTimeout(() => navigate("/vendor", { replace: true }), 500);
    } catch (err: any) {
      toast.error(err.message || "Invalid vendor credentials");
    } finally { setLoading(false); }
  };

  const quickLogin = async () => {
    setEmail("vendor@planext4u.com");
    setPassword("P4u@Vendor2026");
    setLoading(true);
    try {
      await vendorLogin("vendor@planext4u.com", "P4u@Vendor2026");
      toast.success("Welcome, TechMart!");
      setTimeout(() => navigate("/vendor", { replace: true }), 500);
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
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-brand-dark via-brand-dark/90 to-brand-teal/30">
      {/* Top Navigation Bar */}
      <nav className="w-full bg-card/10 backdrop-blur-sm border-b border-white/10">
        <div className="max-w-5xl mx-auto px-4 py-2.5 flex items-center justify-between">
          <Link to="/app" className="flex items-center gap-2">
            <div className="bg-white rounded-lg p-1.5 h-8 w-8 flex items-center justify-center">
              <img src={p4uLogo} alt="Planext4u" className="w-full h-full object-contain" />
            </div>
            <span className="text-white font-bold text-sm hidden sm:block">Planext4u</span>
          </Link>
          <div className="flex items-center gap-1">
            <Link to="/app">
              <Button variant="ghost" size="sm" className="text-xs text-white/70 hover:text-white hover:bg-white/10 gap-1">
                <Home className="h-3.5 w-3.5" /> Home
              </Button>
            </Link>
            <Link to="/app/browse">
              <Button variant="ghost" size="sm" className="text-xs text-white/70 hover:text-white hover:bg-white/10 gap-1">
                <ShoppingBag className="h-3.5 w-3.5" /> Shop
              </Button>
            </Link>
            <Link to="/app/services">
              <Button variant="ghost" size="sm" className="text-xs text-white/70 hover:text-white hover:bg-white/10 gap-1">
                <Wrench className="h-3.5 w-3.5" /> Services
              </Button>
            </Link>
            <Link to="/app/login">
              <Button variant="ghost" size="sm" className="text-xs text-white/70 hover:text-white hover:bg-white/10 gap-1">
                <User className="h-3.5 w-3.5" /> Customer Login
              </Button>
            </Link>
            <Link to="/login">
              <Button variant="ghost" size="sm" className="text-xs text-white/70 hover:text-white hover:bg-white/10 gap-1">
                Admin
              </Button>
            </Link>
          </div>
        </div>
      </nav>

      <div className="flex-1 flex items-center justify-center">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-32 -right-32 w-96 h-96 rounded-full bg-brand-teal/10 blur-3xl" />
          <div className="absolute -bottom-32 -left-32 w-96 h-96 rounded-full bg-brand-amber/5 blur-3xl" />
        </div>

        <div className="w-full max-w-md mx-4 relative z-10">
          <div className="bg-card rounded-2xl shadow-2xl overflow-hidden border border-white/10">
            <div className="bg-gradient-to-r from-brand-dark to-brand-dark/90 p-8 text-center relative">
              <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGNpcmNsZSBjeD0iMjAiIGN5PSIyMCIgcj0iMSIgZmlsbD0icmdiYSgyNTUsMjU1LDI1NSwwLjA1KSIvPjwvc3ZnPg==')] opacity-50" />
              <div className="relative">
                <div className="bg-white rounded-2xl p-3 w-16 h-16 mx-auto mb-3 shadow-lg">
                  <img src={p4uLogo} alt="Planext4u" className="w-full h-full object-contain" />
                </div>
                <div className="flex items-center justify-center gap-2 mb-1">
                  <Store className="h-5 w-5 text-brand-amber" />
                  <h1 className="text-xl font-bold text-white">Vendor Portal</h1>
                </div>
                <p className="text-white/60 text-xs">Manage your store, orders & settlements</p>
              </div>
            </div>

            <div className="p-6 space-y-4">
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
                <Input placeholder="Vendor Email" value={email} onChange={(e) => setEmail(e.target.value)}
                  className="h-12 rounded-xl" type="email" />
                <div className="relative">
                  <Input type={showPassword ? "text" : "password"} placeholder="Password"
                    value={password} onChange={(e) => setPassword(e.target.value)}
                    className="h-12 rounded-xl pr-10" />
                  <button type="button" onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                <Button type="submit" className="w-full h-12 rounded-xl text-base gap-2 bg-brand-dark hover:bg-brand-dark/90 text-white" disabled={loading}>
                  {loading ? "Signing in..." : <><LogIn className="h-4 w-4" /> Sign In</>}
                </Button>
              </form>

              <button onClick={quickLogin} disabled={loading}
                className="w-full bg-secondary/50 rounded-xl border border-border/50 p-3 text-center hover:border-brand-teal/40 transition-all">
                <p className="text-xs font-semibold">Quick Demo Login</p>
                <p className="text-[10px] text-muted-foreground">vendor@planext4u.com / P4u@Vendor2026</p>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
