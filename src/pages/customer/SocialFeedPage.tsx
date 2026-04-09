import { useState, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Heart, MessageCircle, Send, Bookmark, MoreHorizontal, Plus, ChevronDown, Repeat2, X } from "lucide-react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/lib/auth";
import { toast } from "sonner";
import SocialLayout from "@/components/social/SocialLayout";
import { useSocialFeed, useSharePost, useRepost } from "@/hooks/use-social-interactions";
import { supabase } from "@/integrations/supabase/client";
import PeopleYouMayKnow from "@/components/social/PeopleYouMayKnow";
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

function CommentItem({ comment, isMock }: { comment: any; isMock: boolean }) {
  const { data: profile } = useQuery({
    queryKey: ['social-comment-profile', comment.user_id],
    queryFn: async () => {
      const { data } = await supabase.from('social_profiles').select('username, display_name, avatar_url').eq('user_id', comment.user_id).maybeSingle();
      return data;
    },
    enabled: !isMock && !!comment.user_id,
  });
  const name = isMock ? (comment.user_id === 'user1' ? 'vijay' : comment.user_id === 'user2' ? 'priya' : 'anita') : (profile?.display_name || profile?.username || 'user');
  const avatar = profile?.avatar_url || '';
  return (
    <div className="flex items-start gap-2 py-1">
      <div className="h-6 w-6 rounded-full bg-muted flex items-center justify-center shrink-0 overflow-hidden">
        {avatar ? <img src={avatar} alt="" className="w-full h-full object-cover" /> : <span className="text-[9px] font-bold">{name.charAt(0).toUpperCase()}</span>}
      </div>
      <p className="text-sm flex-1">
        <span className="font-semibold mr-1">{name}</span>
        <span className="text-muted-foreground">{comment.content}</span>
      </p>
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

  const userId = customerUser?.supabase_uid || customerUser?.id;
  const postId = post.id;
  const mediaItems = Array.isArray(post.media) ? post.media : [];
  const isCarousel = mediaItems.length > 1;
  const isMock = ['p1', 'p2', 'p3', 'p4', 'p5', 'p6'].includes(postId);

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
      const { data } = await supabase.from('social_comments').select('id, content, user_id').eq('post_id', postId).eq('status', 'active').is('parent_id', null).order('created_at', { ascending: false }).limit(2);
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
          <p className="text-[11px] text-muted-foreground">
            {post.location_name ? `${post.location_name} · ` : ''}{timeAgo(post.created_at)}
          </p>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild><button className="p-1"><MoreHorizontal className="h-5 w-5" /></button></DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {userId === post.user_id && (
              <DropdownMenuItem className="text-destructive" onClick={async () => {
                if (!confirm("Are you sure you want to delete this post?")) return;
                const { error } = await supabase.from('social_posts').delete().eq('id', postId).eq('user_id', userId);
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
            <span className="text-sm font-semibold">{formatCount(likes)}</span>
          </button>
          <button className="flex items-center gap-1.5" onClick={() => { if (!userId) { toast.error("Please login to comment"); navigate("/app/login"); return; } setShowCommentInput(v => !v); }}>
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

      {/* View all comments - inline expand */}
      {comments > 0 && !showAllComments && (
        <button className="px-4 py-1" onClick={() => setShowAllComments(true)}>
          <p className="text-sm text-muted-foreground">View all {formatCount(comments)} comments</p>
        </button>
      )}

      {/* Inline comments with accordion */}
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
                <CommentItem key={c.id} comment={c} isMock={isMock} />
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
      const ext = file.name.split('.').pop() || (isVideo ? 'mp4' : 'jpg');
      const path = `${authUid}/stories/${storyId}.${ext}`;

      const { error: uploadErr } = await supabase.storage.from('social-media').upload(path, file, { contentType: file.type, upsert: true });
      if (uploadErr) { toast.error(`Upload failed: ${uploadErr.message}`); continue; }

      const { data: signedUrl } = await supabase.storage.from('social-media').createSignedUrl(path, 60 * 60 * 24);
      const url = signedUrl?.signedUrl || '';

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

  // Fetch profile for non-own stories to get username for profile navigation
  const { data: storyProfile } = useQuery({
    queryKey: ['story-profile', story.id],
    queryFn: async () => {
      const { data } = await supabase.from('social_profiles').select('username, display_name').eq('user_id', story.id).maybeSingle();
      return data;
    },
    enabled: !story.isOwn && !!story.id,
  });

  const handleProfileClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (story.isOwn) return;
    const username = storyProfile?.username || story.id;
    navigate(`/app/social/@${username}`);
  };

  return (
    <>
      <input ref={fileRef} type="file" accept="image/*,video/*" multiple className="hidden" onChange={handleFileSelect} />
      <div className="flex flex-col items-center gap-1 shrink-0 w-[68px]">
        <button onClick={handleYourStoryClick}
          className={`relative p-[2px] rounded-full ${story.isOwn ? (hasOwnStories ? 'bg-gradient-to-tr from-amber-400 via-rose-500 to-purple-600' : '') : story.seen ? 'bg-muted' : 'bg-gradient-to-tr from-amber-400 via-rose-500 to-purple-600'}`}>
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
        </button>
        <button onClick={story.isOwn ? handleYourStoryClick : handleProfileClick} className="text-[10px] max-w-[56px] truncate text-center hover:underline">
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
      const uniqueUsers = data.filter((s: any) => { if (seen.has(s.user_id)) return false; seen.add(s.user_id); return true; });
      // Fetch profiles for story users
      const uids = uniqueUsers.map((s: any) => s.user_id);
      const { data: profiles } = await supabase.from('social_profiles').select('user_id, username, display_name, avatar_url').in('user_id', uids);
      const profileMap = new Map((profiles || []).map((p: any) => [p.user_id, p]));
      return uniqueUsers.map((s: any) => {
        const prof = profileMap.get(s.user_id);
        return { id: s.user_id, username: prof?.display_name || prof?.username || 'user', avatar: prof?.avatar_url || '', seen: false };
      });
    },
  });

  const ownStoryItem = { id: "own", username: "Your Story", avatar: "", isOwn: true, seen: false };
  const stories = [
    ownStoryItem,
    ...storyUsers,
  ];

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
          className="flex gap-3 px-4 py-3 overflow-x-auto overflow-y-hidden scrollbar-hide"
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
