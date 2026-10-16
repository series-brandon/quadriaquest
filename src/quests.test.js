import test from 'node:test';
import assert from 'node:assert/strict';
import {updateObjective, finishObjective, finishQuest, resetObjectives, registerQuestChapter, removeObjective, objectives, notice} from './quests.js';

const kinds = [];
const watch = () => { kinds.length = 0; let seq = notice.peek()?.seq; return () => { const n = notice.peek(); if (n && n.seq !== seq) { seq = n.seq; kinds.push(n.kind); } }; };

test('notices name what happened: progress, a finished part, a finished objective, a finished quest', () => {
  resetObjectives();
  const seen = watch();
  const parts = (rocks, sticks) => [{label: 'Collect 3 Rocks', current: rocks, total: 3}, {label: 'Collect 3 Sticks', current: sticks, total: 3}];
  updateObjective('gather', 'Collect ground items', 'Both.', 0, 1, parts(0, 0)); seen();
  updateObjective('gather', 'Collect ground items', 'Both.', 0, 1, parts(1, 0)); seen();
  updateObjective('gather', 'Collect ground items', 'Both.', 0, 1, parts(3, 0)); seen();
  updateObjective('gather', 'Collect ground items', 'Both.', 0, 1, parts(3, 2)); seen();
  updateObjective('gather', 'Collect ground items', 'Both.', 0, 1, parts(3, 3)); seen();
  finishQuest(); seen();
  assert.deepEqual(kinds, ['progress', 'progress', 'task', 'progress', 'objective', 'quest']);
  assert.equal(notice.peek().title, 'A Small Beginning');
  resetObjectives();
});

test('new wording for the same progress updates quietly; re-finishing is not a new completion', () => {
  resetObjectives();
  registerQuestChapter('quiet-', 'Quiet Quest');
  const seen = watch();
  updateObjective('quiet-inventory', 'Check your inventory', 'Open the Inventory tab.'); seen();
  updateObjective('quiet-inventory', 'Check your inventory', 'Select Sticks.'); seen();
  updateObjective('quiet-inventory', 'Check your inventory', 'Read the details.'); seen();
  assert.deepEqual(kinds, ['progress'], 'only the assignment notifies');
  finishObjective('quiet-inventory'); seen();
  finishObjective('quiet-inventory'); seen();
  finishQuest('quiet-'); seen();
  finishQuest('quiet-'); seen();
  assert.deepEqual(kinds, ['progress', 'objective', 'quest']);
  assert.equal(notice.peek().title, 'Quiet Quest');
  resetObjectives();
});

test('losing progress is a quiet setback; a withdrawn objective leaves the quest', () => {
  resetObjectives();
  const seen = watch();
  const parts = (hammer, wood) => [{label: 'Craft a Crude Hammer', current: hammer, total: 1}, {label: 'Gather Wood Pieces', current: wood, total: 3}];
  updateObjective('willow-prepare', 'Prepare for repair', 'Both.', 0, 1, parts(0, 2)); seen();
  updateObjective('willow-prepare', 'Prepare for repair', 'Both.', 0, 1, parts(1, 3)); seen();
  updateObjective('willow-bridge', 'Repair the bridge', 'Click it.'); seen();
  updateObjective('willow-prepare', 'Prepare for repair', 'Both.', 0, 1, parts(1, 1)); seen();
  removeObjective('willow-bridge');
  assert.deepEqual(kinds, ['progress', 'objective', 'progress', 'setback']);
  assert.equal(objectives.has('willow-bridge'), false);
  assert.equal(objectives.get('willow-prepare').current, 2);
  resetObjectives();
});
