
ALTER TABLE public.vendors ADD CONSTRAINT vendors_email_unique UNIQUE (email);
ALTER TABLE public.vendors ADD CONSTRAINT vendors_mobile_unique UNIQUE (mobile);
ALTER TABLE public.user_roles ADD COLUMN IF NOT EXISTS password_set boolean NOT NULL DEFAULT false;
