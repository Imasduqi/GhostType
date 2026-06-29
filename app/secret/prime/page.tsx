"use client";

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabase/client';
import { useTypingEngine } from '@/components/typing-engine/useTypingEngine';
import { saveSecretBossClear } from '@/lib/supabase/queries';
import { checkAndUnlockAchievements } from '@/lib/achievements/checkAchievements';
import { wordPoolEN } from '@/lib/text-generator/wordPoolEN';

// Generate continuous english text from the word pool mimicking MonkeyType
function generateMonkeytypeText(): string {
  const allWords = [
    ...wordPoolEN.subjek,
    ...wordPoolEN.predikat,
    ...wordPoolEN.objek,
    ...wordPoolEN.keteranganTempat,
    ...wordPoolEN.keteranganWaktu,
    ...wordPoolEN.kataSifat
  ];
  
  const words: string[] = [];
  allWords.forEach(w => {
    const parts = w.toLowerCase().split(/\s+/);
    parts.forEach(p => {
      const clean = p.replace(/[^a-z]/g, '');
      if (clean && !['the', 'a', 'an', 'on', 'in', 'at', 'under', 'behind', 'by', 'of', 'to', 'for'].includes(clean)) {
        words.push(clean);
      }
    });
  });

  const selected: string[] = [];
  for (let i = 0; i < 500; i++) {
    const idx = Math.floor(Math.random() * words.length);
    selected.push(words[idx]);
  }
  return selected.join(' ');
}

export default function MonkeyTypePrimePage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Game States: 'intro' | 'playing' | 'defeated' | 'victory'
  const [gameState, setGameState] = useState<'intro' | 'playing' | 'defeated' | 'victory'>('intro');
  const [targetText, setTargetText] = useState('');
  
  // Timers and measurements
  const [timeLeft, setTimeLeft] = useState(60); // 60 seconds
  const [elapsedTimeMs, setElapsedTimeMs] = useState(0);
  const [smallestGap, setSmallestGap] = useState<number>(Infinity);
  
  // Dialogue typewriter state
  const [dialogueIndex, setDialogueIndex] = useState(0);
  const [typedDialogue, setTypedDialogue] = useState('');
  
  const introDialogues = [
    "Kecepatan adalah satu-satunya bahasa yang aku mengerti.",
    "Buktikan dirimu."
  ];

  // Game ticks
  const timerIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const startTimeRef = useRef<number | null>(null);

  // Authenticate user
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session?.user) {
        router.push('/login?redirect=/secret/prime');
      } else {
        setUser(session.user);
        setLoading(false);
      }
    });
  }, [router]);

  // Generate target text on start
  useEffect(() => {
    setTargetText(generateMonkeytypeText());
  }, []);

  // Typewriter effect for intro dialogues
  useEffect(() => {
    if (gameState !== 'intro' || dialogueIndex >= introDialogues.length) return;
    
    const fullText = introDialogues[dialogueIndex];
    let currentLen = 0;
    setTypedDialogue('');

    const interval = setInterval(() => {
      currentLen++;
      setTypedDialogue(fullText.substring(0, currentLen));
      if (currentLen >= fullText.length) {
        clearInterval(interval);
      }
    }, 45);

    return () => clearInterval(interval);
  }, [gameState, dialogueIndex]);

  // Initialize typing engine
  const {
    currentIndex,
    typedChars,
    wpm,
    accuracy,
    resetEngine
  } = useTypingEngine(targetText, {
    isActive: gameState === 'playing'
  });

  const handleStart = () => {
    resetEngine();
    setElapsedTimeMs(0);
    setTimeLeft(60);
    setSmallestGap(Infinity);
    startTimeRef.current = Date.now();
    setGameState('playing');
  };

  // Game Loop updates
  useEffect(() => {
    if (gameState !== 'playing' || !startTimeRef.current) return;

    timerIntervalRef.current = setInterval(() => {
      const now = Date.now();
      const elapsed = now - startTimeRef.current!;
      setElapsedTimeMs(elapsed);

      const secondsRemaining = Math.max(0, 60 - Math.floor(elapsed / 1000));
      setTimeLeft(secondsRemaining);

      // 130 WPM = 130 * 5 characters / 60 seconds = 10.833 CPS
      const primeIndex = (elapsed / 1000) * (130 * 5 / 60);
      const playerIndex = currentIndex;
      const gap = primeIndex - playerIndex;
      const distance = playerIndex - primeIndex;
      
      if (distance < smallestGap) {
        setSmallestGap(distance);
      }

      // Check failure condition: prime cursor passes by more than 15 characters
      if (gap > 15) {
        clearInterval(timerIntervalRef.current!);
        setGameState('defeated');
      }

      // Check victory condition
      if (secondsRemaining <= 0) {
        clearInterval(timerIntervalRef.current!);
        handleVictory();
      }
    }, 100);

    return () => {
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    };
  }, [gameState, currentIndex, smallestGap]);

  const handleVictory = async () => {
    setGameState('victory');
    if (!user) return;
    
    // Save clear record
    await saveSecretBossClear(user.id, 'monkeytype_prime');
    
    // Check and unlock achievement
    await checkAndUnlockAchievements(user.id, {
      mode: 'secret_boss',
      bossId: 'monkeytype_prime',
      playerWon: true
    });
  };

  // Render character blocks
  const renderTextDisplay = () => {
    // Only show around the current index to keep it clean and scrolling
    const charsToShow = 350;
    const startIndex = Math.max(0, currentIndex - 50);
    const endIndex = Math.min(targetText.length, startIndex + charsToShow);

    // Calculate Prime Cursor position relative to startIndex
    const primeCharIndex = (elapsedTimeMs / 1000) * (130 * 5 / 60);

    return (
      <div className="flex flex-wrap gap-x-1 gap-y-2 select-none">
        {targetText.substring(startIndex, endIndex).split('').map((char, localIdx) => {
          const globalIdx = startIndex + localIdx;
          let colorClass = 'text-slate-400';
          let borderStyle = '';

          // Player typed colors
          if (globalIdx < currentIndex) {
            const isCorrect = typedChars[globalIdx]?.correct;
            colorClass = isCorrect ? 'text-slate-900 font-bold' : 'text-red-500 bg-red-100 font-bold';
          }

          // Player caret indicator
          const isPlayerCursor = globalIdx === currentIndex;
          // Prime cursor indicator
          const isPrimeCursor = Math.round(primeCharIndex) === globalIdx;

          return (
            <span
              key={globalIdx}
              className={`relative font-mono text-lg md:text-xl transition-all ${colorClass} ${
                isPlayerCursor ? 'border-b-2 border-amber-500 bg-amber-50 animate-pulse' : ''
              }`}
            >
              {char}
              {isPrimeCursor && (
                <span className="absolute -top-3 left-0 text-[10px] text-red-600 font-black animate-bounce font-sans">
                  ▼
                </span>
              )}
            </span>
          );
        })}
      </div>
    );
  };

  if (loading) {
    return (
      <main className="min-h-screen bg-[#F7F7F7] flex flex-col justify-center items-center">
        <div className="w-8 h-8 rounded-full border-4 border-slate-200 border-t-amber-500 animate-spin" />
      </main>
    );
  }

  return (
    <div className="min-h-screen bg-[#F7F7F7] text-[#1E1E24] flex flex-col justify-between items-center font-sans p-6">
      
      {/* Header */}
      <header className="w-full max-w-4xl flex justify-between items-center border-b border-slate-200 pb-4 select-none">
        <div>
          <span className="text-xs uppercase tracking-widest text-slate-400 font-bold">Classified File #001</span>
          <h1 className="text-xl font-black tracking-tight text-slate-900 font-mono">MONKEYTYPE PRIME</h1>
        </div>
        <Link
          href={`/profile`}
          className="px-4 py-2 hover:bg-slate-100 text-slate-500 hover:text-slate-900 rounded border border-slate-200 text-xs font-bold font-mono transition-all"
        >
          &lt; ABORT MISSION
        </Link>
      </header>

      {/* Main Panel */}
      <main className="flex-1 w-full max-w-3xl flex flex-col justify-center items-center py-12">
        
        {/* Intro State */}
        {gameState === 'intro' && (
          <div className="w-full max-w-xl bg-white border border-slate-200 p-8 rounded shadow-sm flex flex-col items-center justify-between text-center min-h-[300px]">
            <div className="my-auto space-y-4">
              <span className="text-4xl text-slate-300">⚡</span>
              <div className="min-h-[60px] flex items-center justify-center">
                <p className="font-mono text-sm font-bold text-slate-700 leading-relaxed italic max-w-md">
                  &quot;{typedDialogue}&quot;
                </p>
              </div>
            </div>

            {typedDialogue === introDialogues[dialogueIndex] && (
              <div className="w-full flex flex-col items-center gap-4 mt-6">
                {dialogueIndex < introDialogues.length - 1 ? (
                  <button
                    onClick={() => setDialogueIndex(prev => prev + 1)}
                    className="px-6 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded text-xs font-bold uppercase font-mono tracking-widest transition-all"
                  >
                    Lanjut &gt;
                  </button>
                ) : (
                  <button
                    onClick={handleStart}
                    className="px-8 py-3 bg-amber-500 hover:bg-amber-400 text-slate-900 font-bold rounded text-sm uppercase font-mono tracking-widest transition-all shadow-md shadow-amber-500/10 active:scale-95 cursor-pointer"
                  >
                    MULAI TANTANGAN
                  </button>
                )}
              </div>
            )}
          </div>
        )}

        {/* Defeated State */}
        {gameState === 'defeated' && (
          <div className="w-full max-w-xl bg-white border border-red-200 p-8 rounded shadow-sm flex flex-col items-center justify-between text-center min-h-[300px]">
            <div className="my-auto space-y-4">
              <span className="text-4xl text-red-500">💀</span>
              <h2 className="text-xl font-bold uppercase tracking-widest text-red-600 font-mono">MISSION FAILED</h2>
              <p className="font-mono text-sm font-bold text-slate-700 leading-relaxed italic">
                &quot;Tidak cukup cepat.&quot;
              </p>
            </div>
            <Link
              href="/profile"
              className="px-8 py-3 bg-red-600 hover:bg-red-500 text-white font-mono font-bold rounded text-xs uppercase tracking-widest transition-all active:scale-95 mt-6"
            >
              Kembali Ke Profil
            </Link>
          </div>
        )}

        {/* Victory State */}
        {gameState === 'victory' && (
          <div className="w-full max-w-xl bg-white border border-amber-200 p-8 rounded shadow-sm flex flex-col items-center justify-between text-center min-h-[360px]">
            <div className="my-auto space-y-5">
              <span className="text-4xl text-amber-500 animate-pulse">🥇</span>
              <h2 className="text-xl font-bold uppercase tracking-widest text-amber-600 font-mono">MISSION ACCOMPLISHED</h2>
              <p className="font-mono text-sm font-bold text-slate-700 leading-relaxed italic">
                &quot;...Mengejutkan. Kau layak.&quot;
              </p>

              <div className="bg-slate-50 border border-slate-100 rounded p-4 grid grid-cols-2 gap-4 font-mono text-xs font-bold text-slate-600 mt-4 select-none">
                <div className="text-center border-r border-slate-200">
                  <span className="block text-slate-400 uppercase text-[9px] tracking-wider mb-1">Kecepatan Anda</span>
                  <span className="text-lg text-slate-900">{wpm} WPM</span>
                </div>
                <div className="text-center">
                  <span className="block text-slate-400 uppercase text-[9px] tracking-wider mb-1">Gap Terkecil</span>
                  <span className="text-lg text-slate-900">
                    {smallestGap === Infinity ? 0 : Math.max(0, Math.round(smallestGap))} karakter
                  </span>
                </div>
              </div>
            </div>
            
            <Link
              href="/profile"
              className="px-8 py-3 bg-amber-500 hover:bg-amber-400 text-slate-900 font-mono font-bold rounded text-xs uppercase tracking-widest transition-all active:scale-95 mt-6"
            >
              Kembali Ke Profil
            </Link>
          </div>
        )}

        {/* Playing State */}
        {gameState === 'playing' && (
          <div className="w-full space-y-8">
            
            {/* Live Stats Display */}
            <div className="grid grid-cols-3 gap-4 text-center select-none font-mono font-bold text-slate-600 text-xs">
              <div className="bg-white border border-slate-200 rounded py-2">
                <span className="block text-slate-400 text-[9px] uppercase tracking-wider mb-0.5">Timer</span>
                <span className="text-lg text-slate-800 tabular-nums">{timeLeft}s</span>
              </div>
              <div className="bg-white border border-slate-200 rounded py-2">
                <span className="block text-slate-400 text-[9px] uppercase tracking-wider mb-0.5">Kecepatan Anda</span>
                <span className="text-lg text-amber-600 tabular-nums">{wpm} WPM</span>
              </div>
              <div className="bg-white border border-slate-200 rounded py-2">
                <span className="block text-slate-400 text-[9px] uppercase tracking-wider mb-0.5">Akurasi</span>
                <span className="text-lg text-teal-600 tabular-nums">{accuracy}%</span>
              </div>
            </div>

            {/* Continuous Text Stream Display */}
            <div className="w-full bg-white border border-slate-200 rounded p-6 shadow-sm min-h-[160px] max-h-[220px] overflow-y-hidden flex items-center justify-center leading-relaxed">
              {renderTextDisplay()}
            </div>

            {/* Race Track double progress indicator */}
            <div className="bg-white border border-slate-200 rounded p-4 space-y-4 select-none">
              <span className="text-[9px] font-bold font-mono tracking-widest text-slate-400 uppercase block">RACE PROGRESS TRACK</span>
              
              {/* Progress Line */}
              <div className="relative h-2 bg-slate-100 rounded-full">
                {/* Prime Cursor marker */}
                <div
                  className="absolute top-1/2 -translate-y-1/2 -ml-2 w-4 h-4 rounded-full bg-red-500 border border-white flex items-center justify-center text-[8px] font-black text-white font-mono shadow transition-all duration-300"
                  style={{
                    left: `${Math.min(100, (((elapsedTimeMs / 1000) * (130 * 5 / 60)) / 650) * 100)}%`
                  }}
                  title="Prime"
                >
                  P
                </div>

                {/* Player marker */}
                <div
                  className="absolute top-1/2 -translate-y-1/2 -ml-2 w-4 h-4 rounded-full bg-amber-500 border border-white flex items-center justify-center text-[8px] font-black text-slate-900 font-mono shadow transition-all duration-150"
                  style={{
                    left: `${Math.min(100, (currentIndex / 650) * 100)}%`
                  }}
                  title="Anda"
                >
                  Y
                </div>
              </div>

              <div className="flex justify-between items-center text-[10px] text-slate-400 font-bold font-mono">
                <span>START</span>
                <span className="text-red-500 uppercase tracking-widest text-[9px] animate-pulse">Prime Target: 130 WPM</span>
                <span>FINISH</span>
              </div>
            </div>
          </div>
        )}

      </main>

      {/* Footer */}
      <footer className="w-full text-center text-[10px] text-slate-400 border-t border-slate-200 pt-4 font-mono select-none">
        WARNING: CLASSIFIED CONTENT. DO NOT DISSEMINATE.
      </footer>
    </div>
  );
}
