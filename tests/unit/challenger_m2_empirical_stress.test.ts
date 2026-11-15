import { describe, it, expect, beforeEach } from 'vitest';
import { MemoryWhisperStore } from '@/lib/store';
import { QueueEngine } from '@/lib/queue';
import { reportSabotage, voteJury, isTroll, createTrollSandboxChain } from '@/lib/jury';
import { archiveToHallOfGhosts, getGhostReceipt } from '@/lib/ghosts';
import { createChainFromTemplate } from '@/lib/spawner';
import { HANDCRAFTED_THEMES } from '@/lib/prompts';
import { Chain, Hop } from '@/lib/types';

describe('Adversarial Empirical Challenge Suite — Milestone M2 (challenger_m2_remed_2)', () => {
  let store: MemoryWhisperStore;
  let queue: QueueEngine;

  beforeEach(async () => {
    store = MemoryWhisperStore.getInstance();
    await store.clear();
    QueueEngine.clearInFlight();
    queue = new QueueEngine(store);
  });

  describe('1. Targeted 1-Hop Rewind & Moderation Invariant Verification', () => {
    it('accurately targets flagged hop in multi-hop chain without corrupting prior history or banning non-trolls', async () => {
      const template = HANDCRAFTED_THEMES[0];
      const chain = createChainFromTemplate(template);
      await store.saveChain(chain);

      // Hop 1: Honest player
      await queue.interceptChain('honest-player-1', 1000);
      const hop1Res = await queue.submitMutation(chain.id, 'honest-player-1', 1, 'agent', 2000);
      expect(hop1Res.success).toBe(true);
      const sentenceAfterHop1 = hop1Res.chain!.currentSentence;

      // Hop 2: Troll operative introduces sabotage word
      await queue.interceptChain('malicious-troll', 3000);
      const hop2Res = await queue.submitMutation(chain.id, 'malicious-troll', 2, 'saboteur', 4000);
      expect(hop2Res.success).toBe(true);

      // Hop 2 is reported to jury
      const juryCase = await queue.reportSabotage(chain.id, 'vigilant-reporter');
      expect(juryCase.flaggedHop.hopNumber).toBe(2);
      expect(juryCase.flaggedHop.playerId).toBe('malicious-troll');
      expect(juryCase.flaggedHop.previousSentence).toBe(sentenceAfterHop1);

      // Hop 3: Interleaved honest player mutates chain while jury deliberates
      await queue.interceptChain('honest-player-2', 5000);
      const hop3Res = await queue.submitMutation(chain.id, 'honest-player-2', 3, 'infiltrated', 6000);
      expect(hop3Res.success).toBe(true);

      // Verify chain has 3 hops before jury votes
      const chainBeforeVote = await store.getChain(chain.id);
      expect(chainBeforeVote?.currentHop).toBe(3);
      expect(chainBeforeVote?.history.length).toBe(3);

      // Jury votes: 2 Yes votes reach consensus sabotage
      const vote1 = await queue.voteJury(juryCase.id, 'juror-alpha', true);
      expect(vote1.resolved).toBe(false);

      const vote2 = await queue.voteJury(juryCase.id, 'juror-beta', true);
      expect(vote2.resolved).toBe(true);
      expect(vote2.verdict).toBe('sabotage');
      expect(vote2.chainRewound).toBe(true);
      expect(vote2.trollShadowBanned).toBe(true);

      // Empirical Check A: Flagged hop on JuryCase has isRevoked === true
      const finalCase = await store.getJuryCase(juryCase.id);
      expect(finalCase?.status).toBe('consensus_sabotage');
      expect(finalCase?.flaggedHop.isRevoked).toBe(true);

      // Empirical Check B: Chain rewound to Hop 1 state (sentence before Hop 2)
      const rewoundChain = await store.getChain(chain.id);
      expect(rewoundChain?.currentHop).toBe(1);
      expect(rewoundChain?.currentSentence).toBe(sentenceAfterHop1);
      expect(rewoundChain?.history.length).toBe(1);
      expect(rewoundChain?.history[0].playerId).toBe('honest-player-1');

      // Empirical Check C: Reported troll is shadow-banned
      const isTrollBanned = await store.isPlayerShadowBanned('malicious-troll');
      expect(isTrollBanned).toBe(true);

      // Empirical Check D: Honest players are NOT shadow-banned
      const isHonest1Banned = await store.isPlayerShadowBanned('honest-player-1');
      const isHonest2Banned = await store.isPlayerShadowBanned('honest-player-2');
      const isReporterBanned = await store.isPlayerShadowBanned('vigilant-reporter');
      expect(isHonest1Banned).toBe(false);
      expect(isHonest2Banned).toBe(false);
      expect(isReporterBanned).toBe(false);
    });

    it('rejects self-voting from reporter and author', async () => {
      const template = HANDCRAFTED_THEMES[1];
      const chain = createChainFromTemplate(template);
      await store.saveChain(chain);

      await queue.interceptChain('author-user', 1000);
      await queue.submitMutation(chain.id, 'author-user', 1, 'invader', 2000);

      const juryCase = await queue.reportSabotage(chain.id, 'reporter-user');

      // Reporter tries to vote
      await expect(
        queue.voteJury(juryCase.id, 'reporter-user', true)
      ).rejects.toThrow('Reporter and author cannot vote on their own jury case');

      // Author tries to vote
      await expect(
        queue.voteJury(juryCase.id, 'author-user', false)
      ).rejects.toThrow('Reporter and author cannot vote on their own jury case');
    });

    it('concurrent juror votes execute safely without race conditions or lost votes', async () => {
      const template = HANDCRAFTED_THEMES[2];
      const chain = createChainFromTemplate(template);
      await store.saveChain(chain);

      await queue.interceptChain('troll-x', 1000);
      await queue.submitMutation(chain.id, 'troll-x', 1, 'corrupt', 2000);

      const juryCase = await queue.reportSabotage(chain.id, 'sentinel-x');

      // 3 jurors vote concurrently
      const results = await Promise.allSettled([
        queue.voteJury(juryCase.id, 'peer-1', true),
        queue.voteJury(juryCase.id, 'peer-2', true),
        queue.voteJury(juryCase.id, 'peer-3', false),
      ]);

      const fulfilled = results.filter(r => r.status === 'fulfilled');
      expect(fulfilled.length).toBeGreaterThanOrEqual(2);

      const finalCase = await store.getJuryCase(juryCase.id);
      expect(finalCase?.status).toBe('consensus_sabotage');
      expect(finalCase?.flaggedHop.isRevoked).toBe(true);
      expect(await store.isPlayerShadowBanned('troll-x')).toBe(true);
    });
  });

  describe('2. Concurrency Race & In-Flight Double-Submit Protection', () => {
    it('strictly permits exactly 1 success out of 5 racing concurrent shifter submissions', async () => {
      const template = HANDCRAFTED_THEMES[3];
      const chain = createChainFromTemplate(template);
      await store.saveChain(chain);

      await queue.interceptChain('speed-shifter', 1000);

      const submissions = await Promise.all([
        queue.submitMutation(chain.id, 'speed-shifter', 1, 'sentinel', 2000),
        queue.submitMutation(chain.id, 'speed-shifter', 1, 'whisper', 2000),
        queue.submitMutation(chain.id, 'speed-shifter', 1, 'network', 2000),
        queue.submitMutation(chain.id, 'speed-shifter', 1, 'shadow', 2000),
        queue.submitMutation(chain.id, 'speed-shifter', 1, 'patrol', 2000),
      ]);

      const successes = submissions.filter(s => s.success);
      const failures = submissions.filter(s => !s.success);

      expect(successes.length).toBe(1);
      expect(failures.length).toBe(4);
      failures.forEach(f => {
        expect(f.error).toBe('INVALID_LEASE_HOLDER');
      });

      const updatedChain = await store.getChain(chain.id);
      expect(updatedChain?.currentHop).toBe(1);
      expect(updatedChain?.history.length).toBe(1);
    });

    it('strictly permits exactly 1 success out of 5 racing concurrent decoder guesses', async () => {
      const template = HANDCRAFTED_THEMES[4];
      const chain = createChainFromTemplate(template);
      chain.currentHop = 10;
      await store.saveChain(chain);

      await queue.interceptChain('speed-decoder', 1000);

      const guesses = await Promise.all([
        queue.submitDecoderGuess(chain.id, 'speed-decoder', chain.secretTheme, 2000),
        queue.submitDecoderGuess(chain.id, 'speed-decoder', chain.secretTheme, 2000),
        queue.submitDecoderGuess(chain.id, 'speed-decoder', chain.secretTheme, 2000),
        queue.submitDecoderGuess(chain.id, 'speed-decoder', chain.secretTheme, 2000),
        queue.submitDecoderGuess(chain.id, 'speed-decoder', chain.secretTheme, 2000),
      ]);

      const successes = guesses.filter(g => g.success);
      const failures = guesses.filter(g => !g.success);

      expect(successes.length).toBe(1);
      expect(failures.length).toBe(4);
      failures.forEach(f => {
        expect(f.error).toBe('INVALID_LEASE_HOLDER');
      });

      const updatedChain = await store.getChain(chain.id);
      expect(updatedChain?.bonusHops).toBe(10);
      expect(await store.getPlayerStreak('speed-decoder')).toBe(3);
    });
  });

  describe('3. Hall of Ghosts 100-Hop Victory & 0-Lives Destruction Archival', () => {
    it('archives chain to Hall of Ghosts upon reaching 100 hops via Shifter mutation', async () => {
      const template = HANDCRAFTED_THEMES[5];
      const chain = createChainFromTemplate(template);
      chain.currentHop = 99;
      chain.lives = 3;
      await store.saveChain(chain);

      await queue.interceptChain('finishing-shifter', 1000);
      const res = await queue.submitMutation(chain.id, 'finishing-shifter', 1, 'sentinel', 2000);

      expect(res.success).toBe(true);
      expect(res.isVictory).toBe(true);
      expect(res.chain?.status).toBe('victory');

      const receipt = await queue.getGhostReceipt(chain.id);
      expect(receipt).not.toBeNull();
      expect(receipt?.chainId).toBe(chain.id);
      expect(receipt?.outcome).toBe('victory');
      expect(receipt?.finalHop).toBe(100);
      expect(receipt?.themeTitle).toBe(chain.secretTheme);
    });

    it('archives chain to Hall of Ghosts upon reaching 100 effective hops via Decoder +10 leap', async () => {
      const template = HANDCRAFTED_THEMES[6];
      const chain = createChainFromTemplate(template);
      chain.currentHop = 89;
      chain.lives = 3;
      await store.saveChain(chain);

      await queue.interceptChain('master-decoder', 1000);
      const res = await queue.submitDecoderGuess(chain.id, 'master-decoder', chain.secretTheme, 2000);

      expect(res.success).toBe(true);
      expect(res.isVictory).toBe(true);
      expect(res.chain?.status).toBe('victory');

      const receipt = await queue.getGhostReceipt(chain.id);
      expect(receipt).not.toBeNull();
      expect(receipt?.outcome).toBe('victory');
      expect(receipt?.finalHop).toBe(100);
    });

    it('archives chain to Hall of Ghosts upon hitting trap word at 1 life remaining', async () => {
      const template = HANDCRAFTED_THEMES[7];
      const chain = createChainFromTemplate(template);
      chain.lives = 1;
      chain.currentHop = 5;
      await store.saveChain(chain);

      await queue.interceptChain('unlucky-shifter', 1000);
      const trapWord = chain.bannedWords[0];
      const res = await queue.submitMutation(chain.id, 'unlucky-shifter', 1, trapWord, 2000);

      expect(res.success).toBe(true);
      expect(res.isTrap).toBe(true);
      expect(res.isDestroyed).toBe(true);
      expect(res.livesRemaining).toBe(0);
      expect(res.chain?.status).toBe('destroyed');

      const receipt = await queue.getGhostReceipt(chain.id);
      expect(receipt).not.toBeNull();
      expect(receipt?.outcome).toBe('destroyed');
      expect(receipt?.finalHop).toBe(6);
    });

    it('archives chain to Hall of Ghosts upon wrong decoder guess at 1 life remaining', async () => {
      const template = HANDCRAFTED_THEMES[8];
      const chain = createChainFromTemplate(template);
      chain.lives = 1;
      chain.currentHop = 10;
      await store.saveChain(chain);

      await queue.interceptChain('wrong-decoder', 1000);
      const wrongGuess = chain.themeOptions.find(t => t !== chain.secretTheme)!;
      const res = await queue.submitDecoderGuess(chain.id, 'wrong-decoder', wrongGuess, 2000);

      expect(res.success).toBe(true);
      expect(res.isCorrect).toBe(false);
      expect(res.isDestroyed).toBe(true);
      expect(res.livesRemaining).toBe(0);
      expect(res.chain?.status).toBe('destroyed');

      const receipt = await queue.getGhostReceipt(chain.id);
      expect(receipt).not.toBeNull();
      expect(receipt?.outcome).toBe('destroyed');
    });
  });
});
