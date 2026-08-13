ALTER TABLE public.memories ADD COLUMN IF NOT EXISTS salience SMALLINT NOT NULL DEFAULT 1;
ALTER TABLE public.memories ADD CONSTRAINT memories_salience_range CHECK (salience BETWEEN 0 AND 2);
CREATE INDEX IF NOT EXISTS memories_user_salience_idx ON public.memories (user_id, salience DESC, created_at ASC);