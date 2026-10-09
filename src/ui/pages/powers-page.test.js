import test from 'node:test';
import assert from 'node:assert/strict';
import {installDom} from '../test-dom.js';
import {signal} from '../../reactive.js';
import {mount} from '../dom.js';
import {powersPage} from './powers-page.js';
import {combatSystems} from './test-systems.js';
import {SPELLS} from '../../combat-styles.js';
import {createCharacter} from '../../character.js';

installDom();

const press = el => el.dispatchEvent(new window.Event('click'));
const visible = el => !el.closest('[hidden]');

function setup() {
  const systems = combatSystems(), section = signal('spells'), character = createCharacter();
  const {node} = mount(() => powersPage({...systems, character, section}));
  const panel = id => node.querySelector(`[role=tabpanel][id$="-${id}-panel"]`);
  const card = (id, name) => [...panel(id).querySelectorAll('.q-power')].find(c => c.getAttribute('aria-label') === name);
  return {node, ...systems, section, character, panel, card};
}

test('sub-tabs list spells, auras and abilities; listed powers show locked until learned', () => {
  const s = setup();
  assert.deepEqual([...s.node.querySelectorAll('[role=tab]')].map(t => t.textContent), ['Spells', 'Auras', 'Abilities']);
  const spell = s.card('spells', 'Energy Strike');
  assert.equal(spell.hasAttribute('data-locked'), true);
  assert.match(spell.textContent, /Taught by Wisp in Cinderhold/);
  assert.match(spell.textContent, /Requires Magic Technique 1/);
  assert.match(spell.textContent, /20 power · 3s cast · range 6 · 4 Mana · 15 XP per cast/);
  assert.equal(visible(spell.querySelector('.q-star')), false, 'no quick slot until learned');
  s.styles.learn('energyStrike');
  assert.equal(spell.hasAttribute('data-locked'), false);
  assert.equal(visible(spell.querySelector('.q-star')), true);
  assert.equal(visible(spell.querySelector('.q-power__lock')), false);
  assert.equal(s.card('abilities', 'Strong Strike').hasAttribute('data-locked'), true);
  assert.equal(s.card('auras', 'Rush').hasAttribute('data-locked'), true);
});

test('unlisted powers stay secret until learned', () => {
  SPELLS.secretBolt = {name: 'Secret Bolt', style: 'magic', base: 5, castTime: 1, range: 4, mana: 1, elements: {energy: 1}, requirements: {}};
  try {
    const s = setup();
    assert.equal(s.card('spells', 'Secret Bolt'), undefined);
    s.styles.learn('secretBolt');
    assert.ok(s.card('spells', 'Secret Bolt'), 'appears once learned');
  } finally {
    delete SPELLS.secretBolt;
  }
});

test('quick spell, aura on/off, quick auras and ability queue act through the shared systems', () => {
  const s = setup();
  s.styles.learn('energyStrike');
  const star = s.card('spells', 'Energy Strike').querySelector('.q-star');
  press(star);
  assert.equal(s.styles.quickSpell, 'energyStrike');
  assert.equal(star.getAttribute('aria-pressed'), 'true');

  s.auras.learn('harden');
  const harden = s.card('auras', 'Harden');
  press([...harden.querySelectorAll('[role=switch]')].find(sw => /On/.test(sw.textContent)));
  assert.equal(s.auras.isActive('harden'), true);
  assert.equal(s.state.overrides.auras.harden, true, 'a manual switch is a one-time override');
  press(harden.querySelector('.q-star'));
  assert.equal(s.auras.isQuick('harden'), true);
  assert.match(harden.textContent, /0.5 Ki per second/);

  s.styles.learnAbility('strongStrike');
  const queue = s.card('abilities', 'Strong Strike').querySelector('.q-button');
  press(queue);
  assert.equal(queue.textContent, 'Queued');
});

test('each spell and aura carries its own Allow auto use, shown while that policy is Auto', () => {
  const s = setup();
  s.styles.learn('energyStrike');
  s.auras.learn('harden');
  const allow = s.card('spells', 'Energy Strike').querySelector('.q-power__allow [role=switch]');
  assert.equal(allow.getAttribute('aria-checked'), 'true', 'allowed by default');
  press(allow);
  assert.deepEqual(s.state.permissions.spell, ['energyStrike']);
  assert.equal(allow.getAttribute('aria-checked'), 'false');
  const auraAllow = s.card('auras', 'Harden').querySelector('.q-power__allow [role=switch]');
  press(auraAllow);
  assert.deepEqual(s.state.permissions.aura, ['harden']);
  s.assistance.setMode('expert');
  assert.equal(visible(allow), false, 'Manual attack choice: Auto never picks spells');
  assert.equal(visible(auraAllow), false);
  assert.equal(s.state.permissions.aura.length, 1, 'permissions are not part of a mode');
});

test('the host can open a given sub-tab', () => {
  const s = setup();
  s.section.value = 'auras';
  assert.equal(s.panel('auras').hidden, false);
  assert.equal(s.panel('spells').hidden, true);
});
