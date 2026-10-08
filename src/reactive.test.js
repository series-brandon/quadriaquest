import test from 'node:test';
import assert from 'node:assert/strict';
import {computed, effect, reactiveRecord} from './reactive.js';

test('reactive records behave like plain objects', () => {
  const inventory = reactiveRecord({sticks: 2});
  inventory.sticks--;
  inventory.stones = (inventory.stones || 0) + 3;
  Object.assign(inventory, {axes: 1});
  assert.equal(inventory.sticks, 1);
  assert.deepEqual(Object.entries(inventory), [['sticks', 1], ['stones', 3], ['axes', 1]]);
  assert.equal(JSON.stringify(inventory), '{"sticks":1,"stones":3,"axes":1}');
  assert.equal('stones' in inventory, true);
  delete inventory.axes;
  assert.deepEqual(Object.keys(inventory), ['sticks', 'stones']);
});

test('reads subscribe per key; enumeration subscribes to added and removed keys', () => {
  const inventory = reactiveRecord({sticks: 2, stones: 1});
  let sticksRuns = 0, keysRuns = 0;
  const sticks = computed(() => (sticksRuns++, inventory.sticks));
  const count = computed(() => (keysRuns++, Object.keys(inventory).length));
  const stop = effect(() => { sticks.value; count.value; });
  inventory.stones = 5;
  assert.equal(sticksRuns, 1, 'other keys do not notify');
  inventory.sticks = 4;
  assert.equal(sticks.value, 4);
  assert.equal(sticksRuns, 2);
  inventory.fish = 1;
  assert.equal(count.value, 3);
  delete inventory.fish;
  assert.equal(count.value, 2);
  assert.equal(keysRuns, 3);
  stop();
});
