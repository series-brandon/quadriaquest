import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {buildChunkTerrain} from './chunk-terrain.js';

const grid=(heights)=>{const tiles=[];heights.forEach((row,z)=>row.forEach((h,x)=>tiles.push({x,z,h,water:false,blocked:false})));return tiles;};
test('a chunk is one colored mesh with only visible sides, and faces map back to tiles',()=>{
 const flat=grid([[1,1],[1,1]]),tileAt=(x,z)=>flat.find(t=>t.x===x&&t.z===z)??null;
 const {mesh,lines}=buildChunkTerrain({tiles:flat,tileAt,topColor:()=>new THREE.Color('#00ff00')});
 const flatCount=mesh.geometry.attributes.position.count;
 // A raised tile in the middle shows sides toward its lower neighbors; the flat ones share no inner sides.
 const hill=grid([[1,1,1],[1,2,1],[1,1,1]]),hillAt=(x,z)=>hill.find(t=>t.x===x&&t.z===z)??null;
 const raised=buildChunkTerrain({tiles:hill,tileAt:hillAt,topColor:()=>new THREE.Color('#00ff00')}).mesh;
 assert.ok(flatCount>0);assert.ok(mesh.castShadow&&mesh.receiveShadow);
 assert.equal(mesh.geometry.attributes.color.count,flatCount,'every vertex is colored');
 // Every face resolves to a tile, in order.
 const faces=raised.geometry.attributes.position.count/3,seen=new Set();for(let f=0;f<faces;f++)seen.add(raised.userData.tileForFace(f));
 assert.equal(seen.size,hill.length,'each tile owns faces');
 assert.equal(raised.userData.tileForFace(0),hill[0]);assert.equal(raised.userData.tileForFace(faces-1),hill[hill.length-1]);
 assert.ok(lines.geometry.attributes.position.count>0,'seams between level tiles');
 // Unloaded neighbors come from tileAt: a tile at the chunk edge next to a higher unloaded tile has no side there.
 const edge=grid([[1]]),withNeighbor=buildChunkTerrain({tiles:edge,tileAt:(x,z)=>x===1&&z===0?{x:1,z:0,h:2}:x===0&&z===0?edge[0]:null,topColor:()=>new THREE.Color()}).mesh;
 const alone=buildChunkTerrain({tiles:edge,tileAt:(x,z)=>x===0&&z===0?edge[0]:null,topColor:()=>new THREE.Color()}).mesh;
 assert.ok(withNeighbor.geometry.attributes.position.count<alone.geometry.attributes.position.count,'the side under a higher neighbor is skipped');
});
