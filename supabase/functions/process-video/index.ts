import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

/**
 * process-video Edge Function
 *
 * 1. Client uploads raw video to social-videos bucket
 * 2. Client calls this function with the storage path
 * 3. Function creates a job record with status 'queued'
 * 4. Function dispatches to external FFmpeg server for H.265 480p compression
 * 5. FFmpeg server calls process-video-webhook with results
 *
 * Required secrets:
 *   VIDEO_PROCESSOR_URL  – base URL of your FFmpeg server
 *   VIDEO_PROCESSOR_SECRET – shared secret for auth
 */

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Missing authorization" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

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

    const body = await req.json();
    const { storage_path, post_id } = body;

    if (!storage_path || !post_id) {
      return new Response(JSON.stringify({ error: "storage_path and post_id are required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const originalUrl = `${supabaseUrl}/storage/v1/object/public/social-videos/${storage_path}`;
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

    // Browser-side H.264 compression is already done by the client.
    // Mark job as completed immediately — H.265 FFmpeg processing is bypassed for now.
    await adminClient.from("video_processing_jobs")
      .update({
        status: "completed",
        processed_url: originalUrl,
        metadata: {
          post_id,
          codec: "h264",
          resolution: "480p",
          browser_compressed: true,
          note: "H.265 FFmpeg processing bypassed — browser H.264 compression applied",
        },
      })
      .eq("id", job.id);

    console.log(`Job ${job.id} — browser H.264 compressed, FFmpeg bypass active`);

    return new Response(JSON.stringify({
      job_id: job.id,
      status: "completed",
      message: "Video saved with browser H.264 compression (H.265 bypass active)",
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
