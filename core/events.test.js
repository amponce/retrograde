import { test } from 'node:test';
import assert from 'node:assert/strict';
import { emit, drainEvents } from './events.js';

test('emit queues events and drain returns + clears them', () => {
  emit('sfx', 'shoot');
  emit('sfx', 'boom');
  const first = drainEvents();
  assert.deepEqual(first, [{ type: 'sfx', name: 'shoot' }, { type: 'sfx', name: 'boom' }]);
  assert.deepEqual(drainEvents(), []); // drained
});
