'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import {
  MultiplayerRoomState,
  MultiplayerPlayer,
  ServerEvent,
} from '@/lib/cyber_rescue/multiplayer/types';
import { MultiplayerTransport } from '@/lib/cyber_rescue/multiplayer/transport';

export interface UseMultiplayerRescueReturn {
  isConnected: boolean;
  room: MultiplayerRoomState | null;
  localPlayer: MultiplayerPlayer | null;
  opponents: MultiplayerPlayer[];
  ping: number;
  isRushActive: boolean;
  rushTriggeredBy?: { id: string; name: string };
  rushRemainingSeconds: number;
  leaderboard: MultiplayerPlayer[];
  lastAnnouncement: string | null;
  errorMessage: string | null;
  clearError: () => void;
  allTakenNames: string[];
  setPresenceName: (name: string) => void;
  createRoom: (name: string, category?: string, maxPlayers?: number) => void;
  joinRoom: (roomCode: string, name: string) => void;
  quickJoinLobby: (name: string) => void;
  startRound: () => void;
  guessLetter: (char: string) => void;
  addBotOpponent: (botName?: string) => void;
  leaveRoom: () => void;
  updatePlayerName: (name: string) => void;
}

export function useMultiplayerRescue(): UseMultiplayerRescueReturn {
  const transportRef = useRef<MultiplayerTransport | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [room, setRoomState] = useState<MultiplayerRoomState | null>(null);
  const roomRef = useRef<MultiplayerRoomState | null>(null);
  const pendingGuessesRef = useRef<Set<string>>(new Set());
  const [localPlayerId, setLocalPlayerId] = useState<string | null>(null);
  const localPlayerIdRef = useRef<string | null>(null);
  const [ping, setPing] = useState(24);
  const [leaderboard, setLeaderboard] = useState<MultiplayerPlayer[]>([]);
  const [lastAnnouncement, setLastAnnouncement] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [allTakenNames, setAllTakenNames] = useState<string[]>([]);

  const setRoom = useCallback(
    (next: MultiplayerRoomState | null | ((prev: MultiplayerRoomState | null) => MultiplayerRoomState | null)) => {
      setRoomState((prev) => {
        const resolved = typeof next === 'function' ? next(prev) : next;
        roomRef.current = resolved;
        return resolved;
      });
    },
    []
  );

  const clearError = useCallback(() => {
    setErrorMessage(null);
  }, []);

  useEffect(() => {
    const transport = new MultiplayerTransport();
    transportRef.current = transport;

    // Load initial taken names snapshot
    const initialTaken = transport.getTakenNames();
    if (initialTaken.length > 0) {
      setAllTakenNames(initialTaken);
    }

    // Check if session exists in localStorage and restore
    const session = transport.restoreSession();
    if (session.room && session.player) {
      setRoom(session.room);
      setLocalPlayerId(session.player.id);
      localPlayerIdRef.current = session.player.id;
      setIsConnected(true);
    }

    const unsubscribe = transport.subscribe((event: ServerEvent) => {
      switch (event.type) {
        case 'ROOM_JOINED':
          setErrorMessage(null);
          pendingGuessesRef.current.clear();
          setRoom(event.room);
          setLocalPlayerId(event.player.id);
          localPlayerIdRef.current = event.player.id;
          setIsConnected(true);
          break;

        case 'ROUND_STARTED':
          pendingGuessesRef.current.clear();
          setRoom(event.room);
          break;

        case 'ROOM_STATE': {
          const myId = localPlayerIdRef.current;
          if (myId && event.room && event.room.players && event.room.players[myId]) {
            const serverPlayer = event.room.players[myId];
            for (const char of serverPlayer.guessedLetters) {
              pendingGuessesRef.current.delete(char);
            }
            const mergedGuessed = Array.from(
              new Set([...serverPlayer.guessedLetters, ...Array.from(pendingGuessesRef.current)])
            );
            const isSolved = event.room.targetWord.split('').every((c) => mergedGuessed.includes(c));
            const wrongCount = mergedGuessed.filter((c) => !event.room.targetWord.includes(c)).length;
            const prevMe = roomRef.current?.players?.[myId];
            event.room.players[myId] = {
              ...serverPlayer,
              guessedLetters: mergedGuessed,
              wrongGuesses: wrongCount,
              canopyHealth: Math.max(0, 7 - wrongCount),
              isSolved: isSolved || serverPlayer.isSolved,
              wordsSolved: Math.max(serverPlayer.wordsSolved || 0, prevMe?.wordsSolved || 0),
              roundScore: Math.max(serverPlayer.roundScore || 0, prevMe?.roundScore || 0),
              totalScore: Math.max(serverPlayer.totalScore || 0, prevMe?.totalScore || 0),
              status: isSolved || serverPlayer.isSolved ? 'solved' : wrongCount >= 7 ? 'landed' : 'typing',
            };
          }
          setRoom(event.room);
          break;
        }

        case 'PLAYER_JOINED':
          setRoom((prev) => {
            if (!prev) return prev;
            return {
              ...prev,
              players: {
                ...prev.players,
                [event.player.id]: event.player,
              },
            };
          });
          setLastAnnouncement(`👋 ${event.player.name} joined the room!`);
          break;

        case 'PLAYER_LEFT':
          setRoom((prev) => {
            if (!prev) return prev;
            const updated = { ...prev.players };
            const leavingName = updated[event.playerId]?.name || 'Opponent';
            delete updated[event.playerId];
            const remaining = Object.values(updated);
            if ((prev.status === 'playing' || prev.status === 'rush') && remaining.length === 1) {
              const winner = remaining[0];
              return {
                ...prev,
                players: updated,
                status: 'match_over',
                winnerId: winner.id,
                isForfeitVictory: true,
                forfeitedPlayerName: leavingName,
              };
            }
            return {
              ...prev,
              players: updated,
            };
          });
          setLastAnnouncement(`👋 A player left`);
          break;

        case 'FORFEIT_VICTORY':
          setRoom(event.room);
          setLastAnnouncement(`🏆 ${event.forfeitedPlayerName} disconnected! You win by forfeit!`);
          break;

        case 'RUSH_TRIGGERED':
          setLastAnnouncement(`⚡ ${event.triggeredBy.name} CRACKED THE CODE! 15s RUSH ACTIVATED!`);
          break;

        case 'ROUND_ENDED':
          pendingGuessesRef.current.clear();
          setRoom(event.room);
          setLeaderboard(event.leaderboard);
          setLastAnnouncement('🏁 ROUND OVER!');
          break;

        case 'PLAYER_SOLVED': {
          const isMe = event.playerId === localPlayerIdRef.current;
          const scoreDelta = event.breakdown?.total || event.roundScore || 0;
          if (isMe) {
            setLastAnnouncement(`🎉 Solved in #${event.rank}! +${scoreDelta} points!`);
          } else {
            const solverName = roomRef.current?.players?.[event.playerId]?.name || 'Opponent';
            setLastAnnouncement(`⚡ ${solverName} solved in #${event.rank}! (+${scoreDelta} pts)`);
          }
          setRoom((prev) => {
            if (!prev || !prev.players || !prev.players[event.playerId]) return prev;
            const p = prev.players[event.playerId];
            const updated: MultiplayerPlayer = {
              ...p,
              isSolved: true,
              status: 'solved',
              roundScore: scoreDelta,
              totalScore: event.totalScore !== undefined ? event.totalScore : (p.totalScore + scoreDelta),
              wordsSolved: event.wordsSolved !== undefined ? event.wordsSolved : ((p.wordsSolved || 0) + 1),
              scoreBreakdown: event.breakdown || p.scoreBreakdown,
            };
            return {
              ...prev,
              players: {
                ...prev.players,
                [event.playerId]: updated,
              },
            };
          });
          break;
        }

        case 'PLAYER_LANDED':
          if (event.playerId === localPlayerIdRef.current) {
            setLastAnnouncement('💥 Canopies collapsed! 0 points.');
          }
          break;

        case 'PONG': {
          const latency = Date.now() - event.clientTimestamp;
          const currentPing = Math.max(12, Math.min(180, Math.round(latency / 2) || 24));
          setPing(currentPing);
          break;
        }

        case 'ERROR':
          setErrorMessage(event.message);
          setLastAnnouncement(`⚠️ ${event.message}`);
          break;

        case 'ONLINE_NAMES_UPDATE':
          setAllTakenNames(event.names || []);
          break;

        case 'ROOM_LEFT':
          pendingGuessesRef.current.clear();
          setRoom(null);
          setLocalPlayerId(null);
          localPlayerIdRef.current = null;
          setIsConnected(false);
          setLeaderboard([]);
          break;

        default:
          break;
      }
    });

    transport.connect().then(() => {
      setIsConnected(true);
    });

    return () => {
      unsubscribe();
      transport.destroy();
    };
  }, [setRoom]);

  const createRoomAction = useCallback((name: string, category: string = 'ALL') => {
    if (!transportRef.current) return;
    transportRef.current.sendAction({
      type: 'CREATE_ROOM',
      playerName: name || 'Operative Alpha',
      category,
    });
  }, []);

  const joinRoomAction = useCallback((roomCode: string, name: string) => {
    if (!transportRef.current) return;
    transportRef.current.sendAction({
      type: 'JOIN_ROOM',
      roomId: roomCode.trim().toUpperCase(),
      playerName: name || 'Operative Echo',
    });
  }, []);

  const quickJoinLobbyAction = useCallback((name: string) => {
    if (!transportRef.current) return;
    transportRef.current.sendAction({
      type: 'QUICK_JOIN',
      playerName: name.trim() || 'Operative ' + Math.floor(10 + Math.random() * 90),
    });
  }, []);

  const startRoundAction = useCallback(() => {
    if (!transportRef.current || !room) return;
    transportRef.current.sendAction({
      type: 'START_ROUND',
      roomId: room.roomId,
    });
  }, [room]);

  const guessLetterAction = useCallback(
    (char: string) => {
      const activeRoom = roomRef.current;
      const myId = localPlayerIdRef.current;
      if (!transportRef.current || !activeRoom || !myId) return;
      const me = activeRoom.players[myId];
      if (!me || me.isSolved || me.wrongGuesses >= 7 || me.guessedLetters.includes(char)) return;

      const upperChar = char.toUpperCase();
      pendingGuessesRef.current.add(upperChar);

      // Instant Client-Side Prediction (0ms zero latency response)
      const isCorrect = activeRoom.targetWord.includes(upperChar);
      const nextWrong = isCorrect ? me.wrongGuesses : me.wrongGuesses + 1;
      const nextGuessed = Array.from(new Set([...me.guessedLetters, upperChar]));
      const isSolved = activeRoom.targetWord
        .split('')
        .every((c) => nextGuessed.includes(c));

      const predictedBaseScore = isSolved && !me.isSolved ? (activeRoom.targetWord.length <= 5 ? 100 : 150) : 0;

      const updatedPlayer: MultiplayerPlayer = {
        ...me,
        guessedLetters: nextGuessed,
        wrongGuesses: nextWrong,
        canopyHealth: Math.max(0, 7 - nextWrong),
        isSolved: isSolved || me.isSolved,
        wordsSolved: (me.wordsSolved || 0) + (isSolved && !me.isSolved ? 1 : 0),
        roundScore: me.roundScore + predictedBaseScore,
        totalScore: me.totalScore + predictedBaseScore,
        status: isSolved ? 'solved' : nextWrong >= 7 ? 'landed' : 'typing',
      };

      setRoom((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          players: {
            ...prev.players,
            [myId]: updatedPlayer,
          },
        };
      });

      // Dispatch to real-time server (Native WebSocket / HTTP)
      transportRef.current.sendAction({
        type: 'GUESS_LETTER',
        roomId: activeRoom.roomId,
        char: upperChar,
        clientTimestamp: Date.now(),
        playerId: myId,
      });
    },
    [setRoom]
  );

  const addBotOpponentAction = useCallback((botName: string = 'Bot Echo') => {
    if (!transportRef.current) return;
    transportRef.current.addBotPlayer(botName);
  }, []);

  const leaveRoomAction = useCallback(() => {
    pendingGuessesRef.current.clear();
    setRoom(null);
    setLocalPlayerId(null);
    localPlayerIdRef.current = null;
    setLeaderboard([]);
    if (transportRef.current) {
      transportRef.current.leaveRoom();
    }
  }, [setRoom]);

  const updatePlayerNameAction = useCallback(
    (newName: string) => {
      const trimmed = newName.trim();
      if (!trimmed) return;
      if (room && localPlayerId && room.players[localPlayerId]) {
        const me = room.players[localPlayerId];
        const updated = { ...me, name: trimmed };
        setRoom({
          ...room,
          players: {
            ...room.players,
            [localPlayerId]: updated,
          },
        });
      }
      if (transportRef.current) {
        transportRef.current.setPresenceName(trimmed);
        if (room) {
          transportRef.current.sendAction({
            type: 'UPDATE_PLAYER_NAME',
            roomId: room.roomId,
            newName: trimmed,
            playerId: localPlayerIdRef.current || undefined,
          });
        }
      }
    },
    [room, localPlayerId, setRoom]
  );

  const setPresenceNameAction = useCallback((name: string) => {
    if (transportRef.current) {
      transportRef.current.setPresenceName(name);
    }
  }, []);

  const localPlayer =
    room && room.players && localPlayerId ? room.players[localPlayerId] || null : null;
  const opponents =
    room && room.players
      ? Object.values(room.players).filter((p) => p && p.id !== localPlayerId)
      : [];

  return {
    isConnected,
    room,
    localPlayer,
    opponents,
    ping,
    isRushActive: !!room?.isRushActive,
    rushTriggeredBy: room?.rushTriggeredBy,
    rushRemainingSeconds: room?.rushRemainingSeconds || 0,
    leaderboard,
    lastAnnouncement,
    errorMessage,
    clearError,
    allTakenNames,
    setPresenceName: setPresenceNameAction,
    createRoom: createRoomAction,
    joinRoom: joinRoomAction,
    quickJoinLobby: quickJoinLobbyAction,
    startRound: startRoundAction,
    guessLetter: guessLetterAction,
    addBotOpponent: addBotOpponentAction,
    leaveRoom: leaveRoomAction,
    updatePlayerName: updatePlayerNameAction,
  };
}
