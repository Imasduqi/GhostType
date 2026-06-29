"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabase/client';
import { 
  generateDailyChallenge, 
  getChallengeDateString, 
  DailyChallenge 
} from '@/lib/daily/dailyChallengeGenerator';
import { 
  getOrSyncUserStreak, 
  getDailyLeaderboard, 
  hasUserCompletedDaily,
  UserDailyStreak
} from '@/lib/supabase/dailyQueries';
import { ThemeToggle } from '@/components/ThemeToggle';

export default function DailyChallengePage() {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [challenge, setChallenge] = useState<DailyChallenge | null>(null);
  const [userScore, setUserScore] = useState<any | null>(null);
  const [completed, setCompleted] = useState(false);
  const [streak, setStreak] = useState<UserDailyStreak | null>(null);
  const [leaderboard, setLeaderboard] = useState<any[]>([]);
  const [timeLeft, setTimeLeft] = useState('');
  const [mounted, setMounted] = useState(false);

  // Authenticate user
  useEffect(() => {
    setMounted(true);
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!session?.user) {
        router.push('/login?redirect=/daily');
      } else {
        setCurrentUser(session.user);
        const todayStr = getChallengeDateString(new Date());
        const dailyChallenge = generateDailyChallenge(new Date());
        setChallenge(dailyChallenge);

        // Fetch user streak & sync if broken
        const userStreak = await getOrSyncUserStreak(session.user.id, todayStr);
        setStreak(userStreak);

        // Fetch if completed today
        const hasCompleted = await hasUserCompletedDaily(session.user.id, todayStr);
        setCompleted(hasCompleted);

        // Fetch score details
        const { data: scoreDetails } = await supabase
          .from('daily_challenge_scores')
          .select('*')
          .eq('user_id', session.user.id)
          .eq('challenge_date', todayStr)
          .maybeSingle();
        setUserScore(scoreDetails);

        // Fetch leaderboard
        const board = await getDailyLeaderboard(todayStr);
        setLeaderboard(board);

        setLoading(false);
      }
    });
  }, [router]);

  // Real-time Countdown Timer until midnight
  useEffect(() => {
    const updateCountdown = () => {
      const now = new Date();
      const midnight = new Date();
      midnight.setHours(24, 0, 0, 0); // Next midnight

      const diffMs = midnight.getTime() - now.getTime();
      if (diffMs <= 0) {
        setTimeLeft('00:00:00');
        // Refresh page to generate next day's challenge
        window.location.reload();
        return;
      }

      const hours = String(Math.floor(diffMs / (1000 * 60 * 60))).padStart(2, '0');
      const minutes = String(Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60))).padStart(2, '0');
      const seconds = String(Math.floor((diffMs % (1000 * 60)) / 1000)).padStart(2, '0');

      setTimeLeft(`${hours}:${minutes}:${seconds}`);
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);
    return () => clearInterval(interval);
  }, []);

  const getChallengeModeUrl = () => {
    if (!challenge) return '#';
    switch (challenge.type) {
      case 'speed_run':
      case 'perfect_word':
        return `/race?daily=true&lang=${challenge.language}&diff=${challenge.difficulty}&text=${encodeURIComponent(challenge.text || '')}`;
      case 'accuracy_trial':
        return '/time-attack?daily=true';
      case 'survival_reach':
        return '/survival?daily=true';
      case 'boss_rush':
        return '/boss-battle?daily=true';
      default:
        return '#';
    }
  };

  const getChallengeTypeLabel = (type: string) => {
    switch (type) {
      case 'speed_run': return 'Speed Run (WPM)';
      case 'perfect_word': return 'Perfect Word (Typo)';
      case 'accuracy_trial': return 'Accuracy Trial (%)';
      case 'survival_reach': return 'Survival Reach (Score)';
      case 'boss_rush': return 'Boss Rush (Level)';
      default: return type;
    }
  };

  // Sort daily leaderboard deterministically based on challenge type
  const sortedLeaderboard = [...leaderboard].sort((a, b) => {
    const valA = Number(a.achieved_value);
    const valB = Number(b.achieved_value);
    if (challenge?.type === 'perfect_word') {
      return valA - valB; // Ascending (fewer typos is better)
    } else {
      return valB - valA; // Descending (higher is better)
    }
  });

  if (loading || !currentUser || !challenge) {
    return (
      <div className="min-h-screen bg-ink flex flex-col items-center justify-center text-amber select-none">
        <div className="w-10 h-10 rounded border-2 border-[#2D3345] border-t-amber animate-spin mb-4" />
        <span className="text-sm font-mono tracking-wider animate-pulse">Menghubungkan ke Pusat Penerbangan Harian...</span>
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
            <Link
              href="/achievements"
              className="text-slate-custom hover:text-amber text-xs sm:text-sm font-bold transition-colors"
            >
              Pencapaian
            </Link>
            <span className="text-amber text-xs sm:text-sm font-bold">
              Tantangan Harian
            </span>
          </div>
        </div>
        <ThemeToggle />
      </nav>

      {/* Main Content */}
      <main className="flex-1 max-w-5xl w-full mx-auto p-4 sm:p-6 lg:p-8 grid grid-cols-1 lg:grid-cols-3 gap-6 select-none">
        
        {/* Left Column: Challenge & Streak */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Daily Challenge Card */}
          <div className="glass-panel p-6 rounded border border-[#2D3345] relative overflow-hidden flex flex-col justify-between min-h-[350px]">
            <div className="absolute top-0 inset-x-0 h-1 bg-amber" />

            {/* Header info */}
            <div className="flex justify-between items-start gap-4">
              <div>
                <span className="text-[10px] uppercase font-extrabold tracking-wider bg-amber/15 text-amber border border-amber/25 px-2 py-0.5 rounded-sm">
                  MISI AKTIF • {challenge.dateString}
                </span>
                <h1 className="text-3xl font-black text-paper mt-3 uppercase tracking-wide">
                  {challenge.title}
                </h1>
              </div>

              {/* Status Badge */}
              <div className="text-right">
                <span className="block text-[9px] font-bold text-slate-custom uppercase">STATUS</span>
                <span className={`inline-block text-xs font-black uppercase mt-1 px-2 py-0.5 rounded-sm border ${
                  completed
                    ? 'bg-ghost-teal/10 border-ghost-teal/25 text-ghost-teal'
                    : userScore
                      ? 'bg-error-custom/10 border-error-custom/25 text-error-custom'
                      : 'bg-amber/10 border-amber/25 text-amber animate-pulse'
                }`}>
                  {completed ? 'SELESAI' : userScore ? 'GAGAL' : 'BELUM SELESAI'}
                </span>
              </div>
            </div>

            {/* Mission Description */}
            <div className="bg-[#11131A] border border-[#2D3345] p-5 rounded space-y-3 my-4">
              <p className="text-sm font-bold text-paper leading-relaxed">
                {challenge.description}
              </p>
              <div className="grid grid-cols-2 gap-4 text-xs font-mono pt-1">
                <div>
                  <span className="block text-slate-custom uppercase text-[9px]">TARGET SASARAN</span>
                  <span className="text-amber font-extrabold text-sm uppercase">
                    {challenge.type === 'perfect_word' 
                      ? `Maks ${challenge.targetValue} Typo` 
                      : `${challenge.targetValue} ${challenge.type === 'accuracy_trial' ? '%' : challenge.type === 'speed_run' ? 'WPM' : challenge.type === 'boss_rush' ? 'Level' : 'Poin'}`
                    }
                  </span>
                </div>
                {userScore && (
                  <div>
                    <span className="block text-slate-custom uppercase text-[9px]">PENCAPAIAN TERAKHIR</span>
                    <span className={`font-extrabold text-sm ${completed ? 'text-ghost-teal' : 'text-error-custom'}`}>
                      {challenge.type === 'perfect_word'
                        ? `${userScore.achieved_value} Typo`
                        : `${userScore.achieved_value} ${challenge.type === 'accuracy_trial' ? '%' : challenge.type === 'speed_run' ? 'WPM' : challenge.type === 'boss_rush' ? 'Level' : 'Poin'}`
                      }
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Start Button & Countdown */}
            <div className="flex flex-col sm:flex-row justify-between items-center gap-4 pt-3 border-t border-[#2D3345]/50">
              <div className="text-center sm:text-left">
                <span className="block text-[9px] text-slate-custom font-bold uppercase">RESET DALAM</span>
                <span className="text-lg font-mono font-black text-amber tracking-wider tabular-nums">
                  {timeLeft}
                </span>
              </div>

              <Link
                href={getChallengeModeUrl()}
                className={`w-full sm:w-auto px-6 py-3 text-xs uppercase font-extrabold tracking-wider rounded transition-all active:scale-95 shadow-md flex items-center justify-center gap-2 cursor-pointer ${
                  completed
                    ? 'bg-[#1C1F2B] hover:bg-[#272B38] text-paper border border-[#2D3345]'
                    : 'bg-amber hover:bg-amber/90 text-ink shadow-amber/10'
                }`}
              >
                {completed ? 'Coba Lagi (Meningkatkan Nilai)' : 'Mulai Tantangan'}
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                </svg>
              </Link>
            </div>
          </div>

          {/* Streak Overview Card */}
          <div className="glass-panel p-6 rounded border border-[#2D3345] grid grid-cols-2 gap-4 text-center">
            <div className="space-y-1">
              <span className="block text-[10px] text-slate-custom font-bold uppercase tracking-wider">
                Streak Hari Ini
              </span>
              <div className="text-4xl font-mono font-black text-amber drop-shadow-[0_0_8px_rgba(232,163,61,0.2)]">
                🔥 {streak?.current_streak || 0}
              </div>
              <p className="text-[10px] text-slate-custom font-medium">
                Selesaikan tantangan berturut-turut untuk menjaga streak tetap menyala.
              </p>
            </div>

            <div className="space-y-1 border-l border-[#2D3345] pl-4">
              <span className="block text-[10px] text-slate-custom font-bold uppercase tracking-wider">
                Streak Terpanjang
              </span>
              <div className="text-4xl font-mono font-black text-ghost-teal drop-shadow-[0_0_8px_rgba(94,234,212,0.2)]">
                👑 {streak?.longest_streak || 0}
              </div>
              <p className="text-[10px] text-slate-custom font-medium">
                Rekor streak terpanjang yang pernah Anda capai di terminal bandara.
              </p>
            </div>
          </div>
        </div>

        {/* Right Column: Daily Leaderboard */}
        <div className="glass-panel p-6 rounded border border-[#2D3345] flex flex-col justify-between min-h-[450px]">
          <div className="space-y-4">
            <div className="border-b border-[#2D3345] pb-3">
              <h2 className="text-md font-black text-amber uppercase tracking-wider">
                Leaderboard Harian
              </h2>
              <span className="text-[9px] text-slate-custom font-bold uppercase">
                {getChallengeTypeLabel(challenge.type)} • {challenge.dateString}
              </span>
            </div>

            {/* List of completions */}
            <div className="space-y-2.5 overflow-y-auto max-h-[350px] custom-scrollbar pr-1">
              {sortedLeaderboard.map((item, index) => {
                const username = item.profiles?.username || 'Pemain';
                const avatar = item.profiles?.avatar_url || 'https://api.dicebear.com/7.x/bottts/svg';
                const achievedVal = Number(item.achieved_value);
                const currentStreak = item.profiles?.user_daily_streak?.[0]?.current_streak || 0;

                return (
                  <div 
                    key={index}
                    className={`flex items-center justify-between p-2 rounded border border-[#2D3345]/50 bg-[#11131A]/60 text-xs font-mono font-medium ${
                      item.user_id === currentUser.id ? 'border-amber bg-amber/5' : ''
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      {/* Rank number */}
                      <span className="w-5 font-black text-amber text-center">
                        #{index + 1}
                      </span>
                      <img 
                        src={avatar} 
                        alt="Avatar" 
                        className="w-6 h-6 rounded bg-ink border border-[#2D3345]"
                      />
                      <div className="truncate max-w-[110px]">
                        <div className="font-extrabold text-paper truncate">{username}</div>
                        {currentStreak > 0 && (
                          <div className="text-[8px] text-amber font-sans font-bold">🔥 {currentStreak} HARI</div>
                        )}
                      </div>
                    </div>

                    {/* Score */}
                    <div className="text-right">
                      <span className="text-ghost-teal font-extrabold text-sm tabular-nums">
                        {challenge.type === 'perfect_word' 
                          ? `${achievedVal} Typo` 
                          : `${achievedVal.toLocaleString()}${challenge.type === 'accuracy_trial' ? '%' : ''}`
                        }
                      </span>
                    </div>
                  </div>
                );
              })}

              {sortedLeaderboard.length === 0 && (
                <div className="text-center py-16 text-slate-custom space-y-2">
                  <div className="text-2xl">⏳</div>
                  <div className="text-[10px] font-bold uppercase">Belum Ada Laporan Masuk</div>
                  <p className="text-[9px] font-medium leading-relaxed max-w-[180px] mx-auto">
                    Jadilah yang pertama menyelesaikan tantangan hari ini dan pimpin papan keberangkatan!
                  </p>
                </div>
              )}
            </div>
          </div>

          <div className="text-[9px] text-slate-custom font-medium leading-relaxed border-t border-[#2D3345]/50 pt-3 text-center">
            Papan peringkat ini direset otomatis setiap tengah malam. Hanya percobaan sukses yang dicatat.
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="glass-panel w-full py-4 text-center border-t border-[#2D3345] text-xs text-slate-custom select-none">
        &copy; 2026 GhostType. Powered by Supabase.
      </footer>
    </div>
  );
}
