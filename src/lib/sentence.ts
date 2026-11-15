import { ParsedWordToken } from './types';

/**
 * Parses an individual sentence token into prefix punctuation, alphabetic root, and suffix punctuation.
 * Example: '"dossiers,"' -> { prefix: '"', root: 'dossiers', suffix: ',"' }
 */
export function parseWordToken(token: string, index: number = 0): ParsedWordToken {
  const match = token.match(/^([^a-zA-Z]*)([a-zA-Z]+)([^a-zA-Z]*)$/);
  if (!match) {
    return { raw: token, prefix: '', root: token, suffix: '', index };
  }
  return {
    raw: token,
    prefix: match[1],
    root: match[2],
    suffix: match[3],
    index,
  };
}

/**
 * Splits a sentence into parsed tokens.
 */
export function tokenizeSentence(sentence: string): ParsedWordToken[] {
  if (!sentence || sentence.trim().length === 0) return [];
  const words = sentence.trim().split(/\s+/);
  return words.map((w, idx) => parseWordToken(w, idx));
}

/**
 * Reconstructs a token by applying newWord with proper case matching and existing punctuation.
 */
export function formatReplacementToken(originalToken: string, newWord: string): string {
  const parsed = parseWordToken(originalToken);
  let casedWord = newWord;

  // Preserve capitalization pattern:
  // If original root is TitleCase (e.g. "Berlin") -> capitalize new word ("Munich")
  if (/^[A-Z][a-z]*$/.test(parsed.root)) {
    casedWord = newWord.charAt(0).toUpperCase() + newWord.slice(1).toLowerCase();
  } else if (/^[A-Z]+$/.test(parsed.root) && parsed.root.length > 1) {
    // All caps
    casedWord = newWord.toUpperCase();
  } else {
    // Default lowercase
    casedWord = newWord.toLowerCase();
  }

  return `${parsed.prefix}${casedWord}${parsed.suffix}`;
}

/**
 * Replaces exactly 1 word at wordIndex in sentence, preserving all punctuation and formatting.
 */
export function replaceWordInSentence(
  sentence: string,
  wordIndex: number,
  newWord: string
): { newSentence: string; oldWord: string; newWord: string } {
  if (!sentence) {
    throw new Error('Sentence cannot be empty.');
  }

  const tokens = sentence.trim().split(/\s+/);
  if (wordIndex < 0 || wordIndex >= tokens.length) {
    throw new Error(`Word index ${wordIndex} is out of bounds [0, ${tokens.length - 1}].`);
  }

  const oldToken = tokens[wordIndex];
  const parsedOld = parseWordToken(oldToken);
  const formattedNew = formatReplacementToken(oldToken, newWord);
  tokens[wordIndex] = formattedNew;

  return {
    newSentence: tokens.join(' '),
    oldWord: parsedOld.root,
    newWord: parseWordToken(formattedNew).root,
  };
}
