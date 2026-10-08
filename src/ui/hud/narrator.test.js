import test from 'node:test';
import assert from 'node:assert/strict';
import {installDom} from '../test-dom.js';
import {signal} from '../../reactive.js';
import {h} from '../dom.js';
import {createNarrator} from './narrator.js';

installDom();

const click = (el, target = el) => {
  const event = new window.Event('click', {bubbles: true});
  Object.defineProperty(event, 'target', {value: target});
  el.dispatchEvent(event);
};
const key = (el, name) => {
  const event = new window.Event('keydown');
  Object.defineProperty(event, 'key', {value: name});
  Object.defineProperty(event, 'target', {value: el});
  el.dispatchEvent(event);
};

test('a line shows its text, speaker and prompt, and advancing calls next', () => {
  const narrator = createNarrator();
  const box = narrator.node;
  assert.equal(box.hidden, true);
  let advanced = 0;
  narrator.show({text: 'Hello there!', next: () => advanced++});
  assert.equal(box.hidden, false);
  assert.equal(box.id, 'dialogue');
  assert.equal(box.querySelector('#dialogue-line').textContent, 'Hello there!');
  assert.equal(box.querySelector('.q-narrator__speaker').textContent, '???');
  assert.equal(box.getAttribute('aria-label'), 'Hello there!');
  assert.equal(box.querySelector('#dialogue-prompt').hidden, false);
  click(box);
  key(box, 'Enter');
  assert.equal(advanced, 2, 'click and Enter both advance');
  narrator.setPrompt(false);
  assert.equal(box.querySelector('#dialogue-prompt').hidden, true);
  narrator.hide();
  assert.equal(box.hidden, true);
  click(box);
  assert.equal(advanced, 2, 'a hidden box has no line to advance');
});

test('input lines carry their own controls, which never advance and are disposed with the line', () => {
  const narrator = createNarrator();
  const box = narrator.node;
  const label = signal('Yes'), picks = [];
  let writes = 0, advanced = 0;
  narrator.show({text: 'Is Pip your name?', input: true, presentation: 'customize', next: () => advanced++, controls: () => [
    h('button', {type: 'button', on: {click: () => picks.push('yes')}}, () => { writes++; return label.value; }),
  ]});
  assert.equal(box.dataset.input, 'true');
  assert.equal(box.dataset.presentation, 'customize');
  assert.equal(box.querySelector('#dialogue-prompt').hidden, true, 'input lines have no continue prompt');
  const button = box.querySelector('#dialogue-controls button');
  assert.equal(button.textContent, 'Yes');
  click(button);
  click(box);
  assert.deepEqual(picks, ['yes']);
  assert.equal(advanced, 0, 'input lines only move on through their controls');
  narrator.show({text: 'Next line'});
  assert.equal(box.querySelector('#dialogue-controls button'), null, 'controls replaced');
  const before = writes;
  label.value = 'No';
  assert.equal(writes, before, 'the old controls’ bindings were disposed');
});

test('size and visibility are reported for layout and audio', () => {
  const narrator = createNarrator();
  narrator.show({text: 'Pick a play style', input: true, size: 'tall', controls: () => []});
  assert.equal(narrator.node.dataset.size, 'tall');
  assert.equal(narrator.visible.value, true);
  narrator.show({text: 'Plain line'});
  assert.equal(narrator.node.hasAttribute('data-size'), false);
  narrator.hide();
  assert.equal(narrator.visible.value, false);
});
