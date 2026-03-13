import { useState } from "react";
import { useAuth } from "@/lib/auth";
import { useNavigate, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Eye, EyeOff, LogIn, Shield, Banknote, ShoppingCart, Mail, Phone } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import p4uLogo from "@/assets/p4u-logo.png";

const QUICK_LOGINS: { email: string; password: string; role: string; icon: any; color: string; desc: string }[] = [
  { email: "admin@marketplace.com", password: "admin123", role: "Admin", icon: Shield, color: "bg-primary", desc: "Full access to all features" },
  { email: "finance@marketplace.com", password: "finance123", role: "Finance", icon: Banknote, color: "bg-success", desc: "Settlements, Reports, Tax" },
  { email: "sales@marketplace.com", password: "sales123", role: "Sales", icon: ShoppingCart, color: "bg-info", desc: "Orders, Customers, Vendors" },
];

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [mode, setMode] = useState<"email" | "mobile" | "otp">("email");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [mobile, setMobile] = useState("");
  const [otp, setOtp] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [otpTimer, setOtpTimer] = useState(30);

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

  const sendOtp = () => {
    if (mode === "email" && !email.trim()) { toast.error("Please enter email"); return; }
    if (mode === "mobile" && !mobile.trim()) { toast.error("Please enter mobile number"); return; }
    setMode("otp");
    setOtpTimer(30);
    toast.success("OTP sent! Use 150538 for demo");
    const interval = setInterval(() => {
      setOtpTimer(prev => {
        if (prev <= 1) { clearInterval(interval); return 0; }
        return prev - 1;
      });
    }, 1000);
  };

  const verifyOtp = async () => {
    if (otp.length < 6) { toast.error("Please enter complete OTP"); return; }
    setLoading(true);
    try {
      await login(email || "customer@p4u.com", "otp-login");
      toast.success("Welcome to Planext4u!");
      navigate("/app", { replace: true });
    } catch { toast.error("Verification failed"); }
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

  if (mode === "otp") {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <div className="flex-1 flex flex-col items-center justify-center p-6">
          <button onClick={() => setMode("email")} className="self-start mb-8 text-muted-foreground hover:text-foreground text-sm">
            ← Back
          </button>
          <h1 className="text-2xl font-bold">Enter confirmation code</h1>
          <p className="text-sm text-muted-foreground mt-2 text-center">
            A 6-digit code was sent to<br />
            {email || mobile}
          </p>
          <p className="text-sm font-mono mt-3 text-primary">
            {Math.floor(otpTimer / 60).toString().padStart(2, '0')}:{(otpTimer % 60).toString().padStart(2, '0')}
          </p>
          <div className="mt-6">
            <InputOTP maxLength={6} value={otp} onChange={setOtp}>
              <InputOTPGroup>
                {[0,1,2,3,4,5].map(i => (
                  <InputOTPSlot key={i} index={i} className="h-12 w-12 text-lg border-border" />
                ))}
              </InputOTPGroup>
            </InputOTP>
          </div>
          <p className="text-sm mt-4 text-muted-foreground">
            Don't get the OTP?{" "}
            <button onClick={sendOtp} className="text-primary font-semibold hover:underline" disabled={otpTimer > 0}>
              Resend Code
            </button>
          </p>
          <Button className="w-full max-w-xs mt-8 h-12" onClick={verifyOtp} disabled={loading || otp.length < 6}>
            {loading ? "Verifying..." : "Verify & Continue"}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* P4U Branded Header */}
      <div className="bg-primary pt-12 pb-16 px-6 flex flex-col items-center relative">
        <Link to="/app" className="absolute top-4 right-4 bg-primary-foreground/20 text-primary-foreground text-xs px-4 py-1.5 rounded-full hover:bg-primary-foreground/30 transition-colors">
          skip
        </Link>
        <img src={p4uLogo} alt="Planext4u" className="h-20 w-20 object-contain mb-2" />
        <h2 className="text-primary-foreground text-xl font-bold tracking-wider">Planext 4u</h2>
        <span className="text-primary-foreground/60 text-[10px] absolute top-14 right-[calc(50%-40px)] font-semibold">TM</span>
      </div>

      {/* Login Form */}
      <div className="flex-1 bg-card -mt-6 rounded-t-3xl px-6 pt-8 pb-6">
        <h2 className="text-xl font-bold text-center mb-6">Log in or Sign up</h2>

        {mode === "email" ? (
          <form onSubmit={handleSubmit} className="space-y-4 max-w-sm mx-auto">
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Enter E-mail ID" value={email} onChange={(e) => setEmail(e.target.value)}
                className="pl-10 h-12 text-base border-border/60 rounded-xl" />
            </div>
            <div className="relative">
              <Input type={showPassword ? "text" : "password"} placeholder="Enter password"
                value={password} onChange={(e) => setPassword(e.target.value)}
                className="h-12 text-base pr-10 border-border/60 rounded-xl" />
              <button type="button" onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            <Button type="submit" className="w-full h-12 rounded-xl text-base gap-2" disabled={loading}>
              {loading ? "Signing in..." : <><LogIn className="h-4 w-4" /> Sign In</>}
            </Button>
            <Button type="button" variant="outline" className="w-full h-12 rounded-xl text-base" onClick={sendOtp}>
              Send OTP →
            </Button>
            <button type="button" className="text-sm text-primary w-full text-center hover:underline" onClick={() => setMode("mobile")}>
              Or Mobile Number
            </button>
          </form>
        ) : (
          <div className="space-y-4 max-w-sm mx-auto">
            <div className="relative">
              <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Enter Mobile Number" value={mobile} onChange={(e) => setMobile(e.target.value)}
                className="pl-10 h-12 text-base border-border/60 rounded-xl" type="tel" />
            </div>
            <Button className="w-full h-12 rounded-xl text-base" onClick={sendOtp}>
              Send OTP →
            </Button>
            <button type="button" className="text-sm text-primary w-full text-center hover:underline" onClick={() => setMode("email")}>
              Or E-mail ID
            </button>
          </div>
        )}

        <div className="mt-6 text-center">
          <p className="text-xs text-muted-foreground mb-3">Or login with</p>
          <div className="flex justify-center gap-4">
            {["G", "f", ""].map((icon, i) => (
              <button key={i} className="h-12 w-12 rounded-full border border-border flex items-center justify-center hover:bg-secondary transition-colors text-lg font-bold">
                {i === 0 ? "G" : i === 1 ? "f" : "🍎"}
              </button>
            ))}
          </div>
        </div>

        {/* Admin Quick Login Section */}
        <div className="mt-8 border-t border-border/50 pt-6 max-w-sm mx-auto">
          <p className="text-xs text-muted-foreground text-center mb-3">Admin Quick Login</p>
          <div className="grid grid-cols-3 gap-2">
            {QUICK_LOGINS.map((cred) => (
              <button key={cred.role} onClick={() => quickLogin(cred)} disabled={loading}
                className="bg-secondary/50 rounded-xl border border-border/50 p-3 text-center hover:border-primary/40 hover:shadow-md transition-all">
                <div className={cn("h-8 w-8 rounded-lg flex items-center justify-center mx-auto mb-1.5", cred.color)}>
                  <cred.icon className="h-4 w-4 text-primary-foreground" />
                </div>
                <p className="text-xs font-semibold">{cred.role}</p>
                <p className="text-[9px] text-muted-foreground leading-tight">{cred.desc}</p>
              </button>
            ))}
          </div>
        </div>

        <p className="text-[10px] text-muted-foreground text-center mt-6">
          By continuing, you agree to our{" "}
          <span className="underline">Terms of service</span>{" "}
          <span className="underline">Privacy Policy</span>{" "}
          <span className="underline">Content Policies</span>
        </p>
      </div>
    </div>
  );
}
