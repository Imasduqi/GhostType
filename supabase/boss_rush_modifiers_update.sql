-- SQL Migration: Add score and modifier columns to boss_rush_scores
ALTER TABLE public.boss_rush_scores
  ADD COLUMN IF NOT EXISTS score INT,
  ADD COLUMN IF NOT EXISTS modifier_multiplier NUMERIC DEFAULT 1.0,
  ADD COLUMN IF NOT EXISTS active_modifiers JSONB DEFAULT '[]'::jsonb;

-- Populate scores for existing entries based on formula: (max_level_reached * 1000) + total_damage_dealt
UPDATE public.boss_rush_scores
SET score = (max_level_reached * 1000) + total_damage_dealt
WHERE score IS NULL;
