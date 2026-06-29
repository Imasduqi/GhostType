"use client";

import { useState, useEffect, useCallback, useRef, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabase/client';
import { saveBossRushScore } from '@/lib/supabase/queries';
import { wordPoolID } from '@/lib/text-generator/wordPoolID';
import { wordPoolEN } from '@/lib/text-generator/wordPoolEN';
import { ThemeToggle } from '@/components/ThemeToggle';
import { checkAndUnlockAchievements } from '@/lib/achievements/checkAchievements';
import { generateDailyChallenge } from '@/lib/daily/dailyChallengeGenerator';
import { saveDailyScore, updateUserDailyStreak } from '@/lib/supabase/dailyQueries';



// --- PALETTE CONFIG & SPRITES ---
const BOSS_TEMPLATES = [
  // 1. Slime
  [
    "................",
    "................",
    "......gggg......",
    "....gggggggg....",
    "...gggggggggg...",
    "..gggggggggggg..",
    "..gkkggggggkkg..",
    ".gkkkkggggkkkkg.",
    ".gkkwkggggkkwkg.",
    ".gggggggggggggg.",
    ".gggggggggggggg.",
    ".gggggkkkkggggg.",
    "..ggggkkkkgggg..",
    "...gggggggggg...",
    "....gggggggg....",
    "................"
  ],
  // 2. Ghost
  [
    "................",
    "......wwww......",
    "....wwwwwwww....",
    "...wwwwwwwwww...",
    "..wwwwwwwwwwww..",
    "..wrrwwwwwwrrw..",
    ".wrrrrwwwwrrrrw.",
    ".wrrkrwwwwrrkrw.",
    ".wwwwwwwwwwwwww.",
    ".wwwwwwwwwwwwww.",
    "..wwwwwwwwwwww..",
    "..wwwwwwkwwwww..",
    "...wwwwkkkwww...",
    "...w.ww.ww.w.w...",
    "..w..w..w..w..w.",
    "................"
  ],
  // 3. Goblin
  [
    "................",
    "...g........g...",
    "...gg......gg...",
    "..gggggggggggg..",
    "..gkkggggggkkg..",
    ".gkkkkggggkkkkg.",
    ".gkkwkggggkkwkg.",
    ".gggggggggggggg.",
    "..ggggkkkkgggg..",
    "..ggggkkkkgggg..",
    "...gggggggggg...",
    "...rrggggggrr...",
    "..rrrrggggrrrr..",
    "..rr..gggg..rr..",
    "................",
    "................"
  ],
  // 4. Skeleton
  [
    "......wwww......",
    "....wwwwwwww....",
    "...wwwwwwwwww...",
    "..wwwwwwwwwwww..",
    "..wkkwwwwwwkkw..",
    ".wkkkkwwwwkkkkw.",
    ".wkkkkwwwwkkkkw.",
    ".wwwwwwwwwwwwww.",
    "..wwwwkkkkwwww..",
    "...wwwkkkkwww...",
    "....wwkkkkww....",
    ".....wwkkww.....",
    "....ssssssss....",
    "...ssssssssss...",
    "..ssss..ss..ssss",
    "................"
  ],
  // 5. Demon
  [
    "....yy....yy....",
    "....yyy..yyy....",
    ".....pppppp.....",
    "....pppppppp....",
    "...pppppppppp...",
    "..ppokppppkopp..",
    "..ppokppppkopp..",
    "..pppppppppppp..",
    "...ppppoopppp...",
    "....ppoooopp....",
    ".....pppppp.....",
    "....pppppppp....",
    "...pppppppppp...",
    "..pp..pppp..pp..",
    ".pp....pp....pp.",
    "................"
  ],
  // 6. Dragon
  [
    "......rrrr......",
    ".....rrrrrr.....",
    "....rrrrrrrr....",
    "...rrrrrrrrrr...",
    "..rrryrrrrryrr..",
    "..rrryrrrrryrr..",
    "..rrrrrrrrrrrr..",
    "...rrryyyyrrr...",
    "....rryyyyrr....",
    "....rrrrrrrr....",
    "...rroorrrroor..",
    "..rrooorrrrooor.",
    "..rro.rrrr.orrr.",
    ".rr....rr....rr.",
    "................",
    "................"
  ],
  // 7. Golem
  [
    "................",
    "....ssssssss....",
    "...ssssssssss...",
    "..sscsssssscss..",
    "..sccssssssccs..",
    "..ssssssssssss..",
    "...ssssssssss...",
    "....ssssssss....",
    "...ssssssssss...",
    "..sssscsssscss..",
    "..sscccssscccss..",
    "..ssssssssssss..",
    "..ssss..ss..ssss",
    ".ssss....ss....ss",
    "................",
    "................"
  ],
  // 8. Robot
  [
    "......bbbb......",
    "....bbbbbbbb....",
    "...bbbbbbbbbb...",
    "..bbrrrrrrrrbb..",
    "..bbrrrrrrrrbb..",
    "..bbbbbbbbbbbb..",
    "...bbbbkkbbbb...",
    "....bbkkkkbb....",
    "...bbbbbbbbbb...",
    "..bbssbbbbssbb..",
    "..bbssbbbbssbb..",
    "..bbbbbbbbbbbb..",
    "...bb......bb...",
    "...bb......bb...",
    "..bbbb....bbbb..",
    "................"
  ]
];

const HERO_SPRITE = [
  "......yyyy......",
  "....yyyyyyyy....",
  "...yyssssssyy...",
  "..yysssssssskk..",
  "..yysskkssskkw..",
  "..yysssssssskk..",
  "...yyssssssyy...",
  "....rrrrrrrr....",
  "...rrrrrrrrrr...",
  "..rrrssssssrrr..",
  "..rrssssssssrr..",
  "..rrssssssssrr..",
  "...rrssssssrr...",
  "....ssssssss....",
  "....ss....ss....",
  "...sss....sss..."
];

const BOSS_NAMES = [
  "Emerald Slime",
  "Spooky Phantasm",
  "Goblin Vanguard",
  "Skeletal Guard",
  "Shadow Demon",
  "Crimson Drake",
  "Ancient Golem",
  "Iron Colossus"
];

// Split-up Indonesian words without spaces
const rawWordsID = [
  ...wordPoolID.subjek,
  ...wordPoolID.predikat,
  ...wordPoolID.objek,
  ...wordPoolID.kataSifat
].filter(w => !w.includes(' '));

const easyPoolID = rawWordsID.filter(w => w.length <= 5);
const mediumPoolID = rawWordsID.filter(w => w.length >= 6 && w.length <= 7);
const hardPoolID = rawWordsID.filter(w => w.length >= 8);

// Split-up English words without spaces
const rawWordsEN = [
  ...wordPoolEN.subjek,
  ...wordPoolEN.predikat,
  ...wordPoolEN.objek,
  ...wordPoolEN.kataSifat
].filter(w => !w.includes(' '));

const easyPoolEN = rawWordsEN.filter(w => w.length <= 5);
const mediumPoolEN = rawWordsEN.filter(w => w.length >= 6 && w.length <= 7);
const hardPoolEN = rawWordsEN.filter(w => w.length >= 8);

// Helper component to render pixel sprites using 2D canvas
const PixelSprite = ({
  sprite,
  scale = 1,
  isHurt = false,
  isAttacking = false,
  hueShift = 0,
  isPlayer = false,
}: {
  sprite: string[];
  scale?: number;
  isHurt?: boolean;
  isAttacking?: boolean;
  hueShift?: number;
  isPlayer?: boolean;
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const rows = sprite.length;
    const cols = sprite[0]?.length || 0;
    const pixelSize = Math.floor(canvas.width / cols);

    const palette: Record<string, string> = {
      'g': '#38B764',
      'k': '#1A1C2C',
      'w': '#F4F4F4',
      'r': '#D9425D',
      'b': '#3B5DC9',
      'y': '#F3A738',
      'p': '#7038B7',
      'o': '#FF6B35',
      's': '#7F8C8D',
      'c': '#3CD2D2',
      'm': '#B7389C',
    };

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const char = sprite[r][c];
        if (char !== '.' && palette[char]) {
          ctx.fillStyle = isHurt ? '#F4F4F4' : palette[char];
          ctx.fillRect(c * pixelSize, r * pixelSize, pixelSize, pixelSize);
        }
      }
    }
  }, [sprite, isHurt]);

  let transformClass = '';
  if (isPlayer) {
    if (isAttacking) {
      transformClass = 'translate-x-8 transition-transform duration-100 ease-out';
    } else {
      transformClass = 'animate-pixel-bob';
    }
  } else {
    if (isAttacking) {
      transformClass = '-translate-x-8 transition-transform duration-100 ease-out';
    } else {
      transformClass = 'animate-pixel-bob';
    }
  }

  const style: React.CSSProperties = {
    transform: `scale(${scale})`,
    filter: hueShift ? `hue-rotate(${hueShift}deg)` : undefined,
    imageRendering: 'pixelated',
  };

  return (
    <div className={`relative ${transformClass}`} style={style}>
      <canvas
        ref={canvasRef}
        width={128}
        height={128}
        className="w-32 h-32 md:w-40 md:h-40"
      />
    </div>
  );
};

export interface Modifier {
  id: string;
  name: string;
  type: 'booster' | 'kutukan';
  effect: string;
  scoreBonus: number; // e.g. 0.15 for 15%
}

export const MODIFIERS_POOL: Modifier[] = [
  { id: 'boss_hp_15', name: 'Boss HP ×1.5', type: 'booster', effect: 'HP semua boss di run ini dikali 1.5', scoreBonus: 0.15 },
  { id: 'boss_hp_2', name: 'Boss HP ×2', type: 'booster', effect: 'HP semua boss di run ini dikali 2', scoreBonus: 0.30 },
  { id: 'boss_dmg_15', name: 'Boss Damage ×1.5', type: 'booster', effect: 'Hasil formula damage(L) di Bagian A dikali 1.5 tambahan', scoreBonus: 0.15 },
  { id: 'boss_dmg_2', name: 'Boss Damage ×2', type: 'booster', effect: 'Hasil formula damage(L) di Bagian A dikali 2 tambahan', scoreBonus: 0.30 },
  { id: 'waktu_kilat', name: 'Waktu Kilat', type: 'booster', effect: 'Buffer waktu kata menyusut 30% lebih cepat dari kurva normal', scoreBonus: 0.20 },
  { id: 'kutukan_lemah', name: 'Kutukan Lemah', type: 'kutukan', effect: 'HP player awal menjadi 70 (bukan 100)', scoreBonus: 0.20 },
  { id: 'kutukan_rapuh', name: 'Kutukan Rapuh', type: 'kutukan', effect: 'Damage yang dihasilkan player ke boss dikali 0.8', scoreBonus: 0.15 },
  { id: 'kutukan_veteran', name: 'Kutukan Veteran', type: 'kutukan', effect: 'Kata yang muncul langsung menggunakan tingkat kesulitan Hard sejak level 1', scoreBonus: 0.20 },
];

const modifierTranslations: Record<string, { name: string; effect: string }> = {
  boss_hp_15: { name: 'Boss HP ×1.5', effect: 'All bosses HP multiplied by 1.5 this run' },
  boss_hp_2: { name: 'Boss HP ×2', effect: 'All bosses HP multiplied by 2 this run' },
  boss_dmg_15: { name: 'Boss Damage ×1.5', effect: 'Boss damage formula result multiplied by 1.5' },
  boss_dmg_2: { name: 'Boss Damage ×2', effect: 'Boss damage formula result multiplied by 2' },
  waktu_kilat: { name: 'Flash Time', effect: 'Word time limit shrinks 30% faster than normal' },
  kutukan_lemah: { name: 'Weak Curse', effect: 'Player starting HP reduced to 70 (instead of 100)' },
  kutukan_rapuh: { name: 'Fragile Curse', effect: 'Damage dealt by player to boss multiplied by 0.8' },
  kutukan_veteran: { name: 'Veteran Curse', effect: 'Words appear at Hard difficulty starting from level 1' },
};

const getModName = (mod: Modifier, lang: 'id' | 'en') => {
  if (lang === 'en') return modifierTranslations[mod.id]?.name || mod.name;
  return mod.name;
};

const getModEffect = (mod: Modifier, lang: 'id' | 'en') => {
  if (lang === 'en') return modifierTranslations[mod.id]?.effect || mod.effect;
  return mod.effect;
};

interface DamagePopup {
  id: string;
  amount: number;
  x: number;
  y: number;
  type: 'player' | 'boss';
}

function BossBattleGame() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [dailyResult, setDailyResult] = useState<any | null>(null);


  // Auth States
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [authLoading, setAuthLoading] = useState(true);

  // Game Progress States
  const [gameStatus, setGameStatus] = useState<'ready' | 'reveal' | 'countdown' | 'playing' | 'gameover'>('ready');
  const [level, setLevel] = useState(1);
  const [playerHp, setPlayerHp] = useState(100);
  const [bossHp, setBossHp] = useState(100);
  const [maxBossHp, setMaxBossHp] = useState(100);
  const [bossesDefeated, setBossesDefeated] = useState(0);
  const [totalDamageDealt, setTotalDamageDealt] = useState(0);
  const [saving, setSaving] = useState(false);

  // Modifiers and Countdown States
  const [activeModifiers, setActiveModifiers] = useState<Modifier[]>([]);
  const [countdown, setCountdown] = useState(3);

  // Slot Reveal States
  const [currentRevealStep, setCurrentRevealStep] = useState<number>(0);
  const [revealedModifiers, setRevealedModifiers] = useState<Modifier[]>([]);
  const [cyclingModifier, setCyclingModifier] = useState<Modifier | null>(null);
  const [isCyclingComplete, setIsCyclingComplete] = useState<boolean>(false);

  // Typing States
  const [currentWord, setCurrentWord] = useState('');
  const [typedText, setTypedText] = useState('');
  const [hasError, setHasError] = useState(false);
  const [wordStartTime, setWordStartTime] = useState<number | null>(null);
  const [currentWordTimeLimit, setCurrentWordTimeLimit] = useState(3000);
  const [timeLeft, setTimeLeft] = useState(3000);

  // Animation States
  const [isScreenShaking, setIsScreenShaking] = useState(false);
  const [isPlayerHurt, setIsPlayerHurt] = useState(false);
  const [isPlayerAttacking, setIsPlayerAttacking] = useState(false);
  const [isBossHurt, setIsBossHurt] = useState(false);
  const [isBossAttacking, setIsBossAttacking] = useState(false);
  const [damagePopups, setDamagePopups] = useState<DamagePopup[]>([]);
  const [inputShake, setInputShake] = useState(false);

  // Refs for tracking variables across frames/callbacks
  const startTimeRef = useRef<number>(0);
  const typedTextRef = useRef('');
  const hasErrorRef = useRef(false);
  const currentWordRef = useRef('');
  const gameStatusRef = useRef<'ready' | 'reveal' | 'countdown' | 'playing' | 'gameover'>('ready');
  const activeModifiersRef = useRef<Modifier[]>([]);
  const languageRef = useRef<'id' | 'en'>('id');

  // Configuration
  const [language, setLanguage] = useState<'id' | 'en'>('id');

  // Keep refs synchronized
  useEffect(() => { typedTextRef.current = typedText; }, [typedText]);
  useEffect(() => { hasErrorRef.current = hasError; }, [hasError]);
  useEffect(() => { currentWordRef.current = currentWord; }, [currentWord]);
  useEffect(() => { gameStatusRef.current = gameStatus; }, [gameStatus]);
  useEffect(() => { activeModifiersRef.current = activeModifiers; }, [activeModifiers]);
  useEffect(() => { languageRef.current = language; }, [language]);

  // Auth check
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session?.user) {
        const encodedRedirect = encodeURIComponent('/boss-battle');
        router.push(`/login?redirect=${encodedRedirect}`);
      } else {
        setCurrentUser(session.user);
        setAuthLoading(false);
      }
    });
  }, [router]);

  // Calculate Boss Max HP for a level
  const calculateBossMaxHp = useCallback((lvl: number, activeMods: string[]): number => {
    let baseHp = Math.round(100 * Math.pow(1.2, lvl - 1));
    let multiplier = 1;
    if (activeMods.includes('boss_hp_15')) multiplier *= 1.5;
    if (activeMods.includes('boss_hp_2')) multiplier *= 2;
    return Math.round(baseHp * multiplier);
  }, []);

  // Get word from pool based on level difficulty
  const getNextWord = useCallback((lvl: number, activeMods: string[], lang: 'id' | 'en'): string => {
    const poolRaw = lang === 'id' ? rawWordsID : rawWordsEN;
    const poolEasy = lang === 'id' ? easyPoolID : easyPoolEN;
    const poolMedium = lang === 'id' ? mediumPoolID : mediumPoolEN;
    const poolHard = lang === 'id' ? hardPoolID : hardPoolEN;

    let pool = poolEasy;
    if (activeMods.includes('kutukan_veteran')) {
      pool = poolHard;
    } else {
      if (lvl > 5 && lvl <= 10) pool = poolMedium;
      else if (lvl > 10) pool = poolHard;
    }

    if (pool.length === 0) pool = poolRaw; // fallback

    return pool[Math.floor(Math.random() * pool.length)];
  }, []);

  // Set up next word
  const setupNewWord = useCallback((lvl: number, activeMods: string[]) => {
    const word = getNextWord(lvl, activeMods, languageRef.current);
    let buffer = Math.round(300 + 1200 * Math.pow(0.9, lvl - 1));
    if (activeMods.includes('waktu_kilat')) {
      buffer = Math.round(buffer * 0.7);
    }
    const limit = (word.length * 400) + buffer;

    setCurrentWord(word);
    setTypedText('');
    setHasError(false);
    setCurrentWordTimeLimit(limit);
    setTimeLeft(limit);
    setWordStartTime(Date.now());
  }, [getNextWord]);

  // Start the actual gameplay after countdown
  const startGame = useCallback((mods: Modifier[]) => {
    startTimeRef.current = Date.now();
    setLevel(1);
    
    const activeModIds = mods.map(m => m.id);
    const startPlayerHp = activeModIds.includes('kutukan_lemah') ? 70 : 100;
    setPlayerHp(startPlayerHp);

    const initialBossHp = calculateBossMaxHp(1, activeModIds);
    setBossHp(initialBossHp);
    setMaxBossHp(initialBossHp);
    setBossesDefeated(0);
    setTotalDamageDealt(0);
    setGameStatus('playing');
    setDamagePopups([]);
    
    setupNewWord(1, activeModIds);
  }, [calculateBossMaxHp, setupNewWord]);

  // Initialize modifier picking and start the reveal sequence
  const startCountdown = () => {
    // Pick active modifiers
    const rand = Math.random();
    let numModifiers = 1;
    if (rand < 0.50) {
      numModifiers = 1;
    } else if (rand < 0.85) {
      numModifiers = 2;
    } else {
      numModifiers = 3;
    }

    const shuffled = [...MODIFIERS_POOL].sort(() => 0.5 - Math.random());
    const selected = shuffled.slice(0, numModifiers);

    // Reset reveal states
    setCurrentRevealStep(0);
    setRevealedModifiers([]);
    setCyclingModifier(null);
    setIsCyclingComplete(false);

    setActiveModifiers(selected);
    setGameStatus('reveal');
  };

  // Skip the reveal animation and go straight to countdown
  const skipReveal = useCallback(() => {
    if (gameStatusRef.current !== 'reveal') return;
    setRevealedModifiers(activeModifiersRef.current);
    setCurrentRevealStep(activeModifiersRef.current.length);
    setCountdown(3);
    setGameStatus('countdown');
  }, []);

  // Slot machine cycling reveal sequence loop
  useEffect(() => {
    if (gameStatus !== 'reveal') return;

    // Check if we already revealed all modifiers
    if (currentRevealStep >= activeModifiers.length) {
      // Show all final modifiers for 1 second, then start countdown
      const timer = setTimeout(() => {
        setCountdown(3);
        setGameStatus('countdown');
      }, 1000);
      return () => clearTimeout(timer);
    }

    // Check if user prefers reduced motion
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReducedMotion) {
      // Skip animation entirely, land immediately
      setRevealedModifiers(activeModifiers);
      setCurrentRevealStep(activeModifiers.length);
      return;
    }

    // Start cycling animation for activeModifiers[currentRevealStep]
    const targetMod = activeModifiers[currentRevealStep];
    setIsCyclingComplete(false);

    let cycleCount = 0;
    const maxCycles = 15;
    let currentInterval = 80;
    let timeoutId: NodeJS.Timeout;

    const cycle = () => {
      if (cycleCount < maxCycles) {
        const randomModIndex = Math.floor(Math.random() * MODIFIERS_POOL.length);
        setCyclingModifier(MODIFIERS_POOL[randomModIndex]);
        cycleCount++;

        // Cubic ease-out: starts fast (~80ms), ends slow (~350ms)
        const progress = cycleCount / maxCycles;
        currentInterval = 80 + Math.round(270 * Math.pow(progress, 2));

        timeoutId = setTimeout(cycle, currentInterval);
      } else {
        // Stop cycling, land on correct modifier
        setCyclingModifier(targetMod);
        setIsCyclingComplete(true);
        setRevealedModifiers(prev => [...prev, targetMod]);

        // Thud effects: minor screen shake
        setIsScreenShaking(true);
        setTimeout(() => setIsScreenShaking(false), 200);

        // Wait 500ms before triggering the next modifier cycling
        timeoutId = setTimeout(() => {
          setCurrentRevealStep(prev => prev + 1);
        }, 500);
      }
    };

    timeoutId = setTimeout(cycle, currentInterval);
    return () => clearTimeout(timeoutId);
  }, [gameStatus, currentRevealStep, activeModifiers]);

  // Countdown timer loop
  useEffect(() => {
    if (gameStatus !== 'countdown') return;

    const timer = setTimeout(() => {
      if (countdown > 1) {
        setCountdown(prev => prev - 1);
      } else {
        startGame(activeModifiersRef.current);
      }
    }, 1000);

    return () => clearTimeout(timer);
  }, [gameStatus, countdown, startGame]);

  // Trigger input shake on error
  const triggerInputShake = () => {
    setInputShake(true);
    setTimeout(() => setInputShake(false), 200);
  };

  // Save score to database
  const saveFinalScore = useCallback(async (
    finalLevel: number,
    finalDefeated: number,
    finalDamage: number,
    mods: Modifier[]
  ) => {
    if (!supabase.auth.getSession()) return;
    setSaving(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) return;

      const durationMs = Date.now() - startTimeRef.current;
      const baseScore = (finalLevel * 1000) + finalDamage;
      const multiplier = 1 + mods.reduce((sum, mod) => sum + mod.scoreBonus, 0);
      const finalScore = Math.round(baseScore * multiplier);
      const activeModIds = mods.map(m => m.id);

      await saveBossRushScore({
        user_id: session.user.id,
        max_level_reached: finalLevel,
        bosses_defeated: finalDefeated,
        total_damage_dealt: finalDamage,
        duration_ms: durationMs,
        score: finalScore,
        modifier_multiplier: multiplier,
        active_modifiers: activeModIds
      });

      // Check achievements
      await checkAndUnlockAchievements(session.user.id, {
        mode: 'boss_rush',
        max_level_reached: finalLevel,
        bosses_defeated: finalDefeated
      });

      // Daily Challenge logic
      const isDaily = searchParams.get('daily') === 'true';
      if (isDaily) {
        const challenge = generateDailyChallenge(new Date());
        if (challenge.type === 'boss_rush') {
          const achieved = finalLevel;
          const completed = achieved >= challenge.targetValue;
          await saveDailyScore(session.user.id, challenge.dateString, challenge.type, challenge.targetValue, achieved, completed);
          let streakNum = 0;
          if (completed) {
            const streak = await updateUserDailyStreak(session.user.id, challenge.dateString);
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
      console.error('Failed to save score:', err);
    } finally {
      setSaving(false);
    }
  }, [bossesDefeated, searchParams]);

  // Handle word failure (timeout)
  const handleWordTimeout = useCallback(() => {
    if (gameStatusRef.current !== 'playing') return;

    const activeMods = activeModifiersRef.current;
    const activeModIds = activeMods.map(m => m.id);
    const baseDmg = Math.round(15 * Math.pow(1.10, level - 1));
    let multiplier = 1;
    if (activeModIds.includes('boss_dmg_15')) multiplier *= 1.5;
    if (activeModIds.includes('boss_dmg_2')) multiplier *= 2;
    const finalDmg = Math.round(baseDmg * multiplier);

    // Boss attacks player
    setIsBossAttacking(true);
    setIsPlayerHurt(true);
    setIsScreenShaking(true);

    // Add floating damage popup over player (red text)
    const popupId = Math.random().toString();
    setDamagePopups(prev => [
      ...prev,
      { id: popupId, amount: finalDmg, x: 20 + Math.random() * 15, y: 45 + Math.random() * 15, type: 'player' }
    ]);
    setTimeout(() => {
      setDamagePopups(prev => prev.filter(p => p.id !== popupId));
    }, 800);

    setPlayerHp(prev => {
      const nextHp = Math.max(0, prev - finalDmg);
      if (nextHp <= 0) {
        // Player defeated: Game Over
        setGameStatus('gameover');
        saveFinalScore(level, bossesDefeated, totalDamageDealt, activeMods);
      }
      return nextHp;
    });

    setTimeout(() => {
      setIsBossAttacking(false);
      setIsPlayerHurt(false);
      setIsScreenShaking(false);
    }, 300);

    // Setup next word if still alive
    if (playerHp - finalDmg > 0) {
      setupNewWord(level, activeModIds);
    }
  }, [level, playerHp, bossesDefeated, totalDamageDealt, setupNewWord, saveFinalScore]);

  // Handle successful word type
  const handleWordComplete = useCallback(() => {
    if (gameStatusRef.current !== 'playing' || !wordStartTime) return;

    const activeMods = activeModifiersRef.current;
    const activeModIds = activeMods.map(m => m.id);

    const timeLimit = currentWordTimeLimit;
    const timeTaken = Date.now() - wordStartTime;
    const remainingRatio = Math.max(0, (timeLimit - timeTaken) / timeLimit);

    // Formulas
    const baseDamage = currentWord.length * 2;
    const speedMultiplier = 1.0 + (1.5 * remainingRatio);
    let damage = Math.round(baseDamage * speedMultiplier);
    if (activeModIds.includes('kutukan_rapuh')) {
      damage = Math.round(damage * 0.8);
    }

    // Animations
    setIsPlayerAttacking(true);
    setIsBossHurt(true);

    // Add floating damage popup over Boss
    const popupId = Math.random().toString();
    setDamagePopups(prev => [
      ...prev,
      { id: popupId, amount: damage, x: 60 + Math.random() * 15, y: 40 + Math.random() * 15, type: 'boss' }
    ]);
    setTimeout(() => {
      setDamagePopups(prev => prev.filter(p => p.id !== popupId));
    }, 800);

    // Apply damage to Boss
    setTotalDamageDealt(prev => prev + damage);
    setBossHp(prev => {
      const nextHp = Math.max(0, prev - damage);
      
      if (nextHp <= 0) {
        // Boss Defeated! Level Up
        const nextLevel = level + 1;
        setBossesDefeated(d => d + 1);
        setLevel(nextLevel);

        const newMaxHp = calculateBossMaxHp(nextLevel, activeModIds);
        setBossHp(newMaxHp);
        setMaxBossHp(newMaxHp);

        // Word starts slightly delayed to give transition feel
        setTimeout(() => {
          setupNewWord(nextLevel, activeModIds);
        }, 600);
      } else {
        // Boss survives: next word
        setupNewWord(level, activeModIds);
      }

      return nextHp;
    });

    setTimeout(() => {
      setIsPlayerAttacking(false);
      setIsBossHurt(false);
    }, 300);

  }, [level, currentWord, wordStartTime, currentWordTimeLimit, calculateBossMaxHp, setupNewWord]);

  // Keyboard input listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (gameStatusRef.current !== 'playing') return;

      if (e.key === ' ' || e.key === 'Backspace') {
        e.preventDefault();
      }

      if (e.key === 'Backspace') {
        if (hasErrorRef.current) {
          setHasError(false);
        } else {
          setTypedText(prev => prev.slice(0, -1));
        }
        return;
      }

      if (e.key.length !== 1) return;

      if (hasErrorRef.current) {
        triggerInputShake();
        return;
      }

      const nextCharIndex = typedTextRef.current.length;
      const expectedChar = currentWordRef.current[nextCharIndex];

      if (!expectedChar) return;

      if (e.key.toLowerCase() === expectedChar.toLowerCase()) {
        const nextTyped = typedTextRef.current + expectedChar;
        setTypedText(nextTyped);

        if (nextTyped.length === currentWordRef.current.length) {
          handleWordComplete();
        }
      } else {
        setHasError(true);
        triggerInputShake();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleWordComplete]);

  // Main game update timer loop
  useEffect(() => {
    if (gameStatus !== 'playing' || !wordStartTime) return;

    let frameId: number;
    const updateTimer = () => {
      const elapsed = Date.now() - wordStartTime;
      const remaining = Math.max(0, currentWordTimeLimit - elapsed);
      setTimeLeft(remaining);

      if (remaining <= 0) {
        handleWordTimeout();
      } else {
        frameId = requestAnimationFrame(updateTimer);
      }
    };

    frameId = requestAnimationFrame(updateTimer);
    return () => cancelAnimationFrame(frameId);
  }, [gameStatus, wordStartTime, currentWordTimeLimit, handleWordTimeout]);

  // Render loading state
  if (authLoading) {
    return (
      <div className="min-h-screen bg-pixel-bg flex items-center justify-center font-pixel text-pixel-text text-xs">
        <div className="text-center space-y-4">
          <div className="w-8 h-8 border-4 border-pixel-accent/30 border-t-pixel-accent animate-spin mx-auto rounded-full" />
          <p>LOADING PROFILE...</p>
        </div>
      </div>
    );
  }

  // Boss configurations (Sprite template index, color shifts, names)
  const bossIndex = (level - 1) % BOSS_TEMPLATES.length;
  const bossSprite = BOSS_TEMPLATES[bossIndex];
  const bossName = BOSS_NAMES[bossIndex] || "Unknown Monster";
  const hueShift = ((level - 1) % 8) * 45 + Math.floor((level - 1) / 8) * 15;
  const bossScale = 1.0 + Math.floor((level - 1) / 8) * 0.1;

  // Percentage calculations
  const playerMaxHp = activeModifiers.some(m => m.id === 'kutukan_lemah') ? 70 : 100;
  const bossHpPercent = Math.max(0, Math.min(100, (bossHp / maxBossHp) * 100));
  const playerHpPercent = Math.max(0, Math.min(100, (playerHp / playerMaxHp) * 100));
  const timerPercent = Math.max(0, Math.min(100, (timeLeft / currentWordTimeLimit) * 100));

  // WPM and Stats helper
  const durationSec = ((Date.now() - startTimeRef.current) / 1000).toFixed(0);

  return (
    <div className={`min-h-screen bg-pixel-bg text-pixel-text font-pixel selection:bg-pixel-accent selection:text-pixel-bg flex flex-col items-center justify-between p-4 overflow-hidden relative ${isScreenShaking ? 'animate-pixel-shake' : ''} boss-battle-mode`}>
      
      {/* HUD Header */}
      <header className="w-full max-w-2xl border-4 border-pixel-border bg-pixel-panel-bg p-3 flex justify-between items-center text-[10px] md:text-xs">
        <Link href="/" className="hover:text-pixel-accent transition-colors flex items-center gap-2">
          {language === 'id' ? '< KELUAR' : '< EXIT'}
        </Link>
        <span className="text-pixel-accent">RPG TYPING BATTLE</span>
        <div className="flex items-center gap-3">
          <span>LV: {level}</span>
          <ThemeToggle />
        </div>
      </header>

      {/* Active Modifiers HUD Badge Row */}
      {activeModifiers.length > 0 && gameStatus === 'playing' && (
        <div className="w-full max-w-2xl mt-2 flex flex-wrap gap-2 justify-center select-none animate-pixel-fade-in">
          {activeModifiers.map(mod => {
            const isKutukan = mod.type === 'kutukan';
            return (
              <span
                key={mod.id}
                title={getModEffect(mod, language)}
                className={`text-[8px] md:text-[9px] px-2 py-1 border-2 font-bold cursor-help ${
                  isKutukan
                    ? 'border-pixel-hp-red/40 bg-pixel-hp-red/10 text-pixel-hp-red'
                    : 'border-pixel-accent/40 bg-pixel-accent/10 text-pixel-accent'
                }`}
              >
                {isKutukan ? '💀' : '⚡'} {getModName(mod, language)}
              </span>
            );
          })}
        </div>
      )}

      {/* Battle Scene */}
      <main className="w-full max-w-2xl flex-1 flex flex-col justify-center items-center py-6 gap-6 relative">
        
        {/* Floating Damage Popups */}
        {damagePopups.map(popup => {
          const isPlayerDmg = popup.type === 'player';
          return (
            <div
              key={popup.id}
              className={`absolute text-sm md:text-base font-black animate-pixel-bounce-fade z-20 pointer-events-none drop-shadow-[0_4px_0_var(--pixel-shadow)] ${
                isPlayerDmg ? 'text-pixel-hp-red' : 'text-pixel-accent'
              }`}
              style={{ left: `${popup.x}%`, top: `${popup.y}%` }}
            >
              -{popup.amount}
            </div>
          );
        })}

        {/* BOSS STATS & HP */}
        <div className="w-full flex flex-col items-center gap-1 select-none">
          <div className="w-full flex justify-between items-end px-2 text-[10px] md:text-xs">
            <span className="tracking-wide uppercase text-pixel-accent">{bossName}</span>
            <span>{bossHp}/{maxBossHp} HP</span>
          </div>
          {/* Segmented HP bar */}
          <div className="w-full h-5 border-4 border-pixel-border bg-pixel-bg p-0.5 relative flex overflow-hidden">
            <div
              className="h-full bg-pixel-hp-red transition-all duration-75"
              style={{ width: `${bossHpPercent}%` }}
            />
            {/* Segmentation line markers */}
            <div className="absolute inset-0 flex justify-between pointer-events-none">
              {[...Array(9)].map((_, i) => (
                <div key={i} className="w-1 h-full bg-pixel-border/40" />
              ))}
            </div>
          </div>
        </div>

        {/* SPRITES AREA */}
        <div className="w-full flex justify-around items-center min-h-[160px] relative select-none">
          
          {/* Hero Sprite */}
          <div className="flex flex-col items-center gap-2 relative">
            <div className="text-[8px] text-pixel-text/50 mb-1">PLAYER</div>
            <PixelSprite
              sprite={HERO_SPRITE}
              isHurt={isPlayerHurt}
              isAttacking={isPlayerAttacking}
              isPlayer={true}
            />
            {/* Player HP under sprite */}
            <div className="w-24 mt-2">
              <div className="flex justify-between text-[8px] mb-1">
                <span>HP</span>
                <span>{playerHp}/{playerMaxHp}</span>
              </div>
              <div className="w-full h-3 border-2 border-pixel-border bg-pixel-bg p-0.5 overflow-hidden relative">
                <div
                  className="h-full bg-pixel-hp-green"
                  style={{ width: `${playerHpPercent}%` }}
                />
              </div>
            </div>
          </div>

          {/* Boss Sprite */}
          <div className="flex flex-col items-center gap-2 relative">
            <div className="text-[8px] text-pixel-accent/60 mb-1">BOSS</div>
            <PixelSprite
              sprite={bossSprite}
              scale={bossScale}
              isHurt={isBossHurt}
              isAttacking={isBossAttacking}
              hueShift={hueShift}
              isPlayer={false}
            />
            <div className="text-[8px] mt-2 text-pixel-accent/70">SCALE: {bossScale.toFixed(1)}x</div>
          </div>

        </div>

        {/* INPUT & TIMER AREA */}
        <div className="w-full bg-pixel-panel-bg border-4 border-pixel-border p-4 flex flex-col items-center gap-4">
          
          {/* Word Timer Bar */}
          <div className="w-full space-y-1">
            <div className="flex justify-between text-[8px] text-pixel-text/70 select-none">
              <span>{language === 'id' ? 'BATAS WAKTU KATA' : 'WORD TIME LIMIT'}</span>
              <span>{(timeLeft / 1000).toFixed(1)}s</span>
            </div>
            <div className="w-full h-3 border-2 border-pixel-bg bg-pixel-bg p-0.5 overflow-hidden">
              <div
                className="h-full bg-pixel-accent"
                style={{ width: `${timerPercent}%` }}
              />
            </div>
          </div>

          {/* Target Word to type */}
          {gameStatus === 'playing' ? (
            <div className="flex flex-col items-center gap-2 w-full">
              {/* Display text with character matching logic */}
              <div className={`text-lg md:text-xl tracking-widest text-center select-none font-bold py-2 ${inputShake ? 'animate-shake' : ''}`}>
                {currentWord.split('').map((char, index) => {
                  let color = 'text-slate-custom'; // Default remaining letters (greyish)
                  let underline = '';
                  
                  if (index < typedText.length) {
                    color = 'text-pixel-hp-green'; // Correct letters
                  } else if (index === typedText.length && hasError) {
                    color = 'text-pixel-hp-red bg-pixel-hp-red/10'; // Error letter highlight
                    underline = 'border-b-4 border-pixel-hp-red';
                  } else if (index === typedText.length && !hasError) {
                    underline = 'border-b-4 border-pixel-accent animate-pulse'; // Current cursor position
                  }

                  return (
                    <span key={index} className={`${color} ${underline} px-0.5 font-bold`}>
                      {char}
                    </span>
                  );
                })}
              </div>

              {/* Typo Helper Alert */}
              {hasError && (
                <div className="text-[8px] md:text-[9px] text-pixel-hp-red animate-pulse">
                  {language === 'id' 
                    ? '* ADA TYPO! TEKAN BACKSPACE UNTUK MEMPERBAIKI *' 
                    : '* TYPO DETECTED! PRESS BACKSPACE TO CORRECT *'}
                </div>
              )}
            </div>
          ) : (
            <div className="py-4 text-center select-none text-xs md:text-sm flex flex-col items-center gap-3">
              <p className="text-pixel-accent mb-1 font-bold uppercase animate-pulse">
                {gameStatus === 'ready' 
                  ? (language === 'id' ? 'SIAP BERTARUNG?' : 'READY TO BATTLE?') 
                  : (language === 'id' ? 'GAME OVER!' : 'GAME OVER!')}
              </p>
              
              {/* Retro Language Selector */}
              <div className="flex flex-col items-center gap-1">
                <span className="text-[7px] md:text-[8px] text-slate-custom font-bold uppercase tracking-wider">
                  {language === 'id' ? 'PILIH BAHASA' : 'SELECT LANGUAGE'}
                </span>
                <div className="flex bg-[#11131A] p-0.5 border-2 border-pixel-border">
                  <button
                    onClick={() => setLanguage('id')}
                    className={`px-3 py-1 text-[8px] font-bold transition-all cursor-pointer border-2 ${
                      language === 'id'
                        ? 'bg-pixel-accent text-pixel-bg border-pixel-btn-border'
                        : 'border-transparent text-slate-custom hover:text-pixel-text'
                    }`}
                  >
                    🇮🇩 INDO
                  </button>
                  <button
                    onClick={() => setLanguage('en')}
                    className={`px-3 py-1 text-[8px] font-bold transition-all cursor-pointer border-2 ${
                      language === 'en'
                        ? 'bg-pixel-accent text-pixel-bg border-pixel-btn-border'
                        : 'border-transparent text-slate-custom hover:text-pixel-text'
                    }`}
                  >
                    🇬🇧 ENG
                  </button>
                </div>
              </div>

              <p className="text-slate-custom text-[9px] mt-1">
                {language === 'id' ? 'KLIK TOMBOL DI BAWAH UNTUK MULAI' : 'CLICK BUTTON BELOW TO START'}
              </p>
            </div>
          )}

          {/* Action button */}
          {gameStatus !== 'playing' && gameStatus !== 'countdown' && gameStatus !== 'reveal' && (
            <button
              onClick={startCountdown}
              className="px-6 py-3 bg-pixel-accent hover:bg-pixel-accent/90 text-pixel-bg font-black text-xs border-4 border-pixel-btn-border active:scale-95 shadow-md shadow-pixel-shadow transition-all cursor-pointer select-none theme-toggle-btn"
            >
              {gameStatus === 'ready' 
                ? (language === 'id' ? 'MULAI BATTLE' : 'START BATTLE') 
                : (language === 'id' ? 'MAIN LAGI' : 'PLAY AGAIN')}
            </button>
          )}

        </div>

      </main>

      {/* HUD Footer */}
      <footer className="w-full max-w-2xl border-4 border-pixel-border bg-pixel-panel-bg p-3 flex justify-between items-center text-[8px] md:text-[10px] select-none text-slate-custom">
        <span>DAMAGE: {totalDamageDealt}</span>
        <span>{language === 'id' ? `BOSS DIKALAHKAN: ${bossesDefeated}` : `BOSSES DEFEATED: ${bossesDefeated}`}</span>
      </footer>

      {/* Slot Reveal Overlay */}
      {gameStatus === 'reveal' && (
        <div 
          onClick={skipReveal}
          className="fixed inset-0 bg-pixel-bg/95 backdrop-blur-md flex flex-col items-center justify-center p-4 z-40 select-none cursor-pointer"
        >
          {/* Skip instruction */}
          <div className="absolute top-4 right-4 text-[8px] md:text-[10px] text-slate-custom animate-pulse font-mono">
            {language === 'id' ? 'KLIK DI MANA SAJA UNTUK MELEWATI (SKIP)' : 'CLICK ANYWHERE TO SKIP'}
          </div>

          <h3 className="text-[10px] md:text-xs text-pixel-accent font-black uppercase tracking-wider mb-6 animate-pulse text-center">
            {language === 'id' ? '🎰 MENGACAK MODIFIER RUN... 🎰' : '🎰 RAFFLING RUN MODIFIERS... 🎰'}
          </h3>

          {/* Slots Container */}
          <div className="w-full max-w-sm flex flex-col gap-4">
            {activeModifiers.map((mod, index) => {
              const isRevealed = index < revealedModifiers.length;
              const isCurrent = index === currentRevealStep;
              const displayMod = isRevealed 
                ? mod 
                : (isCurrent ? cyclingModifier : null);

              if (!displayMod && !isCurrent) {
                // Future slot that hasn't started cycling yet
                return (
                  <div 
                    key={index} 
                    className="h-16 border-4 border-dashed border-pixel-border/40 bg-pixel-bg/30 flex items-center justify-center text-[8px] font-bold text-slate-custom/30 font-mono"
                  >
                    {language === 'id' ? `SLOT ${index + 1}: [TERKUNCI]` : `SLOT ${index + 1}: [LOCKED]`}
                  </div>
                );
              }

              const isKutukan = displayMod?.type === 'kutukan';
              const isFinalLand = isRevealed || (isCurrent && isCyclingComplete);

              return (
                <div
                  key={index}
                  className={`h-16 border-4 p-3 flex items-center justify-between transition-all duration-75 relative overflow-hidden ${
                    isFinalLand
                      ? isKutukan
                        ? 'border-pixel-hp-red bg-pixel-hp-red/10 text-pixel-hp-red shadow-[0_0_15px_rgba(217,66,93,0.3)] animate-pixel-bounce'
                        : 'border-pixel-accent bg-pixel-accent/10 text-pixel-accent shadow-[0_0_15px_rgba(255,107,53,0.3)] animate-pixel-bounce'
                      : 'border-pixel-border bg-pixel-panel-bg text-pixel-text opacity-70 scale-95'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className="text-sm">
                      {isFinalLand ? (isKutukan ? '💀' : '⚡') : '⏳'}
                    </span>
                    <div className="flex flex-col text-left">
                      <span className={`text-[9px] md:text-[10px] font-black uppercase font-pixel tracking-wider ${!isFinalLand ? 'animate-pulse' : ''}`}>
                        {displayMod ? getModName(displayMod, language) : ''}
                      </span>
                      {isFinalLand && displayMod && (
                        <span className="text-[8px] text-slate-custom mt-0.5 max-w-[200px] leading-tight font-sans">
                          {getModEffect(displayMod, language)}
                        </span>
                      )}
                    </div>
                  </div>

                  {displayMod && (
                    <div className={`text-[8px] md:text-[9px] px-1.5 py-0.5 bg-pixel-border text-pixel-text font-bold ${!isFinalLand ? 'opacity-50' : ''}`}>
                      +{displayMod.scoreBonus * 100}% {language === 'id' ? 'SKOR' : 'SCORE'}
                    </div>
                  )}

                  {/* Flash glow animation effect when landing */}
                  {isCurrent && isCyclingComplete && (
                    <div className={`absolute inset-0 pointer-events-none animate-flash-glow ${
                      isKutukan ? 'bg-pixel-hp-red/20' : 'bg-pixel-accent/20'
                    }`} />
                  )}
                </div>
              );
            })}
          </div>

          {/* Reveal complete summary message */}
          {revealedModifiers.length === activeModifiers.length && (
            <div className="mt-8 text-center animate-pixel-bounce">
              <p className="text-[9px] md:text-[10px] text-pixel-hp-green font-black uppercase tracking-wider mb-2">
                {language === 'id' ? '✅ MODIFIER DIKUNCI!' : '✅ MODIFIERS LOCKED!'}
              </p>
              <p className="text-[8px] md:text-[9px] text-slate-custom">
                {language === 'id' ? 'Menghitung pengganda skor: ' : 'Calculating score multiplier: '}<span className="text-pixel-accent font-bold">+{activeModifiers.reduce((s, m) => s + m.scoreBonus, 0) * 100}%</span>
              </p>
            </div>
          )}
        </div>
      )}

      {/* Countdown overlay */}
      {gameStatus === 'countdown' && (
        <div className="fixed inset-0 bg-pixel-bg/90 backdrop-blur-sm flex flex-col items-center justify-center p-4 z-40 select-none">
          {/* Countdown Number */}
          <div className="text-7xl md:text-8xl font-black text-pixel-accent animate-pixel-bob mb-8 drop-shadow-[0_6px_0_var(--pixel-shadow)]">
            {countdown}
          </div>
          
          {/* Modifier Banner */}
          <div className="w-full max-w-sm bg-pixel-card-bg border-4 border-pixel-border p-5 text-center shadow-2xl animate-pixel-shake">
            <h3 className="text-xs md:text-sm text-pixel-accent font-black uppercase tracking-wider mb-3 animate-pulse">
              {language === 'id' ? '⚠️ MODIFIER AKTIF ⚠️' : '⚠️ ACTIVE MODIFIERS ⚠️'}
            </h3>
            <div className="space-y-2">
              {activeModifiers.map((mod) => {
                const isKutukan = mod.type === 'kutukan';
                return (
                  <div
                    key={mod.id}
                    className={`p-2 border-2 text-[10px] md:text-xs font-bold flex items-center justify-between ${
                      isKutukan
                        ? 'border-pixel-hp-red/40 bg-pixel-hp-red/5 text-pixel-hp-red'
                        : 'border-pixel-accent/40 bg-pixel-accent/5 text-pixel-accent'
                    }`}
                  >
                    <span>{isKutukan ? '💀' : '⚡'} {getModName(mod, language)}</span>
                    <span className="text-[9px] px-1 bg-pixel-border text-pixel-text font-bold">
                      +{mod.scoreBonus * 100}% {language === 'id' ? 'SKOR' : 'SCORE'}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Game Over Modal */}
      {gameStatus === 'gameover' && (
        <div className="fixed inset-0 bg-pixel-bg/90 backdrop-blur-sm flex items-center justify-center p-4 z-50 select-none">
          <div className="w-full max-w-md bg-pixel-card-bg border-4 border-pixel-accent p-6 text-center shadow-2xl shadow-pixel-shadow">
            <h2 className="text-base md:text-lg text-pixel-hp-red font-black uppercase mb-4 tracking-wider animate-pulse">
              GAME OVER
            </h2>
            
            <p className="text-[10px] md:text-xs text-slate-custom mb-6">
              {language === 'id' 
                ? 'Ksatria Anda telah gugur dalam pertempuran sengit melawan bos. Berikut pencapaian Anda:' 
                : 'Your knight has fallen in a fierce battle against the boss. Here are your achievements:'}
            </p>

            {/* Daily Challenge Result Banner */}
            {dailyResult && (
              <div className={`p-4 border-4 text-[10px] md:text-xs font-mono mb-6 text-center ${
                dailyResult.completed 
                  ? 'border-pixel-hp-green bg-pixel-hp-green/10 text-pixel-hp-green' 
                  : 'border-pixel-hp-red bg-pixel-hp-red/10 text-pixel-hp-red'
              }`}>
                <div className="font-bold uppercase tracking-wider mb-1">
                  {dailyResult.completed ? '🎉 DAILY CHALLENGE CLEAR!' : '❌ DAILY CHALLENGE FAILED'}
                </div>
                <div className="opacity-90 leading-relaxed font-medium">
                  {language === 'id' 
                    ? `TARGET LEVEL: LVL ${dailyResult.target}, PENCAPAIAN: LVL ${dailyResult.achieved}.`
                    : `TARGET LEVEL: LVL ${dailyResult.target}, ACHIEVED: LVL ${dailyResult.achieved}.`
                  }
                  {dailyResult.completed && dailyResult.streak > 0 && (
                    <div className="mt-1 font-bold text-pixel-accent">
                      {language === 'id' ? `STREAK: ${dailyResult.streak} HARI!` : `STREAK: ${dailyResult.streak} DAYS!`}
                    </div>
                  )}
                </div>
              </div>
            )}

            <div className="bg-pixel-inner-bg border-2 border-pixel-border p-4 text-[10px] md:text-xs text-pixel-text text-left space-y-3 mb-6">
              <div className="flex justify-between border-b border-pixel-border pb-1">
                <span>{language === 'id' ? 'LEVEL MAKSIMAL' : 'MAX LEVEL'}</span>
                <span className="text-pixel-accent font-bold">LVL {level}</span>
              </div>
              <div className="flex justify-between border-b border-pixel-border pb-1">
                <span>{language === 'id' ? 'BOSS DIKALAHKAN' : 'BOSSES DEFEATED'}</span>
                <span className="text-pixel-accent font-bold">{bossesDefeated}</span>
              </div>
              <div className="flex justify-between border-b border-pixel-border pb-1">
                <span>{language === 'id' ? 'TOTAL DAMAGE' : 'TOTAL DAMAGE'}</span>
                <span className="text-pixel-hp-green font-bold">{totalDamageDealt}</span>
              </div>
              <div className="flex justify-between border-b border-pixel-border pb-1">
                <span>{language === 'id' ? 'BASE SCORE' : 'BASE SCORE'}</span>
                <span className="text-pixel-text font-bold">{(level * 1000) + totalDamageDealt}</span>
              </div>
              <div className="flex justify-between border-b border-pixel-border pb-1">
                <span>{language === 'id' ? 'MULTIPLIER' : 'MULTIPLIER'}</span>
                <span className="text-pixel-accent font-bold">x{(1 + activeModifiers.reduce((sum, mod) => sum + mod.scoreBonus, 0)).toFixed(2)}</span>
              </div>
              <div className="flex justify-between border-b border-pixel-border pb-1 text-xs md:text-sm font-black text-pixel-accent">
                <span>{language === 'id' ? 'SKOR AKHIR' : 'FINAL SCORE'}</span>
                <span>{Math.round(((level * 1000) + totalDamageDealt) * (1 + activeModifiers.reduce((sum, mod) => sum + mod.scoreBonus, 0)))}</span>
              </div>

              {/* Active Modifiers list */}
              {activeModifiers.length > 0 && (
                <div className="pt-2 border-t border-pixel-border space-y-1">
                  <div className="text-[8px] text-slate-custom uppercase font-bold">
                    {language === 'id' ? 'Modifier Run Ini:' : 'Modifiers This Run:'}
                  </div>
                  <div className="grid grid-cols-1 gap-1">
                    {activeModifiers.map(mod => (
                      <div key={mod.id} className="text-[9px] flex justify-between">
                        <span className={mod.type === 'kutukan' ? 'text-pixel-hp-red' : 'text-pixel-accent'}>
                          {mod.type === 'kutukan' ? '💀' : '⚡'} {getModName(mod, language)}
                        </span>
                        <span className="text-slate-custom font-semibold">+{mod.scoreBonus * 100}%</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex justify-between pt-2 border-t border-pixel-border">
                <span>{language === 'id' ? 'DURASI PERMAINAN' : 'GAME DURATION'}</span>
                <span className="text-pixel-text font-bold">{durationSec}s</span>
              </div>
            </div>

            {saving && (
              <div className="text-[8px] text-pixel-accent animate-pulse mb-4">
                {language === 'id' ? 'MENYIMPAN SKOR KE CLOUD DATABASE...' : 'SAVING SCORE TO CLOUD DATABASE...'}
              </div>
            )}

            <div className="flex flex-col sm:flex-row gap-3 justify-center items-center">
              <button
                onClick={startCountdown}
                disabled={saving}
                className="w-full sm:w-auto px-5 py-2.5 bg-pixel-accent hover:bg-pixel-accent/90 text-pixel-bg border-2 border-pixel-btn-border active:scale-95 transition-all text-[10px] font-bold cursor-pointer disabled:opacity-50 theme-toggle-btn"
              >
                {language === 'id' ? 'MAIN LAGI' : 'PLAY AGAIN'}
              </button>
              <Link
                href="/"
                className="w-full sm:w-auto px-5 py-2.5 bg-pixel-inner-bg hover:bg-pixel-inner-bg/70 text-pixel-text border-2 border-pixel-border active:scale-95 transition-all text-[10px] font-bold text-center theme-toggle-btn"
              >
                {language === 'id' ? 'KEMBALI KE MENU' : 'BACK TO MENU'}
              </Link>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

export default function BossBattlePage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-ink flex flex-col items-center justify-center text-amber select-none">
        <div className="w-10 h-10 rounded border-2 border-[#2D3345] border-t-amber animate-spin mb-4" />
        <span className="text-sm font-mono tracking-wider animate-pulse font-pixel text-center">LOADING PIXEL GRAPHICS ENGINE...</span>
      </div>
    }>
      <BossBattleGame />
    </Suspense>
  );
}

