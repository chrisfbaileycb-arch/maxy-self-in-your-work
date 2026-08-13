
CREATE TABLE public.identity_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  token TEXT NOT NULL UNIQUE,
  label TEXT NOT NULL DEFAULT 'Shared identity',
  mode TEXT NOT NULL DEFAULT 'system' CHECK (mode IN ('system','email','text')),
  critical_only BOOLEAN NOT NULL DEFAULT false,
  revoked_at TIMESTAMPTZ,
  last_used_at TIMESTAMPTZ,
  use_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_identity_tokens_user ON public.identity_tokens(user_id);
CREATE INDEX idx_identity_tokens_token ON public.identity_tokens(token) WHERE revoked_at IS NULL;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.identity_tokens TO authenticated;
GRANT ALL ON public.identity_tokens TO service_role;

ALTER TABLE public.identity_tokens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage their own identity tokens"
  ON public.identity_tokens FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
