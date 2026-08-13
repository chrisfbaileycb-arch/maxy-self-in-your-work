ALTER TABLE public.memories ADD COLUMN IF NOT EXISTS batch_id UUID;
CREATE INDEX IF NOT EXISTS memories_user_batch_idx ON public.memories(user_id, batch_id);