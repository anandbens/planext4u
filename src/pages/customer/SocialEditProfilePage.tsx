import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Camera, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { RichTextEditor } from "@/components/ui/rich-text-editor";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useAuth } from "@/lib/auth";
import { toast } from "sonner";
import SocialLayout from "@/components/social/SocialLayout";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";

export default function SocialEditProfilePage() {
  const navigate = useNavigate();
  const { customerUser, isLoading: authLoading } = useAuth();
  const qc = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);
  const currentUserId = customerUser?.supabase_uid || customerUser?.id;
  const [saving, setSaving] = useState(false);

  const { data: profile } = useQuery({
    queryKey: ['social-profile-edit', currentUserId],
    queryFn: async () => {
      if (!currentUserId) return null;
      const { data } = await supabase.from('social_profiles').select('*').eq('user_id', currentUserId).maybeSingle();
      return data;
    },
    // Wait for auth session restore before querying — otherwise RLS returns
    // null on cold reload and the form binds to empty values.
    enabled: !authLoading && !!currentUserId,
    staleTime: 30_000,
  });

  const [form, setForm] = useState({
    displayName: "", username: "", bio: "", website: "",
    pronouns: "", location: "", email: "", phone: "",
  });
  const [avatarUrl, setAvatarUrl] = useState("");
  const [accountType, setAccountType] = useState("personal");
  const [isPrivate, setIsPrivate] = useState(false);

  const cleanEmail = (email: string | null | undefined): string => {
    if (!email || email.includes('@phone.planext4u.local')) return '';
    return email;
  };

  useEffect(() => {
    if (profile) {
      setForm({
        displayName: profile.display_name || "",
        username: profile.username || "",
        bio: profile.bio || "",
        website: profile.website || "",
        pronouns: (profile as any).pronouns || "",
        location: (profile as any).location || "",
        email: cleanEmail(customerUser?.email) || "",
        phone: customerUser?.mobile || "",
      });
      setAvatarUrl(profile.avatar_url || "");
      setIsPrivate((profile as any).is_private || false);
    }
  }, [profile, customerUser]);

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !currentUserId) return;
    const ext = file.name.split('.').pop() || 'jpg';
    const path = `${currentUserId}/avatar.${ext}`;
    const { error } = await supabase.storage.from('social-media').upload(path, file, { contentType: file.type, upsert: true });
    if (error) { toast.error("Upload failed: " + error.message); return; }
    const { data: signed } = await supabase.storage.from('social-media').createSignedUrl(path, 60 * 60 * 24 * 365);
    if (signed?.signedUrl) {
      setAvatarUrl(signed.signedUrl);
      toast.success("Photo uploaded!");
    }
    e.target.value = '';
  };

  const handleSave = async () => {
    if (!currentUserId) return;
    setSaving(true);
    try {
      const updates: any = {
        display_name: form.displayName,
        username: form.username,
        bio: form.bio,
        website: form.website,
        avatar_url: avatarUrl,
        is_private: isPrivate,
      };
      const { error } = await supabase.from('social_profiles').update(updates).eq('user_id', currentUserId);
      if (error) throw error;
      qc.invalidateQueries({ queryKey: ['social-profile'] });
      qc.invalidateQueries({ queryKey: ['social-profile-edit'] });
      toast.success("Profile updated!");
      navigate(-1);
    } catch (err: any) {
      toast.error(err.message || "Failed to update");
    } finally { setSaving(false); }
  };

  const content = (
    <div className="pb-28 md:pb-8">
      <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarUpload} />
      <header className="sticky top-0 z-20 bg-card border-b border-border/30">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate(-1)}><ArrowLeft className="h-5 w-5" /></button>
            <h1 className="text-lg font-bold">Edit Profile</h1>
          </div>
          <Button size="sm" onClick={handleSave} disabled={saving} className="h-8 px-4 text-xs font-semibold">
            {saving ? "Saving..." : "Save"}
          </Button>
        </div>
      </header>

      <div className="max-w-lg mx-auto p-4 space-y-6">
        {/* Avatar */}
        <div className="flex flex-col items-center gap-3">
          <div className="relative">
            <div className="h-24 w-24 rounded-full bg-accent flex items-center justify-center border-2 border-border overflow-hidden">
              {avatarUrl ? (
                <img src={avatarUrl} alt="" className="w-full h-full object-cover" />
              ) : (
                <span className="text-3xl font-bold text-primary">{form.displayName.charAt(0).toUpperCase() || 'U'}</span>
              )}
            </div>
            <button onClick={() => fileRef.current?.click()} className="absolute bottom-0 right-0 h-8 w-8 bg-primary rounded-full flex items-center justify-center border-2 border-card">
              <Camera className="h-4 w-4 text-primary-foreground" />
            </button>
          </div>
          <button onClick={() => fileRef.current?.click()} className="text-sm font-semibold text-primary">Change Profile Photo</button>
        </div>

        {/* Form fields */}
        <div className="space-y-4">
          <div>
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Display Name</label>
            <Input value={form.displayName} onChange={(e) => setForm(p => ({ ...p, displayName: e.target.value }))} className="mt-1" />
          </div>
          <div>
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Username</label>
            <Input value={form.username} onChange={(e) => setForm(p => ({ ...p, username: e.target.value }))} className="mt-1" />
            <p className="text-[10px] text-muted-foreground mt-1">Can be changed once every 30 days</p>
          </div>
          <div>
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Bio</label>
            <RichTextEditor value={form.bio} onChange={(v) => setForm(p => ({ ...p, bio: v }))} placeholder="Tell people about yourself..." minHeight="80px" compact />
            <p className="text-[10px] text-muted-foreground mt-1 text-right">{form.bio.length}/150</p>
          </div>
          <div>
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Website</label>
            <Input value={form.website} onChange={(e) => setForm(p => ({ ...p, website: e.target.value }))} className="mt-1" />
          </div>
          <div>
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Pronouns</label>
            <Select value={form.pronouns} onValueChange={(v) => setForm(p => ({ ...p, pronouns: v }))}>
              <SelectTrigger className="mt-1"><SelectValue placeholder="Select pronouns" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="he/him">He/Him</SelectItem>
                <SelectItem value="she/her">She/Her</SelectItem>
                <SelectItem value="they/them">They/Them</SelectItem>
                <SelectItem value="prefer_not">Prefer not to say</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Location</label>
            <Input value={form.location} onChange={(e) => setForm(p => ({ ...p, location: e.target.value }))} className="mt-1" />
          </div>
        </div>

        {/* Account Type */}
        <div>
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Account Type</h3>
          <div className="bg-card rounded-xl border border-border/30 divide-y divide-border/20">
            {["personal", "creator", "business"].map(type => (
              <button key={type} onClick={() => setAccountType(type)}
                className={`w-full flex items-center justify-between px-4 py-3 text-sm ${accountType === type ? 'font-semibold' : ''}`}>
                <span className="capitalize">{type} Account</span>
                <div className={`h-5 w-5 rounded-full border-2 flex items-center justify-center ${accountType === type ? 'border-primary bg-primary' : 'border-muted-foreground'}`}>
                  {accountType === type && <div className="h-2 w-2 rounded-full bg-primary-foreground" />}
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Privacy */}
        <div className="flex items-center justify-between bg-card rounded-xl border border-border/30 px-4 py-3">
          <div>
            <p className="text-sm font-medium">Private Account</p>
            <p className="text-xs text-muted-foreground">Only approved followers can see your posts</p>
          </div>
          <Switch checked={isPrivate} onCheckedChange={setIsPrivate} />
        </div>
      </div>
    </div>
  );

  return <SocialLayout hideRightSidebar>{content}</SocialLayout>;
}
