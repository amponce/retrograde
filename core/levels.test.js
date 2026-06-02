import { test } from 'node:test';
import assert from 'node:assert/strict';
import { G, setViewport } from './state.js';
import { levelNodes } from './levels.js';

test('levelNodes scales with viewport and yields NUM_LEVELS nodes', () => {
  setViewport(400, 800);
  const a = levelNodes();
  assert.equal(a.length, 8);
  setViewport(400, 1200);
  const b = levelNodes();
  assert.ok(b[0].y !== a[0].y, 'node 0 Y (= H-150) should scale with H');
});
