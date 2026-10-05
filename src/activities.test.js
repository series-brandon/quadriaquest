import test from 'node:test';
import assert from 'node:assert/strict';
import {craftAxe,tickCraft,cancelActivity} from './activities.js';

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
test('pickaxe crafting rewards the correct tool and cancellation preserves materials',async()=>{
 const {craftPickaxe}=await import('./activities.js');
 const inventory={sticks:2,stones:2,pickaxes:0,axes:1};
 const cancelled=craftPickaxe(inventory);tickCraft(cancelled,1,inventory);cancelActivity(cancelled);
 assert.equal(tickCraft(cancelled,3,inventory),false);assert.equal(inventory.sticks,2);
 const action=craftPickaxe(inventory);assert.equal(tickCraft(action,2,inventory),true);
 assert.deepEqual(inventory,{sticks:1,stones:1,pickaxes:1,axes:1});assert.equal(tickCraft(action,2,inventory),false);
});
