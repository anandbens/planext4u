/**
 * Video upload pipeline with processing queue integration.
 * Uploads raw video → calls process-video edge function → tracks job status via realtime.
 */

import { supabase } from "@/integrations/supabase/client";
import { extractVideoThumbnail } from "@/lib/media-compression";

export type VideoUploadStage = "uploading" | "processing" | "completed" | "error";

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
 * Upload a video file and queue it for background processing.
 * Returns the job ID and original URLs immediately;
 * subscribe to realtime updates on video_processing_jobs for status changes.
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
  // 1. Upload raw video
  onProgress?.({ stage: "uploading", percent: 10, message: "Uploading video…" });

  const storagePath = `${userId}/${postId}/video_${Date.now()}.mp4`;
  const { error: uploadErr } = await supabase.storage
    .from("social-videos")
    .upload(storagePath, file, { contentType: "video/mp4", upsert: true });

  if (uploadErr) {
    onProgress?.({ stage: "error", percent: 0, message: uploadErr.message });
    throw new Error(`Upload failed: ${uploadErr.message}`);
  }

  onProgress?.({ stage: "uploading", percent: 50, message: "Generating thumbnail…" });

  // 2. Generate client-side thumbnail
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

  onProgress?.({ stage: "uploading", percent: 70, message: "Queuing for processing…" });

  // 3. Call process-video edge function
  const { data: fnData, error: fnErr } = await supabase.functions.invoke("process-video", {
    body: { storage_path: storagePath, post_id: postId },
  });

  if (fnErr) {
    console.error("process-video invoke error:", fnErr);
    // Non-fatal: video is still uploaded, just not queued for compression
  }

  const jobId = fnData?.job_id || "";

  const { data: urlData } = supabase.storage
    .from("social-videos")
    .getPublicUrl(storagePath);

  onProgress?.({
    stage: "processing",
    percent: 80,
    message: "Video queued for compression",
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
 * Call the returned unsubscribe function when done.
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
