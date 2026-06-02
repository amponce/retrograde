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
