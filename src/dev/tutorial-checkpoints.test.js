import test from 'node:test';
import assert from 'node:assert/strict';
import {TUTORIAL_CHECKPOINTS,getCheckpoint} from './tutorial-checkpoints.js';
test('tutorial catalogue contains unique, area-qualified checkpoints and rejects unknown selections',()=>{
 assert.equal(new Set(TUTORIAL_CHECKPOINTS.map(c=>c.id)).size,TUTORIAL_CHECKPOINTS.length);
 for(const c of TUTORIAL_CHECKPOINTS){assert.equal(c.id,`${c.area}:${c.step}`);assert.equal(getCheckpoint(c.id),c);assert.ok(c.label.length>0);}
 assert.throws(()=>getCheckpoint('willowbank:combat'));
});
test('both tutorials expose individual menu, resource, rescue, and food lessons',()=>{
 for(const id of ['clearing:rotate','clearing:zoom','clearing:move','clearing:quests-menu','clearing:skills-detail','clearing:inventory-select','clearing:recipe','clearing:pickaxe','clearing:mine','willowbank:arrival','willowbank:hammer','willowbank:bridge','willowbank:rescue','willowbank:rod','willowbank:fish','willowbank:flint','willowbank:firestarter','willowbank:fire','willowbank:place','willowbank:cook','willowbank:eat'])assert.ok(getCheckpoint(id));
});
