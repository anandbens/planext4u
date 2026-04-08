
-- Reviews table
CREATE TABLE public.reviews (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  user_name TEXT,
  entity_type TEXT NOT NULL CHECK (entity_type IN ('product', 'service')),
  entity_id TEXT NOT NULL,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment TEXT,
  booking_id UUID,
  order_id TEXT,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'hidden', 'flagged')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read reviews" ON public.reviews FOR SELECT USING (true);
CREATE POLICY "Authenticated users can create reviews" ON public.reviews FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own reviews" ON public.reviews FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own reviews" ON public.reviews FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE INDEX idx_reviews_entity ON public.reviews (entity_type, entity_id);
CREATE INDEX idx_reviews_user ON public.reviews (user_id);

-- Complaints table
CREATE TABLE public.complaints (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  user_name TEXT,
  entity_type TEXT NOT NULL CHECK (entity_type IN ('product', 'service', 'order', 'delivery', 'vendor', 'general')),
  entity_id TEXT,
  booking_id UUID,
  order_id TEXT,
  category TEXT NOT NULL DEFAULT 'general' CHECK (category IN ('quality', 'delay', 'damage', 'wrong_item', 'refund', 'behavior', 'safety', 'billing', 'general')),
  subject TEXT NOT NULL,
  description TEXT NOT NULL,
  images JSON,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'awaiting_response', 'resolved', 'closed', 'escalated')),
  priority TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'critical')),
  assigned_to TEXT,
  resolution_notes TEXT,
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.complaints ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own complaints" ON public.complaints FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Admins can view all complaints" ON public.complaints FOR SELECT TO authenticated USING (public.is_admin_user(auth.uid()));
CREATE POLICY "Users can create complaints" ON public.complaints FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Admins can update complaints" ON public.complaints FOR UPDATE TO authenticated USING (public.is_admin_user(auth.uid()));

CREATE INDEX idx_complaints_user ON public.complaints (user_id);
CREATE INDEX idx_complaints_status ON public.complaints (status);
CREATE INDEX idx_complaints_category ON public.complaints (category);

-- Vendor onboarding screens table
CREATE TABLE public.vendor_onboarding_screens (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL DEFAULT '',
  description TEXT NOT NULL DEFAULT '',
  image_url TEXT NOT NULL DEFAULT '',
  display_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.vendor_onboarding_screens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read vendor onboarding" ON public.vendor_onboarding_screens FOR SELECT USING (true);
CREATE POLICY "Admins can manage vendor onboarding" ON public.vendor_onboarding_screens FOR ALL TO authenticated USING (public.is_admin_user(auth.uid()));

-- Add completion workflow columns to service_bookings
ALTER TABLE public.service_bookings 
  ADD COLUMN IF NOT EXISTS completion_photo_url TEXT,
  ADD COLUMN IF NOT EXISTS otp_code TEXT,
  ADD COLUMN IF NOT EXISTS otp_verified_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS assigned_vendor_name TEXT,
  ADD COLUMN IF NOT EXISTS completion_notes TEXT,
  ADD COLUMN IF NOT EXISTS customer_rating INTEGER CHECK (customer_rating >= 1 AND customer_rating <= 5),
  ADD COLUMN IF NOT EXISTS customer_rating_comment TEXT,
  ADD COLUMN IF NOT EXISTS rated_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS razorpay_payment_id TEXT,
  ADD COLUMN IF NOT EXISTS total_amount NUMERIC DEFAULT 0;

-- Function to calculate average rating and update products table
CREATE OR REPLACE FUNCTION public.calculate_entity_avg_rating(_entity_type TEXT, _entity_id TEXT)
RETURNS NUMERIC
LANGUAGE sql
STABLE
SET search_path = public
AS $$
  SELECT COALESCE(ROUND(AVG(rating)::numeric, 1), 0)
  FROM public.reviews
  WHERE entity_type = _entity_type AND entity_id = _entity_id AND status = 'active'
$$;

-- Trigger to update product/service rating after review changes
CREATE OR REPLACE FUNCTION public.update_entity_rating_on_review()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  avg_rating NUMERIC;
  review_count INTEGER;
  target_type TEXT;
  target_id TEXT;
BEGIN
  target_type := COALESCE(NEW.entity_type, OLD.entity_type);
  target_id := COALESCE(NEW.entity_id, OLD.entity_id);

  SELECT COALESCE(ROUND(AVG(rating)::numeric, 1), 0), COUNT(*)
  INTO avg_rating, review_count
  FROM public.reviews
  WHERE entity_type = target_type AND entity_id = target_id AND status = 'active';

  IF target_type = 'product' OR target_type = 'service' THEN
    UPDATE public.products SET rating = avg_rating, reviews = review_count, updated_at = now()
    WHERE id = target_id;
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$;

CREATE TRIGGER trg_update_entity_rating
AFTER INSERT OR UPDATE OR DELETE ON public.reviews
FOR EACH ROW EXECUTE FUNCTION public.update_entity_rating_on_review();

-- Updated_at triggers
CREATE TRIGGER update_reviews_updated_at BEFORE UPDATE ON public.reviews FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_complaints_updated_at BEFORE UPDATE ON public.complaints FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_vendor_onboarding_updated_at BEFORE UPDATE ON public.vendor_onboarding_screens FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
