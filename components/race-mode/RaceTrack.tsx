import React from 'react';

interface RaceTrackProps {
  playerProgress: number; // 0 to 100
  ghostProgress: number; // 0 to 100
  playerWpm: number;
  ghostWpm: number;
  isGhostReference?: boolean;
}

export const RaceTrack: React.FC<RaceTrackProps> = ({
  playerProgress,
  ghostProgress,
  playerWpm,
  ghostWpm,
  isGhostReference = false,
}) => {
  // Determine leader
  let leaderText = "Balapan belum dimulai";
  let leaderColor = "text-slate-custom";

  if (playerProgress > 0 || ghostProgress > 0) {
    if (playerProgress > ghostProgress) {
      leaderText = "🏆 Anda memimpin balapan!";
      leaderColor = "text-amber drop-shadow-[0_0_8px_rgba(232,163,97,0.4)] font-bold animate-pulse";
    } else if (ghostProgress > playerProgress) {
      leaderText = isGhostReference ? "👻 Ghost referensi memimpin!" : "👻 Ghost rekor terbaik Anda memimpin!";
      leaderColor = "text-ghost-teal drop-shadow-[0_0_8px_rgba(94,234,212,0.4)] font-bold animate-pulse";
    } else {
      leaderText = "⚡ Posisi seimbang!";
      leaderColor = "text-paper font-bold";
    }
  }

  return (
    <div className="glass-card p-6 rounded-lg border border-[#2D3345] shadow-2xl relative select-none">
      
      {/* Leadership Indicator */}
      <div className="flex justify-between items-center mb-6">
        <span className="text-xs font-bold text-slate-custom uppercase tracking-wider">Race Progress</span>
        <span className={`text-sm font-sans ${leaderColor}`}>{leaderText}</span>
      </div>

      {/* Lintasan Track */}
      <div className="relative space-y-8 py-2">
        {/* Track Grid Lines Background */}
        <div className="absolute inset-x-0 top-0 bottom-0 flex justify-between pointer-events-none opacity-5">
          {[...Array(11)].map((_, i) => (
            <div key={i} className="h-full border-l border-paper border-dashed" />
          ))}
        </div>

        {/* 1. PLAYER LANE */}
        <div className="relative h-10 bg-[#11131A] border border-[#2D3345] rounded flex items-center px-4 overflow-hidden">
          {/* Start & Finish Labels */}
          <div className="absolute left-2 text-[9px] text-slate-custom font-bold uppercase">START</div>
          <div className="absolute right-2 text-[9px] text-[#A3AABF]/40 font-bold uppercase">FINISH</div>

          {/* Lane Label */}
          <div className="absolute right-12 text-[10px] text-amber/5 font-extrabold uppercase tracking-widest pointer-events-none">
            PLAYER LANE
          </div>

          {/* Running Progress Bar inside */}
          <div 
            className="absolute left-0 top-0 bottom-0 bg-amber/5 transition-[width] duration-300 ease-out" 
            style={{ width: `${playerProgress}%` }}
          />

          {/* Player Marker */}
          <div
            className="absolute -translate-x-1/2 flex items-center gap-2 transition-[left] duration-300 ease-out z-20"
            style={{ left: `${Math.max(4, Math.min(96, playerProgress))}%` }}
          >
            {/* Solid Player indicator */}
            <div className="w-5 h-5 rounded-sm bg-amber flex items-center justify-center font-mono font-black text-[10px] text-ink shadow-[0_2px_4px_rgba(0,0,0,0.5)]">
              P
            </div>
            <span className="text-[10px] text-amber font-bold whitespace-nowrap bg-ink border border-amber/30 px-2 py-0.5 rounded-sm">
              Anda ({Math.round(playerWpm)} WPM)
            </span>
          </div>
        </div>

        {/* 2. GHOST LANE */}
        <div className="relative h-10 bg-[#11131A] border border-[#2D3345] rounded flex items-center px-4 overflow-hidden">
          {/* Start & Finish Labels */}
          <div className="absolute left-2 text-[9px] text-slate-custom font-bold uppercase">START</div>
          <div className="absolute right-2 text-[9px] text-[#A3AABF]/40 font-bold uppercase">FINISH</div>

          {/* Lane Label */}
          <div className="absolute right-12 text-[10px] text-ghost-teal/5 font-extrabold uppercase tracking-widest pointer-events-none">
            GHOST LANE
          </div>

          {/* Running Progress Bar inside with subtle ghost teal glow gradient */}
          <div 
            className="absolute left-0 top-0 bottom-0 bg-gradient-to-r from-transparent to-ghost-teal/10 transition-[width] duration-300 ease-out" 
            style={{ width: `${ghostProgress}%` }}
          />

          {/* Ghost Marker with Trail */}
          <div
            className="absolute -translate-x-1/2 flex items-center gap-2 transition-[left] duration-300 ease-out z-20"
            style={{ left: `${Math.max(4, Math.min(96, ghostProgress))}%` }}
          >
            {/* Ghost Indicator with stacked trailing box-shadow */}
            <div className="w-5 h-5 rounded-sm bg-ghost-teal flex items-center justify-center font-mono font-black text-[10px] text-ink shadow-[0_0_8px_rgba(94,234,212,0.6),_-6px_0_8px_rgba(94,234,212,0.4),_-12px_0_12px_rgba(94,234,212,0.2)]">
              G
            </div>
            <span className="text-[10px] text-ghost-teal font-bold whitespace-nowrap bg-ink border border-ghost-teal/30 px-2 py-0.5 rounded-sm shadow-[0_0_8px_rgba(94,234,212,0.15)]">
              {isGhostReference ? 'Ghost Ref' : 'Ghost Rekor'} ({Math.round(ghostWpm)} WPM)
            </span>
          </div>
        </div>

      </div>
    </div>
  );
};
export default RaceTrack;
