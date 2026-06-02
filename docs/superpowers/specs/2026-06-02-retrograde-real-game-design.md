# RETROGRADE — Prototype → Real Game: Design

**Date:** 2026-06-02
**Status:** Approved (design); pending spec review
**Author:** Aaron Ponce + Claude

## Background

RETROGRADE is a neon-synthwave 2D space shooter currently shipping as a single-file HTML5 canvas PWA (`index.html`, ~1300 lines) with a procedural Web Audio soundtrack, deployed static on Vercel. The prototype is polished and well-received. We are turning it into a real, shippable game with more content and a native iOS presence.

## Goals

- Keep the existing **web/canvas** game alive as the live, shareable, fast-iteration version.
- Build a parallel **React Native** app as the native product, shipped to the **Apple App Store via Xcode**.
- Add lasting depth: **level variety**, **enemy progression**, and a **database-backed leaderboard**.
- Do all of this without maintaining two divergent copies of the gameplay.

## Non-Goals

- Rewriting the game from scratch in Swift/SpriteKit.
- Replacing the web version.
- Android / Play Store (deferred; the architecture leaves the door open).
- Online multiplayer.

## Core Strategy

Extract a **platform-agnostic JavaScript game core** that both platforms consume through thin adapters. Gameplay is written once; only rendering, audio, and input differ per platform.

```
retrograde/
  core/     shared, pure JS game logic (no DOM / canvas / Web Audio / window)
  web/      current canvas game, refactored into an adapter over core/
  mobile/   new Expo + react-native-skia app, an adapter over core/
```

### The boundary rule

`core/` is pure simulation. It holds state and advances it; it **never** calls a platform API. Everything sensory is expressed as an **emitted event** that a platform adapter consumes.

Example: today `fire()` calls `sfx.shoot()` directly. In `core/`, `fire()` pushes `{type:'sfx', name:'shoot'}` onto an event queue. Each platform's audio adapter drains the queue and plays the sound however it can (Web Audio on web, react-native-audio-api on mobile). The same pattern covers screen shake, haptics, and score popups.

## Architecture — `core/`

```
core/
  config.js     WEAPONS, PUP_CYCLE, WAVES_PER_LEVEL, NUM_LEVELS, LEVEL_THEMES (data only)
  state.js      the mutable game-state object G (player, bullets, enemies, ebullets, pups, particles, stars, boss, score, etc.)
  levels.js     level + wave + enemy-by-progress definitions  (where new variety lives)
  entities.js   spawn waves / enemies / boss, movement patterns
  weapons.js    fire(), applyPup()
  step.js       advance(G, input, dt) -> mutates G, pushes events; the per-tick simulation
  events.js     tiny event queue: {type:'sfx',name} | {type:'shake'} | {type:'haptic'} | ...
```

- `advance(G, input, dt)` is the single entry point per tick. `input` is a normalized struct produced by the platform input adapter; `dt` is delta time.
- `core` takes a viewport `{w, h}` (set on resize) so the existing relative-coordinate layout (`W/2`, `H-120`, `W*0.25`, …) keeps working on any screen.
- No `Math.random()`/`Date.now()` constraints beyond current usage; RNG stays as-is for now.

## Per-platform adapters (thin)

| Concern | `web/` | `mobile/` |
|---|---|---|
| Render (reads `G`) | canvas 2D `ctx` | react-native-skia |
| Audio (drains events) | Web Audio (current engine) | react-native-audio-api |
| Input (produces input state) | mouse / touch / keyboard | react-native-gesture-handler |
| Loop | `requestAnimationFrame` | Skia frame callback / reanimated |
| Storage (progress) | `localStorage` | AsyncStorage |

### Mobile stack

Expo (managed) + react-native-skia (renderer) + react-native-audio-api (Web Audio API impl, lets the procedural soundtrack port nearly 1:1) + reanimated (frame loop) + react-native-gesture-handler (input). Builds through Xcode → App Store.

## Roadmap (sub-projects, in order)

Each later sub-project gets its own spec/plan cycle. This document specifies **Phase 1** in full; Phases 2–5 are scoped but not yet detailed.

1. **Foundation — monorepo + extract `core/`** *(this spec)*. Restructure into `core/ web/ mobile/`; pull pure logic out of the monolith; the web game runs identically on top of `core/`.
2. **RN spike — Skia renderer over `core/`.** Minimal Expo app drawing one live wave at 60fps with audio. Make-or-break; de-risks the native bet.
3. **Content — level variety + enemy progression.** Written once in `core/levels.js`; both platforms inherit it.
4. **Leaderboard — backend + DB + UI.** Serverless API + database, score submission + display.
5. **iOS packaging → Xcode → App Store submission.**

## Phase 1 — detailed scope

**In scope:**
- Introduce the monorepo layout (`core/`, `web/`, `mobile/` placeholder).
- Extract DOM/canvas/audio-free logic from `index.html` into `core/` modules per the breakdown above.
- Convert direct `sfx.*` / shake calls inside logic into emitted events; web audio adapter drains them.
- Refactor `web/` into: canvas renderer (reads `G`), Web Audio adapter (drains events), input adapter, rAF loop — all over `core/`.
- Keep the PWA (manifest, service worker) working for the web build.

**Out of scope for Phase 1:** any RN code beyond a placeholder folder, new gameplay content, leaderboard, Capacitor/native packaging.

### Phase 1 success criterion

The current web game runs **identically** — same feel, audio, levels, controls, per-level backgrounds, mouse/touch/keyboard support — but now as a canvas adapter over an extracted, DOM-free `core/`. This is a pure restructure with **no behavior change**, re-verified in-browser (start screen → play a level → mouse follow + auto-fire → audio → level 2 background differs).

### Risks

- **Hidden coupling:** the monolith may mix rendering and logic more than expected. Mitigation: extract incrementally, re-verifying the web game runs after each module is pulled out.
- **Event boundary churn:** converting direct audio calls to events touches many call sites. Mitigation: keep the event queue dead simple; one event type per existing `sfx.*` call.
- **Build tooling:** moving from a single static file to a monorepo with a `web/` build. Mitigation: keep `web/` buildless if possible (plain ES modules served statically, as today) so Vercel deploy stays trivial.

## Decisions

- **`web/` stays buildless** — `core/` and `web/` are plain native ES modules served statically, so the zero-build Vercel deploy and the existing service worker stay simple. (If module sprawl ever makes this painful we can add Vite later, but not in Phase 1.) `mobile/` uses Expo's bundler, which is independent of `web/`.

## Open questions (deferred to their phase)

- Leaderboard backend/DB choice (Phase 4) — deferred.
- Anti-cheat posture for client-submitted scores (Phase 4) — deferred; likely accept casual-leaderboard risk with basic validation.
