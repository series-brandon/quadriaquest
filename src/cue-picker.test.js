import test from 'node:test';
import assert from 'node:assert/strict';
import {createCuePicker} from './sound-effects.js';

test('cues raised together play only the most important one', () => {
  const played = [], timers = [];
  const cue = createCuePicker((kind, arg) => played.push([kind, arg]), {schedule: fn => timers.push(fn)});
  cue('progress', .5); cue('objective'); cue('level'); cue('task');
  assert.equal(timers.length, 1);
  timers.shift()();
  assert.deepEqual(played, [['level', undefined]], 'the gathering objective finishing alongside a level-up plays only the level-up');
  cue('objective'); cue('quest');
  timers.shift()();
  assert.deepEqual(played.at(-1), ['quest', undefined]);
  cue('progress', .25);
  timers.shift()();
  assert.deepEqual(played.at(-1), ['progress', .25]);
});

test('a quiet notice kind never displaces a real cue', () => {
  const played = [], timers = [];
  const cue = createCuePicker(kind => played.push(kind), {schedule: fn => timers.push(fn)});
  cue('setback'); assert.equal(timers.length, 0);
  cue('progress'); cue('setback'); timers.shift()();
  assert.deepEqual(played, ['progress']);
});
