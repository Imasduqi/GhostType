-- 1. Create public.daily_challenge_scores table
CREATE TABLE IF NOT EXISTS public.daily_challenge_scores (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  challenge_date  DATE NOT NULL,
  challenge_type  TEXT NOT NULL 
    CHECK (challenge_type IN ('speed_run','accuracy_trial',
           'survival_reach','boss_rush','perfect_word')),
  target_value    NUMERIC NOT NULL,
  achieved_value  NUMERIC,
  completed       BOOLEAN NOT NULL DEFAULT false,
  created_at      TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, challenge_date)
);

-- 2. Create public.user_daily_streak table
CREATE TABLE IF NOT EXISTS public.user_daily_streak (
  user_id         UUID PRIMARY KEY 
    REFERENCES public.profiles(id) ON DELETE CASCADE,
  current_streak  INT NOT NULL DEFAULT 0,
  longest_streak  INT NOT NULL DEFAULT 0,
  last_completed  DATE,
  updated_at      TIMESTAMPTZ DEFAULT now()
);

-- 3. Enable Row Level Security (RLS)
ALTER TABLE public.daily_challenge_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_daily_streak ENABLE ROW LEVEL SECURITY;

-- 4. Create RLS Policies
CREATE POLICY "daily_scores_owner" ON public.daily_challenge_scores
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "daily_scores_read_public" ON public.daily_challenge_scores
  FOR SELECT USING (true);

CREATE POLICY "daily_streak_owner" ON public.user_daily_streak
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
  
CREATE POLICY "daily_streak_read_public" ON public.user_daily_streak
  FOR SELECT USING (true);
