'use client';

import React, { useState, useEffect } from 'react';
import { ShieldAlert, AlertTriangle, Check, Clock } from 'lucide-react';
import { JurySummonPayload } from '@/lib/events';

export interface JuryPopupModalProps {
  juryCase: JurySummonPayload | null;
  onVote: (caseId: string, isSabotage: boolean) => void;
  onDismiss: () => void;
}

export const JuryPopupModal: React.FC<JuryPopupModalProps> = ({
  juryCase,
  onVote,
  onDismiss,
}) => {
  const [secondsLeft, setSecondsLeft] = useState<number>(20);

  useEffect(() => {
    if (!juryCase) {
      setSecondsLeft(20);
      return;
    }

    const interval = setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          onDismiss();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [juryCase, onDismiss]);

  if (!juryCase) return null;

  return (
    <div
      data-testid="jury-popup-modal"
      className="fixed bottom-6 right-6 z-50 w-full max-w-md p-5 rounded-2xl bg-surface/95 border-2 border-cyber-amber shadow-[0_0_30px_rgba(245,158,11,0.5)] backdrop-blur-md font-mono animate-slide-up"
    >
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-800">
        <div className="flex items-center gap-2 text-cyber-amber">
          <ShieldAlert className="w-5 h-5 animate-pulse" />
          <span className="font-bold text-sm tracking-wider">CROWD JURY SUMMONS</span>
        </div>
        <div className="flex items-center gap-1 text-xs text-cyber-amber font-bold">
          <Clock className="w-3.5 h-3.5" />
          <span data-testid="jury-countdown">{secondsLeft}s</span>
        </div>
      </div>

      {/* Body & Diff */}
      <div className="py-4 flex flex-col gap-3 text-xs">
        <p className="text-slate-300">
          An operative flagged suspected sabotage in Chain{' '}
          <strong className="text-slate-100">#{juryCase.chainId.slice(0, 8)}</strong>:
        </p>

        <div className="p-3 rounded-lg bg-surface-elevated border border-slate-800 flex flex-col gap-2">
          <div>
            <span className="text-slate-500 text-[10px]">BEFORE:</span>
            <p className="text-slate-300 italic" data-testid="jury-before-sentence">{juryCase.previousSentence}</p>
          </div>
          <div>
            <span className="text-slate-500 text-[10px]">SUSPECTED MUTATION:</span>
            <p className="text-slate-200" data-testid="jury-mutated-sentence">
              {juryCase.newSentence.split(' ').map((word, idx) => {
                const isFlagged = word.toLowerCase().includes(juryCase.flaggedWord.toLowerCase());
                return isFlagged ? (
                  <span
                    key={idx}
                    className="px-1.5 py-0.5 mx-0.5 rounded bg-cyber-red/20 text-cyber-red font-bold border border-cyber-red/50 animate-pulse"
                  >
                    {word}
                  </span>
                ) : (
                  <span key={idx}> {word}</span>
                );
              })}
            </p>
          </div>
        </div>

        <p className="text-[11px] text-slate-400">
          Is this intentional gibberish / troll sabotage? (2/3 majority consensus rewinds chain 1 hop).
        </p>
      </div>

      {/* Buttons */}
      <div className="flex items-center gap-3 pt-2">
        <button
          onClick={() => onVote(juryCase.caseId, true)}
          data-testid="jury-vote-sabotage-btn"
          className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg bg-cyber-red/20 hover:bg-cyber-red hover:text-black border border-cyber-red text-cyber-red font-bold text-xs transition-all active:scale-95"
        >
          <AlertTriangle className="w-3.5 h-3.5" />
          YES, SABOTAGE
        </button>
        <button
          onClick={() => onVote(juryCase.caseId, false)}
          data-testid="jury-vote-legitimate-btn"
          className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg bg-cyber-green/20 hover:bg-cyber-green hover:text-black border border-cyber-green text-cyber-green font-bold text-xs transition-all active:scale-95"
        >
          <Check className="w-3.5 h-3.5" />
          NO, LEGITIMATE
        </button>
      </div>
    </div>
  );
};
