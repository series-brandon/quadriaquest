import test from 'node:test';
import assert from 'node:assert/strict';
import {createCookingSystem} from './cooking.js';

test('one shared cooking action works with stations from different worlds',()=>{
 const inventory={rawFish:3,cookedFish:0},rewards=[];let cooking;
 cooking=createCookingSystem({inventory,stop:()=>cooking.cancel(),completed:(changes,reward)=>rewards.push({changes,reward})});
 for(const world of ['clearing','another-world']){
  let done=0;const station={world,available:()=>true,onCooked:id=>{assert.equal(id,'cookedFish');done++;}};
  assert.ok(cooking.start('cookedFish',station));cooking.update(1);assert.equal(done,0);cooking.update(3);cooking.update(30);assert.equal(done,1);
 }
 assert.deepEqual(inventory,{rawFish:1,cookedFish:2});assert.equal(cooking.skill.xp,40);assert.equal(rewards.length,2);assert.equal(cooking.working,false);
});
test('cancelling, losing a station, or losing ingredients never grants cooking rewards',()=>{
 const inventory={rawFish:3,cookedFish:0};let live=true,earned=0;const cooking=createCookingSystem({inventory,stop(){},completed(){earned++;}}),station={available:()=>live};
 assert.equal(cooking.start('cookedFish',null),false);
 cooking.start('cookedFish',station);cooking.update(1);cooking.cancel();cooking.update(10);assert.equal(inventory.rawFish,3);
 cooking.start('cookedFish',station);live=false;cooking.update(10);assert.equal(inventory.rawFish,3);
 live=true;cooking.start('cookedFish',station);inventory.rawFish=0;cooking.update(10);assert.equal(earned,0);assert.equal(inventory.cookedFish,0);assert.equal(cooking.skill.xp,0);
});
