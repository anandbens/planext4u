/**
 * Video upload pipeline with browser-side H.264 compression
 * and background H.265 processing queue.
 *
 * Flow:
 * 1. Compress video in browser to 480p H.264
 * 2. Upload compressed file
 * 3. Generate client-side thumbnail
 * 4. Queue job for future H.265 re-encode (currently bypassed)
 */

import { supabase } from "@/integrations/supabase/client";
import { extractVideoThumbnail } from "@/lib/media-compression";
import { compressVideoBrowser } from "@/lib/browser-video-compress";
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
 * Upload a video file with browser-based H.264 compression first,
 * then queue for H.265 processing (currently bypassed).
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
  // 1. Browser-side H.264 compression
  onProgress?.({ stage: "compressing", percent: 0, message: "Compressing video in browser…" });

  let compressedFile: File;
  try {
    compressedFile = await compressVideoBrowser(file, (p) => {
      onProgress?.({
        stage: "compressing",
        percent: Math.round(p.percent * 0.4), // 0-40% for compression
        message: p.message,
      });
    });
    console.log(`Video compressed: ${(file.size / 1024 / 1024).toFixed(1)}MB → ${(compressedFile.size / 1024 / 1024).toFixed(1)}MB`);
  } catch (err) {
    console.warn("Browser compression failed, uploading original:", err);
    compressedFile = file;
  }

  // 2. Upload compressed video to Backblaze B2
  onProgress?.({ stage: "uploading", percent: 45, message: "Uploading compressed video…" });

  const ext = compressedFile.name.endsWith(".webm") ? "webm" : "mp4";
  const videoMime = compressedFile.type || (ext === "webm" ? "video/webm" : "video/mp4");

  let videoUrl = "";
  try {
    const { publicUrl } = await uploadToB2(compressedFile, {
      folder: `social-videos/${userId}/${postId}`,
      filename: `video_${Date.now()}.${ext}`,
      contentType: videoMime,
      onProgress: (p) => {
        onProgress?.({
          stage: "uploading",
          percent: 45 + Math.round(p * 0.25),
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

  // 4. Queue job record (H.265 processing bypassed for now)
  onProgress?.({ stage: "uploading", percent: 85, message: "Saving metadata…" });

  let jobId = "";
  try {
    const { data: fnData } = await supabase.functions.invoke("process-video", {
      body: { storage_path: videoUrl, post_id: postId, storage_provider: "b2" },
    });
    jobId = fnData?.job_id || "";
  } catch (err) {
    console.warn("process-video invoke skipped:", err);
  }

  onProgress?.({
    stage: "completed",
    percent: 100,
    message: "Video uploaded ✓",
    jobId,
  });

  return {
    jobId,
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
