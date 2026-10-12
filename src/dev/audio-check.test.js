import test from 'node:test';
import assert from 'node:assert/strict';
import {describeClicks, findClicks} from './audio-check.js';

const RATE = 44100;
// A sine from `start` to `stop` seconds, with optional linear fades (seconds) at each end.
function tone(freq, {seconds = 1, start = .2, stop = .7, fadeIn = 0, fadeOut = 0, level = .2} = {}) {
  const data = new Float32Array(RATE * seconds);
  for (let i = Math.floor(start * RATE); i < Math.floor(stop * RATE); i++) {
    const t = i / RATE, envelope = Math.min(1, fadeIn ? (t - start) / fadeIn : 1, fadeOut ? (stop - t) / fadeOut : 1);
    data[i] = level * envelope * Math.sin(2 * Math.PI * freq * (t - start + .0003));
  }
  return data;
}

test('a note cut off mid-cycle or started at full level is a click', () => {
  const cut = findClicks(tone(330, {fadeIn: .01}), {ignoreBefore: 0});
  assert.equal(cut.length, 1);
  assert.ok(Math.abs(cut[0].time - .7) < .01);
  const abrupt = findClicks(tone(330, {start: .3, fadeOut: .05}), {ignoreBefore: 0});
  assert.equal(abrupt.length, 1);
  assert.ok(Math.abs(abrupt[0].time - .3) < .01);
});

test('faded notes and steady bright tones are not clicks', () => {
  assert.deepEqual(findClicks(tone(330, {fadeIn: .006, fadeOut: .05}), {ignoreBefore: 0}), []);
  assert.deepEqual(findClicks(tone(5000, {fadeIn: .006, fadeOut: .05}), {ignoreBefore: 0}), []);
});

test('noise cut off mid-swell is flagged; noise that fades out is not', () => {
  const burst = fade => {
    const data = new Float32Array(RATE);
    for (let i = RATE * .1; i < RATE * .6; i++) {
      const t = i / RATE, envelope = Math.min(1, (t - .1) / .2, fade ? (.6 - t) / .2 : 1);
      data[i] = .1 * envelope * (Math.random() * 2 - 1);
    }
    return data;
  };
  // Reported as a cut or (when the stop also spikes) a spike; either way it's caught at the stop.
  assert.ok(findClicks(burst(false), {ignoreBefore: 0}).some(c => Math.abs(c.time - .6) < .03));
  assert.deepEqual(findClicks(burst(true), {ignoreBefore: 0}).filter(c => c.cut), []);
});

test('results read as one line per layer with clicks', () => {
  assert.equal(describeClicks({melody: [], arp: []}), 'No clicks found.');
  assert.equal(describeClicks({melody: [], bass: [{time: 1.234}, {time: 2}]}), 'Clicks found. bass: 2 at 1.23s, 2.00s');
});
