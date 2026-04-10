
ALTER TABLE public.video_processing_jobs
  ADD COLUMN IF NOT EXISTS processed_storage_path text,
  ADD COLUMN IF NOT EXISTS thumbnail_storage_path text;
