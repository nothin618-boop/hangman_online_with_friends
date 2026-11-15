'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  MultiplayerRoomState,
  MultiplayerPlayer,
} from '@/lib/cyber_rescue/multiplayer/types';
import { Copy, Check, Users, Wifi, Zap, Flame, Play, Loader2 } from 'lucide-react';
import { StickmanSticker } from './StickmanSticker';

export interface LiveMultiplayerPanelProps {
  room: MultiplayerRoomState | null;
  localPlayer: MultiplayerPlayer | null;
  opponents: MultiplayerPlayer[];
  ping: number;
  isRushActive: boolean;
  rushTriggeredBy?: { id: string; name: string };
  onStartRound?: () => void;
  onAddBot?: () => void;
  className?: string;
}

export type RoundMark = 'won' | 'lost' | null;

/** Result of the current round for a player (null while still playing / in lobby). */
export function getCurrentRoundResult(
  player: MultiplayerPlayer,
  room: Pick<MultiplayerRoomState, 'status'>
): RoundMark {
  if (room.status === 'in_lobby' || room.status === 'idle' || room.status === 'connecting') return null;
  const roundEnded = room.status === 'round_over' || room.status === 'match_over';
  if (player.isSolved || player.status === 'solved') return 'won';
  if (player.status === 'landed' || (roundEnded && !player.isSolved)) return 'lost';
  return null;
}

/**
 * One mark per round of the match: 'won' (solved), 'lost' (not guessed) or null (not played yet).
 * `recorded` holds results already seen live; rounds we never saw are rebuilt from the solved count.
 */
export function getRoundMarks(
  player: MultiplayerPlayer,
  room: Pick<MultiplayerRoomState, 'roundNumber' | 'status' | 'maxRounds'>,
  recorded: Record<number, 'won' | 'lost'> = {}
): RoundMark[] {
  const total = Math.max(1, room.maxRounds || 12);
  const current = Math.max(1, room.roundNumber);
  const joined = Math.max(1, player.joinedRound ?? 1);
  const marks: RoundMark[] = Array(total).fill(null);
  const currentResult = getCurrentRoundResult(player, room) ?? recorded[current] ?? null;

  const unknownPrior: number[] = [];
  let knownWonPrior = 0;
  for (let r = joined; r < current && r <= total; r++) {
    if (recorded[r]) {
      marks[r - 1] = recorded[r];
      if (recorded[r] === 'won') knownWonPrior++;
    } else {
      unknownPrior.push(r);
    }
  }
  if (current <= total) marks[current - 1] = currentResult;

  const solvedPrior = Math.max(0, (player.wordsSolved || 0) - (currentResult === 'won' ? 1 : 0));
  let remainingWon = Math.max(0, solvedPrior - knownWonPrior);
  for (const r of unknownPrior) {
    if (remainingWon > 0) {
      marks[r - 1] = 'won';
      remainingWon--;
    } else {
      marks[r - 1] = 'lost';
    }
  }
  return marks;
}

/** Hand-drawn stickman-style mark: check (solved), cross (not guessed) or dot (pending). */
const RoundMarkIcon: React.FC<{ mark: RoundMark; index: number }> = ({ mark, index }) => (
  <svg
    width="17"
    height="17"
    viewBox="0 0 16 16"
    fill="none"
    data-testid={`round-mark-${index + 1}`}
    data-mark={mark ?? 'pending'}
    className="shrink-0 overflow-visible"
    role="img"
    aria-label={`Round ${index + 1}: ${mark ?? 'pending'}`}
  >
    {mark === 'won' && (
      <path d="M3 8.5 L6.5 12 L13 4" stroke="#6EE7B7" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
    )}
    {mark === 'lost' && (
      <path d="M3.5 3.5 L12.5 12.5 M12.5 3.5 L3.5 12.5" stroke="#FB7185" strokeWidth="2.6" strokeLinecap="round" />
    )}
    {mark === null && <circle cx="8" cy="8" r="1.6" fill="#475569" />}
  </svg>
);

export const LiveMultiplayerPanel: React.FC<LiveMultiplayerPanelProps> = ({
  room,
  localPlayer,
  opponents,
  ping,
  isRushActive,
  rushTriggeredBy,
  onStartRound,
  onAddBot,
  className = '',
}) => {
  const [copied, setCopied] = useState(false);

  // Synchronized countdown ticker
  const [localCountdown, setLocalCountdown] = useState<number | null>(null);

  useEffect(() => {
    if (!room?.countdownEndTime) {
      setLocalCountdown(null);
      return;
    }
    const updateCountdown = () => {
      const diff = Math.max(0, Math.ceil((room.countdownEndTime! - Date.now()) / 1000));
      setLocalCountdown(diff);
    };
    updateCountdown();
    const interval = setInterval(updateCountdown, 250);
    return () => clearInterval(interval);
  }, [room?.countdownEndTime]);

  const activeCountdown = localCountdown ?? room?.countdownSeconds ?? 8;
  const isPublicLobby = room ? room.isPublic !== false : false;
  const playerCount = room ? Object.keys(room.players || {}).length : 0;

  // Remember each player's finished rounds as they happen
  const resultsRef = useRef<{ roomId: string; byPlayer: Record<string, Record<number, 'won' | 'lost'>> }>({
    roomId: '',
    byPlayer: {},
  });
  useEffect(() => {
    if (!room) return;
    if (resultsRef.current.roomId !== room.roomId) {
      resultsRef.current = { roomId: room.roomId, byPlayer: {} };
    }
    for (const p of Object.values(room.players || {})) {
      const result = getCurrentRoundResult(p, room);
      if (result) {
        const mine = resultsRef.current.byPlayer[p.id] || (resultsRef.current.byPlayer[p.id] = {});
        mine[Math.max(1, room.roundNumber)] = result;
      }
    }
  }, [room]);

  if (!room) {
    return null;
  }

  const allPlayers = [
    ...(localPlayer ? [{ ...localPlayer, isLocal: true }] : []),
    ...opponents.map((op) => ({ ...op, isLocal: false })),
  ];

  // Sort players by total cumulative score across all 12 rounds
  const sortedPlayers = [...allPlayers].sort((a, b) => b.totalScore - a.totalScore);

  const handleCopyCode = () => {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(room.roomCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  // Remaining time
  const remainingSeconds = room.remainingTimeSeconds;

  // Ping badge color
  const pingColorClass =
    ping < 45 ? 'text-emerald-400 border-emerald-500/30 bg-emerald-500/10' :
      ping < 90 ? 'text-amber-400 border-amber-500/30 bg-amber-500/10' :
        'text-rose-400 border-rose-500/30 bg-rose-500/10';

  return (
    <aside
      data-testid="live-multiplayer-panel"
      className={`font-pencil flex flex-col gap-3 p-3 sm:p-4 bg-transparent border-b lg:border-b-0 lg:border-r border-slate-800 select-none w-full lg:w-72 xl:w-80 shrink-0 text-slate-100 ${className}`}
    >
      {/* 1. Top Room Info, Round Tracker & Ping Bar */}
      <div className="flex items-center justify-between gap-2 border-b border-slate-800/80 pb-2.5">
        <div className="flex items-center gap-1.5">
          <span className="text-xs font-bold text-slate-400">ROOM:</span>
          <button
            type="button"
            onClick={handleCopyCode}
            data-testid="copy-room-code-btn"
            className="flex items-center gap-1 px-2 py-0.5 rounded-lg bg-slate-800 hover:bg-slate-700/80 border border-slate-700 text-xs font-mono font-bold text-slate-200 transition-colors"
            title="Click to copy room code"
          >
            <span>{room.roomCode}</span>
            {copied ? (
              <Check className="w-3 h-3 text-emerald-400" />
            ) : (
              <Copy className="w-3 h-3 text-slate-400" />
            )}
          </button>
        </div>

        {/* Round Badge (12 Rounds Series) */}
        <div
          data-testid="round-tracker-badge"
          className="px-2 py-0.5 rounded-full text-[10px] font-mono font-extrabold bg-slate-800 border border-slate-700 text-cyan-300 tracking-wider"
        >
          ROUND {Math.max(1, room.roundNumber)} / {room.maxRounds || 12}
        </div>

        {/* Live Ping Pill */}
        <div
          data-testid="live-ping-pill"
          className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-mono font-bold border ${pingColorClass}`}
          title="Live Network Latency"
        >
          <Wifi className="w-2.5 h-2.5" />
          <span>{ping}ms</span>
        </div>
      </div>

      {/* 2. Round Countdown & Sudden-Death Rush Bar */}
      <div className="flex flex-col gap-1.5 empty:hidden">
        {isRushActive && (
          /* Sudden Death Rush Countdown (Prominently visible timer digits) */
          <div className="flex flex-col gap-1.5 p-2 rounded-2xl bg-gradient-to-r from-amber-950/50 via-rose-950/40 to-slate-950 border border-amber-500/60 shadow-lg shadow-amber-950/30">
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1.5 text-xs font-mono font-bold text-amber-300">
                <Flame className="w-4 h-4 text-amber-400 animate-pulse" />
                <span>SUDDEN DEATH RUSH</span>
              </span>
              <span
                data-testid="round-timer-digits"
                className="text-2xl font-black font-mono text-amber-400 tracking-wider animate-pulse"
              >
                {remainingSeconds}s
              </span>
            </div>

            {/* High-visibility animated progress bar */}
            <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden relative">
              <div
                className="h-full bg-gradient-to-r from-amber-500 to-rose-500 rounded-full transition-all duration-300 animate-pulse"
                style={{ width: `${(remainingSeconds / 15) * 100}%` }}
              />
            </div>

            {rushTriggeredBy && (
              <div
                data-testid="rush-announcement-pill"
                className="text-[10px] font-mono text-amber-300 font-semibold text-center"
              >
                ⚡ {rushTriggeredBy.name} cracked the word! 15s rush!
              </div>
            )}
          </div>
        )}
      </div>

      {/* 3. Players Roster */}
      <div className="flex flex-col gap-1.5 flex-1 overflow-y-auto">
        <div className="flex items-center justify-between text-[11px] font-sans font-bold text-slate-400 uppercase tracking-wider px-0.5">
          <span className="flex items-center gap-1">
            <Users className="w-3 h-3 text-cyan-400" />
            <span>PLAYERS ({allPlayers.length}/{room.maxPlayers || 12})</span>
          </span>
          <span>SCORE</span>
        </div>

        <div className="flex flex-col gap-1" data-testid="player-roster-list">
          {sortedPlayers.map((player, idx) => {
            const isWinner = player.status === 'solved';
            const roundPts = player.roundScore || player.scoreBreakdown?.total || 0;
            const ptsBadge = roundPts > 0 ? ` (+${roundPts})` : '';
            const marks = getRoundMarks(player, room, resultsRef.current.byPlayer[player.id]);

            return (
              <div
                key={player.id}
                data-testid={`player-card-${player.id}`}
                className={`flex flex-col gap-1.5 px-2.5 py-2 rounded-xl border transition-all ${player.isLocal
                    ? 'bg-slate-800/80 border-slate-700 shadow-sm'
                    : 'bg-slate-900/60 border-slate-800/80'
                  }`}
              >
                <div className="flex items-center justify-between gap-1.5">
                  {/* Left: Sticker, Name, Leader Crown, YOU tag */}
                  <div className="flex items-center gap-1.5 min-w-0 flex-1">
                    <StickmanSticker avatarId={player.avatar} size={34} bare className="shrink-0" />
                    <span className="font-pencil font-bold text-slate-100 text-sm tracking-wide truncate max-w-[100px] sm:max-w-[130px]">
                      {player.name}
                    </span>
                    {idx === 0 && player.totalScore > 0 && (
                      <span className="text-[10px]" title="Leader">👑</span>
                    )}
                    {player.isLocal && (
                      <span className="text-[8px] font-black uppercase tracking-wider px-1 py-0.5 rounded bg-cyan-950 text-cyan-300 border border-cyan-800 shrink-0">
                        YOU
                      </span>
                    )}
                  </div>

                  {/* Right: Solved pill & Points */}
                  <div className="flex items-center gap-1.5 shrink-0">
                    {isWinner && (
                      <span
                        data-testid={`player-status-${player.id}`}
                        className="text-[10px] font-bold font-pencil px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                      >
                        {player.solveTimeFormatted
                          ? `⚡ ${player.solveTimeFormatted}${ptsBadge}`
                          : player.solveTimeSeconds
                            ? `⚡ ${player.solveTimeSeconds}s${ptsBadge}`
                            : `⚡ SOLVED${ptsBadge}`}
                      </span>
                    )}
                    <span className="font-pencil font-bold text-cyan-300 text-xs sm:text-sm">
                      {player.totalScore} pts
                    </span>
                  </div>
                </div>

                {/* One mark per word/round: check = solved, cross = not guessed */}
                <div
                  data-testid={`player-rounds-${player.id}`}
                  className="flex flex-wrap items-center gap-0.5"
                >
                  {marks.map((m, i) => (
                    <RoundMarkIcon key={i} mark={m} index={i} />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 4. Controls / Action Buttons */}
      <div className="flex flex-col gap-1.5 pt-2 border-t border-slate-800/80">
        {/* Public Lobby: No manual start button. Auto-countdown when > 1 player; Finding players when alone */}
        {room.status === 'in_lobby' && isPublicLobby && (
          playerCount <= 1 ? (
            <div
              data-testid="finding-players-indicator"
              className="flex flex-col items-center justify-center gap-2 p-3 rounded-2xl bg-slate-950/80 border border-slate-700/60 text-center select-none"
            >
              <div className="flex items-center gap-2 text-slate-200 font-bold text-xs tracking-wider font-mono">
                <Loader2 className="w-4 h-4 animate-spin text-slate-200" />
                <span>FINDING PLAYERS...</span>
              </div>
              <p className="text-[11px] text-slate-400 leading-snug font-sans">
                Waiting for opponents to join public lobby
              </p>
              <div className="flex items-center gap-1.5 text-[10px] text-slate-400 font-mono px-2.5 py-0.5 rounded-full bg-slate-900 border border-slate-800">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                <span>Lobby (Max 12)</span>
              </div>
            </div>
          ) : (
            <div
              data-testid="lobby-countdown-banner"
              className="flex flex-col items-center justify-center gap-1.5 p-3 rounded-2xl bg-gradient-to-r from-emerald-950/60 via-teal-950/50 to-slate-950 border border-emerald-500/60 shadow-lg shadow-emerald-950/40 text-center select-none"
            >
              <div className="flex items-center gap-1.5 text-xs font-mono font-bold text-emerald-300">
                <Zap className="w-3.5 h-3.5 text-emerald-400 animate-bounce" />
                <span>PLAYERS FOUND! STARTING IN</span>
              </div>
              <span
                data-testid="lobby-countdown-digits"
                className="text-3xl font-black font-mono text-emerald-400 tracking-wider animate-pulse drop-shadow-[0_0_12px_rgba(16,185,129,0.5)]"
              >
                {activeCountdown}s
              </span>
              <div className="w-full h-1.5 rounded-full bg-slate-800 overflow-hidden relative">
                <div
                  className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 rounded-full transition-all duration-300"
                  style={{ width: `${Math.min(100, (activeCountdown / 8) * 100)}%` }}
                />
              </div>
            </div>
          )
        )}

        {/* Private Custom Room: Manual Host Start Button */}
        {room.status === 'in_lobby' && !isPublicLobby && onStartRound && (
          <button
            type="button"
            onClick={onStartRound}
            data-testid="start-round-btn"
            className="w-full flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 active:scale-[0.98] text-white text-xs font-bold font-sans shadow-md transition-all"
          >
            <Play className="w-3.5 h-3.5 fill-white" />
            <span>START MATCH (ROUND 1 / {room.maxRounds || 12})</span>
          </button>
        )}

        {/* Round Over State */}
        {room.status === 'round_over' && (
          isPublicLobby ? (
            <div
              data-testid="round-over-countdown-banner"
              className="flex flex-col items-center justify-center gap-1 p-2.5 rounded-2xl bg-gradient-to-r from-cyan-950/60 via-blue-950/50 to-slate-950 border border-cyan-500/60 text-center select-none"
            >
              <span className="text-[11px] font-mono font-bold text-cyan-300">
                ROUND {room.roundNumber + 1} OF {room.maxRounds || 12} STARTING IN
              </span>
              <span
                data-testid="round-over-countdown-digits"
                className="text-2xl font-black font-mono text-cyan-400 tracking-wider animate-pulse"
              >
                {activeCountdown}s
              </span>
              <div className="w-full h-1.5 rounded-full bg-slate-800 overflow-hidden relative">
                <div
                  className="h-full bg-gradient-to-r from-cyan-500 to-blue-400 rounded-full transition-all duration-300"
                  style={{ width: `${Math.min(100, (activeCountdown / 8) * 100)}%` }}
                />
              </div>
            </div>
          ) : (
            onStartRound && (
              <button
                type="button"
                onClick={onStartRound}
                data-testid="next-round-btn"
                className="w-full flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-cyan-600 hover:bg-cyan-500 active:scale-[0.98] text-white text-xs font-bold font-sans shadow-md transition-all"
              >
                <Play className="w-3.5 h-3.5 fill-white" />
                <span>START ROUND {room.roundNumber + 1} OF {room.maxRounds || 12}</span>
              </button>
            )
          )
        )}

        {room.status === 'match_over' && (
          <div className={`flex flex-col gap-2 p-2.5 rounded-xl border text-center ${
            room.isForfeitVictory 
              ? 'bg-emerald-500/15 border-emerald-500/40' 
              : 'bg-amber-500/10 border-amber-500/30'
          }`}>
            <span className="text-xl">🏆</span>
            <h4 className={`font-bold text-xs ${room.isForfeitVictory ? 'text-emerald-300' : 'text-amber-300'}`}>
              {room.isForfeitVictory ? 'VICTORY BY FORFEIT!' : 'MATCH COMPLETE (12 ROUNDS)'}
            </h4>
            <p className="text-[11px] text-slate-300">
              {room.isForfeitVictory ? (
                <span>
                  {room.forfeitedPlayerName || 'Opponent'} left the match.<br />
                  Winner: <strong className="text-emerald-300">{sortedPlayers[0]?.name || 'You'}</strong>
                </span>
              ) : (
                <span>
                  Champion: <strong className="text-amber-400">{sortedPlayers[0]?.name}</strong> ({sortedPlayers[0]?.totalScore} pts)
                </span>
              )}
            </p>
            {onStartRound && !room.isForfeitVictory && (
              <button
                type="button"
                onClick={onStartRound}
                data-testid="rematch-btn"
                className="w-full py-1.5 px-3 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs transition-colors cursor-pointer"
              >
                Play Rematch (New 12 Rounds)
              </button>
            )}
          </div>
        )}

      </div>
    </aside>
  );
};

