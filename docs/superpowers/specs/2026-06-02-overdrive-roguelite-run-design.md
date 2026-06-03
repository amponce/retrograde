# RETROGRADE — "OVERDRIVE" Roguelite Run Mode: Design

**Date:** 2026-06-02
**Status:** Approved (design); pending spec review
**Author:** Aaron Ponce + Claude
**Builds on:** `2026-06-02-retrograde-real-game-design.md` (core/web/mobile split), `2026-06-02-retrograde-mobile-edge-design.md` (seeded RNG + Daily Beat + monetization posture).

## Background

Retrograde is a neon-synthwave shmup whose signature is **music-as-gameplay** (enemies fire on the beat; waves escalate the procedural track). It's polished but thin on reasons to keep playing. Competitive research across arcade shmups (Sky Force), roguelite/bullet-heaven shooters (Nova Drift, Vampire Survivors), rhythm-action (Just Shapes & Beats, Thumper), and mobile retention systems surfaced a clear, underexplored white space: **a music-driven roguelite shooter** — where the horde, the escalation, and the beat are the same system. No one is doing the "space Vampire-Survivors with a soundtrack you fight to."

This design adds **OVERDRIVE**, a roguelite "Run" mode, as the new centerpiece — alongside the existing Campaign and Daily Beat — and a small set of cross-cutting upgrades (telegraphed on-beat fire, groove scoring, juice pack) that also improve the base game.

## Decided direction (the three forks)

1. **Hybrid roguelite**, not a full bullet-heaven pivot. The player keeps aiming/firing the four weapons and **dodging on the beat** — preserving the rhythm-dodge skill that is Retrograde's actual differentiator — while gaining run structure: escalating waves, on-beat upgrade drafts, build synergies, and a meta ladder.
2. **Rhythm is rewarded, not required.** Enemy fire is always fairly telegraphed, so a player can survive by pure visual dodging (casual-safe, works muted). On-beat play is *strictly better* (groove multiplier, Sync-dodge i-frames). Wide funnel, high ceiling — the Sky Force fairness model.
3. **Free to Level 5 / Run free forever.** OVERDRIVE + Daily Beat + Campaign L1–5 are free permanently (the retention/virality engine). A later one-time unlock sells Campaign L6–8 + extra ships/cards + an Overdrive difficulty + cosmetic skins. **Never gate the Run, never sell power.**

## The mode: OVERDRIVE

### Core loop
```
drop into a seeded track ▸ wave ▸ DRAFT (1-of-3) ▸ wave ▸ DRAFT ▸ … ▸ elite/boss ▸ repeat, hotter
```
- **Endless, seeded.** The run is generated from a seed (so Daily Beat can run an OVERDRIVE seed and leaderboards stay fair — built on the Phase-2a seeded RNG).
- **Heat.** Each wave raises a single `heat` value that drives BPM, spawn density, enemy HP, and fire-window tightness together — so going deeper literally makes the track harder *and* better. Heat = the difficulty curve and the music intensity, unified.
- **Draft.** Between waves, present 3 upgrade cards; the choice **locks on the next downbeat** (one-bar fill animation). Run ends on death → share card.

### The three rhythm verbs (the "rewarded, not required" layer)
- **READ** — enemy fire is telegraphed with a strict two-color contract: a **cyan windup** appears one beat early, the **magenta lethal** bullet launches on the downbeat. Always dodgeable on sight; works with audio off. (Also retrofits the Campaign.)
- **GROOVE** — on-beat kills build a breakable **×multiplier** (the existing HUD equalizer bars become the meter). Drives score and run currency. Breaks on taking damage or a long off-beat gap.
- **SYNC** — an optional on-beat dodge/dash → invulnerability frames + a flash. Off-beat dodge still moves you (no i-frames). Getting good = getting good at the music.

### Builds (variety + "one more run")
- Drafts offer two card kinds:
  - **Weapon evolutions** — the four weapons (machine/spread/laser/bombs) evolve into beat-bound supers (auto-quantized fire, bass-pulsing beam, on-beat shotgun). Extends the existing never-downgrade power tiers.
  - **Passive synergy cards**, tagged by family (rhythm / overdrive / defense / utility). Collecting N of a tag triggers an evolution. Examples: *"on-beat kills pierce," "bass drop clears bullets," "groove ≥×4 → shields regen," "every 4th beat = free volley."*
- **Resonance ladder** (meta-progression): run currency buys permanent unlocks — new cards into the draft pool, ships, small stat nodes. **Losses still progress you** (Sky Force's retention spine). *(v1-lite; see scope.)*

### Scoring & the shareable artifact
- Run score = waves survived × groove performance, with an **accuracy grade** (on-beat hit/dodge ratio), Perfect%, and peak groove chain.
- The **share card** is ranked on **accuracy**, not raw power — keeps Daily/leaderboard fair and pay-to-win-proof. It's the viral unit (vertical card: grade, Perfect%, groove peak, waves, the day's seed/waveform).

## Scope

### v1 (first shippable slice — solo-dev-sized)
- **OVERDRIVE Run mode:** endless seeded waves + the heat curve + elite/boss punctuation.
- **Telegraphed on-beat fire** (READ) — the two-color contract; also applied to Campaign.
- **GROOVE multiplier** (read + reward), surfaced on the HUD.
- **SYNC on-beat dodge** (basic: i-frames on downbeat dodge).
- **Drafts** with ~12–15 cards + 1–2 evolutions per weapon.
- **Juice pack:** beat-locked hitstop, additive bloom + bullet-readability pass, debris bursts, music-driven camera breathe. (Sells the first 10 seconds and the trailer.)
- **Accuracy-graded share card** for a run; OVERDRIVE entry on the menu.

### Deferred (later phases / packs)
- Deep Resonance meta tree (v1 ships a minimal currency + a few unlocks at most).
- Multiple ships / beat-archetypes.
- Branching setlists, stage gimmick hazards, Ikaruga-style polarity (Hard-mode/expansion).
- Global leaderboard backend (the Daily Beat leaderboard remains its own later phase).

## Architecture mapping (onto the existing engine)

`core/` stays pure; `web/` renders & feeds input; the same core powers the future RN app.

**`core/` additions**
- `core/run.js` — `startRun(seed)`, the endless wave/heat loop, run state on `G` (`G.run = {heat, wave, cards, groove, accuracy, currency}`), and the `'overdrive'` run flavor of the existing scene flow. Reuses `startWave`/`spawnEnemy`/boss.
- `core/cards.js` — the draft card pool (data) + `rollDraft(seed)` (seeded 1-of-3) + `applyCard(card)` (mutates player/run passives) + synergy-tag counting → evolution triggers.
- `core/step.js` — groove multiplier logic (award on on-beat kills), Sync-dodge + i-frames, heat-driven scaling; reads new `input.onBeat` / `input.dodge`.
- `core/state.js` — `G.run`, groove/accuracy fields, telegraph state on enemies.
- Telegraph: enemies already "charge" then fire via the beat; v1 makes the windup a **visible, one-beat, color-coded** state that `core` exposes and `web` renders.

**Input contract gains** (web → core): `input.onBeat` (true within the downbeat window — the audio adapter owns the beat clock and sets this, same pattern as the existing `input.musicOn`) and `input.dodge` (Sync action).

**`web/` additions**
- `web/render.js` — telegraph rendering (cyan windup), groove meter, juice pack (hitstop via `G.freeze` beat-locked, additive bloom with a reserved danger hue for enemy bullets, debris, camera breathe), draft screen, run share card.
- `web/audio.js` — sets `input.onBeat` around each downbeat; haptics later (RN).
- `web/input.js` — the dodge/Sync gesture; OVERDRIVE menu entry; draft selection.

**Seeded RNG (Phase 2a)** is the foundation: drafts, heat, and spawns all draw from the seeded stream so an OVERDRIVE Daily seed is identical and fair for everyone.

## Non-goals
- No full bullet-heaven auto-fire pivot (decided against — keep aiming/dodging).
- No energy gates, pay-for-continues, or selling power (rating = UA budget). An optional once-per-run reward-ad "Encore" is the only ad surface considered, and not in v1.
- No literal bring-your-own-music (licensing); "seed = track" reframe only.
- No RN code in this cycle (OVERDRIVE ships on web first to validate, per the established posture); the shared core keeps the native door open.
- No global leaderboard backend in v1.

## Open questions (settle during planning)
1. **Heat curve shape & run length** — target run length (3–8 min?) and how aggressively heat ramps; where elites/bosses punctuate. Tunable, decide initial values in the plan.
2. **Draft cadence** — every wave, or every N waves? And does pausing for the draft break the music (duck vs. continue the loop under the card screen)?
3. **Groove break rules** — exactly what breaks the multiplier (damage only? off-beat kills? a timeout?) — affects difficulty and feel.
4. **SYNC input on mobile** — dedicated dodge button vs. double-tap vs. a flick; must coexist with drag-to-fly. (Web v1 can use a key; the mobile gesture is a planning decision.)
5. **Initial card list** — the concrete ~12–15 v1 cards + which weapon evolutions ship first.
