import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {readFileSync} from 'node:fs';
import {buildCity} from './city-map.js';
import {cityProblems} from './city-checks.js';
import {findPath,key} from './world.js';
import {withinChunk,chunkId,CHUNK} from './world-grid.js';
import {biomeRule} from './biome-rules.js';
import {OVERWORLD} from './dev/overworld-layout.js';

// The Quadria overworld (src/maps/overworld.json): the start of the world map, where Mistrom, the starting
// village, is built (docs/TOWN.md), as saved in the repo (and built up in the editor).
const data=JSON.parse(readFileSync(new URL('./maps/overworld.json',import.meta.url),'utf8'));
test('the overworld: 96 × 96 at the origin, every building in one chunk, no errors in the city checks',()=>{
 assert.deepEqual(data.size,[96,96]);
 const built=buildCity(structuredClone(data),{scene:new THREE.Group()});
 assert.deepEqual(cityProblems(data,built).filter(p=>p.severity==='error').map(p=>`${p.tile} ${p.text}`),[]);
 for(const b of built.buildings)assert.ok(withinChunk(b.plan.x0,b.plan.z0,b.plan.x1,b.plan.z1),b.plan.desc.name);
});
test('you arrive by the crystal in the middle chunk, and can walk to every shop door',()=>{
 const built=buildCity(structuredClone(data),{scene:new THREE.Group()}),[cx,cz]=data.crystal;
 assert.equal(chunkId(cx,cz),'1,1','the middle chunk');
 assert.ok(Math.abs(built.spawn.x-cx)+Math.abs(built.spawn.z-cz)<=3,'spawn beside the crystal');assert.ok(!built.spawn.water&&!built.spawn.blocked);
 for(const b of built.buildings.filter(b=>b.shop))assert.ok(findPath(built.tiles,built.spawn,b.anchors.doors[0].doorstep),`a way to ${b.plan.desc.name}`);
});
test('every shop has a shopkeeper (docs/TOWN.md)',()=>{
 const shops=data.buildings.map((b,i)=>({b,i})).filter(({b})=>['inn','store','smithy','carpenter'].includes(b.desc.use));
 for(const {b,i} of shops)assert.ok(data.townsfolk.some(f=>f.house===i&&f.routine.some(r=>r.do==='keep')),`${b.desc.name} has a keeper`);
 for(const stall of data.props.filter(p=>p.kind==='stall'&&p.shop))assert.ok(data.townsfolk.some(f=>f.routine.some(r=>r.do==='vend')&&Math.hypot(f.home[0]-stall.x,f.home[1]-stall.z)<3),`a keeper at the ${stall.shop} stall`);
});
test('the land around the village: painted biomes, the river down the east side, the coast and sea to the south',()=>{
 const {land}=data;assert.ok(land&&land.ring>=64);
 for(const biome of Object.values(land.cells))assert.ok(biomeRule(biome).name,biome);
 assert.equal(land.cells['12,0'],'river','the river beside the village');assert.equal(land.cells['0,13'],'coast');assert.equal(land.cells['0,16'],'sea');
 assert.equal(OVERWORLD.size,data.size[0]);
});
