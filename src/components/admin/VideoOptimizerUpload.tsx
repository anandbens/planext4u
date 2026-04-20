import { useRef, useState } from "react";
import { Upload, Loader2, CheckCircle2, Video as VideoIcon, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { compressVideoBrowser } from "@/lib/browser-video-compress";
import { extractVideoThumbnail } from "@/lib/media-compression";
import { uploadToB2 } from "@/lib/b2-upload";

interface VideoOptimizerUploadProps {
  /** Current video URL (if already uploaded) */
  value?: string;
  /** Folder inside the bucket (e.g. "homepage-videos") */
  folder?: string;
  /** Storage bucket to upload into. Defaults to media-library. */
  bucket?: string;
  /** Called once the optimized video + thumb are uploaded. */
  onUploaded: (result: {
    videoUrl: string;
    thumbnailUrl: string;
    durationSeconds: number;
    originalSizeBytes: number;
    optimizedSizeBytes: number;
  }) => void;
  /** Optional explicit clear handler. */
  onClear?: () => void;
}

/**
 * One-click video optimizer for admins.
 *
 * Pipeline (entirely client-side, no server cost):
 * 1. Re-encodes the picked video to ~480p H.264 MP4 at ~1 Mbps using the
 *    browser's MediaRecorder + Canvas pipeline (compressVideoBrowser).
 * 2. Generates a WebP poster thumbnail.
 * 3. Uploads both to the storage bucket with explicit `video/mp4` mime
 *    (fixes the "served as application/octet-stream → mobile won't play" bug)
 *    and a 1-year cache-control header.
 * 4. Returns the public URLs + measured duration so the parent form can
 *    save them to the database.
 */
export function VideoOptimizerUpload({
  value,
  folder = "homepage-videos",
  bucket = "media-library",
  onUploaded,
  onClear,
}: VideoOptimizerUploadProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [stage, setStage] = useState<string>("");
  const [percent, setPercent] = useState(0);
  const [stats, setStats] = useState<{ before: number; after: number } | null>(null);

  const reset = () => {
    setBusy(false);
    setStage("");
    setPercent(0);
  };

  const handleFile = async (file: File) => {
    if (!file.type.startsWith("video/")) {
      toast.error("Please select a video file");
      return;
    }
    if (file.size > 500 * 1024 * 1024) {
      toast.error("Video too large (max 500 MB)");
      return;
    }

    setBusy(true);
    setStats(null);
    setPercent(0);
    setStage("Preparing…");

    try {
      // 1. Re-encode in the browser to 480p H.264 MP4
      const optimized = await compressVideoBrowser(file, (p) => {
        setStage(p.message);
        setPercent(Math.round(p.percent * 0.7));
      });

      // 2. Probe duration from the optimized file
      const durationSeconds = await probeDuration(optimized);

      // 3. Generate poster thumbnail (webp)
      setStage("Generating thumbnail…");
      setPercent(75);
      let thumbBlob: Blob | null = null;
      try {
        thumbBlob = await extractVideoThumbnail(file);
      } catch (err) {
        console.warn("Thumbnail extraction failed:", err);
      }

      // 4. Upload both to Backblaze B2 (replaces Supabase Storage)
      setStage("Uploading optimized video…");
      setPercent(85);

      const baseName = slug(file.name);
      const videoExt = optimized.type.includes("webm") ? "webm" : "mp4";
      const videoMime = videoExt === "webm" ? "video/webm" : "video/mp4";

      const { publicUrl: videoUrl } = await uploadToB2(optimized, {
        folder: `${bucket}/${folder}`,
        filename: `${baseName}.${videoExt}`,
        contentType: videoMime,
      });

      let thumbnailUrl = "";
      if (thumbBlob) {
        try {
          const { publicUrl: thumbUrl } = await uploadToB2(thumbBlob, {
            folder: `${bucket}/${folder}`,
            filename: `${baseName}.webp`,
            contentType: "image/webp",
          });
          thumbnailUrl = thumbUrl;
        } catch (thumbErr) {
          console.warn("Thumbnail upload to B2 failed:", thumbErr);
        }
      }

      // 5. Best-effort: record in media_library (ignore failures)
      try {
        await supabase.from("media_library" as any).insert({
          file_url: videoUrl,
          folder,
          file_name: videoUrl.split("/").pop(),
          mime_type: videoMime,
          file_size_bytes: optimized.size,
          metadata: {
            kind: "video_ad",
            storage_provider: "b2",
            original_size_bytes: file.size,
            duration_seconds: durationSeconds,
            thumbnail_url: thumbnailUrl,
          },
        } as any);
      } catch {
        /* noop */
      }

      setStats({ before: file.size, after: optimized.size });
      setPercent(100);
      setStage("Done");
      toast.success(
        `Video optimized: ${formatSize(file.size)} → ${formatSize(optimized.size)} (${pctSaved(
          file.size,
          optimized.size
        )}% smaller)`
      );

      onUploaded({
        videoUrl,
        thumbnailUrl,
        durationSeconds,
        originalSizeBytes: file.size,
        optimizedSizeBytes: optimized.size,
      });
    } catch (err: any) {
      console.error("[VideoOptimizerUpload]", err);
      toast.error(err?.message || "Video optimization failed");
    } finally {
      // Keep the success state briefly so the user sees the result
      setTimeout(reset, 1200);
    }
  };

  return (
    <div className="space-y-2">
      <input
        ref={fileInputRef}
        type="file"
        accept="video/*"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) void handleFile(f);
          e.currentTarget.value = "";
        }}
      />

      {value && !busy && (
        <div className="flex items-center gap-2 rounded-md border border-border/60 bg-muted/30 p-2">
          <VideoIcon className="h-4 w-4 text-muted-foreground" />
          <a
            href={value}
            target="_blank"
            rel="noreferrer"
            className="flex-1 truncate text-xs text-primary underline"
          >
            {value.split("/").pop()}
          </a>
          {onClear && (
            <button
              type="button"
              className="rounded p-1 text-muted-foreground hover:bg-muted"
              onClick={onClear}
              aria-label="Clear video"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      )}

      {!busy ? (
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="w-full gap-2"
          onClick={() => fileInputRef.current?.click()}
        >
          <Upload className="h-4 w-4" />
          {value ? "Replace & re-optimize video" : "Upload & optimize video"}
        </Button>
      ) : (
        <div className="space-y-1.5 rounded-md border border-border/60 bg-muted/30 p-3">
          <div className="flex items-center gap-2 text-xs">
            {percent >= 100 ? (
              <CheckCircle2 className="h-3.5 w-3.5 text-success" />
            ) : (
              <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />
            )}
            <span className="flex-1 truncate">{stage}</span>
            <span className="font-mono text-muted-foreground">{percent}%</span>
          </div>
          <Progress value={percent} className="h-1.5" />
        </div>
      )}

      {stats && !busy && (
        <p className="text-[11px] text-muted-foreground">
          Optimized: {formatSize(stats.before)} → {formatSize(stats.after)} (
          {pctSaved(stats.before, stats.after)}% smaller, served as <code>video/mp4</code>)
        </p>
      )}
    </div>
  );
}

/* ── helpers ── */

async function probeDuration(file: Blob): Promise<number> {
  const url = URL.createObjectURL(file);
  try {
    return await new Promise<number>((resolve) => {
      const v = document.createElement("video");
      v.preload = "metadata";
      v.muted = true;
      v.onloadedmetadata = () => resolve(Math.round(v.duration || 0));
      v.onerror = () => resolve(0);
      v.src = url;
    });
  } finally {
    URL.revokeObjectURL(url);
  }
}

function slug(name: string): string {
  return name
    .replace(/\.[^.]+$/, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40) || "video";
}

function formatSize(bytes: number): string {
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
  return (bytes / (1024 * 1024)).toFixed(1) + " MB";
}

function pctSaved(before: number, after: number): number {
  if (!before) return 0;
  return Math.max(0, Math.round((1 - after / before) * 100));
}
