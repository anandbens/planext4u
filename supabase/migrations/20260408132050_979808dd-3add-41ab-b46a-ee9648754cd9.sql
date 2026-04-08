
-- Add enhanced fields to services table
ALTER TABLE public.services
  ADD COLUMN IF NOT EXISTS short_description text,
  ADD COLUMN IF NOT EXISTS long_description text,
  ADD COLUMN IF NOT EXISTS meta_title text,
  ADD COLUMN IF NOT EXISTS meta_description text,
  ADD COLUMN IF NOT EXISTS slug text,
  ADD COLUMN IF NOT EXISTS pricing_slots jsonb DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS booking_duration_minutes integer DEFAULT 60,
  ADD COLUMN IF NOT EXISTS max_bookings_per_slot integer DEFAULT 1,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();

-- Create service bookings table for slot conflict prevention
CREATE TABLE IF NOT EXISTS public.service_bookings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  service_id text NOT NULL REFERENCES public.services(id) ON DELETE CASCADE,
  customer_id text NOT NULL,
  vendor_id text NOT NULL,
  booking_date date NOT NULL,
  start_time time NOT NULL,
  end_time time NOT NULL,
  status text NOT NULL DEFAULT 'confirmed',
  payment_status text DEFAULT 'pending',
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.service_bookings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage all bookings"
  ON public.service_bookings FOR ALL
  TO authenticated
  USING (public.is_admin_user(auth.uid()));

CREATE POLICY "Customers can view own bookings"
  ON public.service_bookings FOR SELECT
  TO authenticated
  USING (customer_id = public.get_customer_id(auth.uid()));

-- Index for slot conflict checks
CREATE INDEX IF NOT EXISTS idx_service_bookings_slot
  ON public.service_bookings(service_id, booking_date, start_time, end_time)
  WHERE status IN ('confirmed', 'in_progress');

-- Trigger for updated_at on services
DROP TRIGGER IF EXISTS update_services_updated_at ON public.services;
CREATE TRIGGER update_services_updated_at
  BEFORE UPDATE ON public.services
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Trigger for updated_at on service_bookings
CREATE TRIGGER update_service_bookings_updated_at
  BEFORE UPDATE ON public.service_bookings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
