import test from 'node:test';
import assert from 'node:assert/strict';
import {createAfterStep} from './after-step.js';
import {createFoodSystem,createPlayerHealth} from './player-health.js';
import {createRecipeCrafting} from './recipe-crafting.js';

function fixture(){
 let moving=true,busy=false,stops=0,confirm;
 const inventory={cookedFish:3,sticks:3,stones:3},health=createPlayerHealth();health.value=10;
 const queue=createAfterStep({moving:()=>moving,prepare(){queue.cancel();food.cancel();craft.cancel();}});
 const stop=()=>{assert.equal(moving,false,'actions must not hard-stop a step');stops++;queue.cancel();food.cancel();craft.cancel();};
 const food=createFoodSystem({inventory,health,defer:queue.defer,busy:()=>busy,stop,confirm:next=>{confirm=next;return ()=>{confirm=null;};}});
 const craft=createRecipeCrafting({inventory,skill:{level:1,xp:0},defer:queue.defer,busy:()=>busy,stop,completed(){}});
 return {queue,food,craft,inventory,health,land(){moving=false;queue.flush();},walk(){moving=true;},setBusy(){busy=true;},get stops(){return stops;},confirm(){confirm?.();}};
}

test('food and crafting wait for the current step, then run once using production actions',()=>{
 const f=fixture();assert.ok(f.food.start('cookedFish'));assert.equal(f.queue.pending,'Eating');
 f.food.update(20);f.queue.flush();assert.equal(f.stops,0);assert.equal(f.inventory.cookedFish,3);assert.equal(f.health.value,10);
 f.land();assert.equal(f.food.working,true);assert.equal(f.queue.pending,null);f.food.update(20);f.queue.flush();assert.equal(f.health.value,30);assert.equal(f.inventory.cookedFish,2);assert.equal(f.stops,1);
 f.walk();assert.ok(f.craft.start('axes'));assert.equal(f.craft.working,false);f.craft.update(20);assert.equal(f.inventory.axes,undefined);
 f.land();assert.equal(f.craft.state.age,0);f.craft.update(20);f.queue.flush();assert.equal(f.inventory.axes,1);assert.equal(f.inventory.sticks,2);assert.equal(f.stops,2);
});
test('new requests replace old requests; movement/travel/reset cancellation prevents delayed actions',()=>{
 const f=fixture();f.food.start('cookedFish');f.craft.start('axes');f.land();assert.equal(f.food.working,false);assert.equal(f.craft.working,true);assert.equal(f.inventory.cookedFish,3);
 f.craft.cancel();f.walk();f.food.start('cookedFish');f.queue.cancel();f.land();assert.equal(f.food.working,false);assert.equal(f.stops,1);
});
test('queued starts recheck inventory, busy state, and full-health confirmation at arrival',()=>{
 const f=fixture();f.food.start('cookedFish');f.inventory.cookedFish=0;f.land();assert.equal(f.food.working,false);assert.equal(f.stops,0);
 f.walk();f.craft.start('axes');f.setBusy();f.land();assert.equal(f.craft.working,false);assert.equal(f.stops,0);
 const g=fixture();g.food.start('cookedFish');g.health.restore();g.land();assert.equal(g.food.working,false);g.confirm();assert.equal(g.food.working,true);
});
