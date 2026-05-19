/**
 * Video upload pipeline for Socio posts.
 *
 * Flow:
 * 1. Upload the original video file to preserve its real audio track
 * 2. Generate client-side thumbnail
 */

import { supabase } from "@/integrations/supabase/client";
import { extractVideoThumbnail } from "@/lib/media-compression";
import { uploadToB2 } from "@/lib/b2-upload";

export type VideoUploadStage = "compressing" | "uploading" | "processing" | "completed" | "error";

export interface VideoUploadProgress {
  stage: VideoUploadStage;
  percent: number;
  message: string;
  jobId?: string;
  processedUrl?: string;
  thumbnailUrl?: string;
}

type ProgressCallback = (p: VideoUploadProgress) => void;

/**
 * Upload a video file without browser re-encoding.
 *
 * The previous canvas + MediaRecorder compression path produced MP4 files with
 * an AAC audio stream that measured as digital silence in uploaded Socio posts.
 * Re-uploading the original file is the only reliable browser-side way to keep
 * camera audio intact across Chrome/WebView/Safari.
 */
export async function uploadVideoWithProcessing(
  file: File,
  userId: string,
  postId: string,
  onProgress?: ProgressCallback
): Promise<{
  jobId: string;
  originalUrl: string;
  thumbnailUrl: string;
}> {
  onProgress?.({ stage: "uploading", percent: 5, message: "Preparing video upload…" });

  const nameExt = file.name.match(/\.([a-z0-9]{2,5})$/i)?.[1]?.toLowerCase();
  const ext = nameExt || (file.type.includes("webm") ? "webm" : file.type.includes("quicktime") ? "mov" : "mp4");
  const videoMime = file.type || (ext === "webm" ? "video/webm" : ext === "mov" ? "video/quicktime" : "video/mp4");

  // Upload original video to Backblaze B2. Do not run browser MediaRecorder
  // compression here: it can preserve a container audio stream while recording
  // silent PCM/AAC samples, which is exactly what caused Socio videos to play
  // with no audible sound.
  onProgress?.({ stage: "uploading", percent: 10, message: "Uploading video with original audio…" });

  let videoUrl = "";
  try {
    const { publicUrl } = await uploadToB2(file, {
      folder: `social-videos/${userId}/${postId}`,
      filename: `video_${Date.now()}.${ext}`,
      contentType: videoMime,
      onProgress: (p) => {
        onProgress?.({
          stage: "uploading",
          percent: 10 + Math.round(p * 0.6),
          message: `Uploading… ${p}%`,
        });
      },
    });
    videoUrl = publicUrl;
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    onProgress?.({ stage: "error", percent: 0, message });
    throw new Error(`Upload failed: ${message}`);
  }

  onProgress?.({ stage: "uploading", percent: 70, message: "Generating thumbnail…" });

  // 3. Generate client-side thumbnail from original file (better quality) → B2
  let thumbnailUrl = "";
  try {
    const thumbBlob = await extractVideoThumbnail(file);
    const { publicUrl } = await uploadToB2(thumbBlob, {
      folder: `social-videos/${userId}/${postId}`,
      filename: "video_thumb.webp",
      contentType: "image/webp",
    });
    thumbnailUrl = publicUrl;
  } catch (err) {
    console.warn("Thumbnail extraction/upload failed:", err);
  }

  onProgress?.({
    stage: "completed",
    percent: 100,
    message: "Video uploaded with audio ✓",
  });

  return {
    jobId: "",
    originalUrl: videoUrl,
    thumbnailUrl,
  };
}

/**
 * Subscribe to realtime updates for a video processing job.
 */
export function subscribeToVideoJob(
  jobId: string,
  onUpdate: (status: string, processedUrl?: string, thumbnailUrl?: string) => void
): () => void {
  const channel = supabase
    .channel(`video-job-${jobId}`)
    .on(
      "postgres_changes",
      {
        event: "UPDATE",
        schema: "public",
        table: "video_processing_jobs",
        filter: `id=eq.${jobId}`,
      },
      (payload) => {
        const row = payload.new as any;
        onUpdate(row.status, row.processed_url, row.thumbnail_url);
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}
