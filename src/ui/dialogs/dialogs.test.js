import test from 'node:test';
import assert from 'node:assert/strict';
import {installDom} from '../test-dom.js';
import {reactiveRecord} from '../../reactive.js';
import {createModalHost} from '../modal.js';
import {stationDialog} from './station-dialog.js';
import {destinationDialog} from './destination-dialog.js';
import {nameDialog} from './name-dialog.js';
import {modeChoice, PLAY_STYLES} from './mode-choice.js';
import {mount} from '../dom.js';
import {RECIPES, canMake, durationFor} from '../../recipes.js';
import {ITEMS} from '../../items.js';

installDom();

const press = el => el.dispatchEvent(new window.Event('click'));
const button = (root, text) => [...root.querySelectorAll('button')].find(b => b.textContent === text);
const visible = el => !el.closest('[hidden]');

function openStation({kind = 'anvil', inventory = reactiveRecord({}), station = {available: () => true}, recipes = RECIPES} = {}) {
  const host = createModalHost(), made = [], closed = [];
  host.open({id: kind, title: kind, size: 'wide', flush: true, onClose: r => closed.push(r),
    build: ({close}) => stationDialog({kind, recipes, items: ITEMS, inventory, canMake, duration: s => durationFor(s, 1), station, onMake: (id, s) => made.push([id, s]), close})});
  return {host, made, closed, inventory, node: document.body.querySelector('dialog.q-modal:last-of-type')};
}

test('station dialog lists its station’s recipes and follows the inventory', () => {
  const s = openStation();
  const recipes = [...s.node.querySelectorAll('.q-recipe-tile')];
  assert.deepEqual(recipes.map(r => r.querySelector('.q-item__name').textContent), [RECIPES.copperDagger.name, RECIPES.copperShield.name]);
  assert.equal(recipes[0].getAttribute('aria-pressed'), 'true', 'the first recipe starts selected');
  assert.equal(s.node.querySelector('input[type=search]'), null, 'short lists have no search');
  const make = button(s.node, 'Make one');
  assert.equal(make.disabled, true);
  assert.match(recipes[0].getAttribute('aria-label'), /missing ingredients/);
  const counts = () => [...s.node.querySelectorAll('[aria-label=Ingredients] li, [aria-label=Tools] li')].map(li => [li.hasAttribute('data-missing'), li.querySelector('strong').textContent]);
  assert.deepEqual(counts(), [[true, '0 / 1'], [true, '0 / 1']]);
  s.inventory.copperIngots = 1;
  s.inventory.hammers = 1;
  assert.deepEqual(counts(), [[false, '1 / 1'], [false, '1 / 1']]);
  assert.equal(make.disabled, false);
  assert.match(recipes[0].getAttribute('aria-label'), /materials ready/);

  press(recipes[1]);
  assert.equal(s.node.querySelector('.q-station').getAttribute('data-view'), 'detail', 'phones show the chosen recipe');
  assert.match(s.node.querySelector('.q-recipe-detail h3').textContent, new RegExp(RECIPES.copperShield.name));
  press(s.node.querySelector('.q-recipe-detail__back'));
  assert.equal(s.node.querySelector('.q-station').getAttribute('data-view'), 'list');
  press(recipes[0]);
  press(button(s.node, 'Make one'));
  assert.deepEqual(s.made.map(([id]) => id), ['copperDagger']);
  assert.deepEqual(s.closed, ['made']);
});

test('station dialog: previews cannot make, an unreachable station explains why, and campfires pack up', () => {
  const inventory = reactiveRecord({rawFish: 2});
  const preview = openStation({kind: 'fire', inventory, station: null});
  assert.equal(button(preview.node, 'Cook one').disabled, true);
  assert.doesNotMatch(preview.node.textContent, /Interact with/, 'no instruction line');
  assert.equal(preview.node.querySelector('[aria-label=Station] li').hasAttribute('data-missing'), false, 'the campfire window checks its own station');
  assert.equal(button(preview.node, 'Pack up campfire'), undefined);
  preview.host.close('fire');

  let here = true, packed = 0;
  const s = openStation({kind: 'fire', inventory, station: {available: () => here, pack: () => packed++}});
  here = false;
  press(button(s.node, 'Cook one'));
  assert.equal(s.made.length, 0);
  assert.match(s.node.querySelector('.q-page__status').textContent, /out of reach/);
  press(button(s.node, 'Pack up campfire'));
  assert.equal(packed, 1);
  assert.deepEqual(s.closed, ['packed']);
});

test('station dialog searches long recipe lists and keeps a matching selection', () => {
  const recipes = Object.fromEntries(['Apple', 'Bread', 'Carrot', 'Dumpling', 'Eel', 'Fig'].map(name => [name.toLowerCase(), {name, station: 'fire', cost: {}, duration: 1}]));
  const s = openStation({kind: 'fire', recipes});
  const search = s.node.querySelector('input[type=search]');
  search.value = 'ee';
  search.dispatchEvent(new window.Event('input'));
  const shown = [...s.node.querySelectorAll('.q-recipe-tile')];
  assert.deepEqual(shown.map(r => r.querySelector('.q-item__name').textContent), ['Eel']);
  assert.equal(shown[0].getAttribute('aria-pressed'), 'true');
  search.value = 'zzz';
  search.dispatchEvent(new window.Event('input'));
  assert.match(s.node.textContent, /No matching recipes/);
  assert.equal(s.node.querySelector('.q-recipe-detail'), null);
});

test('destination dialog: choose, travel and services go through the shared systems', () => {
  const host = createModalHost(), log = [], closed = [];
  const areas = {id: 'clearing', list: () => [{id: 'clearing', name: 'Clearing'}, {id: 'willowbank', name: 'Willowbank', description: 'River town'}, {id: 'cinderhold', name: 'Cinderhold'}]};
  let available = true, problem = null;
  host.open({id: 'destinations', title: 'Where to?', onClose: r => closed.push(r), build: ({close}) => destinationDialog({
    areas, visited: new Set(['clearing', 'willowbank']), source: {available: () => available}, initial: 'willowbank',
    travelTo: id => { log.push(['travel', id]); return problem; },
    services: {restore: () => 'Restored.', respec: () => 'Points returned.'}, close})});
  const node = document.body.querySelector('dialog.q-modal:last-of-type');
  const tiles = [...node.querySelectorAll('.q-tile')];
  assert.deepEqual(tiles.map(t => t.querySelector('strong').textContent), ['Clearing · You are here', 'Willowbank', 'Cinderhold · New']);
  assert.equal(tiles[0].disabled, true);
  assert.equal(tiles[1].getAttribute('aria-pressed'), 'true');
  press(tiles[2]);
  assert.equal(tiles[2].getAttribute('aria-pressed'), 'true');
  press(button(node, 'Restore'));
  assert.match(node.textContent, /Restored\./);
  problem = 'There is no safe arrival space.';
  press(button(node, 'Travel'));
  assert.deepEqual(log, [['travel', 'cinderhold']]);
  assert.match(node.textContent, /no safe arrival space/);
  available = false;
  press(button(node, 'Redistribute attribute points'));
  assert.match(node.textContent, /Preview only/);
  problem = null;
  press(button(node, 'Travel'));
  assert.deepEqual(closed, ['travelled']);
});

test('destination preview cannot travel', () => {
  const host = createModalHost();
  host.open({id: 'destinations', title: 'Where to?', build: ({close}) => destinationDialog({areas: {id: 'a', list: () => [{id: 'a'}, {id: 'b'}]}, visited: new Set(), source: null, initial: 'b', travelTo: () => null, close})});
  const node = document.body.querySelector('dialog.q-modal:last-of-type');
  assert.equal(button(node, 'Travel').disabled, true);
  assert.match(node.textContent, /Preview only — approach an Iter Crystal to travel/);
  host.close('destinations');
});

test('name dialog submits trimmed names, rejects blanks and rolls random names', () => {
  const host = createModalHost(), names = [];
  nameDialog(host, {id: 'name', title: 'Name your companion', value: 'Pebble', names: ['Gubba', 'Goober'], required: true, onSubmit: name => names.push(name)});
  const node = document.body.querySelector('dialog.q-modal:last-of-type');
  const input = node.querySelector('input'), form = node.querySelector('form');
  const submit = () => form.dispatchEvent(new window.Event('submit', {cancelable: true}));
  assert.equal(input.value, 'Pebble');
  assert.equal(node.querySelector('.q-modal__close'), null, 'required: no close button');
  input.value = '   ';
  submit();
  assert.equal(visible(node.querySelector('[role=status]')), true);
  assert.match(node.textContent, /Please enter a name/);
  press(node.querySelector('.q-name__dice'));
  assert.ok(['Gubba', 'Goober'].includes(input.value));
  input.value = '  Biscuit ';
  submit();
  assert.deepEqual(names, ['Biscuit']);
  assert.equal(host.isOpen('name'), false);
});

test('play-style choice: Simple preselected, choosing reveals that style, confirm reports it', () => {
  const chosen = [];
  const {node} = mount(() => modeChoice({onConfirm: mode => chosen.push(mode)}));
  const options = [...node.querySelectorAll('.q-mode-option')];
  assert.deepEqual(options.map(o => o.querySelector('.q-mode-option__mode').textContent), ['Pacifist', 'Simple', 'Expert']);
  const shown = () => options.map(o => !o.querySelector('.q-mode-option__more').hidden);
  assert.deepEqual(shown(), [false, true, false]);
  const confirm = node.querySelector('.q-mode-choice__confirm');
  assert.equal(confirm.textContent, 'Play as Simple');
  options[2].querySelector('input').dispatchEvent(new window.Event('change'));
  assert.deepEqual(shown(), [false, false, true]);
  assert.equal(options[2].querySelector('input').checked, true);
  assert.match(options[2].textContent, /You might like this mode if you like: RuneScape/);
  assert.equal(confirm.textContent, 'Play as Expert');
  press(confirm);
  assert.deepEqual(chosen, ['expert']);
  assert.equal(PLAY_STYLES.every(style => ['pacifist', 'simple', 'expert'].includes(style.mode)), true);
});

test('destination dialog: a service that announces itself closes the dialog', () => {
  const host = createModalHost(), closed = [];
  host.open({id: 'destinations', title: 'Where to?', onClose: r => closed.push(r), build: ({close}) => destinationDialog({
    areas: {id: 'clearing', list: () => [{id: 'clearing', name: 'Clearing'}]}, visited: new Set(['clearing']), source: {available: () => true}, initial: 'clearing',
    travelTo: () => null, services: {restore: () => null, respec: () => 'Points returned.'}, close})});
  const node = document.body.querySelector('dialog.q-modal:last-of-type');
  press(button(node, 'Restore'));
  assert.deepEqual(closed, ['restore']);
});
