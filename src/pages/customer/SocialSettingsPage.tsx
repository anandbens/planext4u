import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, User, Lock, Bell, Eye, Shield, HelpCircle, Info, LogOut, ChevronRight, Moon, Sun } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import SocialLayout from "@/components/social/SocialLayout";

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
  const [darkMode, setDarkMode] = useState(false);
  const [privateAccount, setPrivateAccount] = useState(false);
  const [activityStatus, setActivityStatus] = useState(true);

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
                  onClick={() => {
                    if (item.action === "dark_mode") {
                      setDarkMode(!darkMode);
                      document.documentElement.classList.toggle("dark");
                      toast.success(darkMode ? "Light mode" : "Dark mode");
                    } else {
                      toast.info(`${item.label} coming soon`);
                    }
                  }}
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

        {/* Privacy toggles */}
        <div>
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Privacy Controls</h3>
          <div className="bg-card rounded-xl border border-border/30 divide-y divide-border/20">
            <div className="flex items-center justify-between px-4 py-3">
              <div>
                <p className="text-sm font-medium">Private Account</p>
                <p className="text-xs text-muted-foreground">Only followers can see your posts</p>
              </div>
              <Switch checked={privateAccount} onCheckedChange={(v) => { setPrivateAccount(v); toast.success(v ? "Account set to private" : "Account set to public"); }} />
            </div>
            <div className="flex items-center justify-between px-4 py-3">
              <div>
                <p className="text-sm font-medium">Activity Status</p>
                <p className="text-xs text-muted-foreground">Show when you're online</p>
              </div>
              <Switch checked={activityStatus} onCheckedChange={(v) => { setActivityStatus(v); toast.success(v ? "Activity visible" : "Activity hidden"); }} />
            </div>
          </div>
        </div>

        {/* Logout */}
        <button
          className="w-full flex items-center gap-3 px-4 py-3 text-sm font-semibold text-destructive bg-card rounded-xl border border-border/30 hover:bg-destructive/10 transition-colors"
          onClick={() => toast.info("Logout coming soon")}
        >
          <LogOut className="h-5 w-5" />
          Log Out
        </button>
      </div>
    </div>
  );

  return <SocialLayout hideRightSidebar>{content}</SocialLayout>;
}
