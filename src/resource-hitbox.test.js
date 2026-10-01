import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createResourceHitbox} from './resource-hitbox.js';

test('resource cube accepts near-item taps while leaving tile edges free',()=>{
 const resource={group:new THREE.Group()},tile={x:4,z:6};
 const box=createResourceHitbox(resource,tile);resource.group.position.set(2,1,3);resource.group.updateMatrixWorld(true);
 const hit=x=>new THREE.Raycaster(new THREE.Vector3(x,3,3),new THREE.Vector3(0,-1,0)).intersectObject(box);
 assert.equal(box.material.colorWrite,false);assert.equal(box.material.depthWrite,false);
 assert.ok(hit(2.24).length);assert.equal(hit(2.26).length,0);
 assert.equal(hit(2.24)[0].object.userData.resource,resource);
 assert.equal(hit(2.24)[0].object.userData.tile,tile);
 assert.equal(hit(2.24)[0].point.y,1.5);
});
