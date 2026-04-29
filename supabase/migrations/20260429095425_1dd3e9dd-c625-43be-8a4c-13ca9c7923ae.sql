-- Add the missing unique index on dedupe_key so credit_points_to_user's
-- ON CONFLICT (dedupe_key) DO NOTHING actually works. Without it the function
-- raised an error that was silently swallowed by EXCEPTION WHEN OTHERS,
-- so wallet points for likes / shares / story-likes were never credited.
CREATE UNIQUE INDEX IF NOT EXISTS points_transactions_dedupe_key_uidx
  ON public.points_transactions (dedupe_key)
  WHERE dedupe_key IS NOT NULL;