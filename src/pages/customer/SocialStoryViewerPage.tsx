import { useState, useEffect, useCallback } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { X, Heart, Send, ChevronLeft, ChevronRight, MoreHorizontal, Eye } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

const MOCK_STORY_USERS = [
  {
    id: "u1", username: "vijay_kumar", displayName: "Vijay Kumar",
    stories: [
      { id: "s1", type: "photo", url: "https://images.unsplash.com/photo-1506744038136-46273834b3fb?w=600&h=1000&fit=crop", caption: "Beautiful morning 🌅", timeAgo: "2h" },
      { id: "s2", type: "photo", url: "https://images.unsplash.com/photo-1469474968028-56623f02e42e?w=600&h=1000&fit=crop", caption: "Nature vibes", timeAgo: "1h" },
    ]
  },
  {
    id: "u2", username: "priya_designs", displayName: "Priya Designs",
    stories: [
      { id: "s3", type: "photo", url: "https://images.unsplash.com/photo-1513364776144-60967b0f800f?w=600&h=1000&fit=crop", caption: "New artwork 🎨", timeAgo: "3h" },
    ]
  },
  {
    id: "u3", username: "rahul_food", displayName: "Rahul Food",
    stories: [
      { id: "s4", type: "photo", url: "https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=600&h=1000&fit=crop", caption: "Today's special 🍕", timeAgo: "4h" },
      { id: "s5", type: "photo", url: "https://images.unsplash.com/photo-1567620905732-2d1ec7ab7445?w=600&h=1000&fit=crop", caption: "Cooking session", timeAgo: "3h" },
      { id: "s6", type: "photo", url: "https://images.unsplash.com/photo-1540189549336-e6e99c3679fe?w=600&h=1000&fit=crop", caption: "Dessert time 🍰", timeAgo: "2h" },
    ]
  },
];

export default function SocialStoryViewerPage() {
  const navigate = useNavigate();
  const { userId } = useParams();
  const [currentUserIdx, setCurrentUserIdx] = useState(0);
  const [currentStoryIdx, setCurrentStoryIdx] = useState(0);
  const [progress, setProgress] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [replyText, setReplyText] = useState("");

  const user = MOCK_STORY_USERS[currentUserIdx];
  const story = user?.stories[currentStoryIdx];
  const DURATION = 5000;

  useEffect(() => {
    if (isPaused || !story) return;
    const interval = setInterval(() => {
      setProgress(p => {
        if (p >= 100) {
          goNext();
          return 0;
        }
        return p + (100 / (DURATION / 50));
      });
    }, 50);
    return () => clearInterval(interval);
  }, [isPaused, currentStoryIdx, currentUserIdx]);

  const goNext = useCallback(() => {
    if (currentStoryIdx < user.stories.length - 1) {
      setCurrentStoryIdx(i => i + 1);
      setProgress(0);
    } else if (currentUserIdx < MOCK_STORY_USERS.length - 1) {
      setCurrentUserIdx(i => i + 1);
      setCurrentStoryIdx(0);
      setProgress(0);
    } else {
      navigate(-1);
    }
  }, [currentStoryIdx, currentUserIdx, user, navigate]);

  const goPrev = useCallback(() => {
    if (currentStoryIdx > 0) {
      setCurrentStoryIdx(i => i - 1);
      setProgress(0);
    } else if (currentUserIdx > 0) {
      setCurrentUserIdx(i => i - 1);
      setCurrentStoryIdx(MOCK_STORY_USERS[currentUserIdx - 1].stories.length - 1);
      setProgress(0);
    }
  }, [currentStoryIdx, currentUserIdx]);

  const handleReply = () => {
    if (replyText.trim()) {
      toast.success("Reply sent!");
      setReplyText("");
    }
  };

  if (!story) return null;

  return (
    <div className="fixed inset-0 z-[100] bg-black flex items-center justify-center">
      <div className="relative w-full max-w-md h-full">
        {/* Progress bars */}
        <div className="absolute top-2 left-2 right-2 z-20 flex gap-1">
          {user.stories.map((s, i) => (
            <div key={s.id} className="flex-1 h-0.5 bg-white/30 rounded-full overflow-hidden">
              <div
                className="h-full bg-white rounded-full transition-all duration-75"
                style={{ width: i < currentStoryIdx ? '100%' : i === currentStoryIdx ? `${progress}%` : '0%' }}
              />
            </div>
          ))}
        </div>

        {/* Header */}
        <div className="absolute top-6 left-3 right-3 z-20 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Avatar className="h-8 w-8 border-2 border-white">
              <AvatarFallback className="bg-primary text-primary-foreground text-xs">
                {user.username.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <span className="text-white text-sm font-semibold">{user.username}</span>
            <span className="text-white/60 text-xs">{story.timeAgo}</span>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => toast.info("More options")} className="p-1">
              <MoreHorizontal className="h-5 w-5 text-white" />
            </button>
            <button onClick={() => navigate(-1)} className="p-1">
              <X className="h-6 w-6 text-white" />
            </button>
          </div>
        </div>

        {/* Story image */}
        <img
          src={story.url}
          alt=""
          className="w-full h-full object-cover"
          onMouseDown={() => setIsPaused(true)}
          onMouseUp={() => setIsPaused(false)}
          onTouchStart={() => setIsPaused(true)}
          onTouchEnd={() => setIsPaused(false)}
        />

        {/* Tap zones */}
        <button
          className="absolute left-0 top-0 w-1/3 h-full z-10"
          onClick={goPrev}
        />
        <button
          className="absolute right-0 top-0 w-1/3 h-full z-10"
          onClick={goNext}
        />

        {/* Caption */}
        {story.caption && (
          <div className="absolute bottom-20 left-4 right-4 z-20">
            <p className="text-white text-sm drop-shadow-lg">{story.caption}</p>
          </div>
        )}

        {/* Reply bar */}
        <div className="absolute bottom-4 left-3 right-3 z-20 flex items-center gap-2">
          <Input
            value={replyText}
            onChange={(e) => setReplyText(e.target.value)}
            placeholder="Reply to story..."
            className="flex-1 bg-white/10 border-white/20 text-white placeholder:text-white/50 text-sm h-9 rounded-full"
            onKeyDown={(e) => e.key === 'Enter' && handleReply()}
            onFocus={() => setIsPaused(true)}
            onBlur={() => setIsPaused(false)}
          />
          <button onClick={() => toast.success("❤️")}>
            <Heart className="h-6 w-6 text-white" />
          </button>
          <button onClick={handleReply}>
            <Send className="h-6 w-6 text-white" />
          </button>
        </div>

        {/* Viewer count */}
        <div className="absolute bottom-20 right-4 z-20">
          <div className="flex items-center gap-1 text-white/60 text-xs">
            <Eye className="h-3.5 w-3.5" />
            <span>{Math.floor(Math.random() * 200) + 50}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
