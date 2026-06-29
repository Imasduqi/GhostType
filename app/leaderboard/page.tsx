"use client";

import { useState, useEffect, useCallback, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase/client';
import { Profile, UserStats } from '@/types';
import { getUserProfile } from '@/lib/supabase/queries';
import { ThemeToggle } from '@/components/ThemeToggle';

export default function LeaderboardPage() {
  const router = useRouter();

  // Active Tab: 'per-text' | 'overall' | 'boss-battle'
  const [activeTab, setActiveTab] = useState<'per-text' | 'overall' | 'boss-battle'>('per-text');
  
  // Sort By for Overall: 'best' | 'avg'
  const [overallSortBy, setOverallSortBy] = useState<'best' | 'avg'>('best');

  // Database Data States
  const [texts, setTexts] = useState<any[]>([]);
  const [selectedTextId, setSelectedTextId] = useState<string>('');
  const [perTextAttempts, setPerTextAttempts] = useState<any[]>([]);
  const [overallStats, setOverallStats] = useState<any[]>([]);
  const [bossBattleScores, setBossBattleScores] = useState<any[]>([]);

  // Loading/Error States
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Auth States for Navbar & Row Highlighting
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [currentProfile, setCurrentProfile] = useState<Profile | null>(null);
  const [authLoading, setAuthLoading] = useState(true);

  // Hydration prevention
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  // Fetch current user auth profile for Navbar and highlighting
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

  // Load all available texts from database for filtering
  const loadTexts = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('texts')
        .select('id, content, language, difficulty, source')
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      setTexts(data || []);
      if (data && data.length > 0) {
        setSelectedTextId(data[0].id);
      } else {
        setLoading(false);
      }
    } catch (err: any) {
      console.error('Error loading texts:', err);
      setError(err.message || 'Gagal memuat daftar teks dari database.');
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadTexts();
  }, [loadTexts]);

  // Fetch per-text attempts when selected text changes
  const fetchPerTextAttempts = useCallback(async (textId: string) => {
    if (!textId) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('attempts')
        .select(`
          id,
          wpm,
          accuracy,
          duration_ms,
          created_at,
          user_id,
          profiles (
            username,
            avatar_url
          )
        `)
        .eq('text_id', textId)
        .order('wpm', { ascending: false })
        .order('accuracy', { ascending: false });

      if (error) throw error;

      // Group and get the single best attempt per user for this specific text
      const uniqueAttempts: any[] = [];
      const seenUsers = new Set();
      for (const att of data || []) {
        if (!seenUsers.has(att.user_id) && att.profiles) {
          seenUsers.add(att.user_id);
          uniqueAttempts.push(att);
        }
      }

      setPerTextAttempts(uniqueAttempts);
    } catch (err: any) {
      console.error('Error fetching per-text attempts:', err);
      setError(err.message || 'Gagal memuat ranking per-teks.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (selectedTextId) {
      fetchPerTextAttempts(selectedTextId);
    }
  }, [selectedTextId, fetchPerTextAttempts]);

  // Fetch overall stats when tab changes
  const fetchOverallStats = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('user_stats')
        .select(`
          user_id,
          avg_wpm,
          best_wpm,
          total_attempts,
          avg_accuracy,
          profiles:user_id (
            username,
            avatar_url
          )
        `);

      if (error) throw error;
      setOverallStats(data || []);
    } catch (err: any) {
      console.error('Error fetching overall stats:', err);
      setError(err.message || 'Gagal memuat leaderboard overall.');
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch Boss Battle scores when tab changes
  const fetchBossBattleScores = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('boss_rush_scores')
        .select(`
          id,
          score,
          max_level_reached,
          bosses_defeated,
          total_damage_dealt,
          duration_ms,
          active_modifiers,
          modifier_multiplier,
          created_at,
          user_id,
          profiles:user_id (
            username,
            avatar_url
          )
        `)
        .order('score', { ascending: false })
        .order('created_at', { ascending: true }); // tie breaker

      if (error) throw error;
      setBossBattleScores(data || []);
    } catch (err: any) {
      console.error('Error fetching boss battle scores:', err);
      setError(err.message || 'Gagal memuat ranking Boss Battle.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (activeTab === 'overall') {
      fetchOverallStats();
    } else if (activeTab === 'per-text' && selectedTextId) {
      fetchPerTextAttempts(selectedTextId);
    } else if (activeTab === 'boss-battle') {
      fetchBossBattleScores();
    }
  }, [activeTab, selectedTextId, fetchOverallStats, fetchPerTextAttempts, fetchBossBattleScores]);

  // Process and sort overall stats client-side
  const sortedOverallStats = useMemo(() => {
    return [...overallStats]
      .filter(row => row.profiles) // ensure user profile exists
      .sort((a, b) => {
        if (overallSortBy === 'best') {
          if (Number(b.best_wpm) !== Number(a.best_wpm)) {
            return Number(b.best_wpm) - Number(a.best_wpm);
          }
          return Number(b.avg_wpm) - Number(a.avg_wpm);
        } else {
          if (Number(b.avg_wpm) !== Number(a.avg_wpm)) {
            return Number(b.avg_wpm) - Number(a.avg_wpm);
          }
          return Number(b.best_wpm) - Number(a.best_wpm);
        }
      });
  }, [overallStats, overallSortBy]);

  // Auth actions
  const handleLogout = async () => {
    await supabase.auth.signOut();
    setCurrentUser(null);
    setCurrentProfile(null);
    router.refresh();
  };

  // Helper date formatter
  const formatDate = (dateStr: string) => {
    if (!mounted) return '...';
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString('id-ID', {
        day: '2-digit',
        month: 'short',
        year: 'numeric'
      });
    } catch {
      return dateStr;
    }
  };

  // Find currently selected text object
  const currentSelectedText = useMemo(() => {
    return texts.find(t => t.id === selectedTextId);
  }, [texts, selectedTextId]);

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
              className="text-amber text-xs sm:text-sm font-bold"
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

      {/* Main Content */}
      <main className="flex-1 py-8 px-4 sm:px-6 lg:px-8 flex flex-col items-center">
        <div className="w-full max-w-4xl space-y-6">
          
          {/* Header Billboard */}
          <div className="glass-card p-6 rounded border border-[#2D3345] text-center space-y-3 relative overflow-hidden select-none">
            <div className="absolute top-0 inset-x-0 h-[3px] bg-amber" />
            <h1 className="text-3xl font-black text-amber tracking-wider uppercase font-mono drop-shadow-[0_0_10px_rgba(232,163,61,0.2)]">
              Papan Peringkat / Departure Ranks
            </h1>
            <p className="text-xs text-slate-custom font-semibold uppercase tracking-widest">
              Daftar rekor pengetik tercepat di terminal GhostType
            </p>
          </div>

          {/* Navigation Tabs (Per-Text vs Overall vs Boss Battle) */}
          <div className="flex justify-center select-none">
            <div className="inline-flex bg-[#11131A] p-1 rounded-sm border border-[#2D3345] w-full max-w-lg">
              <button
                onClick={() => { setActiveTab('per-text'); setError(null); }}
                className={`flex-1 py-2.5 text-center text-xs font-bold uppercase tracking-wider rounded-sm transition-all cursor-pointer ${
                  activeTab === 'per-text'
                    ? 'bg-amber/10 text-amber border border-amber/30 shadow-md'
                    : 'text-slate-custom hover:text-paper'
                }`}
              >
                Papan Per-Teks
              </button>
              <button
                onClick={() => { setActiveTab('overall'); setError(null); }}
                className={`flex-1 py-2.5 text-center text-xs font-bold uppercase tracking-wider rounded-sm transition-all cursor-pointer ${
                  activeTab === 'overall'
                    ? 'bg-amber/10 text-amber border border-amber/30 shadow-md'
                    : 'text-slate-custom hover:text-paper'
                }`}
              >
                Papan Keseluruhan
              </button>
              <button
                onClick={() => { setActiveTab('boss-battle'); setError(null); }}
                className={`flex-1 py-2.5 text-center text-xs font-bold uppercase tracking-wider rounded-sm transition-all cursor-pointer ${
                  activeTab === 'boss-battle'
                    ? 'bg-amber/10 text-amber border border-amber/30 shadow-md'
                    : 'text-slate-custom hover:text-paper'
                }`}
              >
                Boss Battle RPG
              </button>
            </div>
          </div>

          {/* Tab Content 1: Per-Text Leaderboard */}
          {activeTab === 'per-text' && (
            <div className="space-y-4">
              
              {/* Text Selection Filter Box */}
              <div className="glass-card p-5 rounded border border-[#2D3345] space-y-4">
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-slate-custom uppercase tracking-wider select-none">
                    Pilih Penerbangan (Target Text)
                  </label>
                  
                  {texts.length === 0 ? (
                    <div className="text-xs text-slate-custom italic font-medium py-1">
                      Belum ada teks yang disimpan di database. Silakan mainkan game terlebih dahulu.
                    </div>
                  ) : (
                    <select
                      value={selectedTextId}
                      onChange={(e) => { setSelectedTextId(e.target.value); setError(null); }}
                      className="w-full px-4 py-3 bg-[#11131A] border border-[#2D3345] rounded text-paper outline-none text-xs font-semibold cursor-pointer focus:border-amber/50 transition-colors"
                    >
                      {texts.map((t) => {
                        const snippet = t.content.substring(0, 50) + (t.content.length > 50 ? '...' : '');
                        const langLabel = t.language === 'id' ? '🇮🇩 ID' : '🇬🇧 EN';
                        const sourceLabel = t.source === 'curated' ? 'Curated' : 'Generated';
                        return (
                          <option key={t.id} value={t.id}>
                            [{langLabel}] [{t.difficulty.toUpperCase()}] ({sourceLabel}) "{snippet}"
                          </option>
                        );
                      })}
                    </select>
                  )}
                </div>

                {/* Selected Text Preview */}
                {currentSelectedText && (
                  <div className="bg-[#11131A] border border-[#2D3345]/50 p-4 rounded text-xs select-none space-y-2">
                    <div className="flex items-center gap-2 text-slate-custom font-semibold">
                      <span>Pratinjau Teks:</span>
                      <span className="text-[10px] bg-[#1C1F2B] text-amber border border-amber/20 px-1.5 py-0.5 rounded uppercase">
                        {currentSelectedText.language === 'id' ? '🇮🇩 Indonesia' : '🇬🇧 English'}
                      </span>
                      <span className="text-[10px] bg-[#1C1F2B] text-ghost-teal border border-ghost-teal/20 px-1.5 py-0.5 rounded capitalize">
                        {currentSelectedText.difficulty}
                      </span>
                    </div>
                    <p className="text-paper italic font-sans leading-relaxed">
                      "{currentSelectedText.content}"
                    </p>
                  </div>
                )}
              </div>

              {/* Leaderboard Per-Text Table Card */}
              <div className="glass-card p-6 rounded border border-[#2D3345] space-y-4">
                <h2 className="text-xs font-bold uppercase tracking-wider text-slate-custom border-b border-[#2D3345] pb-2 select-none">
                  Ranking Pengetik Tercepat (Terhadap Teks yang Dipilih)
                </h2>

                {loading ? (
                  <div className="py-12 flex flex-col items-center gap-3">
                    <div className="w-8 h-8 rounded-full border-4 border-[#2D3345] border-t-amber animate-spin" />
                    <span className="text-xs text-slate-custom font-bold uppercase tracking-wider">Mengambil Papan Peringkat...</span>
                  </div>
                ) : error ? (
                  <div className="py-8 text-center text-error-custom font-semibold text-xs leading-relaxed">
                    {error}
                  </div>
                ) : perTextAttempts.length === 0 ? (
                  <div className="py-12 text-center text-slate-custom text-xs font-semibold select-none">
                    <span className="text-lg block mb-2">🏁</span>
                    Belum ada attempt yang tuntas untuk teks ini. Jadilah yang pertama terbang!
                  </div>
                ) : (
                  <div className="overflow-x-auto custom-scrollbar">
                    <table className="w-full text-left border-collapse text-xs select-none">
                      <thead>
                        <tr className="border-b border-[#2D3345] text-slate-custom font-bold uppercase tracking-wider">
                          <th className="py-3 px-4 w-16 text-center">Peringkat</th>
                          <th className="py-3 px-4">Pemain</th>
                          <th className="py-3 px-4 text-center">WPM</th>
                          <th className="py-3 px-4 text-center">Akurasi</th>
                          <th className="py-3 px-4 text-center">Durasi</th>
                          <th className="py-3 px-4 text-center">Tanggal</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#151821] font-mono">
                        {perTextAttempts.map((att, index) => {
                          const rank = index + 1;
                          const isCurrentUser = currentUser && att.user_id === currentUser.id;
                          const seconds = (Number(att.duration_ms) / 1000).toFixed(1) + 's';

                          return (
                            <tr
                              key={att.id}
                              className={`transition-colors ${
                                isCurrentUser
                                  ? 'bg-amber/10 border-y border-amber/35 hover:bg-amber/15'
                                  : 'hover:bg-[#151821]/45'
                              }`}
                            >
                              <td className="py-3 px-4 text-center">
                                <div className="inline-flex relative flex-col items-center justify-center w-7 h-8 rounded-sm bg-[#1C1F2B] border border-amber/40 shadow-sm z-0">
                                  <div className="absolute inset-x-0 top-1/2 h-[1px] bg-black/40 z-10 pointer-events-none" />
                                  <span className="text-amber font-bold font-mono text-sm leading-none tabular-nums z-0">
                                    {rank}
                                  </span>
                                </div>
                              </td>
                              <td className="py-3 px-4 font-sans text-paper">
                                <Link
                                  href={`/profile/${att.profiles.username}`}
                                  className="flex items-center gap-2 group cursor-pointer"
                                >
                                  <img
                                    src={att.profiles.avatar_url || 'https://api.dicebear.com/7.x/bottts/svg'}
                                    alt={att.profiles.username}
                                    className="w-7 h-7 rounded-sm border border-[#2D3345] bg-[#11131A] object-cover group-hover:border-amber/60 transition-colors"
                                  />
                                  <span className={`font-bold group-hover:text-amber transition-colors ${
                                    isCurrentUser ? 'text-amber font-black' : ''
                                  }`}>
                                    {att.profiles.username}
                                  </span>
                                  {isCurrentUser && (
                                    <span className="text-[8px] bg-amber/20 text-amber border border-amber/45 px-1 py-0.2 rounded-sm font-semibold uppercase font-mono">
                                      Anda
                                    </span>
                                  )}
                                </Link>
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
                              <td className="py-3 px-4 text-center text-slate-custom whitespace-nowrap">
                                {formatDate(att.created_at)}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Tab Content 2: Overall Leaderboard */}
          {activeTab === 'overall' && (
            <div className="space-y-4">
              
              {/* Overall Sorting Selector */}
              <div className="glass-card p-5 rounded border border-[#2D3345] flex flex-col sm:flex-row items-center justify-between gap-4 select-none">
                <div className="text-xs font-bold text-slate-custom uppercase tracking-wider">
                  Pengurutan Papan Keberangkatan Keseluruhan
                </div>
                <div className="flex bg-[#11131A] p-1 rounded border border-[#2D3345] w-full sm:w-auto">
                  <button
                    onClick={() => setOverallSortBy('best')}
                    className={`flex-1 sm:flex-none px-4 py-2 text-xs font-bold rounded transition-all cursor-pointer ${
                      overallSortBy === 'best'
                        ? 'bg-amber/10 text-amber border border-amber/30 shadow-sm'
                        : 'text-slate-custom hover:text-paper'
                    }`}
                  >
                    WPM Terbaik (Peak Speed)
                  </button>
                  <button
                    onClick={() => setOverallSortBy('avg')}
                    className={`flex-1 sm:flex-none px-4 py-2 text-xs font-bold rounded transition-all cursor-pointer ${
                      overallSortBy === 'avg'
                        ? 'bg-amber/10 text-amber border border-amber/30 shadow-sm'
                        : 'text-slate-custom hover:text-paper'
                    }`}
                  >
                    Rata-rata WPM (Konsistensi)
                  </button>
                </div>
              </div>

              {/* Leaderboard Overall Table Card */}
              <div className="glass-card p-6 rounded border border-[#2D3345] space-y-4">
                <h2 className="text-xs font-bold uppercase tracking-wider text-slate-custom border-b border-[#2D3345] pb-2 select-none">
                  Leaderboard Overall (Seluruh Pemain Terdaftar)
                </h2>

                {loading ? (
                  <div className="py-12 flex flex-col items-center gap-3">
                    <div className="w-8 h-8 rounded-full border-4 border-[#2D3345] border-t-amber animate-spin" />
                    <span className="text-xs text-slate-custom font-bold uppercase tracking-wider">Mengambil Papan Peringkat...</span>
                  </div>
                ) : error ? (
                  <div className="py-8 text-center text-error-custom font-semibold text-xs leading-relaxed">
                    {error}
                  </div>
                ) : sortedOverallStats.length === 0 ? (
                  <div className="py-12 text-center text-slate-custom text-xs font-semibold select-none">
                    <span className="text-lg block mb-2">📭</span>
                    Belum ada statistik pemain terdaftar. Mulailah balapan sekarang!
                  </div>
                ) : (
                  <div className="overflow-x-auto custom-scrollbar">
                    <table className="w-full text-left border-collapse text-xs select-none">
                      <thead>
                        <tr className="border-b border-[#2D3345] text-slate-custom font-bold uppercase tracking-wider">
                          <th className="py-3 px-4 w-16 text-center">Peringkat</th>
                          <th className="py-3 px-4">Pemain</th>
                          <th className="py-3 px-4 text-center">WPM Terbaik</th>
                          <th className="py-3 px-4 text-center">Rata-rata WPM</th>
                          <th className="py-3 px-4 text-center">Rata-rata Akurasi</th>
                          <th className="py-3 px-4 text-center">Total Percobaan</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#151821] font-mono">
                        {sortedOverallStats.map((row, index) => {
                          const rank = index + 1;
                          const isCurrentUser = currentUser && row.user_id === currentUser.id;

                          return (
                            <tr
                              key={row.user_id}
                              className={`transition-colors ${
                                isCurrentUser
                                  ? 'bg-amber/10 border-y border-amber/35 hover:bg-amber/15'
                                  : 'hover:bg-[#151821]/45'
                              }`}
                            >
                              <td className="py-3 px-4 text-center">
                                <div className="inline-flex relative flex-col items-center justify-center w-7 h-8 rounded-sm bg-[#1C1F2B] border border-amber/40 shadow-sm z-0">
                                  <div className="absolute inset-x-0 top-1/2 h-[1px] bg-black/40 z-10 pointer-events-none" />
                                  <span className="text-amber font-bold font-mono text-sm leading-none tabular-nums z-0">
                                    {rank}
                                  </span>
                                </div>
                              </td>
                              <td className="py-3 px-4 font-sans text-paper">
                                <Link
                                  href={`/profile/${row.profiles.username}`}
                                  className="flex items-center gap-2 group cursor-pointer"
                                >
                                  <img
                                    src={row.profiles.avatar_url || 'https://api.dicebear.com/7.x/bottts/svg'}
                                    alt={row.profiles.username}
                                    className="w-7 h-7 rounded-sm border border-[#2D3345] bg-[#11131A] object-cover group-hover:border-amber/60 transition-colors"
                                  />
                                  <span className={`font-bold group-hover:text-amber transition-colors ${
                                    isCurrentUser ? 'text-amber font-black' : ''
                                  }`}>
                                    {row.profiles.username}
                                  </span>
                                  {isCurrentUser && (
                                    <span className="text-[8px] bg-amber/20 text-amber border border-amber/45 px-1 py-0.2 rounded-sm font-semibold uppercase font-mono">
                                      Anda
                                    </span>
                                  )}
                                </Link>
                              </td>
                              <td className="py-3 px-4 text-center text-amber font-bold text-sm tabular-nums">
                                {row.best_wpm}
                              </td>
                              <td className="py-3 px-4 text-center text-amber font-semibold text-xs tabular-nums">
                                {row.avg_wpm}
                              </td>
                              <td className="py-3 px-4 text-center text-ghost-teal font-bold text-sm tabular-nums">
                                {row.avg_accuracy}%
                              </td>
                              <td className="py-3 px-4 text-center text-slate-custom tabular-nums">
                                {row.total_attempts}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Tab Content 3: Boss Battle Leaderboard */}
          {activeTab === 'boss-battle' && (
            <div className="space-y-4">
              
              {/* Leaderboard Boss Battle Table Card */}
              <div className="glass-card p-6 rounded border border-[#2D3345] space-y-4 animate-pixel-fade-in">
                <h2 className="text-xs font-bold uppercase tracking-wider text-slate-custom border-b border-[#2D3345] pb-2 select-none">
                  Papan Peringkat Boss Battle RPG (Diurutkan dari Skor Tertinggi)
                </h2>

                {loading ? (
                  <div className="py-12 flex flex-col items-center gap-3">
                    <div className="w-8 h-8 rounded-full border-4 border-[#2D3345] border-t-amber animate-spin" />
                    <span className="text-xs text-slate-custom font-bold uppercase tracking-wider">Mengambil Papan Peringkat...</span>
                  </div>
                ) : error ? (
                  <div className="py-8 text-center text-error-custom font-semibold text-xs leading-relaxed">
                    {error}
                  </div>
                ) : bossBattleScores.length === 0 ? (
                  <div className="py-12 text-center text-slate-custom text-xs font-semibold select-none">
                    <span className="text-lg block mb-2">👾</span>
                    Belum ada rekor Boss Battle terdaftar. Jadilah yang pertama menaklukkan para bos!
                  </div>
                ) : (
                  <div className="overflow-x-auto custom-scrollbar font-mono">
                    <table className="w-full text-left border-collapse text-xs select-none">
                      <thead>
                        <tr className="border-b border-[#2D3345] text-slate-custom font-bold uppercase tracking-wider">
                          <th className="py-3 px-4 w-16 text-center">Peringkat</th>
                          <th className="py-3 px-4 font-sans">Pemain</th>
                          <th className="py-3 px-4 text-center">Skor Akhir</th>
                          <th className="py-3 px-4 text-center">Level Max</th>
                          <th className="py-3 px-4 text-center">Boss Dikalahkan</th>
                          <th className="py-3 px-4 text-center font-sans">Damage</th>
                          <th className="py-3 px-4 text-center font-sans">Modifier</th>
                          <th className="py-3 px-4 text-center">Durasi</th>
                          <th className="py-3 px-4 text-center font-sans">Tanggal</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#151821]">
                        {bossBattleScores.map((row, index) => {
                          const rank = index + 1;
                          const isCurrentUser = currentUser && row.user_id === currentUser.id;
                          const seconds = (Number(row.duration_ms) / 1000).toFixed(0) + 's';
                          
                          // Handle modifiers display
                          const modsList = Array.isArray(row.active_modifiers) 
                            ? row.active_modifiers 
                            : [];

                          return (
                            <tr
                              key={row.id}
                              className={`transition-colors ${
                                isCurrentUser
                                  ? 'bg-amber/10 border-y border-amber/35 hover:bg-amber/15'
                                  : 'hover:bg-[#151821]/45'
                              }`}
                            >
                              <td className="py-3 px-4 text-center">
                                <div className="inline-flex relative flex-col items-center justify-center w-7 h-8 rounded-sm bg-[#1C1F2B] border border-amber/40 shadow-sm z-0">
                                  <div className="absolute inset-x-0 top-1/2 h-[1px] bg-black/40 z-10 pointer-events-none" />
                                  <span className="text-amber font-bold font-mono text-sm leading-none tabular-nums z-0">
                                    {rank}
                                  </span>
                                </div>
                              </td>
                              <td className="py-3 px-4 font-sans text-paper">
                                <Link
                                  href={`/profile/${row.profiles?.username}`}
                                  className="flex items-center gap-2 group cursor-pointer"
                                >
                                  <img
                                    src={row.profiles?.avatar_url || 'https://api.dicebear.com/7.x/bottts/svg'}
                                    alt={row.profiles?.username || 'Pemain'}
                                    className="w-7 h-7 rounded-sm border border-[#2D3345] bg-[#11131A] object-cover group-hover:border-amber/60 transition-colors"
                                  />
                                  <span className={`font-bold group-hover:text-amber transition-colors ${
                                    isCurrentUser ? 'text-amber font-black' : ''
                                  }`}>
                                    {row.profiles?.username || 'Pemain'}
                                  </span>
                                  {isCurrentUser && (
                                    <span className="text-[8px] bg-amber/20 text-amber border border-amber/45 px-1 py-0.2 rounded-sm font-semibold uppercase font-mono">
                                      Anda
                                    </span>
                                  )}
                                </Link>
                              </td>
                              <td className="py-3 px-4 text-center text-amber font-bold text-sm tabular-nums">
                                {row.score ?? ((row.max_level_reached * 1000) + row.total_damage_dealt)}
                              </td>
                              <td className="py-3 px-4 text-center text-paper font-semibold text-xs tabular-nums">
                                LVL {row.max_level_reached}
                              </td>
                              <td className="py-3 px-4 text-center text-ghost-teal font-bold text-xs tabular-nums">
                                {row.bosses_defeated}
                              </td>
                              <td className="py-3 px-4 text-center text-slate-custom tabular-nums">
                                {row.total_damage_dealt}
                              </td>
                              <td className="py-3 px-4 text-center max-w-[150px]">
                                {modsList.length === 0 ? (
                                  <span className="text-[9px] text-slate-custom/50 italic">-</span>
                                ) : (
                                  <div className="flex flex-wrap gap-1 justify-center max-h-[40px] overflow-y-auto">
                                    {modsList.map((mId: string) => {
                                      const isKutukan = mId.startsWith('kutukan_');
                                      let label = mId.replace('boss_', '').replace('kutukan_', '');
                                      if (mId === 'waktu_kilat') label = 'kilat';
                                      
                                      return (
                                        <span
                                          key={mId}
                                          title={mId}
                                          className={`text-[8px] px-1.5 py-0.5 border rounded-sm font-bold scale-90 whitespace-nowrap ${
                                            isKutukan
                                              ? 'border-error-custom/30 bg-error-custom/10 text-error-custom'
                                              : 'border-amber/30 bg-amber/10 text-amber'
                                          }`}
                                        >
                                          {label.toUpperCase()}
                                        </span>
                                      );
                                    })}
                                  </div>
                                )}
                              </td>
                              <td className="py-3 px-4 text-center text-slate-custom tabular-nums">
                                {seconds}
                              </td>
                              <td className="py-3 px-4 text-center text-slate-custom whitespace-nowrap">
                                {formatDate(row.created_at)}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
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
