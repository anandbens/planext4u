-- Rewrite all stored Backblaze direct URLs to use the Cloudflare CDN.
-- Pattern: https://f005.backblazeb2.com/file/planext4u/<key>  →  https://cdn.planext4u.com/<key>

UPDATE public.advertisements         SET image_url        = REPLACE(image_url,        'https://f005.backblazeb2.com/file/planext4u/', 'https://cdn.planext4u.com/') WHERE image_url        LIKE 'https://f005.backblazeb2.com/file/planext4u/%';
UPDATE public.advertisements         SET mobile_image_url = REPLACE(mobile_image_url, 'https://f005.backblazeb2.com/file/planext4u/', 'https://cdn.planext4u.com/') WHERE mobile_image_url LIKE 'https://f005.backblazeb2.com/file/planext4u/%';

UPDATE public.banners                SET desktop_image    = REPLACE(desktop_image,    'https://f005.backblazeb2.com/file/planext4u/', 'https://cdn.planext4u.com/') WHERE desktop_image    LIKE 'https://f005.backblazeb2.com/file/planext4u/%';
UPDATE public.banners                SET mobile_image     = REPLACE(mobile_image,     'https://f005.backblazeb2.com/file/planext4u/', 'https://cdn.planext4u.com/') WHERE mobile_image     LIKE 'https://f005.backblazeb2.com/file/planext4u/%';

UPDATE public.categories             SET image                = REPLACE(image,                'https://f005.backblazeb2.com/file/planext4u/', 'https://cdn.planext4u.com/') WHERE image                LIKE 'https://f005.backblazeb2.com/file/planext4u/%';
UPDATE public.categories             SET banner_image         = REPLACE(banner_image,         'https://f005.backblazeb2.com/file/planext4u/', 'https://cdn.planext4u.com/') WHERE banner_image         LIKE 'https://f005.backblazeb2.com/file/planext4u/%';
UPDATE public.categories             SET promotion_banner_url = REPLACE(promotion_banner_url, 'https://f005.backblazeb2.com/file/planext4u/', 'https://cdn.planext4u.com/') WHERE promotion_banner_url LIKE 'https://f005.backblazeb2.com/file/planext4u/%';

UPDATE public.complaint_messages     SET attachment_url   = REPLACE(attachment_url,   'https://f005.backblazeb2.com/file/planext4u/', 'https://cdn.planext4u.com/') WHERE attachment_url   LIKE 'https://f005.backblazeb2.com/file/planext4u/%';

UPDATE public.customers              SET profile_photo    = REPLACE(profile_photo,    'https://f005.backblazeb2.com/file/planext4u/', 'https://cdn.planext4u.com/') WHERE profile_photo    LIKE 'https://f005.backblazeb2.com/file/planext4u/%';

UPDATE public.delivery_proofs        SET photo_url        = REPLACE(photo_url,        'https://f005.backblazeb2.com/file/planext4u/', 'https://cdn.planext4u.com/') WHERE photo_url        LIKE 'https://f005.backblazeb2.com/file/planext4u/%';

UPDATE public.file_uploads           SET file_url         = REPLACE(file_url,         'https://f005.backblazeb2.com/file/planext4u/', 'https://cdn.planext4u.com/') WHERE file_url         LIKE 'https://f005.backblazeb2.com/file/planext4u/%';

UPDATE public.homepage_banners       SET media_url        = REPLACE(media_url,        'https://f005.backblazeb2.com/file/planext4u/', 'https://cdn.planext4u.com/') WHERE media_url        LIKE 'https://f005.backblazeb2.com/file/planext4u/%';
UPDATE public.homepage_banners       SET mobile_media_url = REPLACE(mobile_media_url, 'https://f005.backblazeb2.com/file/planext4u/', 'https://cdn.planext4u.com/') WHERE mobile_media_url LIKE 'https://f005.backblazeb2.com/file/planext4u/%';

UPDATE public.homepage_section_items SET image_url        = REPLACE(image_url,        'https://f005.backblazeb2.com/file/planext4u/', 'https://cdn.planext4u.com/') WHERE image_url        LIKE 'https://f005.backblazeb2.com/file/planext4u/%';

UPDATE public.media_library          SET file_url         = REPLACE(file_url,         'https://f005.backblazeb2.com/file/planext4u/', 'https://cdn.planext4u.com/') WHERE file_url         LIKE 'https://f005.backblazeb2.com/file/planext4u/%';

UPDATE public.menu_combos            SET image_url        = REPLACE(image_url,        'https://f005.backblazeb2.com/file/planext4u/', 'https://cdn.planext4u.com/') WHERE image_url        LIKE 'https://f005.backblazeb2.com/file/planext4u/%';
UPDATE public.menu_items             SET image_url        = REPLACE(image_url,        'https://f005.backblazeb2.com/file/planext4u/', 'https://cdn.planext4u.com/') WHERE image_url        LIKE 'https://f005.backblazeb2.com/file/planext4u/%';

UPDATE public.message_backups        SET media_url        = REPLACE(media_url,        'https://f005.backblazeb2.com/file/planext4u/', 'https://cdn.planext4u.com/') WHERE media_url        LIKE 'https://f005.backblazeb2.com/file/planext4u/%';

UPDATE public.onboarding_screens     SET image_url        = REPLACE(image_url,        'https://f005.backblazeb2.com/file/planext4u/', 'https://cdn.planext4u.com/') WHERE image_url        LIKE 'https://f005.backblazeb2.com/file/planext4u/%';

UPDATE public.popup_banners          SET image            = REPLACE(image,            'https://f005.backblazeb2.com/file/planext4u/', 'https://cdn.planext4u.com/') WHERE image            LIKE 'https://f005.backblazeb2.com/file/planext4u/%';

UPDATE public.product_variant_images SET image_url        = REPLACE(image_url,        'https://f005.backblazeb2.com/file/planext4u/', 'https://cdn.planext4u.com/') WHERE image_url        LIKE 'https://f005.backblazeb2.com/file/planext4u/%';
UPDATE public.product_variants       SET image_url        = REPLACE(image_url,        'https://f005.backblazeb2.com/file/planext4u/', 'https://cdn.planext4u.com/') WHERE image_url        LIKE 'https://f005.backblazeb2.com/file/planext4u/%';

UPDATE public.products               SET image            = REPLACE(image,            'https://f005.backblazeb2.com/file/planext4u/', 'https://cdn.planext4u.com/') WHERE image            LIKE 'https://f005.backblazeb2.com/file/planext4u/%';
UPDATE public.products               SET thumbnail_image  = REPLACE(thumbnail_image,  'https://f005.backblazeb2.com/file/planext4u/', 'https://cdn.planext4u.com/') WHERE thumbnail_image  LIKE 'https://f005.backblazeb2.com/file/planext4u/%';
UPDATE public.products               SET banner_image     = REPLACE(banner_image,     'https://f005.backblazeb2.com/file/planext4u/', 'https://cdn.planext4u.com/') WHERE banner_image     LIKE 'https://f005.backblazeb2.com/file/planext4u/%';

UPDATE public.profiles               SET avatar_url       = REPLACE(avatar_url,       'https://f005.backblazeb2.com/file/planext4u/', 'https://cdn.planext4u.com/') WHERE avatar_url       LIKE 'https://f005.backblazeb2.com/file/planext4u/%';

UPDATE public.restaurants            SET cover_image      = REPLACE(cover_image,      'https://f005.backblazeb2.com/file/planext4u/', 'https://cdn.planext4u.com/') WHERE cover_image      LIKE 'https://f005.backblazeb2.com/file/planext4u/%';
UPDATE public.restaurants            SET logo_url         = REPLACE(logo_url,         'https://f005.backblazeb2.com/file/planext4u/', 'https://cdn.planext4u.com/') WHERE logo_url         LIKE 'https://f005.backblazeb2.com/file/planext4u/%';
UPDATE public.restaurants            SET banner_url       = REPLACE(banner_url,       'https://f005.backblazeb2.com/file/planext4u/', 'https://cdn.planext4u.com/') WHERE banner_url       LIKE 'https://f005.backblazeb2.com/file/planext4u/%';

UPDATE public.riders                 SET profile_photo    = REPLACE(profile_photo,    'https://f005.backblazeb2.com/file/planext4u/', 'https://cdn.planext4u.com/') WHERE profile_photo    LIKE 'https://f005.backblazeb2.com/file/planext4u/%';

UPDATE public.service_bookings       SET completion_photo_url   = REPLACE(completion_photo_url,   'https://f005.backblazeb2.com/file/planext4u/', 'https://cdn.planext4u.com/') WHERE completion_photo_url   LIKE 'https://f005.backblazeb2.com/file/planext4u/%';
UPDATE public.service_bookings       SET customer_pod_photo_url = REPLACE(customer_pod_photo_url, 'https://f005.backblazeb2.com/file/planext4u/', 'https://cdn.planext4u.com/') WHERE customer_pod_photo_url LIKE 'https://f005.backblazeb2.com/file/planext4u/%';

UPDATE public.service_categories     SET image                = REPLACE(image,                'https://f005.backblazeb2.com/file/planext4u/', 'https://cdn.planext4u.com/') WHERE image                LIKE 'https://f005.backblazeb2.com/file/planext4u/%';
UPDATE public.service_categories     SET promotion_banner_url = REPLACE(promotion_banner_url, 'https://f005.backblazeb2.com/file/planext4u/', 'https://cdn.planext4u.com/') WHERE promotion_banner_url LIKE 'https://f005.backblazeb2.com/file/planext4u/%';
UPDATE public.service_categories     SET banner_image         = REPLACE(banner_image,         'https://f005.backblazeb2.com/file/planext4u/', 'https://cdn.planext4u.com/') WHERE banner_image         LIKE 'https://f005.backblazeb2.com/file/planext4u/%';

UPDATE public.service_vendors        SET shop_photo_url   = REPLACE(shop_photo_url,   'https://f005.backblazeb2.com/file/planext4u/', 'https://cdn.planext4u.com/') WHERE shop_photo_url   LIKE 'https://f005.backblazeb2.com/file/planext4u/%';
UPDATE public.service_vendors        SET background_image = REPLACE(background_image, 'https://f005.backblazeb2.com/file/planext4u/', 'https://cdn.planext4u.com/') WHERE background_image LIKE 'https://f005.backblazeb2.com/file/planext4u/%';

UPDATE public.services               SET image            = REPLACE(image,            'https://f005.backblazeb2.com/file/planext4u/', 'https://cdn.planext4u.com/') WHERE image            LIKE 'https://f005.backblazeb2.com/file/planext4u/%';

UPDATE public.social_audio           SET audio_url        = REPLACE(audio_url,        'https://f005.backblazeb2.com/file/planext4u/', 'https://cdn.planext4u.com/') WHERE audio_url        LIKE 'https://f005.backblazeb2.com/file/planext4u/%';
UPDATE public.social_audio           SET cover_url        = REPLACE(cover_url,        'https://f005.backblazeb2.com/file/planext4u/', 'https://cdn.planext4u.com/') WHERE cover_url        LIKE 'https://f005.backblazeb2.com/file/planext4u/%';

UPDATE public.social_channels        SET cover_url        = REPLACE(cover_url,        'https://f005.backblazeb2.com/file/planext4u/', 'https://cdn.planext4u.com/') WHERE cover_url        LIKE 'https://f005.backblazeb2.com/file/planext4u/%';

UPDATE public.social_conversations   SET group_photo      = REPLACE(group_photo,      'https://f005.backblazeb2.com/file/planext4u/', 'https://cdn.planext4u.com/') WHERE group_photo      LIKE 'https://f005.backblazeb2.com/file/planext4u/%';

UPDATE public.social_highlights      SET cover_url        = REPLACE(cover_url,        'https://f005.backblazeb2.com/file/planext4u/', 'https://cdn.planext4u.com/') WHERE cover_url        LIKE 'https://f005.backblazeb2.com/file/planext4u/%';

UPDATE public.social_messages        SET media_url        = REPLACE(media_url,        'https://f005.backblazeb2.com/file/planext4u/', 'https://cdn.planext4u.com/') WHERE media_url        LIKE 'https://f005.backblazeb2.com/file/planext4u/%';

UPDATE public.social_profiles        SET avatar_url       = REPLACE(avatar_url,       'https://f005.backblazeb2.com/file/planext4u/', 'https://cdn.planext4u.com/') WHERE avatar_url       LIKE 'https://f005.backblazeb2.com/file/planext4u/%';

UPDATE public.social_stories         SET media_url        = REPLACE(media_url,        'https://f005.backblazeb2.com/file/planext4u/', 'https://cdn.planext4u.com/') WHERE media_url        LIKE 'https://f005.backblazeb2.com/file/planext4u/%';

UPDATE public.splash_screens         SET image_url        = REPLACE(image_url,        'https://f005.backblazeb2.com/file/planext4u/', 'https://cdn.planext4u.com/') WHERE image_url        LIKE 'https://f005.backblazeb2.com/file/planext4u/%';

UPDATE public.support_ticket_messages SET attachment_url  = REPLACE(attachment_url,   'https://f005.backblazeb2.com/file/planext4u/', 'https://cdn.planext4u.com/') WHERE attachment_url   LIKE 'https://f005.backblazeb2.com/file/planext4u/%';

UPDATE public.vendors                SET shop_photo_url   = REPLACE(shop_photo_url,   'https://f005.backblazeb2.com/file/planext4u/', 'https://cdn.planext4u.com/') WHERE shop_photo_url   LIKE 'https://f005.backblazeb2.com/file/planext4u/%';
UPDATE public.vendors                SET background_image = REPLACE(background_image, 'https://f005.backblazeb2.com/file/planext4u/', 'https://cdn.planext4u.com/') WHERE background_image LIKE 'https://f005.backblazeb2.com/file/planext4u/%';

UPDATE public.vendor_onboarding_screens SET image_url     = REPLACE(image_url,        'https://f005.backblazeb2.com/file/planext4u/', 'https://cdn.planext4u.com/') WHERE image_url        LIKE 'https://f005.backblazeb2.com/file/planext4u/%';

UPDATE public.video_ads              SET video_url        = REPLACE(video_url,        'https://f005.backblazeb2.com/file/planext4u/', 'https://cdn.planext4u.com/') WHERE video_url        LIKE 'https://f005.backblazeb2.com/file/planext4u/%';
UPDATE public.video_ads              SET thumbnail_url    = REPLACE(thumbnail_url,    'https://f005.backblazeb2.com/file/planext4u/', 'https://cdn.planext4u.com/') WHERE thumbnail_url    LIKE 'https://f005.backblazeb2.com/file/planext4u/%';

-- JSONB / array columns that store multiple media URLs
DO $$ BEGIN
  UPDATE public.products
     SET images = REPLACE(images::text, 'https://f005.backblazeb2.com/file/planext4u/', 'https://cdn.planext4u.com/')::jsonb
   WHERE images::text LIKE '%f005.backblazeb2.com/file/planext4u/%';
EXCEPTION WHEN undefined_column THEN NULL; END $$;

DO $$ BEGIN
  UPDATE public.social_posts
     SET media_urls = REPLACE(media_urls::text, 'https://f005.backblazeb2.com/file/planext4u/', 'https://cdn.planext4u.com/')::jsonb
   WHERE media_urls::text LIKE '%f005.backblazeb2.com/file/planext4u/%';
EXCEPTION WHEN undefined_column THEN NULL; END $$;

DO $$ BEGIN
  UPDATE public.food_orders
     SET items = REPLACE(items::text, 'https://f005.backblazeb2.com/file/planext4u/', 'https://cdn.planext4u.com/')::jsonb
   WHERE items::text LIKE '%f005.backblazeb2.com/file/planext4u/%';
EXCEPTION WHEN undefined_column THEN NULL; END $$;

DO $$ BEGIN
  UPDATE public.orders
     SET items = REPLACE(items::text, 'https://f005.backblazeb2.com/file/planext4u/', 'https://cdn.planext4u.com/')::jsonb
   WHERE items::text LIKE '%f005.backblazeb2.com/file/planext4u/%';
EXCEPTION WHEN undefined_column THEN NULL; END $$;

DO $$ BEGIN
  UPDATE public.classified_ads
     SET images = REPLACE(images::text, 'https://f005.backblazeb2.com/file/planext4u/', 'https://cdn.planext4u.com/')::jsonb
   WHERE images::text LIKE '%f005.backblazeb2.com/file/planext4u/%';
EXCEPTION WHEN undefined_column THEN NULL; END $$;

DO $$ BEGIN
  UPDATE public.properties
     SET images = REPLACE(images::text, 'https://f005.backblazeb2.com/file/planext4u/', 'https://cdn.planext4u.com/')::jsonb
   WHERE images::text LIKE '%f005.backblazeb2.com/file/planext4u/%';
EXCEPTION WHEN undefined_column THEN NULL; END $$;