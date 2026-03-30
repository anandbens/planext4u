import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, TrendingUp, Users, Eye, Heart, MessageCircle, Bookmark, Share2, BarChart3 } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import SocialLayout from "@/components/social/SocialLayout";

const STATS = [
  { label: "Profile Visits", value: "2,847", change: "+12.5%", icon: Eye },
  { label: "Reach", value: "18.4K", change: "+8.2%", icon: Users },
  { label: "Impressions", value: "45.2K", change: "+15.1%", icon: TrendingUp },
  { label: "Engagement Rate", value: "4.8%", change: "+0.3%", icon: Heart },
];

const TOP_POSTS = [
  { id: "tp1", type: "Photo", reach: "5.2K", likes: 890, comments: 67, saves: 145 },
  { id: "tp2", type: "Reel", reach: "12.4K", likes: 2340, comments: 189, saves: 567 },
  { id: "tp3", type: "Carousel", reach: "3.8K", likes: 456, comments: 34, saves: 89 },
];

const AUDIENCE_CITIES = [
  { city: "Coimbatore", pct: 28 }, { city: "Chennai", pct: 22 }, { city: "Bangalore", pct: 15 },
  { city: "Mumbai", pct: 12 }, { city: "Delhi", pct: 8 },
];

const AUDIENCE_AGES = [
  { range: "18-24", pct: 32 }, { range: "25-34", pct: 38 }, { range: "35-44", pct: 18 },
  { range: "45-54", pct: 8 }, { range: "55+", pct: 4 },
];

export default function SocialCreatorDashboardPage() {
  const navigate = useNavigate();
  const [period, setPeriod] = useState<'7d' | '30d' | '90d'>('30d');

  const content = (
    <div className="pb-20 md:pb-8">
      <header className="sticky top-0 z-40 bg-card border-b border-border/30">
        <div className="flex items-center gap-3 px-4 py-3">
          <button onClick={() => navigate(-1)}><ArrowLeft className="h-5 w-5" /></button>
          <h1 className="text-lg font-bold flex-1">Professional Dashboard</h1>
          <BarChart3 className="h-5 w-5 text-muted-foreground" />
        </div>
      </header>

      <div className="p-4 space-y-6 max-w-xl mx-auto">
        {/* Period selector */}
        <div className="flex gap-2">
          {(['7d', '30d', '90d'] as const).map(p => (
            <button key={p} onClick={() => setPeriod(p)}
              className={`px-4 py-1.5 rounded-full text-xs font-semibold ${period === p ? 'bg-foreground text-background' : 'bg-muted'}`}>
              {p === '7d' ? '7 Days' : p === '30d' ? '30 Days' : '90 Days'}
            </button>
          ))}
        </div>

        {/* Overview Stats */}
        <div className="grid grid-cols-2 gap-3">
          {STATS.map(stat => (
            <div key={stat.label} className="bg-card rounded-xl border border-border/30 p-4">
              <div className="flex items-center gap-2 mb-2">
                <stat.icon className="h-4 w-4 text-muted-foreground" />
                <span className="text-xs text-muted-foreground">{stat.label}</span>
              </div>
              <p className="text-2xl font-bold">{stat.value}</p>
              <span className="text-xs font-semibold text-green-600">{stat.change}</span>
            </div>
          ))}
        </div>

        {/* Follower growth chart placeholder */}
        <div className="bg-card rounded-xl border border-border/30 p-4">
          <h3 className="text-sm font-semibold mb-3">Follower Growth</h3>
          <div className="h-40 bg-muted/30 rounded-lg flex items-center justify-center">
            <div className="flex items-end gap-1 h-28">
              {[30, 45, 38, 52, 48, 60, 55, 70, 65, 80, 75, 90, 85, 95].map((h, i) => (
                <div key={i} className="w-3 bg-primary/60 rounded-t" style={{ height: `${h}%` }} />
              ))}
            </div>
          </div>
        </div>

        {/* Top Posts */}
        <div className="bg-card rounded-xl border border-border/30 p-4">
          <h3 className="text-sm font-semibold mb-3">Top Content</h3>
          <div className="space-y-3">
            {TOP_POSTS.map((post, i) => (
              <div key={post.id} className="flex items-center gap-3">
                <div className="h-12 w-12 bg-muted rounded-lg flex items-center justify-center text-xs font-bold text-muted-foreground">#{i + 1}</div>
                <div className="flex-1">
                  <p className="text-sm font-semibold">{post.type}</p>
                  <p className="text-xs text-muted-foreground">Reach: {post.reach}</p>
                </div>
                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1"><Heart className="h-3 w-3" />{post.likes}</span>
                  <span className="flex items-center gap-1"><MessageCircle className="h-3 w-3" />{post.comments}</span>
                  <span className="flex items-center gap-1"><Bookmark className="h-3 w-3" />{post.saves}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Audience Insights */}
        <Tabs defaultValue="cities">
          <TabsList className="w-full">
            <TabsTrigger value="cities" className="flex-1">Top Cities</TabsTrigger>
            <TabsTrigger value="ages" className="flex-1">Age Range</TabsTrigger>
            <TabsTrigger value="gender" className="flex-1">Gender</TabsTrigger>
          </TabsList>
          <TabsContent value="cities" className="bg-card rounded-xl border border-border/30 p-4 mt-2">
            {AUDIENCE_CITIES.map(c => (
              <div key={c.city} className="flex items-center gap-3 py-2">
                <span className="text-sm w-24">{c.city}</span>
                <div className="flex-1 bg-muted rounded-full h-2"><div className="bg-primary rounded-full h-2" style={{ width: `${c.pct}%` }} /></div>
                <span className="text-xs font-semibold w-8 text-right">{c.pct}%</span>
              </div>
            ))}
          </TabsContent>
          <TabsContent value="ages" className="bg-card rounded-xl border border-border/30 p-4 mt-2">
            {AUDIENCE_AGES.map(a => (
              <div key={a.range} className="flex items-center gap-3 py-2">
                <span className="text-sm w-16">{a.range}</span>
                <div className="flex-1 bg-muted rounded-full h-2"><div className="bg-primary rounded-full h-2" style={{ width: `${a.pct}%` }} /></div>
                <span className="text-xs font-semibold w-8 text-right">{a.pct}%</span>
              </div>
            ))}
          </TabsContent>
          <TabsContent value="gender" className="bg-card rounded-xl border border-border/30 p-4 mt-2">
            <div className="flex items-center gap-3 py-2"><span className="text-sm w-16">Male</span><div className="flex-1 bg-muted rounded-full h-2"><div className="bg-primary rounded-full h-2" style={{ width: '58%' }} /></div><span className="text-xs font-semibold w-8 text-right">58%</span></div>
            <div className="flex items-center gap-3 py-2"><span className="text-sm w-16">Female</span><div className="flex-1 bg-muted rounded-full h-2"><div className="bg-primary rounded-full h-2" style={{ width: '40%' }} /></div><span className="text-xs font-semibold w-8 text-right">40%</span></div>
            <div className="flex items-center gap-3 py-2"><span className="text-sm w-16">Other</span><div className="flex-1 bg-muted rounded-full h-2"><div className="bg-primary rounded-full h-2" style={{ width: '2%' }} /></div><span className="text-xs font-semibold w-8 text-right">2%</span></div>
          </TabsContent>
        </Tabs>

        {/* Product Insights (Business) */}
        <div className="bg-card rounded-xl border border-border/30 p-4">
          <h3 className="text-sm font-semibold mb-3">Product Tag Performance</h3>
          <div className="grid grid-cols-3 gap-3 text-center">
            <div><p className="text-xl font-bold">342</p><p className="text-[10px] text-muted-foreground">Tag Taps</p></div>
            <div><p className="text-xl font-bold">89</p><p className="text-[10px] text-muted-foreground">Product Views</p></div>
            <div><p className="text-xl font-bold">₹12.4K</p><p className="text-[10px] text-muted-foreground">Revenue</p></div>
          </div>
        </div>
      </div>
    </div>
  );

  return <SocialLayout hideRightSidebar>{content}</SocialLayout>;
}
