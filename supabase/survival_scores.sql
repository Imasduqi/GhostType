-- SQL Migration: Membuat tabel survival_scores
-- Silakan jalankan kueri ini di SQL Editor dashboard Supabase Anda.

CREATE TABLE IF NOT EXISTS public.survival_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  score INT NOT NULL,
  words_typed INT NOT NULL,
  max_combo INT NOT NULL,
  duration_ms INT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Mengaktifkan Row Level Security (RLS)
ALTER TABLE public.survival_scores ENABLE ROW LEVEL SECURITY;

-- Kebijakan RLS untuk membaca (SELECT) secara publik
CREATE POLICY "survival_scores_read_public" 
  ON public.survival_scores 
  FOR SELECT 
  USING (true);

-- Kebijakan RLS untuk menambah (INSERT) oleh user pemilik data
CREATE POLICY "survival_scores_insert_authenticated" 
  ON public.survival_scores 
  FOR INSERT 
  WITH CHECK (auth.uid() = user_id);
