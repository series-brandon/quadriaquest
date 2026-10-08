import test from 'node:test';
import assert from 'node:assert/strict';
import {installDom} from '../test-dom.js';
import {reactiveRecord} from '../../reactive.js';
import {mount} from '../dom.js';
import {settingsPage} from './settings-page.js';

installDom();

function fakeAudio() {
  const settings = reactiveRecord({music: 0.22, effects: 0.45, ambience: 0.25, muted: false});
  let unlocked = 0;
  return {settings, unlock() { unlocked++; }, set(key, value) { settings[key] = key === 'muted' ? !!value : value; }, get unlocked() { return unlocked; }};
}

test('sliders and mute read and write the shared audio settings; two copies agree', () => {
  const audio = fakeAudio();
  const page = mount(() => settingsPage({audio})).node, popup = mount(() => settingsPage({audio})).node;
  const music = page.querySelector('input[aria-label=Music]');
  assert.equal(page.querySelector('.q-slider__value').textContent, '22%');
  music.value = '0.6';
  music.dispatchEvent(new window.Event('input'));
  assert.equal(audio.settings.music, 0.6);
  assert.equal(audio.unlocked, 1, 'touching a slider unlocks audio');
  assert.equal(popup.querySelector('.q-slider__value').textContent, '60%', 'the popup follows the journal page');
  const mute = popup.querySelector('[role=switch]');
  mute.dispatchEvent(new window.Event('click'));
  assert.equal(audio.settings.muted, true);
  assert.equal(page.querySelector('[role=switch]').getAttribute('aria-checked'), 'true');
  audio.settings.effects = 0;
  assert.equal(page.querySelectorAll('.q-slider__value')[1].textContent, '0%', 'external changes (reset) show too');
});
