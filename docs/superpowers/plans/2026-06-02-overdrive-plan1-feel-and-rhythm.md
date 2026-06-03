# OVERDRIVE Plan 1 — Feel & Rhythm Pass — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the rhythm a readable, rewarding skill across the existing game: telegraphed on-beat enemy fire (READ), a groove multiplier on on-beat kills (GROOVE), and beat-locked game-feel (hitstop, on-beat debris, camera breathe) — shippable value for Campaign + Daily, and the foundation the OVERDRIVE run mode (Plan 2) stands on.

**Architecture:** Pure groove logic lives in `core/groove.js` (unit-tested); `core/step.js` calls it on kills/damage/tick and applies kill-score × multiplier + beat-locked hitstop. The web audio adapter exposes whether we're inside a downbeat window (`onBeatNow()`); the input adapter feeds it to the sim as `input.onBeat` (same pattern as the existing `input.musicOn`). The renderer draws the telegraph, the reserved enemy-bullet danger treatment, the groove HUD meter, and the kick-driven camera breathe.

**Tech Stack:** Plain ES modules (buildless), `node --test` for core, canvas Web Audio web adapter. All builds on the existing event/`G`/`advance(input,dt)` architecture.

**Spec:** `docs/superpowers/specs/2026-06-02-overdrive-roguelite-run-design.md`

---

## Conventions (read before any task)

1. **Determinism untouched.** Groove/onBeat are gameplay state; keep core pure (no DOM/audio/Date). `core/groove.js` draws no randomness.
2. **The beat clock stays in `web/audio.js`.** Core never computes beat timing; it only reads `input.onBeat`, which the web adapter derives from the audio clock.
3. **Two-color danger contract.** Telegraph windup = **cyan** (`#22e1ff`). Lethal enemy bullets = a reserved **red-orange** danger hue (`#ff3b2f`) with a white-hot core + dark outline. (Deviation from the spec's "magenta": the Spread weapon already uses magenta `#ff2d95`, so magenta is reserved for the *player*; red-orange keeps enemy danger unambiguous and matches the current `#ff5a2a` bullets.)
4. **Verify after every task:** `node --test core/*.test.js` passes; web/render tasks add an in-browser check at `http://localhost:8000/` (`python3 -m http.server 8000` in repo root). Purge the service worker before reloading after edits: in DevTools console run
   `navigator.serviceWorker.getRegistrations().then(rs=>rs.forEach(r=>r.unregister()));caches.keys().then(ks=>ks.forEach(k=>caches.delete(k)))` then hard reload. (The browser-harness tab must be foreground for the rAF loop to run.)
5. **No bundler.** Relative ES-module imports with `.js` extensions.

---

## File structure (target)

```
core/
  groove.js        NEW: grooveKill/grooveHit/grooveTick/grooveMult over G.groove
  groove.test.js   NEW
  state.js         MOD: G.groove + G.onBeat init (literal + resetGame)
  step.js          MOD: set G.onBeat from input; groove hooks on kill/damage/tick; kill-score × mult; beat-locked hitstop; on-beat debris
web/
  audio.js         MOD: track lastBeatAt; export onBeatNow()
  input.js         MOD: buildInput() adds onBeat: onBeatNow()
  render.js        MOD: enemy telegraph (cyan windup); enemy-bullet danger treatment; groove ×N HUD meter; kick-driven camera breathe
sw.js              MOD: cache core/groove.js, bump cache
```

---

### Task 1: `core/groove.js` — groove multiplier logic

**Files:**
- Create: `core/groove.js`, `core/groove.test.js`

- [ ] **Step 1: Write the failing test**

`core/groove.test.js`:
```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { G, resetGame, setViewport } from './state.js';
import { grooveKill, grooveHit, grooveTick, grooveMult } from './groove.js';

test('on-beat kills raise the multiplier, capped at 8', () => {
  setViewport(560, 840); resetGame();
  assert.equal(grooveMult(), 1);
  grooveKill(true); grooveKill(true);          // chain 2 -> 1 + floor(2/2) = 2
  assert.equal(grooveMult(), 2);
  for (let i = 0; i < 30; i++) grooveKill(true); // chain >> cap
  assert.equal(grooveMult(), 8);
});

test('off-beat kills do not raise the multiplier', () => {
  resetGame();
  grooveKill(false); grooveKill(false);
  assert.equal(grooveMult(), 1);
});

test('taking damage breaks the chain', () => {
  resetGame();
  grooveKill(true); grooveKill(true); grooveKill(true); grooveKill(true);
  assert.ok(grooveMult() > 1);
  grooveHit();
  assert.equal(grooveMult(), 1);
});

test('chain decays after the window with no on-beat kills', () => {
  resetGame();
  grooveKill(true); grooveKill(true);
  assert.ok(grooveMult() > 1);
  grooveTick(3.0);                              // > DECAY window
  assert.equal(grooveMult(), 1);
});
```

- [ ] **Step 2: Run test, verify it fails**

Run: `node --test core/groove.test.js`
Expected: FAIL (cannot find module `./groove.js`, and `G.groove` undefined).

- [ ] **Step 3: Implement `core/groove.js`**

```js
import { G } from './state.js';

// Groove = the on-beat kill multiplier. On-beat kills build a chain; the chain decays
// if you stop landing on-beat kills, and breaks entirely when you take damage.
const CAP = 8;        // max multiplier
const DECAY = 2.5;    // seconds without an on-beat kill before the chain resets

export function grooveMult() { return G.groove.mult; }
export function grooveKill(onBeat) {
  if (!onBeat) return;                          // off-beat kills score, but don't build groove
  G.groove.chain++;
  G.groove.t = DECAY;
  G.groove.mult = Math.min(CAP, 1 + Math.floor(G.groove.chain / 2));
}
export function grooveHit() { G.groove.chain = 0; G.groove.mult = 1; G.groove.t = 0; }
export function grooveTick(dt) {
  if (G.groove.chain > 0) {
    G.groove.t -= dt;
    if (G.groove.t <= 0) { G.groove.chain = 0; G.groove.mult = 1; }
  }
}
```

- [ ] **Step 4: Add `G.groove` init so the module has state to operate on**

In `core/state.js`, in the `G` literal add after `uiRects: {},`:
```js
  onBeat: false,            // set each tick from input.onBeat (is this sim step inside a beat window?)
  groove: { mult: 1, chain: 0, t: 0 },
```
And in `resetGame()`, after the `G.score=0; ...` line, add:
```js
  G.groove={mult:1, chain:0, t:0}; G.onBeat=false;
```

- [ ] **Step 5: Run test, verify it passes**

Run: `node --test core/groove.test.js` → PASS (4 tests).

- [ ] **Step 6: Commit**

```bash
git add core/groove.js core/groove.test.js core/state.js
git commit -m "feat(core): groove multiplier (on-beat kill chain)"
```

---

### Task 2: Wire groove + on-beat scoring + hitstop into `core/step.js`

**Files:**
- Modify: `core/step.js`

- [ ] **Step 1: Import groove + set `G.onBeat` from input**

At the top of `core/step.js`, add to the imports:
```js
import { grooveKill, grooveHit, grooveTick, grooveMult } from './groove.js';
```
In `advance(input, dt)`, as the FIRST line of the body (before the starfield loop), add:
```js
  G.onBeat = !!input.onBeat;
```

- [ ] **Step 2: Tick groove decay each frame**

In `advance`, find the timers-decay area near the end where `if(G.shake>0)G.shake=...` lives, and add right before it:
```js
  grooveTick(dt);
```

- [ ] **Step 3: Apply multiplier + groove + beat-locked hitstop + on-beat debris in `killEnemy`**

Replace the existing `killEnemy`:
```js
function killEnemy(e,silent){
  const idx=G.enemies.indexOf(e); if(idx>=0)G.enemies.splice(idx,1);
  addScore(e.carrier?50:10); boom(e.x,e.y,e.carrier?'#ffd23a':'#ff2d95',e.carrier?20:12,e.carrier?260:200);
  if(!silent)emit('sfx','boom'); addShake(e.carrier?4:2);
  if(e.carrier)dropPup(e.x,e.y);
}
```
with:
```js
function killEnemy(e,silent){
  const idx=G.enemies.indexOf(e); if(idx>=0)G.enemies.splice(idx,1);
  const ob=G.onBeat;
  addScore(Math.round((e.carrier?50:10)*grooveMult()));   // groove multiplies kill score
  grooveKill(ob);                                          // on-beat kills build the chain
  // beefier, brighter debris on on-beat kills (the trailer money-shot)
  boom(e.x,e.y,e.carrier?'#ffd23a':'#ff2d95',Math.round((e.carrier?20:12)*(ob?1.6:1)),(e.carrier?260:200)*(ob?1.2:1));
  if(ob||e.carrier)G.freeze=Math.max(G.freeze, e.carrier?0.06:0.035); // beat-locked hitstop on significant / on-beat kills
  if(!silent)emit('sfx','boom'); addShake(e.carrier?4:2);
  if(e.carrier)dropPup(e.x,e.y);
}
```

- [ ] **Step 4: Break the chain on damage in `hurtPlayer`**

In `hurtPlayer`, add as the FIRST line of the body:
```js
function hurtPlayer(){
  grooveHit();                       // any hit (even on shield) breaks your groove
```
(keep the rest unchanged.)

- [ ] **Step 5: Boss kill — multiplier + groove + a chunky hitstop**

Replace `killBoss`:
```js
function killBoss(){
  boom(G.boss.x,G.boss.y,'#ffd23a',40,360); boom(G.boss.x,G.boss.y,'#ff2d95',30,300);
  addShake(14); emit('sfx','bossKill');
  addScore(300+G.boss.tier*200); G.boss=null;
  winLevel();
}
```
with:
```js
function killBoss(){
  const tier=G.boss.tier;
  boom(G.boss.x,G.boss.y,'#ffd23a',40,360); boom(G.boss.x,G.boss.y,'#ff2d95',30,300);
  addShake(14); emit('sfx','bossKill'); G.freeze=Math.max(G.freeze,0.12);
  addScore(Math.round((300+tier*200)*grooveMult())); grooveKill(G.onBeat); G.boss=null;
  winLevel();
}
```

- [ ] **Step 6: Smoke-run the sim under Node (no throws, groove rises on on-beat kills)**

Run:
```bash
node -e "
import('./core/state.js').then(async s=>{
  const {advance}=await import('./core/step.js');
  const {startLevel}=await import('./core/levels.js');
  s.resetGame(); startLevel(1);
  const base={left:0,right:0,up:0,down:0,fire:1,mouseActive:false,mx:0,my:0,grab:false,tx:0,ty:0,musicOn:false,onBeat:true};
  for(let i=0;i<900;i++) advance(base,1/60);
  console.log('ok scene=',s.G.scene,'groove.mult=',s.G.groove.mult,'score=',s.G.score);
}).catch(e=>{console.error('FAIL',e.stack);process.exit(1)});
"
```
Expected: prints `ok ...` with no throw (groove.mult may be >1 if on-beat kills happened; the point is the wiring runs end-to-end).

- [ ] **Step 7: Run the full core suite**

Run: `node --test core/*.test.js`
Expected: all PASS (groove + existing).

- [ ] **Step 8: Commit**

```bash
git add core/step.js
git commit -m "feat(core): on-beat kill scoring, groove hooks, beat-locked hitstop"
```

---

### Task 3: `input.onBeat` — the web beat window

**Files:**
- Modify: `web/audio.js`, `web/input.js`

- [ ] **Step 1: Track the last beat time + export `onBeatNow()` in `web/audio.js`**

Near the top of the MUSIC section (by `let beatVisual=0, beatNum=0;`), add:
```js
let lastBeatAt = -1;            // actx.currentTime of the most recent quarter-note
const BEAT_WINDOW = 0.13;       // seconds after a beat that counts as "on beat"
```
In `onMusicBeat(ev)`, add as the first line of the body (after the `if(G.scene!=='play')return;` guard):
```js
  lastBeatAt = actx ? actx.currentTime : lastBeatAt;
```
Add the exported predicate (place it near `pauseMusic`/`resumeMusic`):
```js
// True while the audio clock is within BEAT_WINDOW after a quarter-note — the input
// adapter feeds this to the sim as input.onBeat so on-beat kills build groove.
export function onBeatNow(){ return !!actx && lastBeatAt >= 0 && (actx.currentTime - lastBeatAt) < BEAT_WINDOW; }
```

- [ ] **Step 2: Feed it into the input struct in `web/input.js`**

Update the audio import to include `onBeatNow`:
```js
import { ensureAudio, pauseMusic, resumeMusic, MUSIC, onBeatNow } from './audio.js';
```
In `buildInput()`, add to the returned object (after `musicOn: MUSIC.on,`):
```js
    onBeat: onBeatNow(),             // sim awards groove for kills inside the beat window
```

- [ ] **Step 3: Browser verification — the beat window actually fires**

Start `python3 -m http.server 8000` (repo root). Purge SW (Conventions §4), reload, foreground tab.
In a `browser-harness` session: launch a campaign run (so music is on), then sample `buildInput().onBeat` repeatedly for ~1.5s and confirm it is a boolean that goes **true** at least once (proving the beat window is wired to the live audio clock):
```python
# pseudo: import input.js, call buildInput() ~30x over 1.5s, collect .onBeat values
# Expect: all booleans, and at least one `true`.
```
- [ ] No console errors.
- [ ] `buildInput().onBeat` is a boolean and is observed `true` during play with music running.

- [ ] **Step 4: Commit**

```bash
git add web/audio.js web/input.js
git commit -m "feat(web): expose on-beat window as input.onBeat"
```

---

### Task 4: Render — telegraph, enemy-bullet readability, groove meter, camera breathe

**Files:**
- Modify: `web/render.js`

- [ ] **Step 1: Telegraph the windup on charged enemies (READ)**

In `drawEnemy(e)`, just before the final `ctx.restore();`, add a cyan aim windup shown while the enemy is charged (it fires on the next beat):
```js
  if(e.charged){
    // READ: cyan windup telegraphs the on-beat shot — a faint aim line + pulsing ring
    const px=G.p?G.p.x:x, py=G.p?G.p.y:y;
    ctx.save();
    ctx.globalAlpha=0.5+0.3*Math.sin(Date.now()*0.02);
    ctx.strokeStyle='#22e1ff'; ctx.lineWidth=1.5; ctx.shadowBlur=8; ctx.shadowColor='#22e1ff';
    ctx.beginPath(); ctx.moveTo(x,y); ctx.lineTo(x+(px-x)*0.4, y+(py-y)*0.4); ctx.stroke();
    ctx.beginPath(); ctx.arc(x,y,e.w*0.7,0,7); ctx.stroke();
    ctx.restore();
  }
```

- [ ] **Step 2: Reserved danger treatment for enemy bullets (readability)**

Replace `drawEB`:
```js
function drawEB(eb){glowDot(eb.x,eb.y,eb.r,eb.color,10);}
```
with a high-contrast lethal orb (reserved red-orange, white-hot core, dark outline) so enemy fire never merges into the neon chaos:
```js
function drawEB(eb){
  ctx.save();
  ctx.shadowBlur=10; ctx.shadowColor='#ff3b2f';
  ctx.fillStyle='#ff3b2f'; ctx.beginPath(); ctx.arc(eb.x,eb.y,eb.r+1,0,7); ctx.fill();
  ctx.shadowBlur=0;
  ctx.lineWidth=1.5; ctx.strokeStyle='rgba(10,4,19,.9)'; ctx.beginPath(); ctx.arc(eb.x,eb.y,eb.r+1,0,7); ctx.stroke(); // dark outline
  ctx.fillStyle='#fff'; ctx.beginPath(); ctx.arc(eb.x,eb.y,eb.r*0.45,0,7); ctx.fill(); // hot core
  ctx.restore();
}
```

- [ ] **Step 3: Groove meter on the HUD (×N)**

In `drawHUD`, find the music indicator block `if(MUSIC.on){const bx=72,by=46,beat=MUSIC.beatPulse||0; ...}` and, right after that block, add the groove multiplier readout (it scales/colors with the chain):
```js
  if(G.groove && G.groove.mult>1){
    const m=G.groove.mult;
    ctx.save();
    ctx.font="700 "+(16+m)+"px 'Audiowide', sans-serif"; ctx.textAlign='left'; ctx.textBaseline='middle';
    ctx.shadowBlur=10; ctx.shadowColor='#39ff14'; ctx.fillStyle='#39ff14';
    ctx.fillText('×'+m, 92, 30);
    ctx.restore();
    ctx.textBaseline='alphabetic';
  }
```

- [ ] **Step 4: Kick-driven camera breathe**

In `drawScene()`, find the opening `ctx.save();` and the shake translate (`if(G.shake>0)ctx.translate(...)`) and add a subtle scale pulse on the kick right after the shake line:
```js
  const k=1+(MUSIC.kickPulse||0)*0.012;            // gentle breathe on the kick
  ctx.translate(G.W/2,G.H/2); ctx.scale(k,k); ctx.translate(-G.W/2,-G.H/2);
```
(The matching `ctx.restore()` already at the end of `drawScene` covers this transform.)

- [ ] **Step 5: Browser verification (visual)**

Start the server, purge SW, reload (foreground tab). Play a campaign level and screenshot:
- [ ] No console errors.
- [ ] Charged enemies show a **cyan aim line + ring** a beat before they fire.
- [ ] Enemy bullets render as bright **red-orange orbs with a white core + dark outline** — clearly distinct from the cyan/gold/green/magenta player shots.
- [ ] Killing enemies in time with the beat shows a green **×N** climb on the HUD (top-left, by the equalizer); taking a hit resets it to nothing.
- [ ] The view gently pulses on the kick (camera breathe) without nausea; bullets stay readable.

- [ ] **Step 6: Commit**

```bash
git add web/render.js
git commit -m "feat(web): telegraph windup, enemy-bullet readability, groove meter, camera breathe"
```

---

### Task 5: Service worker + final verification + PR

**Files:**
- Modify: `sw.js`

- [ ] **Step 1: Cache the new module + bump the cache**

In `sw.js`, add to `ASSETS` (with the other `./core/*.js`):
```js
  './core/groove.js',
```
and bump:
```js
const CACHE = 'retrograde-v9';
```

- [ ] **Step 2: Verify the asset resolves**

Run (server up): `curl -s -o /dev/null -w "%{http_code} groove.js\n" http://localhost:8000/core/groove.js`
Expected: `200 groove.js`. And `grep -n "groove.js\|retrograde-v" sw.js` shows the entry + `v9`.

- [ ] **Step 3: Full core suite**

Run: `node --test core/*.test.js`
Expected: all PASS.

- [ ] **Step 4: Re-run the Task 4 visual checklist once end-to-end** (fresh SW purge): telegraph, danger bullets, ×N groove, camera breathe, hitstop snap on kills — all present, no console errors, still 60fps.

- [ ] **Step 5: Branch, push, PR**

```bash
git checkout -b overdrive-plan1-feel-and-rhythm   # if not already on a feature branch
git push -u origin overdrive-plan1-feel-and-rhythm
gh pr create --title "OVERDRIVE Plan 1: feel & rhythm pass" \
  --body "Telegraphed on-beat enemy fire (READ), groove multiplier on on-beat kills (GROOVE), and beat-locked game-feel (hitstop, on-beat debris, camera breathe, enemy-bullet readability). Improves Campaign + Daily now and is the foundation for the OVERDRIVE run mode (Plan 2). Spec: docs/superpowers/specs/2026-06-02-overdrive-roguelite-run-design.md"
```

> Start the feature branch (Step 5's `git checkout -b`) **before** Task 1 if your workflow forbids committing to `main`.

---

## Self-review notes

- **Spec coverage (Plan-1 slice):** READ / telegraphed on-beat fire ✓ (Task 4 Step 1 + the reserved danger treatment Step 2); GROOVE multiplier ✓ (Tasks 1–2, meter in Task 4 Step 3); juice pack ✓ (beat-locked hitstop + on-beat debris in Task 2, camera breathe in Task 4 Step 4). Deferred from the spec's v1 and NOT in this plan: SYNC dodge, the OVERDRIVE run mode, drafts/cards, accuracy share card (all Plan 2), and full additive bloom (later polish — the readability pass + camera breathe deliver the core feel without an offscreen-blur pipeline).
- **Type consistency:** `G.groove={mult,chain,t}`, `G.onBeat`, `grooveKill(onBeat)`/`grooveHit()`/`grooveTick(dt)`/`grooveMult()`, `input.onBeat`, `onBeatNow()` are used consistently across core and web tasks.
- **Determinism boundary intact:** groove/onBeat are gameplay state; the beat clock stays in `web/audio.js`; core only reads `input.onBeat` (mirrors the existing `input.musicOn`). No new `Math.random()` in core.
- **Color-contract deviation documented:** telegraph cyan, enemy lethal red-orange (not magenta — reserved for the player's Spread weapon). Stated in Conventions §3 and Task 4.
- **Known nuance:** the telegraph windup lasts "until the next beat," which is ≤ one beat depending on when the enemy charges — acceptable for v1; tightening the charge-to-fixed-one-beat windup is a tuning follow-up if playtests show it's unfair.
```
