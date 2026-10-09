import test from 'node:test';
import assert from 'node:assert/strict';
import {installDom} from '../test-dom.js';
import {signal} from '../../reactive.js';
import {mount} from '../dom.js';
import {healthPlate} from './health-plate.js';

installDom();

test('enemy plate is a bar with a danger symbol and effect icons, writing only on change', () => {
  const hp = signal(50);
  let plate;
  const {node} = mount(() => (plate = healthPlate({value: hp, max: 50})).node);
  const fill = node.querySelector('.q-plate__fill');
  assert.equal(node.hidden, true, 'hidden until its owner shows it');
  plate.visible.value = true;
  assert.equal(node.hidden, false);
  assert.equal(node.textContent, '', 'no name or numbers');
  hp.value = 31.4;
  assert.equal(fill.style.getPropertyValue('--q-plate-level'), String(32 / 50));

  const symbols = () => [...node.querySelectorAll('.q-plate__symbol')].map(s => s.className.split('--')[1]);
  assert.deepEqual(symbols(), []);
  plate.danger.value = 'manageable';
  assert.deepEqual(symbols(), [], 'manageable fights show nothing');
  plate.danger.value = 'caution';
  assert.deepEqual(symbols(), ['caution']);
  assert.equal(node.dataset.danger, 'caution');
  plate.danger.value = 'imminent';
  assert.deepEqual(symbols(), ['danger'], 'flee and imminent show the skull');
  plate.danger.value = null;
  assert.equal(node.hasAttribute('data-danger'), false);

  const effects = node.querySelector('.q-plate__effects');
  plate.effects.value = 'stun,slow';
  assert.equal(effects.children.length, 2);
  const stun = effects.children[0];
  plate.effects.value = 'stun';
  assert.equal(effects.children.length, 1);
  assert.equal(effects.children[0], stun, 'icons are keyed, not rebuilt');

  plate.place(100.04, 50);
  const first = node.style.transform;
  plate.place(100.01, 50);
  assert.equal(node.style.transform, first, 'sub-0.05px moves do not rewrite the transform');
  assert.equal(first, 'translate(100.0px,50.0px) translate(-50%,-100%)');
});

test('player plate is a bar only and follows maximum changes', () => {
  const value = signal(80), max = signal(100);
  const {node} = mount(() => healthPlate({kind: 'player', value, max}).node);
  assert.equal(node.className, 'q-plate q-plate--player');
  assert.equal(node.querySelector('.q-plate__danger'), null);
  assert.equal(node.querySelector('.q-plate__fill').style.getPropertyValue('--q-plate-level'), '0.8');
  max.value = 160;
  assert.equal(node.querySelector('.q-plate__fill').style.getPropertyValue('--q-plate-level'), '0.5');
});
