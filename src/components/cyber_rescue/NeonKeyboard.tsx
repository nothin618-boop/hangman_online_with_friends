'use client';

import React, { useEffect } from 'react';
import { motion } from 'framer-motion';

export interface NeonKeyboardProps {
  targetWord: string;
  guessedLetters: string[];
  scannedLetters: string[];
  disabled: boolean;
  onGuess: (letter: string) => void;
  className?: string;
  align?: 'left' | 'center';
}

// 5 Rows × 6 Columns layout (26 letters total across 5 rows)
const KEYBOARD_ROWS = [
  ['A', 'B', 'C', 'D', 'E', 'F'],
  ['G', 'H', 'I', 'J', 'K', 'L'],
  ['M', 'N', 'O', 'P', 'Q', 'R'],
  ['S', 'T', 'U', 'V', 'W', 'X'],
  ['Y', 'Z'],
];

export const NeonKeyboard: React.FC<NeonKeyboardProps> = ({
  targetWord,
  guessedLetters,
  scannedLetters,
  disabled,
  onGuess,
  className = '',
  align = 'center',
}) => {
  // Listen for physical keyboard strokes
  useEffect(() => {
    if (disabled) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if input field or textarea is focused
      if (
        document.activeElement?.tagName === 'INPUT' ||
        document.activeElement?.tagName === 'TEXTAREA'
      ) {
        return;
      }

      const key = e.key.toUpperCase();
      if (/^[A-Z]$/.test(key) && !guessedLetters.includes(key) && !scannedLetters.includes(key)) {
        onGuess(key);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [disabled, guessedLetters, scannedLetters, onGuess]);

  const isLeft = align === 'left';

  return (
    <div
      className={`select-none ${
        className ||
        'w-full max-w-2xl mx-auto flex flex-col items-center gap-2 p-3 sm:p-4 rounded-2xl bg-surface/90 border border-slate-800 shadow-xl'
      } ${isLeft ? 'items-start' : 'items-center'}`}
      data-testid="neon-keyboard"
    >
      {KEYBOARD_ROWS.map((row, rowIdx) => {
        return (
          <div
            key={rowIdx}
            className={`flex items-center gap-1.5 sm:gap-2 w-full flex-wrap ${
              isLeft ? 'justify-start' : 'justify-center'
            }`}
          >
            {row.map((letter) => {
              const isGuessed = guessedLetters.includes(letter);
              const isScanned = scannedLetters.includes(letter);
              const isTarget = targetWord.includes(letter);
              const isCorrect = isGuessed && isTarget;
              const isWrong = isGuessed && !isTarget;
              const isButtonDisabled = disabled || isGuessed || isScanned;

              // 1. CORRECT GUESS STATE -> MATTE 3D MECHANICAL FOREST GREEN (NO NEON GLOW)
              if (isCorrect) {
                return (
                  <button
                    key={letter}
                    type="button"
                    disabled
                    data-testid={`key-${letter}`}
                    className="relative w-10 sm:w-12 h-11 sm:h-12 rounded-[10px] flex items-center justify-center cursor-not-allowed border-t-2 border-emerald-700/50 border-x border-emerald-800/30 border-b-2 border-emerald-950 select-none"
                    style={{
                      background: 'linear-gradient(180deg, #16a34a 0%, #15803d 50%, #14532d 100%)',
                      boxShadow: '0 4.5px 0 #0f3d1e, 0 5px 7px rgba(0,0,0,0.35)',
                    }}
                  >
                    {/* Inner Concave Dish (Matte Green) */}
                    <div
                      className="w-[84%] h-[80%] rounded-[7px] flex items-center justify-center"
                      style={{
                        background: 'linear-gradient(180deg, #15803d 0%, #166534 100%)',
                        boxShadow: 'inset 0 1.5px 2px rgba(0,0,0,0.35), inset 0 -1px 1px rgba(255,255,255,0.2)',
                        border: '1px solid rgba(0, 0, 0, 0.12)',
                      }}
                    >
                      <span className="font-pencil font-bold text-lg sm:text-xl text-white drop-shadow-[0_1px_1px_rgba(0,0,0,0.5)]">
                        {letter}
                      </span>
                    </div>
                  </button>
                );
              }

              // 2. WRONG GUESS STATE -> MATTE 3D MECHANICAL DEEP CRIMSON (NO NEON)
              // Underlying guessed letter remains clearly readable
              // Dulled/subtle Cross mark (✕) indicates incorrect guess without hiding the letter
              if (isWrong) {
                return (
                  <button
                    key={letter}
                    type="button"
                    disabled
                    data-testid={`key-${letter}`}
                    className="relative w-10 sm:w-12 h-11 sm:h-12 rounded-[10px] flex items-center justify-center cursor-not-allowed border-t-2 border-red-700/50 border-x border-red-800/30 border-b-2 border-red-950 select-none"
                    style={{
                      background: 'linear-gradient(180deg, #b91c1c 0%, #991b1b 50%, #7f1d1d 100%)',
                      boxShadow: '0 4.5px 0 #450a0a, 0 5px 7px rgba(0,0,0,0.35)',
                    }}
                  >
                    {/* Inner Concave Dish (Matte Crimson) */}
                    <div
                      className="relative w-[84%] h-[80%] rounded-[7px] flex items-center justify-center"
                      style={{
                        background: 'linear-gradient(180deg, #991b1b 0%, #7f1d1d 100%)',
                        boxShadow: 'inset 0 1.5px 2px rgba(0,0,0,0.38), inset 0 -1px 1px rgba(255,255,255,0.15)',
                        border: '1px solid rgba(0, 0, 0, 0.15)',
                      }}
                    >
                      {/* Clearly visible underlying letter */}
                      <span className="font-pencil font-bold text-lg sm:text-xl text-white/85 drop-shadow-[0_1px_1px_rgba(0,0,0,0.6)]">
                        {letter}
                      </span>
                      {/* Dulled, subtle Cross mark (✕) so the letter underneath is clearly legible */}
                      <svg
                        aria-hidden="true"
                        className="absolute inset-0 m-auto w-5 sm:w-6 h-5 sm:h-6 text-white/50 pointer-events-none"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2.4"
                        strokeLinecap="round"
                      >
                        <line x1="18" y1="6" x2="6" y2="18" />
                        <line x1="6" y1="6" x2="18" y2="18" />
                      </svg>
                    </div>
                  </button>
                );
              }

              // 3. SCANNED / ELIMINATED BY POWER-UP STATE (Clean, No Low-Opacity Background)
              if (isScanned) {
                return (
                  <button
                    key={letter}
                    type="button"
                    disabled
                    data-testid={`key-${letter}`}
                    className="relative w-10 sm:w-12 h-11 sm:h-12 rounded-[10px] flex items-center justify-center cursor-not-allowed bg-slate-900/60 border border-slate-800/50 opacity-25 select-none"
                  >
                    <span className="font-pencil font-bold text-lg sm:text-xl text-slate-500 line-through">
                      {letter}
                    </span>
                  </button>
                );
              }

              // 4. DEFAULT STATE -> MATTE 3D MECHANICAL PURE NEUTRAL GRAY KEYCAPS (ZERO NEON TINT)
              // Perfectly Aligned Baseline across all keys in the row
              // Direct button element without any low-opacity socket background or neon aura
              return (
                <motion.button
                  key={letter}
                  type="button"
                  data-testid={`key-${letter}`}
                  disabled={disabled}
                  onClick={() => onGuess(letter)}
                  whileHover={
                    disabled
                      ? undefined
                      : {
                          scale: 1.04,
                          boxShadow:
                            '0 5.5px 0 #6B7280, 0 6px 10px rgba(0,0,0,0.4)',
                          transition: { type: 'spring', stiffness: 500, damping: 20 },
                        }
                  }
                  whileTap={
                    disabled
                      ? undefined
                      : {
                          scale: 0.94,
                          boxShadow:
                            '0 2px 0 #6B7280, 0 2px 4px rgba(0,0,0,0.3)',
                          transition: { type: 'spring', stiffness: 600, damping: 25 },
                        }
                  }
                  style={{
                    background:
                      'linear-gradient(180deg, #F3F4F6 0%, #E5E7EB 50%, #D1D5DB 100%)',
                    borderTop: '2.5px solid #F9FAFB',
                    borderLeft: '1px solid #D1D5DB',
                    borderRight: '1px solid #D1D5DB',
                    borderBottom: '2.5px solid #6B7280',
                    boxShadow:
                      '0 4.5px 0 #6B7280, 0 4px 6px rgba(0,0,0,0.35)',
                  }}
                  className="relative w-10 sm:w-12 h-11 sm:h-12 rounded-[10px] flex items-center justify-center cursor-pointer select-none transition-shadow duration-75"
                >
                  {/* 3D Inner Concave Dish (Pure Neutral Gray Typing Surface - Zero Blue/Neon) */}
                  <div
                    className="relative w-[84%] h-[80%] rounded-[7px] flex items-center justify-center transition-all duration-75"
                    style={{
                      background:
                        'linear-gradient(180deg, #E5E7EB 0%, #E0E2E7 60%, #D1D5DB 100%)',
                      boxShadow:
                        'inset 0 2px 3px rgba(0,0,0,0.18), inset 0 -1px 1px rgba(255,255,255,0.4)',
                      border: '1px solid rgba(0, 0, 0, 0.1)',
                    }}
                  >
                    <span className="font-pencil font-bold text-lg sm:text-xl text-gray-800 drop-shadow-[0_1px_0_rgba(255,255,255,0.4)]">
                      {letter}
                    </span>
                  </div>
                </motion.button>
              );
            })}
          </div>
        );
      })}
    </div>
  );
};
