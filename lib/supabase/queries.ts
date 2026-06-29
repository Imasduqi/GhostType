import { supabase } from './client';
import { Profile, Attempt, KeystrokeLogItem, SurvivalScore, TimeAttackScore, BossRushScore, StoryProgress, StoryBossClears, StoryCodexUnlocked, SecretBossClear } from '@/types';

/**
 * Checks if a username is unique in the profiles table.
 * F-AUTH-05: System must validate unique username.
 */
export async function isUsernameUnique(username: string): Promise<boolean> {
  const cleanUsername = username.trim();
  if (cleanUsername.length < 3) return false;

  const { data, error } = await supabase
    .from('profiles')
    .select('username')
    .eq('username', cleanUsername)
    .maybeSingle();

  if (error) {
    console.error('Error checking username uniqueness:', error);
    return true;
  }

  return data === null;
}

/**
 * Retrieves the profile of a specific user.
 */
export async function getUserProfile(userId: string): Promise<Profile | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single();

  if (error) {
    console.error('Error fetching user profile:', error);
    return null;
  }

  return data;
}

/**
 * Retrieves the profile of the currently logged-in user.
 */
export async function getCurrentUserProfile(): Promise<Profile | null> {
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) return null;

  return getUserProfile(user.id);
}

/**
 * Gets a text ID if it exists in the database, otherwise inserts it and returns the new ID.
 * This guarantees a valid text_id exists for referencing in attempts table.
 */
export async function getOrCreateText(
  content: string,
  language: 'id' | 'en',
  difficulty: 'easy' | 'medium' | 'hard',
  source: 'curated' | 'generated' | 'custom'
): Promise<string | null> {
  const charCount = content.length;

  try {
    // 1. Look for existing text with identical content
    const { data, error } = await supabase
      .from('texts')
      .select('id')
      .eq('content', content)
      .maybeSingle();

    if (error) {
      console.error('Error checking text existence:', error);
    }

    if (data) {
      return data.id;
    }

    // 2. Insert new text if not found
    const { data: insertedData, error: insertError } = await supabase
      .from('texts')
      .insert({
        content,
        language,
        difficulty,
        source,
        char_count: charCount,
      })
      .select('id')
      .single();

    if (insertError) {
      throw insertError;
    }

    return insertedData.id;
  } catch (err) {
    console.error('Failed in getOrCreateText query:', err);
    return null;
  }
}

/**
 * Fetches the user's best attempt for a specific text based on WPM.
 * Used to play back the user's ghost.
 */
export async function getBestAttemptForText(userId: string, textId: string): Promise<Attempt | null> {
  try {
    const { data, error } = await supabase
      .from('attempts')
      .select('*')
      .eq('user_id', userId)
      .eq('text_id', textId)
      .eq('mode', 'race')
      .order('wpm', { ascending: false })
      .order('accuracy', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) throw error;
    return data;
  } catch (err) {
    console.error('Error fetching best attempt for ghost:', err);
    return null;
  }
}

/**
 * Saves a completed typing race session to the attempts table in Supabase.
 */
export async function saveAttempt(attempt: Omit<Attempt, 'id' | 'created_at'>): Promise<Attempt | null> {
  try {
    const { data, error } = await supabase
      .from('attempts')
      .insert(attempt)
      .select('*')
      .single();

    if (error) throw error;
    return data;
  } catch (err) {
    console.error('Error saving attempt to database:', err);
    return null;
  }
}

/**
 * Saves a completed survival session to the survival_scores table in Supabase.
 */
export async function saveSurvivalScore(scoreData: Omit<SurvivalScore, 'id' | 'created_at'>): Promise<SurvivalScore | null> {
  try {
    const { data, error } = await supabase
      .from('survival_scores')
      .insert(scoreData)
      .select('*')
      .single();

    if (error) throw error;
    return data;
  } catch (err) {
    console.error('Error saving survival score to database:', err);
    return null;
  }
}

/**
 * Saves a completed time attack session to the time_attack_scores table in Supabase.
 */
export async function saveTimeAttackScore(scoreData: Omit<TimeAttackScore, 'id' | 'created_at'>): Promise<TimeAttackScore | null> {
  try {
    const { data, error } = await supabase
      .from('time_attack_scores')
      .insert(scoreData)
      .select('*')
      .single();

    if (error) throw error;
    return data;
  } catch (err) {
    console.error('Error saving time attack score to database:', err);
    return null;
  }
}

/**
 * Saves a completed boss rush session to the boss_rush_scores table in Supabase.
 */
export async function saveBossRushScore(scoreData: Omit<BossRushScore, 'id' | 'created_at'>): Promise<BossRushScore | null> {
  try {
    const { data, error } = await supabase
      .from('boss_rush_scores')
      .insert(scoreData)
      .select('*')
      .single();

    if (error) throw error;
    return data;
  } catch (err) {
    console.error('Error saving boss rush score to database:', err);
    return null;
  }
}

/**
 * Retrieves all story progress for a specific user.
 */
export async function getStoryProgress(userId: string): Promise<StoryProgress[]> {
  try {
    const { data, error } = await supabase
      .from('story_progress')
      .select('*')
      .eq('user_id', userId);

    if (error) throw error;
    return data || [];
  } catch (err) {
    console.error('Error fetching story progress:', err);
    return [];
  }
}

/**
 * Upserts status of a specific story chapter for a user.
 */
export async function upsertChapterStatus(
  userId: string,
  chapterId: number,
  status: 'locked' | 'in_progress' | 'cleared',
  endingChoice?: 'destroy' | 'spare' | null
): Promise<StoryProgress | null> {
  try {
    const { data: existing, error: fetchError } = await supabase
      .from('story_progress')
      .select('id')
      .eq('user_id', userId)
      .eq('chapter_id', chapterId)
      .maybeSingle();

    if (fetchError) throw fetchError;

    const payload: any = { status, updated_at: new Date().toISOString() };
    if (endingChoice !== undefined) {
      payload.ending_choice = endingChoice;
    }

    if (existing) {
      const { data, error } = await supabase
        .from('story_progress')
        .update(payload)
        .eq('id', existing.id)
        .select('*')
        .single();
      if (error) throw error;
      return data;
    } else {
      const insertPayload = {
        user_id: userId,
        chapter_id: chapterId,
        status,
        ...(endingChoice !== undefined ? { ending_choice: endingChoice } : {})
      };
      const { data, error } = await supabase
        .from('story_progress')
        .insert(insertPayload)
        .select('*')
        .single();
      if (error) throw error;
      return data;
    }
  } catch (err) {
    console.error('Error upserting chapter status:', err);
    return null;
  }
}

/**
 * Retrieves all boss clears for a specific user.
 */
export async function getBossClears(userId: string): Promise<StoryBossClears[]> {
  try {
    const { data, error } = await supabase
      .from('story_boss_clears')
      .select('*')
      .eq('user_id', userId);

    if (error) throw error;
    return data || [];
  } catch (err) {
    console.error('Error fetching boss clears:', err);
    return [];
  }
}

/**
 * Saves a boss clear record, updating high score fields if the new score is better.
 * Uses UPSERT on (user_id, boss_id) to avoid duplicate-row errors (PGRST116).
 */
export async function saveBossClear(
  data: Omit<StoryBossClears, 'id' | 'cleared_at'>
): Promise<StoryBossClears | null> {
  try {
    // Fetch existing record to compute merged best scores client-side.
    const { data: existing, error: fetchError } = await supabase
      .from('story_boss_clears')
      .select('best_wpm, best_accuracy, skills_used')
      .eq('user_id', data.user_id)
      .eq('boss_id', data.boss_id)
      .maybeSingle();

    if (fetchError) throw fetchError;

    const bestWpm = Math.max(Number(existing?.best_wpm || 0), data.best_wpm);
    const bestAccuracy = Math.max(Number(existing?.best_accuracy || 0), data.best_accuracy);

    const { data: upserted, error } = await supabase
      .from('story_boss_clears')
      .upsert(
        {
          user_id: data.user_id,
          boss_id: data.boss_id,
          best_wpm: bestWpm,
          best_accuracy: bestAccuracy,
          skills_used: data.skills_used || existing?.skills_used || [],
          cleared_at: new Date().toISOString()
        },
        { onConflict: 'user_id,boss_id' }
      )
      .select('*')
      .maybeSingle();

    if (error) throw error;
    return upserted;
  } catch (err) {
    console.error('Error saving boss clear:', (err as any)?.message, JSON.stringify(err));
    return null;
  }
}

/**
 * Unlocks a codex entry for a user.
 * Uses UPSERT on (user_id, boss_id) to safely ignore duplicates (PGRST116).
 */
export async function unlockCodex(userId: string, bossId: string): Promise<StoryCodexUnlocked | null> {
  try {
    const { data, error } = await supabase
      .from('story_codex_unlocked')
      .upsert(
        { user_id: userId, boss_id: bossId },
        { onConflict: 'user_id,boss_id' }
      )
      .select('*')
      .maybeSingle();

    if (error) throw error;
    return data;
  } catch (err) {
    console.error('Error unlocking codex:', (err as any)?.message, JSON.stringify(err));
    return null;
  }
}

/**
 * Deletes boss clears for a user for a specific list of boss IDs (e.g. from the current chapter).
 * Used when a player is defeated in a chapter and progress resets.
 */
export async function deleteBossClearsForChapter(userId: string, bossIds: string[]): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('story_boss_clears')
      .delete()
      .eq('user_id', userId)
      .in('boss_id', bossIds);

    if (error) throw error;
    return true;
  } catch (err) {
    console.error('Error deleting boss clears for chapter:', err);
    return false;
  }
}

/**
 * Retrieves all secret boss clears for a specific user.
 */
export async function getSecretBossClears(userId: string): Promise<SecretBossClear[]> {
  try {
    const { data, error } = await supabase
      .from('secret_boss_clears')
      .select('*')
      .eq('user_id', userId);

    if (error) throw error;
    return data || [];
  } catch (err) {
    console.error('Error fetching secret boss clears:', err);
    return [];
  }
}

/**
 * Saves a secret boss clear record (upsert).
 * Ignores duplicate user_id + boss_id.
 */
export async function saveSecretBossClear(
  userId: string,
  bossId: 'monkeytype_prime' | 'ghost_king' | 'the_developer'
): Promise<SecretBossClear | null> {
  try {
    const { data, error } = await supabase
      .from('secret_boss_clears')
      .upsert(
        { user_id: userId, boss_id: bossId, cleared_at: new Date().toISOString() },
        { onConflict: 'user_id,boss_id' }
      )
      .select('*')
      .maybeSingle();

    if (error) throw error;
    return data;
  } catch (err) {
    console.error('Error saving secret boss clear:', (err as any)?.message, JSON.stringify(err));
    return null;
  }
}



