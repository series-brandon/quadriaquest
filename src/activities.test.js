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

test('pickaxe crafting rewards the correct tool and cancellation preserves materials',async()=>{
 const {craftPickaxe}=await import('./activities.js');
 const inventory={sticks:2,stones:2,pickaxes:0,axes:1};
 const cancelled=craftPickaxe(inventory);tickCraft(cancelled,1,inventory);cancelActivity(cancelled);
 assert.equal(tickCraft(cancelled,3,inventory),false);assert.equal(inventory.sticks,2);
 const action=craftPickaxe(inventory);assert.equal(tickCraft(action,2,inventory),true);
 assert.deepEqual(inventory,{sticks:1,stones:1,pickaxes:1,axes:1});assert.equal(tickCraft(action,2,inventory),false);
});
test('mining requires a pickaxe and awards one to three Stone after a fresh action',async()=>{
 const {mineBoulder}=await import('./activities.js');
 assert.equal(mineBoulder({axes:1},{felled:false}),null);
 assert.equal(mineBoulder({pickaxes:1},{felled:true}),null);
 for(const roll of [0,.5,.999999]){const boulder={felled:false};const action=mineBoulder({pickaxes:1},boulder,()=>roll);assert.equal(action.kind,'mine');assert.ok(action.duration>=3&&action.duration<=6);assert.ok(action.logs>=1&&action.logs<=3);action.elapsed=2;cancelActivity(action);assert.equal(mineBoulder({pickaxes:1},boulder).elapsed,0);}
});
