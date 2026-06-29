-- Progress per chapter per user
CREATE TABLE IF NOT EXISTS public.story_progress (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  chapter_id  INT NOT NULL,
  status      TEXT NOT NULL CHECK (status IN ('locked', 'in_progress', 'cleared')),
  ending_choice TEXT CHECK (ending_choice IN ('destroy', 'spare')),
  updated_at  TIMESTAMPTZ DEFAULT now()
);

-- Boss yang sudah dikalahkan
CREATE TABLE IF NOT EXISTS public.story_boss_clears (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  boss_id         TEXT NOT NULL,
  cleared_at      TIMESTAMPTZ DEFAULT now(),
  best_wpm        NUMERIC,
  best_accuracy   NUMERIC,
  skills_used     JSONB DEFAULT '[]'::jsonb
);

-- Codex yang sudah terbuka
CREATE TABLE IF NOT EXISTS public.story_codex_unlocked (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  boss_id     TEXT NOT NULL,
  unlocked_at TIMESTAMPTZ DEFAULT now()
);

-- RLS semua tabel: privat per user (bukan publik seperti leaderboard)
ALTER TABLE public.story_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.story_boss_clears ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.story_codex_unlocked ENABLE ROW LEVEL SECURITY;

-- Policy untuk story_progress
CREATE POLICY "story_progress_owner" ON public.story_progress
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Policy untuk story_boss_clears
CREATE POLICY "story_boss_clears_owner" ON public.story_boss_clears
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Policy untuk story_codex_unlocked
CREATE POLICY "story_codex_unlocked_owner" ON public.story_codex_unlocked
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
