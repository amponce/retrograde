# Phase 2a: Seeded RNG + Daily Beat (web) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the `core/` simulation deterministic from a seed, add a "Daily Beat" mode (one seeded procedural run per day, identical for everyone) with a shareable run card — all in the existing web app, no backend.

**Architecture:** A tiny seeded PRNG (`core/rng.js`) replaces every `Math.random()` inside `core/`, so a run is reproducible from `seedRNG(seed)`. `core/daily.js` derives a deterministic seed + lightweight level config from the date. `levels.js` gains `startDaily(config)`; daily runs end in a new `'dailyend'` scene that the web shows as a DOM run-card with share + local best. Campaign runs reseed with a fresh random seed each play so they stay varied. `web/` render/audio randomness stays `Math.random()` (platform cosmetics, not simulation).

**Tech Stack:** Plain ES modules (buildless), `node --test` for core, existing canvas/Web Audio web adapter, Web Share API + `localStorage` for the card.

**Spec:** `docs/superpowers/specs/2026-06-02-retrograde-mobile-edge-design.md`

---

## Conventions (read before any task)

1. **Determinism scope.** Only `core/` randomness is seeded. The simulation (`core/state.js`, `entities.js`, `levels.js`, `step.js`) must draw from `rnd()`. Leave `Math.random()` in `web/render.js` (flame flicker, shake jitter, menu nebula drift) and `web/audio.js` (noise buffers) untouched — they are platform render/audio noise, not game state.
2. **Seed before reset.** `resetGame()` itself draws RNG (starfield). Any run start must call `seedRNG(seed)` **before** `resetGame()` so the whole run replays identically. `startDaily()` does this internally; campaign runs seed in the web adapter before `startLevel()`.
3. **Date stays in the web adapter.** `core/` never calls `new Date()`. The web adapter computes `new Date()` and passes it to `dailySeed(date)`.
4. **Verify after every task:** `node --test core/*.test.js` passes; web tasks add an in-browser check at `http://localhost:8000/` (run `python3 -m http.server 8000` in repo root). Because the service worker (`retrograde-v7`) caches modules, after editing files do a cache purge before reloading: in DevTools console run
   `navigator.serviceWorker.getRegistrations().then(rs=>rs.forEach(r=>r.unregister()));caches.keys().then(ks=>ks.forEach(k=>caches.delete(k)))` then hard reload.
5. **No bundler.** Relative ES-module imports with `.js` extensions.

---

## File structure (target)

```
core/
  rng.js          NEW: seedRNG(seed), rnd()            — seeded PRNG (mulberry32)
  rng.test.js     NEW
  daily.js        NEW: dailySeed(date), dailyConfig(seed)
  daily.test.js   NEW
  state.js        MOD: import rnd; Math.random→rnd; add G.daily, G.dailySeed init
  entities.js     MOD: import rnd; Math.random→rnd
  step.js         MOD: import rnd; Math.random→rnd; gameOver() daily branch
  levels.js       MOD: import rnd; Math.random→rnd; add startDaily(); startLevel sets G.daily=false; winLevel() daily branch
  levels.test.js  MOD: add startDaily / daily-end coverage
web/
  input.js        MOD: wireScreenButtons wires DAILY button; handleTap seeds campaign runs
  main.js         MOD: syncScreens handles 'dailyend' card (populate, share, local best)
index.html        MOD: add DAILY button to #startScreen + #dailyCard overlay markup
```

> Daily Beat in Phase 2a is intentionally light: seeded run, theme + difficulty derived from the seed, otherwise the normal wave→boss flow. No "one attempt per day" enforcement and no global leaderboard (Phase 5). Local best per seed only.

---

### Task 1: `core/rng.js` — seeded PRNG

**Files:**
- Create: `core/rng.js`, `core/rng.test.js`

- [ ] **Step 1: Write the failing test**

`core/rng.test.js`:
```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { seedRNG, rnd } from './rng.js';

test('rnd is in [0,1) and same seed reproduces the same sequence', () => {
  seedRNG(12345);
  const a = [rnd(), rnd(), rnd(), rnd(), rnd()];
  for (const v of a) { assert.ok(v >= 0 && v < 1, `out of range: ${v}`); }
  seedRNG(12345);
  const b = [rnd(), rnd(), rnd(), rnd(), rnd()];
  assert.deepEqual(a, b);
});

test('different seeds produce different sequences', () => {
  seedRNG(1); const a = rnd();
  seedRNG(2); const b = rnd();
  assert.notEqual(a, b);
});
```

- [ ] **Step 2: Run test, verify it fails**

Run: `node --test core/rng.test.js`
Expected: FAIL (cannot find module / export).

- [ ] **Step 3: Implement**

`core/rng.js`:
```js
// Deterministic PRNG (mulberry32). Seed once per run; rnd() replaces Math.random()
// inside core/ so a run is reproducible from its seed (Daily Beat + fair leaderboards).
let _s = 0;
export function seedRNG(seed) { _s = seed >>> 0; }
export function rnd() {
  _s = (_s + 0x6D2B79F5) | 0;
  let t = Math.imul(_s ^ (_s >>> 15), 1 | _s);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}
```

- [ ] **Step 4: Run test, verify it passes**

Run: `node --test core/rng.test.js` → PASS.

- [ ] **Step 5: Commit**

```bash
git add core/rng.js core/rng.test.js && git commit -m "feat(core): seeded PRNG (mulberry32)"
```

---

### Task 2: Replace `Math.random()` in `core/` with `rnd()`

**Files:**
- Modify: `core/state.js`, `core/entities.js`, `core/step.js`, `core/levels.js`
- Create: `core/seeded-run.test.js`

- [ ] **Step 1: Add the import + swap calls in `core/state.js`**

At the top of `core/state.js`, add after the existing config import:
```js
import { rnd } from './rng.js';
```
Replace the two RNG lines in `resetGame()`:
```js
  G.stars=[]; for(let i=0;i<110;i++)G.stars.push({x:rnd()*G.W,y:rnd()*G.H,z:rnd(),tw:rnd()*6});
```
and
```js
  G.shootingStars=[]; G.shootTimer=2+rnd()*4;
```

- [ ] **Step 2: Swap calls in `core/entities.js`**

Add `import { rnd } from './rng.js';` at the top. In `spawnEnemy`, replace the four `Math.random()` uses:
```js
  const x=60+rnd()*(G.W-120);
```
and
```js
    pat:spec.pat, t:rnd()*6, baseX:x, hp:carrier?3+Math.floor(G.wave/2):spec.hp,
    maxhp:carrier?3+Math.floor(G.wave/2):spec.hp, carrier, fireT:0.6+rnd()*1.2,
    vy:carrier?60:90, amp:40+rnd()*60, sp:1.2+rnd()*1.2, flash:0
```

- [ ] **Step 3: Swap calls in `core/step.js`**

Add `import { rnd } from './rng.js';` at the top (alongside the other imports). Replace each `Math.random()`:
- `boom()`: `const a=rnd()*6.28,s=sp*(0.3+rnd());` and `life:0.4+rnd()*0.5,age:0,color,r:1.5+rnd()*3`
- starfield wrap: `if(s.y>G.H){s.y=-4;s.x=rnd()*G.W;}`
- nebulae wrap: `if(n.y-n.r>G.H){n.y=-n.r;n.x=rnd()*G.W;}`
- planet wrap: `if(G.planet.y-G.planet.r>G.H){G.planet.y=-G.planet.r;G.planet.x=80+rnd()*(G.W-160);}`
- shooting stars: `if(G.shootTimer<=0){G.shootTimer=3+rnd()*5;` and `const sx=rnd()*G.W, ang=Math.PI*0.25+rnd()*0.3;`
- enemy recharge: `if(e.fireT<=0 && !e.charged){e.charged=true; e.fireT=1.1+rnd()*1.4;}`

- [ ] **Step 4: Swap call in `core/levels.js`**

Add `import { rnd } from './rng.js';` at the top. In `startWave`, replace the spawn-delay jitter:
```js
    G.toSpawn.push({pat, delay: i*0.42 + rnd()*0.2, hp: 1+Math.floor(n/3), tier:'grunt'});
```

- [ ] **Step 5: Confirm no `Math.random()` remains in `core/`**

Run: `grep -rn "Math.random()" core/`
Expected: no output.

- [ ] **Step 6: Write the reproducibility test**

`core/seeded-run.test.js`:
```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { seedRNG } from './rng.js';
import { G, resetGame, setViewport } from './state.js';
import { spawnEnemy } from './entities.js';

function spawnUnderSeed(seed) {
  seedRNG(seed); setViewport(560, 840); resetGame();
  spawnEnemy({ pat: 'dive', hp: 1, tier: 'grunt' });
  const e = G.enemies[0];
  return { x: e.x, t: e.t, fireT: e.fireT, amp: e.amp, sp: e.sp };
}

test('same seed reproduces identical enemy spawn', () => {
  assert.deepEqual(spawnUnderSeed(777), spawnUnderSeed(777));
});

test('different seed changes the spawn', () => {
  assert.notDeepEqual(spawnUnderSeed(777), spawnUnderSeed(778));
});
```

- [ ] **Step 7: Run tests, verify they pass**

Run: `node --test core/*.test.js`
Expected: all suites PASS (rng + seeded-run + the existing 5).

- [ ] **Step 8: Commit**

```bash
git add core/state.js core/entities.js core/step.js core/levels.js core/seeded-run.test.js
git commit -m "feat(core): draw simulation RNG from the seeded generator"
```

---

### Task 3: `core/daily.js` — daily seed + config

**Files:**
- Create: `core/daily.js`, `core/daily.test.js`

- [ ] **Step 1: Write the failing test**

`core/daily.test.js`:
```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { dailySeed, dailyConfig } from './daily.js';
import { NUM_LEVELS } from './config.js';

test('dailySeed is deterministic per calendar day and varies across days', () => {
  const a = dailySeed(new Date(2026, 5, 2));   // Jun 2 2026 (month is 0-based)
  const b = dailySeed(new Date(2026, 5, 2));
  const c = dailySeed(new Date(2026, 5, 3));
  assert.equal(a, b);
  assert.notEqual(a, c);
  assert.ok(Number.isInteger(a) && a >= 0);
});

test('dailyConfig derives theme + difficulty from the seed (pure, no RNG draw)', () => {
  const cfg = dailyConfig(123456);
  assert.equal(cfg.seed, 123456);
  assert.ok(cfg.theme >= 0 && cfg.theme < NUM_LEVELS);
  assert.ok(cfg.difficulty >= 3 && cfg.difficulty <= 7);
  assert.deepEqual(dailyConfig(123456), cfg); // stable
});
```

- [ ] **Step 2: Run test, verify it fails**

Run: `node --test core/daily.test.js`
Expected: FAIL (cannot find module / export).

- [ ] **Step 3: Implement**

`core/daily.js`:
```js
import { NUM_LEVELS } from './config.js';

// Deterministic seed for a given calendar day (local date). Hashed so consecutive
// days don't produce near-identical seeds. The web adapter passes new Date().
export function dailySeed(date) {
  const y = date.getFullYear(), m = date.getMonth() + 1, d = date.getDate();
  let h = (y * 10000 + m * 100 + d) >>> 0;
  h = Math.imul(h ^ (h >>> 16), 0x45d9f3b);
  h = Math.imul(h ^ (h >>> 16), 0x45d9f3b);
  return (h ^ (h >>> 16)) >>> 0;
}

// Pure: derive the day's level shape from the seed WITHOUT consuming the rnd stream,
// so the gameplay stream still starts fresh at seedRNG(seed) in startDaily().
export function dailyConfig(seed) {
  return {
    seed,
    theme: seed % NUM_LEVELS,            // 0..NUM_LEVELS-1 (background mood)
    difficulty: 3 + (seed % 5),          // level-equivalent 3..7 (scales waves/hp/boss)
  };
}
```

- [ ] **Step 4: Run test, verify it passes**

Run: `node --test core/daily.test.js` → PASS.

- [ ] **Step 5: Commit**

```bash
git add core/daily.js core/daily.test.js && git commit -m "feat(core): daily seed + config derivation"
```

---

### Task 4: Daily run flow in `core/` (`startDaily`, daily end → `'dailyend'`)

**Files:**
- Modify: `core/state.js` (init `G.daily`, `G.dailySeed`), `core/levels.js` (`startDaily`, `startLevel` flag, `winLevel` branch), `core/step.js` (`gameOver` branch)
- Modify: `core/levels.test.js`

- [ ] **Step 1: Add daily fields to the state object**

In `core/state.js`, in the `G` literal, add after `uiRects: {},`:
```js
  daily: false,             // true while a Daily Beat run is active
  dailySeed: 0,             // the seed of the active daily run
```

- [ ] **Step 2: Add `startDaily` and flag campaign runs in `core/levels.js`**

In `core/levels.js`, update the imports to include `seedRNG`, `LEVEL_THEMES`, and the daily config:
```js
import { G, resetGame } from './state.js';
import { emit } from './events.js';
import { rnd, seedRNG } from './rng.js';
import { themeFor, NUM_LEVELS, WAVES_PER_LEVEL, LEVEL_THEMES } from './config.js';
```
In `startLevel`, mark it as a non-daily run — change the first line of its body to also clear the daily flag:
```js
function startLevel(n){
  resetGame(); G.daily=false; G.level=n; G.levelWave=0; G.scene='play';
  G.theme=themeFor(n); G.nebulae.forEach((nb,i)=>nb.c=G.theme.neb[i%G.theme.neb.length]);
  emit('music','start'); beginNextWave();
}
```
Add `startDaily` after `startLevel`:
```js
function startDaily(config){
  seedRNG(config.seed);                 // seed BEFORE resetGame so the whole run replays
  resetGame();
  G.daily=true; G.dailySeed=config.seed;
  G.level=config.difficulty; G.levelWave=0; G.scene='play';
  G.theme=LEVEL_THEMES[config.theme % LEVEL_THEMES.length];
  G.nebulae.forEach((nb,i)=>nb.c=G.theme.neb[i%G.theme.neb.length]);
  emit('music','start'); beginNextWave();
}
```
In `winLevel`, add a daily branch as the first lines (daily wins end the run at the card, not the campaign victory/unlock flow):
```js
function winLevel(){
  if(G.daily){ G.scene='dailyend'; emit('music','stop'); emit('sfx','life'); return; }
  G.scene='victory'; emit('music','stop');
```
Add `startDaily` to the export list:
```js
export { levelNodes, goMap, openLevelSelect, startLevel, startDaily, beginNextWave, winLevel, startWave };
```

- [ ] **Step 3: Add the daily branch to `gameOver` in `core/step.js`**

In `core/step.js`, replace `gameOver`:
```js
function gameOver(){
  if(G.daily){ G.scene='dailyend'; emit('sfx','over'); emit('music','stop'); return; }
  G.scene='over'; emit('sfx','over'); emit('music','stop');
}
```

- [ ] **Step 4: Write the test**

In `core/levels.test.js`, add:
```js
import { G } from './state.js';
import { startDaily, winLevel } from './levels.js';
import { dailyConfig } from './daily.js';

test('startDaily seeds the run and sets daily state + theme', () => {
  const cfg = dailyConfig(424242);
  startDaily(cfg);
  assert.equal(G.daily, true);
  assert.equal(G.dailySeed, 424242);
  assert.equal(G.scene, 'play');
  assert.equal(G.level, cfg.difficulty);
});

test('winLevel during a daily run ends at the dailyend scene (no campaign victory)', () => {
  startDaily(dailyConfig(5));
  winLevel();
  assert.equal(G.scene, 'dailyend');
});
```
(The existing `levels.test.js` already imports `test`/`assert` and `setViewport`/`levelNodes`; only add the new imports that aren't present, and the two tests.)

- [ ] **Step 5: Run tests, verify they pass**

Run: `node --test core/*.test.js`
Expected: all PASS.

- [ ] **Step 6: Commit**

```bash
git add core/state.js core/levels.js core/step.js core/levels.test.js
git commit -m "feat(core): Daily Beat run flow (startDaily, dailyend scene)"
```

---

### Task 5: Web — Daily Beat button, run card, share, seed campaign runs

**Files:**
- Modify: `index.html` (DAILY button in `#startScreen`; `#dailyCard` overlay markup)
- Modify: `web/input.js` (wire DAILY button; seed campaign runs in `handleTap`)
- Modify: `web/main.js` (`syncScreens` shows/populates the daily card; share + local best)

- [ ] **Step 1: Add the DAILY button and run-card markup to `index.html`**

In `#startScreen`, immediately after the LAUNCH button (`<button class="btn" id="startBtn">▶ LAUNCH</button>`), add:
```html
      <button class="btn magenta" id="dailyBtn">★ DAILY BEAT</button>
```
After the `#overScreen` `</div>` (the closing div of the over screen, before `<div class="touch" id="touch">`), add the daily card overlay:
```html
  <div class="screen hide" id="dailyCard">
    <div class="screen-inner">
      <div class="title" style="font-size:clamp(28px,6vw,44px);text-shadow:0 0 10px var(--cyan),0 0 30px var(--magenta)">DAILY BEAT</div>
      <div class="small" id="dailyDate">—</div>
      <div class="stat" id="dailyScore">SCORE 0</div>
      <div class="small" id="dailyBest">BEST 0</div>
      <button class="btn" id="dailyShareBtn">⇪ SHARE</button>
      <button class="btn magenta" id="dailyAgainBtn">↻ PLAY AGAIN</button>
      <div class="small"><a id="dailyMenuBtn" style="color:#9fb8d0;cursor:pointer">← menu</a></div>
    </div>
  </div>
```

- [ ] **Step 2: Wire the DAILY button + seed campaign runs in `web/input.js`**

Update the imports at the top of `web/input.js`:
```js
import { G } from '../core/state.js';
import { tryFire } from '../core/weapons.js';
import { goMap, openLevelSelect, startLevel, startDaily } from '../core/levels.js';
import { seedRNG } from '../core/rng.js';
import { dailySeed, dailyConfig } from '../core/daily.js';
import { ensureAudio, pauseMusic, resumeMusic, MUSIC } from './audio.js';
```
In `handleTap`, the level-select PLAY branch must seed a **fresh random** campaign run so campaign play stays varied (and isn't stuck replaying a prior daily seed). Replace that line:
```js
    if(G.uiRects.play && inRect(x,y,G.uiRects.play)){ seedRNG((Math.random()*0x100000000)>>>0); startLevel(G.selectedLevel); return; }
```
Add a helper near the top of the module (after the state vars) to start today's daily:
```js
export function startDailyToday(){ ensureAudio(); startDaily(dailyConfig(dailySeed(new Date()))); }
```
In `wireScreenButtons`, wire the daily button (alongside the existing start/over wiring):
```js
  const dailyBtn=document.getElementById('dailyBtn');
  if(dailyBtn){ dailyBtn.onclick=()=>{ startDailyToday(); }; }
```

- [ ] **Step 3: Show + populate the daily card in `web/main.js`**

In `web/main.js`, add the card elements next to the existing screen refs:
```js
const dailyCard = document.getElementById('dailyCard');
const dailyDate = document.getElementById('dailyDate');
const dailyScore = document.getElementById('dailyScore');
const dailyBest = document.getElementById('dailyBest');
```
Add a small helper for the per-seed local best (above `syncScreens`):
```js
function dailyBestFor(seed){ try{ return +(localStorage.getItem('retrograde_daily_'+seed)||0); }catch(e){ return 0; } }
function recordDailyBest(seed, score){
  try{ const b=dailyBestFor(seed); if(score>b)localStorage.setItem('retrograde_daily_'+seed, String(score)); }catch(e){}
}
```
Replace `syncScreens` to also handle the `dailyend` scene:
```js
let cardShownForSeed = null;
function syncScreens(){
  startScreen.classList.toggle('hide', G.scene!=='start');
  if(G.scene==='over'){
    overScore.textContent='SCORE '+G.score;
    overWave.textContent='Level '+G.level+' · Wave '+G.levelWave+'/'+WAVES_PER_LEVEL;
    overScreen.classList.remove('hide');
  } else {
    overScreen.classList.add('hide');
  }
  if(G.scene==='dailyend'){
    if(cardShownForSeed!==G.dailySeed){            // populate once per run end
      recordDailyBest(G.dailySeed, G.score);
      dailyDate.textContent = new Date().toLocaleDateString(undefined,{month:'short',day:'numeric'});
      dailyScore.textContent = 'SCORE '+G.score;
      dailyBest.textContent = 'BEST '+dailyBestFor(G.dailySeed);
      cardShownForSeed = G.dailySeed;
    }
    dailyCard.classList.remove('hide');
  } else {
    dailyCard.classList.add('hide');
    cardShownForSeed = null;
  }
}
```

- [ ] **Step 4: Wire the card buttons (share / play again / menu) in `web/main.js`**

Import the daily starter and goMap at the top of `web/main.js` (extend the existing input/levels imports):
```js
import { attachInput, buildInput, wireScreenButtons, startDailyToday } from './input.js';
import { goMap } from '../core/levels.js';
```
After `wireScreenButtons();` near the bottom, add:
```js
const dailyShareBtn = document.getElementById('dailyShareBtn');
const dailyAgainBtn = document.getElementById('dailyAgainBtn');
const dailyMenuBtn = document.getElementById('dailyMenuBtn');
dailyShareBtn.onclick = async () => {
  const dateStr = new Date().toLocaleDateString(undefined,{month:'short',day:'numeric'});
  const text = `RETROGRADE — Daily Beat ${dateStr}: ${G.score} ◎  ${location.origin}`;
  try { if(navigator.share) await navigator.share({ title:'RETROGRADE Daily Beat', text }); else { await navigator.clipboard.writeText(text); dailyShareBtn.textContent='COPIED ✓'; } }
  catch(e){}
};
dailyAgainBtn.onclick = () => startDailyToday();
dailyMenuBtn.onclick = () => goMap();
```

- [ ] **Step 5: Browser verification — Daily Beat happy path**

Start the server (repo root): `python3 -m http.server 8000` (background).
In the browser at `http://localhost:8000/` (purge the SW first per Conventions §4, then hard reload):
- [ ] No console errors on load.
- [ ] Start screen shows both **▶ LAUNCH** and **★ DAILY BEAT**.
- [ ] Click DAILY BEAT → a run starts (`G.scene==='play'`), background theme matches the day's config, music plays.
- [ ] Verify determinism: in the console run
  `(async()=>{const{G}=await import('/core/state.js');return {daily:G.daily,seed:G.dailySeed,level:G.level}})()`
  — `daily:true`, a stable `seed`, `level` in 3..7.
- [ ] Play until death (or let the ship get hit) → the **DAILY BEAT card** appears with date, SCORE, BEST.
- [ ] Click **SHARE** → native share sheet opens (or button shows "COPIED ✓" on desktop).
- [ ] Click **PLAY AGAIN** → a fresh daily run of the *same* seed starts.
- [ ] Click **← menu** → returns to the map.
- [ ] Click a campaign level → PLAY twice; confirm the two campaign runs differ (enemy spawn positions are not identical) — i.e. campaign reseeds and is NOT stuck on the daily seed.

- [ ] **Step 6: Commit**

```bash
git add index.html web/input.js web/main.js
git commit -m "feat(web): Daily Beat mode + shareable run card"
```

---

### Task 6: Update the service worker asset list

**Files:**
- Modify: `sw.js`

- [ ] **Step 1: Add the new core modules + bump the cache**

In `sw.js`, add to the `ASSETS` array:
```js
  './core/rng.js',
  './core/daily.js',
```
and bump the cache version:
```js
const CACHE = 'retrograde-v8';
```

- [ ] **Step 2: Verify offline asset resolution**

Run: `python3 -m http.server 8000` (if not already running), then:
`for f in core/rng.js core/daily.js; do curl -s -o /dev/null -w "%{http_code} $f\n" http://localhost:8000/$f; done`
Expected: `200 core/rng.js` and `200 core/daily.js`.

- [ ] **Step 3: Commit**

```bash
git add sw.js && git commit -m "chore(pwa): cache rng.js + daily.js, bump to v8"
```

---

### Task 7: Final verification + PR

- [ ] **Step 1: Full core suite**

Run: `node --test core/*.test.js`
Expected: all suites PASS (rng, daily, seeded-run, levels, config, events, weapons).

- [ ] **Step 2: Confirm no stray `Math.random()` in `core/`**

Run: `grep -rn "Math.random()" core/`
Expected: no output.

- [ ] **Step 3: Re-run the Task 5 browser checklist end-to-end** once more (with a fresh SW purge).

- [ ] **Step 4: Branch, push, open PR**

```bash
git checkout -b phase2a-seeded-rng-daily-beat   # if not already on a feature branch
git push -u origin phase2a-seeded-rng-daily-beat
gh pr create --title "Phase 2a: seeded RNG + Daily Beat (web)" \
  --body "Seeds core/ RNG (mulberry32) so runs are reproducible; adds Daily Beat (one seeded run/day, same for everyone) with a shareable run card + per-seed local best. Validates the retention/virality hook on web before the native bet. Campaign runs reseed for variety. Spec: docs/superpowers/specs/2026-06-02-retrograde-mobile-edge-design.md"
```

> Note: start the feature branch (Step 4's `git checkout -b`) **before** Task 1 if your workflow forbids committing to `main`. The commits in Tasks 1–6 then land on that branch.

---

## Self-review notes

- **Spec coverage:** seeded RNG ✓ (Tasks 1–2); `core/daily.js` seed+config ✓ (Task 3); Daily Beat mode ✓ (Task 4 `startDaily` + `dailyend`); shareable run card + local best ✓ (Task 5); validate-on-web posture ✓ (entire plan is web-only, no RN). Procedural-for-free ✓ (daily reuses spawn primitives, no authored content). Out of scope per spec: global leaderboard, one-attempt enforcement, native — none included.
- **Type consistency:** `seedRNG(seed)`/`rnd()`, `dailySeed(date)`/`dailyConfig(seed)→{seed,theme,difficulty}`, `startDaily(config)`, `G.daily`/`G.dailySeed`, scene string `'dailyend'`, `startDailyToday()` are used consistently across core tasks and the web wiring.
- **Determinism boundary:** only `core/` randomness swapped to `rnd()`; `web/render.js` + `web/audio.js` `Math.random()` deliberately untouched (Task 2 Step 5 grep is scoped to `core/`).
- **Known nuance:** campaign reseeds with a `Math.random()`-derived seed in the web adapter (Task 5 Step 2) — using `Math.random()` in `web/` is allowed; it only seeds the deterministic core stream, keeping campaign varied while daily stays fixed.
```
