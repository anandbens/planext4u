
-- Create video processing jobs table
CREATE TABLE public.video_processing_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  original_url text NOT NULL,
  original_storage_path text,
  processed_url text,
  thumbnail_url text,
  status text NOT NULL DEFAULT 'queued',
  error_message text,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Index for user lookups
CREATE INDEX idx_video_jobs_user ON public.video_processing_jobs(user_id);
CREATE INDEX idx_video_jobs_status ON public.video_processing_jobs(status);

-- Enable RLS
ALTER TABLE public.video_processing_jobs ENABLE ROW LEVEL SECURITY;

-- Users can view their own jobs
CREATE POLICY "Users can view own video jobs"
  ON public.video_processing_jobs FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Users can create jobs for themselves
CREATE POLICY "Users can create own video jobs"
  ON public.video_processing_jobs FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Service role can update (for the edge function / backend processor)
CREATE POLICY "Service role can update video jobs"
  ON public.video_processing_jobs FOR UPDATE
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Auto-update timestamp trigger
CREATE TRIGGER update_video_jobs_updated_at
  BEFORE UPDATE ON public.video_processing_jobs
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Enable realtime for status tracking
ALTER PUBLICATION supabase_realtime ADD TABLE public.video_processing_jobs;
