-- Fix mime type on existing video ad files so mobile browsers can play them.
-- Storage stores the mimetype inside the metadata JSON; mobile browsers refuse
-- to play videos served as application/octet-stream.
UPDATE storage.objects
SET metadata = jsonb_set(metadata, '{mimetype}', '"video/mp4"'::jsonb, true)
WHERE bucket_id IN ('vendor-assets', 'media-library')
  AND (lower(name) LIKE '%.mp4' OR lower(name) LIKE '%.m4v')
  AND (metadata->>'mimetype') IS DISTINCT FROM 'video/mp4';

UPDATE storage.objects
SET metadata = jsonb_set(metadata, '{mimetype}', '"video/webm"'::jsonb, true)
WHERE bucket_id IN ('vendor-assets', 'media-library')
  AND lower(name) LIKE '%.webm'
  AND (metadata->>'mimetype') IS DISTINCT FROM 'video/webm';

UPDATE storage.objects
SET metadata = jsonb_set(metadata, '{mimetype}', '"video/quicktime"'::jsonb, true)
WHERE bucket_id IN ('vendor-assets', 'media-library')
  AND lower(name) LIKE '%.mov'
  AND (metadata->>'mimetype') IS DISTINCT FROM 'video/quicktime';