-- ============================================================================
-- Module visibility — backend enforcement
--
-- Single source of truth: `platform_variables.module_<key>_enabled`. When an
-- admin flips a module to "Coming Soon" via the new Module Visibility page,
-- the customer-facing SELECT policies below silently filter out every row,
-- so a determined client that bypasses the React shell still gets nothing.
--
-- Admins, finance and sales staff are NEVER affected — they need to see and
-- manage data even while a module is hidden from customers. Vendors continue
-- to see their own rows so they can finish setup before the module re-opens.
-- ============================================================================

-- ---------- Helper: is this module enabled? ----------
CREATE OR REPLACE FUNCTION public.is_module_enabled(_module_key text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (
      SELECT lower(value) <> 'false'
      FROM public.platform_variables
      WHERE key = 'module_' || _module_key || '_enabled'
      LIMIT 1
    ),
    true   -- default ON when the row is missing
  );
$$;

GRANT EXECUTE ON FUNCTION public.is_module_enabled(text) TO anon, authenticated;

-- =====================================================================
-- SERVICES (module key: services)
-- =====================================================================
DROP POLICY IF EXISTS "Services are publicly readable" ON public.services;
DROP POLICY IF EXISTS "Services public read gated by module flag" ON public.services;
CREATE POLICY "Services public read gated by module flag"
  ON public.services
  FOR SELECT
  USING (
    public.is_module_enabled('services')
    OR public.is_admin_user(auth.uid())
    OR (auth.uid() IS NOT NULL AND vendor_id IN (
      SELECT v.id FROM public.vendors v WHERE v.id::text = auth.uid()::text
    ))
  );

-- =====================================================================
-- CLASSIFIED ADS (module key: classifieds)
-- =====================================================================
DROP POLICY IF EXISTS "Classifieds are publicly readable" ON public.classified_ads;
DROP POLICY IF EXISTS "Anyone can view approved ads" ON public.classified_ads;
DROP POLICY IF EXISTS "Classifieds public read gated by module flag" ON public.classified_ads;
CREATE POLICY "Classifieds public read gated by module flag"
  ON public.classified_ads
  FOR SELECT
  USING (
    public.is_module_enabled('classifieds')
    OR public.is_admin_user(auth.uid())
    OR (auth.uid() IS NOT NULL AND user_id = auth.uid()::text)
  );

-- =====================================================================
-- PROPERTIES (module key: homes)
-- =====================================================================
DROP POLICY IF EXISTS "Properties are publicly readable" ON public.properties;
DROP POLICY IF EXISTS "Anyone can view active properties" ON public.properties;
DROP POLICY IF EXISTS "Properties public read gated by module flag" ON public.properties;
CREATE POLICY "Properties public read gated by module flag"
  ON public.properties
  FOR SELECT
  USING (
    public.is_module_enabled('homes')
    OR public.is_admin_user(auth.uid())
    OR (auth.uid() IS NOT NULL AND user_id = auth.uid()::text)
  );

-- =====================================================================
-- RESTAURANTS (module key: food)
-- =====================================================================
DROP POLICY IF EXISTS "Public reads active restaurants" ON public.restaurants;
DROP POLICY IF EXISTS "Restaurants public read gated by module flag" ON public.restaurants;
CREATE POLICY "Restaurants public read gated by module flag"
  ON public.restaurants
  FOR SELECT
  USING (
    (
      (is_active = true AND public.is_module_enabled('food'))
      OR public.is_admin_user(auth.uid())
      OR (auth.uid() IS NOT NULL AND vendor_id::text = auth.uid()::text)
    )
  );

-- =====================================================================
-- PRODUCTS (module key: shop)
-- =====================================================================
DROP POLICY IF EXISTS "Products are publicly readable" ON public.products;
DROP POLICY IF EXISTS "Products public read gated by module flag" ON public.products;
CREATE POLICY "Products public read gated by module flag"
  ON public.products
  FOR SELECT
  USING (
    public.is_module_enabled('shop')
    OR public.is_admin_user(auth.uid())
    OR (auth.uid() IS NOT NULL AND vendor_id::text = auth.uid()::text)
  );

-- =====================================================================
-- SOCIAL POSTS (module key: socio)
-- Owners always see their own posts so they can clean up if they want.
-- =====================================================================
DO $$
DECLARE _existing record;
BEGIN
  FOR _existing IN
    SELECT polname FROM pg_policy
    WHERE polrelid = 'public.social_posts'::regclass AND polcmd = 'r'
  LOOP
    EXECUTE format('DROP POLICY %I ON public.social_posts', _existing.polname);
  END LOOP;
END $$;

CREATE POLICY "Social posts read gated by module flag"
  ON public.social_posts
  FOR SELECT
  USING (
    public.is_module_enabled('socio')
    OR public.is_admin_user(auth.uid())
    OR (auth.uid() IS NOT NULL AND user_id = auth.uid())
  );
