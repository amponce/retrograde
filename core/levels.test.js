import { test } from 'node:test';
import assert from 'node:assert/strict';
import { G, setViewport } from './state.js';
import { levelNodes, startDaily, winLevel } from './levels.js';
import { dailyConfig } from './daily.js';

test('levelNodes scales with viewport and yields NUM_LEVELS nodes', () => {
  setViewport(400, 800);
  const a = levelNodes();
  assert.equal(a.length, 8);
  setViewport(400, 1200);
  const b = levelNodes();
  assert.ok(b[0].y !== a[0].y, 'node 0 Y (= H-150) should scale with H');
});

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
