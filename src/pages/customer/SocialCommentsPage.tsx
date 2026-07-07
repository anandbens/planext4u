import { useState } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import { ArrowLeft, Heart, Send, MoreHorizontal, Smile, Trash2, Flag } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import SocialLayout from "@/components/social/SocialLayout";
import { usePostComments, useDeleteComment } from "@/hooks/use-social-interactions";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { isSocialModerator } from "@/lib/social-moderator";

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'now';
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h`;
  return `${Math.floor(hrs / 24)}d`;
}

export default function SocialCommentsPage() {
  const navigate = useNavigate();
  const { postId } = useParams();
  const { customerUser } = useAuth();
  const [newComment, setNewComment] = useState("");
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [expandedReplies, setExpandedReplies] = useState<Set<string>>(new Set());

  const userId = customerUser?.supabase_uid || customerUser?.id;
  const isMod = isSocialModerator(userId);

  // Get the post to determine post owner
  const { data: post } = useQuery({
    queryKey: ['social-post-owner', postId],
    queryFn: async () => {
      const { data } = await supabase.from('social_posts').select('user_id, caption').eq('id', postId!).maybeSingle();
      return data;
    },
    enabled: !!postId,
  });

  const isPostOwner = userId && post?.user_id === userId;

  const { comments, isLoading, addComment, toggleCommentLike } = usePostComments(postId || '');
  const deleteComment = useDeleteComment(postId || '');

  const postComment = () => {
    if (!userId) {
      toast.error("Please login to comment");
      navigate("/app/login");
      return;
    }
    if (!newComment.trim()) return;
    addComment({ text: newComment, parentId: replyingTo || undefined });
    setNewComment("");
    setReplyingTo(null);
    if (replyingTo) setExpandedReplies(prev => new Set(prev).add(replyingTo));
  };

  const handleDeleteComment = (commentId: string) => {
    if (!confirm("Delete this comment?")) return;
    deleteComment.mutate(commentId);
  };

  const EMOJI_BAR = ["❤️", "🙌", "🔥", "👏", "😢"];

  const content = (
    <div className="pb-28 md:pb-8">
      <header className="sticky top-0 z-40 bg-card border-b border-border/30">
        <div className="flex items-center gap-3 px-4 py-3">
          <button onClick={() => navigate(-1)}><ArrowLeft className="h-5 w-5" /></button>
          <h1 className="text-lg font-bold flex-1">Comments</h1>
          <button onClick={() => navigate(`/app/social/messages`)}><Send className="h-5 w-5" /></button>
        </div>
      </header>

      {/* Post preview mini */}
      {post && (
        <div className="flex items-center gap-3 px-4 py-3 border-b border-border/20">
          <Avatar className="h-8 w-8"><AvatarFallback className="bg-primary/20 text-xs font-bold">P</AvatarFallback></Avatar>
          <p className="text-sm flex-1 truncate">
            <span className="text-muted-foreground">{post.caption?.substring(0, 100) || 'Post'}</span>
          </p>
        </div>
      )}

      {/* Comments list */}
      {isLoading ? (
        <div className="flex justify-center py-8">
          <div className="h-6 w-6 rounded-full border-2 border-primary border-t-transparent animate-spin" />
        </div>
      ) : comments.length === 0 ? (
        <div className="py-12 text-center">
          <p className="text-sm text-muted-foreground">No comments yet. Be the first to comment!</p>
        </div>
      ) : (
        <div className="divide-y divide-border/10">
          {comments.map((comment: any) => (
            <div key={comment.id}>
              <div className="flex gap-3 px-4 py-3">
                <Link to={`/app/social/profile/${comment.user_id}`}>
                  <Avatar className="h-9 w-9 shrink-0">
                    {comment.avatar_url ? (
                      <img loading="lazy" decoding="async" src={comment.avatar_url} alt="" className="w-full h-full rounded-full object-cover" />
                    ) : (
                      <AvatarFallback className="bg-muted text-xs font-bold">
                        {(comment.display_name || comment.username || 'U').charAt(0).toUpperCase()}
                      </AvatarFallback>
                    )}
                  </Avatar>
                </Link>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      {comment.is_pinned && <span className="text-[10px] text-muted-foreground flex items-center gap-1 mb-1">📌 Pinned</span>}
                      <p className="text-sm">
                        <Link to={`/app/social/profile/${comment.user_id}`} className="font-semibold mr-1">
                          {comment.display_name || comment.username || 'user'}
                        </Link>
                        {comment.content}
                      </p>
                      <div className="flex items-center gap-4 mt-1">
                        <span className="text-xs text-muted-foreground">{timeAgo(comment.created_at)}</span>
                        <button className="text-xs font-semibold text-muted-foreground" onClick={() => toggleCommentLike(comment.id)}>
                          {comment.like_count || 0} likes
                        </button>
                        <button className="text-xs font-semibold text-muted-foreground" onClick={() => {
                          setReplyingTo(comment.id);
                          setNewComment(`@${comment.display_name || comment.username || 'user'} `);
                        }}>Reply</button>
                        {/* Delete/Report menu for post owner or comment owner or moderator */}
                        {(isPostOwner || userId === comment.user_id || isMod) && (
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <button className="text-xs text-muted-foreground"><MoreHorizontal className="h-3.5 w-3.5" /></button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="start">
                              <DropdownMenuItem className="text-destructive" onClick={() => handleDeleteComment(comment.id)}>
                                <Trash2 className="h-3.5 w-3.5 mr-2" /> Delete Comment
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        )}
                      </div>
                    </div>
                    <button onClick={() => toggleCommentLike(comment.id)} className="pt-1 shrink-0">
                      <Heart className={`h-3.5 w-3.5 ${comment.isLiked ? 'fill-red-500 text-red-500' : 'text-muted-foreground'}`} />
                    </button>
                  </div>

                  {/* Replies */}
                  {comment.replies?.length > 0 && (
                    <div className="mt-2">
                      {!expandedReplies.has(comment.id) && (
                        <button className="text-xs font-semibold text-muted-foreground flex items-center gap-2" onClick={() => setExpandedReplies(prev => new Set(prev).add(comment.id))}>
                          <span className="w-6 h-px bg-muted-foreground/40" /> View {comment.replies.length} {comment.replies.length === 1 ? 'reply' : 'replies'}
                        </button>
                      )}
                      {expandedReplies.has(comment.id) && comment.replies.map((reply: any) => (
                        <div key={reply.id} className="flex gap-2.5 mt-2.5">
                          <Avatar className="h-7 w-7">
                            {reply.avatar_url ? (
                              <img loading="lazy" decoding="async" src={reply.avatar_url} alt="" className="w-full h-full rounded-full object-cover" />
                            ) : (
                              <AvatarFallback className="bg-muted text-[10px] font-bold">
                                {(reply.display_name || reply.username || 'U').charAt(0).toUpperCase()}
                              </AvatarFallback>
                            )}
                          </Avatar>
                          <div className="flex-1">
                            <div className="flex items-start justify-between">
                              <p className="text-sm">
                                <span className="font-semibold mr-1">{reply.display_name || reply.username || 'user'}</span>
                                {reply.content}
                              </p>
                              <button onClick={() => toggleCommentLike(reply.id)} className="shrink-0">
                                <Heart className={`h-3 w-3 ${reply.isLiked ? 'fill-red-500 text-red-500' : 'text-muted-foreground'}`} />
                              </button>
                            </div>
                            <div className="flex items-center gap-3 mt-0.5">
                              <span className="text-[10px] text-muted-foreground">{timeAgo(reply.created_at)}</span>
                              <button className="text-[10px] font-semibold text-muted-foreground" onClick={() => toggleCommentLike(reply.id)}>
                                {reply.like_count || 0} likes
                              </button>
                              <button className="text-[10px] font-semibold text-muted-foreground" onClick={() => {
                                setReplyingTo(comment.id);
                                setNewComment(`@${reply.display_name || reply.username || 'user'} `);
                              }}>Reply</button>
                              {(isPostOwner || userId === reply.user_id || isMod) && (
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <button className="text-[10px] text-muted-foreground"><MoreHorizontal className="h-3 w-3" /></button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="start">
                                    <DropdownMenuItem className="text-destructive" onClick={() => handleDeleteComment(reply.id)}>
                                      <Trash2 className="h-3 w-3 mr-2" /> Delete Reply
                                    </DropdownMenuItem>
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Comment input */}
      <div className="fixed bottom-0 left-0 right-0 z-50 bg-card border-t border-border/30 md:sticky md:bottom-auto safe-area-bottom">
        {replyingTo && (
          <div className="px-4 py-1.5 bg-muted/50 flex items-center justify-between">
            <span className="text-xs text-muted-foreground">Replying to comment</span>
            <Button variant="outline" size="sm" className="h-6 px-2.5 text-[10px] font-semibold rounded-full" onClick={() => { setReplyingTo(null); setNewComment(""); }}>Cancel</Button>
          </div>
        )}
        <div className="flex items-center gap-2 px-4 py-2">
          <Avatar className="h-8 w-8 shrink-0"><AvatarFallback className="bg-primary/20 text-xs font-bold">{customerUser?.name?.charAt(0) || 'Y'}</AvatarFallback></Avatar>
          <div className="flex-1 flex items-center gap-1">
            {EMOJI_BAR.map(e => <button key={e} className="text-lg" onClick={() => setNewComment(prev => prev + e)}>{e}</button>)}
          </div>
        </div>
        <div className="flex items-center gap-2 px-4 pb-3">
          <Input
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            placeholder={replyingTo ? "Add a reply..." : "Add a comment..."}
            className="flex-1 h-9 bg-muted/50 border-0 text-sm"
            onKeyDown={(e) => e.key === 'Enter' && postComment()}
          />
          <button className="p-1"><Smile className="h-5 w-5 text-muted-foreground" /></button>
          {newComment.trim() && <Button size="sm" className="h-8 px-4 text-xs font-semibold rounded-full" onClick={postComment}>Post</Button>}
        </div>
      </div>
    </div>
  );

  return <SocialLayout hideSidebar>{content}</SocialLayout>;
}
