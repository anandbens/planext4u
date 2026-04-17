-- Add customer notes to orders for both products and services
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS customer_notes text DEFAULT '';

-- Add to service_bookings as well if exists
ALTER TABLE IF EXISTS public.service_bookings ADD COLUMN IF NOT EXISTS customer_notes text DEFAULT '';

-- Vendor notifications table
CREATE TABLE IF NOT EXISTS public.vendor_notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_id text NOT NULL,
  type text NOT NULL DEFAULT 'order',
  title text NOT NULL,
  message text NOT NULL DEFAULT '',
  reference_id text,
  reference_type text,
  deep_link text,
  is_read boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_vendor_notifications_vendor ON public.vendor_notifications(vendor_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_vendor_notifications_unread ON public.vendor_notifications(vendor_id) WHERE is_read = false;

ALTER TABLE public.vendor_notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Vendors view own notifications" ON public.vendor_notifications;
CREATE POLICY "Vendors view own notifications" ON public.vendor_notifications
  FOR SELECT USING (vendor_id = public.get_vendor_id(auth.uid()) OR public.is_admin_user(auth.uid()));

DROP POLICY IF EXISTS "Vendors update own notifications" ON public.vendor_notifications;
CREATE POLICY "Vendors update own notifications" ON public.vendor_notifications
  FOR UPDATE USING (vendor_id = public.get_vendor_id(auth.uid()));

DROP POLICY IF EXISTS "System inserts vendor notifications" ON public.vendor_notifications;
CREATE POLICY "System inserts vendor notifications" ON public.vendor_notifications
  FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Vendors delete own notifications" ON public.vendor_notifications;
CREATE POLICY "Vendors delete own notifications" ON public.vendor_notifications
  FOR DELETE USING (vendor_id = public.get_vendor_id(auth.uid()));

-- Helper to create vendor notifications (used by client when triggers aren't suitable)
CREATE OR REPLACE FUNCTION public.create_vendor_notification(
  _vendor_id text,
  _type text,
  _title text,
  _message text,
  _reference_id text DEFAULT NULL,
  _reference_type text DEFAULT NULL,
  _deep_link text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  notif_id uuid;
BEGIN
  INSERT INTO public.vendor_notifications (vendor_id, type, title, message, reference_id, reference_type, deep_link)
  VALUES (_vendor_id, _type, _title, _message, _reference_id, _reference_type, _deep_link)
  RETURNING id INTO notif_id;
  RETURN notif_id;
END;
$$;

-- Trigger: notify vendor on new order
CREATE OR REPLACE FUNCTION public.notify_vendor_new_order()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.vendor_notifications (vendor_id, type, title, message, reference_id, reference_type, deep_link)
    VALUES (
      NEW.vendor_id,
      'order',
      'New Order ' || NEW.id,
      'You received a new order worth ₹' || NEW.total::text || ' from ' || COALESCE(NEW.customer_name, 'a customer'),
      NEW.id,
      'order',
      '/vendor/orders'
    );
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_vendor_new_order ON public.orders;
CREATE TRIGGER trg_notify_vendor_new_order
  AFTER INSERT ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.notify_vendor_new_order();

-- Trigger: notify vendor on settlement created or settled
CREATE OR REPLACE FUNCTION public.notify_vendor_settlement()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.vendor_notifications (vendor_id, type, title, message, reference_id, reference_type, deep_link)
    VALUES (
      NEW.vendor_id,
      'settlement',
      'New Settlement Created',
      'A settlement of ₹' || COALESCE(NEW.net_amount, 0)::text || ' has been created for order ' || COALESCE(NEW.order_id, ''),
      NEW.id::text,
      'settlement',
      '/vendor/settlements'
    );
  ELSIF TG_OP = 'UPDATE' AND OLD.status <> NEW.status AND NEW.status = 'settled' THEN
    INSERT INTO public.vendor_notifications (vendor_id, type, title, message, reference_id, reference_type, deep_link)
    VALUES (
      NEW.vendor_id,
      'settlement',
      'Settlement Paid',
      '₹' || COALESCE(NEW.net_amount, 0)::text || ' has been paid out to your bank account',
      NEW.id::text,
      'settlement',
      '/vendor/settlements'
    );
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_vendor_settlement ON public.settlements;
CREATE TRIGGER trg_notify_vendor_settlement
  AFTER INSERT OR UPDATE ON public.settlements
  FOR EACH ROW EXECUTE FUNCTION public.notify_vendor_settlement();

-- Enable realtime for vendor_notifications
ALTER TABLE public.vendor_notifications REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.vendor_notifications;