import test from 'node:test';
import assert from 'node:assert/strict';
import {craftAxe,tickCraft,cancelActivity,chopTree} from './activities.js';

test('crafting spends one stick and one stone only after two seconds, exactly once',()=>{
 const inventory={sticks:3,stones:3,axes:0};const action=craftAxe(inventory);
 assert.equal(tickCraft(action,1.99,inventory),false);assert.deepEqual(inventory,{sticks:3,stones:3,axes:0});
 assert.equal(tickCraft(action,.01,inventory),true);assert.deepEqual(inventory,{sticks:2,stones:2,axes:1});
 assert.equal(tickCraft(action,10,inventory),false);assert.equal(inventory.axes,1);
});
test('cancelled crafting preserves ingredients and a restart begins at zero',()=>{
 const inventory={sticks:1,stones:1,axes:0},action=craftAxe(inventory);
 tickCraft(action,1,inventory);cancelActivity(action);assert.equal(tickCraft(action,10,inventory),false);
 assert.deepEqual(inventory,{sticks:1,stones:1,axes:0});assert.equal(craftAxe(inventory).elapsed,0);
 assert.equal(craftAxe({sticks:0,stones:1}),null);
});
test('chopping requires an axe and a standing tree; durations and logs stay within bounds',()=>{
 const tree={felled:false};assert.equal(chopTree({axes:0},tree),null);
 assert.equal(chopTree({axes:1},{felled:true}),null);
 for(const random of [()=>0,()=>.5,()=>.999999]){
  const action=chopTree({axes:1},tree,random);assert.ok(action.duration>=3&&action.duration<=6);assert.ok(action.logs>=1&&action.logs<=3);
  action.elapsed=2;cancelActivity(action);assert.equal(action.status,'cancelled');assert.equal(chopTree({axes:1},tree,random).elapsed,0);
 }
});
