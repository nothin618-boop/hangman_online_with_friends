# E2E Test Infra: WHISPER

## Test Philosophy
- Opaque-box, requirement-driven derived strictly from `ORIGINAL_REQUEST.md`. No dependency on implementation design.
- Methodology: Category-Partition + Boundary Value Analysis (BVA) + Pairwise Combinatorial Testing + Real-World Workload Testing.
- Target: Validate all user-facing guarantees (R1 Drop-in & Roles, R2 Filter Rule Engine, R3 Instant Crowd Jury & Moderation, R4 Single-Screen Cybernetic UI & Procedural Audio, R5 High-Throughput Queue, Seed Library & Hall of Ghosts).

## Feature Inventory & Test Mapping
| # | Feature | Source (requirement) | Tier 1 | Tier 2 | Tier 3 |
|---|---------|----------------------|:------:|:------:|:------:|
| 1 | Zero-Auth Drop-In | ORIGINAL_REQUEST §R1 | 5 | 5 | ✓ |
| 2 | Atomic 60s Lease Lock & Reclaim | ORIGINAL_REQUEST §R1, §R5 | 5 | 5 | ✓ |
| 3 | Dynamic Role Scheduling (Shifter / Decoder) | ORIGINAL_REQUEST §R1 | 5 | 5 | ✓ |
| 4 | Single-Word Replacement & Structure Retention | ORIGINAL_REQUEST §R1 | 5 | 5 | ✓ |
| 5 | Decoder 4-Candidate Guess (+10 bonus / -1 strike) | ORIGINAL_REQUEST §R1 | 5 | 5 | ✓ |
| 6 | Alphabet Regex Lock (/^[a-zA-Z]+$/) | ORIGINAL_REQUEST §R2 | 5 | 5 | ✓ |
| 7 | Word Length Lock (< 12 Chars, 1..11) | ORIGINAL_REQUEST §R2 | 5 | 5 | ✓ |
| 8 | English Dictionary Validation (~100k Words) | ORIGINAL_REQUEST §R2 | 5 | 5 | ✓ |
| 9 | No Repeats History Invariant | ORIGINAL_REQUEST §R2 | 5 | 5 | ✓ |
| 10 | 5 Secret Banned Words Trap & Siren Alarm | ORIGINAL_REQUEST §R2 | 5 | 5 | ✓ |
| 11 | 3-Strike Signal Bar Health & Destruction | ORIGINAL_REQUEST §R2 | 5 | 5 | ✓ |
| 12 | Crowd Jury "Report Sabotage" & 3-Peer Dispatch | ORIGINAL_REQUEST §R3 | 5 | 5 | ✓ |
| 13 | 2/3 Jury Consensus, 1-Hop Rewind & Troll Queue | ORIGINAL_REQUEST §R3 | 5 | 5 | ✓ |
| 14 | Cybernetic Single-Screen Terminal UI & Scanlines | ORIGINAL_REQUEST §R4 | 5 | 5 | ✓ |
| 15 | Animated 60s Countdown Bar (<15s Pulse) | ORIGINAL_REQUEST §R4 | 5 | 5 | ✓ |
| 16 | Collapsible Trace Log Drawer (Last 3 Hops) | ORIGINAL_REQUEST §R4 | 5 | 5 | ✓ |
| 17 | My Active Chains Tray (Live Real-Time Updates) | ORIGINAL_REQUEST §R4 | 5 | 5 | ✓ |
| 18 | Procedural Web Audio API Sound FX & Global Mute | ORIGINAL_REQUEST §R4 | 5 | 5 | ✓ |
| 19 | 50 Handcrafted Themes + 1,000+ Algorithmic Combinations | ORIGINAL_REQUEST §R5 | 5 | 5 | ✓ |
| 20 | Hall of Ghosts Archival & Permalinks (/ghost/:id) | ORIGINAL_REQUEST §R5 | 5 | 5 | ✓ |

## Test Architecture
- Test runner: Vitest / Playwright (`pnpm test` / `pnpm test:e2e`).
- Location: `tests/e2e/` and `tests/unit/`.
- Format: Clean, isolated test specs evaluating HTTP APIs, state mutations, and browser DOM interactions.
- Pass/Fail Semantics: Exit code 0, 100% assertions pass, zero unhandled errors.

## Real-World Application Scenarios (Tier 4)
| # | Scenario | Features Exercised | Complexity |
|---|----------|--------------------|------------|
| 1 | Full Chain Lifecycle from Spawn to 100 Hops Victory | F1, F2, F3, F4, F5, F8, F9, F11, F19, F20 | High |
| 2 | Hostile Sabotage Attack Defeated by Instant Crowd Jury | F1, F3, F4, F12, F13, F17 | High |
| 3 | Filter Defense Stress Test: Banned Trap Word & Chain Destruction | F1, F4, F6, F7, F8, F9, F10, F11, F20 | Medium |
| 4 | Multi-Player Concurrent Intercept Race & Lease Expiration Reclaim | F1, F2, F3, F15, F17 | High |
| 5 | Milestone Decennial Decoder Deduction with +10 Bonus Leap | F1, F3, F5, F11, F15, F16, F19 | Medium |
| 6 | Hall of Ghosts Permanent Receipt & Timeline Diff Verification | F1, F4, F5, F11, F16, F20 | Medium |

## Coverage Thresholds
- Tier 1: >=5 test cases per feature (>= 100 test cases)
- Tier 2: >=5 boundary and corner cases per feature (>= 100 test cases)
- Tier 3: Pairwise coverage of major feature combinations (>= 20 test cases)
- Tier 4: >= 6 realistic multi-user application scenarios
- **Total Minimum Expected**: >= 226 test assertions
