import test from 'node:test';
import assert from 'node:assert/strict';
import {installDom} from '../test-dom.js';
import {reactiveRecord} from '../../reactive.js';
import {mount} from '../dom.js';
import {equipmentPage, gearFacts} from './equipment-page.js';
import {createEquipment, GEAR} from '../../equipment.js';

installDom();

function setup(stock = {}) {
  const inventory = reactiveRecord({copperDagger: 0, copperShield: 0, bows: 0, ...stock});
  let busy = false;
  const equipment = createEquipment({inventory, busy: () => busy});
  const {node} = mount(() => equipmentPage({equipment, inventory}));
  return {node, inventory, equipment, setBusy: value => { busy = value; }};
}
const press = el => el.dispatchEvent(new window.Event('click'));
const slotText = node => [...node.querySelectorAll('.q-slot')].map(s => s.textContent);
const gearRow = (node, name) => [...node.querySelectorAll('.q-gear')].find(g => g.querySelector('.q-row__name').textContent.startsWith(name));

test('worn slots and owned gear follow the inventory and equipment', () => {
  const s = setup();
  assert.deepEqual(slotText(s.node), ['Main handEmpty', 'Off handEmpty', 'HeadEmpty']);
  assert.equal(s.node.querySelectorAll('.q-gear').length, 0);
  s.inventory.copperDagger = 2;
  const dagger = gearRow(s.node, 'Copper Dagger');
  assert.match(dagger.querySelector('.q-row__name').textContent, /×2/);
  assert.equal(dagger.querySelector('.q-row__detail').textContent, gearFacts(GEAR.copperDagger));
  const [main, off] = dagger.querySelectorAll('.q-button');
  press(main);
  assert.deepEqual(slotText(s.node).slice(0, 2), ['Main handCopper Dagger', 'Off handEmpty']);
  assert.equal(dagger.hasAttribute('data-equipped'), true);
  assert.equal(main.textContent, 'Unequip main hand');
  press(off);
  assert.deepEqual(slotText(s.node).slice(0, 2), ['Main handCopper Dagger', 'Off handCopper Dagger']);
  // Losing a copy unequips the extra (shared equipment rules), and the page follows.
  s.inventory.copperDagger = 1;
  assert.equal(slotText(s.node).filter(t => t.includes('Copper Dagger')).length, 1);
});

test('a refused change explains itself instead of disabling buttons', () => {
  const s = setup({copperShield: 1});
  s.setBusy(true);
  press(gearRow(s.node, 'Copper Shield').querySelector('.q-button'));
  assert.match(s.node.querySelector('.q-page__status').textContent, /Finish what you’re doing/);
  s.setBusy(false);
  press(gearRow(s.node, 'Copper Shield').querySelector('.q-button'));
  assert.equal(s.node.querySelector('.q-page__status').hidden, true);
  assert.deepEqual(slotText(s.node)[1], 'Off handCopper Shield');
});

test('with assistance, Optimize equips for the current class and reports what changed', async () => {
  const {combatSystems} = await import('./test-systems.js');
  const {assistance} = combatSystems();
  const inventory = reactiveRecord({copperDagger: 0});
  const equipment = createEquipment({inventory, busy: () => false});
  const {node} = mount(() => equipmentPage({equipment, inventory, assistance}));
  const button = [...node.querySelectorAll('.q-button')].find(b => b.textContent.startsWith('Optimize'));
  assert.equal(button.textContent, 'Optimize for Melee');
  const report = button.parentElement.querySelector('.q-page__status');
  assert.equal(report.hidden, true);
  press(button);
  assert.equal(report.hidden, false);
  assert.equal(report.textContent, 'Equipped Copper Dagger.');
  assistance.setStyle('ranged');
  assert.equal(button.textContent, 'Optimize for Ranged');
});

test('without assistance there is no Optimize button', () => {
  const s = setup();
  assert.equal([...s.node.querySelectorAll('.q-button')].some(b => b.textContent.startsWith('Optimize')), false);
});
