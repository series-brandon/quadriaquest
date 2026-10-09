import test from 'node:test';
import assert from 'node:assert/strict';
import {installDom} from '../ui/test-dom.js';
import {mount} from '../ui/dom.js';
import {createMusicState} from '../music-player.js';
import {musicLab} from './music-lab.js';

installDom();

function fakeAudio() {
  const state = createMusicState(), calls = [];
  return {
    calls, ready: true,
    unlock() { calls.push('unlock'); },
    preview(id) { state.options.song.value = id; calls.push(['preview', id]); },
    music: {
      ...state,
      setMuted(layer, muted) { state.options.muted[layer] = muted; calls.push(['mute', layer, muted]); },
      setCombat(mode) { state.options.combat.value = mode; },
      restart() { calls.push('restart'); },
    },
  };
}
const button = (node, text) => [...node.querySelectorAll('button')].find(b => b.textContent.trim() === text);

test('music lab shows what is playing and drives the player', () => {
  const audio = fakeAudio(), view = mount(() => musicLab(audio)), node = view.node;
  const now = node.querySelector('output');
  assert.equal(now.textContent, 'Silent');
  audio.music.playing.value = {title: 'Morning Clearing', section: 'a', kind: 'theme', varied: true, bar: 3, bars: 8, seed: 42, combat: false};
  assert.equal(now.textContent, 'Morning Clearing · a (varied) [theme] · bar 3/8 · seed 42');

  const select = node.querySelector('select');
  Object.defineProperty(select, 'value', {configurable: true, value: 'willowbank'}); // linkedom selects have a read-only value
  select.dispatchEvent(new window.Event('change'));
  assert.deepEqual(audio.calls.slice(-1)[0], ['preview', 'willowbank']);

  assert.equal(audio.music.options.arrangement.value, 'cozy');
  button(node, 'Original').dispatchEvent(new window.Event('click'));
  assert.equal(audio.music.options.arrangement.value, 'original');

  button(node, 'Drift').dispatchEvent(new window.Event('click'));
  assert.equal(audio.music.options.style.value, 'drift');
  assert.equal(audio.calls.at(-1), 'restart');

  button(node, 'On').dispatchEvent(new window.Event('click'));
  assert.equal(audio.music.options.combat.value, 'on');

  const melody = [...node.querySelectorAll('[role=switch]')].find(s => s.textContent.includes('Melody'));
  assert.equal(melody.getAttribute('aria-checked'), 'true');
  melody.dispatchEvent(new window.Event('click'));
  assert.equal(melody.getAttribute('aria-checked'), 'false');

  button(node, 'Lock seed').dispatchEvent(new window.Event('click'));
  assert.equal(audio.music.options.seed.value, 42);
  assert.match(now.textContent, /seed 42 \(locked\)/);
  assert.equal(button(node, 'Lock seed').disabled, true);
  view.dispose();
});
