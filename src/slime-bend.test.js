import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createSlimeBend,bendOffset} from './slime-bend.js';
test('wave bend anchors the base, shifts the crown away from the hand, and restores geometry',()=>{
 assert.equal(bendOffset(.07,.15),0);assert.equal(bendOffset(.79,.15),.15);
 const visual=new THREE.Group(),mesh=new THREE.Mesh(new THREE.BoxGeometry(.72,.72,.72),new THREE.MeshBasicMaterial());mesh.position.y=.43;visual.add(mesh);
 const original=mesh.geometry.attributes.position.array.slice(),bend=createSlimeBend(visual,[mesh]);
 bend(.15);const p=mesh.geometry.attributes.position;
 for(let i=0;i<p.count;i++){assert.equal(p.getY(i),original[i*3+1]);if(original[i*3+1]<0)assert.ok(Math.abs(p.getX(i)-original[i*3])<1e-6);else assert.ok(p.getX(i)>original[i*3]+.14);}
 bend(0);assert.deepEqual(p.array,original);
});

test('bending preserves matching smooth normals across duplicated triangle vertices',async()=>{
 const {RoundedBoxGeometry}=await import('three/addons/geometries/RoundedBoxGeometry.js');
 const visual=new THREE.Group(),mesh=new THREE.Mesh(new RoundedBoxGeometry(.72,.72,.72,4,.16),new THREE.MeshStandardMaterial());mesh.position.y=.43;visual.add(mesh);
 const rest=mesh.geometry.attributes.normal.array.slice();
 const bend=createSlimeBend(visual,[mesh]);bend(.15);
 const p=mesh.geometry.attributes.position,n=mesh.geometry.attributes.normal,seen=new Map();let shared=0;
 for(let i=0;i<p.count;i++){
  const key=[p.getX(i),p.getY(i),p.getZ(i),...rest.slice(i*3,i*3+3)].map(v=>v.toFixed(5)).join(',');
  const normal=new THREE.Vector3().fromBufferAttribute(n,i);
  assert.ok(Math.abs(normal.length()-1)<1e-6);
  if(seen.has(key)){assert.ok(normal.distanceTo(seen.get(key))<1e-5);shared++;}else seen.set(key,normal);
 }
 assert.ok(shared>0);bend(0);assert.deepEqual(n.array,rest);
});
