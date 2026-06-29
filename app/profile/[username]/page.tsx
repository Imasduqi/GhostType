"use client";

import { use, useState, useEffect, useCallback, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase/client';
import { Profile, Attempt, UserStats } from '@/types';
import { getUserProfile } from '@/lib/supabase/queries';
import { ThemeToggle } from '@/components/ThemeToggle';

export default function UserProfilePage({
  params,
}: {
  params: Promise<{ username: string }> | { username: string };
}) {
  const router = useRouter();
  
  // Resolve params defensively (works in Next 14, 15, and 16)
  const resolvedParams = 'then' in params ? use(params) : params;
  const username = decodeURIComponent(resolvedParams.username);

  // States
  const [profile, setProfile] = useState<Profile | null>(null);
  const [stats, setStats] = useState<UserStats | null>(null);
  const [attempts, setAttempts] = useState<any[]>([]);

  // Secret Boss conditions & achievements
  const [bestTimeAttackWpm, setBestTimeAttackWpm] = useState<number>(0);
  const [hasClearedChapter5, setHasClearedChapter5] = useState<boolean>(false);
  const [unlockedAchievements, setUnlockedAchievements] = useState<Set<string>>(new Set());
  const [secretBossClears, setSecretBossClears] = useState<any[]>([]);
  
  // UI Loading/Error States
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Auth States (Navbar & Owner detection)
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [currentProfile, setCurrentProfile] = useState<Profile | null>(null);
  const [authLoading, setAuthLoading] = useState(true);

  // Chart Interaction State
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  // Hydration prevention
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  // Fetch current user auth profile for Navbar
  const fetchCurrentProfile = useCallback(async (userId: string) => {
    const userProfile = await getUserProfile(userId);
    setCurrentProfile(userProfile);
  }, []);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setCurrentUser(session?.user ?? null);
      if (session?.user) {
        fetchCurrentProfile(session.user.id);
      }
      setAuthLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setCurrentUser(session?.user ?? null);
      if (session?.user) {
        fetchCurrentProfile(session.user.id);
      } else {
        setCurrentProfile(null);
      }
      setAuthLoading(false);
    });

    return () => subscription.unsubscribe();
  }, [fetchCurrentProfile]);

  // Fetch target profile, stats, and attempts history
  const fetchProfileData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // 1. Fetch profile by username
      const { data: profileData, error: profileErr } = await supabase
        .from('profiles')
        .select('*')
        .eq('username', username)
        .maybeSingle();

      if (profileErr) throw profileErr;
      if (!profileData) {
        setError(`Pengguna "${username}" tidak ditemukan.`);
        setLoading(false);
        return;
      }

      setProfile(profileData);

      // 2. Fetch aggregated user stats
      const { data: statsData, error: statsErr } = await supabase
        .from('user_stats')
        .select('*')
        .eq('user_id', profileData.id)
        .maybeSingle();

      if (statsErr) {
        console.error('Error fetching user stats:', statsErr);
      }
      setStats(statsData || {
        user_id: profileData.id,
        avg_wpm: 0,
        best_wpm: 0,
        total_attempts: 0,
        avg_accuracy: 0
      });

      // 3. Fetch attempt history
      const { data: attemptsData, error: attemptsErr } = await supabase
        .from('attempts')
        .select(`
          id,
          wpm,
          accuracy,
          duration_ms,
          created_at,
          texts (
            content,
            language,
            difficulty
          )
        `)
        .eq('user_id', profileData.id)
        .order('created_at', { ascending: false });

      if (attemptsErr) throw attemptsErr;
      setAttempts(attemptsData || []);

      // 4. Fetch Time Attack best WPM
      const { data: taData, error: taErr } = await supabase
        .from('time_attack_scores')
        .select('wpm')
        .eq('user_id', profileData.id)
        .order('wpm', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (taErr) console.error('Error fetching best time attack wpm:', taErr);
      setBestTimeAttackWpm(taData?.wpm || 0);

      // 5. Fetch Story Progress for Chapter 5
      const { data: storyProgressData, error: storyErr } = await supabase
        .from('story_progress')
        .select('status')
        .eq('user_id', profileData.id)
        .eq('chapter_id', 5)
        .maybeSingle();
      if (storyErr) console.error('Error fetching story progress:', storyErr);
      setHasClearedChapter5(storyProgressData?.status === 'cleared');

      // 6. Fetch User Achievements
      const { data: achData, error: achErr } = await supabase
        .from('user_achievements')
        .select('achievement_id')
        .eq('user_id', profileData.id);
      if (achErr) console.error('Error fetching achievements:', achErr);
      setUnlockedAchievements(new Set(achData?.map(a => a.achievement_id) || []));

      // 7. Fetch Secret Boss Clears
      const { data: secretClearsData, error: secretErr } = await supabase
        .from('secret_boss_clears')
        .select('*')
        .eq('user_id', profileData.id);
      if (secretErr) console.error('Error fetching secret clears:', secretErr);
      setSecretBossClears(secretClearsData || []);

    } catch (err: any) {
      console.error('Failed to load profile data:', err);
      setError(err.message || 'Terjadi kesalahan saat memuat data profil.');
    } finally {
      setLoading(false);
    }
  }, [username]);

  useEffect(() => {
    fetchProfileData();
  }, [fetchProfileData]);

  // Auth actions
  const handleLogout = async () => {
    await supabase.auth.signOut();
    setCurrentUser(null);
    setCurrentProfile(null);
    router.push('/');
  };

  const isOwner = currentUser && profile && currentUser.id === profile.id;

  // Custom SVG Chart calculations
  const chartData = useMemo(() => {
    if (attempts.length < 2) return [];
    // Sort attempts chronologically (ascending) for progress plotting
    return [...attempts]
      .reverse()
      .map((att, idx) => ({
        index: idx,
        wpm: Number(att.wpm),
        accuracy: Number(att.accuracy),
        created_at: att.created_at,
        language: att.texts?.language || 'id',
        difficulty: att.texts?.difficulty || 'medium',
      }));
  }, [attempts]);

  const svgDimensions = { width: 600, height: 200, paddingX: 45, paddingY: 30 };
  const plotWidth = svgDimensions.width - 2 * svgDimensions.paddingX;
  const plotHeight = svgDimensions.height - 2 * svgDimensions.paddingY;

  const chartParams = useMemo(() => {
    if (chartData.length < 2) return null;

    const wpms = chartData.map(d => d.wpm);
    const maxVal = Math.max(...wpms);
    const minVal = Math.min(...wpms);
    
    // Give vertical padding to chart bounds
    const maxWpm = Math.ceil(maxVal + (maxVal === minVal ? 10 : (maxVal - minVal) * 0.1));
    const minWpm = Math.max(0, Math.floor(minVal - (maxVal === minVal ? 10 : (maxVal - minVal) * 0.1)));
    const wpmRange = maxWpm - minWpm;

    const points = chartData.map((d, i) => {
      const x = svgDimensions.paddingX + (i / (chartData.length - 1)) * plotWidth;
      const y = svgDimensions.height - svgDimensions.paddingY - ((d.wpm - minWpm) / wpmRange) * plotHeight;
      return { x, y, data: d };
    });

    const pathD = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' ');

    const areaD = `
      ${pathD}
      L ${points[points.length - 1].x.toFixed(1)} ${(svgDimensions.height - svgDimensions.paddingY).toFixed(1)}
      L ${points[0].x.toFixed(1)} ${(svgDimensions.height - svgDimensions.paddingY).toFixed(1)}
      Z
    `;

    return { points, pathD, areaD, minWpm, maxWpm };
  }, [chartData, plotWidth, plotHeight, svgDimensions]);

  const renderSecretBossCard = (
    bossId: string,
    censoredName: string,
    realName: string,
    description: string,
    isUnlocked: boolean,
    hint: string,
    battleRoute: string
  ) => {
    const clearRecord = secretBossClears.find(c => c.boss_id === bossId);
    const isCleared = !!clearRecord;

    if (!isUnlocked) {
      return (
        <div className="bg-[#11131A] border border-red-950/40 rounded p-5 flex flex-col justify-between h-48 relative overflow-hidden group">
          <div className="absolute inset-0 bg-red-950/5 opacity-50 group-hover:opacity-100 transition-opacity pointer-events-none" />
          <div className="space-y-2">
            <div className="flex justify-between items-start">
              <span className="font-mono text-sm font-black text-slate-custom tracking-wider select-none bg-[#1A1C2C] px-2 py-0.5 rounded border border-[#2D3345]">
                {censoredName}
              </span>
              <span className="text-red-500 text-xs">🔒</span>
            </div>
            <p className="text-[10px] text-slate-custom font-medium italic pt-2 leading-relaxed">
              &quot;{hint}&quot;
            </p>
          </div>
          <div className="text-[9px] text-red-500/70 font-mono font-bold tracking-widest uppercase border-t border-red-950/30 pt-3">
            [ STATUS: TERKUNCI ]
          </div>
        </div>
      );
    }

    if (isCleared) {
      const clearedDate = clearRecord.cleared_at ? formatDate(clearRecord.cleared_at) : 'Date Unknown';
      return (
        <div className="bg-[#1C1F2B] border border-amber/35 rounded p-5 flex flex-col justify-between h-48 relative overflow-hidden shadow-[0_0_10px_rgba(232,163,61,0.05)]">
          <div className="space-y-2">
            <div className="flex justify-between items-start">
              <span className="font-mono text-sm font-black text-amber tracking-wider">
                {realName}
              </span>
              <span className="text-xs bg-amber/15 text-amber border border-amber/30 px-2 py-0.5 rounded font-bold uppercase tracking-wider scale-90">
                🥇 CLEARED
              </span>
            </div>
            <p className="text-[10px] text-slate-custom leading-relaxed">
              {description}
            </p>
          </div>
          <div className="border-t border-amber/20 pt-3 flex flex-col gap-0.5">
            <span className="text-[9px] text-slate-custom font-medium">Dikalahkan pada:</span>
            <span className="text-[10px] text-amber font-mono font-bold">{clearedDate}</span>
          </div>
        </div>
      );
    }

    // Unlocked but not cleared
    return (
      <div className="bg-[#11131A] border border-red-500/40 rounded p-5 flex flex-col justify-between h-48 relative overflow-hidden shadow-[0_0_10px_rgba(239,68,68,0.1)] hover:border-red-500 transition-colors">
        <div className="space-y-2">
          <div className="flex justify-between items-start">
            <span className="font-mono text-sm font-black text-paper tracking-wider">
              {realName}
            </span>
            <span className="text-red-500 text-[10px] font-mono font-black animate-pulse">
              [ SIAP TANTANG ]
            </span>
          </div>
          <p className="text-[10px] text-slate-custom leading-relaxed">
            {description}
          </p>
        </div>
        <div className="border-t border-red-950/30 pt-3">
          <Link
            href={battleRoute}
            className="w-full inline-block text-center py-1.5 bg-red-900/20 hover:bg-red-900/45 text-red-500 hover:text-red-400 font-mono text-xs font-bold rounded border border-red-500/45 hover:border-red-400 transition-all uppercase tracking-wider active:scale-[0.98]"
          >
            Tantang Sekarang
          </Link>
        </div>
      </div>
    );
  };

  // Helper date formatter safely handled client-side
  const formatDate = (dateStr: string) => {
    if (!mounted) return '...';
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString('id-ID', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return dateStr;
    }
  };

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
              className="text-amber text-xs sm:text-sm font-bold"
            >
              Profil
            </Link>
            <Link
              href="/achievements"
              className="text-slate-custom hover:text-amber text-xs sm:text-sm font-bold transition-colors"
            >
              Pencapaian
            </Link>
            <Link
              href="/daily"
              className="text-slate-custom hover:text-amber text-xs sm:text-sm font-bold transition-colors"
            >
              Tantangan Harian
            </Link>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <ThemeToggle />
          {authLoading ? (
            <div className="w-6 h-6 rounded-full border-2 border-[#2D3345] border-t-amber animate-spin" />
          ) : currentUser && currentProfile ? (
            <div className="flex items-center gap-3">
              <div className="text-right hidden sm:block">
                <div className="text-sm font-bold text-paper">{currentProfile.username}</div>
                <div className="text-[10px] text-slate-custom font-medium">Pemain</div>
              </div>
              <img
                src={currentProfile.avatar_url || 'https://api.dicebear.com/7.x/bottts/svg'}
                alt="Avatar"
                className="w-9 h-9 rounded-sm border border-[#2D3345] bg-[#11131A] object-cover"
              />
              <button
                onClick={handleLogout}
                className="px-4 py-2 bg-[#1C1F2B] hover:bg-error-custom/10 text-slate-custom hover:text-error-custom rounded border border-[#2D3345] hover:border-error-custom/30 text-xs font-bold transition-all cursor-pointer active:scale-95"
              >
                Logout
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Link
                href="/login"
                className="px-4 py-2 hover:bg-amber/10 text-slate-custom hover:text-paper rounded text-xs font-bold transition-all"
              >
                Masuk
              </Link>
              <Link
                href="/register"
                className="px-4 py-2 bg-amber hover:bg-amber/90 text-ink rounded text-xs font-bold shadow-md shadow-amber/10 transition-all active:scale-95"
              >
                Daftar
              </Link>
            </div>
          )}
        </div>
      </nav>

      {/* Main Content Area */}
      <main className="flex-1 py-8 px-4 sm:px-6 lg:px-8 flex flex-col items-center">
        <div className="w-full max-w-4xl space-y-6">

          {/* Loading State */}
          {loading && (
            <div className="glass-card p-12 rounded border border-[#2D3345] text-center flex flex-col items-center space-y-4">
              <div className="w-10 h-10 rounded-full border-4 border-[#2D3345] border-t-amber animate-spin" />
              <p className="text-sm text-slate-custom font-bold uppercase tracking-wider">
                Mengunduh Data Profil Pemain...
              </p>
            </div>
          )}

          {/* Error State */}
          {!loading && error && (
            <div className="glass-card p-8 rounded border border-error-custom/30 text-center space-y-4">
              <span className="text-4xl">🛬</span>
              <h2 className="text-xl font-bold text-error-custom uppercase">Pendaratan Darurat!</h2>
              <p className="text-sm text-slate-custom font-medium">{error}</p>
              <Link
                href="/"
                className="inline-block px-6 py-2.5 bg-amber hover:bg-amber/90 text-ink font-bold rounded text-xs uppercase tracking-wider transition-all"
              >
                Kembali ke Beranda
              </Link>
            </div>
          )}

          {/* Main profile views */}
          {!loading && !error && profile && (
            <>
              {/* Header profile info */}
              <div className="glass-card p-6 rounded border border-[#2D3345] relative overflow-hidden flex flex-col sm:flex-row items-center gap-6 select-none">
                <div className="absolute top-0 inset-x-0 h-[3px] bg-amber" />
                
                <img
                  src={profile.avatar_url || 'https://api.dicebear.com/7.x/bottts/svg?seed=' + profile.username}
                  alt={profile.username}
                  className="w-20 h-20 rounded border border-[#2D3345] bg-[#11131A] object-cover"
                />

                <div className="text-center sm:text-left space-y-2 flex-1">
                  <div className="flex flex-col sm:flex-row sm:items-center gap-2 justify-center sm:justify-start">
                    <h1 className="text-2xl font-black text-paper tracking-tight">{profile.username}</h1>
                    {isOwner && (
                      <span className="self-center sm:self-auto px-2 py-0.5 bg-amber/15 text-amber border border-amber/35 rounded-sm text-[9px] font-bold uppercase tracking-wider">
                        Profil Anda
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-slate-custom font-medium">
                    Bergabung pada: {formatDate(profile.created_at || '')}
                  </div>
                </div>

                <div className="flex flex-col gap-2 w-full sm:w-auto">
                  <Link
                    href="/"
                    className="px-6 py-3 bg-amber hover:bg-amber/90 text-ink text-center text-xs font-bold rounded shadow-md shadow-amber/5 uppercase tracking-wider transition-all active:scale-95"
                  >
                    Mulai Latihan Baru
                  </Link>
                </div>
              </div>

              {/* Statistics Grid */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {/* WPM Terbaik */}
                <div className="glass-card p-5 rounded border border-[#2D3345] flex flex-col justify-between relative overflow-hidden select-none">
                  <div className="text-slate-custom font-bold text-[10px] sm:text-xs uppercase tracking-wider">WPM Terbaik</div>
                  <div className="text-3xl sm:text-4xl font-mono tabular-nums font-black text-amber my-1.5 drop-shadow-[0_0_8px_rgba(232,163,61,0.2)]">
                    {stats?.best_wpm || 0}
                  </div>
                  <div className="text-[10px] text-slate-custom font-medium">Kecepatan puncak</div>
                </div>

                {/* WPM Rata-rata */}
                <div className="glass-card p-5 rounded border border-[#2D3345] flex flex-col justify-between relative overflow-hidden select-none">
                  <div className="text-slate-custom font-bold text-[10px] sm:text-xs uppercase tracking-wider">WPM Rata-rata</div>
                  <div className="text-3xl sm:text-4xl font-mono tabular-nums font-black text-amber my-1.5 drop-shadow-[0_0_8px_rgba(232,163,61,0.2)]">
                    {stats?.avg_wpm || 0}
                  </div>
                  <div className="text-[10px] text-slate-custom font-medium">Konsistensi terbang</div>
                </div>

                {/* Akurasi Rata-rata */}
                <div className="glass-card p-5 rounded border border-[#2D3345] flex flex-col justify-between relative overflow-hidden select-none">
                  <div className="text-slate-custom font-bold text-[10px] sm:text-xs uppercase tracking-wider">Akurasi Rata-rata</div>
                  <div className="text-3xl sm:text-4xl font-mono tabular-nums font-black text-ghost-teal my-1.5 drop-shadow-[0_0_8px_rgba(94,234,212,0.2)]">
                    {stats?.avg_accuracy || 0}%
                  </div>
                  <div className="text-[10px] text-slate-custom font-medium">Ketepatan ketikan</div>
                </div>

                {/* Total attempts */}
                <div className="glass-card p-5 rounded border border-[#2D3345] flex flex-col justify-between relative overflow-hidden select-none">
                  <div className="text-slate-custom font-bold text-[10px] sm:text-xs uppercase tracking-wider">Total Penerbangan</div>
                  <div className="text-3xl sm:text-4xl font-mono tabular-nums font-black text-ghost-teal my-1.5 drop-shadow-[0_0_8px_rgba(94,234,212,0.2)]">
                    {stats?.total_attempts || 0}
                  </div>
                  <div className="text-[10px] text-slate-custom font-medium">Sesi terselesaikan</div>
                </div>
              </div>

              {/* CLASSIFIED Section */}
              {isOwner && (
                <div className="glass-card p-6 rounded border-2 border-dashed border-red-950 bg-[#140b0f]/30 relative overflow-hidden select-none shadow-[0_0_15px_rgba(239,68,68,0.05)]">
                  {/* Warning line style */}
                  <div className="absolute top-0 inset-x-0 h-[2px] bg-red-600/30 animate-pulse" />
                  
                  <div className="flex items-center gap-3 border-b border-[#2D3345] pb-3 mb-5">
                    <span className="text-xl">☣️</span>
                    <div>
                      <h2 className="text-sm font-bold uppercase tracking-wider text-red-500 font-mono">
                        CLASSIFIED CHALLENGES
                      </h2>
                      <p className="text-[10px] text-slate-custom font-medium mt-0.5">
                        Dokumen rahasia di luar kendali Lexicon Realm. Modifikasi sistem terdeteksi.
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {/* Boss 1: MonkeyType Prime */}
                    {renderSecretBossCard(
                      'monkeytype_prime',
                      '████ Prime',
                      'MonkeyType Prime',
                      'Entitas kecepatan murni tanpa bentuk fisik. Kecepatan adalah satu-satunya hukum di wilayahnya.',
                      bestTimeAttackWpm >= 80,
                      'Capai kecepatan yang sangat tinggi di Time Attack',
                      '/secret/prime'
                    )}

                    {/* Boss 2: Ghost King */}
                    {renderSecretBossCard(
                      'ghost_king',
                      '████ King',
                      'Ghost King',
                      'Raja bayangan yang meniru statistik dan gaya permainan terbaik Anda sendiri.',
                      hasClearedChapter5 && bestTimeAttackWpm >= 80,
                      'Selesaikan kisah utama dan capai kecepatan puncak di Time Attack',
                      '/secret/ghost'
                    )}

                    {/* Boss 3: The Developer */}
                    {renderSecretBossCard(
                      'the_developer',
                      'The ████████',
                      'The Developer',
                      'Kesadaran di balik kode game ini sendiri. Dia mengawasi setiap ketukan tombol Anda.',
                      unlockedAchievements.has('secret_prime_gold') && unlockedAchievements.has('secret_ghost_gold'),
                      'Kalahkan kedua entitas rahasia terdahulu',
                      '/secret/developer'
                    )}
                  </div>
                </div>
              )}

              {/* Progress Chart Card */}
              <div className="glass-card p-6 rounded border border-[#2D3345] space-y-4 select-none">
                <h2 className="text-sm font-bold uppercase tracking-wider text-slate-custom border-b border-[#2D3345] pb-2">
                  Grafik Kecepatan Penerbangan (WPM Over Time)
                </h2>

                {attempts.length < 2 ? (
                  <div className="py-12 text-center text-slate-custom text-xs font-semibold">
                    <span className="text-lg block mb-2">📈</span>
                    Selesaikan minimal 2 balapan untuk menampilkan grafik perkembangan kecepatan Anda.
                  </div>
                ) : (
                  chartParams && (
                    <div className="space-y-4">
                      {/* SVG Canvas wrapper */}
                      <div className="relative w-full">
                        <svg
                          viewBox={`0 0 ${svgDimensions.width} ${svgDimensions.height}`}
                          className="w-full h-auto overflow-visible"
                        >
                          <defs>
                            {/* Area Gradient */}
                            <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="0%" stopColor="var(--amber)" stopOpacity="0.18" />
                              <stop offset="100%" stopColor="var(--amber)" stopOpacity="0" />
                            </linearGradient>

                            {/* Line Glow Filter */}
                            <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
                              <feDropShadow dx="0" dy="0" stdDeviation="4" floodColor="#E8A33D" floodOpacity="0.4" />
                            </filter>
                          </defs>

                          {/* Grid Lines */}
                          {[0, 1, 2, 3, 4].map((grid, idx) => {
                            const yVal = svgDimensions.paddingY + (idx / 4) * plotHeight;
                            const wpmVal = chartParams.maxWpm - (idx / 4) * (chartParams.maxWpm - chartParams.minWpm);
                            return (
                              <g key={idx}>
                                <line
                                  x1={svgDimensions.paddingX}
                                  y1={yVal}
                                  x2={svgDimensions.width - svgDimensions.paddingX}
                                  y2={yVal}
                                  stroke="#2D3345"
                                  strokeOpacity="0.4"
                                  strokeDasharray="3 3"
                                />
                                <text
                                  x={svgDimensions.paddingX - 10}
                                  y={yVal + 3}
                                  fill="var(--slate)"
                                  fontSize="9"
                                  fontFamily="monospace"
                                  textAnchor="end"
                                  className="tabular-nums"
                                >
                                  {Math.round(wpmVal)}
                                </text>
                              </g>
                            );
                          })}

                          {/* X-axis Border */}
                          <line
                            x1={svgDimensions.paddingX}
                            y1={svgDimensions.height - svgDimensions.paddingY}
                            x2={svgDimensions.width - svgDimensions.paddingX}
                            y2={svgDimensions.height - svgDimensions.paddingY}
                            stroke="#2D3345"
                            strokeWidth="1.5"
                          />

                          {/* Area Fill */}
                          <path d={chartParams.areaD} fill="url(#areaGrad)" />

                          {/* Connection Line */}
                          <path
                            d={chartParams.pathD}
                            fill="none"
                            stroke="var(--amber)"
                            strokeWidth="2.5"
                            filter="url(#glow)"
                          />

                          {/* Interactive Dots */}
                          {chartParams.points.map((pt, idx) => (
                            <circle
                              key={idx}
                              cx={pt.x}
                              cy={pt.y}
                              r={hoveredIndex === idx ? 5 : 3.5}
                              fill="var(--ink)"
                              stroke={hoveredIndex === idx ? "var(--paper)" : "var(--amber)"}
                              strokeWidth={hoveredIndex === idx ? 2.5 : 2}
                              className="transition-all duration-150 cursor-pointer"
                              onMouseEnter={() => setHoveredIndex(idx)}
                              onMouseLeave={() => setHoveredIndex(null)}
                            />
                          ))}
                        </svg>
                      </div>

                      {/* Info Panel for Active/Hovered Point */}
                      <div className="bg-[#11131A] border border-[#2D3345] p-3 rounded text-xs select-none">
                        {hoveredIndex !== null && chartParams.points[hoveredIndex] ? (
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-center">
                            <div>
                              <span className="text-slate-custom font-semibold">Kecepatan:</span>{' '}
                              <strong className="text-amber font-mono font-black">{chartParams.points[hoveredIndex].data.wpm} WPM</strong>
                            </div>
                            <div>
                              <span className="text-slate-custom font-semibold">Akurasi:</span>{' '}
                              <strong className="text-ghost-teal font-mono font-bold">{chartParams.points[hoveredIndex].data.accuracy}%</strong>
                            </div>
                            <div>
                              <span className="text-slate-custom font-semibold">Kesulitan:</span>{' '}
                              <strong className="text-paper capitalize">{chartParams.points[hoveredIndex].data.difficulty}</strong>
                            </div>
                            <div>
                              <span className="text-slate-custom font-semibold">Waktu:</span>{' '}
                              <strong className="text-slate-custom">{formatDate(chartParams.points[hoveredIndex].data.created_at)}</strong>
                            </div>
                          </div>
                        ) : (
                          <div className="text-center text-slate-custom font-medium italic animate-pulse">
                            Arahkan kursor (hover) pada titik koordinat grafik untuk detail stats penerbangan spesifik.
                          </div>
                        )}
                      </div>
                    </div>
                  )
                )}
              </div>

              {/* History Table */}
              <div className="glass-card p-6 rounded border border-[#2D3345] space-y-4">
                <h2 className="text-sm font-bold uppercase tracking-wider text-slate-custom border-b border-[#2D3345] pb-2 select-none">
                  Log Penerbangan (Attempt History)
                </h2>

                {attempts.length === 0 ? (
                  <div className="py-12 text-center text-slate-custom text-xs font-semibold select-none">
                    <span className="text-lg block mb-2">📭</span>
                    Pemain belum pernah menyelesaikan penerbangan mengetik.
                  </div>
                ) : (
                  <div className="overflow-x-auto custom-scrollbar">
                    <table className="w-full text-left border-collapse text-xs select-none">
                      <thead>
                        <tr className="border-b border-[#2D3345] text-slate-custom font-bold uppercase tracking-wider">
                          <th className="py-3 px-4">Tanggal & Jam</th>
                          <th className="py-3 px-4">Teks</th>
                          <th className="py-3 px-4 text-center">WPM</th>
                          <th className="py-3 px-4 text-center">Akurasi</th>
                          <th className="py-3 px-4 text-center">Durasi</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#151821] font-mono">
                        {attempts.map((att) => {
                          const snippet = att.texts?.content 
                            ? att.texts.content.substring(0, 32) + (att.texts.content.length > 32 ? '...' : '') 
                            : 'Teks tidak dikenal';
                          const seconds = (Number(att.duration_ms) / 1000).toFixed(1) + 's';
                          
                          // Style based on language
                          const langLabel = att.texts?.language === 'id' ? '🇮🇩 ID' : '🇬🇧 EN';
                          const diff = att.texts?.difficulty || 'medium';
                          
                          let diffColor = 'text-amber';
                          if (diff === 'easy') diffColor = 'text-ghost-teal';
                          if (diff === 'hard') diffColor = 'text-error-custom';

                          return (
                            <tr key={att.id} className="hover:bg-[#151821]/45 transition-colors">
                              <td className="py-3 px-4 text-slate-custom whitespace-nowrap">
                                {formatDate(att.created_at)}
                              </td>
                              <td className="py-3 px-4 text-paper font-sans">
                                <div className="flex flex-wrap items-center gap-1.5">
                                  <span className="text-[9px] bg-[#11131A] text-slate-custom px-1.5 py-0.5 rounded border border-[#2D3345] font-mono font-bold whitespace-nowrap">
                                    {langLabel}
                                  </span>
                                  <span className={`text-[9px] bg-[#11131A] ${diffColor} px-1.5 py-0.5 rounded border border-[#2D3345]/60 font-mono font-bold capitalize whitespace-nowrap`}>
                                    {diff}
                                  </span>
                                  <span className="text-slate-custom font-medium leading-relaxed break-words max-w-[200px] md:max-w-xs block">
                                    "{snippet}"
                                  </span>
                                </div>
                              </td>
                              <td className="py-3 px-4 text-center text-amber font-bold text-sm tabular-nums">
                                {att.wpm}
                              </td>
                              <td className="py-3 px-4 text-center text-ghost-teal font-bold text-sm tabular-nums">
                                {att.accuracy}%
                              </td>
                              <td className="py-3 px-4 text-center text-slate-custom tabular-nums">
                                {seconds}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </>
          )}

        </div>
      </main>

      {/* Footer */}
      <footer className="glass-panel w-full py-4 text-center border-t border-[#2D3345] text-xs text-slate-custom select-none font-sans mt-8">
        &copy; 2026 GhostType Typing Game. All rights reserved.
      </footer>
    </div>
  );
}
