import test from 'node:test';
import assert from 'node:assert/strict';
import {installDom} from '../test-dom.js';
import {reactiveRecord, signal} from '../../reactive.js';
import {mount} from '../dom.js';
import {inventoryPage, inventoryView} from './inventory-page.js';

installDom();

const press = el => el.dispatchEvent(new window.Event('click'));
const names = node => [...node.querySelectorAll('.q-item')].map(b => b.dataset.item);
// The value beside a fact's label in the detail (ui/item-info.js), or null.
const fact = (node, label) => [...node.querySelectorAll('.q-facts__row')].find(row => row.querySelector('dt').textContent === label)?.querySelector('dd').textContent ?? null;

function setup({items = {cookedFish: 2, sticks: 3}, levels = null} = {}) {
  const inventory = reactiveRecord(items);
  const revision = signal(0), allowed = new Set(['cookedFish']), worn = new Set(), selections = [];
  let busy = false;
  const actions = id => (id === 'cookedFish'
    ? [{label: 'Eat', disabled: !(inventory[id] > 0), run: () => (busy ? false : (inventory[id]--, undefined))}]
    : id === 'swords' ? [{label: worn.has(id) ? 'Unequip' : 'Equip', disabled: false, run: () => { worn.has(id) ? worn.delete(id) : worn.add(id); revision.value++; }}] : []);
  const settings = id => (id === 'cookedFish' ? [{label: 'Allow auto eating', checked: () => (revision.value, allowed.has(id)), onChange: on => { on ? allowed.add(id) : allowed.delete(id); revision.value++; }}] : []);
  const guide = signal(null), view = inventoryView();
  const levelOf = levels ? track => levels[track] ?? 1 : null;
  const {node} = mount(() => inventoryPage({inventory, actions, settings, isEquipped: id => worn.has(id), track: () => revision.value, levelOf, onSelect: id => selections.push(id), guide, view}));
  return {node, inventory, allowed, selections, guide, view, revision, setBusy: on => { busy = on; }};
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
  assert.equal(fact(detail(), 'Quantity'), '2');
  assert.equal(detail().querySelector('.q-item-detail__kind').firstChild.textContent, 'Food');
  assert.equal(fact(detail(), 'Eat'), 'Restores 20 Health, up to your maximum');
  const eat = detail().querySelector('.q-item-detail__actions button');
  assert.equal(eat.textContent, 'Eat');
  press(eat);
  assert.equal(s.inventory.cookedFish, 1);
  assert.equal(fact(detail(), 'Quantity'), '1');
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

test('gold is an ordinary stack (no separate total), and each item shows what it sells for', () => {
  const s = setup({items: {sticks: 3, gold: 1250}});
  assert.equal(s.node.querySelector('.q-inventory__gold'), null);
  assert.deepEqual(names(s.node), ['gold', 'sticks'], 'items keep their catalogue order');
  press(s.node.querySelector('[data-item=sticks]'));
  assert.equal(fact(s.node, 'Sells for'), '1 GP each · 3 GP for all');
  press(s.node.querySelector('[data-item=gold]'));
  assert.equal(fact(s.node, 'Sells for'), 'Can’t be sold');
});

test('equipment details lay out kind, stats, requirements against your levels, and value', () => {
  const levels = {'melee.technique': 1};
  const s = setup({items: {copperDagger: 2}, levels});
  const detail = s.node.querySelector('.q-item-detail');
  assert.equal(detail.querySelector('.q-item-detail__kind').firstChild.textContent, 'Melee weapon · One hand');
  assert.equal(fact(detail, 'Power'), '+10');
  assert.equal(fact(detail, 'Accuracy'), '+10');
  assert.equal(fact(detail, 'Attack speed'), 'Every 2.55 s');
  assert.equal(fact(detail, 'Range'), '1 tile');
  assert.equal(fact(detail, 'Damage'), 'Piercing, Slashing');
  assert.equal(fact(detail, 'Trains'), 'Dagger Proficiency');
  assert.equal(fact(detail, 'Melee Technique'), 'Level 1 · you 1');
  assert.equal(detail.querySelector('.q-item-info__note').hidden, true, 'requirement met: full bonuses');
  assert.equal(fact(detail, 'Shop value'), '40 GP each');
  assert.equal(fact(detail, 'Sells for'), '16 GP each · 32 GP for all');
  assert.equal(detail.querySelector('.q-item-detail__tag').hidden, true);
  const armor = setup({items: {crudeShield: 1, crudeHelm: 1}});
  assert.equal(armor.node.querySelector('.q-item-detail__kind').firstChild.textContent, 'Shield · One hand');
  assert.equal(fact(armor.node, 'Resistance'), '+30 (3% less damage)');
  assert.equal(fact(armor.node, 'Light Armor'), null, 'only the chosen item');
  press(armor.node.querySelector('[data-item=crudeHelm]'));
  assert.equal(armor.node.querySelector('.q-item-detail__kind').firstChild.textContent, 'Light armor · Head');
  assert.equal(fact(armor.node, 'Trains'), 'Light Armor, Helm Proficiency (when hit)');
  assert.equal(fact(armor.node, 'Light Armor'), 'Level 1', 'no levels given: just the requirement');
});

test('an unmet requirement is marked and says how much the bonuses shrink, following your level', () => {
  const levels = {'melee.technique': 1};
  const s = setup({items: {copperDagger: 1}, levels});
  const row = () => [...s.node.querySelectorAll('.q-facts__row')].find(r => r.querySelector('dt').textContent === 'Melee Technique');
  assert.equal(row().hasAttribute('data-missing'), false);
  // Every crude and copper requirement is level 1, where tracks start, so stand in a level below it.
  levels['melee.technique'] = 0;
  s.revision.value++;
  assert.equal(row().hasAttribute('data-missing'), true);
  assert.equal(fact(s.node, 'Melee Technique'), 'Level 1 · you 0');
  assert.equal(s.node.querySelector('.q-item-info__note').hidden, false);
  assert.match(s.node.querySelector('.q-item-info__note').textContent, /Bonuses work at 10% until you meet these/);
});

test('tools say what they do and what they need', () => {
  const s = setup({items: {crudeAxe: 1}});
  assert.equal(s.node.querySelector('.q-item-detail__kind').firstChild.textContent, 'Tool');
  assert.equal(fact(s.node, 'Tool'), 'Chops trees while in your inventory');
  assert.equal(fact(s.node, 'Needs'), 'Lumberjack 1');
  assert.equal(fact(s.node, 'Power'), null, 'a tool held for looks has no combat stats');
});
