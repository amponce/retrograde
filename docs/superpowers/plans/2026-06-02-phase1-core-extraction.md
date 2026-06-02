# Phase 1: Monorepo + `core/` Extraction — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Restructure the single-file `index.html` game into a monorepo with a platform-agnostic `core/` (pure JS) and a `web/` adapter (canvas + Web Audio + input), with **zero change to gameplay behavior**.

**Architecture:** `core/` holds all simulation state and logic with no DOM/canvas/audio/window access; it advances state and *emits sensory events*. `web/` provides a canvas renderer (reads state), a Web Audio adapter (drains events), an input adapter, and a requestAnimationFrame loop. The web shell (`index.html`, CSS, screens, PWA) stays at repo root for trivial Vercel serving.

**Tech Stack:** Plain ES modules (buildless), `node --test` for core unit tests, existing Web Audio + Canvas 2D for the web adapter.

**Spec:** `docs/superpowers/specs/2026-06-02-retrograde-real-game-design.md`

---

## Refactor conventions (read before any task)

These rules apply to every extraction task below.

1. **State object `G`.** Today the inline script uses module-scoped `let` variables. They move into a single mutable object `G` exported from `core/state.js`. Apply this rename **everywhere** as code moves into `core/` and as `web/` reads it:

   | old identifier | new |
   |---|---|
   | `p` | `G.p` |
   | `bullets` `enemies` `ebullets` `pups` `parts` `stars` `grid` `boss` `nebulae` `planet` `shootingStars` `shootTimer` | `G.bullets` … `G.shootTimer` |
   | `score` `wave` `shake` `freeze` `level` `levelWave` `phase` `nextLifeAt` `spawnTimer` `waveActive` `toSpawn` `betweenWaves` `interT` `interLabel` `interSub` `pupCycleIdx` `selectedLevel` `victoryData` `theme` `dropFlash` `pupMsg` `uiRects` | `G.<same>` |
   | `W` `H` | `G.W` `G.H` |
   | `campaign` | `G.campaign` |
   | `state` (the game-state machine string: `'start'`/`'map'`/`'play'`/…) | `G.scene` (renamed to avoid confusion with "state object") |

   `keys` (held-keys map) and all audio/MUSIC state stay in `web/` (they are platform input/audio, not simulation).

2. **Events, not direct calls.** Inside `core/`, replace every `sfx.<name>()` call with `emit('sfx', '<name>')` and every direct `shake = N` feedback cue you want the platform to own stays as `G.shake = N` (shake is read by the renderer, so it stays state). Haptics are a *new* event for mobile later; in Phase 1 only `sfx` events exist. `emit` is imported from `core/events.js`.

3. **Viewport.** `core/` never reads `canvas`. `G.W`/`G.H` are set by `setViewport(w,h)` (in `core/state.js`). The web resize handler calls it.

4. **Verify after every task.** Two gates:
   - `node --test core/` passes (once tests exist).
   - In-browser smoke test (Task list at end of each web task): `python3 -m http.server 8000` in repo root, load `http://localhost:8000/`, then start screen → play Level 1 → ship moves (mouse/keys) + auto-fires + audio plays → reach Level 2 and confirm cyan background. No console errors.

5. **No bundler.** All imports are relative ES-module paths with `.js` extensions (`import { G } from '../core/state.js'`). The web entry is `<script type="module">`.

---

## File structure (target)

```
index.html                 web shell + CSS + screen markup; <script type="module" src="/web/main.js">
manifest.webmanifest        (unchanged, root)
icon-*.png                  (unchanged, root)
vercel.json                 (unchanged, root)
sw.js                       ASSETS list updated to include /core/*.js and /web/*.js
core/
  events.js                 emit() / drainEvents()
  config.js                 WEAPONS, PUP_CYCLE, WAVES_PER_LEVEL, NUM_LEVELS, LEVEL_THEMES, LIFE_EVERY, themeFor()
  state.js                  G, createState(), resetGame(), setViewport()
  levels.js                 levelNodes(), startWave(), beginNextWave(), winLevel(), startLevel(), goMap(), openLevelSelect()
  entities.js               spawnEnemy(), spawnBoss(), enemy movement patterns
  weapons.js                fire()/tryFire(), applyPup(), pup cycle
  step.js                   advance(input, dt): movement, collisions, scoring, wave/boss progression, free-life
  events.test.js, config.test.js, weapons.test.js, levels.test.js   node --test suites
web/
  audio.js                  AudioContext lifecycle, tone()/noise(), MUSIC engine, sfx map, drains 'sfx' events
  input.js                  keyboard/mouse/touch listeners → input struct; canvasXY()
  render.js                 drawBG(), entity/HUD/screen draws, drawMap()/drawLevelSelect()/etc. (reads G)
  main.js                   imports core + adapters; resize→setViewport; rAF loop; DOM/screen-button wiring; SW registration
mobile/
  README.md                 placeholder describing Phase 2 (Expo + Skia)
```

> **Note on bulk moves:** Most code already exists in `index.html`. Tasks below cite the source region and the transformations to apply. **Move the real current code** — do not retype it from memory. Only *new* glue/interface code is shown in full.

---

### Task 0: Branch + monorepo skeleton

**Files:**
- Create: `core/.gitkeep`, `web/.gitkeep`, `mobile/README.md`

- [ ] **Step 1: Branch off main**

```bash
git checkout -b phase1-core-extraction
```

- [ ] **Step 2: Create folders + mobile placeholder**

`mobile/README.md`:
```markdown
# Retrograde — Mobile (Phase 2)

React Native app (Expo + react-native-skia + react-native-audio-api) built on the shared `core/`.
Not started yet; see docs/superpowers/specs/2026-06-02-retrograde-real-game-design.md.
```

- [ ] **Step 3: Confirm node test runner is available**

Run: `node --test --test-reporter=spec 2>&1 | head -1` (expect it to run and report 0 tests, not "unknown flag"). Requires Node ≥ 18.

- [ ] **Step 4: Commit**

```bash
git add core web mobile && git commit -m "chore: monorepo skeleton (core/ web/ mobile/)"
```

---

### Task 1: `core/events.js` — the event queue

**Files:**
- Create: `core/events.js`, `core/events.test.js`

- [ ] **Step 1: Write the failing test**

`core/events.test.js`:
```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { emit, drainEvents } from './events.js';

test('emit queues events and drain returns + clears them', () => {
  emit('sfx', 'shoot');
  emit('sfx', 'boom');
  const first = drainEvents();
  assert.deepEqual(first, [{ type: 'sfx', name: 'shoot' }, { type: 'sfx', name: 'boom' }]);
  assert.deepEqual(drainEvents(), []); // drained
});
```

- [ ] **Step 2: Run test, verify it fails**

Run: `node --test core/events.test.js`
Expected: FAIL (cannot find module / export).

- [ ] **Step 3: Implement**

`core/events.js`:
```js
// Minimal sensory-event queue. core/ pushes; the platform audio/feedback adapter drains.
let queue = [];
export function emit(type, name) { queue.push({ type, name }); }
export function drainEvents() { const out = queue; queue = []; return out; }
```

- [ ] **Step 4: Run test, verify it passes**

Run: `node --test core/events.test.js` → PASS.

- [ ] **Step 5: Commit**

```bash
git add core/events.js core/events.test.js && git commit -m "feat(core): event queue for sensory cues"
```

---

### Task 2: `core/config.js` — constants & data

**Files:**
- Create: `core/config.js`, `core/config.test.js`
- Source: `index.html` — `WEAPONS`, `PUP_CYCLE`, `WAVES_PER_LEVEL`, `NUM_LEVELS`, `LIFE_EVERY`, `LEVEL_THEMES`, `themeFor()` (find via `grep -n "const WEAPONS\|PUP_CYCLE\|WAVES_PER_LEVEL\|NUM_LEVELS\|LIFE_EVERY\|LEVEL_THEMES\|function themeFor" index.html`)

- [ ] **Step 1: Move the data into `core/config.js` and add `export` to each**

Move the real definitions verbatim; prefix each top-level binding with `export`. The file exports: `WEAPONS, PUP_CYCLE, WAVES_PER_LEVEL, NUM_LEVELS, LIFE_EVERY, LEVEL_THEMES, themeFor`.

- [ ] **Step 2: Write the test**

`core/config.test.js`:
```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { WEAPONS, NUM_LEVELS, LEVEL_THEMES, themeFor } from './config.js';

test('weapons exist for M/S/L/B', () => {
  for (const k of ['M','S','L','B']) assert.ok(WEAPONS[k], `missing ${k}`);
});
test('themeFor wraps by level and matches table', () => {
  assert.equal(themeFor(1), LEVEL_THEMES[0]);
  assert.equal(themeFor(NUM_LEVELS + 1), LEVEL_THEMES[0]); // wraps
});
```

- [ ] **Step 3: Run test → PASS**

Run: `node --test core/config.test.js`

- [ ] **Step 4: Commit**

```bash
git add core/config.js core/config.test.js && git commit -m "feat(core): extract config/data constants"
```

> The web game is NOT wired to core yet; it still runs from the inline script. Wiring happens in Task 8. Until then, the inline copies and the new modules coexist; do not delete inline code yet.

---

### Task 3: `core/state.js` — `G`, `createState`, `resetGame`, `setViewport`

**Files:**
- Create: `core/state.js`, (no separate test — covered indirectly by Task 5/6 tests)
- Source: `index.html` `resetGame()` (`grep -n "function resetGame" index.html`) and the top-level `let p, bullets, …` declaration line.

- [ ] **Step 1: Create the state module**

`core/state.js`:
```js
// Single mutable simulation-state object. Reassign its properties; never the binding.
export const G = {
  W: 560, H: 840,           // logical viewport; set by setViewport()
  scene: 'start',           // was `state`: 'start'|'map'|'levelselect'|'play'|'paused'|'victory'|'complete'|'over'
  campaign: { unlocked: 1, stars: {}, coins: 0 },
};
export function setViewport(w, h) { G.W = w; G.H = h; }
```

- [ ] **Step 2: Port `resetGame` to mutate `G`**

Move the body of the existing `resetGame()` here as `export function resetGame() { ... }`, applying the §1 rename table (`p=` → `G.p=`, `bullets=[]` → `G.bullets=[]`, `W`/`H` → `G.W`/`G.H`, etc.). `resetGame` must NOT reference `campaign` persistence — leave `G.campaign` untouched by reset.

- [ ] **Step 3: Sanity check it imports under Node**

Run: `node -e "import('./core/state.js').then(m=>{m.resetGame();console.log('p.x=',m.G.p.x,'bullets=',m.G.bullets.length)})"`
Expected: prints `p.x= 280 bullets= 0` (280 = G.W/2 with default W=560).

- [ ] **Step 4: Commit**

```bash
git add core/state.js && git commit -m "feat(core): shared state object + resetGame/setViewport"
```

---

### Task 4: `core/entities.js` + `core/levels.js`

**Files:**
- Create: `core/entities.js`, `core/levels.js`, `core/levels.test.js`
- Source: `index.html` — `levelNodes`, `startWave`, `spawnEnemy`, `spawnBoss`, `beginNextWave`, `winLevel`, `startLevel`, `goMap`, `openLevelSelect`.

- [ ] **Step 1: Move spawn logic → `core/entities.js`**

Move `spawnEnemy`, `spawnBoss`, and the enemy movement-pattern helpers verbatim; apply §1 renames; `import { G } from './state.js'`. Replace any `sfx.bossWarn()` etc. with `emit('sfx','bossWarn')` and `import { emit } from './events.js'`. Export each function.

- [ ] **Step 2: Move level/wave flow → `core/levels.js`**

Move `levelNodes, startWave, beginNextWave, winLevel, startLevel, goMap, openLevelSelect`. Apply §1 renames. `startLevel` calls `resetGame()` then sets `G.level`, `G.theme=themeFor(n)`, etc. Replace `state=` assignments with `G.scene=`. Replace `sfx.*` with `emit('sfx',...)`. `winLevel` mutates `G.campaign` and emits `emit('save')` instead of calling `saveProgress()` directly (web adapter persists). `musicStart()`/`musicStop()` are audio — replace with `emit('music','start')` / `emit('music','stop')`.

- [ ] **Step 3: Test the pure formulas**

`core/levels.test.js`:
```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { G, setViewport } from './state.js';
import { levelNodes } from './levels.js';

test('levelNodes scales with viewport and yields NUM_LEVELS nodes', () => {
  setViewport(400, 800);
  const a = levelNodes();
  assert.equal(a.length, 8);
  setViewport(400, 1200);
  const b = levelNodes();
  assert.ok(b[7].y !== a[7].y, 'node Y should scale with H');
});
```

- [ ] **Step 4: Run → PASS**

Run: `node --test core/levels.test.js`

- [ ] **Step 5: Commit**

```bash
git add core/entities.js core/levels.js core/levels.test.js && git commit -m "feat(core): entities + level/wave flow"
```

---

### Task 5: `core/weapons.js`

**Files:**
- Create: `core/weapons.js`, `core/weapons.test.js`
- Source: `index.html` — `fire`/`tryFire`, `applyPup`, `dropPup`, `pupKind`, `PUP_CYCLE` usage.

- [ ] **Step 1: Move weapon logic**

Move `tryFire`, `fire`, `applyPup`, `dropPup`, `pupKind`. Apply §1 renames; `import { G } from './state.js'`, `import { emit } from './events.js'`, `import { WEAPONS, PUP_CYCLE } from './config.js'`. Replace `sfx.shoot/laser/bomb/pup/shieldUp()` with `emit('sfx', …)`. Bullet creation (`mkB`) moves here too (it mutates `G.bullets`).

- [ ] **Step 2: Test the never-downgrade rule + power cap**

`core/weapons.test.js`:
```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { G, resetGame } from './state.js';
import { applyPup } from './weapons.js';

test('same-weapon pickup raises power to cap 4; switching keeps power', () => {
  resetGame();                       // starts weapon 'M', power 1
  applyPup('M'); applyPup('M'); applyPup('M'); applyPup('M'); applyPup('M');
  assert.equal(G.p.power, 4);        // capped
  applyPup('S');                     // switch type
  assert.equal(G.p.weapon, 'S');
  assert.equal(G.p.power, 4);        // NOT reset to 1 (never-downgrade)
});
```

- [ ] **Step 3: Run → PASS**, then **Commit**

```bash
node --test core/weapons.test.js
git add core/weapons.js core/weapons.test.js && git commit -m "feat(core): weapons + powerups (never-downgrade)"
```

---

### Task 6: `core/step.js` — the simulation tick

**Files:**
- Create: `core/step.js`
- Source: `index.html` — the `update(dt)` function body (movement, collisions, scoring, wave progression, boss AI, free-life, shield regen). `grep -n "function update" index.html`.

- [ ] **Step 1: Define the input contract + advance()**

`core/step.js` (header shown in full; body is the moved `update` logic):
```js
import { G } from './state.js';
import { spawnEnemy, spawnBoss } from './entities.js';
import { tryFire } from './weapons.js';
import { startWave, beginNextWave, winLevel } from './levels.js';
// input: { left, right, up, down, fire, mouseActive, mx, my, grab, tx, ty }
export function advance(input, dt) {
  // ... moved body of update(dt), with §1 renames and:
  //   - keyboard reads use input.left/right/up/down instead of keys[...]
  //   - mouse branch uses input.mouseActive / input.mx / input.my
  //   - touch branch uses input.grab / input.tx / input.ty
  //   - firing: if ((input.fire || input.mouseActive) && G.p.fireCd<=0) tryFire();
  //   - all sfx.* already emit() via the functions they call
}
```

- [ ] **Step 2: Apply renames + input substitution to the moved body.** The old `update` read `keys[...]`, `fireHeld`, `autoFire`, `mouseCtrl`, `p._mx`, etc. Those become fields of `input` (the web input adapter builds the struct). Movement easing math is unchanged.

- [ ] **Step 3: Smoke-import under Node**

Run: `node -e "import('./core/step.js').then(()=>console.log('step imports ok'))"`
Expected: `step imports ok` (no missing-export errors). This validates the core module graph resolves end to end.

- [ ] **Step 4: Commit**

```bash
git add core/step.js && git commit -m "feat(core): advance(input,dt) simulation tick"
```

---

### Task 7: `web/audio.js`, `web/input.js`, `web/render.js`

**Files:**
- Create: `web/audio.js`, `web/input.js`, `web/render.js`
- Source: corresponding regions of `index.html`.

- [ ] **Step 1: `web/audio.js`** — move `ensureAudio`, `tone`, `noise`, the `sfx` map, the full MUSIC engine, and the visibility/statechange/pageshow handlers. Export `ensureAudio()` and `applyAudioEvents(events)`:
```js
// drain core events each frame
export function applyAudioEvents(events){
  for (const e of events){
    if (e.type==='sfx' && sfx[e.name]) sfx[e.name]();
    else if (e.type==='music' && e.name==='start') musicStart();
    else if (e.type==='music' && e.name==='stop') musicStop();
    else if (e.type==='save') saveProgress();   // persistence lives in the adapter
  }
}
```
`saveProgress`/`loadProgress` (localStorage) move here; `loadProgress()` seeds `G.campaign` at startup. `musicTick()` is called from the loop (Task 8).

- [ ] **Step 2: `web/input.js`** — move keyboard/mouse/touch listeners and `canvasXY`. Maintain internal `keys`, `mouseCtrl`, `fireHeld`, drag state. Export `buildInput()` returning the input struct `advance()` expects, and `attachInput(canvas, getScene)` to register listeners. Tapping non-play scenes still routes through `handleTap` (which calls core `levels.js` functions). `ensureAudio` is called on first gesture (import from audio.js).

- [ ] **Step 3: `web/render.js`** — move `drawBG`, all entity draws, HUD, `drawMap/drawLevelSelect/drawVictory/drawComplete/drawPaused`, `render()`. Apply §1 renames (read `G.*`, `G.scene`, `G.theme`). Export `render(ctx)` and the per-scene draws. `uiRects` (hit-test rects) is written to `G.uiRects` here and read by input's `handleTap`.

- [ ] **Step 4: Commit** (still not wired; verified in Task 8)

```bash
git add web/audio.js web/input.js web/render.js && git commit -m "feat(web): canvas/audio/input adapters over core"
```

---

### Task 8: `web/main.js` + `index.html` rewire + `sw.js`

**Files:**
- Create: `web/main.js`
- Modify: `index.html` (replace inline `<script>` block with module include; keep CSS + screen markup), `sw.js` (ASSETS list)

- [ ] **Step 1: Write `web/main.js`**

```js
import { G, resetGame, setViewport } from '../core/state.js';
import { advance } from '../core/step.js';
import { drainEvents } from '../core/events.js';
import { render } from './render.js';
import { ensureAudio, applyAudioEvents, loadProgress, musicTick } from './audio.js';
import { attachInput, buildInput, wireScreenButtons } from './input.js';

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
function resize(){
  const r = canvas.getBoundingClientRect();
  const dpr = Math.min(window.devicePixelRatio||1, 3);
  canvas.width = Math.max(1, Math.round(r.width*dpr));
  canvas.height = Math.max(1, Math.round(r.height*dpr));
  setViewport(Math.round(r.width), Math.round(r.height));
  ctx.setTransform(dpr,0,0,dpr,0,0);
}
addEventListener('resize', resize);
addEventListener('orientationchange', resize);

loadProgress();              // seed G.campaign from localStorage
attachInput(canvas, () => G.scene);
wireScreenButtons(ensureAudio); // LAUNCH/RETRY buttons

const STEP = 1/60; let acc = 0, last = 0;
function frame(t){
  const dt = Math.min(0.05, (t - last)/1000 || 0); last = t;
  if (G.scene === 'play'){
    if (G.freeze > 0){ G.freeze -= dt; }
    else { acc += dt; while (acc >= STEP){ advance(buildInput(), STEP); acc -= STEP; } }
  }
  applyAudioEvents(drainEvents());   // play queued sfx/music
  musicTick();
  render(ctx);
  requestAnimationFrame(frame);
}
resize(); resetGame(); requestAnimationFrame(frame);

if ('serviceWorker' in navigator) addEventListener('load', () => navigator.serviceWorker.register('/sw.js').catch(()=>{}));
```

- [ ] **Step 2: Rewire `index.html`** — delete the entire inline `<script>…</script>` game block; replace with `<script type="module" src="/web/main.js"></script>`. Keep all CSS and the screen/canvas/button markup. The non-play scene draws are canvas-based, so no HTML changes beyond the script tag.

- [ ] **Step 3: Update `sw.js` ASSETS + bump cache**

Add `'/web/main.js','/web/render.js','/web/audio.js','/web/input.js','/core/events.js','/core/config.js','/core/state.js','/core/levels.js','/core/entities.js','/core/weapons.js','/core/step.js'` to the `ASSETS` array; bump `CACHE` to `'retrograde-v7'`.

- [ ] **Step 4: Full parity verification (in-browser)**

Run: `python3 -m http.server 8000` (repo root, background).
In a browser at `http://localhost:8000/` (first clear any old SW: DevTools → Application → unregister, or use the console snippet):
- [ ] No console errors on load.
- [ ] Start screen → LAUNCH → map renders.
- [ ] Start Level 1 → keyboard (WASD/arrows) moves ship; Space fires.
- [ ] Mouse: move cursor → ship follows + auto-fires; shots hit enemies (score rises).
- [ ] Audio: SFX on fire/explosions; music plays.
- [ ] Resize window narrow (<640px) → fullscreen layout; ship still controllable.
- [ ] Beat/skip to Level 2 (unlock via `localStorage.setItem('retrograde_save', JSON.stringify({unlocked:8,stars:{},coins:0}))` then reload) → background is cyan (different from Level 1 violet).
- [ ] Game over → RETRY → map.

- [ ] **Step 5: Commit**

```bash
git add index.html web/main.js sw.js && git commit -m "feat(web): wire core+adapters, retire inline monolith"
```

---

### Task 9: Cleanup, run all tests, open PR

- [ ] **Step 1: Confirm no orphaned inline code remains** — `grep -n "function update\|function drawBG\|const WEAPONS" index.html` should return nothing (all moved). If anything remains, remove it.

- [ ] **Step 2: Run the full core suite**

Run: `node --test core/`
Expected: all suites PASS.

- [ ] **Step 3: Re-run the in-browser parity checklist from Task 8 Step 4** one more time end-to-end.

- [ ] **Step 4: Push branch + open PR**

```bash
git push -u origin phase1-core-extraction
gh pr create --title "Phase 1: monorepo + core/ extraction (no behavior change)" \
  --body "Extracts platform-agnostic core/ from the monolith; web/ becomes an adapter. Behavior verified identical in-browser. Sets up the shared core for the Phase 2 RN spike. Spec: docs/superpowers/specs/2026-06-02-retrograde-real-game-design.md"
```

---

## Self-review notes

- **Spec coverage:** monorepo layout ✓ (Task 0, file structure); `core/` modules ✓ (Tasks 1–6); event boundary ✓ (§2, Tasks 1/5/6/7); web adapters ✓ (Task 7); buildless + PWA preserved ✓ (Task 8); viewport via `setViewport` ✓ (Tasks 3/8); Phase-1 success = parity ✓ (Task 8 Step 4, Task 9). Phases 2–5 intentionally out of scope.
- **Type consistency:** `G` properties, `emit(type,name)`/`drainEvents()`, `advance(input,dt)`, `applyAudioEvents(events)`, `buildInput()`, `setViewport(w,h)`, `themeFor(n)` are used consistently across tasks.
- **Known deviation from template:** bulk-move steps cite source regions instead of re-pasting existing code, by design (§ "Note on bulk moves") — re-typing 1300 lines would introduce errors; the executor moves the real code with the listed transformations.
