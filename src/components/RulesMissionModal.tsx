'use client';

import React, { useState } from 'react';
import {
  X,
  Shield,
  BookOpen,
  Users,
  AlertTriangle,
  Zap,
  Radio,
  Clock,
  CheckCircle2,
  Lock,
  Copy,
  Check,
} from 'lucide-react';

export interface RulesMissionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenMultiplayer?: () => void;
}

export const RulesMissionModal: React.FC<RulesMissionModalProps> = ({
  isOpen,
  onClose,
  onOpenMultiplayer,
}) => {
  const [activeTab, setActiveTab] = useState<'mission' | 'roles' | 'filter' | 'multiplayer'>('mission');

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/85 backdrop-blur-md animate-fade-in"
      data-testid="rules-mission-modal"
    >
      <div className="w-full max-w-2xl rounded-2xl bg-surface border border-slate-700 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-surface-elevated/70">
          <div className="flex items-center gap-2.5">
            <BookOpen className="w-5 h-5 text-cyber-cyan animate-pulse" />
            <div>
              <h2 className="font-mono text-sm sm:text-base font-black tracking-wider text-slate-100 uppercase">
                WHISPER // CLASSIFIED FIELD MANUAL & RULES
              </h2>
              <span className="text-[11px] font-mono text-slate-400">
                Directives, Operative Roles, Filter Invariants & Multiplayer Sync
              </span>
            </div>
          </div>
          <button
            onClick={onClose}
            data-testid="rules-modal-close-btn"
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-100 hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center border-b border-slate-800 bg-surface-elevated/40 px-6 gap-2 sm:gap-4 overflow-x-auto text-xs font-mono">
          <button
            onClick={() => setActiveTab('mission')}
            className={`py-3 px-2 border-b-2 font-bold transition-all whitespace-nowrap ${
              activeTab === 'mission'
                ? 'border-cyber-cyan text-cyber-cyan'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            1. THE MISSION
          </button>
          <button
            onClick={() => setActiveTab('roles')}
            className={`py-3 px-2 border-b-2 font-bold transition-all whitespace-nowrap ${
              activeTab === 'roles'
                ? 'border-cyber-cyan text-cyber-cyan'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            2. THE TWO ROLES
          </button>
          <button
            onClick={() => setActiveTab('filter')}
            className={`py-3 px-2 border-b-2 font-bold transition-all whitespace-nowrap ${
              activeTab === 'filter'
                ? 'border-cyber-cyan text-cyber-cyan'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            3. THE FILTER RULES
          </button>
          <button
            onClick={() => setActiveTab('multiplayer')}
            className={`py-3 px-2 border-b-2 font-bold transition-all whitespace-nowrap ${
              activeTab === 'multiplayer'
                ? 'border-cyber-cyan text-cyber-cyan'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            4. MULTIPLAYER CO-OP
          </button>
        </div>

        {/* Tab Content */}
        <div className="p-6 overflow-y-auto space-y-4 font-mono text-xs leading-relaxed text-slate-300">
          {/* TAB 1: THE MISSION */}
          {activeTab === 'mission' && (
            <div className="space-y-4 animate-fade-in">
              <div className="p-4 rounded-xl bg-cyber-cyan/5 border border-cyber-cyan/30 text-slate-200">
                <span className="text-cyber-cyan font-bold block mb-1">CLASSIFIED OBJECTIVE</span>
                You are an undercover operative intercepting classified human whispers. Your objective is to pass a mutated secret sentence from operative to operative across <strong>100 successful hops</strong> to achieve <strong>VICTORY</strong> without being intercepted or destroyed by the automated Filter system.
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="p-3.5 rounded-xl bg-surface-elevated/60 border border-slate-800">
                  <div className="flex items-center gap-2 text-cyber-green font-bold mb-1">
                    <CheckCircle2 className="w-4 h-4" />
                    <span>VICTORY AT HOP 100</span>
                  </div>
                  <p className="text-slate-400 text-[11px]">
                    If players mutate and decode the sentence through 100 hops while keeping the secret intact, the whisper enters the permanent <strong>Hall of Ghosts</strong> as a classified Victory.
                  </p>
                </div>

                <div className="p-3.5 rounded-xl bg-surface-elevated/60 border border-slate-800">
                  <div className="flex items-center gap-2 text-cyber-red font-bold mb-1">
                    <AlertTriangle className="w-4 h-4" />
                    <span>3 SIGNAL STRIKES = DESTRUCTION</span>
                  </div>
                  <p className="text-slate-400 text-[11px]">
                    Every chain has <strong>3 Signal Lives</strong>. Hitting a hidden trap word or failing a decoder guess costs 1 life. At 0 lives, the chain is destroyed forever!
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: THE TWO ROLES */}
          {activeTab === 'roles' && (
            <div className="space-y-4 animate-fade-in">
              {/* Role A */}
              <div className="p-4 rounded-xl bg-surface-elevated/80 border border-cyber-cyan/40">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-bold text-cyber-cyan text-sm flex items-center gap-2">
                    <Zap className="w-4 h-4" />
                    ROLE A: THE SHIFTER (9 out of 10 Players)
                  </span>
                  <span className="px-2 py-0.5 rounded bg-cyber-cyan/10 text-[10px] text-cyber-cyan border border-cyber-cyan/30">
                    MOST COMMON
                  </span>
                </div>
                <ul className="space-y-1.5 text-slate-300 text-[11px]">
                  <li>• <strong>60-Second Timer:</strong> You hold an exclusive atomic lock on the whisper.</li>
                  <li>• <strong>Click 1 Word:</strong> Choose one word in the sentence to replace with a disguise word.</li>
                  <li>• <strong>Goal:</strong> Disguise the sentence from the surveillance system while keeping the secret clear for the next human player.</li>
                  <li>• <strong>Trace Log:</strong> Read the left drawer to see the previous 3 hops and understand how the sentence mutated!</li>
                </ul>
              </div>

              {/* Role B */}
              <div className="p-4 rounded-xl bg-surface-elevated/80 border border-cyber-amber/40">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-bold text-cyber-amber text-sm flex items-center gap-2">
                    <Radio className="w-4 h-4" />
                    ROLE B: THE DECODER (Every 10th Player: Hop 10, 20, 30...)
                  </span>
                  <span className="px-2 py-0.5 rounded bg-cyber-amber/10 text-[10px] text-cyber-amber border border-cyber-amber/30">
                    MILESTONE
                  </span>
                </div>
                <ul className="space-y-1.5 text-slate-300 text-[11px]">
                  <li>• <strong>No Word Changes:</strong> The Decoder proves the meaning hasn&apos;t been lost.</li>
                  <li>• <strong>4 Secret Themes:</strong> You are presented with 4 classified mission themes.</li>
                  <li>• <strong>Deduce the Origin:</strong> Pick which theme the mutated sentence is secretly talking about.</li>
                  <li>• <strong>Bonus Leap:</strong> Correct guess awards <strong className="text-cyber-green">+10 BONUS HOPS</strong> and +3 streak points!</li>
                </ul>
              </div>
            </div>
          )}

          {/* TAB 3: THE FILTER RULES */}
          {activeTab === 'filter' && (
            <div className="space-y-3 animate-fade-in">
              <div className="p-3.5 rounded-xl bg-surface-elevated/60 border border-slate-800 flex items-start gap-3">
                <Lock className="w-4 h-4 text-cyber-cyan shrink-0 mt-0.5" />
                <div>
                  <strong className="text-slate-100 block mb-0.5">1. Strict 274,000+ English Dictionary</strong>
                  <span className="text-slate-400 text-[11px]">
                    Replacement words must be legitimate English dictionary words. Gibberish, fake words, or non-dictionary letters are rejected with a glowing red boundary.
                  </span>
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-surface-elevated/60 border border-slate-800 flex items-start gap-3">
                <AlertTriangle className="w-4 h-4 text-cyber-red shrink-0 mt-0.5" />
                <div>
                  <strong className="text-slate-100 block mb-0.5">2. 5 Hidden Banned Trap Words</strong>
                  <span className="text-slate-400 text-[11px]">
                    Every mission has 5 secret blacklisted words closely tied to the theme. If you type a trap word, an alarm sounds and the chain takes 1 damage strike!
                  </span>
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-surface-elevated/60 border border-slate-800 flex items-start gap-3">
                <Shield className="w-4 h-4 text-cyber-green shrink-0 mt-0.5" />
                <div>
                  <strong className="text-slate-100 block mb-0.5">3. No Repeats History Invariant</strong>
                  <span className="text-slate-400 text-[11px]">
                    You cannot use any word that was already used earlier in this chain&apos;s history.
                  </span>
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-surface-elevated/60 border border-slate-800 flex items-start gap-3">
                <Clock className="w-4 h-4 text-cyber-amber shrink-0 mt-0.5" />
                <div>
                  <strong className="text-slate-100 block mb-0.5">4. Grammar & Length Lock (&lt; 12 Characters)</strong>
                  <span className="text-slate-400 text-[11px]">
                    Words must be between 1 and 11 letters (A–Z only, no numbers, hyphens, or spaces).
                  </span>
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-surface-elevated/60 border border-slate-800 flex items-start gap-3">
                <Users className="w-4 h-4 text-cyber-cyan shrink-0 mt-0.5" />
                <div>
                  <strong className="text-slate-100 block mb-0.5">5. Troll Scrub & Crowd Jury</strong>
                  <span className="text-slate-400 text-[11px]">
                    If a previous player typed a nonsense word that ruins the sentence, click <strong>SCRUB (Report Sabotage)</strong>. 3 random players vote. If 2/3 agree, the word is purged, the chain rewinds 1 hop, and the troll is shadow-banned!
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: MULTIPLAYER CO-OP */}
          {activeTab === 'multiplayer' && (
            <div className="space-y-4 animate-fade-in">
              <div className="p-4 rounded-xl bg-surface-elevated/80 border border-cyber-cyan/40">
                <span className="font-bold text-cyber-cyan text-sm block mb-1">
                  HOW MULTIPLAYER WORKS
                </span>
                <p className="text-slate-300 text-[11px] mb-3">
                  WHISPER is an asynchronous, high-concurrency multiplayer engine. Active whispers sit in a global queue. Anyone who opens the website shares the same live pool of chains!
                </p>

                <div className="space-y-2 text-[11px]">
                  <div className="p-2.5 rounded-lg bg-black/40 border border-slate-800">
                    <strong className="text-cyber-green">Option 1: Play with a Friend on Your Network</strong>
                    <p className="text-slate-400 mt-0.5">
                      Send your friends on the same Wi-Fi your game URL (e.g. <code>http://&lt;YOUR_PC_IP&gt;:3000</code>). When they click <strong>INTERCEPT WHISPER</strong>, they will intercept whispers right after you submit!
                    </p>
                  </div>

                  <div className="p-2.5 rounded-lg bg-black/40 border border-slate-800">
                    <strong className="text-cyber-amber">Option 2: Test Multiple Players on One PC</strong>
                    <p className="text-slate-400 mt-0.5">
                      Open an <strong>Incognito Window</strong> or another browser (Chrome, Edge, Firefox). Each tab acts as an independent operative with a unique player ID and streak!
                    </p>
                  </div>
                </div>
              </div>

              {onOpenMultiplayer && (
                <div className="text-center pt-2">
                  <button
                    onClick={() => {
                      onClose();
                      onOpenMultiplayer();
                    }}
                    className="px-5 py-2.5 rounded-xl bg-cyber-cyan text-black font-bold font-mono text-xs hover:bg-cyber-cyan/90 transition-all hover:shadow-[0_0_15px_rgba(0,240,255,0.5)]"
                  >
                    OPEN MULTIPLAYER SQUAD & INVITE LINK
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-800 bg-surface-elevated/70 flex items-center justify-between">
          <span className="text-[11px] font-mono text-slate-500">
            WHISPER // DIRECTIVE v2.4
          </span>
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-surface-elevated hover:bg-slate-800 border border-slate-700 text-slate-200 font-mono text-xs font-bold transition-colors"
          >
            DISMISS FIELD MANUAL
          </button>
        </div>
      </div>
    </div>
  );
};

