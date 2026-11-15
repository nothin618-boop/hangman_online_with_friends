'use client';

import React from 'react';
import { Terminal, Users, Radio, Zap, Volume2, VolumeX } from 'lucide-react';
import { StrikeHealthBar } from './StrikeHealthBar';

export interface TopBarProps {
  activeWhispers: number;
  playersOnline: number;
  streak: number;
  lives: number;
  isMuted: boolean;
  hasActiveLease: boolean;
  isLoading: boolean;
  onToggleMute: () => void;
  onIntercept: () => void;
  playerAlias: string;
}

export const TopBar: React.FC<TopBarProps> = ({
  activeWhispers,
  playersOnline,
  streak,
  lives,
  isMuted,
  hasActiveLease,
  isLoading,
  onToggleMute,
  onIntercept,
  playerAlias,
}) => {
  return (
    <header className="flex flex-wrap items-center justify-between gap-4 p-4 rounded-xl bg-surface/90 border border-slate-800 shadow-2xl backdrop-blur-md">
      {/* Brand & Codename */}
      <div className="flex items-center gap-3">
        <div className="relative">
          <Terminal className="w-6 h-6 text-cyber-cyan animate-pulse" />
          <div className="absolute -inset-1 rounded-full bg-cyber-cyan/20 blur-sm pointer-events-none" />
        </div>
        <div className="flex flex-col">
          <div className="flex items-center gap-2">
            <span className="font-mono font-black tracking-widest text-lg text-slate-100 glow-cyan">
              WHISPER
            </span>
            <span className="text-[10px] font-mono tracking-wider px-2 py-0.5 rounded bg-cyber-green/10 text-cyber-green border border-cyber-green/30">
              LIVE
            </span>
          </div>
          <span className="text-[11px] font-mono text-slate-400">
            ID: <span className="text-cyber-cyan" data-testid="player-alias">{playerAlias}</span>
          </span>
        </div>
      </div>

      {/* Telemetry Radar & Status Indicators */}
      <div className="flex flex-wrap items-center gap-4 sm:gap-6 text-xs font-mono">
        {/* Active Whispers */}
        <div className="flex items-center gap-2" title="Active Whispers in Queue">
          <Radio className="w-4 h-4 text-cyber-cyan animate-pulse" />
          <span className="text-slate-500 hidden md:inline">ACTIVE:</span>
          <span className="text-slate-200 font-bold" data-testid="active-whispers-count">{activeWhispers}</span>
        </div>

        {/* Players Online */}
        <div className="flex items-center gap-2" title="Global Operatives Online">
          <Users className="w-4 h-4 text-cyber-green" />
          <span className="text-slate-500 hidden md:inline">OPERATIVES:</span>
          <span className="text-cyber-green font-bold" data-testid="players-online-count">{playersOnline}</span>
        </div>

        {/* Personal Streak Score */}
        <div className="flex items-center gap-1.5" title="Consecutive Clean Mutations & Deductions">
          <Zap className="w-4 h-4 text-cyber-amber" />
          <span className="text-slate-500 hidden md:inline">STREAK:</span>
          <span className="text-cyber-amber font-bold text-sm" data-testid="player-streak">{streak}</span>
        </div>

        {/* Signal Bars */}
        <StrikeHealthBar lives={lives} />

        {/* Audio Mute Toggle */}
        <button
          onClick={onToggleMute}
          data-testid="audio-mute-toggle"
          className="p-2 rounded-lg bg-surface-elevated hover:bg-slate-800 border border-slate-700/70 text-slate-300 hover:text-slate-100 transition-colors"
          title={isMuted ? 'Unmute Web Audio' : 'Mute Web Audio'}
        >
          {isMuted ? (
            <VolumeX className="w-4 h-4 text-cyber-red" data-testid="volume-muted-icon" />
          ) : (
            <Volume2 className="w-4 h-4 text-cyber-cyan" data-testid="volume-active-icon" />
          )}
        </button>
      </div>

      {/* Primary Intercept CTA */}
      <div>
        <button
          onClick={onIntercept}
          disabled={hasActiveLease || isLoading}
          data-testid="intercept-whisper-btn"
          className={`relative px-4 py-2 rounded-lg font-mono text-xs md:text-sm font-bold tracking-wider uppercase transition-all duration-300 border ${
            hasActiveLease
              ? 'bg-slate-800/50 border-slate-700 text-slate-500 cursor-not-allowed'
              : 'bg-cyber-cyan/10 border-cyber-cyan text-cyber-cyan hover:bg-cyber-cyan hover:text-black hover:shadow-[0_0_20px_rgba(0,240,255,0.6)] cursor-pointer active:scale-95'
          }`}
        >
          {isLoading ? (
            <span className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 border-2 border-cyber-cyan border-t-transparent rounded-full animate-spin" />
              INTERCEPTING...
            </span>
          ) : hasActiveLease ? (
            'FREQUENCY LOCKED'
          ) : (
            'INTERCEPT WHISPER'
          )}
        </button>
      </div>
    </header>
  );
};
