import { supabase } from '@/lib/supabase/client';
import { ACHIEVEMENT_DEFINITIONS, Achievement } from './achievementData';

export interface CheckerContext {
  mode: 'race' | 'survival' | 'time_attack' | 'boss_rush' | 'story_boss' | 'story_chapter' | 'secret_boss';
  wpm?: number;
  accuracy?: number;
  duration_ms?: number;
  score?: number;
  playerWon?: boolean;
  duration_setting?: number;
  max_level_reached?: number;
  bosses_defeated?: number;
  bossId?: string;
  playerHp?: number;
  maxPlayerHp?: number;
  chapterId?: number;
  status?: string;
  endingChoice?: 'destroy' | 'spare';
}

/**
 * Checks all achievement conditions for a user and unlocks newly completed ones.
 * Dispatches a client event and returns any newly unlocked achievements.
 */
export async function checkAndUnlockAchievements(
  userId: string,
  context: CheckerContext
): Promise<Achievement[]> {
  try {
    // 1. Fetch already unlocked achievements to avoid duplicate checks
    const { data: unlockedData, error: fetchUnlockedError } = await supabase
      .from('user_achievements')
      .select('achievement_id')
      .eq('user_id', userId);

    if (fetchUnlockedError) throw fetchUnlockedError;
    const unlockedSet = new Set<string>(unlockedData?.map(a => a.achievement_id) || []);

    // 2. Fetch necessary user historical statistics from Supabase
    // Race statistics
    const { count: totalRaces } = await supabase
      .from('attempts')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('mode', 'race');

    const { count: sharpshooterCount } = await supabase
      .from('attempts')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .gte('accuracy', 95);

    const { data: maxAttempt } = await supabase
      .from('attempts')
      .select('wpm, accuracy')
      .eq('user_id', userId)
      .order('wpm', { ascending: false })
      .limit(1);

    const { data: maxAccuracy } = await supabase
      .from('attempts')
      .select('accuracy')
      .eq('user_id', userId)
      .order('accuracy', { ascending: false })
      .limit(1);

    // Time Attack statistics
    const { count: totalTimeAttacks } = await supabase
      .from('time_attack_scores')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId);

    const { data: maxTimeAttack } = await supabase
      .from('time_attack_scores')
      .select('wpm')
      .eq('user_id', userId)
      .order('wpm', { ascending: false })
      .limit(1);

    const { data: maxTimeAttack60 } = await supabase
      .from('time_attack_scores')
      .select('wpm')
      .eq('user_id', userId)
      .eq('duration_setting', 60)
      .order('wpm', { ascending: false })
      .limit(1);

    // Survival statistics
    const { data: maxSurvival } = await supabase
      .from('survival_scores')
      .select('score, duration_ms')
      .eq('user_id', userId)
      .order('score', { ascending: false })
      .limit(1);

    // Boss Rush statistics
    const { data: maxBossRush } = await supabase
      .from('boss_rush_scores')
      .select('max_level_reached, bosses_defeated')
      .eq('user_id', userId)
      .order('max_level_reached', { ascending: false })
      .limit(1);

    // Story progress statistics
    const { data: storyProgress } = await supabase
      .from('story_progress')
      .select('chapter_id, status, ending_choice')
      .eq('user_id', userId);

    const { data: maxStoryBoss } = await supabase
      .from('story_boss_clears')
      .select('best_wpm')
      .eq('user_id', userId)
      .order('best_wpm', { ascending: false })
      .limit(1);

    // Fetch secret boss clears
    const { data: secretBossClears } = await supabase
      .from('secret_boss_clears')
      .select('boss_id')
      .eq('user_id', userId);
    const clearedSecretBosses = new Set(secretBossClears?.map(c => c.boss_id) || []);

    // Fetch user daily streak
    const { data: streakData } = await supabase
      .from('user_daily_streak')
      .select('longest_streak')
      .eq('user_id', userId)
      .maybeSingle();
    const maxStreak = streakData?.longest_streak || 0;

    // Ghost defeat calculation (uses RPC with fallback)

    let ghostDefeatsCount = 0;
    const { data: ghostDefeats, error: rpcError } = await supabase.rpc('get_ghost_defeats_count', {
      p_user_id: userId
    });

    if (!rpcError && ghostDefeats !== null) {
      ghostDefeatsCount = Number(ghostDefeats);
    } else {
      // Fallback in-memory logic if database function doesn't exist
      const { data: attempts } = await supabase
        .from('attempts')
        .select('text_id, duration_ms, wpm')
        .eq('user_id', userId)
        .order('created_at', { ascending: true });

      if (attempts) {
        const attemptsByText: Record<string, any[]> = {};
        for (const att of attempts) {
          if (!attemptsByText[att.text_id]) {
            attemptsByText[att.text_id] = [];
          }
          attemptsByText[att.text_id].push(att);
        }

        let count = 0;
        for (const textId in attemptsByText) {
          const textAttempts = attemptsByText[textId];
          if (textAttempts.length >= 2) {
            let runningBest = textAttempts[0].duration_ms;
            for (let i = 1; i < textAttempts.length; i++) {
              if (textAttempts[i].duration_ms < runningBest) {
                count++;
                runningBest = textAttempts[i].duration_ms;
              }
            }
          }
        }
        ghostDefeatsCount = count;
      }
    }

    // 3. Evaluate values
    const wpmVal = context.wpm || 0;
    const accVal = context.accuracy || 0;
    const scoreVal = context.score || 0;
    const durMsVal = context.duration_ms || 0;
    const durSecVal = durMsVal / 1000;
    const currentMode = context.mode;

    const maxWpmAttempt = maxAttempt?.[0]?.wpm ? Number(maxAttempt[0].wpm) : 0;
    const maxWpmTimeAttack = maxTimeAttack?.[0]?.wpm ? Number(maxTimeAttack[0].wpm) : 0;
    const maxWpmBossClear = maxStoryBoss?.[0]?.best_wpm ? Number(maxStoryBoss[0].best_wpm) : 0;
    const bestWpmOverall = Math.max(wpmVal, maxWpmAttempt, maxWpmTimeAttack, maxWpmBossClear);

    const maxAccAttempt = maxAccuracy?.[0]?.accuracy ? Number(maxAccuracy[0].accuracy) : 0;
    const bestAccuracyOverall = Math.max(accVal, maxAccAttempt);

    const maxTimeAttackWpm = Math.max(currentMode === 'time_attack' ? wpmVal : 0, maxWpmTimeAttack);

    const bestTimeAttack60Wpm = Math.max(
      (currentMode === 'time_attack' && context.duration_setting === 60) ? wpmVal : 0,
      maxTimeAttack60?.[0]?.wpm ? Number(maxTimeAttack60[0].wpm) : 0
    );

    const bestSurvivalScore = Math.max(
      currentMode === 'survival' ? scoreVal : 0,
      maxSurvival?.[0]?.score ? Number(maxSurvival[0].score) : 0
    );

    const bestSurvivalDurationSec = Math.max(
      currentMode === 'survival' ? durSecVal : 0,
      maxSurvival?.[0]?.duration_ms ? Number(maxSurvival[0].duration_ms) / 1000 : 0
    );

    const maxLevelReached = Math.max(
      currentMode === 'boss_rush' ? (context.max_level_reached || 0) : 0,
      maxBossRush?.[0]?.max_level_reached ? Number(maxBossRush[0].max_level_reached) : 0
    );

    const maxBossesDefeated = Math.max(
      currentMode === 'boss_rush' ? (context.bosses_defeated || 0) : 0,
      maxBossRush?.[0]?.bosses_defeated ? Number(maxBossRush[0].bosses_defeated) : 0
    );

    const chapter1Cleared = 
      storyProgress?.some(p => p.chapter_id === 1 && p.status === 'cleared') || 
      (currentMode === 'story_chapter' && context.chapterId === 1 && context.status === 'cleared');

    const chapter2Cleared = 
      storyProgress?.some(p => p.chapter_id === 2 && p.status === 'cleared') || 
      (currentMode === 'story_chapter' && context.chapterId === 2 && context.status === 'cleared');

    const isDoppelgangerHpClean = 
      (currentMode === 'story_boss' && context.bossId === 'doppelganger' && context.playerHp !== undefined && context.maxPlayerHp !== undefined && (context.playerHp / context.maxPlayerHp) > 0.5);

    // 4. Check conditions for each locked achievement
    const toUnlock: string[] = [];

    // SPEED
    if (bestWpmOverall >= 60) toUnlock.push('speed_demon_bronze');
    if (bestWpmOverall >= 80) toUnlock.push('speed_demon_silver');
    if (bestWpmOverall >= 100) toUnlock.push('speed_demon_gold');
    if (maxTimeAttackWpm >= 70) toUnlock.push('sprint_king_bronze');
    if (maxTimeAttackWpm >= 90) toUnlock.push('sprint_king_silver');
    if (maxTimeAttackWpm >= 110) toUnlock.push('sprint_king_gold');

    // ACCURACY
    if (bestAccuracyOverall >= 95) toUnlock.push('perfectionist_bronze');
    if (bestAccuracyOverall >= 98) toUnlock.push('perfectionist_silver');
    if (bestAccuracyOverall >= 100) toUnlock.push('perfectionist_gold');
    if ((sharpshooterCount || 0) >= 10) toUnlock.push('sharpshooter_bronze');
    if ((sharpshooterCount || 0) >= 25) toUnlock.push('sharpshooter_silver');
    if ((sharpshooterCount || 0) >= 50) toUnlock.push('sharpshooter_gold');

    // RACE
    if ((totalRaces || 0) >= 1) toUnlock.push('racer_bronze');
    if ((totalRaces || 0) >= 10) toUnlock.push('racer_silver');
    if ((totalRaces || 0) >= 50) toUnlock.push('racer_gold');
    if (ghostDefeatsCount >= 1) toUnlock.push('ghost_hunter_bronze');
    if (ghostDefeatsCount >= 10) toUnlock.push('ghost_hunter_silver');
    if (ghostDefeatsCount >= 25) toUnlock.push('ghost_hunter_gold');

    // SURVIVAL
    if (bestSurvivalScore >= 500) toUnlock.push('survivor_bronze');
    if (bestSurvivalScore >= 3000) toUnlock.push('survivor_silver');
    if (bestSurvivalScore >= 5000) toUnlock.push('survivor_gold');
    if (bestSurvivalDurationSec >= 60) toUnlock.push('endurance_bronze');
    if (bestSurvivalDurationSec >= 120) toUnlock.push('endurance_silver');
    if (bestSurvivalDurationSec >= 180) toUnlock.push('endurance_gold');

    // TIME ATTACK
    if ((totalTimeAttacks || 0) >= 1) toUnlock.push('time_keeper_bronze');
    if ((totalTimeAttacks || 0) >= 10) toUnlock.push('time_keeper_silver');
    if ((totalTimeAttacks || 0) >= 25) toUnlock.push('time_keeper_gold');
    if (bestTimeAttack60Wpm >= 70) toUnlock.push('minute_master_bronze');
    if (bestTimeAttack60Wpm >= 90) toUnlock.push('minute_master_silver');
    if (bestTimeAttack60Wpm >= 110) toUnlock.push('minute_master_gold');

    // BOSS
    if (maxBossesDefeated >= 1) toUnlock.push('boss_slayer_bronze');
    if (maxLevelReached >= 10) toUnlock.push('boss_slayer_silver');
    if (maxLevelReached >= 20) toUnlock.push('boss_slayer_gold');
    if (chapter1Cleared) toUnlock.push('story_hero_bronze');
    if (chapter2Cleared) toUnlock.push('story_hero_silver');
    if (isDoppelgangerHpClean) toUnlock.push('story_hero_gold');

    // STORY MODE ENDING ACHIEVEMENTS
    const hasStoryCompleteA = 
      unlockedSet.has('story_complete_a') ||
      (storyProgress && storyProgress.some(p => p.chapter_id === 5 && p.status === 'cleared' && p.ending_choice === 'destroy')) ||
      (currentMode === 'story_chapter' && context.chapterId === 5 && context.status === 'cleared' && context.endingChoice === 'destroy');

    const hasStoryCompleteB = 
      unlockedSet.has('story_complete_b') ||
      (storyProgress && storyProgress.some(p => p.chapter_id === 5 && p.status === 'cleared' && p.ending_choice === 'spare')) ||
      (currentMode === 'story_chapter' && context.chapterId === 5 && context.status === 'cleared' && context.endingChoice === 'spare');

    if (hasStoryCompleteA) toUnlock.push('story_complete_a');
    if (hasStoryCompleteB) toUnlock.push('story_complete_b');
    if (hasStoryCompleteA && hasStoryCompleteB) toUnlock.push('story_complete_both');

    // DAILY STREAK
    if (maxStreak >= 7) toUnlock.push('daily_challenger_bronze');
    if (maxStreak >= 30) toUnlock.push('daily_challenger_silver');
    if (maxStreak >= 100) toUnlock.push('daily_challenger_gold');

    // SECRET BOSSES
    const clearedPrime = clearedSecretBosses.has('monkeytype_prime') || 
      (currentMode === 'secret_boss' && context.bossId === 'monkeytype_prime' && context.playerWon);
    const clearedGhost = clearedSecretBosses.has('ghost_king') || 
      (currentMode === 'secret_boss' && context.bossId === 'ghost_king' && context.playerWon);
    const clearedDeveloper = clearedSecretBosses.has('the_developer') || 
      (currentMode === 'secret_boss' && context.bossId === 'the_developer' && context.playerWon);

    if (clearedPrime) toUnlock.push('secret_prime_gold');
    if (clearedGhost) toUnlock.push('secret_ghost_gold');
    if (clearedDeveloper) toUnlock.push('secret_developer_gold');

    // 5. Filter out already unlocked ones
    const newlyUnlocked = toUnlock.filter(id => !unlockedSet.has(id));

    // 6. Save newly unlocked achievements in Supabase
    const unlockedAchievementsToReturn: Achievement[] = [];
    if (newlyUnlocked.length > 0) {
      const insertData = newlyUnlocked.map(id => ({
        user_id: userId,
        achievement_id: id
      }));

      const { error: insertError } = await supabase
        .from('user_achievements')
        .insert(insertData);

      if (insertError) throw insertError;

      // Map definitions and dispatch client events
      for (const id of newlyUnlocked) {
        const def = ACHIEVEMENT_DEFINITIONS.find(a => a.id === id);
        if (def) {
          unlockedAchievementsToReturn.push(def);
          if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('achievement-unlocked', { detail: def }));
          }
        }
      }
    }

    return unlockedAchievementsToReturn;
  } catch (err) {
    console.error('Error in checkAndUnlockAchievements:', err);
    return [];
  }
}
