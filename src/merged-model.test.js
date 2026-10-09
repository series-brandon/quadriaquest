import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {mergedMesh,sharedVertexColorMaterial} from './merged-model.js';
import {makeTree} from './world-models.js';
import {makeBoulder} from './mining.js';
import {createGroundItemModel} from './ground-item-models.js';

test('merged models are one shadow-casting mesh with per-part colors and a shared material',()=>{
 const mesh=mergedMesh([{geometry:new THREE.BoxGeometry(1,1,1),color:'#ff0000',position:[0,.5,0]},{geometry:new THREE.IcosahedronGeometry(.5,0),color:'#0000ff',position:[0,2,0]}]);
 assert.ok(mesh.castShadow&&mesh.receiveShadow);
 const colors=mesh.geometry.attributes.color,red=new THREE.Color('#ff0000');
 assert.equal(colors.count,mesh.geometry.attributes.position.count);
 assert.deepEqual([colors.getX(0),colors.getY(0),colors.getZ(0)],[red.r,red.g,red.b],'the first part keeps its color');
 mesh.geometry.computeBoundingBox();assert.ok(mesh.geometry.boundingBox.max.y>2.4,'parts keep their placement');
 assert.equal(mesh.material,sharedVertexColorMaterial(),'one material per look, shared');
 for(const [name,model] of [['tree',makeTree()],['boulder',makeBoulder()],['sticks',createGroundItemModel('sticks')],['stones',createGroundItemModel('stones')]]){
  const meshes=[];model.traverse(o=>{if(o.isMesh)meshes.push(o);});assert.equal(meshes.length,1,`${name}: one draw`);
 }
});
