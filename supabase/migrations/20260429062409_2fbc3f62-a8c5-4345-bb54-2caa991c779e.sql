
-- 1. Sync customers.profile_photo -> social_profiles.avatar_url
CREATE OR REPLACE FUNCTION public.sync_customer_photo_to_social()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _uid uuid;
BEGIN
  IF NEW.profile_photo IS NULL OR NEW.profile_photo = '' THEN
    RETURN NEW;
  END IF;
  IF TG_OP = 'UPDATE' AND COALESCE(OLD.profile_photo, '') = COALESCE(NEW.profile_photo, '') THEN
    RETURN NEW;
  END IF;

  SELECT user_id INTO _uid
  FROM public.user_roles
  WHERE customer_id = NEW.id AND role = 'customer'
  LIMIT 1;

  IF _uid IS NULL THEN
    RETURN NEW;
  END IF;

  UPDATE public.social_profiles
     SET avatar_url = NEW.profile_photo,
         updated_at = now()
   WHERE user_id = _uid
     AND COALESCE(avatar_url, '') IS DISTINCT FROM NEW.profile_photo;

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'sync_customer_photo_to_social failed: %', SQLERRM;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_customer_photo_to_social ON public.customers;
CREATE TRIGGER trg_sync_customer_photo_to_social
AFTER INSERT OR UPDATE OF profile_photo ON public.customers
FOR EACH ROW
EXECUTE FUNCTION public.sync_customer_photo_to_social();

-- 2. Sync social_profiles.avatar_url -> customers.profile_photo
CREATE OR REPLACE FUNCTION public.sync_social_avatar_to_customer()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _cust_id text;
BEGIN
  IF NEW.avatar_url IS NULL OR NEW.avatar_url = '' THEN
    RETURN NEW;
  END IF;
  IF TG_OP = 'UPDATE' AND COALESCE(OLD.avatar_url, '') = COALESCE(NEW.avatar_url, '') THEN
    RETURN NEW;
  END IF;

  SELECT customer_id INTO _cust_id
  FROM public.user_roles
  WHERE user_id = NEW.user_id AND role = 'customer'
  LIMIT 1;

  IF _cust_id IS NULL THEN
    RETURN NEW;
  END IF;

  UPDATE public.customers
     SET profile_photo = NEW.avatar_url
   WHERE id = _cust_id
     AND COALESCE(profile_photo, '') IS DISTINCT FROM NEW.avatar_url;

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'sync_social_avatar_to_customer failed: %', SQLERRM;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_social_avatar_to_customer ON public.social_profiles;
CREATE TRIGGER trg_sync_social_avatar_to_customer
AFTER INSERT OR UPDATE OF avatar_url ON public.social_profiles
FOR EACH ROW
EXECUTE FUNCTION public.sync_social_avatar_to_customer();

-- 3. Backfill: customers.profile_photo -> social_profiles.avatar_url where social side empty
UPDATE public.social_profiles sp
   SET avatar_url = c.profile_photo,
       updated_at = now()
  FROM public.user_roles ur
  JOIN public.customers c ON c.id = ur.customer_id
 WHERE ur.user_id = sp.user_id
   AND ur.role = 'customer'
   AND COALESCE(sp.avatar_url, '') = ''
   AND COALESCE(c.profile_photo, '') <> '';

-- 4. Backfill: social_profiles.avatar_url -> customers.profile_photo where customer side empty
UPDATE public.customers c
   SET profile_photo = sp.avatar_url
  FROM public.user_roles ur
  JOIN public.social_profiles sp ON sp.user_id = ur.user_id
 WHERE ur.customer_id = c.id
   AND ur.role = 'customer'
   AND COALESCE(c.profile_photo, '') = ''
   AND COALESCE(sp.avatar_url, '') <> '';
