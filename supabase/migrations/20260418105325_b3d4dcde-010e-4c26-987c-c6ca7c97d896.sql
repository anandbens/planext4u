UPDATE storage.objects
SET metadata = jsonb_set(
  COALESCE(metadata, '{}'::jsonb),
  '{mimetype}',
  '"video/mp4"'::jsonb
)
WHERE bucket_id = 'vendor-assets'
  AND name = 'video-ads/organic-tamilnadu-food.mp4';

UPDATE public.video_ads
SET thumbnail_url = 'https://jhtddsqnpfvjvnfojeea.supabase.co/storage/v1/object/public/vendor-assets/video-ads/organic-tamilnadu-food-thumb.webp'
WHERE id = '978a2391-b1aa-4234-bbc5-1cbae4b35852';