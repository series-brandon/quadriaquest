import test from 'node:test';
import assert from 'node:assert/strict';
import {practiceCleared} from './practice-goal.js';
test('practice requires every resource and fully fallen tree, independently of inventory',()=>{
 const resources=[{collected:true},{collected:false}],trees=[{felled:true,group:{visible:false}}];
 assert.equal(practiceCleared(resources,trees),false);
 resources[1].collected=true;assert.equal(practiceCleared(resources,trees),true);
 trees[0].group.visible=true;assert.equal(practiceCleared(resources,trees),false);
 trees[0].group.visible=false;trees[0].felled=false;assert.equal(practiceCleared(resources,trees),false);
 assert.equal(practiceCleared([],[]),false);
});
test('practice also waits for boulders to finish disappearing',()=>{
 const resources=[{collected:true}],nodes=[{kind:'tree',felled:true,group:{visible:false}},{kind:'boulder',felled:false,group:{visible:true}}];
 assert.equal(practiceCleared(resources,nodes),false);nodes[1].felled=true;assert.equal(practiceCleared(resources,nodes),false);nodes[1].group.visible=false;assert.equal(practiceCleared(resources,nodes),true);
});
