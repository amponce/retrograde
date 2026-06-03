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
