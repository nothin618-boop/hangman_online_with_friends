import { describe, it, expect } from 'vitest';
import { HANDCRAFTED_THEMES, getHandcraftedThemeById, getRandomHandcraftedTheme } from '@/lib/prompts';

describe('HANDCRAFTED_THEMES Catalog (50 Handcrafted Themes)', () => {
  it('contains exactly 50 handcrafted theme templates', () => {
    expect(HANDCRAFTED_THEMES).toHaveLength(50);
  });

  it('guarantees unique IDs across all 50 themes', () => {
    const ids = HANDCRAFTED_THEMES.map(t => t.id);
    const uniqueIds = new Set(ids);
    expect(uniqueIds.size).toBe(50);
  });

  it('guarantees unique theme display titles across all 50 themes', () => {
    const titles = HANDCRAFTED_THEMES.map(t => t.theme);
    const uniqueTitles = new Set(titles);
    expect(uniqueTitles.size).toBe(50);
  });

  it('enforces exactly 5 banned trap words per theme, with pure letters and length < 12', () => {
    HANDCRAFTED_THEMES.forEach(t => {
      expect(t.bannedWords, `Theme ${t.id} must have exactly 5 banned words`).toHaveLength(5);
      
      const uniqueTraps = new Set(t.bannedWords);
      expect(uniqueTraps.size, `Theme ${t.id} has duplicate trap words`).toBe(5);

      t.bannedWords.forEach(word => {
        expect(word, `Trap "${word}" in ${t.id} must be lowercase`).toBe(word.toLowerCase());
        expect(word, `Trap "${word}" in ${t.id} must match /^[a-z]+$/`).toMatch(/^[a-z]+$/);
        expect(word.length, `Trap "${word}" in ${t.id} must be < 12 characters`).toBeLessThan(12);
        expect(word.length, `Trap "${word}" in ${t.id} must be >= 1 character`).toBeGreaterThanOrEqual(1);
      });
    });
  });

  it('enforces exactly 3 decoy themes per theme, distinct from theme title', () => {
    HANDCRAFTED_THEMES.forEach(t => {
      expect(t.decoyThemes, `Theme ${t.id} must have 3 decoys`).toHaveLength(3);
      
      const uniqueDecoys = new Set(t.decoyThemes);
      expect(uniqueDecoys.size, `Theme ${t.id} has duplicate decoys`).toBe(3);

      t.decoyThemes.forEach(decoy => {
        expect(decoy.trim().length, `Theme ${t.id} has empty decoy`).toBeGreaterThan(0);
        expect(decoy.toLowerCase(), `Theme ${t.id} decoy cannot match theme title`).not.toBe(t.theme.toLowerCase());
      });
    });
  });

  it('enforces grammatical initial sentences with 7-12 words and all tokens < 12 characters', () => {
    HANDCRAFTED_THEMES.forEach(t => {
      expect(t.initialSentence.endsWith('.'), `Sentence in ${t.id} must end with a period`).toBe(true);

      const words = t.initialSentence
        .split(/\s+/)
        .map(w => w.replace(/^[^a-zA-Z]+|[^a-zA-Z]+$/g, ''))
        .filter(Boolean);

      expect(words.length, `Sentence in ${t.id} must have 7-12 words`).toBeGreaterThanOrEqual(7);
      expect(words.length, `Sentence in ${t.id} must have 7-12 words`).toBeLessThanOrEqual(12);

      words.forEach(token => {
        expect(token, `Token "${token}" in ${t.id} must match /^[a-zA-Z]+$/`).toMatch(/^[a-zA-Z]+$/);
        expect(token.length, `Token "${token}" in ${t.id} must be < 12 chars`).toBeLessThan(12);
      });
    });
  });

  it('correctly resolves themes by id and returns random themes', () => {
    const coldWar = getHandcraftedThemeById('cold-war-espionage');
    expect(coldWar).toBeDefined();
    expect(coldWar?.theme).toBe('Cold War Espionage');

    const nonexistent = getHandcraftedThemeById('invalid-theme-xyz');
    expect(nonexistent).toBeUndefined();

    const random = getRandomHandcraftedTheme();
    expect(random).toBeDefined();
    expect(HANDCRAFTED_THEMES).toContainEqual(random);
  });
});
