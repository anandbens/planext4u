import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import SocialLayout from "@/components/social/SocialLayout";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { useQuery, useQueryClient } from "@tanstack/react-query";

export default function SocialPrivacyPage() {
  const navigate = useNavigate();
  const { customerUser } = useAuth();
  const qc = useQueryClient();
  const currentUserId = customerUser?.supabase_uid || customerUser?.id;

  const { data: profile } = useQuery({
    queryKey: ['social-privacy-profile', currentUserId],
    queryFn: async () => {
      if (!currentUserId) return null;
      const { data } = await supabase.from('social_profiles').select('*').eq('user_id', currentUserId).maybeSingle();
      return data;
    },
    enabled: !!currentUserId,
  });

  const [isPrivate, setIsPrivate] = useState(false);
  const [activityStatus, setActivityStatus] = useState(true);
  const [whoCanMessage, setWhoCanMessage] = useState("everyone");
  const [whoCanComment, setWhoCanComment] = useState("everyone");
  const [hideLikes, setHideLikes] = useState(false);
  const [restrictComments, setRestrictComments] = useState(false);

  useEffect(() => {
    if (profile) {
      setIsPrivate((profile as any).is_private || false);
      setActivityStatus((profile as any).activity_status !== false);
    }
  }, [profile]);

  const update = async (field: string, value: any) => {
    if (!currentUserId) return;
    await supabase.from('social_profiles').update({ [field]: value } as any).eq('user_id', currentUserId);
    qc.invalidateQueries({ queryKey: ['social-privacy-profile'] });
    qc.invalidateQueries({ queryKey: ['social-settings-profile'] });
  };

  const content = (
    <div className="pb-20 md:pb-8">
      <header className="sticky top-0 z-40 bg-card border-b border-border/30">
        <div className="flex items-center gap-3 px-4 py-3">
          <button onClick={() => navigate(-1)}><ArrowLeft className="h-5 w-5" /></button>
          <h1 className="text-lg font-bold">Privacy</h1>
        </div>
      </header>

      <div className="max-w-lg mx-auto p-4 space-y-6">
        {/* Account Privacy */}
        <div>
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Account Privacy</h3>
          <div className="bg-card rounded-xl border border-border/30 divide-y divide-border/20">
            <div className="flex items-center justify-between px-4 py-3">
              <div className="flex-1 mr-3">
                <p className="text-sm font-medium">Private Account</p>
                <p className="text-xs text-muted-foreground">When enabled, only people you approve can see your posts, stories, and profile</p>
              </div>
              <Switch checked={isPrivate} onCheckedChange={(v) => {
                setIsPrivate(v);
                update('is_private', v);
                toast.success(v ? "Account set to private" : "Account set to public");
              }} />
            </div>
            <div className="flex items-center justify-between px-4 py-3">
              <div className="flex-1 mr-3">
                <p className="text-sm font-medium">Activity Status</p>
                <p className="text-xs text-muted-foreground">Show when you're active on the app</p>
              </div>
              <Switch checked={activityStatus} onCheckedChange={(v) => {
                setActivityStatus(v);
                update('activity_status', v);
                toast.success(v ? "Activity visible" : "Activity hidden");
              }} />
            </div>
          </div>
        </div>

        {/* Interactions */}
        <div>
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Interactions</h3>
          <div className="bg-card rounded-xl border border-border/30 divide-y divide-border/20">
            <div className="flex items-center justify-between px-4 py-3">
              <div className="flex-1 mr-3">
                <p className="text-sm font-medium">Who can message you</p>
              </div>
              <Select value={whoCanMessage} onValueChange={(v) => { setWhoCanMessage(v); toast.success("Message setting updated"); }}>
                <SelectTrigger className="w-[130px] h-8 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="everyone">Everyone</SelectItem>
                  <SelectItem value="followers">Followers Only</SelectItem>
                  <SelectItem value="nobody">Nobody</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center justify-between px-4 py-3">
              <div className="flex-1 mr-3">
                <p className="text-sm font-medium">Who can comment</p>
              </div>
              <Select value={whoCanComment} onValueChange={(v) => { setWhoCanComment(v); toast.success("Comment setting updated"); }}>
                <SelectTrigger className="w-[130px] h-8 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="everyone">Everyone</SelectItem>
                  <SelectItem value="followers">Followers Only</SelectItem>
                  <SelectItem value="nobody">Nobody</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        {/* Content */}
        <div>
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Content</h3>
          <div className="bg-card rounded-xl border border-border/30 divide-y divide-border/20">
            <div className="flex items-center justify-between px-4 py-3">
              <div className="flex-1 mr-3">
                <p className="text-sm font-medium">Hide Like Counts</p>
                <p className="text-xs text-muted-foreground">Others won't be able to see likes on your posts</p>
              </div>
              <Switch checked={hideLikes} onCheckedChange={(v) => { setHideLikes(v); toast.success(v ? "Like counts hidden" : "Like counts visible"); }} />
            </div>
            <div className="flex items-center justify-between px-4 py-3">
              <div className="flex-1 mr-3">
                <p className="text-sm font-medium">Restrict Comments</p>
                <p className="text-xs text-muted-foreground">Filter offensive comments automatically</p>
              </div>
              <Switch checked={restrictComments} onCheckedChange={(v) => { setRestrictComments(v); toast.success(v ? "Comment filter on" : "Comment filter off"); }} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  return <SocialLayout hideSidebar>{content}</SocialLayout>;
}
