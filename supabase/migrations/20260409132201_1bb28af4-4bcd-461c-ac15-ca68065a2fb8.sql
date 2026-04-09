
-- Vendor availability per day of week
CREATE TABLE public.vendor_availability (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  vendor_id TEXT NOT NULL,
  day_of_week INT NOT NULL CHECK (day_of_week >= 0 AND day_of_week <= 6),
  is_available BOOLEAN NOT NULL DEFAULT true,
  time_slots JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (vendor_id, day_of_week)
);

ALTER TABLE public.vendor_availability ENABLE ROW LEVEL SECURITY;

-- Anyone can read availability (needed for booking checks)
CREATE POLICY "Anyone can view vendor availability"
  ON public.vendor_availability FOR SELECT
  USING (true);

-- Vendors manage their own availability
CREATE POLICY "Vendors can insert own availability"
  ON public.vendor_availability FOR INSERT
  WITH CHECK (vendor_id = public.get_vendor_id(auth.uid()));

CREATE POLICY "Vendors can update own availability"
  ON public.vendor_availability FOR UPDATE
  USING (vendor_id = public.get_vendor_id(auth.uid()));

CREATE POLICY "Vendors can delete own availability"
  ON public.vendor_availability FOR DELETE
  USING (vendor_id = public.get_vendor_id(auth.uid()));

-- Timestamp trigger
CREATE TRIGGER update_vendor_availability_updated_at
  BEFORE UPDATE ON public.vendor_availability
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Index for fast lookups
CREATE INDEX idx_vendor_availability_vendor ON public.vendor_availability (vendor_id);
