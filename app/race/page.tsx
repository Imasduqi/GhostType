"use client";

import { useState, useEffect, useCallback, useRef, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useTypingEngine } from '@/components/typing-engine/useTypingEngine';
import { TypingDisplay } from '@/components/typing-engine/TypingDisplay';
import { RaceTrack } from '@/components/race-mode/RaceTrack';
import { supabase } from '@/lib/supabase/client';
import { 
  getOrCreateText, 
  getBestAttemptForText, 
  saveAttempt 
} from '@/lib/supabase/queries';
import { Attempt } from '@/types';
import { calculateWpm } from '@/lib/typing/calculateWpm';
import { ThemeToggle } from '@/components/ThemeToggle';
import { checkAndUnlockAchievements } from '@/lib/achievements/checkAchievements';
import { generateDailyChallenge } from '@/lib/daily/dailyChallengeGenerator';
import { saveDailyScore, updateUserDailyStreak } from '@/lib/supabase/dailyQueries';



function RaceGame() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // 1. Get configurations from search parameters
  const lang = (searchParams.get('lang') || 'id') as 'id' | 'en';
  const diff = (searchParams.get('diff') || 'medium') as 'easy' | 'medium' | 'hard';
  const source = (searchParams.get('source') || 'curated') as 'curated' | 'generated' | 'custom';
  const textParam = searchParams.get('text') || '';
  const textIdParam = searchParams.get('textId') || '';

  const targetText = decodeURIComponent(textParam) || 'Teks kosong.';

  // 2. Auth states
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [authLoading, setAuthLoading] = useState(true);

  // 3. Race State
  const [countdown, setCountdown] = useState(3);
  const [raceActive, setRaceActive] = useState(false);
  const [countdownActive, setCountdownActive] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showSummary, setShowSummary] = useState(false);
  const [dailyResult, setDailyResult] = useState<any | null>(null);


  // 4. Ghost Playback States
  const [bestAttempt, setBestAttempt] = useState<Attempt | null>(null);
  const [ghostProgress, setGhostProgress] = useState(0);
  const [ghostWpm, setGhostWpm] = useState(0);
  const [isGhostReference, setIsGhostReference] = useState(true);
  const [ghostDuration, setGhostDuration] = useState(0);

  const startTimeRef = useRef<number | null>(null);
  const ghostTimerRef = useRef<NodeJS.Timeout | null>(null);
  const solvedTextIdRef = useRef<string | null>(textIdParam || null);

  // 5. Auth verification
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session?.user) {
        // User not logged in, redirect to login
        const encodedRedirect = encodeURIComponent(`/race?lang=${lang}&diff=${diff}&source=${source}&textId=${textIdParam}&text=${encodeURIComponent(targetText)}`);
        router.push(`/login?redirect=${encodedRedirect}`);
      } else {
        setCurrentUser(session.user);
        setAuthLoading(false);
      }
    });
  }, [lang, diff, source, textIdParam, targetText, router]);

  // 6. Fetch Database Text ID and Best Attempt
  const setupRaceData = useCallback(async (userId: string) => {
    try {
      let resolvedTextId = solvedTextIdRef.current;

      // Ensure we have a valid text_id in the DB.
      // Generated/Custom texts need to be created in the texts table first.
      if (!resolvedTextId) {
        const id = await getOrCreateText(targetText, lang, diff, source);
        if (id) {
          resolvedTextId = id;
          solvedTextIdRef.current = id;
        }
      }

      if (resolvedTextId) {
        // Fetch best attempt of the user for this text ID
        const best = await getBestAttemptForText(userId, resolvedTextId);
        if (best) {
          setBestAttempt(best);
          setIsGhostReference(false);
          setGhostDuration(best.duration_ms);
          setGhostWpm(best.wpm);
        } else {
          // No attempt, fallback to constant 40 WPM reference ghost
          setBestAttempt(null);
          setIsGhostReference(true);
          // 40 WPM = 200 CPM (chars per min).
          // Estimated duration: (text length / 200) * 60,000 ms
          const estimatedDuration = (targetText.length / 200) * 60000;
          setGhostDuration(estimatedDuration);
          setGhostWpm(40);
        }
      }
    } catch (err) {
      console.error('Error setting up race data:', err);
    }
  }, [targetText, lang, diff, source]);

  useEffect(() => {
    if (currentUser) {
      setupRaceData(currentUser.id);
    }
  }, [currentUser, setupRaceData]);

  // 7. Sesi Start & Countdown sequence
  useEffect(() => {
    if (authLoading || !currentUser) return;

    if (countdown > 0 && countdownActive) {
      const timer = setTimeout(() => {
        setCountdown(prev => prev - 1);
      }, 1000);
      return () => clearTimeout(timer);
    } else if (countdown === 0 && countdownActive) {
      // Countdown completed, start race!
      setCountdownActive(false);
      setRaceActive(true);
      startTimeRef.current = Date.now();
    }
  }, [countdown, countdownActive, authLoading, currentUser]);

  // 8. Ghost Replay Loop
  useEffect(() => {
    if (raceActive && startTimeRef.current) {
      // Start polling/updating ghost position at 60fps (approx 16ms) for fluid motion (F-RACE-02)
      ghostTimerRef.current = setInterval(() => {
        if (!startTimeRef.current) return;
        const elapsed = Date.now() - startTimeRef.current;

        if (!isGhostReference && bestAttempt) {
          // Playback recorded keystroke_log from best attempt
          if (elapsed >= bestAttempt.duration_ms) {
            setGhostProgress(100);
            setGhostWpm(bestAttempt.wpm);
            if (ghostTimerRef.current) clearInterval(ghostTimerRef.current);
          } else {
            // Find index of typed characters that happened before 'elapsed'
            const correctKeystrokes = bestAttempt.keystroke_log.filter(k => k.correct);
            const correctCount = correctKeystrokes.filter(k => k.timestamp_ms <= elapsed).length;
            const progress = (correctCount / targetText.length) * 100;
            setGhostProgress(Math.min(100, progress));

            // Calculate ghost real-time WPM
            const realTimeWpm = calculateWpm(correctCount, elapsed);
            setGhostWpm(realTimeWpm > 0 ? realTimeWpm : bestAttempt.wpm);
          }
        } else {
          // Playback constant 40 WPM ghost reference
          // 40 WPM = 200 CPM = 3.33 chars/sec = 0.00333 chars/ms
          const typedCount = Math.floor(elapsed * 0.00333);
          const progress = (typedCount / targetText.length) * 100;

          if (progress >= 100) {
            setGhostProgress(100);
            setGhostWpm(40);
            if (ghostTimerRef.current) clearInterval(ghostTimerRef.current);
          } else {
            setGhostProgress(progress);
            setGhostWpm(40);
          }
        }
      }, 30);
    }

    return () => {
      if (ghostTimerRef.current) {
        clearInterval(ghostTimerRef.current);
      }
    };
  }, [raceActive, isGhostReference, bestAttempt, targetText.length]);

  // 9. Core Typing Engine Hook (Fase 1)
  const {
    currentIndex,
    typedChars,
    totalCharsTyped,
    isFinished,
    wpm,
    accuracy,
    durationMs,
    keystrokeLog,
    resetEngine
  } = useTypingEngine(targetText, {
    isActive: raceActive,
    onComplete: async (stats) => {
      // 10. Sesi selesai: simpan ke database dan tampilkan Summary Modal (F-RACE-06, F-ENGINE-09)
      setRaceActive(false);
      if (ghostTimerRef.current) clearInterval(ghostTimerRef.current);
      
      setSaving(true);
      
      try {
        const resolvedTextId = solvedTextIdRef.current;
        if (resolvedTextId && currentUser) {
          await saveAttempt({
            user_id: currentUser.id,
            text_id: resolvedTextId,
            mode: 'race',
            wpm: stats.wpm,
            accuracy: stats.accuracy,
            duration_ms: stats.durationMs,
            keystroke_log: stats.keystrokeLog
          });

          // Check for achievements
          const playerWon = stats.durationMs < ghostDuration;
          await checkAndUnlockAchievements(currentUser.id, {
            mode: 'race',
            wpm: stats.wpm,
            accuracy: stats.accuracy,
            playerWon: playerWon
          });

          // Daily Challenge logic
          const isDaily = searchParams.get('daily') === 'true';
          if (isDaily) {
            const challenge = generateDailyChallenge(new Date());
            let completed = false;
            let achieved = 0;
            if (challenge.type === 'speed_run') {
              achieved = stats.wpm;
              completed = achieved >= challenge.targetValue;
            } else if (challenge.type === 'perfect_word') {
              achieved = stats.keystrokeLog.filter(k => !k.correct).length;
              completed = achieved <= challenge.targetValue;
            }

            if (challenge.type === 'speed_run' || challenge.type === 'perfect_word') {
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
        }
      } catch (err) {
        console.error('Error saving attempt:', err);
      } finally {
        setSaving(false);
        setShowSummary(true);
      }
    }
  });

  const playerProgress = targetText.length > 0
    ? (currentIndex / targetText.length) * 100
    : 0;

  const handleRestart = () => {
    // Reset all states
    setCountdown(3);
    setCountdownActive(true);
    setRaceActive(false);
    setGhostProgress(0);
    setGhostWpm(isGhostReference ? 40 : bestAttempt?.wpm ?? 40);
    setShowSummary(false);
    startTimeRef.current = null;
    resetEngine();
    
    // Refresh best attempt to load latest record as the new ghost
    if (currentUser) {
      setupRaceData(currentUser.id);
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-ink flex flex-col items-center justify-center text-amber select-none">
        <div className="w-10 h-10 rounded border-2 border-[#2D3345] border-t-amber animate-spin mb-4" />
        <span className="text-sm font-mono tracking-wider animate-pulse">Menghubungkan Sesi Balapan...</span>
      </div>
    );
  }

  // Summary logic calculations
  const finalDurationSec = (durationMs / 1000).toFixed(2);
  const ghostDurationSec = (ghostDuration / 1000).toFixed(2);
  const timeDifferenceSec = Math.abs((durationMs - ghostDuration) / 1000).toFixed(2);
  const playerWon = durationMs < ghostDuration;

  return (
    <div className="min-h-screen bg-ink flex flex-col justify-between relative overflow-hidden">
      
      {/* Background terminal overlay lines (Subtle style detail) */}
      <div className="absolute inset-0 bg-[linear-gradient(to_bottom,rgba(255,255,255,0.01)_1px,transparent_1px)] bg-[size:100%_4px] pointer-events-none -z-10" />

      {/* Header */}
      <nav className="glass-panel w-full py-4 px-6 border-b border-[#2D3345] sticky top-0 z-50 flex justify-between items-center select-none font-sans">
        <div className="flex items-center gap-4">
          <Link href="/" className="text-slate-custom hover:text-paper transition-colors flex items-center gap-1 text-sm font-bold">
            <svg className="w-4 h-4 text-amber" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Kembali
          </Link>
          <span className="text-[#2D3345]">|</span>
          <span className="text-md font-extrabold text-paper select-none">Arena Balap (Race vs Ghost)</span>
        </div>
        <ThemeToggle />
      </nav>

      {/* Main Game Screen */}
      <main className="flex-1 max-w-4xl w-full mx-auto p-4 sm:p-6 lg:p-8 flex flex-col justify-center space-y-6">
        
        {/* Race Track Visualization */}
        <RaceTrack 
          playerProgress={playerProgress}
          ghostProgress={ghostProgress}
          playerWpm={wpm}
          ghostWpm={ghostWpm}
          isGhostReference={isGhostReference}
        />

        {/* Live typing engine stats */}
        <div className="grid grid-cols-3 gap-3 text-center select-none font-mono">
          <div className="glass-panel p-3 rounded border border-[#2D3345]">
            <div className="text-[10px] text-slate-custom font-bold uppercase font-sans">WPM</div>
            <div className="text-2xl font-black text-amber tabular-nums">{wpm}</div>
          </div>
          <div className="glass-panel p-3 rounded border border-[#2D3345]">
            <div className="text-[10px] text-slate-custom font-bold uppercase font-sans">Accuracy</div>
            <div className="text-2xl font-black text-amber tabular-nums">{accuracy}%</div>
          </div>
          <div className="glass-panel p-3 rounded border border-[#2D3345]">
            <div className="text-[10px] text-slate-custom font-bold uppercase font-sans">Time</div>
            <div className="text-2xl font-black text-ghost-teal tabular-nums">{(durationMs / 1000).toFixed(1)}s</div>
          </div>
        </div>

        {/* Typing Area */}
        <div className="relative">
          <TypingDisplay 
            targetText={targetText}
            typedChars={typedChars}
            currentIndex={currentIndex}
            isActive={raceActive && !isFinished}
          />
        </div>

        {/* Instructions banner */}
        <div className="text-center text-xs text-slate-custom font-medium select-none font-sans">
          Fokuskan kursor Anda dan mulailah mengetik begitu hitung mundur selesai.
        </div>

      </main>

      {/* Footer */}
      <footer className="glass-panel w-full py-4 text-center border-t border-[#2D3345] text-xs text-slate-custom select-none font-sans">
        &copy; 2026 GhostType. Powered by Supabase.
      </footer>

      {/* 11. Countdown Modal overlay */}
      {countdownActive && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/90 backdrop-blur-md select-none">
          <div className="text-center space-y-4">
            <div className="text-[10px] text-amber font-bold uppercase tracking-widest animate-pulse font-sans">
              Balapan Dimulai Dalam
            </div>
            <div className="text-8xl font-mono font-black text-paper animate-ping drop-shadow-[0_0_20px_rgba(232,163,61,0.4)]">
              {countdown}
            </div>
            <div className="text-xs text-slate-custom max-w-xs mx-auto font-sans font-medium leading-relaxed">
              Siapkan jari Anda di keyboard. Balapan otomatis dimulai setelah angka 1.
            </div>
          </div>
        </div>
      )}

      {/* 12. Summary Modal */}
      {showSummary && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/95 backdrop-blur-md px-4 select-none font-sans">
          <div className="glass-card max-w-md w-full p-8 rounded border border-[#2D3345] relative shadow-3xl text-center space-y-6">
            
            <div className="absolute top-0 inset-x-0 h-1 bg-amber rounded-t" />

            {/* Title Result */}
            <div>
              <div className="text-5xl mb-2">
                {playerWon ? '🏆' : '💀'}
              </div>
              <h2 className="text-3xl font-black text-amber">
                {playerWon ? 'MENANG!' : 'KALAH!'}
              </h2>
              <p className="text-slate-custom text-xs mt-1 font-medium">
                {playerWon 
                  ? `Hebat! Anda ${timeDifferenceSec}s lebih cepat dari bayangan Anda.` 
                  : `Ghost Anda ${timeDifferenceSec}s lebih cepat dari Anda. Coba lagi!`
                }
              </p>
            </div>

            {/* Daily Challenge Result Banner */}
            {dailyResult && (
              <div className={`p-4 rounded border text-sm font-sans mb-2 text-center ${
                dailyResult.completed 
                  ? 'bg-ghost-teal/10 border-ghost-teal/30 text-ghost-teal font-bold' 
                  : 'bg-error-custom/10 border-error-custom/30 text-error-custom font-bold'
              }`}>
                <div className="uppercase tracking-wider mb-1">
                  {dailyResult.completed ? '🎉 Tantangan Harian Berhasil!' : '❌ Tantangan Harian Gagal'}
                </div>
                <div className="text-xs opacity-90 leading-relaxed font-medium">
                  {dailyResult.type === 'speed_run' 
                    ? `Target WPM: ${dailyResult.target}, Pencapaian WPM: ${dailyResult.achieved}.`
                    : `Target Typo Maksimal: ${dailyResult.target}, Kesalahan Anda: ${dailyResult.achieved} typo.`
                  }
                  {dailyResult.completed && dailyResult.streak > 0 && (
                    <div className="mt-1 font-bold text-amber">
                      Streak Anda: {dailyResult.streak} Hari!
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Results Table comparison */}
            <div className="bg-[#11131A] p-4 rounded border border-[#2D3345] text-sm space-y-3 font-medium">
              <div className="grid grid-cols-3 text-xs text-slate-custom border-b border-[#2D3345] pb-1.5 font-bold uppercase tracking-wider">
                <div>Metrik</div>
                <div>Anda</div>
                <div>Ghost</div>
              </div>
              
              <div className="grid grid-cols-3 font-mono">
                <div className="text-slate-custom font-semibold text-left font-sans">WPM</div>
                <div className="text-amber font-extrabold tabular-nums">{wpm}</div>
                <div className="text-ghost-teal tabular-nums">{Math.round(ghostWpm)}</div>
              </div>

              <div className="grid grid-cols-3 font-mono">
                <div className="text-slate-custom font-semibold text-left font-sans">Accuracy</div>
                <div className="text-amber font-extrabold tabular-nums">{accuracy}%</div>
                <div className="text-ghost-teal tabular-nums">100%</div>
              </div>

              <div className="grid grid-cols-3 font-mono">
                <div className="text-slate-custom font-semibold text-left font-sans">Duration</div>
                <div className="text-amber font-extrabold tabular-nums">{finalDurationSec}s</div>
                <div className="text-ghost-teal tabular-nums">{ghostDurationSec}s</div>
              </div>
            </div>

            {/* Button options */}
            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              <button
                onClick={handleRestart}
                className="flex-1 py-3 bg-amber hover:bg-amber/90 text-ink font-bold rounded cursor-pointer active:scale-95 text-sm transition-all"
              >
                Race Ulang
              </button>
              <Link
                href="/"
                className="flex-1 py-3 bg-[#1C1F2B] hover:bg-[#272B38] text-paper font-bold rounded border border-[#2D3345] cursor-pointer active:scale-95 text-sm transition-all flex items-center justify-center"
              >
                Pilih Teks Baru
              </Link>
            </div>
            
          </div>
        </div>
      )}

      {/* Saving attempts loading state */}
      {saving && (
        <div className="fixed bottom-4 right-4 z-50 glass-panel px-4 py-2 border-[#2D3345] rounded text-amber text-xs font-semibold flex items-center gap-2 shadow-xl animate-pulse font-sans">
          <div className="w-3.5 h-3.5 rounded border border-[#2D3345] border-t-amber animate-spin" />
          Menyimpan attempt ke database...
        </div>
      )}

    </div>
  );
}

export default function RacePage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-ink flex flex-col items-center justify-center text-amber select-none">
        <div className="w-10 h-10 rounded border-2 border-[#2D3345] border-t-amber animate-spin mb-4" />
        <span className="text-sm font-mono tracking-wider animate-pulse">Memuat konfigurasi arena balap...</span>
      </div>
    }>
      <RaceGame />
    </Suspense>
  );
}
