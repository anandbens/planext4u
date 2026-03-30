import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Search, X, ArrowLeft, Plus, Film } from "lucide-react";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth";

const CATEGORIES = ["For You", "Trending", "Fashion", "Food", "Travel", "Tech", "Fitness", "Art", "Local", "Sports"];

const MOCK_SEARCH_RECENT = [
  { id: "1", username: "ted", name: "TED Talks", isVerified: true },
  { id: "2", username: "voxdotcom", name: "Vox", isVerified: true },
  { id: "3", username: "mkbhd", name: "Marques Brownlee", note: "Following" },
];

const EXPLORE_GRID = Array.from({ length: 24 }, (_, i) => ({
  id: `e-${i}`,
  isLarge: i === 0 || i === 5 || i === 10 || i === 15,
  isReel: i % 3 === 2,
  color: ['bg-rose-200', 'bg-sky-200', 'bg-amber-200', 'bg-emerald-200', 'bg-violet-200'][i % 5],
}));

export default function SocialExplorePage() {
  const navigate = useNavigate();
  const { customerUser } = useAuth();
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [activeCategory, setActiveCategory] = useState("For You");

  if (isSearchFocused) {
    return (
      <div className="min-h-screen bg-background">
        <header className="sticky top-0 z-40 bg-card border-b border-border/30">
          <div className="flex items-center gap-3 px-4 py-3">
            <button onClick={() => setIsSearchFocused(false)}>
              <ArrowLeft className="h-5 w-5" />
            </button>
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                autoFocus
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search"
                className="pl-9 pr-8 h-9 bg-muted/50 border-0"
              />
              {searchQuery && (
                <button onClick={() => setSearchQuery("")} className="absolute right-3 top-1/2 -translate-y-1/2">
                  <X className="h-4 w-4 text-muted-foreground" />
                </button>
              )}
            </div>
          </div>
        </header>

        <div className="px-4 py-3">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-semibold">Recent</span>
            <button className="text-sm text-primary font-semibold">Clear all</button>
          </div>
          {MOCK_SEARCH_RECENT.map((item) => (
            <div key={item.id} className="flex items-center gap-3 py-2.5">
              <div className="h-11 w-11 rounded-full bg-muted flex items-center justify-center">
                <span className="text-sm font-bold">{item.username.charAt(0).toUpperCase()}</span>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1">
                  <span className="text-sm font-semibold">{item.username}</span>
                  {item.isVerified && (
                    <svg className="h-3.5 w-3.5 text-primary fill-current" viewBox="0 0 24 24"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" /></svg>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">{item.name}{item.note ? ` • ${item.note}` : ''}</p>
              </div>
              <button><X className="h-4 w-4 text-muted-foreground" /></button>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Search Bar */}
      <header className="sticky top-0 z-40 bg-card border-b border-border/30">
        <div className="px-4 py-3">
          <div className="relative" onClick={() => setIsSearchFocused(true)}>
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input readOnly placeholder="Search" className="pl-9 h-9 bg-muted/50 border-0 cursor-pointer" />
          </div>
        </div>
        {/* Category tabs */}
        <div className="flex gap-2 px-4 pb-3 overflow-x-auto scrollbar-hide">
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`shrink-0 px-4 py-1.5 rounded-lg text-xs font-semibold transition-colors ${activeCategory === cat ? 'bg-foreground text-background' : 'bg-muted text-foreground'}`}
            >
              {cat}
            </button>
          ))}
        </div>
      </header>

      {/* Explore Grid - Instagram-style mixed sizes */}
      <div className="grid grid-cols-3 gap-[2px]">
        {EXPLORE_GRID.map((item, idx) => {
          const isLargeCell = idx % 10 === 4; // Every 10th group has a large cell
          return (
            <button
              key={item.id}
              className={`relative overflow-hidden ${isLargeCell ? 'col-span-1 row-span-2' : ''} ${item.color} aspect-square`}
              onClick={() => toast.info("Content detail coming soon")}
            >
              {item.isReel && (
                <div className="absolute top-2 right-2">
                  <Film className="h-4 w-4 text-white drop-shadow" />
                </div>
              )}
            </button>
          );
        })}
      </div>

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 bg-card border-t border-border/30 md:hidden safe-area-bottom">
        <div className="flex items-center justify-around px-2 py-2.5 max-w-xl mx-auto">
          <Link to="/app/social" className="flex flex-col items-center gap-0.5">
            <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/></svg>
          </Link>
          <Link to="/app/social/explore" className="flex flex-col items-center gap-0.5">
            <svg className="h-6 w-6 fill-current" viewBox="0 0 24 24"><circle cx="11" cy="11" r="8" fill="none" stroke="currentColor" strokeWidth="2.5"/><path d="m21 21-4.3-4.3" fill="none" stroke="currentColor" strokeWidth="2.5"/></svg>
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
            <div className="h-7 w-7 rounded-full bg-muted border border-foreground/30 flex items-center justify-center overflow-hidden">
              <span className="text-xs font-bold">{customerUser?.name?.charAt(0) || 'U'}</span>
            </div>
          </Link>
        </div>
      </nav>
    </div>
  );
}
