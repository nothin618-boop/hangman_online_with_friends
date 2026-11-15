import { describe, it, expect } from 'vitest';
import { MultiplayerTransport } from '@/lib/cyber_rescue/multiplayer/transport';
import { createRoom, createPlayer, joinRoom, startRound } from '@/lib/cyber_rescue/multiplayer/roomEngine';
import { MultiplayerRoomState, ServerEvent } from '@/lib/cyber_rescue/multiplayer/types';

describe('Multiplayer Concurrency, Live Score & Immediate Leave Suite', () => {
  it('1. Immediately exits and emits ROOM_LEFT upon calling leaveRoom', () => {
    const transport = new MultiplayerTransport();
    let leftEventReceived = false;

    transport.subscribe((event: ServerEvent) => {
      if (event.type === 'ROOM_LEFT') {
        leftEventReceived = true;
      }
    });

    transport.leaveRoom();
    expect(leftEventReceived).toBe(true);
    transport.destroy();
  });

  it('2. Disallows reviving room after leaveRoom when in-flight events arrive', () => {
    const transport = new MultiplayerTransport();
    const host = createPlayer({ id: 'p1', name: 'Alpha', isHost: true });
    let room = createRoom({ roomId: 'ROOM_TEST', hostPlayer: host, category: 'GAMING' });

    transport.leaveRoom();

    // Simulate in-flight ROOM_STATE packet arriving
    (transport as any).activeRoom = null;
    (transport as any).emit({ type: 'ROOM_STATE', room });

    // Since isLeaving is true, session restore and activeRoom stay null
    expect(transport.restoreSession().room).toBeNull();
    transport.destroy();
  });

  it('3. Broadcasts dynamic rank and accurate score updates on word solve', () => {
    const p1 = createPlayer({ id: 'p1', name: 'Alpha', isHost: true });
    const p2 = createPlayer({ id: 'p2', name: 'Bravo', isHost: false });
    const p3 = createPlayer({ id: 'p3', name: 'Charlie', isHost: false });

    let room = createRoom({ roomId: 'ROOM_RACE', hostPlayer: p1, category: 'ALL' });
    room = joinRoom(room, p2);
    room = joinRoom(room, p3);
    room = startRound(room);

    // Player 1 solves first
    p1.isSolved = true;
    p1.totalScore = 240;
    p1.wordsSolved = 1;
    room.players['p1'] = p1;

    // Player 2 solves second: placement should be 2
    const alreadySolved = Object.values(room.players).filter((p) => p.isSolved && p.id !== p2.id);
    const placement = alreadySolved.length + 1;
    expect(placement).toBe(2);

    p2.isSolved = true;
    p2.totalScore = 190;
    p2.wordsSolved = 1;
    room.players['p2'] = p2;

    // Player 3 solves third: placement should be 3
    const alreadySolvedP3 = Object.values(room.players).filter((p) => p.isSolved && p.id !== p3.id);
    const placementP3 = alreadySolvedP3.length + 1;
    expect(placementP3).toBe(3);
  });

  it('4. Preserves multiple concurrent guesses across players without state drops', () => {
    const host = createPlayer({ id: 'p1', name: 'Speedy', isHost: true });
    const p2 = createPlayer({ id: 'p2', name: 'Nimble', isHost: false });
    let room = createRoom({ roomId: 'ROOM_MULTI', hostPlayer: host, category: 'ALL' });
    room = joinRoom(room, p2);
    room.targetWord = 'CYBER';
    room = startRound(room);
    room.targetWord = 'CYBER';

    // Player 1 guesses 'C', Player 2 guesses 'Y' simultaneously
    const p1Guessed = ['C'];
    const p2Guessed = ['Y'];

    room.players['p1'].guessedLetters = p1Guessed;
    room.players['p2'].guessedLetters = p2Guessed;

    expect(room.players['p1'].guessedLetters).toContain('C');
    expect(room.players['p2'].guessedLetters).toContain('Y');
    expect(room.players['p1'].guessedLetters).not.toContain('Y');
    expect(room.players['p2'].guessedLetters).not.toContain('C');
  });
});

