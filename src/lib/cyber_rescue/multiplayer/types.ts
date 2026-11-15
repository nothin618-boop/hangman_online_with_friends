export type MultiplayerStatus =
  | 'idle'
  | 'connecting'
  | 'in_lobby'
  | 'playing'
  | 'rush'
  | 'round_over'
  | 'match_over';

export type PlayerRoundStatus =
  | 'waiting'
  | 'typing'
  | 'solved'
  | 'landed'
  | 'disconnected';

export interface ScoreBreakdown {
  base: number;
  speedBonus: number;
  canopyBonus: number;
  firstSolveBonus: number;
  placementBonus?: number;
  clutchBonus?: number;
  streakMultiplier?: number;
  streakBonus?: number;
  solveTimeMs?: number;
  solveTimeFormatted?: string;
  isFlawless?: boolean;
  total: number;
}

export interface MultiplayerPlayer {
  id: string;
  name: string;
  avatar: string;
  isHost: boolean;
  isLocal?: boolean;
  ping: number;
  canopyHealth: number; // 0 to 7 remaining floats
  wrongGuesses: number;
  guessedLetters: string[];
  solvedCount: number; // how many unique word letters correctly revealed in current round
  wordsSolved?: number; // total words successfully solved across rounds in match
  joinedRound?: number; // round number when the player joined (defaults to 1)
  isSolved: boolean;
  solveTimeSeconds?: number;
  solveTimeMs?: number;
  solveTimeFormatted?: string;
  scoreBreakdown?: ScoreBreakdown;
  roundScore: number;
  totalScore: number;
  status: PlayerRoundStatus;
  rank?: number;
}

export interface MultiplayerRoomState {
  roomId: string;
  roomCode: string; // e.g. "SKY-7"
  status: MultiplayerStatus;
  hostId: string;
  roundNumber: number;
  maxRounds: number;
  maxPlayers: number; // Maximum limit: 12 players
  isPublic?: boolean;
  targetWord: string;
  category: string;
  totalTimeSeconds: number; // 30s (short), 45s (medium), 60s (long)
  remainingTimeSeconds: number;
  roundStartTimeMs?: number;
  serverTimestamp: number;
  serverStartTime: number;
  serverEndTime: number;
  isRushActive: boolean;
  rushTriggeredBy?: {
    id: string;
    name: string;
  };
  rushRemainingSeconds?: number;
  countdownSeconds?: number;
  countdownEndTime?: number;
  players: Record<string, MultiplayerPlayer>;
  winnerId?: string;
}

export type ClientAction =
  | { type: 'JOIN_ROOM'; roomId: string; playerName: string; avatar?: string; playerId?: string }
  | { type: 'CREATE_ROOM'; playerName: string; avatar?: string; category?: string; maxPlayers?: number; isPublic?: boolean }
  | { type: 'QUICK_JOIN'; playerName: string; avatar?: string }
  | { type: 'START_ROUND'; roomId: string }
  | { type: 'GUESS_LETTER'; roomId: string; char: string; clientTimestamp: number; playerId?: string }
  | { type: 'PING'; clientTimestamp: number }
  | { type: 'LEAVE_ROOM'; roomId?: string; playerId?: string }
  | { type: 'UPDATE_PLAYER_NAME'; roomId: string; newName: string; playerId?: string }
  | { type: 'SET_PLAYER_PRESENCE'; name: string }
  | { type: 'NEXT_ROUND'; roomId: string };

export type ServerEvent =
  | { type: 'ROOM_JOINED'; player: MultiplayerPlayer; room: MultiplayerRoomState }
  | { type: 'ROOM_STATE'; room: MultiplayerRoomState }
  | { type: 'PLAYER_JOINED'; player: MultiplayerPlayer }
  | { type: 'PLAYER_LEFT'; playerId: string }
  | { type: 'ROUND_STARTED'; room: MultiplayerRoomState }
  | { type: 'OPPONENT_UPDATE'; playerId: string; canopyHealth: number; wrongGuesses: number; solvedCount: number; wordsSolved?: number; status: PlayerRoundStatus }
  | { type: 'RUSH_TRIGGERED'; rushSeconds: number; triggeredBy: { id: string; name: string }; remainingSeconds: number }
  | { type: 'PLAYER_SOLVED'; playerId: string; rank: number; breakdown: ScoreBreakdown; totalScore: number; roundScore?: number; wordsSolved?: number }
  | { type: 'PLAYER_LANDED'; playerId: string }
  | { type: 'ROUND_ENDED'; room: MultiplayerRoomState; leaderboard: MultiplayerPlayer[] }
  | { type: 'PONG'; clientTimestamp: number; serverTimestamp: number }
  | { type: 'ONLINE_NAMES_UPDATE'; names: string[] }
  | { type: 'ERROR'; message: string }
  | { type: 'ROOM_LEFT'; roomId?: string };

