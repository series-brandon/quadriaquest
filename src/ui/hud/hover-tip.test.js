import test from 'node:test';
import assert from 'node:assert/strict';
import {installDom} from '../test-dom.js';
import {mount} from '../dom.js';
import {hoverTip} from './hover-tip.js';
import {threatTone} from '../../combat-formulas.js';

installDom();

test('an opponent shows "Attack <name>" over its coloured Level; plain hints are one line; text is written only on change', () => {
  let tip;
  const {node} = mount(() => (tip = hoverTip()).node);
  const part = name => node.querySelector(`.q-hover-tip__${name}`);
  assert.equal(node.hidden, true, 'hidden until shown');

  tip.show({text: 'Move here'});
  assert.equal(node.hidden, false);
  assert.equal(part('title').textContent, 'Move here');
  assert.equal(part('verb').hidden, true, 'a plain hint has no separate verb');
  assert.equal(part('detail').hidden, true, 'no second line for a plain hint');

  tip.show({verb: 'Attack', text: 'Stone Scorpion', level: 21, tone: 'high', notes: ''});
  assert.equal(part('title').textContent, 'Attack Stone Scorpion');
  assert.equal(part('verb').textContent, 'Attack ', 'the verb is its own, lighter part');
  assert.equal(part('verb').hidden, false);
  assert.equal(tip.state.text, 'Attack Stone Scorpion');
  assert.equal(part('detail').hidden, false);
  assert.equal(part('level').textContent, 'Level 21');
  assert.equal(part('level').dataset.tone, 'high');
  assert.equal(part('notes').hidden, true);

  const label = part('level').firstChild;
  tip.show({verb: 'Attack', text: 'Stone Scorpion', level: 21, tone: 'high', notes: ''});
  assert.equal(part('level').firstChild, label, 'the same hover again leaves its text alone');

  tip.show({text: 'Attack Cinder Golem', level: 75, tone: 'high', notes: 'Boss · ⚠ Hunts pacifists'});
  assert.equal(part('notes').hidden, false);
  assert.equal(part('notes').textContent, 'Boss · ⚠ Hunts pacifists');

  tip.show({text: 'Attack Practice Target', level: null});
  assert.equal(part('detail').hidden, true, 'no Threat, no level');
  assert.equal(part('level').hasAttribute('data-tone'), false);

  tip.place(120.4, 80.6);
  assert.equal(node.style.getPropertyValue('transform'), 'translate(120px, 81px)');
  tip.hide();
  assert.equal(node.hidden, true);
});

test('Level colours: green more than 5 below your Threat, orange within 5, red more than 5 above', () => {
  assert.equal(threatTone(1, 10), 'low');
  assert.equal(threatTone(4, 10), 'low');
  assert.equal(threatTone(5, 10), 'even', 'exactly 5 below is orange');
  assert.equal(threatTone(10, 10), 'even');
  assert.equal(threatTone(15, 10), 'even', 'exactly 5 above is orange');
  assert.equal(threatTone(16, 10), 'high');
});
