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
