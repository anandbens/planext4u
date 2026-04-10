import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

/**
 * process-video-webhook Edge Function
 *
 * Called by the external FFmpeg processor after video encoding is complete.
 * 
 * Expected POST body:
 * {
 *   job_id: string,
 *   status: "completed" | "failed",
 *   processed_url?: string,        // public URL or storage path of H.265 video
 *   processed_storage_path?: string,
 *   thumbnail_url?: string,
 *   thumbnail_storage_path?: string,
 *   error_message?: string,
 *   file_size?: number,
 *   duration_seconds?: number,
 *   codec?: string,
 *   resolution?: string,
 * }
 *
 * Auth: Bearer token must match VIDEO_PROCESSOR_SECRET
 */

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Validate shared secret
    const PROCESSOR_SECRET = Deno.env.get("VIDEO_PROCESSOR_SECRET");
    if (PROCESSOR_SECRET) {
      const authHeader = req.headers.get("Authorization") || "";
      const token = authHeader.replace(/^Bearer\s+/i, "");
      if (token !== PROCESSOR_SECRET) {
        return new Response(JSON.stringify({ error: "Unauthorized" }), {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    const body = await req.json();
    const {
      job_id,
      status,
      processed_url,
      processed_storage_path,
      thumbnail_url,
      thumbnail_storage_path,
      error_message,
      file_size,
      duration_seconds,
      codec,
      resolution,
    } = body;

    if (!job_id || !status) {
      return new Response(JSON.stringify({ error: "job_id and status are required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const admin = createClient(supabaseUrl, supabaseServiceKey);

    // Fetch existing job
    const { data: job, error: fetchErr } = await admin
      .from("video_processing_jobs")
      .select("id, original_storage_path, metadata")
      .eq("id", job_id)
      .single();

    if (fetchErr || !job) {
      console.error("Job not found:", job_id, fetchErr);
      return new Response(JSON.stringify({ error: "Job not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const metadata = (job.metadata || {}) as Record<string, unknown>;
    const postId = metadata.post_id as string | undefined;

    if (status === "completed" && processed_url) {
      // Update job record
      await admin.from("video_processing_jobs").update({
        status: "completed",
        processed_url,
        processed_storage_path: processed_storage_path || null,
        thumbnail_url: thumbnail_url || null,
        error_message: null,
        metadata: {
          ...metadata,
          file_size,
          duration_seconds,
          codec: codec || "h265",
          resolution: resolution || "480p",
        },
      }).eq("id", job_id);

      // Swap original video URL with processed URL in post media
      if (postId) {
        await swapPostVideoUrl(admin, postId, job.original_storage_path, processed_url, thumbnail_url);
      }

      // Delete original raw file to save storage
      if (job.original_storage_path) {
        const { error: delErr } = await admin.storage
          .from("social-videos")
          .remove([job.original_storage_path]);
        if (delErr) console.warn("Failed to delete original:", delErr.message);
        else console.log("Deleted original:", job.original_storage_path);
      }

      console.log(`Job ${job_id} completed — H.265 video ready`);
    } else if (status === "failed") {
      await admin.from("video_processing_jobs").update({
        status: "failed",
        error_message: error_message || "Processing failed",
      }).eq("id", job_id);

      console.error(`Job ${job_id} failed:`, error_message);
    }

    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("Webhook error:", err);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

/**
 * Replace the original video URL in the social_posts.media JSONB array
 * with the processed H.265 URL, and update the thumbnail if provided.
 */
async function swapPostVideoUrl(
  admin: ReturnType<typeof createClient>,
  postId: string,
  originalStoragePath: string,
  processedUrl: string,
  thumbnailUrl?: string,
) {
  const { data: post, error } = await admin
    .from("social_posts")
    .select("media")
    .eq("id", postId)
    .single();

  if (error || !post) {
    console.warn("Post not found for media swap:", postId);
    return;
  }

  const mediaArr = Array.isArray(post.media) ? [...post.media] : [];
  let updated = false;

  for (let i = 0; i < mediaArr.length; i++) {
    const item = mediaArr[i] as Record<string, unknown>;
    if (item?.type !== "video") continue;

    // Match by URL containing the original storage path
    const itemUrl = String(item.url || "");
    if (itemUrl.includes(originalStoragePath) || itemUrl.includes("social-videos")) {
      mediaArr[i] = {
        ...item,
        url: processedUrl,
        originalUrl: itemUrl, // keep reference
        codec: "h265",
        resolution: "480p",
        ...(thumbnailUrl ? { thumbnailUrl } : {}),
      };
      updated = true;
      break;
    }
  }

  if (updated) {
    await admin.from("social_posts")
      .update({ media: mediaArr })
      .eq("id", postId);
    console.log(`Post ${postId} media updated with processed video URL`);
  }
}
