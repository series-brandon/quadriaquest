import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createFishingPresentation} from './fishing-presentation.js';
test('shared rig follows the selected world spot and clears props on cancellation',()=>{
 const player=new THREE.Group(),hands=[new THREE.Group(),new THREE.Group()];player.add(...hands);
 const rig=createFishingPresentation({player,hands}),group=new THREE.Group();group.position.set(7,.85,8);
 for(const kind of ['Fishing cast','Fishing','Fishing catch']){
  rig.update({kind,time:kind==='Fishing cast'?1.2:.4,fishing:true,spot:{group}});assert.equal(rig.rod.visible,true);
  const positions=rig.rod.userData.fishingRig.line.geometry.attributes.position;
  const endpoint=new THREE.Vector3().fromBufferAttribute(positions,positions.count-1).applyMatrix4(rig.rod.matrixWorld);
  assert.ok(endpoint.distanceTo(new THREE.Vector3(7,.875,8))<1e-5);
 }
 rig.update({kind:'Celebration',time:1,fishing:true});assert.equal(rig.rod.visible,false);assert.equal(rig.fish.visible,true);
 rig.clear();assert.equal(rig.fish.visible,false);assert.equal(rig.rod.visible,false);
 rig.update({kind:'Celebration',time:1});assert.equal(rig.fish.visible,false);
});
