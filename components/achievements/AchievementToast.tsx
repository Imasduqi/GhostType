"use client";

import { useEffect, useState, useRef } from 'react';
import { Achievement, TIER_COLORS, TIER_EMOJIS } from '@/lib/achievements/achievementData';

export function AchievementToast() {
  const [queue, setQueue] = useState<Achievement[]>([]);
  const [current, setCurrent] = useState<Achievement | null>(null);
  const [visible, setVisible] = useState(false);
  const activeTimerRef = useRef<NodeJS.Timeout | null>(null);
  const slideTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Listen to client-side unlock event
  useEffect(() => {
    const handleUnlock = (e: Event) => {
      const customEvent = e as CustomEvent<Achievement>;
      if (customEvent.detail) {
        setQueue(prev => [...prev, customEvent.detail]);
      }
    };

    window.addEventListener('achievement-unlocked', handleUnlock);
    return () => {
      window.removeEventListener('achievement-unlocked', handleUnlock);
    };
  }, []);

  // Process queue sequentially
  useEffect(() => {
    if (queue.length > 0 && !current) {
      const next = queue[0];
      setQueue(prev => prev.slice(1));
      setCurrent(next);
      setVisible(true);

      // Slide out after 3.5s (allows 500ms exit animation before next toast)
      slideTimerRef.current = setTimeout(() => {
        setVisible(false);
      }, 3500);

      // Complete cycle after 4.0s
      activeTimerRef.current = setTimeout(() => {
        setCurrent(null);
      }, 4000);
    }
  }, [queue, current]);

  // Clean timers on unmount
  useEffect(() => {
    return () => {
      if (activeTimerRef.current) clearTimeout(activeTimerRef.current);
      if (slideTimerRef.current) clearTimeout(slideTimerRef.current);
    };
  }, []);

  if (!current) return null;

  const tierColor = TIER_COLORS[current.tier];
  const tierEmoji = TIER_EMOJIS[current.tier];

  return (
    <div
      className={`fixed bottom-6 right-6 z-[9999] max-w-sm w-full p-4 rounded border glass-card transition-all duration-500 ease-in-out transform shadow-3xl select-none font-sans ${
        visible ? 'translate-x-0 opacity-100' : 'translate-x-[120%] opacity-0'
      }`}
      style={{
        borderColor: tierColor,
        borderLeftWidth: '5px'
      }}
    >
      <div className="flex items-start gap-3">
        {/* Tier Medal */}
        <div
          className="w-10 h-10 rounded flex items-center justify-center text-xl shrink-0 border"
          style={{
            backgroundColor: `${tierColor}15`,
            borderColor: `${tierColor}30`,
          }}
        >
          {tierEmoji}
        </div>

        {/* Text Details */}
        <div className="flex-1 min-w-0">
          <div className="text-[10px] uppercase font-bold tracking-wider text-slate-custom mb-0.5">
            Pencapaian Terbuka!
          </div>
          <h4 className="text-sm font-black text-paper truncate mb-1 uppercase tracking-wide">
            {current.name}
          </h4>
          <p className="text-xs text-slate-custom font-medium leading-relaxed">
            {current.description}
          </p>
        </div>

        {/* Close Button */}
        <button
          onClick={() => {
            setVisible(false);
            if (activeTimerRef.current) clearTimeout(activeTimerRef.current);
            if (slideTimerRef.current) clearTimeout(slideTimerRef.current);
            activeTimerRef.current = setTimeout(() => setCurrent(null), 500);
          }}
          className="text-slate-custom hover:text-paper font-bold text-xs p-1"
        >
          ✕
        </button>
      </div>
    </div>
  );
}
