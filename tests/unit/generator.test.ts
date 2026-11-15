import { describe, it, expect } from 'vitest';
import { generateTheme, generateThemesBatch, GENERATOR_DOMAINS } from '@/lib/generator';

describe('Algorithmic Theme Generator (generator.ts)', () => {
  it('guarantees 100% determinism for identical seeds', () => {
    const themeA = generateTheme(42);
    const themeB = generateTheme(42);
    expect(themeA).toEqual(themeB);

    const themeC = generateTheme(999);
    const themeD = generateTheme(999);
    expect(themeC).toEqual(themeD);
  });

  it('generates 1,000 distinct themes with zero duplicate IDs', () => {
    const totalCount = 1000;
    const batch = generateThemesBatch(0, totalCount);

    expect(batch).toHaveLength(totalCount);

    const ids = new Set(batch.map(t => t.id));
    expect(ids.size).toBe(totalCount);
  });

  it('generates fully compliant themes across all 1,000 seeds', () => {
    const batch = generateThemesBatch(0, 1000);

    batch.forEach(theme => {
      // 1. Structure
      expect(theme.id).toMatch(/^gen-\d+$/);
      expect(theme.theme.length).toBeGreaterThan(0);
      expect(theme.category.length).toBeGreaterThan(0);

      // 2. Traps
      expect(theme.bannedWords).toHaveLength(5);
      const uniqueTraps = new Set(theme.bannedWords);
      expect(uniqueTraps.size).toBe(5);
      theme.bannedWords.forEach(w => {
        expect(w).toMatch(/^[a-z]+$/);
        expect(w.length).toBeLessThan(12);
      });

      // 3. Decoys
      expect(theme.decoyThemes).toHaveLength(3);
      const uniqueDecoys = new Set(theme.decoyThemes);
      expect(uniqueDecoys.size).toBe(3);
      theme.decoyThemes.forEach(d => {
        expect(d).not.toBe(theme.theme);
      });

      // 4. Initial Sentence
      expect(theme.initialSentence.startsWith('The ')).toBe(true);
      expect(theme.initialSentence.endsWith('.')).toBe(true);

      const tokens = theme.initialSentence
        .split(/\s+/)
        .map(w => w.replace(/^[^a-zA-Z]+|[^a-zA-Z]+$/g, ''))
        .filter(Boolean);

      expect(tokens.length).toBeGreaterThanOrEqual(7);
      expect(tokens.length).toBeLessThanOrEqual(12);

      tokens.forEach(tok => {
        expect(tok).toMatch(/^[a-zA-Z]+$/);
        expect(tok.length).toBeLessThan(12);
      });
    });
  });

  it('demonstrates balanced distribution across all 12 domains in 1,000 generations', () => {
    const batch = generateThemesBatch(0, 1000);
    const domainCounts: Record<string, number> = {};

    batch.forEach(t => {
      domainCounts[t.category] = (domainCounts[t.category] || 0) + 1;
    });

    // All categories represented
    const categories = Array.from(new Set(GENERATOR_DOMAINS.map(d => d.category)));
    categories.forEach(cat => {
      expect(domainCounts[cat], `Category ${cat} must be represented`).toBeGreaterThan(30);
    });
  });

  it('handles negative or large seed indices cleanly via unsigned normalization', () => {
    const themeNeg = generateTheme(-1);
    expect(themeNeg.id).toBe('gen-4294967295');
    expect(themeNeg.initialSentence).toBeDefined();
  });
});
