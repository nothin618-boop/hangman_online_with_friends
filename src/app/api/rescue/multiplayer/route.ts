import { NextRequest, NextResponse } from 'next/server';
import {
  MultiplayerRoomState,
  MultiplayerPlayer,
  ClientAction,
  ServerEvent,
} from '@/lib/cyber_rescue/multiplayer/types';
import {
  createRoom,
  createPlayer,
  joinRoom,
  startRound,
  processPlayerGuess,
  tickRoomClock,
  computeLeaderboard,
  DEFAULT_MAX_ROUNDS,
  DEFAULT_MAX_PLAYERS,
  ensureUniquePlayerName,
  assignUniqueAvatar,
  getRandomOperativeName,
  leaveRoom,
  purgeInactivePlayers,
} from '@/lib/cyber_rescue/multiplayer/roomEngine';

export const dynamic = 'force-dynamic';

interface QueuedEvent {
  seq: number;
  event: ServerEvent;
}

// Global server memory store persisting across Next.js API requests
declare global {
  var _rescueRooms: Map<string, MultiplayerRoomState> | undefined;
  var _rescueRoomCodes: Map<string, string> | undefined; // roomCode -> roomId
  var _rescueEvents: Map<string, QueuedEvent[]> | undefined; // roomId -> QueuedEvent[]
  var _rescueEventSeq: number | undefined;
}

const rooms = globalThis._rescueRooms ?? (globalThis._rescueRooms = new Map());
const roomCodes = globalThis._rescueRoomCodes ?? (globalThis._rescueRoomCodes = new Map());
const roomEvents = globalThis._rescueEvents ?? (globalThis._rescueEvents = new Map());

function getNextSeq(): number {
  const current = globalThis._rescueEventSeq ?? 0;
  const next = current + 1;
  globalThis._rescueEventSeq = next;
  return next;
}

function pushEvent(roomId: string, event: ServerEvent) {
  let list = roomEvents.get(roomId);
  if (!list) {
    list = [];
    roomEvents.set(roomId, list);
  }
  list.push({ seq: getNextSeq(), event });
  if (list.length > 50) {
    list.splice(0, list.length - 50);
  }
  if (typeof (globalThis as any)._broadcastWsRoomEvent === 'function') {
    try {
      (globalThis as any)._broadcastWsRoomEvent(roomId, event);
    } catch (e) {}
  }
  if (typeof (globalThis as any)._broadcastSseRoomEvent === 'function') {
    try {
      (globalThis as any)._broadcastSseRoomEvent(roomId, event);
    } catch (e) {}
  }
}

function findRoomByCodeOrId(key: string): MultiplayerRoomState | null {
  const cleanKey = (key || '').trim().toUpperCase();
  if (!cleanKey) return null;

  if (rooms.has(cleanKey)) {
    return rooms.get(cleanKey)!;
  }
  if (roomCodes.has(cleanKey)) {
    const roomId = roomCodes.get(cleanKey)!;
    return rooms.get(roomId) || null;
  }
  for (const r of rooms.values()) {
    if (r.roomCode?.toUpperCase() === cleanKey || r.roomId?.toUpperCase() === cleanKey) {
      return r;
    }
  }
  return null;
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const roomId = searchParams.get('roomId');
  const since = parseInt(searchParams.get('since') || '0', 10);

  if (!roomId) {
    return NextResponse.json({ error: 'roomId required' }, { status: 400 });
  }

  let room = findRoomByCodeOrId(roomId);
  if (!room) {
    return NextResponse.json({ error: 'Room not found' }, { status: 404 });
  }

  const callerPlayerId = searchParams.get('playerId');
  if (callerPlayerId && room.players[callerPlayerId]) {
    room.players[callerPlayerId].lastHeartbeat = Date.now();
  }

  // Purge any inactive players (> 8000ms silence)
  const purge = purgeInactivePlayers(room, Date.now(), 8000);
  if (purge.purgedPlayerIds.length > 0) {
    room = purge.room;
    for (const pid of purge.purgedPlayerIds) {
      pushEvent(room.roomId, { type: 'PLAYER_LEFT', playerId: pid });
    }
    if (room.isForfeitVictory && room.winnerId) {
      const winner = room.players[room.winnerId];
      pushEvent(room.roomId, {
        type: 'FORFEIT_VICTORY',
        winnerId: room.winnerId,
        winnerName: winner?.name || 'Winner',
        forfeitedPlayerName: room.forfeitedPlayerName || 'Opponent',
        room,
      });
    }
    pushEvent(room.roomId, { type: 'ROOM_STATE', room });
    if (Object.keys(room.players).length === 0) {
      rooms.delete(room.roomId);
      if (room.roomCode) roomCodes.delete(room.roomCode.toUpperCase());
    } else {
      rooms.set(room.roomId, room);
    }
  }

  // Authoritative server clock tick if round is running
  if (room.status === 'playing' || room.status === 'rush') {
    const tick = tickRoomClock(room, Date.now());
    room = tick.room;
    rooms.set(room.roomId, room);

    if (tick.isRoundOver) {
      const leaderboard = computeLeaderboard(room);
      pushEvent(room.roomId, {
        type: 'ROUND_ENDED',
        room,
        leaderboard,
      });
    }
  }

  const events = roomEvents.get(room.roomId) || [];
  const newEvents = events.filter((e: any) => e.seq > since);
  const lastSeq = events.length > 0 ? events[events.length - 1].seq : since;

  return NextResponse.json({
    room,
    events: newEvents.map((e: any) => e.event),
    lastSeq,
  });
}

export async function POST(req: NextRequest) {
  try {
    const action: ClientAction & { botName?: string } = await req.json();

    if (action.type === 'CREATE_ROOM') {
      const playerId = action.playerId || ('p_' + Math.random().toString(36).substring(2, 8));
      const host = createPlayer({
        id: playerId,
        name: action.playerName || 'Player 1',
        avatar: action.avatar,
        isHost: true,
      });

      const roomId = 'room_' + Math.random().toString(36).substring(2, 8);
      const room = createRoom({
        roomId,
        hostPlayer: host,
        category: action.category || 'ALL',
        maxPlayers: action.maxPlayers || DEFAULT_MAX_PLAYERS,
        maxRounds: DEFAULT_MAX_ROUNDS,
        isPublic: action.isPublic !== undefined ? action.isPublic : false,
      });

      const cleanHost = room.players[host.id] || host;

      rooms.set(room.roomId, room);
      roomCodes.set(room.roomCode.toUpperCase(), room.roomId);

      return NextResponse.json({
        type: 'ROOM_JOINED',
        player: cleanHost,
        room,
      });
    }

    if (action.type === 'JOIN_ROOM') {
      const searchKey = (action.roomId || '').trim().toUpperCase();
      let targetRoom = findRoomByCodeOrId(searchKey);

      if (!targetRoom) {
        return NextResponse.json({ error: `Room ${searchKey} not found` }, { status: 404 });
      }

      let cleanPlayer = action.playerId && targetRoom.players[action.playerId]
        ? targetRoom.players[action.playerId]
        : null;

      let updatedRoom = targetRoom;

      if (!cleanPlayer) {
        if (Object.keys(targetRoom.players || {}).length >= (targetRoom.maxPlayers || DEFAULT_MAX_PLAYERS)) {
          return NextResponse.json({ error: `Room is full (max ${targetRoom.maxPlayers || 10})` }, { status: 400 });
        }

        const playerId = action.playerId || ('p_' + Math.random().toString(36).substring(2, 8));
        const rawName = action.playerName || 'Player 2';
        const player = createPlayer({
          id: playerId,
          name: rawName,
          avatar: action.avatar,
          isHost: false,
        });

        updatedRoom = joinRoom(targetRoom, player);
        cleanPlayer = updatedRoom.players[playerId] || player;
        rooms.set(updatedRoom.roomId, updatedRoom);

        pushEvent(updatedRoom.roomId, {
          type: 'PLAYER_JOINED',
          player: cleanPlayer,
        });
        pushEvent(updatedRoom.roomId, {
          type: 'ROOM_STATE',
          room: updatedRoom,
        });
      } else {
        cleanPlayer.lastHeartbeat = Date.now();
        updatedRoom.players[cleanPlayer.id] = cleanPlayer;
        rooms.set(updatedRoom.roomId, updatedRoom);
      }

      return NextResponse.json({
        type: 'ROOM_JOINED',
        player: cleanPlayer,
        room: updatedRoom,
      });
    }

    if (action.type === 'QUICK_JOIN') {
      let targetRoom: MultiplayerRoomState | null = null;
      for (const r of rooms.values()) {
        if (r.isPublic !== false && Object.keys(r.players).length < (r.maxPlayers || DEFAULT_MAX_PLAYERS)) {
          targetRoom = r;
          break;
        }
      }

      const playerName = (action.playerName || 'Player 1').trim();

      if (targetRoom) {
        let cleanPlayer = action.playerId && targetRoom.players[action.playerId]
          ? targetRoom.players[action.playerId]
          : null;
        let updatedRoom = targetRoom;

        if (!cleanPlayer) {
          const playerId = action.playerId || ('p_' + Math.random().toString(36).substring(2, 8));
          const player = createPlayer({
            id: playerId,
            name: playerName,
            avatar: action.avatar,
            isHost: false,
          });

          updatedRoom = joinRoom(targetRoom, player);
          cleanPlayer = updatedRoom.players[playerId] || player;
          rooms.set(updatedRoom.roomId, updatedRoom);

          pushEvent(updatedRoom.roomId, {
            type: 'PLAYER_JOINED',
            player: cleanPlayer,
          });
          pushEvent(updatedRoom.roomId, {
            type: 'ROOM_STATE',
            room: updatedRoom,
          });
        } else {
          cleanPlayer.lastHeartbeat = Date.now();
          updatedRoom.players[cleanPlayer.id] = cleanPlayer;
          rooms.set(updatedRoom.roomId, updatedRoom);
        }

        return NextResponse.json({
          type: 'ROOM_JOINED',
          player: cleanPlayer,
          room: updatedRoom,
        });
      } else {
        const playerId = action.playerId || ('p_' + Math.random().toString(36).substring(2, 8));
        const host = createPlayer({
          id: playerId,
          name: playerName,
          avatar: action.avatar,
          isHost: true,
        });

        const roomId = 'pub_' + Math.random().toString(36).substring(2, 8);
        const room = createRoom({
          roomId,
          hostPlayer: host,
          category: 'ALL',
          maxPlayers: DEFAULT_MAX_PLAYERS,
          maxRounds: DEFAULT_MAX_ROUNDS,
          isPublic: true,
        });

        const cleanHost = room.players[host.id] || host;

        rooms.set(room.roomId, room);
        roomCodes.set(room.roomCode.toUpperCase(), room.roomId);

        return NextResponse.json({
          type: 'ROOM_JOINED',
          player: cleanHost,
          room,
        });
      }
    }

    if (action.type === 'START_ROUND') {
      const room = findRoomByCodeOrId(action.roomId);
      if (!room) {
        return NextResponse.json({ error: 'Room not found' }, { status: 404 });
      }

      const updated = startRound(room);
      rooms.set(updated.roomId, updated);

      pushEvent(updated.roomId, {
        type: 'ROUND_STARTED',
        room: updated,
      });

      return NextResponse.json({
        type: 'ROUND_STARTED',
        room: updated,
      });
    }

    if (action.type === 'GUESS_LETTER') {
      const room = findRoomByCodeOrId(action.roomId);
      if (!room) {
        return NextResponse.json({ error: 'Room not found' }, { status: 404 });
      }

      const playerId = action.playerId || Object.keys(room.players)[0];
      const result = processPlayerGuess({
        room,
        playerId,
        letter: action.char,
        now: Date.now(),
      });

      rooms.set(result.room.roomId, result.room);

      if (result.rushTriggered && result.room.rushTriggeredBy) {
        pushEvent(result.room.roomId, {
          type: 'RUSH_TRIGGERED',
          rushSeconds: result.room.rushRemainingSeconds || 15,
          triggeredBy: result.room.rushTriggeredBy,
          remainingSeconds: result.room.remainingTimeSeconds,
        });
      }

      if (result.isSolved && result.breakdown && result.room.players[playerId]) {
        const alreadySolvedCount = Object.values(result.room.players).filter((p) => p.isSolved && p.id !== playerId).length;
        const dynamicPlacement = alreadySolvedCount + 1;
        pushEvent(result.room.roomId, {
          type: 'PLAYER_SOLVED',
          playerId,
          rank: dynamicPlacement,
          breakdown: result.breakdown,
          totalScore: result.room.players[playerId]?.totalScore || 0,
          roundScore: result.breakdown.total,
          wordsSolved: result.room.players[playerId]?.wordsSolved,
        });
      }

      if (result.isLanded) {
        pushEvent(result.room.roomId, {
          type: 'PLAYER_LANDED',
          playerId,
        });
      }

      if (result.room.status === 'round_over' || result.room.status === 'match_over') {
        const leaderboard = computeLeaderboard(result.room);
        pushEvent(result.room.roomId, {
          type: 'ROUND_ENDED',
          room: result.room,
          leaderboard,
        });
      } else {
        pushEvent(result.room.roomId, {
          type: 'ROOM_STATE',
          room: result.room,
        });
      }

      return NextResponse.json({
        type: 'GUESS_RESULT',
        room: result.room,
        result,
      });
    }

    if (action.type === 'PING') {
      const now = Date.now();
      return NextResponse.json({
        type: 'PONG',
        clientTimestamp: (action as any).clientTimestamp || now,
        serverTimestamp: now,
      });
    }

    if (action.type === 'LEAVE_ROOM') {
      if (action.roomId && action.playerId) {
        let room = findRoomByCodeOrId(action.roomId);
        if (room) {
          room = leaveRoom(room, action.playerId);
          if (Object.keys(room.players).length === 0) {
            rooms.delete(room.roomId);
            if (room.roomCode) roomCodes.delete(room.roomCode.toUpperCase());
          } else {
            rooms.set(room.roomId, room);
            pushEvent(room.roomId, {
              type: 'PLAYER_LEFT',
              playerId: action.playerId,
            });
            if (room.isForfeitVictory && room.winnerId) {
              const winner = room.players[room.winnerId];
              pushEvent(room.roomId, {
                type: 'FORFEIT_VICTORY',
                winnerId: room.winnerId,
                winnerName: winner?.name || 'Winner',
                forfeitedPlayerName: room.forfeitedPlayerName || 'Opponent',
                room,
              });
            }
            pushEvent(room.roomId, {
              type: 'ROOM_STATE',
              room,
            });
          }
        }
      }
      return NextResponse.json({ ok: true });
    }

    if (action.type === 'HEARTBEAT') {
      if (action.roomId && action.playerId) {
        const room = findRoomByCodeOrId(action.roomId);
        if (room && room.players[action.playerId]) {
          room.players[action.playerId].lastHeartbeat = Date.now();
        }
      }
      return NextResponse.json({ ok: true });
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Server error' }, { status: 500 });
  }
}

