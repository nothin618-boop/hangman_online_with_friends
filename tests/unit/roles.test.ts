import { describe, it, expect } from 'vitest';
import { determinePlayerRole, getHopsUntilNextDecoder } from '@/lib/roles';
import { Chain, Hop } from '@/lib/types';

describe('Dynamic Role Scheduler (roles.ts)', () => {
  function makeMockChain(currentHop: number, lastRole: 'shifter' | 'decoder' = 'shifter'): Pick<Chain, 'currentHop' | 'history'> {
    const history: Hop[] = [];
    if (currentHop > 0) {
      for (let i = 1; i <= currentHop; i++) {
        history.push({
          hopNumber: i,
          playerId: `p-${i}`,
          previousSentence: 'Sentence',
          newSentence: 'Sentence',
          role: i === currentHop ? lastRole : 'shifter',
          timestamp: Date.now()
        });
      }
    }
    return { currentHop, history };
  }

  it('guarantees Hop 0 is ALWAYS Shifter', () => {
    const chainHop0 = makeMockChain(0);
    expect(determinePlayerRole(chainHop0)).toBe('shifter');
    expect(determinePlayerRole({ currentHop: 0, history: [] })).toBe('shifter');
  });

  it('schedules Shifter for hops 1 through 9', () => {
    for (let hop = 1; hop <= 9; hop++) {
      const chain = makeMockChain(hop);
      expect(determinePlayerRole(chain), `Hop ${hop} must be shifter`).toBe('shifter');
    }
  });

  it('schedules Decoder on Hop 10', () => {
    const chainHop10 = makeMockChain(10, 'shifter');
    expect(determinePlayerRole(chainHop10)).toBe('decoder');
  });

  it('schedules Shifter for hops 11 through 19', () => {
    for (let hop = 11; hop <= 19; hop++) {
      const chain = makeMockChain(hop, 'shifter');
      expect(determinePlayerRole(chain), `Hop ${hop} must be shifter`).toBe('shifter');
    }
  });

  it('schedules Decoder on Decennial milestones (20, 30, 40, ..., 100)', () => {
    const decennials = [20, 30, 40, 50, 60, 70, 80, 90, 100];
    decennials.forEach(hop => {
      const chain = makeMockChain(hop, 'shifter');
      expect(determinePlayerRole(chain), `Hop ${hop} must be decoder`).toBe('decoder');
    });
  });

  it('CRITICAL GUARD: Prevents consecutive Decoders when bonus hops jump forward', () => {
    // If Hop 10 was Decoder and won +10 bonus hops, next hop could evaluate to currentHop = 20
    const chainAfterBonus: Pick<Chain, 'currentHop' | 'history'> = {
      currentHop: 20,
      history: [
        {
          hopNumber: 10,
          playerId: 'decoder-hero',
          previousSentence: 'Sentence',
          newSentence: 'Sentence',
          role: 'decoder',
          isCorrectGuess: true,
          timestamp: Date.now()
        }
      ]
    };
    // Must NOT assign Decoder on immediate next turn!
    expect(determinePlayerRole(chainAfterBonus)).toBe('shifter');
  });

  it('correctly calculates remaining hops until next Decoder milestone', () => {
    expect(getHopsUntilNextDecoder(0)).toBe(10);
    expect(getHopsUntilNextDecoder(1)).toBe(9);
    expect(getHopsUntilNextDecoder(7)).toBe(3);
    expect(getHopsUntilNextDecoder(10)).toBe(0);
    expect(getHopsUntilNextDecoder(11)).toBe(9);
    expect(getHopsUntilNextDecoder(20)).toBe(0);
  });
});
