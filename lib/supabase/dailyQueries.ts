import { supabase } from './client';
import { getChallengeDateString } from '@/lib/daily/dailyChallengeGenerator';
import { checkAndUnlockAchievements } from '@/lib/achievements/checkAchievements';

export interface DailyChallengeScore {
  id?: string;
  user_id: string;
  challenge_date: string;
  challenge_type: string;
  target_value: number;
  achieved_value: number;
  completed: boolean;
  created_at?: string;
}

export interface UserDailyStreak {
  user_id: string;
  current_streak: number;
  longest_streak: number;
  last_completed: string | null;
  updated_at?: string;
}

/**
 * Saves or updates a daily challenge score for a user.
 */
export async function saveDailyScore(
  userId: string,
  dateString: string,
  type: string,
  target: number,
  achieved: number,
  completed: boolean
): Promise<DailyChallengeScore | null> {
  try {
    const { data, error } = await supabase
      .from('daily_challenge_scores')
      .upsert({
        user_id: userId,
        challenge_date: dateString,
        challenge_type: type,
        target_value: target,
        achieved_value: achieved,
        completed: completed,
        created_at: new Date().toISOString()
      }, { onConflict: 'user_id,challenge_date' })
      .select('*')
      .single();

    if (error) throw error;
    return data;
  } catch (err) {
    console.error('Error saving daily challenge score:', err);
    return null;
  }
}

/**
 * Fetches the user's streak and resets current_streak to 0 if they missed yesterday's challenge.
 */
export async function getOrSyncUserStreak(
  userId: string,
  dateString: string
): Promise<UserDailyStreak> {
  try {
    const { data: streak, error } = await supabase
      .from('user_daily_streak')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();

    if (error) throw error;

    const fallback: UserDailyStreak = {
      user_id: userId,
      current_streak: 0,
      longest_streak: 0,
      last_completed: null
    };

    if (!streak) {
      return fallback;
    }

    // Calculate yesterday's date string relative to dateString
    const parts = dateString.split('-');
    const y = parseInt(parts[0], 10);
    const m = parseInt(parts[1], 10) - 1;
    const d = parseInt(parts[2], 10);
    const yesterdayDate = new Date(y, m, d - 1);
    const yesterday = getChallengeDateString(yesterdayDate);

    // If the last completed date is not today and not yesterday, the streak is broken
    if (
      streak.last_completed && 
      streak.last_completed !== dateString && 
      streak.last_completed !== yesterday
    ) {
      // Reset current streak to 0 in the database
      const { data: updated, error: updateError } = await supabase
        .from('user_daily_streak')
        .update({ current_streak: 0, updated_at: new Date().toISOString() })
        .eq('user_id', userId)
        .select('*')
        .single();

      if (updateError) throw updateError;
      return updated;
    }

    return streak;
  } catch (err) {
    console.error('Error getting/syncing user daily streak:', err);
    return {
      user_id: userId,
      current_streak: 0,
      longest_streak: 0,
      last_completed: null
    };
  }
}

/**
 * Updates the user's daily streak after successfully completing a daily challenge.
 * Triggers achievement checking afterward.
 */
export async function updateUserDailyStreak(
  userId: string,
  dateString: string
): Promise<UserDailyStreak | null> {
  try {
    // 1. Get current streak status
    const { data: streak, error: fetchError } = await supabase
      .from('user_daily_streak')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();

    if (fetchError) throw fetchError;

    // Calculate yesterday's date string
    const parts = dateString.split('-');
    const y = parseInt(parts[0], 10);
    const m = parseInt(parts[1], 10) - 1;
    const d = parseInt(parts[2], 10);
    const yesterdayDate = new Date(y, m, d - 1);
    const yesterday = getChallengeDateString(yesterdayDate);

    let updatedStreak: UserDailyStreak | null = null;

    if (!streak) {
      // First challenge completed ever
      const { data, error } = await supabase
        .from('user_daily_streak')
        .insert({
          user_id: userId,
          current_streak: 1,
          longest_streak: 1,
          last_completed: dateString
        })
        .select('*')
        .single();

      if (error) throw error;
      updatedStreak = data;
    } else {
      const lastCompleted = streak.last_completed;

      if (lastCompleted === dateString) {
        // Already updated today, do nothing
        updatedStreak = streak;
      } else if (lastCompleted === yesterday) {
        // Continued streak!
        const newCurrent = streak.current_streak + 1;
        const newLongest = Math.max(streak.longest_streak, newCurrent);

        const { data, error } = await supabase
          .from('user_daily_streak')
          .update({
            current_streak: newCurrent,
            longest_streak: newLongest,
            last_completed: dateString,
            updated_at: new Date().toISOString()
          })
          .eq('user_id', userId)
          .select('*')
          .single();

        if (error) throw error;
        updatedStreak = data;
      } else {
        // Streak was broken, restart at 1
        const newCurrent = 1;
        const newLongest = Math.max(streak.longest_streak, newCurrent);

        const { data, error } = await supabase
          .from('user_daily_streak')
          .update({
            current_streak: newCurrent,
            longest_streak: newLongest,
            last_completed: dateString,
            updated_at: new Date().toISOString()
          })
          .eq('user_id', userId)
          .select('*')
          .single();

        if (error) throw error;
        updatedStreak = data;
      }
    }

    // 2. Trigger checkAndUnlockAchievements after streak updates
    if (updatedStreak) {
      await checkAndUnlockAchievements(userId, {
        mode: 'story_chapter', // use a safe mode or we'll trigger evaluating daily_challenger via longest_streak
        chapterId: 0
      });
    }

    return updatedStreak;
  } catch (err) {
    console.error('Error updating user daily streak:', err);
    return null;
  }
}

/**
 * Fetches the daily leaderboard for a specific challenge date.
 * Strictly exposes only non-sensitive columns as requested.
 */
export async function getDailyLeaderboard(
  dateString: string
): Promise<any[]> {
  try {
    const { data, error } = await supabase
      .from('daily_challenge_scores')
      .select(`
        achieved_value,
        completed,
        user_id,
        profiles (
          username,
          avatar_url,
          user_daily_streak (
            current_streak,
            longest_streak
          )
        )
      `)
      .eq('challenge_date', dateString)
      .eq('completed', true);

    if (error) throw error;
    return data || [];
  } catch (err) {
    console.error('Error fetching daily leaderboard:', err);
    return [];
  }
}

/**
 * Checks if the user has completed today's daily challenge.
 */
export async function hasUserCompletedDaily(
  userId: string,
  dateString: string
): Promise<boolean> {
  try {
    const { data, error } = await supabase
      .from('daily_challenge_scores')
      .select('completed')
      .eq('user_id', userId)
      .eq('challenge_date', dateString)
      .maybeSingle();

    if (error) throw error;
    return data?.completed || false;
  } catch (err) {
    console.error('Error checking user daily challenge completion:', err);
    return false;
  }
}
