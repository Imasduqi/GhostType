"use client";

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase/client';
import { STORY_CHAPTERS, StoryChapter, StoryBoss } from '@/lib/story/storyData';
import { 
  getStoryProgress, 
  getBossClears, 
  upsertChapterStatus, 
  getUserProfile 
} from '@/lib/supabase/queries';
import { Profile, StoryProgress, StoryBossClears } from '@/types';
import { ThemeToggle } from '@/components/ThemeToggle';
import { BOSS_SPRITES_MAP } from '@/lib/story/bossSprites';
import { useRef } from 'react';

// Canvas-based sprite renderer (local helper)
const PixelSprite = ({
  sprite,
  scale = 1,
  hueShift = 0,
}: {
  sprite: string[];
  scale?: number;
  hueShift?: number;
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
          ctx.fillStyle = palette[char];
          ctx.fillRect(c * pixelSize, r * pixelSize, pixelSize, pixelSize);
        }
      }
    }
  }, [sprite]);

  const style: React.CSSProperties = {
    transform: `scale(${scale})`,
    filter: hueShift ? `hue-rotate(${hueShift}deg)` : undefined,
    imageRendering: 'pixelated',
  };

  return (
    <div className="relative animate-pixel-bob" style={style}>
      <canvas
        ref={canvasRef}
        width={128}
        height={128}
        className="w-32 h-32 md:w-40 md:h-40"
      />
    </div>
  );
};

export default function StoryPage() {
  const router = useRouter();

  // Auth States
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [authLoading, setAuthLoading] = useState(true);

  // Data States
  const [storyProgress, setStoryProgress] = useState<StoryProgress[]>([]);
  const [bossClears, setBossClears] = useState<StoryBossClears[]>([]);
  const [dataLoading, setDataLoading] = useState(true);
  const [updatingProgress, setUpdatingProgress] = useState(false);
  const [selectedCodexBoss, setSelectedCodexBoss] = useState<StoryBoss | null>(null);

  // Fetch current user and profile
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session?.user) {
        const encodedRedirect = encodeURIComponent('/story');
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
        const encodedRedirect = encodeURIComponent('/story');
        router.push(`/login?redirect=${encodedRedirect}`);
      } else {
        setCurrentUser(session.user);
        getUserProfile(session.user.id).then((userProfile) => {
          setProfile(userProfile);
        });
      }
    });

    return () => subscription.unsubscribe();
  }, [router]);

  // Load progress and clears from Supabase
  const loadStoryData = useCallback(async (userId: string) => {
    setDataLoading(true);
    try {
      const [progress, clears] = await Promise.all([
        getStoryProgress(userId),
        getBossClears(userId)
      ]);
      setStoryProgress(progress);
      setBossClears(clears);
    } catch (error) {
      console.error('Error loading story data:', error);
    } finally {
      setDataLoading(false);
    }
  }, []);

  useEffect(() => {
    if (currentUser) {
      loadStoryData(currentUser.id);
    }
  }, [currentUser, loadStoryData]);

  // Check and update chapter progress automatically
  useEffect(() => {
    if (dataLoading || authLoading || !currentUser || updatingProgress) return;

    const checkAndSyncProgress = async () => {
      setUpdatingProgress(true);
      try {
        const clearedBossIds = new Set(bossClears.map(c => c.boss_id));
        let progressChanged = false;

        // Verify all chapters dynamically
        for (let i = 0; i < STORY_CHAPTERS.length; i++) {
          const ch = STORY_CHAPTERS[i];
          const chProgress = storyProgress.find(p => p.chapter_id === ch.id);
          const allBossesCleared = ch.bosses.every(b => clearedBossIds.has(b.id));

          // A chapter's entry is open if it is Chapter 1 OR if the previous chapter is cleared
          let isPrevCleared = true;
          if (i > 0) {
            const prevCh = STORY_CHAPTERS[i - 1];
            const prevChProgress = storyProgress.find(p => p.chapter_id === prevCh.id);
            const prevAllCleared = prevCh.bosses.every(b => clearedBossIds.has(b.id));
            isPrevCleared = prevAllCleared || prevChProgress?.status === 'cleared';
          }

          if (isPrevCleared) {
            if (allBossesCleared && (!chProgress || chProgress.status !== 'cleared')) {
              await upsertChapterStatus(currentUser.id, ch.id, 'cleared');
              progressChanged = true;
            } else if (!allBossesCleared && (!chProgress || chProgress.status === 'locked')) {
              await upsertChapterStatus(currentUser.id, ch.id, 'in_progress');
              progressChanged = true;
            }
          } else {
            if (!chProgress || chProgress.status !== 'locked') {
              await upsertChapterStatus(currentUser.id, ch.id, 'locked');
              progressChanged = true;
            }
          }
        }

        if (progressChanged) {
          // Re-fetch progress records
          const updatedProgress = await getStoryProgress(currentUser.id);
          setStoryProgress(updatedProgress);
        }
      } catch (err) {
        console.error('Error syncing story progress:', err);
      } finally {
        setUpdatingProgress(false);
      }
    };

    checkAndSyncProgress();
  }, [bossClears, storyProgress, currentUser, dataLoading, authLoading, updatingProgress]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/login');
  };

  // Helper selectors
  const getChapterStatus = (chapterId: number): 'locked' | 'in_progress' | 'cleared' => {
    if (chapterId === 1) {
      const progress = storyProgress.find(p => p.chapter_id === 1);
      return progress ? (progress.status as any) : 'in_progress';
    }

    // Locked if previous chapter is not cleared
    const prevProgress = storyProgress.find(p => p.chapter_id === chapterId - 1);
    const prevCleared = prevProgress && prevProgress.status === 'cleared';
    if (!prevCleared) return 'locked';

    const progress = storyProgress.find(p => p.chapter_id === chapterId);
    return progress ? (progress.status as any) : 'in_progress';
  };

  const getChapterClearCount = (chapter: StoryChapter): number => {
    const clearedBossIds = new Set(bossClears.map(c => c.boss_id));
    return chapter.bosses.filter(b => clearedBossIds.has(b.id)).length;
  };

  if (authLoading || dataLoading) {
    return (
      <div className="min-h-screen bg-ink flex flex-col justify-center items-center">
        <div className="w-10 h-10 rounded-full border-4 border-[#2D3345] border-t-amber animate-spin mb-4" />
        <span className="text-sm text-slate-custom font-bold uppercase tracking-wider">Memuat Data Kampanye...</span>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-ink flex flex-col justify-between relative overflow-hidden">
      {/* Terminal grid overlay lines */}
      <div className="absolute inset-0 bg-[linear-gradient(to_bottom,rgba(255,255,255,0.01)_1px,transparent_1px)] bg-[size:100%_4px] pointer-events-none -z-10" />

      {/* Navbar */}
      <nav className="glass-panel w-full py-4 px-6 border-b border-[#2D3345] sticky top-0 z-50 flex justify-between items-center select-none">
        <div className="flex items-center gap-4 sm:gap-6">
          <Link href="/" className="flex items-center gap-2 group">
            <span className="text-2xl font-black tracking-tight text-amber group-hover:text-amber/90 transition-colors">
              GhostType
            </span>
            <span className="text-[10px] bg-amber/15 text-amber px-2 py-0.5 rounded-sm font-bold border border-amber/25">
              CAMPAIGN
            </span>
          </Link>
          <div className="flex items-center gap-3 sm:gap-4 border-l border-[#2D3345] pl-4 sm:pl-6">
            <Link href="/" className="text-slate-custom hover:text-amber text-xs sm:text-sm font-bold transition-colors">
              Beranda
            </Link>
            <Link href="/leaderboard" className="text-slate-custom hover:text-amber text-xs sm:text-sm font-bold transition-colors">
              Leaderboard
            </Link>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <ThemeToggle />
          {profile && (
            <div className="flex items-center gap-3">
              <div className="text-right hidden sm:block">
                <div className="text-sm font-bold text-paper">{profile.username}</div>
                <div className="text-[10px] text-slate-custom font-medium">Ksatria Kata</div>
              </div>
              <img
                src={profile.avatar_url || 'https://api.dicebear.com/7.x/bottts/svg'}
                alt="Avatar"
                className="w-9 h-9 rounded-sm border border-[#2D3345] bg-[#11131A] object-cover"
              />
              <button
                onClick={handleLogout}
                className="px-4 py-2 bg-[#1C1F2B] hover:bg-error-custom/10 text-slate-custom hover:text-error-custom rounded border border-[#2D3345] hover:border-error-custom/30 text-xs font-bold transition-all cursor-pointer active:scale-95"
              >
                Logout
              </button>
            </div>
          )}
        </div>
      </nav>

      {/* Main Container */}
      <main className="flex-1 py-12 px-4 sm:px-6 lg:px-8 flex flex-col justify-center items-center">
        <div className="w-full max-w-4xl space-y-8">
          
          {/* Breadcrumbs and Title */}
          <div className="space-y-2 text-center sm:text-left select-none">
            <div className="flex items-center justify-center sm:justify-start gap-2 text-xs text-slate-custom font-bold uppercase tracking-wider">
              <Link href="/" className="hover:text-amber transition-colors">MAIN MENU</Link>
              <span>/</span>
              <span className="text-amber">STORY MODE</span>
            </div>
            <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-paper">
              Lexicon Kampanye
            </h1>
            <p className="text-sm text-slate-custom max-w-2xl leading-relaxed">
              Jelajahi dunia Lexicon Realm, hadapi bos-bos yang terkorupsi oleh virus typo secara berurutan. Selesaikan satu chapter untuk membuka gerbang ke wilayah berikutnya. Kalah akan mengembalikanmu ke tantangan pertama di chapter tersebut.
            </p>
          </div>

          {/* Chapters Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {STORY_CHAPTERS.map((chapter) => {
              const status = getChapterStatus(chapter.id);
              const clearCount = getChapterClearCount(chapter);
              const totalBosses = chapter.bosses.length;
              const isLocked = status === 'locked';

              const clearedBossIds = new Set(bossClears.map(c => c.boss_id));

              return (
                <div 
                  key={chapter.id}
                  className={`glass-card rounded border relative flex flex-col justify-between overflow-hidden transition-all duration-300 ${
                    isLocked 
                      ? 'border-[#2D3345]/40 opacity-70 select-none' 
                      : 'border-[#2D3345] hover:border-amber/40 hover:shadow-lg hover:shadow-amber/5'
                  }`}
                >
                  {/* Lock Screen Overlay for Visual feedback */}
                  {isLocked && (() => {
                    const prevChapter = STORY_CHAPTERS.find(c => c.id === chapter.id - 1);
                    const prevTitle = prevChapter ? prevChapter.title : `Chapter 0${chapter.id - 1}`;
                    return (
                      <div className="absolute inset-0 bg-[#0E1017]/85 backdrop-blur-[2px] flex flex-col items-center justify-center z-10 p-6 text-center">
                        <div className="w-12 h-12 rounded-full bg-[#1C1F2B] border border-[#2D3345] flex items-center justify-center text-slate-custom mb-3">
                          <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
                          </svg>
                        </div>
                        <h4 className="text-sm font-black uppercase text-paper tracking-wider">Chapter Terkunci</h4>
                        <p className="text-xs text-slate-custom mt-1 max-w-[240px]">
                          Selesaikan seluruh bos di {prevTitle} untuk membuka gerbang {chapter.title}.
                        </p>
                      </div>
                    );
                  })()}

                  {/* Card Header & Body */}
                  <div className="p-6 space-y-4">
                    {/* Badge Chapter & Status */}
                    <div className="flex justify-between items-center text-xs font-bold font-mono">
                      <span className="text-slate-custom uppercase tracking-widest text-[10px]">
                        CHAPTER 0{chapter.id}
                      </span>
                      {status === 'cleared' ? (
                        <span className="px-2 py-0.5 rounded-sm bg-ghost-teal/15 text-ghost-teal border border-ghost-teal/25 uppercase text-[9px]">
                          Cleared
                        </span>
                      ) : status === 'in_progress' ? (
                        <span className="px-2 py-0.5 rounded-sm bg-amber/15 text-amber border border-amber/25 uppercase text-[9px] animate-pulse">
                          In Progress
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-sm bg-slate-custom/15 text-slate-custom border border-slate-custom/25 uppercase text-[9px]">
                          Locked
                        </span>
                      )}
                    </div>

                    {/* Chapter Title */}
                    <div>
                      <h3 className="text-xl font-black text-paper leading-tight group-hover:text-amber transition-colors">
                        {chapter.title}
                      </h3>
                      <p className="text-xs text-slate-custom mt-1 leading-relaxed">
                        {chapter.description}
                      </p>
                    </div>

                    {/* Bosses Sublist Details */}
                    <div className="space-y-2 border-t border-[#2D3345]/50 pt-4">
                      <div className="text-[10px] uppercase tracking-wider font-bold text-slate-custom mb-1">
                        Daftar Penjaga (Boss List)
                      </div>
                      <div className="space-y-1.5 font-sans">
                        {chapter.bosses.map((boss: StoryBoss, idx: number) => {
                          const isBossCleared = clearedBossIds.has(boss.id);
                          // A boss is unlocked if it's the first boss or if the previous boss was cleared
                          const isBossUnlocked = idx === 0 || clearedBossIds.has(chapter.bosses[idx - 1].id);

                          return (
                            <div 
                              key={boss.id} 
                              className={`flex justify-between items-center p-2 rounded text-xs border ${
                                isBossCleared 
                                  ? 'bg-ghost-teal/5 border-ghost-teal/10 text-ghost-teal/90' 
                                  : isBossUnlocked
                                    ? 'bg-amber/5 border-amber/10 text-amber'
                                    : 'bg-[#11131A]/30 border-[#2D3345]/40 text-slate-custom/40'
                              }`}
                            >
                              <div className="flex flex-col">
                                <span className="font-bold">{boss.name}</span>
                                <span className={`text-[10px] font-medium opacity-80 ${isBossCleared ? 'text-ghost-teal/70' : isBossUnlocked ? 'text-amber/70' : 'text-slate-custom/50'}`}>
                                  {boss.role}
                                </span>
                              </div>
                              <div className="flex items-center gap-1.5 font-mono text-[10px] font-bold">
                                {isBossCleared ? (
                                  <div className="flex items-center gap-2">
                                    <span className="flex items-center gap-0.5 text-ghost-teal">
                                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="3" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                                      </svg>
                                      CLEARED
                                    </span>
                                    <button
                                      onClick={(e) => {
                                        e.preventDefault();
                                        setSelectedCodexBoss(boss);
                                      }}
                                      className="px-1.5 py-0.5 bg-amber/15 hover:bg-amber/35 border border-amber/35 hover:border-amber/55 text-amber text-[8px] font-bold uppercase tracking-wider rounded-sm transition-all active:scale-95 cursor-pointer"
                                      title="Baca Lore Codex"
                                    >
                                      Codex
                                    </button>
                                  </div>
                                ) : isBossUnlocked ? (
                                  <span className="flex items-center gap-0.5 text-amber animate-pulse">
                                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" d="M15.362 5.214A8.252 8.252 0 0112 21 8.25 8.25 0 016.038 7.048 8.287 8.287 0 009 9.6a8.983 8.983 0 013.361-6.867 8.21 8.21 0 003 2.48z" />
                                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 18a3.75 3.75 0 00.495-7.467 5.99 5.99 0 00-1.925 3.546 5.974 5.974 0 01-2.133-1A3.75 3.75 0 0012 18z" />
                                    </svg>
                                    SIAP DILAWAN
                                  </span>
                                ) : (
                                  <span className="text-slate-custom/40 flex items-center gap-0.5">
                                    🔒 LOCK
                                  </span>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>

                  {/* Card Footer Actions */}
                  <div className="p-6 bg-[#11131A]/35 border-t border-[#2D3345]/50 flex justify-between items-center select-none">
                    <div className="text-xs text-slate-custom font-bold">
                      Progress: <span className="text-paper">{clearCount}</span> / <span className="text-paper">{totalBosses}</span> Bos
                    </div>
                    
                    {!isLocked && (
                      <Link
                        href={`/story/${chapter.id}`}
                        className="px-4 py-2 bg-amber hover:bg-amber/90 text-ink font-black rounded text-xs transition-all uppercase tracking-wider flex items-center gap-1 active:scale-95 shadow-md shadow-amber/5"
                      >
                        {clearCount === totalBosses ? (chapter.id === 5 ? 'Main Ulang Chapter Ini' : 'Ulangi') : clearCount > 0 ? 'Lanjutkan' : 'Mulai'}
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                        </svg>
                      </Link>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Codex Modal Dialog */}
          {selectedCodexBoss && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#0E1017]/85 backdrop-blur-[4px] select-none">
              <div className="w-full max-w-md glass-card p-6 rounded border border-[#2D3345] space-y-6 flex flex-col items-center text-center">
                {/* Modal Title */}
                <div className="w-full text-center border-b border-[#2D3345] pb-3 flex justify-between items-center">
                  <span className="text-[10px] font-mono text-slate-custom uppercase tracking-widest">
                    LORE CODEX
                  </span>
                  <button
                    onClick={() => setSelectedCodexBoss(null)}
                    className="text-slate-custom hover:text-amber font-bold text-xs cursor-pointer"
                  >
                    [Tutup]
                  </button>
                </div>

                {/* Boss Sprite Rendering */}
                {BOSS_SPRITES_MAP[selectedCodexBoss.id] && (
                  <div className="w-40 h-40 flex items-center justify-center border border-[#2D3345]/50 bg-[#11131A] rounded p-2 overflow-hidden shadow-inner">
                    <PixelSprite
                      sprite={BOSS_SPRITES_MAP[selectedCodexBoss.id]}
                      scale={1.0}
                    />
                  </div>
                )}

                {/* Boss Details */}
                <div className="space-y-1">
                  <h3 className="text-xl font-black text-amber">
                    {selectedCodexBoss.name}
                  </h3>
                  <p className="text-xs text-slate-custom/85 font-semibold uppercase tracking-wider">
                    {selectedCodexBoss.role}
                  </p>
                  <span className="inline-block mt-2 px-2.5 py-0.5 bg-error-custom/10 text-error-custom border border-error-custom/20 rounded font-mono text-[10px] font-bold">
                    WEAKNESS: {selectedCodexBoss.weakness}
                  </span>
                </div>

                {/* Lore text */}
                <p className="text-xs text-paper/90 leading-relaxed bg-[#11131A]/40 p-4 rounded border border-[#2D3345]/50 text-left italic">
                  "{selectedCodexBoss.codex}"
                </p>

                {/* Close Button */}
                <button
                  onClick={() => setSelectedCodexBoss(null)}
                  className="w-full py-2.5 bg-amber hover:bg-amber/90 text-ink font-black rounded text-xs transition-all uppercase tracking-wider active:scale-95 cursor-pointer shadow-md shadow-amber/10"
                >
                  Tutup Codex
                </button>
              </div>
            </div>
          )}

        </div>
      </main>

      {/* Footer */}
      <footer className="glass-panel w-full py-4 text-center border-t border-[#2D3345] text-xs text-slate-custom select-none font-sans">
        &copy; 2026 GhostType Typing Game. All rights reserved.
      </footer>
    </div>
  );
}
