ALTER TABLE public.customers REPLICA IDENTITY FULL;
ALTER TABLE public.points_transactions REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.customers;
ALTER PUBLICATION supabase_realtime ADD TABLE public.points_transactions;