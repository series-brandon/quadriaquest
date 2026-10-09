import test from 'node:test';
import assert from 'node:assert/strict';
import {installDom} from './test-dom.js';
import {reactiveRecord, signal} from '../reactive.js';
import {mount} from './dom.js';
import {recipeTile, recipeDetailBody} from './recipe-view.js';
import {RECIPES} from '../recipes.js';
import {ITEMS} from '../items.js';

installDom();

test('a recipe tile follows selection, readiness and its tag', () => {
  const pressed = signal(false), ready = signal(true), tag = signal(''), chosen = [];
  const {node} = mount(() => recipeTile({id: 'axes', recipe: RECIPES.axes, pressed: () => pressed.value, ready: () => ready.value, tag: () => tag.value, attrs: {id: 'choose-axes'}, onChoose: () => chosen.push('axes')}));
  assert.equal(node.id, 'choose-axes');
  assert.equal(node.querySelector('.q-item__name').textContent, 'Crude Axe');
  assert.equal(node.hasAttribute('data-missing'), false);
  assert.equal(node.querySelector('.q-recipe-tile__tag').hidden, true);
  ready.value = false;
  tag.value = 'Crafting…';
  pressed.value = true;
  assert.equal(node.hasAttribute('data-missing'), true);
  assert.equal(node.querySelector('.q-recipe-tile__tag').textContent, 'Crafting…');
  assert.equal(node.getAttribute('aria-pressed'), 'true');
  node.dispatchEvent(new window.Event('click'));
  assert.deepEqual(chosen, ['axes']);
});

test('a recipe detail shows its parts with owned counts that follow the inventory', () => {
  const inventory = reactiveRecord({logs: 1}), backs = [];
  const {node} = mount(() => recipeDetailBody({id: 'campfires', recipe: RECIPES.campfires, items: ITEMS, inventory, time: () => 'Time · 3 seconds', timeId: 'campfires-duration', onBack: () => backs.push(1)}));
  const part = title => node.querySelector(`[aria-label=${title}]`);
  assert.deepEqual([...node.querySelectorAll('.q-recipe-part h4')].map(h => h.textContent), ['Ingredients', 'Tools', 'Station', 'Makes']);
  assert.equal(node.querySelector('#campfires-duration').textContent, 'Time · 3 seconds');
  const logs = part('Ingredients').querySelector('li');
  assert.equal(logs.querySelector('strong').textContent, '1 / 2');
  assert.equal(logs.hasAttribute('data-missing'), true);
  inventory.logs = 2;
  assert.equal(logs.querySelector('strong').textContent, '2 / 2');
  assert.equal(logs.hasAttribute('data-missing'), false);
  assert.match(part('Tools').textContent, /Flint and Stone/);
  assert.match(part('Station').textContent, /None: craft anywhere/);
  assert.match(part('Makes').textContent, /Campfire ×1/);
  node.querySelector('.q-recipe-detail__back').dispatchEvent(new window.Event('click'));
  assert.equal(backs.length, 1);
});
