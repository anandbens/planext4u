
-- 1. Add plan_id and other missing financial cols to service_vendors so admin create/update works
ALTER TABLE public.service_vendors
  ADD COLUMN IF NOT EXISTS plan_id uuid,
  ADD COLUMN IF NOT EXISTS plan_payment_status text NOT NULL DEFAULT 'unpaid',
  ADD COLUMN IF NOT EXISTS plan_transaction_id text DEFAULT '',
  ADD COLUMN IF NOT EXISTS shop_photo_url text DEFAULT '',
  ADD COLUMN IF NOT EXISTS max_redemption_percentage numeric,
  ADD COLUMN IF NOT EXISTS kyc_status text DEFAULT 'not_submitted';

-- 2. Customer notifications table (in-app bell for customer order updates)
CREATE TABLE IF NOT EXISTS public.customer_notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id text NOT NULL,
  type text NOT NULL,
  title text NOT NULL,
  message text NOT NULL,
  reference_id text,
  reference_type text,
  deep_link text,
  is_read boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_customer_notifications_customer ON public.customer_notifications(customer_id, created_at DESC);
ALTER TABLE public.customer_notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Customers see own notifications" ON public.customer_notifications;
CREATE POLICY "Customers see own notifications" ON public.customer_notifications
  FOR SELECT USING (customer_id = public.get_customer_id(auth.uid()));

DROP POLICY IF EXISTS "Customers update own notifications" ON public.customer_notifications;
CREATE POLICY "Customers update own notifications" ON public.customer_notifications
  FOR UPDATE USING (customer_id = public.get_customer_id(auth.uid()));

DROP POLICY IF EXISTS "Admins manage customer notifications" ON public.customer_notifications;
CREATE POLICY "Admins manage customer notifications" ON public.customer_notifications
  FOR ALL USING (public.is_admin_user(auth.uid())) WITH CHECK (public.is_admin_user(auth.uid()));

ALTER PUBLICATION supabase_realtime ADD TABLE public.customer_notifications;

-- 3. Helper that fires FCM push via pg_net to send-push-notification edge fn
CREATE OR REPLACE FUNCTION public.fire_push_to_user(_user_id uuid, _title text, _body text, _deep_link text DEFAULT NULL)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _tokens text[];
  _service_role text;
  _supabase_url text;
BEGIN
  IF _user_id IS NULL THEN RETURN; END IF;
  SELECT ARRAY_AGG(push_token) INTO _tokens
  FROM public.user_devices
  WHERE user_id = _user_id::text AND push_token IS NOT NULL AND push_token <> '';

  IF _tokens IS NULL OR array_length(_tokens,1) IS NULL THEN RETURN; END IF;

  -- Read project URL & service role from vault if available, else fallback to env-style settings
  BEGIN
    SELECT decrypted_secret INTO _service_role FROM vault.decrypted_secrets WHERE name = 'email_queue_service_role_key' LIMIT 1;
  EXCEPTION WHEN OTHERS THEN _service_role := NULL; END;

  IF _service_role IS NULL THEN
    -- No way to authenticate to edge function, abort silently
    RETURN;
  END IF;

  _supabase_url := 'https://jhtddsqnpfvjvnfojeea.supabase.co';

  PERFORM net.http_post(
    url := _supabase_url || '/functions/v1/send-push-notification-internal',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || _service_role
    ),
    body := jsonb_build_object(
      'device_tokens', _tokens,
      'title', _title,
      'body', _body,
      'data', jsonb_build_object('deep_link', COALESCE(_deep_link, ''))
    )
  );
EXCEPTION WHEN OTHERS THEN
  -- Never block the originating transaction
  RETURN;
END;
$$;

-- 4. Extend vendor new-order trigger to also fire FCM push to vendor's auth user
CREATE OR REPLACE FUNCTION public.notify_vendor_new_order()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _vendor_user uuid;
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.vendor_notifications (vendor_id, type, title, message, reference_id, reference_type, deep_link)
    VALUES (
      NEW.vendor_id, 'order',
      'New Order ' || NEW.id,
      'You received a new order worth ₹' || NEW.total::text || ' from ' || COALESCE(NEW.customer_name, 'a customer'),
      NEW.id, 'order', '/vendor/orders'
    );
    SELECT user_id INTO _vendor_user FROM public.user_roles WHERE vendor_id = NEW.vendor_id AND role = 'vendor' LIMIT 1;
    IF _vendor_user IS NOT NULL THEN
      PERFORM public.fire_push_to_user(_vendor_user, 'New Order', 'Order ' || NEW.id || ' • ₹' || NEW.total::text, '/vendor/orders');
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

-- 5. Extend settlement trigger similarly
CREATE OR REPLACE FUNCTION public.notify_vendor_settlement()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _vendor_user uuid;
BEGIN
  SELECT user_id INTO _vendor_user FROM public.user_roles WHERE vendor_id = NEW.vendor_id AND role = 'vendor' LIMIT 1;

  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.vendor_notifications (vendor_id, type, title, message, reference_id, reference_type, deep_link)
    VALUES (NEW.vendor_id, 'settlement', 'New Settlement Created',
      'A settlement of ₹' || COALESCE(NEW.net_amount,0)::text || ' has been created for order ' || COALESCE(NEW.order_id,''),
      NEW.id::text, 'settlement', '/vendor/settlements');
    IF _vendor_user IS NOT NULL THEN
      PERFORM public.fire_push_to_user(_vendor_user, 'Settlement Created', '₹' || COALESCE(NEW.net_amount,0)::text || ' pending', '/vendor/settlements');
    END IF;
  ELSIF TG_OP = 'UPDATE' AND OLD.status <> NEW.status AND NEW.status = 'settled' THEN
    INSERT INTO public.vendor_notifications (vendor_id, type, title, message, reference_id, reference_type, deep_link)
    VALUES (NEW.vendor_id, 'settlement', 'Settlement Paid',
      '₹' || COALESCE(NEW.net_amount,0)::text || ' has been paid out to your bank account',
      NEW.id::text, 'settlement', '/vendor/settlements');
    IF _vendor_user IS NOT NULL THEN
      PERFORM public.fire_push_to_user(_vendor_user, 'Settlement Paid', '₹' || COALESCE(NEW.net_amount,0)::text || ' credited to your bank', '/vendor/settlements');
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

-- 6. Customer order status change → push + in-app notification
CREATE OR REPLACE FUNCTION public.notify_customer_order_status()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _user uuid;
  _label text;
BEGIN
  IF TG_OP = 'UPDATE' AND OLD.status IS DISTINCT FROM NEW.status THEN
    _label := initcap(replace(NEW.status, '_', ' '));
    INSERT INTO public.customer_notifications (customer_id, type, title, message, reference_id, reference_type, deep_link)
    VALUES (NEW.customer_id, 'order_status', 'Order ' || _label,
      'Your order ' || NEW.id || ' is now ' || _label,
      NEW.id, 'order', '/app/orders/' || NEW.id);

    SELECT user_id INTO _user FROM public.user_roles WHERE customer_id = NEW.customer_id AND role = 'customer' LIMIT 1;
    IF _user IS NOT NULL THEN
      PERFORM public.fire_push_to_user(_user, 'Order ' || _label, 'Order ' || NEW.id || ' is now ' || _label, '/app/orders/' || NEW.id);
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_customer_order_status ON public.orders;
CREATE TRIGGER trg_notify_customer_order_status
  AFTER UPDATE ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.notify_customer_order_status();
