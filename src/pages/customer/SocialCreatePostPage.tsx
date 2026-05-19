import { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Camera, Image, MapPin, Users, Tag, ChevronRight, X, Plus, Eye, Heart, Video, ShoppingBag, Search, Pencil } from "lucide-react";
import ImageEditor from "@/components/social/ImageEditor";
import ProductTagOverlay from "@/components/social/ProductTagOverlay";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { toast } from "sonner";
import { compressImage, validateImageFile, validateVideoFile, validateVideoDuration, formatFileSize, type CompressionProgress } from "@/lib/media-compression";
import { uploadVideoWithProcessing } from "@/lib/video-upload";

const MAX_VIDEO_SIZE_MB = 100;

export const SOCIAL_CATEGORIES = ["Fashion", "Food", "Travel", "Tech", "Fitness", "Art", "Local", "Sports"] as const;

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
  const videoInputRef = useRef<HTMLInputElement>(null);

  const [step, setStep] = useState<'select' | 'edit' | 'details'>('select');
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [previewUrls, setPreviewUrls] = useState<string[]>([]);
  const [fileTypes, setFileTypes] = useState<('image' | 'video')[]>([]);
  const [selectedFilter, setSelectedFilter] = useState("Normal");
  const [caption, setCaption] = useState("");
  const [location, setLocation] = useState("");
  const [audience, setAudience] = useState("public");
  const [category, setCategory] = useState<string>("");
  const [hidelikeCounts, setHideLikeCounts] = useState(false);
  const [allowComments, setAllowComments] = useState("everyone");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<CompressionProgress | null>(null);
  const [linkedProduct, setLinkedProduct] = useState<{ id: string; title: string } | null>(null);
  const [productSearch, setProductSearch] = useState("");
  const [showProductPicker, setShowProductPicker] = useState(false);
  const [taggedPeople, setTaggedPeople] = useState<{ id: string; username: string }[]>([]);
  const [showTagPicker, setShowTagPicker] = useState(false);
  const [tagSearch, setTagSearch] = useState("");
  const [editingImageIndex, setEditingImageIndex] = useState<number | null>(null);
  const [productTagPositions, setProductTagPositions] = useState<{ id: string; title: string; price?: number; image?: string; x: number; y: number }[]>([]);
  const [showPositionTagPicker, setShowPositionTagPicker] = useState(false);
  const [positionTagSearch, setPositionTagSearch] = useState("");

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    const newFiles: File[] = [];
    const newUrls: string[] = [];
    const newTypes: ('image' | 'video')[] = [];
    Array.from(files).slice(0, 20).forEach(file => {
      if (file.type.startsWith('video/')) {
        // Check video size with user-friendly message
        const sizeMB = file.size / (1024 * 1024);
        if (sizeMB > MAX_VIDEO_SIZE_MB) {
          toast.error(`Video is too large (${sizeMB.toFixed(0)}MB). Please record a shorter video under ${MAX_VIDEO_SIZE_MB}MB.`, { duration: 5000 });
          return;
        }
        const err = validateVideoFile(file);
        if (err) { toast.error(err); return; }
        newFiles.push(file);
        newUrls.push(URL.createObjectURL(file));
        newTypes.push('video');
      } else {
        const err = validateImageFile(file);
        if (err) { toast.error(err); return; }
        newFiles.push(file);
        newUrls.push(URL.createObjectURL(file));
        newTypes.push('image');
      }
    });
    setSelectedFiles(prev => [...prev, ...newFiles].slice(0, 20));
    setPreviewUrls(prev => [...prev, ...newUrls].slice(0, 20));
    setFileTypes(prev => [...prev, ...newTypes].slice(0, 20));
    if (newFiles.length > 0) setStep('edit');
  };

  const removeImage = (index: number) => {
    URL.revokeObjectURL(previewUrls[index]);
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
    setPreviewUrls(prev => prev.filter((_, i) => i !== index));
    setFileTypes(prev => prev.filter((_, i) => i !== index));
    if (selectedFiles.length <= 1) setStep('select');
  };

  const handlePublish = async () => {
    if (!customerUser?.id) { toast.error("Please login to post"); return; }
    if (selectedFiles.length === 0) { toast.error("Please select at least one image or video"); return; }
    if (!category) { toast.error("Please select a category before posting"); return; }

    // Verify we have an active session
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      toast.error("Session expired. Please login again.");
      return;
    }
    const authUserId = session.user.id;

    setIsSubmitting(true);

    try {
      const postId = crypto.randomUUID();
      const mediaItems: any[] = [];
      let hasVideo = false;

      for (let i = 0; i < selectedFiles.length; i++) {
        const file = selectedFiles[i];
        const isVideo = fileTypes[i] === 'video';

        if (isVideo) {
          // Check video duration
          try {
            const durErr = await validateVideoDuration(file);
            if (durErr) {
              toast.error(`${durErr} Please record a shorter clip.`, { duration: 5000 });
              continue;
            }
          } catch {
            // Duration check failed, allow upload
          }

          hasVideo = true;

          // Use the video upload pipeline with browser H.264 compression
          const result = await uploadVideoWithProcessing(
            file,
            authUserId,
            postId,
            (p) => setUploadProgress({
              stage: p.stage === 'completed' ? 'complete' : p.stage === 'error' ? 'error' : 'uploading',
              percent: p.percent,
              originalSize: file.size,
              savedText: p.message,
            })
          );

          mediaItems.push({
            type: 'video',
            url: result.originalUrl,
            thumbnailUrl: result.thumbnailUrl,
            processingJobId: result.jobId,
            order: i,
          });

          setUploadProgress({
            stage: 'complete', percent: 100, originalSize: file.size,
            savedText: `Video uploaded with audio ✓`,
          });
        } else {
          // Image compression & upload
          setUploadProgress({ stage: 'compressing', percent: 0, originalSize: file.size });

          let sizes: any;
          let blurPlaceholder: string = '';
          try {
            const result = await compressImage(file, (p) => setUploadProgress(p));
            sizes = result.sizes;
            blurPlaceholder = result.blurPlaceholder;
          } catch (compErr) {
            console.error('Image compression failed:', compErr);
            // Fallback: upload original file as-is to B2
            setUploadProgress({ stage: 'uploading', percent: 50, originalSize: file.size });
            try {
              const { uploadToB2 } = await import('@/lib/b2-upload');
              const { publicUrl } = await uploadToB2(file, {
                folder: `social-media/${authUserId}/social/${postId}/${i}`,
                filename: `original.${file.name.split('.').pop() || 'webp'}`,
                contentType: file.type,
              });
              mediaItems.push({ type: 'photo', url: publicUrl, thumbnailUrl: publicUrl, mediumUrl: publicUrl, blurPlaceholder: '', order: i });
              setUploadProgress({ stage: 'complete', percent: 100, originalSize: file.size, savedText: `Uploaded ✓` });
            } catch (fbErr: any) {
              console.error('Fallback upload error:', fbErr);
              toast.error(`Image upload failed: ${fbErr.message || ''}`);
            }
            continue;
          }

          setUploadProgress({ stage: 'uploading', percent: 50, originalSize: file.size });

          const basePath = `social-media/${authUserId}/social/${postId}/${i}`;
          const { uploadToB2 } = await import('@/lib/b2-upload');

          const uploadBlob = async (blob: Blob, sizeName: string) => {
            const ext = blob.type === 'image/jpeg' ? 'jpg' : 'webp';
            const { publicUrl } = await uploadToB2(blob, {
              folder: basePath,
              filename: `${sizeName}.${ext}`,
              contentType: blob.type || 'image/webp',
            });
            return publicUrl;
          };

          const [thumbUrl, medUrl, lgUrl] = await Promise.all([
            uploadBlob(sizes.thumbnail, 'thumb'),
            uploadBlob(sizes.medium, 'medium'),
            uploadBlob(sizes.large, 'large'),
          ]);

          mediaItems.push({
            type: 'photo',
            url: lgUrl,
            thumbnailUrl: thumbUrl,
            mediumUrl: medUrl,
            blurPlaceholder,
            order: i,
          });

          setUploadProgress({
            stage: 'complete', percent: 100, originalSize: file.size,
            compressedSize: sizes.medium.size,
            savedText: `Optimized: ${formatFileSize(file.size)} → ${formatFileSize(sizes.medium.size)} ✓`,
          });
        }
      }

      if (mediaItems.length === 0) {
        toast.error("No media could be uploaded. Please try again with different files.");
        return;
      }

      const postType = hasVideo ? 'reel' : (mediaItems.length > 1 ? 'carousel' : 'photo');

      // Ensure social profile exists for the user
      const { data: existingProfile } = await supabase.from('social_profiles').select('id').eq('user_id', authUserId).maybeSingle();
      if (!existingProfile) {
        const profileName = customerUser?.name || customerUser?.email?.split('@')[0] || 'User';
        await supabase.from('social_profiles').insert({
          user_id: authUserId,
          username: profileName.toLowerCase().replace(/\s+/g, '_'),
          display_name: profileName,
          avatar_url: null,
        } as any);
      }

      // Build product_tags (with position data) and tagged_users for dedicated columns
      const productTagsData = productTagPositions.length > 0
        ? productTagPositions.map(t => ({ id: t.id, title: t.title, price: t.price, image: t.image, x: t.x, y: t.y }))
        : linkedProduct ? [{ id: linkedProduct.id, title: linkedProduct.title }] : null;
      const taggedUsersData = taggedPeople.length > 0 ? taggedPeople.map(t => ({ id: t.id, username: t.username })) : null;

      const { error } = await supabase.from('social_posts' as any).insert({
        id: postId,
        user_id: authUserId,
        post_type: postType,
        caption,
        category: category || null,
        location_name: location || null,
        media: mediaItems,
        product_tags: productTagsData,
        tagged_users: taggedUsersData,
        audience,
        hide_like_count: hidelikeCounts,
        allow_comments: allowComments,
        status: 'published',
      });

      if (error) {
        console.error('Post insert error:', error);
        toast.error(`Failed to publish: ${error.message}`);
        return;
      }

      toast.success("Post published! 🎉");
      navigate("/app/social");
    } catch (err: any) {
      console.error('Post creation error:', err);
      const msg = err?.message || "Unknown error";
      if (msg.includes('Payload too large') || msg.includes('413')) {
        toast.error("File is too large. Please use a smaller file or record a shorter video.", { duration: 5000 });
      } else {
        toast.error(`Failed to publish post: ${msg}`);
      }
    } finally {
      setIsSubmitting(false);
      setUploadProgress(null);
    }
  };

  // Step 1: Select media
  if (step === 'select') {
    return (
      <div className="min-h-screen bg-background">
        <header className="sticky top-0 z-40 bg-card border-b border-border/30 safe-area-top">
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
            <p className="text-sm text-muted-foreground mb-6">Share photos & videos with your followers</p>
            <p className="text-xs text-muted-foreground mb-4">Videos up to 45 sec / {MAX_VIDEO_SIZE_MB}MB • Images up to 10MB</p>
            <div className="flex gap-3 justify-center">
              <Button onClick={() => fileInputRef.current?.click()} className="gap-2">
                <Image className="h-4 w-4" /> Gallery
              </Button>
              <Button variant="outline" onClick={() => videoInputRef.current?.click()} className="gap-2">
                <Video className="h-4 w-4" /> Video
              </Button>
            </div>
            <input ref={fileInputRef} type="file" accept="image/*,video/*" multiple className="hidden" onChange={handleFileSelect} />
            <input ref={videoInputRef} type="file" accept="video/*" capture="environment" className="hidden" onChange={handleFileSelect} />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <button onClick={() => fileInputRef.current?.click()} className="flex flex-col items-center gap-2 p-4 rounded-xl border border-dashed border-border hover:border-primary transition-colors">
              <Image className="h-7 w-7 text-muted-foreground" />
              <span className="text-xs font-medium">Photo</span>
            </button>
            <button onClick={() => videoInputRef.current?.click()} className="flex flex-col items-center gap-2 p-4 rounded-xl border border-dashed border-border hover:border-primary transition-colors">
              <Video className="h-7 w-7 text-muted-foreground" />
              <span className="text-xs font-medium">Video</span>
            </button>
            <button onClick={() => { const inp = document.createElement('input'); inp.type='file'; inp.accept='image/*'; inp.capture='environment'; inp.onchange=(e:any)=>handleFileSelect(e); inp.click(); }} className="flex flex-col items-center gap-2 p-4 rounded-xl border border-dashed border-border hover:border-primary transition-colors">
              <Camera className="h-7 w-7 text-muted-foreground" />
              <span className="text-xs font-medium">Camera</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Image editor overlay
  if (editingImageIndex !== null && fileTypes[editingImageIndex] === 'image') {
    return (
      <ImageEditor
        imageUrl={previewUrls[editingImageIndex]}
        onSave={(blob) => {
          const newUrl = URL.createObjectURL(blob);
          const newFile = new File([blob], `edited-${editingImageIndex}.webp`, { type: "image/webp" });
          setPreviewUrls(prev => prev.map((u, i) => i === editingImageIndex ? newUrl : u));
          setSelectedFiles(prev => prev.map((f, i) => i === editingImageIndex ? newFile : f));
          setEditingImageIndex(null);
        }}
        onCancel={() => setEditingImageIndex(null)}
      />
    );
  }

  // Step 2: Edit & Filter
  if (step === 'edit') {
    return (
      <div className="min-h-screen bg-background">
        <header className="sticky top-0 z-40 bg-card border-b border-border/30 safe-area-top">
          <div className="flex items-center justify-between px-4 py-3">
            <button onClick={() => setStep('select')}><ArrowLeft className="h-6 w-6" /></button>
            <span className="text-lg font-semibold">Edit</span>
            <Button size="sm" onClick={() => setStep('details')}>Next</Button>
          </div>
        </header>
        <div className="aspect-square bg-black relative" onClick={(e) => {
          if (showPositionTagPicker) return;
          // Allow clicking on image to position product tag
        }}>
          {previewUrls.length > 0 && (
            fileTypes[0] === 'video' ? (
              <video src={previewUrls[0]} className="w-full h-full object-contain" controls muted />
            ) : (
              <img src={previewUrls[0]} alt="" className="w-full h-full object-contain" style={{ filter: FILTER_CSS[selectedFilter] }} />
            )
          )}
          {previewUrls.length > 1 && (
            <div className="absolute top-3 right-3 bg-foreground/60 text-background text-xs font-bold px-2 py-0.5 rounded-full">{previewUrls.length} items</div>
          )}
          {/* Edit button for images */}
          {previewUrls.length > 0 && fileTypes[0] === 'image' && (
            <button
              className="absolute top-3 left-3 h-8 w-8 rounded-full bg-black/60 backdrop-blur-sm flex items-center justify-center hover:bg-black/80 transition"
              onClick={() => setEditingImageIndex(0)}
              title="Edit image (crop, text, emoji)"
            >
              <Pencil className="h-4 w-4 text-white" />
            </button>
          )}
          {/* Product tag positions on image */}
          <ProductTagOverlay
            tags={productTagPositions}
            editable
            onRemove={(id) => setProductTagPositions(prev => prev.filter(t => t.id !== id))}
          />
          {/* Tag product button */}
          {previewUrls.length > 0 && (
            <button
              className="absolute bottom-3 left-3 flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-black/60 backdrop-blur-sm text-white text-xs font-medium hover:bg-black/80 transition"
              onClick={() => setShowPositionTagPicker(true)}
            >
              <ShoppingBag className="h-3.5 w-3.5" />
              Tag Product
            </button>
          )}
        </div>
        {/* Product tag picker modal */}
        {showPositionTagPicker && (
          <div className="p-3 bg-card border-b border-border/30">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-semibold">Tag a product on this content</span>
              <button onClick={() => { setShowPositionTagPicker(false); setPositionTagSearch(""); }}><X className="h-4 w-4" /></button>
            </div>
            <PositionProductPicker
              search={positionTagSearch}
              onSearchChange={setPositionTagSearch}
              onSelect={(p) => {
                setProductTagPositions(prev => [...prev, { ...p, x: 50, y: 50 }]);
                setLinkedProduct(p);
                setShowPositionTagPicker(false);
                setPositionTagSearch("");
              }}
            />
            <p className="text-[10px] text-muted-foreground mt-2">Tap a product to place a shopping sticker. Drag it to reposition.</p>
          </div>
        )}
        {previewUrls.length > 1 && (
          <div className="flex gap-2 p-3 overflow-x-auto bg-card border-b border-border/30">
            {previewUrls.map((url, i) => (
              <div key={i} className="relative shrink-0">
                {fileTypes[i] === 'video' ? (
                  <div className="h-16 w-16 rounded bg-muted flex items-center justify-center">
                    <Video className="h-6 w-6 text-muted-foreground" />
                  </div>
                ) : (
                  <img src={url} alt="" className="h-16 w-16 rounded object-cover" style={{ filter: FILTER_CSS[selectedFilter] }} />
                )}
                <button onClick={() => removeImage(i)} className="absolute -top-1 -right-1 h-5 w-5 bg-destructive rounded-full flex items-center justify-center">
                  <X className="h-3 w-3 text-destructive-foreground" />
                </button>
                {fileTypes[i] === 'image' && (
                  <button onClick={() => setEditingImageIndex(i)} className="absolute bottom-0 right-0 h-5 w-5 bg-black/60 rounded-full flex items-center justify-center">
                    <Pencil className="h-2.5 w-2.5 text-white" />
                  </button>
                )}
              </div>
            ))}
            <button onClick={() => fileInputRef.current?.click()} className="h-16 w-16 rounded border-2 border-dashed border-border flex items-center justify-center shrink-0">
              <Plus className="h-5 w-5 text-muted-foreground" />
            </button>
            <input ref={fileInputRef} type="file" accept="image/*,video/*" multiple className="hidden" onChange={handleFileSelect} />
          </div>
        )}
        <div className="p-3">
          <p className="text-sm font-semibold mb-3">Filters</p>
          <div className="flex gap-3 overflow-x-auto scrollbar-hide pb-2">
            {FILTERS.map(filter => (
              <button key={filter} onClick={() => setSelectedFilter(filter)}
                className={`flex flex-col items-center gap-1.5 shrink-0 ${selectedFilter === filter ? 'opacity-100' : 'opacity-60'}`}>
                <div className={`h-16 w-16 rounded-lg overflow-hidden border-2 ${selectedFilter === filter ? 'border-primary' : 'border-transparent'}`}>
                  {previewUrls[0] && fileTypes[0] !== 'video' && <img src={previewUrls[0]} alt="" className="h-full w-full object-cover" style={{ filter: FILTER_CSS[filter] }} />}
                  {previewUrls[0] && fileTypes[0] === 'video' && <div className="h-full w-full bg-muted flex items-center justify-center"><Video className="h-4 w-4" /></div>}
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
      <header className="sticky top-0 z-40 bg-card border-b border-border/30 safe-area-top">
        <div className="flex items-center justify-between px-4 py-3">
          <button onClick={() => setStep('edit')}><ArrowLeft className="h-6 w-6" /></button>
          <span className="text-lg font-semibold">New Post</span>
          <Button size="sm" onClick={handlePublish} disabled={isSubmitting}>
            {isSubmitting ? "Posting..." : "Share"}
          </Button>
        </div>
      </header>

      {/* Upload progress */}
      {uploadProgress && (
        <div className="px-4 py-3 bg-muted/50 border-b border-border/30">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-medium capitalize">{uploadProgress.stage === 'compressing' ? 'Optimizing your media...' : uploadProgress.stage === 'uploading' ? 'Uploading...' : uploadProgress.savedText || 'Complete'}</span>
            <span className="text-xs text-muted-foreground">{uploadProgress.percent}%</span>
          </div>
          <Progress value={uploadProgress.percent} className="h-1.5" />
        </div>
      )}

      <div className="p-4 space-y-4">
        <div className="flex gap-3">
          <div className="h-12 w-12 rounded-lg overflow-hidden shrink-0">
            {previewUrls[0] && fileTypes[0] !== 'video' && <img src={previewUrls[0]} alt="" className="h-full w-full object-cover" style={{ filter: FILTER_CSS[selectedFilter] }} />}
            {previewUrls[0] && fileTypes[0] === 'video' && <div className="h-full w-full bg-muted flex items-center justify-center rounded-lg"><Video className="h-5 w-5 text-muted-foreground" /></div>}
          </div>
          <Textarea placeholder="Write a caption..." value={caption} onChange={(e) => setCaption(e.target.value.slice(0, 2200))}
            className="min-h-[100px] border-0 resize-none p-0 focus-visible:ring-0" />
        </div>
        <p className="text-xs text-muted-foreground text-right">{caption.length}/2200</p>

        <div className="divide-y divide-border/50">
          <div className="flex items-center gap-3 py-3.5">
            <Tag className="h-5 w-5 text-muted-foreground" />
            <span className="text-sm flex-1">Category <span className="text-destructive">*</span></span>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger className="w-36 h-8 text-xs"><SelectValue placeholder="Select" /></SelectTrigger>
              <SelectContent>
                {SOCIAL_CATEGORIES.map(c => (
                  <SelectItem key={c} value={c}>{c}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center gap-3 py-3.5">
            <MapPin className="h-5 w-5 text-muted-foreground" />
            <Input placeholder="Add location" value={location} onChange={(e) => setLocation(e.target.value)} className="border-0 p-0 h-auto focus-visible:ring-0" />
          </div>
          <button className="flex items-center gap-3 py-3.5 w-full" onClick={() => setShowTagPicker(!showTagPicker)}>
            <Users className="h-5 w-5 text-muted-foreground" />
            <span className="text-sm flex-1 text-left">
              {taggedPeople.length > 0 ? `${taggedPeople.length} tagged` : 'Tag People'}
            </span>
            {taggedPeople.length > 0 ? (
              <button onClick={(e) => { e.stopPropagation(); setTaggedPeople([]); }} className="text-destructive"><X className="h-4 w-4" /></button>
            ) : (
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            )}
          </button>
          {showTagPicker && (
            <PeopleTagPicker
              search={tagSearch}
              onSearchChange={setTagSearch}
              selectedIds={taggedPeople.map(t => t.id)}
              onToggle={(user) => {
                setTaggedPeople(prev => {
                  const exists = prev.find(t => t.id === user.id);
                  if (exists) return prev.filter(t => t.id !== user.id);
                  return [...prev, user];
                });
              }}
              currentUserId={customerUser?.id || ''}
            />
          )}
          <button className="flex items-center gap-3 py-3.5 w-full" onClick={() => setShowProductPicker(!showProductPicker)}>
            <ShoppingBag className="h-5 w-5 text-muted-foreground" />
            <span className="text-sm flex-1 text-left">
              {linkedProduct ? `🔗 ${linkedProduct.title}` : 'Link Product'}
            </span>
            {linkedProduct ? (
              <button onClick={(e) => { e.stopPropagation(); setLinkedProduct(null); }} className="text-destructive"><X className="h-4 w-4" /></button>
            ) : (
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            )}
          </button>
          {showProductPicker && (
            <ProductSearchPicker
              search={productSearch}
              onSearchChange={setProductSearch}
              onSelect={(p) => { setLinkedProduct(p); setShowProductPicker(false); setProductSearch(""); }}
            />
          )}
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
          <div className="flex items-center gap-3 py-3.5">
            <Heart className="h-5 w-5 text-muted-foreground" />
            <span className="text-sm flex-1">Hide like count</span>
            <Switch checked={hidelikeCounts} onCheckedChange={setHideLikeCounts} />
          </div>
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

function ProductSearchPicker({ search, onSearchChange, onSelect }: { search: string; onSearchChange: (v: string) => void; onSelect: (p: { id: string; title: string }) => void }) {
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const doSearch = async (q: string) => {
    onSearchChange(q);
    if (q.length < 2) { setResults([]); return; }
    setLoading(true);
    const { data } = await supabase.from('products').select('id, title, image, price').eq('status', 'active').ilike('title', `%${q}%`).limit(10);
    setResults(data || []);
    setLoading(false);
  };

  return (
    <div className="border border-border/50 rounded-lg p-3 space-y-2 bg-muted/30">
      <div className="relative">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Search products..." value={search} onChange={(e) => doSearch(e.target.value)} className="pl-8 h-9 text-sm" />
      </div>
      {loading && <p className="text-xs text-muted-foreground">Searching...</p>}
      {results.map(p => (
        <button key={p.id} onClick={() => onSelect({ id: p.id, title: p.title })} className="flex items-center gap-2 w-full p-2 rounded-lg hover:bg-accent text-left">
          <div className="h-10 w-10 rounded bg-secondary/30 overflow-hidden shrink-0">
            {p.image ? <img src={p.image} alt="" className="h-full w-full object-cover" /> : <ShoppingBag className="h-5 w-5 m-auto mt-2.5 text-muted-foreground" />}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{p.title}</p>
            <p className="text-xs text-muted-foreground">₹{p.price?.toLocaleString()}</p>
          </div>
        </button>
      ))}
      {search.length >= 2 && !loading && results.length === 0 && <p className="text-xs text-muted-foreground text-center py-2">No products found</p>}
    </div>
  );
}

function PeopleTagPicker({ search, onSearchChange, selectedIds, onToggle, currentUserId }: {
  search: string; onSearchChange: (v: string) => void;
  selectedIds: string[];
  onToggle: (user: { id: string; username: string }) => void;
  currentUserId: string;
}) {
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  // Search all social profiles (not just followers) so tagging works for everyone
  const doSearch = async (q: string) => {
    onSearchChange(q);
    if (q.length < 2) { setResults([]); return; }
    setLoading(true);
    // Also search customers table as fallback for users without social profiles
    const { data: profiles } = await supabase.from('social_profiles').select('user_id, username, display_name, avatar_url')
      .neq('user_id', currentUserId)
      .or(`username.ilike.%${q}%,display_name.ilike.%${q}%`)
      .limit(10);
    
    if (profiles && profiles.length > 0) {
      setResults(profiles);
      setLoading(false);
      return;
    }

    // Fallback: search customers table
    const { data: customers } = await supabase.from('customers').select('id, name, profile_photo')
      .neq('id', currentUserId)
      .ilike('name', `%${q}%`)
      .limit(10);
    const mapped = (customers || []).map((c: any) => ({
      user_id: c.id,
      username: c.name.toLowerCase().replace(/\s+/g, '_'),
      display_name: c.name,
      avatar_url: c.profile_photo,
    }));
    setResults(mapped);
    setLoading(false);
  };

  return (
    <div className="border border-border/50 rounded-lg p-3 space-y-2 bg-muted/30">
      <div className="relative">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Search people..." value={search} onChange={(e) => doSearch(e.target.value)} className="pl-8 h-9 text-sm" />
      </div>
      {loading && <p className="text-xs text-muted-foreground">Searching...</p>}
      {results.map((p: any) => {
        const isSelected = selectedIds.includes(p.user_id);
        return (
          <button key={p.user_id} onClick={() => onToggle({ id: p.user_id, username: p.display_name || p.username })}
            className={`flex items-center gap-2 w-full p-2 rounded-lg hover:bg-accent text-left ${isSelected ? 'bg-primary/10' : ''}`}>
            <div className="h-8 w-8 rounded-full bg-muted overflow-hidden shrink-0 flex items-center justify-center">
              {p.avatar_url ? <img src={p.avatar_url} alt="" className="w-full h-full object-cover" /> :
                <span className="text-xs font-bold">{(p.display_name || p.username || 'U').charAt(0).toUpperCase()}</span>}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{p.display_name || p.username}</p>
              <p className="text-xs text-muted-foreground">@{p.username}</p>
            </div>
            {isSelected && <span className="text-primary text-xs font-semibold">✓</span>}
          </button>
        );
      })}
      {search.length >= 2 && !loading && results.length === 0 && <p className="text-xs text-muted-foreground text-center py-2">No people found</p>}
    </div>
  );
}

function PositionProductPicker({ search, onSearchChange, onSelect }: { search: string; onSearchChange: (v: string) => void; onSelect: (p: { id: string; title: string; price?: number; image?: string }) => void }) {
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const doSearch = async (q: string) => {
    onSearchChange(q);
    if (q.length < 2) { setResults([]); return; }
    setLoading(true);
    const { data } = await supabase.from('products').select('id, title, image, price, socio_shopping_icon').eq('status', 'active').ilike('title', `%${q}%`).limit(10);
    setResults(data || []);
    setLoading(false);
  };

  return (
    <div className="space-y-2">
      <div className="relative">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Search products to tag..." value={search} onChange={(e) => doSearch(e.target.value)} className="pl-8 h-9 text-sm" />
      </div>
      {loading && <p className="text-xs text-muted-foreground">Searching...</p>}
      {results.map((p: any) => (
        <button key={p.id} onClick={() => onSelect({ id: p.id, title: p.title, price: p.price, image: p.socio_shopping_icon || p.image })} className="flex items-center gap-2 w-full p-2 rounded-lg hover:bg-accent text-left">
          <div className="h-10 w-10 rounded bg-secondary/30 overflow-hidden shrink-0">
            {(p.socio_shopping_icon || p.image) ? <img src={p.socio_shopping_icon || p.image} alt="" className="h-full w-full object-cover" /> : <ShoppingBag className="h-5 w-5 m-auto mt-2.5 text-muted-foreground" />}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{p.title}</p>
            <p className="text-xs text-muted-foreground">₹{p.price?.toLocaleString()}</p>
          </div>
          <Tag className="h-4 w-4 text-primary" />
        </button>
      ))}
      {search.length >= 2 && !loading && results.length === 0 && <p className="text-xs text-muted-foreground text-center py-2">No products found</p>}
    </div>
  );
}
