'use client';

import React from 'react';
import { Loader2, Zap } from 'lucide-react';
import { BouncyClouds } from './BouncyClouds';
import { NeonKeyboard } from './NeonKeyboard';
import { MovingSkyClouds } from './MovingSkyClouds';

export interface CloudStickmanProps {
  wrongGuesses: number;
  maxStrikes: number;
  status: 'playing' | 'won' | 'lost';
  lastAction?: 'correct' | 'wrong' | null;
  targetWord?: string;
  guessedLetters?: string[];
  category?: string;
  scannedLetters?: string[];
  disabled?: boolean;
  onGuess?: (letter: string) => void;
  playerName?: string;
  playerAvatar?: string;
  lobbyStatus?: 'finding_players' | 'countdown' | null;
  countdownSeconds?: number;
}

// 7 Vibrant Rainbow Canopy Colors (Red, Orange, Amber, Emerald, Cyan, Indigo, Violet)
const CANOPY_COLORS = [
  { name: 'Red', fill: '#F43F5E', stroke: '#E11D48' },
  { name: 'Orange', fill: '#F97316', stroke: '#EA580C' },
  { name: 'Amber', fill: '#F59E0B', stroke: '#D97706' },
  { name: 'Emerald', fill: '#10B981', stroke: '#059669' },
  { name: 'Cyan', fill: '#06B6D4', stroke: '#0891B2' },
  { name: 'Indigo', fill: '#6366F1', stroke: '#4F46E5' },
  { name: 'Violet', fill: '#8B5CF6', stroke: '#7C3AED' },
];

export const CloudStickman: React.FC<CloudStickmanProps> = ({
  wrongGuesses,
  maxStrikes,
  status,
  lastAction,
  targetWord = '',
  guessedLetters = [],
  category = '',
  scannedLetters = [],
  disabled = false,
  onGuess,
  playerName,
  playerAvatar,
  lobbyStatus = null,
  countdownSeconds,
}) => {
  const activeSegments = Math.max(0, maxStrikes - wrongGuesses);
  const isCritical = activeSegments <= 2;
  const isLanded = status === 'lost';
  const isWon = status === 'won';

  // Stickman keeps floating at the same height (he never lands); mistakes make the clouds below vanish instead
  const yOffset = isWon ? -50 : 15;
  const cloudVanish = Math.max(0, Math.min(1, wrongGuesses / Math.max(1, maxStrikes)));

  // Determine active motion class for stickman figure
  let motionClass = 'anim-parachute-sway';
  if (lastAction === 'wrong') {
    motionClass = 'anim-stickman-wobble';
  } else if (lastAction === 'correct') {
    motionClass = 'anim-stickman-jump';
  } else if (isWon) {
    motionClass = 'anim-parachute-ascend';
  }

  // Render Rich Dynamic Facial Expression (Centered on x=100, y=106)
  const renderFace = () => {
    // 1. VICTORY EXPRESSION: Ultra Joyful ^_^ With Big Laughing Mouth
    if (isWon) {
      return (
        <g>
          {/* Happy Arc Eyes */}
          <path d="M 91 104 Q 95 98 99 104" stroke="#0F172A" strokeWidth="2.8" strokeLinecap="round" fill="none" />
          <path d="M 103 104 Q 107 98 111 104" stroke="#0F172A" strokeWidth="2.8" strokeLinecap="round" fill="none" />
          {/* Laughing Open Mouth with Pink Tongue */}
          <path d="M 93 110 Q 101 122 109 110 Z" fill="#FB7185" stroke="#0F172A" strokeWidth="2.2" strokeLinejoin="round" />
          {/* Rosy Cheeks */}
          <ellipse cx="87" cy="110" rx="4.5" ry="2.5" fill="#FB7185" opacity="0.85" />
          <ellipse cx="113" cy="110" rx="4.5" ry="2.5" fill="#FB7185" opacity="0.85" />
        </g>
      );
    }

    // 2. LANDED EXPRESSION: Goofy Dazed Cartoon Swirl Eyes @ @ on Soft Cloud
    if (isLanded) {
      return (
        <g>
          {/* Swirl Spiral Eyes */}
          <path d="M 96 104 A 2.2 2.2 0 1 1 94 102 A 4.4 4.4 0 1 1 98 106" fill="none" stroke="#0F172A" strokeWidth="2.4" strokeLinecap="round" />
          <path d="M 106 104 A 2.2 2.2 0 1 1 104 102 A 4.4 4.4 0 1 1 108 106" fill="none" stroke="#0F172A" strokeWidth="2.4" strokeLinecap="round" />
          {/* Goofy Smile with Tongue */}
          <path d="M 95 113 Q 101 119 107 113" fill="none" stroke="#0F172A" strokeWidth="2.4" strokeLinecap="round" />
          <ellipse cx="101" cy="116" rx="3.5" ry="2.2" fill="#FB7185" />
          {/* Rosy Cheeks */}
          <ellipse cx="87" cy="110" rx="4.5" ry="2.5" fill="#FB7185" opacity="0.8" />
          <ellipse cx="113" cy="110" rx="4.5" ry="2.5" fill="#FB7185" opacity="0.8" />
        </g>
      );
    }

    // 3. CORRECT GUESS: Golden Star Eyes ★ ★ & Proud Smile
    if (lastAction === 'correct') {
      return (
        <g>
          {/* Sparkling Star Eyes */}
          <text x="91" y="108" fontSize="13" fill="#FBBF24" fontWeight="bold">★</text>
          <text x="104" y="108" fontSize="13" fill="#FBBF24" fontWeight="bold">★</text>
          {/* Big Proud Open Smile */}
          <path d="M 94 111 Q 101 120 108 111 Z" fill="#FFFFFF" stroke="#0F172A" strokeWidth="2.2" strokeLinejoin="round" />
          {/* Cheeks */}
          <ellipse cx="87" cy="111" rx="4" ry="2.2" fill="#34D399" opacity="0.8" />
          <ellipse cx="113" cy="111" rx="4" ry="2.2" fill="#34D399" opacity="0.8" />
        </g>
      );
    }

    // 4. WRONG GUESS RECOIL: Shocked Pinpoint Eyes (O O) & Open Mouth
    if (lastAction === 'wrong') {
      return (
        <g>
          {/* Worried Eyebrows */}
          <line x1="91" y1="98" x2="98" y2="101" stroke="#0F172A" strokeWidth="2.4" strokeLinecap="round" />
          <line x1="111" y1="98" x2="104" y2="101" stroke="#0F172A" strokeWidth="2.4" strokeLinecap="round" />
          {/* Big Shocked Eyes with Tiny Pupils */}
          <circle cx="95" cy="105" r="5" fill="#FFFFFF" stroke="#0F172A" strokeWidth="2.2" />
          <circle cx="95" cy="105" r="1.6" fill="#0F172A" />
          <circle cx="105" cy="105" r="5" fill="#FFFFFF" stroke="#0F172A" strokeWidth="2.2" />
          <circle cx="105" cy="105" r="1.6" fill="#0F172A" />
          {/* Dropped Round Open Mouth */}
          <ellipse cx="101" cy="114" rx="4" ry="5.5" fill="#0F172A" />
        </g>
      );
    }

    // 5. CRITICAL DANGER - 5 MISTAKES (1 Float Left): Screaming Panic Face
    if (wrongGuesses >= 5) {
      return (
        <g>
          {/* Angled High-Tension Brows */}
          <line x1="91" y1="97" x2="98" y2="101" stroke="#0F172A" strokeWidth="2.6" strokeLinecap="round" />
          <line x1="111" y1="97" x2="104" y2="101" stroke="#0F172A" strokeWidth="2.6" strokeLinecap="round" />
          {/* Terrified Squiggly Eyes */}
          <path d="M 92 105 Q 95 101 98 105" stroke="#0F172A" strokeWidth="2.8" fill="none" />
          <path d="M 104 105 Q 107 101 110 105" stroke="#0F172A" strokeWidth="2.8" fill="none" />
          {/* Wide Screaming Mouth */}
          <path d="M 95 110 Q 101 108 107 110 L 105 120 Q 101 122 97 120 Z" fill="#EF4444" stroke="#0F172A" strokeWidth="2.2" strokeLinejoin="round" />
        </g>
      );
    }

    // 6. HIGH TENSION - 4 MISTAKES (2 Floats Left): Nervous Sweating
    if (wrongGuesses === 4) {
      return (
        <g>
          {/* Nervous Eyebrows */}
          <line x1="92" y1="99" x2="98" y2="101" stroke="#0F172A" strokeWidth="2.2" strokeLinecap="round" />
          <line x1="110" y1="99" x2="104" y2="101" stroke="#0F172A" strokeWidth="2.2" strokeLinecap="round" />
          {/* Wide Worried Eyes Looking Down at Clouds */}
          <circle cx="95" cy="105" r="4.5" fill="#FFFFFF" stroke="#0F172A" strokeWidth="2.2" />
          <circle cx="95" cy="107" r="2" fill="#0F172A" />
          <circle cx="105" cy="105" r="4.5" fill="#FFFFFF" stroke="#0F172A" strokeWidth="2.2" />
          <circle cx="105" cy="107" r="2" fill="#0F172A" />
          {/* Wobbly Zig-Zag Mouth */}
          <path d="M 94 114 Q 97 111 101 114 Q 104 117 108 114" fill="none" stroke="#0F172A" strokeWidth="2.4" strokeLinecap="round" />
          {/* Forehead Sweat Drop */}
          <path d="M 112 98 Q 115 96 114 101 Q 112 100 112 98 Z" fill="#38BDF8" />
        </g>
      );
    }

    // 7. MID TENSION - 3 MISTAKES (3 Floats Left): Uneasy Lip-Bite
    if (wrongGuesses === 3) {
      return (
        <g>
          {/* Uneasy Eyebrows */}
          <path d="M 92 99 Q 95 96 98 99" stroke="#0F172A" strokeWidth="2.2" fill="none" />
          <line x1="104" y1="100" x2="110" y2="99" stroke="#0F172A" strokeWidth="2.2" strokeLinecap="round" />
          {/* Pupils Glancing Up at Deflating Canopy */}
          <circle cx="95" cy="104" r="3.5" fill="#0F172A" />
          <circle cx="105" cy="104" r="3.5" fill="#0F172A" />
          {/* Tilted Nervous Mouth */}
          <line x1="96" y1="113" x2="107" y2="115" stroke="#0F172A" strokeWidth="2.4" strokeLinecap="round" />
        </g>
      );
    }

    // 8. FOCUSED - 2 MISTAKES (4 Floats Left): Raised Eyebrow / Concentrated
    if (wrongGuesses === 2) {
      return (
        <g>
          {/* Inquisitive Raised Eyebrow */}
          <path d="M 91 97 Q 95 93 99 97" stroke="#0F172A" strokeWidth="2.4" fill="none" />
          <line x1="104" y1="99" x2="110" y2="99" stroke="#0F172A" strokeWidth="2.2" strokeLinecap="round" />
          {/* Focused Eyes */}
          <circle cx="95" cy="104" r="3.2" fill="#0F172A" />
          <circle cx="105" cy="104" r="3.2" fill="#0F172A" />
          {/* Concentrated Small Mouth */}
          <ellipse cx="101" cy="113" rx="2.8" ry="2" fill="#0F172A" />
        </g>
      );
    }

    // 9. PLAYFUL OOPS - 1 MISTAKE (5 Floats Left): Wink & Tongue Out
    if (wrongGuesses === 1) {
      return (
        <g>
          {/* Left Wink Eye */}
          <path d="M 92 104 Q 96 100 100 104" stroke="#0F172A" strokeWidth="2.6" strokeLinecap="round" fill="none" />
          {/* Right Open Eye */}
          <circle cx="107" cy="104" r="3.5" fill="#0F172A" />
          {/* Cheeky Smile with Tongue Out */}
          <path d="M 95 111 Q 101 116 107 111" fill="none" stroke="#0F172A" strokeWidth="2.4" strokeLinecap="round" />
          <ellipse cx="102" cy="115" rx="2.8" ry="2.2" fill="#FB7185" />
          {/* Rosy Cheek */}
          <ellipse cx="87" cy="110" rx="3.5" ry="2" fill="#FB7185" opacity="0.65" />
        </g>
      );
    }

    // 10. DEFAULT HEALTHY & CONFIDENT - 0 MISTAKES: Big Happy Eyes Looking Up at Secret Word
    return (
      <g>
        {/* Friendly Raised Eyebrows */}
        <path d="M 92 98 Q 95 95 98 98" stroke="#0F172A" strokeWidth="2.2" fill="none" />
        <path d="M 104 98 Q 107 95 110 98" stroke="#0F172A" strokeWidth="2.2" fill="none" />
        {/* Big Bright Eyes Looking Up at Word Letters */}
        <circle cx="95" cy="104" r="3.8" fill="#0F172A" />
        <circle cx="94" cy="102.5" r="1.4" fill="#FFFFFF" />
        <circle cx="105" cy="104" r="3.8" fill="#0F172A" />
        <circle cx="104" cy="102.5" r="1.4" fill="#FFFFFF" />
        {/* Warm Gentle Smile */}
        <path d="M 95 111 Q 101 116 107 111" fill="none" stroke="#0F172A" strokeWidth="2.6" strokeLinecap="round" />
        {/* Subtle Pink Cheeks */}
        <ellipse cx="87" cy="110" rx="4" ry="2.2" fill="#FB7185" opacity="0.8" />
        <ellipse cx="113" cy="110" rx="4" ry="2.2" fill="#FB7185" opacity="0.8" />
      </g>
    );
  };

  // Render Dynamic Arm Poses - Hands firmly grip side suspension lines at (64, 98) & (136, 98)
  const renderArms = () => {
    if (isWon) {
      return (
        /* Double Victory Wave */
        <g stroke="#F8FAFC" strokeWidth="3.4" strokeLinecap="round" fill="none">
          <path d="M 100 128 L 76 110 L 62 92" className="anim-hand-wave" />
          <path d="M 100 128 L 124 110 L 138 92" className="anim-hand-wave" />
        </g>
      );
    }

    /* While Parachuting: Hands firmly holding left & right front parachute ropes */
    return (
      <g stroke="#F8FAFC" strokeWidth="3.4" strokeLinecap="round" fill="none">
        {/* Left Arm holding Left Parachute Ropes at (64, 98) */}
        <path d="M 100 128 L 80 118 L 64 98" />
        {/* Right Arm holding Right Parachute Ropes at (136, 98) */}
        <path d="M 100 128 L 120 118 L 136 98" />
      </g>
    );
  };

  // Render Hand-Drawn Pencil Sketch Underline with organic graphite variations
  const renderPencilUnderline = (index: number, isGuessed: boolean, isRevealedOnLoss: boolean) => {
    const variants = [
      {
        main: 'M 2 4.2 C 12 2.5, 24 2.8, 34 4',
        accent: 'M 4 4.8 C 14 3.8, 22 4.2, 31 4.5',
      },
      {
        main: 'M 2 3.5 C 10 4.8, 22 4.2, 34 3.2',
        accent: 'M 5 4 C 16 3.2, 26 3.8, 32 4.5',
      },
      {
        main: 'M 2 4 C 14 2.8, 20 4.5, 34 3.8',
        accent: 'M 3 3.6 C 15 4.8, 25 3.5, 30 4',
      },
    ];

    const variant = variants[index % variants.length];

    let strokeColor = '#64748B'; // Slate charcoal pencil
    let accentColor = '#475569';
    let opacity = 0.85;

    if (isGuessed) {
      strokeColor = '#FFFFFF'; // Clean white chalk / pencil
      accentColor = '#CBD5E1';
      opacity = 1;
    } else if (isRevealedOnLoss) {
      strokeColor = '#FBBF24'; // Amber sketch
      accentColor = '#F59E0B';
      opacity = 1;
    }

    return (
      <svg
        viewBox="0 0 36 8"
        className="w-full h-2 sm:h-2.5 overflow-visible select-none mt-0.5"
        preserveAspectRatio="none"
        fill="none"
      >
        {/* Primary organic graphite pencil stroke */}
        <path
          d={variant.main}
          stroke={strokeColor}
          strokeWidth="2.4"
          strokeLinecap="round"
          strokeLinejoin="round"
          opacity={opacity}
        />
        {/* Secondary overlapping graphite grain stroke */}
        <path
          d={variant.accent}
          stroke={accentColor}
          strokeWidth="1.4"
          strokeLinecap="round"
          strokeLinejoin="round"
          opacity={opacity * 0.7}
        />
      </svg>
    );
  };

  const isArenaBlurred = lobbyStatus === 'finding_players' || lobbyStatus === 'countdown';

  return (
    <div className="relative w-full max-w-5xl mx-auto min-h-[760px] sm:min-h-[820px] lg:min-h-[860px] bg-transparent flex flex-col justify-between overflow-hidden select-none">
      {/* 1. Centered Finding Players / Match Countdown Overlay (Clean, NO Neon, Centered in Middle) */}
      {lobbyStatus === 'finding_players' && (
        <div
          data-testid="arena-finding-players"
          className="absolute inset-0 flex flex-col items-center justify-center z-40 bg-slate-950/30 backdrop-blur-[2px] select-none animate-fade-in p-4"
        >
          <div className="flex flex-col items-center gap-3.5 p-7 sm:p-9 rounded-3xl bg-slate-900/95 border border-slate-700/60 shadow-2xl text-center max-w-sm sm:max-w-md w-full">
            <div className="flex items-center justify-center w-12 h-12">
              <Loader2 className="w-8 h-8 animate-spin text-slate-100" />
            </div>
            <span className="font-pencil text-2xl sm:text-3xl font-bold tracking-wider text-white uppercase select-none">
              FINDING PLAYERS...
            </span>
            <p className="text-xs sm:text-sm text-slate-400 font-sans leading-relaxed">
              Searching for opponents to join public lobby
            </p>
            <div className="flex items-center gap-1.5 pt-1">
              <span className="w-2 h-2 rounded-full bg-slate-400 animate-ping" />
              <span className="w-2 h-2 rounded-full bg-slate-500 animate-pulse" />
              <span className="w-2 h-2 rounded-full bg-slate-600 animate-pulse" />
            </div>
          </div>
        </div>
      )}

      {lobbyStatus === 'countdown' && (
        <div
          data-testid="arena-match-countdown"
          className="absolute inset-0 flex flex-col items-center justify-center z-40 bg-slate-950/30 backdrop-blur-[2px] select-none animate-fade-in p-4"
        >
          <div className="flex flex-col items-center gap-2.5 p-7 sm:p-9 rounded-3xl bg-slate-900/95 border border-slate-700/60 shadow-2xl text-center max-w-sm sm:max-w-md w-full">
            <div className="flex items-center gap-2 text-emerald-400 font-pencil text-lg sm:text-xl font-bold tracking-wider uppercase">
              <Zap className="w-5 h-5 text-emerald-400 animate-bounce" />
              <span>OPPONENT FOUND! MATCH STARTING</span>
            </div>
            <span className="text-5xl sm:text-6xl font-black font-mono text-emerald-300 drop-shadow-[0_0_16px_rgba(16,185,129,0.5)] animate-pulse">
              {countdownSeconds ?? 8}s
            </span>
            <p className="text-xs text-slate-400 font-sans">
              Match starting in {countdownSeconds ?? 8} seconds...
            </p>
          </div>
        </div>
      )}

      {/* 2. Main Arena Container: Blurred during finding players / countdown */}
      <div
        className={`flex-1 flex flex-col justify-between w-full h-full transition-all duration-500 ${
          isArenaBlurred ? 'filter blur-[5px] sm:blur-[7px] opacity-40 pointer-events-none' : ''
        }`}
      >
        {/* Genre / Mode Display on top of the letter word */}
        {category && category !== 'ALL' && !isArenaBlurred && (
          <div className="w-full flex items-center justify-center pt-3.5 pb-0.5 z-20">
            <span
              data-testid="category-badge"
              className="text-lg sm:text-xl font-pencil font-bold text-white tracking-widest uppercase select-none drop-shadow-sm animate-fade-in"
            >
              {category}
            </span>
          </div>
        )}

        {/* Secret Word Letters Display */}
        {targetWord && !isArenaBlurred && (
          <div
            data-testid="word-letters-tray"
            className="w-full flex flex-wrap items-center justify-center gap-2 sm:gap-3.5 px-4 pt-1 pb-1 z-20"
          >
            {targetWord.split('').map((char, index) => {
              const isGuessed = guessedLetters.includes(char);
              const isRevealedOnLoss = status === 'lost' && !isGuessed;

              return (
                <div
                  key={index}
                  data-testid={`word-char-${index}`}
                  className="flex flex-col items-center justify-end min-w-[28px] sm:min-w-[36px] h-12 select-none"
                >
                  {/* Letter Character - Handwritten pencil sketch font (Love Ya Like A Sister) */}
                  {isGuessed ? (
                    <span className="text-3xl sm:text-4xl font-normal font-pencil tracking-wider text-white animate-fade-in">
                      {char}
                    </span>
                  ) : isRevealedOnLoss ? (
                    <span className="text-3xl sm:text-4xl font-normal font-pencil tracking-wider text-amber-400">
                      {char}
                    </span>
                  ) : (
                    <span className="text-3xl sm:text-4xl font-normal font-pencil tracking-wider opacity-0">
                      A
                    </span>
                  )}

                  {/* Hand-Drawn Pencil Sketch Underline */}
                  {renderPencilUnderline(index, isGuessed, isRevealedOnLoss)}
                </div>
              );
            })}
          </div>
        )}

      {/* 3. Floating Sky Arena with Stickman Parachutist */}
      <div className="relative flex-1 w-full overflow-hidden">
        {/* Moving Sky Clouds (Drifting gracefully behind Stickman across the sky) */}
        <MovingSkyClouds />

        {/* Background Twinkling Atmosphere Stars (Clear of keyboard area) */}
        <div className="absolute inset-0 pointer-events-none z-0">
          <span className="absolute left-[8%] top-[20%] text-pink-300/40 text-xs anim-star-twinkle">★</span>
          <span className="absolute right-[30%] top-[48%] text-cyan-300/40 text-xs anim-star-twinkle-delay">✦</span>
          <span className="absolute right-[22%] top-[20%] text-yellow-300/40 text-xs anim-star-twinkle">✦</span>
          <span className="absolute right-[10%] top-[40%] text-purple-300/40 text-xs anim-star-twinkle-delay">★</span>
        </div>

        {/* Parachutist Container with smooth vertical descent - Horizontally Centered in Middle */}
        <div
          data-testid="stickman-figure-container"
          className="absolute left-1/2 -translate-x-1/2 transition-all duration-700 ease-out flex flex-col items-center z-20 pointer-events-none"
          style={{ transform: `translate(-50%, ${yOffset}px)` }}
        >
          {/* Animated Motion Wrapper */}
          <div className={`${motionClass} flex flex-col items-center`}>
            <svg
              width="310"
              height="310"
              viewBox="0 0 200 200"
              className="drop-shadow-[0_14px_32px_rgba(0,0,0,0.55)] overflow-visible"
            >
              {/* ============================================================== */}
              {/* 3D DOMED INFLATED PARACHUTE CANOPY (Rich Curved Cells & Hem)  */}
              {/* ============================================================== */}
              {(
                <g>
                  {/* Top Apex Vent Topper Cap with Air Flow Ring */}
                  <ellipse cx="100" cy="12" rx="12" ry="4.5" fill="#FFFFFF" stroke="#94A3B8" strokeWidth="1" />
                  <ellipse cx="100" cy="11.5" rx="6" ry="2" fill="#475569" />

                  {/* 7 Curved Inflated Canopy Panels (Red, Orange, Amber, Emerald, Cyan, Indigo, Violet) */}
                  {/* Panel 1: Red (Far Left) */}
                  <path
                    d="M 100 12 C 52 14, 22 34, 22 66 Q 33 70 44 66 C 46 36, 68 18, 100 12 Z"
                    fill={activeSegments >= 1 ? '#F43F5E' : '#334155'}
                    stroke={activeSegments >= 1 ? '#FB7185' : '#1E293B'}
                    strokeWidth="1.4"
                    opacity={activeSegments >= 1 ? '0.96' : '0.2'}
                  />

                  {/* Panel 2: Sunset Orange (Left Mid) */}
                  <path
                    d="M 100 12 C 68 18, 46 36, 44 66 Q 55.5 70 67 66 C 70 38, 84 20, 100 12 Z"
                    fill={activeSegments >= 2 ? '#F97316' : '#334155'}
                    stroke={activeSegments >= 2 ? '#FB923C' : '#1E293B'}
                    strokeWidth="1.4"
                    opacity={activeSegments >= 2 ? '0.96' : '0.2'}
                  />

                  {/* Panel 3: Golden Amber (Left Inner) */}
                  <path
                    d="M 100 12 C 84 20, 70 38, 67 66 Q 78 70 89 66 C 90 38, 96 22, 100 12 Z"
                    fill={activeSegments >= 3 ? '#F59E0B' : '#334155'}
                    stroke={activeSegments >= 3 ? '#FBBF24' : '#1E293B'}
                    strokeWidth="1.4"
                    opacity={activeSegments >= 3 ? '0.96' : '0.2'}
                  />

                  {/* Panel 4: Emerald Green (True Center Panel) */}
                  <path
                    d="M 100 12 C 96 22, 90 38, 89 66 Q 100 70 111 66 C 110 38, 104 22, 100 12 Z"
                    fill={activeSegments >= 4 ? '#10B981' : '#334155'}
                    stroke={activeSegments >= 4 ? '#34D399' : '#1E293B'}
                    strokeWidth="1.4"
                    opacity={activeSegments >= 4 ? '0.96' : '0.2'}
                  />

                  {/* Panel 5: Sky Cyan (Right Inner) */}
                  <path
                    d="M 100 12 C 104 22, 110 38, 111 66 Q 122 70 133 66 C 130 38, 116 20, 100 12 Z"
                    fill={activeSegments >= 5 ? '#06B6D4' : '#334155'}
                    stroke={activeSegments >= 5 ? '#38BDF8' : '#1E293B'}
                    strokeWidth="1.4"
                    opacity={activeSegments >= 5 ? '0.96' : '0.2'}
                  />

                  {/* Panel 6: Royal Indigo / Blue (Right Mid) */}
                  <path
                    d="M 100 12 C 116 20, 130 38, 133 66 Q 144.5 70 156 66 C 154 36, 132 18, 100 12 Z"
                    fill={activeSegments >= 6 ? '#6366F1' : '#334155'}
                    stroke={activeSegments >= 6 ? '#818CF8' : '#1E293B'}
                    strokeWidth="1.4"
                    opacity={activeSegments >= 6 ? '0.96' : '0.2'}
                  />

                  {/* Panel 7: Violet / Purple (Far Right) */}
                  <path
                    d="M 100 12 C 132 18, 154 36, 156 66 Q 167 70 178 66 C 178 34, 148 14, 100 12 Z"
                    fill={activeSegments >= 7 ? '#8B5CF6' : '#334155'}
                    stroke={activeSegments >= 7 ? '#A78BFA' : '#1E293B'}
                    strokeWidth="1.4"
                    opacity={activeSegments >= 7 ? '0.96' : '0.2'}
                  />

                  {/* Sunlight Silk Sheen Curve (Adds volumetric realism & gloss) */}
                  <path
                    d="M 38 42 C 60 22, 140 22, 162 42"
                    stroke="#FFFFFF"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    opacity="0.32"
                    fill="none"
                  />

                  {/* Scalloped Bottom Hem Reinforcement Band */}
                  <path
                    d="M 22 66 Q 33 70 44 66 Q 55.5 70 67 66 Q 78 70 89 66 Q 100 70 111 66 Q 122 70 133 66 Q 144.5 70 156 66 Q 167 70 178 66"
                    fill="none"
                    stroke="#FFFFFF"
                    strokeWidth="2.2"
                    strokeLinecap="round"
                    opacity="0.85"
                  />

                  {/* 2 REAR SUSPENSION LINES (Passing BEHIND Stickman Head to Shoulders at x=95 & x=105) */}
                  <g stroke="#CBD5E1" strokeWidth="1.8" opacity="0.75">
                    {/* Left Rear Line from Inner-Left Canopy to Left Shoulder */}
                    <line x1="67" y1="66" x2="95" y2="128" />
                    {/* Right Rear Line from Inner-Right Canopy to Right Shoulder */}
                    <line x1="133" y1="66" x2="105" y2="128" />
                  </g>
                </g>
              )}

              {/* ============================================================== */}
              {/* PLAYFUL LANDED CARTOON STARS (When safely on cloud pillow)    */}
              {/* ============================================================== */}
              {isLanded && (
                <g className="anim-stars-spin" transform-origin="100 95">
                  <text x="82" y="85" fill="#FBBF24" fontSize="18">⭐</text>
                  <text x="105" y="80" fill="#F472B6" fontSize="16">✨</text>
                  <text x="94" y="70" fill="#38BDF8" fontSize="17">⭐</text>
                </g>
              )}

              {/* ============================================================== */}
              {/* LARGER, CRISP CUTE STICKMAN (Centered on x=100)               */}
              {/* ============================================================== */}

              {/* Stickman Head with Clear White Fill (Cleanly covers rear lines, centered at x=100, y=106) */}
              <circle
                cx="100"
                cy="106"
                r="18"
                fill="#FFFFFF"
                stroke="#0F172A"
                strokeWidth="3.2"
              />

              {/* Rich Dynamic Facial Expressions (Centered on x=100) */}
              {renderFace()}

              {/* Stickman Body Spine (Centered on x=100) */}
              <line
                x1="100"
                y1="124"
                x2="100"
                y2="158"
                stroke="#F8FAFC"
                strokeWidth="4"
                strokeLinecap="round"
              />

              {/* 4 FRONT SUSPENSION LINES (Held firmly by Stickman's Hands at Left 64 & Right 136) */}
              {(
                <g stroke="#F8FAFC" strokeWidth="1.8" opacity="0.9">
                  {/* Left Front Lines held securely by Left Hand at (64, 98) */}
                  <line x1="22" y1="66" x2="64" y2="98" />
                  <line x1="44" y1="66" x2="64" y2="98" />

                  {/* Right Front Lines held securely by Right Hand at (136, 98) */}
                  <line x1="156" y1="66" x2="136" y2="98" />
                  <line x1="178" y1="66" x2="136" y2="98" />
                </g>
              )}

              {/* Dynamic Arms (Rendered over the front lines, firmly gripping them) */}
              {renderArms()}

              {/* Dynamic Moving Legs - Anchored at Hip (100, 158) with Natural Sway & Bent Knees */}
              {isWon ? (
                /* Aerodynamic Happy Celebration Kicking Legs */
                <g stroke="#F8FAFC" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" fill="none">
                  <g className="anim-leg-celebrate-left" style={{ transformBox: 'view-box', transformOrigin: '100px 158px' }}>
                    <path d="M 100 158 L 88 180 L 78 196 L 70 194" />
                  </g>
                  <g className="anim-leg-celebrate-right" style={{ transformBox: 'view-box', transformOrigin: '100px 158px' }}>
                    <path d="M 100 158 L 112 180 L 122 196 L 130 194" />
                  </g>
                </g>
              ) : (
                /* Natural Parachuting Floating Legs with Organic Breeze Dangle & Panic Kicking */
                <g stroke="#F8FAFC" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" fill="none">
                  {/* Left Leg: Hip (100,158) -> Knee (91,180) -> Ankle (85,198) -> Foot (75,198) */}
                  <g
                    className={wrongGuesses >= 5 || lastAction === 'wrong' ? 'anim-leg-panic-left' : 'anim-leg-swing-left'}
                    style={{ transformBox: 'view-box', transformOrigin: '100px 158px' }}
                  >
                    <path d="M 100 158 L 91 180 L 85 198 L 75 198" />
                  </g>
                  {/* Right Leg: Hip (100,158) -> Knee (109,180) -> Ankle (115,198) -> Foot (125,198) */}
                  <g
                    className={wrongGuesses >= 5 || lastAction === 'wrong' ? 'anim-leg-panic-right' : 'anim-leg-swing-right'}
                    style={{ transformBox: 'view-box', transformOrigin: '100px 158px' }}
                  >
                    <path d="M 100 158 L 109 180 L 115 198 L 125 198" />
                  </g>
                </g>
              )}
            </svg>
          </div>
        </div>

        {/* Bottom Bouncy Rainbow Clouds Pillow (Inside the full-height Sky Arena) */}
        <div
          data-testid="cloud-bank"
          className="absolute inset-x-0 bottom-0 z-10 pointer-events-none transition-all duration-700 ease-in-out"
          style={{
            opacity: 1 - cloudVanish,
            transform: `translateY(${Math.round(cloudVanish * 100)}%)`,
          }}
        >
          <BouncyClouds isCritical={isCritical} />
        </div>

        {/* 4. Typing Alphabets Area - Anchored safely above the bottom cloud crest */}
        {onGuess && (
          <div className="absolute left-3.5 sm:left-6 bottom-11 sm:bottom-13 z-30 pointer-events-auto max-w-[320px] sm:max-w-[390px]">
            <NeonKeyboard
              targetWord={targetWord}
              guessedLetters={guessedLetters}
              scannedLetters={scannedLetters || []}
              disabled={!!disabled}
              onGuess={onGuess}
              className="w-full flex flex-col items-start gap-1 sm:gap-1.5 bg-transparent border-0 p-0 shadow-none"
              align="left"
            />
          </div>
        )}
        </div>
      </div>
    </div>
  );
};
