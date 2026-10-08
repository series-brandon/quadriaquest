import test from 'node:test';
import assert from 'node:assert/strict';
import {installDom} from '../test-dom.js';
import {reactiveRecord, signal} from '../../reactive.js';
import {mount} from '../dom.js';
import {craftingPage} from './crafting-page.js';
import {createGatheringSkill} from '../../skills.js';

installDom();

const press = el => el.dispatchEvent(new window.Event('click'));

function setup() {
  const inventory = reactiveRecord({sticks: 1, stones: 1}), crafting = createGatheringSkill(), active = signal(null), started = [];
  const selected = signal('axes'), viewing = signal(false);
  const {node} = mount(() => craftingPage({
    inventory, skills: () => ({Crafting: crafting}), active: () => active.value,
    start: id => { started.push(id); active.value = id; return true; }, onStarted: id => started.push(`after ${id}`),
    selected, viewing,
  }));
  const get = id => node.querySelector(`#${id}`);
  return {node, inventory, crafting, active, started, selected, viewing, get};
}

test('one recipe grid: hand recipes first, station recipes after and tagged, each with stable ids', () => {
  const s = setup();
  const tiles = [...s.node.querySelectorAll('.q-crafting__list .q-recipe-tile')].map(b => b.id);
  assert.ok(tiles.indexOf('choose-axes') < tiles.indexOf('choose-copperIngots'));
  assert.equal(s.get('choose-copperIngots').querySelector('.q-recipe-tile__tag').textContent, 'Furnace');
  assert.equal(s.get('choose-axes').querySelector('.q-recipe-tile__tag').hidden, true);
  assert.equal(s.get('axes-detail').hidden, false);
  assert.equal(s.get('pickaxes-detail').hidden, true);
  assert.equal(s.get('choose-axes').getAttribute('aria-pressed'), 'true');
});

test('ingredients, readiness and time follow the inventory and skill records', () => {
  const s = setup();
  const craft = s.get('craft-axes');
  assert.equal(craft.disabled, false);
  assert.match(s.get('choose-axes').getAttribute('aria-label'), /materials ready/);
  assert.equal(s.get('choose-axes').hasAttribute('data-missing'), false);
  s.inventory.stones = 0;
  assert.equal(craft.disabled, true);
  assert.match(s.get('choose-axes').getAttribute('aria-label'), /missing materials/);
  assert.equal(s.get('choose-axes').hasAttribute('data-missing'), true);
  assert.match(s.get('axes-detail').querySelector('[aria-label=Ingredients]').textContent, /Rocks0 \/ 1/);
  const time = s.get('axes-duration').textContent;
  s.crafting.level = 10;
  assert.notEqual(s.get('axes-duration').textContent, time, 'higher Crafting is faster');
});

test('crafting starts through the shared system and shows progress; choosing switches the phone view', () => {
  const s = setup();
  press(s.get('craft-axes'));
  assert.deepEqual(s.started, ['axes', 'after axes']);
  assert.equal(s.get('craft-axes').textContent, 'Crafting…');
  assert.equal(s.get('craft-axes').disabled, true);
  assert.equal(s.get('choose-axes').querySelector('.q-recipe-tile__tag').textContent, 'Crafting…');
  s.active.value = null;
  assert.equal(s.get('craft-axes').textContent, 'Craft Crude Axe');

  const page = s.node;
  assert.equal(page.dataset.view, 'list');
  press(s.get('choose-rods'));
  assert.equal(s.selected.value, 'rods');
  assert.equal(page.dataset.view, 'detail');
  assert.equal(s.get('rods-detail').hidden, false);
  press(s.get('rods-detail').querySelector('.q-crafting__back'));
  assert.equal(page.dataset.view, 'list');
});

test('the detail lists Ingredients, Tools, Station and Makes', () => {
  const s = setup();
  const parts = id => Object.fromEntries([...s.get(`${id}-detail`).querySelectorAll('.q-recipe-part')].map(p => [p.getAttribute('aria-label'), p.querySelector('ul').textContent]));
  assert.deepEqual(Object.keys(parts('campfires')), ['Ingredients', 'Tools', 'Station', 'Makes']);
  assert.match(parts('campfires').Ingredients, /Small Logs/);
  assert.match(parts('campfires').Tools, /Flint and Stone0 \/ 1/);
  assert.match(parts('campfires').Station, /None: craft anywhere/);
  assert.match(parts('campfires').Makes, /Campfire ×1/);
  assert.match(parts('axes').Tools, /None needed/);
  assert.match(parts('copperDagger').Station, /Anvil/);
});

test('search and Show filters narrow the grid', () => {
  const s = setup();
  const shown = () => [...s.node.querySelectorAll('.q-recipe-tile')].map(b => b.id.replace('choose-', ''));
  const [stations, missing] = s.node.querySelectorAll('.q-filter');
  press(stations);
  assert.equal(stations.getAttribute('aria-pressed'), 'false');
  assert.ok(!shown().includes('copperIngots'), 'station recipes hidden');
  press(missing);
  assert.deepEqual(shown(), ['axes', 'pickaxes', 'hammers'], 'only what the Sticks and Rocks can make');
  const search = s.node.querySelector('.q-crafting__search');
  search.value = 'pick';
  search.dispatchEvent(new window.Event('input'));
  assert.deepEqual(shown(), ['pickaxes']);
  search.value = 'zzz';
  search.dispatchEvent(new window.Event('input'));
  assert.equal(s.node.querySelector('.q-crafting__list > .q-page__help').hidden, false, 'says nothing matches');
});
