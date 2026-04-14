
-- Create login_logs table
CREATE TABLE public.login_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  role TEXT NOT NULL DEFAULT 'customer',
  portal TEXT NOT NULL DEFAULT 'customer',
  login_method TEXT NOT NULL DEFAULT 'phone_otp',
  ip_address TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.login_logs ENABLE ROW LEVEL SECURITY;

-- Users can view their own login logs
CREATE POLICY "Users can view own login logs"
ON public.login_logs FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Admins can view all login logs
CREATE POLICY "Admins can view all login logs"
ON public.login_logs FOR SELECT
TO authenticated
USING (public.is_admin_user(auth.uid()));

-- Authenticated users can insert their own login logs
CREATE POLICY "Users can insert own login logs"
ON public.login_logs FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Index for fast lookups
CREATE INDEX idx_login_logs_user_id ON public.login_logs (user_id);
CREATE INDEX idx_login_logs_created_at ON public.login_logs (created_at DESC);
