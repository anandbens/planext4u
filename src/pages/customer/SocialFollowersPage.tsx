import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Search, X } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import SocialLayout from "@/components/social/SocialLayout";

const MOCK_USERS = Array.from({ length: 20 }, (_, i) => ({
  id: `u${i}`,
  username: `user_${['vijay','priya','rahul','sneha','karthik','deepak','anita','sanjay','meera','arjun'][i % 10]}_${i}`,
  displayName: ['Vijay Kumar','Priya Designs','Rahul Food','Sneha Art','Karthik Tech','Deepak Fit','Anita Travel','Sanjay Music','Meera Dance','Arjun Photo'][i % 10],
  isVerified: i % 4 === 0,
  isFollowing: i % 3 === 0,
  mutualFollowers: i % 2 === 0 ? `Followed by user_${i + 1} + ${i + 2} others` : undefined,
}));

export default function SocialFollowersPage() {
  const navigate = useNavigate();
  const { username, tab } = useParams();
  const [activeTab, setActiveTab] = useState<'followers' | 'following'>(tab === 'following' ? 'following' : 'followers');
  const [search, setSearch] = useState("");
  const [users, setUsers] = useState(MOCK_USERS);

  const filtered = users.filter(u => u.username.toLowerCase().includes(search.toLowerCase()) || u.displayName.toLowerCase().includes(search.toLowerCase()));

  const toggleFollow = (userId: string) => {
    setUsers(prev => prev.map(u => {
      if (u.id === userId) {
        toast.success(u.isFollowing ? "Unfollowed" : "Following");
        return { ...u, isFollowing: !u.isFollowing };
      }
      return u;
    }));
  };

  const content = (
    <div className="pb-20 md:pb-8">
      <header className="sticky top-0 z-40 bg-card border-b border-border/30">
        <div className="flex items-center gap-3 px-4 py-3">
          <button onClick={() => navigate(-1)}><ArrowLeft className="h-5 w-5" /></button>
          <h1 className="text-lg font-bold flex-1">{username || "Profile"}</h1>
        </div>
        <div className="flex border-b border-border/20">
          <button onClick={() => setActiveTab('followers')} className={`flex-1 py-2.5 text-sm font-semibold text-center border-b-2 transition-colors ${activeTab === 'followers' ? 'border-foreground' : 'border-transparent text-muted-foreground'}`}>
            Followers
          </button>
          <button onClick={() => setActiveTab('following')} className={`flex-1 py-2.5 text-sm font-semibold text-center border-b-2 transition-colors ${activeTab === 'following' ? 'border-foreground' : 'border-transparent text-muted-foreground'}`}>
            Following
          </button>
        </div>
      </header>

      <div className="px-4 py-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search" className="pl-9 h-9 bg-muted/50 border-0" />
          {search && <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2"><X className="h-4 w-4 text-muted-foreground" /></button>}
        </div>
      </div>

      <div className="divide-y divide-border/10">
        {filtered.map(user => (
          <div key={user.id} className="flex items-center gap-3 px-4 py-2.5">
            <Avatar className="h-12 w-12 cursor-pointer" onClick={() => navigate(`/app/social/@${user.username}`)}>
              <AvatarFallback className="bg-muted text-sm font-bold">{user.username.charAt(0).toUpperCase()}</AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1">
                <span className="text-sm font-semibold truncate">{user.username}</span>
                {user.isVerified && <svg className="h-3.5 w-3.5 text-primary fill-current shrink-0" viewBox="0 0 24 24"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" /></svg>}
              </div>
              <p className="text-xs text-muted-foreground truncate">{user.displayName}</p>
              {user.mutualFollowers && <p className="text-[10px] text-muted-foreground truncate">{user.mutualFollowers}</p>}
            </div>
            <Button
              size="sm"
              variant={user.isFollowing ? "secondary" : "default"}
              className="h-8 px-4 text-xs font-semibold rounded-lg"
              onClick={() => toggleFollow(user.id)}
            >
              {user.isFollowing ? "Following" : "Follow"}
            </Button>
            {activeTab === 'followers' && (
              <button onClick={() => toast.info("Remove follower")} className="p-1"><X className="h-4 w-4 text-muted-foreground" /></button>
            )}
          </div>
        ))}
      </div>
    </div>
  );

  return <SocialLayout hideSidebar>{content}</SocialLayout>;
}
