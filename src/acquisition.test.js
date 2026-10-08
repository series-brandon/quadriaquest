import test from 'node:test';
import assert from 'node:assert/strict';
import {nextStep,stepKey,describeStep} from './acquisition.js';

test('the next step gathers a recipe\'s missing ground items together, then crafts it',()=>{
 assert.deepEqual(nextStep({},[['hammers',1]]),{step:'gather',kinds:['sticks','stones'],items:['sticks','stones'],have:null,count:null,for:'hammers'});
 assert.deepEqual(nextStep({sticks:1},[['hammers',1]]),{step:'gather',kinds:['stones'],items:['stones'],have:0,count:1,for:'hammers'});
 assert.deepEqual(nextStep({sticks:1,stones:1},[['hammers',1]]),{step:'craft',item:'hammers',for:null});
 assert.equal(nextStep({hammers:1},[['hammers',1]]),null);
});

test('a fishing rod needs both its Sticks',()=>{
 assert.deepEqual(nextStep({sticks:1},[['rods',1]]),{step:'gather',kinds:['sticks'],items:['sticks'],have:1,count:2,for:'rods'});
 assert.deepEqual(nextStep({sticks:2},[['rods',1]]),{step:'craft',item:'rods',for:null});
});

test('harvested materials need their tool first, crafting it when needed',()=>{
 assert.deepEqual(nextStep({hammers:1},[['hammers',1],['logs',3]]),{step:'gather',kinds:['sticks','stones'],items:['sticks','stones'],have:null,count:null,for:'axes'});
 assert.deepEqual(nextStep({hammers:1,sticks:1,stones:1},[['hammers',1],['logs',3]]),{step:'craft',item:'axes',for:'logs'});
 assert.deepEqual(nextStep({hammers:1,axes:1,logs:1},[['hammers',1],['logs',3]]),{step:'harvest',kind:'tree',item:'logs',have:1,count:3,for:null});
});

test('a campfire works back through its tool: flint, mined stone, then Flint and Stone',()=>{
 const need=[['campfires',1]];
 assert.equal(nextStep({logs:2},need).step,'gather');assert.deepEqual(nextStep({logs:2},need).items,['flint']);
 assert.deepEqual(nextStep({logs:2,flint:1},need).for,'pickaxes','no pickaxe: gather for one first');
 assert.deepEqual(nextStep({logs:2,flint:1,sticks:1,stones:1},need),{step:'craft',item:'pickaxes',for:'stone'},'then make it');
 assert.deepEqual(nextStep({logs:2,flint:1,pickaxes:1},need),{step:'harvest',kind:'boulder',item:'stone',have:0,count:1,for:'firestarters'});
 assert.deepEqual(nextStep({logs:2,flint:1,stone:1},need).item,'firestarters','stone in hand needs no pickaxe');
 assert.deepEqual(nextStep({logs:2,flint:1,stone:1,pickaxes:1},need),{step:'craft',item:'firestarters',for:'campfires'});
 assert.deepEqual(nextStep({logs:2,firestarters:1},need),{step:'craft',item:'campfires',for:null});
 assert.equal(nextStep({firestarters:1,axes:1},need).step,'harvest','logs for the campfire');
 assert.deepEqual(nextStep({axes:1},need).items,['flint'],'its tool before its logs');
});

test('a step keeps its identity while progress inside it changes, and reads plainly',()=>{
 const one=nextStep({hammers:1,axes:1,logs:1},[['logs',3]]),two=nextStep({hammers:1,axes:1,logs:2},[['logs',3]]);
 assert.equal(stepKey(one),stepKey(two));assert.notEqual(stepKey(one),stepKey(nextStep({},[['hammers',1]])));
 assert.equal(describeStep(nextStep({},[['hammers',1]])).text,'Pick up Sticks and Rocks to make a Crude Hammer.');
 assert.equal(describeStep(nextStep({sticks:1},[['rods',1]]),{shown:true}).text,'Pick up Sticks to make a Crude Fishing Rod. (1 of 2) They\'re highlighted on the ground.');
 assert.equal(describeStep(nextStep({sticks:1,stones:1},[['logs',3]])).text,'You need a Crude Axe to get Small Logs. Open the Crafting tab, choose the Crude Axe, then craft it.');
 assert.equal(describeStep(two,{purpose:'for the bridge'}).text,'You need Small Logs ×3 for the bridge. Chop trees for them. You have 2.');
 assert.equal(describeStep(nextStep({sticks:1,stones:1},[['hammers',1]]),{purpose:'to repair the bridge'}).text,'You need a Crude Hammer to repair the bridge. Open the Crafting tab, choose the Crude Hammer, then craft it.');
});
