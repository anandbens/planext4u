-- Phase 5: Order tracking, in-app chat, cancellation reasons

-- 1) In-app chat between customer and rider for an order
CREATE TABLE IF NOT EXISTS public.food_order_chats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id TEXT NOT NULL REFERENCES public.food_orders(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL,
  sender_role TEXT NOT NULL CHECK (sender_role IN ('customer','rider','restaurant','admin')),
  message TEXT NOT NULL,
  is_quick_reply BOOLEAN NOT NULL DEFAULT false,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_food_chats_order ON public.food_order_chats(order_id, created_at);

ALTER TABLE public.food_order_chats ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "chat: order participants read" ON public.food_order_chats;
CREATE POLICY "chat: order participants read" ON public.food_order_chats
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.food_orders o
      WHERE o.id = order_id
        AND (
          o.customer_id = public.get_customer_id(auth.uid())
          OR EXISTS (
            SELECT 1 FROM public.rider_assignments ra
            WHERE ra.order_id = o.id AND ra.rider_id = public.get_rider_id(auth.uid())
          )
          OR EXISTS (
            SELECT 1 FROM public.restaurants r
            WHERE r.id = o.restaurant_id AND r.vendor_id = public.get_vendor_id(auth.uid())
          )
          OR public.is_admin_user(auth.uid())
        )
    )
  );

DROP POLICY IF EXISTS "chat: order participants insert" ON public.food_order_chats;
CREATE POLICY "chat: order participants insert" ON public.food_order_chats
  FOR INSERT TO authenticated
  WITH CHECK (
    sender_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.food_orders o
      WHERE o.id = order_id
        AND (
          o.customer_id = public.get_customer_id(auth.uid())
          OR EXISTS (
            SELECT 1 FROM public.rider_assignments ra
            WHERE ra.order_id = o.id AND ra.rider_id = public.get_rider_id(auth.uid())
          )
          OR EXISTS (
            SELECT 1 FROM public.restaurants r
            WHERE r.id = o.restaurant_id AND r.vendor_id = public.get_vendor_id(auth.uid())
          )
        )
    )
  );

DROP POLICY IF EXISTS "chat: mark read" ON public.food_order_chats;
CREATE POLICY "chat: mark read" ON public.food_order_chats
  FOR UPDATE TO authenticated
  USING (sender_id <> auth.uid())
  WITH CHECK (sender_id <> auth.uid());

-- Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.food_order_chats;
ALTER TABLE public.food_order_chats REPLICA IDENTITY FULL;

-- 2) Cancellation reasons catalog
CREATE TABLE IF NOT EXISTS public.food_cancellation_reasons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reason TEXT NOT NULL,
  applies_to TEXT NOT NULL DEFAULT 'customer' CHECK (applies_to IN ('customer','restaurant','rider','admin')),
  is_active BOOLEAN NOT NULL DEFAULT true,
  display_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.food_cancellation_reasons ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "cancel reasons: read all" ON public.food_cancellation_reasons;
CREATE POLICY "cancel reasons: read all" ON public.food_cancellation_reasons
  FOR SELECT USING (is_active = true);

DROP POLICY IF EXISTS "cancel reasons: admin write" ON public.food_cancellation_reasons;
CREATE POLICY "cancel reasons: admin write" ON public.food_cancellation_reasons
  FOR ALL TO authenticated
  USING (public.is_admin_user(auth.uid()))
  WITH CHECK (public.is_admin_user(auth.uid()));

-- 3) Customer cancel window: allow cancel if status in (placed, accepted) and within 60s of accepted_at
-- Enforced via RPC for safety
CREATE OR REPLACE FUNCTION public.cancel_food_order_by_customer(_order_id TEXT, _reason TEXT)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE o public.food_orders%ROWTYPE;
BEGIN
  SELECT * INTO o FROM public.food_orders WHERE id = _order_id FOR UPDATE;
  IF NOT FOUND THEN RETURN jsonb_build_object('ok', false, 'reason', 'Order not found'); END IF;
  IF o.customer_id <> public.get_customer_id(auth.uid()) THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'Not your order');
  END IF;
  IF o.status NOT IN ('placed','accepted') THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'Cannot cancel after preparation has started');
  END IF;
  IF o.status = 'accepted' AND o.accepted_at IS NOT NULL
     AND now() - o.accepted_at > interval '60 seconds' THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'Cancellation window expired');
  END IF;
  UPDATE public.food_orders
    SET status = 'cancelled', cancellation_reason = _reason, updated_at = now()
    WHERE id = _order_id;
  RETURN jsonb_build_object('ok', true);
END;
$$;
