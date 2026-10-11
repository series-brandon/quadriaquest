import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {CUT_HEIGHT,isCut,cutBuildings,segmentHitsBox,updateCutaway,cutawayState,uniforms} from './cutaway.js';
import {createEdgeFeatures} from './doors.js';
import {key} from './world.js';

// The default view: the camera up and to the south-east of the player (+x, +z), looking back at them.
const player={x:0,y:1,z:0},camera={x:10,y:13,z:10};
const box=(x0,z0,x1,z1,top,base=1)=>({x0,z0,x1,z1,base,top});
test('a cut building keeps its walls up to one storey above their base, nothing above',()=>{
 assert.equal(isCut(1+CUT_HEIGHT-.05,[3,-1,1],[3]),false,'the ground storey stays');
 assert.equal(isCut(1+CUT_HEIGHT+.2,[3,-1,1],[3]),true,'above it: cut');
 assert.equal(isCut(4,[7,-1,1],[3]),false,'another building');
 assert.equal(isCut(4,[7,3,1],[3]),true,'a wall shared with the cut building');
 assert.equal(isCut(4,[7,-1,1],[],true),true,'force cutaway cuts every building');assert.equal(isCut(4,[-1,-1,1],[],true),false,'but not walls of no building');
});
test('the building you are in is cut, and so is any building between you and the camera',()=>{
 assert.deepEqual(cutBuildings({player,camera,building:3,boxes:[]}),[3]);
 const front=box(2,2,5,5,1+4.5),behind=box(-6,-6,-3,-3,1+4.5),beside=box(4,-9,8,-5,1+4.5),low=box(2,2,5,5,1+1.5);
 assert.deepEqual(cutBuildings({player,camera,boxes:[[1,front],[2,behind],[3,beside],[4,low]]}),[1],'only the tall building in front');
 assert.ok(segmentHitsBox({x:0,y:0,z:0},{x:10,y:10,z:10},{min:{x:4,y:4,z:4},max:{x:5,y:5,z:5}}));
 assert.ok(!segmentHitsBox({x:0,y:0,z:0},{x:10,y:10,z:10},{min:{x:4,y:6,z:4},max:{x:5,y:7,z:5}}));
});
test('edge features report building boxes; cut buildings hide their roofs and door tops, and the uniforms list them',()=>{
 const scene=new THREE.Scene(),tiles=new Map();for(let x=0;x<12;x++)for(let z=0;z<12;z++)tiles.set(key(x,z),{x,z,h:1});
 const t=(x,z)=>tiles.get(key(x,z)),edges=createEdgeFeatures({parent:scene,tileAt:t});
 // A two-storey 3 × 3 building at x 4..6, z 4..6 (building 9) with its door on the south side.
 for(let x=4;x<=6;x++){edges.add(t(x,4),t(x,3),'wall',{storeys:2,owner:9});edges.add(t(x,6),t(x,7),x===5?'door':'wall',{storeys:2,owner:9});}
 for(let z=4;z<=6;z++){edges.add(t(4,z),t(3,z),'wall',{storeys:2,owner:9});edges.add(t(6,z),t(7,z),'wall',{storeys:2,owner:9});}
 const roof=new THREE.Mesh(new THREE.BoxGeometry(3,.2,3),new THREE.MeshStandardMaterial());roof.position.set(5-6,4.1,5-6);scene.add(roof);edges.addCutPart(roof,9);
 const b=edges.buildingBoxes.get(9);assert.ok(b.top>=4.1&&b.base===1&&b.x0<=-2.5&&b.x1>=.5,'the box spans the walls and the roof');
 const door=edges.doors[0];
 updateCutaway({player:new THREE.Vector3(5-6,1,5-6),camera:new THREE.Vector3(5-6+10,14,5-6+10),building:9});
 assert.equal(roof.visible,false);assert.equal(door.model.upper.visible,false);assert.deepEqual(cutawayState().cut,[9]);assert.equal(uniforms.uCutCount.value,1);assert.equal(uniforms.uCutIds.value[0],9);
 // Standing north of it with the camera to the south-east: it hides you, so it is cut too.
 updateCutaway({player:new THREE.Vector3(4-6,1,1-6),camera:new THREE.Vector3(4-6+8,14,1-6+8),building:-1});
 assert.deepEqual(cutawayState().cut,[9]);
 // Far away: everything back.
 updateCutaway({player:new THREE.Vector3(-20,1,-20),camera:new THREE.Vector3(-30,14,-30),building:-1});
 assert.equal(roof.visible,true);assert.equal(door.model.upper.visible,true);assert.equal(uniforms.uCutCount.value,0);
 // Switched off, nothing is cut even inside.
 updateCutaway({player:new THREE.Vector3(5-6,1,5-6),camera:new THREE.Vector3(5,14,5),building:9,on:false});assert.deepEqual(cutawayState().cut,[]);
 // Force cutaway: every building cut wherever you are.
 updateCutaway({player:new THREE.Vector3(-20,1,-20),camera:new THREE.Vector3(-30,14,-30),building:-1,force:true});
 assert.equal(roof.visible,false);assert.equal(uniforms.uCutAll.value,1);assert.deepEqual(cutawayState(),{on:true,force:true,cut:[9]});
 updateCutaway({player:new THREE.Vector3(-20,1,-20),camera:new THREE.Vector3(-30,14,-30),building:-1});assert.equal(uniforms.uCutAll.value,0);assert.equal(roof.visible,true);
 // Baked walls draw their inside as the cut face, in a second mesh sharing the geometry.
 edges.bake();const section=edges.root.children.find(c=>c.name==='edge-features-section'),solid=edges.root.children.find(c=>c.name==='edge-features-baked');
 assert.ok(section&&section.geometry===solid.geometry);assert.equal(section.material.side,THREE.BackSide);assert.equal(section.material.userData.cutawaySection,true);
 // A hidden map takes no part.
 scene.visible=false;updateCutaway({player:new THREE.Vector3(4-6,1,1-6),camera:new THREE.Vector3(4-6+8,14,1-6+8),building:-1});assert.deepEqual(cutawayState().cut,[]);
 edges.dispose();
});
test('the lowest render tier’s simpler materials keep the cutaway',async()=>{
 const {simplifyMaterials}=await import('./simple-materials.js');const {applyCutaway}=await import('./cutaway.js');
 const root=new THREE.Group(),wall=new THREE.Mesh(new THREE.BoxGeometry(),applyCutaway(new THREE.MeshStandardMaterial()));root.add(wall);
 simplifyMaterials(root,true);assert.ok(wall.material.isMeshLambertMaterial);assert.equal(wall.material.userData.cutaway,true);
});
