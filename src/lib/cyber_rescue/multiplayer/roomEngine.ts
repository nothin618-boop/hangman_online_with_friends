import {
  MultiplayerPlayer,
  MultiplayerRoomState,
  ScoreBreakdown,
} from './types';
import {
  calculatePlayerRoundScore,
  getWordRoundDuration,
  RUSH_TIMER_SECONDS,
  MAX_CANOPY_FLOATS,
} from './scoring';
import { getRandomWord, CategoryType } from '../words';

const ROOM_CODE_PREFIXES = ['SKY', 'CLD', 'AERO', 'JET', 'NEO', 'WIND'];

export function generateRoomCode(): string {
  const prefix = ROOM_CODE_PREFIXES[Math.floor(Math.random() * ROOM_CODE_PREFIXES.length)];
  const num = Math.floor(10 + Math.random() * 90);
  return `${prefix}-${num}`;
}

export const OPERATIVE_CODENAMES = [
  'Phoenix',
  'Falcon',
  'Viper',
  'Shadow',
  'Titan',
  'Ghost',
  'Nova',
  'Raven',
  'Blaze',
  'Storm',
  'Frost',
  'Cipher',
  'Apex',
  'Vortex',
  'Echo',
  'Spectre',
] as const;

export const OPERATIVE_AVATARS = [
  'sticker_classic',
  'sticker_shades',
  'sticker_ninja',
  'sticker_gamer',
  'sticker_cowboy',
  'sticker_detective',
  'sticker_cyborg',
  'sticker_party',
  'sticker_crown',
  'sticker_nerd',
  'sticker_star',
  'sticker_angel',
  'sticker_pirate',
  'sticker_astro',
  'sticker_wizard',
  'sticker_blaze',
  'sticker_viking',
  'sticker_sleepy',
  'sticker_cat',
  'sticker_robot',
] as const;

export const GREEK_ALPHABET = [
  'Alpha', 'Beta', 'Gamma', 'Delta', 'Epsilon', 'Zeta', 'Eta', 'Theta',
  'Iota', 'Kappa', 'Lambda', 'Mu', 'Nu', 'Xi', 'Omicron', 'Pi',
  'Rho', 'Sigma', 'Tau', 'Upsilon', 'Phi', 'Chi', 'Psi', 'Omega'
] as const;

export const GAMER_CYBER_HANDLES = [
  'CyberHawk',
  'ShadowPulse',
  'NeonViper',
  'GhostRider',
  'SkyDrifter',
  'EchoZero',
  'PhantomBlade',
  'NovaStrike',
  'VortexRider',
  'AeroByte',
  'BlazeRunner',
  'TitanCore',
  'ApexFalcon',
  'ZenithFox',
  'PulseJet',
  'RogueComet',
  'StormRider',
  'IronClaw',
  'SolarKnight',
  'SonicBreeze',
  'SpectreWing',
  'QuantumDash',
  'FrostBite',
  'ThunderBolt',
  'OmegaPilot',
  'PixelWolf',
  'TurboFlare',
  'DarkNexus',
  'CosmicRay',
  'AstroJumper',
  'HyperNova',
  'LunarGlide',
  'StarSentry',
  'SilverFang',
  'VectorWave',
  'GlitchSeeker',
  'FlashSpark',
  'RazorEdge',
  'StealthWing',
  'PrismRider',
  'CipherPulse',
  'AetherDrift',
  'ZeroGravity',
  'NeonBlaster',
  'PlasmaJet',
  'MatrixRider',
  'ShadowHunter',
  'SkyRebel',
  'ApexPredator',
  'CloudRanger',
] as const;

/**
 * Returns a random unique gamer/cyber handle not currently taken.
 * Strictly avoids numeric suffixes (#1, #2, 84, etc.) - always clean gamer names.
 */
export function getRandomComputerName(excludeNames: string[] = []): string {
  const normalizedExclude = new Set(excludeNames.map((n) => (n || '').trim().toLowerCase()));
  const available = GAMER_CYBER_HANDLES.filter((name) => !normalizedExclude.has(name.toLowerCase()));
  if (available.length > 0) {
    return available[Math.floor(Math.random() * available.length)];
  }
  // Fallback: Combine cool codename with handle (e.g. ShadowViper, FrostFalcon) - 0 numbers
  for (const code of OPERATIVE_CODENAMES) {
    for (const handle of GAMER_CYBER_HANDLES) {
      const combined = `${code}${handle}`;
      if (!normalizedExclude.has(combined.toLowerCase())) {
        return combined;
      }
    }
  }
  return GAMER_CYBER_HANDLES[Math.floor(Math.random() * GAMER_CYBER_HANDLES.length)];
}

/**
 * Backward compatibility alias for getRandomComputerName
 */
export function getRandomOperativeName(excludeNames: string[] = []): string {
  return getRandomComputerName(excludeNames);
}

/**
 * Ensures player name is non-empty, distinct, and collision-free.
 * - If name is blank or generic ("Player", "Player 1", "Operative"), picks an unused cool gamer name.
 * - If custom name is unique in the room, preserves it as-is.
 * - If custom name already exists in the room, assigns a clean unused gamer name (NO #1, #2 suffixes).
 */
export function ensureUniquePlayerName(
  baseName: string | undefined | null,
  existingPlayers: Record<string, MultiplayerPlayer> | MultiplayerPlayer[],
  targetPlayerId?: string
): string {
  const playersList = Array.isArray(existingPlayers)
    ? existingPlayers
    : Object.values(existingPlayers || {});

  const otherPlayers = playersList.filter((p) => !targetPlayerId || p.id !== targetPlayerId);
  const existingNamesLower = otherPlayers.map((p) => (p.name || '').trim().toLowerCase());

  const cleanName = (baseName || '').trim();

  // If empty or purely whitespace, pick an unused cool gamer name
  if (!cleanName) {
    return getRandomComputerName(otherPlayers.map((p) => p.name));
  }

  // If not taken in the room, it's valid as-is
  if (!existingNamesLower.includes(cleanName.toLowerCase())) {
    return cleanName;
  }

  // It's taken! Check if it's "Operative" or "Operative <Greek>"
  const operativeMatch = cleanName.match(/^Operative(\s+[A-Za-z]+)?$/i);
  if (operativeMatch) {
    for (const greek of GREEK_ALPHABET) {
      const candidate = `Operative ${greek}`;
      if (!existingNamesLower.includes(candidate.toLowerCase())) {
        return candidate;
      }
    }
  }

  // For any duplicate custom name (e.g. "Kabir"), strictly DO NOT add #1, #2 or numeric suffixes!
  // Assign a fresh, unused proper random gamer name instead.
  return getRandomComputerName(otherPlayers.map((p) => p.name));
}

/**
 * Assigns an unused avatar from the pool, or preserves preferredAvatar if available.
 */
export function assignUniqueAvatar(
  existingPlayers: Record<string, MultiplayerPlayer> | MultiplayerPlayer[],
  preferredAvatar?: string,
  targetPlayerId?: string
): string {
  const playersList = Array.isArray(existingPlayers)
    ? existingPlayers
    : Object.values(existingPlayers || {});

  const otherPlayers = playersList.filter((p) => !targetPlayerId || p.id !== targetPlayerId);
  const usedAvatars = new Set(otherPlayers.map((p) => p.avatar));

  if (preferredAvatar && !usedAvatars.has(preferredAvatar)) {
    return preferredAvatar;
  }

  for (const avatar of OPERATIVE_AVATARS) {
    if (!usedAvatars.has(avatar)) {
      return avatar;
    }
  }

  return preferredAvatar || OPERATIVE_AVATARS[0];
}

export function createPlayer(params: {
  id: string;
  name?: string;
  avatar?: string;
  isHost?: boolean;
}): MultiplayerPlayer {
  const avatar = params.avatar || OPERATIVE_AVATARS[Math.floor(Math.random() * OPERATIVE_AVATARS.length)];
  const name = params.name?.trim() || getRandomOperativeName();

  return {
    id: params.id,
    name,
    avatar,
    isHost: !!params.isHost,
    ping: 24,
    canopyHealth: MAX_CANOPY_FLOATS,
    wrongGuesses: 0,
    guessedLetters: [],
    solvedCount: 0,
    wordsSolved: 0,
    isSolved: false,
    roundScore: 0,
    totalScore: 0,
    status: 'waiting',
  };
}

export const DEFAULT_MAX_PLAYERS = 12;
export const DEFAULT_MAX_ROUNDS = 12;

export function createRoom(params: {
  roomId: string;
  hostPlayer: MultiplayerPlayer;
  category?: string;
  maxPlayers?: number;
  maxRounds?: number;
  isPublic?: boolean;
}): MultiplayerRoomState {
  const roomCode = generateRoomCode();
  const now = Date.now();

  const hostName = ensureUniquePlayerName(params.hostPlayer.name, []);
  const hostAvatar = assignUniqueAvatar([], params.hostPlayer.avatar);

  const cleanHost: MultiplayerPlayer = {
    ...params.hostPlayer,
    name: hostName,
    avatar: hostAvatar,
    isHost: true,
    lastHeartbeat: now,
  };

  return {
    roomId: params.roomId,
    roomCode,
    status: 'in_lobby',
    hostId: cleanHost.id,
    roundNumber: 0,
    maxRounds: params.maxRounds || DEFAULT_MAX_ROUNDS,
    maxPlayers: params.maxPlayers || DEFAULT_MAX_PLAYERS,
    isPublic: params.isPublic !== undefined ? params.isPublic : true,
    targetWord: '',
    category: params.category || 'ALL',
    totalTimeSeconds: RUSH_TIMER_SECONDS,
    remainingTimeSeconds: RUSH_TIMER_SECONDS,
    serverTimestamp: now,
    serverStartTime: now,
    serverEndTime: now + 999999000,
    isRushActive: false,
    players: {
      [cleanHost.id]: cleanHost,
    },
  };
}

export function joinRoom(
  room: MultiplayerRoomState,
  player: MultiplayerPlayer
): MultiplayerRoomState {
  if (room.players[player.id]) {
    // Reconnecting player
    const existing = room.players[player.id];
    const resolvedName = player.name
      ? ensureUniquePlayerName(player.name, room.players, player.id)
      : existing.name;
    const resolvedAvatar = assignUniqueAvatar(room.players, player.avatar || existing.avatar, player.id);

    return {
      ...room,
      players: {
        ...room.players,
        [player.id]: {
          ...existing,
          name: resolvedName,
          avatar: resolvedAvatar,
          lastHeartbeat: Date.now(),
          status: room.players[player.id].status === 'disconnected' ? 'typing' : room.players[player.id].status,
        },
      },
    };
  }

  // Maximum limit check: 12 players
  const currentCount = Object.keys(room.players).length;
  if (currentCount >= (room.maxPlayers || DEFAULT_MAX_PLAYERS)) {
    return room; // Room is at maximum capacity (12 players)
  }

  const uniqueName = ensureUniquePlayerName(player.name, room.players);
  const uniqueAvatar = assignUniqueAvatar(room.players, player.avatar);

  return {
    ...room,
    players: {
      ...room.players,
      [player.id]: {
        ...player,
        name: uniqueName,
        avatar: uniqueAvatar,
        isHost: false,
        lastHeartbeat: Date.now(),
        status: room.status === 'playing' || room.status === 'rush' ? 'typing' : 'waiting',
      },
    },
  };
}

export function leaveRoom(
  room: MultiplayerRoomState,
  playerId: string
): MultiplayerRoomState {
  const leavingPlayer = room.players[playerId];
  const updatedPlayers = { ...room.players };
  delete updatedPlayers[playerId];

  // If host leaves, assign next player as host
  let nextHostId = room.hostId;
  if (room.hostId === playerId) {
    const remainingIds = Object.keys(updatedPlayers);
    if (remainingIds.length > 0) {
      nextHostId = remainingIds[0];
      updatedPlayers[nextHostId] = {
        ...updatedPlayers[nextHostId],
        isHost: true,
      };
    }
  }

  const remainingPlayers = Object.values(updatedPlayers);

  // If match was in progress and only 1 player is left, declare Forfeit Victory
  if ((room.status === 'playing' || room.status === 'rush') && remainingPlayers.length === 1) {
    const winner = remainingPlayers[0];
    return {
      ...room,
      hostId: nextHostId,
      players: updatedPlayers,
      status: 'match_over',
      winnerId: winner.id,
      isForfeitVictory: true,
      forfeitedPlayerName: leavingPlayer?.name || 'Opponent',
    };
  }

  return {
    ...room,
    hostId: nextHostId,
    players: updatedPlayers,
  };
}

export function purgeInactivePlayers(
  room: MultiplayerRoomState,
  now: number = Date.now(),
  timeoutMs: number = 8000
): { room: MultiplayerRoomState; purgedPlayerIds: string[] } {
  let currentRoom = room;
  const purgedPlayerIds: string[] = [];

  for (const [id, player] of Object.entries(room.players)) {
    if (player.lastHeartbeat && now - player.lastHeartbeat > timeoutMs) {
      purgedPlayerIds.push(id);
      currentRoom = leaveRoom(currentRoom, id);
    }
  }

  return { room: currentRoom, purgedPlayerIds };
}

export function startRound(
  room: MultiplayerRoomState,
  customWord?: string,
  customCategory?: string
): MultiplayerRoomState {
  let selectedWord: string;
  let selectedCat: string;

  if (customWord && customWord.trim().length >= 3) {
    selectedWord = customWord.trim().toUpperCase().replace(/[^A-Z]/g, '');
    selectedCat = customCategory || 'CUSTOM';
  } else {
    const wordData = getRandomWord(room.category as CategoryType);
    selectedWord = wordData.word.toUpperCase();
    selectedCat = wordData.category;
  }

  const duration = RUSH_TIMER_SECONDS;
  const now = Date.now();

  const resetPlayers: Record<string, MultiplayerPlayer> = {};
  for (const [id, p] of Object.entries(room.players)) {
    resetPlayers[id] = {
      ...p,
      canopyHealth: MAX_CANOPY_FLOATS,
      wrongGuesses: 0,
      guessedLetters: [],
      solvedCount: 0,
      isSolved: false,
      solveTimeSeconds: undefined,
      roundScore: 0,
      status: 'typing',
      rank: undefined,
    };
  }

  return {
    ...room,
    status: 'playing',
    roundNumber: room.roundNumber + 1,
    targetWord: selectedWord,
    category: selectedCat,
    totalTimeSeconds: duration,
    remainingTimeSeconds: duration,
    serverTimestamp: now,
    serverStartTime: now,
    serverEndTime: now + 999999000,
    isRushActive: false,
    rushTriggeredBy: undefined,
    rushRemainingSeconds: undefined,
    winnerId: undefined,
    players: resetPlayers,
  };
}

export function processPlayerGuess(params: {
  room: MultiplayerRoomState;
  playerId: string;
  letter: string;
  now?: number;
}): {
  room: MultiplayerRoomState;
  isCorrect: boolean;
  isSolved: boolean;
  isLanded: boolean;
  rushTriggered: boolean;
  breakdown?: ScoreBreakdown;
} {
  const { room, playerId, letter } = params;
  const now = params.now || Date.now();

  const player = room.players[playerId];
  if (!player || (room.status !== 'playing' && room.status !== 'rush')) {
    return {
      room,
      isCorrect: false,
      isSolved: false,
      isLanded: false,
      rushTriggered: false,
    };
  }

  // Already solved or landed or already guessed letter
  const char = letter.toUpperCase();
  if (player.isSolved || player.wrongGuesses >= MAX_CANOPY_FLOATS || player.guessedLetters.includes(char)) {
    return {
      room,
      isCorrect: room.targetWord.includes(char),
      isSolved: player.isSolved,
      isLanded: player.wrongGuesses >= MAX_CANOPY_FLOATS,
      rushTriggered: false,
    };
  }

  const newGuessed = [...player.guessedLetters, char];
  const isCorrect = room.targetWord.includes(char);
  const newWrong = isCorrect ? player.wrongGuesses : player.wrongGuesses + 1;
  const newCanopy = Math.max(0, MAX_CANOPY_FLOATS - newWrong);

  // Check unique solved characters
  const uniqueWordLetters = Array.from(new Set(room.targetWord.split('')));
  const solvedCount = uniqueWordLetters.filter((l) => newGuessed.includes(l)).length;
  const isSolved = uniqueWordLetters.every((l) => newGuessed.includes(l));
  const isLanded = !isSolved && newWrong >= MAX_CANOPY_FLOATS;

  // Determine first solver status
  const alreadySolvedPlayers = Object.values(room.players).filter((p) => p.isSolved);
  const isFirstSolver = isSolved && alreadySolvedPlayers.length === 0;

  // Calculate score breakdown
  const remainingSec = Math.max(0, Math.ceil((room.serverEndTime - now) / 1000));
  const solveTimeMs = isSolved
    ? Math.max(1, now - (room.roundStartTimeMs || room.serverStartTime || now))
    : undefined;
  let breakdown: ScoreBreakdown | undefined;

  if (isSolved) {
    breakdown = calculatePlayerRoundScore({
      isSolved: true,
      wrongGuesses: newWrong,
      remainingSeconds: remainingSec,
      totalSeconds: room.totalTimeSeconds,
      isFirstSolver,
      solveTimeMs,
    });
  } else if (isLanded) {
    breakdown = calculatePlayerRoundScore({
      isSolved: false,
      wrongGuesses: newWrong,
      remainingSeconds: remainingSec,
      totalSeconds: room.totalTimeSeconds,
      isFirstSolver: false,
    });
  }

  // Rush timer handling: If first solver, trigger sudden death countdown!
  let rushTriggered = false;
  let nextEndTime = room.serverEndTime;
  let nextRemaining = room.remainingTimeSeconds;
  let isRushActive = room.isRushActive;
  let rushTriggeredBy = room.rushTriggeredBy;
  let rushRemainingSeconds = room.rushRemainingSeconds;

  if (isFirstSolver) {
    rushTriggered = true;
    isRushActive = true;
    rushTriggeredBy = { id: player.id, name: player.name };

    // Clamps/starts timer strictly at 15s for all other players
    nextEndTime = now + RUSH_TIMER_SECONDS * 1000;
    nextRemaining = RUSH_TIMER_SECONDS;
    rushRemainingSeconds = RUSH_TIMER_SECONDS;
  }

  const updatedPlayer: MultiplayerPlayer = {
    ...player,
    guessedLetters: newGuessed,
    wrongGuesses: newWrong,
    canopyHealth: newCanopy,
    solvedCount,
    wordsSolved: (player.wordsSolved || 0) + (isSolved && !player.isSolved ? 1 : 0),
    isSolved,
    solveTimeMs,
    solveTimeFormatted: solveTimeMs ? (solveTimeMs / 1000).toFixed(2) + 's' : undefined,
    solveTimeSeconds: isSolved ? Math.round(solveTimeMs! / 1000) : undefined,
    scoreBreakdown: breakdown,
    roundScore: breakdown ? breakdown.total : 0,
    totalScore: breakdown ? player.totalScore + breakdown.total : player.totalScore,
    status: isSolved ? 'solved' : isLanded ? 'landed' : 'typing',
  };

  const updatedPlayers = {
    ...room.players,
    [playerId]: updatedPlayer,
  };

  // Check if all active players are done (either solved or landed)
  const allFinished = Object.values(updatedPlayers).every(
    (p) => p.isSolved || p.status === 'landed' || p.status === 'disconnected'
  );

  const isFinalMatchRound = room.roundNumber >= (room.maxRounds || DEFAULT_MAX_ROUNDS);
  const nextStatus = allFinished
    ? isFinalMatchRound
      ? 'match_over'
      : 'round_over'
    : isRushActive
      ? 'rush'
      : 'playing';

  const updatedRoom: MultiplayerRoomState = {
    ...room,
    status: nextStatus,
    serverTimestamp: now,
    serverEndTime: nextEndTime,
    remainingTimeSeconds: nextRemaining,
    isRushActive,
    rushTriggeredBy,
    rushRemainingSeconds,
    players: updatedPlayers,
  };

  return {
    room: updatedRoom,
    isCorrect,
    isSolved,
    isLanded,
    rushTriggered,
    breakdown,
  };
}

export function tickRoomClock(
  room: MultiplayerRoomState,
  now: number
): { room: MultiplayerRoomState; isRoundOver: boolean } {
  if (room.status !== 'playing' && room.status !== 'rush') {
    return { room, isRoundOver: false };
  }

  // User Rule: Round clock ONLY starts when first player solves!
  if (!room.isRushActive) {
    return {
      room: {
        ...room,
        serverTimestamp: now,
      },
      isRoundOver: false,
    };
  }

  const remaining = Math.max(0, Math.ceil((room.serverEndTime - now) / 1000));
  const isTimeUp = remaining <= 0;

  if (isTimeUp) {
    // Time expired: any player who hasn't solved gets 0 points and 'landed'
    const finalPlayers: Record<string, MultiplayerPlayer> = {};
    for (const [id, p] of Object.entries(room.players)) {
      if (!p.isSolved) {
        finalPlayers[id] = {
          ...p,
          status: 'landed',
          roundScore: 0,
        };
      } else {
        finalPlayers[id] = p;
      }
    }

    const isFinalMatchRound = room.roundNumber >= (room.maxRounds || DEFAULT_MAX_ROUNDS);

    return {
      room: {
        ...room,
        status: isFinalMatchRound ? 'match_over' : 'round_over',
        remainingTimeSeconds: 0,
        serverTimestamp: now,
        players: finalPlayers,
      },
      isRoundOver: true,
    };
  }

  return {
    room: {
      ...room,
      remainingTimeSeconds: remaining,
      serverTimestamp: now,
      rushRemainingSeconds: room.isRushActive ? remaining : undefined,
    },
    isRoundOver: false,
  };
}

export function computeLeaderboard(room: MultiplayerRoomState): MultiplayerPlayer[] {
  return Object.values(room.players).sort((a, b) => {
    // 1. Highest total score
    if (b.totalScore !== a.totalScore) {
      return b.totalScore - a.totalScore;
    }
    // 2. Highest round score
    if (b.roundScore !== a.roundScore) {
      return b.roundScore - a.roundScore;
    }
    // 3. Fastest solve time in milliseconds
    if (a.solveTimeMs && b.solveTimeMs && a.solveTimeMs !== b.solveTimeMs) {
      return a.solveTimeMs - b.solveTimeMs;
    }
    if (a.solveTimeSeconds && b.solveTimeSeconds && a.solveTimeSeconds !== b.solveTimeSeconds) {
      return a.solveTimeSeconds - b.solveTimeSeconds;
    }
    // 4. Fewer wrong guesses
    if (a.wrongGuesses !== b.wrongGuesses) {
      return a.wrongGuesses - b.wrongGuesses;
    }
    return a.id.localeCompare(b.id);
  });
}

