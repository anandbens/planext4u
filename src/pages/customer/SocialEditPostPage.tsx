/**
 * SocialEditPostPage
 *
 * Allows the owner of a Social post / reel to edit metadata after publishing:
 * caption, location, audience (privacy), comment-allow setting, hide-like-count,
 * tagged people, product tags, and hashtags.
 *
 * Media (photos/videos) is intentionally read-only here — Instagram-style.
 * To replace media, the user must delete the post and re-create it.
 *
 * The DB trigger `mark_social_post_edited` automatically stamps
 * `is_edited = true` and `edited_at = now()` whenever any tracked field changes.
 */
import { useState, useEffect } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import { ArrowLeft, MapPin, Users, ShoppingBag, X, Plus, Lock, Globe } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import SocialLayout from "@/components/social/SocialLayout";

export default function SocialEditPostPage() {
  const { postId } = useParams();
  const navigate = useNavigate();
  const { customerUser } = useAuth();
  const userId = customerUser?.supabase_uid || customerUser?.id;

  const { data: post, isLoading } = useQuery({
    queryKey: ["social-post-edit", postId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("social_posts")
        .select("*")
        .eq("id", postId!)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!postId,
  });

  const [caption, setCaption] = useState("");
  const [location, setLocation] = useState("");
  const [audience, setAudience] = useState<string>("public");
  const [category, setCategory] = useState<string>("");
  const [allowComments, setAllowComments] = useState<string>("everyone");
  const [hideLikeCount, setHideLikeCount] = useState(false);
  const [hashtagsInput, setHashtagsInput] = useState("");
  const [taggedPeople, setTaggedPeople] = useState<{ id: string; username: string }[]>([]);
  const [productTags, setProductTags] = useState<any[]>([]);
  const [productSearch, setProductSearch] = useState("");
  const [showProductPicker, setShowProductPicker] = useState(false);
  const [tagSearch, setTagSearch] = useState("");
  const [showTagPicker, setShowTagPicker] = useState(false);
  const [saving, setSaving] = useState(false);

  // Hydrate form when post loads
  useEffect(() => {
    if (!post) return;
    setCaption(post.caption || "");
    setLocation(post.location_name || "");
    setAudience(post.audience || "public");
    setCategory((post as any).category || "");
    setAllowComments(post.allow_comments || "everyone");
    setHideLikeCount(!!post.hide_like_count);
    setHashtagsInput(Array.isArray(post.hashtags) ? post.hashtags.join(" ") : "");
    setTaggedPeople(Array.isArray(post.tagged_users) ? (post.tagged_users as any[]) : []);
    setProductTags(Array.isArray(post.product_tags) ? (post.product_tags as any[]) : []);
  }, [post]);

  // Product search (only when picker open)
  const { data: productResults = [] } = useQuery({
    queryKey: ["edit-post-products", productSearch],
    queryFn: async () => {
      if (productSearch.trim().length < 2) return [];
      const { data } = await supabase
        .from("products")
        .select("id, title, price, socio_shopping_icon, image")
        .ilike("title", `%${productSearch.trim()}%`)
        .limit(10);
      return data || [];
    },
    enabled: showProductPicker && productSearch.trim().length >= 2,
  });

  // People search
  const { data: peopleResults = [] } = useQuery({
    queryKey: ["edit-post-people", tagSearch],
    queryFn: async () => {
      if (tagSearch.trim().length < 2) return [];
      const { data } = await supabase
        .from("social_profiles")
        .select("user_id, username, display_name")
        .ilike("username", `%${tagSearch.trim()}%`)
        .limit(10);
      return data || [];
    },
    enabled: showTagPicker && tagSearch.trim().length >= 2,
  });

  // Permission gate
  if (!isLoading && post && userId !== post.user_id) {
    return (
      <SocialLayout hideRightSidebar>
        <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
          <Lock className="h-10 w-10 text-muted-foreground mb-3" />
          <h2 className="text-lg font-bold mb-2">You can't edit this post</h2>
          <p className="text-sm text-muted-foreground mb-4">Only the author can edit a post.</p>
          <Button onClick={() => navigate(-1)}>Go back</Button>
        </div>
      </SocialLayout>
    );
  }

  if (isLoading || !post) {
    return (
      <SocialLayout hideRightSidebar>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="h-8 w-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
        </div>
      </SocialLayout>
    );
  }

  const mediaItems = (Array.isArray(post.media) ? post.media : []) as any[];

  const handleSave = async () => {
    if (!userId) { toast.error("Please login"); return; }
    setSaving(true);
    try {
      // Parse hashtags from "#one #two" or "one two"
      const hashtags = hashtagsInput
        .split(/[\s,]+/)
        .map((t) => t.trim().replace(/^#+/, "").toLowerCase())
        .filter(Boolean);

      const { error } = await supabase
        .from("social_posts")
        .update({
          caption: caption,
          location_name: location || null,
          audience,
          category: category || null,
          allow_comments: allowComments,
          hide_like_count: hideLikeCount,
          hashtags: hashtags.length ? hashtags : [],
          tagged_users: taggedPeople.length ? taggedPeople : null,
          product_tags: productTags.length ? productTags : null,
        } as any)
        .eq("id", postId!)
        .eq("user_id", userId);

      if (error) {
        console.error("Edit post error:", error);
        toast.error(`Failed to save: ${error.message}`);
        return;
      }
      toast.success("Post updated");
      navigate(`/app/social/post/${postId}`);
    } finally {
      setSaving(false);
    }
  };

  const isReel = post.post_type === "reel";

  return (
    <SocialLayout hideRightSidebar>
      <div className="pb-28 md:pb-8 max-w-2xl mx-auto">
        <header className="sticky top-0 z-40 bg-card border-b border-border/30">
          <div className="flex items-center justify-between px-4 py-3">
            <button onClick={() => navigate(-1)} aria-label="Back">
              <ArrowLeft className="h-6 w-6" />
            </button>
            <span className="text-lg font-semibold">Edit {isReel ? "Reel" : "Post"}</span>
            <Button size="sm" onClick={handleSave} disabled={saving}>
              {saving ? "Saving…" : "Save"}
            </Button>
          </div>
        </header>

        {/* Read-only media preview */}
        <div className="px-4 pt-4">
          <div className="relative aspect-square bg-muted rounded-xl overflow-hidden">
            {mediaItems.length > 0 ? (
              mediaItems[0]?.type === "video" ? (
                <video src={mediaItems[0]?.url} className="w-full h-full object-cover" muted playsInline controls />
              ) : (
                <img
                  src={mediaItems[0]?.mediumUrl || mediaItems[0]?.url}
                  alt=""
                  className="w-full h-full object-cover"
                />
              )
            ) : (
              <div className="w-full h-full flex items-center justify-center text-muted-foreground text-sm">
                No media
              </div>
            )}
            {mediaItems.length > 1 && (
              <div className="absolute top-2 right-2 bg-black/60 text-white text-[10px] font-semibold px-2 py-1 rounded-full">
                1 / {mediaItems.length}
              </div>
            )}
          </div>
          <p className="text-[11px] text-muted-foreground mt-2 text-center">
            Media can't be replaced. To change photos or video, delete and re-create the post.
          </p>
        </div>

        <div className="px-4 pt-4 space-y-5">
          {/* Caption */}
          <div className="space-y-2">
            <Label>Caption</Label>
            <Textarea
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              placeholder="Write a caption…"
              rows={4}
              maxLength={2200}
            />
            <p className="text-[11px] text-muted-foreground text-right">{caption.length} / 2200</p>
          </div>

          {/* Location */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2"><MapPin className="h-4 w-4" /> Location</Label>
            <Input value={location} onChange={(e) => setLocation(e.target.value)} placeholder="Add location" />
          </div>

          {/* Hashtags */}
          <div className="space-y-2">
            <Label>Hashtags</Label>
            <Input
              value={hashtagsInput}
              onChange={(e) => setHashtagsInput(e.target.value)}
              placeholder="#travel #food (space separated)"
            />
          </div>

          {/* Tagged people */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2"><Users className="h-4 w-4" /> Tagged people</Label>
            <div className="flex flex-wrap gap-2">
              {taggedPeople.map((p) => (
                <span key={p.id} className="inline-flex items-center gap-1 bg-accent rounded-full px-3 py-1 text-xs">
                  @{p.username}
                  <button onClick={() => setTaggedPeople((prev) => prev.filter((x) => x.id !== p.id))}>
                    <X className="h-3 w-3" />
                  </button>
                </span>
              ))}
              <button
                onClick={() => setShowTagPicker((v) => !v)}
                className="inline-flex items-center gap-1 border border-dashed border-border rounded-full px-3 py-1 text-xs text-muted-foreground"
              >
                <Plus className="h-3 w-3" /> Tag
              </button>
            </div>
            {showTagPicker && (
              <div className="border border-border rounded-lg p-2 space-y-2">
                <Input
                  autoFocus
                  value={tagSearch}
                  onChange={(e) => setTagSearch(e.target.value)}
                  placeholder="Search username…"
                />
                <div className="max-h-48 overflow-y-auto">
                  {peopleResults.map((p: any) => (
                    <button
                      key={p.user_id}
                      onClick={() => {
                        if (!taggedPeople.find((x) => x.id === p.user_id)) {
                          setTaggedPeople((prev) => [...prev, { id: p.user_id, username: p.username }]);
                        }
                        setTagSearch("");
                        setShowTagPicker(false);
                      }}
                      className="flex items-center w-full text-left px-2 py-2 rounded hover:bg-accent text-sm"
                    >
                      @{p.username} <span className="text-muted-foreground ml-2">{p.display_name}</span>
                    </button>
                  ))}
                  {tagSearch.length >= 2 && peopleResults.length === 0 && (
                    <p className="text-xs text-muted-foreground text-center py-2">No users found</p>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Product tags */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2"><ShoppingBag className="h-4 w-4" /> Tagged products</Label>
            <div className="flex flex-wrap gap-2">
              {productTags.map((t: any) => (
                <span key={t.id} className="inline-flex items-center gap-2 bg-accent rounded-lg px-2 py-1 text-xs max-w-[200px]">
                  {(t.image || t.socio_shopping_icon) && (
                    <img src={t.image || t.socio_shopping_icon} alt="" className="h-5 w-5 rounded object-cover" />
                  )}
                  <span className="truncate">{t.title}</span>
                  <button onClick={() => setProductTags((prev) => prev.filter((x) => x.id !== t.id))}>
                    <X className="h-3 w-3" />
                  </button>
                </span>
              ))}
              <button
                onClick={() => setShowProductPicker((v) => !v)}
                className="inline-flex items-center gap-1 border border-dashed border-border rounded-lg px-3 py-1 text-xs text-muted-foreground"
              >
                <Plus className="h-3 w-3" /> Tag product
              </button>
            </div>
            {showProductPicker && (
              <div className="border border-border rounded-lg p-2 space-y-2">
                <Input
                  autoFocus
                  value={productSearch}
                  onChange={(e) => setProductSearch(e.target.value)}
                  placeholder="Search products…"
                />
                <div className="max-h-48 overflow-y-auto">
                  {productResults.map((p: any) => (
                    <button
                      key={p.id}
                      onClick={() => {
                        if (!productTags.find((x: any) => x.id === p.id)) {
                          setProductTags((prev) => [
                            ...prev,
                            { id: p.id, title: p.title, price: p.price, image: p.image || p.socio_shopping_icon },
                          ]);
                        }
                        setProductSearch("");
                        setShowProductPicker(false);
                      }}
                      className="flex items-center gap-2 w-full text-left px-2 py-2 rounded hover:bg-accent text-sm"
                    >
                      {(p.image || p.socio_shopping_icon) && (
                        <img src={p.image || p.socio_shopping_icon} alt="" className="h-8 w-8 rounded object-cover" />
                      )}
                      <span className="flex-1 truncate">{p.title}</span>
                      {p.price != null && <span className="text-xs text-primary font-bold">₹{p.price}</span>}
                    </button>
                  ))}
                  {productSearch.length >= 2 && productResults.length === 0 && (
                    <p className="text-xs text-muted-foreground text-center py-2">No products found</p>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Privacy / audience */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2"><Globe className="h-4 w-4" /> Audience</Label>
            <Select value={audience} onValueChange={setAudience}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="public">Public — anyone can see</SelectItem>
                <SelectItem value="followers">Followers only</SelectItem>
                <SelectItem value="close_friends">Close friends</SelectItem>
                <SelectItem value="private">Private (only me)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Comment settings */}
          <div className="space-y-2">
            <Label>Who can comment</Label>
            <Select value={allowComments} onValueChange={setAllowComments}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="everyone">Everyone</SelectItem>
                <SelectItem value="followers">People you follow & followers</SelectItem>
                <SelectItem value="following">People you follow</SelectItem>
                <SelectItem value="off">Turn off comments</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Hide like count */}
          <div className="flex items-center justify-between border-t border-border/40 pt-4">
            <div>
              <p className="text-sm font-medium">Hide like count</p>
              <p className="text-xs text-muted-foreground">Only you will see the total likes.</p>
            </div>
            <Switch checked={hideLikeCount} onCheckedChange={setHideLikeCount} />
          </div>

          {post.is_edited && (
            <p className="text-[11px] text-muted-foreground text-center pt-2">
              This post was last edited
              {post.edited_at ? ` on ${new Date(post.edited_at).toLocaleString()}` : ""}.
            </p>
          )}

          <div className="pt-4 pb-8">
            <Link
              to={`/app/social/post/${postId}`}
              className="block text-center text-xs text-muted-foreground hover:underline"
            >
              Cancel and go back
            </Link>
          </div>
        </div>
      </div>
    </SocialLayout>
  );
}
