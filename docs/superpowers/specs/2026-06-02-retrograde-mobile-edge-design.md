# RETROGRADE — Mobile Edge & Daily Beat: Design

**Date:** 2026-06-02
**Status:** Approved (design); pending spec review
**Author:** Aaron Ponce + Claude
**Builds on:** `docs/superpowers/specs/2026-06-02-retrograde-real-game-design.md` (the core/web/mobile extraction, Phase 1, now merged to `main`).

## Background

Phase 1 extracted a platform-agnostic `core/` simulation out of the single-file web prototype; `web/` is now a thin canvas/audio/input adapter over it. The web game runs identically on top of `core/`.

The open question this design answers is **product**, not architecture: *a polished neon shmup is a hard paid sell — what gives the mobile app an edge, and a reason to keep playing?* The answer is to stop treating this as "a shooter with music" and treat it as **a game where the music IS the gameplay**, then build a free retention/virality loop on top of that and monetize curated content later.

## Strategic posture

- **Retention first, monetize later.** Optimize for daily-active + shareability now; add monetization only once people demonstrably return.
- **Validate on web before committing to native.** The first edge (Daily Beat) ships in the existing web app — free, instant, real signal — before weeks are spent on the native build.
- **Procedural for free, curated for paid.** Hand-made content is a treadmill that kills solo devs. The *free* layer is procedural (infinite, zero marginal cost); the *paid* layer is a curated campaign shipped when ready, never on a schedule.

## Product pillars

| Pillar | What it is | Role |
|---|---|---|
| **Beat-combat** *(already built)* | Enemies charge and fire on the beat; each wave cranks the procedural synthwave higher; bass drops flash the screen | Core identity — keep & amplify |
| **Daily Beat** | One **seeded** procedural track/level per day, identical for everyone → leaderboard + shareable run card | Retention + virality (free) |
| **Beat haptics** | Bass/kick/drop felt through the phone, synced to the music | The native-only "wow" — the web build physically cannot do this |
| **Free trial → unlock** | Levels 1–5 free; a single one-time IAP unlocks the full curated campaign (new enemies, bosses, challenges) | Monetization (added last) |

## What changes in `core/` (shared by web + mobile)

The edge rides the existing `core/` + adapter split. Three additions to `core/`; everything else is platform adapters.

### 1. `core/rng.js` — seeded deterministic PRNG

A tiny generator (e.g. mulberry32). Every `Math.random()` currently used in `core/` (enemy spawns, movement jitter, power-up drops, starfield, shooting stars) draws from this instead. `startRun(seed)` sets the seed at the start of a run.

**Scope:** seed **world generation + enemy behavior** so the *challenge* is identical for everyone on a given seed. We do **not** implement full input-replay determinism in this phase (that's a later ghost-replay nicety). Player skill still decides the score.

**Why foundational:** Daily Beat ("everyone plays the same run today") and fair leaderboards both require reproducible-from-seed simulation. This also sets up replay/ghosts later.

### 2. `core/daily.js` — procedural level generator

`seed → level spec` (theme, wave count, enemy mix, intensity curve, boss tier). Daily Beat asks `core/` to *generate* a one-off level from the day's seed, reusing the existing spawn primitives in `entities.js`/`levels.js` with generated parameters. Authored campaign levels are unchanged; Daily reuses the same machinery with generated inputs.

The daily seed is derived deterministically from the date (e.g. `YYYYMMDD`), so every player worldwide gets the same generated level on the same day.

### 3. `haptic` event type

Extends the existing event queue: `{type:'haptic', name:'kick'|'snare'|'drop'|'hit'|'hurt'}`.

- **Beat haptics** (`kick`/`snare`/`drop`) fire from the beat scheduler, which lives in each platform's **audio adapter** (where `onMusicBeat` already lives on web).
- **Impact haptics** (`hit`/`hurt`) emit from `core/` alongside the existing `sfx` events.
- Web adapter ignores haptics (optional `navigator.vibrate` fallback); mobile maps them to `expo-haptics`.

## `mobile/` adapters (new; mirrors `web/`, reuses `core/` untouched)

| Concern | `web/` (built) | `mobile/` (new) |
|---|---|---|
| Render (reads `G`) | canvas2d `render.js` | `react-native-skia` |
| Audio (drains events) | Web Audio `audio.js` | `react-native-audio-api` (Web-Audio-compatible → MUSIC engine ports ~1:1) |
| Input (produces input struct) | `input.js` | `react-native-gesture-handler` |
| Loop | `requestAnimationFrame` | Skia frame callback |
| Haptics (drains `haptic` events) | ignored / `navigator.vibrate` | `expo-haptics` |
| Storage (progress) | `localStorage` | `AsyncStorage` |

Stack: Expo (managed) + react-native-skia + react-native-audio-api + reanimated (frame loop) + react-native-gesture-handler + expo-haptics. Builds through Xcode → App Store. The Skia render port and the audio port are the real labor; `core/` carries over as-is plus the three additions above.

## Roadmap (sub-projects, in order)

Each gets its own spec/plan cycle. Phase numbers continue from the foundation spec (Phase 1 = the merged extraction).

| Phase | What | Why this order |
|---|---|---|
| **2a — Core: seeded RNG + Daily Beat (on web)** | `core/rng.js`, `core/daily.js`, a Daily Beat mode + shareable run card in the **web** app | Pure JS, fully testable, instantly visible on Vercel. Proves the hook for ~free **before** native. **← immediate next step.** |
| **3 — RN spike (make-or-break)** | Tiny Expo app: one generated Daily Beat level, Skia render + `react-native-audio-api` music + beat haptics. No menus. | De-risks the native bet on a real device |
| **4 — Full mobile app** | All screens / campaign / input / storage as native adapters over the proven core | Build the real app only after the spike passes |
| **5 — Leaderboard + global Daily** | Backend + DB; run card → global ranks | Social depth once there's an audience |
| **6 — Monetization** | Free L1–5 + one-time full-campaign unlock (StoreKit / RevenueCat); an `entitlement` concept gates campaign content in `core/` | Last — only after retention is proven |

## Phase 3 — RN spike pass/fail gate

The spike is make-or-break for the native bet. On a **real device**, all four must hold:

1. `react-native-audio-api` runs the look-ahead MUSIC scheduler with **no audible glitches or beat drift** ← the single riskiest unknown; the native bet hinges here.
2. Skia holds **stable 60fps** with a full wave (player + ~20 enemies + bullets + particles + boss).
3. Beat-synced **haptics feel tight** (acceptable latency).
4. `core/advance` + input + event pipeline run unchanged on Hermes.

**Fallback if #1 fails:** pre-rendered audio stems triggered on the beat instead of live procedural synthesis; if even that can't hold sync, reconsider the native renderer/runtime.

## Non-goals (this design)

- Building any of Phases 3–6 now. This design's actionable scope is **Phase 2a** (seeded RNG + Daily Beat in the web app); later phases are scoped, not detailed.
- Full input-replay determinism / ghost replays (later; only world+enemy RNG is seeded now).
- Many-SKU pack store (launch with a single full-campaign unlock; discrete packs only if it sells).
- Online multiplayer; Android (deferred, architecture leaves the door open).

## Open questions (deferred to their phase)

- Daily Beat global leaderboard backend/DB + anti-cheat posture (Phase 5) — deferred; likely accept casual-leaderboard risk with basic validation, helped by the seeded-run reproducibility.
- Exact share-card format and share-sheet API per platform (Phase 2a web: `canvas.toBlob` + Web Share API; mobile: Skia snapshot + native share) — settled when Phase 2a is planned.
- Procedural generator tuning (how much a daily level may vary) — settled during Phase 2a planning.
