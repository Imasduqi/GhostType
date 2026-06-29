import React from 'react';
import { TypedChar } from './useTypingEngine';

interface TypingDisplayProps {
  targetText: string;
  typedChars: TypedChar[];
  currentIndex: number;
  isActive?: boolean;
}

export const TypingDisplay: React.FC<TypingDisplayProps> = ({
  targetText,
  typedChars,
  currentIndex,
  isActive = true,
}) => {
  return (
    <div className="relative w-full p-6 select-none bg-[#11131A] rounded-lg border-2 border-[#2D3345] shadow-[inset_0_4px_12px_rgba(0,0,0,0.8),_0_8px_32px_rgba(0,0,0,0.6)] overflow-hidden max-h-[300px] overflow-y-auto custom-scrollbar">
      <div className="flex flex-wrap gap-y-3 gap-x-1 items-center justify-start">
        {targetText.split('').map((char, index) => {
          let isCorrect = false;
          let isError = false;
          let isCursor = index === typedChars.length && isActive;

          if (index < typedChars.length) {
            const typed = typedChars[index];
            if (typed.correct) {
              isCorrect = true;
            } else {
              isError = true;
            }
          }

          // Special visualization for space character
          const isSpace = char === ' ';
          let displayChar = char;
          if (isSpace) {
            displayChar = isError ? '␣' : ' ';
          }

          return (
            <div
              key={index}
              className={`
                relative flex flex-col items-center justify-center 
                w-6 h-9 md:w-7 md:h-11 rounded-sm
                font-mono text-base md:text-lg font-bold select-none
                transition-all duration-150
                ${
                  isCorrect 
                    ? 'bg-[#1C1F2B] text-amber border border-amber/40 animate-flap-flip shadow-[0_2px_4px_rgba(0,0,0,0.4)]' 
                    : isError 
                    ? 'bg-error-custom/10 text-error-custom border border-error-custom animate-shake shadow-[0_0_8px_rgba(229,72,77,0.3)]' 
                    : 'bg-[#151821] text-slate-custom border border-slate-custom/10'
                }
                ${isCursor ? 'border-amber ring-2 ring-amber/40 shadow-[0_0_12px_rgba(232,163,61,0.5)] z-10 scale-105' : ''}
              `}
              style={{
                transformStyle: 'preserve-3d',
              }}
            >
              {/* Horizontal split line mimicking physical flap */}
              <div className="absolute inset-x-0 top-1/2 h-[1px] bg-black/40 z-10 pointer-events-none" />

              {/* Character text */}
              <span className={`relative z-0 ${isSpace ? 'px-1' : ''}`}>{displayChar}</span>

              {/* Cursor indicator caret */}
              {isCursor && (
                <span className="absolute bottom-1 inset-x-1.5 h-0.5 bg-amber rounded-full animate-pulse" />
              )}
            </div>
          );
        })}
      </div>

      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #2D3345;
          border-radius: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #E8A33D;
        }
      `}</style>
    </div>
  );
};
export default TypingDisplay;
