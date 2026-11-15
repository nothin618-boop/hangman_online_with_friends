import { FilterValidationResult, Hop } from './types';
import { isDictionaryWord } from './dictionary';

const ALPHABET_REGEX = /^[a-zA-Z]+$/;
const MAX_WORD_LENGTH = 11; // strictly < 12 characters

/**
 * Extracts all unique lower-case word stems from chain history.
 * Skips revoked hops from crowd jury rewinds.
 */
export function extractHistoricalWords(
  chainHistory: Hop[] = [],
  initialSentence?: string
): Set<string> {
  const historySet = new Set<string>();

  // Include initial sentence tokens if provided
  if (initialSentence) {
    const tokens = initialSentence.toLowerCase().match(/[a-z]+/g) || [];
    for (const token of tokens) {
      historySet.add(token);
    }
  }

  // Iterate all non-revoked hops
  for (let i = 0; i < chainHistory.length; i++) {
    const hop = chainHistory[i];
    if (hop.isRevoked) continue;

    if (hop.previousSentence) {
      const prevTokens = hop.previousSentence.toLowerCase().match(/[a-z]+/g) || [];
      for (const t of prevTokens) historySet.add(t);
    }

    if (hop.newSentence) {
      const newTokens = hop.newSentence.toLowerCase().match(/[a-z]+/g) || [];
      for (const t of newTokens) historySet.add(t);
    }

    if (hop.newWord) {
      historySet.add(hop.newWord.trim().toLowerCase());
    }
  }

  return historySet;
}

/**
 * Validates a candidate replacement word against all Filter Rule Engine constraints.
 *
 * @param candidateWord Raw word entered by player
 * @param chainHistory Array of past hops in this chain
 * @param themeBannedWords Optional secret array of 5 banned words (server-only)
 * @param initialSentence Optional starter sentence of the chain
 * @returns FilterValidationResult
 */
export function validateCandidateWord(
  candidateWord: string,
  chainHistory: Hop[] = [],
  themeBannedWords: string[] = [],
  initialSentence?: string
): FilterValidationResult {
  // 1. Whitespace & Empty Check
  if (!candidateWord || typeof candidateWord !== 'string') {
    return {
      valid: false,
      error: 'EMPTY_INPUT',
      message: 'Candidate word cannot be empty.',
    };
  }

  const trimmed = candidateWord.trim();
  if (trimmed.length === 0) {
    return {
      valid: false,
      error: 'EMPTY_INPUT',
      message: 'Candidate word cannot be blank.',
    };
  }

  // 2. Alphabet Purity Regex Lock (/^[a-zA-Z]+$/)
  if (!ALPHABET_REGEX.test(trimmed)) {
    return {
      valid: false,
      error: 'INVALID_CHARACTERS',
      message: 'Word must contain only alphabetic characters (A-Z, a-z). Numbers, spaces, hyphens, and symbols are forbidden.',
    };
  }

  // 3. Length Lock (< 12 characters, 1..11)
  if (trimmed.length > MAX_WORD_LENGTH) {
    return {
      valid: false,
      error: 'WORD_TOO_LONG',
      message: `Word length must be under 12 characters (maximum 11 characters allowed, received ${trimmed.length}).`,
    };
  }

  const normalized = trimmed.toLowerCase();

  // 4. English Dictionary Verification
  if (!isDictionaryWord(normalized)) {
    return {
      valid: false,
      error: 'NOT_IN_DICTIONARY',
      message: `"${trimmed}" is not recognized as a valid English dictionary word.`,
    };
  }

  // 5. Historical Duplicate Check (No Repeats Invariant)
  const historicalWords = extractHistoricalWords(chainHistory, initialSentence);
  if (historicalWords.has(normalized)) {
    return {
      valid: false,
      error: 'DUPLICATE_HISTORICAL_WORD',
      message: `"${trimmed}" has already been used in this chain's history. Word repetitions are strictly forbidden.`,
    };
  }

  // 6. Secret Trap Words Check (Server-side blacklist)
  let isTrap = false;
  if (themeBannedWords && Array.isArray(themeBannedWords)) {
    for (let i = 0; i < themeBannedWords.length; i++) {
      if (themeBannedWords[i].trim().toLowerCase() === normalized) {
        isTrap = true;
        break;
      }
    }
  }

  return {
    valid: true,
    isTrap,
    normalizedWord: normalized,
    message: isTrap
      ? 'CRITICAL ALERT: Banned secret trap word detected! Strike penalty triggered.'
      : undefined,
  };
}
