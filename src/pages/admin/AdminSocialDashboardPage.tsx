import { useState } from "react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Users, Image, CheckCircle2, TrendingUp, Shield, Flag, Hash, Music2, Settings2, BarChart3, MoreHorizontal, Search } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from "recharts";

const CHART_COLORS = ["hsl(var(--primary))", "hsl(var(--chart-2))", "hsl(var(--chart-3))"];

const MOCK_ENGAGEMENT = [
  { day: "Mon", posts: 120, reels: 45, stories: 230 },
  { day: "Tue", posts: 98, reels: 52, stories: 198 },
  { day: "Wed", posts: 145, reels: 67, stories: 310 },
  { day: "Thu", posts: 110, reels: 43, stories: 250 },
  { day: "Fri", posts: 167, reels: 89, stories: 340 },
  { day: "Sat", posts: 200, reels: 110, stories: 420 },
  { day: "Sun", posts: 189, reels: 95, stories: 380 },
];

const MOCK_GROWTH = [
  { week: "W1", users: 1200 }, { week: "W2", users: 1450 }, { week: "W3", users: 1680 },
  { week: "W4", users: 2100 }, { week: "W5", users: 2540 }, { week: "W6", users: 3020 },
];

export default function AdminSocialDashboardPage() {
  const [activeTab, setActiveTab] = useState("overview");
  const [searchQuery, setSearchQuery] = useState("");

  const { data: profiles = [], refetch: refetchProfiles } = useQuery({
    queryKey: ['admin-social-profiles'],
    queryFn: async () => {
      const { data } = await supabase.from('social_profiles').select('*').order('created_at', { ascending: false }).limit(100);
      return data || [];
    }
  });

  const { data: posts = [] } = useQuery({
    queryKey: ['admin-social-posts'],
    queryFn: async () => {
      const { data } = await supabase.from('social_posts').select('*').order('created_at', { ascending: false }).limit(100);
      return data || [];
    }
  });

  const { data: hashtags = [], refetch: refetchHashtags } = useQuery({
    queryKey: ['admin-social-hashtags'],
    queryFn: async () => {
      const { data } = await supabase.from('social_hashtags').select('*').order('post_count', { ascending: false }).limit(50);
      return data || [];
    }
  });

  const { data: audioTracks = [], refetch: refetchAudio } = useQuery({
    queryKey: ['admin-social-audio'],
    queryFn: async () => {
      const { data } = await supabase.from('social_audio').select('*').order('use_count', { ascending: false }).limit(50);
      return data || [];
    }
  });

  const verifiedCount = profiles.filter((p: any) => p.is_verified).length;
  const creatorCount = profiles.filter((p: any) => p.account_type === 'creator').length;

  const stats = [
    { title: "Total Users", value: profiles.length, icon: Users, color: "text-primary" },
    { title: "Total Posts", value: posts.length, icon: Image, color: "text-chart-2" },
    { title: "Verified", value: verifiedCount, icon: CheckCircle2, color: "text-chart-3" },
    { title: "Creators", value: creatorCount, icon: TrendingUp, color: "text-chart-4" },
  ];

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
              {stats.map(s => (
                <Card key={s.title}>
                  <CardContent className="pt-4 pb-3 px-4">
                    <div className="flex items-center justify-between">
                      <p className="text-xs text-muted-foreground">{s.title}</p>
                      <s.icon className={`h-4 w-4 ${s.color}`} />
                    </div>
                    <p className="text-2xl font-bold mt-1">{s.value}</p>
                  </CardContent>
                </Card>
              ))}
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              <Card>
                <CardHeader><CardTitle className="text-base">Content Created (This Week)</CardTitle></CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={250}>
                    <BarChart data={MOCK_ENGAGEMENT}>
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
                    <LineChart data={MOCK_GROWTH}>
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
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">Social Profiles</CardTitle>
                  <div className="relative w-64">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input placeholder="Search users..." className="pl-8 h-9" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Username</TableHead>
                      <TableHead>Name</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Followers</TableHead>
                      <TableHead>Posts</TableHead>
                      <TableHead>Verified</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {profiles.filter((p: any) => !searchQuery || p.username?.toLowerCase().includes(searchQuery.toLowerCase()) || p.display_name?.toLowerCase().includes(searchQuery.toLowerCase())).map((p: any) => (
                      <TableRow key={p.id}>
                        <TableCell className="font-mono text-sm">@{p.username}</TableCell>
                        <TableCell>{p.display_name}</TableCell>
                        <TableCell><Badge variant="outline" className="capitalize">{p.account_type}</Badge></TableCell>
                        <TableCell>{p.follower_count}</TableCell>
                        <TableCell>{p.post_count}</TableCell>
                        <TableCell>{p.is_verified ? <CheckCircle2 className="h-4 w-4 text-primary" /> : "—"}</TableCell>
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild><Button variant="ghost" size="icon"><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={async () => {
                                await supabase.from('social_profiles').update({ is_verified: !p.is_verified }).eq('id', p.id);
                                refetchProfiles();
                                toast.success("Updated");
                              }}>
                                {p.is_verified ? "Remove Verified" : "Grant Verified"}
                              </DropdownMenuItem>
                              <DropdownMenuItem className="text-destructive">Suspend</DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))}
                    {profiles.length === 0 && (
                      <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">No social profiles yet</TableCell></TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* MODERATION */}
          <TabsContent value="moderation" className="space-y-4">
            <Card>
              <CardHeader><CardTitle className="text-base flex items-center gap-2"><Flag className="h-5 w-5" /> Reported Content</CardTitle></CardHeader>
              <CardContent>
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <Shield className="h-12 w-12 text-muted-foreground/30 mb-3" />
                  <p className="text-muted-foreground">No reported content</p>
                  <p className="text-sm text-muted-foreground/70">Reports from users will appear here for review</p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle className="text-base">All Posts</CardTitle></CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Type</TableHead>
                      <TableHead>Caption</TableHead>
                      <TableHead>Likes</TableHead>
                      <TableHead>Comments</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {posts.map((post: any) => (
                      <TableRow key={post.id}>
                        <TableCell><Badge variant="outline" className="capitalize">{post.post_type}</Badge></TableCell>
                        <TableCell className="max-w-[200px] truncate text-sm">{post.caption || "—"}</TableCell>
                        <TableCell>{post.like_count}</TableCell>
                        <TableCell>{post.comment_count}</TableCell>
                        <TableCell><Badge variant={post.status === 'active' ? 'default' : 'destructive'}>{post.status}</Badge></TableCell>
                        <TableCell>
                          <Button variant="ghost" size="sm" className="text-destructive" onClick={async () => {
                            await supabase.from('social_posts').update({ status: 'removed' }).eq('id', post.id);
                            toast.success("Post removed");
                          }}>Remove</Button>
                        </TableCell>
                      </TableRow>
                    ))}
                    {posts.length === 0 && (
                      <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">No posts yet</TableCell></TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* HASHTAGS */}
          <TabsContent value="hashtags">
            <Card>
              <CardHeader><CardTitle className="text-base">Hashtag Management</CardTitle></CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Hashtag</TableHead>
                      <TableHead>Posts</TableHead>
                      <TableHead>Trending</TableHead>
                      <TableHead>Blocked</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {hashtags.map((h: any) => (
                      <TableRow key={h.id}>
                        <TableCell className="font-mono text-primary">#{h.name}</TableCell>
                        <TableCell>{h.post_count}</TableCell>
                        <TableCell>{h.is_trending ? <Badge className="bg-accent text-accent-foreground">Trending</Badge> : "—"}</TableCell>
                        <TableCell>{h.is_blocked ? <Badge variant="destructive">Blocked</Badge> : "—"}</TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            <Button variant="ghost" size="sm" onClick={async () => {
                              await supabase.from('social_hashtags').update({ is_trending: !h.is_trending }).eq('id', h.id);
                              refetchHashtags();
                              toast.success(h.is_trending ? "Unpinned" : "Pinned as trending");
                            }}>{h.is_trending ? "Unpin" : "Pin"}</Button>
                            <Button variant="ghost" size="sm" className="text-destructive" onClick={async () => {
                              await supabase.from('social_hashtags').update({ is_blocked: !h.is_blocked }).eq('id', h.id);
                              refetchHashtags();
                              toast.success(h.is_blocked ? "Unblocked" : "Blocked");
                            }}>{h.is_blocked ? "Unblock" : "Block"}</Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                    {hashtags.length === 0 && (
                      <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">No hashtags yet</TableCell></TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* AUDIO */}
          <TabsContent value="audio">
            <Card>
              <CardHeader><CardTitle className="text-base">Audio Library</CardTitle></CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Title</TableHead>
                      <TableHead>Artist</TableHead>
                      <TableHead>Genre</TableHead>
                      <TableHead>Uses</TableHead>
                      <TableHead>Trending</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {audioTracks.map((a: any) => (
                      <TableRow key={a.id}>
                        <TableCell>{a.title}</TableCell>
                        <TableCell>{a.artist}</TableCell>
                        <TableCell>{a.genre}</TableCell>
                        <TableCell>{a.use_count}</TableCell>
                        <TableCell>{a.is_trending ? <Badge className="bg-accent text-accent-foreground">Trending</Badge> : "—"}</TableCell>
                        <TableCell>
                          <Button variant="ghost" size="sm" onClick={async () => {
                            await supabase.from('social_audio').update({ is_trending: !a.is_trending }).eq('id', a.id);
                            refetchAudio();
                            toast.success("Updated");
                          }}>{a.is_trending ? "Untrend" : "Trend"}</Button>
                        </TableCell>
                      </TableRow>
                    ))}
                    {audioTracks.length === 0 && (
                      <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">No audio tracks yet</TableCell></TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
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
                        "Trial Reels", "Remix / Duet", "Collab Posts", "Broadcast Channels",
                        "Product Tagging", "Creator Subscriptions", "Live Badges", "AI Restyle (Stories)",
                      ].map(label => (
                        <div key={label} className="flex items-center justify-between">
                          <Label>{label}</Label>
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
