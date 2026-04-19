DO $$
BEGIN
  BEGIN
    EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.vendor_notifications';
  EXCEPTION WHEN duplicate_object THEN
    NULL;
  END;
END $$;
ALTER TABLE public.vendor_notifications REPLICA IDENTITY FULL;