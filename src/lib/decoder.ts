import { Chain, DecoderResolutionResult, Hop } from './types';

export const DECODER_BONUS_HOPS = 10;
export const DEFAULT_MAX_HOPS = 100;

/**
 * Resolves a player's theme deduction guess during a Decoder turn.
 *
 * @param chain The target Chain state
 * @param guess The theme string chosen by the player
 * @param playerId Anonymous player session UUID
 * @param playerAlias Optional cyberpunk alias
 * @returns DecoderResolutionResult containing updated chain, hop, and flags
 */
export function resolveDecoderGuess(
  chain: Chain,
  guess: string,
  playerId: string,
  playerAlias?: string
): DecoderResolutionResult {
  if (!chain) {
    throw new Error('Chain must be defined to resolve decoder guess.');
  }

  if (chain.status === 'victory' || chain.status === 'destroyed') {
    throw new Error(`Cannot submit decoder guess to a finalized chain with status "${chain.status}".`);
  }

  const normalizedGuess = (guess || '').trim().toLowerCase();
  const normalizedSecret = (chain.secretTheme || '').trim().toLowerCase();
  const isCorrect = normalizedGuess.length > 0 && normalizedGuess === normalizedSecret;

  const previousSentence = chain.currentSentence;
  const now = Date.now();

  let bonusAwarded = 0;

  if (isCorrect) {
    // 1. Correct Theme Deduction
    bonusAwarded = DECODER_BONUS_HOPS;
    chain.bonusHops = (chain.bonusHops || 0) + DECODER_BONUS_HOPS;
    chain.currentHop += 1;

    // Record Hop
    const hop: Hop = {
      hopNumber: chain.currentHop,
      playerId,
      playerAlias: playerAlias || `Decoder-${playerId.slice(0, 4)}`,
      previousSentence,
      newSentence: previousSentence, // Sentence remains intact
      role: 'decoder',
      decoderGuess: guess,
      isCorrectGuess: true,
      timestamp: now,
    };
    chain.history.push(hop);

    // Evaluate Victory condition
    const maxHops = chain.maxHops || DEFAULT_MAX_HOPS;
    const effectiveHops = chain.currentHop + (chain.bonusHops || 0);
    const isVictory = effectiveHops >= maxHops;

    if (isVictory) {
      chain.status = 'victory';
      chain.completedAt = now;
    }

    return {
      isCorrect: true,
      bonusAwarded,
      livesRemaining: chain.lives,
      isVictory,
      isDestroyed: false,
      chain,
      hop,
    };
  } else {
    // 2. Incorrect Theme Deduction
    chain.lives = Math.max(0, (chain.lives ?? 3) - 1);
    chain.currentHop += 1;

    // Record Hop
    const hop: Hop = {
      hopNumber: chain.currentHop,
      playerId,
      playerAlias: playerAlias || `Decoder-${playerId.slice(0, 4)}`,
      previousSentence,
      newSentence: previousSentence, // Sentence remains intact
      role: 'decoder',
      decoderGuess: guess,
      isCorrectGuess: false,
      timestamp: now,
    };
    chain.history.push(hop);

    // Evaluate Destruction condition
    const isDestroyed = chain.lives <= 0;
    if (isDestroyed) {
      chain.status = 'destroyed';
      chain.completedAt = now;
    }

    return {
      isCorrect: false,
      bonusAwarded: 0,
      livesRemaining: chain.lives,
      isVictory: false,
      isDestroyed,
      chain,
      hop,
    };
  }
}

/**
 * Shuffles an array of strings in place using Fisher-Yates algorithm.
 * Used for randomizing the 4 theme options presented to the decoder.
 */
export function shuffleThemeOptions(options: string[]): string[] {
  const arr = [...options];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}
