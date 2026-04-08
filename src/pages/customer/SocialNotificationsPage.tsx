import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import SocialLayout from "@/components/social/SocialLayout";
import { useFollow } from "@/hooks/use-social-interactions";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { useQuery } from "@tanstack/react-query";

function FollowButton({ targetUserId }: { targetUserId: string }) {
  const { isFollowing, toggleFollow } = useFollow(targetUserId);
  return (
    <Button
      size="sm"
      variant={isFollowing ? "outline" : "default"}
      className="h-8 px-4 text-xs font-semibold rounded-lg"
      onClick={(e) => { e.stopPropagation(); toggleFollow(); }}
    >
      {isFollowing ? "Following" : "Follow"}
    </Button>
  );
}

const NOTIFICATIONS = {
  yesterday: [
    { id: "n1", type: "follow", user: "roirin_femlivart2931ec", text: "started following you.", time: "1d", avatar: "R", showFollow: true },
  ],
  thisWeek: [
    { id: "n2", type: "follow_suggest", user: "imkirtzxzxa", text: ", arus_xsoyal and others you know to see their photos and videos.", time: "1d", avatar: "I", showFollow: true },
    { id: "n3", type: "unfollow", user: "lorem_ipsum", text: " is on Instagram. One_more_acc and 1 other follow them.", time: "3d", avatar: "L", showFollow: true },
  ],
  earlier: [
    { id: "n4", type: "reel_like", user: "brainmemind, sarakbrl", text: " and yashwant_chandel_ liked your reel.", time: "7w", avatar: "B", hasThumb: true },
    { id: "n5", type: "reel_like", user: "brainmemind, hirdesh_10", text: " and 13 others liked your reel.", time: "7w", avatar: "B", hasThumb: true },
    { id: "n6", type: "reel_like", user: "brainmemind, mr_danish_sk_302_", text: " and 202 others liked your reel.", time: "7w", avatar: "B", hasThumb: true },
  ],
};

export default function SocialNotificationsPage() {
  const navigate = useNavigate();
  const { customerUser } = useAuth();
  const currentUserId = customerUser?.supabase_uid || customerUser?.id;

  // Fetch real notifications from DB
  const { data: dbNotifications = [] } = useQuery({
    queryKey: ['social-notifications', currentUserId],
    queryFn: async () => {
      if (!currentUserId) return [];
      const { data } = await supabase
        .from('social_notifications')
        .select('*')
        .eq('user_id', currentUserId)
        .order('created_at', { ascending: false })
        .limit(30);
      return data || [];
    },
    enabled: !!currentUserId,
  });

  const renderNotification = (n: any) => (
    <div key={n.id} className="flex items-center gap-3 py-2.5 px-4">
      <Avatar className="h-11 w-11 shrink-0">
        <AvatarFallback className="bg-gradient-to-br from-amber-400 to-rose-500 text-white text-sm font-bold">
          {n.avatar}
        </AvatarFallback>
      </Avatar>
      <div className="flex-1 min-w-0">
        <p className="text-sm leading-snug">
          <span className="font-semibold">{n.user}</span>{" "}
          <span className="text-muted-foreground">{n.text}</span>{" "}
          <span className="text-muted-foreground text-xs">{n.time}</span>
        </p>
      </div>
      {n.showFollow && n.actor_id ? (
        <FollowButton targetUserId={n.actor_id} />
      ) : n.showFollow ? (
        <Button size="sm" className="h-8 px-4 text-xs font-semibold rounded-lg bg-primary text-primary-foreground">
          Follow
        </Button>
      ) : null}
      {n.hasThumb && (
        <div className="h-10 w-10 rounded bg-muted shrink-0" />
      )}
    </div>
  );

  const content = (
    <div className="pb-20">
      <header className="sticky top-0 z-40 bg-card border-b border-border/30 md:hidden">
        <div className="flex items-center gap-3 px-4 py-3">
          <button onClick={() => navigate(-1)}><ArrowLeft className="h-5 w-5" /></button>
          <h1 className="text-lg font-bold">Notifications</h1>
        </div>
      </header>

      <div className="md:pt-4 pb-4">
        {/* DB notifications */}
        {dbNotifications.length > 0 && (
          <>
            <h2 className="px-4 py-2 text-sm font-bold">Recent</h2>
            {dbNotifications.map((n: any) => (
              <div key={n.id} className="flex items-center gap-3 py-2.5 px-4">
                <Avatar className="h-11 w-11 shrink-0">
                  <AvatarFallback className="bg-gradient-to-br from-primary to-primary/60 text-primary-foreground text-sm font-bold">
                    {n.type === 'like' ? '❤️' : n.type === 'comment' ? '💬' : n.type === 'follow' ? '👤' : '🔔'}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="text-sm">{n.message || 'New notification'}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{new Date(n.created_at).toLocaleDateString()}</p>
                </div>
                {n.type === 'follow' && n.actor_id && <FollowButton targetUserId={n.actor_id} />}
              </div>
            ))}
          </>
        )}

        <h2 className="px-4 py-2 text-sm font-bold">Yesterday</h2>
        {NOTIFICATIONS.yesterday.map(renderNotification)}

        <h2 className="px-4 py-2 text-sm font-bold mt-2">This Week</h2>
        {NOTIFICATIONS.thisWeek.map(renderNotification)}

        <h2 className="px-4 py-2 text-sm font-bold mt-2">Earlier</h2>
        {NOTIFICATIONS.earlier.map(renderNotification)}
      </div>
    </div>
  );

  return <SocialLayout hideRightSidebar>{content}</SocialLayout>;
}
