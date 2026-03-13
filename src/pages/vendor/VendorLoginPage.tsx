import { useState } from "react";
import { useAuth } from "@/lib/auth";
import { useNavigate, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Eye, EyeOff, LogIn, Store } from "lucide-react";
import { toast } from "sonner";
import p4uLogoDark from "@/assets/p4u-logo-dark.png";

export default function VendorLoginPage() {
  const { vendorLogin } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) { toast.error("Please enter email and password"); return; }
    setLoading(true);
    try {
      await vendorLogin(email, password);
      toast.success("Welcome to Vendor Portal!");
      navigate("/vendor", { replace: true });
    } catch { toast.error("Invalid vendor credentials"); }
    finally { setLoading(false); }
  };

  const quickLogin = async () => {
    setEmail("vendor@planext4u.com");
    setPassword("P4u@Vendor2026");
    setLoading(true);
    try {
      await vendorLogin("vendor@planext4u.com", "P4u@Vendor2026");
      toast.success("Welcome, TechMart!");
      navigate("/vendor", { replace: true });
    } catch { toast.error("Login failed"); }
    finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[hsl(207,96%,10%)] via-primary to-[hsl(207,96%,10%)]">
      <div className="w-full max-w-md mx-4">
        <div className="bg-card rounded-2xl shadow-2xl overflow-hidden">
          <div className="bg-primary p-8 text-center">
            <img src={p4uLogoDark} alt="Planext4u" className="h-16 w-16 object-contain mx-auto mb-3 rounded-xl" />
            <div className="flex items-center justify-center gap-2 mb-1">
              <Store className="h-5 w-5 text-primary-foreground" />
              <h1 className="text-xl font-bold text-primary-foreground">Vendor Portal</h1>
            </div>
            <p className="text-primary-foreground/60 text-xs">Manage your store, orders & settlements</p>
          </div>

          <div className="p-6 space-y-4">
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
              <Button type="submit" className="w-full h-12 rounded-xl text-base gap-2 bg-primary" disabled={loading}>
                {loading ? "Signing in..." : <><LogIn className="h-4 w-4" /> Sign In</>}
              </Button>
            </form>

            <button onClick={quickLogin} disabled={loading}
              className="w-full bg-secondary/50 rounded-xl border border-border/50 p-3 text-center hover:border-primary/40 transition-all">
              <p className="text-xs font-semibold">Quick Demo Login</p>
              <p className="text-[10px] text-muted-foreground">vendor@planext4u.com / P4u@Vendor2026</p>
            </button>

            <div className="text-center space-y-2 pt-2">
              <Link to="/app/login" className="text-xs text-primary hover:underline block">Customer Login →</Link>
              <Link to="/login" className="text-xs text-muted-foreground hover:underline block">Admin Login →</Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
