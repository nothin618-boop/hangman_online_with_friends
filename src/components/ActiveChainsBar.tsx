'use client';

import React from 'react';
import Link from 'next/link';
import { Layers, ArrowRight } from 'lucide-react';
import { MonitoredChain } from '@/hooks/useWhisperGame';

export interface ActiveChainsBarProps {
  chains: MonitoredChain[];
}

export const ActiveChainsBar: React.FC<ActiveChainsBarProps> = ({ chains }) => {
  if (chains.length === 0) return null;

  return (
    <div className="w-full mt-auto pt-6" data-testid="active-chains-bar">
      <div className="p-4 rounded-xl bg-surface/90 border border-slate-800 shadow-2xl backdrop-blur-md">
        <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-800/80 text-xs font-mono">
          <div className="flex items-center gap-2 text-slate-300">
            <Layers className="w-4 h-4 text-cyber-cyan" />
            <span className="font-bold tracking-wider">MY ACTIVE FREQUENCIES</span>
            <span
              className="px-1.5 py-0.2 rounded bg-surface-elevated text-slate-400 text-[10px]"
              data-testid="monitored-chains-count"
            >
              {chains.length} TRACKED
            </span>
          </div>
          <span className="text-slate-500 text-[11px] hidden sm:inline">
            Real-time SSE Mutation Updates
          </span>
        </div>

        {/* Horizontal scroll cards */}
        <div className="flex items-center gap-3 overflow-x-auto pb-1 scrollbar-none">
          {chains.map((chain) => {
            const isVictory = chain.status === 'victory';
            const isDestroyed = chain.status === 'destroyed';

            let statusBadge = (
              <span className="px-1.5 py-0.5 rounded bg-cyber-green/10 border border-cyber-green/30 text-cyber-green text-[10px] animate-pulse">
                ACTIVE
              </span>
            );
            if (isVictory) {
              statusBadge = (
                <span className="px-1.5 py-0.5 rounded bg-cyber-purple/20 border border-cyber-purple/40 text-cyber-purple text-[10px] font-bold">
                  VICTORY
                </span>
              );
            } else if (isDestroyed) {
              statusBadge = (
                <span className="px-1.5 py-0.5 rounded bg-cyber-red/20 border border-cyber-red/40 text-cyber-red text-[10px]">
                  DESTROYED
                </span>
              );
            }

            return (
              <div
                key={chain.chainId}
                data-testid={`chain-card-${chain.chainId}`}
                className="shrink-0 w-60 p-3 rounded-lg bg-surface-elevated border border-slate-800 hover:border-slate-700 transition-all font-mono text-xs flex flex-col gap-2"
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-200">
                    #{chain.chainId.slice(0, 8)}
                  </span>
                  {statusBadge}
                </div>

                <div className="flex items-center justify-between text-slate-400 text-[11px]">
                  <span>
                    Hop: <strong className="text-slate-200">{chain.currentHop}/100</strong>
                  </span>
                  <span>
                    Bars: <strong className="text-cyber-green">{chain.lives}/3</strong>
                  </span>
                  <span className="uppercase text-[10px] text-slate-500">[{chain.role}]</span>
                </div>

                {(isVictory || isDestroyed) && (
                  <Link
                    href={`/ghost/${chain.chainId}`}
                    data-testid={`ghost-link-${chain.chainId}`}
                    className="mt-1 flex items-center justify-center gap-1 px-2 py-1 rounded bg-black/40 hover:bg-cyber-cyan hover:text-black border border-slate-700 hover:border-cyber-cyan text-cyber-cyan text-[11px] font-bold transition-all"
                  >
                    <span>View Ghost Receipt</span>
                    <ArrowRight className="w-3 h-3" />
                  </Link>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
