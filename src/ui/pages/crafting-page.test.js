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

test('hand recipes come first, station recipes after, each with stable ids', () => {
  const s = setup();
  const groups = [...s.node.querySelectorAll('.q-crafting__list .q-list')].map(list => [...list.querySelectorAll('.q-recipe')].map(b => b.id));
  assert.ok(groups[0].includes('choose-axes'));
  assert.ok(groups[1].includes('choose-copperIngots'));
  assert.equal(s.get('axes-detail').hidden, false);
  assert.equal(s.get('pickaxes-detail').hidden, true);
  assert.equal(s.get('choose-axes').getAttribute('aria-pressed'), 'true');
});

test('ingredients, readiness and time follow the inventory and skill records', () => {
  const s = setup();
  const craft = s.get('craft-axes');
  assert.equal(craft.disabled, false);
  assert.match(s.get('choose-axes').textContent, /Materials ready/);
  s.inventory.stones = 0;
  assert.equal(craft.disabled, true);
  assert.match(s.get('choose-axes').textContent, /Missing materials/);
  assert.match(s.get('axes-detail').querySelector('.q-ingredients').textContent, /0 \/ 1/);
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
  assert.match(s.get('choose-axes').textContent, /Crafting…/);
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
