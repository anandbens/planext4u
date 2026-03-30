import { useState } from "react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { DataTable } from "@/components/admin/DataTable";
import { StatCard } from "@/components/admin/StatCard";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Users, Image, Film, MessageSquare, Flag, Shield, TrendingUp, Hash, MoreHorizontal, Eye, Ban, CheckCircle2, AlertTriangle, BarChart3, Music2, Settings2 } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from "recharts";

const CHART_COLORS = ["hsl(var(--primary))", "hsl(var(--chart-2))", "hsl(var(--chart-3))", "hsl(var(--chart-4))", "hsl(var(--chart-5))"];

const MOCK_ENGAGEMENT_DATA = [
  { day: "Mon", posts: 120, reels: 45, stories: 230 },
  { day: "Tue", posts: 98, reels: 52, stories: 198 },
  { day: "Wed", posts: 145, reels: 67, stories: 310 },
  { day: "Thu", posts: 110, reels: 43, stories: 250 },
  { day: "Fri", posts: 167, reels: 89, stories: 340 },
  { day: "Sat", posts: 200, reels: 110, stories: 420 },
  { day: "Sun", posts: 189, reels: 95, stories: 380 },
];

const MOCK_GROWTH_DATA = [
  { week: "W1", users: 1200 }, { week: "W2", users: 1450 }, { week: "W3", users: 1680 },
  { week: "W4", users: 2100 }, { week: "W5", users: 2540 }, { week: "W6", users: 3020 },
];

export default function AdminSocialDashboardPage() {
  const [activeTab, setActiveTab] = useState("overview");
  const [reportAction, setReportAction] = useState<any>(null);

  // Fetch social profiles
  const { data: profiles = [] } = useQuery({
    queryKey: ['admin-social-profiles'],
    queryFn: async () => {
      const { data } = await supabase.from('social_profiles').select('*').order('created_at', { ascending: false }).limit(100);
      return data || [];
    }
  });

  // Fetch posts
  const { data: posts = [] } = useQuery({
    queryKey: ['admin-social-posts'],
    queryFn: async () => {
      const { data } = await supabase.from('social_posts').select('*').order('created_at', { ascending: false }).limit(100);
      return data || [];
    }
  });

  // Fetch hashtags
  const { data: hashtags = [] } = useQuery({
    queryKey: ['admin-social-hashtags'],
    queryFn: async () => {
      const { data } = await supabase.from('social_hashtags').select('*').order('post_count', { ascending: false }).limit(50);
      return data || [];
    }
  });

  // Fetch audio
  const { data: audioTracks = [] } = useQuery({
    queryKey: ['admin-social-audio'],
    queryFn: async () => {
      const { data } = await supabase.from('social_audio').select('*').order('use_count', { ascending: false }).limit(50);
      return data || [];
    }
  });

  // Fetch config
  const { data: configs = [], refetch: refetchConfig } = useQuery({
    queryKey: ['admin-social-config'],
    queryFn: async () => {
      const { data } = await supabase.from('social_config').select('*');
      return data || [];
    }
  });

  const getConfig = (key: string) => configs.find((c: any) => c.key === key)?.value || '';

  const verifiedCount = profiles.filter((p: any) => p.is_verified).length;
  const creatorCount = profiles.filter((p: any) => p.account_type === 'creator').length;
  const businessCount = profiles.filter((p: any) => p.account_type === 'business').length;
  const totalPosts = posts.length;

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">P4U Social — Admin</h1>
          <p className="text-sm text-muted-foreground">Content moderation, user management, analytics & configuration</p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="flex-wrap h-auto">
            <TabsTrigger value="overview"><BarChart3 className="h-4 w-4 mr-1" />Overview</TabsTrigger>
            <TabsTrigger value="users"><Users className="h-4 w-4 mr-1" />Users</TabsTrigger>
            <TabsTrigger value="moderation"><Shield className="h-4 w-4 mr-1" />Moderation</TabsTrigger>
            <TabsTrigger value="hashtags"><Hash className="h-4 w-4 mr-1" />Hashtags</TabsTrigger>
            <TabsTrigger value="audio"><Music2 className="h-4 w-4 mr-1" />Audio</TabsTrigger>
            <TabsTrigger value="config"><Settings2 className="h-4 w-4 mr-1" />Config</TabsTrigger>
          </TabsList>

          {/* OVERVIEW */}
          <TabsContent value="overview" className="space-y-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <StatCard title="Total Users" value={profiles.length.toString()} icon={<Users className="h-5 w-5" />} />
              <StatCard title="Total Posts" value={totalPosts.toString()} icon={<Image className="h-5 w-5" />} />
              <StatCard title="Verified" value={verifiedCount.toString()} icon={<CheckCircle2 className="h-5 w-5" />} />
              <StatCard title="Creators" value={creatorCount.toString()} icon={<TrendingUp className="h-5 w-5" />} />
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              <Card>
                <CardHeader><CardTitle className="text-base">Content Created (This Week)</CardTitle></CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={250}>
                    <BarChart data={MOCK_ENGAGEMENT_DATA}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="day" />
                      <YAxis />
                      <Tooltip />
                      <Bar dataKey="posts" fill={CHART_COLORS[0]} name="Posts" />
                      <Bar dataKey="reels" fill={CHART_COLORS[1]} name="Reels" />
                      <Bar dataKey="stories" fill={CHART_COLORS[2]} name="Stories" />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card>
                <CardHeader><CardTitle className="text-base">User Growth</CardTitle></CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={250}>
                    <LineChart data={MOCK_GROWTH_DATA}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="week" />
                      <YAxis />
                      <Tooltip />
                      <Line type="monotone" dataKey="users" stroke={CHART_COLORS[0]} strokeWidth={2} />
                    </LineChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* USERS */}
          <TabsContent value="users">
            <DataTable
              title="Social Profiles"
              columns={[
                { key: "username", label: "Username", render: (v: string) => <span className="font-mono text-sm">@{v}</span> },
                { key: "display_name", label: "Name" },
                { key: "account_type", label: "Type", render: (v: string) => <Badge variant="outline" className="capitalize">{v}</Badge> },
                { key: "follower_count", label: "Followers" },
                { key: "post_count", label: "Posts" },
                { key: "is_verified", label: "Verified", render: (v: boolean) => v ? <CheckCircle2 className="h-4 w-4 text-primary" /> : <span className="text-muted-foreground">—</span> },
                {
                  key: "id", label: "Actions", render: (_: any, row: any) => (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild><Button variant="ghost" size="icon"><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => {
                          supabase.from('social_profiles').update({ is_verified: !row.is_verified }).eq('id', row.id).then(() => toast.success("Updated"));
                        }}>
                          {row.is_verified ? "Remove Verified" : "Grant Verified"}
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => toast.info("View profile")}>View Profile</DropdownMenuItem>
                        <DropdownMenuItem className="text-destructive" onClick={() => toast.info("Suspend user")}>Suspend</DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )
                },
              ]}
              data={profiles}
              searchKeys={["username", "display_name"]}
            />
          </TabsContent>

          {/* MODERATION */}
          <TabsContent value="moderation">
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2"><Flag className="h-5 w-5" /> Reported Content</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <Shield className="h-12 w-12 text-muted-foreground/30 mb-3" />
                  <p className="text-muted-foreground">No reported content</p>
                  <p className="text-sm text-muted-foreground/70">Reports from users will appear here for review</p>
                </div>
              </CardContent>
            </Card>

            <Card className="mt-4">
              <CardHeader><CardTitle className="text-base">Content Overview</CardTitle></CardHeader>
              <CardContent>
                <DataTable
                  title=""
                  columns={[
                    { key: "post_type", label: "Type", render: (v: string) => <Badge variant="outline" className="capitalize">{v}</Badge> },
                    { key: "caption", label: "Caption", render: (v: string) => <span className="truncate max-w-[200px] block text-sm">{v || "—"}</span> },
                    { key: "like_count", label: "Likes" },
                    { key: "comment_count", label: "Comments" },
                    { key: "status", label: "Status", render: (v: string) => <StatusBadge status={v} /> },
                    {
                      key: "id", label: "Actions", render: (_: any, row: any) => (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild><Button variant="ghost" size="icon"><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => toast.info("View post")}>View</DropdownMenuItem>
                            <DropdownMenuItem className="text-destructive" onClick={async () => {
                              await supabase.from('social_posts').update({ status: 'removed' }).eq('id', row.id);
                              toast.success("Post removed");
                            }}>Remove</DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      )
                    },
                  ]}
                  data={posts}
                  searchKeys={["caption"]}
                />
              </CardContent>
            </Card>
          </TabsContent>

          {/* HASHTAGS */}
          <TabsContent value="hashtags">
            <DataTable
              title="Hashtag Management"
              columns={[
                { key: "name", label: "Hashtag", render: (v: string) => <span className="font-mono text-primary">#{v}</span> },
                { key: "post_count", label: "Posts" },
                { key: "is_trending", label: "Trending", render: (v: boolean) => v ? <Badge className="bg-orange-500">Trending</Badge> : <span>—</span> },
                { key: "is_blocked", label: "Blocked", render: (v: boolean) => v ? <Badge variant="destructive">Blocked</Badge> : <span>—</span> },
                {
                  key: "id", label: "Actions", render: (_: any, row: any) => (
                    <div className="flex gap-1">
                      <Button variant="ghost" size="sm" onClick={async () => {
                        await supabase.from('social_hashtags').update({ is_trending: !row.is_trending }).eq('id', row.id);
                        toast.success(row.is_trending ? "Unpinned" : "Pinned as trending");
                      }}>
                        {row.is_trending ? "Unpin" : "Pin"}
                      </Button>
                      <Button variant="ghost" size="sm" className="text-destructive" onClick={async () => {
                        await supabase.from('social_hashtags').update({ is_blocked: !row.is_blocked }).eq('id', row.id);
                        toast.success(row.is_blocked ? "Unblocked" : "Blocked");
                      }}>
                        {row.is_blocked ? "Unblock" : "Block"}
                      </Button>
                    </div>
                  )
                },
              ]}
              data={hashtags}
              searchKeys={["name"]}
            />
          </TabsContent>

          {/* AUDIO */}
          <TabsContent value="audio">
            <DataTable
              title="Audio Library"
              columns={[
                { key: "title", label: "Title" },
                { key: "artist", label: "Artist" },
                { key: "genre", label: "Genre" },
                { key: "use_count", label: "Uses" },
                { key: "is_trending", label: "Trending", render: (v: boolean) => v ? <Badge className="bg-orange-500">Trending</Badge> : <span>—</span> },
                { key: "status", label: "Status", render: (v: string) => <StatusBadge status={v || 'active'} /> },
                {
                  key: "id", label: "Actions", render: (_: any, row: any) => (
                    <div className="flex gap-1">
                      <Button variant="ghost" size="sm" onClick={async () => {
                        await supabase.from('social_audio').update({ is_trending: !row.is_trending }).eq('id', row.id);
                        toast.success("Updated");
                      }}>
                        {row.is_trending ? "Untrend" : "Trend"}
                      </Button>
                    </div>
                  )
                },
              ]}
              data={audioTracks}
              searchKeys={["title", "artist"]}
            />
          </TabsContent>

          {/* CONFIG */}
          <TabsContent value="config" className="space-y-4">
            <Card>
              <CardHeader><CardTitle className="text-base">Platform Configuration</CardTitle></CardHeader>
              <CardContent className="space-y-6">
                <div className="grid md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <h3 className="font-semibold text-sm">Content Limits</h3>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <Label>Max hashtags per post</Label>
                        <Input className="w-20" type="number" defaultValue="3" />
                      </div>
                      <div className="flex items-center justify-between">
                        <Label>Max story segments/day</Label>
                        <Input className="w-20" type="number" defaultValue="30" />
                      </div>
                      <div className="flex items-center justify-between">
                        <Label>Max reel duration</Label>
                        <Select defaultValue="90">
                          <SelectTrigger className="w-28"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="30">30s</SelectItem>
                            <SelectItem value="60">60s</SelectItem>
                            <SelectItem value="90">90s</SelectItem>
                            <SelectItem value="180">3 min</SelectItem>
                            <SelectItem value="600">10 min</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h3 className="font-semibold text-sm">Feature Toggles</h3>
                    <div className="space-y-3">
                      {[
                        { label: "Trial Reels", key: "trial_reels" },
                        { label: "Remix / Duet", key: "remix_enabled" },
                        { label: "Collab Posts", key: "collab_posts" },
                        { label: "Broadcast Channels", key: "broadcast_channels" },
                        { label: "Product Tagging", key: "product_tagging" },
                        { label: "Creator Subscriptions", key: "creator_subscriptions" },
                        { label: "Live Badges", key: "live_badges" },
                        { label: "AI Restyle (Stories)", key: "ai_restyle" },
                      ].map(toggle => (
                        <div key={toggle.key} className="flex items-center justify-between">
                          <Label>{toggle.label}</Label>
                          <Switch defaultChecked />
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="pt-4 border-t">
                  <h3 className="font-semibold text-sm mb-3">Product Tagging — Account Permissions</h3>
                  <div className="space-y-2">
                    {["Personal", "Creator", "Business"].map(type => (
                      <div key={type} className="flex items-center justify-between">
                        <Label>{type} accounts can tag products</Label>
                        <Switch defaultChecked={type !== "Personal"} />
                      </div>
                    ))}
                  </div>
                </div>

                <Button onClick={() => toast.success("Configuration saved")} className="w-full md:w-auto">Save Configuration</Button>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </AdminLayout>
  );
}
