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
