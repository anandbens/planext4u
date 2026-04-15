import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Search, Plus, Phone, Video, Send, Smile, Mic } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";

export default function SocialDMPage() {
  const navigate = useNavigate();
  const { customerUser } = useAuth();
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<'primary' | 'requests'>('primary');
  const [currentUserId, setCurrentUserId] = useState('');

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user?.id) setCurrentUserId(session.user.id);
    });
  }, []);

  // Fetch real conversations
  const { data: conversations = [], isLoading } = useQuery({
    queryKey: ['social-conversations', currentUserId],
    queryFn: async () => {
      if (!currentUserId) return [];
      const { data, error } = await supabase
        .from('social_conversations')
        .select('*')
        .contains('participants', JSON.stringify([currentUserId]))
        .order('last_message_at', { ascending: false });
      if (error) { console.error(error); return []; }
      return data || [];
    },
    enabled: !!currentUserId,
  });

  // Get participant profiles
  const otherUserIds = conversations.map((c: any) => {
    const parts = c.participants as string[];
    return parts?.find((p: string) => p !== currentUserId) || '';
  }).filter(Boolean);

  const { data: profiles = [] } = useQuery({
    queryKey: ['dm-profiles', otherUserIds.join(',')],
    queryFn: async () => {
      if (otherUserIds.length === 0) return [];
      const { data } = await supabase.from('social_profiles').select('user_id, username, display_name, avatar_url').in('user_id', otherUserIds);
      return data || [];
    },
    enabled: otherUserIds.length > 0,
  });
  const profileMap = new Map(profiles.map((p: any) => [p.user_id, p]));

  // Get last message for each conversation
  const { data: lastMessages = [] } = useQuery({
    queryKey: ['dm-last-messages', conversations.map((c: any) => c.id).join(',')],
    queryFn: async () => {
      if (conversations.length === 0) return [];
      const results: any[] = [];
      for (const conv of conversations) {
        const { data } = await supabase
          .from('social_messages')
          .select('content, sender_id, created_at, is_read')
          .eq('conversation_id', conv.id)
          .order('created_at', { ascending: false })
          .limit(1);
        results.push({ conversationId: conv.id, message: data?.[0] || null });
      }
      return results;
    },
    enabled: conversations.length > 0,
  });
  const lastMsgMap = new Map(lastMessages.map((m: any) => [m.conversationId, m.message]));

  // Search for users to start new conversation (mutual followers)
  const [showNewChat, setShowNewChat] = useState(false);
  const [newChatSearch, setNewChatSearch] = useState("");
  const { data: mutualFollowers = [] } = useQuery({
    queryKey: ['mutual-followers', currentUserId],
    queryFn: async () => {
      if (!currentUserId) return [];
      // Get users I follow
      const { data: iFollow } = await supabase.from('social_follows').select('following_id').eq('follower_id', currentUserId).eq('status', 'active');
      if (!iFollow?.length) return [];
      const followingIds = iFollow.map((f: any) => f.following_id);
      // Get who follows me back
      const { data: followMe } = await supabase.from('social_follows').select('follower_id').eq('following_id', currentUserId).eq('status', 'active').in('follower_id', followingIds);
      if (!followMe?.length) return [];
      const mutualIds = followMe.map((f: any) => f.follower_id);
      const { data: profs } = await supabase.from('social_profiles').select('user_id, username, display_name, avatar_url').in('user_id', mutualIds);
      return profs || [];
    },
    enabled: !!currentUserId && showNewChat,
  });

  const filteredMutuals = mutualFollowers.filter((p: any) =>
    (p.display_name || p.username || '').toLowerCase().includes(newChatSearch.toLowerCase())
  );

  const startChat = (recipientId: string) => {
    setShowNewChat(false);
    navigate(`/app/social/messages/${recipientId}`);
  };

  const filteredConversations = conversations.filter((c: any) => {
    if (!search) return true;
    const otherId = (c.participants as string[])?.find((p: string) => p !== currentUserId) || '';
    const prof = profileMap.get(otherId);
    return (prof?.display_name || prof?.username || '').toLowerCase().includes(search.toLowerCase());
  });

  const timeAgo = (dateStr: string) => {
    if (!dateStr) return '';
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'now';
    if (mins < 60) return `${mins}m`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h`;
    return `${Math.floor(hrs / 24)}d`;
  };

  // New chat overlay
  if (showNewChat) {
    return (
      <div className="min-h-screen bg-background">
        <header className="sticky top-0 z-40 bg-card border-b border-border/30">
          <div className="max-w-xl mx-auto flex items-center justify-between px-4 py-3">
            <div className="flex items-center gap-3">
              <button onClick={() => setShowNewChat(false)}><ArrowLeft className="h-6 w-6" /></button>
              <span className="text-lg font-bold">New Message</span>
            </div>
          </div>
        </header>
        <div className="max-w-xl mx-auto px-4 py-2">
          <Input
            value={newChatSearch}
            onChange={(e) => setNewChatSearch(e.target.value)}
            placeholder="Search mutual followers..."
            className="rounded-xl bg-muted border-none h-9 mb-3"
          />
          <p className="text-xs text-muted-foreground mb-2">You can only message people who follow you back.</p>
          {mutualFollowers.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-sm text-muted-foreground">No mutual followers yet. Follow people and wait for them to follow back to start messaging.</p>
            </div>
          ) : (
            filteredMutuals.map((p: any) => (
              <button
                key={p.user_id}
                onClick={() => startChat(p.user_id)}
                className="w-full flex items-center gap-3 px-2 py-3 hover:bg-muted/50 rounded-lg transition-colors"
              >
                <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center overflow-hidden shrink-0">
                  {p.avatar_url ? <img src={p.avatar_url} className="w-full h-full object-cover" /> :
                    <span className="text-sm font-bold">{(p.display_name || p.username || 'U').charAt(0).toUpperCase()}</span>}
                </div>
                <div className="text-left">
                  <p className="text-sm font-semibold">{p.display_name || p.username}</p>
                  <p className="text-xs text-muted-foreground">@{p.username}</p>
                </div>
              </button>
            ))
          )}
        </div>
      </div>
    );
  }

  // Inbox view
  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-40 bg-card border-b border-border/30 safe-area-top">
        <div className="max-w-xl mx-auto flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate("/app/social")}><ArrowLeft className="h-6 w-6" /></button>
            <span className="text-lg font-bold">{customerUser?.name || "Messages"}</span>
          </div>
          <button onClick={() => setShowNewChat(true)}><Plus className="h-6 w-6" /></button>
        </div>
      </header>

      <div className="max-w-xl mx-auto">
        <div className="px-4 py-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search"
              className="pl-9 rounded-xl bg-muted border-none h-9"
            />
          </div>
        </div>

        <div className="flex border-b border-border/20 px-4">
          <button
            onClick={() => setFilter('primary')}
            className={`flex-1 py-2.5 text-sm font-semibold text-center border-b-2 ${filter === 'primary' ? 'border-foreground text-foreground' : 'border-transparent text-muted-foreground'}`}
          >Primary</button>
          <button
            onClick={() => setFilter('requests')}
            className={`flex-1 py-2.5 text-sm font-semibold text-center border-b-2 ${filter === 'requests' ? 'border-foreground text-foreground' : 'border-transparent text-muted-foreground'}`}
          >Requests</button>
        </div>

        <div className="pb-28">
          {isLoading ? (
            <div className="flex justify-center py-16">
              <div className="h-8 w-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
            </div>
          ) : filter === 'requests' ? (
            <div className="flex flex-col items-center justify-center py-16 px-4">
              <p className="text-muted-foreground text-sm text-center">No message requests</p>
            </div>
          ) : filteredConversations.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 px-4">
              <span className="text-4xl mb-3">💬</span>
              <p className="text-sm font-semibold">No conversations yet</p>
              <p className="text-xs text-muted-foreground mt-1">Tap + to start a conversation with mutual followers.</p>
            </div>
          ) : (
            filteredConversations.map((conv: any) => {
              const otherId = (conv.participants as string[])?.find((p: string) => p !== currentUserId) || '';
              const prof = profileMap.get(otherId);
              const lastMsg = lastMsgMap.get(conv.id);
              const unread = lastMsg && !lastMsg.is_read && lastMsg.sender_id !== currentUserId;
              return (
                <button
                  key={conv.id}
                  onClick={() => navigate(`/app/social/messages/${otherId}`)}
                  className="w-full flex items-center gap-3 px-4 py-3 hover:bg-muted/50 transition-colors"
                >
                  <Avatar className="h-14 w-14">
                    {prof?.avatar_url ? (
                      <img src={prof.avatar_url} alt="" className="w-full h-full rounded-full object-cover" />
                    ) : (
                      <AvatarFallback className="bg-accent text-accent-foreground">
                        {(prof?.display_name || prof?.username || 'U').charAt(0).toUpperCase()}
                      </AvatarFallback>
                    )}
                  </Avatar>
                  <div className="flex-1 min-w-0 text-left">
                    <p className={`text-sm ${unread ? 'font-bold' : 'font-medium'}`}>{prof?.display_name || prof?.username || 'User'}</p>
                    <p className={`text-xs truncate ${unread ? 'text-foreground font-semibold' : 'text-muted-foreground'}`}>
                      {lastMsg ? (
                        <>
                          {lastMsg.sender_id === currentUserId ? 'You: ' : ''}
                          {lastMsg.content || 'Media'}
                          {' · '}
                          {timeAgo(lastMsg.created_at)}
                        </>
                      ) : (
                        'Start chatting'
                      )}
                    </p>
                  </div>
                  {unread && (
                    <div className="h-3 w-3 rounded-full bg-primary shrink-0" />
                  )}
                </button>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
