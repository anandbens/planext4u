import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Heart, MessageCircle, Send, Bookmark, MoreHorizontal, Plus, ChevronDown, Repeat2 } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/lib/auth";
import { toast } from "sonner";
import SocialLayout from "@/components/social/SocialLayout";
import { useSocialFeed, useSharePost, useRepost } from "@/hooks/use-social-interactions";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

const MOCK_STORIES = [
  { id: "own", username: "Your Story", avatar: "", isOwn: true, seen: false },
  { id: "1", username: "vijay_kumar", avatar: "", seen: false },
  { id: "2", username: "priya_designs", avatar: "", seen: false },
  { id: "3", username: "rahul_food", avatar: "", seen: true },
  { id: "4", username: "anita_travel", avatar: "", seen: true },
  { id: "5", username: "karthik_tech", avatar: "", seen: false },
  { id: "6", username: "sneha_art", avatar: "", seen: true },
  { id: "7", username: "deepak_fit", avatar: "", seen: false },
];

// Fallback mock posts when DB is empty
const FALLBACK_POSTS = [
  {
    id: "p1", user_id: "mock", username: "vijay_sivakumar", displayName: "Vijay Sivakumar",
    isVerified: true, location_name: "Pondicherry, TN", created_at: new Date(Date.now() - 3600000).toISOString(),
    media: [
      { type: "photo", url: "https://images.unsplash.com/photo-1558618666-fcd25c85f82e?w=600&h=600&fit=crop" },
      { type: "photo", url: "https://images.unsplash.com/photo-1449824913935-59a10b8d2000?w=600&h=600&fit=crop" },
    ],
    caption: "Just tried the amazing coffee from Brooklyn Coffee Co.! Best...",
    hashtags: ["#coffee", "#local", "#brooklyn"],
    like_count: 1600, comment_count: 800, share_count: 145,
    collabUser: "Kokila",
  },
  {
    id: "p2", user_id: "mock", username: "planext4u", displayName: "Planext4u",
    isVerified: true, location_name: "Coimbatore, TN", created_at: new Date(Date.now() - 10800000).toISOString(),
    media: [{ type: "photo", url: "https://images.unsplash.com/photo-1449824913935-59a10b8d2000?w=600&h=600&fit=crop" }],
    caption: "Exciting things are coming to P4U! Stay tuned for the biggest update yet 🚀",
    hashtags: ["#planext4u", "#superapp"],
    like_count: 3200, comment_count: 450, share_count: 890,
  },
  {
    id: "p3", user_id: "mock", username: "priya_designs", displayName: "Priya Designs",
    isVerified: false, location_name: "Chennai, TN", created_at: new Date(Date.now() - 18000000).toISOString(),
    media: [{ type: "photo", url: "https://images.unsplash.com/photo-1513364776144-60967b0f800f?w=600&h=600&fit=crop" }],
    caption: "New collection dropping soon! What do you think of these designs? 🎨✨",
    hashtags: ["#design", "#art"],
    like_count: 892, comment_count: 67, share_count: 23,
  },
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
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

// Individual post card with its own like/bookmark state from DB
function PostCard({ post }: { post: any }) {
  const navigate = useNavigate();
  const { customerUser } = useAuth();
  const qc = useQueryClient();
  const sharePost = useSharePost();
  const repost = useRepost();
  const [carouselIdx, setCarouselIdx] = useState(0);

  const userId = customerUser?.id;
  const postId = post.id;
  const mediaItems = Array.isArray(post.media) ? post.media : [];
  const isCarousel = mediaItems.length > 1;

  // Like state from DB
  const { data: isLiked = false } = useQuery({
    queryKey: ['social-like', postId, userId],
    queryFn: async () => {
      if (!userId) return false;
      const { data } = await supabase.from('social_likes').select('id').eq('post_id', postId).eq('user_id', userId).maybeSingle();
      return !!data;
    },
    enabled: !!userId && postId !== 'p1' && postId !== 'p2' && postId !== 'p3',
  });

  const { data: likeCount = post.like_count || 0 } = useQuery({
    queryKey: ['social-like-count', postId],
    queryFn: async () => {
      const { count } = await supabase.from('social_likes').select('*', { count: 'exact', head: true }).eq('post_id', postId);
      return count || 0;
    },
    enabled: postId !== 'p1' && postId !== 'p2' && postId !== 'p3',
  });

  // Bookmark state from DB
  const { data: isSaved = false } = useQuery({
    queryKey: ['social-bookmark', postId, userId],
    queryFn: async () => {
      if (!userId) return false;
      const { data } = await supabase.from('social_bookmarks').select('id').eq('post_id', postId).eq('user_id', userId).maybeSingle();
      return !!data;
    },
    enabled: !!userId && postId !== 'p1' && postId !== 'p2' && postId !== 'p3',
  });

  // Local state for mock posts
  const [localLiked, setLocalLiked] = useState(false);
  const [localSaved, setLocalSaved] = useState(false);
  const [localLikeCount, setLocalLikeCount] = useState(post.like_count || 0);

  const isMock = postId === 'p1' || postId === 'p2' || postId === 'p3';
  const liked = isMock ? localLiked : isLiked;
  const saved = isMock ? localSaved : isSaved;
  const likes = isMock ? localLikeCount : likeCount;

  const toggleLike = useMutation({
    mutationFn: async () => {
      if (isMock) {
        setLocalLiked(v => !v);
        setLocalLikeCount(v => localLiked ? v - 1 : v + 1);
        return;
      }
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
      if (isMock) {
        setLocalSaved(v => !v);
        toast.success(localSaved ? "Removed from saved" : "Post saved");
        return;
      }
      if (!userId) { toast.error("Please login"); return; }
      if (isSaved) {
        await supabase.from('social_bookmarks').delete().eq('post_id', postId).eq('user_id', userId);
        toast.success("Removed from saved");
      } else {
        await supabase.from('social_bookmarks').insert({ post_id: postId, user_id: userId });
        toast.success("Post saved");
      }
    },
    onSuccess: () => {
      if (!isMock) qc.invalidateQueries({ queryKey: ['social-bookmark', postId] });
    },
  });

  const username = post.username || 'user';
  const commentCount = post.comment_count || 0;
  const shareCount = post.share_count || 0;

  return (
    <article className="border-b border-border/20">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3">
        <Link to={`/app/social/@${username}`}>
          <div className="h-9 w-9 rounded-full bg-gradient-to-tr from-amber-400 to-rose-500 p-[1.5px]">
            <div className="h-full w-full rounded-full bg-card flex items-center justify-center">
              <span className="text-xs font-bold">{username.charAt(0).toUpperCase()}</span>
            </div>
          </div>
        </Link>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1 flex-wrap">
            <Link to={`/app/social/@${username}`} className="text-sm font-semibold">{username}</Link>
            {post.isVerified && (
              <svg className="h-3.5 w-3.5 text-primary fill-current shrink-0" viewBox="0 0 24 24"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" /></svg>
            )}
            {post.collabUser && (
              <span className="text-sm text-muted-foreground"> and <span className="font-semibold text-foreground">{post.collabUser}</span></span>
            )}
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
            src={mediaItems[carouselIdx]?.url || mediaItems[0]?.url || ''}
            alt="" className="w-full h-full object-cover" loading="lazy"
            onDoubleClick={() => toggleLike.mutate()}
          />
        ) : (
          <div className="w-full h-full bg-accent/30 flex items-center justify-center">
            <span className="text-muted-foreground text-sm">No media</span>
          </div>
        )}
        {isCarousel && (
          <>
            {carouselIdx > 0 && (
              <button className="absolute left-2 top-1/2 -translate-y-1/2 bg-card/80 rounded-full p-1"
                onClick={() => setCarouselIdx(i => i - 1)}>
                <ChevronDown className="h-4 w-4 -rotate-90" />
              </button>
            )}
            {carouselIdx < mediaItems.length - 1 && (
              <button className="absolute right-2 top-1/2 -translate-y-1/2 bg-card/80 rounded-full p-1"
                onClick={() => setCarouselIdx(i => i + 1)}>
                <ChevronDown className="h-4 w-4 rotate-90" />
              </button>
            )}
            <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1">
              {mediaItems.map((_: any, i: number) => (
                <div key={i} className={`h-1.5 w-1.5 rounded-full ${i === carouselIdx ? 'bg-primary' : 'bg-white/50'}`} />
              ))}
            </div>
          </>
        )}
      </div>

      {/* Actions */}
      <div className="flex items-center justify-between px-4 py-2.5">
        <div className="flex items-center gap-4">
          <button onClick={() => toggleLike.mutate()}>
            <AnimatePresence mode="wait">
              {liked ? (
                <motion.div key="liked" initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", stiffness: 500, damping: 15 }}>
                  <Heart className="h-6 w-6 fill-red-500 text-red-500" />
                </motion.div>
              ) : (
                <motion.div key="unliked"><Heart className="h-6 w-6" /></motion.div>
              )}
            </AnimatePresence>
          </button>
          <button onClick={() => navigate(`/app/social/comments/${postId}`)}>
            <MessageCircle className="h-6 w-6" />
          </button>
          <button onClick={() => repost.mutate(postId)}>
            <Repeat2 className="h-6 w-6" />
          </button>
          <button onClick={() => sharePost(postId, post.caption)}>
            <Send className="h-6 w-6" />
          </button>
        </div>
        <button onClick={() => toggleBookmark.mutate()}>
          <Bookmark className={`h-6 w-6 ${saved ? 'fill-foreground' : ''}`} />
        </button>
      </div>

      {/* Stats line */}
      <div className="px-4 flex items-center gap-3 text-sm">
        <span className="flex items-center gap-1"><Heart className="h-4 w-4" /> {formatCount(likes)}</span>
        <span className="flex items-center gap-1"><MessageCircle className="h-4 w-4" /> {formatCount(commentCount)}</span>
        <span className="flex items-center gap-1"><Send className="h-4 w-4" /> {formatCount(shareCount)}</span>
      </div>

      {/* Caption */}
      <div className="px-4 py-1.5">
        <p className="text-sm">
          <Link to={`/app/social/@${username}`} className="font-semibold mr-1">{username}</Link>
          {post.caption}
          <span className="text-primary ml-1 cursor-pointer">more</span>
        </p>
        {post.hashtags && Array.isArray(post.hashtags) && (
          <p className="text-sm text-primary mt-0.5">{post.hashtags.join(' ')}</p>
        )}
      </div>

      <button className="px-4 py-1" onClick={() => navigate(`/app/social/comments/${postId}`)}>
        <p className="text-sm text-muted-foreground">View all {formatCount(commentCount)} comments</p>
      </button>
      <div className="px-4 pb-3">
        <div className="flex items-center gap-2 text-sm text-muted-foreground" onClick={() => navigate(`/app/social/comments/${postId}`)}>
          <span>Add a comment...</span>
          <span className="ml-auto">😊</span>
        </div>
      </div>
    </article>
  );
}

export default function SocialFeedPage() {
  const navigate = useNavigate();
  const { customerUser } = useAuth();
  const [feedMode, setFeedMode] = useState<'following' | 'for_you'>('for_you');

  // Try to load from DB
  const { data: dbPosts = [] } = useSocialFeed(feedMode);

  // Use fallback if DB is empty
  const posts = dbPosts.length > 0 ? dbPosts.map((p: any) => ({
    ...p,
    username: p.user_id?.substring(0, 8) || 'user',
    media: Array.isArray(p.media) ? p.media : [],
  })) : FALLBACK_POSTS;

  const content = (
    <>
      {/* Mobile header - Socio branding */}
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

      {/* Desktop header label */}
      <div className="hidden md:block px-4 pt-4">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Stories</span>
        </div>
      </div>

      {/* Stories Row */}
      <div className="flex gap-3 px-4 py-3 overflow-x-auto scrollbar-hide border-b border-border/20">
        {MOCK_STORIES.map((story) => (
          <button key={story.id} className="flex flex-col items-center gap-1 shrink-0" onClick={() => navigate(story.isOwn ? "/app/social/create" : `/app/social/stories/${story.id}`)}>
            <div className={`relative p-[2px] rounded-full ${story.isOwn ? '' : story.seen ? 'bg-muted' : 'bg-gradient-to-tr from-amber-400 via-rose-500 to-purple-600'}`}>
              <div className="h-14 w-14 md:h-16 md:w-16 rounded-full bg-card p-[2px]">
                <div className="h-full w-full rounded-full bg-muted flex items-center justify-center overflow-hidden">
                  {story.isOwn ? (
                    <div className="relative h-full w-full bg-accent flex items-center justify-center">
                      <Plus className="h-5 w-5 text-muted-foreground" />
                    </div>
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

      {/* Posts */}
      <div className="pb-20 md:pb-8">
        {posts.map((post: any) => (
          <PostCard key={post.id} post={post} />
        ))}

        <div className="py-6 px-4 text-center">
          <p className="text-sm font-semibold mb-1">You're All Caught Up</p>
          <p className="text-xs text-muted-foreground">You've seen all new posts from the last 3 days.</p>
        </div>
      </div>
    </>
  );

  return <SocialLayout>{content}</SocialLayout>;
}
