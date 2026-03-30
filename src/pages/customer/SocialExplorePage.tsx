import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Search, X, ArrowLeft, Film } from "lucide-react";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import SocialLayout from "@/components/social/SocialLayout";

const CATEGORIES = ["For You", "Trending", "Fashion", "Food", "Travel", "Tech", "Fitness", "Art", "Local", "Sports"];

const MOCK_SEARCH_RECENT = [
  { id: "1", username: "ted", name: "TED Talks", isVerified: true },
  { id: "2", username: "voxdotcom", name: "Vox", isVerified: true },
  { id: "3", username: "mkbhd", name: "Marques Brownlee", note: "Following" },
];

const EXPLORE_GRID = Array.from({ length: 24 }, (_, i) => ({
  id: `e-${i}`,
  isReel: i % 3 === 2,
  color: ['bg-rose-200', 'bg-sky-200', 'bg-amber-200', 'bg-emerald-200', 'bg-violet-200'][i % 5],
}));

export default function SocialExplorePage() {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [activeCategory, setActiveCategory] = useState("For You");

  if (isSearchFocused) {
    const searchView = (
      <div className="min-h-screen bg-background">
        <header className="sticky top-0 z-40 bg-card border-b border-border/30">
          <div className="flex items-center gap-3 px-4 py-3">
            <button onClick={() => setIsSearchFocused(false)}><ArrowLeft className="h-5 w-5" /></button>
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input autoFocus value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Search" className="pl-9 pr-8 h-9 bg-muted/50 border-0" />
              {searchQuery && <button onClick={() => setSearchQuery("")} className="absolute right-3 top-1/2 -translate-y-1/2"><X className="h-4 w-4 text-muted-foreground" /></button>}
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
                  {item.isVerified && <svg className="h-3.5 w-3.5 text-primary fill-current" viewBox="0 0 24 24"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" /></svg>}
                </div>
                <p className="text-xs text-muted-foreground">{item.name}{item.note ? ` • ${item.note}` : ''}</p>
              </div>
              <button><X className="h-4 w-4 text-muted-foreground" /></button>
            </div>
          ))}
        </div>
      </div>
    );
    return <SocialLayout hideSidebar>{searchView}</SocialLayout>;
  }

  const content = (
    <div className="pb-20 md:pb-8">
      <header className="sticky top-0 z-40 bg-card border-b border-border/30">
        <div className="px-4 py-3">
          <div className="relative" onClick={() => setIsSearchFocused(true)}>
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input readOnly placeholder="Search" className="pl-9 h-9 bg-muted/50 border-0 cursor-pointer" />
          </div>
        </div>
        <div className="flex gap-2 px-4 pb-3 overflow-x-auto scrollbar-hide">
          {CATEGORIES.map((cat) => (
            <button key={cat} onClick={() => setActiveCategory(cat)}
              className={`shrink-0 px-4 py-1.5 rounded-lg text-xs font-semibold transition-colors ${activeCategory === cat ? 'bg-foreground text-background' : 'bg-muted text-foreground'}`}>
              {cat}
            </button>
          ))}
        </div>
      </header>
      <div className="grid grid-cols-3 gap-[2px]">
        {EXPLORE_GRID.map((item) => (
          <button key={item.id} className={`relative overflow-hidden ${item.color} aspect-square`} onClick={() => toast.info("Content detail coming soon")}>
            {item.isReel && <div className="absolute top-2 right-2"><Film className="h-4 w-4 text-white drop-shadow" /></div>}
          </button>
        ))}
      </div>
    </div>
  );

  return <SocialLayout hideRightSidebar>{content}</SocialLayout>;
}
