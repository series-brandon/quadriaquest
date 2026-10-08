import test from 'node:test';
import assert from 'node:assert/strict';
import {installDom} from '../test-dom.js';
import {mount} from '../dom.js';
import {questsPage} from './quests-page.js';
import {updateObjective, finishObjective, resetObjectives, registerQuestChapter, setObjectiveHelp, questChapters, questRevision, showObjectiveHelp} from '../../quests.js';

installDom();

const press = el => el.dispatchEvent(new window.Event('click'));
const setup = () => mount(() => questsPage({chapters: questChapters, revision: questRevision, help: showObjectiveHelp})).node;

test('chapters and tasks follow the shared quest state, keeping task nodes', () => {
  resetObjectives();
  const node = setup();
  assert.match(node.textContent, /Your next adventure will appear here/);
  updateObjective('gather', 'Collect ground items', 'Collect six handfuls.', 0, 6);
  const quest = node.querySelector('.q-quest');
  assert.equal(quest.querySelector('strong').textContent, 'A Small Beginning');
  assert.equal(quest.querySelector('small').textContent, '0 / 1 tasks');
  const task = node.querySelector('.q-task');
  assert.match(task.textContent, /Collect ground items/);
  assert.equal(task.querySelector('[role=progressbar]').getAttribute('aria-valuenow'), '0');
  updateObjective('gather', 'Collect ground items', 'Collect six handfuls.', 3, 6);
  assert.equal(node.querySelector('.q-task'), task, 'the same task node updates');
  assert.equal(task.querySelector('small').textContent, '3 / 6');
  assert.equal(node.dataset.view, 'detail', 'one chapter: straight to it');
  finishObjective('gather');
  assert.match(node.textContent, /Every task in this quest is complete/);
  assert.match(node.querySelector('.q-tasks--done').textContent, /✓ Collect ground items/);
  assert.equal(quest.querySelector('small').textContent, 'Complete');
  resetObjectives();
});

test('the unfinished chapter is chosen first; choosing switches; help runs the task action', () => {
  resetObjectives();
  registerQuestChapter('test-', 'Test Chapter');
  updateObjective('done-one', 'Finished', 'Done already.', 1, 1);
  updateObjective('test-a', 'Do a thing', 'Somewhere.', 0, 1);
  let helped = 0;
  setObjectiveHelp('test-a', () => helped++);
  const node = setup();
  const quests = [...node.querySelectorAll('.q-quest')];
  assert.deepEqual(quests.map(q => q.querySelector('strong').textContent), ['A Small Beginning', 'Test Chapter']);
  assert.equal(quests[1].getAttribute('aria-pressed'), 'true', 'the chapter with unfinished tasks');
  const show = [...node.querySelectorAll('.q-task button')].find(b => b.textContent === 'Show me how');
  assert.equal(show.hidden, false);
  press(show);
  assert.equal(helped, 1);
  press(quests[0]);
  assert.equal(quests[0].getAttribute('aria-pressed'), 'true');
  assert.equal(node.querySelector('.q-quests__title').textContent, 'A Small Beginning');
  assert.equal(node.dataset.view, 'detail');
  press(node.querySelector('.q-quests__back'));
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
