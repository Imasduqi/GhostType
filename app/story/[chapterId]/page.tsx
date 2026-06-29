"use client";

import { use, useState, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase/client';
import { STORY_CHAPTERS, StoryChapter, StoryBoss } from '@/lib/story/storyData';
import { BOSS_SPRITES_MAP, HERO_SPRITE } from '@/lib/story/bossSprites';
import { STORY_SKILLS, StorySkill } from '@/lib/story/skillData';
import { 
  getBossClears, 
  saveBossClear, 
  unlockCodex, 
  upsertChapterStatus, 
  getUserProfile,
  deleteBossClearsForChapter
} from '@/lib/supabase/queries';
import { Profile, StoryBossClears } from '@/types';
import { ThemeToggle } from '@/components/ThemeToggle';
import { checkAndUnlockAchievements } from '@/lib/achievements/checkAchievements';

import { wordPoolID } from '@/lib/text-generator/wordPoolID';
import { wordPoolEN } from '@/lib/text-generator/wordPoolEN';

// Boss HPs mapping
const BOSS_HP_LIMITS: Record<string, number> = {
  librarian: 80,
  typo_goblin: 100,
  syntax_spider: 120,
  sentence_warden: 150,
  silent_judge: 180,
  doppelganger: 200,
  memory_eater: 200,
  glitch_beast: 230,
  pixel_tyrant: 260,
  the_compiler: 300,
  network_phantom: 330,
  firewall_dragon: 360,
  the_origin: 250
};

// Word pools construction (words without spaces)
const rawWordsID = [
  ...wordPoolID.subjek,
  ...wordPoolID.predikat,
  ...wordPoolID.objek,
  ...wordPoolID.kataSifat
].filter(w => !w.includes(' '));

const rawWordsEN = [
  ...wordPoolEN.subjek,
  ...wordPoolEN.predikat,
  ...wordPoolEN.objek,
  ...wordPoolEN.kataSifat
].filter(w => !w.includes(' '));

const easyPoolID = rawWordsID.filter(w => w.length <= 5);
const mediumPoolID = rawWordsID.filter(w => w.length >= 6 && w.length <= 7);
const hardPoolID = rawWordsID.filter(w => w.length >= 8);

const easyPoolEN = rawWordsEN.filter(w => w.length <= 5);
const mediumPoolEN = rawWordsEN.filter(w => w.length >= 6 && w.length <= 7);
const hardPoolEN = rawWordsEN.filter(w => w.length >= 8);

// Local canvas sprite drawer
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
    transformClass = isAttacking ? 'translate-x-8 transition-transform duration-100 ease-out' : 'animate-pixel-bob';
  } else {
    transformClass = isAttacking ? '-translate-x-8 transition-transform duration-100 ease-out' : 'animate-pixel-bob';
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
        className="w-28 h-28 md:w-36 md:h-36"
      />
    </div>
  );
};

export default function ChapterBattlePage({
  params,
}: {
  params: Promise<{ chapterId: string }> | { chapterId: string };
}) {
  const router = useRouter();

  // Resolve params
  const resolvedParams = 'then' in params ? use(params) : params;
  const chapterIdNum = parseInt(resolvedParams.chapterId, 10);
  const chapter = STORY_CHAPTERS.find(c => c.id === chapterIdNum);

  // Auth States
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [authLoading, setAuthLoading] = useState(true);

  // Battle Loop States
  const [gameStatus, setGameStatus] = useState<
    'loading' | 'ch2_intro_cutscene' | 'intro' | 'skill_select' | 'playing' | 'phase_dialog' | 'defeat_dialog' | 'gameover' | 'victory_cutscene' |
    'ending_choice' | 'ending_cutscene' | 'post_credits'
  >('loading');
  const [currentBossIndex, setCurrentBossIndex] = useState(0);
  const [playerHp, setPlayerHp] = useState(100);
  const [bossHp, setBossHp] = useState(100);
  const [maxBossHp, setMaxBossHp] = useState(100);

  // Chapter 5: The Origin States
  const [originPhase, setOriginPhase] = useState<number>(1);
  const [activeOriginAbility, setActiveOriginAbility] = useState<string | null>(null);
  const [showAbilityChangedLabel, setShowAbilityChangedLabel] = useState(false);
  const [abilityRotationTimer, setAbilityRotationTimer] = useState(30);
  const [selectedEnding, setSelectedEnding] = useState<'destroy' | 'spare' | null>(null);
  const [endingDialogueFinished, setEndingDialogueFinished] = useState(false);
  const [endingCutsceneStep, setEndingCutsceneStep] = useState(0);
  const [showPostCredits, setShowPostCredits] = useState(false);
  const [isSavingEnding, setIsSavingEnding] = useState(false);
  const [postCreditsStep, setPostCreditsStep] = useState(0);
  const [postCreditsTextIndex, setPostCreditsTextIndex] = useState(0);
  const typewriterIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Typing engine state
  const [targetWord, setTargetWord] = useState('');      // actual correct word
  const [currentWord, setCurrentWord] = useState('');    // possibly modified word that must be typed
  const [typedText, setTypedText] = useState('');
  const [hasError, setHasError] = useState(false);
  const [timeLeft, setTimeLeft] = useState(0);
  const [currentWordTimeLimit, setCurrentWordTimeLimit] = useState(0);
  const [wordStartTime, setWordStartTime] = useState<number | null>(null);

  // Animations & FX
  const [isPlayerAttacking, setIsPlayerAttacking] = useState(false);
  const [isPlayerHurt, setIsPlayerHurt] = useState(false);
  const [isBossAttacking, setIsBossAttacking] = useState(false);
  const [isBossHurt, setIsBossHurt] = useState(false);
  const [isScreenShaking, setIsScreenShaking] = useState(false);
  const [inputShake, setInputShake] = useState(false);
  const [damagePopups, setDamagePopups] = useState<Array<{ id: string, amount: number, x: number, y: number, type: 'player' | 'boss' }>>([]);
  const [ultimateAnnouncement, setUltimateAnnouncement] = useState('');

  // Boss Ability variables
  const [isPhaseTriggered, setIsPhaseTriggered] = useState(false);
  const [isUltimateTriggered, setIsUltimateTriggered] = useState(false);
  
  // Chapter 1 Boss active ultimates
  const [isSilentLibraryActive, setIsSilentLibraryActive] = useState(false);
  const [isTypoStormActive, setIsTypoStormActive] = useState(false);
  const [isInfiniteWebActive, setIsInfiniteWebActive] = useState(false);
  
  // Chapter 3 & 4 Boss states
  const [isMemoryWipeWarning, setIsMemoryWipeWarning] = useState(false);
  const [isMemoryWipeActive, setIsMemoryWipeActive] = useState(false);
  const [isCorruptedFrameActive, setIsCorruptedFrameActive] = useState(false);
  const [isCartridgeCorruptionActive, setIsCartridgeCorruptionActive] = useState(false);
  const [isCompilationFailureActive, setIsCompilationFailureActive] = useState(false);
  const [isPhantomLagActive, setIsPhantomLagActive] = useState(false);
  const [isPacketLossActive, setIsPacketLossActive] = useState(false);
  const [blockedIndices, setBlockedIndices] = useState<number[]>([]);
  const [isInfernoProtocolActive, setIsInfernoProtocolActive] = useState(false);

  // Time Shield Active Skill States
  const [isTimeShieldActive, setIsTimeShieldActive] = useState(false);
  const [timeShieldTimer, setTimeShieldTimer] = useState(0);

  // Visual text delay rendering for Pixel Tyrant & Network Phantom
  const [visualTypedText, setVisualTypedText] = useState('');

  // Visual hidden characters tracker for Librarian
  const [hiddenIndices, setHiddenIndices] = useState<number[]>([]);

  // Dialogue system states
  const [activeDialogue, setActiveDialogue] = useState('');
  const [dialogueSpeaker, setDialogueSpeaker] = useState('');
  const [typedDialogueText, setTypedDialogueText] = useState('');

  // Codex unlocks
  const [codexUnlockNotify, setCodexUnlockNotify] = useState<string | null>(null);

  // Skill System States
  const [selectedActiveSkills, setSelectedActiveSkills] = useState<string[]>([]);
  const [selectedPassiveSkills, setSelectedPassiveSkills] = useState<string[]>([]);
  const [equippedActiveSkills, setEquippedActiveSkills] = useState<string[]>([]);
  const [equippedPassiveSkills, setEquippedPassiveSkills] = useState<string[]>([]);
  const [shakingSkills, setShakingSkills] = useState<Record<string, boolean>>({});
  const [selectedUltimateSkill, setSelectedUltimateSkill] = useState<string | null>(null);
  const [equippedUltimateSkill, setEquippedUltimateSkill] = useState<string | null>(null);
  const [isUltimateUsed, setIsUltimateUsed] = useState(false);
  const [shakingUltimate, setShakingUltimate] = useState(false);

  // Ultimate Skill active states
  const [wordBurstCount, setWordBurstCount] = useState(0);
  const [isTimeStopActive, setIsTimeStopActive] = useState(false);
  const [timeStopTimer, setTimeStopTimer] = useState(0);
  const [isChainBreakActive, setIsChainBreakActive] = useState(false);
  const [chainBreakTimer, setChainBreakTimer] = useState(0);
  const [chainBreakSavedAbility, setChainBreakSavedAbility] = useState<string | null>(null);
  const [isOverloadActive, setIsOverloadActive] = useState(false);
  const [overloadTimer, setOverloadTimer] = useState(0);
  
  // Skill active runtime parameters
  const [skillCooldowns, setSkillCooldowns] = useState<Record<string, number>>({});
  const [isFocusModeActive, setIsFocusModeActive] = useState(false);
  const [focusModeTimer, setFocusModeTimer] = useState(0);
  const [isAdrenalineActive, setIsAdrenalineActive] = useState(false);
  const [adrenalineTimer, setAdrenalineTimer] = useState(0);
  const [isSecondChanceActive, setIsSecondChanceActive] = useState(false);
  const [maxPlayerHp, setMaxPlayerHp] = useState(100);

  // Passive skill parameters
  const [precisionCombo, setPrecisionCombo] = useState(0);
  const [wordHasTypos, setWordHasTypos] = useState(false);

  // Chapter 2 Boss abilities & challenge parameters
  // Boss 4 Warden parameters
  const [isBackspaceLocked, setIsBackspaceLocked] = useState(false);
  const [backspaceLockTimer, setBackspaceLockTimer] = useState(0); // active countdown
  const [nextLockTimer, setNextLockTimer] = useState(20);         // next lock trigger
  const [isPrisonSentenceActive, setIsPrisonSentenceActive] = useState(false);
  const [prisonSentenceProgress, setPrisonSentenceProgress] = useState(0);

  // Boss 5 Judge parameters
  const [judgmentTypos, setJudgmentTypos] = useState(0);
  const [isFinalVerdictActive, setIsFinalVerdictActive] = useState(false);
  const [finalVerdictCount, setFinalVerdictCount] = useState(0);

  // Boss 6 Doppelganger parameters
  const [playerWpmHistory, setPlayerWpmHistory] = useState<number[]>([]);
  const [doppelgangerWpm, setDoppelgangerWpm] = useState(30);
  const [doppelgangerProgress, setDoppelgangerProgress] = useState(0);
  const [isReflectionActive, setIsReflectionActive] = useState(false);
  const [reflectionTimer, setReflectionTimer] = useState(0);

  // Statistical variables
  const [wpmHistory, setWpmHistory] = useState<number[]>([]);

  // Action references
  const currentBoss = chapter?.bosses[currentBossIndex];
  const lastFrameTimeRef = useRef<number>(0);
  
  // Refs for loop event listeners to bypass closure traps
  const typedTextRef = useRef('');
  const currentWordRef = useRef('');
  const hasErrorRef = useRef(false);
  const gameStatusRef = useRef(gameStatus);
  const equippedActiveSkillsRef = useRef<string[]>([]);
  const skillCooldownsRef = useRef<Record<string, number>>({});
  const isUltimateUsedRef = useRef(false);
  const equippedUltimateSkillRef = useRef<string | null>(null);
  const isChainBreakActiveRef = useRef(false);
  const isTimeStopActiveRef = useRef(false);
  const isOverloadActiveRef = useRef(false);
  const chainBreakSavedAbilityRef = useRef<string | null>(null);

  useEffect(() => { typedTextRef.current = typedText; }, [typedText]);
  useEffect(() => { currentWordRef.current = currentWord; }, [currentWord]);
  useEffect(() => { hasErrorRef.current = hasError; }, [hasError]);
  useEffect(() => { gameStatusRef.current = gameStatus; }, [gameStatus]);
  useEffect(() => { equippedActiveSkillsRef.current = equippedActiveSkills; }, [equippedActiveSkills]);
  useEffect(() => { skillCooldownsRef.current = skillCooldowns; }, [skillCooldowns]);
  useEffect(() => { isUltimateUsedRef.current = isUltimateUsed; }, [isUltimateUsed]);
  useEffect(() => { equippedUltimateSkillRef.current = equippedUltimateSkill; }, [equippedUltimateSkill]);
  useEffect(() => { isChainBreakActiveRef.current = isChainBreakActive; }, [isChainBreakActive]);
  useEffect(() => { isTimeStopActiveRef.current = isTimeStopActive; }, [isTimeStopActive]);
  useEffect(() => { isOverloadActiveRef.current = isOverloadActive; }, [isOverloadActive]);
  useEffect(() => { chainBreakSavedAbilityRef.current = chainBreakSavedAbility; }, [chainBreakSavedAbility]);

  // Auth checks
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session?.user) {
        const encodedRedirect = encodeURIComponent(`/story/${resolvedParams.chapterId}`);
        router.push(`/login?redirect=${encodedRedirect}`);
      } else {
        setCurrentUser(session.user);
        getUserProfile(session.user.id).then((userProfile) => {
          setProfile(userProfile);
          setAuthLoading(false);
        });
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session?.user) {
        setProfile(null);
        setCurrentUser(null);
        const encodedRedirect = encodeURIComponent(`/story/${resolvedParams.chapterId}`);
        router.push(`/login?redirect=${encodedRedirect}`);
      } else {
        setCurrentUser(session.user);
        getUserProfile(session.user.id).then((userProfile) => {
          setProfile(userProfile);
        });
      }
    });

    return () => subscription.unsubscribe();
  }, [router, resolvedParams.chapterId]);

  // Initialize chapter state from DB clears
  const initChapterProgress = useCallback(async (userId: string) => {
    if (!chapter) return;
    
    // Check if Chapter 2 cutscene needs to be shown
    if (chapterIdNum === 2 && !localStorage.getItem('ghosttype_ch2_intro_seen')) {
      setActiveDialogue(
        "Anda telah melintasi perbatasan The Broken Library...\n\n" +
        "Udara di sekitar Anda mendadak dingin dan kaku.\n" +
        "Dinding batu kelabu menjulang tinggi, dipenuhi coretan rantai huruf yang tersiksa.\n\n" +
        "Selamat datang di Grammar Prison, tempat kata-kata salah dihukum selamanya.\n" +
        "Bersiaplah, Ksatria Kata. Rantai penjara ini tidak akan terbuka dengan mudah."
      );
      setDialogueSpeaker("NARATOR");
      setGameStatus('ch2_intro_cutscene');
      setAuthLoading(false);
      return;
    }

    try {
      const clears = await getBossClears(userId);
      const clearedBossIds = new Set(clears.map(c => c.boss_id));
      
      // Find the first boss in chapter that is NOT cleared
      let startIndex = 0;
      for (let i = 0; i < chapter.bosses.length; i++) {
        if (clearedBossIds.has(chapter.bosses[i].id)) {
          startIndex = i + 1;
        } else {
          break;
        }
      }

      // If all bosses are cleared, start from boss 1 (index 0) for replayability
      if (startIndex >= chapter.bosses.length) {
        startIndex = 0;
      }

      setCurrentBossIndex(startIndex);
      const startBoss = chapter.bosses[startIndex];
      const maxHp = BOSS_HP_LIMITS[startBoss.id] || 100;
      setBossHp(maxHp);
      setMaxBossHp(maxHp);
      setPlayerHp(100);

      // Start by displaying intro dialogue
      setDialogueSpeaker(startBoss.name);
      setActiveDialogue(startBoss.dialogIntro);
      setGameStatus('intro');
      
      // Reset ability and skill states
      setIsPhaseTriggered(false);
      setIsUltimateTriggered(false);
      setIsSilentLibraryActive(false);
      setIsTypoStormActive(false);
      setIsInfiniteWebActive(false);
      
      // Reset new boss states
      setIsMemoryWipeWarning(false);
      setIsMemoryWipeActive(false);
      setIsCorruptedFrameActive(false);
      setIsCartridgeCorruptionActive(false);
      setIsCompilationFailureActive(false);
      setIsPhantomLagActive(false);
      setIsPacketLossActive(false);
      setBlockedIndices([]);
      setIsInfernoProtocolActive(false);

      // Reset Time Shield
      setIsTimeShieldActive(false);
      setTimeShieldTimer(0);
      setVisualTypedText('');

      setHiddenIndices([]);
      setSelectedActiveSkills([]);
      setSelectedPassiveSkills([]);
      setEquippedActiveSkills([]);
      setEquippedPassiveSkills([]);
      setSelectedUltimateSkill(null);
      setEquippedUltimateSkill(null);
      setIsUltimateUsed(false);
      setSkillCooldowns({});
      setIsFocusModeActive(false);
      setIsAdrenalineActive(false);
      setIsSecondChanceActive(false);
      setMaxPlayerHp(100);

      // Chapter 5 resets
      setOriginPhase(1);
      setActiveOriginAbility(null);
      setAbilityRotationTimer(30);
      setSelectedEnding(null);
      setEndingDialogueFinished(false);
      setEndingCutsceneStep(0);
      setShowPostCredits(false);
      setPostCreditsStep(0);
      setPostCreditsTextIndex(0);
    } catch (err) {
      console.error('Error initializing battle progress:', err);
    }
  }, [chapter, chapterIdNum]);

  useEffect(() => {
    if (currentUser && !authLoading && chapter) {
      initChapterProgress(currentUser.id);
    }
  }, [currentUser, authLoading, chapter, initChapterProgress]);

  // Dialogue Typewriter effect
  useEffect(() => {
    if (!activeDialogue) {
      setTypedDialogueText('');
      return;
    }
    
    setTypedDialogueText('');
    let i = 0;
    if (typewriterIntervalRef.current) clearInterval(typewriterIntervalRef.current);
    
    typewriterIntervalRef.current = setInterval(() => {
      setTypedDialogueText(prev => {
        if (i >= activeDialogue.length) {
          if (typewriterIntervalRef.current) clearInterval(typewriterIntervalRef.current);
          return prev;
        }
        const nextText = prev + activeDialogue[i];
        i++;
        return nextText;
      });
    }, 20);
    return () => {
      if (typewriterIntervalRef.current) clearInterval(typewriterIntervalRef.current);
    };
  }, [activeDialogue]);

  const handleSkipTypewriter = () => {
    if (typedDialogueText.length < activeDialogue.length) {
      if (typewriterIntervalRef.current) clearInterval(typewriterIntervalRef.current);
      setTypedDialogueText(activeDialogue);
    }
  };

  const handleDialogueBoxClick = () => {
    if (typedDialogueText.length < activeDialogue.length) {
      handleSkipTypewriter();
    } else {
      if (gameStatus === 'ending_cutscene') {
        if (endingCutsceneStep !== 2) {
          handleAdvanceEndingCutscene();
        }
      } else if (gameStatus === 'intro') {
        handleDismissIntro();
      } else if (gameStatus === 'defeat_dialog') {
        dismissDefeatDialogue();
      }
    }
  };

  // Overall index logic (1-indexed for whole story game)
  const getOverallBossLevel = (bossId: string): number => {
    switch (bossId) {
      case 'librarian': return 1;
      case 'typo_goblin': return 2;
      case 'syntax_spider': return 3;
      case 'sentence_warden': return 4;
      case 'silent_judge': return 5;
      case 'doppelganger': return 6;
      case 'memory_eater': return 7;
      case 'glitch_beast': return 8;
      case 'pixel_tyrant': return 9;
      case 'the_compiler': return 10;
      case 'network_phantom': return 11;
      case 'firewall_dragon': return 12;
      default: return 1;
    }
  };

  // Setup swaps for Typo Goblin
  const applyLetterSwaps = (word: string, pairs: number): string => {
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
  };

  // Generate next word target
  const setupNewWord = useCallback((boss: StoryBoss) => {
    if (!boss) return;
    
    const word = (() => {
      // Check Doppelganger Reflection Ultimate
      if (isReflectionActive && targetWord) {
        return targetWord;
      }

      const lang = 'id'; // Default Indonesian word pool
      const poolRaw = rawWordsID;
      const easyPool = easyPoolID;
      const mediumPool = mediumPoolID;
      const hardPool = hardPoolID;

      let pool = easyPool;
      const isHardBoss = [
        'syntax_spider', 'sentence_warden', 'silent_judge', 'doppelganger',
        'pixel_tyrant', 'the_compiler', 'network_phantom', 'firewall_dragon',
        'the_origin'
      ].includes(boss.id);

      if (isHardBoss || isInfernoProtocolActive) {
        pool = hardPool;
      } else if (['typo_goblin', 'memory_eater', 'glitch_beast'].includes(boss.id)) {
        pool = mediumPool;
      }

      if (pool.length === 0) pool = poolRaw;
      return pool[Math.floor(Math.random() * pool.length)];
    })();

    const overallLevel = getOverallBossLevel(boss.id);
    
    // Calculate buffer times
    let buffer = Math.round(300 + 1200 * Math.pow(0.9, overallLevel - 1));
    
    // Web trap debuff for Syntax Spider or The Origin active rotation
    if (boss.id === 'syntax_spider' || (boss.id === 'the_origin' && activeOriginAbility === 'web_trap')) {
      const reduction = (boss.id === 'the_origin' || isPhaseTriggered) ? 0.40 : 0.25;
      buffer = Math.round(buffer * (1 - reduction));
    }

    // Time Shield Active Skill effect: add 2 seconds (2000 ms) buffer
    if (isTimeShieldActive) {
      buffer += 2000;
    }
    
    let limit = (word.length * 400) + buffer;

    // Firewall Dragon Burn/Inferno Protocol or The Origin active rotation: timer reduced
    if (boss.id === 'firewall_dragon' || isInfernoProtocolActive || (boss.id === 'the_origin' && activeOriginAbility === 'burn')) {
      const reduction = (boss.id === 'the_origin' || isPhaseTriggered || isInfernoProtocolActive) ? 0.50 : 0.35;
      limit = Math.round(limit * (1 - reduction));
    }

    // Apply ultimate extensions/abilities
    let displayedWord = word;
    
    // Typo Goblin Swap or The Origin active rotation Ability
    if (boss.id === 'typo_goblin' || (boss.id === 'the_origin' && activeOriginAbility === 'letter_swap')) {
      // 20% normal chance, 100% during Typo Storm ultimate or final rotation
      const chance = (boss.id === 'the_origin' || isTypoStormActive) ? 1.0 : 0.20;
      if (Math.random() < chance) {
        displayedWord = applyLetterSwaps(word, (boss.id === 'the_origin' || isPhaseTriggered) ? 2 : 1);
      }
    }

    // Syntax Spider Ultimate: append 2 characters
    if (isInfiniteWebActive) {
      const alpha = 'abcdefghijklmnopqrstuvwxyz';
      const randTail = alpha[Math.floor(Math.random() * 26)] + alpha[Math.floor(Math.random() * 26)];
      displayedWord = word + randTail;
    }

    // The Compiler syntax_error ability: capitalize random characters
    if (boss.id === 'the_compiler') {
      const chars = word.split('');
      // phase: 2-3 capital letters, normal: 1 capital letter
      const capCount = isPhaseTriggered ? Math.min(3, Math.max(2, Math.floor(Math.random() * 2) + 2)) : 1;
      const indices = Array.from({ length: chars.length }, (_, i) => i);
      const shuffled = indices.sort(() => 0.5 - Math.random());
      const targetIndices = shuffled.slice(0, Math.min(capCount, chars.length));
      
      targetIndices.forEach(idx => {
        chars[idx] = chars[idx].toUpperCase();
      });
      displayedWord = chars.join('');
    }

    // Librarian or The Origin active rotation ability: hide letters visually (opacity 0)
    let hiddenIdxs: number[] = [];
    if (boss.id === 'librarian' || (boss.id === 'the_origin' && activeOriginAbility === 'missing_letter')) {
      const hideCount = (boss.id === 'the_origin' || isPhaseTriggered) ? 2 : 1;
      const indices = Array.from({ length: displayedWord.length }, (_, i) => i);
      const shuffled = indices.sort(() => 0.5 - Math.random());
      hiddenIdxs = shuffled.slice(0, Math.min(hideCount, displayedWord.length - 1));
    }

    // Network Phantom Packet Loss Ultimate: packet loss blocked indices selection
    let blockIdxs: number[] = [];
    if (isPacketLossActive) {
      const blockCount = Math.min(displayedWord.length - 1, Math.floor(Math.random() * 2) + 3); // 3 or 4 blocked letters
      const indices = Array.from({ length: displayedWord.length }, (_, i) => i);
      const shuffled = indices.sort(() => 0.5 - Math.random());
      blockIdxs = shuffled.slice(0, blockCount);
    }

    setTargetWord(boss.id === 'the_compiler' ? displayedWord : word);
    setCurrentWord(displayedWord);
    setTypedText('');
    setVisualTypedText(''); // Reset visual typed text instantly
    setHasError(false);
    setWordHasTypos(false);
    setCurrentWordTimeLimit(limit);
    setTimeLeft(limit);
    setWordStartTime(Date.now());
    setHiddenIndices(hiddenIdxs);
    setBlockedIndices(blockIdxs);

    // Reset Doppelganger word typing progress
    setDoppelgangerProgress(0);
  }, [isPhaseTriggered, isSilentLibraryActive, isTypoStormActive, isInfiniteWebActive, isReflectionActive, targetWord, isTimeShieldActive, isInfernoProtocolActive, isPacketLossActive, activeOriginAbility]);

  // Start Typing Battle gameplay
  const startBattle = () => {
    // Determine player starting HP based on passive selection
    const hasVitality = selectedPassiveSkills.includes('vitality');
    const startHp = hasVitality ? 120 : 100;
    
    setPlayerHp(startHp);
    setMaxPlayerHp(startHp);
    setEquippedActiveSkills(selectedActiveSkills);
    setEquippedPassiveSkills(selectedPassiveSkills);
    if (chapterIdNum === 5) {
      setEquippedUltimateSkill(selectedUltimateSkill);
    } else {
      setEquippedUltimateSkill(null);
    }
    setIsUltimateUsed(false);
    setWordBurstCount(0);
    setIsTimeStopActive(false);
    setTimeStopTimer(0);
    setIsChainBreakActive(false);
    setChainBreakTimer(0);
    setChainBreakSavedAbility(null);
    setIsOverloadActive(false);
    setOverloadTimer(0);

    setSkillCooldowns({});
    setIsFocusModeActive(false);
    setIsAdrenalineActive(false);
    setIsSecondChanceActive(false);
    
    // Reset judge stats
    setJudgmentTypos(0);
    setIsFinalVerdictActive(false);
    setFinalVerdictCount(0);

    // Reset warden stats
    setIsBackspaceLocked(false);
    setBackspaceLockTimer(0);
    setNextLockTimer(20);
    setIsPrisonSentenceActive(false);
    setPrisonSentenceProgress(0);

    // Reset Doppelganger WPM history
    setPlayerWpmHistory([]);
    setDoppelgangerWpm(30);
    setDoppelgangerProgress(0);
    setIsReflectionActive(false);

    setGameStatus('playing');
    if (currentBoss) {
      setupNewWord(currentBoss);
    }
  };

  // Handle player damage penalty (failure to type word in time limit)
  const handleWordTimeout = useCallback(() => {
    if (gameStatusRef.current !== 'playing' || !currentBoss) return;

    const overallLevel = getOverallBossLevel(currentBoss.id);
    let finalDmg = Math.round(15 * Math.pow(1.10, overallLevel - 1));

    // Passive: Resilience (-15% damage)
    const hasResilience = selectedPassiveSkills.includes('resilience');
    if (hasResilience) {
      finalDmg = Math.round(finalDmg * 0.85);
    }

    // Reset Precision Combo
    setPrecisionCombo(0);

    // Warden Ultimate: prison sentence challenges bypass timeout damages
    if (isPrisonSentenceActive) {
      finalDmg = 0;
      setPrisonSentenceProgress(0); // reset challenge count
    }

    setIsBossAttacking(true);
    setIsPlayerHurt(true);
    setIsScreenShaking(true);

    // Damage floating text
    const popupId = Math.random().toString();
    setDamagePopups(prev => [
      ...prev,
      { id: popupId, amount: finalDmg, x: 25 + Math.random() * 10, y: 40 + Math.random() * 10, type: 'player' }
    ]);
    setTimeout(() => {
      setDamagePopups(prev => prev.filter(p => p.id !== popupId));
    }, 800);

    setPlayerHp(prev => {
      const nextHp = Math.max(0, prev - finalDmg);
      if (nextHp <= 0) {
        // Player defeated
        setGameStatus('gameover');
        handlePlayerDefeated();
      }
      return nextHp;
    });

    setTimeout(() => {
      setIsBossAttacking(false);
      setIsPlayerHurt(false);
      setIsScreenShaking(false);
    }, 300);

    if (playerHp - finalDmg > 0) {
      setupNewWord(currentBoss);
    }
  }, [currentBoss, playerHp, setupNewWord, isPrisonSentenceActive, selectedPassiveSkills]);

  // Handle user completing the target word successfully
  const handleWordComplete = useCallback(() => {
    if (gameStatusRef.current !== 'playing' || !wordStartTime || !currentBoss) return;

    const timeLimit = currentWordTimeLimit;
    const timeTaken = Date.now() - wordStartTime;
    const remainingRatio = Math.max(0, (timeLimit - timeTaken) / timeLimit);

    // Log WPM
    const wpm = Math.round((currentWord.length / 5) / (timeTaken / 60000));
    if (wpm > 0 && wpm < 300) {
      setWpmHistory(prev => [...prev, wpm]);
      if (currentBoss.id === 'doppelganger') {
        setPlayerWpmHistory(prev => {
          const updated = [...prev, wpm].slice(-10);
          const avg = updated.reduce((s, w) => s + w, 0) / updated.length;
          // Phase 2 Doppelganger types slightly faster
          const factor = isPhaseTriggered ? 1.10 : 0.90;
          setDoppelgangerWpm(Math.round(avg * factor));
          return updated;
        });
      }
    }

    const baseDamage = currentWord.length * 2;
    const speedMultiplier = 1.0 + (1.5 * remainingRatio);
    let damage = Math.round(baseDamage * speedMultiplier);

    // Adrenaline active skill (+50% damage)
    if (isAdrenalineActive) {
      damage = Math.round(damage * 1.5);
    }

    // Word Burst Ultimate: 5 next words deal damage x3
    if (wordBurstCount > 0) {
      damage = Math.round(damage * 3);
      setWordBurstCount(prev => prev - 1);
    }

    // Precision passive skill (+10% damage on 5 consecutive typo-free words)
    const hasPrecision = selectedPassiveSkills.includes('precision');
    let precisionMultiplierApplied = false;

    if (hasPrecision) {
      if (!wordHasTypos) {
        setPrecisionCombo(prev => {
          const nextCombo = prev + 1;
          if (nextCombo >= 5) {
            precisionMultiplierApplied = true;
          }
          return nextCombo;
        });
      } else {
        setPrecisionCombo(0);
      }
    }

    if (precisionMultiplierApplied) {
      damage = Math.round(damage * 1.10);
    }

    // Double damage during Reflection Ultimate
    if (isReflectionActive) {
      damage = Math.round(damage * 2.0);
    }

    setIsPlayerAttacking(true);
    setIsBossHurt(true);

    // Floating damage text popup over boss
    const popupId = Math.random().toString();
    setDamagePopups(prev => [
      ...prev,
      { 
        id: popupId, 
        amount: damage, 
        x: 65 + Math.random() * 10, 
        y: 35 + Math.random() * 10, 
        type: 'boss' 
      }
    ]);
    setTimeout(() => {
      setDamagePopups(prev => prev.filter(p => p.id !== popupId));
    }, 800);

    // Apply damage to boss
    setBossHp(prev => {
      const nextHp = Math.max(0, prev - damage);
      
      if (currentBoss.id === 'the_origin') {
        if (originPhase === 4 && nextHp <= 25) {
          // Trigger ending choice!
          setGameStatus('ending_choice');
          setDialogueSpeaker('The Origin');
          setTypedDialogueText('');
          
          const choiceText = "Lihat sekelilingmu.\n\nJika aku hilang...\nSeluruh Lexicon Realm akan hilang bersamaku.\n\nJadi.\nApa yang akan kau pilih?";
          setActiveDialogue(choiceText);
          return 25; // lock HP at 10% (25 HP)
        }

        if (nextHp <= 0) {
          // Handle transition to next phase
          setGameStatus('phase_dialog');
          if (originPhase === 1) {
            setDialogueSpeaker('Narration');
            setActiveDialogue("Ruangan mulai retak...");
            setOriginPhase(2);
          } else if (originPhase === 2) {
            setDialogueSpeaker('Narration');
            setActiveDialogue("Semua boss yang pernah kau kalahkan muncul sebagai bayangan di langit. Mereka berbicara bersamaan:\n...Kami percaya padanya.");
            setOriginPhase(3);
          } else if (originPhase === 3) {
            setDialogueSpeaker('Narration');
            setActiveDialogue("Buku raksasa mulai terbakar.");
            setOriginPhase(4);
          }
          return 0; // Temp HP, will reset to 250 when phase actually starts
        }
        
        setupNewWord(currentBoss);
        return nextHp;
      }

      // check phase triggers (50%)
      if (nextHp <= maxBossHp * 0.50 && nextHp > 0 && !isPhaseTriggered) {
        setIsPhaseTriggered(true);
        // Pause and trigger JRPG dialogue box
        setGameStatus('phase_dialog');
        setDialogueSpeaker(currentBoss.name);
        setActiveDialogue(currentBoss.dialogPhase);
        
        // Auto resume after 2 seconds
        setTimeout(() => {
          setGameStatus('playing');
          setWordStartTime(Date.now()); // reset timer start so they don't get penalized
        }, 2200);
      }
      
      // check ultimate triggers (25%)
      if (nextHp <= maxBossHp * 0.25 && nextHp > 0 && !isUltimateTriggered) {
        setIsUltimateTriggered(true);
        triggerUltimate(currentBoss.id);
      }

      if (nextHp <= 0) {
        // Boss Defeated
        handleBossDefeated();
      } else {
        // Increment Prison Sentence count on Warden Ultimate
        if (isPrisonSentenceActive) {
          if (!wordHasTypos) {
            setPrisonSentenceProgress(p => {
              const nextVal = p + 1;
              if (nextVal >= 3) {
                setIsPrisonSentenceActive(false);
              }
              return nextVal;
            });
          } else {
            setPrisonSentenceProgress(0);
          }
        }

        setupNewWord(currentBoss);
      }

      return nextHp;
    });

    setTimeout(() => {
      setIsPlayerAttacking(false);
      setIsBossHurt(false);
    }, 300);
  }, [currentBoss, currentWord, wordStartTime, currentWordTimeLimit, isPhaseTriggered, isUltimateTriggered, maxBossHp, setupNewWord, isAdrenalineActive, selectedPassiveSkills, wordHasTypos, isReflectionActive, isPrisonSentenceActive]);

  // Ultimate activation
  const triggerUltimate = (bossId: string) => {
    let name = '';
    if (bossId === 'librarian') {
      name = 'SILENT LIBRARY';
      setIsSilentLibraryActive(true);
      setTimeout(() => setIsSilentLibraryActive(false), 8000);
    } else if (bossId === 'typo_goblin') {
      name = 'TYPO STORM';
      setIsTypoStormActive(true);
      setTimeout(() => setIsTypoStormActive(false), 10000);
    } else if (bossId === 'syntax_spider') {
      name = 'INFINITE WEB';
      setIsInfiniteWebActive(true);
      setTimeout(() => setIsInfiniteWebActive(false), 10000);
    } else if (bossId === 'sentence_warden') {
      name = 'PRISON SENTENCE';
      setIsPrisonSentenceActive(true);
      setPrisonSentenceProgress(0);
    } else if (bossId === 'silent_judge') {
      name = 'FINAL VERDICT';
      setIsFinalVerdictActive(true);
      setFinalVerdictCount(0);
    } else if (bossId === 'doppelganger') {
      name = 'REFLECTION';
      setIsReflectionActive(true);
      setReflectionTimer(15);
    } else if (bossId === 'memory_eater') {
      name = 'MEMORY WIPE';
      setIsMemoryWipeWarning(true);
      setTimeout(() => {
        setIsMemoryWipeWarning(false);
        setIsMemoryWipeActive(true);
        setTimeout(() => setIsMemoryWipeActive(false), 2000);
      }, 1000);
    } else if (bossId === 'glitch_beast') {
      name = 'CORRUPTED FRAME';
      setIsCorruptedFrameActive(true);
      setTimeout(() => setIsCorruptedFrameActive(false), 8000);
    } else if (bossId === 'pixel_tyrant') {
      name = 'CARTRIDGE CORRUPTION';
      setIsCartridgeCorruptionActive(true);
      setTimeout(() => setIsCartridgeCorruptionActive(false), 10000);
    } else if (bossId === 'the_compiler') {
      name = 'COMPILATION FAILURE';
      setIsCompilationFailureActive(true);
      setTimeout(() => setIsCompilationFailureActive(false), 10000);
    } else if (bossId === 'network_phantom') {
      name = 'PACKET LOSS';
      setIsPacketLossActive(true);
      setTimeout(() => setIsPacketLossActive(false), 8000);
    } else if (bossId === 'firewall_dragon') {
      name = 'INFERNO PROTOCOL';
      setIsInfernoProtocolActive(true);
      setTimeout(() => setIsInfernoProtocolActive(false), 12000);
    }

    setUltimateAnnouncement(name);
    setIsScreenShaking(true);
    setTimeout(() => {
      setUltimateAnnouncement('');
      setIsScreenShaking(false);
    }, 2000);
  };

  // Handles boss victory transitions
  const handleBossDefeated = async () => {
    if (!currentBoss || !currentUser) return;

    setGameStatus('defeat_dialog');
    setDialogueSpeaker(currentBoss.name);
    setActiveDialogue(currentBoss.dialogDefeat);

    try {
      // Save clear stats
      await saveBossClear({
        user_id: currentUser.id,
        boss_id: currentBoss.id,
        best_wpm: wpmHistory.length > 0 ? Math.round(wpmHistory.reduce((s, w) => s + w, 0) / wpmHistory.length) : 65,
        best_accuracy: 98,
        skills_used: selectedActiveSkills.concat(selectedPassiveSkills)
      });

      // Check achievements for boss clear
      await checkAndUnlockAchievements(currentUser.id, {
        mode: 'story_boss',
        bossId: currentBoss.id,
        playerHp: playerHp,
        maxPlayerHp: maxPlayerHp
      });

      // Unlock Codex
      await unlockCodex(currentUser.id, currentBoss.id);
      
      // Trigger notification banner
      setCodexUnlockNotify(currentBoss.name);
      setTimeout(() => setCodexUnlockNotify(null), 3000);
    } catch (e) {
      console.error('Error saving clear details:', e);
    }
  };

  // Handles player progression to next boss or chapter completion
  const dismissDefeatDialogue = async () => {
    if (!chapter) return;

    const nextIndex = currentBossIndex + 1;
    if (nextIndex < chapter.bosses.length) {
      // Advance to next boss
      setCurrentBossIndex(nextIndex);
      const nextBoss = chapter.bosses[nextIndex];
      const maxHp = BOSS_HP_LIMITS[nextBoss.id] || 100;
      setBossHp(maxHp);
      setMaxBossHp(maxHp);
      
      // Reset ability states
      setIsPhaseTriggered(false);
      setIsUltimateTriggered(false);
      setIsSilentLibraryActive(false);
      setIsTypoStormActive(false);
      setIsInfiniteWebActive(false);

      // Reset new boss states
      setIsMemoryWipeWarning(false);
      setIsMemoryWipeActive(false);
      setIsCorruptedFrameActive(false);
      setIsCartridgeCorruptionActive(false);
      setIsCompilationFailureActive(false);
      setIsPhantomLagActive(false);
      setIsPacketLossActive(false);
      setBlockedIndices([]);
      setIsInfernoProtocolActive(false);

      // Reset Time Shield/Visuals
      setIsTimeShieldActive(false);
      setTimeShieldTimer(0);
      setVisualTypedText('');
      setHiddenIndices([]);

      // Reset Judge stats
      setJudgmentTypos(0);
      setIsFinalVerdictActive(false);
      setFinalVerdictCount(0);

      // Reset Warden stats
      setIsBackspaceLocked(false);
      setBackspaceLockTimer(0);
      setNextLockTimer(20);
      setIsPrisonSentenceActive(false);
      setPrisonSentenceProgress(0);

      // Reset Doppelganger stats
      setPlayerWpmHistory([]);
      setDoppelgangerWpm(30);
      setDoppelgangerProgress(0);
      setIsReflectionActive(false);

      // Trigger dialogue for next boss
      setDialogueSpeaker(nextBoss.name);
      setActiveDialogue(nextBoss.dialogIntro);
      setGameStatus('intro');
    } else {
      // All bosses cleared -> Chapter Completion
      if (currentUser) {
        await upsertChapterStatus(currentUser.id, chapterIdNum, 'cleared');
        // Check achievements for chapter clear
        await checkAndUnlockAchievements(currentUser.id, {
          mode: 'story_chapter',
          chapterId: chapterIdNum,
          status: 'cleared'
        });
      }
      setGameStatus('victory_cutscene');
    }
  };

  // Handles player death (resets chapter progress)
  const handlePlayerDefeated = () => {
    setWordStartTime(null);
  };

  // Deletes active chapter's clears on database and resets state
  const handleResetChapter = async () => {
    if (!currentUser || !chapter) return;
    setGameStatus('loading');
    
    try {
      const chapterBossIds = chapter.bosses.map(b => b.id);
      
      // Reset database progress ONLY for this chapter's bosses
      await deleteBossClearsForChapter(currentUser.id, chapterBossIds);
      
      // Re-init state to boss 1
      setCurrentBossIndex(0);
      const firstBoss = chapter.bosses[0];
      const maxHp = BOSS_HP_LIMITS[firstBoss.id] || 100;
      setBossHp(maxHp);
      setMaxBossHp(maxHp);
      setPlayerHp(100);
      setIsPhaseTriggered(false);
      setIsUltimateTriggered(false);
      setIsSilentLibraryActive(false);
      setIsTypoStormActive(false);
      setIsInfiniteWebActive(false);
      
      // Reset new boss states
      setIsMemoryWipeWarning(false);
      setIsMemoryWipeActive(false);
      setIsCorruptedFrameActive(false);
      setIsCartridgeCorruptionActive(false);
      setIsCompilationFailureActive(false);
      setIsPhantomLagActive(false);
      setIsPacketLossActive(false);
      setBlockedIndices([]);
      setIsInfernoProtocolActive(false);

      // Reset Time Shield/Visuals
      setIsTimeShieldActive(false);
      setTimeShieldTimer(0);
      setVisualTypedText('');
      setHiddenIndices([]);

      // Reset Judge stats
      setJudgmentTypos(0);
      setIsFinalVerdictActive(false);
      setFinalVerdictCount(0);

      // Reset Warden stats
      setIsBackspaceLocked(false);
      setBackspaceLockTimer(0);
      setNextLockTimer(20);
      setIsPrisonSentenceActive(false);
      setPrisonSentenceProgress(0);

      // Reset Doppelganger stats
      setPlayerWpmHistory([]);
      setDoppelgangerWpm(30);
      setDoppelgangerProgress(0);
      setIsReflectionActive(false);

      // Chapter 5 resets
      setOriginPhase(1);
      setActiveOriginAbility(null);
      setAbilityRotationTimer(30);
      setSelectedEnding(null);
      setEndingDialogueFinished(false);
      setEndingCutsceneStep(0);
      setShowPostCredits(false);
      setPostCreditsStep(0);
      setPostCreditsTextIndex(0);

      setDialogueSpeaker(firstBoss.name);
      setActiveDialogue(firstBoss.dialogIntro);
      setGameStatus('intro');
    } catch (e) {
      console.error('Error resetting chapter progress:', e);
      setGameStatus('gameover');
    }
  };

  // Intercept key down listeners
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
        // Backspace lock check (Sentence Warden)
        if (isBackspaceLocked) {
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

      const isCorrect = (currentBoss?.id === 'the_compiler') 
        ? (e.key === expectedChar)
        : (e.key.toLowerCase() === expectedChar.toLowerCase());

      if (isCorrect) {
        const nextTyped = typedTextRef.current + expectedChar;
        setTypedText(nextTyped);

        // Overload effect: deal flat 1 damage on correct keystroke
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
        // Typo occurred
        
        // Compiler compilation_failure Ultimate logic: deal double damage immediately on typo
        if (isCompilationFailureActive && currentBoss) {
          const normalDmg = Math.round(12 * Math.pow(1.10, getOverallBossLevel(currentBoss.id) - 1));
          let finalDmg = normalDmg * 2;
          
          const hasResilience = selectedPassiveSkills.includes('resilience');
          if (hasResilience) {
            finalDmg = Math.round(finalDmg * 0.85);
          }

          setPlayerHp(prev => {
            const nextHp = Math.max(0, prev - finalDmg);
            if (nextHp <= 0) {
              setGameStatus('gameover');
              handlePlayerDefeated();
            }
            return nextHp;
          });

          const popupId = Math.random().toString();
          setDamagePopups(prev => [
            ...prev,
            { id: popupId, amount: finalDmg, x: 25 + Math.random() * 10, y: 40 + Math.random() * 10, type: 'player' }
          ]);
          setTimeout(() => {
            setDamagePopups(prev => prev.filter(p => p.id !== popupId));
          }, 800);
        }

        // Active Skill: Second Chance (negate first typo)
        if (isSecondChanceActive) {
          setIsSecondChanceActive(false);
          const popupId = Math.random().toString();
          setDamagePopups(prev => [
            ...prev,
            { id: popupId, amount: 0, x: 25, y: 35, type: 'boss' }
          ]);
          setTimeout(() => {
            setDamagePopups(prev => prev.filter(p => p.id !== popupId));
          }, 800);
          return; // typo negated!
        }

        setHasError(true);
        setWordHasTypos(true);
        setInputShake(true);
        setTimeout(() => setInputShake(false), 200);

        // Silent Judge Judgment Logic
        if (currentBoss?.id === 'silent_judge') {
          if (isFinalVerdictActive) {
            // Final verdict deals 25 damage immediately per typo
            setPlayerHp(prev => {
              const nextHp = Math.max(0, prev - 25);
              if (nextHp <= 0) {
                setGameStatus('gameover');
                handlePlayerDefeated();
              }
              return nextHp;
            });

            const popupId = Math.random().toString();
            setDamagePopups(prev => [
              ...prev,
              { id: popupId, amount: 25, x: 25 + Math.random() * 10, y: 40 + Math.random() * 10, type: 'player' }
            ]);
            setTimeout(() => {
              setDamagePopups(prev => prev.filter(p => p.id !== popupId));
            }, 800);

            setFinalVerdictCount(c => {
              const nextCount = c + 1;
              if (nextCount >= 3) {
                setIsFinalVerdictActive(false);
              }
              return nextCount;
            });
          } else {
            // Normal judgment counters
            setJudgmentTypos(prev => {
              const nextTypos = prev + 1;
              const threshold = isPhaseTriggered ? 2 : 3;
              if (nextTypos >= threshold) {
                const judgeDmg = Math.round(12 * Math.pow(1.10, getOverallBossLevel(currentBoss.id) - 1));
                setPlayerHp(p => {
                  const nextHp = Math.max(0, p - judgeDmg);
                  if (nextHp <= 0) {
                    setGameStatus('gameover');
                    handlePlayerDefeated();
                  }
                  return nextHp;
                });
                
                const popupId = Math.random().toString();
                setDamagePopups(pop => [
                  ...pop,
                  { id: popupId, amount: judgeDmg, x: 25 + Math.random() * 10, y: 40 + Math.random() * 10, type: 'player' }
                ]);
                setTimeout(() => {
                  setDamagePopups(pop => pop.filter(p => p.id !== popupId));
                }, 800);

                return 0; // reset
              }
              return nextTypos;
            });
          }
        }

        // Warden Prison Sentence Ultimate logic: reset challenge progress
        if (isPrisonSentenceActive) {
          setPrisonSentenceProgress(0);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleWordComplete, isBackspaceLocked, isSecondChanceActive, currentBoss, isFinalVerdictActive, isPhaseTriggered, isPrisonSentenceActive]);

  // Visual typed text delay logic (Pixel Tyrant lag_spike & Network Phantom latency)
  useEffect(() => {
    const isLagActive = currentBoss?.id === 'pixel_tyrant' || 
                        (currentBoss?.id === 'network_phantom' && isPhantomLagActive) ||
                        (currentBoss?.id === 'the_origin' && activeOriginAbility === 'lag_spike');
    
    if (!isLagActive || typedText === '') {
      setVisualTypedText(typedText);
      return;
    }

    const delay = (currentBoss?.id === 'pixel_tyrant' || (currentBoss?.id === 'the_origin' && activeOriginAbility === 'lag_spike'))
      ? (isPhaseTriggered ? 250 : 150) 
      : 400; // Network Phantom periodic lag spike is 400ms

    const timeout = setTimeout(() => {
      setVisualTypedText(typedText);
    }, delay);

    return () => clearTimeout(timeout);
  }, [typedText, currentBoss, isPhaseTriggered, isPhantomLagActive, activeOriginAbility]);

  // Network Phantom periodic lag spike loop
  useEffect(() => {
    if (gameStatus !== 'playing' || !currentBoss || currentBoss.id !== 'network_phantom') {
      setIsPhantomLagActive(false);
      return;
    }

    const interval = setInterval(() => {
      setIsPhantomLagActive(true);
      setTimeout(() => {
        setIsPhantomLagActive(false);
      }, 3000); // 3 seconds lag spike
    }, 20000); // every 20 seconds

    return () => clearInterval(interval);
  }, [gameStatus, currentBoss]);

  // Word countdown timer animation frame loop
  useEffect(() => {
    if (gameStatus !== 'playing' || wordStartTime === null) return;

    lastFrameTimeRef.current = Date.now();
    let frameId: number;

    const tick = () => {
      const now = Date.now();
      const delta = now - lastFrameTimeRef.current;
      lastFrameTimeRef.current = now;

      // Time Stop freezes timer speed (factor = 0). Focus Mode slows timer speed down by 30% (factor = 0.7)
      const speedFactor = isTimeStopActive ? 0.0 : (isFocusModeActive ? 0.70 : 1.0);
      
      setTimeLeft(prev => {
        const nextTime = Math.max(0, prev - (delta * speedFactor));
        if (nextTime <= 0) {
          handleWordTimeout();
          return 0;
        }
        return nextTime;
      });

      // Doppelganger progress tracking
      if (currentBoss && currentBoss.id === 'doppelganger' && !isTimeStopActive) {
        const charPerSec = (doppelgangerWpm * 5) / 60;
        const progressInc = (charPerSec / currentWordRef.current.length) * 100 * (delta / 1000);
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
  }, [gameStatus, wordStartTime, isFocusModeActive, isTimeStopActive, handleWordTimeout, currentBoss, doppelgangerWpm]);

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

      setReflectionTimer(t => {
        if (t > 0) {
          if (t === 1) setIsReflectionActive(false);
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
            setActiveOriginAbility(chainBreakSavedAbilityRef.current);
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

  // Chapter 5 Ability Rotation Timer loop (1-second interval)
  useEffect(() => {
    if (gameStatus !== 'playing' || !currentBoss || currentBoss.id !== 'the_origin') {
      setActiveOriginAbility(null);
      return;
    }

    // Set initial ability if none is active
    if (!activeOriginAbility) {
      const pool = ['missing_letter', 'letter_swap'];
      const initialAbility = pool[Math.floor(Math.random() * pool.length)];
      setActiveOriginAbility(initialAbility);
      setAbilityRotationTimer(30);
    }

    const interval = setInterval(() => {
      if (isChainBreakActiveRef.current) return;

      setAbilityRotationTimer(prev => {
        if (prev <= 1) {
          // Time to rotate ability!
          // Define pools per phase:
          let pool: string[] = [];
          if (originPhase === 1) {
            pool = ['missing_letter', 'letter_swap'];
          } else if (originPhase === 2) {
            pool = ['web_trap', 'lock_input', 'screen_distortion'];
          } else if (originPhase === 3) {
            pool = ['forgetfulness', 'lag_spike', 'letter_swap', 'burn'];
          } else {
            // Phase 4
            pool = ['missing_letter', 'letter_swap', 'web_trap', 'lock_input', 'screen_distortion', 'forgetfulness', 'lag_spike', 'burn'];
          }

          // Pick random ability (avoid current if pool size > 1)
          const candidates = pool.filter(a => a !== activeOriginAbility);
          const nextAbility = candidates.length > 0
            ? candidates[Math.floor(Math.random() * candidates.length)]
            : pool[Math.floor(Math.random() * pool.length)];

          setActiveOriginAbility(nextAbility);
          
          // Trigger label transition
          setShowAbilityChangedLabel(true);
          setTimeout(() => {
            setShowAbilityChangedLabel(false);
          }, 2500);

          // If lock_input is selected, turn on backspace lock immediately
          if (nextAbility === 'lock_input') {
            setIsBackspaceLocked(true);
            setTimeout(() => {
              setIsBackspaceLocked(false);
            }, 8000); // lock for 8 seconds
          } else {
            setIsBackspaceLocked(false);
          }

          // Return next timer limit (30s for phase 1-3, 20s for phase 4)
          return originPhase === 4 ? 20 : 30;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      clearInterval(interval);
    };
  }, [gameStatus, currentBoss, originPhase, activeOriginAbility]);

  // periodic Backspace Lock timer loop (1-second intervals for Sentence Warden)
  useEffect(() => {
    if (gameStatus !== 'playing' || !currentBoss || currentBoss.id !== 'sentence_warden') {
      setIsBackspaceLocked(false);
      setBackspaceLockTimer(0);
      setNextLockTimer(20);
      return;
    }

    const intervalSec = isPhaseTriggered ? 15 : 20;
    const durationSec = isPhaseTriggered ? 8 : 5;

    setNextLockTimer(intervalSec);

    const timer = setInterval(() => {
      setBackspaceLockTimer(active => {
        if (active > 0) {
          if (active === 1) setIsBackspaceLocked(false);
          return active - 1;
        }
        return 0;
      });

      setNextLockTimer(next => {
        if (next > 1) {
          return next - 1;
        } else {
          setIsBackspaceLocked(true);
          setBackspaceLockTimer(durationSec);
          return intervalSec; // reset
        }
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [gameStatus, currentBoss, isPhaseTriggered]);

  // Skill Selection handlers
  const handleSelectSkill = (skill: StorySkill) => {
    const allowsMultipleSkills = currentBoss?.id === 'doppelganger' || (chapterIdNum === 3 && currentBossIndex === 2) || (chapterIdNum >= 4);
    
    if (!allowsMultipleSkills) {
      if (skill.type === 'active') {
        setSelectedActiveSkills([skill.id]);
        setSelectedPassiveSkills([]);
      } else {
        setSelectedActiveSkills([]);
        setSelectedPassiveSkills([skill.id]);
      }
    } else {
      if (skill.type === 'active') {
        if (selectedActiveSkills.includes(skill.id)) {
          setSelectedActiveSkills(prev => prev.filter(id => id !== skill.id));
        } else {
          if (selectedActiveSkills.length < 2) {
            setSelectedActiveSkills(prev => [...prev, skill.id]);
          }
        }
      } else {
        if (selectedPassiveSkills.includes(skill.id)) {
          setSelectedPassiveSkills(prev => prev.filter(id => id !== skill.id));
        } else {
          if (selectedPassiveSkills.length < 1) {
            setSelectedPassiveSkills([skill.id]);
          }
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
      setIsBackspaceLocked(false);
      setBackspaceLockTimer(0);
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
        { id: popupId, amount: 20, x: 25, y: 30, type: 'boss' } // green recovery popup
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
        { id: popupId, amount: maxHp - playerHp, x: 25, y: 30, type: 'boss' } // green recovery popup
      ]);
      setTimeout(() => {
        setDamagePopups(prev => prev.filter(p => p.id !== popupId));
      }, 800);
    } else if (skillId === 'chain_break') {
      setIsChainBreakActive(true);
      setChainBreakTimer(10);
      setChainBreakSavedAbility(activeOriginAbility);
      setActiveOriginAbility(null);
      setIsBackspaceLocked(false);
      setBackspaceLockTimer(0);
    } else if (skillId === 'overload') {
      setIsOverloadActive(true);
      setOverloadTimer(10);
    }
  };

  // Close Ch2 Cutscene
  const dismissCh2Cutscene = () => {
    localStorage.setItem('ghosttype_ch2_intro_seen', 'true');
    initChapterProgress(currentUser.id);
  };

  // Chapter 5 Phase Dialogue Dismissal
  const handleDismissPhaseDialog = () => {
    if (chapterIdNum !== 5 || !currentBoss) return;
    
    // Check who was speaking
    if (dialogueSpeaker === 'Narration') {
      if (originPhase === 2) {
        setDialogueSpeaker('The Editor');
        const text = "Setiap cerita membutuhkan aturan.\nSetiap aturan membutuhkan hukuman.\nDan setiap hukuman membutuhkan pelaku.\n\nAku menulis sejarah.\nMereka hanya membacanya.";
        setActiveDialogue(text);
      } else if (originPhase === 3) {
        setDialogueSpeaker('The Narrator');
        const text = "Apa itu kebenaran?\nApakah sesuatu tetap benar...\nJika semua orang percaya kebohongan yang sama?\n\nKorupsi hanyalah nama.\nNama yang kuberikan.\nYang kalian sebut korupsi...\nAdalah perubahan.";
        setActiveDialogue(text);
      } else if (originPhase === 4) {
        setDialogueSpeaker('The Origin');
        const text = "Aku tidak menciptakan dunia ini untuk berubah.\nAku menciptakannya untuk sempurna.\nDan kesalahan adalah ancaman bagi kesempurnaan.\n\nJadi aku menghapusnya.\nLagi. Dan lagi. Dan lagi.\nSampai akhirnya...\nAku menjadi monster.";
        setActiveDialogue(text);
      }
    } else {
      // Phase starting monologue dismissed -> Start the battle!
      setBossHp(250);
      setMaxBossHp(250);
      setIsPhaseTriggered(false);
      setIsUltimateTriggered(false);
      setGameStatus('playing');
      setWordStartTime(Date.now());
      
      // Select first ability for this phase immediately
      let initialAbility = '';
      if (originPhase === 2) {
        initialAbility = 'web_trap';
      } else if (originPhase === 3) {
        initialAbility = 'forgetfulness';
      } else if (originPhase === 4) {
        initialAbility = 'lock_input';
      }
      setActiveOriginAbility(initialAbility);
      setAbilityRotationTimer(originPhase === 4 ? 20 : 30);
      setupNewWord(currentBoss);
    }
  };

  // Select Choice Option (Ending A vs Ending B)
  const handleSelectEndingOption = async (option: 'destroy' | 'spare') => {
    setSelectedEnding(option);
    setGameStatus('ending_cutscene');
    setEndingCutsceneStep(0);
    
    if (option === 'destroy') {
      setDialogueSpeaker('The Origin');
      setActiveDialogue("Bagus.\nCerita ini akhirnya memiliki akhir.");
    } else {
      setDialogueSpeaker('The Origin');
      setActiveDialogue("Aku sudah sangat lelah.\n\nKalau begitu...\nTulislah dunia yang lebih baik.");
    }
  };

  // Advance ending typewriter narrative cutscene
  const handleAdvanceEndingCutscene = () => {
    const nextStep = endingCutsceneStep + 1;
    setEndingCutsceneStep(nextStep);
    
    if (nextStep === 1) {
      setDialogueSpeaker('System');
      if (selectedEnding === 'destroy') {
        setActiveDialogue(
          "Origin lenyap.\n" +
          "Lexicon Realm runtuh.\n" +
          "Namun dari puing-puingnya lahir dunia baru.\n" +
          "Dunia yang tidak sempurna.\n" +
          "Tetapi hidup."
        );
      } else {
        setActiveDialogue(
          "Lexicon Realm diselamatkan.\n" +
          "Namun kini pemain menjadi penjaga baru dunia."
        );
      }
    } else if (nextStep === 2) {
      // Perform DB updates and achievements check now!
      if (currentUser && selectedEnding) {
        saveEndingAndTriggerAchievements(currentUser.id, selectedEnding);
      }
    }
  };

  // Save progress and trigger achievements sequentially
  const saveEndingAndTriggerAchievements = async (userId: string, ending: 'destroy' | 'spare') => {
    setIsSavingEnding(true);
    try {
      // 1. Save ending_choice to story_progress
      await upsertChapterStatus(userId, 5, 'cleared', ending);
      
      // Also save the boss clear stat
      await saveBossClear({
        user_id: userId,
        boss_id: 'the_origin',
        best_wpm: wpmHistory.length > 0 ? Math.round(wpmHistory.reduce((s, w) => s + w, 0) / wpmHistory.length) : 70,
        best_accuracy: 98,
        skills_used: selectedActiveSkills.concat(selectedPassiveSkills)
      });
      
      // 2. Call checkAndUnlockAchievements (which handles unlocking story_complete_both)
      await checkAndUnlockAchievements(userId, {
        mode: 'story_chapter',
        chapterId: 5,
        status: 'cleared',
        endingChoice: ending
      });
      
      // 3. SETELAH achievement selesai diproses, query whether story_complete_both exists in user_achievements
      const { data: unlockedAchievements } = await supabase
        .from('user_achievements')
        .select('achievement_id')
        .eq('user_id', userId);
        
      const unlockedSet = new Set<string>(unlockedAchievements?.map(a => a.achievement_id) || []);
      
      if (unlockedSet.has('story_complete_both')) {
        setShowPostCredits(true);
      } else {
        setShowPostCredits(false);
      }
    } catch (e) {
      console.error('Error saving ending choices:', e);
    } finally {
      setIsSavingEnding(false);
    }
  };

  // Finish Campaign Cutscene -> check for Post Credits
  const handleFinishCampaign = () => {
    if (showPostCredits) {
      setGameStatus('post_credits');
      setPostCreditsStep(0);
      
      // laying black screen for 3s
      setTimeout(() => {
        setPostCreditsStep(1); // shows "?"
        
        setTimeout(() => {
          setPostCreditsStep(2); // shows "Unknown"
          
          setTimeout(() => {
            setPostCreditsStep(3); // typewriter speech
            setDialogueSpeaker('Unknown');
            setActiveDialogue("Hei.");
            setPostCreditsTextIndex(1);
          }, 2000);
        }, 2000);
      }, 3000);
    } else {
      // Directly back to Menu select
      router.push('/story');
    }
  };

  // Handle post credits typewriter speech progression
  useEffect(() => {
    if (gameStatus !== 'post_credits' || postCreditsStep !== 3) return;
    
    // Check if dialogue typing has ended
    if (typedDialogueText.length >= activeDialogue.length) {
      if (postCreditsTextIndex === 1) {
        // Delay 1 second, then show next line
        const timeout = setTimeout(() => {
          setActiveDialogue("Masih ada satu cerita lagi.");
          setPostCreditsTextIndex(2);
        }, 1000);
        return () => clearTimeout(timeout);
      } else if (postCreditsTextIndex === 2) {
        // Delay 2 seconds, then fade to black/menu button screen
        const timeout = setTimeout(() => {
          setPostCreditsStep(4);
        }, 2000);
        return () => clearTimeout(timeout);
      }
    }
  }, [gameStatus, postCreditsStep, typedDialogueText, activeDialogue, postCreditsTextIndex]);

  // Dismiss Intro Dialogue -> Transition to Selection Screen or directly start Battle
  const handleDismissIntro = () => {
    if (chapterIdNum >= 2) {
      setGameStatus('skill_select');
      setSelectedActiveSkills([]);
      setSelectedPassiveSkills([]);
    } else {
      startBattle();
    }
  };

  // Helpers
  const avgSessionWpm = wpmHistory.length > 0 ? Math.round(wpmHistory.reduce((s, w) => s + w, 0) / wpmHistory.length) : 60;

  if (authLoading || gameStatus === 'loading') {
    return (
      <div className="min-h-screen bg-ink flex flex-col justify-center items-center">
        <div className="w-10 h-10 rounded-full border-4 border-[#2D3345] border-t-amber animate-spin mb-4" />
        <span className="text-sm text-slate-custom font-bold uppercase tracking-wider">Menyiapkan Arena Pertempuran...</span>
      </div>
    );
  }

  if (!chapter || !currentBoss) {
    return (
      <div className="min-h-screen bg-ink flex flex-col justify-center items-center p-6 text-center select-none">
        <h1 className="text-3xl font-black text-error-custom uppercase tracking-widest">Error 404</h1>
        <p className="text-slate-custom mt-2 mb-6">Arena pertempuran tidak ditemukan.</p>
        <Link href="/story" className="px-6 py-3 bg-[#1C1F2B] hover:bg-[#272B38] text-paper font-bold rounded border border-[#2D3345] transition-all text-xs uppercase tracking-widest">
          Kembali ke Chapter Select
        </Link>
      </div>
    );
  }

  // HUD bar percentages
  const playerHpPercent = Math.max(0, Math.min(100, Math.round((playerHp / maxPlayerHp) * 100)));
  const bossHpPercent = Math.max(0, Math.min(100, Math.round((bossHp / maxBossHp) * 100)));

  // Dynamic background logic based on Chapter 5 boss phase
  const getArenaBackgroundClass = () => {
    if (chapterIdNum !== 5 || !currentBoss || currentBoss.id !== 'the_origin') {
      return 'bg-ink';
    }
    
    switch (originPhase) {
      case 1:
        return 'bg-[#F2F4F7] transition-all duration-1000'; // light mode
      case 2:
        return 'bg-[#181A24] transition-all duration-1000'; // semi-dark
      case 3:
        return 'bg-[#090A0F] transition-all duration-1000'; // dark
      case 4:
        return 'bg-[#050608] transition-all duration-1000'; // chaos background
      default:
        return 'bg-ink';
    }
  };

  const isLightMode = chapterIdNum === 5 && originPhase === 1 && (gameStatus === 'playing' || gameStatus === 'intro' || gameStatus === 'phase_dialog' || gameStatus === 'ending_choice');

  return (
    <div className={`min-h-screen ${getArenaBackgroundClass()} flex flex-col justify-between relative overflow-hidden transition-all duration-300 ${isScreenShaking ? 'animate-shake' : ''}`}>
      {/* Background terminal lines */}
      <div className="absolute inset-0 bg-[linear-gradient(to_bottom,rgba(255,255,255,0.01)_1px,transparent_1px)] bg-[size:100%_4px] pointer-events-none -z-10" />

      {/* Chapter 4 Digital Abyss Mood Tint */}
      {chapterIdNum === 4 && (
        <div className="absolute inset-0 bg-gradient-to-b from-[#0ea5e9]/[0.05] via-transparent to-[#0ea5e9]/[0.02] pointer-events-none -z-10" />
      )}

      {/* Glitch Beast Corrupted Frame Overlay */}
      {isCorruptedFrameActive && (
        <div className="absolute inset-0 bg-ink/5 pointer-events-none z-20 overflow-hidden border border-[#5EEAD4]/10 animate-corrupted-frame">
          {/* Moving Scanlines */}
          <div className="absolute inset-0 bg-[linear-gradient(to_bottom,transparent_50%,rgba(94,234,212,0.1)_50%)] bg-[size:100%_8px] animate-scanline" />
        </div>
      )}

      {/* Navbar */}
      <nav className={`glass-panel w-full py-4 px-6 border-b sticky top-0 z-50 flex justify-between items-center select-none ${isLightMode ? 'bg-[#FFFFFF]/90 border-slate-300 text-ink' : 'border-[#2D3345]'}`}>
        <div className="flex items-center gap-4 sm:gap-6">
          <span className="flex items-center gap-2">
            <span className="text-2xl font-black tracking-tight text-amber">
              GhostType
            </span>
            <span className="text-[10px] bg-error-custom/15 text-error-custom px-2 py-0.5 rounded-sm font-bold border border-error-custom/25">
              CHAPTER 0{chapter.id}
            </span>
          </span>
        </div>

        <div className="flex items-center gap-4">
          <ThemeToggle />
          <Link
            href="/story"
            className={`px-4 py-2 rounded border text-xs font-bold transition-all cursor-pointer ${
              isLightMode 
                ? 'bg-[#E5E9F0] border-slate-300 text-slate-800 hover:bg-error-custom/10 hover:text-error-custom hover:border-error-custom/30' 
                : 'bg-[#1C1F2B] border-[#2D3345] text-slate-custom hover:bg-error-custom/10 hover:text-slate-custom'
            }`}
            onClick={(e) => {
              if (gameStatus === 'playing') {
                if (!confirm('Pertempuran sedang berjalan. Keluar akan mereset pertarungan saat ini. Lanjutkan?')) {
                  e.preventDefault();
                }
              }
            }}
          >
            Menyerah / Keluar
          </Link>
        </div>
      </nav>

      {/* Floating notifications */}
      {codexUnlockNotify && (
        <div className="fixed top-20 right-6 z-50 bg-ghost-teal/95 border-2 border-ghost-teal/20 text-ink font-bold text-xs px-4 py-3 rounded shadow-lg animate-pixel-bounce flex items-center gap-2 select-none">
          <span>📖</span> CODEX TERBUKA: {codexUnlockNotify}!
        </div>
      )}

      {/* Ultimate Warning Screen overlay */}
      {ultimateAnnouncement && (
        <div className="fixed inset-0 z-40 bg-error-custom/20 flex items-center justify-center pointer-events-none select-none">
          <div className="bg-[#0E1017] border-4 border-error-custom text-error-custom px-8 py-6 font-mono text-2xl font-black tracking-widest text-center animate-pixel-bob">
            ⚠️ BOS ULTIMATE ⚠️
            <div className="text-paper text-sm font-sans mt-2">{ultimateAnnouncement} ACTIVE!</div>
          </div>
        </div>
      )}

      {/* Main Arena */}
      <main className="flex-1 py-8 px-4 sm:px-6 lg:px-8 flex flex-col justify-center items-center relative">
        
        {/* 1. Opening Chapter 2 Typewriter Cutscene */}
        {gameStatus === 'ch2_intro_cutscene' && (
          <div className="w-full max-w-xl glass-card p-8 border border-amber/40 rounded space-y-6 text-center select-none animate-pixel-fade-in">
            <h2 className="text-2xl font-black text-amber tracking-widest">
              MEMASUKI GRAMMAR PRISON...
            </h2>
            <p className="text-sm font-mono text-paper leading-relaxed text-left whitespace-pre-line bg-[#11131A]/60 p-6 border border-[#2D3345] rounded-sm italic">
              {typedDialogueText}
            </p>
            <button
              onClick={dismissCh2Cutscene}
              className="px-8 py-3.5 bg-amber hover:bg-amber/90 text-ink font-black rounded text-xs transition-all uppercase tracking-widest active:scale-95 cursor-pointer shadow-lg shadow-amber/10"
            >
              Masuki Grammar Prison
            </button>
          </div>
        )}

        {/* 2. Skill Selection prep screen */}
        {gameStatus === 'skill_select' && (
          <div className="w-full max-w-2xl glass-card p-6 rounded border border-[#2D3345] bg-[#11131A]/95 space-y-6 select-none animate-pixel-fade-in">
            <div className="border-b border-[#2D3345] pb-3 text-center">
              {chapterIdNum === 5 ? (
                <span className="text-[11px] font-mono text-error-custom uppercase tracking-widest block font-black animate-pulse">
                  ⚡ FINAL BATTLE ⚡
                </span>
              ) : (
                <span className="text-[10px] font-mono text-slate-custom uppercase tracking-widest block">PERSIAPAN PERTEMPURAN</span>
              )}
              <h2 className="text-xl font-black text-paper mt-1">
                PILIH SKILL PENDUKUNG
              </h2>
              <p className="text-xs text-slate-custom mt-1">
                Menghadapi: <strong className="text-amber">{currentBoss.name} ({currentBoss.role})</strong> - HP: {BOSS_HP_LIMITS[currentBoss.id]}
              </p>
            </div>

            {/* Selection Guideline */}
            <div className="bg-[#11131A] p-3 border border-[#2D3345] rounded-sm text-center text-xs font-mono text-amber">
              {chapterIdNum === 5 ? (
                <span>FINAL COMBAT: Pilih tepat <strong className="text-paper">2 Active + 1 Passive + 1 Ultimate</strong></span>
              ) : !(currentBoss.id === 'doppelganger' || (chapterIdNum === 3 && currentBossIndex === 2) || (chapterIdNum >= 4)) ? (
                <span>ATURAN: Pilih tepat <strong className="text-paper">1 Skill</strong> (Active atau Passive)</span>
              ) : (
                <span>DUKUNGAN PENUH: Pilih tepat <strong className="text-paper">2 Active Skill + 1 Passive Skill</strong></span>
              )}
            </div>

            {/* Selection lists */}
            <div className="space-y-4 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
              {/* Active list */}
              <div className="space-y-2">
                <h4 className="text-[10px] font-mono text-slate-custom uppercase tracking-widest font-bold">Active Skills</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {STORY_SKILLS.filter(s => s.type === 'active').filter(s => s.id !== 'time_shield' || chapterIdNum >= 3).map(skill => {
                    const isSelected = selectedActiveSkills.includes(skill.id);
                    return (
                      <div
                        key={skill.id}
                        onClick={() => handleSelectSkill(skill)}
                        className={`p-3 rounded border text-left cursor-pointer transition-all duration-150 ${
                          isSelected
                            ? 'bg-amber/10 border-amber text-amber shadow-sm shadow-amber/5'
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
                            ? 'bg-ghost-teal/10 border-ghost-teal text-ghost-teal shadow-sm shadow-ghost-teal/5'
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

              {/* Ultimate list (Chapter 5 only) */}
              {chapterIdNum === 5 && (
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
              )}
            </div>

            {/* Launch Game Button */}
            <div className="pt-4 border-t border-[#2D3345] flex justify-center">
              <button
                disabled={(() => {
                  const allowsMultipleSkills = currentBoss.id === 'doppelganger' || (chapterIdNum === 3 && currentBossIndex === 2) || (chapterIdNum >= 4);
                  if (!allowsMultipleSkills) {
                    return (selectedActiveSkills.length + selectedPassiveSkills.length) !== 1;
                  }
                  if (chapterIdNum === 5) {
                    return selectedActiveSkills.length !== 2 || selectedPassiveSkills.length !== 1 || !selectedUltimateSkill;
                  }
                  return selectedActiveSkills.length !== 2 || selectedPassiveSkills.length !== 1;
                })()}
                onClick={startBattle}
                className="w-full sm:w-auto px-12 py-3.5 bg-amber hover:bg-amber/90 disabled:bg-[#1C1F2B] disabled:text-slate-custom/60 disabled:border-[#2D3345] disabled:cursor-not-allowed text-ink font-black rounded text-xs transition-all uppercase tracking-widest active:scale-95 shadow-md"
              >
                Mulai Pertempuran ⚔️
              </button>
            </div>
          </div>
        )}

        {/* 3. Gameover screen */}
        {gameStatus === 'gameover' && (
          <div className="absolute inset-0 bg-[#0E1017]/95 backdrop-blur-[4px] flex flex-col items-center justify-center z-30 p-6 text-center select-none">
            <h2 className="text-4xl font-black text-error-custom tracking-widest mb-2 animate-pixel-shake">
              DEFEATED
            </h2>
            <p className="text-slate-custom text-sm max-w-md mb-8 leading-relaxed">
              Ksatria Kata telah tumbang! Typo virus di wilayah <strong className="text-paper">{chapter.title}</strong> telah mengalahkan Anda. Progress Anda di chapter ini di-reset kembali ke boss pertama.
            </p>
            <div className="flex gap-4">
              <button
                onClick={handleResetChapter}
                className="px-6 py-3.5 bg-amber hover:bg-amber/90 text-ink font-black rounded text-xs uppercase tracking-wider transition-all active:scale-95 shadow-md shadow-amber/15 cursor-pointer"
              >
                Ulangi Dari Boss Pertama
              </button>
              <Link
                href="/story"
                className="px-6 py-3.5 bg-[#1C1F2B] hover:bg-[#272B38] text-paper font-bold rounded border border-[#2D3345] hover:border-error-custom/30 transition-all text-xs uppercase tracking-wider flex items-center justify-center cursor-pointer"
              >
                Kembali ke Chapter Select
              </Link>
            </div>
          </div>
        )}

        {/* 4. Victory Cutscene / Summary panel */}
        {gameStatus === 'victory_cutscene' && (
          <div className="absolute inset-0 bg-[#0E1017]/95 backdrop-blur-[6px] flex flex-col items-center justify-center z-30 p-6 text-center select-none">
            <div className="text-5xl mb-4 animate-bounce">🏆</div>
            <h2 className="text-3xl font-black text-ghost-teal tracking-widest mb-4 uppercase">
              KAMPANYE CHAPTER {chapterIdNum} SELESAI!
            </h2>
            
            <div className="w-full max-w-md bg-[#11131A] p-6 border border-[#2D3345] rounded-sm space-y-4 text-left text-xs leading-relaxed text-slate-custom">
              <h4 className="font-bold text-paper text-sm text-center border-b border-[#2D3345] pb-2">RINGKASAN KAMPANYE</h4>
              
              <div className="grid grid-cols-2 gap-3 text-center border-b border-[#2D3345]/45 pb-3">
                <div className="bg-[#0E1017] p-2 border border-[#2D3345]/50 rounded">
                  <span className="text-[9px] block">RATA-RATA SPEED</span>
                  <strong className="text-amber text-lg font-mono">{avgSessionWpm} WPM</strong>
                </div>
                <div className="bg-[#0E1017] p-2 border border-[#2D3345]/50 rounded">
                  <span className="text-[9px] block">BOS TERKALAHKAN</span>
                  <strong className="text-ghost-teal text-lg font-mono">{chapter.bosses.length}/{chapter.bosses.length}</strong>
                </div>
              </div>

              <div className="space-y-2">
                <p>
                  Dengan ketepatan jari dan kecepatan mengetik legendaris, Anda telah membebaskan wilayah <strong className="text-paper">{chapter.title}</strong> dari virus typo.
                </p>
                {chapterIdNum === 1 && (
                  <p className="text-amber font-semibold">
                    Story Mode Chapter 1 Selesai! Chapter 2: Grammar Prison kini telah terbuka. Lanjutkan perjalanan Anda!
                  </p>
                )}
                {chapterIdNum === 2 && (
                  <p className="text-amber font-semibold">
                    Story Mode Chapter 2 Selesai! Chapter 3: Corrupted Archive kini telah terbuka. Terus asah kemampuan jari Anda!
                  </p>
                )}
                {chapterIdNum === 3 && (
                  <p className="text-amber font-semibold">
                    Story Mode Chapter 3 Selesai! Chapter 4: Digital Abyss kini telah terbuka. Bersiaplah menghadapi kegelapan yang lebih pekat!
                  </p>
                )}
                {chapterIdNum === 4 && (
                  <p className="text-amber font-semibold">
                    Story Mode Chapter 4 Selesai! Chapter 5 (Final) kini telah terbuka. Persiapkan diri Anda untuk pertarungan terakhir!
                  </p>
                )}
              </div>
            </div>

            <Link
              href="/story"
              className="px-8 py-3.5 mt-8 bg-ghost-teal hover:bg-ghost-teal/90 text-ink font-black rounded text-xs uppercase tracking-wider transition-all active:scale-95 shadow-md shadow-ghost-teal/15 cursor-pointer"
            >
              Lanjutkan Perjalanan
            </Link>
          </div>
        )}

        {/* 5. Main battle interface */}
        {(gameStatus === 'intro' || gameStatus === 'playing' || gameStatus === 'phase_dialog' || 
          gameStatus === 'defeat_dialog' || gameStatus === 'ending_choice' || gameStatus === 'ending_cutscene') && (
          <div className="w-full max-w-2xl space-y-6 flex flex-col items-center">
            
            {/* HUD HUD Section */}
            <div className="w-full glass-card p-5 rounded border border-[#2D3345] flex flex-col gap-4 relative overflow-hidden select-none bg-[#11131A]/10">
              
              {/* Background grid details */}
              <div className="absolute inset-x-0 top-0 h-1 bg-[linear-gradient(to_right,var(--glass-border)_50%,transparent_50%)] bg-[size:10px_100%] opacity-40" />

              {/* Damage popup layers */}
              {damagePopups.map((popup) => (
                <div
                  key={popup.id}
                  className={`absolute z-20 font-mono font-black text-lg pointer-events-none animate-pixel-bounce-fade ${
                    popup.type === 'player' ? 'text-error-custom' : 'text-ghost-teal'
                  }`}
                  style={{ left: `${popup.x}%`, top: `${popup.y}%` }}
                >
                  {popup.amount === 0 ? 'NEGATED!' : `-${popup.amount}`}
                </div>
              ))}

              {/* Sprites Area */}
              <div className="w-full flex justify-between items-center min-h-[140px] relative px-4">
                
                {/* Player Sprite HUD */}
                <div className="flex flex-col items-center gap-1.5 w-1/3">
                  <span className="text-[9px] font-mono text-slate-custom uppercase tracking-widest">PLAYER</span>
                  <PixelSprite
                    sprite={HERO_SPRITE}
                    isHurt={isPlayerHurt}
                    isAttacking={isPlayerAttacking}
                    isPlayer={true}
                  />
                  
                  {/* Player HP HUD */}
                  <div className="w-full max-w-[120px] space-y-1">
                    <div className="flex justify-between text-[9px] font-mono font-bold">
                      <span>HP</span>
                      <span className={playerHp <= 30 ? 'text-error-custom animate-pulse' : 'text-paper'}>
                        {playerHp}/{maxPlayerHp}
                      </span>
                    </div>
                    <div className="w-full h-3 border border-[#2D3345] bg-[#11131A] p-0.5 overflow-hidden rounded-sm">
                      <div
                        className={`h-full transition-all duration-300 ${playerHp <= 30 ? 'bg-error-custom' : 'bg-ghost-teal'}`}
                        style={{ width: `${playerHpPercent}%` }}
                      />
                    </div>
                  </div>
                </div>

                {/* VS indicator */}
                <div className="text-center font-mono font-bold text-slate-custom/30 text-xs">
                  VS
                </div>

                {/* Boss Sprite HUD */}
                <div className="flex flex-col items-center gap-1.5 w-1/3">
                  <span className={`text-[9px] font-mono uppercase tracking-widest ${isLightMode ? 'text-slate-600' : 'text-slate-custom'}`}>GUARD</span>
                  {BOSS_SPRITES_MAP[currentBoss.id] && (
                    <div className="relative">
                      <div 
                        style={{
                          filter: (currentBoss.id === 'the_origin' && originPhase === 3) 
                            ? 'brightness(1.8) blur(1.5px)' 
                            : undefined
                        }}
                      >
                        <PixelSprite
                          sprite={BOSS_SPRITES_MAP[currentBoss.id]}
                          isHurt={isBossHurt}
                          isAttacking={isBossAttacking}
                          isPlayer={false}
                        />
                      </div>
                      
                      {/* Giant Eye Overlay for Phase 4 */}
                      {chapterIdNum === 5 && originPhase === 4 && (
                        <div 
                          className="absolute inset-0 pointer-events-none rounded-full flex items-center justify-center animate-pulse"
                          style={{
                            background: 'radial-gradient(circle, rgba(217,66,93,0.85) 0%, rgba(255,255,255,0.9) 30%, transparent 60%)',
                            width: '90px',
                            height: '90px',
                            left: '50%',
                            top: '50%',
                            transform: 'translate(-50%, -50%)',
                            boxShadow: '0 0 20px 5px rgba(217,66,93,0.5)',
                            mixBlendMode: 'screen',
                          }}
                        />
                      )}

                      {/* Floating Text Pages overlay for Phase 2 */}
                      {chapterIdNum === 5 && originPhase === 2 && (
                        <div className="absolute inset-0 pointer-events-none overflow-hidden select-none">
                          <span className="absolute text-[8px] font-mono text-paper/30 animate-float-page-1" style={{ top: '10%', left: '10%' }}>A</span>
                          <span className="absolute text-[9px] font-mono text-paper/20 animate-float-page-2" style={{ top: '35%', left: '5%' }}>err</span>
                          <span className="absolute text-[7px] font-mono text-paper/40 animate-float-page-3" style={{ bottom: '20%', left: '15%' }}>{'{ }'}</span>
                          <span className="absolute text-[8px] font-mono text-paper/25 animate-float-page-4" style={{ top: '15%', right: '10%' }}>typo</span>
                          <span className="absolute text-[10px] font-mono text-paper/35 animate-float-page-1" style={{ bottom: '15%', right: '5%' }}>rule</span>
                        </div>
                      )}

                      {/* Floating Text Particles overlay for Phase 3 */}
                      {chapterIdNum === 5 && originPhase === 3 && (
                        <div className="absolute inset-0 pointer-events-none overflow-hidden select-none">
                          <span className="absolute text-[6px] font-mono text-paper/40 animate-pulse animate-float-page-2" style={{ top: '5%', left: '20%' }}>*</span>
                          <span className="absolute text-[7px] font-mono text-paper/30 animate-pulse animate-float-page-3" style={{ top: '50%', left: '10%' }}>?</span>
                          <span className="absolute text-[9px] font-mono text-paper/50 animate-pulse animate-float-page-1" style={{ bottom: '10%', right: '25%' }}>#</span>
                        </div>
                      )}
                    </div>
                  )}
                  
                  {/* Boss HP HUD */}
                  <div className="w-full max-w-[120px] space-y-1">
                    <div className="flex justify-between text-[9px] font-mono font-bold">
                      <span className={`truncate max-w-[70px] ${isLightMode ? 'text-slate-800' : 'text-paper'}`}>
                        {currentBoss.id === 'the_origin' 
                          ? `The Origin (Phase ${originPhase})` 
                          : currentBoss.name}
                      </span>
                      <span className={isLightMode ? 'text-slate-800' : 'text-paper'}>{bossHp}/{maxBossHp}</span>
                    </div>
                    <div className={`w-full h-3 border p-0.5 overflow-hidden rounded-sm ${isLightMode ? 'border-slate-300 bg-slate-100' : 'border-[#2D3345] bg-[#11131A]'}`}>
                      <div
                        className="h-full bg-error-custom transition-all duration-300"
                        style={{ width: `${bossHpPercent}%` }}
                      />
                    </div>
                  </div>
                </div>

              </div>

              {/* Extra visual indicators (Warden debuffs, Precision combo tracker) */}
              {(isBackspaceLocked || isPrisonSentenceActive || isFinalVerdictActive || precisionCombo > 0 || currentBoss.id === 'doppelganger' || activeOriginAbility) && (
                <div className={`border-t pt-2 flex flex-wrap gap-2 justify-center font-mono text-[9px] font-bold select-none ${
                  isLightMode ? 'border-slate-200' : 'border-[#2D3345]/50'
                }`}>
                  {isBackspaceLocked && (
                    <span className="px-2 py-0.5 bg-error-custom/10 text-error-custom border border-error-custom/25 rounded-sm animate-pulse">
                      ⚠️ BACKSPACE TERKUNCI ({backspaceLockTimer}s) ⚠️
                    </span>
                  )}
                  {isPrisonSentenceActive && (
                    <span className="px-2 py-0.5 bg-error-custom/20 text-paper border border-error-custom rounded-sm">
                      🔒 PRISON CHALLENGE: {prisonSentenceProgress}/3 TANPA TYPO
                    </span>
                  )}
                  {isFinalVerdictActive && (
                    <span className="px-2 py-0.5 bg-error-custom/20 text-error-custom border border-error-custom/40 rounded-sm">
                      ⚖️ FINAL VERDICT: {3 - finalVerdictCount} TYPO SISA SEBELUM PINALTI
                    </span>
                  )}
                  {precisionCombo > 0 && (
                    <span className="px-2 py-0.5 bg-ghost-teal/15 text-ghost-teal border border-ghost-teal/25 rounded-sm">
                      🎯 PRECISION COMBO: {precisionCombo}
                    </span>
                  )}
                  {currentBoss.id === 'doppelganger' && (
                    <span className="px-2 py-0.5 bg-error-custom/10 text-error-custom border border-error-custom/20 rounded-sm">
                      👥 COPY WPM: {doppelgangerWpm}
                    </span>
                  )}
                  {currentBoss.id === 'network_phantom' && (
                    <span className={`px-2 py-0.5 border rounded-sm font-mono text-[9px] font-bold ${
                      isPhantomLagActive 
                        ? 'bg-error-custom/10 text-error-custom border-error-custom/20 animate-pulse' 
                        : 'bg-ghost-teal/10 text-ghost-teal border-ghost-teal/20'
                    }`}>
                      📶 PING: {isPhantomLagActive ? '400ms (HIGH)' : '15ms (NORMAL)'}
                    </span>
                  )}
                  {isCompilationFailureActive && (
                    <span className="px-2 py-0.5 bg-error-custom/10 text-error-custom border border-error-custom/20 rounded-sm animate-pulse font-mono font-bold">
                      ⚠️ COMPILATION FAILURE ACTIVE (Double typo damage!)
                    </span>
                  )}
                  {activeOriginAbility && (
                    <span className="px-2 py-0.5 bg-error-custom/15 text-error-custom border border-error-custom/30 rounded-sm animate-pulse flex items-center gap-1">
                      ⚡ ABILITY: {activeOriginAbility.replace('_', ' ').toUpperCase()} ({abilityRotationTimer}s)
                    </span>
                  )}
                </div>
              )}
            </div>

            {/* Doppelganger WPM Progress race HUD */}
            {gameStatus === 'playing' && currentBoss.id === 'doppelganger' && (
              <div className="w-full glass-card p-3 rounded border border-[#2D3345] bg-[#11131A]/20 select-none">
                <div className="w-full space-y-1">
                  <div className="flex justify-between text-[9px] font-mono font-bold text-error-custom">
                    <span>👥 DOPPELGANGER TYPING PROGRESS</span>
                    <span>{Math.round(doppelgangerProgress)}%</span>
                  </div>
                  <div className="w-full h-2 border border-[#2D3345] bg-[#0E1017] p-0.5 overflow-hidden rounded-sm">
                    <div
                      className="h-full bg-error-custom transition-all duration-75"
                      style={{ width: `${doppelgangerProgress}%` }}
                    />
                  </div>
                </div>
              </div>
            )}

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
            {gameStatus === 'playing' && (isFocusModeActive || isAdrenalineActive || isSecondChanceActive || isReflectionActive || isTimeShieldActive || isTimeStopActive || isChainBreakActive || isOverloadActive) && (
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
                {isReflectionActive && (
                  <span className="px-2.5 py-0.5 bg-error-custom/20 text-error-custom border border-error-custom/40 rounded-sm">
                    🪞 REFLECTION ACTIVE ({reflectionTimer}s): DAMAGE ×2 🪞
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

            {/* Dialogue Box or Input field */}
            <div className="w-full min-h-[160px] relative flex justify-center items-center">
              
              {/* JRPG Dialogue Box */}
              {(gameStatus === 'intro' || gameStatus === 'phase_dialog' || gameStatus === 'defeat_dialog' || gameStatus === 'ending_choice' || gameStatus === 'ending_cutscene') && (
                <div 
                  onClick={handleDialogueBoxClick}
                  className="w-full glass-card p-6 border-2 border-amber/40 rounded flex flex-col justify-between min-h-[140px] select-none animate-pixel-fade-in relative cursor-pointer"
                >
                  
                  {/* Speaker Label */}
                  <div className="absolute -top-3 left-6 px-3 py-0.5 bg-[#0E1017] border border-amber/40 rounded-sm font-mono text-[10px] font-bold text-amber uppercase tracking-wider">
                    {dialogueSpeaker}
                  </div>

                  {/* Typewritten Dialogue text */}
                  <p className="text-sm font-mono text-paper leading-relaxed mt-2 italic whitespace-pre-line">
                    "{typedDialogueText}"
                  </p>

                  {/* Action buttons */}
                  {(gameStatus === 'intro' || gameStatus === 'defeat_dialog') && (
                    <div className="w-full text-right mt-4 pt-2 border-t border-[#2D3345]/50">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          if (gameStatus === 'intro') handleDismissIntro();
                          else dismissDefeatDialogue();
                        }}
                        className="px-4 py-1.5 bg-amber hover:bg-amber/90 text-ink font-black rounded text-[10px] transition-all uppercase tracking-wider active:scale-95 cursor-pointer shadow-md shadow-amber/10"
                      >
                        {gameStatus === 'intro' ? 'Mulai Bertarung ⚔️' : 'Lanjutkan ➔'}
                      </button>
                    </div>
                  )}

                  {/* Ending Choice buttons */}
                  {gameStatus === 'ending_choice' && typedDialogueText.length >= activeDialogue.length && (
                    <div className="w-full flex flex-col sm:flex-row gap-3 justify-end mt-4 pt-2 border-t border-[#2D3345]/50">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleSelectEndingOption('destroy');
                        }}
                        className="px-4 py-2 bg-error-custom hover:bg-error-custom/90 text-paper font-black rounded text-[10px] transition-all uppercase tracking-wider active:scale-95 cursor-pointer shadow-md"
                      >
                        Hancurkan Origin (Ending A)
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleSelectEndingOption('spare');
                        }}
                        className="px-4 py-2 bg-ghost-teal hover:bg-ghost-teal/90 text-ink font-black rounded text-[10px] transition-all uppercase tracking-wider active:scale-95 cursor-pointer shadow-md"
                      >
                        Bebaskan/Selamatkan Origin (Ending B)
                      </button>
                    </div>
                  )}

                  {/* Ending Cutscene step progression buttons */}
                  {gameStatus === 'ending_cutscene' && (
                    <div className="w-full text-right mt-4 pt-2 border-t border-[#2D3345]/50">
                      {endingCutsceneStep === 2 ? (
                        isSavingEnding ? (
                          <span className="text-[10px] font-mono text-amber animate-pulse">
                            Memproses Pilihan & Achievement...
                          </span>
                        ) : (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleFinishCampaign();
                            }}
                            className="px-4 py-1.5 bg-ghost-teal hover:bg-ghost-teal/90 text-ink font-black rounded text-[10px] transition-all uppercase tracking-wider active:scale-95 cursor-pointer shadow-md"
                          >
                            Selesaikan Cerita ➔
                          </button>
                        )
                      ) : (
                        typedDialogueText.length >= activeDialogue.length && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleAdvanceEndingCutscene();
                            }}
                            className="px-4 py-1.5 bg-amber hover:bg-amber/90 text-ink font-black rounded text-[10px] transition-all uppercase tracking-wider active:scale-95 cursor-pointer shadow-md"
                          >
                            Lanjutkan ➔
                          </button>
                        )
                      )}
                    </div>
                  )}

                  {/* Auto advance info for phase dialogue */}
                  {gameStatus === 'phase_dialog' && (
                    <div className="w-full text-right mt-4 pt-2 text-[9px] font-mono text-slate-custom animate-pulse select-none">
                      Gameplay dijeda sebentar...
                    </div>
                  )}
                </div>
              )}

              {/* Active Typing Input Area */}
              {gameStatus === 'playing' && (
                <div 
                  className={`w-full glass-card p-6 border rounded flex flex-col items-center justify-center space-y-6 relative ${
                    isLightMode ? 'bg-white border-slate-300 text-ink shadow-lg shadow-black/5' : 'border-[#2D3345]'
                  } ${
                    isSilentLibraryActive ? 'opacity-30' : ''
                  } transition-opacity duration-300`}
                >
                  {/* Smooth ability changed notification label */}
                  {showAbilityChangedLabel && (
                    <div className="absolute -top-4 left-1/2 transform -translate-x-1/2 bg-amber text-ink px-3 py-1 text-[9px] font-black rounded-sm border border-amber/50 animate-bounce whitespace-nowrap z-25 shadow-md">
                      ⚡ ABILITY CHANGED: {activeOriginAbility ? activeOriginAbility.replace('_', ' ').toUpperCase() : ''} ⚡
                    </div>
                  )}
                  
                  {/* Countdown Timer Bar */}
                  <div className="w-full space-y-1">
                    <div className={`w-full h-1 rounded-full overflow-hidden ${isLightMode ? 'bg-slate-200' : 'bg-[#11131A]'}`}>
                      <div
                        className="h-full bg-amber transition-all duration-75"
                        style={{ width: `${Math.max(0, Math.min(100, (timeLeft / currentWordTimeLimit) * 100))}%` }}
                      />
                    </div>
                  </div>

                  {/* Typing Word Display */}
                  <div className={`p-4 rounded border w-full text-center relative overflow-hidden select-none ${
                    inputShake ? 'animate-shake border-error-custom/50 bg-error-custom/5' : ''
                  } ${
                    isLightMode ? 'bg-slate-50 border-slate-300' : 'bg-[#11131A]/60 border-[#2D3345]/50'
                  } ${
                    isMemoryWipeWarning ? 'border-error-custom shadow-lg shadow-error-custom/20 bg-error-custom/5 animate-pulse' : ''
                  } ${
                    isMemoryWipeActive ? 'opacity-0 scale-95' : 'opacity-100 scale-100'
                  } transition-all duration-200`}>
                    <div 
                      key={targetWord}
                      className="flex justify-center items-center flex-wrap gap-0.5"
                      style={
                        (currentBoss.id === 'memory_eater' || (currentBoss.id === 'the_origin' && activeOriginAbility === 'forgetfulness'))
                          ? {
                              animation: (isPhaseTriggered || (currentBoss.id === 'the_origin' && originPhase === 4))
                                ? 'forgetfulness-phase 4s infinite' 
                                : 'forgetfulness-normal 4s infinite'
                            }
                          : undefined
                      }
                    >
                      {renderWordCharacters()}
                    </div>
                    
                    {/* Silent Library layout overlay */}
                    {isSilentLibraryActive && (
                      <div className="text-[9px] font-mono text-slate-custom/50 absolute top-1 right-2 select-none uppercase tracking-widest animate-pulse">
                        Silent Library
                      </div>
                    )}
                  </div>

                  {/* Ability visuals descriptions */}
                  <div className={`text-[10px] font-mono select-none text-center ${isLightMode ? 'text-slate-650' : 'text-slate-custom'}`}>
                    {currentBoss.id === 'sentence_warden' && (
                      <span>Kemampuan: <strong className="text-amber">Lock Input</strong> (Menghambat Backspace secara berkala!)</span>
                    )}
                    {currentBoss.id === 'silent_judge' && (
                      <span>Kemampuan: <strong className="text-amber">Judgment</strong> (Hati-hati! Setiap typo mengisi counter damage Hakim!)</span>
                    )}
                    {currentBoss.id === 'doppelganger' && (
                      <span>Kemampuan: <strong className="text-amber">Mirror Match</strong> (Ketik cepat untuk mengalahkan salinan Anda!)</span>
                    )}
                    {currentBoss.id === 'memory_eater' && (
                      <span>Kemampuan: <strong className="text-amber">Forgetfulness</strong> (Kata memudar perlahan dari layar!)</span>
                    )}
                    {currentBoss.id === 'glitch_beast' && (
                      <span>Kemampuan: <strong className="text-amber">Screen Distortion</strong> (Karakter bergoyang mengacaukan penglihatan!)</span>
                    )}
                    {currentBoss.id === 'pixel_tyrant' && (
                      <span>Kemampuan: <strong className="text-amber">Lag Spike</strong> (Visual karakter muncul tertunda 150ms-250ms!)</span>
                    )}
                    {currentBoss.id === 'the_compiler' && (
                      <span>Kemampuan: <strong className="text-amber">Syntax Error</strong> (Wajib mengetik persis huruf kapital acak!)</span>
                    )}
                    {currentBoss.id === 'network_phantom' && (
                      <span>Kemampuan: <strong className="text-amber">Latency Spike</strong> (Lag input mendadak 400ms setiap 20 detik!)</span>
                    )}
                    {currentBoss.id === 'firewall_dragon' && (
                      <span>Kemampuan: <strong className="text-amber">Burn</strong> (Waktu pengetikan dikurangi 35%-50%!)</span>
                    )}
                    {currentBoss.id === 'the_origin' && (
                      <span>Kemampuan: <strong className="text-amber">Rotation</strong> (Fokus! Boss merotasi kemampuan acak setiap {originPhase === 4 ? '20' : '30'} detik!)</span>
                    )}
                  </div>

                </div>
              )}

            </div>

          </div>
        )}

        {/* 6. Post-Credits scene */}
        {gameStatus === 'post_credits' && (
          <div className="absolute inset-0 bg-black flex flex-col items-center justify-center z-45 p-6 text-center select-none animate-pixel-fade-in">
            
            {/* Step 1: Shows "?" */}
            {postCreditsStep === 1 && (
              <div className="text-8xl font-black text-paper/70 tracking-widest animate-pulse font-mono">
                ?
              </div>
            )}

            {/* Step 2: Shows "Unknown" */}
            {postCreditsStep === 2 && (
              <div className="text-4xl font-mono text-[#D9425D] tracking-widest font-black uppercase animate-pulse animate-pixel-fade-in">
                Unknown
              </div>
            )}

            {/* Step 3: Shows Dialogue box with Unknown typing speech */}
            {postCreditsStep === 3 && (
              <div 
                onClick={handleDialogueBoxClick}
                className="w-full max-w-xl glass-card p-6 border-2 border-[#D9425D]/40 bg-[#0A0B0F]/90 rounded flex flex-col justify-between min-h-[140px] select-none cursor-pointer relative animate-pixel-fade-in"
              >
                {/* Speaker Label */}
                <div className="absolute -top-3 left-6 px-3 py-0.5 bg-[#000000] border border-[#D9425D]/40 rounded-sm font-mono text-[10px] font-bold text-[#D9425D] uppercase tracking-wider">
                  {dialogueSpeaker}
                </div>

                {/* Typewritten text */}
                <p className="text-sm font-mono text-paper leading-relaxed mt-2 italic">
                  "{typedDialogueText}"
                </p>

                {/* Subtext info */}
                <div className="w-full text-right mt-4 pt-2 text-[9px] font-mono text-slate-custom animate-pulse">
                  Klik untuk mempercepat...
                </div>
              </div>
            )}

            {/* Step 4: Final post-credit completion card */}
            {postCreditsStep === 4 && (
              <div className="w-full max-w-md glass-card p-8 border border-ghost-teal/40 rounded space-y-6 text-center animate-pixel-fade-in bg-[#0D0E12]/95">
                <div className="text-5xl animate-bounce">✨</div>
                <h2 className="text-2xl font-black text-ghost-teal tracking-widest">
                  GHOSTTYPE STORY MODE CLEAR
                </h2>
                <p className="text-xs font-mono text-slate-custom leading-relaxed bg-[#050608] p-4 border border-[#2D3345]/50 rounded-sm italic">
                  "Terima kasih telah memainkan seluruh babak petualangan ini. Anda telah menyingkap seluruh kebenaran di Lexicon Realm."
                </p>
                <button
                  onClick={() => {
                    setGameStatus('loading');
                    router.push('/story');
                  }}
                  className="px-8 py-3.5 bg-ghost-teal hover:bg-ghost-teal/90 text-ink font-black rounded text-xs transition-all uppercase tracking-widest active:scale-95 cursor-pointer shadow-lg shadow-ghost-teal/10"
                >
                  Kembali ke Menu Utama
                </button>
              </div>
            )}
          </div>
        )}

      </main>

      {/* Footer */}
      <footer className="glass-panel w-full py-4 text-center border-t border-[#2D3345] text-xs text-slate-custom select-none font-sans">
        &copy; 2026 GhostType Typing Game. All rights reserved.
      </footer>
    </div>
  );

  // Helper helper to render word character layouts
  function renderWordCharacters() {
    if (!currentWord) return null;
    
    return currentWord.split('').map((char, index) => {
      const isTyped = index < visualTypedText.length;
      const isCurrent = index === visualTypedText.length;
      
      // Check if this index should be hidden visually (Librarian ability)
      const isHidden = hiddenIndices.includes(index) && !isTyped;

      // Check if this character is placeholder "█" for packet loss (Network Phantom Ultimate)
      const isBlocked = isPacketLossActive && blockedIndices.includes(index) && !isTyped;
      
      let colorClass = isLightMode ? 'text-slate-700 font-medium' : 'text-slate-custom';
      if (isTyped) {
        colorClass = 'text-ghost-teal font-black';
      } else if (isCurrent && hasError) {
        colorClass = 'text-error-custom bg-error-custom/20 border-b border-error-custom';
      } else if (isCurrent) {
        colorClass = `${isLightMode ? 'text-slate-900' : 'text-paper'} border-b border-amber animate-pulse`;
      }

      // Glitch Beast screen_distortion style & animation
      const isGlitchBeast = currentBoss?.id === 'glitch_beast' || (currentBoss?.id === 'the_origin' && activeOriginAbility === 'screen_distortion');
      const distortionAnimation = isGlitchBeast 
        ? ((isPhaseTriggered || (currentBoss?.id === 'the_origin' && originPhase === 4)) ? 'glitch-distortion-phase 0.15s infinite' : 'glitch-distortion-normal 0.25s infinite')
        : undefined;

      // Pixel Tyrant cartridge_corruption blink
      const isCartridgeBlink = isCartridgeCorruptionActive && ((index * 7) % 10 < 3);
      const blinkAnimation = isCartridgeBlink ? 'cartridge-blink 0.3s step-end infinite' : undefined;

      // Combined animations
      const combinedAnimations = [distortionAnimation, blinkAnimation].filter(Boolean).join(', ');
      
      const style: React.CSSProperties = {
        opacity: isHidden ? 0.05 : 1,
        animation: combinedAnimations || undefined,
        animationDelay: isGlitchBeast 
          ? `${index * 0.03}s` 
          : isCartridgeBlink 
            ? `${(index * 45) % 300}ms` 
            : undefined,
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
  }
}
