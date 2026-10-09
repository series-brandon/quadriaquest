import test from 'node:test';
import assert from 'node:assert/strict';
import {practiceCleared} from './practice-goal.js';
test('practice requires every resource and fully fallen tree, independently of inventory',()=>{
 const resources=[{depleted:true},{depleted:false}],trees=[{depleted:true,group:{visible:false}}];
 assert.equal(practiceCleared(resources,trees),false);
 resources[1].depleted=true;assert.equal(practiceCleared(resources,trees),true);
 trees[0].group.visible=true;assert.equal(practiceCleared(resources,trees),false);
 trees[0].group.visible=false;trees[0].depleted=false;assert.equal(practiceCleared(resources,trees),false);
 assert.equal(practiceCleared([],[]),false);
});
test('practice also waits for boulders to finish disappearing',()=>{
 const resources=[{depleted:true}],nodes=[{kind:'tree',depleted:true,group:{visible:false}},{kind:'boulder',depleted:false,group:{visible:true}}];
 assert.equal(practiceCleared(resources,nodes),false);nodes[1].depleted=true;assert.equal(practiceCleared(resources,nodes),false);nodes[1].group.visible=false;assert.equal(practiceCleared(resources,nodes),true);
});
