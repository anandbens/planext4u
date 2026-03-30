import { useState, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Heart, MessageCircle, Send, Bookmark, MoreHorizontal, Plus, ChevronDown, Repeat2 } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/lib/auth";
import { toast } from "sonner";
import SocialLayout from "@/components/social/SocialLayout";
import { useSocialFeed, useSharePost, useRepost } from "@/hooks/use-social-interactions";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

const FALLBACK_POSTS = [
  {
    id: "p1", user_id: "mock", username: "vijay_sivakumar", displayName: "Vijay Sivakumar",
    isVerified: true, location_name: "Pondicherry, TN", created_at: new Date(Date.now() - 3600000).toISOString(),
    media: [
      { type: "photo", url: "https://picsum.photos/seed/p1a/600/600" },
      { type: "photo", url: "https://picsum.photos/seed/p1b/600/600" },
      { type: "photo", url: "https://picsum.photos/seed/p1c/600/600" },
    ],
    caption: "Just tried the amazing coffee from Brooklyn Coffee Co.! Best pour-over in town ☕",
    hashtags: ["#coffee", "#local", "#brooklyn"],
    like_count: 1600, comment_count: 800, share_count: 145,
    collabUser: "Kokila",
  },
  {
    id: "p2", user_id: "mock", username: "planext4u", displayName: "Planext4u",
    isVerified: true, location_name: "Coimbatore, TN", created_at: new Date(Date.now() - 10800000).toISOString(),
    media: [
      { type: "photo", url: "https://picsum.photos/seed/p2a/600/600" },
      { type: "photo", url: "https://picsum.photos/seed/p2b/600/600" },
    ],
    caption: "Exciting things are coming to P4U! Stay tuned for the biggest update yet 🚀",
    hashtags: ["#planext4u", "#superapp"],
    like_count: 3200, comment_count: 450, share_count: 890,
  },
  {
    id: "p3", user_id: "mock", username: "priya_designs", displayName: "Priya Designs",
    isVerified: false, location_name: "Chennai, TN", created_at: new Date(Date.now() - 18000000).toISOString(),
    media: [
      { type: "photo", url: "https://picsum.photos/seed/p3a/600/600" },
    ],
    caption: "New collection dropping soon! What do you think of these designs? 🎨✨",
    hashtags: ["#design", "#art"],
    like_count: 892, comment_count: 67, share_count: 23,
  },
  {
    id: "p4", user_id: "mock", username: "foodie_arun", displayName: "Arun Foodie",
    isVerified: false, location_name: "Bangalore, KA", created_at: new Date(Date.now() - 25200000).toISOString(),
    media: [
      { type: "photo", url: "https://picsum.photos/seed/p4a/600/600" },
      { type: "photo", url: "https://picsum.photos/seed/p4b/600/600" },
    ],
    caption: "Weekend biryani feast at this hidden gem in Koramangala 🍚🔥 Must try!",
    hashtags: ["#food", "#biryani", "#bangalore"],
    like_count: 2100, comment_count: 312, share_count: 89,
  },
  {
    id: "p5", user_id: "mock", username: "travel_meera", displayName: "Meera Travels",
    isVerified: true, location_name: "Munnar, KL", created_at: new Date(Date.now() - 43200000).toISOString(),
    media: [
      { type: "photo", url: "https://picsum.photos/seed/p5a/600/600" },
      { type: "photo", url: "https://picsum.photos/seed/p5b/600/600" },
      { type: "photo", url: "https://picsum.photos/seed/p5c/600/600" },
    ],
    caption: "Lost in the tea gardens of Munnar 🍃 This place is pure magic",
    hashtags: ["#travel", "#munnar", "#kerala", "#nature"],
    like_count: 4500, comment_count: 678, share_count: 234,
  },
  {
    id: "p6", user_id: "mock", username: "fit_kumar", displayName: "Kumar Fitness",
    isVerified: false, location_name: "Hyderabad, TS", created_at: new Date(Date.now() - 72000000).toISOString(),
    media: [
      { type: "photo", url: "https://picsum.photos/seed/p6a/600/600" },
    ],
    caption: "Day 90 of the transformation journey 💪 Consistency is key!",
    hashtags: ["#fitness", "#gym", "#transformation"],
    like_count: 1800, comment_count: 145, share_count: 56,
  },
];

const MOCK_STORIES = [
  { id: "own", username: "Your Story", avatar: "", isOwn: true, seen: false },
  { id: "s1", username: "vijay_kumar", avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop", seen: false },
  { id: "s2", username: "priya_designs", avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&h=100&fit=crop", seen: false },
  { id: "s3", username: "rahul_food", avatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100&h=100&fit=crop", seen: true },
  { id: "s4", username: "anita_travel", avatar: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=100&h=100&fit=crop", seen: true },
  { id: "s5", username: "karthik_tech", avatar: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100&h=100&fit=crop", seen: false },
  { id: "s6", username: "sneha_art", avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&h=100&fit=crop", seen: false },
  { id: "s7", username: "planext4u", avatar: "https://images.unsplash.com/photo-1560250097-0b93528c311a?w=100&h=100&fit=crop", seen: true },
  { id: "s8", username: "foodie_chen", avatar: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=100&h=100&fit=crop", seen: false },
  { id: "s9", username: "dev_rajan", avatar: "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=100&h=100&fit=crop", seen: true },
  { id: "s10", username: "dance_queen", avatar: "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=100&h=100&fit=crop", seen: false },
];

function formatCount(n: number): string {
  if (n >= 1000000) return (n / 1000000).toFixed(1).replace(/\.0$/, '') + 'M';
  if (n >= 1000) return (n / 1000).toFixed(1).replace(/\.0$/, '') + 'k';
  return n.toString();
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

function PostCard({ post }: { post: any }) {
  const navigate = useNavigate();
  const { customerUser } = useAuth();
  const qc = useQueryClient();
  const sharePost = useSharePost();
  const repost = useRepost();
  const [carouselIdx, setCarouselIdx] = useState(0);
  const [showCommentInput, setShowCommentInput] = useState(false);
  const [commentText, setCommentText] = useState("");

  const userId = customerUser?.id;
  const postId = post.id;
  const mediaItems = Array.isArray(post.media) ? post.media : [];
  const isCarousel = mediaItems.length > 1;
  const isMock = ['p1', 'p2', 'p3', 'p4', 'p5', 'p6'].includes(postId);

  const { data: isLiked = false } = useQuery({
    queryKey: ['social-like', postId, userId],
    queryFn: async () => {
      if (!userId) return false;
      const { data } = await supabase.from('social_likes').select('id').eq('post_id', postId).eq('user_id', userId).maybeSingle();
      return !!data;
    },
    enabled: !!userId && !isMock,
  });

  const { data: likeCount = post.like_count || 0 } = useQuery({
    queryKey: ['social-like-count', postId],
    queryFn: async () => {
      const { count } = await supabase.from('social_likes').select('*', { count: 'exact', head: true }).eq('post_id', postId);
      return count || 0;
    },
    enabled: !isMock,
  });

  const { data: commentCount = post.comment_count || 0 } = useQuery({
    queryKey: ['social-comment-count', postId],
    queryFn: async () => {
      const { count } = await supabase.from('social_comments').select('*', { count: 'exact', head: true }).eq('post_id', postId).eq('status', 'active');
      return count || 0;
    },
    enabled: !isMock,
  });

  const { data: isSaved = false } = useQuery({
    queryKey: ['social-bookmark', postId, userId],
    queryFn: async () => {
      if (!userId) return false;
      const { data } = await supabase.from('social_bookmarks').select('id').eq('post_id', postId).eq('user_id', userId).maybeSingle();
      return !!data;
    },
    enabled: !!userId && !isMock,
  });

  const { data: postProfile } = useQuery({
    queryKey: ['social-post-profile', post.user_id],
    queryFn: async () => {
      const { data } = await supabase.from('social_profiles').select('username, display_name, avatar_url, is_verified').eq('user_id', post.user_id).maybeSingle();
      return data;
    },
    enabled: !isMock && !!post.user_id,
  });

  // Recent comments for inline display
  const { data: recentComments = [] } = useQuery({
    queryKey: ['social-recent-comments', postId],
    queryFn: async () => {
      const { data } = await supabase.from('social_comments').select('id, content, user_id').eq('post_id', postId).eq('status', 'active').is('parent_id', null).order('created_at', { ascending: false }).limit(2);
      return data || [];
    },
    enabled: !isMock,
  });

  const [localLiked, setLocalLiked] = useState(false);
  const [localSaved, setLocalSaved] = useState(false);
  const [localLikeCount, setLocalLikeCount] = useState(post.like_count || 0);

  const liked = isMock ? localLiked : isLiked;
  const saved = isMock ? localSaved : isSaved;
  const likes = isMock ? localLikeCount : likeCount;
  const comments = isMock ? (post.comment_count || 0) : commentCount;
  const shareCount = post.share_count || 0;

  const toggleLike = useMutation({
    mutationFn: async () => {
      if (isMock) { setLocalLiked(v => !v); setLocalLikeCount(v => localLiked ? v - 1 : v + 1); return; }
      if (!userId) { toast.error("Please login to like"); return; }
      if (isLiked) {
        await supabase.from('social_likes').delete().eq('post_id', postId).eq('user_id', userId);
      } else {
        await supabase.from('social_likes').insert({ post_id: postId, user_id: userId });
      }
    },
    onSuccess: () => {
      if (!isMock) {
        qc.invalidateQueries({ queryKey: ['social-like', postId] });
        qc.invalidateQueries({ queryKey: ['social-like-count', postId] });
      }
    },
  });

  const toggleBookmark = useMutation({
    mutationFn: async () => {
      if (isMock) { setLocalSaved(v => !v); toast.success(localSaved ? "Removed from saved" : "Post saved"); return; }
      if (!userId) { toast.error("Please login"); return; }
      if (isSaved) {
        await supabase.from('social_bookmarks').delete().eq('post_id', postId).eq('user_id', userId);
        toast.success("Removed from saved");
      } else {
        await supabase.from('social_bookmarks').insert({ post_id: postId, user_id: userId });
        toast.success("Post saved");
      }
    },
    onSuccess: () => { if (!isMock) qc.invalidateQueries({ queryKey: ['social-bookmark', postId] }); },
  });

  const submitComment = useMutation({
    mutationFn: async () => {
      if (!commentText.trim()) return;
      if (isMock) { toast.success("Comment posted"); setCommentText(""); setShowCommentInput(false); return; }
      if (!userId) { toast.error("Please login"); return; }
      await supabase.from('social_comments').insert({ post_id: postId, user_id: userId, content: commentText.trim() });
      setCommentText("");
      setShowCommentInput(false);
      toast.success("Comment posted");
    },
    onSuccess: () => {
      if (!isMock) {
        qc.invalidateQueries({ queryKey: ['social-comment-count', postId] });
        qc.invalidateQueries({ queryKey: ['social-recent-comments', postId] });
      }
    },
  });

  const username = isMock ? post.username : (postProfile?.username || post.user_id?.substring(0, 8) || 'user');
  const isVerified = isMock ? post.isVerified : (postProfile?.is_verified || false);
  const avatarUrl = isMock ? '' : (postProfile?.avatar_url || '');

  return (
    <article className="border-b border-border/20">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3">
        <Link to={`/app/social/@${username}`}>
          <div className="h-9 w-9 rounded-full bg-gradient-to-tr from-amber-400 to-rose-500 p-[1.5px]">
            <div className="h-full w-full rounded-full bg-card flex items-center justify-center overflow-hidden">
              {avatarUrl ? <img src={avatarUrl} alt="" className="w-full h-full object-cover" /> :
                <span className="text-xs font-bold">{username.charAt(0).toUpperCase()}</span>}
            </div>
          </div>
        </Link>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1 flex-wrap">
            <Link to={`/app/social/@${username}`} className="text-sm font-semibold">{username}</Link>
            {isVerified && <svg className="h-3.5 w-3.5 text-primary fill-current shrink-0" viewBox="0 0 24 24"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" /></svg>}
            {post.collabUser && <span className="text-sm text-muted-foreground"> and <span className="font-semibold text-foreground">{post.collabUser}</span></span>}
          </div>
          {post.location_name && <p className="text-[11px] text-muted-foreground">{post.location_name} · {timeAgo(post.created_at)}</p>}
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild><button className="p-1"><MoreHorizontal className="h-5 w-5" /></button></DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem>Not Interested</DropdownMenuItem>
            <DropdownMenuItem>Report</DropdownMenuItem>
            <DropdownMenuItem onClick={() => sharePost(postId, post.caption)}>Copy Link</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Media */}
      <div className="relative aspect-square bg-muted overflow-hidden">
        {mediaItems.length > 0 ? (
          <img 
            src={mediaItems[carouselIdx]?.url || mediaItems[carouselIdx]?.mediumUrl || ''} 
            alt="" 
            className="w-full h-full object-cover" 
            loading="lazy"
            referrerPolicy="no-referrer"
            crossOrigin="anonymous"
            onDoubleClick={() => toggleLike.mutate()}
            onError={(e) => {
              const target = e.currentTarget;
              if (!target.dataset.retried) {
                target.dataset.retried = "1";
                target.src = target.src.replace('&fit=crop', '&fit=crop&auto=format');
              }
            }}
          />
        ) : (
          <div className="w-full h-full bg-accent/30 flex items-center justify-center"><span className="text-muted-foreground text-sm">No media</span></div>
        )}
        {isCarousel && (
          <>
            {carouselIdx > 0 && <button className="absolute left-2 top-1/2 -translate-y-1/2 bg-card/80 rounded-full p-1" onClick={() => setCarouselIdx(i => i - 1)}><ChevronDown className="h-4 w-4 -rotate-90" /></button>}
            {carouselIdx < mediaItems.length - 1 && <button className="absolute right-2 top-1/2 -translate-y-1/2 bg-card/80 rounded-full p-1" onClick={() => setCarouselIdx(i => i + 1)}><ChevronDown className="h-4 w-4 rotate-90" /></button>}
            <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1">
              {mediaItems.map((_: any, i: number) => <div key={i} className={`h-1.5 w-1.5 rounded-full ${i === carouselIdx ? 'bg-primary' : 'bg-white/50'}`} />)}
            </div>
          </>
        )}
      </div>

      {/* Action Bar - single row with icons + counts inline */}
      <div className="flex items-center justify-between px-4 py-2">
        <div className="flex items-center gap-5">
          <button className="flex items-center gap-1.5" onClick={() => toggleLike.mutate()}>
            <AnimatePresence mode="wait">
              {liked ? (
                <motion.div key="liked" initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", stiffness: 500, damping: 15 }}><Heart className="h-6 w-6 fill-red-500 text-red-500" /></motion.div>
              ) : (
                <motion.div key="unliked"><Heart className="h-6 w-6" /></motion.div>
              )}
            </AnimatePresence>
            <span className="text-sm font-semibold">{formatCount(likes)}</span>
          </button>
          <button className="flex items-center gap-1.5" onClick={() => navigate(`/app/social/comments/${postId}`)}>
            <MessageCircle className="h-6 w-6" />
            <span className="text-sm">{formatCount(comments)}</span>
          </button>
          <button className="flex items-center gap-1.5" onClick={() => repost.mutate(postId)}>
            <Repeat2 className="h-6 w-6" />
          </button>
          <button className="flex items-center gap-1.5" onClick={() => sharePost(postId, post.caption)}>
            <Send className="h-6 w-6" />
            <span className="text-sm">{formatCount(shareCount)}</span>
          </button>
        </div>
        <button onClick={() => toggleBookmark.mutate()}><Bookmark className={`h-6 w-6 ${saved ? 'fill-foreground' : ''}`} /></button>
      </div>

      {/* Caption */}
      <div className="px-4 py-1">
        <p className="text-sm">
          <Link to={`/app/social/@${username}`} className="font-semibold mr-1">{username}</Link>
          {post.caption}
          <span className="text-primary ml-1 cursor-pointer">more</span>
        </p>
        {post.hashtags && Array.isArray(post.hashtags) && <p className="text-sm text-primary mt-0.5">{post.hashtags.join(' ')}</p>}
      </div>

      {/* View all comments link */}
      {comments > 0 && (
        <button className="px-4 py-1" onClick={() => navigate(`/app/social/comments/${postId}`)}>
          <p className="text-sm text-muted-foreground">View all {formatCount(comments)} comments</p>
        </button>
      )}

      {/* Recent comments preview */}
      {recentComments.length > 0 && (
        <div className="px-4 space-y-0.5">
          {recentComments.map((c: any) => (
            <p key={c.id} className="text-sm"><span className="font-semibold mr-1">{c.user_id?.substring(0, 8)}</span><span className="text-muted-foreground">{c.content?.substring(0, 60)}{(c.content?.length || 0) > 60 ? '...' : ''}</span></p>
          ))}
        </div>
      )}

      {/* Inline comment input */}
      <div className="px-4 pb-3 pt-1">
        {showCommentInput ? (
          <div className="flex items-end gap-2">
            <textarea
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              placeholder="Add a comment..."
              className="flex-1 text-sm bg-muted/50 rounded-lg p-2 resize-none min-h-[40px] max-h-[120px] border-0 outline-none focus:ring-1 focus:ring-primary/30"
              rows={2}
              autoFocus
              onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); submitComment.mutate(); } }}
            />
            <button onClick={() => submitComment.mutate()} disabled={!commentText.trim()} className="text-sm font-semibold text-primary disabled:opacity-40 pb-2">Post</button>
          </div>
        ) : (
          <div className="flex items-center gap-2 text-sm text-muted-foreground cursor-pointer" onClick={() => setShowCommentInput(true)}>
            <span>Add a comment...</span>
            <span className="ml-auto">😊</span>
          </div>
        )}
      </div>
    </article>
  );
}

export default function SocialFeedPage() {
  const navigate = useNavigate();
  const { customerUser } = useAuth();
  const [feedMode, setFeedMode] = useState<'following' | 'for_you'>('for_you');
  const storiesRef = useRef<HTMLDivElement>(null);

  const { data: dbPosts = [] } = useSocialFeed(feedMode);

  // Fetch stories from DB
  const { data: storyUsers = [] } = useQuery({
    queryKey: ['social-feed-stories'],
    queryFn: async () => {
      const { data } = await supabase
        .from('social_stories')
        .select('user_id')
        .gt('expires_at', new Date().toISOString())
        .order('created_at', { ascending: false });
      if (!data?.length) return [];
      const seen = new Set<string>();
      return data.filter((s: any) => { if (seen.has(s.user_id)) return false; seen.add(s.user_id); return true; })
        .map((s: any) => ({ id: s.user_id, username: s.user_id.substring(0, 8), avatar: '', seen: false }));
    },
  });

  const stories = [
    MOCK_STORIES[0],
    ...(storyUsers.length > 0 ? storyUsers : MOCK_STORIES.slice(1)),
  ];

  const posts = dbPosts.length > 0 ? dbPosts.map((p: any) => ({
    ...p,
    username: p.user_id?.substring(0, 8) || 'user',
    media: Array.isArray(p.media) ? p.media : [],
  })) : FALLBACK_POSTS;

  const content = (
    <>
      {/* Mobile header */}
      <header className="sticky top-0 z-30 bg-card border-b border-border/30 md:hidden">
        <div className="max-w-xl mx-auto flex items-center justify-between px-4 py-3">
          <span className="text-2xl font-bold tracking-tight bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">Socio</span>
          <div className="flex items-center gap-3">
            <button onClick={() => navigate("/app/social/create")} className="p-1.5"><Plus className="h-6 w-6" /></button>
            <button onClick={() => navigate("/app/social/notifications")} className="p-1.5 relative">
              <Heart className="h-6 w-6" />
              <span className="absolute top-0 right-0 h-2.5 w-2.5 bg-destructive rounded-full" />
            </button>
            <button onClick={() => navigate("/app/social/messages")} className="p-1.5"><Send className="h-6 w-6" /></button>
          </div>
        </div>
      </header>

      {/* Desktop stories header */}
      <div className="hidden md:block px-4 pt-4">
        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Stories</span>
      </div>

      {/* Stories - horizontally scrollable */}
      <div ref={storiesRef} className="flex gap-3 px-4 py-3 overflow-x-auto scrollbar-hide border-b border-border/20" style={{ WebkitOverflowScrolling: 'touch' }}>
        {stories.map((story: any) => (
          <button key={story.id} className="flex flex-col items-center gap-1 shrink-0"
            onClick={() => navigate(story.isOwn ? "/app/social/create" : `/app/social/stories/${story.id}`)}>
            <div className={`relative p-[2px] rounded-full ${story.isOwn ? '' : story.seen ? 'bg-muted' : 'bg-gradient-to-tr from-amber-400 via-rose-500 to-purple-600'}`}>
              <div className="h-14 w-14 md:h-16 md:w-16 rounded-full bg-card p-[2px]">
                <div className="h-full w-full rounded-full bg-muted flex items-center justify-center overflow-hidden">
                  {story.isOwn ? (
                    <div className="relative h-full w-full bg-accent flex items-center justify-center"><Plus className="h-5 w-5 text-muted-foreground" /></div>
                  ) : story.avatar ? (
                    <img src={story.avatar} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-sm font-bold text-muted-foreground">{story.username.charAt(0).toUpperCase()}</span>
                  )}
                </div>
              </div>
            </div>
            <span className="text-[10px] max-w-[56px] truncate text-center">
              {story.isOwn ? "Your Story" : story.username.split('_')[0]}
            </span>
          </button>
        ))}
      </div>

      {/* Feed */}
      <div className="pb-20 md:pb-8">
        {posts.map((post: any) => <PostCard key={post.id} post={post} />)}
        <div className="py-6 px-4 text-center">
          <p className="text-sm font-semibold mb-1">You're All Caught Up</p>
          <p className="text-xs text-muted-foreground">You've seen all new posts from the last 3 days.</p>
        </div>
      </div>
    </>
  );

  return <SocialLayout>{content}</SocialLayout>;
}
