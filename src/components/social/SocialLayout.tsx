import { Link, useLocation, useNavigate } from "react-router-dom";
import { Home, Search, Film, MessageCircle, Bell, Plus, Settings, User, Compass, ArrowLeft, ChevronLeft } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useState } from "react";
import { X } from "lucide-react";

const MOCK_SEARCH_RECENT = [
  { id: "1", username: "ted", name: "TED Talks", isVerified: true },
  { id: "2", username: "voxdotcom", name: "Vox", isVerified: true },
  { id: "3", username: "mkbhd", name: "Marques Brownlee", note: "Following" },
];

const MOCK_SUGGESTIONS = [
  { id: "s1", username: "imkirtichadha", note: "Follows you" },
  { id: "s2", username: "designbyshree", note: "Suggested for you" },
  { id: "s3", username: "travel_india", note: "Follows you" },
];

interface SocialLayoutProps {
  children: React.ReactNode;
  hideRightSidebar?: boolean;
  hideSidebar?: boolean;
}

const NAV_ITEMS = [
  { label: "Home", icon: Home, path: "/app/social" },
  { label: "Explore", icon: Compass, path: "/app/social/explore" },
  { label: "Reels", icon: Film, path: "/app/social/reels" },
  { label: "Messages", icon: MessageCircle, path: "/app/social/messages" },
  { label: "Notification", icon: Bell, path: "/app/social/notifications" },
  { label: "Create", icon: Plus, path: "/app/social/create" },
  { label: "Settings", icon: Settings, path: "/app/social/settings" },
  { label: "Profile", icon: User, path: "/app/social/profile" },
];

export default function SocialLayout({ children, hideRightSidebar, hideSidebar }: SocialLayoutProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const { customerUser } = useAuth();
  const [searchQuery, setSearchQuery] = useState("");

  const isActive = (path: string) => {
    if (path === "/app/social") return location.pathname === "/app/social";
    return location.pathname.startsWith(path);
  };

  // Detect if we're on a sub-page (not a main nav item)
  const isSubPage = !NAV_ITEMS.some(item => 
    item.path === location.pathname || 
    (item.path === "/app/social" && location.pathname === "/app/social")
  );

  return (
    <div className="min-h-screen bg-background">
      {/* Desktop top bar - back to super app */}
      <div className="hidden md:block sticky top-0 z-50 bg-card border-b border-border/30">
        <div className="max-w-[1200px] mx-auto flex items-center justify-between px-4 py-2">
          <div className="flex items-center gap-3">
            <Link to="/app" className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
              <ChevronLeft className="h-4 w-4" />
              <span>Back to P4U</span>
            </Link>
            <span className="text-border">|</span>
            <span className="text-xl font-bold tracking-tight bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
              Socio
            </span>
          </div>
          <div className="flex items-center gap-3">
            {customerUser ? (
              <Link to="/app/social/profile" className="flex items-center gap-2 text-sm">
                <div className="h-7 w-7 rounded-full bg-primary/20 flex items-center justify-center">
                  <span className="text-xs font-bold text-primary">{customerUser.name?.charAt(0) || 'U'}</span>
                </div>
                <span className="font-medium">{customerUser.name || 'Profile'}</span>
              </Link>
            ) : (
              <Link to="/app/login" className="text-sm font-semibold text-primary">Login</Link>
            )}
          </div>
        </div>
      </div>

      {/* Desktop layout: sidebar + content + right sidebar */}
      <div className="hidden md:flex max-w-[1200px] mx-auto">
        {/* Left Sidebar */}
        {!hideSidebar && (
          <aside className="w-[220px] shrink-0 sticky top-[49px] self-start py-4 pl-4 pr-2 h-[calc(100vh-49px)] overflow-y-auto">
            <nav className="bg-card rounded-xl border border-border/30 py-2">
              {NAV_ITEMS.map((item) => {
                const active = isActive(item.path);
                return (
                  <Link
                    key={item.label}
                    to={item.path}
                    className={`flex items-center gap-3 px-4 py-2.5 text-sm font-medium transition-colors rounded-lg mx-2 ${
                      active
                        ? "bg-primary text-primary-foreground"
                        : "text-foreground hover:bg-muted"
                    }`}
                  >
                    {item.label === "Profile" ? (
                      <div className={`h-5 w-5 rounded-full flex items-center justify-center text-[10px] font-bold ${active ? 'bg-primary-foreground text-primary' : 'bg-muted border border-border'}`}>
                        {customerUser?.name?.charAt(0) || 'U'}
                      </div>
                    ) : (
                      <item.icon className="h-5 w-5" />
                    )}
                    {item.label}
                  </Link>
                );
              })}
            </nav>

            {/* Ad Banner */}
            <div className="mt-4 rounded-xl overflow-hidden bg-gradient-to-br from-primary to-primary/80 text-primary-foreground p-4">
              <p className="text-sm font-bold mb-1">Welcome to ClassiGrids</p>
              <p className="text-[10px] opacity-80">Buy And Sell Everything From Used Cars To Mobile Phones And Computers, Or Jobs And More.</p>
              <div className="text-3xl font-black mt-3">50%</div>
              <div className="text-sm font-bold">OFF</div>
              <button className="mt-3 bg-card text-foreground text-xs font-semibold px-4 py-1.5 rounded-full" onClick={() => navigate("/app/classifieds")}>
                Buy Now!
              </button>
            </div>
          </aside>
        )}

        {/* Main Content */}
        <main className={`flex-1 min-w-0 ${!hideSidebar ? 'max-w-[620px]' : ''}`}>
          {children}
        </main>

        {/* Right Sidebar */}
        {!hideRightSidebar && !hideSidebar && (
          <aside className="w-[280px] shrink-0 sticky top-[49px] self-start py-4 pr-4 pl-2 space-y-4 h-[calc(100vh-49px)] overflow-y-auto">
            {/* Search */}
            <div className="bg-card rounded-xl border border-border/30 p-4">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-bold">Search</span>
                <button className="text-muted-foreground"><X className="h-4 w-4" /></button>
              </div>
              <div className="relative mb-3">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search"
                  className="pl-9 h-9 bg-muted/50 border-0 text-sm"
                />
              </div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-muted-foreground">Recent</span>
                <button className="text-xs font-semibold text-primary">Clear all</button>
              </div>
              <div className="space-y-1">
                {MOCK_SEARCH_RECENT.map((item, i) => (
                  <div key={`${item.id}-${i}`} className="flex items-center gap-2.5 py-1.5">
                    <Avatar className="h-10 w-10">
                      <AvatarFallback className="bg-muted text-xs font-bold">{item.username.charAt(0).toUpperCase()}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1">
                        <span className="text-xs font-semibold truncate">{item.username}</span>
                        {item.isVerified && (
                          <svg className="h-3 w-3 text-primary fill-current shrink-0" viewBox="0 0 24 24"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" /></svg>
                        )}
                      </div>
                      <p className="text-[10px] text-muted-foreground truncate">{item.name}{item.note ? ` • ${item.note}` : ''}</p>
                    </div>
                    <button><X className="h-3.5 w-3.5 text-muted-foreground" /></button>
                  </div>
                ))}
              </div>
            </div>

            {/* Suggestions */}
            <div className="bg-card rounded-xl border border-border/30 p-4">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-semibold text-muted-foreground">Suggestions for you</span>
                <button className="text-xs font-semibold text-primary">See All</button>
              </div>
              <div className="space-y-1">
                {MOCK_SUGGESTIONS.map((item, i) => (
                  <div key={`${item.id}-${i}`} className="flex items-center gap-2.5 py-1.5">
                    <Avatar className="h-9 w-9">
                      <AvatarFallback className="bg-muted text-xs font-bold">{item.username.charAt(0).toUpperCase()}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <span className="text-xs font-semibold truncate block">{item.username}</span>
                      <span className="text-[10px] text-muted-foreground">{item.note}</span>
                    </div>
                    <button className="text-xs font-semibold text-primary">Follow</button>
                  </div>
                ))}
              </div>
            </div>

            {/* Right side ad */}
            <div className="rounded-xl overflow-hidden bg-gradient-to-br from-primary to-primary/80 text-primary-foreground p-4">
              <p className="text-sm font-bold mb-1">Welcome to ClassiGrids</p>
              <p className="text-[10px] opacity-80">Buy And Sell Everything From Used Cars To Mobile Phones And Computers, Or Jobs And More.</p>
              <div className="text-3xl font-black mt-3">50%</div>
              <div className="text-sm font-bold">OFF</div>
            </div>
          </aside>
        )}
      </div>

      {/* Mobile: just render children directly */}
      <div className="md:hidden">
        {children}
      </div>

      {/* Mobile bottom nav */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 bg-card border-t border-border/30 md:hidden safe-area-bottom">
        <div className="flex items-center justify-around px-2 py-2.5 max-w-xl mx-auto">
          <Link to="/app/social" className="flex flex-col items-center gap-0.5">
            <Home className={`h-6 w-6 ${isActive("/app/social") && location.pathname === "/app/social" ? 'fill-current' : ''}`} />
          </Link>
          <Link to="/app/social/explore" className="flex flex-col items-center gap-0.5">
            <Search className={`h-6 w-6 ${isActive("/app/social/explore") ? 'stroke-[2.5]' : ''}`} />
          </Link>
          <Link to="/app/social/create" className="flex flex-col items-center gap-0.5">
            <div className="h-7 w-7 rounded-lg border-2 border-foreground flex items-center justify-center">
              <Plus className="h-4 w-4" />
            </div>
          </Link>
          <Link to="/app/social/reels" className="flex flex-col items-center gap-0.5">
            <Film className={`h-6 w-6 ${isActive("/app/social/reels") ? 'fill-current' : ''}`} />
          </Link>
          <Link to="/app/social/profile" className="flex flex-col items-center gap-0.5">
            <div className={`h-7 w-7 rounded-full bg-muted flex items-center justify-center overflow-hidden ${isActive("/app/social/profile") ? 'border-2 border-foreground' : 'border border-border'}`}>
              <span className="text-xs font-bold">{customerUser?.name?.charAt(0) || 'U'}</span>
            </div>
          </Link>
        </div>
      </nav>
    </div>
  );
}
