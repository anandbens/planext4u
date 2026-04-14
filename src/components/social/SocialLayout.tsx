import { Link, useLocation, useNavigate } from "react-router-dom";
import { Home, Search, Film, MessageCircle, Bell, Plus, Settings, User, Compass, X, Users } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useState } from "react";
import { CustomerLayout } from "@/components/customer/CustomerLayout";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

interface SocialLayoutProps {
  children: React.ReactNode;
  hideRightSidebar?: boolean;
  hideSidebar?: boolean;
}

const NAV_ITEMS = [
  { label: "Home", icon: Home, path: "/app/social" },
  { label: "Explore", icon: Compass, path: "/app/social/explore" },
  { label: "Reels", icon: Film, path: "/app/social/reels" },
  { label: "Messages", icon: MessageCircle, path: "/app/social/messages" },
  { label: "Friends", icon: Users, path: "/app/social/friends" },
  { label: "Notification", icon: Bell, path: "/app/social/notifications" },
  { label: "Create", icon: Plus, path: "/app/social/create" },
  { label: "Settings", icon: Settings, path: "/app/social/settings" },
  { label: "Profile", icon: User, path: "/app/social/profile" },
];

export default function SocialLayout({ children, hideRightSidebar, hideSidebar }: SocialLayoutProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const { customerUser } = useAuth();
  const qc = useQueryClient();
  const [searchQuery, setSearchQuery] = useState("");
  const userId = customerUser?.id || customerUser?.customer_id;

  const isActive = (path: string) => {
    if (path === "/app/social") return location.pathname === "/app/social";
    return location.pathname.startsWith(path);
  };

  // Right sidebar search - auto-suggest
  const { data: sidebarSearchResults = { users: [], hashtags: [] } } = useQuery({
    queryKey: ['social-sidebar-search', searchQuery],
    queryFn: async () => {
      if (!searchQuery.trim()) return { users: [], hashtags: [] };
      const [{ data: users }, { data: hashtags }] = await Promise.all([
        supabase.from('social_profiles').select('id, user_id, username, display_name, avatar_url, is_verified').ilike('username', `%${searchQuery}%`).limit(5),
        supabase.from('social_hashtags').select('id, name, post_count').ilike('name', `%${searchQuery}%`).limit(3),
      ]);
      return { users: users || [], hashtags: hashtags || [] };
    },
    enabled: searchQuery.length > 1,
  });

  // Recent searches
  const { data: recentSearches = [] } = useQuery({
    queryKey: ['social-recent-searches-sidebar', userId],
    queryFn: async () => {
      if (!userId) return [];
      const { data } = await supabase.from('activity_logs').select('id, description, created_at')
        .eq('user_id', userId).eq('type', 'social_search').order('created_at', { ascending: false }).limit(5);
      return data || [];
    },
    enabled: !!userId && !searchQuery,
  });

  const clearSearches = useMutation({
    mutationFn: async () => {
      if (!userId) return;
      await supabase.from('activity_logs').delete().eq('user_id', userId).eq('type', 'social_search');
      toast.success("Search history cleared");
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['social-recent-searches-sidebar'] }),
  });

  const logAndNavigate = (term: string, path: string) => {
    if (userId) {
      supabase.from('activity_logs').insert({ user_id: userId, type: 'social_search', description: term, metadata: { module: 'social' } });
    }
    navigate(path);
  };

  // Suggestions from DB – exclude users the current user already follows
  const { data: suggestions = [] } = useQuery({
    queryKey: ['social-suggestions', userId],
    queryFn: async () => {
      // Get list of users the current user follows
      const followingIds: string[] = [userId || ''];
      if (userId) {
        const { data: follows } = await supabase.from('social_follows').select('following_id').eq('follower_id', userId).eq('status', 'active');
        if (follows) followingIds.push(...follows.map((f: any) => f.following_id));
      }
      const { data } = await supabase.from('social_profiles')
        .select('id, user_id, username, display_name, avatar_url, is_verified')
        .not('user_id', 'in', `(${followingIds.join(',')})`)
        .limit(5);
      return data || [];
    },
    enabled: !!userId,
  });

  const followUser = useMutation({
    mutationFn: async (targetUserId: string) => {
      if (!userId) { toast.error("Please login"); return; }
      await supabase.from('social_follows').insert({ follower_id: userId, following_id: targetUserId, status: 'active' });
      toast.success("Following!");
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['social-suggestions'] }),
  });

  const hasSearchResults = searchQuery.trim().length > 1 && (sidebarSearchResults.users.length > 0 || sidebarSearchResults.hashtags.length > 0);

  const desktopBody = (
    <div className="hidden md:flex max-w-[1400px] mx-auto gap-4">
      {/* Left Sidebar */}
      {!hideSidebar && (
        <aside className="w-[260px] shrink-0 sticky top-[110px] self-start py-4 pl-4 pr-2 h-[calc(100dvh-110px)] overflow-y-auto">
          <nav className="bg-card rounded-xl border border-border/30 py-3 px-3">
            {NAV_ITEMS.map((item) => {
              const active = isActive(item.path);
              return (
                <Link key={item.label} to={item.path}
                  className={`flex items-center gap-3 px-4 py-2.5 text-sm font-medium transition-colors rounded-lg mb-0.5 ${active ? "bg-primary text-primary-foreground" : "text-foreground hover:bg-muted"}`}>
                  {item.label === "Profile" ? (
                    <div className={`h-5 w-5 rounded-full flex items-center justify-center text-[10px] font-bold ${active ? 'bg-primary-foreground text-primary' : 'bg-muted border border-border'}`}>
                      {customerUser?.name?.charAt(0) || 'U'}
                    </div>
                  ) : (<item.icon className="h-5 w-5 shrink-0" />)}
                  <span className="whitespace-nowrap">{item.label}</span>
                </Link>
              );
            })}
          </nav>
          <div className="mt-4 rounded-xl overflow-hidden bg-gradient-to-br from-primary to-primary/80 text-primary-foreground p-4">
            <p className="text-sm font-bold mb-1">Welcome to ClassiGrids</p>
            <p className="text-[10px] opacity-80">Buy And Sell Everything From Used Cars To Mobile Phones And Computers, Or Jobs And More.</p>
            <div className="text-3xl font-black mt-3">50%</div>
            <div className="text-sm font-bold">OFF</div>
            <button className="mt-3 bg-card text-foreground text-xs font-semibold px-4 py-1.5 rounded-full" onClick={() => navigate("/app/classifieds")}>Buy Now!</button>
          </div>
        </aside>
      )}

      {/* Main Content */}
      <main className={`flex-1 min-w-0 ${!hideSidebar ? 'max-w-[680px]' : ''}`}>{children}</main>

      {/* Right Sidebar */}
      {!hideRightSidebar && !hideSidebar && (
        <aside className="w-[300px] shrink-0 sticky top-[110px] self-start py-4 pr-4 pl-2 space-y-4 h-[calc(100dvh-110px)] overflow-y-auto">
          {/* Search */}
          <div className="bg-card rounded-xl border border-border/30 p-4">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-bold">Search</span>
            </div>
            <div className="relative mb-3">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Search" className="pl-9 h-9 bg-muted/50 border-0 text-sm" />
              {searchQuery && <button onClick={() => setSearchQuery("")} className="absolute right-3 top-1/2 -translate-y-1/2"><X className="h-4 w-4 text-muted-foreground" /></button>}
            </div>

            {/* Search results */}
            {hasSearchResults ? (
              <div className="space-y-1">
                {sidebarSearchResults.hashtags.map((h: any) => (
                  <button key={h.id} className="flex items-center gap-2.5 py-1.5 w-full" onClick={() => logAndNavigate(`#${h.name}`, `/app/social/explore`)}>
                    <div className="h-9 w-9 rounded-full bg-muted flex items-center justify-center"><span className="text-sm font-bold">#</span></div>
                    <div className="text-left"><p className="text-xs font-semibold">#{h.name}</p><p className="text-[10px] text-muted-foreground">{h.post_count || 0} posts</p></div>
                  </button>
                ))}
                {sidebarSearchResults.users.map((u: any) => (
                  <button key={u.id} className="flex items-center gap-2.5 py-1.5 w-full" onClick={() => logAndNavigate(u.username, `/app/social/profile/${u.user_id}`)}>
                    <Avatar className="h-9 w-9"><AvatarFallback className="bg-muted text-xs font-bold">{u.username?.charAt(0).toUpperCase()}</AvatarFallback></Avatar>
                    <div className="flex-1 min-w-0 text-left">
                      <div className="flex items-center gap-1">
                        <span className="text-xs font-semibold">{u.username}</span>
                        {u.is_verified && <svg className="h-3 w-3 text-primary fill-current" viewBox="0 0 24 24"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" /></svg>}
                      </div>
                      <p className="text-[10px] text-muted-foreground truncate">{u.display_name}</p>
                    </div>
                  </button>
                ))}
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold text-muted-foreground">Recent</span>
                  {recentSearches.length > 0 && <button className="text-xs font-semibold text-primary" onClick={() => clearSearches.mutate()}>Clear all</button>}
                </div>
                {recentSearches.length > 0 ? (
                  <div className="space-y-1">
                    {recentSearches.map((item: any) => (
                      <div key={item.id} className="flex items-center gap-2.5 py-1.5">
                        <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center"><Search className="h-3.5 w-3.5 text-muted-foreground" /></div>
                        <span className="text-xs flex-1 cursor-pointer" onClick={() => setSearchQuery(item.description)}>{item.description}</span>
                        <button onClick={() => { supabase.from('activity_logs').delete().eq('id', item.id).then(() => qc.invalidateQueries({ queryKey: ['social-recent-searches-sidebar'] })); }}>
                          <X className="h-3 w-3 text-muted-foreground" />
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-[10px] text-muted-foreground text-center py-2">No recent searches</p>
                )}
              </>
            )}
          </div>

          {/* Suggestions */}
          <div className="bg-card rounded-xl border border-border/30 p-4">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-semibold text-muted-foreground">Suggestions for you</span>
              <button className="text-xs font-semibold text-primary" onClick={() => navigate("/app/social/suggestions")}>See All</button>
            </div>
            <div className="space-y-1">
              {suggestions.map((item: any) => (
                <div key={item.id} className="flex items-center gap-2.5 py-1.5">
                  <Avatar className="h-9 w-9 cursor-pointer" onClick={() => navigate(`/app/social/profile/${item.user_id}`)}>
                    {item.avatar_url ? <img src={item.avatar_url} alt="" className="w-full h-full object-cover rounded-full" /> :
                      <AvatarFallback className="bg-muted text-xs font-bold">{item.username?.charAt(0).toUpperCase()}</AvatarFallback>}
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <span className="text-xs font-semibold truncate block cursor-pointer" onClick={() => navigate(`/app/social/profile/${item.user_id}`)}>{item.username}</span>
                    <span className="text-[10px] text-muted-foreground">{item.display_name || 'Suggested for you'}</span>
                  </div>
                  <button className="text-xs font-semibold text-primary" onClick={() => followUser.mutate(item.user_id)}>Follow</button>
                </div>
              ))}
            </div>
          </div>
        </aside>
      )}
    </div>
  );

  return (
    <CustomerLayout socialMode>
      {desktopBody}
      <div className="md:hidden">{children}</div>
    </CustomerLayout>
  );
}
