import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {readFileSync} from 'node:fs';
import {buildMap,mapTiles} from './world-map.js';
import {mapProblems} from './map-checks.js';
import {findPath,key} from './world.js';
import {withinChunk,chunkId,CHUNK} from './world-grid.js';
import {biomeRule} from './biome-rules.js';
import {OVERWORLD} from './dev/overworld-layout.js';
import {townLand} from './town-ground.js';

// The Quadria overworld (src/maps/overworld.json): the start of the world map, where Mistrom, the starting
// village, is built (docs/TOWN.md), as saved in the repo (and built up in the editor).
const data=JSON.parse(readFileSync(new URL('./maps/overworld.json',import.meta.url),'utf8'));
test('the overworld: 384 × 384 (3 × 3 whole regions), every building in one chunk, no errors in the map checks',()=>{
 assert.deepEqual(data.size,[384,384]);assert.deepEqual(data.land.origin,[-128,-128]);
 const built=buildMap(structuredClone(data),{scene:new THREE.Group()});
 assert.deepEqual(mapProblems(data,built).filter(p=>p.severity==='error').map(p=>`${p.tile} ${p.text}`),[]);
 for(const b of built.buildings)assert.ok(withinChunk(b.plan.x0,b.plan.z0,b.plan.x1,b.plan.z1),b.plan.desc.name);
});
test('you arrive by the crystal in the middle chunk, and can walk to every shop door',()=>{
 const built=buildMap(structuredClone(data),{scene:new THREE.Group()}),[cx,cz]=data.crystal;
 assert.equal(chunkId(cx,cz),'5,5','near the middle (padded to whole regions: 32 tiles west and north, 64 east and south)');
 assert.ok(Math.abs(built.spawn.x-cx)+Math.abs(built.spawn.z-cz)<=3,'spawn beside the crystal');assert.ok(!built.spawn.water&&!built.spawn.blocked);
 for(const b of built.buildings.filter(b=>b.shop))assert.ok(findPath(built.tiles,built.spawn,b.anchors.doors[0].doorstep),`a way to ${b.plan.desc.name}`);
});
test('every shop has a shopkeeper (docs/TOWN.md)',()=>{
 const shops=data.buildings.map((b,i)=>({b,i})).filter(({b})=>['inn','store','smithy','carpenter'].includes(b.desc.use));
 for(const {b,i} of shops)assert.ok(data.townsfolk.some(f=>f.house===i&&f.routine.some(r=>r.do==='keep')),`${b.desc.name} has a keeper`);
 for(const stall of data.props.filter(p=>p.kind==='stall'&&p.shop))assert.ok(data.townsfolk.some(f=>f.routine.some(r=>r.do==='vend')&&Math.hypot(f.home[0]-stall.x,f.home[1]-stall.z)<3),`a keeper at the ${stall.shop} stall`);
});
test('the land around the village: painted biomes, the river down the east side, the coast and sea to the south',()=>{
 const {land}=data;assert.ok(land);assert.equal(townLand(data).tile(-1,10),null,'the land ends at the map’s edge: all of it can be edited');assert.ok(townLand(data).tile(0,10));
 for(const biome of Object.values(land.cells))assert.ok(biomeRule(biome).name,biome);
 assert.equal(land.terrain['12,0'],'river','the river beside the village (terrain)');assert.equal(land.cells['0,13'],'coast');assert.equal(land.terrain['0,16'],'sea');
 assert.equal(OVERWORLD.size,data.size[0]);
 // Grown, the map takes them in: the river east of the village and the sea to the south are its own tiles.
 const tiles=mapTiles(data),{origin:grow}=OVERWORLD;
 assert.equal(tiles.get(key(grow+99,grow+40)).waterKind,'river');assert.equal(tiles.get(key(grow+40,grow+130)).waterKind,'sea');
});
