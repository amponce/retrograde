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
