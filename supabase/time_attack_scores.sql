-- SQL Migration: Membuat tabel time_attack_scores
-- Silakan jalankan kueri ini di SQL Editor dashboard Supabase Anda.

CREATE TABLE IF NOT EXISTS public.time_attack_scores (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  duration_setting INT NOT NULL,  -- 30, 60, atau 120 detik
  wpm             NUMERIC NOT NULL,
  accuracy        NUMERIC NOT NULL CHECK (accuracy >= 0 AND accuracy <= 100),
  words_typed     INT NOT NULL,
  created_at      TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Mengaktifkan Row Level Security (RLS)
ALTER TABLE public.time_attack_scores ENABLE ROW LEVEL SECURITY;

-- Kebijakan RLS untuk membaca (SELECT) secara publik
CREATE POLICY "time_attack_scores_read_public" 
  ON public.time_attack_scores 
  FOR SELECT 
  USING (true);

-- Kebijakan RLS untuk menambah (INSERT) oleh user pemilik data
CREATE POLICY "time_attack_scores_insert_authenticated" 
  ON public.time_attack_scores 
  FOR INSERT 
  WITH CHECK (auth.uid() = user_id);
