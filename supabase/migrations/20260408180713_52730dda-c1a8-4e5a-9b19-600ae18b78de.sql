
-- Create message_backups table for archiving deleted messages
CREATE TABLE public.message_backups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  original_message_id uuid NOT NULL,
  conversation_id uuid NOT NULL,
  sender_id uuid NOT NULL,
  content text,
  message_type text DEFAULT 'text',
  media_url text,
  original_created_at timestamptz NOT NULL,
  deleted_by uuid NOT NULL,
  deleted_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.message_backups ENABLE ROW LEVEL SECURITY;

-- Only admins can view message backups
CREATE POLICY "Admins can view message backups"
ON public.message_backups FOR SELECT
TO authenticated
USING (public.is_admin_user(auth.uid()));

-- Authenticated users can insert backups (when deleting their own messages)
CREATE POLICY "Users can insert message backups"
ON public.message_backups FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = deleted_by);

CREATE INDEX idx_message_backups_conversation ON public.message_backups(conversation_id);
CREATE INDEX idx_message_backups_sender ON public.message_backups(sender_id);
