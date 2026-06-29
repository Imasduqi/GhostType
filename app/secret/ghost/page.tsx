"use client";

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabase/client';
import { saveSecretBossClear } from '@/lib/supabase/queries';
import { checkAndUnlockAchievements } from '@/lib/achievements/checkAchievements';
import { wordPoolID } from '@/lib/text-generator/wordPoolID';
import { STORY_SKILLS, StorySkill } from '@/lib/story/skillData';

// CSS Art GHOST_SPRITE
const GHOST_SPRITE = [
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
];

// Helper to render GHOST_SPRITE to canvas
const PixelSprite = ({
  sprite,
  isHurt = false,
  isAttacking = false,
  cyanFilter = false
}: {
  sprite: string[];
  isHurt?: boolean;
  isAttacking?: boolean;
  cyanFilter?: boolean;
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

  const style: React.CSSProperties = {
    imageRendering: 'pixelated',
    filter: cyanFilter ? 'hue-rotate(130deg) saturate(2.5) brightness(1.2)' : undefined,
  };

  const transformClass = isAttacking 
    ? '-translate-x-6 transition-transform duration-100 ease-out' 
    : 'animate-pixel-bob';

  return (
    <div className={`relative ${transformClass}`} style={style}>
      <canvas
        ref={canvasRef}
        width={128}
        height={128}
        className="w-24 h-24 md:w-32 md:h-32"
      />
    </div>
  );
};

// Generate Indonesian word pools
const indonesianWords = [
  ...wordPoolID.subjek,
  ...wordPoolID.predikat,
  ...wordPoolID.objek,
  ...wordPoolID.keteranganTempat,
  ...wordPoolID.keteranganWaktu,
  ...wordPoolID.kataSifat
].map(w => w.replace(/^(di|ke|dari|pada|para|si|sang)\s+/i, '').toLowerCase());

const easyPool = indonesianWords.filter(w => w.length <= 5);
const mediumPool = indonesianWords.filter(w => w.length >= 6 && w.length <= 7);
const hardPool = indonesianWords.filter(w => w.length >= 8);

function getRandomWord(difficulty: 'easy' | 'medium' | 'hard'): string {
  const pool = difficulty === 'easy' ? easyPool : difficulty === 'medium' ? mediumPool : hardPool;
  return pool[Math.floor(Math.random() * pool.length)] || 'typing';
}

function applyLetterSwaps(word: string, pairs: number): string {
  if (word.length < 2) return word;
  const chars = word.split('');
  const swapped = new Set<number>();
  
  for (let p = 0; p < pairs; p++) {
    const candidates: number[] = [];
    for (let i = 0; i < chars.length - 1; i++) {
      if (!swapped.has(i) && !swapped.has(i + 1)) {
        candidates.push(i);
      }
    }
    if (candidates.length === 0) break;
    const index = candidates[Math.floor(Math.random() * candidates.length)];
    const temp = chars[index];
    chars[index] = chars[index + 1];
    chars[index + 1] = temp;
    swapped.add(index);
    swapped.add(index + 1);
  }
  return chars.join('');
}

export default function GhostKingPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  
  // Game state flow: 'briefing' | 'skill_select' | 'playing' | 'defeated' | 'victory'
  const [gameStatus, setGameStatus] = useState<'briefing' | 'skill_select' | 'playing' | 'defeated' | 'victory'>('briefing');
  const [loading, setLoading] = useState(true);

  // Player Stats
  const [playerStats, setPlayerStats] = useState({
    bestWpm: 0,
    avgAccuracy: 95,
    mostPlayedMode: 'race'
  });

  // Generated Ghost King Stats
  const [ghostKingStats, setGhostKingStats] = useState({
    hp: 150,
    damage: 15,
    ability: 'copy_performance',
    abilityLabel: 'Doppelganger'
  });

  // Battle HP states
  const [bossHp, setBossHp] = useState(150);
  const [maxBossHp, setMaxBossHp] = useState(150);
  const [playerHp, setPlayerHp] = useState(100);
  
  // Words & Typing
  const [targetWord, setTargetWord] = useState('');
  const [displayedWord, setDisplayedWord] = useState('');
  const [typedText, setTypedText] = useState('');
  const [visualTypedText, setVisualTypedText] = useState('');
  const [hasError, setHasError] = useState(false);
  const [wordHasTypos, setWordHasTypos] = useState(false);

  // Skill System States
  const [selectedActiveSkills, setSelectedActiveSkills] = useState<string[]>([]);
  const [selectedPassiveSkills, setSelectedPassiveSkills] = useState<string[]>([]);
  const [selectedUltimateSkill, setSelectedUltimateSkill] = useState<string | null>(null);
  const [equippedActiveSkills, setEquippedActiveSkills] = useState<string[]>([]);
  const [equippedPassiveSkills, setEquippedPassiveSkills] = useState<string[]>([]);
  const [equippedUltimateSkill, setEquippedUltimateSkill] = useState<string | null>(null);
  const [shakingSkills, setShakingSkills] = useState<Record<string, boolean>>({});
  const [isUltimateUsed, setIsUltimateUsed] = useState(false);
  const [shakingUltimate, setShakingUltimate] = useState(false);

  // Active skill indicators & timers
  const [skillCooldowns, setSkillCooldowns] = useState<Record<string, number>>({});
  const [isFocusModeActive, setIsFocusModeActive] = useState(false);
  const [focusModeTimer, setFocusModeTimer] = useState(0);
  const [isAdrenalineActive, setIsAdrenalineActive] = useState(false);
  const [adrenalineTimer, setAdrenalineTimer] = useState(0);
  const [isSecondChanceActive, setIsSecondChanceActive] = useState(false);
  const [isTimeShieldActive, setIsTimeShieldActive] = useState(false);
  const [timeShieldTimer, setTimeShieldTimer] = useState(0);
  const [maxPlayerHp, setMaxPlayerHp] = useState(100);

  // Ultimate active states & timers
  const [wordBurstCount, setWordBurstCount] = useState(0);
  const [isTimeStopActive, setIsTimeStopActive] = useState(false);
  const [timeStopTimer, setTimeStopTimer] = useState(0);
  const [isChainBreakActive, setIsChainBreakActive] = useState(false);
  const [chainBreakTimer, setChainBreakTimer] = useState(0);
  const [chainBreakSavedAbility, setChainBreakSavedAbility] = useState<string | null>(null);
  const [isOverloadActive, setIsOverloadActive] = useState(false);
  const [overloadTimer, setOverloadTimer] = useState(0);

  // Passive skill parameters
  const [precisionCombo, setPrecisionCombo] = useState(0);

  // Abilities states
  const [activeAbility, setActiveAbility] = useState<string | null>(null);
  const [judgmentTypos, setJudgmentTypos] = useState(0);
  const [hiddenIndices, setHiddenIndices] = useState<number[]>([]);
  const [doppelgangerWpm, setDoppelgangerWpm] = useState(30);
  const [doppelgangerProgress, setDoppelgangerProgress] = useState(0);
  const [wpmHistory, setWpmHistory] = useState<number[]>([]);

  // Timers
  const [timeLeft, setTimeLeft] = useState(0);
  const [timeLimit, setTimeLimit] = useState(3000);
  const [wordStartTime, setWordStartTime] = useState<number | null>(null);

  // RPG battle elements
  const [isBossHurt, setIsBossHurt] = useState(false);
  const [isBossAttacking, setIsBossAttacking] = useState(false);
  const [inputShake, setInputShake] = useState(false);
  const [damagePopups, setDamagePopups] = useState<any[]>([]);

  // Typewriter dialouge overlay
  const [dialogueSpeaker, setDialogueSpeaker] = useState('Ghost King');
  const [dialogueText, setDialogueText] = useState('');
  const [typedDialogue, setTypedDialogue] = useState('');
  const [hasTriggeredHalfHpDialogue, setHasTriggeredHalfHpDialogue] = useState(false);
  const [isDeveloperUnlocked, setIsDeveloperUnlocked] = useState(false);

  // Refs for tracking variables inside loop
  const gameStatusRef = useRef(gameStatus);
  const typedTextRef = useRef(typedText);
  const currentWordRef = useRef(displayedWord);
  const hasErrorRef = useRef(hasError);
  const equippedActiveSkillsRef = useRef<string[]>([]);
  const skillCooldownsRef = useRef<Record<string, number>>({});
  const isUltimateUsedRef = useRef(false);
  const equippedUltimateSkillRef = useRef<string | null>(null);
  const isChainBreakActiveRef = useRef(false);
  const isTimeStopActiveRef = useRef(false);
  const isOverloadActiveRef = useRef(false);
  const chainBreakSavedAbilityRef = useRef<string | null>(null);
  
  useEffect(() => { gameStatusRef.current = gameStatus; }, [gameStatus]);
  useEffect(() => { typedTextRef.current = typedText; }, [typedText]);
  useEffect(() => { currentWordRef.current = displayedWord; }, [displayedWord]);
  useEffect(() => { hasErrorRef.current = hasError; }, [hasError]);
  useEffect(() => { equippedActiveSkillsRef.current = equippedActiveSkills; }, [equippedActiveSkills]);
  useEffect(() => { skillCooldownsRef.current = skillCooldowns; }, [skillCooldowns]);
  useEffect(() => { isUltimateUsedRef.current = isUltimateUsed; }, [isUltimateUsed]);
  useEffect(() => { equippedUltimateSkillRef.current = equippedUltimateSkill; }, [equippedUltimateSkill]);
  useEffect(() => { isChainBreakActiveRef.current = isChainBreakActive; }, [isChainBreakActive]);
  useEffect(() => { isTimeStopActiveRef.current = isTimeStopActive; }, [isTimeStopActive]);
  useEffect(() => { isOverloadActiveRef.current = isOverloadActive; }, [isOverloadActive]);
  useEffect(() => { chainBreakSavedAbilityRef.current = chainBreakSavedAbility; }, [chainBreakSavedAbility]);

  // Auth & Stats fetching
  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!session?.user) {
        router.push('/login?redirect=/secret/ghost');
        return;
      }
      setUser(session.user);
      
      try {
        // Query user stats
        const { data: attemptsData } = await supabase
          .from('attempts')
          .select('wpm, accuracy')
          .eq('user_id', session.user.id);
        
        const { data: taData } = await supabase
          .from('time_attack_scores')
          .select('wpm')
          .eq('user_id', session.user.id);

        const { data: survData } = await supabase
          .from('survival_scores')
          .select('id')
          .eq('user_id', session.user.id);

        const { data: brData } = await supabase
          .from('boss_rush_scores')
          .select('id')
          .eq('user_id', session.user.id);

        // best_wpm calculation
        const attemptsWpm = attemptsData?.map(a => a.wpm) || [];
        const taWpm = taData?.map(t => t.wpm) || [];
        const maxWpm = Math.max(0, ...attemptsWpm, ...taWpm);
        const best_wpm = maxWpm > 0 ? maxWpm : 60; // fallback to 60

        // average accuracy
        const attemptsAcc = attemptsData?.map(a => a.accuracy) || [];
        const avg_accuracy = attemptsAcc.length > 0 
          ? Math.round(attemptsAcc.reduce((s, a) => s + a, 0) / attemptsAcc.length) 
          : 95;

        // most played mode
        const raceCount = attemptsData?.length || 0;
        const taCount = taData?.length || 0;
        const survCount = survData?.length || 0;
        const brCount = brData?.length || 0;

        let most_played_mode = 'race';
        let maxCount = raceCount;
        if (survCount > maxCount) { most_played_mode = 'survival'; maxCount = survCount; }
        if (taCount > maxCount) { most_played_mode = 'time_attack'; maxCount = taCount; }
        if (brCount > maxCount) { most_played_mode = 'boss_rush'; maxCount = brCount; }

        setPlayerStats({
          bestWpm: best_wpm,
          avgAccuracy: avg_accuracy,
          mostPlayedMode: most_played_mode
        });

        // Generate Ghost King stats based on user stats
        const generatedHp = Math.max(150, Math.min(500, Math.round(best_wpm * 3)));
        const generatedDamage = Math.max(10, Math.min(35, Math.round(15 * (avg_accuracy / 100) * 1.5)));
        
        let generatedAbility = 'copy_performance';
        let abilityLabel = 'Doppelganger (Copy WPM)';

        if (most_played_mode === 'survival') {
          generatedAbility = 'letter_swap';
          abilityLabel = 'Letter Swap + Web Trap';
        } else if (most_played_mode === 'time_attack' || most_played_mode === 'boss_rush') {
          generatedAbility = 'compilation_failure';
          abilityLabel = 'Compilation Failure (Typo Punish)';
        } else {
          generatedAbility = 'missing_letter';
          abilityLabel = 'Missing Letter + Judgment';
        }

        setGhostKingStats({
          hp: generatedHp,
          damage: generatedDamage,
          ability: generatedAbility,
          abilityLabel
        });

        setBossHp(generatedHp);
        setMaxBossHp(generatedHp);

      } catch (err) {
        console.error("Failed to generate Ghost King stats:", err);
      } finally {
        setLoading(false);
      }
    });
  }, [router]);

  // Dialogue text typewriter effect
  useEffect(() => {
    if (!dialogueText) return;
    let index = 0;
    setTypedDialogue('');
    const interval = setInterval(() => {
      index++;
      setTypedDialogue(dialogueText.substring(0, index));
      if (index >= dialogueText.length) {
        clearInterval(interval);
      }
    }, 30);
    return () => clearInterval(interval);
  }, [dialogueText]);

  // Generate word function
  const setupNextWord = useCallback(() => {
    // Generate word from random difficulty
    const roll = Math.random();
    const difficulty = roll < 0.3 ? 'easy' : roll < 0.8 ? 'medium' : 'hard';
    const word = getRandomWord(difficulty);
    
    // Determine active ability details
    let nextAbility = isChainBreakActiveRef.current ? null : ghostKingStats.ability;
    if (!isChainBreakActiveRef.current) {
      if (ghostKingStats.ability === 'letter_swap') {
        // Alternate with web_trap
        nextAbility = Math.random() < 0.5 ? 'letter_swap' : 'web_trap';
      } else if (ghostKingStats.ability === 'missing_letter') {
        // Alternate with judgment
        nextAbility = Math.random() < 0.5 ? 'missing_letter' : 'judgment';
      }
    }
    setActiveAbility(nextAbility);

    // Apply ability effects to displayed word
    let wordToDisplay = word;
    let limit = Math.round(word.length * 350 + 2000);
    let hideIdxs: number[] = [];

    if (nextAbility === 'letter_swap') {
      wordToDisplay = applyLetterSwaps(word, 1);
    } else if (nextAbility === 'web_trap') {
      limit = Math.round(limit * 0.60); // 40% reduction
    } else if (nextAbility === 'missing_letter') {
      const idxs = Array.from({ length: word.length }, (_, i) => i);
      const shuffled = idxs.sort(() => 0.5 - Math.random());
      hideIdxs = shuffled.slice(0, Math.min(2, word.length - 1));
    }

    setTargetWord(word);
    setDisplayedWord(wordToDisplay);
    setTypedText('');
    setVisualTypedText('');
    setHasError(false);
    setWordHasTypos(false);
    setJudgmentTypos(0);
    setHiddenIndices(hideIdxs);
    setDoppelgangerProgress(0);
    
    setTimeLimit(limit);
    setTimeLeft(limit);
    setWordStartTime(Date.now());
  }, [ghostKingStats]);

  // Visual delay logic for lag_spike (Network latency effect)
  useEffect(() => {
    if (activeAbility !== 'lag_spike' || typedText === '') {
      setVisualTypedText(typedText);
      return;
    }
    const timeout = setTimeout(() => {
      setVisualTypedText(typedText);
    }, 150);
    return () => clearTimeout(timeout);
  }, [typedText, activeAbility]);

  // Skill Selection handler
  const handleSelectSkill = (skill: StorySkill) => {
    if (skill.type === 'active') {
      if (selectedActiveSkills.includes(skill.id)) {
        setSelectedActiveSkills(prev => prev.filter(id => id !== skill.id));
      } else {
        if (selectedActiveSkills.length < 2) {
          setSelectedActiveSkills(prev => [...prev, skill.id]);
        }
      }
    } else if (skill.type === 'passive') {
      if (selectedPassiveSkills.includes(skill.id)) {
        setSelectedPassiveSkills(prev => prev.filter(id => id !== skill.id));
      } else {
        if (selectedPassiveSkills.length < 1) {
          setSelectedPassiveSkills([skill.id]);
        }
      }
    }
  };

  // Trigger active skill
  const triggerActiveSkill = (skillId: string) => {
    if (gameStatus !== 'playing') return;
    if (skillCooldowns[skillId] > 0) return; // cooldown active

    const skill = STORY_SKILLS.find(s => s.id === skillId);
    if (!skill) return;

    // Apply active cooldown
    setSkillCooldowns(prev => ({
      ...prev,
      [skillId]: skill.cooldown
    }));

    // Trigger skills
    if (skillId === 'focus_mode') {
      setIsFocusModeActive(true);
      setFocusModeTimer(5);
    } else if (skillId === 'purify') {
      setHasError(false);
    } else if (skillId === 'second_chance') {
      setIsSecondChanceActive(true);
    } else if (skillId === 'adrenaline') {
      setIsAdrenalineActive(true);
      setAdrenalineTimer(10);
    } else if (skillId === 'healing_word') {
      setPlayerHp(prev => Math.min(maxPlayerHp, prev + 20));
      const popupId = Math.random().toString();
      setDamagePopups(prev => [
        ...prev,
        { id: popupId, amount: 20, x: 25, y: 30, type: 'boss' }
      ]);
      setTimeout(() => {
        setDamagePopups(prev => prev.filter(p => p.id !== popupId));
      }, 800);
    } else if (skillId === 'time_shield') {
      setIsTimeShieldActive(true);
      setTimeShieldTimer(15);
    }
  };

  // Trigger ultimate skill
  const triggerUltimateSkill = (skillId: string) => {
    if (gameStatus !== 'playing') return;
    if (isUltimateUsed) return;

    setIsUltimateUsed(true);

    if (skillId === 'word_burst') {
      setWordBurstCount(5);
    } else if (skillId === 'time_stop') {
      setIsTimeStopActive(true);
      setTimeStopTimer(8);
    } else if (skillId === 'full_heal') {
      const maxHp = selectedPassiveSkills.includes('vitality') ? 120 : 100;
      setPlayerHp(maxHp);
      
      const popupId = Math.random().toString();
      setDamagePopups(prev => [
        ...prev,
        { id: popupId, amount: maxHp - playerHp, x: 25, y: 30, type: 'boss' }
      ]);
      setTimeout(() => {
        setDamagePopups(prev => prev.filter(p => p.id !== popupId));
      }, 800);
    } else if (skillId === 'chain_break') {
      setIsChainBreakActive(true);
      setChainBreakTimer(10);
      setChainBreakSavedAbility(activeAbility);
      setActiveAbility(null);
    } else if (skillId === 'overload') {
      setIsOverloadActive(true);
      setOverloadTimer(10);
    }
  };

  // Start battle
  const startBattle = () => {
    const hasVitality = selectedPassiveSkills.includes('vitality');
    const startHp = hasVitality ? 120 : 100;
    
    setPlayerHp(startHp);
    setMaxPlayerHp(startHp);
    setEquippedActiveSkills(selectedActiveSkills);
    setEquippedPassiveSkills(selectedPassiveSkills);
    setEquippedUltimateSkill(selectedUltimateSkill);
    
    setSkillCooldowns({});
    setIsFocusModeActive(false);
    setIsAdrenalineActive(false);
    setIsSecondChanceActive(false);
    setIsUltimateUsed(false);
    setWordBurstCount(0);
    setIsTimeStopActive(false);
    setTimeStopTimer(0);
    setIsChainBreakActive(false);
    setChainBreakTimer(0);
    setChainBreakSavedAbility(null);
    setIsOverloadActive(false);
    setOverloadTimer(0);
    setPrecisionCombo(0);

    setDialogueSpeaker('Ghost King');
    setDialogueText('Aku adalah potensimu. Yang belum pernah kau capai.');
    setGameStatus('playing');
    setBossHp(maxBossHp);
    setHasTriggeredHalfHpDialogue(false);
    setIsDeveloperUnlocked(false);
    setWpmHistory([]);
    setupNextWord();
  };

  // Timer Tick and Doppelganger loop
  useEffect(() => {
    if (gameStatus !== 'playing' || !wordStartTime) return;

    let lastTime = Date.now();
    let frameId: number;

    const tick = () => {
      const now = Date.now();
      const dt = now - lastTime;
      lastTime = now;

      // Update timer countdown
      const speedFactor = isTimeStopActive ? 0.0 : (isFocusModeActive ? 0.70 : 1.0);
      setTimeLeft(prev => {
        const nextTime = Math.max(0, prev - (dt * speedFactor));
        if (nextTime <= 0) {
          handleWordTimeout();
          return 0;
        }
        return nextTime;
      });

      // Doppelganger progress tracking
      if (activeAbility === 'copy_performance' && !isTimeStopActive) {
        const charPerSec = (doppelgangerWpm * 5) / 60;
        const progressInc = (charPerSec / currentWordRef.current.length) * 100 * (dt / 1000);
        setDoppelgangerProgress(prev => {
          const nextProgress = Math.min(100, prev + progressInc);
          if (nextProgress >= 100) {
            handleWordTimeout();
            return 0;
          }
          return nextProgress;
        });
      }

      frameId = requestAnimationFrame(tick);
    };

    frameId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frameId);
  }, [gameStatus, wordStartTime, activeAbility, doppelgangerWpm, setupNextWord, isFocusModeActive, isTimeStopActive]);

  // Skill cooldown & active timer loop (1-second intervals)
  useEffect(() => {
    if (gameStatus !== 'playing') return;

    const interval = setInterval(() => {
      // Cooldown decrements
      setSkillCooldowns(prev => {
        const updated = { ...prev };
        let changed = false;
        for (const id in updated) {
          if (updated[id] > 0) {
            updated[id]--;
            changed = true;
          }
        }
        return changed ? updated : prev;
      });

      // Durations decrements
      setFocusModeTimer(t => {
        if (t > 0) {
          if (t === 1) setIsFocusModeActive(false);
          return t - 1;
        }
        return 0;
      });

      setAdrenalineTimer(t => {
        if (t > 0) {
          if (t === 1) setIsAdrenalineActive(false);
          return t - 1;
        }
        return 0;
      });

      setTimeShieldTimer(t => {
        if (t > 0) {
          if (t === 1) setIsTimeShieldActive(false);
          return t - 1;
        }
        return 0;
      });

      setTimeStopTimer(t => {
        if (t > 0) {
          if (t === 1) setIsTimeStopActive(false);
          return t - 1;
        }
        return 0;
      });

      setChainBreakTimer(t => {
        if (t > 0) {
          if (t === 1) {
            setIsChainBreakActive(false);
            setActiveAbility(chainBreakSavedAbilityRef.current);
          }
          return t - 1;
        }
        return 0;
      });

      setOverloadTimer(t => {
        if (t > 0) {
          if (t === 1) setIsOverloadActive(false);
          return t - 1;
        }
        return 0;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [gameStatus]);

  // Word timeout (failed to type in time or boss types it first)
  const handleWordTimeout = () => {
    setIsBossAttacking(true);
    setTimeout(() => setIsBossAttacking(false), 200);

    let dmgAmount = ghostKingStats.damage;
    if (selectedPassiveSkills.includes('resilience')) {
      dmgAmount = Math.round(dmgAmount * 0.85);
    }
    
    // Apply damage to player
    setPlayerHp(prev => {
      const nextHp = Math.max(0, prev - dmgAmount);
      if (nextHp <= 0) {
        setGameStatus('defeated');
      }
      return nextHp;
    });

    // Damage floating text
    const popupId = Math.random().toString();
    setDamagePopups(prev => [
      ...prev,
      { id: popupId, amount: dmgAmount, x: 25 + Math.random() * 5, y: 35 + Math.random() * 5, type: 'player' }
    ]);
    setTimeout(() => {
      setDamagePopups(prev => prev.filter(p => p.id !== popupId));
    }, 800);

    // Reset next word
    setupNextWord();
  };

  // Keyboard events
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (gameStatusRef.current !== 'playing') return;

      if (e.key === '1' || e.key === '2') {
        e.preventDefault();
        const skillIndex = e.key === '1' ? 0 : 1;
        const activeSkills = equippedActiveSkillsRef.current;
        if (skillIndex < activeSkills.length) {
          const skillId = activeSkills[skillIndex];
          const cooldown = skillCooldownsRef.current[skillId] || 0;
          if (cooldown === 0) {
            triggerActiveSkill(skillId);
          } else {
            // Trigger visual shake on button
            setShakingSkills(prev => ({ ...prev, [skillId]: true }));
            setTimeout(() => {
              setShakingSkills(prev => ({ ...prev, [skillId]: false }));
            }, 200);
          }
        }
        return;
      }

      if (e.key === '3') {
        e.preventDefault();
        const ultimateSkill = equippedUltimateSkillRef.current;
        if (ultimateSkill) {
          if (!isUltimateUsedRef.current) {
            triggerUltimateSkill(ultimateSkill);
          } else {
            setShakingUltimate(true);
            setTimeout(() => {
              setShakingUltimate(false);
            }, 200);
          }
        }
        return;
      }

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
        setInputShake(true);
        setTimeout(() => setInputShake(false), 200);
        return;
      }

      const nextCharIdx = typedTextRef.current.length;
      const expectedChar = currentWordRef.current[nextCharIdx];

      if (!expectedChar) return;

      const isCorrect = e.key.toLowerCase() === expectedChar.toLowerCase();

      if (isCorrect) {
        const nextTyped = typedTextRef.current + expectedChar;
        setTypedText(nextTyped);

        // Overload effect
        if (isOverloadActiveRef.current) {
          setBossHp(prev => Math.max(0, prev - 1));
          const popupId = Math.random().toString();
          setDamagePopups(prev => [
            ...prev,
            { id: popupId, amount: 1, x: 65 + Math.random() * 10, y: 35 + Math.random() * 10, type: 'boss' }
          ]);
          setTimeout(() => {
            setDamagePopups(prev => prev.filter(p => p.id !== popupId));
          }, 800);
        }

        if (nextTyped.length === currentWordRef.current.length) {
          handleWordComplete();
        }
      } else {
        // Typo
        
        // Active Skill: Second Chance
        if (isSecondChanceActive) {
          setIsSecondChanceActive(false);
          const popupId = Math.random().toString();
          setDamagePopups(prev => [
            ...prev,
            { id: popupId, amount: 0, x: 25, y: 35, type: 'boss' }
          ]);
          setTimeout(() => setDamagePopups(prev => prev.filter(p => p.id !== popupId)), 800);
          return;
        }

        setHasError(true);
        setWordHasTypos(true);
        setInputShake(true);
        setTimeout(() => setInputShake(false), 200);

        // compilation_failure logic: instant damage on typo
        if (activeAbility === 'compilation_failure') {
          let typoDmg = 10;
          if (selectedPassiveSkills.includes('resilience')) {
            typoDmg = Math.round(typoDmg * 0.85);
          }
          setPlayerHp(prev => {
            const nextHp = Math.max(0, prev - typoDmg);
            if (nextHp <= 0) {
              setGameStatus('defeated');
            }
            return nextHp;
          });
          const popupId = Math.random().toString();
          setDamagePopups(prev => [
            ...prev,
            { id: popupId, amount: typoDmg, x: 25 + Math.random() * 5, y: 35 + Math.random() * 5, type: 'player' }
          ]);
          setTimeout(() => setDamagePopups(prev => prev.filter(p => p.id !== popupId)), 800);
        }

        // judgment logic: count typos
        if (activeAbility === 'judgment') {
          setJudgmentTypos(prev => {
            const next = prev + 1;
            if (next >= 2) {
              let judgeDmg = 12;
              if (selectedPassiveSkills.includes('resilience')) {
                judgeDmg = Math.round(judgeDmg * 0.85);
              }
              setPlayerHp(p => {
                const nextHp = Math.max(0, p - judgeDmg);
                if (nextHp <= 0) {
                  setGameStatus('defeated');
                }
                return nextHp;
              });
              const popupId = Math.random().toString();
              setDamagePopups(prev => [
                ...prev,
                { id: popupId, amount: judgeDmg, x: 25 + Math.random() * 5, y: 35 + Math.random() * 5, type: 'player' }
              ]);
              setTimeout(() => setDamagePopups(prev => prev.filter(p => p.id !== popupId)), 800);
              return 0;
            }
            return next;
          });
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeAbility, setupNextWord, ghostKingStats, isSecondChanceActive, selectedPassiveSkills]);

  // Handle player typing correctly
  const handleWordComplete = () => {
    if (!wordStartTime) return;
    const timeTaken = Date.now() - wordStartTime;
    const ratio = Math.max(0, (timeLimit - timeTaken) / timeLimit);

    // Save WPM History
    const wpm = Math.round((displayedWord.length / 5) / (timeTaken / 60000));
    if (wpm > 0 && wpm < 300) {
      setWpmHistory(prev => {
        const updated = [...prev, wpm];
        // For copy_performance, adjust Ghost WPM based on player average
        const lastFive = updated.slice(-5);
        const avg = lastFive.reduce((s, w) => s + w, 0) / lastFive.length;
        setDoppelgangerWpm(Math.max(30, Math.round(avg * 0.95)));
        return updated;
      });
    }

    // Damage calculations
    const baseDamage = targetWord.length * 2;
    const speedMult = 1.0 + (1.5 * ratio);
    let damage = Math.round(baseDamage * speedMult);

    if (isAdrenalineActive) {
      damage = Math.round(damage * 1.5);
    }

    const hasPrecision = selectedPassiveSkills.includes('precision');
    if (hasPrecision) {
      if (!wordHasTypos) {
        setPrecisionCombo(prev => {
          const next = prev + 1;
          if (next >= 5) {
            damage = Math.round(damage * 1.1);
          }
          return next;
        });
      } else {
        setPrecisionCombo(0);
      }
    }

    if (wordBurstCount > 0) {
      damage = Math.round(damage * 3);
      setWordBurstCount(prev => prev - 1);
    }

    setIsBossHurt(true);
    setTimeout(() => setIsBossHurt(false), 200);

    // HP Updates
    setBossHp(prev => {
      const nextHp = Math.max(0, prev - damage);
      
      // Trigger dialogue at 50% HP
      if (nextHp <= (maxBossHp / 2) && !hasTriggeredHalfHpDialogue) {
        setHasTriggeredHalfHpDialogue(true);
        setDialogueText("Kau semakin mendekati diriku. Atau aku semakin mendekatimu?");
      }

      if (nextHp <= 0) {
        handleVictory();
      }
      return nextHp;
    });

    const popupId = Math.random().toString();
    setDamagePopups(prev => [
      ...prev,
      { id: popupId, amount: damage, x: 65 + Math.random() * 5, y: 35 + Math.random() * 5, type: 'boss' }
    ]);
    setTimeout(() => {
      setDamagePopups(prev => prev.filter(p => p.id !== popupId));
    }, 800);

    setupNextWord();
  };

  const handleVictory = async () => {
    setGameStatus('victory');
    setDialogueText("Kau... melampaui dirimu sendiri.");
    
    if (!user) return;

    // Save clear
    await saveSecretBossClear(user.id, 'ghost_king');

    // Trigger achievement
    await checkAndUnlockAchievements(user.id, {
      mode: 'secret_boss',
      bossId: 'ghost_king',
      playerWon: true
    });

    // Check if the Developer is now unlocked
    const { data: achievements } = await supabase
      .from('user_achievements')
      .select('achievement_id')
      .eq('user_id', user.id);
    
    const unlocked = new Set(achievements?.map(a => a.achievement_id) || []);
    // Note: secret_ghost_gold has just been cleared, so it will be there. Let's make sure secret_prime_gold is there too.
    if (unlocked.has('secret_prime_gold')) {
      setIsDeveloperUnlocked(true);
    }
  };

  // Rendering character blocks
  const renderWordCharacters = () => {
    if (!displayedWord) return null;

    return displayedWord.split('').map((char, index) => {
      const isTyped = index < visualTypedText.length;
      const isCurrent = index === visualTypedText.length;
      const isHidden = hiddenIndices.includes(index) && !isTyped;

      let colorClass = 'text-slate-custom';
      if (isTyped) {
        colorClass = 'text-ghost-teal font-black';
      } else if (isCurrent && hasError) {
        colorClass = 'text-error-custom bg-error-custom/20 border-b border-error-custom';
      } else if (isCurrent) {
        colorClass = 'text-paper border-b border-amber animate-pulse';
      }

      return (
        <span
          key={index}
          className={`${colorClass} transition-all duration-150 inline-block font-mono text-3xl font-black tracking-wide`}
          style={{ opacity: isHidden ? 0.05 : 1 }}
        >
          {char === ' ' ? '\u00A0' : char}
        </span>
      );
    });
  };

  if (loading) {
    return (
      <main className="min-h-screen bg-ink flex flex-col justify-center items-center">
        <div className="w-8 h-8 rounded-full border-4 border-[#2D3345] border-t-amber animate-spin" />
      </main>
    );
  }

  return (
    <div className="min-h-screen bg-ink flex flex-col justify-between relative overflow-hidden font-sans">
      <div className="absolute inset-0 bg-[linear-gradient(to_bottom,rgba(255,255,255,0.01)_1px,transparent_1px)] bg-[size:100%_4px] pointer-events-none -z-10" />

      {/* Header */}
      <nav className="glass-panel w-full py-4 px-6 border-b border-[#2D3345] flex justify-between items-center select-none">
        <div className="flex items-center gap-2">
          <span className="text-xl font-black text-red-500 font-mono">CLASSIFIED FILE #002</span>
        </div>
        <Link
          href="/profile"
          className="px-4 py-1.5 bg-[#1C1F2B] hover:bg-error-custom/10 text-slate-custom hover:text-error-custom rounded border border-[#2D3345] hover:border-error-custom/30 text-xs font-bold transition-all cursor-pointer"
        >
          &lt; ABORT
        </Link>
      </nav>

      {/* Main Panel */}
      <main className="flex-1 flex flex-col items-center justify-center p-4">
        
        {/* Briefing screen */}
        {gameStatus === 'briefing' && (
          <div className="glass-card max-w-lg w-full p-8 rounded border border-[#2D3345] flex flex-col justify-between items-center text-center space-y-6 select-none relative">
            <div className="absolute top-0 inset-x-0 h-[2px] bg-red-500/50" />
            
            <div className="space-y-2">
              <span className="text-4xl">👥</span>
              <h2 className="text-xl font-bold uppercase text-red-500 font-mono tracking-widest">
                GHOST KING BRIEFING
              </h2>
              <p className="text-xs text-slate-custom leading-relaxed">
                Ghost King telah menganalisis profil dan rekaman permainan Anda. Dia mensimulasikan data Anda untuk menciptakan lawan yang seimbang.
              </p>
            </div>

            <div className="w-full bg-[#11131A] rounded border border-[#2D3345] p-4 text-left font-mono text-xs space-y-3">
              <div className="border-b border-[#2D3345]/50 pb-1.5 font-bold text-slate-custom uppercase tracking-wider text-[10px]">
                HASIL ANALISIS PLAYER:
              </div>
              <div className="flex justify-between">
                <span>Best WPM:</span>
                <span className="text-amber">{playerStats.bestWpm} WPM</span>
              </div>
              <div className="flex justify-between">
                <span>Rata-rata Akurasi:</span>
                <span className="text-ghost-teal">{playerStats.avgAccuracy}%</span>
              </div>
              <div className="flex justify-between">
                <span>Mode Dominan:</span>
                <span className="text-paper capitalize">{playerStats.mostPlayedMode.replace('_', ' ')}</span>
              </div>

              <div className="border-b border-[#2D3345]/50 pb-1.5 pt-2 font-bold text-red-500 uppercase tracking-wider text-[10px]">
                SPESIFIKASI GHOST KING:
              </div>
              <div className="flex justify-between">
                <span>HP Ghost King:</span>
                <span className="text-red-500">{ghostKingStats.hp}</span>
              </div>
              <div className="flex justify-between">
                <span>Dmg per Timeout:</span>
                <span className="text-red-500">{ghostKingStats.damage} HP</span>
              </div>
              <div className="flex justify-between items-center">
                <span>Kemampuan Khusus:</span>
                <span className="bg-red-950/40 text-red-400 border border-red-900/60 px-1.5 py-0.5 rounded text-[10px] font-bold">
                  {ghostKingStats.abilityLabel}
                </span>
              </div>
            </div>

            <div className="space-y-4 w-full">
              <p className="text-xs text-slate-custom italic">
                &quot;Ia adalah versi terbaikmu. Dapatkah kau mengalahkan dirimu sendiri?&quot;
              </p>
              <button
                onClick={() => setGameStatus('skill_select')}
                className="w-full py-3 bg-red-600 hover:bg-red-500 text-white font-mono font-bold text-sm uppercase rounded shadow-lg shadow-red-600/10 active:scale-95 cursor-pointer transition-all"
              >
                MULAI PERTEMPURAN
              </button>
            </div>
          </div>
        )}

        {/* Skill Selection Screen */}
        {gameStatus === 'skill_select' && (
          <div className="glass-card max-w-xl w-full p-6 border border-[#2D3345] bg-[#0E1017]/95 rounded-lg flex flex-col justify-between min-h-[480px] select-none animate-pixel-fade-in relative z-25">
            <div className="border-b border-[#2D3345] pb-3 text-center">
              <span className="text-[11px] font-mono text-error-custom uppercase tracking-widest block font-black animate-pulse">
                ⚡ CLASSIFIED COMBAT ⚡
              </span>
              <h2 className="text-xl font-black text-paper mt-1">
                PILIH SKILL PENDUKUNG
              </h2>
              <p className="text-xs text-slate-custom mt-1">
                Menghadapi: <strong className="text-amber">Ghost King</strong> - HP: {maxBossHp}
              </p>
            </div>

            <div className="bg-[#11131A] p-3 border border-[#2D3345] rounded-sm text-center text-xs font-mono text-amber my-2">
              <span>BATTLE PREPARATION: Pilih tepat <strong className="text-paper">2 Active + 1 Passive + 1 Ultimate</strong></span>
            </div>

            <div className="space-y-4 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar my-2">
              {/* Active list */}
              <div className="space-y-2">
                <h4 className="text-[10px] font-mono text-slate-custom uppercase tracking-widest font-bold">Active Skills</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {STORY_SKILLS.filter(s => s.type === 'active').map(skill => {
                    const isSelected = selectedActiveSkills.includes(skill.id);
                    return (
                      <div
                        key={skill.id}
                        onClick={() => handleSelectSkill(skill)}
                        className={`p-3 rounded border text-left cursor-pointer transition-all duration-150 ${
                          isSelected
                            ? 'bg-amber/15 border-amber text-amber shadow-sm shadow-amber/5'
                            : 'bg-[#11131A]/40 border-[#2D3345]/50 text-slate-custom hover:border-slate-custom/50 hover:bg-[#11131A]/70'
                        }`}
                      >
                        <div className="flex justify-between items-center">
                          <span className={`font-bold text-xs ${isSelected ? 'text-amber' : 'text-paper'}`}>{skill.name}</span>
                          <span className="text-[9px] font-mono opacity-85">CD: {skill.cooldown}s</span>
                        </div>
                        <p className="text-[10px] mt-1 leading-normal opacity-90">{skill.effectDescription}</p>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Passive list */}
              <div className="space-y-2 pt-2">
                <h4 className="text-[10px] font-mono text-slate-custom uppercase tracking-widest font-bold">Passive Skills</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {STORY_SKILLS.filter(s => s.type === 'passive').map(skill => {
                    const isSelected = selectedPassiveSkills.includes(skill.id);
                    return (
                      <div
                        key={skill.id}
                        onClick={() => handleSelectSkill(skill)}
                        className={`p-3 rounded border text-left cursor-pointer transition-all duration-150 ${
                          isSelected
                            ? 'bg-ghost-teal/15 border-ghost-teal text-ghost-teal shadow-sm shadow-ghost-teal/5'
                            : 'bg-[#11131A]/40 border-[#2D3345]/50 text-slate-custom hover:border-slate-custom/50 hover:bg-[#11131A]/70'
                        }`}
                      >
                        <span className={`font-bold text-xs ${isSelected ? 'text-ghost-teal' : 'text-paper'}`}>{skill.name}</span>
                        <p className="text-[10px] mt-1 leading-normal opacity-90">{skill.effectDescription}</p>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Ultimate list */}
              <div className="space-y-2 pt-2 border-t border-[#2D3345]/30">
                <h4 className="text-[10px] font-mono text-amber uppercase tracking-widest font-black flex items-center gap-1">
                  👑 ULTIMATE SKILLS (PILIH 1)
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {STORY_SKILLS.filter(s => s.type === 'ultimate').map(skill => {
                    const isSelected = selectedUltimateSkill === skill.id;
                    return (
                      <div
                        key={skill.id}
                        onClick={() => setSelectedUltimateSkill(skill.id)}
                        className={`p-3 rounded border text-left cursor-pointer transition-all duration-150 ${
                          isSelected
                            ? 'bg-amber/15 border-amber text-amber shadow-md shadow-amber/10 animate-pulse'
                            : 'bg-[#11131A]/40 border-[#2D3345]/50 text-slate-custom hover:border-amber/55 hover:bg-[#11131A]/70'
                        }`}
                      >
                        <span className={`font-bold text-xs ${isSelected ? 'text-amber' : 'text-paper'}`}>
                          {skill.name}
                        </span>
                        <p className="text-[10px] mt-1 leading-normal opacity-90">{skill.effectDescription}</p>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Launch Game Button */}
            <div className="pt-4 border-t border-[#2D3345] flex justify-center">
              <button
                disabled={selectedActiveSkills.length !== 2 || selectedPassiveSkills.length !== 1 || !selectedUltimateSkill}
                onClick={startBattle}
                className="w-full py-3 bg-red-600 hover:bg-red-500 disabled:bg-[#1C1F2B] disabled:text-slate-custom/60 disabled:border-[#2D3345] disabled:cursor-not-allowed text-white font-black rounded text-xs transition-all uppercase tracking-widest active:scale-95 shadow-md"
              >
                Mulai Pertempuran ⚔️
              </button>
            </div>
          </div>
        )}

        {/* Defeated Screen */}
        {gameStatus === 'defeated' && (
          <div className="glass-card max-w-md w-full p-8 rounded border border-red-500/30 flex flex-col items-center justify-between text-center min-h-[300px] select-none relative">
            <div className="absolute top-0 inset-x-0 h-[2px] bg-red-600" />
            <div className="my-auto space-y-4">
              <span className="text-4xl text-red-500">💀</span>
              <h2 className="text-lg font-bold uppercase text-red-500 font-mono tracking-wider">DIKALAHKAN</h2>
              <p className="text-xs text-slate-custom italic leading-relaxed pt-2">
                &quot;Kau gagal melampaui dirimu.&quot;
              </p>
            </div>
            <Link
              href="/profile"
              className="w-full py-2.5 bg-red-600 hover:bg-red-500 text-white font-mono font-bold rounded text-xs uppercase tracking-widest transition-all active:scale-95 mt-6 text-center"
            >
              Kembali Ke Profil
            </Link>
          </div>
        )}

        {/* Victory Screen */}
        {gameStatus === 'victory' && (
          <div className="glass-card max-w-md w-full p-8 rounded border border-amber/30 flex flex-col items-center justify-between text-center min-h-[340px] select-none relative">
            <div className="absolute top-0 inset-x-0 h-[2px] bg-amber" />
            <div className="my-auto space-y-5">
              <span className="text-4xl text-amber">🥇</span>
              <h2 className="text-lg font-bold uppercase text-amber font-mono tracking-wider">MELAMPAUI BATAS</h2>
              <p className="text-xs text-slate-custom italic leading-relaxed pt-2">
                &quot;Kau... melampaui dirimu sendiri.&quot;
              </p>

              {isDeveloperUnlocked && (
                <div className="bg-red-950/20 border border-red-950 text-red-400 p-3 rounded font-mono text-[10px] uppercase font-bold animate-pulse mt-4">
                  ☣️ CLASSIFIED CHALLENGE UNLOCKED: THE DEVELOPER ☣️
                </div>
              )}
            </div>
            
            <Link
              href="/profile"
              className="w-full py-2.5 bg-amber hover:bg-amber/90 text-ink font-mono font-bold rounded text-xs uppercase tracking-widest transition-all active:scale-95 mt-6 text-center"
            >
              Kembali Ke Profil
            </Link>
          </div>
        )}

        {/* Playing Screen */}
        {gameStatus === 'playing' && (
          <div className="w-full max-w-2xl space-y-6">
            
            {/* Battle Arena */}
            <div className="glass-card border border-[#2D3345] rounded-lg p-6 relative overflow-hidden flex flex-col md:flex-row justify-between items-center gap-6 min-h-[220px]">
              
              {/* Floating popups overlay */}
              <div className="absolute inset-0 pointer-events-none z-20">
                {damagePopups.map((popup) => (
                  <div
                    key={popup.id}
                    className={`absolute text-lg font-black font-mono animate-damage-float ${
                      popup.type === 'player' ? 'text-red-500' : 'text-ghost-teal'
                    }`}
                    style={{ left: `${popup.x}%`, top: `${popup.y}%` }}
                  >
                    -{popup.amount}
                  </div>
                ))}
              </div>

              {/* Player side HUD */}
              <div className="flex flex-col items-center gap-2 w-full md:w-1/3 select-none">
                <span className="text-[10px] text-slate-custom font-mono font-bold uppercase tracking-widest">PEMAIN</span>
                <div className="w-20 h-20 rounded border border-[#2D3345] bg-[#11131A] flex items-center justify-center text-4xl">
                  💻
                </div>
                
                {/* HP bar */}
                <div className="w-full space-y-1 mt-1">
                  <div className="flex justify-between text-[9px] font-mono text-slate-custom font-bold">
                    <span>HP</span>
                    <span>{playerHp}/{maxPlayerHp}</span>
                  </div>
                  <div className="w-full h-2 bg-[#1A1C2C] rounded-full overflow-hidden border border-[#2D3345]/60">
                    <div
                      className="h-full bg-ghost-teal transition-all duration-200"
                      style={{ width: `${(playerHp / maxPlayerHp) * 100}%` }}
                    />
                  </div>
                </div>
              </div>

              {/* VS separator */}
              <div className="text-slate-custom/30 font-bold font-mono text-sm hidden md:block">VS</div>

              {/* Boss side HUD */}
              <div className="flex flex-col items-center gap-2 w-full md:w-1/3 select-none">
                <span className="text-[10px] text-red-500 font-mono font-bold uppercase tracking-widest">GHOST KING</span>
                <PixelSprite
                  sprite={GHOST_SPRITE}
                  isHurt={isBossHurt}
                  isAttacking={isBossAttacking}
                  cyanFilter={true}
                />

                {/* Boss HP Bar */}
                <div className="w-full space-y-1 mt-1">
                  <div className="flex justify-between text-[9px] font-mono text-slate-custom font-bold">
                    <span>HP</span>
                    <span>{bossHp}/{maxBossHp}</span>
                  </div>
                  <div className="w-full h-2 bg-[#1A1C2C] rounded-full overflow-hidden border border-[#2D3345]/60">
                    <div
                      className="h-full bg-red-600 transition-all duration-200"
                      style={{ width: `${Math.round((bossHp / maxBossHp) * 100)}%` }}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Active Skills & Ultimate trigger HUD */}
            {gameStatus === 'playing' && (equippedActiveSkills.length > 0 || equippedUltimateSkill) && (
              <div className="w-full flex justify-center gap-3 select-none flex-wrap">
                {equippedActiveSkills.map((skillId, index) => {
                  const skill = STORY_SKILLS.find(s => s.id === skillId);
                  if (!skill) return null;
                  
                  const cooldown = skillCooldowns[skillId] || 0;
                  const isReady = cooldown === 0;

                  return (
                    <button
                      key={skillId}
                      disabled={!isReady}
                      onClick={() => triggerActiveSkill(skillId)}
                      className={`px-4 py-2 border text-[10px] font-mono font-bold uppercase rounded transition-all active:scale-95 cursor-pointer ${
                        shakingSkills[skillId]
                          ? 'bg-error-custom/25 border-error-custom text-error-custom animate-shake'
                          : isReady
                          ? 'bg-amber/15 border-amber/35 hover:bg-amber/30 text-amber'
                          : 'bg-[#1C1F2B] border-[#2D3345] text-slate-custom/50 cursor-not-allowed'
                      }`}
                      title={skill.effectDescription}
                    >
                      [{index + 1}] {skill.name} {cooldown > 0 ? `(${cooldown}s)` : ''}
                    </button>
                  );
                })}

                {/* Ultimate Skill */}
                {equippedUltimateSkill && (() => {
                  const skill = STORY_SKILLS.find(s => s.id === equippedUltimateSkill);
                  if (!skill) return null;

                  return (
                    <button
                      disabled={isUltimateUsed}
                      onClick={() => triggerUltimateSkill(equippedUltimateSkill)}
                      className={`px-4 py-2 border text-[10px] font-mono font-bold uppercase rounded transition-all active:scale-95 cursor-pointer ${
                        isUltimateUsed
                          ? 'bg-[#1C1F2B] border-[#2D3345] text-slate-custom/30 cursor-not-allowed'
                          : shakingUltimate
                          ? 'bg-error-custom/25 border-error-custom text-error-custom animate-shake'
                          : 'bg-amber/15 border-amber hover:bg-amber/30 text-amber shadow-[0_0_12px_rgba(243,167,56,0.25)]'
                      }`}
                      title={skill.effectDescription}
                    >
                      [3] {isUltimateUsed ? 'USED' : skill.name}
                    </button>
                  );
                })()}
              </div>
            )}

            {/* Active visual buffers indicators */}
            {gameStatus === 'playing' && (isFocusModeActive || isAdrenalineActive || isSecondChanceActive || isTimeShieldActive || isTimeStopActive || isChainBreakActive || isOverloadActive) && (
              <div className="w-full flex flex-wrap gap-2 justify-center font-mono text-[9px] font-bold select-none animate-pixel-fade-in">
                {isFocusModeActive && (
                  <span className="px-2.5 py-0.5 bg-ghost-teal/20 text-ghost-teal border border-ghost-teal/40 rounded-sm">
                    ⚡ WAKTU MELAMBAT: {focusModeTimer}s ⚡
                  </span>
                )}
                {isAdrenalineActive && (
                  <span className="px-2.5 py-0.5 bg-amber/20 text-amber border border-amber/40 rounded-sm">
                    🔥 ADRENALINE RUSH: {adrenalineTimer}s 🔥
                  </span>
                )}
                {isSecondChanceActive && (
                  <span className="px-2.5 py-0.5 bg-ghost-teal/20 text-ghost-teal border border-ghost-teal/40 rounded-sm">
                    🛡️ SECOND CHANCE ACTIVE 🛡️
                  </span>
                )}
                {isTimeShieldActive && (
                  <span className="px-2.5 py-0.5 bg-amber/20 text-amber border border-amber/40 rounded-sm animate-pulse">
                    🛡️ TIME SHIELD ACTIVE ({timeShieldTimer}s) 🛡️
                  </span>
                )}
                {isTimeStopActive && (
                  <span className="px-2.5 py-0.5 bg-amber/20 text-amber border border-amber/40 rounded-sm animate-pulse">
                    ⏳ TIME STOP ACTIVE ({timeStopTimer}s) ⏳
                  </span>
                )}
                {isChainBreakActive && (
                  <span className="px-2.5 py-0.5 bg-ghost-teal/20 text-ghost-teal border border-ghost-teal/40 rounded-sm">
                    ⛓️ CHAIN BREAK ACTIVE ({chainBreakTimer}s) ⛓️
                  </span>
                )}
                {isOverloadActive && (
                  <span className="px-2.5 py-0.5 bg-error-custom/20 text-error-custom border border-error-custom/40 rounded-sm animate-pulse">
                    ⚡ OVERLOAD ACTIVE ({overloadTimer}s): FLAT KEYSTROKE DMG ⚡
                  </span>
                )}
              </div>
            )}

            {/* Typing display container */}
            <div className={`glass-card border border-[#2D3345] p-6 rounded-lg relative overflow-hidden flex flex-col items-center space-y-5 ${
              inputShake ? 'animate-shake' : ''
            }`}>
              
              {/* Active Ability tag */}
              {activeAbility && (
                <div className="bg-red-950/30 text-red-400 border border-red-900/60 px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase tracking-wider select-none animate-pulse">
                  ⚡ KEMAMPUAN: {activeAbility.replace('_', ' ')} ⚡
                </div>
              )}

              {/* Word rendering viewport */}
              <div 
                className="w-full min-h-[80px] flex items-center justify-center bg-[#11131A] border-2 border-[#2D3345] rounded-md p-4 shadow-[inset_0_4px_12px_rgba(0,0,0,0.8)]"
                style={
                  activeAbility === 'forgetfulness' 
                    ? { animation: 'forgetfulness-normal 4s infinite' } 
                    : undefined
                }
              >
                {renderWordCharacters()}
              </div>

              {/* Word completion progress & timers */}
              <div className="w-full flex flex-col gap-2.5 font-mono text-xs font-bold text-slate-custom select-none">
                
                {/* Normal timer limit bar */}
                {activeAbility !== 'copy_performance' ? (
                  <div className="w-full space-y-1">
                    <div className="flex justify-between text-[10px]">
                      <span>WAKTU KETIK</span>
                      <span className="tabular-nums">{(timeLeft / 1000).toFixed(1)}s</span>
                    </div>
                    <div className="w-full h-1.5 bg-[#1A1C2C] rounded-full overflow-hidden">
                      <div
                        className="h-full bg-amber transition-all duration-75"
                        style={{ width: `${(timeLeft / timeLimit) * 100}%` }}
                      />
                    </div>
                  </div>
                ) : (
                  // Doppelganger progress tracking bar
                  <div className="w-full space-y-1">
                    <div className="flex justify-between text-[10px] text-red-400">
                      <span>PROGRESS KETIK GHOST KING (COPY WPM: {doppelgangerWpm})</span>
                      <span className="tabular-nums">{Math.round(doppelgangerProgress)}%</span>
                    </div>
                    <div className="w-full h-1.5 bg-[#1A1C2C] rounded-full overflow-hidden border border-red-950/40">
                      <div
                        className="h-full bg-red-500 transition-all duration-100"
                        style={{ width: `${doppelgangerProgress}%` }}
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>
            
            {/* Dialogue typewriter helper box */}
            <div className="glass-card border border-[#2D3345] p-3 rounded text-center text-xs font-mono font-bold select-none text-slate-custom">
              <span className="text-red-500 font-black">{dialogueSpeaker}:</span> {typedDialogue}
            </div>

          </div>
        )}

      </main>

      {/* Footer */}
      <footer className="w-full py-4 text-center border-t border-[#2D3345] text-xs text-slate-custom select-none font-sans mt-8">
        WARNING: DEVIATION DETECTED. SYSTEM MALFUNCTION IMMINENT.
      </footer>
    </div>
  );
}
