'use client';

import React from 'react';
import { Eye, AlertTriangle, Zap, BookOpen, Users, Radio, ShieldAlert, Play, ArrowRight } from 'lucide-react';
import { SanitizedChain, PlayerRole } from '@/lib/types';
import { tokenizeSentence } from '@/lib/sentence';
import { DecoderQuiz } from './DecoderQuiz';
import { TraceLogDrawer } from './TraceLogDrawer';

export interface CenterStageProps {
  activeChain: SanitizedChain | null;
  role: PlayerRole | null;
  secondsRemaining: number;
  isPulsing: boolean;
  onSelectWord: (index: number, rootWord: string, rawToken: string) => void;
  onReportSabotage: () => void;
  onSubmitDecoderGuess: (guess: string) => void;
  isLoading: boolean;
  onIntercept?: () => void;
  onOpenRules?: () => void;
  onOpenMultiplayer?: () => void;
}

export const CenterStage: React.FC<CenterStageProps> = ({
  activeChain,
  role,
  secondsRemaining,
  isPulsing: _isPulsing,
  onSelectWord,
  onReportSabotage,
  onSubmitDecoderGuess,
  isLoading,
  onIntercept,
  onOpenRules,
  onOpenMultiplayer,
}) => {
  // Standby View when no active lease
  if (!activeChain) {
    return (
      <div
        className="flex flex-col items-center justify-center my-6 text-center p-6 sm:p-8 rounded-2xl bg-surface/70 border border-slate-800 shadow-2xl backdrop-blur-md max-w-4xl mx-auto w-full font-mono"
        data-testid="center-stage-standby"
      >
        {/* Radar Icon & Frequency */}
        <div className="relative mb-4">
          <div className="w-16 h-16 rounded-full bg-surface-elevated border border-slate-700 flex items-center justify-center text-cyber-cyan animate-pulse">
            <Radio className="w-8 h-8" />
          </div>
          <div className="absolute -inset-1 rounded-full bg-cyber-cyan/20 blur-md pointer-events-none" />
        </div>

        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyber-cyan/10 border border-cyber-cyan/30 text-cyber-cyan text-xs font-bold mb-3">
          <span className="w-2 h-2 rounded-full bg-cyber-cyan animate-ping" />
          <span>FREQUENCY RADAR ACTIVE // ZERO SIGN-UP WALL</span>
        </div>

        <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-100 mb-2">
          WHISPER // CRYPTOGRAPHIC DISGUISE NETWORK
        </h2>
        <p className="max-w-2xl text-slate-400 text-xs sm:text-sm mb-6 leading-relaxed">
          Classified human-to-human chain interception. Pass mutated secret sentences through 100 hops to defeat automated surveillance without losing the underlying intelligence.
        </p>

        {/* 3 Mission Dossier Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 w-full text-left mb-6">
          {/* Card 1: The Mission */}
          <div className="p-4 rounded-xl bg-surface-elevated/70 border border-slate-800 flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-2 text-cyber-cyan font-bold text-xs mb-2">
                <ShieldAlert className="w-4 h-4 text-cyber-cyan" />
                <span>1. THE MISSION</span>
              </div>
              <p className="text-slate-400 text-[11px] leading-relaxed">
                Reach <strong className="text-cyber-green">Hop 100 (Victory)</strong>. Each chain has 3 Signal Lives. Hitting a trap word or failing a decoder guess costs 1 life.
              </p>
            </div>
          </div>

          {/* Card 2: The Two Roles */}
          <div className="p-4 rounded-xl bg-surface-elevated/70 border border-slate-800 flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-2 text-cyber-amber font-bold text-xs mb-2">
                <Zap className="w-4 h-4 text-cyber-amber" />
                <span>2. THE TWO ROLES</span>
              </div>
              <p className="text-slate-400 text-[11px] leading-relaxed">
                <strong className="text-slate-200">Shifter (9/10):</strong> Swap 1 word under 60s with a real dictionary word. <strong className="text-slate-200">Decoder (1/10):</strong> Guess the secret theme for +10 bonus hops!
              </p>
            </div>
          </div>

          {/* Card 3: Multiplayer */}
          <div className="p-4 rounded-xl bg-surface-elevated/70 border border-slate-800 flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-2 text-cyber-green font-bold text-xs mb-2">
                <Users className="w-4 h-4 text-cyber-green" />
                <span>3. SQUAD MULTIPLAYER</span>
              </div>
              <p className="text-slate-400 text-[11px] leading-relaxed">
                Connect friends on your Wi-Fi or open a second tab. Chains pass between players asynchronously across the global queue!
              </p>
            </div>
          </div>
        </div>

        {/* Direct Action Control Buttons */}
        <div className="flex flex-wrap items-center justify-center gap-3 w-full">
          {onIntercept && (
            <button
              onClick={onIntercept}
              disabled={isLoading}
              className="px-6 py-3 rounded-xl bg-cyber-cyan text-black font-mono text-xs sm:text-sm font-bold flex items-center gap-2 hover:bg-cyber-cyan/90 transition-all hover:shadow-[0_0_20px_rgba(0,240,255,0.6)] cursor-pointer active:scale-95"
            >
              {isLoading ? (
                <>
                  <span className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" />
                  <span>INTERCEPTING...</span>
                </>
              ) : (
                <>
                  <Play className="w-4 h-4 fill-black" />
                  <span>INTERCEPT WHISPER NOW</span>
                </>
              )}
            </button>
          )}

          {onOpenRules && (
            <button
              onClick={onOpenRules}
              data-testid="standby-rules-btn"
              className="px-5 py-3 rounded-xl bg-surface-elevated hover:bg-slate-800 border border-slate-700 hover:border-cyber-cyan text-slate-200 hover:text-cyber-cyan font-mono text-xs sm:text-sm font-bold flex items-center gap-2 transition-all cursor-pointer"
            >
              <BookOpen className="w-4 h-4 text-cyber-cyan" />
              <span>RULES BOOK</span>
            </button>
          )}

          {onOpenMultiplayer && (
            <button
              onClick={onOpenMultiplayer}
              data-testid="standby-multiplayer-btn"
              className="px-5 py-3 rounded-xl bg-surface-elevated hover:bg-slate-800 border border-slate-700 text-cyber-green font-mono text-xs sm:text-sm font-bold flex items-center gap-2 transition-all"
            >
              <Users className="w-4 h-4 text-cyber-green" />
              <span>ADD / INVITE OPERATIVES</span>
            </button>
          )}
        </div>
      </div>
    );
  }

  // Countdown Progress Math
  const progressPct = Math.max(0, Math.min(100, (secondsRemaining / 60) * 100));

  let timerColor = 'text-cyber-green bg-cyber-green';
  let barColor = 'from-cyber-green/40 to-cyber-green';
  if (secondsRemaining <= 15) {
    timerColor = 'text-cyber-red bg-cyber-red animate-pulse';
    barColor = 'from-cyber-red/60 to-cyber-red shadow-[0_0_15px_rgba(255,0,85,0.8)]';
  } else if (secondsRemaining <= 30) {
    timerColor = 'text-cyber-amber bg-cyber-amber';
    barColor = 'from-cyber-amber/50 to-cyber-amber';
  }

  // Tokenize sentence into word blocks
  const tokens = tokenizeSentence(activeChain.currentSentence);

  return (
    <div
      className="w-full max-w-4xl mx-auto flex flex-col items-center gap-6 my-6"
      data-testid="center-stage-active"
    >
      {/* 60s Animated Countdown Lease Bar */}
      <div
        className="w-full p-4 rounded-2xl bg-surface border border-slate-800 shadow-2xl flex flex-col gap-2 font-mono"
        data-testid="countdown-lease-bar"
      >
        <div className="flex items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            <span className={`w-2.5 h-2.5 rounded-full ${timerColor}`} />
            <span className="font-bold text-slate-200">
              60s ATOMIC LEASE LOCK
            </span>
          </div>
          <span
            data-testid="lease-seconds-timer"
            className={`font-mono font-black text-sm ${secondsRemaining <= 15 ? 'text-cyber-red animate-pulse' : timerColor.split(' ')[0]}`}
          >
            00:{secondsRemaining.toString().padStart(2, '0')}
          </span>
        </div>

        {/* Progress bar container */}
        <div className="w-full h-2 rounded-full bg-surface-elevated overflow-hidden border border-slate-800">
          <div
            data-testid="lease-progress-indicator"
            className={`h-full bg-gradient-to-r ${barColor} transition-all duration-300`}
            style={{ width: `${progressPct}%` }}
          />
        </div>
      </div>

      {/* Role View: Decoder vs Shifter */}
      {role === 'decoder' && activeChain.themeOptions ? (
        <DecoderQuiz
          themeOptions={activeChain.themeOptions}
          isSubmitting={isLoading}
          onSubmitGuess={onSubmitDecoderGuess}
        />
      ) : (
        <div className="w-full p-6 sm:p-10 rounded-2xl bg-surface/90 border border-slate-800 shadow-2xl relative overflow-hidden backdrop-blur-md">
          {/* Header Metadata */}
          <div className="flex flex-wrap items-center justify-between gap-3 pb-4 mb-6 border-b border-slate-800 text-xs font-mono">
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded bg-surface-elevated border border-slate-700 text-cyber-cyan font-bold" data-testid="chain-id-badge">
                CHAIN #{activeChain.id.slice(0, 8)}
              </span>
              <span className="text-slate-400" data-testid="chain-hop-counter">
                HOP {activeChain.currentHop}/100
              </span>
              {activeChain.bonusHops && activeChain.bonusHops > 0 && (
                <span className="text-cyber-green font-bold">
                  (+{activeChain.bonusHops} bonus)
                </span>
              )}
            </div>

            <div className="flex items-center gap-3">
              <span className="px-2 py-0.5 rounded bg-cyber-cyan/10 border border-cyber-cyan/30 text-cyber-cyan font-bold uppercase" data-testid="player-role-badge">
                ROLE: THE SHIFTER
              </span>
              <button
                type="button"
                onClick={onReportSabotage}
                data-testid="report-sabotage-btn"
                className="flex items-center gap-1 px-2.5 py-1 rounded bg-surface-elevated hover:bg-cyber-red/20 text-slate-400 hover:text-cyber-red border border-slate-700 hover:border-cyber-red/50 transition-colors cursor-pointer"
                title="Report deliberate sabotage / troll mutation"
              >
                <AlertTriangle className="w-3.5 h-3.5" />
                <span>SCRUB</span>
              </button>
            </div>
          </div>

          {/* Interactive Word Blocks */}
          <div className="flex flex-wrap items-center justify-center gap-2.5 sm:gap-3 py-6" data-testid="sentence-word-blocks">
            {tokens.map((token) => (
              <button
                key={token.index}
                type="button"
                data-testid={`word-block-${token.index}`}
                onClick={() => onSelectWord(token.index, token.root, token.raw)}
                className="group relative px-4 py-2.5 rounded-xl bg-surface-elevated/90 border border-slate-700/80 hover:border-cyber-cyan hover:bg-cyber-cyan/10 text-slate-200 hover:text-white transition-all font-mono text-base sm:text-xl font-bold cursor-pointer select-none active:scale-95 shadow-lg"
              >
                <span className="text-slate-500 font-normal">{token.prefix}</span>
                <span className="group-hover:text-cyber-cyan transition-colors">{token.root}</span>
                <span className="text-slate-500 font-normal">{token.suffix}</span>

                {/* Subscript token index */}
                <span className="absolute -bottom-2 -right-1 px-1 rounded bg-black/60 border border-slate-700 text-[9px] font-mono text-slate-500 group-hover:text-cyber-cyan">
                  {token.index + 1}
                </span>
              </button>
            ))}
          </div>

          {/* Footer Instruction */}
          <div className="mt-6 pt-4 border-t border-slate-800/80 flex items-center justify-between text-xs font-mono text-slate-500">
            <span>Click any glowing word block to swap disguise</span>
            <span>Grammar lock &lt; 12 chars // 5 traps active</span>
          </div>
        </div>
      )}

      {/* Collapsible Trace Log Drawer */}
      <TraceLogDrawer traceLog={activeChain.traceLog || activeChain.history} />
    </div>
  );
};
