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
