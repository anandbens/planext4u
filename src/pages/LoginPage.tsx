import { useState } from "react";
import { useAuth, UserRole } from "@/lib/auth";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Eye, EyeOff, LogIn, Shield, Banknote, ShoppingCart } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const QUICK_LOGINS: { email: string; password: string; role: string; icon: any; color: string; desc: string }[] = [
  { email: "admin@marketplace.com", password: "admin123", role: "Admin", icon: Shield, color: "gradient-primary", desc: "Full access to all features" },
  { email: "finance@marketplace.com", password: "finance123", role: "Finance", icon: Banknote, color: "gradient-success", desc: "Settlements, Reports, Tax" },
  { email: "sales@marketplace.com", password: "sales123", role: "Sales", icon: ShoppingCart, color: "gradient-info", desc: "Orders, Customers, Vendors" },
];

export default function LoginPage() {
  const { login } = useAuth();
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
      await login(email, password);
      toast.success("Welcome back!");
      navigate("/", { replace: true });
    } catch { toast.error("Invalid credentials"); }
    finally { setLoading(false); }
  };

  const quickLogin = async (cred: typeof QUICK_LOGINS[0]) => {
    setEmail(cred.email);
    setPassword(cred.password);
    setLoading(true);
    try {
      await login(cred.email, cred.password);
      toast.success(`Welcome, ${cred.role}!`);
      navigate("/", { replace: true });
    } catch { toast.error("Login failed"); }
    finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-lg">
        <div className="text-center mb-8">
          <div className="h-16 w-16 rounded-2xl gradient-primary flex items-center justify-center mx-auto mb-4">
            <span className="text-2xl font-bold text-card">M</span>
          </div>
          <h1 className="text-3xl font-bold tracking-tight">Admin Console</h1>
          <p className="text-base text-muted-foreground mt-1">Sign in to your marketplace dashboard</p>
        </div>

        {/* Quick Login Cards */}
        <div className="grid grid-cols-3 gap-3 mb-6">
          {QUICK_LOGINS.map((cred) => (
            <button
              key={cred.role}
              onClick={() => quickLogin(cred)}
              disabled={loading}
              className="bg-card rounded-xl border border-border/50 p-4 text-center hover:border-primary/40 hover:shadow-lg transition-all group"
            >
              <div className={cn("h-10 w-10 rounded-xl flex items-center justify-center mx-auto mb-2", cred.color)}>
                <cred.icon className="h-5 w-5 text-card" />
              </div>
              <p className="text-sm font-semibold">{cred.role}</p>
              <p className="text-[10px] text-muted-foreground mt-0.5 leading-tight">{cred.desc}</p>
            </button>
          ))}
        </div>

        <div className="bg-card rounded-2xl border border-border/50 p-8" style={{ boxShadow: 'var(--shadow-xl)' }}>
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <Label htmlFor="email" className="text-sm font-medium">Email</Label>
              <Input id="email" type="email" placeholder="admin@marketplace.com" value={email}
                onChange={(e) => setEmail(e.target.value)} className="mt-1.5 h-12 text-base" autoComplete="email" />
            </div>
            <div>
              <div className="flex items-center justify-between">
                <Label htmlFor="password" className="text-sm font-medium">Password</Label>
                <button type="button" className="text-xs text-primary hover:underline">Forgot password?</button>
              </div>
              <div className="relative mt-1.5">
                <Input id="password" type={showPassword ? "text" : "password"} placeholder="Enter your password"
                  value={password} onChange={(e) => setPassword(e.target.value)} className="h-12 text-base pr-10" autoComplete="current-password" />
                <button type="button" onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
            <Button type="submit" className="w-full h-12 text-base gap-2" disabled={loading}>
              {loading ? <div className="h-4 w-4 rounded-full border-2 border-card border-t-transparent animate-spin" /> : <LogIn className="h-4 w-4" />}
              {loading ? "Signing in..." : "Sign In"}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
