import test from 'node:test';
import assert from 'node:assert/strict';
import {installDom} from '../test-dom.js';
import {signal} from '../../reactive.js';
import {mount} from '../dom.js';
import {skillsPage} from './skills-page.js';
import {createGatheringSkill, addSkillXp} from '../../skills.js';
import {createCharacter} from '../../character.js';

installDom();


function setup() {
  const character = createCharacter();
  const gathering = createGatheringSkill(), mining = createGatheringSkill();
  const extra = signal(false);
  const skills = () => ({Gathering: gathering, Mining: mining, ...(extra.value ? {Fishing: createGatheringSkill()} : {})});
  const guidance = signal({}), toggles = [];
  const {node} = mount(() => skillsPage({skills, track: () => character.revision.value, guidance, onToggle: (name, open) => toggles.push([name, open])}));
  const row = name => node.querySelector(`[data-skill="${name}"]`);
  return {node, character, gathering, extra, guidance, row, toggles};
}

test('skill rows follow their reactive records and keep their nodes', () => {
  const s = setup();
  const row = s.row('Gathering');
  assert.match(row.querySelector('.q-skill__level').textContent, /Lv 1/);
  addSkillXp(s.gathering, 130, 'Gathering');
  assert.equal(row.querySelector('.q-skill__level').textContent, 'Lv 2');
  assert.match(row.textContent, /130 total XP/);
  assert.match(row.textContent, /10 \/ 120 XP toward Level 3/);
  const bar = row.querySelector('[role=progressbar]');
  assert.equal(bar.getAttribute('aria-valuenow'), '8');
  assert.equal(bar.getAttribute('aria-label'), 'Gathering progress toward level 3');
  Object.assign(s.gathering, {xp: 0, level: 1});
  assert.equal(row.querySelector('.q-skill__level').textContent, 'Lv 1', 'resets show too');
  assert.equal(s.row('Gathering'), row);
  s.extra.value = true;
  assert.ok(s.row('Fishing'), 'skills that appear later get rows');
});

test('search hides rows without removing them', () => {
  const s = setup();
  const search = s.node.querySelector('input[type=search]');
  search.value = 'min';
  search.dispatchEvent(new window.Event('input'));
  assert.equal(s.row('Gathering').hidden, true);
  assert.equal(s.row('Mining').hidden, false);
  search.value = 'zzz';
  search.dispatchEvent(new window.Event('input'));
  assert.equal([...s.node.querySelectorAll('.q-page__help')].find(p => /No matching skills/.test(p.textContent)).hidden, false);
});

test('tutorial guidance highlights its skill until the player opens it, never opening it', () => {
  const s = setup();
  const row = s.row('Gathering');
  s.guidance.value = {locked: true, guide: 'Gathering'};
  assert.equal(row.hasAttribute('open'), false);
  assert.equal(row.hasAttribute('data-guide'), true);
  assert.equal(s.row('Mining').hasAttribute('data-guide'), false);
  row.setAttribute('open', '');row.dispatchEvent(new window.Event('toggle'));
  assert.equal(row.hasAttribute('data-guide'), false, 'opened by the player');
  assert.deepEqual(s.toggles, [['Gathering', true]]);
  s.guidance.value = {};
  assert.equal(row.hasAttribute('open'), true, 'the player\'s row stays open');
});

test('an empty list explains how to fill it', () => {
  const {node} = mount(() => skillsPage({skills: () => ({}), noun: 'proficiencies', empty: 'Use weapons to train proficiencies.'}));
  assert.equal(node.querySelector('input').getAttribute('aria-label'), 'Search proficiencies');
  assert.match(node.textContent, /Use weapons to train proficiencies\./);
});
