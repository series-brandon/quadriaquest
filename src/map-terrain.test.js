import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {layStairs,railingEdges,retainingDrop,stairProblems,makeMapTile,surfaceColor} from './map-terrain.js';
import {createProp,PROPS,PROP_KINDS,rotateOffset,rotateSide,propModel,seatPosition,SEAT_BACK} from './props.js';
import {createMapData,setMapHeight,mapHeight,mapSurface,setMapSurface,mapTiles,fillMap,buildMap} from './world-map.js';
import {REGION} from './world-grid.js';
import {findPath,key,canStep,edgeBetween} from './world.js';
import {kitStreetData,KIT_ANNEX} from './dev/kit-street.js';

const flat=(w,d,h=1)=>{const map=new Map();for(let x=0;x<w;x++)for(let z=0;z<d;z++)map.set(key(x,z),{x,z,h});return map;};
test('a stair run rises half a block per tile and links a lower and a higher terrace',()=>{
 const map=flat(6,8);for(let x=0;x<6;x++)for(let z=0;z<=2;z++)map.get(key(x,z)).h=2;
 const run=layStairs(map,{x:1,z:4,dir:'n',length:2,width:2,base:1});
 assert.equal(run.length,4);assert.deepEqual(run.map(t=>t.h).sort(),[1.5,1.5,2,2]);assert.ok(run.every(t=>t.stair.dir==='n'));
 assert.ok(findPath(map,map.get(key(1,7)),map.get(key(1,0))),'up the stairs');
 assert.ok(!canStep(map.get(key(4,3)),map.get(key(4,2))),'a full block can’t be climbed elsewhere');
 assert.equal(stairProblems(map).length,0);
 // Railings: along the stair sides that drop, and along the terrace edge, but not across the stair head.
 const rails=railingEdges([...map.values()],map),has=(a,b)=>rails.some(([p,q])=>p===map.get(key(...a))&&q===map.get(key(...b)));
 assert.ok(has([3,3],[3,4])===false&&has([4,2],[4,3]),'terrace edge');assert.ok(has([1,3],[0,3])||has([1,4],[0,4]),'stair side');
 assert.ok(!has([1,2],[1,3]),'no railing across the top of the stairs');
 assert.ok(retainingDrop(map.get(key(4,2)),map.get(key(4,3))));
});
test('stairs ending against a drop are reported',()=>{
 const map=flat(4,6);layStairs(map,{x:1,z:4,dir:'n',length:2,width:1,base:1});
 assert.ok(stairProblems(map).some(p=>/landing/.test(p.problem)));
});
test('city terrain tiles build for every surface, retaining walls and stairs',()=>{
 const map=flat(3,3);map.get(key(1,1)).h=2;map.get(key(1,1)).surface='cobble';map.get(key(0,1)).stair={dir:'e'};map.get(key(0,1)).h=1.5;
 for(const t of map.values()){const g=makeMapTile(t,map);let meshes=0;g.traverse(o=>{if(o.isMesh)meshes++;});assert.ok(meshes>0);assert.match(surfaceColor(t),/^#/);}
});
test('props: footprints rotate with their spots, block their tiles, and interactive ones are pickable',()=>{
 assert.deepEqual(rotateOffset([0,1],[2,1],90),[-1,0]);assert.equal(rotateSide('s',90),'w');assert.deepEqual(rotateOffset([1,0],[2,1],180),[0,0]);
 const map=flat(8,8),scene=new THREE.Group(),pickables=[],t=(x,z)=>map.get(key(x,z));
 const bench=createProp('bench',{origin:[2,2],tileAt:t,parent:scene,pickables});
 assert.ok(t(2,2).blocked&&t(3,2).blocked);assert.deepEqual(bench.spots.map(s=>[s.tile.x,s.tile.z,s.facing]),[[2,3,'s'],[3,3,'s']]);
 assert.ok(pickables.length>0&&pickables.every(m=>m.userData.actor===bench));
 const p=seatPosition(bench.spots[0]);assert.ok(Math.abs(p.z-(3-SEAT_BACK-6))<1e-9,'the body sits back on the seat, against the backrest');
 const turned=createProp('bench',{origin:[5,4],rotation:90,tileAt:t,parent:scene});assert.ok(t(5,4).blocked&&t(5,5).blocked);assert.deepEqual(turned.spots.map(s=>[s.tile.x,s.tile.z,s.facing]),[[4,4,'w'],[4,5,'w']]);
 const hedge=createProp('hedge',{origin:[0,7],tileAt:t,parent:scene});assert.ok(t(0,7).blocksSight);hedge.dispose();assert.ok(!t(0,7).blocked&&!t(0,7).blocksSight);
 for(const kind of PROP_KINDS){const g=propModel(kind);g.updateMatrixWorld(true);let n=0;g.traverse(o=>{if(o.isMesh)n++;});assert.ok(n>0,kind);assert.ok(PROPS[kind].footprint.length===2);}
});
test('map data stores terrain per tile by region and builds live tiles',()=>{
 const R=REGION,data=createMapData({size:[R+6,10]});assert.equal(Object.keys(data.regions).length,2);assert.equal(data.regions['0,0'].heights.length,REGION);
 setMapHeight(data,R+1,3,2.5);setMapSurface(data,R+1,3,'cobble');assert.equal(mapHeight(data,R+1,3),2.5);assert.equal(mapSurface(data,R+1,3),'cobble');assert.equal(mapHeight(data,R,3),1);
 fillMap(data,{x0:0,z0:0,x1:2,z1:2},{h:2,surface:'plaza'});const tiles=mapTiles(data);assert.equal(tiles.get(key(1,1)).h,2);assert.equal(tiles.get(key(1,1)).surface,'plaza');
 assert.equal(JSON.parse(JSON.stringify(data)).regions['1,0'].surfaces[3][1],'c','plain JSON');
});
test('kit street annex: every terrace is reached only by its stairs, and its props and cottage are in place',()=>{
 const built=buildMap(kitStreetData(),{scene:new THREE.Group()}),t=(x,z)=>built.tiles.get(key(x,z)),from=built.spawn,route=(x,z)=>findPath(built.tiles,from,t(x,z));
 const {terraceA,terraceB,terraceC}=KIT_ANNEX;
 for(const d of built.doors)if(d.gate)d.setOpen(true);// the iron gate at the top of the narrow stair
 assert.ok(route(terraceA.x0+2,terraceA.z0+2),'terrace A');assert.ok(route(terraceB.x0+2,terraceB.z0+2),'terrace B');assert.ok(route(terraceC.x0+1,terraceC.z0+1),'terrace C, via the landing');
 assert.equal(t(KIT_ANNEX.landing.x0,43).h,2,'the landing');assert.equal(stairProblems(built.tiles).length,0);
 // Walk up the 3-wide stair: every step on it is half a block.
 const r=route(71,27);assert.ok(r.some(tile=>tile.stair));
 assert.ok(edgeBetween(t(69,27),t(69,28))?.kind==='railing','a railing along terrace A’s edge');
 assert.ok(built.props.length>=30);assert.ok(built.props.find(p=>p.kind==='fountain').tiles.every(tile=>tile.blocked));
 const cottage=built.buildings.find(b=>b.plan.desc.name==='terrace cottage');cottage.doors[0].setOpen(true);assert.ok(route(85,24),'into the terrace cottage');
 assert.equal(built.doors.filter(d=>!d.locked).length>0,true);
});
test('a built map’s roofs toggle both ways (live getters)',()=>{
 const built=buildMap(kitStreetData(),{scene:new THREE.Group()});
 built.setRoofs(false);assert.equal(built.roofsShown,false);built.setRoofs(true);assert.equal(built.roofsShown,true);
});
test('always-visible decoration is merged per chunk; clickable props and sign icons stay their own objects',()=>{
 const scene=new THREE.Group(),built=buildMap(kitStreetData(),{scene});
 const merged=[];scene.traverse(o=>{if(o.name==='chunk-statics')merged.push(o);});assert.ok(merged.length>0);
 const lamp=built.props.find(p=>p.kind==='lampPost'),bench=built.props.find(p=>p.kind==='bench');
 let lampMeshes=0;lamp.group.traverse(o=>{if(o.isMesh)lampMeshes++;});assert.equal(lampMeshes,0,'the lamp is drawn by its chunk');
 let benchMeshes=0;bench.group.traverse(o=>{if(o.isMesh)benchMeshes++;});assert.ok(benchMeshes>0,'the bench stays clickable');
 const shop=built.buildings.find(b=>b.plan.desc.sign);let icons=0,others=0;shop.decor.traverse(o=>{if(o.isMesh){if(o.name==='building-sign-icon')icons++;else others++;}});assert.equal(others,0);
 assert.ok(lamp.tiles.every(t=>t.blocked),'gameplay data stays');
});
