/**
 * WHISPER Chain Auto-Spawner Daemon
 * Milestone M2 Implementation
 */

import { Chain, SecretThemeTemplate } from './types';
import { IWhisperStore, getStore } from './store';
import { HANDCRAFTED_THEMES } from './prompts';
import { generateTheme } from './generator';
import { shuffleThemeOptions } from './decoder';

export const MIN_ACTIVE_CHAINS = 50;

let spawnerSeedCounter = 50;

export function createChainFromTemplate(template: SecretThemeTemplate, customId?: string): Chain {
  const chainId = customId || `chain-${Math.random().toString(36).substring(2, 9)}`;
  return {
    id: chainId,
    secretTheme: template.theme,
    themeOptions: shuffleThemeOptions([template.theme, ...template.decoyThemes]),
    bannedWords: [...template.bannedWords],
    initialSentence: template.initialSentence,
    currentSentence: template.initialSentence,
    currentHop: 0,
    bonusHops: 0,
    lives: 3,
    maxHops: 100,
    history: [],
    status: 'active',
    leasedToPlayerId: null,
    leaseExpiresAt: null,
    createdAt: Date.now()
  };
}

/**
 * Ensures the operational pool maintains at least targetPoolSize active chains.
 * Uses handcrafted themes 0..49 first, followed by algorithmic generator 50+.
 */
export async function autoSpawnChains(
  targetPoolSize: number = MIN_ACTIVE_CHAINS,
  store?: IWhisperStore
): Promise<number> {
  const activeStore = store || getStore();
  const currentCount = await activeStore.getActiveChainsCount();

  if (currentCount >= targetPoolSize) {
    return 0;
  }

  const deficit = targetPoolSize - currentCount;
  const activeChains = await activeStore.getActiveChains();
  const activeThemeNames = new Set(activeChains.map(c => c.secretTheme));

  let spawned = 0;

  // 1. Fill using unrepresented handcrafted themes (0..49)
  for (let i = 0; i < HANDCRAFTED_THEMES.length && spawned < deficit; i++) {
    const theme = HANDCRAFTED_THEMES[i];
    if (!activeThemeNames.has(theme.theme)) {
      const chain = createChainFromTemplate(theme);
      await activeStore.saveChain(chain);
      activeThemeNames.add(theme.theme);
      spawned++;
    }
  }

  // 2. If deficit remains, synthesize algorithmic themes (50+)
  while (spawned < deficit) {
    const theme = generateTheme(spawnerSeedCounter++);
    const chain = createChainFromTemplate(theme);
    await activeStore.saveChain(chain);
    spawned++;
  }

  return spawned;
}
