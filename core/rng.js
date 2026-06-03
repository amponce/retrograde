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
