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

  // 2. Upload compressed video
  onProgress?.({ stage: "uploading", percent: 45, message: "Uploading compressed video…" });

  const ext = compressedFile.name.endsWith(".mp4") ? "mp4" : "webm";
  const storagePath = `${userId}/${postId}/video_${Date.now()}.${ext}`;
  const { error: uploadErr } = await supabase.storage
    .from("social-videos")
    .upload(storagePath, compressedFile, {
      contentType: compressedFile.type || "video/mp4",
      upsert: true,
    });

  if (uploadErr) {
    onProgress?.({ stage: "error", percent: 0, message: uploadErr.message });
    throw new Error(`Upload failed: ${uploadErr.message}`);
  }

  onProgress?.({ stage: "uploading", percent: 70, message: "Generating thumbnail…" });

  // 3. Generate client-side thumbnail from original file (better quality)
  let thumbnailUrl = "";
  try {
    const thumbBlob = await extractVideoThumbnail(file);
    const thumbPath = `${userId}/${postId}/video_thumb.webp`;
    await supabase.storage
      .from("social-media")
      .upload(thumbPath, thumbBlob, { contentType: "image/webp", upsert: true });
    const { data: tData } = await supabase.storage
      .from("social-media")
      .createSignedUrl(thumbPath, 60 * 60 * 24 * 365);
    thumbnailUrl = tData?.signedUrl || "";
  } catch (err) {
    console.warn("Thumbnail extraction failed:", err);
  }

  // 4. Queue job record (H.265 processing bypassed for now)
  onProgress?.({ stage: "uploading", percent: 85, message: "Saving metadata…" });

  let jobId = "";
  try {
    const { data: fnData } = await supabase.functions.invoke("process-video", {
      body: { storage_path: storagePath, post_id: postId },
    });
    jobId = fnData?.job_id || "";
  } catch (err) {
    console.warn("process-video invoke skipped:", err);
  }

  const { data: urlData } = supabase.storage
    .from("social-videos")
    .getPublicUrl(storagePath);

  onProgress?.({
    stage: "completed",
    percent: 100,
    message: "Video uploaded (H.264 compressed) ✓",
    jobId,
  });

  return {
    jobId,
    originalUrl: urlData?.publicUrl || "",
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
