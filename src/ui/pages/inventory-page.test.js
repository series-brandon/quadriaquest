import test from 'node:test';
import assert from 'node:assert/strict';
import {installDom} from '../test-dom.js';
import {reactiveRecord, signal} from '../../reactive.js';
import {mount} from '../dom.js';
import {inventoryPage, inventoryView} from './inventory-page.js';

installDom();

const press = el => el.dispatchEvent(new window.Event('click'));
const names = node => [...node.querySelectorAll('.q-item')].map(b => b.dataset.item);

function setup({items = {cookedFish: 2, sticks: 3}} = {}) {
  const inventory = reactiveRecord(items);
  const revision = signal(0), allowed = new Set(['cookedFish']), worn = new Set(), selections = [];
  let busy = false;
  const actions = id => (id === 'cookedFish'
    ? [{label: 'Eat', disabled: !(inventory[id] > 0), run: () => (busy ? false : (inventory[id]--, undefined))}]
    : id === 'swords' ? [{label: worn.has(id) ? 'Unequip' : 'Equip', disabled: false, run: () => { worn.has(id) ? worn.delete(id) : worn.add(id); revision.value++; }}] : []);
  const settings = id => (id === 'cookedFish' ? [{label: 'Allow auto eating', checked: () => (revision.value, allowed.has(id)), onChange: on => { on ? allowed.add(id) : allowed.delete(id); revision.value++; }}] : []);
  const guide = signal(null), view = inventoryView();
  const {node} = mount(() => inventoryPage({inventory, actions, settings, isEquipped: id => worn.has(id), track: () => revision.value, onSelect: id => selections.push(id), guide, view}));
  return {node, inventory, allowed, selections, guide, view, setBusy: on => { busy = on; }};
}

test('stacks follow the reactive inventory, in catalogue order, without rebuilding rows', () => {
  const s = setup();
  assert.deepEqual(names(s.node), ['cookedFish', 'sticks']);
  const fish = s.node.querySelector('[data-item=cookedFish]');
  assert.equal(fish.querySelector('.q-item__count').textContent, '×2');
  assert.equal(fish.getAttribute('aria-label'), 'Cooked Pondfish, quantity 2');
  s.inventory.cookedFish = 5;
  assert.equal(fish.querySelector('.q-item__count').textContent, '×5');
  assert.equal(s.node.querySelector('[data-item=cookedFish]'), fish, 'same row node');
  s.inventory.rawFish = 1;
  assert.deepEqual(names(s.node), ['rawFish', 'cookedFish', 'sticks'], 'new items appear in catalogue order');
  s.inventory.sticks = 0;
  assert.equal(names(s.node).includes('sticks'), false, 'used-up items disappear');
});

test('the detail shows the chosen item, its actions and its permissions', () => {
  const s = setup();
  const first = s.node.querySelector('.q-item-detail h3').textContent;
  assert.ok(first, 'the first stack is shown until you choose');
  press(s.node.querySelector('[data-item=cookedFish]'));
  assert.deepEqual(s.selections, ['cookedFish']);
  const detail = () => s.node.querySelector('.q-item-detail');
  assert.equal(detail().querySelector('h3').textContent, 'Cooked Pondfish');
  assert.match(detail().textContent, /Quantity 2/);
  const eat = detail().querySelector('.q-item-detail__actions button');
  assert.equal(eat.textContent, 'Eat');
  press(eat);
  assert.equal(s.inventory.cookedFish, 1);
  assert.match(detail().textContent, /Quantity 1/);
  s.setBusy(true);
  press(eat);
  assert.match(detail().querySelector('[role=status]').textContent, /Finish what you’re doing first/);
  s.setBusy(false);

  const allow = detail().querySelector('[role=switch]');
  assert.equal(allow.getAttribute('aria-checked'), 'true');
  press(allow);
  assert.equal(s.allowed.has('cookedFish'), false);
  assert.equal(allow.getAttribute('aria-checked'), 'false');

  press(s.node.querySelector('[data-item=sticks]'));
  assert.equal(s.node.querySelector('.q-item-detail [role=switch]'), null, 'only items with settings show them');
  assert.equal(s.node.querySelector('.q-item-detail__actions').children.length, 0);
});

test('equipping updates the badge and the action label through the tracked revision', () => {
  const s = setup({items: {swords: 1}});
  const tile = s.node.querySelector('[data-item=swords]');
  assert.equal(tile.querySelector('.q-item__worn').hidden, true);
  const action = s.node.querySelector('.q-item-detail__actions button');
  assert.equal(action.textContent, 'Equip');
  press(action);
  assert.equal(tile.querySelector('.q-item__worn').hidden, false);
  assert.equal(tile.getAttribute('aria-label'), 'Stone Sword, equipped, quantity 1');
  assert.equal(s.node.querySelector('.q-item-detail__actions button'), action, 'the button is kept');
  assert.equal(action.textContent, 'Unequip');
});

test('search filters the stacks; phones switch between the stacks and the detail', () => {
  const s = setup();
  const search = s.node.querySelector('input[type=search]');
  search.value = 'stick';
  search.dispatchEvent(new window.Event('input'));
  assert.deepEqual(names(s.node), ['sticks']);
  assert.equal(s.node.querySelector('.q-item-detail h3').textContent, 'Sticks', 'the detail follows the matches');
  search.value = 'zzz';
  search.dispatchEvent(new window.Event('input'));
  assert.match(s.node.textContent, /No matching items/);
  assert.equal(s.node.querySelector('.q-item-detail'), null);
  search.value = '';
  search.dispatchEvent(new window.Event('input'));
  const page = s.node;
  assert.equal(page.dataset.view, 'list');
  press(s.node.querySelector('[data-item=sticks]'));
  assert.equal(page.dataset.view, 'detail');
  press(s.node.querySelector('.q-inventory__back'));
  assert.equal(page.dataset.view, 'list');
});

test('tutorial guidance resets the view and highlights an item; empty inventories say so', () => {
  const s = setup();
  s.view.query.value = 'fish';
  s.view.chosen.value = 'cookedFish';
  s.view.reset();
  s.guide.value = {item: 'sticks'};
  assert.equal(s.node.querySelector('input[type=search]').value, '');
  assert.equal(s.node.querySelector('[data-item=sticks]').hasAttribute('data-guide'), true);
  assert.equal(s.node.querySelector('[data-item=cookedFish]').hasAttribute('data-guide'), false);
  s.guide.value = null;
  assert.equal(s.node.querySelector('[data-item=sticks]').hasAttribute('data-guide'), false);

  // Item, then action: the stack until it is chosen, then its Eat button.
  s.guide.value = {item: 'cookedFish', action: 'Eat'};
  const fish = s.node.querySelector('[data-item=cookedFish]');
  assert.equal(fish.hasAttribute('data-guide'), true);
  assert.equal(s.node.querySelector('.q-item-detail__actions [data-guide]'), null, 'no action guide before choosing');
  press(fish);
  assert.equal(fish.hasAttribute('data-guide'), false);
  assert.equal(s.node.querySelector('.q-item-detail__actions [data-guide]')?.textContent, 'Eat');
  s.guide.value = null;
  assert.equal(s.node.querySelector('.q-item-detail__actions [data-guide]'), null);

  const empty = setup({items: {}});
  assert.match(empty.node.textContent, /Your inventory is empty/);
});
