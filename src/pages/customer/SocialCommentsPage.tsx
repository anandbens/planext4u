import { useState } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import { ArrowLeft, Heart, Send, MoreHorizontal, Smile } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import SocialLayout from "@/components/social/SocialLayout";
import { usePostComments } from "@/hooks/use-social-interactions";
import { useAuth } from "@/lib/auth";

// Fallback mock for when DB has no data
const MOCK_COMMENTS = [
  {
    id: "c1", user_id: "mock", content: "This is absolutely stunning! 🔥", created_at: new Date(Date.now() - 7200000).toISOString(),
    like_count: 42, isLiked: false, is_pinned: true,
    replies: [
      { id: "r1", user_id: "mock2", content: "@vijay_kumar thanks so much! 💕", created_at: new Date(Date.now() - 3600000).toISOString(), like_count: 5, isLiked: false },
      { id: "r2", user_id: "mock3", content: "Agreed! Amazing work", created_at: new Date(Date.now() - 2700000).toISOString(), like_count: 2, isLiked: true },
    ],
  },
  {
    id: "c2", user_id: "mock4", content: "Love the colors in this shot 🎨", created_at: new Date(Date.now() - 10800000).toISOString(),
    like_count: 18, isLiked: true, is_pinned: false, replies: [],
  },
  {
    id: "c3", user_id: "mock5", content: "Where was this taken?", created_at: new Date(Date.now() - 14400000).toISOString(),
    like_count: 3, isLiked: false, is_pinned: false,
    replies: [
      { id: "r3", user_id: "mock6", content: "Pondicherry! You should visit", created_at: new Date(Date.now() - 10800000).toISOString(), like_count: 8, isLiked: false },
    ],
  },
];

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'now';
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h`;
  return `${Math.floor(hrs / 24)}d`;
}

function getUsername(userId: string): string {
  const names: Record<string, string> = {
    mock: 'vijay_kumar', mock2: 'priya_designs', mock3: 'rahul_food',
    mock4: 'sneha_art', mock5: 'karthik_tech', mock6: 'vijay_sivakumar',
  };
  return names[userId] || userId.substring(0, 10);
}

export default function SocialCommentsPage() {
  const navigate = useNavigate();
  const { postId } = useParams();
  const { customerUser } = useAuth();
  const [newComment, setNewComment] = useState("");
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [expandedReplies, setExpandedReplies] = useState<Set<string>>(new Set());

  // DB-driven comments
  const { comments: dbComments, isLoading, addComment, toggleCommentLike } = usePostComments(postId || '');

  // Use DB data if available, else fallback
  const comments = dbComments.length > 0 ? dbComments : MOCK_COMMENTS;
  const isMock = dbComments.length === 0;

  // Local state for mock comment likes
  const [mockLikes, setMockLikes] = useState<Set<string>>(new Set(['c2', 'r2']));

  const handleToggleLike = (commentId: string) => {
    if (isMock) {
      setMockLikes(prev => {
        const next = new Set(prev);
        next.has(commentId) ? next.delete(commentId) : next.add(commentId);
        return next;
      });
    } else {
      toggleCommentLike(commentId);
    }
  };

  const postComment = () => {
    if (!customerUser?.id) {
      toast.error("Please login to comment");
      navigate("/app/login");
      return;
    }
    if (!newComment.trim()) return;
    if (isMock) {
      toast.success("Comment posted");
      setNewComment("");
      setReplyingTo(null);
      return;
    }
    addComment({ text: newComment, parentId: replyingTo || undefined });
    setNewComment("");
    setReplyingTo(null);
    if (replyingTo) setExpandedReplies(prev => new Set(prev).add(replyingTo));
  };

  const EMOJI_BAR = ["❤️", "🙌", "🔥", "👏", "😢"];

  const content = (
    <div className="pb-20 md:pb-8">
      <header className="sticky top-0 z-40 bg-card border-b border-border/30">
        <div className="flex items-center gap-3 px-4 py-3">
          <button onClick={() => navigate(-1)}><ArrowLeft className="h-5 w-5" /></button>
          <h1 className="text-lg font-bold flex-1">Comments</h1>
          <button onClick={() => navigate(`/app/social/messages`)}><Send className="h-5 w-5" /></button>
        </div>
      </header>

      {/* Post preview mini */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-border/20">
        <Avatar className="h-8 w-8"><AvatarFallback className="bg-primary/20 text-xs font-bold">V</AvatarFallback></Avatar>
        <p className="text-sm flex-1"><span className="font-semibold">vijay_sivakumar</span> Just tried the amazing coffee from Brooklyn Coffee Co.! Best...<span className="text-muted-foreground ml-1">more</span></p>
      </div>

      {/* Comments list */}
      <div className="divide-y divide-border/10">
        {comments.map((comment: any) => {
          const username = getUsername(comment.user_id);
          const commentLiked = isMock ? mockLikes.has(comment.id) : comment.isLiked;
          return (
            <div key={comment.id}>
              <div className="flex gap-3 px-4 py-3">
                <Link to={`/app/social/@${username}`}>
                  <Avatar className="h-9 w-9 shrink-0"><AvatarFallback className="bg-muted text-xs font-bold">{username.charAt(0).toUpperCase()}</AvatarFallback></Avatar>
                </Link>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between">
                    <div>
                      {comment.is_pinned && <span className="text-[10px] text-muted-foreground flex items-center gap-1 mb-1">📌 Pinned</span>}
                      <p className="text-sm">
                        <Link to={`/app/social/@${username}`} className="font-semibold mr-1">{username}</Link>
                        {comment.content}
                      </p>
                      <div className="flex items-center gap-4 mt-1">
                        <span className="text-xs text-muted-foreground">{timeAgo(comment.created_at)}</span>
                        <button className="text-xs font-semibold text-muted-foreground">{comment.like_count || 0} likes</button>
                        <button className="text-xs font-semibold text-muted-foreground" onClick={() => setReplyingTo(comment.id)}>Reply</button>
                        <button className="text-xs text-muted-foreground"><MoreHorizontal className="h-3.5 w-3.5" /></button>
                      </div>
                    </div>
                    <button onClick={() => handleToggleLike(comment.id)} className="pt-1 shrink-0">
                      <Heart className={`h-3.5 w-3.5 ${commentLiked ? 'fill-red-500 text-red-500' : 'text-muted-foreground'}`} />
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
                      {expandedReplies.has(comment.id) && comment.replies.map((reply: any) => {
                        const replyUsername = getUsername(reply.user_id);
                        const replyLiked = isMock ? mockLikes.has(reply.id) : reply.isLiked;
                        return (
                          <div key={reply.id} className="flex gap-2.5 mt-2.5">
                            <Avatar className="h-7 w-7"><AvatarFallback className="bg-muted text-[10px] font-bold">{replyUsername.charAt(0).toUpperCase()}</AvatarFallback></Avatar>
                            <div className="flex-1">
                              <div className="flex items-start justify-between">
                                <p className="text-sm"><span className="font-semibold mr-1">{replyUsername}</span>{reply.content}</p>
                                <button onClick={() => handleToggleLike(reply.id)} className="shrink-0"><Heart className={`h-3 w-3 ${replyLiked ? 'fill-red-500 text-red-500' : 'text-muted-foreground'}`} /></button>
                              </div>
                              <div className="flex items-center gap-3 mt-0.5">
                                <span className="text-[10px] text-muted-foreground">{timeAgo(reply.created_at)}</span>
                                <button className="text-[10px] font-semibold text-muted-foreground">{reply.like_count || 0} likes</button>
                                <button className="text-[10px] font-semibold text-muted-foreground" onClick={() => setReplyingTo(comment.id)}>Reply</button>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Comment input */}
      <div className="fixed bottom-0 left-0 right-0 z-50 bg-card border-t border-border/30 md:sticky md:bottom-auto safe-area-bottom">
        {replyingTo && (
          <div className="px-4 py-1.5 bg-muted/50 flex items-center justify-between">
            <span className="text-xs text-muted-foreground">Replying to <span className="font-semibold text-foreground">{getUsername(comments.find((c: any) => c.id === replyingTo)?.user_id || '')}</span></span>
            <button onClick={() => setReplyingTo(null)} className="text-xs text-primary font-semibold">Cancel</button>
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
          {newComment.trim() && <button onClick={postComment} className="text-sm font-semibold text-primary">Post</button>}
        </div>
      </div>
    </div>
  );

  return <SocialLayout hideSidebar>{content}</SocialLayout>;
}
