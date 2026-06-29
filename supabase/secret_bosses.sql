CREATE TABLE IF NOT EXISTS public.secret_boss_clears (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  boss_id         TEXT NOT NULL CHECK (boss_id IN ('monkeytype_prime', 'ghost_king', 'the_developer')),
  cleared_at      TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, boss_id)
);

ALTER TABLE public.secret_boss_clears ENABLE ROW LEVEL SECURITY;

CREATE POLICY "secret_boss_clears_owner" ON public.secret_boss_clears
  USING (auth.uid() = user_id) 
  WITH CHECK (auth.uid() = user_id);
