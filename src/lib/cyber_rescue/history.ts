/** Player game history, stored only in this browser (localStorage). */

export interface HistoryEntry {
  /** Unique key per finished game/round, used to avoid duplicate saves. */
  id: string;
  mode: 'solo' | 'online';
  word: string;
  category: string;
  result: 'won' | 'lost';
  wrongGuesses: number;
  points: number;
  playedAt: number;
}

const STORAGE_KEY = 'rescue_history';
const MAX_ENTRIES = 50;

export function loadHistory(): HistoryEntry[] {
  if (typeof window === 'undefined') return [];
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

/** Saves an entry (newest first). Returns false if the same id was already saved. */
export function addHistoryEntry(entry: HistoryEntry): boolean {
  if (typeof window === 'undefined') return false;
  try {
    const list = loadHistory();
    if (list.some((e) => e.id === entry.id)) return false;
    localStorage.setItem(STORAGE_KEY, JSON.stringify([entry, ...list].slice(0, MAX_ENTRIES)));
    return true;
  } catch {
    return false;
  }
}

export function clearHistory(): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch { }
}
