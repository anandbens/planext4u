-- Phase 3: Menu & Restaurant Profile enhancements (corrected for text PKs)

-- 1. Restaurant profile: only add what's missing
ALTER TABLE public.restaurants
  ADD COLUMN IF NOT EXISTS banner_url TEXT,
  ADD COLUMN IF NOT EXISTS gallery_urls JSONB DEFAULT '[]'::jsonb;

-- 2. Menu items additions
ALTER TABLE public.menu_items
  ADD COLUMN IF NOT EXISTS dietary_tags TEXT[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS calories INT,
  ADD COLUMN IF NOT EXISTS gallery_urls JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS order_count INT DEFAULT 0;

-- 3. Combo meals (restaurant_id is TEXT to match restaurants.id)
CREATE TABLE IF NOT EXISTS public.menu_combos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id TEXT NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  image_url TEXT,
  item_ids UUID[] NOT NULL DEFAULT '{}',
  original_price NUMERIC NOT NULL DEFAULT 0,
  combo_price NUMERIC NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  display_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.menu_combos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "combos_public_read" ON public.menu_combos FOR SELECT USING (is_active = true);
CREATE POLICY "combos_admin_all" ON public.menu_combos FOR ALL USING (public.is_admin_user(auth.uid())) WITH CHECK (public.is_admin_user(auth.uid()));
CREATE POLICY "combos_vendor_manage" ON public.menu_combos FOR ALL
  USING (EXISTS (SELECT 1 FROM public.restaurants r WHERE r.id = menu_combos.restaurant_id AND r.vendor_id = public.get_vendor_id(auth.uid())))
  WITH CHECK (EXISTS (SELECT 1 FROM public.restaurants r WHERE r.id = menu_combos.restaurant_id AND r.vendor_id = public.get_vendor_id(auth.uid())));

DROP TRIGGER IF EXISTS trg_menu_combos_updated ON public.menu_combos;
CREATE TRIGGER trg_menu_combos_updated BEFORE UPDATE ON public.menu_combos
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 4. Notify-when-available
CREATE TABLE IF NOT EXISTS public.menu_item_notify_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  menu_item_id UUID NOT NULL REFERENCES public.menu_items(id) ON DELETE CASCADE,
  customer_id TEXT NOT NULL,
  notified_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(menu_item_id, customer_id)
);

ALTER TABLE public.menu_item_notify_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "notify_self_manage" ON public.menu_item_notify_requests FOR ALL
  USING (customer_id = public.get_customer_id(auth.uid()))
  WITH CHECK (customer_id = public.get_customer_id(auth.uid()));
CREATE POLICY "notify_admin_read" ON public.menu_item_notify_requests FOR SELECT USING (public.is_admin_user(auth.uid()));

-- 5. Auto-fire notifications when item comes back in stock
CREATE OR REPLACE FUNCTION public.notify_menu_item_back_in_stock()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _req record;
  _user uuid;
BEGIN
  IF TG_OP = 'UPDATE' AND OLD.in_stock = false AND NEW.in_stock = true THEN
    FOR _req IN
      SELECT * FROM public.menu_item_notify_requests
      WHERE menu_item_id = NEW.id AND notified_at IS NULL
    LOOP
      INSERT INTO public.customer_notifications (customer_id, type, title, message, reference_id, reference_type, deep_link)
      VALUES (_req.customer_id, 'menu_item_available', 'Back in stock!',
              NEW.name || ' is available again. Order now.',
              NEW.id::text, 'menu_item', '/app/food/restaurant/' || NEW.restaurant_id);

      SELECT user_id INTO _user FROM public.user_roles WHERE customer_id = _req.customer_id AND role = 'customer' LIMIT 1;
      IF _user IS NOT NULL THEN
        PERFORM public.fire_push_to_user(_user, 'Back in stock!', NEW.name || ' is available again', '/app/food/restaurant/' || NEW.restaurant_id);
      END IF;

      UPDATE public.menu_item_notify_requests SET notified_at = now() WHERE id = _req.id;
    END LOOP;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_menu_item_back_in_stock ON public.menu_items;
CREATE TRIGGER trg_notify_menu_item_back_in_stock
  AFTER UPDATE ON public.menu_items
  FOR EACH ROW EXECUTE FUNCTION public.notify_menu_item_back_in_stock();

-- 6. Bestseller refresh function
CREATE OR REPLACE FUNCTION public.refresh_menu_item_order_counts()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  WITH item_stats AS (
    SELECT
      (item->>'menu_item_id')::uuid AS item_id,
      fo.restaurant_id,
      COUNT(*)::int AS cnt
    FROM public.food_orders fo,
         jsonb_array_elements(fo.items) AS item
    WHERE fo.created_at > now() - interval '30 days'
      AND fo.status IN ('delivered','completed')
      AND item ? 'menu_item_id'
    GROUP BY (item->>'menu_item_id'), fo.restaurant_id
  ),
  ranked AS (
    SELECT item_id, cnt,
           PERCENT_RANK() OVER (PARTITION BY restaurant_id ORDER BY cnt DESC) AS rank_pct
    FROM item_stats
  )
  UPDATE public.menu_items mi
  SET order_count = r.cnt,
      is_bestseller = (r.rank_pct <= 0.2)
  FROM ranked r
  WHERE mi.id = r.item_id;
END;
$$;