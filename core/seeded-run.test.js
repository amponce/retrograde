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
