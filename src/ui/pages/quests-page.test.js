import test from 'node:test';
import assert from 'node:assert/strict';
import {installDom} from '../test-dom.js';
import {mount} from '../dom.js';
import {questsPage} from './quests-page.js';
import {updateObjective, finishObjective, finishQuest, resetObjectives, registerQuestChapter, setObjectiveHelp, questChapters, questRevision, showObjectiveHelp} from '../../quests.js';

installDom();

const press = el => el.dispatchEvent(new window.Event('click'));
const setup = () => mount(() => questsPage({chapters: questChapters, revision: questRevision, help: showObjectiveHelp})).node;

test('the quest list splits quests in progress from completed ones and opens a quest in its place', () => {
  resetObjectives();
  const node = setup();
  assert.match(node.textContent, /Your next adventure will appear here/);
  updateObjective('gather', 'Collect ground items', 'Collect six handfuls.', 0, 6);
  const active = () => [...node.querySelectorAll('[aria-label="Quests in progress"] .q-quest')];
  const done = () => [...node.querySelectorAll('[aria-label="Completed quests"] .q-quest')];
  assert.deepEqual(active().map(q => q.querySelector('strong').textContent), ['A Small Beginning']);
  assert.equal(active()[0].querySelector('small').textContent, 'Collect ground items', 'the row names the current objective');
  assert.equal(node.dataset.view, 'list', 'the tab opens on the quest list');
  press(active()[0]);
  assert.equal(node.dataset.view, 'detail');
  assert.equal(node.querySelector('.q-quests__title').textContent, 'A Small Beginning');
  const task = node.querySelector('.q-task');
  assert.equal(task.querySelector('[role=progressbar]').getAttribute('aria-valuenow'), '0');
  updateObjective('gather', 'Collect ground items', 'Collect six handfuls.', 3, 6);
  assert.equal(node.querySelector('.q-task'), task, 'the same objective node updates');
  assert.equal(task.querySelector('small').textContent, '3 / 6');
  // Finishing every current objective doesn't end the quest: the next one may still be coming.
  finishObjective('gather');
  assert.match(node.querySelector('.q-tasks--done').textContent, /✓ Collect ground items/);
  assert.match(node.textContent, /Your next objective will appear here/);
  assert.equal(done().length, 0);
  updateObjective('craft', 'Craft an axe', 'Use the crafting tab.', 0, 1);
  assert.equal(node.querySelector('.q-tasks .q-task strong').textContent, 'Craft an axe', 'the next objective becomes current');
  finishObjective('craft');
  finishQuest();
  assert.match(node.textContent, /Every objective in this quest is complete/);
  press(node.querySelector('.q-quests__back'));
  assert.equal(node.dataset.view, 'list');
  assert.equal(active().length, 0);
  assert.match(node.textContent, /No quests in progress/);
  assert.deepEqual(done().map(q => q.querySelector('small').textContent), ['Complete']);
  resetObjectives();
  assert.match(node.textContent, /Your next adventure will appear here/);
});

test('in-progress quests list before completed ones; help runs the objective action; a reset quest returns to the list', () => {
  resetObjectives();
  registerQuestChapter('test-', 'Test Chapter');
  updateObjective('done-one', 'Finished', 'Done already.', 1, 1);
  finishQuest();
  updateObjective('test-a', 'Do a thing', 'Somewhere.', 0, 1);
  let helped = 0;
  setObjectiveHelp('test-a', () => helped++);
  const node = setup();
  assert.deepEqual([...node.querySelectorAll('[aria-label="Quests in progress"] .q-quest strong')].map(q => q.textContent), ['Test Chapter']);
  assert.deepEqual([...node.querySelectorAll('[aria-label="Completed quests"] .q-quest strong')].map(q => q.textContent), ['A Small Beginning']);
  press(node.querySelector('[aria-label="Quests in progress"] .q-quest'));
  const show = [...node.querySelectorAll('.q-task button')].find(b => b.textContent === 'Show me how');
  assert.equal(show.hidden, false);
  press(show);
  assert.equal(helped, 1);
  resetObjectives('test-');
  assert.equal(node.dataset.view, 'list');
  resetObjectives();
});

test('re-sending an unchanged objective does not notify the page', () => {
  resetObjectives();
  updateObjective('gather', 'Collect', 'Six.', 2, 6);
  const before = questRevision.peek();
  updateObjective('gather', 'Collect', 'Six.', 2, 6);
  setObjectiveHelp('gather', () => {});
  const withHelp = questRevision.peek();
  setObjectiveHelp('gather', () => {});
  assert.equal(questRevision.peek(), withHelp, 'replacing one help action with another changes nothing visible');
  assert.equal(withHelp, before + 1);
  resetObjectives();
});

test('a task split into parts lists each part and sums their progress', () => {
  resetObjectives();
  const node = setup();
  const parts = (rocks, sticks) => [{label: 'Collect 3 Rocks', current: rocks, total: 3}, {label: 'Collect 3 Sticks', current: sticks, total: 3}];
  updateObjective('gather', 'Collect ground items', 'Rocks and sticks.', 0, 1, parts(0, 1));
  press(node.querySelector('.q-quest'));
  const task = node.querySelector('.q-task'), items = () => [...task.querySelectorAll('.q-task__parts li')];
  assert.deepEqual(items().map(li => li.textContent), ['Collect 3 Rocks · 0 / 3', 'Collect 3 Sticks · 1 / 3']);
  assert.equal(task.querySelector('small').textContent, '1 / 6');
  const rocks = items()[0];
  updateObjective('gather', 'Collect ground items', 'Rocks and sticks.', 0, 1, parts(1, 5));
  assert.equal(items()[0], rocks, 'part rows are kept');
  assert.deepEqual(items().map(li => li.textContent), ['Collect 3 Rocks · 1 / 3', '✓ Collect 3 Sticks · 3 / 3']);
  assert.equal(task.querySelector('small').textContent, '4 / 6');
  finishObjective('gather');
  assert.match(node.querySelector('.q-tasks--done').textContent, /✓ Collect ground items/);
  resetObjectives();
});
