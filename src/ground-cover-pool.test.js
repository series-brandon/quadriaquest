import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createGroundCoverPool} from './ground-cover.js';

test('a full ground cover pool grows instead of leaving chunks bare',()=>{
 const parent=new THREE.Group(),pool=createGroundCoverPool({parent,capacity:2});
 const items=n=>Array.from({length:n},(_,i)=>({kind:'grass',x:i,y:1,z:0}));
 const a=pool.add(items(2)),b=pool.add(items(5));
 assert.equal(pool.stats.grass,7,'every piece placed');
 const mesh=parent.children.find(m=>m.name==='ground-cover-grass');assert.ok(mesh.count>=7);assert.equal(parent.children.filter(m=>m.name==='ground-cover-grass').length,1,'one mesh per kind');
 const m=new THREE.Matrix4();mesh.getMatrixAt(0,m);assert.equal(new THREE.Vector3().setFromMatrixPosition(m).x,0-6,'earlier pieces kept their place');
 a.dispose();b.dispose();assert.equal(pool.stats.grass,0);
});
