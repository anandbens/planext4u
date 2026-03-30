import { useState, useRef, useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Heart, MessageCircle, Send, Bookmark, MoreHorizontal, Music2, Plus, Search, Home, Film } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth";
import SocialLayout from "@/components/social/SocialLayout";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

function formatCount(n: number): string {
  if (n >= 1000000) return (n / 1000000).toFixed(1).replace(/\.0$/, '') + 'M';
  if (n >= 1000) return (n / 1000).toFixed(1).replace(/\.0$/, '') + 'k';
  return n.toString();
}

const FALLBACK_REELS = [
  { id: "r1", user_id: "mock", username: "vijay_sivakumar", isVerified: true, videoUrl: "https://images.unsplash.com/photo-1558618666-fcd25c85f82e?w=400&h=700&fit=crop", caption: "Morning routine check ☀️ #morningroutine", audio: "Original Audio", likes: 12400, comments: 340, shares: 89, isLiked: false, isSaved: false },
  { id: "r2", user_id: "mock", username: "priya_designs", isVerified: false, videoUrl: "https://images.unsplash.com/photo-1513364776144-60967b0f800f?w=400&h=700&fit=crop", caption: "Watch me create this piece 🎨 #art", audio: "Aesthetic Vibes", likes: 8900, comments: 156, shares: 234, isLiked: true, isSaved: false },
  { id: "r3", user_id: "mock", username: "rahul_food", isVerified: true, videoUrl: "https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=400&h=700&fit=crop", caption: "This recipe is too good 🍕 #food", audio: "Cooking Music", likes: 45200, comments: 890, shares: 1200, isLiked: false, isSaved: true },
];

export default function SocialReelsPage() {
  const navigate = useNavigate();
  const { customerUser } = useAuth();
  const containerRef = useRef<HTMLDivElement>(null);
  const [currentIdx, setCurrentIdx] = useState(0);
  const qc = useQueryClient();

  // Fetch reels from DB
  const { data: dbReels = [] } = useQuery({
    queryKey: ['social-reels'],
    queryFn: async () => {
      const { data } = await supabase
        .from('social_posts')
        .select('id, user_id, media, caption, like_count, comment_count, share_count, hashtags')
        .eq('post_type', 'reel')
        .eq('status', 'published')
        .order('created_at', { ascending: false })
        .limit(20);
      return data || [];
    },
  });

  const reels = dbReels.length > 0 ? dbReels.map((r: any) => {
    const media = Array.isArray(r.media) && r.media.length > 0 ? r.media[0] : null;
    return {
      id: r.id, user_id: r.user_id,
      videoUrl: media?.url || media?.thumbnailUrl || '',
      caption: r.caption || '',
      likes: r.like_count || 0, comments: r.comment_count || 0, shares: r.share_count || 0,
      audio: "Original Audio",
      isLiked: false, isSaved: false, isVerified: false, username: '',
    };
  }) : FALLBACK_REELS;

  const handleScroll = useCallback(() => {
    if (!containerRef.current) return;
    const idx = Math.round(containerRef.current.scrollTop / containerRef.current.clientHeight);
    setCurrentIdx(idx);
  }, []);

  const reelsContent = (
    <div className="md:relative md:h-[calc(100vh-120px)] fixed inset-0 bg-black z-40 md:z-auto md:rounded-xl md:overflow-hidden">
      <div ref={containerRef} className="h-full w-full overflow-y-scroll snap-y snap-mandatory" onScroll={handleScroll} style={{ scrollSnapType: 'y mandatory' }}>
        {reels.map((reel: any) => (
          <ReelCard key={reel.id} reel={reel} />
        ))}
      </div>

      <div className="absolute top-0 left-0 right-0 z-20 flex items-center justify-between px-4 py-3 safe-area-top">
        <span className="text-white text-lg font-bold">Reels</span>
        <button onClick={() => navigate("/app/social/create")} className="p-1"><Plus className="h-6 w-6 text-white" /></button>
      </div>

      <nav className="absolute bottom-0 left-0 right-0 z-20 bg-black/50 backdrop-blur-sm border-t border-white/10 md:hidden safe-area-bottom">
        <div className="flex items-center justify-around px-2 py-2.5 max-w-xl mx-auto">
          <Link to="/app/social"><Home className="h-6 w-6 text-white/60" /></Link>
          <Link to="/app/social/explore"><Search className="h-6 w-6 text-white/60" /></Link>
          <Link to="/app/social/create"><div className="h-7 w-7 rounded-lg border-2 border-white/60 flex items-center justify-center"><Plus className="h-4 w-4 text-white/60" /></div></Link>
          <button className="relative"><Film className="h-6 w-6 text-white fill-white" /></button>
          <Link to="/app/social/profile"><div className="h-7 w-7 rounded-full bg-white/20 border border-white/60 flex items-center justify-center"><span className="text-xs font-bold text-white">{customerUser?.name?.charAt(0) || 'U'}</span></div></Link>
        </div>
      </nav>
    </div>
  );

  return (
    <>
      <div className="hidden md:block"><SocialLayout hideRightSidebar>{reelsContent}</SocialLayout></div>
      <div className="md:hidden">{reelsContent}</div>
    </>
  );
}

function ReelCard({ reel }: { reel: any }) {
  const navigate = useNavigate();
  const { customerUser } = useAuth();
  const qc = useQueryClient();
  const userId = customerUser?.id;
  const isMock = reel.id.startsWith('r');

  const { data: isLiked = reel.isLiked } = useQuery({
    queryKey: ['social-like', reel.id, userId],
    queryFn: async () => {
      if (!userId) return false;
      const { data } = await supabase.from('social_likes').select('id').eq('post_id', reel.id).eq('user_id', userId).maybeSingle();
      return !!data;
    },
    enabled: !!userId && !isMock,
  });

  const { data: isSaved = reel.isSaved } = useQuery({
    queryKey: ['social-bookmark', reel.id, userId],
    queryFn: async () => {
      if (!userId) return false;
      const { data } = await supabase.from('social_bookmarks').select('id').eq('post_id', reel.id).eq('user_id', userId).maybeSingle();
      return !!data;
    },
    enabled: !!userId && !isMock,
  });

  const { data: profile } = useQuery({
    queryKey: ['social-post-profile', reel.user_id],
    queryFn: async () => {
      const { data } = await supabase.from('social_profiles').select('username, display_name, avatar_url, is_verified').eq('user_id', reel.user_id).maybeSingle();
      return data;
    },
    enabled: !isMock && !!reel.user_id,
  });

  const username = isMock ? reel.username : (profile?.username || 'user');
  const isVerified = isMock ? reel.isVerified : (profile?.is_verified || false);

  const toggleLike = useMutation({
    mutationFn: async () => {
      if (!userId) { toast.error("Please login"); return; }
      if (isLiked) {
        await supabase.from('social_likes').delete().eq('post_id', reel.id).eq('user_id', userId);
      } else {
        await supabase.from('social_likes').insert({ post_id: reel.id, user_id: userId });
      }
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['social-like', reel.id] }); },
  });

  const toggleSave = useMutation({
    mutationFn: async () => {
      if (!userId) { toast.error("Please login"); return; }
      if (isSaved) {
        await supabase.from('social_bookmarks').delete().eq('post_id', reel.id).eq('user_id', userId);
        toast.success("Removed from saved");
      } else {
        await supabase.from('social_bookmarks').insert({ post_id: reel.id, user_id: userId });
        toast.success("Reel saved");
      }
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['social-bookmark', reel.id] }); },
  });

  const shareReel = async () => {
    const url = `${window.location.origin}/app/social/post/${reel.id}`;
    if (navigator.share) {
      try { await navigator.share({ title: 'Check this reel on P4U Social', url }); } catch {}
    } else {
      await navigator.clipboard.writeText(url);
      toast.success("Link copied!");
    }
  };

  return (
    <div className="relative h-full w-full snap-start snap-always flex items-center justify-center" style={{ scrollSnapAlign: 'start' }}>
      <img src={reel.videoUrl} alt="" className="absolute inset-0 w-full h-full object-cover" onDoubleClick={() => toggleLike.mutate()} />
      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-black/20" />

      {/* Right action bar */}
      <div className="absolute right-3 bottom-28 flex flex-col items-center gap-5 z-10">
        <button onClick={() => toggleLike.mutate()} className="flex flex-col items-center gap-1">
          <AnimatePresence mode="wait">
            {isLiked ? (
              <motion.div key="liked" initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", stiffness: 500, damping: 15 }}><Heart className="h-7 w-7 fill-red-500 text-red-500" /></motion.div>
            ) : (
              <motion.div key="unliked"><Heart className="h-7 w-7 text-white" /></motion.div>
            )}
          </AnimatePresence>
          <span className="text-white text-xs font-semibold">{formatCount(reel.likes)}</span>
        </button>
        <button onClick={() => navigate(`/app/social/comments/${reel.id}`)} className="flex flex-col items-center gap-1">
          <MessageCircle className="h-7 w-7 text-white" />
          <span className="text-white text-xs font-semibold">{formatCount(reel.comments)}</span>
        </button>
        <button onClick={shareReel} className="flex flex-col items-center gap-1">
          <Send className="h-7 w-7 text-white" />
          <span className="text-white text-xs font-semibold">{formatCount(reel.shares)}</span>
        </button>
        <button onClick={() => toggleSave.mutate()} className="flex flex-col items-center gap-1">
          <Bookmark className={`h-7 w-7 text-white ${isSaved ? 'fill-white' : ''}`} />
        </button>
        <button onClick={() => toast.info("More options")} className="flex flex-col items-center gap-1">
          <MoreHorizontal className="h-7 w-7 text-white" />
        </button>
        <div className="h-9 w-9 rounded-lg border-2 border-white/40 overflow-hidden animate-spin" style={{ animationDuration: '3s' }}>
          <div className="w-full h-full bg-muted flex items-center justify-center"><Music2 className="h-4 w-4 text-white" /></div>
        </div>
      </div>

      {/* Bottom info */}
      <div className="absolute bottom-20 left-3 right-16 z-10">
        <div className="flex items-center gap-2 mb-2">
          <Link to={`/app/social/@${username}`}>
            <Avatar className="h-8 w-8 border border-white"><AvatarFallback className="bg-primary text-primary-foreground text-xs">{username.charAt(0).toUpperCase()}</AvatarFallback></Avatar>
          </Link>
          <Link to={`/app/social/@${username}`} className="text-white text-sm font-semibold">{username}</Link>
          {isVerified && <svg className="h-3.5 w-3.5 text-primary fill-current" viewBox="0 0 24 24"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" /></svg>}
          <button className="border border-white/60 text-white text-xs font-semibold px-3 py-0.5 rounded-lg ml-1">Follow</button>
        </div>
        <p className="text-white text-sm leading-snug line-clamp-2">{reel.caption}</p>
        <div className="flex items-center gap-1.5 mt-2">
          <Music2 className="h-3.5 w-3.5 text-white/80" />
          <p className="text-white/80 text-xs truncate">{reel.audio}</p>
        </div>
      </div>
    </div>
  );
}
