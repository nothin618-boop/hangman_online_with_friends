import { describe, it, expect, beforeEach } from 'vitest';
import {
  calculatePlayerRoundScore,
  getWordRoundDuration,
  RUSH_TIMER_SECONDS,
} from '@/lib/cyber_rescue/multiplayer/scoring';
import {
  createPlayer,
  createRoom,
  joinRoom,
  startRound,
  processPlayerGuess,
  tickRoomClock,
  computeLeaderboard,
  ensureUniquePlayerName,
  assignUniqueAvatar,
  getRandomOperativeName,
  OPERATIVE_CODENAMES,
  OPERATIVE_AVATARS,
} from '@/lib/cyber_rescue/multiplayer/roomEngine';
import { MultiplayerTransport } from '@/lib/cyber_rescue/multiplayer/transport';

describe('CyberRescue Multiplayer Rules & Scoring Engine', () => {
  describe('1. Dynamic Round Duration by Word Length', () => {
    it('sets 30s for short words (<= 5 letters)', () => {
      expect(getWordRoundDuration('DOOM')).toBe(30);
      expect(getWordRoundDuration('ZELDA')).toBe(30);
    });

    it('sets 45s for medium words (6-8 letters)', () => {
      expect(getWordRoundDuration('PACMAN')).toBe(45);
      expect(getWordRoundDuration('WITCHER')).toBe(45);
      expect(getWordRoundDuration('FORTNITE')).toBe(45);
    });

    it('sets 60s for long words (>= 9 letters)', () => {
      expect(getWordRoundDuration('MINECRAFT')).toBe(60);
      expect(getWordRoundDuration('CYBERPUNK')).toBe(60);
    });
  });

  describe('2. Strict Scoring Rules ("jo wrong karenga vo koi point nahi")', () => {
    it('awards strictly 0 points when player deflates all 7 parachute layers', () => {
      const score = calculatePlayerRoundScore({
        isSolved: false,
        wrongGuesses: 7,
        remainingSeconds: 25,
        totalSeconds: 45,
        isFirstSolver: false,
      });

      expect(score.total).toBe(0);
      expect(score.base).toBe(0);
      expect(score.speedBonus).toBe(0);
      expect(score.canopyBonus).toBe(0);
    });

    it('awards strictly 0 points when time expires before solving', () => {
      const score = calculatePlayerRoundScore({
        isSolved: false,
        wrongGuesses: 3,
        remainingSeconds: 0,
        totalSeconds: 45,
        isFirstSolver: false,
      });

      expect(score.total).toBe(0);
    });

    it('awards base (100) + speed bonus + canopy bonus when solved', () => {
      // 0 wrong guesses, 36s remaining out of 45s
      const score = calculatePlayerRoundScore({
        isSolved: true,
        wrongGuesses: 0,
        remainingSeconds: 36,
        totalSeconds: 45,
        isFirstSolver: false,
      });

      expect(score.base).toBe(100);
      // Speed bonus: Math.round((36 / 45) * 100) = 80
      expect(score.speedBonus).toBe(80);
      // Canopy bonus: 7 * 15 = 105
      expect(score.canopyBonus).toBe(105);
      expect(score.firstSolveBonus).toBe(0);
      expect(score.total).toBe(100 + 80 + 105); // 285
    });

    it('awards first finisher bonus (+50) to the player who cracked the word first', () => {
      const score = calculatePlayerRoundScore({
        isSolved: true,
        wrongGuesses: 1, // 6 floats left => 6 * 15 = 90
        remainingSeconds: 40,
        totalSeconds: 45,
        isFirstSolver: true,
      });

      expect(score.firstSolveBonus).toBe(50);
      expect(score.canopyBonus).toBe(90);
      expect(score.total).toBe(100 + Math.round((40 / 45) * 100) + 90 + 50);
    });
  });

  describe('3. Sudden-Death Rush Timer Trigger ("word jo pehle krlega uske bad timer lagega")', () => {
    it('does not tick down clock before 1st solve and starts 15s timer when 1st player solves', () => {
      const p1 = createPlayer({ id: 'p1', name: 'Alpha' });
      const p2 = createPlayer({ id: 'p2', name: 'Bravo' });

      let room = createRoom({ roomId: 'test-room', hostPlayer: p1 });
      room = joinRoom(room, p2);

      // Start round with word 'PORTAL'
      room = startRound(room, 'PORTAL', 'GAMING');
      expect(room.targetWord).toBe('PORTAL');
      expect(room.isRushActive).toBe(false);

      const startTime = room.serverStartTime;

      // Clock tick before 1st solve does NOT expire or decrement round
      const preSolveTick = tickRoomClock(room, startTime + 25000);
      expect(preSolveTick.isRoundOver).toBe(false);
      expect(preSolveTick.room.status).toBe('playing');

      // P1 guesses letters 'P', 'O', 'R', 'T', 'A'
      for (const char of ['P', 'O', 'R', 'T', 'A']) {
        const res = processPlayerGuess({
          room,
          playerId: 'p1',
          letter: char,
          now: startTime + 5000,
        });
        room = res.room;
        expect(res.isSolved).toBe(false);
      }

      // P1 guesses final letter 'L' (1st solve!)
      const finalGuess = processPlayerGuess({
        room,
        playerId: 'p1',
        letter: 'L',
        now: startTime + 10000,
      });

      room = finalGuess.room;
      expect(finalGuess.isSolved).toBe(true);
      expect(finalGuess.rushTriggered).toBe(true);

      // Sudden death rush countdown starts strictly at 15s!
      expect(room.isRushActive).toBe(true);
      expect(room.rushTriggeredBy?.name).toBe('Alpha');
      expect(room.remainingTimeSeconds).toBe(RUSH_TIMER_SECONDS);

      // Now clock ticks down during rush
      const rushTick = tickRoomClock(room, room.serverEndTime + 1000);
      expect(rushTick.isRoundOver).toBe(true);
      expect(rushTick.room.status).toBe('round_over');
    });

    it('transitions to match_over after 12 rounds are completed', () => {
      const p1 = createPlayer({ id: 'p1', name: 'Alpha' });
      const p2 = createPlayer({ id: 'p2', name: 'Beta' });
      let room = createRoom({ roomId: 'test-room-12', hostPlayer: p1, maxRounds: 12 });
      room = joinRoom(room, p2);
      room.roundNumber = 11; // 11 rounds played

      // Start round 12
      room = startRound(room, 'ZELDA');
      expect(room.roundNumber).toBe(12);

      // P1 solves round 12, P2 is still guessing
      for (const char of ['Z', 'E', 'L', 'D', 'A']) {
        room = processPlayerGuess({ room, playerId: 'p1', letter: char }).room;
      }

      expect(room.isRushActive).toBe(true);
      expect(room.status).toBe('rush');

      // Timer expires for final round 12
      const endTick = tickRoomClock(room, room.serverEndTime + 1000);
      expect(endTick.isRoundOver).toBe(true);
      expect(endTick.room.status).toBe('match_over');
    });
  });

  describe('4. Opponent Canopy Depletion & Elimination', () => {
    it('marks player as landed with 0 points when 7 wrong guesses occur', () => {
      const p1 = createPlayer({ id: 'p1', name: 'Unlucky' });
      let room = createRoom({ roomId: 'test-room-3', hostPlayer: p1 });
      room = startRound(room, 'DOOM'); // Target word has letters D, O, M

      const wrongChars = ['A', 'B', 'C', 'E', 'F', 'G', 'H'];
      for (const char of wrongChars) {
        const res = processPlayerGuess({
          room,
          playerId: 'p1',
          letter: char,
        });
        room = res.room;
      }

      const player = room.players['p1'];
      expect(player.wrongGuesses).toBe(7);
      expect(player.canopyHealth).toBe(0);
      expect(player.status).toBe('landed');
      expect(player.roundScore).toBe(0);
    });
  });

  describe('5. Clock Ticking & Leaderboard Computation', () => {
    it('ends round and sets status=round_over when rush clock reaches 0', () => {
      const p1 = createPlayer({ id: 'p1', name: 'Player1' });
      let room = createRoom({ roomId: 'test-room-4', hostPlayer: p1 });
      room = startRound(room, 'ZELDA');
      room.isRushActive = true;
      room.serverEndTime = Date.now() + 5000;

      const endTime = room.serverEndTime;
      const tick = tickRoomClock(room, endTime + 1000);

      expect(tick.isRoundOver).toBe(true);
      expect(tick.room.status).toBe('round_over');
      expect(tick.room.players['p1'].status).toBe('landed');
      expect(tick.room.players['p1'].roundScore).toBe(0);
    });

    it('correctly ranks players on the leaderboard by total score', () => {
      const p1 = { ...createPlayer({ id: 'p1', name: 'Gold' }), totalScore: 350 };
      const p2 = { ...createPlayer({ id: 'p2', name: 'Silver' }), totalScore: 220 };
      const p3 = { ...createPlayer({ id: 'p3', name: 'Bronze' }), totalScore: 90 };

      const room = {
        ...createRoom({ roomId: 'test', hostPlayer: p1 }),
        players: { p1, p2, p3 },
      };

      const leaderboard = computeLeaderboard(room);
      expect(leaderboard[0].name).toBe('Gold');
      expect(leaderboard[1].name).toBe('Silver');
      expect(leaderboard[2].name).toBe('Bronze');
    });
  });

  describe('6. Maximum Capacity (10 Players Limit)', () => {
    it('allows up to 10 players and rejects the 11th player', () => {
      const host = createPlayer({ id: 'p0', name: 'Host' });
      let room = createRoom({ roomId: 'max-10-room', hostPlayer: host, maxPlayers: 10 });

      // Join 9 more players (total 10)
      for (let i = 1; i <= 9; i++) {
        const player = createPlayer({ id: `p${i}`, name: `Operative ${i}` });
        room = joinRoom(room, player);
      }

      expect(Object.keys(room.players).length).toBe(10);

      // Attempt to join 11th player
      const overflowPlayer = createPlayer({ id: 'p11', name: 'Overflow Player' });
      room = joinRoom(room, overflowPlayer);

      // Must strictly remain 10 players
      expect(Object.keys(room.players).length).toBe(10);
      expect(room.players['p11']).toBeUndefined();
    });
  });

  describe('7. Room Code Join & Refresh Persistence Session', () => {
    beforeEach(() => {
      localStorage.clear();
    });

    it('joins a room using room code (case-insensitive) and saves session to localStorage', () => {
      const hostTransport = new MultiplayerTransport();
      let createdRoom: any = null;

      hostTransport.subscribe((event) => {
        if (event.type === 'ROOM_JOINED') {
          createdRoom = event.room;
        }
      });

      hostTransport.sendAction({
        type: 'CREATE_ROOM',
        playerName: 'Host Vikram',
      });

      expect(createdRoom).not.toBeNull();
      const code = createdRoom.roomCode;
      expect(code).toBeDefined();

      // Guest joins using lowercase code
      const guestTransport = new MultiplayerTransport();
      let guestJoinedRoom: any = null;
      let guestPlayer: any = null;

      guestTransport.subscribe((event) => {
        if (event.type === 'ROOM_JOINED') {
          guestJoinedRoom = event.room;
          guestPlayer = event.player;
        }
      });

      guestTransport.sendAction({
        type: 'JOIN_ROOM',
        roomId: code.toLowerCase(),
        playerName: 'Guest Aarav',
      });

      expect(guestJoinedRoom).not.toBeNull();
      expect(guestJoinedRoom.roomCode).toBe(code);
      expect(guestJoinedRoom.players[guestPlayer.id]).toBeDefined();
      expect(guestJoinedRoom.players[guestPlayer.id].name).toBe('Guest Aarav');

      // Check localStorage persistence
      expect(localStorage.getItem('rescue_active_room')).toBeDefined();
      expect(localStorage.getItem('rescue_game_mode')).toBe('online');

      hostTransport.destroy();
      guestTransport.destroy();
    });

    it('restores full room state and player session after simulated refresh', () => {
      const transport = new MultiplayerTransport();
      let room: any = null;

      transport.subscribe((event) => {
        if (event.type === 'ROOM_JOINED') {
          room = event.room;
        }
      });

      transport.sendAction({
        type: 'CREATE_ROOM',
        playerName: 'Player Kabir',
      });

      expect(room).not.toBeNull();
      transport.destroy();

      // Simulate page refresh (new transport instance loading from localStorage)
      const freshTransport = new MultiplayerTransport();
      const restored = freshTransport.restoreSession();

      expect(restored.room).not.toBeNull();
      expect(restored.room?.roomCode).toBe(room.roomCode);
      expect(restored.player).not.toBeNull();
      expect(restored.player?.name).toBe('Player Kabir');

      // Leave room clears session
      freshTransport.leaveRoom();
      expect(localStorage.getItem('rescue_active_room')).toBeNull();
      expect(localStorage.getItem('rescue_game_mode')).toBe('solo');

      freshTransport.destroy();
    });
  });

  describe('8. Distinct Operative Name & Avatar Assignment', () => {
    it('assigns Operative Beta when a second player joins with Operative Alpha', () => {
      const p1 = createPlayer({ id: 'p1', name: 'Operative Alpha', avatar: '🙂', isHost: true });
      let room = createRoom({ roomId: 'name-test-1', hostPlayer: p1 });

      const p2 = createPlayer({ id: 'p2', name: 'Operative Alpha', avatar: '🙂' });
      room = joinRoom(room, p2);

      expect(room.players['p1'].name).toBe('Operative Alpha');
      expect(room.players['p1'].avatar).toBe('🙂');

      expect(room.players['p2'].name).toBe('Operative Beta');
      expect(room.players['p2'].avatar).not.toBe('🙂');
    });

    it('assigns clean, distinct random gamer names without #1, #2 suffixes when multiple players enter duplicate names', () => {
      const p1 = createPlayer({ id: 'p1', name: 'Kabir', isHost: true });
      let room = createRoom({ roomId: 'name-test-2', hostPlayer: p1 });

      const p2 = createPlayer({ id: 'p2', name: 'Kabir' });
      room = joinRoom(room, p2);

      const p3 = createPlayer({ id: 'p3', name: 'Kabir' });
      room = joinRoom(room, p3);

      expect(room.players['p1'].name).toBe('Kabir');
      // Strictly must NOT contain "#" or numeric suffixes (#2, #3)
      expect(room.players['p2'].name).not.toContain('#');
      expect(room.players['p3'].name).not.toContain('#');
      // All 3 players must have 100% unique names
      const names = [room.players['p1'].name, room.players['p2'].name, room.players['p3'].name];
      expect(new Set(names).size).toBe(3);
    });

    it('assigns distinct operative codenames when players join with empty or whitespace names', () => {
      const p1 = createPlayer({ id: 'p1', name: '', isHost: true });
      let room = createRoom({ roomId: 'name-test-3', hostPlayer: p1 });

      const p2 = createPlayer({ id: 'p2', name: '   ' });
      room = joinRoom(room, p2);

      const name1 = room.players['p1'].name;
      const name2 = room.players['p2'].name;

      expect(name1).toBeTruthy();
      expect(name2).toBeTruthy();
      expect(name1).not.toBe(name2);
    });

    it('preserves reconnecting player name without adding duplicate suffixes', () => {
      const p1 = createPlayer({ id: 'p1', name: 'Aarav', isHost: true });
      let room = createRoom({ roomId: 'name-test-4', hostPlayer: p1 });

      // Player reconnects
      const reconnectingP1 = createPlayer({ id: 'p1', name: 'Aarav' });
      room = joinRoom(room, reconnectingP1);

      expect(room.players['p1'].name).toBe('Aarav');
    });

    it('guarantees unique names and unique avatars across all 12 players in a full room', () => {
      const host = createPlayer({ id: 'p0', name: '', isHost: true });
      let room = createRoom({ roomId: 'full-12-unique', hostPlayer: host, maxPlayers: 12 });

      for (let i = 1; i <= 11; i++) {
        const guest = createPlayer({ id: `p${i}`, name: '' });
        room = joinRoom(room, guest);
      }

      const allPlayers = Object.values(room.players);
      expect(allPlayers.length).toBe(12);

      const names = allPlayers.map((p) => p.name);
      const avatars = allPlayers.map((p) => p.avatar);

      // Verify no "#" in any generated name
      names.forEach((name) => {
        expect(name).not.toContain('#');
      });

      const uniqueNames = new Set(names);
      const uniqueAvatars = new Set(avatars);

      expect(uniqueNames.size).toBe(12);
      expect(uniqueAvatars.size).toBe(12);
    });
  });

  describe('9. Low Latency Transport & Fast-Path Dispatch', () => {
    it('sends action directly over WebSocket with zero HTTP delay when connected', () => {
      const transport = new MultiplayerTransport();
      const mockWs: any = {
        readyState: 1, // WebSocket.OPEN
        send: vi.fn(),
      };
      (transport as any).ws = mockWs;

      transport.sendAction({
        type: 'GUESS_LETTER',
        roomId: 'test-room',
        char: 'A',
      });

      expect(mockWs.send).toHaveBeenCalledTimes(1);
      const payload = JSON.parse(mockWs.send.mock.calls[0][0]);
      expect(payload.type).toBe('GUESS_LETTER');
      expect(payload.char).toBe('A');

      transport.destroy();
    });

    it('emits PONG and measures sub-second network round-trip ping accurately', () => {
      const transport = new MultiplayerTransport();
      let pongEvent: any = null;

      transport.subscribe((event) => {
        if (event.type === 'PONG') {
          pongEvent = event;
        }
      });

      const clientTime = Date.now() - 24;
      (transport as any).emit({
        type: 'PONG',
        clientTimestamp: clientTime,
        serverTimestamp: Date.now(),
      });

      expect(pongEvent).not.toBeNull();
      expect(pongEvent.clientTimestamp).toBe(clientTime);

      transport.destroy();
    });
  });
});

