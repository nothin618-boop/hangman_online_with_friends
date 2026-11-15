import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import React, { useState } from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { WordInputModal } from '@/components/WordInputModal';
import { DecoderQuiz } from '@/components/DecoderQuiz';
import { TraceLogDrawer } from '@/components/TraceLogDrawer';
import { ActiveChainsBar } from '@/components/ActiveChainsBar';
import { JuryPopupModal } from '@/components/JuryPopupModal';
import { CenterStage } from '@/components/CenterStage';
import { GhostTimeline } from '@/components/GhostTimeline';
import GhostReceiptPage from '@/app/ghost/[id]/page';
import { tokenizeSentence } from '@/lib/sentence';
import { Hop, SanitizedChain, GhostReceipt } from '@/lib/types';
import { JurySummonPayload } from '@/lib/events';
import { GhostHopDiff } from '@/lib/ghosts';

// Mock next/navigation
vi.mock('next/navigation', () => ({
  useParams: () => ({ id: 'chain-victory-999' }),
}));

// Mock next/link to render standard <a> anchor tag
vi.mock('next/link', () => ({
  default: ({ children, href, ...props }: { children: React.ReactNode; href: string; [key: string]: unknown }) => (
    <a href={href} {...props}>{children}</a>
  ),
}));

describe('Empirical UI Challenger Suite (Milestone M3)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // =========================================================================
  // 1. Word click interaction opens WordInputModal with correct initial word
  // =========================================================================
  describe('1. Word click interaction opens WordInputModal with correct initial word', () => {
    // Integrated test harness simulating CenterStage + WordInputModal wiring
    const CenterStageWordModalHarness: React.FC<{ sentence: string }> = ({ sentence }) => {
      const [selectedWordIndex, setSelectedWordIndex] = useState<number | null>(null);
      const [history, setHistory] = useState<Hop[]>([
        {
          hopNumber: 1,
          playerId: 'p-initial',
          previousSentence: 'The old rusty anchor dropped.',
          newSentence: sentence,
          oldWord: 'rusty',
          newWord: 'weathered',
          role: 'shifter',
          timestamp: Date.now() - 5000,
        },
      ]);

      const tokens = tokenizeSentence(sentence);
      const activeChain: SanitizedChain = {
        id: 'chain-flow-test',
        currentSentence: sentence,
        initialSentence: 'The old rusty anchor dropped.',
        currentHop: 2,
        lives: 3,
        status: 'active',
        leaseExpiresAt: Date.now() + 60000,
        history,
      };

      const selectedToken = selectedWordIndex !== null ? tokens[selectedWordIndex] : null;

      const handleDisguiseSubmit = async (idx: number, newWord: string) => {
        setHistory((prev) => [
          ...prev,
          {
            hopNumber: prev.length + 1,
            playerId: 'player-tester',
            previousSentence: sentence,
            newSentence: sentence.replace(tokens[idx].root, newWord),
            oldWord: tokens[idx].root,
            newWord,
            role: 'shifter',
            timestamp: Date.now(),
          },
        ]);
        return { success: true };
      };

      return (
        <div>
          <CenterStage
            activeChain={activeChain}
            role="shifter"
            secondsRemaining={50}
            isPulsing={false}
            onSelectWord={(idx) => setSelectedWordIndex(idx)}
            onReportSabotage={vi.fn()}
            onSubmitDecoderGuess={vi.fn()}
            isLoading={false}
          />

          {selectedWordIndex !== null && selectedToken && (
            <WordInputModal
              isOpen={true}
              wordIndex={selectedWordIndex}
              originalRawToken={selectedToken.raw}
              originalRootWord={selectedToken.root}
              history={history}
              initialSentence={activeChain.initialSentence}
              isSubmitting={false}
              onClose={() => setSelectedWordIndex(null)}
              onSubmit={handleDisguiseSubmit}
            />
          )}
        </div>
      );
    };

    it('clicking word block opens modal displaying matching raw token and root word', () => {
      render(<CenterStageWordModalHarness sentence="The rapid cybernetic scout departed." />);

      // Initially modal is not open
      expect(screen.queryByTestId('word-input-modal')).toBeNull();

      // Click word block #2: "cybernetic"
      const cyberneticBtn = screen.getByTestId('word-block-2');
      expect(cyberneticBtn).toBeDefined();
      fireEvent.click(cyberneticBtn);

      // Modal is now open
      expect(screen.getByTestId('word-input-modal')).toBeDefined();
      expect(screen.getByTestId('original-token-display').textContent).toContain('cybernetic (cybernetic)');

      // Abort modal
      fireEvent.click(screen.getByTestId('modal-abort-btn'));
      expect(screen.queryByTestId('word-input-modal')).toBeNull();

      // Click word block #3: "scout"
      const scoutBtn = screen.getByTestId('word-block-3');
      fireEvent.click(scoutBtn);
      expect(screen.getByTestId('word-input-modal')).toBeDefined();
      expect(screen.getByTestId('original-token-display').textContent).toContain('scout (scout)');
    });

    it('clicking word block with punctuation preserves raw token and isolates root word', () => {
      render(<CenterStageWordModalHarness sentence="Beware, silent phantom!" />);

      // Click word block #0: "Beware,"
      const bewareBtn = screen.getByTestId('word-block-0');
      fireEvent.click(bewareBtn);

      expect(screen.getByTestId('word-input-modal')).toBeDefined();
      // Raw token is "Beware," and root word is "beware"
      const display = screen.getByTestId('original-token-display').textContent;
      expect(display).toContain('Beware,');
      expect(display).toContain('(Beware)');
    });
  });

  // =========================================================================
  // 2. Validation warnings: >11 letters, digits/symbols, duplicate tokens
  // =========================================================================
  describe('2. Validation warnings: >11 letters, digits/symbols, duplicate tokens', () => {
    const history: Hop[] = [
      {
        hopNumber: 1,
        playerId: 'p1',
        previousSentence: 'The secret vault opened.',
        newSentence: 'The hidden vault opened.',
        oldWord: 'secret',
        newWord: 'hidden',
        role: 'shifter',
        timestamp: Date.now() - 10000,
      },
    ];

    it('typing >11 letters shows visible length warning and disables submit', () => {
      render(
        <WordInputModal
          isOpen={true}
          wordIndex={1}
          originalRawToken="hidden"
          originalRootWord="hidden"
          history={history}
          initialSentence="The secret vault opened."
          isSubmitting={false}
          onClose={vi.fn()}
          onSubmit={vi.fn()}
        />
      );

      const input = screen.getByTestId('disguise-word-input') as HTMLInputElement;
      const submitBtn = screen.getByTestId('modal-submit-btn');

      // 12 letters: "supernatural"
      fireEvent.change(input, { target: { value: 'supernatural' } });
      const warning = screen.getByTestId('validation-error-msg');
      expect(warning.textContent).toContain('exceeds 11 characters');
      expect(submitBtn.hasAttribute('disabled')).toBe(true);

      const counter = screen.getByTestId('char-counter');
      expect(counter.textContent).toBe('12/11 chars');
      expect(counter.className).toContain('text-cyber-red');

      // Exactly 11 letters: "subterfuge" (valid English word)
      fireEvent.change(input, { target: { value: 'subterfuge' } });
      expect(screen.queryByTestId('validation-error-msg')).toBeNull();
      expect(submitBtn.hasAttribute('disabled')).toBe(false);
      expect(screen.getByTestId('char-counter').textContent).toBe('10/11 chars');
    });

    it('typing digits, punctuation, or special symbols shows visible alphabet warning', () => {
      render(
        <WordInputModal
          isOpen={true}
          wordIndex={1}
          originalRawToken="hidden"
          originalRootWord="hidden"
          history={history}
          initialSentence="The secret vault opened."
          isSubmitting={false}
          onClose={vi.fn()}
          onSubmit={vi.fn()}
        />
      );

      const input = screen.getByTestId('disguise-word-input') as HTMLInputElement;
      const submitBtn = screen.getByTestId('modal-submit-btn');

      const invalidInputs = ['agent007', 'cyber-war', 'stealth!', 'ghost space', 'hack#1', '$$$'];
      for (const val of invalidInputs) {
        fireEvent.change(input, { target: { value: val } });
        const warning = screen.getByTestId('validation-error-msg');
        expect(warning.textContent).toContain('Letters only (A-Z). No numbers, spaces, or hyphens.');
        expect(submitBtn.hasAttribute('disabled')).toBe(true);
      }
    });

    it('typing duplicate token from hop history triggers visible repeat warning', () => {
      render(
        <WordInputModal
          isOpen={true}
          wordIndex={1}
          originalRawToken="vault"
          originalRootWord="vault"
          history={history}
          initialSentence="The secret vault opened."
          isSubmitting={false}
          onClose={vi.fn()}
          onSubmit={vi.fn()}
        />
      );

      const input = screen.getByTestId('disguise-word-input') as HTMLInputElement;
      const submitBtn = screen.getByTestId('modal-submit-btn');

      // "hidden" was already used as newWord in hop 1
      fireEvent.change(input, { target: { value: 'hidden' } });
      let warning = screen.getByTestId('validation-error-msg');
      expect(warning.textContent).toContain('previously used in chain history');
      expect(submitBtn.hasAttribute('disabled')).toBe(true);

      // Case-insensitivity check: "HIDDEN"
      fireEvent.change(input, { target: { value: 'HIDDEN' } });
      warning = screen.getByTestId('validation-error-msg');
      expect(warning.textContent).toContain('previously used in chain history');
      expect(submitBtn.hasAttribute('disabled')).toBe(true);

      // "secret" was in initialSentence
      fireEvent.change(input, { target: { value: 'secret' } });
      warning = screen.getByTestId('validation-error-msg');
      expect(warning.textContent).toContain('previously used in chain history');
      expect(submitBtn.hasAttribute('disabled')).toBe(true);
    });
  });

  // =========================================================================
  // 3. DecoderQuiz: Hotkeys 1-4 select candidate themes
  // =========================================================================
  describe('3. DecoderQuiz: Hotkeys 1-4 select candidate themes', () => {
    const themeOptions = [
      'deep-sea-trench',
      'orbital-station',
      'quantum-cryptography',
      'ancient-pyramids',
    ];

    it('pressing hotkeys 1, 2, 3, 4 selects corresponding theme', () => {
      const mockSubmit = vi.fn();
      render(
        <DecoderQuiz
          themeOptions={themeOptions}
          isSubmitting={false}
          onSubmitGuess={mockSubmit}
        />
      );

      const opt0 = screen.getByTestId('decoder-option-0');
      const opt1 = screen.getByTestId('decoder-option-1');
      const opt2 = screen.getByTestId('decoder-option-2');
      const opt3 = screen.getByTestId('decoder-option-3');
      const submitBtn = screen.getByTestId('decoder-submit-btn');

      expect(submitBtn.hasAttribute('disabled')).toBe(true);

      // Press '2' -> orbital-station
      fireEvent.keyDown(window, { key: '2' });
      expect(opt1.getAttribute('data-selected')).toBe('true');
      expect(opt0.getAttribute('data-selected')).toBe('false');
      expect(submitBtn.hasAttribute('disabled')).toBe(false);

      // Press '4' -> ancient-pyramids
      fireEvent.keyDown(window, { key: '4' });
      expect(opt3.getAttribute('data-selected')).toBe('true');
      expect(opt1.getAttribute('data-selected')).toBe('false');

      // Press '1' -> deep-sea-trench
      fireEvent.keyDown(window, { key: '1' });
      expect(opt0.getAttribute('data-selected')).toBe('true');
      expect(opt3.getAttribute('data-selected')).toBe('false');

      // Press '3' -> quantum-cryptography
      fireEvent.keyDown(window, { key: '3' });
      expect(opt2.getAttribute('data-selected')).toBe('true');
      expect(opt0.getAttribute('data-selected')).toBe('false');

      // Submit
      fireEvent.click(submitBtn);
      expect(mockSubmit).toHaveBeenCalledWith('quantum-cryptography');
    });

    it('ignores invalid keys such as 0, 5, letters, and does not alter selection', () => {
      render(
        <DecoderQuiz
          themeOptions={themeOptions}
          isSubmitting={false}
          onSubmitGuess={vi.fn()}
        />
      );

      // Select option 1 via key '2'
      fireEvent.keyDown(window, { key: '2' });
      expect(screen.getByTestId('decoder-option-1').getAttribute('data-selected')).toBe('true');

      // Press invalid keys: '0', '5', '9', 'a', 'Escape', 'Enter'
      for (const k of ['0', '5', '9', 'a', 'Escape', 'Enter']) {
        fireEvent.keyDown(window, { key: k });
        expect(screen.getByTestId('decoder-option-1').getAttribute('data-selected')).toBe('true');
      }
    });

    it('does not respond to hotkeys when isSubmitting is true', () => {
      render(
        <DecoderQuiz
          themeOptions={themeOptions}
          isSubmitting={true}
          onSubmitGuess={vi.fn()}
        />
      );

      fireEvent.keyDown(window, { key: '1' });
      expect(screen.getByTestId('decoder-option-0').getAttribute('data-selected')).toBe('false');
    });
  });

  // =========================================================================
  // 4. TraceLogDrawer: Toggling drawer opens/closes and renders last 3 hops
  // =========================================================================
  describe('4. TraceLogDrawer: Toggling drawer opens/closes and renders last 3 hops', () => {
    const hops: Hop[] = [
      {
        hopNumber: 1,
        playerId: 'p1',
        playerAlias: 'Agent-1',
        previousSentence: 'Sent 1',
        newSentence: 'Sent 2',
        oldWord: 'w1',
        newWord: 'w2',
        role: 'shifter',
        timestamp: 1000,
      },
      {
        hopNumber: 2,
        playerId: 'p2',
        playerAlias: 'Agent-2',
        previousSentence: 'Sent 2',
        newSentence: 'Sent 3',
        oldWord: 'w2',
        newWord: 'w3',
        role: 'shifter',
        isRevoked: true,
        timestamp: 2000,
      },
      {
        hopNumber: 3,
        playerId: 'p3',
        playerAlias: 'Agent-3',
        previousSentence: 'Sent 3',
        newSentence: 'Sent 4',
        oldWord: 'w3',
        newWord: 'w4',
        role: 'shifter',
        isTrapHit: true,
        timestamp: 3000,
      },
      {
        hopNumber: 4,
        playerId: 'p4',
        playerAlias: 'Decoder-4',
        previousSentence: 'Sent 4',
        newSentence: 'Sent 4',
        role: 'decoder',
        decoderGuess: 'cyber-heist',
        isCorrectGuess: true,
        timestamp: 4000,
      },
    ];

    it('toggles open/close on header click and slices exactly the last 3 hops', () => {
      render(<TraceLogDrawer traceLog={hops} />);

      // Initially closed
      expect(screen.queryByTestId('trace-log-content')).toBeNull();

      // Open drawer
      fireEvent.click(screen.getByTestId('trace-log-toggle-btn'));
      expect(screen.getByTestId('trace-log-content')).toBeDefined();

      // Should only render the last 3 hops (hops 2, 3, 4)
      expect(screen.queryByTestId('trace-hop-1')).toBeNull();
      expect(screen.getByTestId('trace-hop-2')).toBeDefined();
      expect(screen.getByTestId('trace-hop-3')).toBeDefined();
      expect(screen.getByTestId('trace-hop-4')).toBeDefined();

      // Hop 2 revoked badge
      expect(screen.getByText('JURY REVOKED')).toBeDefined();

      // Hop 3 trap badge
      expect(screen.getByText('TRAP HIT (-1 BAR)')).toBeDefined();

      // Hop 4 decoder bonus badge
      expect(screen.getByText('+10 BONUS HOPS')).toBeDefined();

      // Close drawer
      fireEvent.click(screen.getByTestId('trace-log-toggle-btn'));
      expect(screen.queryByTestId('trace-log-content')).toBeNull();
    });

    it('returns null if traceLog is empty', () => {
      const { container } = render(<TraceLogDrawer traceLog={[]} />);
      expect(container.firstChild).toBeNull();
    });
  });

  // =========================================================================
  // 5. ActiveChainsBar: Renders cards with live status
  // =========================================================================
  describe('5. ActiveChainsBar: Renders cards with live status', () => {
    const monitoredChains = [
      {
        chainId: 'chain-live-1111',
        currentHop: 14,
        lives: 3,
        status: 'active' as const,
        role: 'shifter' as const,
        lastUpdated: Date.now(),
      },
      {
        chainId: 'chain-won-2222',
        currentHop: 100,
        lives: 2,
        status: 'victory' as const,
        role: 'decoder' as const,
        lastUpdated: Date.now(),
      },
      {
        chainId: 'chain-dead-3333',
        currentHop: 7,
        lives: 0,
        status: 'destroyed' as const,
        role: 'shifter' as const,
        lastUpdated: Date.now(),
      },
    ];

    it('renders cards with active, victory, and destroyed states and proper ghost permalinks', () => {
      render(<ActiveChainsBar chains={monitoredChains} />);

      expect(screen.getByTestId('monitored-chains-count').textContent).toContain('3 TRACKED');

      // Live card 1: Active
      const card1 = screen.getByTestId('chain-card-chain-live-1111');
      expect(card1.textContent).toContain('ACTIVE');
      expect(card1.textContent).toContain('14/100');
      expect(card1.textContent).toContain('3/3');
      expect(screen.queryByTestId('ghost-link-chain-live-1111')).toBeNull();

      // Live card 2: Victory
      const card2 = screen.getByTestId('chain-card-chain-won-2222');
      expect(card2.textContent).toContain('VICTORY');
      expect(card2.textContent).toContain('100/100');
      const ghostLink2 = screen.getByTestId('ghost-link-chain-won-2222');
      expect(ghostLink2.getAttribute('href')).toBe('/ghost/chain-won-2222');

      // Live card 3: Destroyed
      const card3 = screen.getByTestId('chain-card-chain-dead-3333');
      expect(card3.textContent).toContain('DESTROYED');
      expect(card3.textContent).toContain('0/3');
      const ghostLink3 = screen.getByTestId('ghost-link-chain-dead-3333');
      expect(ghostLink3.getAttribute('href')).toBe('/ghost/chain-dead-3333');
    });

    it('renders null when chains array is empty', () => {
      const { container } = render(<ActiveChainsBar chains={[]} />);
      expect(container.firstChild).toBeNull();
    });
  });

  // =========================================================================
  // 6. JuryPopupModal: Sentence diff with flagged word highlighted
  // =========================================================================
  describe('6. JuryPopupModal: Sentence diff with flagged word highlighted', () => {
    const juryCase: JurySummonPayload = {
      caseId: 'summons-case-777',
      chainId: 'chain-alpha-99',
      flaggedWord: 'glitch',
      previousSentence: 'The stealth operative breached the mainframe.',
      newSentence: 'The stealth operative glitch the mainframe.',
      deadline: Date.now() + 20000,
    };

    it('highlights the flagged word inside mutated sentence and processes vote submissions', () => {
      const mockVote = vi.fn();
      const mockDismiss = vi.fn();

      render(
        <JuryPopupModal
          juryCase={juryCase}
          onVote={mockVote}
          onDismiss={mockDismiss}
        />
      );

      // Verify before sentence
      expect(screen.getByTestId('jury-before-sentence').textContent).toContain('stealth operative breached');

      // Verify mutated sentence and highlighted flagged word
      const mutatedEl = screen.getByTestId('jury-mutated-sentence');
      expect(mutatedEl.textContent).toContain('glitch');
      const highlighted = mutatedEl.querySelector('.bg-cyber-red\\/20');
      expect(highlighted).toBeDefined();
      expect(highlighted?.textContent).toContain('glitch');

      // Vote Sabotage
      fireEvent.click(screen.getByTestId('jury-vote-sabotage-btn'));
      expect(mockVote).toHaveBeenCalledWith('summons-case-777', true);

      // Vote Legitimate
      fireEvent.click(screen.getByTestId('jury-vote-legitimate-btn'));
      expect(mockVote).toHaveBeenCalledWith('summons-case-777', false);
    });

    it('counts down and auto-dismisses when timer reaches 0', () => {
      vi.useFakeTimers();
      const mockDismiss = vi.fn();

      render(
        <JuryPopupModal
          juryCase={juryCase}
          onVote={vi.fn()}
          onDismiss={mockDismiss}
        />
      );

      expect(screen.getByTestId('jury-countdown').textContent).toBe('20s');

      // Fast forward 10 seconds
      act(() => {
        vi.advanceTimersByTime(10000);
      });
      expect(screen.getByTestId('jury-countdown').textContent).toBe('10s');

      // Fast forward remaining 10 seconds
      act(() => {
        vi.advanceTimersByTime(10000);
      });
      expect(mockDismiss).toHaveBeenCalledTimes(1);

      vi.useRealTimers();
    });
  });

  // =========================================================================
  // 7. /ghost/:id: Chronological timeline diffs and copy receipt permalink
  // =========================================================================
  describe('7. /ghost/:id: Chronological timeline diffs and copy receipt permalink', () => {
    const mockReceipt: GhostReceipt = {
      chainId: 'chain-victory-999',
      outcome: 'victory',
      themeTitle: 'deep-sea-trench',
      finalHop: 100,
      totalContributors: 12,
      initialSentence: 'The deep submarine submerged into darkness.',
      finalSentence: 'The abyss probe explored the underwater void.',
      completedAt: 1715000000000,
    };

    const mockDiffs: GhostHopDiff[] = [
      {
        hopNumber: 1,
        playerId: 'p1',
        playerAlias: 'Nautilus-1',
        role: 'shifter',
        previousSentence: 'The deep submarine submerged into darkness.',
        newSentence: 'The deep probe submerged into darkness.',
        oldWord: 'submarine',
        newWord: 'probe',
        timestamp: 1715000010000,
      },
      {
        hopNumber: 10,
        playerId: 'p2',
        playerAlias: 'Sonar-2',
        role: 'decoder',
        decoderGuess: 'deep-sea-trench',
        isCorrectGuess: true,
        previousSentence: 'The deep probe submerged into darkness.',
        newSentence: 'The deep probe submerged into darkness.',
        timestamp: 1715000100000,
      },
      {
        hopNumber: 100,
        playerId: 'p3',
        playerAlias: 'Abyss-3',
        role: 'shifter',
        previousSentence: 'The abyss probe explored the underwater realm.',
        newSentence: 'The abyss probe explored the underwater void.',
        oldWord: 'realm',
        newWord: 'void',
        timestamp: 1715001000000,
      },
    ];

    it('renders victory receipt, timeline diffs, and permalink copy interaction', async () => {
      // Mock fetch
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          success: true,
          receipt: mockReceipt,
          diffs: mockDiffs,
        }),
      } as Response);

      // Mock navigator.clipboard
      const writeTextMock = vi.fn().mockResolvedValue(undefined);
      Object.assign(navigator, {
        clipboard: {
          writeText: writeTextMock,
        },
      });

      render(<GhostReceiptPage />);

      // Initially shows loading
      expect(screen.getByTestId('ghost-loading')).toBeDefined();

      // Wait for fetch resolution
      await waitFor(() => {
        expect(screen.getByTestId('ghost-receipt-page')).toBeDefined();
      });

      // Header verification
      expect(screen.getByTestId('receipt-chain-id').textContent).toContain('CHAIN #chain-victory-999');
      expect(screen.getByTestId('outcome-victory-badge')).toBeDefined();
      expect(screen.getByText('100-HOP VICTORY')).toBeDefined();

      // Sentences
      expect(screen.getByTestId('receipt-initial-sentence').textContent).toBe(mockReceipt.initialSentence);
      expect(screen.getByTestId('receipt-final-sentence').textContent).toBe(mockReceipt.finalSentence);

      // Timeline hops
      expect(screen.getByTestId('ghost-timeline-hop-1')).toBeDefined();
      expect(screen.getByTestId('ghost-timeline-hop-10')).toBeDefined();
      expect(screen.getByTestId('ghost-timeline-hop-100')).toBeDefined();
      expect(screen.getByText('Nautilus-1')).toBeDefined();
      expect(screen.getByText('submarine')).toBeDefined();
      expect(screen.getByText('probe')).toBeDefined();
      expect(screen.getByText('+10 BONUS HOPS')).toBeDefined();

      // Copy permalink button
      const copyBtn = screen.getByTestId('copy-permalink-btn');
      expect(copyBtn.textContent).toContain('SHARE GHOST RECEIPT');

      fireEvent.click(copyBtn);
      expect(writeTextMock).toHaveBeenCalled();
      expect(copyBtn.textContent).toContain('LINK COPIED');
    });

    it('renders destroyed badge when outcome is destroyed', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          success: true,
          receipt: {
            ...mockReceipt,
            outcome: 'destroyed',
            finalHop: 14,
          },
          diffs: mockDiffs.slice(0, 1),
        }),
      } as Response);

      render(<GhostReceiptPage />);

      await waitFor(() => {
        expect(screen.getByTestId('outcome-destroyed-badge')).toBeDefined();
      });
      expect(screen.getByText('SIGNAL COLLAPSE (DESTROYED)')).toBeDefined();
    });

    it('renders error page when API returns failure or chain not found', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        json: async () => ({
          success: false,
          message: 'Ghost receipt not found.',
        }),
      } as Response);

      render(<GhostReceiptPage />);

      await waitFor(() => {
        expect(screen.getByTestId('ghost-not-found')).toBeDefined();
      });
      expect(screen.getByText('RECORD EXPUNGED OR MISSING')).toBeDefined();
    });
  });
});
