import test from 'node:test';
import assert from 'node:assert/strict';
import {installDom} from '../test-dom.js';
import {signal} from '../../reactive.js';
import {mount} from '../dom.js';
import {combatPage} from './combat-page.js';
import {createCombatStyles} from '../../combat-styles.js';
import {createAuras} from '../../auras.js';
import {createPlayerResources} from '../../player-resources.js';

installDom();

// Real styles and auras; assistance and combat reduced to their settings/preview surfaces.
function setup() {
  const styles = createCombatStyles({equipment: {attack: {}}});
  const resources = createPlayerResources();
  const auras = createAuras({ki: resources.ki});
  const revision = signal(0), bump = () => revision.value++;
  const PRESETS = {
    simple: {attacks: 'allowed', strategy: 'auto', attack: 'auto', abilities: 'auto', auras: 'auto', autoEat: true, emergencyPriority: false, allowRiskySpells: false, auraRecovery: .5, auraGrace: 3, showEnergy: false, showKi: false},
  };
  PRESETS.pacifist = {...PRESETS.simple, attacks: 'prevented', abilities: 'manual'};
  PRESETS.expert = {...PRESETS.simple, strategy: 'manual', attack: 'manual', abilities: 'manual', auras: 'manual', showEnergy: true, showKi: true};
  const state = {mode: 'simple', custom: {...PRESETS.simple}, retaliate: 'smart', style: 'melee', goal: null, permissions: {food: [], spell: [], aura: []}, overrides: {strategy: false, attack: false, auras: {}}};
  const policies = () => (state.mode === 'custom' ? state.custom : PRESETS[state.mode]);
  const calls = [];
  const assistance = {
    revision,
    get settings() { return structuredClone({...state, policies: policies()}); },
    optimizeReport: '',
    setMode(next) { state.mode = next; bump(); },
    setPolicy(key, value) { calls.push(['setPolicy', key, value]); state.custom = {...policies(), [key]: value}; state.mode = 'custom'; bump(); },
    setRetaliate(next) { state.retaliate = next; bump(); },
    setStyle(next) { state.style = next; bump(); },
    setGoal(next) { state.goal = next; bump(); },
    setPermission(kind, id, on) { state.permissions[kind] = on ? state.permissions[kind].filter(x => x !== id) : [...state.permissions[kind], id]; bump(); },
    allowed: (kind, id) => !state.permissions[kind].includes(id),
    optimize() { this.optimizeReport = 'Equipped Copper Dagger.'; bump(); },
    setStrategyManually(id) { state.overrides.strategy = true; styles.setStrategy(id); bump(); },
    selectSpellManually(id) { state.overrides.attack = true; const ok = styles.select(id); bump(); return ok; },
    toggleAuraManually(id) { state.overrides.auras[id] = true; const r = auras.toggle(id); bump(); return r; },
    returnToAuto() { calls.push(['returnToAuto']); state.overrides = {strategy: false, attack: false, auras: {}}; bump(); },
  };
  const combatRevision = signal(0);
  let autoRetaliate = true, pending = null;
  const combat = {
    revision: combatRevision,
    preview: () => ({name: 'Bare hands', min: 1, max: 10, interval: 2.5, combatStyle: 'melee', strategy: styles.strategy, backfirePercent: 0}),
    get autoRetaliate() { return autoRetaliate; },
    setAutoRetaliate(on) { autoRetaliate = on; combatRevision.value++; },
    get pending() { return pending; },
    committedAbility: null,
    queue(id) { pending = pending === id ? null : id; combatRevision.value++; return true; },
  };
  const {node} = mount(() => combatPage({styles, combat, auras, assistance}));
  return {node, styles, auras, resources, assistance, state, combat, calls};
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

  const spells = sectionValue(s.node, 'Spells');
  assert.equal(spells.hidden, true, 'no learned spells: no section');
  s.styles.learn('energyStrike');
  assert.equal(spells.hidden, false);
  press(spells.querySelector('.q-star'));
  assert.equal(s.styles.quickSpell, 'energyStrike');
  assert.equal(spells.querySelector('.q-section__value').textContent, 'Quick: Energy Strike');

  const auraSection = sectionValue(s.node, 'Auras');
  s.auras.learn('rush');
  const [star, onSwitch] = auraSection.querySelectorAll('.q-row__actions > button');
  press(onSwitch);
  assert.equal(s.auras.isActive('rush'), true);
  assert.equal(auraSection.querySelector('.q-section__value').textContent, '1 on');
  press(star);
  assert.equal(s.auras.isQuick('rush'), true);
  assert.equal(star.getAttribute('aria-pressed'), 'true');
});

test('abilities queue from the page', () => {
  const s = setup();
  s.styles.learnAbility('strongStrike');
  const queue = sectionValue(s.node, 'Abilities').querySelector('.q-button');
  press(queue);
  assert.equal(queue.textContent, 'Queued');
});

test('spells and auras carry their own Allow auto use permission, shown while that policy is Auto', () => {
  const s = setup();
  s.styles.learn('energyStrike');
  const allow = sectionValue(s.node, 'Spells').querySelector('[role=switch]');
  assert.equal(allow.getAttribute('aria-checked'), 'true', 'allowed by default');
  press(allow);
  assert.deepEqual(s.state.permissions.spell, ['energyStrike']);
  assert.equal(allow.getAttribute('aria-checked'), 'false');
  press(allow);
  assert.deepEqual(s.state.permissions.spell, []);
  s.auras.learn('harden');
  const auraAllow = sectionValue(s.node, 'Auras').querySelector('[role=switch]');
  press(auraAllow);
  assert.deepEqual(s.state.permissions.aura, ['harden']);
  s.assistance.setMode('expert');
  assert.equal(visible(allow), false, 'Manual attack choice: Auto never picks spells');
  assert.equal(visible(auraAllow), false);
  assert.equal(s.state.permissions.aura.length, 1, 'permissions are not part of a mode');
});
