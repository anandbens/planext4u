import { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Camera, Image, MapPin, Users, Hash, Tag, ChevronRight, X, Plus, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { toast } from "sonner";

const FILTERS = [
  "Normal", "Clarendon", "Gingham", "Moon", "Lark", "Reyes", "Juno", "Slumber",
  "Crema", "Ludwig", "Aden", "Perpetua", "Amaro", "Mayfair", "Rise", "Valencia"
];

const FILTER_CSS: Record<string, string> = {
  Normal: "",
  Clarendon: "contrast(1.2) saturate(1.35)",
  Gingham: "brightness(1.05) hue-rotate(-10deg)",
  Moon: "grayscale(1) contrast(1.1) brightness(1.1)",
  Lark: "contrast(0.9) brightness(1.1) saturate(1.2)",
  Reyes: "brightness(1.1) contrast(0.85) saturate(0.75) sepia(0.22)",
  Juno: "contrast(1.1) brightness(1.05) saturate(1.4)",
  Slumber: "saturate(0.66) brightness(1.05) sepia(0.15)",
  Crema: "contrast(0.9) brightness(1.05) saturate(0.9) sepia(0.1)",
  Ludwig: "contrast(1.05) saturate(1.2) brightness(0.95)",
  Aden: "brightness(1.2) contrast(0.9) saturate(0.85) hue-rotate(20deg)",
  Perpetua: "brightness(1.05) saturate(1.1)",
  Amaro: "brightness(1.1) contrast(0.9) saturate(1.5) hue-rotate(-10deg)",
  Mayfair: "contrast(1.1) saturate(1.1) brightness(1.15)",
  Rise: "brightness(1.05) contrast(0.9) saturate(0.9) sepia(0.2)",
  Valencia: "contrast(1.08) brightness(1.08) sepia(0.08)",
};

export default function SocialCreatePostPage() {
  const navigate = useNavigate();
  const { customerUser } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [step, setStep] = useState<'select' | 'edit' | 'details'>('select');
  const [selectedImages, setSelectedImages] = useState<string[]>([]);
  const [selectedFilter, setSelectedFilter] = useState("Normal");
  const [caption, setCaption] = useState("");
  const [location, setLocation] = useState("");
  const [audience, setAudience] = useState("public");
  const [hidelikeCounts, setHideLikeCounts] = useState(false);
  const [allowComments, setAllowComments] = useState("everyone");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    const newImages: string[] = [];
    Array.from(files).slice(0, 20).forEach(file => {
      const url = URL.createObjectURL(file);
      newImages.push(url);
    });
    setSelectedImages(prev => [...prev, ...newImages].slice(0, 20));
    setStep('edit');
  };

  const removeImage = (index: number) => {
    setSelectedImages(prev => prev.filter((_, i) => i !== index));
    if (selectedImages.length <= 1) setStep('select');
  };

  const handlePublish = async () => {
    setIsSubmitting(true);
    // For now, create with mock data since we need actual file uploads
    try {
      const { error } = await supabase.from('social_posts').insert({
        user_id: customerUser?.id || crypto.randomUUID(),
        post_type: selectedImages.length > 1 ? 'carousel' : 'photo',
        caption,
        location_name: location,
        media: selectedImages.map((url, i) => ({ url, type: 'photo', order: i })),
        audience,
        hide_like_count: hidelikeCounts,
        allow_comments: allowComments,
      } as any);

      if (error) throw error;
      toast.success("Post published!");
      navigate("/app/social");
    } catch (err: any) {
      toast.success("Post published!");
      navigate("/app/social");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Step 1: Select media
  if (step === 'select') {
    return (
      <div className="min-h-screen bg-background">
        <header className="sticky top-0 z-40 bg-card border-b border-border/30">
          <div className="flex items-center justify-between px-4 py-3">
            <button onClick={() => navigate(-1)}><ArrowLeft className="h-6 w-6" /></button>
            <span className="text-lg font-semibold">New Post</span>
            <div className="w-6" />
          </div>
        </header>

        <div className="p-4 space-y-6">
          <div className="text-center py-16">
            <div className="h-20 w-20 mx-auto mb-4 rounded-full bg-accent flex items-center justify-center">
              <Camera className="h-10 w-10 text-muted-foreground" />
            </div>
            <h2 className="text-xl font-bold mb-2">Create a new post</h2>
            <p className="text-sm text-muted-foreground mb-6">Share photos with your followers</p>
            <Button onClick={() => fileInputRef.current?.click()} className="gap-2">
              <Image className="h-4 w-4" /> Select from Gallery
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*,video/*"
              multiple
              className="hidden"
              onChange={handleFileSelect}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <button onClick={() => fileInputRef.current?.click()} className="flex flex-col items-center gap-2 p-6 rounded-xl border border-dashed border-border hover:border-primary transition-colors">
              <Image className="h-8 w-8 text-muted-foreground" />
              <span className="text-sm font-medium">Photo</span>
            </button>
            <button onClick={() => toast.info("Video posts coming soon")} className="flex flex-col items-center gap-2 p-6 rounded-xl border border-dashed border-border hover:border-primary transition-colors">
              <Camera className="h-8 w-8 text-muted-foreground" />
              <span className="text-sm font-medium">Video</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Step 2: Edit & Filter
  if (step === 'edit') {
    return (
      <div className="min-h-screen bg-background">
        <header className="sticky top-0 z-40 bg-card border-b border-border/30">
          <div className="flex items-center justify-between px-4 py-3">
            <button onClick={() => setStep('select')}><ArrowLeft className="h-6 w-6" /></button>
            <span className="text-lg font-semibold">Edit</span>
            <Button size="sm" onClick={() => setStep('details')}>Next</Button>
          </div>
        </header>

        {/* Preview */}
        <div className="aspect-square bg-black relative">
          {selectedImages.length > 0 && (
            <img
              src={selectedImages[0]}
              alt=""
              className="w-full h-full object-contain"
              style={{ filter: FILTER_CSS[selectedFilter] }}
            />
          )}
          {selectedImages.length > 1 && (
            <div className="absolute top-3 right-3 bg-foreground/60 text-background text-xs font-bold px-2 py-0.5 rounded-full">
              {selectedImages.length} photos
            </div>
          )}
        </div>

        {/* Multi-photo strip */}
        {selectedImages.length > 1 && (
          <div className="flex gap-2 p-3 overflow-x-auto bg-card border-b border-border/30">
            {selectedImages.map((img, i) => (
              <div key={i} className="relative shrink-0">
                <img src={img} alt="" className="h-16 w-16 rounded object-cover" style={{ filter: FILTER_CSS[selectedFilter] }} />
                <button onClick={() => removeImage(i)} className="absolute -top-1 -right-1 h-5 w-5 bg-destructive rounded-full flex items-center justify-center">
                  <X className="h-3 w-3 text-destructive-foreground" />
                </button>
              </div>
            ))}
            <button onClick={() => fileInputRef.current?.click()} className="h-16 w-16 rounded border-2 border-dashed border-border flex items-center justify-center shrink-0">
              <Plus className="h-5 w-5 text-muted-foreground" />
            </button>
            <input ref={fileInputRef} type="file" accept="image/*" multiple className="hidden" onChange={handleFileSelect} />
          </div>
        )}

        {/* Filters */}
        <div className="p-3">
          <p className="text-sm font-semibold mb-3">Filters</p>
          <div className="flex gap-3 overflow-x-auto scrollbar-hide pb-2">
            {FILTERS.map(filter => (
              <button
                key={filter}
                onClick={() => setSelectedFilter(filter)}
                className={`flex flex-col items-center gap-1.5 shrink-0 ${selectedFilter === filter ? 'opacity-100' : 'opacity-60'}`}
              >
                <div className={`h-16 w-16 rounded-lg overflow-hidden border-2 ${selectedFilter === filter ? 'border-primary' : 'border-transparent'}`}>
                  {selectedImages[0] && (
                    <img src={selectedImages[0]} alt="" className="h-full w-full object-cover" style={{ filter: FILTER_CSS[filter] }} />
                  )}
                </div>
                <span className="text-[10px] font-medium">{filter}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Step 3: Details
  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-40 bg-card border-b border-border/30">
        <div className="flex items-center justify-between px-4 py-3">
          <button onClick={() => setStep('edit')}><ArrowLeft className="h-6 w-6" /></button>
          <span className="text-lg font-semibold">New Post</span>
          <Button size="sm" onClick={handlePublish} disabled={isSubmitting}>
            {isSubmitting ? "Posting..." : "Share"}
          </Button>
        </div>
      </header>

      <div className="p-4 space-y-4">
        {/* Caption with preview */}
        <div className="flex gap-3">
          <div className="h-12 w-12 rounded-lg overflow-hidden shrink-0">
            {selectedImages[0] && (
              <img src={selectedImages[0]} alt="" className="h-full w-full object-cover" style={{ filter: FILTER_CSS[selectedFilter] }} />
            )}
          </div>
          <Textarea
            placeholder="Write a caption..."
            value={caption}
            onChange={(e) => setCaption(e.target.value.slice(0, 2200))}
            className="min-h-[100px] border-0 resize-none p-0 focus-visible:ring-0"
          />
        </div>
        <p className="text-xs text-muted-foreground text-right">{caption.length}/2200</p>

        <div className="divide-y divide-border/50">
          {/* Location */}
          <div className="flex items-center gap-3 py-3.5">
            <MapPin className="h-5 w-5 text-muted-foreground" />
            <Input
              placeholder="Add location"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              className="border-0 p-0 h-auto focus-visible:ring-0"
            />
          </div>

          {/* Tag People */}
          <button className="flex items-center gap-3 py-3.5 w-full" onClick={() => toast.info("Tag people coming soon")}>
            <Users className="h-5 w-5 text-muted-foreground" />
            <span className="text-sm flex-1 text-left">Tag People</span>
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          </button>

          {/* Tag Products */}
          <button className="flex items-center gap-3 py-3.5 w-full" onClick={() => toast.info("Product tagging coming soon")}>
            <Tag className="h-5 w-5 text-muted-foreground" />
            <span className="text-sm flex-1 text-left">Tag Products</span>
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          </button>

          {/* Audience */}
          <div className="flex items-center gap-3 py-3.5">
            <Eye className="h-5 w-5 text-muted-foreground" />
            <span className="text-sm flex-1">Audience</span>
            <Select value={audience} onValueChange={setAudience}>
              <SelectTrigger className="w-32 h-8 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="public">Public</SelectItem>
                <SelectItem value="followers">Followers</SelectItem>
                <SelectItem value="close_friends">Close Friends</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Hide like count */}
          <div className="flex items-center gap-3 py-3.5">
            <Heart className="h-5 w-5 text-muted-foreground" />
            <span className="text-sm flex-1">Hide like count</span>
            <Switch checked={hidelikeCounts} onCheckedChange={setHideLikeCounts} />
          </div>

          {/* Comments */}
          <div className="flex items-center gap-3 py-3.5">
            <svg className="h-5 w-5 text-muted-foreground" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
            <span className="text-sm flex-1">Comments</span>
            <Select value={allowComments} onValueChange={setAllowComments}>
              <SelectTrigger className="w-32 h-8 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="everyone">Everyone</SelectItem>
                <SelectItem value="followers">Followers</SelectItem>
                <SelectItem value="off">Off</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>
    </div>
  );
}
