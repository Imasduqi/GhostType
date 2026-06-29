"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabase/client';
import { 
  ACHIEVEMENT_DEFINITIONS, 
  Achievement, 
  AchievementCategory, 
  CATEGORY_LABELS, 
  TIER_COLORS, 
  TIER_EMOJIS 
} from '@/lib/achievements/achievementData';
import { ThemeToggle } from '@/components/ThemeToggle';

export default function AchievementsPage() {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [unlockedIds, setUnlockedIds] = useState<Map<string, string>>(new Map()); // achievement_id -> unlocked_at
  const [stats, setStats] = useState<any>({});
  const [activeTab, setActiveTab] = useState<string>('all');
  const [mounted, setMounted] = useState(false);

  // Authenticate user
  useEffect(() => {
    setMounted(true);
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session?.user) {
        router.push('/login?redirect=/achievements');
      } else {
        setCurrentUser(session.user);
        fetchStats(session.user.id);
      }
    });
  }, [router]);

  // Fetch statistics directly with COUNT at the DB level (Rule #2)
  const fetchStats = async (userId: string) => {
    try {
      // 1. Fetch unlocked achievements
      const { data: unlocked } = await supabase
        .from('user_achievements')
        .select('*')
        .eq('user_id', userId);

      const unlockedMap = new Map<string, string>();
      unlocked?.forEach(a => unlockedMap.set(a.achievement_id, a.unlocked_at));
      setUnlockedIds(unlockedMap);

      // 2. Fetch stats count via Supabase (satisfies DB-level filtering)
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

      const { data: maxAcc } = await supabase
        .from('attempts')
        .select('accuracy')
        .eq('user_id', userId)
        .order('accuracy', { ascending: false })
        .limit(1);

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

      const { data: maxSurvival } = await supabase
        .from('survival_scores')
        .select('score, duration_ms')
        .eq('user_id', userId)
        .order('score', { ascending: false })
        .limit(1);

      const { data: maxBossRush } = await supabase
        .from('boss_rush_scores')
        .select('max_level_reached, bosses_defeated')
        .eq('user_id', userId)
        .order('max_level_reached', { ascending: false })
        .limit(1);

      const { data: storyProgress } = await supabase
        .from('story_progress')
        .select('chapter_id, status')
        .eq('user_id', userId);

      const { data: maxStoryBoss } = await supabase
        .from('story_boss_clears')
        .select('best_wpm')
        .eq('user_id', userId)
        .order('best_wpm', { ascending: false })
        .limit(1);

      const { data: ghostDefeats } = await supabase.rpc('get_ghost_defeats_count', { 
        p_user_id: userId 
      });

      const maxWpmAttemptVal = maxAttempt?.[0]?.wpm ? Number(maxAttempt[0].wpm) : 0;
      const maxWpmTimeAttackVal = maxTimeAttack?.[0]?.wpm ? Number(maxTimeAttack[0].wpm) : 0;
      const maxWpmBossClearVal = maxStoryBoss?.[0]?.best_wpm ? Number(maxStoryBoss[0].best_wpm) : 0;
      const bestWpmOverall = Math.max(maxWpmAttemptVal, maxWpmTimeAttackVal, maxWpmBossClearVal);

      const maxAccAttemptVal = maxAcc?.[0]?.accuracy ? Number(maxAcc[0].accuracy) : 0;

      const chapter1Cleared = storyProgress?.some(p => p.chapter_id === 1 && p.status === 'cleared') ? 1 : 0;
      const chapter2Cleared = storyProgress?.some(p => p.chapter_id === 2 && p.status === 'cleared') ? 1 : 0;

      setStats({
        totalRaces: totalRaces || 0,
        sharpshooterCount: sharpshooterCount || 0,
        bestWpmOverall,
        bestAccuracyOverall: maxAccAttemptVal,
        totalTimeAttacks: totalTimeAttacks || 0,
        maxTimeAttackWpm: maxWpmTimeAttackVal,
        bestTimeAttack60Wpm: maxTimeAttack60?.[0]?.wpm ? Number(maxTimeAttack60[0].wpm) : 0,
        bestSurvivalScore: maxSurvival?.[0]?.score ? Number(maxSurvival[0].score) : 0,
        bestSurvivalDurationSec: maxSurvival?.[0]?.duration_ms ? Number(maxSurvival[0].duration_ms) / 1000 : 0,
        maxLevelReached: maxBossRush?.[0]?.max_level_reached ? Number(maxBossRush[0].max_level_reached) : 0,
        maxBossesDefeated: maxBossRush?.[0]?.bosses_defeated ? Number(maxBossRush[0].bosses_defeated) : 0,
        chapter1Cleared,
        chapter2Cleared,
        ghostDefeats: ghostDefeats !== null ? Number(ghostDefeats) : 0
      });
    } catch (err) {
      console.error('Error fetching statistics:', err);
    } finally {
      setLoading(false);
    }
  };

  // Get active progress values for each achievement
  const getAchievementProgress = (achievementId: string) => {
    switch (achievementId) {
      // Speed
      case 'speed_demon_bronze':
      case 'speed_demon_silver':
      case 'speed_demon_gold':
        return stats.bestWpmOverall || 0;
      case 'sprint_king_bronze':
      case 'sprint_king_silver':
      case 'sprint_king_gold':
        return stats.maxTimeAttackWpm || 0;

      // Accuracy
      case 'perfectionist_bronze':
      case 'perfectionist_silver':
      case 'perfectionist_gold':
        return stats.bestAccuracyOverall || 0;
      case 'sharpshooter_bronze':
      case 'sharpshooter_silver':
      case 'sharpshooter_gold':
        return stats.sharpshooterCount || 0;

      // Race
      case 'racer_bronze':
      case 'racer_silver':
      case 'racer_gold':
        return stats.totalRaces || 0;
      case 'ghost_hunter_bronze':
      case 'ghost_hunter_silver':
      case 'ghost_hunter_gold':
        return stats.ghostDefeats || 0;

      // Survival
      case 'survivor_bronze':
      case 'survivor_silver':
      case 'survivor_gold':
        return stats.bestSurvivalScore || 0;
      case 'endurance_bronze':
      case 'endurance_silver':
      case 'endurance_gold':
        return stats.bestSurvivalDurationSec || 0;

      // Time Attack
      case 'time_keeper_bronze':
      case 'time_keeper_silver':
      case 'time_keeper_gold':
        return stats.totalTimeAttacks || 0;
      case 'minute_master_bronze':
      case 'minute_master_silver':
      case 'minute_master_gold':
        return stats.bestTimeAttack60Wpm || 0;

      // Boss
      case 'boss_slayer_bronze':
        return stats.maxBossesDefeated || 0;
      case 'boss_slayer_silver':
      case 'boss_slayer_gold':
        return stats.maxLevelReached || 0;
      case 'story_hero_bronze':
        return stats.chapter1Cleared || 0;
      case 'story_hero_silver':
        return stats.chapter2Cleared || 0;
      case 'story_hero_gold':
        return unlockedIds.has('story_hero_gold') ? 1 : 0;

      // Daily
      case 'daily_challenger_bronze':
      case 'daily_challenger_silver':
      case 'daily_challenger_gold':
        return 0; // Phase 2 daily challenges

      default:
        return 0;
    }
  };

  const formatProgressLabel = (achievement: Achievement, current: number) => {
    const thresh = achievement.threshold;
    if (achievement.category === 'accuracy' && achievement.id.startsWith('perfectionist')) {
      return `${Math.round(current)}% / ${thresh}%`;
    }
    if (achievement.category === 'speed') {
      return `${Math.round(current)} / ${thresh} WPM`;
    }
    if (achievement.id.startsWith('endurance')) {
      return `${Math.round(current)}s / ${thresh}s`;
    }
    return `${Math.round(current)} / ${thresh}`;
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr || !mounted) return '';
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString('id-ID', {
        day: '2-digit',
        month: 'short',
        year: 'numeric'
      });
    } catch {
      return '';
    }
  };

  // Filter achievements list based on selected tab
  const filteredAchievements = ACHIEVEMENT_DEFINITIONS.filter(ach => {
    if (activeTab === 'all') return true;
    if (activeTab === 'unlocked') return unlockedIds.has(ach.id);
    if (activeTab === 'locked') return !unlockedIds.has(ach.id);
    return ach.category === activeTab;
  });

  const unlockedCount = ACHIEVEMENT_DEFINITIONS.filter(a => unlockedIds.has(a.id)).length;
  const totalCount = ACHIEVEMENT_DEFINITIONS.length;
  const overallProgressPercent = totalCount > 0 ? Math.round((unlockedCount / totalCount) * 100) : 0;

  if (loading || !currentUser) {
    return (
      <div className="min-h-screen bg-ink flex flex-col items-center justify-center text-amber select-none">
        <div className="w-10 h-10 rounded border-2 border-[#2D3345] border-t-amber animate-spin mb-4" />
        <span className="text-sm font-mono tracking-wider animate-pulse">Memuat data pencapaian...</span>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-ink flex flex-col justify-between relative overflow-hidden font-sans">
      {/* Background terminal overlay lines */}
      <div className="absolute inset-0 bg-[linear-gradient(to_bottom,rgba(255,255,255,0.01)_1px,transparent_1px)] bg-[size:100%_4px] pointer-events-none -z-10" />

      {/* Navbar */}
      <nav className="glass-panel w-full py-4 px-6 border-b border-[#2D3345] sticky top-0 z-50 flex justify-between items-center select-none">
        <div className="flex items-center gap-4 sm:gap-6">
          <Link href="/" className="flex items-center gap-2 group">
            <span className="text-2xl font-black tracking-tight text-amber group-hover:text-amber/90 transition-colors">
              GhostType
            </span>
            <span className="text-[10px] bg-amber/15 text-amber px-2 py-0.5 rounded-sm font-bold border border-amber/25">
              DEPARTURES
            </span>
          </Link>
          <div className="flex items-center gap-3 sm:gap-4 border-l border-[#2D3345] pl-4 sm:pl-6">
            <Link
              href="/leaderboard"
              className="text-slate-custom hover:text-amber text-xs sm:text-sm font-bold transition-colors"
            >
              Leaderboard
            </Link>
            <Link
              href="/profile"
              className="text-slate-custom hover:text-amber text-xs sm:text-sm font-bold transition-colors"
            >
              Profil
            </Link>
            <span className="text-amber text-xs sm:text-sm font-bold">
              Pencapaian
            </span>
            <Link
              href="/daily"
              className="text-slate-custom hover:text-amber text-xs sm:text-sm font-bold transition-colors"
            >
              Tantangan Harian
            </Link>
          </div>
        </div>
        <ThemeToggle />
      </nav>

      {/* Main Body */}
      <main className="flex-1 max-w-6xl w-full mx-auto p-4 sm:p-6 lg:p-8 space-y-8 select-none">
        {/* Header Title with Progression Overview */}
        <div className="glass-panel p-6 rounded border border-[#2D3345] flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="space-y-1 text-center md:text-left">
            <h1 className="text-2xl font-black text-amber uppercase tracking-wider">
              Terminal Pencapaian Pemain
            </h1>
            <p className="text-xs text-slate-custom font-medium max-w-md">
              Selesaikan tantangan di berbagai mode permainan untuk membuka lencana Bronze, Silver, dan Gold.
            </p>
          </div>

          {/* Progress Circle/Stats */}
          <div className="flex items-center gap-4 shrink-0">
            <div className="text-right">
              <div className="text-3xl font-black text-paper font-mono tabular-nums">
                {unlockedCount}/{totalCount}
              </div>
              <div className="text-[10px] text-slate-custom font-bold uppercase">
                Pencapaian Terbuka ({overallProgressPercent}%)
              </div>
            </div>
            {/* Minimalist progress bar circle */}
            <div className="w-14 h-14 rounded-full border-4 border-[#2D3345] flex items-center justify-center relative font-mono text-xs font-black text-amber">
              <div 
                className="absolute inset-0 rounded-full border-4 border-amber transition-all duration-500"
                style={{
                  clipPath: `polygon(50% 50%, 50% 0%, ${overallProgressPercent >= 25 ? '100% 0%,' : ''} ${overallProgressPercent >= 50 ? '100% 100%,' : ''} ${overallProgressPercent >= 75 ? '0% 100%,' : ''} ${overallProgressPercent >= 100 ? '0% 0%,' : ''} 50% 0%)`,
                  transform: 'rotate(0deg)'
                }}
              />
              {overallProgressPercent}%
            </div>
          </div>
        </div>

        {/* Tab Filters */}
        <div className="flex flex-wrap gap-2 border-b border-[#2D3345] pb-3">
          <button
            onClick={() => setActiveTab('all')}
            className={`px-4 py-2 text-xs font-bold rounded border transition-all cursor-pointer ${
              activeTab === 'all'
                ? 'bg-amber border-amber text-ink'
                : 'bg-[#1C1F2B] border-[#2D3345] text-slate-custom hover:text-paper'
            }`}
          >
            Semua
          </button>
          <button
            onClick={() => setActiveTab('unlocked')}
            className={`px-4 py-2 text-xs font-bold rounded border transition-all cursor-pointer ${
              activeTab === 'unlocked'
                ? 'bg-amber border-amber text-ink'
                : 'bg-[#1C1F2B] border-[#2D3345] text-slate-custom hover:text-paper'
            }`}
          >
            Terbuka ({unlockedCount})
          </button>
          <button
            onClick={() => setActiveTab('locked')}
            className={`px-4 py-2 text-xs font-bold rounded border transition-all cursor-pointer ${
              activeTab === 'locked'
                ? 'bg-amber border-amber text-ink'
                : 'bg-[#1C1F2B] border-[#2D3345] text-slate-custom hover:text-paper'
            }`}
          >
            Terkunci ({totalCount - unlockedCount})
          </button>
          
          <div className="w-full md:w-auto h-0 md:h-6 md:border-l md:border-[#2D3345] mx-0 md:mx-3" />

          {/* Categories filters */}
          {(['speed', 'accuracy', 'race', 'survival', 'time_attack', 'boss', 'daily'] as AchievementCategory[]).map(cat => (
            <button
              key={cat}
              onClick={() => setActiveTab(cat)}
              className={`px-3 py-2 text-xs font-bold rounded border transition-all cursor-pointer capitalize ${
                activeTab === cat
                  ? 'bg-ghost-teal border-ghost-teal text-ink'
                  : 'bg-[#1C1F2B] border-[#2D3345] text-slate-custom hover:text-paper'
              }`}
            >
              {CATEGORY_LABELS[cat]}
            </button>
          ))}
        </div>

        {/* Grid List */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredAchievements.map(ach => {
            const isUnlocked = unlockedIds.has(ach.id);
            const unlockDate = unlockedIds.get(ach.id);
            const currentVal = getAchievementProgress(ach.id);
            const progressPercent = isUnlocked ? 100 : Math.min(100, Math.round((currentVal / ach.threshold) * 100));
            const tierColor = TIER_COLORS[ach.tier];
            const tierEmoji = TIER_EMOJIS[ach.tier];

            return (
              <div
                key={ach.id}
                className={`glass-panel p-5 rounded border flex flex-col justify-between space-y-4 transition-all duration-300 relative ${
                  isUnlocked 
                    ? 'border-[#2D3345] hover:border-paper/30' 
                    : 'border-[#2D3345]/40 opacity-60'
                }`}
              >
                {/* Accent line for unlocked */}
                {isUnlocked && (
                  <div 
                    className="absolute top-0 inset-x-0 h-1 rounded-t"
                    style={{ backgroundColor: tierColor }}
                  />
                )}

                <div className="flex items-start gap-4">
                  {/* Medal Icon Badge */}
                  <div
                    className={`w-12 h-12 rounded flex items-center justify-center text-2xl shrink-0 border transition-colors ${
                      isUnlocked ? '' : 'bg-[#11131A] border-[#2D3345] text-slate-custom/40'
                    }`}
                    style={isUnlocked ? {
                      backgroundColor: `${tierColor}15`,
                      borderColor: `${tierColor}30`,
                    } : {}}
                  >
                    {isUnlocked ? tierEmoji : '🔒'}
                  </div>

                  {/* Text Details */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-0.5">
                      <span className="text-[9px] uppercase font-bold text-slate-custom">
                        {CATEGORY_LABELS[ach.category]}
                      </span>
                      {isUnlocked && (
                        <span className="text-[9px] font-bold text-slate-custom">
                          {formatDate(unlockDate)}
                        </span>
                      )}
                    </div>
                    <h3 className={`text-sm font-extrabold truncate uppercase ${isUnlocked ? 'text-paper' : 'text-slate-custom'}`}>
                      {ach.name}
                    </h3>
                    <p className="text-xs text-slate-custom font-medium mt-1 leading-relaxed">
                      {ach.description}
                    </p>
                  </div>
                </div>

                {/* Progress bar info */}
                <div className="space-y-1.5 pt-2">
                  <div className="flex justify-between text-[10px] font-bold text-slate-custom font-mono">
                    <span>PROGRESS</span>
                    <span>
                      {isUnlocked ? 'COMPLETE' : formatProgressLabel(ach, currentVal)}
                    </span>
                  </div>
                  
                  {/* Progress bar container */}
                  <div className="w-full h-2.5 bg-[#11131A] border border-[#2D3345] rounded-sm overflow-hidden p-0.5">
                    <div
                      className="h-full rounded-sm transition-all duration-500 ease-out"
                      style={{
                        width: `${progressPercent}%`,
                        backgroundColor: isUnlocked ? tierColor : 'var(--slate)'
                      }}
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Empty State */}
        {filteredAchievements.length === 0 && (
          <div className="glass-panel py-16 text-center border border-[#2D3345]">
            <div className="text-4xl mb-2">🔍</div>
            <h3 className="text-md font-bold text-paper">Tidak Ada Pencapaian Ditemukan</h3>
            <p className="text-xs text-slate-custom mt-1">
              Tidak ada pencapaian yang memenuhi filter pencarian Anda saat ini.
            </p>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="glass-panel w-full py-4 text-center border-t border-[#2D3345] text-xs text-slate-custom select-none">
        &copy; 2026 GhostType. Powered by Supabase.
      </footer>
    </div>
  );
}
