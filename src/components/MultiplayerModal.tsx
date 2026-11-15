'use client';

import React, { useState, useEffect } from 'react';
import { X, Users, Copy, Check, ExternalLink, Wifi, ShieldAlert, Monitor } from 'lucide-react';

export interface MultiplayerModalProps {
  isOpen: boolean;
  onClose: () => void;
  playersOnline: number;
}

export const MultiplayerModal: React.FC<MultiplayerModalProps> = ({
  isOpen,
  onClose,
  playersOnline,
}) => {
  const [copied, setCopied] = useState(false);
  const [gameUrl, setGameUrl] = useState('http://localhost:3000');

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setGameUrl(window.location.origin);
    }
  }, []);

  if (!isOpen) return null;

  const handleCopy = () => {
    if (navigator?.clipboard) {
      navigator.clipboard.writeText(gameUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  const handleOpenSecondPlayer = () => {
    if (typeof window !== 'undefined') {
      window.open(window.location.origin, '_blank', 'noopener,noreferrer');
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/85 backdrop-blur-md animate-fade-in"
      data-testid="multiplayer-modal"
    >
      <div className="w-full max-w-lg rounded-2xl bg-surface border border-slate-700 shadow-2xl overflow-hidden flex flex-col font-mono">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-surface-elevated/70">
          <div className="flex items-center gap-2.5">
            <Users className="w-5 h-5 text-cyber-green animate-pulse" />
            <div>
              <h2 className="text-sm sm:text-base font-black tracking-wider text-slate-100 uppercase">
                ADD OPERATIVES // SQUAD CO-OP
              </h2>
              <span className="text-[11px] text-slate-400">
                Connect Friends, Mobile Devices, or Secondary Windows
              </span>
            </div>
          </div>
          <button
            onClick={onClose}
            data-testid="multiplayer-modal-close-btn"
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-100 hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-5 text-xs">
          {/* Operatives Radar Status */}
          <div className="flex items-center justify-between p-3.5 rounded-xl bg-cyber-green/5 border border-cyber-green/30 text-slate-200">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-cyber-green animate-ping" />
              <span className="font-bold">GLOBAL NETWORK STATUS:</span>
            </div>
            <span className="px-2.5 py-1 rounded bg-cyber-green/20 text-cyber-green font-bold">
              {playersOnline} OPERATIVES ONLINE
            </span>
          </div>

          {/* Share Game Link */}
          <div className="space-y-1.5">
            <label className="text-[11px] uppercase tracking-wider text-slate-400 font-bold">
              INVITE LINK (SHARE WITH FRIENDS):
            </label>
            <div className="flex items-center gap-2">
              <input
                type="text"
                readOnly
                value={gameUrl}
                className="flex-1 px-3 py-2 rounded-xl bg-surface-elevated border border-slate-700 text-slate-200 text-xs font-mono select-all outline-none"
              />
              <button
                type="button"
                onClick={handleCopy}
                data-testid="copy-invite-link-btn"
                className="px-3.5 py-2 rounded-xl bg-cyber-cyan text-black font-bold flex items-center gap-1.5 hover:bg-cyber-cyan/90 transition-all hover:shadow-[0_0_15px_rgba(0,240,255,0.4)]"
              >
                {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                <span>{copied ? 'COPIED!' : 'COPY'}</span>
              </button>
            </div>
          </div>

          {/* Quick Connection Methods */}
          <div className="space-y-3">
            <div className="p-3 rounded-xl bg-surface-elevated/60 border border-slate-800 flex items-start gap-3">
              <Monitor className="w-4 h-4 text-cyber-cyan shrink-0 mt-0.5" />
              <div className="space-y-1 flex-1">
                <strong className="text-slate-100 block">Method 1: Open a 2nd Operative on this PC</strong>
                <p className="text-slate-400 text-[11px] leading-relaxed">
                  Open a second browser tab or an Incognito window. Both players will connect to the same real-time server pool!
                </p>
                <button
                  type="button"
                  onClick={handleOpenSecondPlayer}
                  className="mt-1 inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-surface-elevated border border-slate-700 hover:border-cyber-cyan text-cyber-cyan text-[11px] font-bold transition-all"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>Launch 2nd Player Window Now</span>
                </button>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-surface-elevated/60 border border-slate-800 flex items-start gap-3">
              <Wifi className="w-4 h-4 text-cyber-green shrink-0 mt-0.5" />
              <div>
                <strong className="text-slate-100 block">Method 2: Connect from Phones & Laptops on Same Wi-Fi</strong>
                <p className="text-slate-400 text-[11px] leading-relaxed">
                  Your server is running on <code>0.0.0.0:3000</code>. Anyone on your local Wi-Fi can open your computer&apos;s IP address (e.g. <code>http://192.168.x.x:3000</code>) on their phone or tablet to play with you!
                </p>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-surface-elevated/60 border border-slate-800 flex items-start gap-3">
              <ShieldAlert className="w-4 h-4 text-cyber-amber shrink-0 mt-0.5" />
              <div>
                <strong className="text-slate-100 block">How Chain Handoff Works in Multiplayer:</strong>
                <p className="text-slate-400 text-[11px] leading-relaxed">
                  When Operative 1 clicks &quot;Confirm Disguise&quot;, that mutated sentence immediately returns to the shared pool. When Operative 2 clicks &quot;Intercept Whisper&quot;, they receive the chain you just touched!
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-slate-800 bg-surface-elevated/70 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-surface-elevated hover:bg-slate-800 border border-slate-700 text-slate-200 text-xs font-bold transition-colors"
          >
            CLOSE
          </button>
        </div>
      </div>
    </div>
  );
};

