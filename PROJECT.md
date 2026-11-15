# Project: WHISPER — Cryptographic Linguistic Disguise Game

## Architecture
WHISPER is built as a production-grade, single-screen cybernetic multiplayer browser game utilizing Next.js (App Router), TypeScript, Tailwind CSS, Web Audio API, and real-time Server-Sent Events (SSE).

```
+---------------------------------------------------------------------------------------+
|                                    NEXT.JS CLIENT                                     |
|  - Cybernetic Terminal UI (TopBar, CenterStage, WordBlocks, DecoderQuiz, Drawer)      |
|  - Client Game Engine Hook (`useWhisperGame`) with LocalStorage Anonymous Session     |
|  - Procedural Web Audio API Synthesizer (8 profiles, zero external audio assets)     |
|  - Real-time SSE Stream Listener (Telemetry, Mutated Chains, Crowd Jury Alerts)       |
+-------------------------------------------+-------------------------------------------+
                                            │ HTTP / SSE
                                            ▼
+---------------------------------------------------------------------------------------+
|                                  NEXT.JS API BACKEND                                  |
|  - Route Handlers: /api/chains/intercept, /api/chains/submit, /api/chains/report,     |
|                    /api/jury/vote, /api/chains/stream, /api/ghost/[id]                |
|  - Queue & State Store: Atomic 60s lease locks, auto-reclaim sweep, Redis/Memory sync  |
|  - The Filter Rule Engine: Regex lock, length < 12, ~100k dictionary, history repeats|
|  - Dynamic Role & Theme Engine: 50 handcrafted seeds + 1,000+ algorithmic combinations |
|  - Crowd Jury Engine: 3-peer dispatch, 2/3 majority consensus, 1-hop rewind, troll pool|
|  - Hall of Ghosts: Permanent archival for Victory (100 hops) & Destroyed (0 lives)    |
+---------------------------------------------------------------------------------------+
```

## Feature Inventory
| # | Feature | Description | Milestone | Source |
|---|---------|-------------|-----------|--------|
| 1 | Zero-Auth Drop-In | Frictionless entry with no login wall; anonymous UUID session in localStorage | M1 | ORIGINAL_REQUEST §R1 |
| 2 | Atomic 60s Lease Lock | Claims active chain for 60 seconds; locks out other players during modification | M2 | ORIGINAL_REQUEST §R1, §R5 |
| 3 | Auto Lease Reclamation | Background sweep resets expired leases (>60s) back to active queue head | M2 | whisper_master_plan §4 |
| 4 | Dynamic Role Assignment | Schedules role: 9/10 Shifter, 10th hop Decoder (with Hop 0 and bonus hops guards) | M1 | ORIGINAL_REQUEST §R1 |
| 5 | Single-Word Replacement | Interactive word selection; replaces exactly 1 word with disguise word | M1 | ORIGINAL_REQUEST §R1 |
| 6 | Sentence Structure Invariant | Total word count and structural punctuation preserved across mutations | M1 | ORIGINAL_REQUEST §R1, survey |
| 7 | 4-Candidate Theme Deduction | Presents 4 cryptographic theme cards (1 correct + 3 decoys) on every 10th hop | M1 | ORIGINAL_REQUEST §R1 |
| 8 | Decoder Victory Bonus | Correct guess awards +10 bonus hops toward 100-hop Victory threshold | M1 | ORIGINAL_REQUEST §R1 |
| 9 | Decoder Penalty Strike | Incorrect guess deducts 1 Signal Bar strike from chain health | M1 | ORIGINAL_REQUEST §R1 |
| 10 | Alphabet Regex Lock | Enforces `/^[a-zA-Z]+$/`; rejects numbers, spaces, symbols, and hyphens | M1 | ORIGINAL_REQUEST §R2 |
| 11 | Length Lock (< 12 Chars) | Rejects words with length >= 12 characters (max 11 chars) | M1 | ORIGINAL_REQUEST §R2 |
| 12 | Dictionary Verification | Validates candidate word against indexed English dictionary (~100k words) | M1 | ORIGINAL_REQUEST §R2 |
| 13 | No Repeats History Invariant | Rejects any word used anywhere in chain's hop history | M1 | ORIGINAL_REQUEST §R2 |
| 14 | 5 Secret Banned Words Trap | Secret blacklist of 5 words per theme; triggers alarm and -1 strike | M1 | ORIGINAL_REQUEST §R2 |
| 15 | 3-Strike Signal Bar Health | Chains start with 3 bars; destroyed permanently at 0 bars | M1 | ORIGINAL_REQUEST §R2 |
| 16 | Chain Victory Archival | Surviving to 100 hops marks chain as Victory in Hall of Ghosts | M2 | ORIGINAL_REQUEST §R5 |
| 17 | Chain Destruction Archival | Falling to 0 lives marks chain as Destroyed in Hall of Ghosts | M2 | ORIGINAL_REQUEST §R2, §R5 |
| 18 | Crowd Jury Sabotage Flag | "Report Sabotage" (Scrub) dispatches case to 3 random connected peers | M2 | ORIGINAL_REQUEST §R3 |
| 19 | 2/3 Jury Consensus & Rewind | 2/3 Yes votes rewinds chain 1 hop, purges troll token, shadow-bans player | M2 | ORIGINAL_REQUEST §R3 |
| 20 | Shadow-Ban Troll Queue | Players found guilty are quarantined to isolated sandbox troll queue | M2 | ORIGINAL_REQUEST §R3 |
| 21 | High-Throughput Queue Engine | Concurrency-safe queue with in-memory store and drop-in Redis support | M2 | ORIGINAL_REQUEST §R5 |
| 22 | Auto-Spawner Daemon | Automatically spawns fresh chains when active pool drops below threshold | M2 | ORIGINAL_REQUEST §R5 |
| 23 | 50 Handcrafted Theme Seeds | Curated starter library of 50 secret themes with sentences, 5 traps, 3 decoys | M1 | ORIGINAL_REQUEST §R5 |
| 24 | 1,000+ Algorithmic Generator | Combinatorial grammar synthesizer generating 1,000+ distinct secret combinations | M1 | ORIGINAL_REQUEST §R5 |
| 25 | Live Telemetry & Streaks | Real-time SSE telemetry (Active Whispers, Players Online) & streak scores | M2 | ORIGINAL_REQUEST §R4 |
| 26 | Cybernetic Dark-Mode UI | Single-screen terminal layout with CRT scanlines and neon aesthetics | M3 | ORIGINAL_REQUEST §R4 |
| 27 | Interactive Word Blocks | Center stage glowing interactive word blocks clickable for disguise modal | M3 | ORIGINAL_REQUEST §R4 |
| 28 | Animated 60s Countdown Bar | Animated countdown bar with state color transitions (<15s crimson pulse) | M3 | ORIGINAL_REQUEST §R4 |
| 29 | Collapsible Trace Log Drawer | Slide-out drawer displaying previous 3 hops with author, diffs, timestamps | M3 | ORIGINAL_REQUEST §R4 |
| 30 | "My Active Chains" Tray | Bottom bar displaying live real-time updates for chains player has touched | M3 | ORIGINAL_REQUEST §R4 |
| 31 | Synthesized Web Audio Engine | Procedural Web Audio API sound FX (ticks, heartbeat, alarms, fanfare, mute) | M3 | ORIGINAL_REQUEST §R4 |
| 32 | Instant Crowd Jury Modal | Rapid non-blocking pop-up modal for peer jury review votes | M3 | ORIGINAL_REQUEST §R3 |
| 33 | Hall of Ghosts Receipt Page | Shareable `/ghost/:id` route rendering complete interactive timeline diffs | M3 | ORIGINAL_REQUEST §R5 |
| 34 | Full E2E Test Suite & Passing Gate | 100% pass on comprehensive multi-tier test suite + adversarial coverage | M4 | ORIGINAL_REQUEST Acceptance Criteria |

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| M1 | Core Rules & Theme Engine | Project scaffolding (pnpm, Next.js, TS, Tailwind, Vitest), data contracts, ~100k dictionary index, Filter Rule Engine, Dynamic Role Assignment, Decoder logic, 50 handcrafted themes library, 1,000+ algorithmic theme generator, unit tests | none | DONE (59 unit tests, 226 E2E tests, clean build, clean audit) |
| M2 | Queue Engine, Concurrency, Jury & APIs | In-memory + Redis queue state store, 60s atomic lease locks, auto-reclaim daemon, auto-spawner daemon, crowd jury engine (3-peer dispatch, 2/3 consensus, 1-hop rewind, troll queue), Hall of Ghosts store, SSE telemetry & mutation streaming, Next.js API route handlers | M1 | DONE (279 unit + 226 E2E tests, clean build, clean audit) |
| M3 | Terminal UI, Procedural Audio & Hall of Ghosts | Cybernetic dark-mode UI, CRT scanlines, TopBar, CenterStage glowing word blocks, 60s countdown bar (<15s pulse), WordInputModal, DecoderQuiz, TraceLogDrawer, ActiveChainsBar, JuryPopupModal, procedural Web Audio API engine (zero assets), `/ghost/:id` receipt timeline diff viewer | M2 | DONE (381 unit + 226 E2E tests, clean build, clean audit) |
| M4 | Final Milestone (100% E2E Pass + Tier 5 Hardening) | Phase 1: Pass 100% of opaque-box E2E tests (Tiers 1-4) published in `TEST_READY.md`. Phase 2: Tier 5 Adversarial Coverage Hardening with Challenger code audits and edge-case stress verification. | M3, TEST_READY.md | DONE (722 tests passed across 26 unit & 44 E2E suites, clean build, clean final audit) |

## Interface Contracts

### 1. Data Contracts (`src/lib/types.ts`)
```typescript
export type PlayerRole = 'shifter' | 'decoder';
export type ChainStatus = 'active' | 'in_progress' | 'victory' | 'destroyed';

export interface Hop {
  hopNumber: number;
  playerId: string;
  previousSentence: string;
  newSentence: string;
  replacedWordIndex?: number;
  oldWord?: string;
  newWord?: string;
  role: PlayerRole;
  decoderGuess?: string;
  isCorrectGuess?: boolean;
  timestamp: number;
}

export interface SecretThemeTemplate {
  id: string;
  theme: string;
  initialSentence: string;
  bannedWords: string[]; // exactly 5 secret words (<12 chars)
  decoyThemes: string[]; // exactly 3 decoys
  category: string;
}

export interface Chain {
  id: string;
  secretTheme: string;
  themeOptions: string[]; // 4 options (1 correct + 3 decoys)
  bannedWords: string[];  // 5 trap words (server-only)
  initialSentence: string;
  currentSentence: string;
  currentHop: number;
  bonusHops?: number;
  lives: number;          // 3 Signal Bars
  maxHops: number;        // 100 hops
  history: Hop[];
  status: ChainStatus;
  leasedToPlayerId?: string | null;
  leaseExpiresAt?: number | null;
  createdAt: number;
  completedAt?: number;
}
```

### 2. Filter Engine Interface (`src/lib/filter.ts`)
```typescript
export interface FilterValidationResult {
  valid: boolean;
  error?: 'INVALID_CHARACTERS' | 'WORD_TOO_LONG' | 'NOT_IN_DICTIONARY' | 'DUPLICATE_HISTORICAL_WORD';
  message?: string;
  isTrap?: boolean;
}

export function validateCandidateWord(
  candidateWord: string,
  chainHistory: Hop[],
  themeBannedWords?: string[]
): FilterValidationResult;
```

### 3. Queue & State Store Interface (`src/lib/queue.ts`)
```typescript
export interface QueueEngine {
  interceptChain(playerId: string): Promise<{ chain: SanitizedChain; role: PlayerRole } | null>;
  submitMutation(chainId: string, playerId: string, wordIndex: number, newWord: string): Promise<SubmitResult>;
  submitDecoderGuess(chainId: string, playerId: string, guess: string): Promise<DecoderResult>;
  reportSabotage(chainId: string, reporterPlayerId: string): Promise<JuryCase>;
  voteJury(caseId: string, voterPlayerId: string, isSabotage: boolean): Promise<JuryVoteResult>;
  getChainById(chainId: string): Promise<Chain | null>;
  getHallOfGhosts(): Promise<GhostReceipt[]>;
  getGhostReceipt(chainId: string): Promise<GhostReceipt | null>;
  reclaimExpiredLeases(): Promise<number>;
  autoSpawnChains(minActiveCount: number): Promise<number>;
}
```

### 4. API Wire Formats
- `POST /api/chains/intercept` $\rightarrow$ `{ chainId, role, currentHop, sentence, traceLog, leaseExpiresAt }` (bannedWords excluded!)
- `POST /api/chains/submit` `{ chainId, playerId, wordIndex, newWord }` $\rightarrow$ `{ success, chain, strikeDeducted, isTrap }`
- `POST /api/chains/report` `{ chainId, reporterId }` $\rightarrow$ `{ caseId, message }`
- `POST /api/jury/vote` `{ caseId, voterId, isSabotage }` $\rightarrow$ `{ verdict, rewound }`
- `GET /api/chains/stream?playerId=xyz` $\rightarrow$ `text/event-stream` emitting `telemetry`, `chain_mutated`, `jury_summon`
- `GET /api/ghost/[id]` $\rightarrow$ `{ receipt: GhostReceipt }`

## Code Layout
```
C:\Users\antony\.gemini\antigravity\scratch\whisper-game\
├── package.json
├── tsconfig.json
├── tailwind.config.ts
├── postcss.config.js
├── vitest.config.ts
├── playwright.config.ts
├── src/
│   ├── app/
│   │   ├── layout.tsx
│   │   ├── page.tsx               # Single-screen cybernetic terminal UI
│   │   ├── globals.css            # CRT scanline overlay, glows, animations
│   │   ├── ghost/
│   │   │   └── [id]/
│   │   │       └── page.tsx       # Hall of Ghosts receipt timeline viewer
│   │   └── api/
│   │       ├── chains/
│   │       │   ├── intercept/route.ts
│   │       │   ├── submit/route.ts
│   │       │   ├── report/route.ts
│   │       │   └── stream/route.ts
│   │       ├── jury/
│   │       │   └── vote/route.ts
│   │       ├── ghost/
│   │       │   └── [id]/route.ts
│   │       └── telemetry/route.ts
│   ├── components/
│   │   ├── TopBar.tsx
│   │   ├── StrikeHealthBar.tsx
│   │   ├── CenterStage.tsx
│   │   ├── WordInputModal.tsx
│   │   ├── DecoderQuiz.tsx
│   │   ├── TraceLogDrawer.tsx
│   │   ├── ActiveChainsBar.tsx
│   │   ├── JuryPopupModal.tsx
│   │   └── GhostTimeline.tsx
│   └── lib/
│       ├── types.ts
│       ├── dictionary.ts          # ~100k English words set
│       ├── filter.ts              # Filter Rule Engine
│       ├── roles.ts               # Dynamic role scheduler
│       ├── decoder.ts             # Decoder deduction engine
│       ├── prompts.ts             # 50 Handcrafted Themes
│       ├── generator.ts           # 1,000+ Algorithmic Generator
│       ├── store.ts               # Dual In-Memory & Redis storage
│       ├── queue.ts               # Concurrency & 60s lease locks
│       ├── spawner.ts             # Auto-spawner daemon
│       ├── jury.ts                # Instant Crowd Jury & troll queue
│       ├── ghosts.ts              # Hall of Ghosts archival
│       ├── events.ts              # Real-time SSE broadcaster
│       └── audio.ts               # Procedural Web Audio API sound synthesizer
└── tests/
    ├── unit/
    │   ├── filter.test.ts
    │   ├── roles.test.ts
    │   ├── themes.test.ts
    │   ├── queue.test.ts
    │   └── audio.test.ts
    └── e2e/
        ├── tier1_features.test.ts
        ├── tier2_boundaries.test.ts
        ├── tier3_interactions.test.ts
        └── tier4_application.test.ts
```
