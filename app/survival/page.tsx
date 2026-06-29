"use client";

import { useState, useEffect, useCallback, useRef, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabase/client';
import { saveSurvivalScore } from '@/lib/supabase/queries';
import { wordPoolID } from '@/lib/text-generator/wordPoolID';
import { wordPoolEN } from '@/lib/text-generator/wordPoolEN';
import { calculateWpm } from '@/lib/typing/calculateWpm';
import { calculateAccuracy } from '@/lib/typing/calculateAccuracy';
import { ThemeToggle } from '@/components/ThemeToggle';
import { checkAndUnlockAchievements } from '@/lib/achievements/checkAchievements';
import { generateDailyChallenge } from '@/lib/daily/dailyChallengeGenerator';
import { saveDailyScore, updateUserDailyStreak } from '@/lib/supabase/dailyQueries';



// Type definitions
interface FallingWord {
  id: string;
  text: string;
  x: number; // percentage (5 to 85)
  y: number; // percentage (0 to 100)
  speed: number; // percentage per second
  typedLength: number;
  hasError: boolean;
}

interface FloatingPopup {
  id: string;
  text: string;
  x: number;
  y: number;
}

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

function SurvivalGame() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [dailyResult, setDailyResult] = useState<any | null>(null);


  // Auth states
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [authLoading, setAuthLoading] = useState(true);

  // Configuration
  const [language, setLanguage] = useState<'id' | 'en'>('id');

  // Game Play States
  const [gameStatus, setGameStatus] = useState<'ready' | 'playing' | 'gameover'>('ready');
  const [words, setWords] = useState<FallingWord[]>([]);
  const [focusedWordId, setFocusedWordId] = useState<string | null>(null);
  const [score, setScore] = useState(0);
  const [combo, setCombo] = useState(0);
  const [maxCombo, setMaxCombo] = useState(0);
  const [lives, setLives] = useState(3);
  const [wordsTypedCount, setWordsTypedCount] = useState(0);
  const [totalCorrectChars, setTotalCorrectChars] = useState(0);
  const [totalErrors, setTotalErrors] = useState(0);
  
  // Visual states
  const [popups, setPopups] = useState<FloatingPopup[]>([]);
  const [isDamaged, setIsDamaged] = useState(false);
  const [isGlobalError, setIsGlobalError] = useState(false);
  const [saving, setSaving] = useState(false);

  // Game Loop Refs
  const requestRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number>(0);
  const startTimeRef = useRef<number>(0);
  const timeSinceLastSpawnRef = useRef<number>(0);

  // State refs to bypass stale closure in window keydown listener
  const gameStatusRef = useRef(gameStatus);
  const wordsRef = useRef<FallingWord[]>([]);
  const focusedWordIdRef = useRef<string | null>(null);
  const scoreRef = useRef(0);
  const comboRef = useRef(0);
  const maxComboRef = useRef(0);
  const livesRef = useRef(3);
  const wordsTypedCountRef = useRef(0);
  const totalCorrectCharsRef = useRef(0);
  const totalErrorsRef = useRef(0);
  const languageRef = useRef(language);

  // Sync refs with states
  useEffect(() => { gameStatusRef.current = gameStatus; }, [gameStatus]);
  useEffect(() => { wordsRef.current = words; }, [words]);
  useEffect(() => { focusedWordIdRef.current = focusedWordId; }, [focusedWordId]);
  useEffect(() => { scoreRef.current = score; }, [score]);
  useEffect(() => { comboRef.current = combo; }, [combo]);
  useEffect(() => { maxComboRef.current = maxCombo; }, [maxCombo]);
  useEffect(() => { livesRef.current = lives; }, [lives]);
  useEffect(() => { wordsTypedCountRef.current = wordsTypedCount; }, [wordsTypedCount]);
  useEffect(() => { totalCorrectCharsRef.current = totalCorrectChars; }, [totalCorrectChars]);
  useEffect(() => { totalErrorsRef.current = totalErrors; }, [totalErrors]);
  useEffect(() => { languageRef.current = language; }, [language]);

  // Auth check
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session?.user) {
        const encodedRedirect = encodeURIComponent('/survival');
        router.push(`/login?redirect=${encodedRedirect}`);
      } else {
        setCurrentUser(session.user);
        setAuthLoading(false);
      }
    });
  }, [router]);

  // Get difficulty parameters based on score
  const getDifficulty = (currentScore: number) => {
    if (currentScore <= 500) {
      return { speed: 10, spawnInterval: 3500, maxActive: 3, tier: 1 };
    } else if (currentScore <= 1500) {
      return { speed: 13, spawnInterval: 2800, maxActive: 4, tier: 2 };
    } else if (currentScore <= 3000) {
      return { speed: 16, spawnInterval: 2200, maxActive: 5, tier: 3 };
    } else if (currentScore <= 5000) {
      return { speed: 20, spawnInterval: 1800, maxActive: 6, tier: 4 };
    } else {
      return { speed: 25, spawnInterval: 1400, maxActive: 8, tier: 5 };
    }
  };

  const currentDiff = getDifficulty(score);

  // Spawn word helper
  const spawnWord = useCallback(() => {
    const activePool = languageRef.current === 'id' ? indonesianWords : englishWords;
    const currentlyActiveTexts = wordsRef.current.map(w => w.text);
    
    // Filter pool to avoid duplicates
    const availablePool = activePool.filter(w => !currentlyActiveTexts.includes(w));
    const poolToUse = availablePool.length > 0 ? availablePool : activePool;
    
    const randomWordText = poolToUse[Math.floor(Math.random() * poolToUse.length)];
    
    // Choose non-overlapping x coordinate
    // Let's divide x space into 8 lanes and choose a lane that doesn't have words too close to top
    const lanes = [10, 20, 30, 40, 50, 60, 70, 80];
    const laneStats = lanes.map(laneX => {
      const closeWords = wordsRef.current.filter(w => Math.abs(w.x - laneX) < 12 && w.y < 30);
      return { laneX, count: closeWords.length };
    });
    // Sort lanes by occupancy count, then pick randomly from the lowest-occupied lanes
    laneStats.sort((a, b) => a.count - b.count);
    const bestLanes = laneStats.filter(l => l.count === laneStats[0].count);
    const chosenX = bestLanes[Math.floor(Math.random() * bestLanes.length)].laneX;

    const currentParams = getDifficulty(scoreRef.current);

    const newWord: FallingWord = {
      id: Math.random().toString(36).substring(2, 9),
      text: randomWordText,
      x: chosenX + (Math.random() * 4 - 2), // add slight randomness
      y: 0,
      speed: currentParams.speed,
      typedLength: 0,
      hasError: false
    };

    const updated = [...wordsRef.current, newWord];
    wordsRef.current = updated;
    setWords(updated);
  }, []);

  // Save score to database
  const saveFinalScore = async () => {
    if (!currentUser) return;
    setSaving(true);
    try {
      const durationMs = Date.now() - startTimeRef.current;
      await saveSurvivalScore({
        user_id: currentUser.id,
        score: scoreRef.current,
        words_typed: wordsTypedCountRef.current,
        max_combo: maxComboRef.current,
        duration_ms: durationMs
      });

      // Check achievements
      await checkAndUnlockAchievements(currentUser.id, {
        mode: 'survival',
        score: scoreRef.current,
        duration_ms: durationMs
      });

      // Daily Challenge logic
      const isDaily = searchParams.get('daily') === 'true';
      if (isDaily) {
        const challenge = generateDailyChallenge(new Date());
        if (challenge.type === 'survival_reach') {
          const achieved = scoreRef.current;
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
    } catch (err) {
      console.error('Error saving score:', err);
    } finally {
      setSaving(false);
    }
  };

  // Main Game Loop Update Tick
  const updateGame = (time: number) => {
    if (gameStatusRef.current !== 'playing') return;

    if (!lastTimeRef.current) lastTimeRef.current = time;
    const deltaTime = time - lastTimeRef.current;
    lastTimeRef.current = time;

    // 1. Update positions of words
    const currentParams = getDifficulty(scoreRef.current);
    timeSinceLastSpawnRef.current += deltaTime;

    let hitBottom = false;
    const updatedWords = wordsRef.current
      .map(w => {
        // Falling logic: y is coordinate from 0 to 100.
        // speed is percentage per second
        const newY = w.y + (w.speed * deltaTime) / 1000;
        return { ...w, y: newY };
      })
      .filter(w => {
        if (w.y >= 95) {
          // Word hit bottom line!
          hitBottom = true;
          
          // If this was the focused word, release focus
          if (focusedWordIdRef.current === w.id) {
            focusedWordIdRef.current = null;
            setFocusedWordId(null);
          }
          return false;
        }
        return true;
      });

    // 2. Handle hit bottom consequences
    if (hitBottom) {
      // Reduce live, reset combo
      const newLives = Math.max(0, livesRef.current - 1);
      livesRef.current = newLives;
      setLives(newLives);

      comboRef.current = 0;
      setCombo(0);

      // Trigger visual shake
      setIsDamaged(true);
      setTimeout(() => setIsDamaged(false), 300);

      if (newLives === 0) {
        // Game Over!
        setGameStatus('gameover');
        gameStatusRef.current = 'gameover';
        saveFinalScore();
        if (requestRef.current) {
          cancelAnimationFrame(requestRef.current);
        }
        return;
      }
    }

    // 3. Spawn a new word if interval elapsed and count is below limit
    if (
      timeSinceLastSpawnRef.current >= currentParams.spawnInterval &&
      updatedWords.length < currentParams.maxActive
    ) {
      timeSinceLastSpawnRef.current = 0;
      wordsRef.current = updatedWords;
      spawnWord();
    } else {
      wordsRef.current = updatedWords;
      setWords(updatedWords);
    }

    requestRef.current = requestAnimationFrame(updateGame);
  };

  // Keyboard inputs handler
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (gameStatusRef.current !== 'playing') return;

    const key = e.key;

    // Prevent default scrolling keys
    if (key === ' ' || key === 'Backspace') {
      e.preventDefault();
    }

    // Escape - clear focus & reset word typing progress
    if (key === 'Escape') {
      if (focusedWordIdRef.current) {
        const updated = wordsRef.current.map(w => {
          if (w.id === focusedWordIdRef.current) {
            return { ...w, typedLength: 0, hasError: false };
          }
          return w;
        });
        wordsRef.current = updated;
        setWords(updated);
        focusedWordIdRef.current = null;
        setFocusedWordId(null);
      }
      return;
    }

    // Backspace - back one character on focused word or clear error
    if (key === 'Backspace') {
      if (focusedWordIdRef.current) {
        const updated = wordsRef.current.map(w => {
          if (w.id === focusedWordIdRef.current) {
            if (w.hasError) {
              return { ...w, hasError: false };
            }
            return { ...w, typedLength: Math.max(0, w.typedLength - 1) };
          }
          return w;
        });
        wordsRef.current = updated;
        setWords(updated);
      }
      return;
    }

    // Only process letters/characters
    if (key.length !== 1) return;

    const currentFocusedId = focusedWordIdRef.current;

    if (!currentFocusedId) {
      // Find all falling words whose first letter matches the key
      const matches = wordsRef.current.filter(
        w => w.text[0].toLowerCase() === key.toLowerCase()
      );

      if (matches.length > 0) {
        // Target matching word closest to bottom (highest y)
        matches.sort((a, b) => b.y - a.y);
        const target = matches[0];

        focusedWordIdRef.current = target.id;
        setFocusedWordId(target.id);

        const updated = wordsRef.current.map(w => {
          if (w.id === target.id) {
            return { ...w, typedLength: 1, hasError: false };
          }
          return w;
        });
        wordsRef.current = updated;
        setWords(updated);

        totalCorrectCharsRef.current += 1;
        setTotalCorrectChars(totalCorrectCharsRef.current);
      } else {
        // Global visual indicator for incorrect first-key press
        totalErrorsRef.current += 1;
        setTotalErrors(totalErrorsRef.current);
        setIsGlobalError(true);
        setTimeout(() => setIsGlobalError(false), 150);
      }
    } else {
      // We are focused on a word. Match next character.
      const focusedWord = wordsRef.current.find(w => w.id === currentFocusedId);
      if (!focusedWord) return;

      const nextExpectedChar = focusedWord.text[focusedWord.typedLength].toLowerCase();
      if (key.toLowerCase() === nextExpectedChar) {
        const newLen = focusedWord.typedLength + 1;
        totalCorrectCharsRef.current += 1;
        setTotalCorrectChars(totalCorrectCharsRef.current);

        if (newLen === focusedWord.text.length) {
          // Word typed fully!
          // Word-length dependent scoring
          const basePoints = focusedWord.text.length * 10;
          const currentCombo = comboRef.current;
          const multiplier = Math.max(1, Math.min(10, currentCombo));
          const pointsEarned = basePoints * multiplier;

          // Spawn popup
          const popupId = Math.random().toString();
          setPopups(prev => [
            ...prev,
            {
              id: popupId,
              text: `+${pointsEarned} pts (Combo x${currentCombo + 1})`,
              x: focusedWord.x,
              y: focusedWord.y
            }
          ]);
          setTimeout(() => {
            setPopups(prev => prev.filter(p => p.id !== popupId));
          }, 1000);

          // Update Score, Combo, Stats
          scoreRef.current += pointsEarned;
          setScore(scoreRef.current);

          comboRef.current += 1;
          setCombo(comboRef.current);
          if (comboRef.current > maxComboRef.current) {
            maxComboRef.current = comboRef.current;
            setMaxCombo(comboRef.current);
          }

          wordsTypedCountRef.current += 1;
          setWordsTypedCount(wordsTypedCountRef.current);

          // Remove word from screen
          const updated = wordsRef.current.filter(w => w.id !== currentFocusedId);
          wordsRef.current = updated;
          setWords(updated);

          // Reset focus
          focusedWordIdRef.current = null;
          setFocusedWordId(null);
        } else {
          // Progress word typing
          const updated = wordsRef.current.map(w => {
            if (w.id === currentFocusedId) {
              return { ...w, typedLength: newLen, hasError: false };
            }
            return w;
          });
          wordsRef.current = updated;
          setWords(updated);
        }
      } else {
        // Typed incorrect character for focused word
        totalErrorsRef.current += 1;
        setTotalErrors(totalErrorsRef.current);

        const updated = wordsRef.current.map(w => {
          if (w.id === currentFocusedId) {
            return { ...w, hasError: true };
          }
          return w;
        });
        wordsRef.current = updated;
        setWords(updated);
      }
    }
  }, []);

  // Keyboard listener binding
  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleKeyDown]);

  // Start game triggers
  const startGame = () => {
    setScore(0);
    setCombo(0);
    setMaxCombo(0);
    setLives(3);
    setWordsTypedCount(0);
    setTotalCorrectChars(0);
    setTotalErrors(0);
    setWords([]);
    setFocusedWordId(null);
    setIsDamaged(false);
    setIsGlobalError(false);

    // Sync refs
    scoreRef.current = 0;
    comboRef.current = 0;
    maxComboRef.current = 0;
    livesRef.current = 3;
    wordsTypedCountRef.current = 0;
    totalCorrectCharsRef.current = 0;
    totalErrorsRef.current = 0;
    wordsRef.current = [];
    focusedWordIdRef.current = null;

    setGameStatus('playing');
    gameStatusRef.current = 'playing';

    // Spawn first word and initiate loops
    startTimeRef.current = Date.now();
    lastTimeRef.current = 0;
    timeSinceLastSpawnRef.current = 0;
    
    // Delay first spawn slightly
    spawnWord();
    
    requestRef.current = requestAnimationFrame(updateGame);
  };

  // Clean loops on unmount
  useEffect(() => {
    return () => {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };
  }, []);

  if (authLoading) {
    return (
      <div className="min-h-screen bg-ink flex flex-col items-center justify-center text-amber select-none">
        <div className="w-10 h-10 rounded border-2 border-[#2D3345] border-t-amber animate-spin mb-4" />
        <span className="text-sm font-mono tracking-wider animate-pulse">Menghubungkan Sistem Darurat...</span>
      </div>
    );
  }

  // Calculate WPM and Accuracy for summary modal
  const finalDurationMs = gameStatus === 'gameover' ? (Date.now() - startTimeRef.current) : 0;
  const gameWpm = calculateWpm(totalCorrectChars, finalDurationMs);
  const gameAccuracy = calculateAccuracy(totalCorrectChars, totalCorrectChars + totalErrors);

  return (
    <div className={`min-h-screen bg-ink flex flex-col justify-between relative overflow-hidden transition-all duration-300 ${isDamaged ? 'screen-shake' : ''}`}>
      
      {/* Background terminal overlay lines */}
      <div className="absolute inset-0 bg-[linear-gradient(to_bottom,rgba(255,255,255,0.01)_1px,transparent_1px)] bg-[size:100%_4px] pointer-events-none -z-10" />

      {/* Navbar */}
      <nav className="glass-panel w-full py-4 px-6 border-b border-[#2D3345] sticky top-0 z-50 flex justify-between items-center select-none">
        <div className="flex items-center gap-4 sm:gap-6">
          <Link href="/" className="flex items-center gap-2 group">
            <span className="text-2xl font-black tracking-tight text-amber group-hover:text-amber/90 transition-colors">
              GhostType
            </span>
            <span className="text-[10px] bg-error-custom/15 text-error-custom px-2 py-0.5 rounded-sm font-bold border border-error-custom/25">
              EMERGENCY PROT.
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

      {/* Main Game Interface Container */}
      <main className="flex-1 py-6 px-4 sm:px-6 lg:px-8 flex flex-col justify-center items-center">
        <div className="w-full max-w-4xl space-y-6">

          {/* Emergency Notice Header */}
          <div className="flex justify-between items-center bg-[#1C1F2B] px-4 py-3 rounded border border-error-custom/30 select-none">
            <div className="flex items-center gap-2 text-xs font-bold text-error-custom tracking-wider uppercase animate-pulse">
              <span className="inline-block w-2.5 h-2.5 rounded-full bg-error-custom" />
              Status: Survival Mode Aktif (Tier {currentDiff.tier})
            </div>
            <div className="text-xs text-slate-custom font-mono">
              [ ESC ] Unfocus kata &bull; [ BACKSPACE ] Koreksi
            </div>
          </div>

          {/* Arcade Scoreboard Panel */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 select-none">
            {/* Score */}
            <div className="glass-card p-4 rounded border border-[#2D3345] flex flex-col justify-between">
              <div className="text-slate-custom font-bold text-xs uppercase tracking-wider">SKOR DIGITAL</div>
              <div className="text-4xl font-mono font-black text-amber my-1 tabular-nums drop-shadow-[0_0_10px_rgba(232,163,61,0.2)]">
                {score.toLocaleString()}
              </div>
              <div className="text-[10px] text-slate-custom">Tier {currentDiff.tier} &bull; Mult: x{Math.max(1, Math.min(10, combo))}</div>
            </div>

            {/* Combo */}
            <div className="glass-card p-4 rounded border border-[#2D3345] flex flex-col justify-between">
              <div className="text-slate-custom font-bold text-xs uppercase tracking-wider">COMBO MULTIPLIER</div>
              <div className="text-4xl font-mono font-black text-ghost-teal my-1 tabular-nums drop-shadow-[0_0_10px_rgba(94,234,212,0.2)]">
                x{combo}
              </div>
              <div className="text-[10px] text-slate-custom">Maks Combo: {maxCombo}</div>
            </div>

            {/* Words Typed */}
            <div className="glass-card p-4 rounded border border-[#2D3345] flex flex-col justify-between">
              <div className="text-slate-custom font-bold text-xs uppercase tracking-wider">KATA DISELESAIKAN</div>
              <div className="text-4xl font-mono font-black text-paper my-1 tabular-nums">
                {wordsTypedCount}
              </div>
              <div className="text-[10px] text-slate-custom">Kata yang berhasil diketik</div>
            </div>

            {/* Lives */}
            <div className="glass-card p-4 rounded border border-[#2D3345] flex flex-col justify-between">
              <div className="text-slate-custom font-bold text-xs uppercase tracking-wider">NYAWA TERSISA</div>
              <div className="flex gap-2 items-center my-2.5">
                {Array.from({ length: 3 }).map((_, idx) => (
                  <div key={idx}>
                    {idx < lives ? (
                      <svg className="w-8 h-8 text-error-custom fill-error-custom filter drop-shadow-[0_0_8px_rgba(229,72,77,0.6)] animate-pulse" viewBox="0 0 24 24">
                        <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
                      </svg>
                    ) : (
                      <svg className="w-8 h-8 text-[#2D3345] fill-none stroke-current" strokeWidth="2" viewBox="0 0 24 24">
                        <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
                      </svg>
                    )}
                  </div>
                ))}
              </div>
              <div className="text-[10px] text-error-custom font-semibold">Tembak jatuh sebelum menyentuh garis!</div>
            </div>
          </div>

          {/* Game Window Stage */}
          <div 
            className={`relative w-full h-[550px] bg-[#0E1017] rounded-lg border-2 overflow-hidden shadow-[inset_0_4px_30px_rgba(0,0,0,0.95)] transition-colors duration-200 ${
              isGlobalError ? 'border-error-custom' : focusedWordId ? 'border-amber/40' : 'border-[#2D3345]'
            }`}
          >
            {/* CRT overlay effect */}
            <div className="crt-overlay" />

            {/* Background Grid Lines (departure board theme) */}
            <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(139,147,167,0.02)_1px,transparent_1px),linear-gradient(to_bottom,rgba(139,147,167,0.02)_1px,transparent_1px)] bg-[size:40px_40px] pointer-events-none" />

            {/* Floating popups */}
            {popups.map(popup => (
              <div
                key={popup.id}
                className="absolute text-sm font-black text-ghost-teal font-mono pointer-events-none animate-arcade-popup z-30 drop-shadow-[0_0_8px_rgba(94,234,212,0.8)]"
                style={{
                  left: `${popup.x}%`,
                  top: `${popup.y}%`,
                  transform: 'translate(-50%, -100%)',
                }}
              >
                {popup.text}
              </div>
            ))}

            {/* Game Ready Gate Screen */}
            {gameStatus === 'ready' && (
              <div className="absolute inset-0 bg-[#0E1017]/95 backdrop-blur-sm z-30 flex flex-col justify-center items-center text-center p-8 select-none">
                <div className="w-16 h-16 rounded-full border-2 border-error-custom flex items-center justify-center text-error-custom animate-pulse text-2xl font-bold mb-4">
                  ⚠️
                </div>
                <h2 className="text-2xl font-black tracking-tight text-paper uppercase">
                  Pintu Darurat: Survival Mode
                </h2>
                <p className="text-slate-custom max-w-md text-sm mt-2 mb-6">
                  Kata-kata akan jatuh dari atas. Ketik kata tersebut sebelum menyentuh batas bawah. Kesalahan ketik tidak mengurangi nyawa, tapi kata yang menyentuh batas bawah akan memotong 1 nyawa.
                </p>

                {/* Configurations */}
                <div className="w-full max-w-xs space-y-4 mb-8">
                  <div className="space-y-1.5 text-left">
                    <label className="block text-xs font-bold text-slate-custom uppercase tracking-wider">
                      Bahasa Kata (Language)
                    </label>
                    <div className="flex bg-[#11131A] p-1 rounded border border-[#2D3345]">
                      <button
                        onClick={() => setLanguage('id')}
                        className={`flex-1 py-2 text-xs font-bold rounded transition-all cursor-pointer ${
                          language === 'id'
                            ? 'bg-amber/10 text-amber border border-amber/30'
                            : 'text-slate-custom hover:text-paper'
                        }`}
                      >
                        🇮🇩 Indonesia
                      </button>
                      <button
                        onClick={() => setLanguage('en')}
                        className={`flex-1 py-2 text-xs font-bold rounded transition-all cursor-pointer ${
                          language === 'en'
                            ? 'bg-amber/10 text-amber border border-amber/30'
                            : 'text-slate-custom hover:text-paper'
                        }`}
                      >
                        🇬🇧 English
                      </button>
                    </div>
                  </div>
                </div>

                <button
                  onClick={startGame}
                  className="px-12 py-4 bg-error-custom hover:bg-error-custom/90 text-paper font-black rounded-sm shadow-xl shadow-error-custom/10 transition-all hover:scale-105 active:scale-95 text-base uppercase tracking-wider flex items-center gap-3 cursor-pointer"
                >
                  <svg className="w-5 h-5 fill-current" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd"/>
                  </svg>
                  Mulai Protokol Survival
                </button>
              </div>
            )}

            {/* Game Over Screen / Summary Modal */}
            {gameStatus === 'gameover' && (
              <div className="absolute inset-0 bg-[#0E1017]/95 backdrop-blur-sm z-30 flex flex-col justify-center items-center text-center p-8 select-none">
                <div className="w-16 h-16 rounded-full border-2 border-[#2D3345] flex items-center justify-center text-amber text-2xl font-black mb-3">
                  🏁
                </div>
                <h2 className="text-3xl font-black tracking-tight text-error-custom uppercase">
                  GAME OVER
                </h2>
                <p className="text-slate-custom text-sm mt-1 mb-6">
                  Sistem shutdown. Nyawa Anda telah habis.
                </p>

                {/* Daily Challenge Result Banner */}
                {dailyResult && (
                  <div className={`p-4 rounded border text-sm font-sans mb-6 text-center max-w-md w-full ${
                    dailyResult.completed 
                      ? 'bg-ghost-teal/10 border-ghost-teal/30 text-ghost-teal font-bold' 
                      : 'bg-error-custom/10 border-error-custom/30 text-error-custom font-bold'
                  }`}>
                    <div className="uppercase tracking-wider mb-1">
                      {dailyResult.completed ? '🎉 Tantangan Harian Berhasil!' : '❌ Tantangan Harian Gagal'}
                    </div>
                    <div className="text-xs opacity-90 leading-relaxed font-medium">
                      Target Skor: {dailyResult.target}, Skor Anda: {dailyResult.achieved.toLocaleString()}.
                      {dailyResult.completed && dailyResult.streak > 0 && (
                        <div className="mt-1 font-bold text-amber">
                          Streak Anda: {dailyResult.streak} Hari!
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Score Summary Card */}
                <div className="w-full max-w-md bg-[#11131A] border border-[#2D3345] p-6 rounded-md space-y-4 mb-8">
                  <h3 className="text-xs font-bold text-slate-custom uppercase tracking-wider border-b border-[#2D3345] pb-2 text-left">
                    Laporan Hasil Terbang (Summary)
                  </h3>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="text-left">
                      <span className="block text-[10px] text-slate-custom font-bold uppercase">Skor Akhir</span>
                      <span className="text-2xl font-mono font-black text-amber tabular-nums">{score.toLocaleString()}</span>
                    </div>
                    <div className="text-left">
                      <span className="block text-[10px] text-slate-custom font-bold uppercase">Maks Combo</span>
                      <span className="text-2xl font-mono font-black text-ghost-teal tabular-nums">x{maxCombo}</span>
                    </div>
                    <div className="text-left">
                      <span className="block text-[10px] text-slate-custom font-bold uppercase">Kata Diketik</span>
                      <span className="text-xl font-mono font-bold text-paper tabular-nums">{wordsTypedCount} kata</span>
                    </div>
                    <div className="text-left">
                      <span className="block text-[10px] text-slate-custom font-bold uppercase">Kecepatan Rata-Rata</span>
                      <span className="text-xl font-mono font-bold text-paper tabular-nums">{gameWpm} WPM</span>
                    </div>
                    <div className="text-left col-span-2 border-t border-[#2D3345]/50 pt-2">
                      <div className="flex justify-between items-center">
                        <div>
                          <span className="block text-[10px] text-slate-custom font-bold uppercase">Akurasi Ketikan</span>
                          <span className="text-base font-mono font-bold text-paper tabular-nums">{gameAccuracy}%</span>
                        </div>
                        <div>
                          <span className="block text-[10px] text-slate-custom font-bold uppercase">Durasi Main</span>
                          <span className="text-base font-mono font-bold text-paper tabular-nums">{(finalDurationMs / 1000).toFixed(1)}s</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {saving ? (
                    <div className="text-xs text-amber font-mono animate-pulse pt-2 text-center">
                      Saving score to Supabase...
                    </div>
                  ) : (
                    <div className="text-xs text-ghost-teal font-mono pt-2 text-center">
                      Score saved successfully.
                    </div>
                  )}
                </div>

                <div className="flex gap-4">
                  <button
                    onClick={startGame}
                    className="px-8 py-3.5 bg-amber hover:bg-amber/90 text-ink font-black rounded-sm transition-all hover:scale-105 active:scale-95 text-xs uppercase tracking-wider cursor-pointer"
                  >
                    Ulangi Survival
                  </button>
                  <Link
                    href="/"
                    className="px-8 py-3.5 bg-[#1C1F2B] hover:bg-[#272B38] text-paper rounded border border-[#2D3345] text-xs font-black uppercase tracking-wider transition-all"
                  >
                    Kembali Ke Dashboard
                  </Link>
                </div>
              </div>
            )}

            {/* Falling Words Rendering Container */}
            {gameStatus === 'playing' && (
              <div className="absolute inset-0 z-20 pointer-events-none">
                {words.map(word => {
                  const isFocused = focusedWordId === word.id;
                  
                  return (
                    <div
                      key={word.id}
                      className={`absolute flex gap-0.5 p-1 rounded transition-shadow duration-200 z-20 pointer-events-auto select-none ${
                        isFocused
                          ? 'shadow-[0_0_25px_rgba(232,163,61,0.7)] border-2 border-amber bg-[#14171F]/95 scale-105 z-30'
                          : 'border border-[#2D3345]/50 bg-[#11131A]/90'
                      } ${
                        word.y > 70 ? 'flicker-warning' : ''
                      } ${
                        isFocused && word.hasError ? 'animate-shake border-error-custom shadow-[0_0_20px_rgba(229,72,77,0.5)]' : ''
                      }`}
                      style={{
                        left: `${word.x}%`,
                        top: `${word.y}%`,
                        transform: 'translate(-50%, -50%)',
                      }}
                    >
                      {word.text.split('').map((char, index) => {
                        let isCorrect = false;
                        let isError = false;

                        if (isFocused) {
                          if (index < word.typedLength) {
                            isCorrect = true;
                          } else if (index === word.typedLength && word.hasError) {
                            isError = true;
                          }
                        }

                        return (
                          <div
                            key={index}
                            className={`
                              relative flex flex-col items-center justify-center 
                              w-5.5 h-8.5 rounded-sm
                              font-mono text-xs sm:text-sm font-bold
                              transition-all duration-150
                              ${
                                isCorrect 
                                  ? 'bg-[#1C1F2B] text-amber border border-amber/40 animate-flap-flip shadow-[0_2px_4px_rgba(0,0,0,0.4)]' 
                                  : isError 
                                  ? 'bg-error-custom/10 text-error-custom border border-error-custom animate-shake shadow-[0_0_8px_rgba(229,72,77,0.3)]' 
                                  : 'bg-[#151821] text-slate-custom border border-slate-custom/10'
                              }
                            `}
                          >
                            {/* Split line mimicking flap */}
                            <div className="absolute inset-x-0 top-1/2 h-[1px] bg-black/40 z-10 pointer-events-none" />
                            <span className="relative z-0">{char}</span>
                          </div>
                        );
                      })}
                    </div>
                  );
                })}
              </div>
            )}

            {/* Bottom Danger Boundary Line */}
            <div className="absolute bottom-[5%] inset-x-0 border-t-2 border-dashed border-error-custom/40 z-10 flex justify-center items-center">
              <span className="bg-[#0E1017] px-4 py-0.5 text-[9px] font-bold text-error-custom tracking-widest uppercase">
                Garis Batas Jatuh / Danger Zone
              </span>
            </div>

          </div>

        </div>
      </main>

      {/* Footer */}
      <footer className="glass-panel w-full py-4 text-center border-t border-[#2D3345] text-xs text-slate-custom select-none font-sans">
        &copy; 2026 GhostType Typing Game. Mode Survival Darurat. All rights reserved.
      </footer>

      {/* CSS Styles supporting CRT, Shakes, and Reduced Motion */}
      <style jsx global>{`
        /* CRT overlay lines */
        .crt-overlay {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          background: linear-gradient(
            rgba(18, 16, 16, 0) 50%, 
            rgba(0, 0, 0, 0.25) 50-80%
          ), linear-gradient(
            90deg,
            rgba(255, 0, 0, 0.04),
            rgba(0, 255, 0, 0.01),
            rgba(0, 0, 255, 0.04)
          );
          background-size: 100% 4px, 6px 100%;
          pointer-events: none;
          z-index: 10;
        }

        /* Flicker Warning animation for words approaching line */
        @keyframes intense-flicker {
          0%, 100% {
            opacity: 1;
            border-color: rgba(229, 72, 77, 0.9);
            box-shadow: 0 0 10px rgba(229, 72, 77, 0.4);
          }
          50% {
            opacity: 0.4;
            border-color: rgba(229, 72, 77, 0.2);
            box-shadow: none;
          }
        }
        .flicker-warning {
          animation: intense-flicker 0.25s infinite;
        }

        /* Arcade floating popup animations */
        @keyframes arcade-popup-anim {
          0% { transform: translate(-50%, 0) scale(0.6); opacity: 0; }
          15% { transform: translate(-50%, -20px) scale(1.15); opacity: 1; }
          100% { transform: translate(-50%, -70px) scale(1); opacity: 0; }
        }
        .animate-arcade-popup {
          animation: arcade-popup-anim 1s cubic-bezier(0.18, 0.89, 0.32, 1.28) forwards;
        }

        /* Whole Screen Shake animation when taking damage */
        @keyframes screen-shake-anim {
          0%, 100% { transform: translate(0, 0); }
          10% { transform: translate(-6px, -4px); }
          30% { transform: translate(6px, 4px); }
          50% { transform: translate(-6px, 5px); }
          70% { transform: translate(6px, -5px); }
          90% { transform: translate(-3px, 2px); }
        }
        .screen-shake {
          animation: screen-shake-anim 0.35s ease-in-out;
        }

        /* Reduced motion media query respecting user preferences */
        @media (prefers-reduced-motion: reduce) {
          .crt-overlay {
            background: none !important;
          }
          .flicker-warning {
            animation: none !important;
            opacity: 0.95 !important;
            border-color: rgba(229, 72, 77, 0.8) !important;
            box-shadow: 0 0 4px rgba(229, 72, 77, 0.5) !important;
          }
          .screen-shake {
            animation: none !important;
          }
          .animate-arcade-popup {
            animation: none !important;
            opacity: 0 !important;
          }
          .animate-flap-flip {
            animation: none !important;
          }
          .animate-shake {
            animation: none !important;
          }
        }
      `}</style>
    </div>
  );
}

export default function SurvivalPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-ink flex flex-col items-center justify-center text-amber select-none">
        <div className="w-10 h-10 rounded border-2 border-[#2D3345] border-t-amber animate-spin mb-4" />
        <span className="text-sm font-mono tracking-wider animate-pulse">Memuat konfigurasi kelangsungan hidup...</span>
      </div>
    }>
      <SurvivalGame />
    </Suspense>
  );
}

