import test from 'node:test';
import assert from 'node:assert/strict';
import {installDom} from '../test-dom.js';
import {signal} from '../../reactive.js';
import {h, mount} from '../dom.js';
import {characterPage} from './character-page.js';
import {createCharacter, ATTRIBUTES} from '../../character.js';

installDom();

const press = el => el.dispatchEvent(new window.Event('click'));

test('core level and attribute points use the shared character', () => {
  const character = createCharacter(), allocated = [];
  const {node} = mount(() => characterPage({character, onAllocate: id => allocated.push(id), skills: () => h('p'), proficiencies: () => h('p')}));
  const core = node;
  assert.match(core.textContent, /Core level 1/);
  const points = character.unspent;
  const unspent = core.querySelector('.q-core__points b');
  assert.match(unspent.textContent, new RegExp(`${points} unspent point`));
  assert.equal(unspent.hasAttribute('data-unspent'), points > 0);
  const plus = core.querySelectorAll('.q-attribute button');
  assert.equal(plus.length, ATTRIBUTES.length);
  const before = character.attribute(ATTRIBUTES[0]);
  press(plus[0]);
  assert.equal(character.attribute(ATTRIBUTES[0]), before + 1);
  assert.deepEqual(allocated, [ATTRIBUTES[0]]);
  assert.match(unspent.textContent, new RegExp(`${points - 1} unspent point`));
  assert.equal(core.querySelector('.q-attribute__value').textContent, String(before + 1));
  character.grantPoints(-character.unspent);
  assert.equal(plus[0].disabled, true, 'no points: no spending');
});


test('sub-tabs switch panels, remember the choice through the host signal, and badge unspent points', () => {
  const character = createCharacter(), section = signal('attributes');
  const {node} = mount(() => characterPage({character, section, skills: () => h('p', null, 'skills list'), proficiencies: () => h('p', null, 'proficiency list')}));
  const tabs = [...node.querySelectorAll('[role=tab]')];
  const panels = [...node.querySelectorAll('[role=tabpanel]')];
  assert.deepEqual(tabs.map(t => t.textContent), ['Attributes', 'Skills', 'Proficiencies']);
  assert.deepEqual(panels.map(p => p.hidden), [false, true, true]);
  assert.equal(tabs[0].getAttribute('aria-controls'), panels[0].id);
  press(tabs[2]);
  assert.equal(section.value, 'proficiencies');
  assert.deepEqual(panels.map(p => p.hidden), [true, true, false]);
  assert.equal(tabs[2].getAttribute('aria-selected'), 'true');
  tabs[2].dispatchEvent(Object.assign(new window.Event('keydown'), {key: 'ArrowRight'}));
  assert.equal(section.value, 'attributes', 'arrow keys wrap around');
  section.value = 'skills';
  assert.deepEqual(panels.map(p => p.hidden), [true, false, true], 'the host can open a sub-tab');
  const badge = tabs[0].querySelector('.q-badge');
  assert.equal(badge.hidden, !(character.unspent > 0));
  character.grantPoints(-character.unspent);
  assert.equal(badge.hidden, true);
  character.grantPoints(1);
  assert.equal(badge.hidden, false);
});

test('without a character only the progression lists show', () => {
  const section = signal('attributes');
  const {node} = mount(() => characterPage({section, skills: () => h('p', null, 'skills list'), proficiencies: () => h('p', null, 'proficiency list')}));
  assert.deepEqual([...node.querySelectorAll('[role=tab]')].map(t => t.textContent), ['Skills', 'Proficiencies']);
  assert.equal(section.value, 'skills');
  assert.equal(node.querySelector('.q-core'), null);
});
