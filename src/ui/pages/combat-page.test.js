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
  const state = {control: 'auto', pacifist: false, style: 'melee', goal: null, manual: {strategy: false, spell: false, auras: {}}, advanced: {showEnergy: false, showKi: false, autoEat: true, emergencyPriority: false, allowRiskySpells: false, foodExclusions: [], spellExclusions: [], auraRecovery: .5, auraGrace: 5}};
  const calls = [];
  const assistance = {
    revision,
    get settings() { return structuredClone(state); },
    optimizeReport: '',
    setControl(next) { state.control = next; bump(); },
    setPacifist(on) { state.pacifist = on; bump(); },
    setStyle(next) { state.style = next; bump(); },
    setGoal(next) { state.goal = next; bump(); },
    optimize() { this.optimizeReport = 'Equipped Copper Dagger.'; bump(); },
    setStrategyManually(id) { state.manual.strategy = true; styles.setStrategy(id); bump(); },
    selectSpellManually(id) { state.manual.spell = true; const ok = styles.select(id); bump(); return ok; },
    toggleAuraManually(id) { state.manual.auras[id] = true; const r = auras.toggle(id); bump(); return r; },
    returnToAuto(kind, id) { calls.push(['returnToAuto', kind, id]); if (kind === 'aura') delete state.manual.auras[id]; else state.manual[kind] = false; bump(); },
    setAdvanced(patch) { Object.assign(state.advanced, patch); bump(); },
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

test('Simple shows only class, training goal and Optimize; Manual reveals the attack setup', () => {
  const s = setup();
  const [autoPanel, manualPanel] = s.node.querySelectorAll('.q-page__group');
  assert.equal(visible(autoPanel), true);
  assert.equal(visible(manualPanel), false);
  assert.match(s.node.querySelector('.q-card').textContent, /Bare hands1–10 damage every 2\.5s/);
  const goal = s.node.querySelector('select');
  assert.equal(goal.selectedOptions?.[0]?.value ?? [...goal.options].find(o => o.selected).value, '');
  s.assistance.setGoal('power');
  assert.equal([...goal.options].find(o => o.selected).value, 'power');
  press([...autoPanel.querySelectorAll('.q-segmented__option')].find(b => b.textContent === 'Ranged'));
  assert.equal(s.state.style, 'ranged');
  press([...s.node.querySelectorAll('.q-page__lead .q-segmented__option')].find(b => b.textContent === 'Manual'));
  assert.equal(s.state.control, 'manual');
  assert.equal(visible(autoPanel), false);
  assert.equal(visible(manualPanel), true);
  const retaliate = manualPanel.querySelector('.q-switch');
  press(retaliate);
  assert.equal(retaliate.getAttribute('aria-checked'), 'false');
});

test('strategy, spells and auras update their section headers and act through the systems', () => {
  const s = setup();
  const strategy = sectionValue(s.node, 'Strategy');
  assert.equal(strategy.querySelector('.q-section__value').textContent, 'Technical');
  press([...strategy.querySelectorAll('.q-tile')].find(t => t.querySelector('strong').textContent === 'Defensive'));
  assert.equal(strategy.querySelector('.q-section__value').textContent, 'Defensive');
  assert.equal(s.state.manual.strategy, true);
  // The manual-choice chip returns it to Auto.
  press(s.node.querySelector('.q-chip-button'));
  assert.deepEqual(s.calls.at(-1), ['returnToAuto', 'strategy', undefined]);

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

test('abilities queue from the page and Simple settings write through', () => {
  const s = setup();
  s.styles.learnAbility('strongStrike');
  const queue = sectionValue(s.node, 'Abilities').querySelector('.q-button');
  press(queue);
  assert.equal(queue.textContent, 'Queued');
  const autoEat = [...sectionValue(s.node, 'Simple settings').querySelectorAll('input[type=checkbox]')][2];
  assert.equal(autoEat.checked, true);
  autoEat.checked = false;
  autoEat.dispatchEvent(new window.Event('change'));
  assert.equal(s.state.advanced.autoEat, false);
});

test('each spell carries its own Simple permission, shown only in Simple mode', () => {
  const s = setup();
  s.styles.learn('energyStrike');
  const spells = sectionValue(s.node, 'Spells');
  const allow = spells.querySelector('[role=switch]');
  assert.equal(allow.getAttribute('aria-checked'), 'true', 'allowed by default');
  press(allow);
  assert.deepEqual(s.state.advanced.spellExclusions, ['energyStrike']);
  assert.equal(allow.getAttribute('aria-checked'), 'false');
  press(allow);
  assert.deepEqual(s.state.advanced.spellExclusions, []);
  s.assistance.setControl('manual');
  assert.equal(visible(allow), false, 'only Simple chooses spells for you');
});
