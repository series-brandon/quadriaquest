import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {makeFishingRod,updateFishingRod,updateFishingRodMotion} from './fishing-rod.js';
test('line stays on a world anchor through rod translation, rotation and scale',()=>{
 const parent=new THREE.Group(),rod=makeFishingRod();parent.add(rod);const anchor=new THREE.Vector3(2,.02,3);
 for(const angle of [0,.4,1.2]){parent.position.set(1,.5,-1);parent.rotation.set(angle,.7,-.2);parent.scale.set(1.1,.8,1.2);rod.rotation.x=.9-angle;updateFishingRod(rod,anchor,.8);rod.updateWorldMatrix(true,true);
 const positions=rod.userData.fishingRig.line.geometry.attributes.position;
 const endpoint=new THREE.Vector3().fromBufferAttribute(positions,positions.count-1).applyMatrix4(rod.matrixWorld);
 assert.ok(endpoint.distanceTo(anchor)<1e-6);
 const tip=new THREE.Vector3().fromBufferAttribute(positions,0);assert.ok(Math.hypot(tip.x,tip.z)>.3);
 }
 updateFishingRod(rod,anchor,0);const tip=new THREE.Vector3().fromBufferAttribute(rod.userData.fishingRig.line.geometry.attributes.position,0);assert.equal(Math.abs(tip.x),0);assert.equal(Math.abs(tip.z),0);
});

test('hook preserves rod length and tip height while allowing horizontal travel',()=>{
 const rod=makeFishingRod(),anchor=new THREE.Vector3(0,0,2);rod.rotation.x=.9;rod.position.set(0,.35,.48);
 updateFishingRodMotion(rod,anchor);
 const rig=rod.userData.fishingRig,tip=rig.restTip.clone();
 rod.rotation.x=-.24;rod.position.x=-.1;updateFishingRodMotion(rod,anchor,.3);
 const actual=new THREE.Vector3().fromBufferAttribute(rig.line.geometry.attributes.position,0).applyMatrix4(rod.matrixWorld);
 assert.ok(Math.abs(actual.y-tip.y)<.03);
 assert.ok(actual.z<tip.z);
 let length=0;for(let i=1;i<rig.centerline.length;i++){const segment=rig.centerline[i].distanceTo(rig.centerline[i-1]);assert.ok(Math.abs(segment-.05)<1e-10);length+=segment;}assert.ok(Math.abs(length-1.7)<1e-10);
 const p=rig.shaft.geometry.attributes.position;
 for(let i=0;i<p.count;i++){const y=rig.original[i*3+1];if(y<=.15){assert.ok(Math.abs(p.getY(i)-y)<1e-6);assert.ok(Math.abs(p.getZ(i)-rig.original[i*3+2])<1e-6);}}
 const displacement=new THREE.Vector3().fromBufferAttribute(p,0).sub(new THREE.Vector3().fromArray(rig.original));assert.ok(displacement.length()>.4);
});
