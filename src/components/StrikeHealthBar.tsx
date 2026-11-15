'use client';

import React from 'react';

export interface StrikeHealthBarProps {
  lives: number; // 3, 2, 1, 0
  maxLives?: number; // default 3
}

export const StrikeHealthBar: React.FC<StrikeHealthBarProps> = ({ lives, maxLives = 3 }) => {
  return (
    <div className="flex items-center gap-2" title={`Signal Integrity: ${lives}/${maxLives} Bars`}>
      <span className="text-xs font-mono text-slate-400 hidden sm:inline">SIGNAL:</span>
      <div className="flex items-center gap-1.5 p-1 rounded bg-surface-elevated border border-slate-800" data-testid="strike-health-container">
        {[...Array(maxLives)].map((_, idx) => {
          const barIndex = idx + 1;
          const isActive = barIndex <= lives;

          let colorClass = 'bg-slate-700/50 border-slate-700';
          if (isActive) {
            if (lives === 3) {
              colorClass = 'bg-cyber-green border-cyber-green shadow-[0_0_8px_rgba(0,255,136,0.6)]';
            } else if (lives === 2) {
              colorClass = 'bg-cyber-amber border-cyber-amber shadow-[0_0_8px_rgba(245,158,11,0.6)]';
            } else {
              colorClass = 'bg-cyber-red border-cyber-red animate-pulse shadow-[0_0_10px_rgba(255,0,85,0.8)]';
            }
          }

          return (
            <div
              key={idx}
              data-testid={`strike-bar-${idx}`}
              data-active={isActive ? 'true' : 'false'}
              className={`w-3 sm:w-4 h-4 rounded-sm border transition-all duration-300 ${colorClass}`}
            />
          );
        })}
      </div>
      <span className="text-xs font-mono font-bold text-slate-300 ml-1">
        {lives}/{maxLives}
      </span>
    </div>
  );
};
