import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import SocialLayout from "@/components/social/SocialLayout";
import { useFollow } from "@/hooks/use-social-interactions";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

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

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d`;
  return `${Math.floor(days / 7)}w`;
}

export default function SocialNotificationsPage() {
  const navigate = useNavigate();
  const { customerUser } = useAuth();
  const qc = useQueryClient();
  const currentUserId = customerUser?.supabase_uid || customerUser?.id;

  const { data: notifications = [], isLoading } = useQuery({
    queryKey: ['social-notifications', currentUserId],
    queryFn: async () => {
      if (!currentUserId) return [];
      const { data } = await supabase
        .from('social_notifications')
        .select('*')
        .eq('user_id', currentUserId)
        .order('created_at', { ascending: false })
        .limit(50);
      return data || [];
    },
    enabled: !!currentUserId,
  });

  // Fetch actor profiles
  const actorIds = [...new Set(notifications.map((n: any) => n.actor_id).filter(Boolean))];
  const { data: actorProfiles = [] } = useQuery({
    queryKey: ['social-actor-profiles', actorIds.join(',')],
    queryFn: async () => {
      if (actorIds.length === 0) return [];
      const { data } = await supabase.from('social_profiles').select('user_id, username, display_name, avatar_url').in('user_id', actorIds);
      return data || [];
    },
    enabled: actorIds.length > 0,
  });
  const profileMap = new Map(actorProfiles.map((p: any) => [p.user_id, p]));

  // Mark all as read on mount
  const markRead = useMutation({
    mutationFn: async () => {
      if (!currentUserId) return;
      await supabase.from('social_notifications').update({ is_read: true } as any).eq('user_id', currentUserId).eq('is_read', false);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['social-notifications'] }),
  });

  // Mark read on mount
  useQuery({
    queryKey: ['mark-notifications-read', currentUserId],
    queryFn: async () => {
      if (!currentUserId) return null;
      await supabase.from('social_notifications').update({ is_read: true } as any).eq('user_id', currentUserId).eq('is_read', false);
      return true;
    },
    enabled: !!currentUserId && notifications.some((n: any) => !n.is_read),
  });

  const getIcon = (type: string) => {
    switch (type) {
      case 'like': return '❤️';
      case 'comment': case 'reply': return '💬';
      case 'follow': return '👤';
      case 'repost': return '🔄';
      default: return '🔔';
    }
  };

  const handleNotificationClick = (n: any) => {
    if (n.type === 'follow' && n.actor_id) {
      const prof = profileMap.get(n.actor_id);
      navigate(`/app/social/profile/${n.actor_id}`);
    } else if ((n.type === 'like' || n.type === 'comment' || n.type === 'reply' || n.type === 'repost') && n.reference_id) {
      navigate(`/app/social/post/${n.reference_id}`);
    } else {
      navigate('/app/social');
    }
  };

  // Group notifications by time period
  const today: any[] = [];
  const thisWeek: any[] = [];
  const earlier: any[] = [];
  const now = Date.now();
  notifications.forEach((n: any) => {
    const age = now - new Date(n.created_at).getTime();
    if (age < 24 * 60 * 60 * 1000) today.push(n);
    else if (age < 7 * 24 * 60 * 60 * 1000) thisWeek.push(n);
    else earlier.push(n);
  });

  const renderNotification = (n: any) => {
    const actor = profileMap.get(n.actor_id);
    const actorName = actor?.display_name || actor?.username || 'Someone';
    return (
      <button
        key={n.id}
        onClick={() => handleNotificationClick(n)}
        className={`w-full flex items-center gap-3 py-2.5 px-4 hover:bg-muted/50 transition-colors text-left ${!n.is_read ? 'bg-primary/5' : ''}`}
      >
        <div className="h-11 w-11 rounded-full shrink-0 overflow-hidden bg-muted flex items-center justify-center">
          {actor?.avatar_url ? (
            <img src={actor.avatar_url} alt="" className="w-full h-full object-cover" />
          ) : (
            <span className="text-lg">{getIcon(n.type)}</span>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm leading-snug">
            <span className="font-semibold">{actorName}</span>{" "}
            <span className="text-muted-foreground">{n.message || 'interacted with your content'}</span>{" "}
            <span className="text-muted-foreground text-xs">{timeAgo(n.created_at)}</span>
          </p>
        </div>
        {n.type === 'follow' && n.actor_id && <FollowButton targetUserId={n.actor_id} />}
      </button>
    );
  };

  const content = (
    <div className="pb-28">
      <header className="sticky top-0 z-40 bg-card border-b border-border/30 md:hidden">
        <div className="flex items-center gap-3 px-4 py-3">
          <button onClick={() => navigate(-1)}><ArrowLeft className="h-5 w-5" /></button>
          <h1 className="text-lg font-bold">Notifications</h1>
        </div>
      </header>

      <div className="md:pt-4 pb-4">
        {isLoading ? (
          <div className="flex justify-center py-16">
            <div className="h-8 w-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
          </div>
        ) : notifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 px-4">
            <span className="text-4xl mb-3">🔔</span>
            <p className="text-sm font-semibold">No notifications yet</p>
            <p className="text-xs text-muted-foreground mt-1">When someone interacts with your posts, you'll see it here.</p>
          </div>
        ) : (
          <>
            {today.length > 0 && (
              <>
                <h2 className="px-4 py-2 text-sm font-bold">Today</h2>
                {today.map(renderNotification)}
              </>
            )}
            {thisWeek.length > 0 && (
              <>
                <h2 className="px-4 py-2 text-sm font-bold mt-2">This Week</h2>
                {thisWeek.map(renderNotification)}
              </>
            )}
            {earlier.length > 0 && (
              <>
                <h2 className="px-4 py-2 text-sm font-bold mt-2">Earlier</h2>
                {earlier.map(renderNotification)}
              </>
            )}
          </>
        )}
      </div>
    </div>
  );

  return <SocialLayout hideRightSidebar>{content}</SocialLayout>;
}
