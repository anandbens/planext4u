CREATE TABLE public.delivery_proofs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id TEXT NOT NULL,
  customer_id TEXT NOT NULL,
  confirmation_type TEXT NOT NULL DEFAULT 'received_in_person',
  recipient_name TEXT,
  notes TEXT,
  photo_url TEXT,
  submitted_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.delivery_proofs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Customers can view own delivery proofs"
  ON public.delivery_proofs FOR SELECT
  USING (customer_id = auth.uid()::text OR is_admin_user(auth.uid()));

CREATE POLICY "Customers can insert own delivery proofs"
  ON public.delivery_proofs FOR INSERT
  WITH CHECK (customer_id = auth.uid()::text);

CREATE UNIQUE INDEX idx_delivery_proofs_order ON public.delivery_proofs(order_id);