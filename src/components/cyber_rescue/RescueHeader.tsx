'use client';

import React from 'react';
import { Volume2, VolumeX, Settings, LogOut, User, LayoutGrid, History } from 'lucide-react';
import { GameMode } from '@/lib/cyber_rescue/engine';

export interface RescueHeaderProps {
  streak: number;
  score: number;
  mode?: GameMode;
  turn: 1 | 2;
  player1Score: number;
  player2Score: number;
  isMuted: boolean;
  playerName?: string;
  onToggleMute: () => void;
  onChangeMode?: (mode: GameMode) => void;
  onNewGame?: () => void;
  onOpenSettings?: () => void;
  onLeaveMatch?: () => void;
  onOpenMenu?: () => void;
  onOpenHistory?: () => void;
}

export const RescueHeader: React.FC<RescueHeaderProps> = ({
  streak,
  score,
  turn,
  isMuted,
  playerName,
  onToggleMute,
  onNewGame,
  onOpenSettings,
  onLeaveMatch,
  onOpenMenu,
  onOpenHistory,
}) => {
  return (
    <header className="flex items-center justify-between gap-3 px-2 py-2 w-full select-none">
      {/* 1. Brand Title (left) */}
      <div className="flex items-center gap-2.5 min-w-0">
        <span className="text-2xl drop-shadow-[0_0_8px_rgba(167,139,250,0.55)]">🪂</span>
        <span className="font-pencil font-bold text-lg sm:text-2xl tracking-widest bg-gradient-to-r from-slate-50 via-cyan-200 to-cyan-400 bg-clip-text text-transparent truncate">
          STICKMAN RESCUE
        </span>
      </div>

      {/* 3. Minimal Controls */}
      <div className="flex items-center justify-end gap-2 sm:gap-3 text-xs font-sans">
        {/* Player Name Display in Topbar (Clickable to open Settings) */}
        {playerName && (
          <button
            type="button"
            onClick={onOpenSettings}
            data-testid="topbar-player-name-btn"
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-800/40 hover:bg-slate-800/70 text-cyan-300 hover:text-cyan-200 transition-all font-pencil text-xs font-bold tracking-wide cursor-pointer"
            title="Player Name (Click to edit in Settings)"
          >
            <User className="w-3.5 h-3.5 text-cyan-400" />
            <span className="truncate max-w-[120px]">{playerName}</span>
          </button>
        )}

        {/* Leave Match Button (When in an active online match) */}
        {onLeaveMatch && (
          <button
            type="button"
            onClick={onLeaveMatch}
            data-testid="topbar-leave-match-btn"
            className="flex items-center gap-1 px-2.5 py-1 rounded-full text-rose-400 hover:text-rose-300 bg-rose-500/10 hover:bg-rose-500/20 text-xs font-bold transition-all cursor-pointer"
            title="Leave Match"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Leave Match</span>
            <span className="sm:hidden">Leave</span>
          </button>
        )}

        {/* Player history */}
        {onOpenHistory && (
          <button
            type="button"
            onClick={onOpenHistory}
            data-testid="topbar-history-btn"
            className="p-2 rounded-full text-slate-400 hover:text-slate-100 hover:bg-slate-800/60 transition-colors cursor-pointer"
            title="My History"
          >
            <History className="w-4 h-4" />
          </button>
        )}

        {/* Back to start menu (solo play, no active online match) */}
        {onOpenMenu && !onLeaveMatch && (
          <button
            type="button"
            onClick={onOpenMenu}
            data-testid="topbar-menu-btn"
            className="flex items-center gap-1 px-2.5 py-1 rounded-full text-slate-300 hover:text-white bg-slate-800/40 hover:bg-slate-800/70 text-xs font-bold transition-all cursor-pointer"
            title="Main Menu"
          >
            <LayoutGrid className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Menu</span>
          </button>
        )}

        {/* Settings Button (Player Name & Game Preferences) */}
        {onOpenSettings && (
          <button
            type="button"
            onClick={onOpenSettings}
            data-testid="settings-btn"
            className="p-2 rounded-full text-slate-400 hover:text-slate-100 hover:bg-slate-800/60 transition-colors cursor-pointer"
            title="Settings (Player Name & Audio)"
          >
            <Settings className="w-4 h-4" />
          </button>
        )}

        {/* Audio Mute Button */}
        <button
          type="button"
          onClick={onToggleMute}
          data-testid="audio-mute-toggle"
          className="p-2 rounded-full text-slate-400 hover:text-slate-100 hover:bg-slate-800/60 transition-colors cursor-pointer"
          title={isMuted ? 'Unmute Audio' : 'Mute Audio'}
        >
          {isMuted ? (
            <VolumeX className="w-4 h-4 text-rose-400" />
          ) : (
            <Volume2 className="w-4 h-4" />
          )}
        </button>
      </div>
    </header>
  );
};

