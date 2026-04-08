import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, User, Lock, Bell, Eye, Shield, HelpCircle, Info, LogOut, ChevronRight, Moon } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import SocialLayout from "@/components/social/SocialLayout";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";

const SETTINGS_SECTIONS = [
  {
    title: "Account",
    items: [
      { label: "Edit Profile", icon: User, action: "edit_profile" },
      { label: "Change Password", icon: Lock, action: "change_password" },
      { label: "Privacy", icon: Eye, action: "privacy" },
      { label: "Security", icon: Shield, action: "security" },
    ],
  },
  {
    title: "Preferences",
    items: [
      { label: "Notifications", icon: Bell, action: "notifications" },
      { label: "Dark Mode", icon: Moon, action: "dark_mode", isToggle: true },
    ],
  },
  {
    title: "Support",
    items: [
      { label: "Help Center", icon: HelpCircle, action: "help" },
      { label: "About", icon: Info, action: "about" },
    ],
  },
];

export default function SocialSettingsPage() {
  const navigate = useNavigate();
  const { customerUser, customerLogout } = useAuth();
  const qc = useQueryClient();
  const [darkMode, setDarkMode] = useState(document.documentElement.classList.contains("dark"));
  const [showAbout, setShowAbout] = useState(false);
  const currentUserId = customerUser?.supabase_uid || customerUser?.id;

  // Fetch profile for privacy toggles
  const { data: profile } = useQuery({
    queryKey: ['social-settings-profile', currentUserId],
    queryFn: async () => {
      if (!currentUserId) return null;
      const { data } = await supabase.from('social_profiles').select('*').eq('user_id', currentUserId).maybeSingle();
      return data;
    },
    enabled: !!currentUserId,
  });

  const [privateAccount, setPrivateAccount] = useState(false);
  const [activityStatus, setActivityStatus] = useState(true);

  // Sync from DB
  useState(() => {
    if (profile) {
      setPrivateAccount((profile as any).is_private || false);
      setActivityStatus((profile as any).activity_status !== false);
    }
  });

  const updateProfile = async (field: string, value: boolean) => {
    if (!currentUserId) return;
    await supabase.from('social_profiles').update({ [field]: value } as any).eq('user_id', currentUserId);
    qc.invalidateQueries({ queryKey: ['social-settings-profile'] });
  };

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
      customerLogout();
      toast.success("Logged out successfully");
      navigate("/app/login");
    } catch {
      toast.error("Failed to logout");
    }
  };

  const handleAction = (action: string) => {
    switch (action) {
      case "edit_profile": navigate("/app/social/edit-profile"); break;
      case "change_password": navigate("/app/social/change-password"); break;
      case "notifications": navigate("/app/social/notification-settings"); break;
      case "privacy": navigate("/app/social/privacy"); break;
      case "security": navigate("/app/social/security"); break;
      case "help": navigate("/app/social/help"); break;
      case "about": setShowAbout(v => !v); break;
      case "dark_mode":
        setDarkMode(!darkMode);
        document.documentElement.classList.toggle("dark");
        toast.success(darkMode ? "Light mode" : "Dark mode");
        break;
      default: toast.info(`${action} coming soon`);
    }
  };

  const content = (
    <div className="pb-20">
      <header className="sticky top-0 z-40 bg-card border-b border-border/30 md:hidden">
        <div className="flex items-center gap-3 px-4 py-3">
          <button onClick={() => navigate(-1)}><ArrowLeft className="h-5 w-5" /></button>
          <h1 className="text-lg font-bold">Settings</h1>
        </div>
      </header>

      <div className="p-4 space-y-6 max-w-lg mx-auto">
        {SETTINGS_SECTIONS.map((section) => (
          <div key={section.title}>
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">{section.title}</h3>
            <div className="bg-card rounded-xl border border-border/30 divide-y divide-border/20">
              {section.items.map((item) => (
                <button
                  key={item.label}
                  className="w-full flex items-center gap-3 px-4 py-3 text-sm hover:bg-muted/50 transition-colors"
                  onClick={() => handleAction(item.action)}
                >
                  <item.icon className="h-5 w-5 text-muted-foreground" />
                  <span className="flex-1 text-left font-medium">{item.label}</span>
                  {item.isToggle ? (
                    <Switch checked={darkMode} />
                  ) : (
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  )}
                </button>
              ))}
            </div>
          </div>
        ))}

        {/* About Section */}
        {showAbout && (
          <div className="bg-card rounded-xl border border-border/30 p-4 space-y-3">
            <h3 className="text-sm font-bold">About Planext4U</h3>
            <div className="space-y-2 text-sm text-muted-foreground">
              <p><span className="font-medium text-foreground">App Version:</span> 1.0.0</p>
              <p><span className="font-medium text-foreground">Company:</span> Planext4U Technologies Pvt Ltd</p>
              <p><span className="font-medium text-foreground">Contact:</span> support@planext4u.com</p>
            </div>
            <div className="flex gap-3 pt-2">
              <button onClick={() => navigate("/app/terms")} className="text-xs text-primary font-semibold">Terms of Service</button>
              <button onClick={() => navigate("/app/privacy")} className="text-xs text-primary font-semibold">Privacy Policy</button>
            </div>
          </div>
        )}

        {/* Privacy Controls */}
        <div>
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Privacy Controls</h3>
          <div className="bg-card rounded-xl border border-border/30 divide-y divide-border/20">
            <div className="flex items-center justify-between px-4 py-3">
              <div>
                <p className="text-sm font-medium">Private Account</p>
                <p className="text-xs text-muted-foreground">Only followers can see your posts</p>
              </div>
              <Switch checked={privateAccount} onCheckedChange={(v) => {
                setPrivateAccount(v);
                updateProfile('is_private', v);
                toast.success(v ? "Account set to private" : "Account set to public");
              }} />
            </div>
            <div className="flex items-center justify-between px-4 py-3">
              <div>
                <p className="text-sm font-medium">Activity Status</p>
                <p className="text-xs text-muted-foreground">Show when you're online</p>
              </div>
              <Switch checked={activityStatus} onCheckedChange={(v) => {
                setActivityStatus(v);
                updateProfile('activity_status', v);
                toast.success(v ? "Activity visible" : "Activity hidden");
              }} />
            </div>
          </div>
        </div>

        {/* Logout */}
        <button
          className="w-full flex items-center gap-3 px-4 py-3 text-sm font-semibold text-destructive bg-card rounded-xl border border-border/30 hover:bg-destructive/10 transition-colors"
          onClick={handleLogout}
        >
          <LogOut className="h-5 w-5" />
          Log Out
        </button>
      </div>
    </div>
  );

  return <SocialLayout hideRightSidebar>{content}</SocialLayout>;
}
