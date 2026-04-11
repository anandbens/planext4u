
-- Create calls table for WebRTC signaling
CREATE TABLE public.calls (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  caller_id uuid NOT NULL,
  callee_id uuid NOT NULL,
  call_type text NOT NULL DEFAULT 'audio' CHECK (call_type IN ('audio', 'video')),
  status text NOT NULL DEFAULT 'ringing' CHECK (status IN ('ringing', 'answered', 'ended', 'missed', 'rejected')),
  offer jsonb,
  answer jsonb,
  started_at timestamptz,
  ended_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Create ICE candidates exchange table
CREATE TABLE public.call_ice_candidates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  call_id uuid NOT NULL REFERENCES public.calls(id) ON DELETE CASCADE,
  sender_id uuid NOT NULL,
  candidate jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.calls ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.call_ice_candidates ENABLE ROW LEVEL SECURITY;

-- RLS policies for calls
CREATE POLICY "Users can view their own calls"
  ON public.calls FOR SELECT
  TO authenticated
  USING (auth.uid() = caller_id OR auth.uid() = callee_id);

CREATE POLICY "Users can create calls as caller"
  ON public.calls FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = caller_id);

CREATE POLICY "Call participants can update"
  ON public.calls FOR UPDATE
  TO authenticated
  USING (auth.uid() = caller_id OR auth.uid() = callee_id);

-- RLS policies for ICE candidates
CREATE POLICY "Call participants can view ICE candidates"
  ON public.call_ice_candidates FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.calls
      WHERE calls.id = call_ice_candidates.call_id
        AND (calls.caller_id = auth.uid() OR calls.callee_id = auth.uid())
    )
  );

CREATE POLICY "Call participants can add ICE candidates"
  ON public.call_ice_candidates FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = sender_id
    AND EXISTS (
      SELECT 1 FROM public.calls
      WHERE calls.id = call_ice_candidates.call_id
        AND (calls.caller_id = auth.uid() OR calls.callee_id = auth.uid())
    )
  );

-- Enable realtime for signaling
ALTER PUBLICATION supabase_realtime ADD TABLE public.calls;
ALTER PUBLICATION supabase_realtime ADD TABLE public.call_ice_candidates;

-- Indexes
CREATE INDEX idx_calls_caller ON public.calls(caller_id);
CREATE INDEX idx_calls_callee ON public.calls(callee_id);
CREATE INDEX idx_calls_status ON public.calls(status) WHERE status = 'ringing';
CREATE INDEX idx_ice_call_id ON public.call_ice_candidates(call_id);

-- Auto-update timestamp
CREATE TRIGGER update_calls_updated_at
  BEFORE UPDATE ON public.calls
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
