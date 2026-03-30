import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Camera, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useAuth } from "@/lib/auth";
import { toast } from "sonner";
import SocialLayout from "@/components/social/SocialLayout";

export default function SocialEditProfilePage() {
  const navigate = useNavigate();
  const { customerUser } = useAuth();
  const [form, setForm] = useState({
    displayName: customerUser?.name || "Your Name",
    username: customerUser?.name?.toLowerCase().replace(/\s/g, '_') || "your_username",
    bio: "Welcome to my profile ✨",
    website: "planext4u.com",
    pronouns: "",
    category: "",
    location: "Coimbatore, TN",
    email: customerUser?.email || "",
    phone: "",
  });
  const [accountType, setAccountType] = useState("personal");
  const [isPrivate, setIsPrivate] = useState(false);

  const handleSave = () => {
    toast.success("Profile updated successfully!");
    navigate(-1);
  };

  const content = (
    <div className="pb-20 md:pb-8">
      <header className="sticky top-0 z-40 bg-card border-b border-border/30">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate(-1)}><ArrowLeft className="h-5 w-5" /></button>
            <h1 className="text-lg font-bold">Edit Profile</h1>
          </div>
          <Button size="sm" onClick={handleSave} className="h-8 px-4 text-xs font-semibold">Save</Button>
        </div>
      </header>

      <div className="max-w-lg mx-auto p-4 space-y-6">
        {/* Avatar */}
        <div className="flex flex-col items-center gap-3">
          <div className="relative">
            <div className="h-24 w-24 rounded-full bg-accent flex items-center justify-center border-2 border-border">
              <span className="text-3xl font-bold text-primary">{form.displayName.charAt(0).toUpperCase()}</span>
            </div>
            <button className="absolute bottom-0 right-0 h-8 w-8 bg-primary rounded-full flex items-center justify-center border-2 border-card">
              <Camera className="h-4 w-4 text-primary-foreground" />
            </button>
          </div>
          <button className="text-sm font-semibold text-primary">Change Profile Photo</button>
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
            <Textarea value={form.bio} onChange={(e) => setForm(p => ({ ...p, bio: e.target.value }))} className="mt-1 resize-none" rows={3} maxLength={150} />
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
              <button key={type} onClick={() => { setAccountType(type); toast.success(`Switched to ${type} account`); }}
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
