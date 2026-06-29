export interface KeystrokeLogItem {
  char: string;
  timestamp_ms: number;
  correct: boolean;
}

export interface Attempt {
  id?: string;
  user_id: string;
  text_id: string;
  mode: string;
  wpm: number;
  accuracy: number;
  duration_ms: number;
  keystroke_log: KeystrokeLogItem[];
  created_at?: string;
}

export interface TextItem {
  id: string;
  content: string;
  language: 'id' | 'en';
  source: 'curated' | 'generated';
  difficulty: 'easy' | 'medium' | 'hard';
  char_count: number;
  created_at?: string;
}

export interface Profile {
  id: string;
  username: string;
  avatar_url?: string;
  created_at?: string;
}

export interface UserStats {
  user_id: string;
  avg_wpm: number;
  best_wpm: number;
  total_attempts: number;
  avg_accuracy: number;
}

export interface SurvivalScore {
  id?: string;
  user_id: string;
  score: number;
  words_typed: number;
  max_combo: number;
  duration_ms: number;
  created_at?: string;
}

export interface TimeAttackScore {
  id?: string;
  user_id: string;
  duration_setting: number;
  wpm: number;
  accuracy: number;
  words_typed: number;
  created_at?: string;
}

export interface BossRushScore {
  id?: string;
  user_id: string;
  max_level_reached: number;
  bosses_defeated: number;
  total_damage_dealt: number;
  duration_ms: number;
  score?: number;
  modifier_multiplier?: number;
  active_modifiers?: string[];
  created_at?: string;
}

export interface StoryProgress {
  id?: string;
  user_id: string;
  chapter_id: number;
  status: 'locked' | 'in_progress' | 'cleared';
  ending_choice?: 'destroy' | 'spare' | null;
  updated_at?: string;
}

export interface StoryBossClears {
  id?: string;
  user_id: string;
  boss_id: string;
  cleared_at?: string;
  best_wpm: number;
  best_accuracy: number;
  skills_used?: any;
}

export interface StoryCodexUnlocked {
  id?: string;
  user_id: string;
  boss_id: string;
  unlocked_at?: string;
}

export interface UserAchievement {
  id?: string;
  user_id: string;
  achievement_id: string;
  unlocked_at?: string;
}

export interface SecretBossClear {
  id?: string;
  user_id: string;
  boss_id: 'monkeytype_prime' | 'ghost_king' | 'the_developer';
  cleared_at?: string;
}





