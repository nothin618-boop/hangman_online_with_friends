'use client';

import React from 'react';
import { GhostHopDiff } from '@/lib/ghosts';
import { Award, AlertTriangle } from 'lucide-react';

export interface GhostTimelineProps {
  diffs: GhostHopDiff[];
}

export const GhostTimeline: React.FC<GhostTimelineProps> = ({ diffs }) => {
  return (
    <div className="flex flex-col gap-6 font-mono text-xs sm:text-sm" data-testid="ghost-timeline">
      {diffs.map((hop, idx) => {
        const isDecoder = hop.role === 'decoder';

        return (
          <div
            key={idx}
            data-testid={`ghost-timeline-hop-${hop.hopNumber}`}
            className="flex items-start gap-4 p-4 sm:p-5 rounded-xl bg-surface-elevated/60 border border-slate-800 hover:border-slate-700 transition-all"
          >
            {/* Hop badge */}
            <div className="shrink-0 flex flex-col items-center">
              <span className="px-2.5 py-1 rounded bg-surface border border-slate-700 text-cyber-cyan font-bold text-xs">
                #{hop.hopNumber}
              </span>
              <div className="w-0.5 h-full bg-slate-800 mt-2" />
            </div>

            {/* Hop Details */}
            <div className="flex-1 flex flex-col gap-2">
              <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-400">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-slate-200">{hop.playerAlias}</span>
                  <span className="px-1.5 py-0.5 rounded bg-black/40 text-[10px] uppercase text-slate-400 border border-slate-800">
                    {hop.role}
                  </span>
                </div>
                <span className="text-slate-500 text-[11px]">
                  {new Date(hop.timestamp).toLocaleString()}
                </span>
              </div>

              {/* Mutation View */}
              {isDecoder ? (
                <div className="p-3 rounded-lg bg-black/40 border border-slate-800/80 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-slate-500">Deduced:</span>
                    <strong className="text-slate-200">{hop.decoderGuess}</strong>
                  </div>
                  {hop.isCorrectGuess ? (
                    <span className="px-2 py-0.5 rounded bg-cyber-green/20 text-cyber-green border border-cyber-green/40 text-xs flex items-center gap-1 font-bold">
                      <Award className="w-3.5 h-3.5" /> +10 BONUS HOPS
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 rounded bg-cyber-red/20 text-cyber-red border border-cyber-red/40 text-xs">
                      INCORRECT (-1 BAR)
                    </span>
                  )}
                </div>
              ) : (
                <div className="flex flex-col gap-2">
                  <div className="flex items-center gap-2">
                    <span className="line-through text-cyber-red/80 font-bold">
                      {hop.oldWord}
                    </span>
                    <span className="text-slate-500">→</span>
                    <span className="text-cyber-green font-bold text-base">
                      {hop.newWord}
                    </span>
                    {hop.isTrapHit && (
                      <span className="px-1.5 py-0.5 rounded bg-cyber-red/20 text-cyber-red border border-cyber-red/40 text-[10px] flex items-center gap-1">
                        <AlertTriangle className="w-3.5 h-3.5" /> TRAP HIT (-1 BAR)
                      </span>
                    )}
                  </div>

                  <p className="p-3 rounded-lg bg-black/30 border border-slate-800/60 text-slate-300 font-mono text-xs sm:text-sm">
                    {hop.newSentence}
                  </p>
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};
