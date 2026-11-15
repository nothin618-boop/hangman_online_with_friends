/**
 * WHISPER Core Data Contracts & Domain Types
 */

export type PlayerRole = 'shifter' | 'decoder';

export type ChainStatus = 'active' | 'in_progress' | 'victory' | 'destroyed';

/**
 * Filter error discriminant codes
 */
export type FilterErrorCode =
  | 'EMPTY_INPUT'
  | 'INVALID_CHARACTERS'
  | 'WORD_TOO_LONG'
  | 'NOT_IN_DICTIONARY'
  | 'DUPLICATE_HISTORICAL_WORD';

/**
 * Filter validation result object
 */
export interface FilterValidationResult {
  valid: boolean;
  error?: FilterErrorCode;
  message?: string;
  isTrap?: boolean;           // True if word matches one of the secret banned trap words
  normalizedWord?: string;    // Trimmed, lowercase word
}

/**
 * Representation of a single hop in the chain history
 */
export interface Hop {
  hopNumber: number;          // 1-indexed sequential hop number (Hop 0 is starter prompt)
  playerId: string;           // Anonymous UUID session id
  playerAlias?: string;       // Cyberpunk codename (e.g. "Cipher-9", "Ghost-42")
  previousSentence: string;   // Sentence state prior to this hop
  newSentence: string;        // Sentence state after this hop
  replacedWordIndex?: number; // Word token index in sentence (0-indexed, undefined for decoder)
  oldWord?: string;           // Replaced root word (shifter only)
  newWord?: string;           // Disguise replacement word (shifter only)
  role: PlayerRole;           // Role assumed during this hop
  decoderGuess?: string;      // Guess submitted if decoder role
  isCorrectGuess?: boolean;   // True if decoder deduced secretTheme correctly
  isTrapHit?: boolean;        // True if shifter triggered a secret banned trap word
  isRevoked?: boolean;        // True if jury flagged hop as sabotage and rewound
  timestamp: number;          // Unix epoch milliseconds
}

/**
 * Curated theme seed template
 */
export interface SecretThemeTemplate {
  id: string;                 // Unique identifier (e.g. "cold-war-espionage")
  theme: string;              // Human-readable theme display title
  initialSentence: string;    // Grammatically sound seed sentence (7-12 words, <12 char words)
  bannedWords: string[];      // Exactly 5 secret trap words (<12 chars each, dictionary verified)
  decoyThemes: string[];      // Exactly 3 plausible decoy themes for Decoder 4-candidate quiz
  category: string;           // Genre/category (e.g. "Espionage", "Sci-Fi", "Occult")
}

/**
 * Full Server-Side Chain State
 */
export interface Chain {
  id: string;                 // Unique chain UUID
  secretTheme: string;        // The true classified origin theme
  themeOptions: string[];     // Exactly 4 options (1 correct + 3 decoys, shuffled)
  bannedWords: string[];      // Exactly 5 trap words (CONFIDENTIAL - never exposed during shifter turns)
  initialSentence: string;    // Hop 0 immutable starter sentence
  currentSentence: string;    // Current sentence state after all active mutations
  currentHop: number;         // Current sequential hop count (0..100)
  bonusHops?: number;         // Accumulated bonus hops awarded from successful decoders (+10 each)
  lives: number;              // Signal bars remaining (starts at 3, destroyed at 0)
  maxHops: number;            // Victory threshold (constant: 100)
  history: Hop[];             // Complete chronological timeline of mutations and deductions
  status: ChainStatus;        // 'active' | 'in_progress' | 'victory' | 'destroyed'
  leasedToPlayerId?: string | null;  // Player ID holding the 60-second atomic lock
  leaseExpiresAt?: number | null;    // Epoch ms when lease expires
  createdAt: number;          // Epoch ms
  completedAt?: number;       // Epoch ms when transitioned to victory or destroyed
}

/**
 * Client-Sanitized Chain Payload
 * Excludes confidential server secrets (bannedWords and secretTheme) to prevent keystroke/devtools snooping.
 */
export interface SanitizedChain {
  id: string;
  themeOptions?: string[];    // Included ONLY if role === 'decoder'
  initialSentence?: string;
  currentSentence: string;
  currentHop: number;
  bonusHops?: number;
  effectiveHops?: number;      // currentHop + bonusHops
  lives: number;
  maxHops: number;
  history?: Hop[];             // Trace log entries (sanitized)
  traceLog?: Hop[];            // Last 3 hops for client display
  status: ChainStatus;
  leaseExpiresAt?: number | null;
  role: PlayerRole;           // Assigned role for the current intercept
}

/**
 * Decoder Resolution Result
 */
export interface DecoderResolutionResult {
  isCorrect: boolean;
  bonusAwarded: number;       // 10 if correct, 0 if incorrect
  livesRemaining: number;     // Updated lives (lives - 1 on failure)
  isVictory: boolean;         // True if (currentHop + bonusHops >= maxHops)
  isDestroyed: boolean;       // True if lives <= 0
  chain: Chain;               // Mutated chain instance
  hop: Hop;                   // Recorded Hop entry
}

/**
 * Shifter Mutation Result
 */
export interface ShifterMutationResult {
  success: boolean;
  chain: Chain;
  hop: Hop;
  isTrap: boolean;
  livesRemaining: number;
  isDestroyed: boolean;
  isVictory: boolean;
}

/**
 * Word token parse result with punctuation preserved
 */
export interface ParsedWordToken {
  raw: string;                // Original token, e.g. '"dossiers,"'
  prefix: string;             // Leading punctuation, e.g. '"'
  root: string;               // Alphabetic core, e.g. 'dossiers'
  suffix: string;             // Trailing punctuation, e.g. ',"'
  index: number;              // Position in sentence (0-indexed)
}

/**
 * Crowd Jury Types (M2/M3)
 */
export interface JuryCase {
  id: string;
  chainId: string;
  flaggedHop: Hop;
  flaggedWord: string;
  reporterPlayerId: string;
  assignedPeerIds: string[]; // 3 peers
  votes: Record<string, boolean>; // voterId -> isSabotage
  status: 'pending' | 'consensus_sabotage' | 'consensus_dismissed' | 'timeout';
  createdAt: number;
  resolvedAt?: number;
}

export interface JuryVoteResult {
  resolved: boolean;
  verdict?: 'sabotage' | 'dismissed';
  chainRewound?: boolean;
  trollShadowBanned?: boolean;
}

export interface GhostReceipt {
  chainId: string;
  themeTitle: string;
  outcome: 'victory' | 'destroyed';
  finalHop: number;
  totalContributors: number;
  initialSentence: string;
  finalSentence: string;
  timeline: Hop[];
  completedAt: number;
}
