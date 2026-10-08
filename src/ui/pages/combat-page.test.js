import test from 'node:test';
import assert from 'node:assert/strict';
import {installDom} from '../test-dom.js';
import {mount} from '../dom.js';
import {combatPage} from './combat-page.js';
import {combatSystems} from './test-systems.js';

installDom();

function setup() {
  const systems = combatSystems(), opened = [];
  const {node} = mount(() => combatPage({...systems, openPowers: () => opened.push('powers')}));
  return {node, ...systems, opened};
}
const press = el => el.dispatchEvent(new window.Event('click'));
const visible = el => !el.closest('[hidden]');
const sectionValue = (node, name) => [...node.querySelectorAll('.q-section')].find(s => s.querySelector('.q-section__title').textContent === name);

const selected = select => [...select.options].find(o => o.selected).value;
// linkedom's select has no settable value; stand in for the user's pick.
const choose = (select, value) => {
  Object.defineProperty(select, 'value', {value, configurable: true});
  select.dispatchEvent(new window.Event('change'));
  delete select.value;
};
const option = (root, text) => [...root.querySelectorAll('.q-segmented__option')].find(b => b.textContent === text);

test('the mode selector switches presets; quick settings follow the policies and never change the mode', () => {
  const s = setup();
  const [modeSelect, goal] = s.node.querySelectorAll('select');
  assert.equal(selected(modeSelect), 'simple');
  assert.match(s.node.querySelector('.q-card').textContent, /Bare hands1–10 damage every 2\.5s/);
  const retaliate = s.node.querySelector('[aria-label=Retaliate]'), cls = s.node.querySelector('[aria-label=Class]');
  assert.equal(visible(retaliate), true);
  assert.equal(visible(cls), true);
  assert.equal(visible(goal), true);
  assert.equal(selected(goal), '');
  s.assistance.setGoal('power');
  assert.equal(selected(goal), 'power');
  press(option(cls, 'Ranged'));
  press(option(retaliate, 'Never'));
  assert.equal(s.state.style, 'ranged');
  assert.equal(s.state.retaliate, 'never');
  assert.equal(s.state.mode, 'simple', 'quick settings keep the mode');

  choose(modeSelect, 'expert');
  assert.equal(s.state.mode, 'expert');
  assert.equal(selected(modeSelect), 'expert');
  assert.equal(visible(cls), false, 'class only while Attack choice is Auto');
  assert.equal(visible(goal), false, 'training goal only while Strategy is Auto');
  assert.equal(visible(retaliate), true);

  s.assistance.setMode('pacifist');
  assert.equal(visible(retaliate), false, 'nothing to retaliate with');
  assert.equal(sectionValue(s.node, 'Attack setup').hidden, true);
});

test('editing a mode setting goes through setPolicy and lands in Custom', () => {
  const s = setup();
  const settings = sectionValue(s.node, 'Mode settings');
  const strategy = settings.querySelector('[aria-label=Strategy]');
  press(option(strategy, 'Manual'));
  assert.deepEqual(s.calls.at(-1), ['setPolicy', 'strategy', 'manual']);
  assert.equal(selected(s.node.querySelector('select')), 'custom');
  assert.equal(settings.querySelector('.q-section__value').textContent, 'Custom');
  const autoEat = [...settings.querySelectorAll('.q-switch')].find(x => /Auto-eat/.test(x.textContent));
  assert.equal(autoEat.getAttribute('aria-checked'), 'true');
  press(autoEat);
  assert.equal(s.state.custom.autoEat, false);
});

test('strategy, spells and auras update their section headers and act through the systems', () => {
  const s = setup();
  const strategy = sectionValue(s.node, 'Strategy');
  assert.equal(strategy.querySelector('.q-section__value').textContent, 'Technical');
  press([...strategy.querySelectorAll('.q-tile')].find(t => t.querySelector('strong').textContent === 'Defensive'));
  assert.equal(strategy.querySelector('.q-section__value').textContent, 'Defensive');
  assert.equal(s.state.overrides.strategy, true);
  // A one-time override shows with Return to Auto and a way to make it permanent.
  const note = s.node.querySelector('.q-note');
  assert.equal(note.hidden, false);
  assert.match(note.textContent, /Strategy/);
  press(note.querySelector('.q-chip-button'));
  assert.deepEqual(s.calls.at(-1), ['setPolicy', 'strategy', 'manual']);
  s.assistance.setMode('simple');
  s.assistance.setStrategyManually('fast');
  press([...note.querySelectorAll('.q-button')].find(b => b.textContent === 'Return to Auto'));
  assert.deepEqual(s.calls.at(-1), ['returnToAuto']);
  assert.equal(note.hidden, true);

  // Powers in brief: aura switches and ability queue; the full lists live on the Powers page.
  const powers = sectionValue(s.node, 'Powers');
  assert.equal(powers.hidden, true, 'nothing learned: no section');
  s.styles.learn('energyStrike');
  s.styles.setQuickSpell('energyStrike');
  assert.equal(powers.hidden, false);
  assert.equal(powers.querySelector('.q-section__value').textContent, 'Quick: Energy Strike');
  s.auras.learn('rush');
  press(powers.querySelector('[role=switch]'));
  assert.equal(s.auras.isActive('rush'), true);
  assert.equal(powers.querySelector('.q-section__value').textContent, 'Quick: Energy Strike · 1 aura on');
  press([...powers.querySelectorAll('button')].find(b => /All spells, auras and abilities/.test(b.textContent)));
  assert.deepEqual(s.opened, ['powers']);
});

test('abilities queue from the Powers section', () => {
  const s = setup();
  s.styles.learnAbility('strongStrike');
  const queue = sectionValue(s.node, 'Powers').querySelector('.q-button');
  press(queue);
  assert.equal(queue.textContent, 'Queued');
});
