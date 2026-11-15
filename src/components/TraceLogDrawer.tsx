'use client';

import React, { useState } from 'react';
import { History, ChevronDown, ChevronUp, AlertOctagon, Undo2, Award } from 'lucide-react';
import { Hop } from '@/lib/types';
import { generatePlayerAlias } from '@/lib/ghosts';

export interface TraceLogDrawerProps {
  traceLog?: Hop[];
}

export const TraceLogDrawer: React.FC<TraceLogDrawerProps> = ({ traceLog = [] }) => {
  const [isOpen, setIsOpen] = useState<boolean>(false);

  if (traceLog.length === 0) return null;

  return (
    <div
      className="w-full max-w-4xl mt-4 rounded-xl bg-surface/80 border border-slate-800 shadow-xl overflow-hidden font-mono"
      data-testid="trace-log-drawer"
    >
      {/* Drawer Toggle Header */}
      <button
        type="button"
        data-testid="trace-log-toggle-btn"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-5 py-3 flex items-center justify-between bg-surface-elevated/40 hover:bg-surface-elevated/80 transition-colors text-xs text-slate-400"
      >
        <div className="flex items-center gap-2">
          <History className="w-4 h-4 text-cyber-cyan" />
          <span className="font-bold text-slate-300">
            TRACE LOG // RECENT {Math.min(3, traceLog.length)} HOPS
          </span>
        </div>
        <div className="flex items-center gap-1 text-slate-500">
          <span>{isOpen ? 'COLLAPSE' : 'EXPAND'}</span>
          {isOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </div>
      </button>

      {/* Drawer Content */}
      {isOpen && (
        <div
          data-testid="trace-log-content"
          className="p-4 flex flex-col gap-3 divide-y divide-slate-800/80"
        >
          {traceLog.slice(-3).map((hop) => {
            const alias = hop.playerAlias || generatePlayerAlias(hop.playerId);
            const isShifter = hop.role === 'shifter';

            return (
              <div
                key={hop.hopNumber}
                data-testid={`trace-hop-${hop.hopNumber}`}
                className="pt-3 first:pt-0 flex flex-col gap-1.5 text-xs"
              >
                <div className="flex items-center justify-between text-slate-400">
                  <div className="flex items-center gap-2">
                    <span className="px-1.5 py-0.5 rounded bg-surface-elevated border border-slate-700 text-slate-300 font-bold">
                      HOP #{hop.hopNumber}
                    </span>
                    <span className="text-cyber-cyan">{alias}</span>
                    <span className="text-[10px] text-slate-500 uppercase">
                      [{hop.role}]
                    </span>
                  </div>

                  <span className="text-slate-600 text-[11px]">
                    {new Date(hop.timestamp).toLocaleTimeString()}
                  </span>
                </div>

                {/* Diff View */}
                {isShifter ? (
                  <div className="flex items-center gap-2 pl-2 border-l-2 border-cyber-cyan/40">
                    <span className="line-through text-cyber-red/80">
                      {hop.oldWord || 'root'}
                    </span>
                    <span className="text-slate-500">→</span>
                    <span className="text-cyber-green font-bold">
                      {hop.newWord || 'disguise'}
                    </span>
                    {hop.isTrapHit && (
                      <span className="ml-2 px-1.5 py-0.5 rounded bg-cyber-red/20 text-cyber-red border border-cyber-red/40 text-[10px] flex items-center gap-1">
                        <AlertOctagon className="w-3 h-3" /> TRAP HIT (-1 BAR)
                      </span>
                    )}
                    {hop.isRevoked && (
                      <span className="ml-2 px-1.5 py-0.5 rounded bg-cyber-amber/20 text-cyber-amber border border-cyber-amber/40 text-[10px] flex items-center gap-1">
                        <Undo2 className="w-3 h-3" /> JURY REVOKED
                      </span>
                    )}
                  </div>
                ) : (
                  <div className="flex items-center gap-2 pl-2 border-l-2 border-cyber-amber/40">
                    <span className="text-slate-400">Deduced Theme:</span>
                    <span className="font-bold text-slate-200">{hop.decoderGuess}</span>
                    {hop.isCorrectGuess ? (
                      <span className="ml-2 px-1.5 py-0.5 rounded bg-cyber-green/20 text-cyber-green border border-cyber-green/40 text-[10px] flex items-center gap-1">
                        <Award className="w-3 h-3" /> +10 BONUS HOPS
                      </span>
                    ) : (
                      <span className="ml-2 px-1.5 py-0.5 rounded bg-cyber-red/20 text-cyber-red border border-cyber-red/40 text-[10px]">
                        INCORRECT (-1 BAR)
                      </span>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
