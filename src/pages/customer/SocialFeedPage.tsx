import { useState, useRef, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Heart, MessageCircle, Send, Bookmark, MoreHorizontal, Plus, ChevronDown, Repeat2, X, ShoppingBag } from "lucide-react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/lib/auth";
import { toast } from "sonner";
import SocialLayout from "@/components/social/SocialLayout";
import { useSocialFeed, useSharePost, useRepost } from "@/hooks/use-social-interactions";
import { isSocialModerator } from "@/lib/social-moderator";
import { supabase } from "@/integrations/supabase/client";
import PeopleYouMayKnow from "@/components/social/PeopleYouMayKnow";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { usePlacementAds, SocialFeedAd } from "@/components/customer/BannerAd";

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

// No mock stories - only real DB stories are shown

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

function CommentItem({ comment, isMock, postId, onReply }: { comment: any; isMock: boolean; postId: string; onReply?: (name: string) => void }) {
  const { customerUser } = useAuth();
  const qc = useQueryClient();
  const userId = customerUser?.supabase_uid || customerUser?.id;

  const { data: profile } = useQuery({
    queryKey: ['social-comment-profile', comment.user_id],
    queryFn: async () => {
      const { data } = await supabase.from('social_profiles').select('username, display_name, avatar_url').eq('user_id', comment.user_id).maybeSingle();
      return data;
    },
    enabled: !isMock && !!comment.user_id,
  });

  const { data: isLiked = false } = useQuery({
    queryKey: ['social-comment-like', comment.id, userId],
    queryFn: async () => {
      if (!userId) return false;
      const { data } = await supabase.from('social_comment_likes').select('id').eq('comment_id', comment.id).eq('user_id', userId).maybeSingle();
      return !!data;
    },
    enabled: !isMock && !!userId && !!comment.id,
  });

  const toggleLike = useMutation({
    mutationFn: async () => {
      if (isMock) return;
      if (!userId) { toast.error("Please login"); return; }
      if (isLiked) {
        await supabase.from('social_comment_likes').delete().eq('comment_id', comment.id).eq('user_id', userId);
      } else {
        await supabase.from('social_comment_likes').insert({ comment_id: comment.id, user_id: userId });
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['social-comment-like', comment.id] });
      qc.invalidateQueries({ queryKey: ['social-recent-comments', postId] });
      qc.invalidateQueries({ queryKey: ['social-all-comments', postId] });
    },
  });

  const name = isMock ? (comment.user_id === 'user1' ? 'vijay' : comment.user_id === 'user2' ? 'priya' : 'anita') : (profile?.display_name || profile?.username || 'user');
  const avatar = profile?.avatar_url || '';
  const likeCount = comment.like_count || 0;

  return (
    <div className="flex items-start gap-2 py-1">
      <div className="h-6 w-6 rounded-full bg-muted flex items-center justify-center shrink-0 overflow-hidden">
        {avatar ? <img src={avatar} alt="" className="w-full h-full object-cover" /> : <span className="text-[9px] font-bold">{name.charAt(0).toUpperCase()}</span>}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm">
          <span className="font-semibold mr-1">{name}</span>
          <span className="text-muted-foreground">{comment.content}</span>
        </p>
        <div className="flex items-center gap-3 mt-0.5">
          {likeCount > 0 && <span className="text-[10px] text-muted-foreground">{likeCount} {likeCount === 1 ? 'like' : 'likes'}</span>}
          {onReply && (
            <button className="text-[10px] font-semibold text-muted-foreground hover:text-foreground" onClick={() => onReply(name)}>
              Reply
            </button>
          )}
        </div>
      </div>
      <button onClick={() => toggleLike.mutate()} className="shrink-0 pt-1" aria-label="Like comment">
        <Heart className={`h-3.5 w-3.5 ${isLiked ? 'fill-red-500 text-red-500' : 'text-muted-foreground'}`} />
      </button>
    </div>
  );
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
  const [showAllComments, setShowAllComments] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [fullscreenImg, setFullscreenImg] = useState<string | null>(null);
  const [showProductTags, setShowProductTags] = useState(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  const userId = customerUser?.supabase_uid || customerUser?.id;
  const postId = post.id;
  const mediaItems = Array.isArray(post.media) ? post.media : [];
  const isCarousel = mediaItems.length > 1;
  const isMock = ['p1', 'p2', 'p3', 'p4', 'p5', 'p6'].includes(postId);

  // Autoplay video on scroll into view
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          video.play().catch(() => {});
        } else {
          video.pause();
        }
      },
      { threshold: 0.5 }
    );
    observer.observe(video);
    return () => observer.disconnect();
  }, [carouselIdx]);

  const EMOJI_PALETTE = ["😀","😂","😍","🥰","😎","🤩","😢","😡","👍","👏","🔥","❤️","💯","🎉","🙌","💪","🤔","😅","🥺","✨","💕","🎊","👀","🤗","😤","💀","🫡","🤝"];
  const GIF_STICKERS = ["😊","🎉","🔥","💯","👏","❤️‍🔥","🥳","🫶","💐","🌟"];

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

  // All comments for inline display
  const { data: allComments = [] } = useQuery({
    queryKey: ['social-all-comments', postId],
    queryFn: async () => {
      const { data } = await supabase.from('social_comments').select('id, content, user_id, created_at, like_count').eq('post_id', postId).eq('status', 'active').is('parent_id', null).order('created_at', { ascending: false }).limit(20);
      return data || [];
    },
    enabled: !isMock && showAllComments,
  });

  const { data: recentComments = [] } = useQuery({
    queryKey: ['social-recent-comments', postId],
    queryFn: async () => {
      const { data } = await supabase.from('social_comments').select('id, content, user_id, like_count').eq('post_id', postId).eq('status', 'active').is('parent_id', null).order('created_at', { ascending: false }).limit(2);
      return data || [];
    },
    enabled: !isMock,
  });

  const [localLiked, setLocalLiked] = useState(false);
  const [localSaved, setLocalSaved] = useState(false);
  const [localLikeCount, setLocalLikeCount] = useState(post.like_count || 0);
  const [mockComments, setMockComments] = useState([
    { id: 'mc1', user_id: 'user1', content: 'This is amazing! 🔥', created_at: new Date(Date.now() - 3600000).toISOString() },
    { id: 'mc2', user_id: 'user2', content: 'Love this post ❤️', created_at: new Date(Date.now() - 7200000).toISOString() },
    { id: 'mc3', user_id: 'user3', content: 'So beautiful 😍', created_at: new Date(Date.now() - 10800000).toISOString() },
  ]);

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
      if (isMock) {
        setMockComments(prev => [{ id: `mc${Date.now()}`, user_id: userId || 'you', content: commentText.trim(), created_at: new Date().toISOString() }, ...prev]);
        toast.success("Comment posted");
        setCommentText("");
        return;
      }
      if (!userId) { toast.error("Please login"); return; }
      await supabase.from('social_comments').insert({ post_id: postId, user_id: userId, content: commentText.trim() });
      setCommentText("");
      toast.success("Comment posted");
    },
    onSuccess: () => {
      if (!isMock) {
        qc.invalidateQueries({ queryKey: ['social-comment-count', postId] });
        qc.invalidateQueries({ queryKey: ['social-recent-comments', postId] });
        qc.invalidateQueries({ queryKey: ['social-all-comments', postId] });
      }
    },
  });

  const username = isMock ? post.username : (postProfile?.display_name || postProfile?.username || 'user');
  const isVerified = isMock ? post.isVerified : (postProfile?.is_verified || false);
  const avatarUrl = isMock ? '' : (postProfile?.avatar_url || '');

  const displayComments = isMock ? mockComments : (showAllComments ? allComments : recentComments);

  const isRepost = !!post.is_repost && !!post.original_post;
  const original = post.original_post;
  const originalOwner = original?.owner;
  const originalOwnerName = originalOwner?.display_name || originalOwner?.username || 'user';

  return (
    <article className="border-b border-border/20">
      {/* Repost credit banner */}
      {isRepost && (
        <div className="flex items-center gap-2 px-4 pt-3 pb-1 text-xs text-muted-foreground">
          <Repeat2 className="h-3.5 w-3.5" />
          <span>
            <Link to={`/app/social/profile/${post.user_id}`} className="font-semibold text-foreground">{username}</Link>
            {' reposted • Original by '}
            <Link to={`/app/social/profile/${original.user_id}`} className="font-semibold text-foreground">@{originalOwnerName}</Link>
          </span>
        </div>
      )}
      {isRepost && post.repost_note && (
        <p className="px-4 pb-1 text-sm text-foreground/80 italic">"{post.repost_note}"</p>
      )}
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3">
        <Link to={`/app/social/profile/${post.user_id}`}>
          <div className="h-9 w-9 rounded-full bg-gradient-to-tr from-amber-400 to-rose-500 p-[1.5px]">
            <div className="h-full w-full rounded-full bg-card flex items-center justify-center overflow-hidden">
              {avatarUrl ? <img src={avatarUrl} alt="" className="w-full h-full object-cover" /> :
                <span className="text-xs font-bold">{username.charAt(0).toUpperCase()}</span>}
            </div>
          </div>
        </Link>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1 flex-wrap">
            <Link to={`/app/social/profile/${post.user_id}`} className="text-sm font-semibold">{username}</Link>
            {isVerified && <svg className="h-3.5 w-3.5 text-primary fill-current shrink-0" viewBox="0 0 24 24"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" /></svg>}
            {post.collabUser && <span className="text-sm text-muted-foreground"> and <span className="font-semibold text-foreground">{post.collabUser}</span></span>}
          </div>
          <p className="text-[11px] text-muted-foreground">
            {post.location_name ? `${post.location_name} · ` : ''}{timeAgo(post.created_at)}
          </p>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild><button className="p-1"><MoreHorizontal className="h-5 w-5" /></button></DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {(userId === post.user_id || isSocialModerator(userId)) && (
              <DropdownMenuItem className="text-destructive" onClick={async () => {
                if (!confirm("Are you sure you want to delete this post?")) return;
                const isMod = isSocialModerator(userId);
                const deleteQuery = isMod && userId !== post.user_id
                  ? supabase.from('social_posts').delete().eq('id', postId)
                  : supabase.from('social_posts').delete().eq('id', postId).eq('user_id', userId);
                const { error } = await deleteQuery;
                if (error) { toast.error("Failed to delete post"); return; }
                toast.success("Post deleted");
                qc.invalidateQueries({ queryKey: ['social-feed'] });
              }}>Delete Post</DropdownMenuItem>
            )}
            <DropdownMenuItem onClick={async () => {
              if (!userId) { toast.error("Please login"); return; }
              await supabase.from('social_reports').insert({ reporter_id: userId, content_type: 'post', content_id: postId, reason: 'not_interested', details: '', status: 'dismissed' } as any);
              toast.success("Post hidden from your feed");
              qc.invalidateQueries({ queryKey: ['social-feed'] });
            }}>Not Interested</DropdownMenuItem>
            <DropdownMenuItem onClick={async () => {
              if (!userId) { toast.error("Please login"); return; }
              await supabase.from('social_reports').insert({ reporter_id: userId, content_type: 'post', content_id: postId, reason: 'inappropriate', details: '', status: 'pending' } as any);
              toast.success("Post reported. We'll review it shortly.");
            }}>Report</DropdownMenuItem>
            <DropdownMenuItem onClick={() => sharePost(postId, post.caption)}>Copy Link</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Media */}
      <div className="relative aspect-square bg-muted overflow-hidden">
        {mediaItems.length > 0 ? (
          mediaItems[carouselIdx]?.type === 'video' ? (
            <video 
              ref={videoRef}
              src={mediaItems[carouselIdx]?.url || ''} 
              className="w-full h-full object-cover cursor-pointer"
              controls muted playsInline
              onClick={() => setFullscreenImg(mediaItems[carouselIdx]?.url || '')}
            />
          ) : (
            <img 
              src={mediaItems[carouselIdx]?.url || mediaItems[carouselIdx]?.mediumUrl || ''} 
              alt="" 
              className="w-full h-full object-cover cursor-pointer" 
              loading="lazy"
              referrerPolicy="no-referrer"
              crossOrigin="anonymous"
              onClick={() => setFullscreenImg(mediaItems[carouselIdx]?.url || mediaItems[carouselIdx]?.mediumUrl || '')}
              onDoubleClick={(e) => { e.stopPropagation(); toggleLike.mutate(); }}
              onError={(e) => {
                const target = e.currentTarget;
                if (!target.dataset.retried) {
                  target.dataset.retried = "1";
                  target.src = target.src.replace('&fit=crop', '&fit=crop&auto=format');
                }
              }}
            />
          )
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
        {/* Product Tags - YouTube Shorts style with product images */}
        {(() => {
          const tags = Array.isArray(post.product_tags) ? post.product_tags : [];
          if (tags.length === 0) return null;
          return (
            <>
              <style>{`
                @keyframes feed-product-pulse { 0%,100%{box-shadow:0 0 0 0 hsl(var(--primary)/0.4)} 50%{box-shadow:0 0 0 8px hsl(var(--primary)/0)} }
                @keyframes feed-product-bounce { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-3px)} }
              `}</style>
              <button
                className="absolute top-3 right-3 z-10 flex items-end gap-0.5 cursor-pointer"
                onClick={(e) => {
                  e.stopPropagation();
                  if (tags.length === 1) {
                    navigate(`/app/product/${tags[0].id}`);
                  } else {
                    setShowProductTags(prev => !prev);
                  }
                }}
                style={{ animation: "feed-product-bounce 2s ease-in-out infinite" }}
              >
                {/* Stacked product images like YT Shorts */}
                <div className="relative flex items-end">
                  {tags.slice(0, 2).map((tag: any, i: number) => (
                    <div key={tag.id} className={`rounded-lg overflow-hidden border-2 border-card shadow-xl bg-card ${i > 0 ? '-ml-5 relative z-0' : 'relative z-[1]'}`}
                      style={{ animation: "feed-product-pulse 2.5s ease-in-out infinite", width: i === 0 ? 56 : 48, height: i === 0 ? 56 : 48 }}>
                      {tag.socio_shopping_icon || tag.image ? (
                        <img src={tag.socio_shopping_icon || tag.image} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full bg-accent flex items-center justify-center"><ShoppingBag className="h-5 w-5 text-primary" /></div>
                      )}
                    </div>
                  ))}
                </div>
                {/* Count badge + arrow */}
                <div className="flex items-center gap-0.5 bg-card/95 backdrop-blur-sm rounded-full px-2 py-1 shadow-lg border border-border/50 mb-1 ml-1">
                  <span className="text-[11px] font-bold text-foreground">{tags.length} product{tags.length > 1 ? 's' : ''}</span>
                  <ChevronDown className="h-3 w-3 text-muted-foreground" />
                </div>
              </button>
            </>
          );
        })()}
        {/* Product Tags Popup */}
        {showProductTags && (() => {
          const tags = Array.isArray(post.product_tags) ? post.product_tags : [];
          if (tags.length === 0) return null;
          return (
            <div className="absolute top-[76px] right-3 z-20 bg-card rounded-xl shadow-xl border border-border p-2 max-w-[220px] animate-in fade-in slide-in-from-top-2 duration-200">
              {tags.map((tag: any) => (
                <button
                  key={tag.id}
                  className="flex items-center gap-2.5 w-full text-left px-2 py-2 rounded-lg hover:bg-accent transition-colors"
                  onClick={(e) => { e.stopPropagation(); navigate(`/app/product/${tag.id}`); }}
                >
                  {tag.socio_shopping_icon || tag.image ? (
                    <img src={tag.socio_shopping_icon || tag.image} alt="" className="h-10 w-10 rounded-lg object-cover shrink-0 border border-border/50" />
                  ) : (
                    <div className="h-10 w-10 rounded-lg bg-accent flex items-center justify-center shrink-0"><ShoppingBag className="h-5 w-5 text-primary" /></div>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-semibold truncate">{tag.title}</p>
                    {tag.price && <p className="text-[11px] font-bold text-primary">₹{Number(tag.price).toLocaleString()}</p>}
                  </div>
                  <ChevronDown className="h-3.5 w-3.5 text-muted-foreground -rotate-90 shrink-0" />
                </button>
              ))}
            </div>
          );
        })()}
      </div>

      {/* Fullscreen Image Viewer */}
      <Dialog open={!!fullscreenImg} onOpenChange={() => setFullscreenImg(null)}>
        <DialogContent className="max-w-[95vw] max-h-[95vh] p-0 bg-black border-0 overflow-hidden">
          <button onClick={() => setFullscreenImg(null)} className="absolute top-3 right-3 z-50 h-8 w-8 rounded-full bg-black/60 flex items-center justify-center">
            <X className="h-5 w-5 text-white" />
          </button>
          {fullscreenImg && (
            fullscreenImg.includes('video') || fullscreenImg.endsWith('.mp4') ? (
              <video src={fullscreenImg} className="w-full h-full object-contain max-h-[90vh]" controls autoPlay />
            ) : (
              <img src={fullscreenImg} alt="" className="w-full h-full object-contain max-h-[90vh]" />
            )
          )}
          {isCarousel && fullscreenImg && (
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
              {mediaItems.map((_: any, i: number) => (
                <button key={i} onClick={() => setFullscreenImg(mediaItems[i]?.url || mediaItems[i]?.mediumUrl || '')}
                  className={`h-2 w-2 rounded-full ${(mediaItems[i]?.url || mediaItems[i]?.mediumUrl) === fullscreenImg ? 'bg-white' : 'bg-white/40'}`} />
              ))}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Action Bar */}
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
            {!post.hide_like_count && <span className="text-sm font-semibold">{formatCount(likes)}</span>}
          </button>
          {post.allow_comments !== 'off' && (
            <button className="flex items-center gap-1.5" onClick={() => { if (!userId) { toast.error("Please login to comment"); navigate("/app/login"); return; } setShowCommentInput(v => !v); }}>
              <MessageCircle className="h-6 w-6" />
              <span className="text-sm">{formatCount(comments)}</span>
            </button>
          )}
          <button className="flex items-center gap-1.5" onClick={() => {
            const note = window.prompt("Add a note to your repost (optional)") || undefined;
            repost.mutate({ postId, note });
          }} title="Repost">
            <Repeat2 className="h-6 w-6" />
          </button>
          <button className="flex items-center gap-1.5" onClick={() => sharePost(postId, post.caption)} title="Share Link">
            <Send className="h-6 w-6" />
            <span className="text-sm">{formatCount(shareCount)}</span>
          </button>
        </div>
        <button onClick={() => toggleBookmark.mutate()}><Bookmark className={`h-6 w-6 ${saved ? 'fill-foreground' : ''}`} /></button>
      </div>

      {/* Caption */}
      <div className="px-4 py-1">
        <p className="text-sm">
          <Link to={`/app/social/profile/${post.user_id}`} className="font-semibold mr-1">{username}</Link>
          {post.caption}
          <span className="text-primary ml-1 cursor-pointer">more</span>
        </p>
        {post.hashtags && Array.isArray(post.hashtags) && <p className="text-sm text-primary mt-0.5">{post.hashtags.join(' ')}</p>}
      </div>

      {/* View all comments - inline expand */}
      {post.allow_comments !== 'off' && comments > 0 && !showAllComments && (
        <button className="px-4 py-1" onClick={() => setShowAllComments(true)}>
          <p className="text-sm text-muted-foreground">View all {formatCount(comments)} comments</p>
        </button>
      )}

      {/* Inline comments with accordion */}
      {post.allow_comments !== 'off' && (
        <AnimatePresence>
          {(showAllComments || recentComments.length > 0 || (isMock && mockComments.length > 0)) && (
            <motion.div
              initial={showAllComments ? { height: 0, opacity: 0 } : false}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.3, ease: "easeInOut" }}
              className="overflow-hidden"
            >
              <div className="px-4 space-y-1 max-h-60 overflow-y-auto">
                {(!showAllComments && !isMock ? recentComments : displayComments).map((c: any) => (
                  <CommentItem key={c.id} comment={c} isMock={isMock} postId={postId} onReply={(name) => {
                    setShowCommentInput(true);
                    setCommentText(prev => prev.includes(`@${name}`) ? prev : `@${name} ` + prev);
                  }} />
                ))}
              </div>
              {showAllComments && (
                <button className="px-4 py-1" onClick={() => setShowAllComments(false)}>
                  <p className="text-xs text-primary font-medium">Hide comments</p>
                </button>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      )}

      {/* Inline comment input with accordion expand + emoji/GIF */}
      <div className="px-4 pb-3 pt-1">
        <AnimatePresence>
          {showCommentInput ? (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.25, ease: "easeOut" }}
              className="overflow-hidden"
            >
              <div className="space-y-2">
                <textarea
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                  placeholder="Add a comment..."
                  className="w-full text-sm bg-muted/50 rounded-lg p-3 resize-none min-h-[60px] max-h-[140px] border border-border/30 outline-none focus:ring-1 focus:ring-primary/30"
                  rows={3}
                  autoFocus
                  onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); submitComment.mutate(); } }}
                />
                {/* Emoji quick bar */}
                <div className="flex items-center gap-1 overflow-x-auto scrollbar-hide">
                  {GIF_STICKERS.map(e => (
                    <button key={e} className="text-lg shrink-0 hover:scale-125 transition-transform" onClick={() => setCommentText(prev => prev + e)}>{e}</button>
                  ))}
                  <button className="shrink-0 text-xs font-medium text-primary px-2 py-1 rounded-full border border-primary/30 ml-1"
                    onClick={() => setShowEmojiPicker(v => !v)}>
                    😊 More
                  </button>
                </div>
                {/* Full emoji picker */}
                <AnimatePresence>
                  {showEmojiPicker && (
                    <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                      <div className="grid grid-cols-7 gap-1 p-2 bg-muted/30 rounded-lg max-h-32 overflow-y-auto">
                        {EMOJI_PALETTE.map(e => (
                          <button key={e} className="text-xl p-1 hover:bg-primary/10 rounded transition-colors" onClick={() => setCommentText(prev => prev + e)}>{e}</button>
                        ))}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
                {/* Rich text hint + actions */}
                <div className="flex items-center justify-between">
                  <p className="text-[10px] text-muted-foreground">**bold** _italic_ ~strike~</p>
                  <div className="flex gap-2 items-center">
                    <Button variant="outline" size="sm" className="h-7 px-3 text-xs font-semibold rounded-full" onClick={() => setShowCommentInput(false)}>Cancel</Button>
                    <Button size="sm" className="h-7 px-4 text-xs font-semibold rounded-full" onClick={() => submitComment.mutate()} disabled={!commentText.trim()}>Post</Button>
                  </div>
                </div>
              </div>
            </motion.div>
          ) : (
            <div className="flex items-center gap-2 text-sm text-muted-foreground cursor-pointer" onClick={() => { if (!userId) { toast.error("Please login to comment"); navigate("/app/login"); return; } setShowCommentInput(true); }}>
              <span>Add a comment...</span>
              <span className="ml-auto">😊</span>
            </div>
          )}
        </AnimatePresence>
      </div>
    </article>
  );
}

/** Generates a thumbnail from a video URL by capturing the first frame */
function VideoThumbnail({ src }: { src: string }) {
  const [thumb, setThumb] = useState<string | null>(null);
  const attempted = useRef(false);

  useEffect(() => {
    if (attempted.current || !src) return;
    attempted.current = true;
    const video = document.createElement('video');
    video.crossOrigin = 'anonymous';
    video.muted = true;
    video.preload = 'metadata';
    video.playsInline = true;

    video.onloadeddata = () => {
      video.currentTime = 0.5; // Seek to 0.5s for a better frame
    };

    video.onseeked = () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = 128;
        canvas.height = 128;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          // Draw center crop
          const size = Math.min(video.videoWidth, video.videoHeight);
          const sx = (video.videoWidth - size) / 2;
          const sy = (video.videoHeight - size) / 2;
          ctx.drawImage(video, sx, sy, size, size, 0, 0, 128, 128);
          setThumb(canvas.toDataURL('image/jpeg', 0.7));
        }
      } catch { /* CORS or other error */ }
    };

    video.onerror = () => { /* fallback handled by render */ };
    video.src = src;
    video.load();

    return () => { video.pause(); video.src = ''; };
  }, [src]);

  if (thumb) {
    return <img src={thumb} alt="" className="w-full h-full object-cover" />;
  }
  // Fallback: show a play icon on dark background
  return (
    <div className="w-full h-full bg-accent/50 flex items-center justify-center">
      <svg className="h-5 w-5 text-muted-foreground" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>
    </div>
  );
}

function StoryBubble({ story, navigate, customerUser }: { story: any; navigate: any; customerUser: any }) {
  const fileRef = useRef<HTMLInputElement>(null);
  const qc = useQueryClient();
  const authUid = customerUser?.supabase_uid || customerUser?.id;

  // Check if current user has active stories
  const { data: hasOwnStories = false } = useQuery({
    queryKey: ['own-stories-exist', authUid],
    queryFn: async () => {
      if (!authUid) return false;
      const { count } = await supabase.from('social_stories').select('*', { count: 'exact', head: true })
        .eq('user_id', authUid).gt('expires_at', new Date().toISOString());
      return (count || 0) > 0;
    },
    enabled: story.isOwn && !!authUid,
  });

  const handleYourStoryClick = () => {
    if (!story.isOwn) {
      navigate(`/app/social/stories/${story.id}`);
      return;
    }
    if (!authUid) { toast.error("Please login"); navigate("/app/login"); return; }
    if (hasOwnStories) {
      navigate(`/app/social/stories/${authUid}`);
    } else {
      fileRef.current?.click();
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;
    if (!authUid) return;

    // Ensure social profile exists
    const { data: existingProfile } = await supabase.from('social_profiles').select('id').eq('user_id', authUid).maybeSingle();
    if (!existingProfile) {
      await supabase.from('social_profiles').insert({
        user_id: authUid,
        username: customerUser.name?.toLowerCase().replace(/\s+/g, '_') || 'user',
        display_name: customerUser.name || 'User',
      } as any);
    }

    toast.info(`Uploading ${files.length} story item(s)...`);

    for (const file of files) {
      const isVideo = file.type.startsWith('video/');
      const maxSize = isVideo ? 50 * 1024 * 1024 : 10 * 1024 * 1024;
      if (file.size > maxSize) {
        toast.error(`${file.name} is too large. Max ${isVideo ? '50MB' : '10MB'}.`);
        continue;
      }

      const storyId = crypto.randomUUID();
      let uploadBlob: Blob = file;
      let uploadContentType = file.type;
      let ext = file.name.split('.').pop() || (isVideo ? 'mp4' : 'jpg');

      if (!isVideo && file.type.startsWith('image/')) {
        try {
          const { compressToWebP } = await import('@/lib/webp-compress');
          const compressed = await compressToWebP(file);
          uploadBlob = compressed.blob;
          uploadContentType = compressed.contentType;
          ext = 'webp';
        } catch { /* fallback to original */ }
      }

      let url: string;
      try {
        const { uploadToB2 } = await import("@/lib/b2-upload");
        const { publicUrl } = await uploadToB2(uploadBlob, {
          folder: `social-media/${authUid}/stories`,
          filename: `${storyId}.${ext}`,
          contentType: uploadContentType,
        });
        url = publicUrl;
      } catch (uploadErr: any) {
        toast.error(`Upload failed: ${uploadErr.message || ""}`);
        continue;
      }

      const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
      const { error: insertErr } = await supabase.from('social_stories').insert({
        id: storyId,
        user_id: authUid,
        media_url: url,
        media_type: isVideo ? 'video' : 'image',
        expires_at: expiresAt,
      } as any);
      if (insertErr) { toast.error(`Story save failed: ${insertErr.message}`); continue; }
    }

    toast.success("Story posted! 🎉");
    qc.invalidateQueries({ queryKey: ['social-feed-stories'] });
    qc.invalidateQueries({ queryKey: ['own-stories-exist'] });
    e.target.value = '';
  };

  const handleProfileClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (story.isOwn) return;
    navigate(`/app/social/profile/${story.id}`);
  };

  const isViewed = story.viewed;

  return (
    <>
      <input ref={fileRef} type="file" accept="image/*,video/*" multiple className="hidden" onChange={handleFileSelect} />
      <div className="flex flex-col items-center gap-1 shrink-0 w-[80px]">
        <button onClick={handleYourStoryClick}
          className={`relative p-[2.5px] rounded-full ${story.isOwn ? (hasOwnStories ? 'bg-gradient-to-tr from-amber-400 via-rose-500 to-purple-600' : 'bg-border') : isViewed ? 'bg-muted-foreground/30' : 'bg-gradient-to-tr from-amber-400 via-rose-500 to-purple-600'}`}>
          <div className="h-[58px] w-[58px] md:h-[64px] md:w-[64px] rounded-full bg-card p-[2px]">
            <div className={`h-full w-full rounded-full bg-muted flex items-center justify-center overflow-hidden ${isViewed ? 'opacity-50 blur-[0.5px]' : ''}`}>
              {story.isOwn ? (
                <div className="relative h-full w-full bg-accent flex items-center justify-center">
                  <Plus className="h-5 w-5 text-muted-foreground" />
                </div>
              ) : story.storyMediaType === 'video' && story.storyMediaUrl ? (
                <VideoThumbnail src={story.storyMediaUrl} />
              ) : story.storyMediaUrl ? (
                <img src={story.storyMediaUrl} alt="" className="w-full h-full object-cover" />
              ) : story.avatar ? (
                <img src={story.avatar} alt="" className="w-full h-full object-cover" />
              ) : (
                <span className="text-sm font-bold text-muted-foreground">{story.username.charAt(0).toUpperCase()}</span>
              )}
            </div>
          </div>
        </button>
        <button onClick={story.isOwn ? handleYourStoryClick : handleProfileClick} className="text-[10px] max-w-[72px] truncate text-center hover:underline">
          {story.isOwn ? "Your Story" : story.username.split('_')[0]}
        </button>
      </div>
    </>
  );
}

export default function SocialFeedPage() {
  const navigate = useNavigate();
  const { customerUser } = useAuth();
  const [feedMode, setFeedMode] = useState<'following' | 'for_you'>('for_you');
  const storiesRef = useRef<HTMLDivElement>(null);

  const { data: dbPosts = [] } = useSocialFeed(feedMode);

  const authUid = customerUser?.supabase_uid || customerUser?.id;

  // Fetch stories from DB - include media URL for thumbnail, track viewed state
  const { data: storyUsers = [] } = useQuery({
    queryKey: ['social-feed-stories', authUid],
    queryFn: async () => {
      const { data } = await supabase
        .from('social_stories')
        .select('id, user_id, media_url, media_type, created_at')
        .gt('expires_at', new Date().toISOString())
        .order('created_at', { ascending: false });
      if (!data?.length) return [];

      // Group by user, keep first (newest) story media for thumbnail
      const userMap = new Map<string, { user_id: string; storyMediaUrl: string; storyMediaType: string; newestAt: string; storyIds: string[] }>();
      for (const s of data) {
        if (!userMap.has(s.user_id)) {
          userMap.set(s.user_id, { user_id: s.user_id, storyMediaUrl: s.media_url || '', storyMediaType: (s as any).media_type || 'image', newestAt: s.created_at, storyIds: [s.id] });
        } else {
          userMap.get(s.user_id)!.storyIds.push(s.id);
        }
      }

      const uids = [...userMap.keys()];

      // Fetch profiles
      const { data: profiles } = await supabase.from('social_profiles').select('user_id, username, display_name, avatar_url').in('user_id', uids);
      const profileMap = new Map((profiles || []).map((p: any) => [p.user_id, p]));

      // Check which stories the current user has viewed
      let viewedUserIds = new Set<string>();
      if (authUid) {
        const allStoryIds = data.map((s: any) => s.id);
        const { data: views } = await supabase.from('social_story_views')
          .select('story_id').eq('viewer_id', authUid).in('story_id', allStoryIds);
        const viewedStoryIds = new Set((views || []).map((v: any) => v.story_id));
        for (const [uid, info] of userMap.entries()) {
          if (info.storyIds.every(sid => viewedStoryIds.has(sid))) {
            viewedUserIds.add(uid);
          }
        }
      }

      const result = uids.map(uid => {
        const prof = profileMap.get(uid);
        const info = userMap.get(uid)!;
        return {
          id: uid,
          username: prof?.display_name || prof?.username || 'user',
          avatar: prof?.avatar_url || '',
          storyMediaUrl: info.storyMediaUrl,
          storyMediaType: info.storyMediaType,
          viewed: viewedUserIds.has(uid),
          newestAt: info.newestAt,
        };
      });

      // Sort: unviewed first (newest first), then viewed (newest first)
      result.sort((a, b) => {
        if (a.viewed !== b.viewed) return a.viewed ? 1 : -1;
        return new Date(b.newestAt).getTime() - new Date(a.newestAt).getTime();
      });

      return result;
    },
  });

  const ownStoryItem = { id: "own", username: "Your Story", avatar: "", isOwn: true, viewed: false, storyMediaUrl: "" };
  const stories = [
    ownStoryItem,
    ...storyUsers,
  ];

  const socioAds = usePlacementAds("socio");

  const posts = dbPosts.length > 0 ? dbPosts.map((p: any) => ({
    ...p,
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
      <div className="relative border-b border-border/20">
        <div
          ref={storiesRef}
          className="flex gap-4 px-4 py-3 overflow-x-auto overflow-y-hidden scrollbar-hide"
          style={{ WebkitOverflowScrolling: 'touch', scrollBehavior: 'smooth' }}
        >
          {stories.map((story: any) => (
            <StoryBubble key={story.id} story={story} navigate={navigate} customerUser={customerUser} />
          ))}
        </div>
        {/* Scroll arrows for desktop */}
        <button
          className="hidden md:flex absolute right-2 top-1/2 -translate-y-1/2 h-8 w-8 rounded-full bg-card border border-border shadow-md items-center justify-center z-10 hover:bg-muted"
          onClick={() => { storiesRef.current?.scrollBy({ left: 200, behavior: 'smooth' }); }}
        >
          <ChevronDown className="h-4 w-4 rotate-[-90deg]" />
        </button>
        <button
          className="hidden md:flex absolute left-2 top-1/2 -translate-y-1/2 h-8 w-8 rounded-full bg-card border border-border shadow-md items-center justify-center z-10 hover:bg-muted"
          onClick={() => { storiesRef.current?.scrollBy({ left: -200, behavior: 'smooth' }); }}
        >
          <ChevronDown className="h-4 w-4 rotate-90" />
        </button>
      </div>

      {/* People You May Know */}
      <PeopleYouMayKnow />

      {/* Feed */}
      <div className="pb-28 md:pb-8">
        {posts.map((post: any, idx: number) => (
          <div key={post.id}>
            <PostCard post={post} />
            {socioAds.length > 0 && (idx + 1) % 4 === 0 && (
              <SocialFeedAd ad={socioAds[(Math.floor(idx / 4)) % socioAds.length]} />
            )}
          </div>
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
