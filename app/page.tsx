"use client";

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useTypingEngine } from '@/components/typing-engine/useTypingEngine';
import { TypingDisplay } from '@/components/typing-engine/TypingDisplay';
import { supabase } from '@/lib/supabase/client';
import { Profile } from '@/types';
import { getUserProfile } from '@/lib/supabase/queries';
import { curatedTexts } from '@/lib/text-generator/curatedTexts';
import { ThemeToggle } from '@/components/ThemeToggle';
import { generateRandomText } from '@/lib/text-generator/generateRandomText';
import { generateDailyChallenge, getChallengeDateString } from '@/lib/daily/dailyChallengeGenerator';
import { getOrSyncUserStreak, hasUserCompletedDaily } from '@/lib/supabase/dailyQueries';


export default function Home() {
  const router = useRouter();

  // Typing Config States
  const [language, setLanguage] = useState<'id' | 'en'>('id');
  const [difficulty, setDifficulty] = useState<'easy' | 'medium' | 'hard'>('medium');
  const [sourceType, setSourceType] = useState<'curated' | 'generated' | 'custom'>('curated');
  
  const [targetText, setTargetText] = useState('');
  const [customText, setCustomText] = useState('');
  const [showLogs, setShowLogs] = useState(false);
  
  // Auth states
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [authLoading, setAuthLoading] = useState(true);

  // Helper to fetch random curated text based on criteria
  const getRandomCuratedText = useCallback((lang: 'id' | 'en', diff: 'easy' | 'medium' | 'hard'): string => {
    const filtered = curatedTexts.filter(t => t.language === lang && t.difficulty === diff);
    if (filtered.length === 0) return 'Teks terkurasi tidak ditemukan.';
    const randomIndex = Math.floor(Math.random() * filtered.length);
    return filtered[randomIndex].content;
  }, []);

  // Load new text based on current configurations
  const loadNewText = useCallback(() => {
    if (sourceType === 'custom') {
      setTargetText(customText.trim() || 'Silakan tulis teks kustom Anda terlebih dahulu pada kotak di atas.');
    } else if (sourceType === 'generated') {
      if (language === 'id') {
        const text = generateRandomText(difficulty);
        setTargetText(text);
      } else {
        // Fallback for English generated
        const text = getRandomCuratedText('en', difficulty);
        setTargetText(text);
        setSourceType('curated'); // Auto fallback
      }
    } else {
      const text = getRandomCuratedText(language, difficulty);
      setTargetText(text);
    }
  }, [language, difficulty, sourceType, customText, getRandomCuratedText]);

  // Load initial text and update when configurations change
  useEffect(() => {
    loadNewText();
  }, [language, difficulty, sourceType, loadNewText]);

  // Auth fetching
  const fetchProfile = useCallback(async (userId: string) => {
    const userProfile = await getUserProfile(userId);
    setProfile(userProfile);
  }, []);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setCurrentUser(session?.user ?? null);
      if (session?.user) {
        fetchProfile(session.user.id);
      }
      setAuthLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setCurrentUser(session?.user ?? null);
      if (session?.user) {
        fetchProfile(session.user.id);
      } else {
        setProfile(null);
      }
      setAuthLoading(false);
    });

    return () => subscription.unsubscribe();
  }, [fetchProfile]);

  // Daily challenge status states
  const [dailyCompleted, setDailyCompleted] = useState(false);
  const [dailyStreak, setDailyStreak] = useState(0);
  const [dailyTitle, setDailyTitle] = useState('');

  useEffect(() => {
    if (currentUser) {
      const todayStr = getChallengeDateString(new Date());
      const challenge = generateDailyChallenge(new Date());
      setDailyTitle(challenge.title);
      
      hasUserCompletedDaily(currentUser.id, todayStr).then(setDailyCompleted);
      getOrSyncUserStreak(currentUser.id, todayStr).then(s => setDailyStreak(s?.current_streak || 0));
    }
  }, [currentUser]);

  // Typing Engine instance
  const {
    currentIndex,
    typedChars,
    totalCharsTyped,
    isFinished,
    wpm,
    accuracy,
    durationMs,
    keystrokeLog,
    resetEngine,
  } = useTypingEngine(targetText, {
    isActive: true,
    onComplete: (stats) => {
      console.log('Typing session completed!', stats);
    }
  });

  const progressPercentage = targetText.length > 0 
    ? Math.min(100, Math.round((currentIndex / targetText.length) * 100))
    : 0;

  const handleReset = () => {
    resetEngine();
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setCurrentUser(null);
    setProfile(null);
  };

  // Navigate to race page with configuration
  const handleStartRace = () => {
    if (targetText.startsWith('Silakan tulis teks kustom')) {
      alert('Silakan masukkan teks kustom terlebih dahulu sebelum balapan!');
      return;
    }
    const encodedText = encodeURIComponent(targetText);
    router.push(`/race?lang=${language}&diff=${difficulty}&source=${sourceType}&text=${encodedText}`);
  };

  // Status message logic
  let statusMessage = "Siap Mengetik! Mulailah mengetik karakter pertama.";
  let statusColor = "text-amber animate-pulse";
  
  if (totalCharsTyped > 0 && !isFinished) {
    statusMessage = "Sedang mengetik... Jaga ritme dan akurasimu!";
    statusColor = "text-paper";
  } else if (isFinished) {
    statusMessage = "Selesai! Selamat atas pencapaianmu 🎉";
    statusColor = "text-ghost-teal font-bold";
  }

  const secondsElapsed = (durationMs / 1000).toFixed(2);

  // Set color styling based on selected difficulty
  const getDifficultyColor = (diff: string) => {
    switch (diff) {
      case 'easy': return 'text-ghost-teal border-ghost-teal/30 bg-ghost-teal/10';
      case 'medium': return 'text-amber border-amber/30 bg-amber/10';
      case 'hard': return 'text-error-custom border-error-custom/30 bg-error-custom/10';
      default: return 'text-slate-custom border-[#2D3345] bg-[#151821]';
    }
  };

  return (
    <div className="min-h-screen bg-ink flex flex-col justify-between relative overflow-hidden">
      
      {/* Background terminal overlay lines (Subtle style detail) */}
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
          ) : currentUser && profile ? (
            <div className="flex items-center gap-3">
              <div className="text-right hidden sm:block">
                <div className="text-sm font-bold text-paper">{profile.username}</div>
                <div className="text-[10px] text-slate-custom font-medium">Pemain</div>
              </div>
              <img
                src={profile.avatar_url || 'https://api.dicebear.com/7.x/bottts/svg'}
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
      <main className="flex-1 py-12 px-4 sm:px-6 lg:px-8 flex flex-col justify-center items-center">
        <div className="w-full max-w-4xl space-y-8">
          
          {/* Guest Warning Banner */}
          {!authLoading && !currentUser && (
            <div className="glass-panel p-4 rounded border border-amber/30 text-amber text-xs font-medium flex items-center gap-3 select-none">
              <span className="text-lg">⚠️</span>
              <div>
                Anda sedang mengetik sebagai <strong className="text-paper">Tamu</strong>. 
                <Link href="/register" className="underline text-amber hover:text-amber/80 font-bold ml-1">Daftar</Link> atau 
                <Link href="/login" className="underline text-amber hover:text-amber/80 font-bold mx-1">Masuk</Link> 
                untuk menyimpan hasil attempt Anda, melacak statistik, dan balapan melawan bayangan (ghost) Anda sendiri.
              </div>
            </div>
          )}

          {/* Typing Configuration Panel */}
          <div className="glass-card p-6 rounded border border-[#2D3345] space-y-6">
            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-custom select-none border-b border-[#2D3345] pb-3">
              Konfigurasi Penerbangan / Boarding
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Language Selector */}
              <div className="space-y-2">
                <label className="block text-xs font-bold text-slate-custom uppercase tracking-wider select-none">
                  Tujuan (Language)
                </label>
                <div className="flex bg-[#11131A] p-1 rounded border border-[#2D3345]">
                  <button
                    onClick={() => { setLanguage('id'); }}
                    className={`flex-1 py-2 px-3 text-xs font-bold rounded transition-all cursor-pointer ${
                      language === 'id'
                        ? 'bg-amber/10 text-amber border border-amber/30 shadow-sm'
                        : 'text-slate-custom hover:text-paper'
                    }`}
                  >
                    🇮🇩 Indonesia
                  </button>
                  <button
                    onClick={() => { setLanguage('en'); }}
                    className={`flex-1 py-2 px-3 text-xs font-bold rounded transition-all cursor-pointer ${
                      language === 'en'
                        ? 'bg-amber/10 text-amber border border-amber/30 shadow-sm'
                        : 'text-slate-custom hover:text-paper'
                    }`}
                  >
                    🇬🇧 English
                  </button>
                </div>
              </div>

              {/* Difficulty Selector */}
              <div className="space-y-2">
                <label className="block text-xs font-bold text-slate-custom uppercase tracking-wider select-none">
                  Kesulitan (Difficulty)
                </label>
                <div className="flex bg-[#11131A] p-1 rounded border border-[#2D3345]">
                  <button
                    onClick={() => { setDifficulty('easy'); }}
                    className={`flex-1 py-2 px-2 text-[10px] sm:text-xs font-bold rounded transition-all cursor-pointer ${
                      difficulty === 'easy'
                        ? 'bg-ghost-teal/10 text-ghost-teal border border-ghost-teal/20 shadow-sm'
                        : 'text-slate-custom hover:text-ghost-teal/60'
                    }`}
                  >
                    Easy
                  </button>
                  <button
                    onClick={() => { setDifficulty('medium'); }}
                    className={`flex-1 py-2 px-2 text-[10px] sm:text-xs font-bold rounded transition-all cursor-pointer ${
                      difficulty === 'medium'
                        ? 'bg-amber/10 text-amber border border-amber/20 shadow-sm'
                        : 'text-slate-custom hover:text-amber/60'
                    }`}
                  >
                    Medium
                  </button>
                  <button
                    onClick={() => { setDifficulty('hard'); }}
                    className={`flex-1 py-2 px-2 text-[10px] sm:text-xs font-bold rounded transition-all cursor-pointer ${
                      difficulty === 'hard'
                        ? 'bg-error-custom/10 text-error-custom border border-error-custom/20 shadow-sm'
                        : 'text-slate-custom hover:text-error-custom/60'
                    }`}
                  >
                    Hard
                  </button>
                </div>
              </div>

              {/* Source Selector */}
              <div className="space-y-2">
                <label className="block text-xs font-bold text-slate-custom uppercase tracking-wider select-none">
                  Sumber Teks (Text Source)
                </label>
                <div className="flex bg-[#11131A] p-1 rounded border border-[#2D3345]">
                  <button
                    onClick={() => { setSourceType('curated'); }}
                    className={`flex-1 py-2 px-2 text-[10px] sm:text-xs font-bold rounded transition-all cursor-pointer ${
                      sourceType === 'curated'
                        ? 'bg-amber/10 text-amber border border-amber/30 shadow-sm'
                        : 'text-slate-custom hover:text-paper'
                    }`}
                  >
                    Curated
                  </button>
                  <button
                    disabled={language === 'en'}
                    onClick={() => { setSourceType('generated'); }}
                    className={`flex-1 py-2 px-2 text-[10px] sm:text-xs font-bold rounded transition-all cursor-pointer disabled:opacity-40 disabled:hover:text-slate-custom ${
                      sourceType === 'generated'
                        ? 'bg-amber/10 text-amber border border-amber/30 shadow-sm'
                        : 'text-slate-custom hover:text-paper'
                    }`}
                    title={language === 'en' ? 'Teks acak hanya didukung untuk Bahasa Indonesia' : ''}
                  >
                    Generated
                  </button>
                  <button
                    onClick={() => { setSourceType('custom'); }}
                    className={`flex-1 py-2 px-2 text-[10px] sm:text-xs font-bold rounded transition-all cursor-pointer ${
                      sourceType === 'custom'
                        ? 'bg-amber/10 text-amber border border-amber/30 shadow-sm'
                        : 'text-slate-custom hover:text-paper'
                    }`}
                  >
                    Custom
                  </button>
                </div>
              </div>
            </div>

            {/* Custom Input Form */}
            {sourceType === 'custom' && (
              <div className="space-y-2 border-t border-[#2D3345]/50 pt-4">
                <label className="block text-xs font-bold text-slate-custom uppercase tracking-wider select-none">
                  Masukkan Teks Kustom Anda
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={customText}
                    onChange={(e) => setCustomText(e.target.value)}
                    placeholder="Tulis kalimat kustom untuk Anda ketik di sini..."
                    className="flex-1 px-4 py-3 bg-[#11131A] border border-[#2D3345] rounded focus:border-amber/60 focus:ring-1 focus:ring-amber/30 text-paper outline-none text-sm transition-all"
                  />
                  <button
                    onClick={loadNewText}
                    className="px-5 py-3 bg-amber hover:bg-amber/90 text-ink font-bold rounded transition-all cursor-pointer shadow-lg shadow-amber/10 active:scale-95 text-sm"
                  >
                    Terapkan
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Current Target Information Header */}
          <div className="flex justify-between items-center select-none bg-[#11131A]/35 px-4 py-3 rounded border border-[#2D3345]/40">
            <div className="flex flex-wrap gap-2 items-center text-xs font-semibold font-sans">
              <span className="text-slate-custom">Jadwal:</span>
              <span className="px-2 py-0.5 bg-[#151821] text-amber rounded border border-[#2D3345]/50">
                {language === 'id' ? '🇮🇩 ID' : '🇬🇧 EN'}
              </span>
              <span className={`px-2 py-0.5 rounded border capitalize ${getDifficultyColor(difficulty)}`}>
                {difficulty}
              </span>
              <span className="px-2 py-0.5 bg-[#151821] text-amber rounded border border-[#2D3345]/50 capitalize">
                {sourceType}
              </span>
              <span className="text-slate-custom font-normal">
                ({targetText.length} karakter)
              </span>
            </div>
            
            {/* Refresh Text button */}
            {sourceType !== 'custom' && (
              <button
                onClick={loadNewText}
                className="flex items-center gap-1.5 text-xs text-amber hover:text-amber/80 font-bold transition-colors cursor-pointer"
                title="Ganti teks dengan pola yang sama"
              >
                <svg className="w-4.5 h-4.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 1121.21 7.89M9 11l3-3 3 3m-3-3v12" />
                </svg>
                Ganti Teks
              </button>
            )}
          </div>

          {/* Daily Challenge Widget */}
          {currentUser && (
            <div className="glass-panel p-4 rounded border border-[#2D3345] bg-[#11131A]/10 flex flex-col sm:flex-row justify-between items-center gap-4 text-xs font-sans mb-3 select-none">
              <div className="flex items-center gap-3">
                <span className="text-[10px] bg-amber/15 text-amber border border-amber/25 px-2 py-0.5 rounded-sm font-bold uppercase shrink-0">
                  Tantangan Hari Ini
                </span>
                <div className="font-medium">
                  <span className="text-paper font-bold uppercase tracking-wider">{dailyTitle}</span>
                  <span className="text-[#2D3345] mx-2">|</span>
                  <span className={`inline-block text-[10px] px-1.5 py-0.5 rounded-sm font-bold border ${
                    dailyCompleted 
                      ? 'bg-ghost-teal/10 border-ghost-teal/20 text-ghost-teal' 
                      : 'bg-amber/10 border-amber/20 text-amber animate-pulse'
                  }`}>
                    {dailyCompleted ? 'SELESAI' : 'BELUM SELESAI'}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-4 w-full sm:w-auto justify-between sm:justify-end">
                {dailyStreak > 0 && (
                  <span className="font-mono font-bold text-amber text-sm tracking-wide">
                    🔥 {dailyStreak} Hari Streak
                  </span>
                )}
                <Link
                  href="/daily"
                  className="px-4 py-2 bg-[#1C1F2B] hover:bg-[#272B38] text-paper font-bold rounded border border-[#2D3345] hover:border-amber/30 text-xs transition-all flex items-center gap-1 active:scale-95 shrink-0 cursor-pointer animate-pulse"
                >
                  Buka Menu Challenge
                  <svg className="w-3.5 h-3.5 text-amber" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
                  </svg>
                </Link>
              </div>
            </div>
          )}

          {/* Core Action Buttons - Launching Race Mode, Time Attack Mode, Survival Mode, Boss Battle & Story Mode */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6 select-none pt-2">
            {/* Race Mode Card */}
            <div className="glass-card p-5 rounded border border-[#2D3345] hover:border-amber/40 transition-colors flex flex-col justify-between items-start space-y-4">
              <div>
                <span className="text-[10px] bg-amber/15 text-amber px-2 py-0.5 rounded-sm font-bold border border-amber/25 uppercase">
                  Mode Balap
                </span>
                <h3 className="text-lg font-black text-paper mt-2">Balapan vs Ghost</h3>
                <p className="text-xs text-slate-custom mt-1 leading-relaxed">
                  Ketik teks lengkap pilihan Anda dan bersaing langsung melawan bayangan (ghost) performa terbaik Anda sebelumnya.
                </p>
              </div>
              <button
                onClick={handleStartRace}
                className="w-full px-4 py-3 bg-amber hover:bg-amber/90 text-ink font-black rounded shadow-lg shadow-amber/10 active:scale-95 transition-all text-xs uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer"
              >
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M11.3 1.046A1 1 0 0112 2v5h4a1 1 0 01.82 1.573l-7 10A1 1 0 018 18v-5H4a1 1 0 01-.82-1.573l7-10a1 1 0 011.12-.38z" />
                </svg>
                Mulai Balapan vs Ghost
              </button>
            </div>

            {/* Time Attack Mode Card */}
            <div className="glass-card p-5 rounded border-ghost-teal/20 hover:border-ghost-teal/50 transition-colors flex flex-col justify-between items-start space-y-4">
              <div>
                <span className="text-[10px] bg-ghost-teal/15 text-ghost-teal px-2 py-0.5 rounded-sm font-bold border border-ghost-teal/25 uppercase">
                  Mode Fokus (Baru)
                </span>
                <h3 className="text-lg font-black text-paper mt-2">Time Attack</h3>
                <p className="text-xs text-slate-custom mt-1 leading-relaxed">
                  Uji batas kecepatan mengetik Anda! Ketik kata-kata acak sebanyak mungkin dalam batas waktu 30, 60, atau 120 detik.
                </p>
              </div>
              <Link
                href="/time-attack"
                className="w-full px-4 py-3 bg-ghost-teal hover:bg-ghost-teal/90 text-ink font-black rounded shadow-lg shadow-ghost-teal/10 active:scale-95 transition-all text-xs uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Mulai Time Attack
              </Link>
            </div>

            {/* Survival Mode Card */}
            <div className="glass-card p-5 rounded border-error-custom/20 hover:border-error-custom/50 transition-colors flex flex-col justify-between items-start space-y-4">
              <div>
                <span className="text-[10px] bg-error-custom/15 text-error-custom px-2 py-0.5 rounded-sm font-bold border border-error-custom/25 uppercase">
                  Mode Arcade
                </span>
                <h3 className="text-lg font-black text-paper mt-2">Survival Mode</h3>
                <p className="text-xs text-slate-custom mt-1 leading-relaxed">
                  Ketik kata yang jatuh secepat mungkin sebelum menyentuh batas bawah layar. Kelola 3 nyawa dan combo multiplier!
                </p>
              </div>
              <Link
                href="/survival"
                className="w-full px-4 py-3 bg-error-custom hover:bg-error-custom/90 text-paper font-black rounded shadow-lg shadow-error-custom/10 active:scale-95 transition-all text-xs uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                Mulai Survival Mode
              </Link>
            </div>

            {/* Boss Battle Mode Card */}
            <div className="glass-card p-5 rounded border-pixel-accent/20 hover:border-pixel-accent/50 bg-pixel-bg/10 hover:bg-pixel-bg/25 transition-all flex flex-col justify-between items-start space-y-4">
              <div>
                <span className="text-[10px] bg-pixel-accent/15 text-pixel-accent px-2 py-0.5 rounded-sm font-bold border border-pixel-accent/25 uppercase">
                  Mode RPG (Baru)
                </span>
                <h3 className="text-lg font-black text-pixel-text mt-2 tracking-wide font-pixel text-[10px] md:text-xs">
                  Boss Battle
                </h3>
                <p className="text-xs text-slate-custom mt-1 leading-relaxed">
                  Lawan monster pixel legendaris dalam pertarungan RPG turn-based. Ketik cepat untuk menyerang sebelum diserang balik!
                </p>
              </div>
              <Link
                href="/boss-battle"
                className="w-full px-4 py-3 bg-pixel-accent hover:bg-pixel-accent/90 text-pixel-bg font-black rounded shadow-lg shadow-pixel-accent/10 active:scale-95 transition-all text-xs uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
                Mulai Boss Battle
              </Link>
            </div>

            {/* Story Mode Card */}
            <div className="glass-card p-5 rounded border border-[#2D3345] hover:border-amber/40 transition-colors flex flex-col justify-between items-start space-y-4 animate-pixel-fade-in">
              <div>
                <span className="text-[10px] bg-amber/15 text-amber px-2 py-0.5 rounded-sm font-bold border border-amber/25 uppercase">
                  Mode Kampanye (Baru)
                </span>
                <h3 className="text-lg font-black text-paper mt-2">Story Mode</h3>
                <p className="text-xs text-slate-custom mt-1 leading-relaxed">
                  Jelajahi Lexicon Realm. Hadapi bos-bos kata legendaris secara berurutan untuk memulihkan perpustakaan kata.
                </p>
              </div>
              <Link
                href="/story"
                className="w-full px-4 py-3 bg-amber hover:bg-amber/90 text-ink font-black rounded shadow-lg shadow-amber/10 active:scale-95 transition-all text-xs uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer text-center"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                </svg>
                Mulai Story Mode
              </Link>
            </div>
          </div>


          {/* Stats Dashboard */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* WPM Card */}
            <div className="glass-card p-5 rounded border border-[#2D3345] flex flex-col justify-between relative overflow-hidden select-none">
              <div className="text-slate-custom font-bold text-xs uppercase tracking-wider">WPM (Speed)</div>
              <div className="text-5xl font-mono tabular-nums font-black text-amber my-2 drop-shadow-[0_0_10px_rgba(232,163,61,0.2)]">
                {wpm}
              </div>
              <div className="text-xs text-slate-custom font-medium">Latihan saat ini</div>
            </div>

            {/* Accuracy Card */}
            <div className="glass-card p-5 rounded border border-[#2D3345] flex flex-col justify-between relative overflow-hidden select-none">
              <div className="text-slate-custom font-bold text-xs uppercase tracking-wider">Accuracy</div>
              <div className="text-5xl font-mono tabular-nums font-black text-amber my-2 drop-shadow-[0_0_10px_rgba(232,163,61,0.2)]">
                {accuracy}%
              </div>
              <div className="text-xs text-slate-custom font-medium">Latihan saat ini</div>
            </div>

            {/* Duration Card */}
            <div className="glass-card p-5 rounded border border-[#2D3345] flex flex-col justify-between relative overflow-hidden select-none">
              <div className="text-slate-custom font-bold text-xs uppercase tracking-wider">Duration</div>
              <div className="text-5xl font-mono tabular-nums font-black text-ghost-teal my-2 drop-shadow-[0_0_10px_rgba(94,234,212,0.2)]">
                {secondsElapsed}s
              </div>
              <div className="text-xs text-slate-custom font-medium">Latihan saat ini</div>
            </div>
          </div>

          {/* Engine Status & Progress Bar */}
          <div className="space-y-2">
            <div className="flex justify-between items-center text-sm font-medium">
              <span className={statusColor}>{statusMessage}</span>
              <span className="text-slate-custom select-none">{progressPercentage}% selesai</span>
            </div>
            <div className="w-full h-2 bg-[#11131A] border border-[#2D3345] rounded-full overflow-hidden">
              <div
                className="h-full bg-amber transition-all duration-150 rounded-full"
                style={{ width: `${progressPercentage}%` }}
              />
            </div>
          </div>

          {/* Typing Display */}
          <div className="relative">
            <TypingDisplay
              targetText={targetText}
              typedChars={typedChars}
              currentIndex={currentIndex}
              isActive={!isFinished}
            />
          </div>

          {/* Controls */}
          <div className="flex justify-center select-none gap-4">
            <button
              onClick={handleReset}
              className="px-8 py-3.5 bg-[#1C1F2B] hover:bg-[#272B38] text-paper font-bold rounded border border-[#2D3345] hover:border-amber/50 transition-all cursor-pointer shadow-lg flex items-center gap-2 active:scale-95 text-xs sm:text-sm"
            >
              <svg
                className="w-4 h-4 text-amber"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 1121.21 7.89M9 11l3-3 3 3m-3-3v12"
                />
              </svg>
              Ulangi Latihan
            </button>
          </div>

          {/* Keystroke Log Inspector */}
          <div className="glass-card rounded overflow-hidden border border-[#2D3345]">
            <button
              onClick={() => setShowLogs(!showLogs)}
              className="w-full px-6 py-4 flex justify-between items-center bg-[#11131A]/30 hover:bg-[#11131A]/60 text-slate-custom font-bold transition-all cursor-pointer select-none"
            >
              <span>Real-time Keystroke Log ({keystrokeLog.length} terdeteksi)</span>
              <svg
                className={`w-5 h-5 transform transition-transform duration-200 ${
                  showLogs ? 'rotate-180 text-amber' : 'text-slate-custom'
                }`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {showLogs && (
              <div className="border-t border-[#2D3345]/80 bg-[#11131A]/60 p-4 max-h-[300px] overflow-y-auto custom-scrollbar">
                {keystrokeLog.length === 0 ? (
                  <div className="text-center py-6 text-slate-custom text-sm font-medium">
                    Belum ada keystroke yang terekam. Silakan mulai mengetik.
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="border-b border-[#2D3345] text-slate-custom font-semibold select-none">
                          <th className="py-2 px-4">No.</th>
                          <th className="py-2 px-4">Karakter</th>
                          <th className="py-2 px-4">Timestamp (ms)</th>
                          <th className="py-2 px-4">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#151821] font-mono">
                        {keystrokeLog.map((log, idx) => (
                          <tr key={idx} className="hover:bg-[#151821]/50">
                            <td className="py-2 px-4 text-slate-custom">{idx + 1}</td>
                            <td className="py-2 px-4 text-paper">
                              {log.char === ' ' ? (
                                <span className="text-slate-custom bg-[#11131A] px-1.5 py-0.5 rounded text-[10px] border border-[#2D3345]">SPACE</span>
                              ) : (
                                log.char
                              )}
                            </td>
                            <td className="py-2 px-4 text-amber font-mono tabular-nums font-semibold">{log.timestamp_ms} ms</td>
                            <td className="py-2 px-4">
                              {log.correct ? (
                                <span className="text-[#5EEAD4] font-bold">BENAR</span>
                              ) : (
                                <span className="text-error-custom font-bold animate-pulse">SALAH</span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}
          </div>

        </div>
      </main>

      {/* Footer */}
      <footer className="glass-panel w-full py-4 text-center border-t border-[#2D3345] text-xs text-slate-custom select-none font-sans">
        &copy; 2026 GhostType Typing Game. All rights reserved.
      </footer>
    </div>
  );
}
