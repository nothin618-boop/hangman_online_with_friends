'use client';

import React, { useEffect } from 'react';
import { Award, AlertTriangle, ArrowRight, RotateCcw, Sparkles, Shield, Flame, Clock } from 'lucide-react';
import confetti from 'canvas-confetti';
import { DetailedScoreBreakdown } from '@/lib/cyber_rescue/scoring_system';

export interface GameOverModalProps {
  status: 'playing' | 'won' | 'lost';
  targetWord: string;
  category: string;
  score: number;
  streak: number;
  solveTimeMs?: number;
  breakdown?: DetailedScoreBreakdown;
  onNext: () => void;
}

export const GameOverModal: React.FC<GameOverModalProps> = ({
  status,
  targetWord,
  category,
  score,
  streak,
  solveTimeMs,
  breakdown,
  onNext,
}) => {
  // Fire confetti on victory
  useEffect(() => {
    if (status === 'won') {
      try {
        confetti({
          particleCount: 80,
          spread: 70,
          origin: { y: 0.6 },
          colors: ['#F43F5E', '#8B5CF6', '#06B6D4', '#10B981', '#FBBF24', '#FB923C'],
        });
      } catch {
        // Safe in test environments
      }
    }
  }, [status]);

  // Handle Enter key for quick restart/next
  useEffect(() => {
    if (status === 'playing') return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        onNext();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [status, onNext]);

  if (status === 'playing') return null;

  const isWon = status === 'won';

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in font-mono"
      data-testid="game-over-modal"
    >
      <div className="w-full max-w-md rounded-2xl bg-surface border border-slate-700 shadow-2xl overflow-hidden text-center p-5 sm:p-7 flex flex-col items-center gap-3.5 max-h-[90vh] overflow-y-auto">
        {/* Status Badge & Icon */}
        <div
          className={`w-14 h-14 rounded-full border flex items-center justify-center text-3xl mb-0.5 ${
            isWon
              ? 'bg-emerald-500/15 border-emerald-500/60 text-emerald-400'
              : 'bg-amber-500/15 border-amber-500/60 text-amber-400'
          }`}
        >
          {isWon ? <Sparkles className="w-7 h-7" /> : <AlertTriangle className="w-7 h-7" />}
        </div>

        <div>
          <h2
            className={`text-xl sm:text-2xl font-pencil font-bold tracking-wider uppercase mb-1 ${
              isWon
                ? 'text-emerald-400'
                : 'text-amber-400'
            }`}
          >
            {isWon ? 'RESCUE SUCCESSFUL! 🌈' : 'CLOUDS GONE! ☁️'}
          </h2>
          <p className="text-slate-300 text-xs">
            {isWon
              ? 'Stickman caught the rainbow breeze and soared up safely!'
              : 'The clouds vanished, but your stickman is still floating!'}
          </p>
        </div>

        {/* Target Word Revealed Box */}
        <div className="w-full p-3.5 rounded-xl bg-slate-900 border border-slate-800 flex flex-col items-center gap-0.5">
          <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">
            THE SECRET WORD WAS:
          </span>
          <span className="text-2xl sm:text-3xl font-pencil tracking-widest text-white">
            {targetWord}
          </span>
          <span className="text-[11px] text-slate-400">CATEGORY: {category}</span>
        </div>

        {/* Detailed Itemized Score Breakdown Receipt (Millisecond Accurate) */}
        {isWon && breakdown && (
          <div
            data-testid="score-breakdown-card"
            className="w-full p-3.5 rounded-xl bg-slate-950/90 border border-slate-800 flex flex-col gap-2 text-xs text-left"
          >
            <div className="flex items-center justify-between border-b border-slate-800/80 pb-1.5">
              <span className="font-bold text-[11px] text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                <Award className="w-3.5 h-3.5 text-cyan-400" />
                <span>Round Score Breakdown</span>
              </span>
              <span className="text-[11px] font-mono font-black text-cyan-300">
                +{breakdown.total} PTS
              </span>
            </div>

            <div className="flex flex-col gap-1 text-[11px] text-slate-300">
              {/* Base Word */}
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Word Base ({breakdown.wordLength} letters):</span>
                <span className="font-mono text-slate-200">+{breakdown.base}</span>
              </div>

              {/* Speed Bonus with Milliseconds */}
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1 text-slate-400">
                  <Clock className="w-3 h-3 text-amber-400" />
                  <span>Speed ({breakdown.solveTimeFormatted} • {breakdown.speedRating.label}):</span>
                </span>
                <span className="font-mono text-amber-300">+{breakdown.speedBonus}</span>
              </div>

              {/* Canopy Floats */}
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1 text-slate-400">
                  <Shield className="w-3 h-3 text-emerald-400" />
                  <span>
                    Canopy ({breakdown.isFlawless ? '7/7 Flawless 🌟' : `${breakdown.remainingFloats}/7 Floats`}):
                  </span>
                </span>
                <span className="font-mono text-emerald-300">+{breakdown.canopyBonus}</span>
              </div>

              {/* Win Streak Multiplier */}
              {breakdown.streakMultiplier > 1 && (
                <div className="flex items-center justify-between text-rose-300">
                  <span className="flex items-center gap-1">
                    <Flame className="w-3 h-3 text-rose-400 animate-pulse" />
                    <span>Streak Multiplier ({breakdown.streakCount}x • {breakdown.streakMultiplier}x):</span>
                  </span>
                  <span className="font-mono font-bold">+{breakdown.streakBonus}</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Stats Row */}
        <div className="grid grid-cols-2 gap-3 w-full text-xs">
          <div className="p-3 rounded-xl bg-slate-900 border border-slate-800">
            <span className="text-slate-500 block text-[10px]">CURRENT STREAK</span>
            <span className="text-amber-400 font-black text-lg">{streak}</span>
          </div>
          <div className="p-3 rounded-xl bg-slate-900 border border-slate-800">
            <span className="text-slate-500 block text-[10px]">TOTAL SCORE</span>
            <span className="text-slate-200 font-black text-lg">{score}</span>
          </div>
        </div>

        {/* Action Button */}
        <button
          type="button"
          onClick={onNext}
          data-testid="game-over-next-btn"
          className="w-full py-3.5 rounded-xl font-bold font-mono text-sm flex items-center justify-center gap-2 transition-all active:scale-95 cursor-pointer bg-slate-100 hover:bg-white text-slate-900 shadow-sm"
        >
          {isWon ? (
            <>
              <span>NEXT MISSION</span>
              <ArrowRight className="w-4 h-4" />
            </>
          ) : (
            <>
              <RotateCcw className="w-4 h-4" />
              <span>TRY AGAIN</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
};

