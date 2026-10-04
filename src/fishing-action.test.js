import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {commitFishingCatch,fishingHitTarget,fishingTargetHeight} from './fishing-action.js';
test('fish and XP commit once at catch start; cancellation before catch earns nothing',()=>{
 let fish=0,xp=0;
 const action={kind:'Fishing',age:3,catchAt:4,onCatch(){fish++;xp+=20;}};
 assert.equal(commitFishingCatch(action),false);assert.equal(fish,0);
 action.age=4;assert.equal(commitFishingCatch(action),true);
 action.age=8;assert.equal(commitFishingCatch(action),false);
 assert.deepEqual([fish,xp],[1,20]);
 // Cancelling discards the action, not its already committed inventory/XP.
 assert.equal(commitFishingCatch({kind:'Crafting',age:10}),false);
 assert.deepEqual([fish,xp],[1,20]);
});
test('fishing target accepts surface clicks but cannot intercept a horizontal ray above water',()=>{
 const hit=fishingHitTarget();hit.updateMatrixWorld(true);
 const above=new THREE.Raycaster(new THREE.Vector3(0,.3,2),new THREE.Vector3(0,0,-1));
 assert.equal(above.intersectObject(hit).length,0);
 const down=new THREE.Raycaster(new THREE.Vector3(0,2,0),new THREE.Vector3(0,-1,0));
 assert.ok(down.intersectObject(hit).length>0);
 assert.ok(new THREE.Box3().setFromObject(hit).getSize(new THREE.Vector3()).y<.0001);
});

test('flat fishing target clears the largest wave crest at every playground strength',()=>{
 for(const strength of [0,1,4,8,12]){
  const y=fishingTargetHeight({enabled:true,waves:true,waveStrength:strength});
  assert.ok(y>.018*strength);
 }
 assert.equal(fishingTargetHeight({enabled:true,waves:false,waveStrength:4}),.015);
 assert.ok(fishingTargetHeight({enabled:true,waves:true,waveStrength:4})<.1);
});
