-- Reactions on direct-message chat messages (Socio 1-1 DM)
CREATE TABLE IF NOT EXISTS public.social_message_reactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id uuid NOT NULL REFERENCES public.social_messages(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  emoji text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (message_id, user_id, emoji)
);

CREATE INDEX IF NOT EXISTS idx_smr_message ON public.social_message_reactions(message_id);
CREATE INDEX IF NOT EXISTS idx_smr_user ON public.social_message_reactions(user_id);

ALTER TABLE public.social_message_reactions ENABLE ROW LEVEL SECURITY;

-- Only conversation participants may view/insert/delete reactions
CREATE POLICY "Participants can view message reactions"
ON public.social_message_reactions
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.social_messages m
    JOIN public.social_conversations c ON c.id = m.conversation_id
    WHERE m.id = social_message_reactions.message_id
      AND c.participants @> to_jsonb(ARRAY[auth.uid()::text])
  )
);

CREATE POLICY "Participants can add their own reactions"
ON public.social_message_reactions
FOR INSERT
WITH CHECK (
  user_id = auth.uid()
  AND EXISTS (
    SELECT 1 FROM public.social_messages m
    JOIN public.social_conversations c ON c.id = m.conversation_id
    WHERE m.id = social_message_reactions.message_id
      AND c.participants @> to_jsonb(ARRAY[auth.uid()::text])
  )
);

CREATE POLICY "Users can remove their own reactions"
ON public.social_message_reactions
FOR DELETE
USING (user_id = auth.uid());

-- Enable realtime broadcast
ALTER PUBLICATION supabase_realtime ADD TABLE public.social_message_reactions;