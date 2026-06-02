import { test } from 'node:test';
import assert from 'node:assert/strict';
import { G, resetGame } from './state.js';
import { applyPup } from './weapons.js';

test('same-weapon pickup raises power to cap 4; switching keeps power', () => {
  resetGame();                       // starts weapon 'M', power 1
  applyPup('M'); applyPup('M'); applyPup('M'); applyPup('M'); applyPup('M');
  assert.equal(G.p.power, 4);        // capped
  applyPup('S');                     // switch type
  assert.equal(G.p.weapon, 'S');
  assert.equal(G.p.power, 4);        // NOT reset to 1 (never-downgrade)
});
