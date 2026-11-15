'use client';

import React, { useState, useEffect } from 'react';
import { Zap, AlertTriangle, KeyRound } from 'lucide-react';

export interface DecoderQuizProps {
  themeOptions: string[]; // exactly 4 options
  isSubmitting: boolean;
  onSubmitGuess: (guess: string) => void;
}

export const DecoderQuiz: React.FC<DecoderQuizProps> = ({
  themeOptions,
  isSubmitting,
  onSubmitGuess,
}) => {
  const [selectedOption, setSelectedOption] = useState<string | null>(null);

  // Keyboard Hotkeys: [1], [2], [3], [4]
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (isSubmitting) return;
      const num = parseInt(e.key, 10);
      if (num >= 1 && num <= 4 && themeOptions[num - 1]) {
        setSelectedOption(themeOptions[num - 1]);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [themeOptions, isSubmitting]);

  const handleSubmit = (guess: string) => {
    if (isSubmitting) return;
    onSubmitGuess(guess);
  };

  return (
    <div
      className="w-full max-w-4xl p-6 sm:p-8 rounded-2xl bg-surface/90 border border-cyber-cyan/40 shadow-2xl backdrop-blur-md flex flex-col gap-6 animate-fade-in"
      data-testid="decoder-quiz-container"
    >
      {/* Title & Stakes */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-2 text-cyber-cyan font-mono text-xs tracking-widest uppercase mb-1">
            <KeyRound className="w-4 h-4 animate-pulse" />
            <span>THE DECODER RESOLUTION PROTOCOL (HOP #10x)</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black font-mono tracking-tight text-slate-100">
            DEDUCE THE CLASSIFIED ORIGIN THEME
          </h2>
        </div>

        <div className="flex flex-col text-right text-xs font-mono">
          <span className="text-cyber-green flex items-center justify-end gap-1">
            <Zap className="w-3.5 h-3.5" /> +10 BONUS HOPS ON SUCCESS
          </span>
          <span className="text-cyber-red flex items-center justify-end gap-1">
            <AlertTriangle className="w-3.5 h-3.5" /> -1 SIGNAL BAR ON FAILURE
          </span>
        </div>
      </div>

      {/* 4 Candidate Options Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {themeOptions.map((theme, index) => {
          const isSelected = selectedOption === theme;
          return (
            <button
              key={theme}
              type="button"
              disabled={isSubmitting}
              data-testid={`decoder-option-${index}`}
              data-selected={isSelected ? 'true' : 'false'}
              onClick={() => setSelectedOption(theme)}
              className={`p-5 rounded-xl border text-left font-mono transition-all duration-200 relative overflow-hidden group ${
                isSelected
                  ? 'bg-cyber-cyan/10 border-cyber-cyan shadow-[0_0_20px_rgba(0,240,255,0.4)]'
                  : 'bg-surface-elevated/70 border-slate-800 hover:border-slate-600 hover:bg-surface-elevated'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="px-2 py-0.5 rounded bg-black/40 border border-slate-700 text-slate-400 text-xs font-bold group-hover:border-cyber-cyan group-hover:text-cyber-cyan transition-colors">
                  KEY [{index + 1}]
                </span>
                {isSelected && (
                  <span className="w-2.5 h-2.5 rounded-full bg-cyber-cyan animate-pulse" />
                )}
              </div>

              <div className="text-base sm:text-lg font-bold text-slate-100 capitalize">
                {theme.replace(/-/g, ' ')}
              </div>
            </button>
          );
        })}
      </div>

      {/* Submit Deduction Button */}
      <div className="flex items-center justify-between pt-4 border-t border-slate-800">
        <span className="text-xs font-mono text-slate-500 hidden sm:inline">
          Press hotkeys [1-4] or click to select, then confirm deduction.
        </span>

        <button
          onClick={() => selectedOption && handleSubmit(selectedOption)}
          disabled={!selectedOption || isSubmitting}
          data-testid="decoder-submit-btn"
          className={`px-8 py-3 rounded-xl font-mono text-xs sm:text-sm font-bold tracking-wider uppercase transition-all duration-300 ${
            !selectedOption || isSubmitting
              ? 'bg-slate-800 text-slate-600 border border-slate-700 cursor-not-allowed'
              : 'bg-cyber-green text-black hover:bg-white hover:shadow-[0_0_25px_rgba(0,255,136,0.8)] cursor-pointer active:scale-95'
          }`}
        >
          {isSubmitting ? 'ANALYZING CIPHER...' : 'CONFIRM THEME DEDUCTION'}
        </button>
      </div>
    </div>
  );
};
