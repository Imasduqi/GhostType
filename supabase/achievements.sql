-- 1. Create public.user_achievements table
CREATE TABLE IF NOT EXISTS public.user_achievements (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  achievement_id  TEXT NOT NULL,
  unlocked_at     TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, achievement_id)
);

-- 2. Enable Row Level Security (RLS)
ALTER TABLE public.user_achievements ENABLE ROW LEVEL SECURITY;

-- 3. Create RLS Policy for owner access (select and insert own user records)
CREATE POLICY "achievements_owner" ON public.user_achievements
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- 4. Create database function to calculate ghost defeats count
CREATE OR REPLACE FUNCTION public.get_ghost_defeats_count(p_user_id UUID)
RETURNS INT AS $$
DECLARE
  v_text_id UUID;
  v_duration_ms INT;
  v_running_best INT;
  v_count INT := 0;
  v_is_first BOOLEAN;
  rec RECORD;
BEGIN
  -- Loop through all attempts of the user grouped by text_id, sorted by created_at
  FOR v_text_id IN 
    SELECT DISTINCT text_id 
    FROM public.attempts 
    WHERE user_id = p_user_id
  LOOP
    v_is_first := TRUE;
    
    FOR rec IN 
      SELECT duration_ms 
      FROM public.attempts 
      WHERE user_id = p_user_id AND text_id = v_text_id 
      ORDER BY created_at ASC
    LOOP
      IF v_is_first THEN
        -- First run is the baseline, cannot be a ghost win (as per instruction #1)
        v_running_best := rec.duration_ms;
        v_is_first := FALSE;
      ELSE
        -- Subsequent runs that are strictly faster count as beating the user's previous best (ghost)
        IF rec.duration_ms < v_running_best THEN
          v_count := v_count + 1;
          v_running_best := rec.duration_ms;
        END IF;
      END IF;
    END LOOP;
  END LOOP;
  
  RETURN v_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
