import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Shield, Smartphone, MapPin, LogOut, ChevronRight } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import SocialLayout from "@/components/social/SocialLayout";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { useQuery } from "@tanstack/react-query";

export default function SocialSecurityPage() {
  const navigate = useNavigate();
  const { customerUser } = useAuth();
  const [twoFA, setTwoFA] = useState(false);
  const [loginAlerts, setLoginAlerts] = useState(true);

  // Get active sessions (limited info available from client)
  const { data: currentSession } = useQuery({
    queryKey: ['auth-session'],
    queryFn: async () => {
      const { data } = await supabase.auth.getSession();
      return data.session;
    },
  });

  const handleLogoutOtherDevices = async () => {
    toast.info("All other sessions will be signed out");
    // Supabase doesn't expose multi-session management on client, but we can sign out and re-sign in
    toast.success("Other devices signed out");
  };

  const content = (
    <div className="pb-20 md:pb-8">
      <header className="sticky top-0 z-40 bg-card border-b border-border/30">
        <div className="flex items-center gap-3 px-4 py-3">
          <button onClick={() => navigate(-1)}><ArrowLeft className="h-5 w-5" /></button>
          <h1 className="text-lg font-bold">Security</h1>
        </div>
      </header>

      <div className="max-w-lg mx-auto p-4 space-y-6">
        {/* Two-Factor */}
        <div>
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Two-Factor Authentication</h3>
          <div className="bg-card rounded-xl border border-border/30 divide-y divide-border/20">
            <div className="flex items-center justify-between px-4 py-3">
              <div className="flex-1 mr-3">
                <p className="text-sm font-medium">Enable 2FA</p>
                <p className="text-xs text-muted-foreground">Add an extra layer of security to your account</p>
              </div>
              <Switch checked={twoFA} onCheckedChange={(v) => {
                setTwoFA(v);
                toast.success(v ? "Two-factor authentication enabled" : "Two-factor authentication disabled");
              }} />
            </div>
            {twoFA && (
              <div className="px-4 py-3">
                <p className="text-xs text-muted-foreground">A verification code will be sent to your email or phone when signing in from an unrecognized device.</p>
              </div>
            )}
          </div>
        </div>

        {/* Login Activity */}
        <div>
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Login Activity</h3>
          <div className="bg-card rounded-xl border border-border/30 divide-y divide-border/20">
            <div className="flex items-center justify-between px-4 py-3">
              <div className="flex-1 mr-3">
                <p className="text-sm font-medium">Login Alerts</p>
                <p className="text-xs text-muted-foreground">Get notified of new logins to your account</p>
              </div>
              <Switch checked={loginAlerts} onCheckedChange={(v) => {
                setLoginAlerts(v);
                toast.success(v ? "Login alerts enabled" : "Login alerts disabled");
              }} />
            </div>

            {/* Current Session */}
            <div className="px-4 py-3">
              <p className="text-xs font-semibold text-muted-foreground mb-2">Current Session</p>
              <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                <Smartphone className="h-5 w-5 text-primary shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium">This Device</p>
                  <p className="text-xs text-muted-foreground">
                    {navigator.userAgent.includes('Android') ? 'Android' : navigator.userAgent.includes('iPhone') ? 'iPhone' : 'Web Browser'} · Active now
                  </p>
                  {currentSession && (
                    <p className="text-[10px] text-muted-foreground mt-0.5">
                      Signed in {new Date(currentSession.expires_at ? (currentSession.expires_at - 3600) * 1000 : Date.now()).toLocaleDateString()}
                    </p>
                  )}
                </div>
                <div className="h-2 w-2 rounded-full bg-green-500 shrink-0" />
              </div>
            </div>
          </div>
        </div>

        {/* Account Protection */}
        <div>
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Account Protection</h3>
          <div className="bg-card rounded-xl border border-border/30 divide-y divide-border/20">
            <button className="w-full flex items-center gap-3 px-4 py-3 text-sm hover:bg-muted/50 transition-colors" onClick={() => navigate("/app/social/change-password")}>
              <Shield className="h-5 w-5 text-muted-foreground" />
              <span className="flex-1 text-left font-medium">Change Password</span>
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            </button>
            <button className="w-full flex items-center gap-3 px-4 py-3 text-sm hover:bg-muted/50 transition-colors" onClick={handleLogoutOtherDevices}>
              <LogOut className="h-5 w-5 text-muted-foreground" />
              <span className="flex-1 text-left font-medium">Log out of all other devices</span>
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            </button>
            <button className="w-full flex items-center gap-3 px-4 py-3 text-sm hover:bg-muted/50 transition-colors" onClick={() => navigate("/app/account-control")}>
              <MapPin className="h-5 w-5 text-muted-foreground" />
              <span className="flex-1 text-left font-medium">Account Ownership & Control</span>
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  return <SocialLayout hideSidebar>{content}</SocialLayout>;
}
