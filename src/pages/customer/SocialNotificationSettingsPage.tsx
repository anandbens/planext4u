import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import SocialLayout from "@/components/social/SocialLayout";

export default function SocialNotificationSettingsPage() {
  const navigate = useNavigate();

  const [pushEnabled, setPushEnabled] = useState(true);
  const [emailEnabled, setEmailEnabled] = useState(true);
  const [likesAlert, setLikesAlert] = useState(true);
  const [commentsAlert, setCommentsAlert] = useState(true);
  const [followsAlert, setFollowsAlert] = useState(true);
  const [messagesAlert, setMessagesAlert] = useState(true);
  const [mentionsAlert, setMentionsAlert] = useState(true);
  const [liveAlert, setLiveAlert] = useState(false);
  const [productAlert, setProductAlert] = useState(true);

  const content = (
    <div className="pb-20 md:pb-8">
      <header className="sticky top-0 z-40 bg-card border-b border-border/30">
        <div className="flex items-center gap-3 px-4 py-3">
          <button onClick={() => navigate(-1)}><ArrowLeft className="h-5 w-5" /></button>
          <h1 className="text-lg font-bold">Notifications</h1>
        </div>
      </header>

      <div className="max-w-lg mx-auto p-4 space-y-6">
        {/* Push & Email */}
        <div>
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Channels</h3>
          <div className="bg-card rounded-xl border border-border/30 divide-y divide-border/20">
            <div className="flex items-center justify-between px-4 py-3">
              <div className="flex-1 mr-3">
                <p className="text-sm font-medium">Push Notifications</p>
                <p className="text-xs text-muted-foreground">Receive notifications on your device</p>
              </div>
              <Switch checked={pushEnabled} onCheckedChange={(v) => { setPushEnabled(v); toast.success(v ? "Push notifications enabled" : "Push notifications disabled"); }} />
            </div>
            <div className="flex items-center justify-between px-4 py-3">
              <div className="flex-1 mr-3">
                <p className="text-sm font-medium">Email Notifications</p>
                <p className="text-xs text-muted-foreground">Get email updates for important activity</p>
              </div>
              <Switch checked={emailEnabled} onCheckedChange={(v) => { setEmailEnabled(v); toast.success(v ? "Email notifications enabled" : "Email notifications disabled"); }} />
            </div>
          </div>
        </div>

        {/* Activity Alerts */}
        <div>
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Activity Alerts</h3>
          <div className="bg-card rounded-xl border border-border/30 divide-y divide-border/20">
            {[
              { label: "Likes", desc: "When someone likes your post", state: likesAlert, set: setLikesAlert },
              { label: "Comments", desc: "When someone comments on your post", state: commentsAlert, set: setCommentsAlert },
              { label: "New Followers", desc: "When someone follows you", state: followsAlert, set: setFollowsAlert },
              { label: "Messages", desc: "When you receive a direct message", state: messagesAlert, set: setMessagesAlert },
              { label: "Mentions", desc: "When someone mentions you", state: mentionsAlert, set: setMentionsAlert },
              { label: "Live Videos", desc: "When someone you follow goes live", state: liveAlert, set: setLiveAlert },
              { label: "Product Updates", desc: "Offers & deals from shops you follow", state: productAlert, set: setProductAlert },
            ].map((item) => (
              <div key={item.label} className="flex items-center justify-between px-4 py-3">
                <div className="flex-1 mr-3">
                  <p className="text-sm font-medium">{item.label}</p>
                  <p className="text-xs text-muted-foreground">{item.desc}</p>
                </div>
                <Switch checked={item.state} onCheckedChange={(v) => { item.set(v); toast.success(`${item.label} ${v ? 'enabled' : 'disabled'}`); }} />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );

  return <SocialLayout hideSidebar>{content}</SocialLayout>;
}
