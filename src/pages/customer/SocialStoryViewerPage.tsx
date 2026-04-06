import { useState, useEffect, useCallback } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { X, Heart, Send, MoreHorizontal, Eye } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth";

export default function SocialStoryViewerPage() {
  const navigate = useNavigate();
  const { userId } = useParams();
  const { customerUser } = useAuth();
  const [currentUserIdx, setCurrentUserIdx] = useState(0);
  const [currentStoryIdx, setCurrentStoryIdx] = useState(0);
  const [progress, setProgress] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [replyText, setReplyText] = useState("");

  // Fetch active stories from DB grouped by user
  const { data: storyGroups = [] } = useQuery({
    queryKey: ['social-stories-viewer'],
    queryFn: async () => {
      const { data } = await supabase
        .from('social_stories')
        .select('*, social_profiles!inner(username, display_name, avatar_url)')
        .gt('expires_at', new Date().toISOString())
        .order('created_at', { ascending: true });

      if (!data?.length) return [];

      // Group by user
      const grouped: Record<string, { user: any; stories: any[] }> = {};
      for (const s of data) {
        const uid = s.user_id;
        if (!grouped[uid]) {
          const profile = (s as any).social_profiles;
          grouped[uid] = {
            user: { id: uid, username: profile?.username || 'user', displayName: profile?.display_name || '', avatarUrl: profile?.avatar_url || '' },
            stories: [],
          };
        }
        grouped[uid].stories.push(s);
      }
      return Object.values(grouped);
    },
  });

  // Fallback mock if no DB stories
  const FALLBACK = [
    {
      user: { id: "u1", username: "vijay_kumar", displayName: "Vijay Kumar", avatarUrl: "" },
      stories: [
        { id: "s1", media_url: "https://images.unsplash.com/photo-1506744038136-46273834b3fb?w=600&h=1000&fit=crop", text_content: "Beautiful morning 🌅", created_at: new Date(Date.now() - 7200000).toISOString(), view_count: 120 },
        { id: "s2", media_url: "https://images.unsplash.com/photo-1469474968028-56623f02e42e?w=600&h=1000&fit=crop", text_content: "Nature vibes", created_at: new Date(Date.now() - 3600000).toISOString(), view_count: 85 },
      ],
    },
    {
      user: { id: "u2", username: "priya_designs", displayName: "Priya Designs", avatarUrl: "" },
      stories: [
        { id: "s3", media_url: "https://images.unsplash.com/photo-1513364776144-60967b0f800f?w=600&h=1000&fit=crop", text_content: "New artwork 🎨", created_at: new Date(Date.now() - 10800000).toISOString(), view_count: 200 },
      ],
    },
  ];

  const groups = storyGroups.length > 0 ? storyGroups : FALLBACK;

  // Find starting index based on userId param
  useEffect(() => {
    if (userId && groups.length > 0) {
      const idx = groups.findIndex((g: any) => g.user.id === userId);
      if (idx >= 0) setCurrentUserIdx(idx);
    }
  }, [userId, groups.length]);

  const group = groups[currentUserIdx] as any;
  const story = group?.stories?.[currentStoryIdx];
  const DURATION = 5000;

  const goNext = useCallback(() => {
    if (!group) return;
    if (currentStoryIdx < group.stories.length - 1) {
      setCurrentStoryIdx(i => i + 1);
      setProgress(0);
    } else if (currentUserIdx < groups.length - 1) {
      setCurrentUserIdx(i => i + 1);
      setCurrentStoryIdx(0);
      setProgress(0);
    } else {
      navigate(-1);
    }
  }, [currentStoryIdx, currentUserIdx, group, groups.length, navigate]);

  const goPrev = useCallback(() => {
    if (currentStoryIdx > 0) {
      setCurrentStoryIdx(i => i - 1);
      setProgress(0);
    } else if (currentUserIdx > 0) {
      const prevGroup = groups[currentUserIdx - 1] as any;
      setCurrentUserIdx(i => i - 1);
      setCurrentStoryIdx(prevGroup.stories.length - 1);
      setProgress(0);
    }
  }, [currentStoryIdx, currentUserIdx, groups]);

  useEffect(() => {
    if (isPaused || !story) return;
    const interval = setInterval(() => {
      setProgress(p => {
        if (p >= 100) { goNext(); return 0; }
        return p + (100 / (DURATION / 50));
      });
    }, 50);
    return () => clearInterval(interval);
  }, [isPaused, currentStoryIdx, currentUserIdx, goNext, story]);

  // Record view in DB
  useEffect(() => {
    if (!story?.id || !customerUser?.id || story.id.startsWith('s')) return;
    supabase.from('social_story_views').insert({ story_id: story.id, viewer_id: customerUser.id }).then(() => {});
  }, [story?.id, customerUser?.id]);

  const handleReply = () => {
    if (replyText.trim()) {
      toast.success("Reply sent!");
      setReplyText("");
    }
  };

  const timeAgo = (d: string) => {
    const mins = Math.floor((Date.now() - new Date(d).getTime()) / 60000);
    if (mins < 60) return `${mins}m`;
    return `${Math.floor(mins / 60)}h`;
  };

  if (!story || !group) return null;

  return (
    <div className="fixed inset-0 z-[100] bg-black flex items-center justify-center">
      <div className="relative w-full max-w-md h-full">
        {/* Progress bars */}
        <div className="absolute top-2 left-2 right-2 z-20 flex gap-1">
          {group.stories.map((s: any, i: number) => (
            <div key={s.id} className="flex-1 h-0.5 bg-white/30 rounded-full overflow-hidden">
              <div className="h-full bg-white rounded-full transition-all duration-75"
                style={{ width: i < currentStoryIdx ? '100%' : i === currentStoryIdx ? `${progress}%` : '0%' }} />
            </div>
          ))}
        </div>

        {/* Header */}
        <div className="absolute top-6 left-3 right-3 z-20 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Avatar className="h-8 w-8 border-2 border-white">
              <AvatarFallback className="bg-primary text-primary-foreground text-xs">
                {group.user.username?.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <span className="text-white text-sm font-semibold">{group.user.username}</span>
            <span className="text-white/60 text-xs">{timeAgo(story.created_at)}</span>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => toast.info("More options")} className="p-1"><MoreHorizontal className="h-5 w-5 text-white" /></button>
            <button onClick={() => navigate(-1)} className="p-1"><X className="h-6 w-6 text-white" /></button>
          </div>
        </div>

        {/* Story content */}
        {story.media_url ? (
          story.media_type === 'video' || story.media_url.match(/\.(mp4|webm|mov)/i) ? (
            <video src={story.media_url} className="w-full h-full object-cover" autoPlay muted playsInline loop
              onMouseDown={() => setIsPaused(true)} onMouseUp={() => setIsPaused(false)}
              onTouchStart={() => setIsPaused(true)} onTouchEnd={() => setIsPaused(false)} />
          ) : (
            <img src={story.media_url} alt="" className="w-full h-full object-cover"
              onMouseDown={() => setIsPaused(true)} onMouseUp={() => setIsPaused(false)}
              onTouchStart={() => setIsPaused(true)} onTouchEnd={() => setIsPaused(false)} />
          )
        ) : (
          <div className={`w-full h-full flex items-center justify-center ${story.background_color || 'bg-gradient-to-br from-purple-600 to-pink-500'}`}
            onMouseDown={() => setIsPaused(true)} onMouseUp={() => setIsPaused(false)}
            onTouchStart={() => setIsPaused(true)} onTouchEnd={() => setIsPaused(false)}>
            <p className="text-white text-2xl font-bold text-center px-8">{story.text_content}</p>
          </div>
        )}

        {/* Tap zones */}
        <button className="absolute left-0 top-0 w-1/3 h-full z-10" onClick={goPrev} />
        <button className="absolute right-0 top-0 w-1/3 h-full z-10" onClick={goNext} />

        {/* Caption */}
        {story.text_content && story.media_url && (
          <div className="absolute bottom-20 left-4 right-4 z-20">
            <p className="text-white text-sm drop-shadow-lg">{story.text_content}</p>
          </div>
        )}

        {/* Reply bar */}
        <div className="absolute bottom-4 left-3 right-3 z-20 flex items-center gap-2">
          <Input value={replyText} onChange={(e) => setReplyText(e.target.value)} placeholder="Reply to story..."
            className="flex-1 bg-white/10 border-white/20 text-white placeholder:text-white/50 text-sm h-9 rounded-full"
            onKeyDown={(e) => e.key === 'Enter' && handleReply()} onFocus={() => setIsPaused(true)} onBlur={() => setIsPaused(false)} />
          <button onClick={() => toast.success("❤️")}><Heart className="h-6 w-6 text-white" /></button>
          <button onClick={handleReply}><Send className="h-6 w-6 text-white" /></button>
        </div>

        {/* Viewer count */}
        <div className="absolute bottom-20 right-4 z-20">
          <div className="flex items-center gap-1 text-white/60 text-xs">
            <Eye className="h-3.5 w-3.5" />
            <span>{story.view_count || 0}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
