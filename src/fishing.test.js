import test from 'node:test';
import assert from 'node:assert/strict';
import {createFishingSystem,PONDFISH} from './fishing.js';
import {CAST_DURATION,CATCH_DURATION,HOOK_DURATION} from './catch-motion.js';
function fixture(){
 const inventory={rods:1,rawFish:0};let system,inReach=true,busy=false,catches=0,completions=0,cancellations=0;
 system=createFishingSystem({inventory,stop:()=>system.cancel(),face(){},inReach:()=>inReach,busy:()=>busy,
  caught(){catches++;},completed(){completions++;},cancelled(){cancellations++;}});
 const spot={x:0,z:0,available:()=>true};
 return {system,inventory,spot,set inReach(value){inReach=value;},set busy(value){busy=value;},get catches(){return catches;},get completions(){return completions;},get cancellations(){return cancellations;}};
}
test('shared fishing casts, waits, rewards once at the bite, and finishes its optional flourish',()=>{
 const f=fixture();assert.ok(f.system.start(f.spot));assert.equal(f.system.update(.3).kind,'Fishing cast');
 assert.equal(f.system.update(CAST_DURATION).kind,'Fishing');assert.equal(f.inventory.rawFish,0);
 const motion=f.system.update(PONDFISH.wait-.3);assert.equal(motion.kind,'Fishing catch');assert.equal(motion.spot,f.spot);assert.equal(f.inventory.rawFish,1);assert.equal(f.system.skill.xp,20);
 assert.equal(f.system.update(HOOK_DURATION+.01).kind,'Celebration');f.system.update(CATCH_DURATION);f.system.update(30);
 assert.equal(f.catches,1);assert.equal(f.completions,1);assert.equal(f.inventory.rods,1);assert.equal(f.system.working,false);
 assert.ok(f.system.start({...f.spot}));f.system.update(30);assert.equal(f.inventory.rawFish,2);assert.equal(f.system.skill.xp,40);
});
test('movement, travel, reset, unavailable spot, missing tool, and out-of-reach starts cannot reward early',()=>{
 const f=fixture();f.inventory.rods=0;assert.equal(f.system.start(f.spot),false);f.inventory.rods=1;
 f.inReach=false;assert.equal(f.system.start(f.spot),false);f.inReach=true;f.busy=true;assert.equal(f.system.start(f.spot),false);f.busy=false;
 for(const interrupt of [()=>f.system.cancel(),()=>{f.spot.available=()=>false;},()=>{f.inventory.rods=0;},()=>{f.inReach=false;}]){
  f.spot.available=()=>true;f.inventory.rods=1;f.inReach=true;assert.ok(f.system.start(f.spot));f.system.update(.5);interrupt();f.system.update(30);
  assert.equal(f.system.working,false);assert.equal(f.inventory.rawFish,0);assert.equal(f.system.skill.xp,0);
 }
});
test('skipping the celebration keeps earned fish/XP and repeated clicks cannot restart a cast',()=>{
 const f=fixture();f.system.start(f.spot);f.system.update(1);assert.equal(f.system.start(f.spot),false);assert.equal(f.system.state.age,1);
 f.system.update(CAST_DURATION+PONDFISH.wait-1);f.system.cancel();f.system.update(30);
 assert.equal(f.inventory.rawFish,1);assert.equal(f.system.skill.xp,20);assert.equal(f.completions,0);
});
test('spot loot and skill level configure requirements and waiting independently of area',()=>{
 const f=fixture();f.system.skill.level=6;
 const spot={...f.spot,loot:{tool:'testRod',item:'testFish',quantity:2,wait:6}};
 assert.equal(f.system.start(spot),false);f.inventory.testRod=1;assert.ok(f.system.start(spot));
 assert.equal(f.system.state.catchAt,CAST_DURATION+5);f.system.update(30);assert.equal(f.inventory.testFish,2);assert.equal(f.inventory.rawFish,0);
});
test('a catch observer may cancel without duplicate rewards or stale motion',()=>{
 const f=fixture();f.spot.onCatch=()=>f.system.cancel();f.system.start(f.spot);assert.equal(f.system.update(30),null);assert.equal(f.catches,1);assert.equal(f.system.working,false);
});
