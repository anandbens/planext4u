ALTER TABLE public.services
  ADD COLUMN IF NOT EXISTS subcategory_id text,
  ADD COLUMN IF NOT EXISTS subcategory_name text,
  ADD COLUMN IF NOT EXISTS rejection_reason text,
  ADD COLUMN IF NOT EXISTS approved_at timestamptz,
  ADD COLUMN IF NOT EXISTS approved_by uuid;

CREATE INDEX IF NOT EXISTS idx_services_status ON public.services(status);
CREATE INDEX IF NOT EXISTS idx_services_subcategory ON public.services(subcategory_id);