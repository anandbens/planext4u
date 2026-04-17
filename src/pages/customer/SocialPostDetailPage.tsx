import { useParams, useNavigate, Link } from "react-router-dom";
import { ArrowLeft, Heart, MessageCircle, Send, Bookmark, MoreHorizontal, Repeat2, ChevronDown, Trash2, ShoppingBag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { usePostLike, usePostBookmark, usePostComments, useSharePost, useRepost } from "@/hooks/use-social-interactions";
import { isSocialModerator } from "@/lib/social-moderator";
import { toast } from "sonner";
import { useState } from "react";
import SocialLayout from "@/components/social/SocialLayout";

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export default function SocialPostDetailPage() {
  const { postId } = useParams();
  const navigate = useNavigate();
  const { customerUser } = useAuth();
  const qc = useQueryClient();
  const sharePost = useSharePost();
  const repost = useRepost();
  const [commentText, setCommentText] = useState("");
  const [carouselIdx, setCarouselIdx] = useState(0);
  const [showProductTags, setShowProductTags] = useState(false);

  const { data: post, isLoading } = useQuery({
    queryKey: ['social-post-detail', postId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('social_posts')
        .select('*')
        .eq('id', postId!)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!postId,
  });

  const { data: profile } = useQuery({
    queryKey: ['social-post-profile', post?.user_id],
    queryFn: async () => {
      const { data } = await supabase.from('social_profiles').select('username, display_name, avatar_url, is_verified').eq('user_id', post!.user_id).maybeSingle();
      return data;
    },
    enabled: !!post?.user_id,
  });

  const { isLiked, likeCount, toggleLike } = usePostLike(postId || '');
  const { isSaved, toggleBookmark } = usePostBookmark(postId || '');
  const { comments, commentCount, addComment } = usePostComments(postId || '');

  const handleSubmitComment = () => {
    if (!commentText.trim()) return;
    addComment({ text: commentText.trim() });
    setCommentText("");
  };

  if (isLoading) {
    return (
      <SocialLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="h-8 w-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
        </div>
      </SocialLayout>
    );
  }

  if (!post) {
    return (
      <SocialLayout>
        <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
          <h2 className="text-xl font-bold mb-2">Post not found</h2>
          <p className="text-sm text-muted-foreground mb-4">This post may have been deleted or is unavailable.</p>
          <Button onClick={() => navigate("/app/social")}>Back to Feed</Button>
        </div>
      </SocialLayout>
    );
  }

  const mediaItems = (Array.isArray(post.media) ? post.media : []) as any[];
  const username = profile?.display_name || profile?.username || 'user';
  const avatarUrl = profile?.avatar_url || '';
  const isVerified = profile?.is_verified || false;

  const content = (
    <div className="pb-28 md:pb-8">
      <header className="sticky top-0 z-40 bg-card border-b border-border/30 md:hidden">
        <div className="flex items-center gap-3 px-4 py-3">
          <button onClick={() => navigate(-1)}><ArrowLeft className="h-6 w-6" /></button>
          <span className="text-lg font-semibold">Post</span>
        </div>
      </header>

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
            {((customerUser?.supabase_uid || customerUser?.id) === post.user_id || isSocialModerator(customerUser?.supabase_uid || customerUser?.id)) && (
              <DropdownMenuItem className="text-destructive" onClick={async () => {
                if (!confirm("Are you sure you want to delete this post?")) return;
                const userId = customerUser?.supabase_uid || customerUser?.id;
                const isMod = isSocialModerator(userId);
                const deleteQuery = isMod && userId !== post.user_id
                  ? supabase.from('social_posts').delete().eq('id', postId!)
                  : supabase.from('social_posts').delete().eq('id', postId!).eq('user_id', userId);
                const { error } = await deleteQuery;
                if (error) { toast.error("Failed to delete post"); return; }
                toast.success("Post deleted");
                navigate("/app/social");
              }}>
                <Trash2 className="h-4 w-4 mr-2" /> Delete Post
              </DropdownMenuItem>
            )}
            <DropdownMenuItem onClick={() => sharePost(postId!, post.caption)}>Copy Link</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Media */}
      <div className="relative aspect-square bg-muted overflow-hidden">
        {mediaItems.length > 0 ? (
          mediaItems[carouselIdx]?.type === 'video' ? (
            <video src={mediaItems[carouselIdx]?.url} className="w-full h-full object-cover" controls muted playsInline />
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
        {/* Product Tags - YouTube Shorts style */}
        {(() => {
          const tags = Array.isArray((post as any).product_tags) ? (post as any).product_tags as any[] : [];
          if (tags.length === 0) return null;
          return (
            <>
              <style>{`
                @keyframes detail-product-pulse { 0%,100%{box-shadow:0 0 0 0 hsl(var(--primary)/0.4)} 50%{box-shadow:0 0 0 8px hsl(var(--primary)/0)} }
                @keyframes detail-product-bounce { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-3px)} }
              `}</style>
              <button
                className="absolute top-3 right-3 z-10 flex items-end gap-0.5 cursor-pointer"
                onClick={() => {
                  if (tags.length === 1) {
                    navigate(`/app/product/${tags[0].id}`);
                  } else {
                    setShowProductTags(prev => !prev);
                  }
                }}
                style={{ animation: "detail-product-bounce 2s ease-in-out infinite" }}
              >
                <div className="relative flex items-end">
                  {tags.slice(0, 2).map((tag: any, i: number) => (
                    <div key={tag.id} className={`rounded-lg overflow-hidden border-2 border-card shadow-xl bg-card ${i > 0 ? '-ml-5 relative z-0' : 'relative z-[1]'}`}
                      style={{ animation: "detail-product-pulse 2.5s ease-in-out infinite", width: i === 0 ? 56 : 48, height: i === 0 ? 56 : 48 }}>
                      {tag.socio_shopping_icon || tag.image ? (
                        <img src={tag.socio_shopping_icon || tag.image} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full bg-accent flex items-center justify-center"><ShoppingBag className="h-5 w-5 text-primary" /></div>
                      )}
                    </div>
                  ))}
                </div>
                <div className="flex items-center gap-0.5 bg-card/95 backdrop-blur-sm rounded-full px-2 py-1 shadow-lg border border-border/50 mb-1 ml-1">
                  <span className="text-[11px] font-bold text-foreground">{tags.length} product{tags.length > 1 ? 's' : ''}</span>
                  <ChevronDown className="h-3 w-3 text-muted-foreground" />
                </div>
              </button>
            </>
          );
        })()}
        {showProductTags && (() => {
          const tags = Array.isArray((post as any).product_tags) ? (post as any).product_tags as any[] : [];
          if (tags.length === 0) return null;
          return (
            <div className="absolute top-[76px] right-3 z-20 bg-card rounded-xl shadow-xl border border-border p-2 max-w-[220px] animate-in fade-in slide-in-from-top-2 duration-200">
              {tags.map((tag: any) => (
                <button
                  key={tag.id}
                  className="flex items-center gap-2.5 w-full text-left px-2 py-2 rounded-lg hover:bg-accent transition-colors"
                  onClick={() => navigate(`/app/product/${tag.id}`)}
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

      {/* Actions */}
      <div className="flex items-center justify-between px-4 py-2">
        <div className="flex items-center gap-5">
          <button className="flex items-center gap-1.5" onClick={() => toggleLike()}>
            <Heart className={`h-6 w-6 ${isLiked ? 'fill-red-500 text-red-500' : ''}`} />
            <span className="text-sm font-semibold">{likeCount}</span>
          </button>
          <button className="flex items-center gap-1.5" onClick={() => document.getElementById('comment-input')?.focus()}>
            <MessageCircle className="h-6 w-6" />
            <span className="text-sm">{commentCount}</span>
          </button>
          <button onClick={() => {
            const note = window.prompt("Add a note to your repost (optional)") || undefined;
            repost.mutate({ postId: postId!, note });
          }}><Repeat2 className="h-6 w-6" /></button>
          <button onClick={() => sharePost(postId!, post.caption)}><Send className="h-6 w-6" /></button>
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

      {/* Comments */}
      <div className="px-4 space-y-3 mt-2">
        {comments.map((c: any) => (
          <div key={c.id} className="flex gap-2">
            <div className="h-7 w-7 rounded-full bg-muted shrink-0 flex items-center justify-center text-[10px] font-bold">
              {(c.username || 'U').charAt(0).toUpperCase()}
            </div>
            <div>
              <p className="text-sm"><span className="font-semibold mr-1">{c.username || 'user'}</span>{c.content}</p>
              <p className="text-[10px] text-muted-foreground">{timeAgo(c.created_at)}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Comment input */}
      <div className="sticky bottom-0 bg-card border-t border-border/30 px-4 py-3 mt-4">
        <div className="flex items-center gap-2">
          <Input
            id="comment-input"
            value={commentText}
            onChange={(e) => setCommentText(e.target.value)}
            placeholder="Add a comment..."
            className="flex-1"
            onKeyDown={(e) => { if (e.key === 'Enter') handleSubmitComment(); }}
          />
          <Button size="sm" onClick={handleSubmitComment} disabled={!commentText.trim()}>Post</Button>
        </div>
      </div>
    </div>
  );

  return <SocialLayout hideRightSidebar>{content}</SocialLayout>;
}
