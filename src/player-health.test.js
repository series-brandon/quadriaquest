import test from 'node:test';
import assert from 'node:assert/strict';
import {createPlayerHealth,createFoodSystem,FOODS,CONSUMABLE_COOLDOWN} from './player-health.js';
function fixture(){const health=createPlayerHealth(30),inventory={cookedFish:4};let food,completed=0,confirmation;let consumed=0;food=createFoodSystem({inventory,health,stop:()=>food.cancel(),completed:()=>completed++,consumed:()=>consumed++,confirm:next=>{confirmation=next;return ()=>{confirmation=null;};}});return {food,health,inventory,get completed(){return completed;},get consumed(){return consumed;},confirm:()=>confirmation?.()};}
test('food heals and is consumed at initiation, repeats across areas and respects the shared 2s cooldown',()=>{
 const f=fixture();f.health.value=5;
 for(const area of ['clearing','second-area']){assert.equal(f.food.inventoryActions('cookedFish')[0].disabled,false);assert.ok(f.food.start('cookedFish'));assert.equal(f.inventory.cookedFish,area==='clearing'?3:2,'consumed immediately');
  // During the cooldown a second attempt changes nothing.
  assert.equal(f.food.start('cookedFish'),false);assert.equal(f.food.inventoryActions('cookedFish')[0].disabled,true);f.food.update(CONSUMABLE_COOLDOWN);}
 assert.equal(f.health.value,Math.min(f.health.max,5+2*FOODS.cookedFish.healing));assert.equal(f.inventory.cookedFish,2);assert.equal(f.consumed,2);assert.equal(FOODS.cookedFish.healing,20);
});
test('interrupting the eating animation never undoes, refunds or repeats the effect; missing food cannot be eaten',()=>{
 const f=fixture();f.health.value=5;f.food.start('cookedFish');assert.equal(f.health.value,25);f.food.update(.1);f.food.cancel();f.food.update(30);assert.equal(f.health.value,25);assert.equal(f.inventory.cookedFish,3);assert.equal(f.consumed,1);assert.equal(f.completed,0,'animation was interrupted');
 f.inventory.cookedFish=0;assert.equal(f.food.start('cookedFish'),false);assert.equal(f.consumed,1);
 f.health.restore();assert.equal(f.health.value,30);f.health.value=-1;assert.equal(f.health.value,0);f.health.heal(100);assert.equal(f.health.value,30);
});
test('full health confirmation rechecks inventory and can be cancelled',()=>{
 const f=fixture();assert.equal(f.food.start('cookedFish'),false);assert.equal(f.food.working,false);f.food.cancel();f.confirm();assert.equal(f.food.working,false);
 f.food.start('cookedFish');f.confirm();assert.equal(f.food.working,true);f.food.update(30);assert.equal(f.completed,1);assert.equal(f.health.value,30);
 f.food.start('cookedFish');f.inventory.cookedFish=0;f.confirm();assert.equal(f.food.working,false);
});
