import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Heart, MessageCircle, Send, Bookmark, MoreHorizontal, Plus, Camera, Search, Bell, ChevronDown, MapPin, BookmarkCheck, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import p4uLogo from "@/assets/p4u-logo.png";

// Mock data for demo feed
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

const MOCK_POSTS = [
  {
    id: "p1", username: "vijay_sivakumar", displayName: "Vijay Sivakumar", avatar: "", isVerified: true,
    location: "Pondicherry, TN", timeAgo: "1 hours ago",
    media: [{ type: "photo", url: "https://images.unsplash.com/photo-1558618666-fcd25c85f82e?w=600&h=600&fit=crop" }],
    caption: "Just tried the amazing coffee from Brooklyn Cof...",
    hashtags: ["#coffee", "#local", "#brooklyn", "#smallbusiness"],
    likes: 1600, comments: 800, shares: 145,
    isLiked: false, isSaved: false, isCarousel: false,
    collabUser: "Kokila",
  },
  {
    id: "p2", username: "planext4u", displayName: "Planext4u", avatar: "", isVerified: true,
    location: "Coimbatore, TN", timeAgo: "3 hours ago",
    media: [
      { type: "photo", url: "https://images.unsplash.com/photo-1449824913935-59a10b8d2000?w=600&h=600&fit=crop" },
      { type: "photo", url: "https://images.unsplash.com/photo-1480714378408-67cf0d13bc1b?w=600&h=600&fit=crop" },
    ],
    caption: "Exciting things are coming to P4U! Stay tuned for the biggest update yet 🚀",
    hashtags: ["#planext4u", "#superapp", "#innovation"],
    likes: 3200, comments: 450, shares: 890,
    isLiked: true, isSaved: true, isCarousel: true,
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
  const [isLoading, setIsLoading] = useState(false);

  const toggleLike = (postId: string) => {
    setPosts(prev => prev.map(p => {
      if (p.id === postId) {
        return { ...p, isLiked: !p.isLiked, likes: p.isLiked ? p.likes - 1 : p.likes + 1 };
      }
      return p;
    }));
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

  return (
    <div className="min-h-screen bg-background">
      {/* Header - Instagram-style */}
      <header className="sticky top-0 z-40 bg-card border-b border-border/30">
        <div className="max-w-xl mx-auto flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2">
            <Link to="/app/social" className="flex items-center gap-1.5">
              <span className="text-2xl font-bold tracking-tight">Socio</span>
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            </Link>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={() => navigate("/app/social/create")} className="p-1.5">
              <Plus className="h-6 w-6" />
            </button>
            <button onClick={() => toast.info("Notifications coming soon")} className="p-1.5 relative">
              <Heart className="h-6 w-6" />
              <span className="absolute top-0 right-0 h-2.5 w-2.5 bg-destructive rounded-full" />
            </button>
            <button onClick={() => toast.info("Messages coming soon")} className="p-1.5">
              <Send className="h-6 w-6" />
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-xl mx-auto">
        {/* Stories Row */}
        <div className="flex gap-3 px-4 py-3 overflow-x-auto scrollbar-hide border-b border-border/20">
          {MOCK_STORIES.map((story) => (
            <button key={story.id} className="flex flex-col items-center gap-1 shrink-0" onClick={() => toast.info("Stories coming soon")}>
              <div className={`relative p-[2px] rounded-full ${story.isOwn ? '' : story.seen ? 'bg-muted' : 'bg-gradient-to-tr from-amber-400 via-rose-500 to-purple-600'}`}>
                <div className="h-16 w-16 rounded-full bg-card p-[2px]">
                  <div className="h-full w-full rounded-full bg-muted flex items-center justify-center overflow-hidden">
                    {story.isOwn ? (
                      <div className="relative h-full w-full bg-accent flex items-center justify-center">
                        <span className="text-lg font-bold text-primary">{customerUser?.name?.charAt(0) || 'Y'}</span>
                        <div className="absolute bottom-0 right-0 h-5 w-5 bg-primary rounded-full flex items-center justify-center border-2 border-card">
                          <Plus className="h-3 w-3 text-primary-foreground" />
                        </div>
                      </div>
                    ) : (
                      <span className="text-sm font-bold text-muted-foreground">{story.username.charAt(0).toUpperCase()}</span>
                    )}
                  </div>
                </div>
              </div>
              <span className="text-[10px] max-w-[64px] truncate text-center">
                {story.isOwn ? "Your Story" : story.username.split('_')[0]}
              </span>
            </button>
          ))}
        </div>

        {/* Feed Mode Toggle */}
        <div className="flex border-b border-border/20">
          <button
            onClick={() => setFeedMode('following')}
            className={`flex-1 py-2.5 text-sm font-semibold text-center border-b-2 transition-colors ${feedMode === 'following' ? 'border-foreground text-foreground' : 'border-transparent text-muted-foreground'}`}
          >
            Following
          </button>
          <button
            onClick={() => setFeedMode('for_you')}
            className={`flex-1 py-2.5 text-sm font-semibold text-center border-b-2 transition-colors ${feedMode === 'for_you' ? 'border-foreground text-foreground' : 'border-transparent text-muted-foreground'}`}
          >
            For You
          </button>
        </div>

        {/* Posts */}
        <div className="pb-20">
          {posts.map((post) => (
            <article key={post.id} className="border-b border-border/20">
              {/* Post Header */}
              <div className="flex items-center gap-3 px-4 py-3">
                <Link to={`/app/social/@${post.username}`}>
                  <div className="h-9 w-9 rounded-full bg-gradient-to-tr from-amber-400 to-rose-500 p-[1.5px]">
                    <div className="h-full w-full rounded-full bg-card flex items-center justify-center">
                      <span className="text-xs font-bold">{post.username.charAt(0).toUpperCase()}</span>
                    </div>
                  </div>
                </Link>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1">
                    <Link to={`/app/social/@${post.username}`} className="text-sm font-semibold truncate">
                      {post.username}
                    </Link>
                    {post.isVerified && (
                      <svg className="h-3.5 w-3.5 text-primary fill-current shrink-0" viewBox="0 0 24 24">
                        <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
                      </svg>
                    )}
                    {post.collabUser && (
                      <span className="text-sm text-muted-foreground"> and <span className="font-semibold text-foreground">{post.collabUser}</span></span>
                    )}
                  </div>
                  {post.location && (
                    <p className="text-[11px] text-muted-foreground truncate">{post.location}</p>
                  )}
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button className="p-1"><MoreHorizontal className="h-5 w-5" /></button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem>Not Interested</DropdownMenuItem>
                    <DropdownMenuItem>Report</DropdownMenuItem>
                    <DropdownMenuItem>Copy Link</DropdownMenuItem>
                    <DropdownMenuItem>Share to...</DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>

              {/* Post Media */}
              <div className="relative aspect-square bg-muted">
                <img
                  src={post.media[0].url}
                  alt=""
                  className="w-full h-full object-cover"
                  loading="lazy"
                  onDoubleClick={() => toggleLike(post.id)}
                />
                {post.isCarousel && (
                  <div className="absolute top-3 right-3 bg-foreground/60 text-background text-[10px] font-bold px-2 py-0.5 rounded-full">
                    1/{post.media.length}
                  </div>
                )}
              </div>

              {/* Action Bar */}
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
                  <button onClick={() => toast.info("Comments coming soon")}>
                    <MessageCircle className="h-6 w-6" />
                  </button>
                  <button onClick={() => toast.info("Share coming soon")}>
                    <Send className="h-6 w-6" />
                  </button>
                </div>
                <button onClick={() => toggleSave(post.id)}>
                  {post.isSaved ? (
                    <Bookmark className="h-6 w-6 fill-foreground" />
                  ) : (
                    <Bookmark className="h-6 w-6" />
                  )}
                </button>
              </div>

              {/* Likes */}
              <div className="px-4">
                <p className="text-sm font-semibold">{formatCount(post.likes)} likes</p>
              </div>

              {/* Caption */}
              <div className="px-4 py-1.5">
                <p className="text-sm">
                  <Link to={`/app/social/@${post.username}`} className="font-semibold mr-1">{post.username}</Link>
                  {post.caption}
                  <span className="text-muted-foreground ml-1">more</span>
                </p>
                {post.hashtags && post.hashtags.length > 0 && (
                  <p className="text-sm text-primary mt-0.5">
                    {post.hashtags.join(' ')}
                  </p>
                )}
              </div>

              {/* Comments preview */}
              {post.comments > 0 && (
                <button className="px-4 py-1" onClick={() => toast.info("Comments coming soon")}>
                  <p className="text-sm text-muted-foreground">View all {formatCount(post.comments)} comments</p>
                </button>
              )}

              {/* Timestamp */}
              <div className="px-4 pb-3">
                <p className="text-[10px] text-muted-foreground uppercase">{post.timeAgo}</p>
              </div>
            </article>
          ))}

          {/* Suggested posts separator */}
          <div className="py-6 px-4 text-center">
            <p className="text-sm font-semibold mb-1">You're All Caught Up</p>
            <p className="text-xs text-muted-foreground">You've seen all new posts from the last 3 days.</p>
          </div>
        </div>
      </div>

      {/* Bottom Navigation - Instagram-style */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 bg-card border-t border-border/30 md:hidden safe-area-bottom">
        <div className="flex items-center justify-around px-2 py-2.5 max-w-xl mx-auto">
          <Link to="/app/social" className="flex flex-col items-center gap-0.5">
            <svg className="h-6 w-6 fill-current" viewBox="0 0 24 24"><path d="M9.005 16.545a2.997 2.997 0 0 1 2.997-2.997A2.997 2.997 0 0 1 15 16.545V22h7V11.543L12 2 2 11.543V22h7.005z"/></svg>
          </Link>
          <Link to="/app/social/explore" className="flex flex-col items-center gap-0.5">
            <Search className="h-6 w-6" />
          </Link>
          <Link to="/app/social/create" className="flex flex-col items-center gap-0.5">
            <div className="h-7 w-7 rounded-lg border-2 border-foreground flex items-center justify-center">
              <Plus className="h-4 w-4" />
            </div>
          </Link>
          <button onClick={() => toast.info("Reels coming soon")} className="flex flex-col items-center gap-0.5">
            <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="2" width="20" height="20" rx="5"/><path d="M2 8h20M8 2v6M10 12l6 3.5-6 3.5z"/></svg>
          </button>
          <Link to="/app/social/profile" className="flex flex-col items-center gap-0.5">
            <div className="h-7 w-7 rounded-full bg-muted border-2 border-foreground flex items-center justify-center overflow-hidden">
              <span className="text-xs font-bold">{customerUser?.name?.charAt(0) || 'U'}</span>
            </div>
          </Link>
        </div>
      </nav>
    </div>
  );
}
