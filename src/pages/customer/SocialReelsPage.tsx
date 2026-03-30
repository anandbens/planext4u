import { useState, useRef, useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Heart, MessageCircle, Send, Bookmark, MoreHorizontal, Music2, Plus, Search, Home, Play } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth";
import SocialLayout from "@/components/social/SocialLayout";

const MOCK_REELS = [
  {
    id: "r1", username: "vijay_sivakumar", displayName: "Vijay Sivakumar", isVerified: true,
    videoUrl: "https://images.unsplash.com/photo-1558618666-fcd25c85f82e?w=400&h=700&fit=crop",
    caption: "Morning routine check ☀️ #morningroutine #lifestyle",
    audio: "Original Audio — vijay_sivakumar",
    likes: 12400, comments: 340, shares: 89,
    isLiked: false, isSaved: false,
  },
  {
    id: "r2", username: "priya_designs", displayName: "Priya Designs", isVerified: false,
    videoUrl: "https://images.unsplash.com/photo-1513364776144-60967b0f800f?w=400&h=700&fit=crop",
    caption: "Watch me create this piece 🎨 #art #timelapse",
    audio: "Aesthetic Vibes — TrendSound",
    likes: 8900, comments: 156, shares: 234,
    isLiked: true, isSaved: false,
  },
  {
    id: "r3", username: "rahul_food", displayName: "Rahul Food", isVerified: true,
    videoUrl: "https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=400&h=700&fit=crop",
    caption: "This recipe is too good 🍕 #food #recipe #cooking",
    audio: "Cooking Music — ChefBeats",
    likes: 45200, comments: 890, shares: 1200,
    isLiked: false, isSaved: true,
  },
];

function formatCount(n: number): string {
  if (n >= 1000000) return (n / 1000000).toFixed(1).replace(/\.0$/, '') + 'M';
  if (n >= 1000) return (n / 1000).toFixed(1).replace(/\.0$/, '') + 'k';
  return n.toString();
}

export default function SocialReelsPage() {
  const navigate = useNavigate();
  const { customerUser } = useAuth();
  const [reels, setReels] = useState(MOCK_REELS);
  const [currentIdx, setCurrentIdx] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  const toggleLike = (reelId: string) => {
    setReels(prev => prev.map(r =>
      r.id === reelId ? { ...r, isLiked: !r.isLiked, likes: r.isLiked ? r.likes - 1 : r.likes + 1 } : r
    ));
  };

  const toggleSave = (reelId: string) => {
    setReels(prev => prev.map(r => {
      if (r.id === reelId) {
        toast.success(r.isSaved ? "Removed from saved" : "Reel saved");
        return { ...r, isSaved: !r.isSaved };
      }
      return r;
    }));
  };

  const handleScroll = useCallback(() => {
    if (!containerRef.current) return;
    const scrollTop = containerRef.current.scrollTop;
    const height = containerRef.current.clientHeight;
    const idx = Math.round(scrollTop / height);
    setCurrentIdx(idx);
  }, []);

  return (
    <div className="fixed inset-0 bg-black z-50">
      <div
        ref={containerRef}
        className="h-full w-full overflow-y-scroll snap-y snap-mandatory"
        onScroll={handleScroll}
        style={{ scrollSnapType: 'y mandatory' }}
      >
        {reels.map((reel, idx) => (
          <div
            key={reel.id}
            className="relative h-full w-full snap-start snap-always flex items-center justify-center"
            style={{ scrollSnapAlign: 'start' }}
          >
            {/* Reel image (simulating video) */}
            <img
              src={reel.videoUrl}
              alt=""
              className="absolute inset-0 w-full h-full object-cover"
              onDoubleClick={() => toggleLike(reel.id)}
            />

            {/* Gradient overlay */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-black/20" />

            {/* Right action bar */}
            <div className="absolute right-3 bottom-28 flex flex-col items-center gap-5 z-10">
              <button onClick={() => toggleLike(reel.id)} className="flex flex-col items-center gap-1">
                <AnimatePresence mode="wait">
                  {reel.isLiked ? (
                    <motion.div key="liked" initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", stiffness: 500, damping: 15 }}>
                      <Heart className="h-7 w-7 fill-red-500 text-red-500" />
                    </motion.div>
                  ) : (
                    <motion.div key="unliked"><Heart className="h-7 w-7 text-white" /></motion.div>
                  )}
                </AnimatePresence>
                <span className="text-white text-xs font-semibold">{formatCount(reel.likes)}</span>
              </button>

              <button onClick={() => toast.info("Comments coming soon")} className="flex flex-col items-center gap-1">
                <MessageCircle className="h-7 w-7 text-white" />
                <span className="text-white text-xs font-semibold">{formatCount(reel.comments)}</span>
              </button>

              <button onClick={() => toast.info("Share coming soon")} className="flex flex-col items-center gap-1">
                <Send className="h-7 w-7 text-white" />
                <span className="text-white text-xs font-semibold">{formatCount(reel.shares)}</span>
              </button>

              <button onClick={() => toggleSave(reel.id)} className="flex flex-col items-center gap-1">
                <Bookmark className={`h-7 w-7 text-white ${reel.isSaved ? 'fill-white' : ''}`} />
              </button>

              <button onClick={() => toast.info("More options")} className="flex flex-col items-center gap-1">
                <MoreHorizontal className="h-7 w-7 text-white" />
              </button>

              {/* Audio disc */}
              <div className="h-9 w-9 rounded-lg border-2 border-white/40 overflow-hidden animate-spin" style={{ animationDuration: '3s' }}>
                <div className="w-full h-full bg-muted flex items-center justify-center">
                  <Music2 className="h-4 w-4 text-white" />
                </div>
              </div>
            </div>

            {/* Bottom info */}
            <div className="absolute bottom-20 left-3 right-16 z-10">
              <div className="flex items-center gap-2 mb-2">
                <Link to={`/app/social/@${reel.username}`}>
                  <Avatar className="h-8 w-8 border border-white">
                    <AvatarFallback className="bg-primary text-primary-foreground text-xs">
                      {reel.username.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                </Link>
                <Link to={`/app/social/@${reel.username}`} className="text-white text-sm font-semibold">
                  {reel.username}
                </Link>
                {reel.isVerified && (
                  <svg className="h-3.5 w-3.5 text-primary fill-current" viewBox="0 0 24 24"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" /></svg>
                )}
                <button className="border border-white/60 text-white text-xs font-semibold px-3 py-0.5 rounded-lg ml-1">
                  Follow
                </button>
              </div>
              <p className="text-white text-sm leading-snug line-clamp-2">{reel.caption}</p>
              <div className="flex items-center gap-1.5 mt-2">
                <Music2 className="h-3.5 w-3.5 text-white/80" />
                <p className="text-white/80 text-xs truncate">{reel.audio}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Top nav */}
      <div className="absolute top-0 left-0 right-0 z-20 flex items-center justify-between px-4 py-3 safe-area-top">
        <span className="text-white text-lg font-bold">Reels</span>
        <button onClick={() => navigate("/app/social/create")} className="p-1">
          <Plus className="h-6 w-6 text-white" />
        </button>
      </div>

      {/* Bottom Navigation */}
      <nav className="absolute bottom-0 left-0 right-0 z-20 bg-black/50 backdrop-blur-sm border-t border-white/10 md:hidden safe-area-bottom">
        <div className="flex items-center justify-around px-2 py-2.5 max-w-xl mx-auto">
          <Link to="/app/social" className="flex flex-col items-center gap-0.5">
            <Home className="h-6 w-6 text-white/60" />
          </Link>
          <Link to="/app/social/explore" className="flex flex-col items-center gap-0.5">
            <Search className="h-6 w-6 text-white/60" />
          </Link>
          <Link to="/app/social/create" className="flex flex-col items-center gap-0.5">
            <div className="h-7 w-7 rounded-lg border-2 border-white/60 flex items-center justify-center">
              <Plus className="h-4 w-4 text-white/60" />
            </div>
          </Link>
          <button className="flex flex-col items-center gap-0.5">
            <svg className="h-6 w-6 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="2" width="20" height="20" rx="5"/><path d="M2 8h20M8 2v6M10 12l6 3.5-6 3.5z"/></svg>
          </button>
          <Link to="/app/social/profile" className="flex flex-col items-center gap-0.5">
            <div className="h-7 w-7 rounded-full bg-white/20 border border-white/60 flex items-center justify-center">
              <span className="text-xs font-bold text-white">{customerUser?.name?.charAt(0) || 'U'}</span>
            </div>
          </Link>
        </div>
      </nav>
    </div>
  );
}
