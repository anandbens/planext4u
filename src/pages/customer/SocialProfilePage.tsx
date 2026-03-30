import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Settings, Plus, Grid3X3, Film, Bookmark, Users, MoreHorizontal, ChevronDown, Share2, UserPlus, MessageCircle, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth";
import { toast } from "sonner";
import SocialLayout from "@/components/social/SocialLayout";

const MOCK_HIGHLIGHTS = [
  { id: "h1", name: "Add", isNew: true },
  { id: "h2", name: "Coimbatore" },
  { id: "h3", name: "Coimbatore" },
  { id: "h4", name: "Coimbatore" },
  { id: "h5", name: "Coimbatore" },
  { id: "h6", name: "Coimbatore" },
  { id: "h7", name: "Coimbat..." },
];

const MOCK_POSTS_GRID = Array.from({ length: 12 }, (_, i) => ({
  id: `grid-${i}`,
  thumbnail: `https://images.unsplash.com/photo-${1500000000000 + i * 50000}?w=300&h=300&fit=crop`,
  isVideo: i % 5 === 0,
  isCarousel: i % 4 === 0,
}));

export default function SocialProfilePage() {
  const navigate = useNavigate();
  const { username } = useParams();
  const { customerUser } = useAuth();
  const [activeTab, setActiveTab] = useState("posts");
  const [isFollowing, setIsFollowing] = useState(false);

  const isOwnProfile = !username || username === customerUser?.name;
  const profileData = {
    username: isOwnProfile ? customerUser?.name || "your_username" : username?.replace('@', '') || "user",
    displayName: isOwnProfile ? customerUser?.name || "Your Name" : "Vijay Sivakumar",
    bio: isOwnProfile ? "Welcome to my profile ✨\nPlanext4u.com" : "Marques Brownlee\nI promise I won't overdo the filters.\nPlanext4u.com",
    posts: 1861,
    followers: "4M",
    following: 454,
    isVerified: true,
    accountType: "creator" as const,
    followedBy: ["Youtube", "Flipkart", "Zomato", "Blinkit", "Zepto"],
  };

  const content = (
    <div className="pb-20 md:pb-8">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-card border-b border-border/30 md:hidden">
        <div className="flex items-center justify-between px-4 py-3 max-w-xl mx-auto">
          <div className="flex items-center gap-2">
            {!isOwnProfile && (
              <button onClick={() => navigate(-1)}><ArrowLeft className="h-6 w-6" /></button>
            )}
            <div className="flex items-center gap-1">
              {isOwnProfile && <svg className="h-4 w-4 text-muted-foreground" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>}
              <span className="text-lg font-bold">{profileData.username}</span>
              {profileData.isVerified && (
                <svg className="h-4 w-4 text-primary fill-current" viewBox="0 0 24 24"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" /></svg>
              )}
            </div>
          </div>
          <div className="flex items-center gap-3">
            {isOwnProfile && (
              <>
                <button onClick={() => toast.info("Notifications")}><Bell className="h-6 w-6" /></button>
                <Link to="/app/social/create"><Plus className="h-6 w-6" /></Link>
                <button onClick={() => toast.info("Settings")}><MoreHorizontal className="h-6 w-6" /></button>
              </>
            )}
          </div>
        </div>
      </header>

      <div className="max-w-xl mx-auto">
        {/* Profile Info */}
        <div className="px-4 pt-4">
          <div className="flex items-start gap-5">
            {/* Avatar */}
            <div className="relative">
              <div className="h-20 w-20 rounded-full bg-accent flex items-center justify-center border-2 border-border">
                <span className="text-2xl font-bold text-primary">{profileData.username.charAt(0).toUpperCase()}</span>
              </div>
              {isOwnProfile && (
                <button className="absolute bottom-0 right-0 h-6 w-6 bg-primary rounded-full flex items-center justify-center border-2 border-card">
                  <Plus className="h-3 w-3 text-primary-foreground" />
                </button>
              )}
            </div>

            {/* Stats */}
            <div className="flex-1 flex justify-around pt-2">
              <div className="text-center">
                <p className="text-lg font-bold">{profileData.posts.toLocaleString()}</p>
                <p className="text-xs text-muted-foreground">Posts</p>
              </div>
              <button className="text-center" onClick={() => toast.info("Followers list")}>
                <p className="text-lg font-bold">{profileData.followers}</p>
                <p className="text-xs text-muted-foreground">Followers</p>
              </button>
              <button className="text-center" onClick={() => toast.info("Following list")}>
                <p className="text-lg font-bold">{profileData.following}</p>
                <p className="text-xs text-muted-foreground">Following</p>
              </button>
            </div>
          </div>

          {/* Bio */}
          <div className="mt-3">
            <p className="text-sm font-semibold">{profileData.displayName}</p>
            <p className="text-sm whitespace-pre-line">{profileData.bio}</p>
          </div>

          {/* Followed by */}
          {profileData.followedBy && (
            <div className="flex items-center gap-2 mt-2">
              <div className="flex -space-x-2">
                {profileData.followedBy.slice(0, 3).map((_, i) => (
                  <div key={i} className="h-5 w-5 rounded-full bg-muted border border-card flex items-center justify-center">
                    <span className="text-[8px] font-bold">{profileData.followedBy[i].charAt(0)}</span>
                  </div>
                ))}
              </div>
              <p className="text-xs text-muted-foreground">
                Followed by <span className="font-semibold text-foreground">{profileData.followedBy.slice(0, 3).join(', ')}</span>, and <span className="font-semibold text-foreground">{44} others</span>
              </p>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-2 mt-4">
            {isOwnProfile ? (
              <>
                <Button variant="secondary" className="flex-1 h-9 text-sm font-semibold" onClick={() => toast.info("Edit profile")}>
                  Edit Profile
                </Button>
                <Button variant="secondary" className="flex-1 h-9 text-sm font-semibold" onClick={() => toast.info("Share profile")}>
                  Share Profile
                </Button>
                <Button variant="secondary" className="h-9 w-9 p-0" onClick={() => toast.info("Discover people")}>
                  <UserPlus className="h-4 w-4" />
                </Button>
              </>
            ) : (
              <>
                <Button
                  className={`flex-1 h-9 text-sm font-semibold ${isFollowing ? '' : 'bg-primary text-primary-foreground'}`}
                  variant={isFollowing ? "secondary" : "default"}
                  onClick={() => { setIsFollowing(!isFollowing); toast.success(isFollowing ? "Unfollowed" : "Following"); }}
                >
                  {isFollowing ? (
                    <span className="flex items-center gap-1">Following <ChevronDown className="h-3 w-3" /></span>
                  ) : "Follow"}
                </Button>
                <Button variant="secondary" className="flex-1 h-9 text-sm font-semibold">
                  Message
                </Button>
                <Button variant="secondary" className="h-9 w-9 p-0">
                  <UserPlus className="h-4 w-4" />
                </Button>
              </>
            )}
          </div>
        </div>

        {/* Story Highlights */}
        <div className="flex gap-4 px-4 py-4 overflow-x-auto scrollbar-hide">
          {MOCK_HIGHLIGHTS.map((h) => (
            <button key={h.id} className="flex flex-col items-center gap-1.5 shrink-0">
              <div className="h-16 w-16 rounded-full border border-border/50 flex items-center justify-center bg-card">
                {h.isNew ? (
                  <Plus className="h-6 w-6 text-muted-foreground" />
                ) : (
                  <span className="text-lg">📍</span>
                )}
              </div>
              <span className="text-[10px] max-w-[64px] truncate">{h.name}</span>
            </button>
          ))}
        </div>

        {/* Grid Tabs */}
        <div className="border-t border-border/30">
          <div className="flex">
            <button
              onClick={() => setActiveTab("posts")}
              className={`flex-1 py-3 flex items-center justify-center border-b-2 transition-colors ${activeTab === 'posts' ? 'border-foreground' : 'border-transparent text-muted-foreground'}`}
            >
              <Grid3X3 className="h-5 w-5" />
            </button>
            <button
              onClick={() => setActiveTab("reels")}
              className={`flex-1 py-3 flex items-center justify-center border-b-2 transition-colors ${activeTab === 'reels' ? 'border-foreground' : 'border-transparent text-muted-foreground'}`}
            >
              <Film className="h-5 w-5" />
            </button>
            <button
              onClick={() => setActiveTab("tagged")}
              className={`flex-1 py-3 flex items-center justify-center border-b-2 transition-colors ${activeTab === 'tagged' ? 'border-foreground' : 'border-transparent text-muted-foreground'}`}
            >
              <Users className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Posts Grid */}
        {activeTab === 'posts' && (
          <div className="grid grid-cols-3 gap-[2px]">
            {MOCK_POSTS_GRID.map((post) => (
              <button key={post.id} className="aspect-square bg-muted relative overflow-hidden" onClick={() => toast.info("Post detail coming soon")}>
                <div className="w-full h-full bg-accent/30" />
                {post.isVideo && (
                  <div className="absolute top-2 right-2">
                    <Film className="h-4 w-4 text-white drop-shadow" />
                  </div>
                )}
                {post.isCarousel && (
                  <div className="absolute top-2 right-2">
                    <svg className="h-4 w-4 text-white drop-shadow" viewBox="0 0 24 24" fill="currentColor"><path d="M4 6H2v14c0 1.1.9 2 2 2h14v-2H4V6zm16-4H8c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z"/></svg>
                  </div>
                )}
              </button>
            ))}
          </div>
        )}

        {activeTab === 'reels' && (
          <div className="py-16 text-center">
            <Film className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
            <p className="text-sm font-semibold">No Reels Yet</p>
            <p className="text-xs text-muted-foreground mt-1">Create your first reel to share with followers</p>
          </div>
        )}

        {activeTab === 'tagged' && (
          <div className="py-16 text-center">
            <Users className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
            <p className="text-sm font-semibold">Photos of you</p>
            <p className="text-xs text-muted-foreground mt-1">When people tag you in photos, they'll appear here</p>
          </div>
        )}
      </div>
    </div>
  );

  return <SocialLayout hideRightSidebar>{content}</SocialLayout>;
}

function Bell(props: any) {
  return (
    <svg {...props} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
      <path d="M13.73 21a2 2 0 0 1-3.46 0" />
    </svg>
  );
}
