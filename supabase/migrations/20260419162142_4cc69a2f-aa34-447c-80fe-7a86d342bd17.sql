-- 1. Add updated_at + reply fields to website_queries
ALTER TABLE public.website_queries
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  ADD COLUMN IF NOT EXISTS admin_reply TEXT,
  ADD COLUMN IF NOT EXISTS replied_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS replied_by TEXT;

DROP TRIGGER IF EXISTS website_queries_set_updated_at ON public.website_queries;
CREATE TRIGGER website_queries_set_updated_at
BEFORE UPDATE ON public.website_queries
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 2. Support ticket messages (two-way thread)
CREATE TABLE IF NOT EXISTS public.support_ticket_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id TEXT NOT NULL REFERENCES public.support_tickets(id) ON DELETE CASCADE,
  sender_id TEXT NOT NULL,
  sender_role TEXT NOT NULL CHECK (sender_role IN ('customer', 'admin')),
  sender_name TEXT,
  message TEXT NOT NULL,
  attachment_url TEXT,
  is_internal BOOLEAN NOT NULL DEFAULT false,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_support_ticket_messages_ticket ON public.support_ticket_messages(ticket_id, created_at);

ALTER TABLE public.support_ticket_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Customers can view their ticket messages"
  ON public.support_ticket_messages FOR SELECT TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.support_tickets t
            WHERE t.id = ticket_id
              AND t.customer_id = public.get_customer_id(auth.uid()))
    AND is_internal = false
  );

CREATE POLICY "Customers can post on their tickets"
  ON public.support_ticket_messages FOR INSERT TO authenticated
  WITH CHECK (
    sender_role = 'customer'
    AND is_internal = false
    AND EXISTS (SELECT 1 FROM public.support_tickets t
                WHERE t.id = ticket_id
                  AND t.customer_id = public.get_customer_id(auth.uid()))
  );

CREATE POLICY "Admins manage all ticket messages"
  ON public.support_ticket_messages FOR ALL TO authenticated
  USING (public.is_admin_user(auth.uid()))
  WITH CHECK (public.is_admin_user(auth.uid()));

-- 3. Complaint messages (two-way thread)
CREATE TABLE IF NOT EXISTS public.complaint_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  complaint_id UUID NOT NULL REFERENCES public.complaints(id) ON DELETE CASCADE,
  sender_id TEXT NOT NULL,
  sender_role TEXT NOT NULL CHECK (sender_role IN ('customer', 'admin')),
  sender_name TEXT,
  message TEXT NOT NULL,
  attachment_url TEXT,
  is_internal BOOLEAN NOT NULL DEFAULT false,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_complaint_messages_complaint ON public.complaint_messages(complaint_id, created_at);

ALTER TABLE public.complaint_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Customers can view their complaint messages"
  ON public.complaint_messages FOR SELECT TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.complaints c
            WHERE c.id = complaint_id
              AND c.user_id = auth.uid())
    AND is_internal = false
  );

CREATE POLICY "Customers can post on their complaints"
  ON public.complaint_messages FOR INSERT TO authenticated
  WITH CHECK (
    sender_role = 'customer'
    AND is_internal = false
    AND EXISTS (SELECT 1 FROM public.complaints c
                WHERE c.id = complaint_id
                  AND c.user_id = auth.uid())
  );

CREATE POLICY "Admins manage all complaint messages"
  ON public.complaint_messages FOR ALL TO authenticated
  USING (public.is_admin_user(auth.uid()))
  WITH CHECK (public.is_admin_user(auth.uid()));

-- 4. Add customer self-create policy on complaints (currently missing)
DROP POLICY IF EXISTS "Users can view their own complaints" ON public.complaints;
CREATE POLICY "Users can view their own complaints"
  ON public.complaints FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_admin_user(auth.uid()));

-- 5. Realtime for both message tables
ALTER PUBLICATION supabase_realtime ADD TABLE public.support_ticket_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.complaint_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.support_tickets;
ALTER PUBLICATION supabase_realtime ADD TABLE public.complaints;

-- 6. Notify customer when admin posts a reply
CREATE OR REPLACE FUNCTION public.notify_customer_on_ticket_message()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _cust_id text; _user uuid;
BEGIN
  IF NEW.sender_role = 'admin' AND NEW.is_internal = false THEN
    SELECT customer_id INTO _cust_id FROM public.support_tickets WHERE id = NEW.ticket_id;
    IF _cust_id IS NOT NULL THEN
      INSERT INTO public.customer_notifications (customer_id, type, title, message, reference_id, reference_type, deep_link)
      VALUES (_cust_id, 'support', 'Support replied to ticket ' || NEW.ticket_id,
              left(NEW.message, 140), NEW.ticket_id, 'support_ticket', '/app/support');
      SELECT user_id INTO _user FROM public.user_roles WHERE customer_id = _cust_id AND role = 'customer' LIMIT 1;
      IF _user IS NOT NULL THEN
        PERFORM public.fire_push_to_user(_user, 'Support reply', left(NEW.message, 100), '/app/support');
      END IF;
    END IF;
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_notify_ticket_message ON public.support_ticket_messages;
CREATE TRIGGER trg_notify_ticket_message
AFTER INSERT ON public.support_ticket_messages
FOR EACH ROW EXECUTE FUNCTION public.notify_customer_on_ticket_message();

CREATE OR REPLACE FUNCTION public.notify_customer_on_complaint_message()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _user uuid;
BEGIN
  IF NEW.sender_role = 'admin' AND NEW.is_internal = false THEN
    SELECT user_id INTO _user FROM public.complaints WHERE id = NEW.complaint_id;
    IF _user IS NOT NULL THEN
      INSERT INTO public.customer_notifications (customer_id, type, title, message, reference_id, reference_type, deep_link)
      SELECT public.get_customer_id(_user), 'complaint', 'Admin replied to your complaint',
             left(NEW.message, 140), NEW.complaint_id::text, 'complaint', '/app/support'
      WHERE public.get_customer_id(_user) IS NOT NULL;
      PERFORM public.fire_push_to_user(_user, 'Complaint reply', left(NEW.message, 100), '/app/support');
    END IF;
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_notify_complaint_message ON public.complaint_messages;
CREATE TRIGGER trg_notify_complaint_message
AFTER INSERT ON public.complaint_messages
FOR EACH ROW EXECUTE FUNCTION public.notify_customer_on_complaint_message();

-- 7. Notify customer on ticket status change
CREATE OR REPLACE FUNCTION public.notify_customer_on_ticket_status()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _user uuid; _label text;
BEGIN
  IF TG_OP = 'UPDATE' AND OLD.status IS DISTINCT FROM NEW.status THEN
    _label := initcap(replace(NEW.status, '_', ' '));
    INSERT INTO public.customer_notifications (customer_id, type, title, message, reference_id, reference_type, deep_link)
    VALUES (NEW.customer_id, 'support', 'Ticket ' || NEW.id || ' is ' || _label,
            'Your support ticket status changed to ' || _label, NEW.id, 'support_ticket', '/app/support');
    SELECT user_id INTO _user FROM public.user_roles WHERE customer_id = NEW.customer_id AND role = 'customer' LIMIT 1;
    IF _user IS NOT NULL THEN
      PERFORM public.fire_push_to_user(_user, 'Ticket ' || _label, 'Ticket ' || NEW.id, '/app/support');
    END IF;
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_notify_ticket_status ON public.support_tickets;
CREATE TRIGGER trg_notify_ticket_status
AFTER UPDATE ON public.support_tickets
FOR EACH ROW EXECUTE FUNCTION public.notify_customer_on_ticket_status();

-- 8. updated_at trigger for support_tickets
DROP TRIGGER IF EXISTS support_tickets_set_updated_at ON public.support_tickets;
CREATE TRIGGER support_tickets_set_updated_at
BEFORE UPDATE ON public.support_tickets
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS complaints_set_updated_at ON public.complaints;
CREATE TRIGGER complaints_set_updated_at
BEFORE UPDATE ON public.complaints
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();