import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Heart, MessageCircle, Send, Bookmark, MoreHorizontal, Plus, ChevronDown } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/lib/auth";
import { toast } from "sonner";
import SocialLayout from "@/components/social/SocialLayout";

const MOCK_STORIES = [
  { id: "own", username: "Your Story", avatar: "", isOwn: true, seen: false },
  { id: "1", username: "vijay_kumar", avatar: "", seen: false },
  { id: "2", username: "priya_designs", avatar: "", seen: false },
  { id: "3", username: "rahul_food", avatar: "", seen: true },
  { id: "4", username: "anita_travel", avatar: "", seen: true },
  { id: "5", username: "karthik_tech", avatar: "", seen: false },
  { id: "6", username: "sneha_art", avatar: "", seen: true },
  { id: "7", username: "deepak_fit", avatar: "", seen: false },
  { id: "8", username: "vijay_k2", avatar: "", seen: false },
  { id: "9", username: "vijay_k3", avatar: "", seen: false },
  { id: "10", username: "vijay_k4", avatar: "", seen: true },
];

const MOCK_POSTS = [
  {
    id: "p1", username: "vijay_sivakumar", displayName: "Vijay Sivakumar", avatar: "", isVerified: true,
    location: "Pondicherry, TN", timeAgo: "1 hours ago",
    media: [
      { type: "photo", url: "https://images.unsplash.com/photo-1558618666-fcd25c85f82e?w=600&h=600&fit=crop" },
      { type: "photo", url: "https://images.unsplash.com/photo-1449824913935-59a10b8d2000?w=600&h=600&fit=crop" },
    ],
    caption: "Just tried the amazing coffee from Brooklyn Coffee Co.! Best...",
    hashtags: ["#coffee", "#local", "#brooklyn", "#smallbusiness"],
    likes: 1600, comments: 800, shares: 145,
    isLiked: false, isSaved: false, isCarousel: true,
    collabUser: "Kokila",
  },
  {
    id: "p2", username: "planext4u", displayName: "Planext4u", avatar: "", isVerified: true,
    location: "Coimbatore, TN", timeAgo: "3 hours ago",
    media: [{ type: "photo", url: "https://images.unsplash.com/photo-1449824913935-59a10b8d2000?w=600&h=600&fit=crop" }],
    caption: "Exciting things are coming to P4U! Stay tuned for the biggest update yet 🚀",
    hashtags: ["#planext4u", "#superapp", "#innovation"],
    likes: 3200, comments: 450, shares: 890,
    isLiked: true, isSaved: true, isCarousel: false,
  },
  {
    id: "p3", username: "priya_designs", displayName: "Priya Designs", avatar: "",
    location: "Chennai, TN", timeAgo: "5 hours ago",
    media: [{ type: "photo", url: "https://images.unsplash.com/photo-1513364776144-60967b0f800f?w=600&h=600&fit=crop" }],
    caption: "New collection dropping soon! What do you think of these designs? 🎨✨",
    hashtags: ["#design", "#art", "#creative"],
    likes: 892, comments: 67, shares: 23,
    isLiked: false, isSaved: false, isCarousel: false,
  },
];

function formatCount(n: number): string {
  if (n >= 1000000) return (n / 1000000).toFixed(1).replace(/\.0$/, '') + 'M';
  if (n >= 1000) return (n / 1000).toFixed(1).replace(/\.0$/, '') + 'k';
  return n.toString();
}

export default function SocialFeedPage() {
  const navigate = useNavigate();
  const { customerUser } = useAuth();
  const [posts, setPosts] = useState(MOCK_POSTS);
  const [feedMode, setFeedMode] = useState<'following' | 'for_you'>('following');
  const [carouselIdx, setCarouselIdx] = useState<Record<string, number>>({});

  const toggleLike = (postId: string) => {
    setPosts(prev => prev.map(p =>
      p.id === postId ? { ...p, isLiked: !p.isLiked, likes: p.isLiked ? p.likes - 1 : p.likes + 1 } : p
    ));
  };

  const toggleSave = (postId: string) => {
    setPosts(prev => prev.map(p => {
      if (p.id === postId) {
        toast.success(p.isSaved ? "Removed from saved" : "Post saved");
        return { ...p, isSaved: !p.isSaved };
      }
      return p;
    }));
  };

  const content = (
    <>
      {/* Mobile header */}
      <header className="sticky top-0 z-40 bg-card border-b border-border/30 md:hidden">
        <div className="max-w-xl mx-auto flex items-center justify-between px-4 py-3">
          <Link to="/app/social" className="flex items-center gap-1.5">
            <span className="text-2xl font-bold tracking-tight">Socio</span>
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          </Link>
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
        {posts.map((post) => {
          const currentSlide = carouselIdx[post.id] || 0;
          return (
            <article key={post.id} className="border-b border-border/20">
              {/* Header */}
              <div className="flex items-center gap-3 px-4 py-3">
                <Link to={`/app/social/@${post.username}`}>
                  <div className="h-9 w-9 rounded-full bg-gradient-to-tr from-amber-400 to-rose-500 p-[1.5px]">
                    <div className="h-full w-full rounded-full bg-card flex items-center justify-center">
                      <span className="text-xs font-bold">{post.username.charAt(0).toUpperCase()}</span>
                    </div>
                  </div>
                </Link>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1 flex-wrap">
                    <Link to={`/app/social/@${post.username}`} className="text-sm font-semibold">{post.username}</Link>
                    {post.isVerified && (
                      <svg className="h-3.5 w-3.5 text-primary fill-current shrink-0" viewBox="0 0 24 24"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" /></svg>
                    )}
                    {post.collabUser && (
                      <span className="text-sm text-muted-foreground"> and <span className="font-semibold text-foreground">{post.collabUser}</span></span>
                    )}
                  </div>
                  {post.location && <p className="text-[11px] text-muted-foreground">{post.location} · {post.timeAgo}</p>}
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild><button className="p-1"><MoreHorizontal className="h-5 w-5" /></button></DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem>Not Interested</DropdownMenuItem>
                    <DropdownMenuItem>Report</DropdownMenuItem>
                    <DropdownMenuItem>Copy Link</DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>

              {/* Media */}
              <div className="relative aspect-square bg-muted overflow-hidden">
                <img
                  src={post.media[currentSlide]?.url || post.media[0].url}
                  alt="" className="w-full h-full object-cover" loading="lazy"
                  onDoubleClick={() => toggleLike(post.id)}
                />
                {post.isCarousel && post.media.length > 1 && (
                  <>
                    {currentSlide > 0 && (
                      <button className="absolute left-2 top-1/2 -translate-y-1/2 bg-card/80 rounded-full p-1"
                        onClick={() => setCarouselIdx(p => ({ ...p, [post.id]: currentSlide - 1 }))}>
                        <ChevronDown className="h-4 w-4 -rotate-90" />
                      </button>
                    )}
                    {currentSlide < post.media.length - 1 && (
                      <button className="absolute right-2 top-1/2 -translate-y-1/2 bg-card/80 rounded-full p-1"
                        onClick={() => setCarouselIdx(p => ({ ...p, [post.id]: currentSlide + 1 }))}>
                        <ChevronDown className="h-4 w-4 rotate-90" />
                      </button>
                    )}
                    <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1">
                      {post.media.map((_, i) => (
                        <div key={i} className={`h-1.5 w-1.5 rounded-full ${i === currentSlide ? 'bg-primary' : 'bg-white/50'}`} />
                      ))}
                    </div>
                  </>
                )}
                {/* Sound icon */}
                <button className="absolute bottom-3 right-3 bg-foreground/40 rounded-full p-1.5">
                  <svg className="h-3.5 w-3.5 text-white" viewBox="0 0 24 24" fill="currentColor"><path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3A4.5 4.5 0 0 0 14 8.5v7a4.5 4.5 0 0 0 2.5-3.5z"/></svg>
                </button>
              </div>

              {/* Actions */}
              <div className="flex items-center justify-between px-4 py-2.5">
                <div className="flex items-center gap-4">
                  <button onClick={() => toggleLike(post.id)}>
                    <AnimatePresence mode="wait">
                      {post.isLiked ? (
                        <motion.div key="liked" initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", stiffness: 500, damping: 15 }}>
                          <Heart className="h-6 w-6 fill-red-500 text-red-500" />
                        </motion.div>
                      ) : (
                        <motion.div key="unliked"><Heart className="h-6 w-6" /></motion.div>
                      )}
                    </AnimatePresence>
                  </button>
                  <button><MessageCircle className="h-6 w-6" /></button>
                  <button><Send className="h-6 w-6" /></button>
                </div>
                <button onClick={() => toggleSave(post.id)}>
                  <Bookmark className={`h-6 w-6 ${post.isSaved ? 'fill-foreground' : ''}`} />
                </button>
              </div>

              {/* Stats line */}
              <div className="px-4 flex items-center gap-3 text-sm">
                <span className="flex items-center gap-1"><Heart className="h-4 w-4" /> {formatCount(post.likes)}</span>
                <span className="flex items-center gap-1"><MessageCircle className="h-4 w-4" /> {formatCount(post.comments)}</span>
                <span className="flex items-center gap-1"><Send className="h-4 w-4" /> {formatCount(post.shares)}</span>
              </div>

              {/* Caption */}
              <div className="px-4 py-1.5">
                <p className="text-sm">
                  <Link to={`/app/social/@${post.username}`} className="font-semibold mr-1">{post.username}</Link>
                  {post.caption}
                  <span className="text-primary ml-1 cursor-pointer">more</span>
                </p>
                {post.hashtags && (
                  <p className="text-sm text-primary mt-0.5">{post.hashtags.join(' ')}</p>
                )}
              </div>

              <button className="px-4 py-1">
                <p className="text-sm text-muted-foreground">View all {formatCount(post.comments)} comments</p>
              </button>
              <div className="px-4 pb-3">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <span>Add a comment...</span>
                  <span className="ml-auto">😊</span>
                </div>
              </div>
            </article>
          );
        })}

        <div className="py-6 px-4 text-center">
          <p className="text-sm font-semibold mb-1">You're All Caught Up</p>
          <p className="text-xs text-muted-foreground">You've seen all new posts from the last 3 days.</p>
        </div>
      </div>
    </>
  );

  return <SocialLayout>{content}</SocialLayout>;
}
