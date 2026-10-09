import test from 'node:test';
import assert from 'node:assert/strict';
import {installDom} from '../test-dom.js';
import {reactiveRecord, signal} from '../../reactive.js';
import {mount} from '../dom.js';
import {quickActions} from './quick-actions.js';
import {createPlayerResources} from '../../player-resources.js';
import {createFoodSystem, createPlayerHealth} from '../../player-health.js';
import {createAuras} from '../../auras.js';
import {createCombatStyles} from '../../combat-styles.js';

installDom();

// Real resources, food, auras and styles; combat is reduced to its pending-slot surface.
function setup() {
  const inventory = reactiveRecord({cookedFish: 2});
  const health = createPlayerHealth(100);
  health.value = 50;
  const resources = createPlayerResources();
  const food = createFoodSystem({inventory, health, stop() {}});
  const auras = createAuras({ki: resources.ki});
  const styles = createCombatStyles({equipment: {attack: {}}});
  const pending = signal(null);
  const combat = {
    revision: pending,
    get pending() { return pending.value?.ability ?? null; },
    get queuedSpell() { return pending.value?.spell ?? null; },
    committedAbility: null,
    queue(id) { if (!styles.knowsAbility(id)) return 'Not learned'; pending.value = pending.peek()?.ability === id ? null : {ability: id}; return true; },
    queueSpell(id) { pending.value = pending.peek()?.spell === id ? null : {spell: id}; return true; },
  };
  const toasts = [];
  let opened = 0;
  let actions;
  mount(() => {
    actions = quickActions({inventory, food, quickFood: signal('cookedFish'), resources, styles, combat, auras, toast: m => toasts.push(m), openCombat: () => opened++});
    return actions.eat;
  });
  return {inventory, food, resources, auras, styles, combat, actions, toasts, opened: () => opened};
}

const state = button => ({
  on: button.hasAttribute('data-on'),
  queued: button.hasAttribute('data-queued'),
  partial: button.hasAttribute('data-partial'),
  unavailable: button.getAttribute('aria-disabled') === 'true',
  badge: button.lastChild.hidden ? null : button.lastChild.textContent,
});
const press = button => button.dispatchEvent(new window.Event('click'));

test('eat follows the inventory and eating state and explains an empty stack', () => {
  const s = setup();
  assert.deepEqual(state(s.actions.eat), {on: false, queued: false, partial: false, unavailable: false, badge: '2'});
  press(s.actions.eat);
  assert.equal(s.inventory.cookedFish, 1);
  assert.deepEqual(state(s.actions.eat), {on: true, queued: false, partial: false, unavailable: true, badge: '1'}, 'eating, then on cooldown');
  s.food.update(10);
  assert.equal(state(s.actions.eat).on, false);
  s.inventory.cookedFish = 0;
  press(s.actions.eat);
  assert.match(s.toasts.at(-1), /No Cooked Pondfish left/);
});

test('quick spell and quick auras open the Combat page until configured, then act', () => {
  const s = setup();
  press(s.actions.quickSpell);
  press(s.actions.quickAuras);
  assert.equal(s.opened(), 2);
  s.styles.learn('energyStrike');
  s.styles.setQuickSpell('energyStrike');
  press(s.actions.quickSpell);
  assert.equal(state(s.actions.quickSpell).queued, true);
  s.auras.learn('rush');
  s.auras.learn('harden');
  s.auras.setQuick('rush', true);
  s.auras.setQuick('harden', true);
  press(s.actions.quickAuras);
  assert.deepEqual(state(s.actions.quickAuras), {on: true, queued: false, partial: false, unavailable: false, badge: '2'});
  s.auras.toggle('harden');
  assert.deepEqual(state(s.actions.quickAuras), {on: false, queued: false, partial: true, unavailable: false, badge: '1'});
});

test('sprint and Strong Strike reflect their state', () => {
  const s = setup();
  press(s.actions.sprint);
  assert.equal(state(s.actions.sprint).on, true);
  assert.equal(s.actions.sprint.getAttribute('aria-pressed'), 'true');
  press(s.actions.strongStrike);
  assert.match(s.toasts.at(-1), /Not learned/);
  s.styles.learnAbility('strongStrike');
  assert.equal(state(s.actions.strongStrike).unavailable, false);
  press(s.actions.strongStrike);
  assert.equal(state(s.actions.strongStrike).queued, true);
});
