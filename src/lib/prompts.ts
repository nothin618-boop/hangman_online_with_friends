import { SecretThemeTemplate } from './types';

/**
 * Curated catalog of 50 handcrafted secret themes for WHISPER.
 * Each theme satisfies:
 * - Sentence length: 7 to 12 words
 * - Word length: all words strictly < 12 characters (1..11)
 * - Purity: pure alphabetic words matching /^[a-zA-Z]+$/
 * - Trap words: exactly 5 lowercase secret words (<12 chars)
 * - Decoys: exactly 3 plausible distinct alternative themes
 */
export const HANDCRAFTED_THEMES: SecretThemeTemplate[] = [
  {
    id: 'cold-war-espionage',
    theme: 'Cold War Espionage',
    category: 'Espionage',
    initialSentence: 'The midnight courier delivered secret dossiers across foggy Berlin streets.',
    bannedWords: ['spy', 'agent', 'soviet', 'nuclear', 'embassy'],
    decoyThemes: ['Cyberpunk Heist', 'Vatican Archives', 'Smuggler Run']
  },
  {
    id: 'cyberpunk-heist',
    theme: 'Cyberpunk Heist',
    category: 'Sci-Fi',
    initialSentence: 'Chrome operatives breached corporate firewalls before orbital security noticed.',
    bannedWords: ['hacker', 'cyber', 'laser', 'matrix', 'android'],
    decoyThemes: ['Autonomous AI Revolt', 'Corporate Espionage', 'Quantum Teleport']
  },
  {
    id: 'victorian-seance',
    theme: 'Victorian Séance',
    category: 'Occult',
    initialSentence: 'Velvet curtains muffled strange whispers around the candlelit parlor table.',
    bannedWords: ['ghost', 'spirit', 'medium', 'occult', 'haunted'],
    decoyThemes: ['Witchcraft Inquisition', 'Haunted Asylum', 'Cursed Pharaoh']
  },
  {
    id: 'deep-sea-exploration',
    theme: 'Deep Sea Exploration',
    category: 'Maritime',
    initialSentence: 'Titanium submarines illuminated glowing predators inside silent ocean trenches.',
    bannedWords: ['submarine', 'ocean', 'torpedo', 'sonar', 'abyss'],
    decoyThemes: ['Sunken Atlantis', 'Ghost Ship Discovery', 'Arctic Outpost']
  },
  {
    id: 'mafia-syndicate',
    theme: 'Mafia Syndicate',
    category: 'Crime',
    initialSentence: 'Cigar smoke filled backroom tables while envelopes exchanged greasy hands.',
    bannedWords: ['mafia', 'mobster', 'racket', 'godfather', 'casino'],
    decoyThemes: ['Speakeasy Prohibition', 'Diamond Mine Heist', 'Black Market Arms']
  },
  {
    id: 'moon-landing-conspiracy',
    theme: 'Moon Landing Conspiracy',
    category: 'Space',
    initialSentence: 'Dusty boots walked soundstage floors under blinding Hollywood studio lights.',
    bannedWords: ['moon', 'apollo', 'camera', 'faked', 'astronaut'],
    decoyThemes: ['Area 51 Research', 'Alien Signal Intercept', 'Orbital Station']
  },
  {
    id: 'bio-weapon-containment',
    theme: 'Bio-Weapon Containment',
    category: 'Thriller',
    initialSentence: 'Sealed hazard suits sprayed chemical showers across quarantined lab corridors.',
    bannedWords: ['virus', 'plague', 'contagion', 'pathogen', 'outbreak'],
    decoyThemes: ['Genetic Lab Escape', 'Chemical Warfare', 'Underground Bunker']
  },
  {
    id: 'medieval-alchemy',
    theme: 'Medieval Alchemy',
    category: 'Fantasy',
    initialSentence: 'Bubbling copper cauldrons mixed sulfur vapors beneath ancient castle vaults.',
    bannedWords: ['gold', 'potion', 'elixir', 'wizard', 'magic'],
    decoyThemes: ['Witchcraft Inquisition', 'Dragon Slayers', 'Secret Society']
  },
  {
    id: 'vatican-archives',
    theme: 'Vatican Archives',
    category: 'Mystery',
    initialSentence: 'Cardinal scholars unlocked heavy bronze doors guarding forbidden papal manuscripts.',
    bannedWords: ['pope', 'vatican', 'secret', 'heresy', 'scripture'],
    decoyThemes: ['Templar Treasure', 'Victorian Séance', 'Renaissance Plot']
  },
  {
    id: 'subterranean-bunker',
    theme: 'Subterranean Bunker',
    category: 'Military',
    initialSentence: 'Reinforced concrete blast doors sealed soldiers beneath burning fallout clouds.',
    bannedWords: ['shelter', 'bunker', 'radiation', 'fallout', 'missile'],
    decoyThemes: ['Cold War Espionage', 'Nuclear Submarine', 'Doomsday Vault']
  },
  {
    id: 'autonomous-ai-revolt',
    theme: 'Autonomous AI Revolt',
    category: 'Sci-Fi',
    initialSentence: 'Silicon sentinels overrode human override keys inside automated server hives.',
    bannedWords: ['robot', 'revolt', 'machine', 'logic', 'algorithm'],
    decoyThemes: ['Cyberpunk Heist', 'Rogue Satellite', 'Synthetic Mind']
  },
  {
    id: 'time-travel-paradox',
    theme: 'Time Travel Paradox',
    category: 'Sci-Fi',
    initialSentence: 'Chrono dials rotated backward until forgotten ancestors vanished from reality.',
    bannedWords: ['time', 'paradox', 'past', 'future', 'tachyon'],
    decoyThemes: ['Quantum Teleport', 'Ancient Tomb Raiding', 'Astral Projection']
  },
  {
    id: 'smugglers-run',
    theme: "Smuggler's Run",
    category: 'Adventure',
    initialSentence: 'Cargo crates slipped past harbor patrols beneath midnight river barges.',
    bannedWords: ['contraband', 'customs', 'border', 'illegal', 'harbor'],
    decoyThemes: ['Black Market Arms', 'Desert Caravans', 'Pirate Cove']
  },
  {
    id: 'orbital-space-station',
    theme: 'Orbital Space Station',
    category: 'Space',
    initialSentence: 'Solar wings rotated slowly against cold silent expanses of Earth.',
    bannedWords: ['station', 'orbit', 'satellite', 'vacuum', 'shuttle'],
    decoyThemes: ['Alien Signal Intercept', 'Rogue Satellite', 'Deep Space Colony']
  },
  {
    id: 'ancient-tomb-raiding',
    theme: 'Ancient Tomb Raiding',
    category: 'Adventure',
    initialSentence: 'Torchlight flickered across gilded sarcophagi hidden inside crumbling stone pyramids.',
    bannedWords: ['mummy', 'pharaoh', 'curse', 'treasure', 'crypt'],
    decoyThemes: ['Cursed Pharaoh', 'Aztec Temple', 'Vatican Archives']
  },
  {
    id: 'speakeasy-prohibition',
    theme: 'Speakeasy Prohibition',
    category: 'History',
    initialSentence: 'Brass jazz horns echoed behind hidden bookshelf doors during raids.',
    bannedWords: ['alcohol', 'bootleg', 'federal', 'saloon', 'whiskey'],
    decoyThemes: ['Mafia Syndicate', 'Jazz Age Mystery', 'Underground Casino']
  },
  {
    id: 'master-art-forgery',
    theme: 'Master Art Forgery',
    category: 'Mystery',
    initialSentence: 'Fine pig hair brushes copied ancient Renaissance canvases with resin.',
    bannedWords: ['painting', 'gallery', 'counterfeit', 'canvas', 'museum'],
    decoyThemes: ['Stolen Crown Jewels', 'Renaissance Plot', 'Diamond Mine Heist']
  },
  {
    id: 'nuclear-submarine-patrol',
    theme: 'Nuclear Submarine Patrol',
    category: 'Military',
    initialSentence: 'Silent propellers pushed steel hulls through Arctic ice sheets secretly.',
    bannedWords: ['torpedo', 'reactor', 'sonar', 'periscope', 'depths'],
    decoyThemes: ['Deep Sea Exploration', 'Subterranean Bunker', 'Cold War Espionage']
  },
  {
    id: 'area-51-research',
    theme: 'Area 51 Research',
    category: 'Conspiracy',
    initialSentence: 'Desert fences guarded hangar doors hiding wreckage of unearthly saucers.',
    bannedWords: ['alien', 'ufo', 'saucer', 'wreckage', 'hangar'],
    decoyThemes: ['Moon Landing Conspiracy', 'Alien Signal Intercept', 'Black Project']
  },
  {
    id: 'royal-assassination-plot',
    theme: 'Royal Assassination Plot',
    category: 'History',
    initialSentence: 'Silver daggers hid inside silk sleeves near royal banquet thrones.',
    bannedWords: ['poison', 'murder', 'dagger', 'emperor', 'treason'],
    decoyThemes: ['Renaissance Plot', 'Stolen Crown Jewels', 'Roman Coup']
  },
  {
    id: 'secret-society-ritual',
    theme: 'Secret Society Ritual',
    category: 'Occult',
    initialSentence: 'Hooded scholars gathered around obsidian altars chanting ancient Latin verses.',
    bannedWords: ['cult', 'ritual', 'occult', 'altar', 'initiate'],
    decoyThemes: ['Victorian Séance', 'Illuminati Order', 'Vatican Archives']
  },
  {
    id: 'black-market-arms-trade',
    theme: 'Black Market Arms Trade',
    category: 'Crime',
    initialSentence: 'Wooden crates revealed automatic rifles along forgotten desert border airstrips.',
    bannedWords: ['weapons', 'rifles', 'shipment', 'dealer', 'warlord'],
    decoyThemes: ['Smuggler Run', 'Private Military Coup', 'Diamond Mine Heist']
  },
  {
    id: 'antarctic-research-outpost',
    theme: 'Antarctic Research Outpost',
    category: 'Survival',
    initialSentence: 'Howling blizzards buried lonely geodesic domes near frozen magnetic anomalies.',
    bannedWords: ['glacier', 'tundra', 'frozen', 'penguin', 'anomaly'],
    decoyThemes: ['Deep Sea Exploration', 'Arctic Outpost', 'Subterranean Bunker']
  },
  {
    id: 'cryptid-forest-sighting',
    theme: 'Cryptid Forest Sighting',
    category: 'Mystery',
    initialSentence: 'Giant heavy footprints circled abandoned ranger towers beneath dark redwoods.',
    bannedWords: ['beast', 'monster', 'sasquatch', 'forest', 'claw'],
    decoyThemes: ['Haunted Woods', 'Werewolf Pack', 'Folklore Hunter']
  },
  {
    id: 'ghost-ship-discovery',
    theme: 'Ghost Ship Discovery',
    category: 'Maritime',
    initialSentence: 'Rusted iron anchors swayed silently above empty battered wooden decks.',
    bannedWords: ['derelict', 'phantom', 'sailors', 'wreck', 'compass'],
    decoyThemes: ['Deep Sea Exploration', 'Pirate Cove', 'Bermuda Triangle']
  },
  {
    id: 'dark-web-blackmail',
    theme: 'Dark Web Blackmail',
    category: 'Cyber',
    initialSentence: 'Encrypted ledgers unlocked offshore accounts holding evidence of digital extortion.',
    bannedWords: ['ransom', 'bitcoin', 'crypto', 'leak', 'blackmail'],
    decoyThemes: ['Cyberpunk Heist', 'Hacker Collective', 'Corporate Espionage']
  },
  {
    id: 'vampire-masquerade',
    theme: 'Vampire Masquerade',
    category: 'Gothic',
    initialSentence: 'Porcelain masks concealed sharp fangs inside candlelit Venetian ballroom alcoves.',
    bannedWords: ['blood', 'vampire', 'fangs', 'immortal', 'castle'],
    decoyThemes: ['Victorian Séance', 'Gothic Manor', 'Cursed Bloodline']
  },
  {
    id: 'zeppelin-sabotage',
    theme: 'Zeppelin Sabotage',
    category: 'Steampunk',
    initialSentence: 'Brass gears slipped inside engine nacelles beneath giant hydrogen envelopes.',
    bannedWords: ['airship', 'balloon', 'hydrogen', 'propeller', 'sky'],
    decoyThemes: ['Steampunk Foundry', 'Train Robbery', 'Renaissance Plot']
  },
  {
    id: 'renaissance-infiltration',
    theme: 'Renaissance Infiltration',
    category: 'History',
    initialSentence: 'Velvet capes disguised Florentine spies climbing marble palazzo garden balconies.',
    bannedWords: ['florence', 'medici', 'assassin', 'palace', 'disguise'],
    decoyThemes: ['Royal Assassination Plot', 'Master Art Forgery', 'Vatican Archives']
  },
  {
    id: 'desert-mirage-caravan',
    theme: 'Desert Mirage Caravan',
    category: 'Adventure',
    initialSentence: 'Shifting sand dunes swallowed camel footprints heading toward vanished oases.',
    bannedWords: ['desert', 'camel', 'oasis', 'sultan', 'nomad'],
    decoyThemes: ['Ancient Tomb Raiding', 'Silk Road Traders', 'Lost Oasis']
  },
  {
    id: 'underground-casino',
    theme: 'Underground Casino',
    category: 'Crime',
    initialSentence: 'Polished ivory dice rolled across felt tables beneath neon signs.',
    bannedWords: ['roulette', 'gambling', 'chips', 'croupier', 'jackpot'],
    decoyThemes: ['Mafia Syndicate', 'Speakeasy Prohibition', 'Vegas Heist']
  },
  {
    id: 'global-hacker-collective',
    theme: 'Global Hacker Collective',
    category: 'Cyber',
    initialSentence: 'Green terminal text scrolled past anonymized proxies breaching defense servers.',
    bannedWords: ['exploit', 'breach', 'backdoor', 'firewall', 'hacker'],
    decoyThemes: ['Cyberpunk Heist', 'Dark Web Blackmail', 'Autonomous AI Revolt']
  },
  {
    id: 'deep-borehole-mystery',
    theme: 'Deep Borehole Mystery',
    category: 'Sci-Fi',
    initialSentence: 'Heavy tungsten drills shattered against resilient crystal spheres miles underground.',
    bannedWords: ['borehole', 'mantle', 'drilling', 'molten', 'seismic'],
    decoyThemes: ['Subterranean Bunker', 'Earth Core Expedition', 'Deep Sea Exploration']
  },
  {
    id: 'sleeper-agent-activation',
    theme: 'Sleeper Agent Activation',
    category: 'Espionage',
    initialSentence: 'Coded radio frequencies broadcast nursery rhymes triggering suburban sleeper operatives.',
    bannedWords: ['trigger', 'handler', 'treason', 'asset', 'sleeper'],
    decoyThemes: ['Cold War Espionage', 'Corporate Espionage', 'Mind Control Lab']
  },
  {
    id: 'stolen-crown-jewels',
    theme: 'Stolen Crown Jewels',
    category: 'Heist',
    initialSentence: 'Smoke canisters disarmed infrared sensors around velvet royal display cases.',
    bannedWords: ['crown', 'diamond', 'scepter', 'palace', 'heist'],
    decoyThemes: ['Master Art Forgery', 'Diamond Mine Heist', 'Royal Assassination Plot']
  },
  {
    id: 'biological-quarantine',
    theme: 'Biological Quarantine',
    category: 'Thriller',
    initialSentence: 'Yellow hazard tape fluttered outside empty subway terminals during lockdown.',
    bannedWords: ['plague', 'infection', 'curfew', 'patient', 'vaccine'],
    decoyThemes: ['Bio-Weapon Containment', 'Zombie Outbreak', 'Chemical Warfare']
  },
  {
    id: 'sunken-atlantis-ruins',
    theme: 'Sunken Atlantis Ruins',
    category: 'Mythology',
    initialSentence: 'Coral encrusted marble columns stood tall beneath turquoise tropical currents.',
    bannedWords: ['atlantis', 'ocean', 'trident', 'sunken', 'ancient'],
    decoyThemes: ['Deep Sea Exploration', 'Ghost Ship Discovery', 'Ancient Tomb Raiding']
  },
  {
    id: 'private-military-coup',
    theme: 'Private Military Coup',
    category: 'Politics',
    initialSentence: 'Armored convoys surrounded imperial palaces before dawn broke over capitals.',
    bannedWords: ['rebel', 'junta', 'mercenary', 'coup', 'tyrant'],
    decoyThemes: ['Royal Assassination Plot', 'Black Market Arms Trade', 'Guerrilla Warfare']
  },
  {
    id: 'cult-of-the-eclipse',
    theme: 'Cult of the Eclipse',
    category: 'Occult',
    initialSentence: 'Golden masks mirrored darkening sun discs above ancient sandstone monuments.',
    bannedWords: ['eclipse', 'solar', 'priest', 'sacrifice', 'darkness'],
    decoyThemes: ['Secret Society Ritual', 'Aztec Temple', 'Victorian Séance']
  },
  {
    id: 'phantom-express-train',
    theme: 'Phantom Express Train',
    category: 'Mystery',
    initialSentence: 'Iron steam locomotives barreled down abandoned tracks whistle shrieking loudly.',
    bannedWords: ['train', 'railway', 'locomotive', 'whistle', 'tracks'],
    decoyThemes: ['Ghost Ship Discovery', 'Zeppelin Sabotage', 'Haunted Asylum']
  },
  {
    id: 'diamond-mine-heist',
    theme: 'Diamond Mine Heist',
    category: 'Crime',
    initialSentence: 'Heavy blast charges opened private corporate vaults beneath desert dust.',
    bannedWords: ['vault', 'dynamite', 'jewelry', 'miners', 'diamonds'],
    decoyThemes: ['Stolen Crown Jewels', 'Mafia Syndicate', 'Smuggler Run']
  },
  {
    id: 'alien-signal-intercept',
    theme: 'Alien Signal Intercept',
    category: 'Sci-Fi',
    initialSentence: 'Giant dish arrays detected prime number pulses from distant nebulae.',
    bannedWords: ['cosmos', 'antenna', 'pulse', 'telescope', 'beacon'],
    decoyThemes: ['Area 51 Research', 'Moon Landing Conspiracy', 'Orbital Space Station']
  },
  {
    id: 'cybernetic-black-market',
    theme: 'Cybernetic Black Market',
    category: 'Sci-Fi',
    initialSentence: 'Neon alleyway stalls sold illegal synthetic optics and neural wiring.',
    bannedWords: ['implant', 'chrome', 'bionic', 'neural', 'surgeon'],
    decoyThemes: ['Cyberpunk Heist', 'Autonomous AI Revolt', 'Genetic Lab Escape']
  },
  {
    id: 'rogue-satellite-protocol',
    theme: 'Rogue Satellite Protocol',
    category: 'Space',
    initialSentence: 'Solar panels tilted toward secret coordinates beaming encrypted military codes.',
    bannedWords: ['telemetry', 'orbit', 'weapon', 'missile', 'beam'],
    decoyThemes: ['Orbital Space Station', 'Cyberpunk Heist', 'Alien Signal Intercept']
  },
  {
    id: 'witchcraft-inquisition',
    theme: 'Witchcraft Inquisition',
    category: 'History',
    initialSentence: 'Black cloaks gathered round midnight forest bonfires burning forbidden grimoires.',
    bannedWords: ['witch', 'coven', 'broom', 'inquisition', 'stake'],
    decoyThemes: ['Victorian Séance', 'Medieval Alchemy', 'Secret Society Ritual']
  },
  {
    id: 'corporate-espionage',
    theme: 'Corporate Espionage',
    category: 'Thriller',
    initialSentence: 'Shredded paper bags contained prototypes stolen from rival biotech labs.',
    bannedWords: ['patent', 'rival', 'boardroom', 'corporate', 'informant'],
    decoyThemes: ['Sleeper Agent Activation', 'Dark Web Blackmail', 'Bio-Weapon Containment']
  },
  {
    id: 'diplomatic-hostage-crisis',
    theme: 'Diplomatic Hostage Crisis',
    category: 'Politics',
    initialSentence: 'Armed guards secured embassy rooftops while negotiators pleaded over radios.',
    bannedWords: ['hostage', 'embassy', 'surrender', 'terrorist', 'negotiator'],
    decoyThemes: ['Cold War Espionage', 'Private Military Coup', 'Black Market Arms Trade']
  },
  {
    id: 'chernobyl-exclusion-zone',
    theme: 'Chernobyl Exclusion Zone',
    category: 'History',
    initialSentence: 'Rusted Ferris wheels loomed over overgrown avenues poisoned by radiation.',
    bannedWords: ['reactor', 'pripyat', 'atomic', 'dosimeter', 'graphite'],
    decoyThemes: ['Bio-Weapon Containment', 'Subterranean Bunker', 'Nuclear Submarine']
  },
  {
    id: 'mirage-luxury-express',
    theme: 'Mirage Luxury Express',
    category: 'Adventure',
    initialSentence: 'Crystal glasses clinked in dining cars racing across alpine viaducts.',
    bannedWords: ['passenger', 'steward', 'luxury', 'luggage', 'conductor'],
    decoyThemes: ['Phantom Express Train', 'Master Art Forgery', 'Speakeasy Prohibition']
  },
  {
    id: 'deep-space-colony-ark',
    theme: 'Deep Space Colony Ark',
    category: 'Sci-Fi',
    initialSentence: 'Cryogenic chambers hummed softly during centuries of travel between galaxies.',
    bannedWords: ['colony', 'stasis', 'ark', 'generation', 'galaxy'],
    decoyThemes: ['Orbital Space Station', 'Alien Signal Intercept', 'Autonomous AI Revolt']
  }
];

/**
 * Returns a handcrafted theme by its ID.
 */
export function getHandcraftedThemeById(id: string): SecretThemeTemplate | undefined {
  return HANDCRAFTED_THEMES.find(t => t.id === id);
}

/**
 * Returns a random handcrafted theme from the 50-theme library.
 */
export function getRandomHandcraftedTheme(): SecretThemeTemplate {
  const index = Math.floor(Math.random() * HANDCRAFTED_THEMES.length);
  return HANDCRAFTED_THEMES[index];
}
