import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

/**
 * process-video Edge Function
 * 
 * Accepts a video processing job request, validates it, creates a DB record,
 * and is ready to dispatch to an external FFmpeg server when available.
 * 
 * Current flow:
 *   1. Client uploads raw video to social-videos bucket
 *   2. Client calls this function with the storage path
 *   3. Function creates a job record with status 'queued'
 *   4. (Future) Function dispatches to FFmpeg server for H.265 480p compression
 *   5. (Future) FFmpeg server calls back to update job status + processed URL
 * 
 * Expected body:
 *   { storage_path: string, post_id: string }
 */

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Validate auth
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Missing authorization" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // User client to get auth user
    const userClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: authErr } = await userClient.auth.getUser();
    if (authErr || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Parse body
    const body = await req.json();
    const { storage_path, post_id } = body;

    if (!storage_path || !post_id) {
      return new Response(JSON.stringify({ error: "storage_path and post_id are required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Build original URL
    const originalUrl = `${supabaseUrl}/storage/v1/object/public/social-videos/${storage_path}`;

    // Service client for DB operations
    const adminClient = createClient(supabaseUrl, supabaseServiceKey);

    // Create job record
    const { data: job, error: insertErr } = await adminClient
      .from("video_processing_jobs")
      .insert({
        user_id: user.id,
        original_url: originalUrl,
        original_storage_path: storage_path,
        status: "queued",
        metadata: {
          post_id,
          target_resolution: "480p",
          target_codec: "h265",
          target_bitrate: "1000k",
        },
      })
      .select("id, status")
      .single();

    if (insertErr) {
      console.error("Job creation error:", insertErr);
      return new Response(JSON.stringify({ error: "Failed to create processing job" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ═══════════════════════════════════════════════════════════
    // FUTURE: Dispatch to external FFmpeg processing server
    // 
    // When you have a processing server (e.g., on Railway/Fly.io),
    // uncomment and configure the following:
    //
    // const PROCESSOR_URL = Deno.env.get("VIDEO_PROCESSOR_URL");
    // if (PROCESSOR_URL) {
    //   await adminClient.from("video_processing_jobs")
    //     .update({ status: "processing" })
    //     .eq("id", job.id);
    //
    //   // Fire-and-forget to processor
    //   fetch(`${PROCESSOR_URL}/process`, {
    //     method: "POST",
    //     headers: {
    //       "Content-Type": "application/json",
    //       "Authorization": `Bearer ${Deno.env.get("VIDEO_PROCESSOR_SECRET")}`,
    //     },
    //     body: JSON.stringify({
    //       job_id: job.id,
    //       source_url: originalUrl,
    //       callback_url: `${supabaseUrl}/functions/v1/process-video-callback`,
    //       options: {
    //         resolution: "854x480",
    //         codec: "libx265",
    //         bitrate: "1000k",
    //         faststart: true,
    //         thumbnail_at: 2.5,
    //       },
    //     }),
    //   }).catch(err => console.error("Dispatch error:", err));
    // }
    // ═══════════════════════════════════════════════════════════

    return new Response(JSON.stringify({
      job_id: job.id,
      status: job.status,
      message: "Video queued for processing",
    }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("process-video error:", err);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
