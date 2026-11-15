'use client';

import React, { useState } from 'react';
import { Zap, Lock, User, Plus, ArrowRight, Loader2, Users } from 'lucide-react';

export interface StartMenuProps {
  playerName: string;
  /** True while a quick-play / room request is waiting for the server. */
  busy?: boolean;
  onQuickPlay: () => void;
  onCreatePrivate: () => void;
  onJoinPrivate: (code: string) => void;
  onSinglePlayer: () => void;
}

export const StartMenu: React.FC<StartMenuProps> = ({
  playerName,
  busy = false,
  onQuickPlay,
  onCreatePrivate,
  onJoinPrivate,
  onSinglePlayer,
}) => {
  const [privateOpen, setPrivateOpen] = useState(false);
  const [code, setCode] = useState('');

  const submitCode = (e: React.FormEvent) => {
    e.preventDefault();
    const val = code.trim();
    if (!val || busy) return;
    onJoinPrivate(val.toUpperCase());
  };

  return (
    <div
      data-testid="start-menu"
      className="flex-1 flex flex-col items-center justify-center w-full py-6 sm:py-12 gap-6 animate-fade-in select-none"
    >
      <div className="text-center space-y-1">
        <p className="text-xs sm:text-sm text-slate-400 font-sans">
          Welcome, <span className="text-cyan-300 font-bold">{playerName}</span>
        </p>
        <h2 className="font-pencil text-2xl sm:text-3xl font-bold tracking-widest text-slate-100">
          CHOOSE HOW TO PLAY
        </h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 w-full max-w-4xl font-sans">
        {/* 1. QUICK PLAY (public multiplayer) */}
        <button
          type="button"
          onClick={onQuickPlay}
          disabled={busy}
          data-testid="menu-quick-play-btn"
          className="group flex flex-col items-start gap-3 p-5 rounded-3xl bg-gradient-to-br from-emerald-600/25 to-teal-700/10 hover:from-emerald-600/40 hover:to-teal-700/20 text-left transition-all active:scale-[0.98] disabled:opacity-60 disabled:cursor-wait cursor-pointer ring-1 ring-emerald-500/30 hover:ring-emerald-400/60"
        >
          <span className="flex items-center justify-center w-11 h-11 rounded-2xl bg-emerald-500/20 text-emerald-300">
            {busy ? <Loader2 className="w-5 h-5 animate-spin" /> : <Zap className="w-5 h-5 fill-emerald-300" />}
          </span>
          <span className="space-y-1">
            <span className="block font-pencil text-xl font-bold tracking-wide text-slate-100">Quick Play</span>
            <span className="block text-xs text-slate-400 leading-relaxed">
              Jump into a public lobby and race other players live. Up to 12 players.
            </span>
          </span>
          <span className="mt-auto inline-flex items-center gap-1.5 text-[11px] font-bold text-emerald-300">
            <Users className="w-3.5 h-3.5" /> Public · Multiplayer
          </span>
        </button>

        {/* 2. PRIVATE ROOM (create / join with code) */}
        <div
          data-testid="menu-private-card"
          className="flex flex-col items-start gap-3 p-5 rounded-3xl bg-gradient-to-br from-violet-600/25 to-fuchsia-700/10 text-left ring-1 ring-violet-500/30"
        >
          <span className="flex items-center justify-center w-11 h-11 rounded-2xl bg-violet-500/20 text-violet-300">
            <Lock className="w-5 h-5" />
          </span>
          <span className="space-y-1">
            <span className="block font-pencil text-xl font-bold tracking-wide text-slate-100">Private Room</span>
            <span className="block text-xs text-slate-400 leading-relaxed">
              Create a room and share the code with friends, or join one with a code.
            </span>
          </span>

          {!privateOpen ? (
            <button
              type="button"
              onClick={() => setPrivateOpen(true)}
              disabled={busy}
              data-testid="menu-private-btn"
              className="mt-auto w-full py-2 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-xs font-bold transition-all active:scale-[0.98] disabled:opacity-60 cursor-pointer"
            >
              Create / Join
            </button>
          ) : (
            <div className="mt-auto w-full flex flex-col gap-2">
              <button
                type="button"
                onClick={onCreatePrivate}
                disabled={busy}
                data-testid="menu-create-room-btn"
                className="w-full py-2 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-xs font-bold flex items-center justify-center gap-1.5 transition-all active:scale-[0.98] disabled:opacity-60 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" /> Create Room
              </button>
              <form onSubmit={submitCode} className="flex items-center gap-2">
                <input
                  type="text"
                  value={code}
                  onChange={(e) => setCode(e.target.value.toUpperCase())}
                  placeholder="CODE (E.G. SKY-42)"
                  maxLength={18}
                  data-testid="menu-room-code-input"
                  className="flex-1 min-w-0 px-3 py-2 rounded-xl bg-slate-950/70 text-slate-100 text-xs font-mono uppercase tracking-wider focus:outline-none ring-1 ring-slate-700 focus:ring-violet-400"
                />
                <button
                  type="submit"
                  disabled={busy || !code.trim()}
                  data-testid="menu-join-room-btn"
                  className="px-3 py-2 rounded-xl bg-slate-100 hover:bg-white text-slate-900 text-xs font-bold flex items-center gap-1 transition-all active:scale-[0.98] disabled:opacity-50 cursor-pointer"
                >
                  Join <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </form>
            </div>
          )}
        </div>

        {/* 3. SINGLE PLAYER */}
        <button
          type="button"
          onClick={onSinglePlayer}
          disabled={busy}
          data-testid="menu-single-player-btn"
          className="group flex flex-col items-start gap-3 p-5 rounded-3xl bg-gradient-to-br from-amber-500/20 to-orange-700/10 hover:from-amber-500/35 hover:to-orange-700/20 text-left transition-all active:scale-[0.98] disabled:opacity-60 cursor-pointer ring-1 ring-amber-500/30 hover:ring-amber-400/60"
        >
          <span className="flex items-center justify-center w-11 h-11 rounded-2xl bg-amber-500/20 text-amber-300">
            <User className="w-5 h-5" />
          </span>
          <span className="space-y-1">
            <span className="block font-pencil text-xl font-bold tracking-wide text-slate-100">Single Player</span>
            <span className="block text-xs text-slate-400 leading-relaxed">
              Play solo at your own pace. Build streaks, use power-ups, pick any category.
            </span>
          </span>
          <span className="mt-auto inline-flex items-center gap-1.5 text-[11px] font-bold text-amber-300">
            <User className="w-3.5 h-3.5" /> Solo · Offline
          </span>
        </button>
      </div>
    </div>
  );
};
