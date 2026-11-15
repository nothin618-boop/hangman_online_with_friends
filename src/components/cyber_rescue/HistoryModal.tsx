'use client';

import React, { useEffect, useState } from 'react';
import { X, Trash2 } from 'lucide-react';
import { HistoryEntry, loadHistory, clearHistory } from '@/lib/cyber_rescue/history';

export interface HistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const HistoryModal: React.FC<HistoryModalProps> = ({ isOpen, onClose }) => {
  const [entries, setEntries] = useState<HistoryEntry[]>([]);

  useEffect(() => {
    if (isOpen) setEntries(loadHistory());
  }, [isOpen]);

  if (!isOpen) return null;

  const won = entries.filter((e) => e.result === 'won').length;

  return (
    <div
      data-testid="history-modal"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in font-sans select-none"
    >
      <div className="w-full max-w-md max-h-[80vh] flex flex-col gap-3 p-5 rounded-3xl bg-slate-900 border border-slate-800 shadow-2xl text-slate-100">
        <div className="flex items-center justify-between">
          <h3 className="font-pencil text-lg font-bold tracking-wider">MY HISTORY</h3>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-100 hover:bg-slate-800 transition-colors cursor-pointer"
            title="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex items-center gap-4 text-xs text-slate-400">
          <span>Played <b className="text-slate-100">{entries.length}</b></span>
          <span>Won <b className="text-emerald-300">{won}</b></span>
          <span>Lost <b className="text-rose-300">{entries.length - won}</b></span>
        </div>

        <div className="flex-1 overflow-y-auto flex flex-col gap-1.5" data-testid="history-list">
          {entries.length === 0 ? (
            <p className="text-xs text-slate-500 py-6 text-center">No games yet. Play one!</p>
          ) : (
            entries.map((e) => (
              <div
                key={e.id}
                className="flex items-center justify-between gap-3 px-3 py-2 rounded-xl bg-slate-800/50 text-xs"
              >
                <div className="min-w-0">
                  <div className="font-bold tracking-widest text-slate-100 truncate">{e.word}</div>
                  <div className="text-[10px] text-slate-500 truncate">
                    {e.mode === 'online' ? 'Online' : 'Solo'} · {e.category} ·{' '}
                    {new Date(e.playedAt).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <div className={e.result === 'won' ? 'font-bold text-emerald-300' : 'font-bold text-rose-300'}>
                    {e.result === 'won' ? 'WON' : 'LOST'}
                  </div>
                  <div className="text-[10px] text-slate-400">{e.points} pts</div>
                </div>
              </div>
            ))
          )}
        </div>

        {entries.length > 0 && (
          <button
            type="button"
            onClick={() => {
              clearHistory();
              setEntries([]);
            }}
            data-testid="history-clear-btn"
            className="self-end flex items-center gap-1 text-[11px] text-slate-400 hover:text-rose-300 transition-colors cursor-pointer"
          >
            <Trash2 className="w-3.5 h-3.5" /> Clear history
          </button>
        )}
      </div>
    </div>
  );
};
