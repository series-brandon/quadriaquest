import test from 'node:test';
import assert from 'node:assert/strict';
import {installDom} from '../test-dom.js';
import {signal} from '../../reactive.js';
import {mount} from '../dom.js';
import {resourceMeter} from './meter.js';
import {createResource} from '../../player-resources.js';

installDom();

test('meter shows the rounded-up value, tone and level of a shared resource', () => {
  const ki = createResource(100);
  const {node} = mount(() => resourceMeter({id: 'player-ki', kind: 'ki', label: 'Ki', resource: ki}));
  assert.equal(node.className, 'q-meter q-meter--ki');
  assert.equal(node.getAttribute('role'), 'meter');
  assert.equal(node.textContent, '100');
  assert.equal(node.hasAttribute('data-full'), true, 'full pools lie flat');
  ki.value = 40.2;
  assert.equal(node.hasAttribute('data-full'), false);
  assert.equal(node.textContent, '41');
  assert.equal(node.dataset.tone, 'medium');
  assert.equal(node.getAttribute('aria-valuenow'), '41');
  assert.equal(node.getAttribute('aria-valuetext'), '41 of 100 ki');
  assert.equal(node.style.getPropertyValue('--q-meter-level'), '0.41');
  ki.value = 10;
  assert.equal(node.dataset.tone, 'low');
  ki.max = 110;
  assert.equal(node.getAttribute('aria-valuemax'), '110');
  assert.equal(node.title, 'Ki: 10 / 110');
});

test('meter visibility follows its hidden binding', () => {
  const visible = signal(false);
  const {node} = mount(() => resourceMeter({id: 'h', kind: 'health', label: 'Health', resource: createResource(), hidden: () => !visible.value}));
  assert.equal(node.hidden, true);
  visible.value = true;
  assert.equal(node.hidden, false);
});

test('the tile is a static bevel ring around a well with full and empty states', () => {
  const mana = createResource(100);
  const {node} = mount(() => resourceMeter({id: 'm', kind: 'mana', label: 'Mana', resource: mana}));
  assert.equal(node.querySelectorAll('.q-meter__bevel').length, 8);
  assert.equal(node.querySelectorAll('.q-meter__window .q-meter__contents').length, 1);
  mana.value = 0;
  assert.equal(node.hasAttribute('data-empty'), true);
  assert.equal(node.style.getPropertyValue('--q-meter-level'), '0');
  mana.value = 50;
  assert.equal(node.hasAttribute('data-empty'), false);
  assert.equal(node.style.getPropertyValue('--q-meter-level'), '0.5');
});

test('the well tucks under the bevel and is clipped to the tile outline', () => {
  const {node} = mount(() => resourceMeter({id: 'k', kind: 'ki', label: 'Ki', resource: createResource()}));
  const well = node.querySelector('.q-meter__well');
  const inset = Number(well.style.getPropertyValue('--q-meter-well-inset'));
  assert.ok(inset > 0 && inset < 3.5 / 52, 'well starts under the bevel, not at the opening');
  assert.match(well.style.getPropertyValue('clip-path'), /^polygon\(/);
  assert.ok(Number(node.style.getPropertyValue('--q-meter-travel')) > 0);
});
