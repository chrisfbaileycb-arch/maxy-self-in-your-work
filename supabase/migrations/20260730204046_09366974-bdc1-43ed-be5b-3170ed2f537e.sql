CREATE TABLE public.self_notes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  body TEXT NOT NULL,
  done BOOLEAN NOT NULL DEFAULT false,
  done_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
CREATE INDEX self_notes_user_idx ON public.self_notes (user_id, done, created_at DESC);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.self_notes TO authenticated;
GRANT ALL ON public.self_notes TO service_role;
ALTER TABLE public.self_notes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage their own notes to self" ON public.self_notes FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());