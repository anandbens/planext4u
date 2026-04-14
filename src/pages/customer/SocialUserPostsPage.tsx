/**
 * Instagram-like scrolling post detail view.
 * Opens at a specific post and allows scrolling through all user posts.
 */
import { useParams, useNavigate, Link } from "react-router-dom";
import { ArrowLeft, Heart, MessageCircle, Send, Bookmark, MoreHorizontal, Repeat2, ChevronDown, Trash2, ShoppingBag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { usePostLike, usePostBookmark, useSharePost } from "@/hooks/use-social-interactions";
import { isSocialModerator } from "@/lib/social-moderator";
import { toast } from "sonner";
import { useState, useRef, useEffect } from "react";
import SocialLayout from "@/components/social/SocialLayout";

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

function SinglePostCard({ post, profile, isFirst }: { post: any; profile: any; isFirst: boolean }) {
  const navigate = useNavigate();
  const { customerUser } = useAuth();
  const qc = useQueryClient();
  const sharePost = useSharePost();
  const [commentText, setCommentText] = useState("");
  const [carouselIdx, setCarouselIdx] = useState(0);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  const userId = customerUser?.supabase_uid || customerUser?.id;
  const postId = post.id;
  const mediaItems = Array.isArray(post.media) ? post.media : [];
  const username = profile?.display_name || profile?.username || 'user';
  const avatarUrl = profile?.avatar_url || '';
  const isVerified = profile?.is_verified || false;
  const isMod = isSocialModerator(userId);
  const canDelete = userId === post.user_id || isMod;

  const { isLiked, likeCount, toggleLike } = usePostLike(postId);
  const { isSaved, toggleBookmark } = usePostBookmark(postId);

  const { data: commentCount = 0 } = useQuery({
    queryKey: ['social-comment-count', postId],
    queryFn: async () => {
      const { count } = await supabase.from('social_comments').select('*', { count: 'exact', head: true }).eq('post_id', postId).eq('status', 'active');
      return count || 0;
    },
  });

  // Autoplay video on scroll
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    const observer = new IntersectionObserver(
      ([entry]) => { entry.isIntersecting ? video.play().catch(() => {}) : video.pause(); },
      { threshold: 0.5 }
    );
    observer.observe(video);
    return () => observer.disconnect();
  }, [carouselIdx]);

  const handleSubmitComment = async () => {
    if (!commentText.trim() || !userId) return;
    await supabase.from('social_comments').insert({ post_id: postId, user_id: userId, content: commentText.trim() });
    setCommentText("");
    toast.success("Comment posted");
    qc.invalidateQueries({ queryKey: ['social-comment-count', postId] });
  };

  return (
    <article className="border-b border-border/20">
      {/* Author */}
      <div className="flex items-center gap-3 px-4 py-3">
        <Link to={`/app/social/profile/${post.user_id}`}>
          <div className="h-10 w-10 rounded-full bg-gradient-to-tr from-amber-400 to-rose-500 p-[1.5px]">
            <div className="h-full w-full rounded-full bg-card flex items-center justify-center overflow-hidden">
              {avatarUrl ? <img src={avatarUrl} alt="" className="w-full h-full object-cover" /> :
                <span className="text-sm font-bold">{username.charAt(0).toUpperCase()}</span>}
            </div>
          </div>
        </Link>
        <div className="flex-1">
          <div className="flex items-center gap-1">
            <Link to={`/app/social/profile/${post.user_id}`} className="text-sm font-semibold">{username}</Link>
            {isVerified && <svg className="h-3.5 w-3.5 text-primary fill-current" viewBox="0 0 24 24"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" /></svg>}
          </div>
          <p className="text-[11px] text-muted-foreground">
            {post.location_name ? `${post.location_name} · ` : ''}{timeAgo(post.created_at)}
          </p>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild><button className="p-1"><MoreHorizontal className="h-5 w-5" /></button></DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {canDelete && (
              <DropdownMenuItem className="text-destructive" onClick={async () => {
                if (!confirm("Are you sure you want to delete this post?")) return;
                const deleteQuery = isMod && userId !== post.user_id
                  ? supabase.from('social_posts').delete().eq('id', postId)
                  : supabase.from('social_posts').delete().eq('id', postId).eq('user_id', userId);
                const { error } = await deleteQuery;
                if (error) { toast.error("Failed to delete post"); return; }
                toast.success("Post deleted");
                qc.invalidateQueries({ queryKey: ['social-feed'] });
                qc.invalidateQueries({ queryKey: ['social-user-all-posts'] });
              }}>
                <Trash2 className="h-4 w-4 mr-2" /> Delete Post
              </DropdownMenuItem>
            )}
            <DropdownMenuItem onClick={() => sharePost(postId, post.caption)}>Copy Link</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Media */}
      <div className="relative aspect-square bg-muted overflow-hidden">
        {mediaItems.length > 0 ? (
          mediaItems[carouselIdx]?.type === 'video' ? (
            <video ref={videoRef} src={mediaItems[carouselIdx]?.url} className="w-full h-full object-cover" controls muted playsInline />
          ) : (
            <img src={mediaItems[carouselIdx]?.url || mediaItems[carouselIdx]?.mediumUrl} alt="" className="w-full h-full object-cover" loading="lazy" />
          )
        ) : (
          <div className="w-full h-full bg-accent/30 flex items-center justify-center"><span className="text-muted-foreground text-sm">No media</span></div>
        )}
        {mediaItems.length > 1 && (
          <>
            {carouselIdx > 0 && <button className="absolute left-2 top-1/2 -translate-y-1/2 bg-card/80 rounded-full p-1" onClick={() => setCarouselIdx(i => i - 1)}><ChevronDown className="h-4 w-4 -rotate-90" /></button>}
            {carouselIdx < mediaItems.length - 1 && <button className="absolute right-2 top-1/2 -translate-y-1/2 bg-card/80 rounded-full p-1" onClick={() => setCarouselIdx(i => i + 1)}><ChevronDown className="h-4 w-4 rotate-90" /></button>}
            <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1">
              {mediaItems.map((_: any, i: number) => <div key={i} className={`h-1.5 w-1.5 rounded-full ${i === carouselIdx ? 'bg-primary' : 'bg-white/50'}`} />)}
            </div>
          </>
        )}
      </div>

      {/* Actions */}
      <div className="flex items-center justify-between px-4 py-2">
        <div className="flex items-center gap-5">
          <button className="flex items-center gap-1.5" onClick={() => toggleLike()}>
            <Heart className={`h-6 w-6 ${isLiked ? 'fill-red-500 text-red-500' : ''}`} />
            <span className="text-sm font-semibold">{likeCount}</span>
          </button>
          <button className="flex items-center gap-1.5" onClick={() => navigate(`/app/social/comments/${postId}`)}>
            <MessageCircle className="h-6 w-6" />
            <span className="text-sm">{commentCount}</span>
          </button>
          <button onClick={() => sharePost(postId, post.caption)}><Send className="h-6 w-6" /></button>
        </div>
        <button onClick={() => toggleBookmark()}><Bookmark className={`h-6 w-6 ${isSaved ? 'fill-foreground' : ''}`} /></button>
      </div>

      {/* Caption */}
      <div className="px-4 py-2">
        <p className="text-sm">
          <Link to={`/app/social/profile/${post.user_id}`} className="font-semibold mr-1">{username}</Link>
          {post.caption}
        </p>
      </div>

      {/* Quick comment */}
      <div className="px-4 pb-3">
        <div className="flex items-center gap-2">
          <Input
            value={commentText}
            onChange={(e) => setCommentText(e.target.value)}
            placeholder="Add a comment..."
            className="flex-1 h-9 text-sm"
            onKeyDown={(e) => { if (e.key === 'Enter') handleSubmitComment(); }}
          />
          {commentText.trim() && <Button size="sm" className="h-8" onClick={handleSubmitComment}>Post</Button>}
        </div>
      </div>
    </article>
  );
}

export default function SocialUserPostsPage() {
  const { userId: targetUserId, postId: startPostId } = useParams();
  const navigate = useNavigate();
  const startPostRef = useRef<HTMLDivElement>(null);

  const { data: allPosts = [], isLoading } = useQuery({
    queryKey: ['social-user-all-posts', targetUserId],
    queryFn: async () => {
      const { data } = await supabase
        .from('social_posts')
        .select('*')
        .eq('user_id', targetUserId!)
        .eq('status', 'published')
        .order('created_at', { ascending: false });
      return data || [];
    },
    enabled: !!targetUserId,
  });

  const { data: profile } = useQuery({
    queryKey: ['social-post-profile', targetUserId],
    queryFn: async () => {
      const { data } = await supabase.from('social_profiles').select('username, display_name, avatar_url, is_verified').eq('user_id', targetUserId!).maybeSingle();
      return data;
    },
    enabled: !!targetUserId,
  });

  // Reorder so clicked post is first
  const orderedPosts = (() => {
    if (!startPostId || allPosts.length === 0) return allPosts;
    const idx = allPosts.findIndex((p: any) => p.id === startPostId);
    if (idx <= 0) return allPosts;
    return [allPosts[idx], ...allPosts.slice(0, idx), ...allPosts.slice(idx + 1)];
  })();

  useEffect(() => {
    // Scroll to top when component loads (start post is already first)
    window.scrollTo(0, 0);
  }, [startPostId]);

  if (isLoading) {
    return (
      <SocialLayout hideRightSidebar>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="h-8 w-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
        </div>
      </SocialLayout>
    );
  }

  return (
    <SocialLayout hideRightSidebar>
      <header className="sticky top-0 z-40 bg-card border-b border-border/30 md:hidden">
        <div className="flex items-center gap-3 px-4 py-3">
          <button onClick={() => navigate(-1)}><ArrowLeft className="h-6 w-6" /></button>
          <span className="text-lg font-semibold">Posts</span>
        </div>
      </header>
      <div className="pb-28 md:pb-8">
        {orderedPosts.map((post: any, i: number) => (
          <SinglePostCard key={post.id} post={post} profile={profile} isFirst={i === 0} />
        ))}
        {orderedPosts.length === 0 && (
          <div className="py-16 text-center">
            <p className="text-sm text-muted-foreground">No posts found</p>
          </div>
        )}
      </div>
    </SocialLayout>
  );
}
