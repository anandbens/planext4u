import { useState } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import { ArrowLeft, Heart, Send, MoreHorizontal, Smile, Image as ImageIcon } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import SocialLayout from "@/components/social/SocialLayout";

const MOCK_COMMENTS = [
  {
    id: "c1", username: "vijay_kumar", text: "This is absolutely stunning! 🔥", timeAgo: "2h", likes: 42, isLiked: false, isPinned: true,
    replies: [
      { id: "r1", username: "priya_designs", text: "@vijay_kumar thanks so much! 💕", timeAgo: "1h", likes: 5, isLiked: false },
      { id: "r2", username: "rahul_food", text: "Agreed! Amazing work", timeAgo: "45m", likes: 2, isLiked: true },
    ],
  },
  {
    id: "c2", username: "sneha_art", text: "Love the colors in this shot 🎨", timeAgo: "3h", likes: 18, isLiked: true, isPinned: false,
    replies: [],
  },
  {
    id: "c3", username: "karthik_tech", text: "Where was this taken?", timeAgo: "4h", likes: 3, isLiked: false, isPinned: false,
    replies: [
      { id: "r3", username: "vijay_sivakumar", text: "Pondicherry! You should visit", timeAgo: "3h", likes: 8, isLiked: false },
    ],
  },
  {
    id: "c4", username: "deepak_fit", text: "Just incredible 🙌", timeAgo: "5h", likes: 7, isLiked: false, isPinned: false, replies: [] },
  {
    id: "c5", username: "anita_travel", text: "Adding this to my travel list!", timeAgo: "6h", likes: 12, isLiked: false, isPinned: false, replies: [] },
];

export default function SocialCommentsPage() {
  const navigate = useNavigate();
  const { postId } = useParams();
  const [comments, setComments] = useState(MOCK_COMMENTS);
  const [newComment, setNewComment] = useState("");
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [expandedReplies, setExpandedReplies] = useState<Set<string>>(new Set());

  const toggleLike = (commentId: string, isReply = false, parentId?: string) => {
    setComments(prev => prev.map(c => {
      if (!isReply && c.id === commentId) {
        return { ...c, isLiked: !c.isLiked, likes: c.isLiked ? c.likes - 1 : c.likes + 1 };
      }
      if (isReply && c.id === parentId) {
        return { ...c, replies: c.replies.map(r => r.id === commentId ? { ...r, isLiked: !r.isLiked, likes: r.isLiked ? r.likes - 1 : r.likes + 1 } : r) };
      }
      return c;
    }));
  };

  const postComment = () => {
    if (!newComment.trim()) return;
    const newC = { id: `c-new-${Date.now()}`, username: "you", text: newComment, timeAgo: "now", likes: 0, isLiked: false, isPinned: false, replies: [] };
    if (replyingTo) {
      setComments(prev => prev.map(c => c.id === replyingTo ? { ...c, replies: [...c.replies, { ...newC, id: `r-new-${Date.now()}` }] } : c));
      setExpandedReplies(prev => new Set(prev).add(replyingTo));
    } else {
      setComments(prev => [...prev, newC]);
    }
    setNewComment("");
    setReplyingTo(null);
    toast.success("Comment posted");
  };

  const EMOJI_BAR = ["❤️", "🙌", "🔥", "👏", "😢"];

  const content = (
    <div className="pb-20 md:pb-8">
      <header className="sticky top-0 z-40 bg-card border-b border-border/30">
        <div className="flex items-center gap-3 px-4 py-3">
          <button onClick={() => navigate(-1)}><ArrowLeft className="h-5 w-5" /></button>
          <h1 className="text-lg font-bold flex-1">Comments</h1>
          <button><Send className="h-5 w-5" /></button>
        </div>
      </header>

      {/* Post preview mini */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-border/20">
        <Avatar className="h-8 w-8"><AvatarFallback className="bg-primary/20 text-xs font-bold">V</AvatarFallback></Avatar>
        <p className="text-sm flex-1"><span className="font-semibold">vijay_sivakumar</span> Just tried the amazing coffee from Brooklyn Coffee Co.! Best...<span className="text-muted-foreground ml-1">more</span></p>
      </div>

      {/* Comments list */}
      <div className="divide-y divide-border/10">
        {comments.map(comment => (
          <div key={comment.id}>
            <div className="flex gap-3 px-4 py-3">
              <Link to={`/app/social/@${comment.username}`}>
                <Avatar className="h-9 w-9 shrink-0"><AvatarFallback className="bg-muted text-xs font-bold">{comment.username.charAt(0).toUpperCase()}</AvatarFallback></Avatar>
              </Link>
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between">
                  <div>
                    {comment.isPinned && <span className="text-[10px] text-muted-foreground flex items-center gap-1 mb-1">📌 Pinned</span>}
                    <p className="text-sm">
                      <Link to={`/app/social/@${comment.username}`} className="font-semibold mr-1">{comment.username}</Link>
                      {comment.text}
                    </p>
                    <div className="flex items-center gap-4 mt-1">
                      <span className="text-xs text-muted-foreground">{comment.timeAgo}</span>
                      <button className="text-xs font-semibold text-muted-foreground">{comment.likes} likes</button>
                      <button className="text-xs font-semibold text-muted-foreground" onClick={() => { setReplyingTo(comment.id); }}>Reply</button>
                      <button className="text-xs text-muted-foreground" onClick={() => toast.info("More options")}><MoreHorizontal className="h-3.5 w-3.5" /></button>
                    </div>
                  </div>
                  <button onClick={() => toggleLike(comment.id)} className="pt-1 shrink-0">
                    <Heart className={`h-3.5 w-3.5 ${comment.isLiked ? 'fill-red-500 text-red-500' : 'text-muted-foreground'}`} />
                  </button>
                </div>

                {/* Replies */}
                {comment.replies.length > 0 && (
                  <div className="mt-2">
                    {!expandedReplies.has(comment.id) && comment.replies.length > 0 && (
                      <button className="text-xs font-semibold text-muted-foreground flex items-center gap-2" onClick={() => setExpandedReplies(prev => new Set(prev).add(comment.id))}>
                        <span className="w-6 h-px bg-muted-foreground/40" /> View {comment.replies.length} {comment.replies.length === 1 ? 'reply' : 'replies'}
                      </button>
                    )}
                    {expandedReplies.has(comment.id) && comment.replies.map(reply => (
                      <div key={reply.id} className="flex gap-2.5 mt-2.5">
                        <Avatar className="h-7 w-7"><AvatarFallback className="bg-muted text-[10px] font-bold">{reply.username.charAt(0).toUpperCase()}</AvatarFallback></Avatar>
                        <div className="flex-1">
                          <div className="flex items-start justify-between">
                            <p className="text-sm"><span className="font-semibold mr-1">{reply.username}</span>{reply.text}</p>
                            <button onClick={() => toggleLike(reply.id, true, comment.id)} className="shrink-0"><Heart className={`h-3 w-3 ${reply.isLiked ? 'fill-red-500 text-red-500' : 'text-muted-foreground'}`} /></button>
                          </div>
                          <div className="flex items-center gap-3 mt-0.5">
                            <span className="text-[10px] text-muted-foreground">{reply.timeAgo}</span>
                            <button className="text-[10px] font-semibold text-muted-foreground">{reply.likes} likes</button>
                            <button className="text-[10px] font-semibold text-muted-foreground" onClick={() => setReplyingTo(comment.id)}>Reply</button>
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

      {/* Comment input */}
      <div className="fixed bottom-0 left-0 right-0 z-50 bg-card border-t border-border/30 md:sticky md:bottom-auto safe-area-bottom">
        {replyingTo && (
          <div className="px-4 py-1.5 bg-muted/50 flex items-center justify-between">
            <span className="text-xs text-muted-foreground">Replying to <span className="font-semibold text-foreground">{comments.find(c => c.id === replyingTo)?.username}</span></span>
            <button onClick={() => setReplyingTo(null)} className="text-xs text-primary font-semibold">Cancel</button>
          </div>
        )}
        <div className="flex items-center gap-2 px-4 py-2">
          <Avatar className="h-8 w-8 shrink-0"><AvatarFallback className="bg-primary/20 text-xs font-bold">Y</AvatarFallback></Avatar>
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
