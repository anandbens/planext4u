ALTER POLICY fr_select ON public.franchise_registrations
  USING (public.is_admin_user(auth.uid()) OR user_id = auth.uid() OR email = (SELECT u.email::text FROM auth.users u WHERE u.id = auth.uid()));

ALTER POLICY fr_admin_update ON public.franchise_registrations
  USING (public.is_admin_user(auth.uid()))
  WITH CHECK (public.is_admin_user(auth.uid()));

ALTER POLICY fr_admin_delete ON public.franchise_registrations
  USING (public.is_admin_user(auth.uid()));

ALTER POLICY af_select ON public.active_franchises
  USING (public.is_admin_user(auth.uid()) OR user_id = auth.uid() OR email = (SELECT u.email::text FROM auth.users u WHERE u.id = auth.uid()));

ALTER POLICY af_admin_insert ON public.active_franchises
  WITH CHECK (public.is_admin_user(auth.uid()));

ALTER POLICY af_admin_update ON public.active_franchises
  USING (public.is_admin_user(auth.uid()))
  WITH CHECK (public.is_admin_user(auth.uid()));

ALTER POLICY af_admin_delete ON public.active_franchises
  USING (public.is_admin_user(auth.uid()));

ALTER POLICY pr_admin_all ON public.payment_records
  USING (public.is_admin_user(auth.uid()))
  WITH CHECK (public.is_admin_user(auth.uid()));

CREATE OR REPLACE FUNCTION public.audit_franchise_registration_changes()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.audit_logs (table_name, operation, record_id, old_data, new_data, performed_by, performed_by_role)
    VALUES ('franchise_registrations', 'insert', NEW.id::text, NULL, to_jsonb(NEW), auth.uid(), 'backoffice');
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    INSERT INTO public.audit_logs (table_name, operation, record_id, old_data, new_data, performed_by, performed_by_role)
    VALUES ('franchise_registrations', 'update', NEW.id::text, to_jsonb(OLD), to_jsonb(NEW), auth.uid(), 'backoffice');
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    INSERT INTO public.audit_logs (table_name, operation, record_id, old_data, new_data, performed_by, performed_by_role)
    VALUES ('franchise_registrations', 'delete', OLD.id::text, to_jsonb(OLD), NULL, auth.uid(), 'backoffice');
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_audit_franchise_registrations ON public.franchise_registrations;
CREATE TRIGGER trg_audit_franchise_registrations
AFTER INSERT OR UPDATE OR DELETE ON public.franchise_registrations
FOR EACH ROW EXECUTE FUNCTION public.audit_franchise_registration_changes();