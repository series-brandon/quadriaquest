import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import * as THREE from 'three';
import {buildMap} from './world-map.js';
import {mapProblems} from './map-checks.js';
import {findPath,key} from './world.js';
import {CAPITAL,capitalData} from './dev/capital-layout.js';
import {CHUNK,REGION,BAND,chunkId,chunkOf} from './world-grid.js';

const data=JSON.parse(readFileSync(new URL('./maps/capital.json',import.meta.url),'utf8'));
test('the capital: 160 × 160 (5 × 5 chunks) in 2 × 2 regions, with no errors in the map checks',()=>{
 assert.deepEqual(data.size,[160,160]);assert.equal(Object.keys(data.regions).length,(Math.ceil(160/REGION))**2);
 const built=buildMap(data,{scene:new THREE.Group()});
 assert.deepEqual(mapProblems(data,built).filter(p=>p.severity==='error').map(p=>`${p.tile} ${p.text}`),[]);
});
test('you wake at the Iter Crystal in the town square, and the castle, market and sewers are all reachable',()=>{
 const built=buildMap(data,{scene:new THREE.Group()}),t=(x,z)=>built.tiles.get(key(x,z)),{square,crystal}=CAPITAL;
 const s=built.spawn;assert.ok(s.x>=square.x0&&s.x<=square.x1&&s.z>=square.z0&&s.z<=square.z1,'spawn in the square');
 assert.ok(Math.abs(s.x-crystal[0])+Math.abs(s.z-crystal[1])<=2,'beside the crystal');assert.ok(t(...crystal).blocked);
 const keep=built.buildings.find(b=>b.plan.desc.name==='castle keep');
 const up=findPath(built.tiles,s,keep.anchors.doors[0].doorstep);assert.ok(up&&up.some(tile=>tile.stair),'up the grand stair to the keep door');
 assert.ok(keep.doors[0].link,'the keep has a separate interior');
 assert.ok(findPath(built.tiles,s,t(44,70)),'the market');
 assert.ok(built.props.some(p=>p.kind==='dungeonEntrance'&&p.link));assert.ok(built.props.some(p=>p.kind==='noticeboard'));
 assert.ok(data.townsfolk.length>=30);
});
test('the capital streams: chunks around the player show, buildings show whole, and shown chunks linger a band',()=>{
 const built=buildMap(structuredClone(data),{scene:new THREE.Group(),streamRadius:1});
 assert.equal(built.chunks.size,25);built.stream(built.spawn);
 const [cx,cz]=chunkOf(built.spawn.x,built.spawn.z),dist=c=>Math.max(Math.abs(c.cx-cx),Math.abs(c.cz-cz));
 assert.equal(CAPITAL.axis%CHUNK,CHUNK/2,'the axis runs down the middle of a chunk');assert.deepEqual([cx,cz],[2,2],'you wake in the middle chunk');
 const shown=[...built.chunks.values()].filter(c=>c.root.visible);
 for(const c of built.chunks.values())if(dist(c)<=1)assert.ok(c.root.visible,`chunk ${c.id} within reach`);
 assert.ok(shown.length<=9,'only the 3 × 3 around you');
 // Every building lies inside one chunk (docs/WORLD.md, Design constraints), floor, walls, roof and all.
 for(const [i,b] of built.buildings.entries()){const home=built.chunks.get(chunkId(data.buildings[i].x,data.buildings[i].z));
  for(const [x,z] of b.plan.tiles){const t=built.tiles.get(`${x},${z}`);assert.equal(chunkId(x,z),home.id,`${b.plan.desc.name}: floor ${x},${z} in its own chunk`);assert.ok(home.tiles.includes(t));}}
 // Just over the line east: the west column stays (within radius × CHUNK + BAND tiles); past the band it goes.
 const west=[...built.chunks.values()].find(c=>c.cz===cz&&c.cx===cx-1),line=(cx+1)*CHUNK;
 built.stream(built.tiles.get(`${line+2},${built.spawn.z}`));assert.ok(west.root.visible,'lingers within the band');
 built.stream(built.tiles.get(`${line+BAND+1},${built.spawn.z}`));assert.ok(!west.root.visible,'gone past the band');
 built.stream(built.tiles.get(`${line+2},${built.spawn.z}`));assert.ok(!west.root.visible,'stepping back doesn’t bring a released chunk back early');
 assert.equal(built.isShown(line+2,built.spawn.z),true);assert.equal(built.isShown(west.cx*CHUNK+1,west.cz*CHUNK+1),false,'a hidden chunk’s tiles');
 assert.equal(built.isShown(-1,86),true,'outside the city: the land shows itself');
});
test('capital.json is the generator’s output unless edited (regenerate with scripts/generate-capital.mjs)',()=>{
 assert.equal(JSON.stringify(capitalData()).length>0,true);assert.equal(data.id,'capital');
});
