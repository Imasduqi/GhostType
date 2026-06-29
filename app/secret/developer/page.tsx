"use client";

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabase/client';
import { saveSecretBossClear } from '@/lib/supabase/queries';
import { checkAndUnlockAchievements } from '@/lib/achievements/checkAchievements';
import { wordPoolID } from '@/lib/text-generator/wordPoolID';
import { STORY_SKILLS, StorySkill } from '@/lib/story/skillData';

// CSS Art DEVELOPER_SPRITE (Robot-like look with Golem details)
const DEVELOPER_SPRITE = [
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
];

// Helper to render sprite to canvas
const PixelSprite = ({
  sprite,
  isHurt = false,
  isAttacking = false,
  phaseStyle = 'A'
}: {
  sprite: string[];
  isHurt?: boolean;
  isAttacking?: boolean;
  phaseStyle?: string;
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
    filter: phaseStyle === 'C' ? 'grayscale(1) brightness(1.5) contrast(2) sepia(1) hue-rotate(-50deg)' : undefined,
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

// Generate Indonesian words
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
  return pool[Math.floor(Math.random() * pool.length)] || 'developer';
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

const ALL_ABILITIES = [
  'missing_letter', 'letter_swap', 'web_trap', 'lock_input', 'judgment', 
  'forgetfulness', 'screen_distortion', 'lag_spike', 'syntax_error', 
  'latency', 'burn', 'copy_performance', 'packet_loss'
];

const PHASE_POOL = ['A', 'B', 'C', 'D'];

export default function TheDeveloperPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  
  // Game state: 'briefing' | 'skill_select' | 'playing' | 'paused' | 'defeated' | 'victory' | 'postcredits'
  const [gameStatus, setGameStatus] = useState<'briefing' | 'skill_select' | 'playing' | 'paused' | 'defeated' | 'victory' | 'postcredits'>('briefing');
  const [loading, setLoading] = useState(true);
  const [username, setUsername] = useState('Pemain');

  // Battle states
  const [bossHp, setBossHp] = useState(500);
  const [maxBossHp] = useState(500);
  const [playerHp, setPlayerHp] = useState(100);
  
  // Phase mechanics
  const [currentPhase, setCurrentPhase] = useState<'A' | 'B' | 'C' | 'D'>('A');

  // Typing
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

  // Abilities rotation
  const [activeAbility, setActiveAbility] = useState<string | null>(null);
  const [abilityRotationTimer, setAbilityRotationTimer] = useState(10);
  const [judgmentTypos, setJudgmentTypos] = useState(0);
  const [hiddenIndices, setHiddenIndices] = useState<number[]>([]);
  const [blockedIndices, setBlockedIndices] = useState<number[]>([]);
  const [doppelgangerProgress, setDoppelgangerProgress] = useState(0);
  const [doppelgangerWpm, setDoppelgangerWpm] = useState(50);
  const [wpmHistory, setWpmHistory] = useState<number[]>([]);

  // Timers
  const [timeLeft, setTimeLeft] = useState(0);
  const [timeLimit, setTimeLimit] = useState(4000);
  const [wordStartTime, setWordStartTime] = useState<number | null>(null);

  // visual actions
  const [isBossHurt, setIsBossHurt] = useState(false);
  const [isBossAttacking, setIsBossAttacking] = useState(false);
  const [inputShake, setInputShake] = useState(false);
  const [damagePopups, setDamagePopups] = useState<any[]>([]);

  // Dialogues
  const [dialogueSpeaker, setDialogueSpeaker] = useState('The Developer');
  const [dialogueText, setDialogueText] = useState('');
  const [typedDialogue, setTypedDialogue] = useState('');
  
  // Fourth-wall events triggers
  const [hasTriggeredFiftyPercent, setHasTriggeredFiftyPercent] = useState(false);
  const [showStrugglingConsole, setShowStrugglingConsole] = useState(false);

  // Typewriter credit sequence
  const [creditsIndex, setCreditsIndex] = useState(0);
  const [typedCredits, setTypedCredits] = useState<string[]>([]);
  const creditsLines = useRef<string[]>([]);

  // Refs for tracking in loops
  const gameStatusRef = useRef(gameStatus);
  const typedTextRef = useRef(typedText);
  const currentWordRef = useRef(displayedWord);
  const hasErrorRef = useRef(hasError);
  const activeAbilityRef = useRef(activeAbility);
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
  useEffect(() => { activeAbilityRef.current = activeAbility; }, [activeAbility]);
  useEffect(() => { equippedActiveSkillsRef.current = equippedActiveSkills; }, [equippedActiveSkills]);
  useEffect(() => { skillCooldownsRef.current = skillCooldowns; }, [skillCooldowns]);
  useEffect(() => { isUltimateUsedRef.current = isUltimateUsed; }, [isUltimateUsed]);
  useEffect(() => { equippedUltimateSkillRef.current = equippedUltimateSkill; }, [equippedUltimateSkill]);
  useEffect(() => { isChainBreakActiveRef.current = isChainBreakActive; }, [isChainBreakActive]);
  useEffect(() => { isTimeStopActiveRef.current = isTimeStopActive; }, [isTimeStopActive]);
  useEffect(() => { isOverloadActiveRef.current = isOverloadActive; }, [isOverloadActive]);
  useEffect(() => { chainBreakSavedAbilityRef.current = chainBreakSavedAbility; }, [chainBreakSavedAbility]);

  // Auth check & Username fetch
  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!session?.user) {
        router.push('/login?redirect=/secret/developer');
        return;
      }
      setUser(session.user);
      
      try {
        const { data: profile } = await supabase
          .from('profiles')
          .select('username')
          .eq('id', session.user.id)
          .maybeSingle();
        if (profile?.username) {
          setUsername(profile.username);
        }
      } catch (err) {
        console.error("Error fetching username:", err);
      } finally {
        setLoading(false);
      }
    });
  }, [router]);

  // Dialogue typewriter
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
    }, 25);
    return () => clearInterval(interval);
  }, [dialogueText]);

  // Abilities rotation clock
  useEffect(() => {
    if (gameStatus !== 'playing') return;

    const interval = setInterval(() => {
      // Pause ability rotation if chain break is active
      if (isChainBreakActiveRef.current) return;

      setAbilityRotationTimer(prev => {
        if (prev <= 1) {
          // Time to rotate ability!
          rotateAbility();
          return 10;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [gameStatus, activeAbility]);

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

  const rotateAbility = () => {
    const nextAbility = ALL_ABILITIES[Math.floor(Math.random() * ALL_ABILITIES.length)];
    setActiveAbility(nextAbility);
    
    // Apply ability constraints immediately to current word if possible
    let hideIdxs: number[] = [];
    let blockIdxs: number[] = [];
    if (nextAbility === 'missing_letter') {
      const idxs = Array.from({ length: currentWordRef.current.length }, (_, i) => i);
      hideIdxs = idxs.sort(() => 0.5 - Math.random()).slice(0, Math.min(2, currentWordRef.current.length - 1));
    } else if (nextAbility === 'packet_loss') {
      const idxs = Array.from({ length: currentWordRef.current.length }, (_, i) => i);
      blockIdxs = idxs.sort(() => 0.5 - Math.random()).slice(0, Math.min(3, currentWordRef.current.length - 1));
    }

    setHiddenIndices(hideIdxs);
    setBlockedIndices(blockIdxs);
    setDoppelgangerProgress(0);
  };

  const setupNextWord = useCallback(() => {
    const word = getRandomWord(Math.random() < 0.2 ? 'easy' : Math.random() < 0.7 ? 'medium' : 'hard');
    
    // Check active ability modifications
    let wordToDisplay = word;
    let limit = Math.round(word.length * 300 + 1800);
    let hideIdxs: number[] = [];
    let blockIdxs: number[] = [];

    const ability = isChainBreakActiveRef.current ? null : activeAbilityRef.current;
    if (ability === 'letter_swap') {
      wordToDisplay = applyLetterSwaps(word, 1);
    } else if (ability === 'burn') {
      limit = Math.round(limit * 0.50);
    } else if (ability === 'web_trap') {
      limit = Math.round(limit * 0.60);
    } else if (ability === 'syntax_error') {
      // Capitalize random chars
      const chars = word.split('');
      const count = Math.min(2, chars.length);
      const shuffled = Array.from({ length: chars.length }, (_, i) => i).sort(() => 0.5 - Math.random());
      shuffled.slice(0, count).forEach(i => { chars[i] = chars[i].toUpperCase(); });
      wordToDisplay = chars.join('');
    } else if (ability === 'missing_letter') {
      const idxs = Array.from({ length: word.length }, (_, i) => i);
      hideIdxs = idxs.sort(() => 0.5 - Math.random()).slice(0, Math.min(2, word.length - 1));
    } else if (ability === 'packet_loss') {
      const idxs = Array.from({ length: word.length }, (_, i) => i);
      blockIdxs = idxs.sort(() => 0.5 - Math.random()).slice(0, Math.min(3, word.length - 1));
    }

    setTargetWord(ability === 'syntax_error' ? wordToDisplay : word);
    setDisplayedWord(wordToDisplay);
    setTypedText('');
    setVisualTypedText('');
    setHasError(false);
    setWordHasTypos(false);
    setJudgmentTypos(0);
    setHiddenIndices(hideIdxs);
    setBlockedIndices(blockIdxs);
    setDoppelgangerProgress(0);

    setTimeLimit(limit);
    setTimeLeft(limit);
    setWordStartTime(Date.now());
  }, []);

  // Visual delay for lag_spike & latency
  useEffect(() => {
    const ability = activeAbility;
    if ((ability !== 'lag_spike' && ability !== 'latency') || typedText === '') {
      setVisualTypedText(typedText);
      return;
    }
    const delay = ability === 'lag_spike' ? 180 : 350;
    const timeout = setTimeout(() => {
      setVisualTypedText(typedText);
    }, delay);
    return () => clearTimeout(timeout);
  }, [typedText, activeAbility]);

  // Main gameplay timer tick & doppelganger tick
  useEffect(() => {
    if (gameStatus !== 'playing' || !wordStartTime) return;

    let lastTime = Date.now();
    let frameId: number;

    const tick = () => {
      const now = Date.now();
      const dt = now - lastTime;
      lastTime = now;

      // Decrement main timer
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
  }, [gameStatus, wordStartTime, activeAbility, doppelgangerWpm, isFocusModeActive, isTimeStopActive]);

  // Handle word timeout (punishment)
  const handleWordTimeout = () => {
    setIsBossAttacking(true);
    setTimeout(() => setIsBossAttacking(false), 200);

    // Timeout deals 15 base damage
    let dmg = 15;
    if (selectedPassiveSkills.includes('resilience')) {
      dmg = Math.round(dmg * 0.85);
    }
    setPlayerHp(prev => {
      const nextHp = Math.max(0, prev - dmg);
      if (nextHp <= 0) {
        setGameStatus('defeated');
      }
      return nextHp;
    });

    const popupId = Math.random().toString();
    setDamagePopups(prev => [
      ...prev,
      { id: popupId, amount: dmg, x: 25 + Math.random() * 5, y: 35 + Math.random() * 5, type: 'player' }
    ]);
    setTimeout(() => {
      setDamagePopups(prev => prev.filter(p => p.id !== popupId));
    }, 800);

    setupNextWord();
  };

  // Keyboard intercept
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

      // Backspace lock (Sentence Warden equivalent under lock_input)
      if (e.key === 'Backspace') {
        if (activeAbilityRef.current === 'lock_input') {
          setInputShake(true);
          setTimeout(() => setInputShake(false), 200);
          return;
        }

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

      const isCorrect = (activeAbilityRef.current === 'syntax_error')
        ? (e.key === expectedChar)
        : (e.key.toLowerCase() === expectedChar.toLowerCase());

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

        // compilation_failure: deal double penalty immediately on typo
        if (activeAbilityRef.current === 'compilation_failure') {
          let typoDmg = 12;
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

        // judgment: check typo threshold
        if (activeAbilityRef.current === 'judgment') {
          setJudgmentTypos(prev => {
            const next = prev + 1;
            if (next >= 2) {
              let judgeDmg = 15;
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
  }, [activeAbility, setupNextWord, isSecondChanceActive, selectedPassiveSkills]);

  // Handle word completed correctly
  const handleWordComplete = () => {
    if (!wordStartTime) return;
    const timeTaken = Date.now() - wordStartTime;
    const ratio = Math.max(0, (timeLimit - timeTaken) / timeLimit);

    // Save WPM
    const wpm = Math.round((displayedWord.length / 5) / (timeTaken / 60000));
    if (wpm > 0 && wpm < 300) {
      setWpmHistory(prev => {
        const updated = [...prev, wpm];
        const lastFive = updated.slice(-5);
        const avg = lastFive.reduce((s, w) => s + w, 0) / lastFive.length;
        setDoppelgangerWpm(Math.max(40, Math.round(avg * 0.95)));
        return updated;
      });
    }

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
      
      // Phase shifts at 25% increments (500 -> 375 -> 250 -> 125 -> 0)
      const prevQuarter = Math.floor(prev / 125);
      const nextQuarter = Math.floor(nextHp / 125);

      if (prevQuarter !== nextQuarter && nextHp > 0) {
        // Phase switches randomly
        const remainingPhases = PHASE_POOL.filter(p => p !== currentPhase);
        const nextPhase = remainingPhases[Math.floor(Math.random() * remainingPhases.length)] as 'A' | 'B' | 'C' | 'D';
        setCurrentPhase(nextPhase);

        // Fourth wall log warning trigger at 25% HP (which is 125 HP, equivalent to quarter 1)
        if (nextHp <= 125) {
          setShowStrugglingConsole(true);
          setTimeout(() => setShowStrugglingConsole(false), 3000);
        }
      }

      // 50% HP Dialogue pause (250 HP)
      if (nextHp <= 250 && !hasTriggeredFiftyPercent) {
        setHasTriggeredFiftyPercent(true);
        triggerPauseEvent();
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

  // 50% HP Freeze pause event
  const triggerPauseEvent = () => {
    setGameStatus('paused');
    setDialogueSpeaker('The Developer');
    setDialogueText("Kamu pikir ini cuma game?");
    
    setTimeout(() => {
      setDialogueText("Mungkin.");
      setTimeout(() => {
        setGameStatus('playing');
        setWordStartTime(Date.now()); // recalibrate word start
      }, 2000);
    }, 2000);
  };

  const handleVictory = async () => {
    setGameStatus('victory');
    setDialogueSpeaker('The Developer');
    setDialogueText("Selamat. Kamu sudah mengalahkan segalanya. Bahkan penciptanya.");
  };

  // Trigger post credits typewriter sequence
  const startPostCredits = async () => {
    setGameStatus('postcredits');
    
    if (user) {
      await saveSecretBossClear(user.id, 'the_developer');
      await checkAndUnlockAchievements(user.id, {
        mode: 'secret_boss',
        bossId: 'the_developer',
        playerWon: true
      });
    }

    creditsLines.current = [
      "> Initializing GhostType...",
      "> Loading player data...",
      "> ERROR: Player exceeded expected limits",
      "> Recalibrating...",
      `> Welcome back, ${username}.`,
      "> There is no Chapter 6.",
      "> Yet."
    ];

    setCreditsIndex(0);
    setTypedCredits([]);
    typeNextCreditLine(0);
  };

  const typeNextCreditLine = (lineIdx: number) => {
    if (lineIdx >= creditsLines.current.length) return;

    const fullLine = creditsLines.current[lineIdx];
    let charIdx = 0;
    
    setTypedCredits(prev => [...prev, '']);

    const interval = setInterval(() => {
      charIdx++;
      setTypedCredits(prev => {
        const next = [...prev];
        next[lineIdx] = fullLine.substring(0, charIdx);
        return next;
      });

      if (charIdx >= fullLine.length) {
        clearInterval(interval);
        setTimeout(() => {
          setCreditsIndex(prev => prev + 1);
          typeNextCreditLine(lineIdx + 1);
        }, 600);
      }
    }, 40);
  };

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
    if (skillCooldowns[skillId] > 0) return;

    const skill = STORY_SKILLS.find(s => s.id === skillId);
    if (!skill) return;

    setSkillCooldowns(prev => ({
      ...prev,
      [skillId]: skill.cooldown
    }));

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

    setDialogueSpeaker('The Developer');
    setDialogueText(`Hei, ${username}. Aku udah nonton kamu dari awal. Dari Chapter 1. Dari Race pertamamu. Dari semua kesalahanmu.`);
    setGameStatus('playing');
    setBossHp(500);
    setCurrentPhase('A');
    setHasTriggeredFiftyPercent(false);
    setShowStrugglingConsole(false);
    setWpmHistory([]);
    rotateAbility();
    setupNextWord();
  };

  // Render character displays
  const renderWordCharacters = () => {
    if (!displayedWord) return null;

    return displayedWord.split('').map((char, index) => {
      const isTyped = index < visualTypedText.length;
      const isCurrent = index === visualTypedText.length;
      
      const isHidden = hiddenIndices.includes(index) && !isTyped;
      const isBlocked = activeAbility === 'packet_loss' && blockedIndices.includes(index) && !isTyped;

      let colorClass = currentPhase === 'B' ? 'text-slate-800' : 'text-slate-custom';
      if (isTyped) {
        colorClass = 'text-ghost-teal font-black';
      } else if (isCurrent && hasError) {
        colorClass = 'text-error-custom bg-error-custom/20 border-b border-error-custom';
      } else if (isCurrent) {
        colorClass = 'text-paper border-b border-amber animate-pulse';
      }

      // apply glitch beast screen distortion styles
      const distortionAnimation = activeAbility === 'screen_distortion' 
        ? 'glitch-distortion-normal 0.25s infinite' 
        : undefined;

      const style: React.CSSProperties = {
        opacity: isHidden ? 0.05 : 1,
        animation: distortionAnimation,
        animationDelay: distortionAnimation ? `${index * 0.03}s` : undefined,
        display: 'inline-block'
      };

      return (
        <span
          key={index}
          className={`${colorClass} transition-all duration-150 inline-block font-mono text-3xl font-black tracking-wide`}
          style={style}
        >
          {isBlocked ? '█' : (char === ' ' ? '\u00A0' : char)}
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

  // Visual Phase Themes settings
  let phaseBackgroundClass = 'bg-ink text-paper';
  if (currentPhase === 'B') {
    // Inverted theme (white background, dark elements)
    phaseBackgroundClass = 'bg-[#EAEAEA] text-[#11131A]';
  } else if (currentPhase === 'C') {
    // Red-alert glitch theme
    phaseBackgroundClass = 'bg-[#180a0b] text-[#F4F4F4]';
  } else if (currentPhase === 'D') {
    // Blackout
    phaseBackgroundClass = 'bg-black text-black';
  }

  // Render Post Credits terminal scene
  if (gameStatus === 'postcredits') {
    const isFinished = creditsIndex >= creditsLines.current.length;
    return (
      <main className="min-h-screen bg-black text-green-500 font-mono p-12 flex flex-col justify-between select-none">
        <div className="space-y-4">
          {typedCredits.map((line, idx) => (
            <p key={idx} className="text-sm md:text-base leading-relaxed">
              {line}
              {idx === creditsIndex && (
                <span className="w-2 h-4 bg-green-500 inline-block ml-1 animate-pulse" />
              )}
            </p>
          ))}
        </div>

        {isFinished && (
          <div className="flex justify-center mt-12 animate-fade-in">
            <Link
              href="/profile"
              className="px-8 py-3 border-2 border-green-500 hover:bg-green-500/10 text-green-500 font-bold rounded text-xs uppercase tracking-widest transition-all active:scale-95 cursor-pointer"
            >
              Kembali ke Menu
            </Link>
          </div>
        )}
      </main>
    );
  }

  return (
    <div className={`min-h-screen ${phaseBackgroundClass} flex flex-col justify-between relative overflow-hidden font-sans transition-colors duration-500`}>
      
      {/* Visual Glitch Overlays */}
      {currentPhase === 'C' && (
        <div className="absolute inset-0 pointer-events-none bg-red-950/5 animate-pulse z-10" />
      )}
      <div className="absolute inset-0 bg-[linear-gradient(to_bottom,rgba(255,255,255,0.005)_1px,transparent_1px)] bg-[size:100%_4px] pointer-events-none -z-10" />

      {/* Header */}
      <nav className={`glass-panel w-full py-4 px-6 border-b ${
        currentPhase === 'B' ? 'border-slate-300 bg-white/50' : 'border-[#2D3345]'
      } flex justify-between items-center select-none z-20`}>
        <div className="flex items-center gap-2">
          <span className="text-xl font-black text-red-600 font-mono animate-pulse">CLASSIFIED FILE #003</span>
          <span className={`text-[10px] px-1.5 py-0.5 rounded font-mono font-bold ${
            currentPhase === 'B' ? 'bg-[#11131A] text-white' : 'bg-red-950/50 text-red-500 border border-red-900/40'
          }`}>
            PHASE {currentPhase}
          </span>
        </div>
        <Link
          href="/profile"
          className={`px-4 py-1.5 rounded border text-xs font-bold transition-all cursor-pointer ${
            currentPhase === 'B' 
              ? 'bg-[#E0E0E0] hover:bg-red-500/10 border-slate-300 text-slate-700 hover:text-red-600'
              : 'bg-[#1C1F2B] hover:bg-error-custom/10 border-[#2D3345] text-slate-custom hover:text-error-custom hover:border-error-custom/30'
          }`}
        >
          &lt; ABORT
        </Link>
      </nav>

      {/* Main Panel */}
      <main className="flex-1 flex flex-col items-center justify-center p-4 z-20">
        
        {/* Floating popups */}
        <div className="absolute inset-0 pointer-events-none z-30">
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

        {/* Small floating Struggling log at HP 25% */}
        {showStrugglingConsole && (
          <div className="absolute bottom-24 right-4 bg-black border border-red-900 text-red-500 text-[9px] font-mono px-3 py-1.5 rounded shadow-lg animate-bounce select-none">
            console.log(&apos;player is struggling&apos;)
          </div>
        )}

        {/* Briefing */}
        {gameStatus === 'briefing' && (
          <div className="glass-card max-w-lg w-full p-8 rounded border border-red-950/80 bg-black/60 flex flex-col justify-between items-center text-center space-y-6 select-none relative">
            <div className="absolute top-0 inset-x-0 h-[2px] bg-red-600 animate-pulse" />
            
            <div className="space-y-2">
              <span className="text-4xl animate-bounce inline-block">☣️</span>
              <h2 className="text-xl font-bold uppercase text-red-500 font-mono tracking-widest">
                THE DEVELOPER
              </h2>
              <p className="text-xs text-slate-custom leading-relaxed">
                Tantangan terakhir di luar batas kode Lexicon Realm. Modifikasi visual ekstrem, rotasi berkala kemampuan, dan glitch visual akan diaktifkan secara agresif.
              </p>
            </div>

            <div className="w-full bg-[#11131A] rounded border border-red-950 p-4 text-left font-mono text-xs space-y-3">
              <div className="border-b border-[#2D3345]/50 pb-1.5 font-bold text-red-500 uppercase tracking-wider text-[10px]">
                SPESIFIKASI BATTLE:
              </div>
              <div className="flex justify-between">
                <span>Boss HP:</span>
                <span className="text-red-500 font-bold">500 (Flat)</span>
              </div>
              <div className="flex justify-between">
                <span>Player HP:</span>
                <span className="text-ghost-teal font-bold">100 (Flat)</span>
              </div>
              <div className="flex justify-between">
                <span>Rotasi Kemampuan:</span>
                <span className="text-amber">Setiap 10 Detik</span>
              </div>
              <div className="flex justify-between">
                <span>Transisi Phase:</span>
                <span className="text-red-500 font-bold">Setiap 25% HP Turun (Acak)</span>
              </div>
            </div>

            <div className="space-y-4 w-full">
              <p className="text-xs text-slate-custom italic leading-relaxed">
                &quot;Dia menciptakan game ini. Dia tahu setiap celah kesalahan Anda. Apakah Anda siap melawannya?&quot;
              </p>
              <button
                onClick={() => setGameStatus('skill_select')}
                className="w-full py-3 bg-red-700 hover:bg-red-600 text-white font-mono font-bold text-sm uppercase rounded shadow-lg shadow-red-700/20 active:scale-95 cursor-pointer transition-all"
              >
                MULAI PERSETERUAN
              </button>
            </div>
          </div>
        )}

        {/* Skill Selection Screen */}
        {gameStatus === 'skill_select' && (
          <div className="glass-card max-w-xl w-full p-6 border border-red-950/80 bg-black/95 rounded-lg flex flex-col justify-between min-h-[480px] select-none animate-pixel-fade-in relative z-25">
            <div className="border-b border-red-950 pb-3 text-center">
              <span className="text-[11px] font-mono text-red-500 uppercase tracking-widest block font-black animate-pulse">
                ⚡ CLASSIFIED COMBAT: THE DEVELOPER ⚡
              </span>
              <h2 className="text-xl font-black text-paper mt-1">
                PILIH SKILL PENDUKUNG
              </h2>
              <p className="text-xs text-slate-custom mt-1">
                Menghadapi: <strong className="text-red-500 font-bold">The Developer</strong> - HP: {maxBossHp}
              </p>
            </div>

            <div className="bg-[#11131A] p-3 border border-red-950/50 rounded-sm text-center text-xs font-mono text-red-400 my-2">
              <span>BATTLE PREPARATION: Pilih tepat <strong className="text-paper">2 Active + 1 Passive + 1 Ultimate</strong></span>
            </div>

            <div className="space-y-4 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar my-2 text-slate-custom">
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
                            ? 'bg-red-950/40 border-red-600 text-red-400 shadow-sm shadow-red-600/5'
                            : 'bg-[#11131A]/40 border-[#2D3345]/50 text-slate-custom hover:border-slate-custom/50 hover:bg-[#11131A]/70'
                        }`}
                      >
                        <div className="flex justify-between items-center">
                          <span className={`font-bold text-xs ${isSelected ? 'text-red-400' : 'text-paper'}`}>{skill.name}</span>
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
                            ? 'bg-red-950/40 border-red-600 text-red-400 shadow-sm shadow-red-600/5'
                            : 'bg-[#11131A]/40 border-[#2D3345]/50 text-slate-custom hover:border-slate-custom/50 hover:bg-[#11131A]/70'
                        }`}
                      >
                        <span className={`font-bold text-xs ${isSelected ? 'text-red-400' : 'text-paper'}`}>{skill.name}</span>
                        <p className="text-[10px] mt-1 leading-normal opacity-90">{skill.effectDescription}</p>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Ultimate list */}
              <div className="space-y-2 pt-2 border-t border-red-950/30">
                <h4 className="text-[10px] font-mono text-red-500 uppercase tracking-widest font-black flex items-center gap-1">
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
                            ? 'bg-red-950/40 border-red-600 text-red-400 shadow-md shadow-red-600/10 animate-pulse'
                            : 'bg-[#11131A]/40 border-[#2D3345]/50 text-slate-custom hover:border-red-600/55 hover:bg-[#11131A]/70'
                        }`}
                      >
                        <span className={`font-bold text-xs ${isSelected ? 'text-red-400' : 'text-paper'}`}>
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
            <div className="pt-4 border-t border-red-950 flex justify-center">
              <button
                disabled={selectedActiveSkills.length !== 2 || selectedPassiveSkills.length !== 1 || !selectedUltimateSkill}
                onClick={startBattle}
                className="w-full py-3 bg-red-700 hover:bg-red-600 disabled:bg-[#1C1F2B] disabled:text-slate-custom/60 disabled:border-[#2D3345] disabled:cursor-not-allowed text-white font-black rounded text-xs transition-all uppercase tracking-widest active:scale-95 shadow-md cursor-pointer"
              >
                Mulai Pertempuran ⚔️
              </button>
            </div>
          </div>
        )}

        {/* Defeated */}
        {gameStatus === 'defeated' && (
          <div className="glass-card max-w-md w-full p-8 rounded border border-red-600/30 bg-black/80 flex flex-col items-center justify-between text-center min-h-[300px] select-none relative">
            <div className="absolute top-0 inset-x-0 h-[2px] bg-red-600" />
            <div className="my-auto space-y-4">
              <span className="text-4xl text-red-600">💀</span>
              <h2 className="text-lg font-bold uppercase text-red-600 font-mono tracking-wider">DIHAPUS DARI SISTEM</h2>
              <p className="text-xs text-slate-custom italic leading-relaxed pt-2">
                &quot;Semuanya hanyalah barisan kode.&quot;
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
          <div className="glass-card max-w-md w-full p-8 rounded border border-amber/35 bg-black/80 flex flex-col items-center justify-between text-center min-h-[300px] select-none relative">
            <div className="absolute top-0 inset-x-0 h-[2px] bg-amber" />
            <div className="my-auto space-y-5">
              <span className="text-4xl text-amber animate-pulse">👑</span>
              <h2 className="text-lg font-bold uppercase text-amber font-mono tracking-wider">PENCIPTA DIKALAHKAN</h2>
              <p className="text-xs text-slate-custom italic leading-relaxed pt-2">
                &quot;{typedDialogue}&quot;
              </p>
            </div>
            
            {typedDialogue === dialogueText && (
              <button
                onClick={startPostCredits}
                className="w-full py-2.5 bg-amber hover:bg-amber/90 text-ink font-mono font-bold rounded text-xs uppercase tracking-widest transition-all active:scale-95 mt-6 cursor-pointer"
              >
                TERIMA KENYATAAN &gt;
              </button>
            )}
          </div>
        )}

        {/* Playing & Paused */}
        {(gameStatus === 'playing' || gameStatus === 'paused') && (
          <div className={`w-full max-w-2xl space-y-6 ${currentPhase === 'D' ? 'opacity-0 hover:opacity-100 transition-opacity duration-300' : ''}`}>
            
            {/* Arena HUD */}
            <div className={`glass-card border rounded-lg p-6 flex flex-col md:flex-row justify-between items-center gap-6 min-h-[220px] transition-colors duration-500 ${
              currentPhase === 'B' 
                ? 'border-slate-300 bg-white/70 shadow-sm' 
                : currentPhase === 'C'
                  ? 'border-red-900 bg-red-950/10 shadow-[0_0_15px_rgba(239,68,68,0.05)]'
                  : 'border-[#2D3345] bg-[#11131A]/30'
            }`}>
              
              {/* Player side */}
              <div className="flex flex-col items-center gap-2 w-full md:w-1/3 select-none">
                <span className={`text-[10px] font-mono font-bold uppercase tracking-widest ${
                  currentPhase === 'B' ? 'text-slate-600' : 'text-slate-custom'
                }`}>PEMAIN</span>
                <div className={`w-20 h-20 rounded border flex items-center justify-center text-4xl ${
                  currentPhase === 'B' ? 'border-slate-300 bg-white' : 'border-[#2D3345] bg-[#11131A]'
                }`}>
                  💻
                </div>
                
                {/* HP bar */}
                <div className="w-full space-y-1 mt-1">
                  <div className="flex justify-between text-[9px] font-mono text-slate-custom font-bold">
                    <span>HP</span>
                    <span>{playerHp}/{maxPlayerHp}</span>
                  </div>
                  <div className={`w-full h-2 rounded-full overflow-hidden border ${
                    currentPhase === 'B' ? 'bg-slate-200 border-slate-300' : 'bg-[#1A1C2C] border-[#2D3345]/60'
                  }`}>
                    <div
                      className="h-full bg-ghost-teal transition-all duration-200"
                      style={{ width: `${(playerHp / maxPlayerHp) * 100}%` }}
                    />
                  </div>
                </div>
              </div>

              <div className="text-slate-custom/30 font-bold font-mono text-sm hidden md:block">VS</div>

              {/* Boss side */}
              <div className="flex flex-col items-center gap-2 w-full md:w-1/3 select-none">
                <span className="text-[10px] text-red-500 font-mono font-bold uppercase tracking-widest">THE DEVELOPER</span>
                <PixelSprite
                  sprite={DEVELOPER_SPRITE}
                  isHurt={isBossHurt}
                  isAttacking={isBossAttacking}
                  phaseStyle={currentPhase}
                />

                {/* Boss HP Bar */}
                <div className="w-full space-y-1 mt-1">
                  <div className="flex justify-between text-[9px] font-mono text-slate-custom font-bold">
                    <span>HP</span>
                    <span>{bossHp}/{maxBossHp}</span>
                  </div>
                  <div className={`w-full h-2 rounded-full overflow-hidden border ${
                    currentPhase === 'B' ? 'bg-slate-200 border-slate-300' : 'bg-[#1A1C2C] border-[#2D3345]/60'
                  }`}>
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
                          ? 'bg-red-950/20 border-red-900 hover:bg-red-900/30 text-red-400'
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
                          ? 'bg-[#1C1F2B] border-[#2D3345] text-slate-custom/30 cursor-not-allowed animate-none'
                          : shakingUltimate
                          ? 'bg-error-custom/25 border-error-custom text-error-custom animate-shake'
                          : 'bg-red-950/30 border-red-600 hover:bg-red-900/40 text-red-500 shadow-[0_0_12px_rgba(239,68,68,0.25)] animate-pulse'
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

            {/* Input viewport container */}
            <div className={`glass-card border p-6 rounded-lg relative overflow-hidden flex flex-col items-center space-y-5 transition-colors duration-500 ${
              currentPhase === 'B' 
                ? 'border-slate-300 bg-white/70 shadow-sm' 
                : currentPhase === 'C'
                  ? 'border-red-900 bg-red-950/15'
                  : 'border-[#2D3345] bg-[#11131A]/30'
            } ${inputShake ? 'animate-shake' : ''}`}>
              
              {/* Active Ability tag */}
              {activeAbility && (
                <div className="bg-red-600/10 text-red-500 border border-red-600/30 px-2.5 py-0.5 rounded text-[10px] font-mono font-bold uppercase tracking-wider select-none animate-pulse">
                  ⚡ KEMAMPUAN: {activeAbility.replace('_', ' ')} ({abilityRotationTimer}s) ⚡
                </div>
              )}

              {/* Text box */}
              <div 
                className={`w-full min-h-[85px] flex items-center justify-center border-2 rounded-md p-4 transition-colors duration-500 ${
                  currentPhase === 'B' 
                    ? 'bg-white border-slate-300' 
                    : 'bg-[#11131A] border-[#2D3345] shadow-[inset_0_4px_12px_rgba(0,0,0,0.8)]'
                }`}
                style={
                  activeAbility === 'forgetfulness' 
                    ? { animation: 'forgetfulness-normal 4s infinite' } 
                    : undefined
                }
              >
                {renderWordCharacters()}
              </div>

              {/* Timers */}
              <div className="w-full flex flex-col gap-2.5 font-mono text-xs font-bold text-slate-custom select-none">
                
                {activeAbility !== 'copy_performance' ? (
                  <div className="w-full space-y-1">
                    <div className="flex justify-between text-[10px]">
                      <span>LIMIT KETIK</span>
                      <span className="tabular-nums">{(timeLeft / 1000).toFixed(1)}s</span>
                    </div>
                    <div className={`w-full h-1.5 rounded-full overflow-hidden ${
                      currentPhase === 'B' ? 'bg-slate-200' : 'bg-[#1A1C2C]'
                    }`}>
                      <div
                        className="h-full bg-amber transition-all duration-75"
                        style={{ width: `${(timeLeft / timeLimit) * 100}%` }}
                      />
                    </div>
                  </div>
                ) : (
                  <div className="w-full space-y-1">
                    <div className="flex justify-between text-[10px] text-red-400">
                      <span>PROGRESS DEVELOPER KETIK (COPY WPM: {doppelgangerWpm})</span>
                      <span className="tabular-nums">{Math.round(doppelgangerProgress)}%</span>
                    </div>
                    <div className={`w-full h-1.5 rounded-full overflow-hidden border ${
                      currentPhase === 'B' ? 'bg-slate-200 border-slate-300' : 'bg-[#1A1C2C] border-red-950/40'
                    }`}>
                      <div
                        className="h-full bg-red-500 transition-all duration-100"
                        style={{ width: `${doppelgangerProgress}%` }}
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>
            
            {/* Typewriter dialogue box */}
            <div className={`glass-card border p-3 rounded text-center text-xs font-mono font-bold select-none text-slate-custom transition-colors duration-500 ${
              currentPhase === 'B' ? 'border-slate-300 bg-white/70' : 'border-[#2D3345] bg-[#11131A]/30'
            }`}>
              <span className="text-red-500 font-black">{dialogueSpeaker}:</span> {typedDialogue}
            </div>

          </div>
        )}

      </main>

      {/* Footer */}
      <footer className={`w-full py-4 text-center border-t text-xs text-slate-custom select-none font-sans mt-8 transition-colors duration-500 ${
        currentPhase === 'B' ? 'border-slate-300 bg-white/50' : 'border-[#2D3345] bg-[#11131A]/10'
      }`}>
        SYSTEM ACCESS: AUTHORIZED DEVELOPER MODE ONLY.
      </footer>
    </div>
  );
}
