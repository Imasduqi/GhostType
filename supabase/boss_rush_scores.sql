-- SQL Migration: Membuat tabel boss_rush_scores
-- Silakan jalankan kueri ini di SQL Editor dashboard Supabase Anda.

CREATE TABLE IF NOT EXISTS public.boss_rush_scores (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  max_level_reached INT NOT NULL,
  bosses_defeated   INT NOT NULL,
  total_damage_dealt INT NOT NULL,
  duration_ms       INT NOT NULL,
  created_at        TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Mengaktifkan Row Level Security (RLS)
ALTER TABLE public.boss_rush_scores ENABLE ROW LEVEL SECURITY;

-- Kebijakan RLS untuk membaca (SELECT) secara publik
CREATE POLICY "boss_rush_scores_read_public" 
  ON public.boss_rush_scores 
  FOR SELECT 
  USING (true);

-- Kebijakan RLS untuk menambah (INSERT) oleh user pemilik data (terautentikasi)
CREATE POLICY "boss_rush_scores_insert_authenticated" 
  ON public.boss_rush_scores 
  FOR INSERT 
  WITH CHECK (auth.uid() = user_id);
