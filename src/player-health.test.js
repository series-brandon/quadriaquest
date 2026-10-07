import test from 'node:test';
import assert from 'node:assert/strict';
import {createPlayerHealth,createFoodSystem,FOODS} from './player-health.js';
function fixture(){const health=createPlayerHealth(30),inventory={cookedFish:4};let food,completed=0,confirmation;food=createFoodSystem({inventory,health,stop:()=>food.cancel(),completed:()=>completed++,confirm:next=>{confirmation=next;return ()=>{confirmation=null;};}});return {food,health,inventory,get completed(){return completed;},confirm:()=>confirmation?.()};}
test('food is available before any area visit, repeats across travel, and heals only on completion',()=>{
 const f=fixture();f.health.value=5;
 for(const area of ['clearing','second-area']){assert.equal(f.food.inventoryActions('cookedFish')[0].disabled,false);assert.ok(f.food.start('cookedFish'));f.food.update(.1);assert.equal(f.inventory.cookedFish,area==='clearing'?4:3);f.food.update(FOODS.cookedFish.duration);f.food.update(20);}
 assert.equal(f.health.value,Math.min(f.health.max,5+2*FOODS.cookedFish.healing));assert.equal(f.inventory.cookedFish,2);assert.equal(f.completed,2);
});
test('cancellation on movement/travel/reset and disappearing food cannot consume or heal',()=>{
 const f=fixture();f.health.value=10;f.food.start('cookedFish');f.food.update(.1);f.food.cancel();f.food.update(30);assert.equal(f.health.value,10);assert.equal(f.inventory.cookedFish,4);
 f.food.start('cookedFish');f.inventory.cookedFish=0;f.food.update(30);assert.equal(f.completed,0);assert.equal(f.health.value,10);
 f.health.restore();assert.equal(f.health.value,30);f.health.value=-1;assert.equal(f.health.value,0);f.health.heal(100);assert.equal(f.health.value,30);
});
test('full health confirmation rechecks inventory and can be cancelled',()=>{
 const f=fixture();assert.equal(f.food.start('cookedFish'),false);assert.equal(f.food.working,false);f.food.cancel();f.confirm();assert.equal(f.food.working,false);
 f.food.start('cookedFish');f.confirm();assert.equal(f.food.working,true);f.food.update(30);assert.equal(f.completed,1);assert.equal(f.health.value,30);
 f.food.start('cookedFish');f.inventory.cookedFish=0;f.confirm();assert.equal(f.food.working,false);
});
