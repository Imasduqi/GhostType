import { useState, useEffect, useCallback, useRef } from 'react';
import { KeystrokeLogItem } from '@/types';
import { calculateWpm } from '@/lib/typing/calculateWpm';
import { calculateAccuracy } from '@/lib/typing/calculateAccuracy';

export interface TypedChar {
  char: string;
  correct: boolean;
}

export interface TypingEngineOptions {
  isActive?: boolean;
  onComplete?: (stats: {
    wpm: number;
    accuracy: number;
    durationMs: number;
    keystrokeLog: KeystrokeLogItem[];
  }) => void;
}

export function useTypingEngine(
  targetText: string,
  options?: TypingEngineOptions
) {
  const isActive = options?.isActive ?? true;
  const onComplete = options?.onComplete;

  const [currentIndex, setCurrentIndex] = useState(0);
  const [typedChars, setTypedChars] = useState<TypedChar[]>([]);
  const [totalCharsTyped, setTotalCharsTyped] = useState(0);
  const [isFinished, setIsFinished] = useState(false);
  const [wpm, setWpm] = useState(0);
  const [accuracy, setAccuracy] = useState(100);

  const startTimeRef = useRef<number | null>(null);
  const endTimeRef = useRef<number | null>(null);
  const keystrokeLogRef = useRef<KeystrokeLogItem[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Reset engine state
  const resetEngine = useCallback(() => {
    setCurrentIndex(0);
    setTypedChars([]);
    setTotalCharsTyped(0);
    setIsFinished(false);
    setWpm(0);
    setAccuracy(100);
    startTimeRef.current = null;
    endTimeRef.current = null;
    keystrokeLogRef.current = [];
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  // Reset engine automatically when target text changes
  useEffect(() => {
    resetEngine();
  }, [targetText, resetEngine]);

  // Update stats (WPM and Accuracy)
  const updateStats = useCallback(() => {
    if (!startTimeRef.current) return;
    const now = endTimeRef.current || Date.now();
    const durationMs = now - startTimeRef.current;
    
    // correctCount is equal to currentIndex in our strict mode
    const correctCount = currentIndex;
    
    const currentWpm = calculateWpm(correctCount, durationMs);
    const currentAccuracy = calculateAccuracy(correctCount, totalCharsTyped);
    
    setWpm(currentWpm);
    setAccuracy(currentAccuracy);
  }, [currentIndex, totalCharsTyped]);

  // Setup periodic stat updates (Requirement NF-02 - update stats at least every 100ms)
  useEffect(() => {
    if (isActive && startTimeRef.current && !isFinished) {
      timerRef.current = setInterval(() => {
        updateStats();
      }, 100);
    }
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [isActive, isFinished, updateStats]);

  // Handle keystroke events
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (!isActive || isFinished) return;

    const { key } = e;
    const now = Date.now();

    // Prevent default browser behavior for common typing game keys to avoid page scroll
    if (key === ' ' || key === 'Backspace') {
      e.preventDefault();
    }

    // 1. Backspace handling
    if (key === 'Backspace') {
      if (typedChars.length === 0) return;

      const lastIndex = typedChars.length - 1;
      const lastChar = typedChars[lastIndex];
      const newTypedChars = typedChars.slice(0, -1);
      
      setTypedChars(newTypedChars);

      if (lastChar.correct) {
        setCurrentIndex(prev => Math.max(0, prev - 1));
      } else {
        // If it was incorrect, currentIndex is already at this position, so we don't decrement
      }
      return;
    }

    // 2. Ignore non-character keys (e.g., Shift, Control, Alt, Escape, Arrow keys, etc.)
    if (key.length !== 1) return;

    // Initialize start time on the first valid character keystroke
    if (startTimeRef.current === null) {
      startTimeRef.current = now;
    }

    const relativeTime = now - startTimeRef.current;
    const expectedChar = targetText[currentIndex];

    // Check if there is already an incorrect character at the current position
    const hasIncorrect = typedChars.length === currentIndex + 1 && !typedChars[currentIndex].correct;

    // F-ENGINE-05: Prevent progress if there's an uncorrected error
    if (hasIncorrect) {
      return;
    }

    const isCorrect = key === expectedChar;

    // Append to keystroke log
    const logItem: KeystrokeLogItem = {
      char: key,
      timestamp_ms: relativeTime,
      correct: isCorrect,
    };
    keystrokeLogRef.current.push(logItem);

    // Update state
    setTypedChars(prev => [...prev, { char: key, correct: isCorrect }]);
    setTotalCharsTyped(prev => prev + 1);

    if (isCorrect) {
      const nextIndex = currentIndex + 1;
      setCurrentIndex(nextIndex);

      // F-ENGINE-08: Detect completion condition
      if (nextIndex === targetText.length) {
        setIsFinished(true);
        endTimeRef.current = now;
        if (timerRef.current) {
          clearInterval(timerRef.current);
          timerRef.current = null;
        }

        const finalDurationMs = now - startTimeRef.current;
        const finalWpm = calculateWpm(nextIndex, finalDurationMs);
        const finalAccuracy = calculateAccuracy(nextIndex, totalCharsTyped + 1);

        setWpm(finalWpm);
        setAccuracy(finalAccuracy);

        if (onComplete) {
          onComplete({
            wpm: finalWpm,
            accuracy: finalAccuracy,
            durationMs: finalDurationMs,
            keystrokeLog: keystrokeLogRef.current,
          });
        }
      }
    }
  }, [isActive, isFinished, currentIndex, typedChars, targetText, totalCharsTyped, onComplete]);

  // Sync calculations on render-dependent updates
  useEffect(() => {
    updateStats();
  }, [currentIndex, totalCharsTyped, updateStats]);

  // Register window-level keydown listener
  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleKeyDown]);

  const durationMs = startTimeRef.current 
    ? (endTimeRef.current || Date.now()) - startTimeRef.current 
    : 0;

  return {
    currentIndex,
    typedChars,
    totalCharsTyped,
    isFinished,
    wpm,
    accuracy,
    durationMs,
    keystrokeLog: keystrokeLogRef.current,
    resetEngine,
  };
}
