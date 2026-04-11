import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Search, X, ArrowLeft, Film, Heart, MessageCircle, Play } from "lucide-react";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import SocialLayout from "@/components/social/SocialLayout";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

const CATEGORIES = ["For You", "Trending", "Fashion", "Food", "Travel", "Tech", "Fitness", "Art", "Local", "Sports"];

export default function SocialExplorePage() {
  const navigate = useNavigate();
  const { customerUser } = useAuth();
  const qc = useQueryClient();
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [activeCategory, setActiveCategory] = useState("For You");
  const userId = customerUser?.id || customerUser?.customer_id;

  // Explore posts
  const { data: explorePosts = [] } = useQuery({
    queryKey: ['social-explore', activeCategory],
    queryFn: async () => {
      let query = supabase.from('social_posts').select('id, media, post_type, like_count, comment_count, view_count')
        .eq('status', 'published').order('like_count', { ascending: false }).limit(30);
      if (activeCategory !== 'For You' && activeCategory !== 'Trending') {
        query = query.contains('hashtags', [activeCategory.toLowerCase()]);
      }
      if (activeCategory === 'Trending') query = query.order('view_count', { ascending: false });
      const { data } = await query;
      return data || [];
    },
  });

  // Auto-suggest search
  const { data: searchResults = { users: [], hashtags: [] } } = useQuery({
    queryKey: ['social-search', searchQuery],
    queryFn: async () => {
      if (!searchQuery.trim()) return { users: [], hashtags: [] };
      const [{ data: users }, { data: hashtags }] = await Promise.all([
        supabase.from('social_profiles').select('id, user_id, username, display_name, avatar_url, is_verified').ilike('username', `%${searchQuery}%`).limit(10),
        supabase.from('social_hashtags').select('id, name, post_count').ilike('name', `%${searchQuery}%`).limit(5),
      ]);
      return { users: users || [], hashtags: hashtags || [] };
    },
    enabled: isSearchFocused && searchQuery.length > 0,
  });

  // User's recent searches from activity_logs
  const { data: recentSearches = [] } = useQuery({
    queryKey: ['social-recent-searches', userId],
    queryFn: async () => {
      if (!userId) return [];
      const { data } = await supabase.from('activity_logs').select('id, description, metadata, created_at')
        .eq('user_id', userId).eq('type', 'social_search').order('created_at', { ascending: false }).limit(10);
      return data || [];
    },
    enabled: isSearchFocused && searchQuery.length === 0 && !!userId,
  });

  // Log search action
  const logSearch = useMutation({
    mutationFn: async (term: string) => {
      if (!userId || !term.trim()) return;
      await supabase.from('activity_logs').insert({ user_id: userId, type: 'social_search', description: term.trim(), metadata: { module: 'social' } });
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['social-recent-searches'] }),
  });

  // Clear all searches
  const clearSearches = useMutation({
    mutationFn: async () => {
      if (!userId) return;
      // Delete all social_search activity logs for this user
      await supabase.from('activity_logs').delete().eq('user_id', userId).eq('type', 'social_search');
      toast.success("Search history cleared");
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['social-recent-searches'] }),
  });

  const handleSearchSelect = (term: string, path?: string) => {
    logSearch.mutate(term);
    if (path) navigate(path);
    else { setSearchQuery(term); }
  };

  if (isSearchFocused) {
    const hasQuery = searchQuery.trim().length > 0;
    const searchView = (
      <div className="min-h-screen bg-background">
        <header className="sticky top-0 z-40 bg-card border-b border-border/30">
          <div className="flex items-center gap-3 px-4 py-3">
            <button onClick={() => setIsSearchFocused(false)}><ArrowLeft className="h-5 w-5" /></button>
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input autoFocus value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Search users, hashtags..." className="pl-9 pr-8 h-9 bg-muted/50 border-0" />
              {searchQuery && <button onClick={() => setSearchQuery("")} className="absolute right-3 top-1/2 -translate-y-1/2"><X className="h-4 w-4 text-muted-foreground" /></button>}
            </div>
          </div>
        </header>
        <div className="px-4 py-3">
          {hasQuery ? (
            <>
              {searchResults.hashtags.length > 0 && (
                <div className="mb-4">
                  <span className="text-sm font-semibold mb-2 block">Hashtags</span>
                  {searchResults.hashtags.map((h: any) => (
                    <button key={h.id} className="flex items-center gap-3 py-2.5 w-full" onClick={() => handleSearchSelect(`#${h.name}`)}>
                      <div className="h-11 w-11 rounded-full bg-muted flex items-center justify-center"><span className="text-lg font-bold">#</span></div>
                      <div className="text-left"><p className="text-sm font-semibold">#{h.name}</p><p className="text-xs text-muted-foreground">{(h.post_count || 0).toLocaleString()} posts</p></div>
                    </button>
                  ))}
                </div>
              )}
              {searchResults.users.length > 0 && (
                <div>
                  <span className="text-sm font-semibold mb-2 block">Accounts</span>
                  {searchResults.users.map((u: any) => (
                    <button key={u.id} className="flex items-center gap-3 py-2.5 w-full" onClick={() => handleSearchSelect(u.username, `/app/social/profile/${u.user_id}`)}>
                      <div className="h-11 w-11 rounded-full bg-muted flex items-center justify-center overflow-hidden">
                        {u.avatar_url ? <img src={u.avatar_url} alt="" className="w-full h-full object-cover" /> : <span className="text-sm font-bold">{u.username?.charAt(0).toUpperCase()}</span>}
                      </div>
                      <div className="flex-1 min-w-0 text-left">
                        <div className="flex items-center gap-1">
                          <span className="text-sm font-semibold">{u.username}</span>
                          {u.is_verified && <svg className="h-3.5 w-3.5 text-primary fill-current" viewBox="0 0 24 24"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" /></svg>}
                        </div>
                        <p className="text-xs text-muted-foreground">{u.display_name}</p>
                      </div>
                    </button>
                  ))}
                </div>
              )}
              {searchResults.users.length === 0 && searchResults.hashtags.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-8">No results found</p>
              )}
            </>
          ) : (
            <>
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-semibold">Recent Searches</span>
                {recentSearches.length > 0 && (
                  <button className="text-xs font-semibold text-primary" onClick={() => clearSearches.mutate()}>Clear All</button>
                )}
              </div>
              {recentSearches.length > 0 ? (
                recentSearches.map((item: any) => (
                  <button key={item.id} className="flex items-center gap-3 py-2 w-full" onClick={() => { setSearchQuery(item.description); }}>
                    <div className="h-9 w-9 rounded-full bg-muted flex items-center justify-center"><Search className="h-4 w-4 text-muted-foreground" /></div>
                    <span className="text-sm flex-1 text-left">{item.description}</span>
                    <X className="h-3.5 w-3.5 text-muted-foreground" onClick={(e) => { e.stopPropagation(); supabase.from('activity_logs').delete().eq('id', item.id).then(() => qc.invalidateQueries({ queryKey: ['social-recent-searches'] })); }} />
                  </button>
                ))
              ) : (
                <p className="text-sm text-muted-foreground text-center py-6">No recent searches</p>
              )}
            </>
          )}
        </div>
      </div>
    );
    return <SocialLayout hideSidebar>{searchView}</SocialLayout>;
  }

  // Grid
  const gridItems = explorePosts.length > 0
    ? explorePosts.map((p: any) => {
        const media = Array.isArray(p.media) && p.media.length > 0 ? p.media[0] : null;
        const isVideo = media?.type === 'video';
        return { id: p.id, isReel: p.post_type === 'reel', isVideo, imageUrl: isVideo ? (media?.thumbnailUrl || media?.url || '') : (media?.url || media?.thumbnailUrl || ''), likeCount: p.like_count || 0, commentCount: p.comment_count || 0 };
      })
    : Array.from({ length: 24 }, (_, i) => ({
        id: `e-${i}`, isReel: i % 3 === 2, isVideo: false, imageUrl: '', color: ['bg-rose-200', 'bg-sky-200', 'bg-amber-200', 'bg-emerald-200', 'bg-violet-200'][i % 5], likeCount: 0, commentCount: 0,
      }));

  const content = (
    <div className="pb-20 md:pb-8">
      {/* Search bar - NOT sticky, scrolls with content on mobile */}
      <div className="bg-card border-b border-border/30">
        <div className="px-4 py-3">
          <div className="relative" onClick={() => setIsSearchFocused(true)}>
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input readOnly placeholder="Search" className="pl-9 h-9 bg-muted/50 border-0 cursor-pointer" />
          </div>
        </div>
        <div className="flex gap-2 px-4 pb-3 overflow-x-auto scrollbar-hide">
          {CATEGORIES.map((cat) => (
            <button key={cat} onClick={() => setActiveCategory(cat)}
              className={`shrink-0 px-4 py-1.5 rounded-lg text-xs font-semibold transition-colors ${activeCategory === cat ? 'bg-foreground text-background' : 'bg-muted text-foreground'}`}>
              {cat}
            </button>
          ))}
        </div>
      </div>
      <div className="grid grid-cols-3 gap-[2px]">
        {gridItems.map((item: any) => (
          <button key={item.id} className={`relative overflow-hidden aspect-square group ${!item.imageUrl ? (item.color || 'bg-muted') : 'bg-muted'}`}
            onClick={() => navigate(`/app/social/post/${item.id}`)}>
            {item.imageUrl ? <img src={item.imageUrl} alt="" className="w-full h-full object-cover" loading="lazy" /> : <div className="w-full h-full" />}
            {item.isVideo && (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="h-8 w-8 rounded-full bg-black/50 flex items-center justify-center backdrop-blur-sm">
                  <Play className="h-4 w-4 text-white fill-white ml-0.5" />
                </div>
              </div>
            )}
            {item.isReel && <div className="absolute top-2 right-2"><Film className="h-4 w-4 text-white drop-shadow" /></div>}
            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-4 text-white">
              <span className="flex items-center gap-1 text-sm font-bold"><Heart className="h-4 w-4 fill-white" />{item.likeCount}</span>
              <span className="flex items-center gap-1 text-sm font-bold"><MessageCircle className="h-4 w-4 fill-white" />{item.commentCount}</span>
            </div>
          </button>
        ))}
      </div>
    </div>
  );

  return <SocialLayout hideRightSidebar>{content}</SocialLayout>;
}
