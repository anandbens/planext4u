-- Canonicalize any leftover non-CDN media URLs in media_library
UPDATE public.media_library
SET file_url = REPLACE(file_url, 'https://cdn.planext4u.com/', 'https://cdn.planext4u.net/')
WHERE file_url LIKE 'https://cdn.planext4u.com/%';

UPDATE public.media_library
SET file_url = REPLACE(file_url, 'https://www.planext4u.net/media-library/', 'https://cdn.planext4u.net/')
WHERE file_url LIKE 'https://www.planext4u.net/media-library/%';

UPDATE public.media_library
SET file_url = REPLACE(file_url, 'https://planext4u.net/media-library/', 'https://cdn.planext4u.net/')
WHERE file_url LIKE 'https://planext4u.net/media-library/%';

-- Backblaze friendly URL form: https://f005.backblazeb2.com/file/<bucket>/<key>
UPDATE public.media_library
SET file_url = regexp_replace(
  file_url,
  '^https?://f[0-9]+\.backblazeb2\.com/file/[^/]+/',
  'https://cdn.planext4u.net/'
)
WHERE file_url ~ '^https?://f[0-9]+\.backblazeb2\.com/file/';