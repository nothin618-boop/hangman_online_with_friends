import { SecretThemeTemplate } from './types';

/**
 * Seedable 32-bit PRNG (Mulberry32).
 * Guarantees 100% deterministic outputs across all JavaScript runtimes.
 */
export function createMulberry32(seed: number): () => number {
  let s = seed >>> 0;
  return function next(): number {
    s = (s + 0x6D2B79F5) >>> 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Samples k distinct elements from array without replacement using the PRNG.
 */
export function sampleWithoutReplacement<T>(rng: () => number, array: readonly T[], count: number): T[] {
  const pool = [...array];
  const sampled: T[] = [];
  const n = Math.min(count, pool.length);
  for (let i = 0; i < n; i++) {
    const idx = Math.floor(rng() * pool.length);
    sampled.push(pool.splice(idx, 1)[0]);
  }
  return sampled;
}

export interface DomainMatrix {
  name: string;
  category: string;
  subjects: readonly string[];
  actions: readonly string[];
  targets: readonly string[];
  settings: readonly string[];
  traps: readonly string[];
  decoys: readonly string[];
}

export const GENERATOR_DOMAINS: readonly DomainMatrix[] = [
  {
    name: 'Cyberpunk',
    category: 'Sci-Fi',
    subjects: ['synth hacker', 'chrome operative', 'neural runner', 'cyber courier', 'shadow specialist'],
    actions: ['breached', 'infiltrated', 'hacked', 'bypassed', 'scrambled', 'extracted'],
    targets: ['megacorp mainframe', 'quantum server', 'encrypted databank', 'neural core', 'biometric ledger'],
    settings: ['neon underground alleys', 'abandoned server hives', 'orbital research silos', 'crowded night markets'],
    traps: ['cyber', 'matrix', 'firewall', 'hacker', 'glitch', 'chrome', 'android', 'server', 'terminal', 'neural', 'proxy', 'exploit'],
    decoys: ['Neural Net Revolt', 'Corporate Data Heist', 'Black Market Cyberware', 'Orbital Sat Hijack']
  },
  {
    name: 'Cold War',
    category: 'Espionage',
    subjects: ['shadow operative', 'secret courier', 'covert defector', 'double agent', 'sleeper officer'],
    actions: ['exchanged', 'smuggled', 'concealed', 'delivered', 'intercepted', 'decoded'],
    targets: ['classified dossiers', 'atomic schematics', 'microfilm spools', 'cipher notebooks', 'embassy cables'],
    settings: ['foggy checkpoint border', 'dim diplomatic quarters', 'crowded metro tunnels', 'neutral harbor docks'],
    traps: ['soviet', 'agent', 'spy', 'embassy', 'treason', 'courier', 'dossier', 'checkpoint', 'border', 'nuclear', 'covert', 'defector'],
    decoys: ['Berlin Wall Crossing', 'KGB Defector Trail', 'MI6 Microfilm Op', 'Embassy Cipher Breach']
  },
  {
    name: 'Occult',
    category: 'Occult',
    subjects: ['veiled medium', 'hooded scholar', 'arcane cultist', 'curious antiquarian', 'daring occultist'],
    actions: ['summoned', 'awakened', 'channeled', 'whispered', 'bound', 'invoked'],
    targets: ['spectral shadows', 'forgotten rituals', 'cursed talismans', 'forbidden relics', 'ancient spirits'],
    settings: ['creaking manor libraries', 'candlelit stone catacombs', 'misty graveyard chapel', 'damp vaulted crypts'],
    traps: ['ghost', 'spirit', 'medium', 'curse', 'phantom', 'ritual', 'occult', 'manor', 'specter', 'coven', 'tomb', 'altar'],
    decoys: ['Cursed Ancestor Manor', 'Midnight Séance Vigil', 'Catacomb Shadow Cult', 'Victorian Ghost Hunt']
  },
  {
    name: 'Oceanic Abyss',
    category: 'Maritime',
    subjects: ['deep sea diver', 'naval captain', 'ocean researcher', 'salvage master', 'sub explorer'],
    actions: ['navigated', 'discovered', 'charted', 'uncovered', 'scanned', 'retrieved'],
    targets: ['sunken galleon ruins', 'abyssal thermal vents', 'luminescent coral reefs', 'rusted cargo wreckage'],
    settings: ['crushing trench depths', 'stormy midnight waters', 'remote arctic currents', 'silent kelp forests'],
    traps: ['abyss', 'ocean', 'sonar', 'diver', 'trench', 'torpedo', 'shipwreck', 'coral', 'current', 'salvage', 'maritime', 'sub'],
    decoys: ['Sunken Galleon Mystery', 'Abyssal Vent Expedition', 'Arctic Trench Patrol', 'Bermuda Deep Salvage']
  },
  {
    name: 'Deep Space',
    category: 'Space',
    subjects: ['orbital pilot', 'astro surveyor', 'void navigator', 'station technician', 'lunar scout'],
    actions: ['guided', 'propelled', 'steered', 'repaired', 'monitored', 'docked'],
    targets: ['silent modular units', 'derelict solar arrays', 'deep space capsules', 'pulsar beacon dishes'],
    settings: ['frozen planetary orbits', 'distant nebula horizons', 'cratered asteroid fields', 'hollow lunar caverns'],
    traps: ['orbit', 'lunar', 'galaxy', 'station', 'shuttle', 'vacuum', 'capsule', 'beacon', 'asteroid', 'nebula', 'solar', 'void'],
    decoys: ['Derelict Beacon Salvage', 'Outer Asteroid Outpost', 'Lunar Habitat Silence', 'Deep Nebula Probe']
  },
  {
    name: 'Bio-Hazard',
    category: 'Thriller',
    subjects: ['hazmat scientist', 'lab director', 'field medic', 'safety inspector', 'containment tech'],
    actions: ['quarantined', 'isolated', 'neutralized', 'sampled', 'injected', 'sterilized'],
    targets: ['mutated viral strains', 'synthetic pathogens', 'toxic chemical vials', 'cryogenic tissue pods'],
    settings: ['sealed sublevel vaults', 'pressurized clean rooms', 'abandoned clinic wards', 'secure isolation bays'],
    traps: ['virus', 'toxin', 'vaccine', 'outbreak', 'hazard', 'pathogen', 'specimen', 'contagion', 'plague', 'antidote', 'sterile', 'lab'],
    decoys: ['Sublevel Quarantine Breach', 'Synthetic Virus Panic', 'Cryo Tissue Theft', 'Toxic Chamber Lockdown']
  },
  {
    name: 'Archaeology',
    category: 'Adventure',
    subjects: ['bold explorer', 'desert researcher', 'relic hunter', 'tomb seeker', 'temple scholar'],
    actions: ['excavated', 'unsealed', 'deciphered', 'recovered', 'cleared', 'opened'],
    targets: ['gilded sarcophagi', 'mystic obsidian idols', 'carved granite tablets', 'ceremonial urns'],
    settings: ['crumbling desert pyramids', 'overgrown jungle ruins', 'hidden underground tombs', 'sacred cliff sanctuaries'],
    traps: ['pharaoh', 'pyramid', 'temple', 'relic', 'tomb', 'mummy', 'curse', 'ruins', 'artifact', 'dynasty', 'shrine', 'ancient'],
    decoys: ['Lost Pharaoh Vault', 'Jungle Temple Enigma', 'Sacred Idol Quest', 'Obsidian Crypt Discovery']
  },
  {
    name: 'Steampunk',
    category: 'Steampunk',
    subjects: ['brass mechanic', 'steam engineer', 'sky pilot', 'clockwork artisan', 'foundry foreman'],
    actions: ['assembled', 'cranked', 'welded', 'calibrated', 'stoked', 'tuned'],
    targets: ['copper steam turbines', 'pneumatic piston valves', 'clockwork gear drives', 'pressurized boiler pipes'],
    settings: ['smoky foundry halls', 'soaring sky galleons', 'roaring locomotive cabs', 'iron zeppelin cabins'],
    traps: ['steam', 'brass', 'copper', 'gear', 'airship', 'piston', 'boiler', 'furnace', 'clockwork', 'engine', 'turbine', 'smog'],
    decoys: ['Sky Zeppelin Overhaul', 'Clockwork Foundry Panic', 'Steam Locomotive Rush', 'Pneumatic Valve Sabotage']
  },
  {
    name: 'Noir Crime',
    category: 'Crime',
    subjects: ['weary detective', 'undercover inspector', 'crime reporter', 'private sleuth', 'street informant'],
    actions: ['tailed', 'cornered', 'questioned', 'pursued', 'shadowed', 'unmasked'],
    targets: ['corrupt syndicate bosses', 'marked gambling money', 'forged bank ledgers', 'smuggled diamond crates'],
    settings: ['rainy cobblestone alleys', 'dim jazz speakeasies', 'abandoned harbor piers', 'shadowy hotel lobbies'],
    traps: ['mafia', 'detective', 'gambling', 'racket', 'mobster', 'pistol', 'alibi', 'bribe', 'speakeasy', 'witness', 'crook', 'syndicate'],
    decoys: ['Midnight Speakeasy Raid', 'Rainy Alley Ambush', 'Syndicate Ledger Hunt', 'Corrupt Waterfront Deal']
  },
  {
    name: 'Medieval Fantasy',
    category: 'Fantasy',
    subjects: ['court wizard', 'royal knight', 'cloaked ranger', 'castle guard', 'wandering bard'],
    actions: ['defended', 'protected', 'forged', 'enchanted', 'escorted', 'guarded'],
    targets: ['blessed silver blades', 'ancient royal banners', 'gleaming crystal orbs', 'runic fortress gates'],
    settings: ['towering citadel halls', 'misty enchanted groves', 'mountain watchtowers', 'dark castle dungeons'],
    traps: ['wizard', 'knight', 'magic', 'sword', 'castle', 'dragon', 'potion', 'shield', 'palace', 'dungeon', 'kingdom', 'spell'],
    decoys: ['Dragon Citadel Siege', 'Enchanted Grove Watch', 'Royal Crown Guard', 'Runestone Fortress Defense']
  },
  {
    name: 'Museum Heist',
    category: 'Heist',
    subjects: ['master jewel thief', 'stealth acrobat', 'alarm technician', 'disguised bandit', 'safecracker'],
    actions: ['swapped', 'snatched', 'lifted', 'disabled', 'cracked', 'looted'],
    targets: ['flawless diamond tiaras', 'rare imperial rubies', 'priceless golden cups', 'ancient velvet crowns'],
    settings: ['high security galleries', 'grand museum rotundas', 'vaulted palace atriums', 'rooftop skylight domes'],
    traps: ['heist', 'vault', 'laser', 'alarm', 'diamond', 'museum', 'security', 'patrol', 'infrared', 'loot', 'guard', 'jewel'],
    decoys: ['Rotunda Diamond Swap', 'Imperial Ruby Swindle', 'Skylight Gallery Breach', 'Midnight Vault Job']
  },
  {
    name: 'Subterranean Bunker',
    category: 'Military',
    subjects: ['radar operator', 'bunker commander', 'missile technician', 'security sentry', 'defense officer'],
    actions: ['monitored', 'secured', 'fortified', 'armed', 'shielded', 'locked'],
    targets: ['heavy steel bulkheads', 'tactical warning arrays', 'emergency power grids', 'reinforced command doors'],
    settings: ['deep nuclear shelters', 'mountain defense tunnels', 'hardened command centers', 'reinforced blast vaults'],
    traps: ['bunker', 'fallout', 'missile', 'radar', 'siren', 'shelter', 'nuclear', 'sentry', 'blast', 'defense', 'turret', 'armor'],
    decoys: ['Blast Vault Lockdown', 'Tactical Grid Defense', 'Mountain Bunker Vigil', 'Emergency Siren Alert']
  }
];

/**
 * Generates a deterministic SecretThemeTemplate for any integer seed.
 * Scales to 1,000+ distinct combinations with guaranteed unique IDs.
 *
 * @param seed Integer seed index (e.g. 0..999 or any positive integer)
 * @returns SecretThemeTemplate
 */
export function generateTheme(seed: number): SecretThemeTemplate {
  const normalizedSeed = (seed >>> 0);
  const rng = createMulberry32(normalizedSeed);

  // 1. Select domain
  const domainIdx = Math.floor(rng() * GENERATOR_DOMAINS.length);
  const domain = GENERATOR_DOMAINS[domainIdx];

  // 2. Select slots
  const subject = domain.subjects[Math.floor(rng() * domain.subjects.length)];
  const action = domain.actions[Math.floor(rng() * domain.actions.length)];
  const target = domain.targets[Math.floor(rng() * domain.targets.length)];
  const setting = domain.settings[Math.floor(rng() * domain.settings.length)];

  // 3. Assemble grammatically correct sentence (The [subject] [action] [target] inside [setting].)
  const initialSentence = `The ${subject} ${action} ${target} inside ${setting}.`;

  // 4. Sample 5 trap words without replacement
  const bannedWords = sampleWithoutReplacement(rng, domain.traps, 5);

  // 5. Sample 3 decoys from other domains
  const otherDomainDecoys = GENERATOR_DOMAINS
    .filter(d => d.name !== domain.name)
    .flatMap(d => d.decoys);
  const decoyThemes = sampleWithoutReplacement(rng, otherDomainDecoys, 3);

  // 6. Title
  const subjectCapitalized = subject.charAt(0).toUpperCase() + subject.slice(1);
  const theme = `${domain.name}: ${subjectCapitalized}`;

  return {
    id: `gen-${normalizedSeed}`,
    theme,
    initialSentence,
    bannedWords,
    decoyThemes,
    category: domain.category
  };
}

/**
 * Alias for generateTheme
 */
export const generateAlgorithmicTheme = generateTheme;

/**
 * Batch generates a sequence of distinct themes starting at startSeed.
 */
export function generateThemesBatch(startSeed: number, count: number): SecretThemeTemplate[] {
  const result: SecretThemeTemplate[] = [];
  for (let i = 0; i < count; i++) {
    result.push(generateTheme(startSeed + i));
  }
  return result;
}
