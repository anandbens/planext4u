import { useState } from "react";
import { useAuth } from "@/lib/auth";
import { useNavigate, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Eye, EyeOff, LogIn, Shield, Banknote, ShoppingCart } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import p4uLogoDark from "@/assets/p4u-logo-dark.png";

const QUICK_LOGINS = [
  { email: "admin@planext4u.com", password: "P4u@Admin2026", role: "Admin", icon: Shield, color: "bg-[hsl(207,96%,10%)]", desc: "Full access" },
  { email: "finance@planext4u.com", password: "P4u@Finance2026", role: "Finance", icon: Banknote, color: "bg-success", desc: "Reports & Tax" },
  { email: "sales@planext4u.com", password: "P4u@Sales2026", role: "Sales", icon: ShoppingCart, color: "bg-info", desc: "Orders & CRM" },
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
    } catch { toast.error("Invalid admin credentials. Only authorized admin accounts can login."); }
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
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[hsl(207,96%,10%)] via-[hsl(207,80%,15%)] to-[hsl(207,96%,10%)]">
      <div className="w-full max-w-md mx-4">
        <div className="bg-card rounded-2xl shadow-2xl overflow-hidden">
          {/* Header */}
          <div className="bg-[hsl(207,96%,10%)] p-8 text-center">
            <img src={p4uLogoDark} alt="Planext4u" className="h-20 w-20 object-contain mx-auto mb-3 rounded-xl" />
            <h1 className="text-xl font-bold text-white">Admin Portal</h1>
            <p className="text-white/60 text-xs mt-1">Restricted access — Authorized personnel only</p>
          </div>

          {/* Form */}
          <div className="p-6 space-y-4">
            <form onSubmit={handleSubmit} className="space-y-4">
              <Input placeholder="Admin Email" value={email} onChange={(e) => setEmail(e.target.value)}
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
              <Button type="submit" className="w-full h-12 rounded-xl text-base gap-2 bg-primary hover:bg-primary/90" disabled={loading}>
                {loading ? "Signing in..." : <><LogIn className="h-4 w-4" /> Sign In</>}
              </Button>
            </form>

            {/* Quick Login */}
            <div className="border-t border-border/50 pt-4">
              <p className="text-xs text-muted-foreground text-center mb-3">Quick Login (Demo)</p>
              <div className="grid grid-cols-3 gap-2">
                {QUICK_LOGINS.map((cred) => (
                  <button key={cred.role} onClick={() => quickLogin(cred)} disabled={loading}
                    className="bg-secondary/50 rounded-xl border border-border/50 p-3 text-center hover:border-primary/40 hover:shadow-md transition-all">
                    <div className={cn("h-8 w-8 rounded-lg flex items-center justify-center mx-auto mb-1.5", cred.color)}>
                      <cred.icon className="h-4 w-4 text-white" />
                    </div>
                    <p className="text-xs font-semibold">{cred.role}</p>
                    <p className="text-[9px] text-muted-foreground">{cred.desc}</p>
                  </button>
                ))}
              </div>
            </div>

            <div className="text-center space-y-2 pt-2">
              <Link to="/app/login" className="text-xs text-primary hover:underline block">Customer Login →</Link>
              <Link to="/vendor/login" className="text-xs text-primary hover:underline block">Vendor Login →</Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
