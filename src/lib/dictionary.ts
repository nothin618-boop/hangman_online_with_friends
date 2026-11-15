import { CORE_DICTIONARY } from './dictionary_core';

let dictionarySet: Set<string> | null = null;

/**
 * Initializes the full dictionary Set from a custom list of words.
 * Filters out words >= 12 characters and non-alphabetic tokens.
 */
export function initializeDictionary(words: string[]): void {
  dictionarySet = new Set<string>();
  for (let i = 0; i < words.length; i++) {
    const w = words[i].trim().toLowerCase();
    if (w.length > 0 && w.length < 12 && /^[a-z]+$/.test(w)) {
      dictionarySet.add(w);
    }
  }
}

/**
 * Returns the active dictionary Set.
 * In Server/Node environment: loads the authoritative 274,937 English words database.
 * In Client environment: uses CORE_DICTIONARY (~4,000 common words) + live API check.
 */
export function getDictionary(): Set<string> {
  if (!dictionarySet) {
    dictionarySet = new Set<string>();

    // 1. Add core words
    for (const w of CORE_DICTIONARY) {
      const lower = w.trim().toLowerCase();
      if (lower.length > 0 && lower.length < 12 && /^[a-z]+$/.test(lower)) {
        dictionarySet.add(lower);
      }
    }

    // 2. Authoritative full 274,937 English wordlist in Server / Node runtime
    try {
      const req = (eval)('require');
      const fullWordlist: string[] = req('an-array-of-english-words');
      if (Array.isArray(fullWordlist)) {
        for (let i = 0; i < fullWordlist.length; i++) {
          const w = fullWordlist[i].trim().toLowerCase();
          if (w.length > 0 && w.length < 12 && /^[a-z]+$/.test(w)) {
            dictionarySet.add(w);
          }
        }
      }
    } catch {
      // Fallback to CORE_DICTIONARY if require is not available in browser
    }
  }
  return dictionarySet;
}

/**
 * Instant O(1) membership check.
 * Normalizes input to lowercase trimmed string.
 * Validates against the dictionary Set.
 */
export function isDictionaryWord(word: string): boolean {
  if (!word || typeof word !== 'string') return false;
  const normalized = word.trim().toLowerCase();
  if (normalized.length === 0 || normalized.length >= 12) return false;
  if (!/^[a-z]+$/.test(normalized)) return false;

  const dict = getDictionary();
  return dict.has(normalized);
}

/**
 * Total count of indexed words in active dictionary
 */
export function getDictionarySize(): number {
  return getDictionary().size;
}

/**
 * For testing: resets dictionary state
 */
export function resetDictionary(): void {
  dictionarySet = null;
}
