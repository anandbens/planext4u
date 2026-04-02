
-- 1. Audit logs table
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  table_name text NOT NULL,
  operation text NOT NULL,
  record_id text,
  old_data jsonb,
  new_data jsonb,
  performed_by uuid,
  performed_by_role text DEFAULT '',
  ip_address text DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins read audit_logs" ON public.audit_logs FOR SELECT TO authenticated USING (is_admin_user(auth.uid()));
CREATE POLICY "Auth insert audit_logs" ON public.audit_logs FOR INSERT TO authenticated WITH CHECK (true);

CREATE INDEX idx_audit_logs_table ON public.audit_logs(table_name);
CREATE INDEX idx_audit_logs_created ON public.audit_logs(created_at DESC);

-- 2. Add rejection_reason to products
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS rejection_reason text DEFAULT '';

-- 3. Fix overly permissive RLS policies

-- Orders: restrict to owner, vendor, admin
DROP POLICY IF EXISTS "Orders are publicly readable" ON public.orders;
CREATE POLICY "Users read own orders" ON public.orders FOR SELECT TO authenticated
  USING (customer_id = get_customer_id(auth.uid()) OR is_admin_user(auth.uid()));

-- Settlements: restrict to vendor + admin
DROP POLICY IF EXISTS "Settlements are publicly readable" ON public.settlements;
CREATE POLICY "Vendors and admins read settlements" ON public.settlements FOR SELECT TO authenticated
  USING (vendor_id = get_vendor_id(auth.uid()) OR is_admin_user(auth.uid()));

-- Points transactions: restrict to owner + admin
DROP POLICY IF EXISTS "Points transactions are publicly readable" ON public.points_transactions;
CREATE POLICY "Users read own points" ON public.points_transactions FOR SELECT TO authenticated
  USING (user_id = get_customer_id(auth.uid()) OR is_admin_user(auth.uid()));

-- Referrals: restrict to involved + admin
DROP POLICY IF EXISTS "Referrals are publicly readable" ON public.referrals;
CREATE POLICY "Users read own referrals" ON public.referrals FOR SELECT TO authenticated
  USING (referrer_id = get_customer_id(auth.uid()) OR referee_id = get_customer_id(auth.uid()) OR is_admin_user(auth.uid()));

-- Support tickets: restrict to owner + admin
DROP POLICY IF EXISTS "Support tickets are publicly readable" ON public.support_tickets;
CREATE POLICY "Users read own tickets" ON public.support_tickets FOR SELECT TO authenticated
  USING (customer_id = get_customer_id(auth.uid()) OR is_admin_user(auth.uid()));

-- Property messages: restrict to sender/receiver + admin
DROP POLICY IF EXISTS "Messages are publicly readable" ON public.property_messages;
DROP POLICY IF EXISTS "Property messages are publicly readable" ON public.property_messages;
CREATE POLICY "Users read own messages" ON public.property_messages FOR SELECT TO authenticated
  USING (sender_id = get_customer_id(auth.uid()) OR receiver_id = get_customer_id(auth.uid()) OR is_admin_user(auth.uid()));

-- Property enquiries: restrict to property owner + seeker + admin
DROP POLICY IF EXISTS "Enquiries are publicly readable" ON public.property_enquiries;
CREATE POLICY "Users read own enquiries" ON public.property_enquiries FOR SELECT TO authenticated
  USING (seeker_id = get_customer_id(auth.uid()) OR is_admin_user(auth.uid()));

-- Property visits: restrict
DROP POLICY IF EXISTS "Property visits are publicly readable" ON public.property_visits;
CREATE POLICY "Users read own visits" ON public.property_visits FOR SELECT TO authenticated
  USING (seeker_id = get_customer_id(auth.uid()) OR is_admin_user(auth.uid()));

-- Saved searches: restrict
DROP POLICY IF EXISTS "Saved searches are publicly readable" ON public.saved_searches;
CREATE POLICY "Users read own searches" ON public.saved_searches FOR SELECT TO authenticated
  USING (user_id = get_customer_id(auth.uid()) OR is_admin_user(auth.uid()));

-- Property bookmarks: tighten
DROP POLICY IF EXISTS "Authenticated can manage bookmarks" ON public.property_bookmarks;
DROP POLICY IF EXISTS "Anon can read bookmarks" ON public.property_bookmarks;
CREATE POLICY "Users manage own bookmarks" ON public.property_bookmarks FOR ALL TO authenticated
  USING (user_id = get_customer_id(auth.uid()) OR is_admin_user(auth.uid()))
  WITH CHECK (user_id = get_customer_id(auth.uid()) OR is_admin_user(auth.uid()));

-- Activity logs: restrict
DROP POLICY IF EXISTS "Activity logs are publicly readable" ON public.activity_logs;
DROP POLICY IF EXISTS "Anyone can insert activity logs" ON public.activity_logs;
DROP POLICY IF EXISTS "Anon read activity_logs" ON public.activity_logs;
DROP POLICY IF EXISTS "Anon insert activity_logs" ON public.activity_logs;
CREATE POLICY "Admins read activity_logs" ON public.activity_logs FOR SELECT TO authenticated USING (is_admin_user(auth.uid()));
CREATE POLICY "Auth insert activity_logs" ON public.activity_logs FOR INSERT TO authenticated WITH CHECK (true);

-- Email subscriptions: restrict read to admin
DROP POLICY IF EXISTS "Email subscriptions are publicly readable" ON public.email_subscriptions;
DROP POLICY IF EXISTS "Anon read email_subscriptions" ON public.email_subscriptions;
CREATE POLICY "Admins read email_subscriptions" ON public.email_subscriptions FOR SELECT TO authenticated USING (is_admin_user(auth.uid()));

-- Social follows: tighten insert
DROP POLICY IF EXISTS "Auth insert social_follows" ON public.social_follows;
CREATE POLICY "Auth insert own social_follows" ON public.social_follows FOR INSERT TO authenticated WITH CHECK (follower_id = auth.uid());
