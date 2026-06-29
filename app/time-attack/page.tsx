"use client";

import { useState, useEffect, useCallback, useRef, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useTypingEngine } from '@/components/typing-engine/useTypingEngine';
import { supabase } from '@/lib/supabase/client';
import { saveTimeAttackScore } from '@/lib/supabase/queries';
import { wordPoolID } from '@/lib/text-generator/wordPoolID';
import { wordPoolEN } from '@/lib/text-generator/wordPoolEN';
import { ThemeToggle } from '@/components/ThemeToggle';
import { checkAndUnlockAchievements } from '@/lib/achievements/checkAchievements';
import { generateDailyChallenge } from '@/lib/daily/dailyChallengeGenerator';
import { saveDailyScore, updateUserDailyStreak } from '@/lib/supabase/dailyQueries';



// Clean English words (no spaces)
const englishWords = [
  ...wordPoolEN.subjek,
  ...wordPoolEN.predikat,
  ...wordPoolEN.objek,
  ...wordPoolEN.kataSifat
].filter(w => !w.includes(' '));

// Clean Indonesian words (no spaces)
const indonesianWords = [
  ...wordPoolID.subjek,
  ...wordPoolID.predikat,
  ...wordPoolID.objek,
  ...wordPoolID.kataSifat
].filter(w => !w.includes(' '));

// Generate endless string of words separated by space
const generateWordsStream = (lang: 'id' | 'en', count: number = 500): string => {
  const pool = lang === 'id' ? indonesianWords : englishWords;
  const selected: string[] = [];
  for (let i = 0; i < count; i++) {
    selected.push(pool[Math.floor(Math.random() * pool.length)]);
  }
  return selected.join(' ');
};

function TimeAttackGame() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const isDaily = searchParams.get('daily') === 'true';
  const [dailyResult, setDailyResult] = useState<any | null>(null);

  // Auth states
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [authLoading, setAuthLoading] = useState(true);

  // Configuration
  const [language, setLanguage] = useState<'id' | 'en'>('id');
  const [durationSetting, setDurationSetting] = useState<30 | 60 | 120>(60);

  // Force 60s for daily accuracy challenge
  useEffect(() => {
    if (isDaily) {
      setDurationSetting(60);
    }
  }, [isDaily]);

  // Game States
  const [gameStatus, setGameStatus] = useState<'ready' | 'countdown' | 'playing' | 'finished'>('ready');
  const [countdown, setCountdown] = useState(3);
  const [timeLeft, setTimeLeft] = useState(60);
  const [targetText, setTargetText] = useState('Tekan mulai untuk memuat teks.');
  const [saving, setSaving] = useState(false);
  const [showSummary, setShowSummary] = useState(false);

  // Stats captured at the end
  const [finalWpm, setFinalWpm] = useState(0);
  const [finalAccuracy, setFinalAccuracy] = useState(100);
  const [finalWordsTyped, setFinalWordsTyped] = useState(0);

  // Scrolling viewports
  const containerRef = useRef<HTMLDivElement>(null);
  const activeWordRef = useRef<HTMLSpanElement>(null);

  // Auth check
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session?.user) {
        const encodedRedirect = encodeURIComponent('/time-attack');
        router.push(`/login?redirect=${encodedRedirect}`);
      } else {
        setCurrentUser(session.user);
        setAuthLoading(false);
      }
    });
  }, [router]);

  // Typing Engine instance
  // Note: We set isActive only when game is playing and time is left
  const {
    currentIndex,
    typedChars,
    wpm,
    accuracy,
    resetEngine
  } = useTypingEngine(targetText, {
    isActive: gameStatus === 'playing' && timeLeft > 0
  });

  // Calculate active word index based on currentIndex
  const getActiveWordIndex = useCallback((text: string, charIndex: number): number => {
    let count = 0;
    const wordsList = text.split(' ');
    for (let i = 0; i < wordsList.length; i++) {
      const wordLengthWithSpace = wordsList[i].length + 1;
      if (charIndex >= count && charIndex < count + wordLengthWithSpace) {
        return i;
      }
      count += wordLengthWithSpace;
    }
    return wordsList.length - 1;
  }, []);

  const activeWordIndex = getActiveWordIndex(targetText, currentIndex);

  // Map targetText into words and character info for display
  const wordsWithChars = targetText.split(' ').map((word, wordIdx) => {
    // Find absolute indices of each character
    const precedingText = targetText.split(' ').slice(0, wordIdx).join(' ');
    const startIndex = precedingText ? precedingText.length + 1 : 0;
    
    const chars = word.split('').map((char, charIdx) => {
      const absoluteIndex = startIndex + charIdx;
      return { char, absoluteIndex };
    });
    
    const spaceAbsoluteIndex = startIndex + word.length;
    return {
      text: word,
      wordIdx,
      chars,
      spaceAbsoluteIndex
    };
  });

  // Scroll active line into center
  useEffect(() => {
    if (activeWordRef.current && containerRef.current) {
      const wordEl = activeWordRef.current;
      const containerEl = containerRef.current;
      const wordOffsetTop = wordEl.offsetTop;
      const containerHeight = containerEl.clientHeight;
      const targetScrollTop = wordOffsetTop - containerHeight / 2 + wordEl.clientHeight / 2;

      containerEl.scrollTo({
        top: targetScrollTop,
        behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth'
      });
    }
  }, [activeWordIndex]);

  // Countdown timer sequence
  useEffect(() => {
    if (gameStatus === 'countdown') {
      if (countdown > 0) {
        const timer = setTimeout(() => setCountdown(prev => prev - 1), 1000);
        return () => clearTimeout(timer);
      } else {
        setGameStatus('playing');
        setTimeLeft(durationSetting);
      }
    }
  }, [gameStatus, countdown, durationSetting]);

  // Game timer sequence
  useEffect(() => {
    if (gameStatus === 'playing') {
      if (timeLeft > 0) {
        const timer = setTimeout(() => setTimeLeft(prev => prev - 1), 1000);
        return () => clearTimeout(timer);
      } else {
        // Time's up! Finish game session
        setGameStatus('finished');
        
        // Capture final stats from engine
        setFinalWpm(wpm);
        setFinalAccuracy(accuracy);
        setFinalWordsTyped(activeWordIndex);
        setShowSummary(true);

        // Save to Supabase
        if (currentUser) {
          setSaving(true);
          saveTimeAttackScore({
            user_id: currentUser.id,
            duration_setting: durationSetting,
            wpm: wpm,
            accuracy: accuracy,
            words_typed: activeWordIndex
          }).then(async () => {
            setSaving(false);
            await checkAndUnlockAchievements(currentUser.id, {
              mode: 'time_attack',
              wpm: wpm,
              accuracy: accuracy,
              duration_setting: durationSetting
            });

            // Daily challenge evaluation
            if (isDaily) {
              const challenge = generateDailyChallenge(new Date());
              if (challenge.type === 'accuracy_trial') {
                const achieved = accuracy;
                const completed = achieved >= challenge.targetValue;
                await saveDailyScore(currentUser.id, challenge.dateString, challenge.type, challenge.targetValue, achieved, completed);
                let streakNum = 0;
                if (completed) {
                  const streak = await updateUserDailyStreak(currentUser.id, challenge.dateString);
                  streakNum = streak?.current_streak || 0;
                }
                setDailyResult({
                  type: challenge.type,
                  target: challenge.targetValue,
                  achieved,
                  completed,
                  streak: streakNum
                });
              }
            }
          }).catch(err => {
            console.error('Failed to save score:', err);
            setSaving(false);
          });
        }
      }
    }
  }, [gameStatus, timeLeft, wpm, accuracy, activeWordIndex, currentUser, durationSetting]);

  // Initiate game
  const initGame = () => {
    const textStream = generateWordsStream(language, 500);
    setTargetText(textStream);
    resetEngine();
    setCountdown(3);
    setGameStatus('countdown');
  };

  const handleRestart = () => {
    setShowSummary(false);
    initGame();
  };

  const handleChooseNewConfig = () => {
    setShowSummary(false);
    setGameStatus('ready');
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-ink flex flex-col items-center justify-center text-amber select-none">
        <div className="w-10 h-10 rounded border-2 border-[#2D3345] border-t-amber animate-spin mb-4" />
        <span className="text-sm font-mono tracking-wider animate-pulse">Menghubungkan Sesi Time Attack...</span>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-ink flex flex-col justify-between relative overflow-hidden">
      
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
              TIME ATTACK
            </span>
          </Link>
        </div>
        <div className="flex items-center gap-4">
          <ThemeToggle />
          <Link
            href="/"
            className="px-4 py-2 bg-[#1C1F2B] hover:bg-[#272B38] text-slate-custom hover:text-paper rounded border border-[#2D3345] text-xs font-bold transition-all"
          >
            Kembali ke Dashboard
          </Link>
        </div>
      </nav>

      {/* Main Container */}
      <main className="flex-1 py-12 px-4 sm:px-6 lg:px-8 flex flex-col justify-center items-center">
        <div className="w-full max-w-4xl space-y-6">

          {/* Configuration Header */}
          <div className="flex justify-between items-center bg-[#11131A]/35 px-4 py-3 rounded border border-[#2D3345]/40 select-none">
            <div className="flex flex-wrap gap-2 items-center text-xs font-semibold font-sans">
              <span className="text-slate-custom">Mode:</span>
              <span className="px-2 py-0.5 bg-[#151821] text-amber rounded border border-[#2D3345]/50 uppercase">
                Time Attack ({language})
              </span>
              <span className="px-2 py-0.5 bg-[#151821] text-amber rounded border border-[#2D3345]/50">
                {durationSetting} Detik
              </span>
            </div>
            {gameStatus === 'playing' && (
              <div className="text-xs text-amber font-mono font-bold animate-pulse">
                SESI SEDANG BERLANGSUNG
              </div>
            )}
          </div>

          {/* Stats & Timer Header */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 select-none">
            {/* Real-time WPM */}
            <div className="glass-card p-5 rounded border border-[#2D3345] flex flex-col justify-between">
              <div className="text-slate-custom font-bold text-xs uppercase tracking-wider">WPM REAL-TIME</div>
              <div className="text-5xl font-mono font-black text-amber my-2 drop-shadow-[0_0_10px_rgba(232,163,61,0.2)]">
                {wpm}
              </div>
              <div className="text-xs text-slate-custom font-medium">Kata per menit saat ini</div>
            </div>

            {/* Real-time Accuracy */}
            <div className="glass-card p-5 rounded border border-[#2D3345] flex flex-col justify-between">
              <div className="text-slate-custom font-bold text-xs uppercase tracking-wider">AKURASI</div>
              <div className="text-5xl font-mono font-black text-amber my-2 drop-shadow-[0_0_10px_rgba(232,163,61,0.2)]">
                {accuracy}%
              </div>
              <div className="text-xs text-slate-custom font-medium">Ketikan tepat tanpa typo</div>
            </div>

            {/* Timer Mundur */}
            <div className="glass-card p-5 rounded border border-[#2D3345] flex flex-col justify-between">
              <div className="text-slate-custom font-bold text-xs uppercase tracking-wider">SISA WAKTU</div>
              <div className={`text-5xl font-mono font-black my-2 tabular-nums drop-shadow-[0_0_10px_rgba(94,234,212,0.2)] ${
                timeLeft <= 10 && gameStatus === 'playing' ? 'text-error-custom' : 'text-ghost-teal'
              }`}>
                {timeLeft}s
              </div>
              <div className="text-xs text-slate-custom font-medium">Sesi otomatis berakhir pada 0s</div>
            </div>
          </div>

          {/* Typing Area Viewport */}
          <div className="relative w-full bg-[#11131A] rounded-lg border-2 border-[#2D3345] shadow-[inset_0_4px_12px_rgba(0,0,0,0.8),_0_8px_32px_rgba(0,0,0,0.6)] overflow-hidden select-none">
            
            {/* Countdown overlay */}
            {gameStatus === 'countdown' && (
              <div className="absolute inset-0 bg-[#11131A]/90 backdrop-blur-sm z-30 flex flex-col justify-center items-center text-center">
                <span className="text-slate-custom font-mono uppercase tracking-widest text-xs mb-2">Bersiaplah</span>
                <span className="text-7xl font-mono font-black text-amber animate-ping">{countdown}</span>
              </div>
            )}

            {/* Ready Screen Config Panel */}
            {gameStatus === 'ready' && (
              <div className="absolute inset-0 bg-[#11131A]/98 z-30 flex flex-col justify-center items-center text-center p-8">
                <h2 className="text-2xl font-black text-paper uppercase tracking-tight">Time Attack Mode</h2>
                <p className="text-slate-custom text-xs max-w-md mt-1 mb-6 leading-relaxed">
                  Ketiklah kata-kata tunggal acak sebanyak mungkin sebelum batas waktu habis. Tidak ada nyawa atau rintangan, murni fokus menguji kecepatan dan akurasi mengetik Anda.
                </p>

                <div className="w-full max-w-sm grid grid-cols-2 gap-4 mb-8">
                  {/* Language selection */}
                  <div className="space-y-1.5 text-left">
                    <label className="block text-[10px] font-bold text-slate-custom uppercase tracking-wider">
                      Bahasa (Language)
                    </label>
                    <div className="flex bg-[#0E1017] p-1 rounded border border-[#2D3345]">
                      <button
                        onClick={() => setLanguage('id')}
                        className={`flex-1 py-1.5 text-xs font-bold rounded transition-all cursor-pointer ${
                          language === 'id'
                            ? 'bg-amber/10 text-amber border border-amber/30'
                            : 'text-slate-custom hover:text-paper'
                        }`}
                      >
                        Indo
                      </button>
                      <button
                        onClick={() => setLanguage('en')}
                        className={`flex-1 py-1.5 text-xs font-bold rounded transition-all cursor-pointer ${
                          language === 'en'
                            ? 'bg-amber/10 text-amber border border-amber/30'
                            : 'text-slate-custom hover:text-paper'
                        }`}
                      >
                        Eng
                      </button>
                    </div>
                  </div>

                  {/* Duration selection */}
                  <div className="space-y-1.5 text-left">
                    <label className="block text-[10px] font-bold text-slate-custom uppercase tracking-wider">
                      Durasi (Duration)
                    </label>
                    <div className="flex bg-[#0E1017] p-1 rounded border border-[#2D3345]">
                      {/* Disable buttons when daily challenge is active */}
                      {[30, 60, 120].map((dur) => (
                        <button
                          key={dur}
                          onClick={() => !isDaily && setDurationSetting(dur as 30 | 60 | 120)}
                          disabled={isDaily}
                          className={`flex-1 py-1.5 text-xs font-bold rounded transition-all ${
                            isDaily ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer'
                          } ${
                            durationSetting === dur
                              ? 'bg-amber/10 text-amber border border-amber/30'
                              : 'text-slate-custom hover:text-paper'
                          }`}
                        >
                          {dur}s
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <button
                  onClick={initGame}
                  className="px-10 py-3.5 bg-amber hover:bg-amber/90 text-ink font-black rounded-sm shadow-lg shadow-amber/10 transition-all hover:scale-105 active:scale-95 text-xs uppercase tracking-wider flex items-center gap-2 cursor-pointer"
                >
                  <svg className="w-4 h-4 fill-current" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd"/>
                  </svg>
                  Mulai Time Attack
                </button>
              </div>
            )}

            {/* MonkeyType viewport wrapper */}
            <div 
              ref={containerRef} 
              className="h-44 overflow-hidden relative leading-relaxed px-6 py-4 custom-scrollbar scroll-smooth"
            >
              <div className="flex flex-wrap gap-x-2.5 gap-y-4 items-center justify-start py-12">
                {wordsWithChars.map((wordData, wIdx) => {
                  const isActive = wIdx === activeWordIndex;
                  return (
                    <span
                      key={wIdx}
                      ref={isActive ? activeWordRef : null}
                      className={`inline-block transition-all duration-150 py-0.5 px-1 rounded ${
                        isActive ? 'bg-[#1C1F2B] ring-1 ring-amber/20' : ''
                      }`}
                    >
                      {wordData.chars.map(c => {
                        let charColor = 'text-slate-custom';
                        let isCurrent = c.absoluteIndex === currentIndex && gameStatus === 'playing';
                        
                        if (c.absoluteIndex < currentIndex) {
                          const typed = typedChars[c.absoluteIndex];
                          charColor = typed?.correct ? 'text-paper' : 'text-error-custom border-b-2 border-error-custom';
                        }
                        
                        return (
                          <span
                            key={c.absoluteIndex}
                            className={`relative font-mono font-bold text-lg md:text-xl select-none ${charColor}`}
                          >
                            {c.char}
                            {isCurrent && (
                              <span className="absolute bottom-0 inset-x-0 h-0.5 bg-amber rounded-full animate-pulse" />
                            )}
                          </span>
                        );
                      })}
                    </span>
                  );
                })}
              </div>
            </div>

          </div>

        </div>
      </main>

      {/* Summary modal */}
      {showSummary && (
        <div className="fixed inset-0 bg-ink/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 select-none">
          <div className="glass-card w-full max-w-md p-6 rounded border border-[#2D3345] space-y-6">
            <div className="text-center">
              <span className="text-4xl">⏱️</span>
              <h2 className="text-2xl font-black text-paper uppercase tracking-tight mt-2">Waktu Habis!</h2>
              <p className="text-xs text-slate-custom">Laporan Sesi Time Attack Anda ({durationSetting} detik)</p>
            </div>

            {/* Daily Challenge Result Banner */}
            {dailyResult && (
              <div className={`p-4 rounded border text-sm font-sans text-center ${
                dailyResult.completed 
                  ? 'bg-ghost-teal/10 border-ghost-teal/30 text-ghost-teal font-bold' 
                  : 'bg-error-custom/10 border-error-custom/30 text-error-custom font-bold'
              }`}>
                <div className="uppercase tracking-wider mb-1">
                  {dailyResult.completed ? '🎉 Tantangan Harian Berhasil!' : '❌ Tantangan Harian Gagal'}
                </div>
                <div className="text-xs opacity-90 leading-relaxed font-medium">
                  Target Akurasi: {dailyResult.target}%, Akurasi Anda: {dailyResult.achieved}%.
                  {dailyResult.completed && dailyResult.streak > 0 && (
                    <div className="mt-1 font-bold text-amber">
                      Streak Anda: {dailyResult.streak} Hari!
                    </div>
                  )}
                </div>
              </div>
            )}

            <div className="bg-[#11131A] border border-[#2D3345] p-5 rounded-md space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <span className="block text-[10px] text-slate-custom font-bold uppercase">Kecepatan Mengetik</span>
                  <span className="text-3xl font-mono font-black text-amber tabular-nums">{finalWpm} WPM</span>
                </div>
                <div>
                  <span className="block text-[10px] text-slate-custom font-bold uppercase">Akurasi Final</span>
                  <span className="text-3xl font-mono font-black text-ghost-teal tabular-nums">{finalAccuracy}%</span>
                </div>
                <div>
                  <span className="block text-[10px] text-slate-custom font-bold uppercase">Kata Diketik</span>
                  <span className="text-lg font-mono font-bold text-paper tabular-nums">{finalWordsTyped} kata</span>
                </div>
                <div>
                  <span className="block text-[10px] text-slate-custom font-bold uppercase">Durasi Pilihan</span>
                  <span className="text-lg font-mono font-bold text-paper tabular-nums">{durationSetting} detik</span>
                </div>
              </div>

              {saving ? (
                <div className="text-xs text-amber font-mono animate-pulse text-center pt-2 border-t border-[#2D3345]/50">
                  Menyimpan skor ke database...
                </div>
              ) : (
                <div className="text-xs text-ghost-teal font-mono text-center pt-2 border-t border-[#2D3345]/50">
                  Skor berhasil disimpan di Supabase.
                </div>
              )}
            </div>

            <div className="flex gap-4 justify-center">
              <button
                onClick={handleRestart}
                className="flex-1 py-3 bg-amber hover:bg-amber/90 text-ink font-black rounded-sm transition-all text-xs uppercase tracking-wider cursor-pointer"
              >
                Main Lagi (Durasi Sama)
              </button>
              <button
                onClick={handleChooseNewConfig}
                className="flex-1 py-3 bg-[#1C1F2B] hover:bg-[#272B38] text-paper rounded border border-[#2D3345] transition-all text-xs uppercase tracking-wider cursor-pointer"
              >
                Pilih Durasi Baru
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="glass-panel w-full py-4 text-center border-t border-[#2D3345] text-xs text-slate-custom select-none font-sans">
        &copy; 2026 GhostType Typing Game. Mode Time Attack. All rights reserved.
      </footer>

      {/* Custom Styles */}
      <style jsx global>{`
        /* Scrollbar inside MonkeyType viewport */
        .custom-scrollbar::-webkit-scrollbar {
          width: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(139, 147, 167, 0.2);
          border-radius: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: var(--amber);
        }

        /* Disable caret blinking for prefers-reduced-motion */
        @media (prefers-reduced-motion: reduce) {
          .animate-pulse {
            animation: none !important;
          }
          .scroll-smooth {
            scroll-behavior: auto !important;
          }
        }
      `}</style>
    </div>
  );
}

export default function TimeAttackPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-ink flex flex-col items-center justify-center text-amber select-none">
        <div className="w-10 h-10 rounded border-2 border-[#2D3345] border-t-amber animate-spin mb-4" />
        <span className="text-sm font-mono tracking-wider animate-pulse">Memuat konfigurasi serangan waktu...</span>
      </div>
    }>
      <TimeAttackGame />
    </Suspense>
  );
}

