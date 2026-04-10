import { useState, useRef } from "react";
import { Upload, X, Loader2, ImageIcon } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { compressToWebP } from "@/lib/webp-compress";

const ALLOWED_TYPES = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

interface ImageUploaderProps {
  value: string;
  onChange: (url: string) => void;
  bucket?: string;
  folder?: string;
  label?: string;
  disabled?: boolean;
  className?: string;
  aspectRatio?: string;
}

export function ImageUploader({
  value, onChange, bucket = "vendor-assets", folder = "uploads",
  label = "Upload Image", disabled = false, className = "", aspectRatio = "aspect-video",
}: ImageUploaderProps) {
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!ALLOWED_TYPES.includes(file.type)) { toast.error("Only JPG, PNG, WebP images allowed"); return; }
    if (file.size > MAX_FILE_SIZE) { toast.error("Image must be under 5MB"); return; }

    setUploading(true);
    try {
      const { blob, contentType } = await compressToWebP(file);
      const fileName = `${folder}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.webp`;
      const { error } = await supabase.storage.from(bucket).upload(fileName, blob, { contentType, upsert: false });
      if (error) throw error;

      const { data: urlData } = supabase.storage.from(bucket).getPublicUrl(fileName);
      onChange(urlData.publicUrl);
      toast.success("Image uploaded");
    } catch (err: any) {
      toast.error(err.message || "Upload failed");
    } finally {
      setUploading(false);
      if (e.target) e.target.value = "";
    }
  };

  return (
    <div className={className}>
      <input ref={fileRef} type="file" className="hidden" accept=".jpg,.jpeg,.png,.webp" onChange={handleUpload} disabled={disabled || uploading} />
      
      {value ? (
        <div className="relative group">
          <div className={`${aspectRatio} w-full rounded-lg overflow-hidden bg-secondary/20 border border-border/30`}>
            <img src={value} alt="Preview" className="w-full h-full object-cover" />
          </div>
          {!disabled && (
            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex items-center justify-center gap-2">
              <Button size="sm" variant="secondary" onClick={() => fileRef.current?.click()} disabled={uploading}>
                {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Change"}
              </Button>
              <Button size="sm" variant="destructive" onClick={() => onChange("")}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>
      ) : (
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          disabled={disabled || uploading}
          className={`${aspectRatio} w-full rounded-lg border-2 border-dashed border-border hover:border-primary/50 flex flex-col items-center justify-center gap-2 text-muted-foreground hover:text-primary transition-colors`}
        >
          {uploading ? (
            <Loader2 className="h-6 w-6 animate-spin" />
          ) : (
            <>
              <ImageIcon className="h-6 w-6" />
              <span className="text-xs">{label}</span>
            </>
          )}
        </button>
      )}
    </div>
  );
}
