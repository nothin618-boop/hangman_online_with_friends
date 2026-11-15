'use client';

import React, { useState, useEffect } from 'react';
import { X, Settings, Dices, Volume2, VolumeX, Check, User, AlertCircle } from 'lucide-react';
import { getRandomComputerName } from '@/lib/cyber_rescue/multiplayer/roomEngine';

export interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  playerName: string;
  onSavePlayerName: (name: string) => void;
  isMuted: boolean;
  onToggleMute: () => void;
  isMatchActive?: boolean;
  existingNames?: string[];
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  playerName,
  onSavePlayerName,
  isMuted,
  onToggleMute,
  isMatchActive = false,
  existingNames = [],
}) => {
  const [currentName, setCurrentName] = useState(playerName || 'Player 1');
  const [savedFeedback, setSavedFeedback] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isTaken = React.useMemo(() => {
    const trimmed = currentName.trim().toLowerCase();
    if (!trimmed) return false;
    return (existingNames || []).some(
      (n) => (n || '').trim().toLowerCase() === trimmed
    );
  }, [currentName, existingNames]);

  const suggestedAlternative = React.useMemo(() => {
    if (!isTaken && !error) return null;
    return getRandomComputerName([
      currentName,
      ...(existingNames || []),
    ].filter(Boolean));
  }, [isTaken, error, currentName, existingNames]);

  useEffect(() => {
    if (isOpen) {
      setCurrentName(playerName || 'Player 1');
      setSavedFeedback(false);
      setError(null);
    }
  }, [isOpen, playerName]);

  if (!isOpen) return null;

  const handleRandomize = () => {
    const freshName = getRandomComputerName(
      [currentName, ...(existingNames || [])].filter(Boolean)
    );
    setCurrentName(freshName);
    setError(null);
    onSavePlayerName(freshName);
    setSavedFeedback(true);
    setTimeout(() => setSavedFeedback(false), 2000);
  };

  const handleUseSuggestion = (suggestion: string) => {
    setCurrentName(suggestion);
    setError(null);
    onSavePlayerName(suggestion);
    setSavedFeedback(true);
    setTimeout(() => setSavedFeedback(false), 2000);
  };

  const handleSave = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const finalName = currentName.trim() || getRandomComputerName(existingNames || []);
    if (
      existingNames &&
      existingNames
        .map((n) => n.trim().toLowerCase())
        .includes(finalName.toLowerCase())
    ) {
      setError('This name is already in use');
      return;
    }
    setError(null);
    setCurrentName(finalName);
    onSavePlayerName(finalName);
    setSavedFeedback(true);
    setTimeout(() => setSavedFeedback(false), 2000);
  };

  return (
    <div
      data-testid="settings-modal"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in font-sans select-none"
    >
      <div className="w-full max-w-md rounded-3xl bg-slate-900 border border-slate-800 shadow-2xl p-5 sm:p-6 text-slate-100 flex flex-col gap-4">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-xl bg-slate-800 text-slate-200">
              <Settings className="w-4 h-4" />
            </span>
            <h3 className="font-pencil text-lg sm:text-xl font-bold tracking-wider text-slate-100">
              GAME SETTINGS
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            data-testid="close-settings-x-btn"
            className="p-1 rounded-lg text-slate-400 hover:text-slate-100 hover:bg-slate-800 transition-colors cursor-pointer"
            title="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Section 1: Player Name */}
        <form onSubmit={handleSave} className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <User className="w-3.5 h-3.5 text-cyan-400" />
              <label className="text-xs font-semibold text-slate-300 uppercase tracking-wide">
                Player Name
              </label>
            </div>
            {!isMatchActive && (
              <button
                type="button"
                onClick={handleRandomize}
                data-testid="randomize-name-settings-btn"
                className="flex items-center gap-1 text-[11px] font-medium text-cyan-400 hover:text-cyan-300 transition-colors cursor-pointer"
                title="Roll random computer name"
              >
                <Dices className="w-3 h-3" />
                <span>Random</span>
              </button>
            )}
          </div>

          {isMatchActive && (
            <div
              data-testid="locked-name-notice"
              className="flex items-center gap-1.5 p-2 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs font-medium"
            >
              <AlertCircle className="w-3.5 h-3.5 shrink-0" />
              <span>Cannot change name during an active match.</span>
            </div>
          )}

          <div className="flex items-center gap-2">
            <input
              type="text"
              value={currentName}
              onChange={(e) => setCurrentName(e.target.value)}
              disabled={isMatchActive}
              placeholder="Enter player name (e.g. CyberHawk)..."
              maxLength={20}
              data-testid="settings-player-name-input"
              className={`flex-1 px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-sm font-pencil tracking-wide text-slate-100 placeholder:text-slate-600 focus:outline-none transition-all ${
                isMatchActive
                  ? 'opacity-60 cursor-not-allowed'
                  : 'focus:border-cyan-500/60 focus:ring-1 focus:ring-cyan-500/30'
              }`}
            />
            {!isMatchActive && (
              <button
                type="submit"
                data-testid="save-player-name-btn"
                className="px-4 py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs uppercase tracking-wider transition-all active:scale-95 cursor-pointer shadow-sm flex items-center gap-1"
              >
                {savedFeedback ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-slate-950" />
                    <span>Saved</span>
                  </>
                ) : (
                  <span>Save</span>
                )}
              </button>
            )}
          </div>
          {(error || isTaken) && (
            <div
              data-testid="duplicate-name-error"
              className="flex flex-col gap-2 p-3 rounded-2xl bg-rose-500/15 border border-rose-500/40 text-rose-300 text-xs font-semibold animate-fade-in shadow-md"
            >
              <div className="flex items-center gap-1.5">
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                <span>{error || 'This name is already in use'}</span>
              </div>
              {suggestedAlternative && (
                <div className="flex items-center justify-between pt-1.5 border-t border-rose-500/20 text-[11px]">
                  <span className="text-slate-300 font-normal">
                    Suggested: <strong className="text-cyan-400 font-mono font-bold">{suggestedAlternative}</strong>
                  </span>
                  <button
                    type="button"
                    onClick={() => handleUseSuggestion(suggestedAlternative)}
                    data-testid="use-suggested-name-btn"
                    className="px-2.5 py-1 rounded-lg bg-cyan-600 hover:bg-cyan-500 active:scale-95 text-white font-bold text-[11px] cursor-pointer transition-all shadow-sm"
                  >
                    Use This
                  </button>
                </div>
              )}
            </div>
          )}

          <p className="text-[11px] text-slate-400">
            {isMatchActive
              ? 'Name is locked during gameplay. You can edit it between matches or in lobby.'
              : 'This gamer handle is pre-applied by default to all your games and matches.'}
          </p>
        </form>

        {/* Section 2: Sound & Audio Settings */}
        <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-950/60 border border-slate-800/80">
          <div className="flex items-center gap-2.5">
            {isMuted ? (
              <VolumeX className="w-4 h-4 text-rose-400" />
            ) : (
              <Volume2 className="w-4 h-4 text-emerald-400" />
            )}
            <div>
              <span className="text-xs font-semibold text-slate-200 block">Game Sound Effects</span>
              <span className="text-[10px] text-slate-400 block">
                {isMuted ? 'Audio is currently muted' : 'Audio effects enabled'}
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={onToggleMute}
            data-testid="settings-audio-toggle"
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              isMuted
                ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30 hover:bg-rose-500/30'
                : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 hover:bg-emerald-500/30'
            }`}
          >
            {isMuted ? 'Unmute' : 'Mute'}
          </button>
        </div>

        {/* Section 3: Controls Info */}
        <div className="p-3 rounded-2xl bg-slate-950/40 border border-slate-800/60 text-[11px] text-slate-400 flex flex-col gap-1">
          <span className="font-semibold text-slate-300 uppercase tracking-wide text-[10px]">
            Input Controls
          </span>
          <span>Keyboard: Press any letter (A-Z) on your physical keyboard.</span>
          <span>Screen: Tap on-screen neon cloud keyboard keys.</span>
        </div>

        {/* Done / Close Button */}
        <button
          type="button"
          onClick={onClose}
          data-testid="close-settings-btn"
          className="w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold uppercase tracking-wider transition-all cursor-pointer"
        >
          Done
        </button>
      </div>
    </div>
  );
};
