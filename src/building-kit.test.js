import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {planBuilding,normalizeBuilding,createBuilding,roofGeometry,BUILDING_PRESETS,ROOF_TYPES,perimeter} from './building-kit.js';
import {createEdgeFeatures} from './doors.js';
import {STYLE_NAMES} from './edge-models.js';
import {findPath,key,edgeBetween} from './world.js';

const shop=BUILDING_PRESETS.shop;
test('the same description always plans the same building; the seed varies only decoration',()=>{
 assert.deepEqual(planBuilding(shop,[4,4]),planBuilding(shop,[4,4]));
 const a=planBuilding(shop,[4,4]),b=planBuilding({...shop,seed:99},[4,4]);
 assert.deepEqual(a.tiles,b.tiles);assert.deepEqual(a.doors,b.doors,'collision does not depend on the seed');
});
test('a plan has its tiles, one edge per outline tile, doors with doorsteps, and anchors',()=>{
 const plan=planBuilding(shop,[10,20]);
 assert.equal(plan.tiles.length,30);assert.equal(plan.edges.length,perimeter(6,5).length);
 assert.equal(plan.doors.length,1);const door=plan.doors[0];
 assert.deepEqual(door.inside,[13,24]);assert.deepEqual(door.doorstep,[13,25],'the south door at 2 counts east to west');
 assert.deepEqual(plan.anchors.keeper,[13,22],'the shopkeeper stands two tiles in');
 assert.ok(plan.anchors.sign&&plan.anchors.awning,'a shop has its sign and awning');
 assert.ok(plan.edges.some(e=>e.kind==='window'),'auto windows');
 assert.ok(plan.edges.filter(e=>e.kind==='window').every(e=>e.at>0),'corners stay solid');
});
test('rotation turns the footprint, doors and ridge, and keeps each door’s place along its edge',()=>{
 const turned=normalizeBuilding({...shop,rotation:90});
 assert.deepEqual(turned.footprint,[5,6]);assert.deepEqual(turned.doors,[{edge:'west',at:2}]);assert.equal(turned.ridge,'z');
 assert.equal(normalizeBuilding({...shop,rotation:360}).doors[0].edge,'south');
 const plan=planBuilding({...shop,rotation:180},[0,0]);assert.equal(plan.doors[0].edge,'north');assert.deepEqual(plan.doors[0].inside,[2,0]);
});
test('a door that would break the door rule is refused',()=>{
 assert.throws(()=>planBuilding({footprint:[3,3],doors:[{edge:'south',at:0}]}),/door rule/);
 assert.throws(()=>planBuilding({footprint:[3,3],doors:[{edge:'east',at:2}]}),/door rule/);
});
test('every roof type and style builds finite geometry, ridge either way',()=>{
 for(const roof of ROOF_TYPES)for(const style of STYLE_NAMES)for(const ridge of ['x','z']){
  const g=roofGeometry({roof,w:5,d:4,ridge,style,chimney:{along:.2,side:1}});
  assert.ok(g.attributes.position.count>0&&g.attributes.color&&[...g.attributes.position.array].every(Number.isFinite),`${roof}/${style}/${ridge}`);
 }
});
function smallMap(){
 const scene=new THREE.Scene(),tiles=new Map();for(let x=0;x<20;x++)for(let z=0;z<20;z++)tiles.set(key(x,z),{x,z,h:1,blocked:false});
 const t=(x,z)=>tiles.get(key(x,z));return {scene,tiles,t,edges:createEdgeFeatures({parent:scene,tileAt:t})};
}
test('a placed building: walls on its outline, its door opens a route in, its roof hides with it',()=>{
 const {scene,tiles,t,edges}=smallMap();
 const built=createBuilding(shop,{origin:[4,4],id:2,edges,tileAt:t,parent:scene});
 assert.ok(t(5,5).indoor&&t(5,5).building===2);
 assert.equal(edges.doorProblems().length,0);
 const inside=t(6,6),outside=t(1,1);assert.equal(findPath(tiles,outside,inside),null,'closed: sealed');
 built.doors[0].setOpen(true);assert.ok(findPath(tiles,outside,inside),'open: a route in');
 assert.equal(edgeBetween(t(4,4),t(3,4)).kind,'wall','corners stay solid');
 assert.ok(edges.buildingBoxes.get(2).top>built.top,'the roof counts towards the building’s box');
 assert.equal(built.roof.position.y,built.top,'the roof sits on the walls');
 built.dispose();assert.equal(edges.count,0);assert.equal(t(5,5).indoor,false);
});
test('buildings side by side share one wall, owned by both, as tall as the taller',()=>{
 const {scene,t,edges}=smallMap();
 createBuilding({footprint:[3,3],storeys:1,doors:[{edge:'south',at:1}]},{origin:[2,2],id:0,edges,tileAt:t,parent:scene});
 createBuilding({footprint:[3,3],storeys:2,doors:[{edge:'south',at:1}]},{origin:[5,2],id:1,edges,tileAt:t,parent:scene});
 const shared=edges.info(t(4,3),t(5,3));assert.equal(shared.kind,'wall');assert.deepEqual(shared.owners,[0,1]);assert.equal(shared.storeys,2);
});
test('a building without an interior is solid with locked doors',()=>{
 const {scene,t,edges}=smallMap(),built=createBuilding(BUILDING_PRESETS.hall,{origin:[2,2],id:4,edges,tileAt:t,parent:scene});
 assert.ok(t(4,4).blocked);assert.ok(built.doors.every(d=>d.locked));
});
test('the model viewer’s Building entry builds every preset, style, roof and rotation through the real builder',async()=>{
 const {buildingPreview}=await import('./dev/model-catalog.js');const preview=buildingPreview();
 for(const preset of Object.keys(BUILDING_PRESETS))for(const [style,roof,rotation] of [['','',''],['brick','hip','90'],['stone','flat','180'],['graybox','cone','270']])for(const motion of ['Doors closed','Doors open','Cut (cutaway)']){
  preview.update(.5,motion,.016,null,null,{worn:{preset,style,roof,rotation}});preview.group.updateMatrixWorld(true);
  let meshes=0;preview.group.traverse(o=>{if(o.isMesh)meshes++;assert.ok(o.matrixWorld.elements.every(Number.isFinite));});assert.ok(meshes>0,preset);
 }
});
